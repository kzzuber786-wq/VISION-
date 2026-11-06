import express from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, ThinkingLevel } from '@google/genai';

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = parseInt(process.env.PORT || '3000', 10);

// Increase JSON payload limit for base64 image captures
app.use(express.json({ limit: '30mb' }));

// Shared GoogleGenAI Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper for resilient model calls with automatic retry and flash-lite fallback
async function generateContentResilient(
  params: any,
  primaryModel = 'gemini-3.8-flash',
  fallbackModel = 'gemini-3.1-flash-lite'
) {
  try {
    return await ai.models.generateContent({
      ...params,
      model: primaryModel,
    });
  } catch (err: any) {
    const errMsg = (err?.message || '').toLowerCase();
    const errStatus = String(err?.status || err?.code || '');
    const isTransient =
      errStatus.includes('503') ||
      errStatus.includes('429') ||
      errStatus.includes('RESOURCE_EXHAUSTED') ||
      errStatus.includes('UNAVAILABLE') ||
      errMsg.includes('quota') ||
      errMsg.includes('429') ||
      errMsg.includes('503') ||
      errMsg.includes('resource_exhausted') ||
      errMsg.includes('high demand') ||
      errMsg.includes('spikes in demand');

    if (isTransient) {
      console.warn(`Transient rate/demand issue with ${primaryModel}, falling back to ${fallbackModel}...`);
      await new Promise((r) => setTimeout(r, 800));

      // Clean config if fallback model has different tool support
      const fallbackParams = { ...params, model: fallbackModel };
      if (fallbackParams.config?.tools) {
        // googleSearch is primarily on gemini-3.8-flash
        delete fallbackParams.config.tools;
      }

      return await ai.models.generateContent(fallbackParams);
    }
    throw err;
  }
}

/* ==========================================================================
   API ROUTE 1: Multimodal Vision Analysis (/api/vision/analyze)
   ========================================================================== */
app.post('/api/vision/analyze', async (req, res) => {
  try {
    const { image, mode = 'explore', focusObject } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Extract base64 and mime
    let mimeType = 'image/jpeg';
    let base64Data = image;
    const match = image.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    } else if (typeof image === 'string' && image.startsWith('/')) {
      const fs = await import('fs/promises');
      const cleanRel = image.replace(/^\/+/, '');
      const filePath = path.join(process.cwd(), cleanRel);
      const fileBuffer = await fs.readFile(filePath);
      base64Data = fileBuffer.toString('base64');
      mimeType = image.endsWith('.png') ? 'image/png' : 'image/jpeg';
    }

    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    };

    const prompt = `You are VISION AI, an advanced computer vision and physical world intelligence system.
Analyze this image thoroughly with high precision.
Operating mode: "${mode}".
${focusObject ? `User has explicitly focused on: "${focusObject}". Pay special attention to this item.` : ''}

Strict requirements:
1. Identify all primary physical objects, instruments, tools, devices, flora, fauna, or structures visible in the scene.
2. For each detected item, determine its location with a normalized bounding box [ymin, xmin, ymax, xmax] where coordinates are floats between 0.0 and 1.0 (0.0 is top/left, 1.0 is bottom/right).
3. Do not invent exact proprietary model numbers or unverified claims.
4. Output STRICT JSON conforming to this schema without any markdown formatting wrappers (no \`\`\`json):
{
  "sceneDescription": "A concise 2-sentence summary of the scene, environment, and physical setting.",
  "primarySubject": "Name of the main subject/object",
  "inferredContext": "E.g. Engineering Workbench, Living Space, Kitchen Lab, Urban Architecture, Natural Habitat",
  "visualAttributes": {
    "lighting": "Description of lighting conditions (e.g. Natural diffuse sunlight, Warm indoor incandescent)",
    "environment": "Indoor / Outdoor / Studio / Laboratory",
    "composition": "Visual framing overview",
    "dominantColors": ["#hex1", "#hex2", "#hex3"]
  },
  "detectedItems": [
    {
      "id": "item_1",
      "name": "Object name",
      "category": "Category name",
      "confidence": 0.95,
      "box": {
        "ymin": 0.1,
        "xmin": 0.2,
        "ymax": 0.5,
        "xmax": 0.7
      },
      "summary": "1-2 sentence description of what it is",
      "material": "Estimated primary material (e.g. Aluminum, Polycarbonate, Organic, Glass)",
      "workingPrinciple": "How this object or mechanism works physically",
      "practicalUse": "Primary function or everyday application",
      "curiousFact": "An interesting, verified physical or historical fact about this type of item",
      "tags": ["tag1", "tag2"]
    }
  ],
  "suggestedQuestions": [
    "Suggested insightful question 1",
    "Suggested insightful question 2",
    "Suggested insightful question 3"
  ]
}`;

    const response = await generateContentResilient({
      contents: {
        parts: [imagePart, { text: prompt }],
      },
      config: {
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    const rawText = (response.text ?? '{}').trim();
    let jsonStr = rawText;
    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = rawText.slice(firstBrace, lastBrace + 1);
    }
    const parsed = JSON.parse(jsonStr);

    return res.json({
      ...parsed,
      timestamp: Date.now(),
    });

  } catch (error: any) {
    console.error('Vision analysis error:', error);
    return res.status(500).json({
      error: error.message || 'Vision analysis failed',
    });
  }
});

