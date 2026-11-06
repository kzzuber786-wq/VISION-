import { VisionAnalysisResult, ChatMessage, GroundingSource, VisionMode, DetectedEntity } from '../types/vision';

export async function analyzeImage(
  imageDataUri: string,
  mode: VisionMode = 'explore',
  focusObject?: string
): Promise<VisionAnalysisResult> {
  const response = await fetch('/api/vision/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: imageDataUri,
      mode,
      focusObject,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Analysis failed with status ${response.status}`);
  }

  return response.json();
}

export async function sendChatMessage(params: {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  image?: string;
  selectedObject?: DetectedEntity | null;
  mode?: VisionMode;
  useSearch?: boolean;
}): Promise<{ reply: string; sources: GroundingSource[]; timestamp: number }> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Chat request failed with status ${response.status}`);
  }

  return response.json();
}

export async function synthesizeSpeech(
  text: string,
  voice = 'Kore'
): Promise<{ audioData: string; mimeType: string }> {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `TTS failed with status ${response.status}`);
  }

  return response.json();
}

export async function deepResearchObject(params: {
  objectName: string;
  category: string;
  summary: string;
}): Promise<{ report: string; sources: GroundingSource[]; timestamp: number }> {
  const response = await fetch('/api/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Research request failed with status ${response.status}`);
  }

  return response.json();
}