/* ==========================================================================
   API ROUTE 2: Contextual AI Assistant with Search Grounding (/api/chat)
   ========================================================================== */
app.post('/api/chat', async (req, res) => {
  try {
    const {
      message,
      history = [],
      image,
      selectedObject,
      mode = 'explore',
      useSearch = true,
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let systemInstruction = `You are VISION AI, an intelligent visual assistant that sees beyond what users see.
You help people understand physical reality, mechanism operations, materials, science, and history.`;

    if (mode === 'learn') {
      systemInstruction += `
LEARNING MODE IS ACTIVE:
- Explain concepts using clear, intuitive language, analogies, and practical examples.
- Break down complex mechanisms into simple intuitive steps.
- Encourage curiosity.`;
    } else if (mode === 'research') {
      systemInstruction += `
RESEARCH MODE IS ACTIVE:
- Provide rigorous, in-depth technical breakdowns and scientific explanations.
- Include principles of physics, engineering, materials science, or chemical properties.
- State verified factual specifications and highlight uncertainties where exact data cannot be confirmed.`;
    }

    if (selectedObject) {
      systemInstruction += `
The user is currently inspecting this specific object:
Name: ${selectedObject.name}
Category: ${selectedObject.category}
Summary: ${selectedObject.summary || 'N/A'}
Working Principle: ${selectedObject.workingPrinciple || 'N/A'}
Material: ${selectedObject.material || 'N/A'}`;
    }

    // Build contents array
    const contents: any[] = [];

    // History turns
    for (const h of history.slice(-6)) {
      contents.push({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      });
    }

    // Current turn parts
    const currentParts: any[] = [];
    if (image) {
      let mimeType = 'image/jpeg';
      let base64Data = image;
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      } else if (typeof image === 'string' && image.startsWith('/')) {
        const fs = await import('fs/promises');
        const cleanRel = image.replace(/^\/+/, '');
        const filePath = path.join(process.cwd(), cleanRel);
        const fileBuffer = await fs.readFile(filePath);
        base64Data = fileBuffer.toString('base64');
        mimeType = image.endsWith('.png') ? 'image/png' : 'image/jpeg';
      }
      currentParts.push({
        inlineData: {
          mimeType,
          data: base64Data,
        },
      });
    }

    currentParts.push({ text: message });
    contents.push({ role: 'user', parts: currentParts });

    const config: any = {
      systemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    };

    // Google Search Grounding
    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await generateContentResilient({
      contents,
      config,
    });

    const reply = response.text || '';

    // Extract grounding citations if search was used
    const sources: Array<{ title: string; uri: string }> = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (Array.isArray(chunks)) {
      for (const chunk of chunks) {
        if (chunk.web?.uri) {
          sources.push({
            title: chunk.web.title || new URL(chunk.web.uri).hostname,
            uri: chunk.web.uri,
          });
        }
      }
    }

    return res.json({
      reply,
      sources,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    return res.status(500).json({
      error: error.message || 'Conversational processing failed',
    });
  }
});

/* ==========================================================================
   API ROUTE 3: Deep Research Breakdown (/api/research)
   ========================================================================== */
app.post('/api/research', async (req, res) => {
  try {
    const { objectName, category, summary } = req.body;

    if (!objectName) {
      return res.status(400).json({ error: 'objectName is required' });
    }

    const prompt = `Conduct a rigorous, grounded research study on: "${objectName}" (Category: "${category}").
Context: ${summary || 'Physical object in real-world environment'}.

Investigate:
1. Scientific & Engineering Working Principles (how it works under the hood).
2. Advanced Material Science & Manufacturing Methods.
3. Modern Industrial & Everyday Applications.
4. Recent Technological Advancements or Future Evolutions.
5. Key Limitations & Environmental/Safety considerations.

Use Google Search grounding to retrieve up-to-date, verified facts. Return a well-structured markdown report with clear headings and bullet points.`;

    const response = await generateContentResilient({
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const report = response.text || '';
    const sources: Array<{ title: string; uri: string }> = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (Array.isArray(chunks)) {
      for (const chunk of chunks) {
        if (chunk.web?.uri) {
          sources.push({
            title: chunk.web.title || new URL(chunk.web.uri).hostname,
            uri: chunk.web.uri,
          });
        }
      }
    }

    return res.json({
      report,
      sources,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Research error:', error);
    return res.status(500).json({
      error: error.message || 'Research investigation failed',
    });
  }
});

/* ==========================================================================
   API ROUTE 4: Text-to-Speech Generation (/api/tts)
   ========================================================================== */
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'Kore' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    // Clean text: strip markdown links, hashes, asterisks
    const cleanedText = text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*#_`~]/g, '')
      .slice(0, 1000); // comfortable speech limit

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [{ text: cleanedText }],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
      },
    });


    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return res.status(502).json({ error: 'No audio returned from TTS engine' });
    }

    return res.json({
      audioData: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (error: any) {
    console.error('TTS error:', error);
    return res.status(500).json({
      error: error.message || 'Speech generation failed',
    });
  }
});

/* ==========================================================================
   WEBSOCKET: Real-Time Live API (/ws/live) using gemini-3.8-live
   ========================================================================== */
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);
  if (pathname === '/ws/live') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', async (clientWs: WebSocket) => {
  let liveSession: any = null;

  try {
    liveSession = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction:
          'You are VISION AI Live, a low-latency voice assistant that can see and talk about the physical world in real time. Keep verbal answers concise, punchy, informative, and natural.',
      },
      callbacks: {
        onmessage: (message: any) => {
          // Check for audio output parts (24kHz PCM)
          for (const part of message.serverContent?.modelTurn?.parts ?? []) {
            if (part.inlineData?.data) {
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(
                  JSON.stringify({
                    type: 'audio',
                    data: part.inlineData.data,
                  })
                );
              }
            }
          }
          if (message.serverContent?.interrupted) {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }
          }
        },
        onclose: () => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'session_closed' }));
          }
        },
        onerror: (err: any) => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'error', message: err?.message || 'Live session error' }));
          }
        },
      },
    });

    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'ready' }));
    }

    clientWs.on('message', (raw) => {
      try {
        const payload = JSON.parse(raw.toString());
        if (payload.type === 'audio' && payload.data && liveSession) {
          liveSession.sendRealtimeInput({
            audio: {
              data: payload.data,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        } else if (payload.type === 'video' && payload.data && liveSession) {
          liveSession.sendRealtimeInput({
            video: {
              data: payload.data,
              mimeType: 'image/jpeg',
            },
          });
        } else if (payload.type === 'text' && payload.text && liveSession) {
          liveSession.sendRealtimeInput({
            text: payload.text,
          });
        }
      } catch (err) {
        console.error('Client message handling error:', err);
      }
    });

    clientWs.on('close', () => {
      if (liveSession && typeof liveSession.close === 'function') {
        liveSession.close();
      }
    });
  } catch (err: any) {
    console.error('Live connect error:', err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'error', message: err?.message || 'Failed to start Live API' }));
    }
  }
});

/* ==========================================================================
   Vite Dev Server Integration or Static Assets
   ========================================================================== */
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`VISION AI Server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
