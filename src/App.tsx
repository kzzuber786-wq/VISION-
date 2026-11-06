/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { CameraWorkspace } from './components/CameraWorkspace';
import { IntelligencePanel } from './components/IntelligencePanel';
import { AssistantInterface } from './components/AssistantInterface';
import { ObjectExplorerModal } from './components/ObjectExplorerModal';
import { WelcomeHero } from './components/WelcomeHero';
import { SettingsModal } from './components/SettingsModal';
import { SavedDiscoveriesModal } from './components/SavedDiscoveriesModal';

import {
  VisionMode,
  VisionAnalysisResult,
  DetectedEntity,
  ChatMessage,
  SavedDiscovery,
  LiveVoiceStatus,
} from './types/vision';
import { analyzeImage, sendChatMessage, synthesizeSpeech } from './services/api';
import {
  VoiceRecognitionManager,
  AudioPlaybackManager,
  LiveVoiceClient,
} from './services/liveAudio';
import { isDetectorReady } from './services/localDetection';

import { Camera, Sparkles, MessageSquare, ArrowRight } from 'lucide-react';

export default function App() {
  // Check for autostart query param (as required by ultra mode testability)
  const queryParams = new URLSearchParams(window.location.search);
  const autostart = queryParams.get('autostart') === '1';

  // Navigation & View States
  const [showWelcome, setShowWelcome] = useState(!autostart);
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'discoveries'>('camera');
  const [mode, setMode] = useState<VisionMode>('explore');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileView, setMobileView] = useState<'camera' | 'intelligence' | 'chat'>('camera');


  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDiscoveriesOpen, setIsDiscoveriesOpen] = useState(false);
  const [explorerObject, setExplorerObject] = useState<DetectedEntity | null>(null);

  // Vision Intelligence State
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<VisionAnalysisResult | null>(null);
  const [selectedObject, setSelectedObject] = useState<DetectedEntity | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState<number>(0);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.45);
  const [groundingEnabled, setGroundingEnabled] = useState(true);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_msg',
      role: 'assistant',
      content:
        'Welcome to VISION AI. Point the camera at any physical instrument, mechanism, device, or natural structure. You can click any bounding box to explore its operating principles or ask questions.',
      timestamp: Date.now(),
    },
  ]);
  const [isGeneratingChat, setIsGeneratingChat] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([
    'What are the primary mechanisms in this scene?',
    'What materials are estimated in this object?',
    'How does this device operate physically?',
  ]);

  // Audio & Speech State
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsVoice, setTtsVoice] = useState('Kore');
  const [speechRate, setSpeechRate] = useState(1.0);
  const [liveStatus, setLiveStatus] = useState<LiveVoiceStatus>('disconnected');

  // Discoveries Archive
  const [savedDiscoveries, setSavedDiscoveries] = useState<SavedDiscovery[]>(() => {
    try {
      const stored = localStorage.getItem('vision_ai_discoveries');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Services references
  const voiceRecRef = useRef<VoiceRecognitionManager | null>(null);
  const audioPlaybackRef = useRef<AudioPlaybackManager | null>(null);
  const liveVoiceClientRef = useRef<LiveVoiceClient | null>(null);

  // Initialize Audio & Voice managers
  useEffect(() => {
    voiceRecRef.current = new VoiceRecognitionManager();
    audioPlaybackRef.current = new AudioPlaybackManager();
    audioPlaybackRef.current.setRate(speechRate);

    return () => {
      voiceRecRef.current?.stop();
      audioPlaybackRef.current?.stop();
      liveVoiceClientRef.current?.disconnect();
    };
  }, []);

  // Update speech rate
  const handleSetSpeechRate = (rate: number) => {
    setSpeechRate(rate);
    audioPlaybackRef.current?.setRate(rate);
  };

  // Save discoveries to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('vision_ai_discoveries', JSON.stringify(savedDiscoveries));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [savedDiscoveries]);

  // Push-to-talk Mic handler
  const handleToggleMic = () => {
    if (!voiceRecRef.current) return;

    if (isListeningMic) {
      voiceRecRef.current.stop();
      setIsListeningMic(false);
    } else {
      setSpeechTranscript('');
      setIsListeningMic(true);

      voiceRecRef.current.start({
        onTranscript: (text, isFinal) => {
          setSpeechTranscript(text);
          if (isFinal) {
            handleSendMessage(text);
            setIsListeningMic(false);
          }
        },
        onError: () => {
          setIsListeningMic(false);
        },
        onEnd: () => {
          setIsListeningMic(false);
        },
      });
    }
  };

  // Play Speech (Gemini TTS with browser fallback)
  const handlePlaySpeech = async (text: string) => {
    if (!text || isSpeaking) return;

    setIsSpeaking(true);
    try {
      const { audioData } = await synthesizeSpeech(text, ttsVoice);
      await audioPlaybackRef.current?.playWavBase64(audioData);
    } catch (err) {
      console.warn('Gemini TTS fallback notice:', err);
      // Fallback to Web Speech Synthesis
      await audioPlaybackRef.current?.speakFallback(text);
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleStopSpeech = () => {
    audioPlaybackRef.current?.stop();
    setIsSpeaking(false);
  };

  // Gemini Live API Toggle
  const handleToggleLive = async () => {
    if (liveStatus === 'connected' || liveStatus === 'listening' || liveStatus === 'speaking') {
      liveVoiceClientRef.current?.disconnect();
      setLiveStatus('disconnected');
    } else {
      liveVoiceClientRef.current = new LiveVoiceClient((status) => {
        setLiveStatus(status);
      });
      await liveVoiceClientRef.current.connect();
    }
  };

  // Capture & Multimodal Analysis sequence
  const handleCaptureAndAnalyze = async (imageDataUri: string) => {
    setIsAnalyzing(true);
    setAnalysisStage(1); // 1. Image received

    try {
      setAnalysisStage(2); // 2. Detecting entities
      await new Promise((r) => setTimeout(r, 200));

      setAnalysisStage(3); // 3. Reasoning scene
      const result = await analyzeImage(imageDataUri, mode, selectedObject?.name);

      setAnalysisStage(4); // 4. Generating insights
      await new Promise((r) => setTimeout(r, 200));

      setAnalysisStage(5); // 5. Complete
      setAnalysisResult(result);

      if (result.suggestedQuestions && result.suggestedQuestions.length > 0) {
        setSuggestedQuestions(result.suggestedQuestions);
      }

      // Add a concise system message in the chat
      setMessages((prev) => [
        ...prev,
        {
          id: `analysis_${Date.now()}`,
          role: 'assistant',
          content: `Observed scene: **${result.primarySubject}** in ${result.inferredContext || 'physical context'}. ${result.sceneDescription}`,
          timestamp: Date.now(),
          groundingSources: result.groundingSources,
        },
      ]);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `Observation analysis encountered an issue: ${err.message || 'Please check image clarity or retry.'}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStage(0);
    }
  };

  // Send message to assistant
  const handleSendMessage = async (userText: string) => {
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: Date.now(),
      attachedObjectId: selectedObject?.id,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsGeneratingChat(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const res = await sendChatMessage({
        message: userText,
        history: historyPayload,
        image: currentImage || undefined,
        selectedObject,
        mode,
        useSearch: groundingEnabled,
      });

      const assistantMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: res.timestamp || Date.now(),
        groundingSources: res.sources,
        mode,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const isQuota = (err?.message || '').includes('429') || (err?.message || '').includes('quota') || (err?.message || '').includes('RESOURCE_EXHAUSTED');
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_err_${Date.now()}`,
          role: 'assistant',
          content: isQuota
            ? 'Gemini API free tier quota momentarily reached. Please wait a moment and retry.'
            : `Unable to process query: ${err.message || 'Network or reasoning error'}.`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsGeneratingChat(false);
    }
  };

  // Save current observation to discoveries
  const handleSaveDiscovery = () => {
    if (!analysisResult) return;

    const newDisc: SavedDiscovery = {
      id: `disc_${Date.now()}`,
      title: analysisResult.primarySubject || 'Observed Physical Assembly',
      category: analysisResult.inferredContext || 'Physical Scene',
      timestamp: Date.now(),
      imageThumbnail: currentImage || undefined,
      sceneDescription: analysisResult.sceneDescription,
      detectedCount: analysisResult.detectedItems?.length || 0,
      tags: analysisResult.detectedItems?.map((i) => i.name) || [],
    };

    setSavedDiscoveries((prev) => [newDisc, ...prev]);
  };

  // Load a saved discovery
  const handleLoadDiscovery = (disc: SavedDiscovery) => {
    if (disc.imageThumbnail) {
      setCurrentImage(disc.imageThumbnail);
      setActiveTab('upload');
      handleCaptureAndAnalyze(disc.imageThumbnail);
    }
  };

  // Delete discovery
  const handleDeleteDiscovery = (id: string) => {
    setSavedDiscoveries((prev) => prev.filter((d) => d.id !== id));
  };

  // Clear discoveries
  const handleClearAllDiscoveries = () => {
    setSavedDiscoveries([]);
  };

  // Clear chat
  const handleClearChat = () => {
    setMessages([]);
  };

  // Start new session
  const handleNewSession = () => {
    setAnalysisResult(null);
    setSelectedObject(null);
    setCurrentImage(null);
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: 'assistant',
        content: 'New session initiated. Camera feed and visual detector ready.',
        timestamp: Date.now(),
      },
    ]);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-950 text-neutral-100 overflow-hidden font-sans">
      {/* Welcome Screen overlay for first-time onboarding */}
      {showWelcome && (
        <WelcomeHero
          onStartExploring={() => {
            setShowWelcome(false);
          }}
        />
      )}

      {/* Top Bar Navigation */}
      <Navbar
        mode={mode}
        onModeChange={setMode}
        activeTab={activeTab === 'discoveries' ? 'camera' : activeTab}
        onTabChange={(tab) => {
          if (tab === 'discoveries') {
            setIsDiscoveriesOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDiscoveries={() => setIsDiscoveriesOpen(true)}
        liveStatus={liveStatus}
        onToggleLive={handleToggleLive}
        savedCount={savedDiscoveries.length}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          collapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === 'discoveries') {
              setIsDiscoveriesOpen(true);
            } else {
              setActiveTab(tab);
            }
          }}
          onNewSession={handleNewSession}
          onOpenDiscoveries={() => setIsDiscoveriesOpen(true)}
          savedCount={savedDiscoveries.length}
          mode={mode}
          isDetectorReady={isDetectorReady()}
          isCameraActive={activeTab === 'camera'}
          groundingEnabled={groundingEnabled}
          historyLength={messages.length}
        />

        {/* Central Workspace (Live Camera / Upload) */}
        <CameraWorkspace
          className={mobileView === 'camera' ? 'flex' : 'hidden lg:flex'}
          activeTab={activeTab === 'discoveries' ? 'camera' : activeTab}
          isAnalyzing={isAnalyzing}
          analysisStage={analysisStage}
          detectedObjects={analysisResult?.detectedItems || []}
          selectedObject={selectedObject}
          onSelectObject={setSelectedObject}
          onCaptureAndAnalyze={handleCaptureAndAnalyze}
          confidenceThreshold={confidenceThreshold}
          currentImage={currentImage}
          onSetCurrentImage={setCurrentImage}
        />

        {/* Right Intelligence Matrix Panel */}
        <IntelligencePanel
          className={mobileView === 'intelligence' ? 'flex' : 'hidden lg:flex'}
          analysis={analysisResult}
          selectedObject={selectedObject}
          onSelectObject={setSelectedObject}
          onOpenExplorer={(obj) => setExplorerObject(obj)}
          onSaveDiscovery={handleSaveDiscovery}
          isSaved={savedDiscoveries.some((d) => d.title === analysisResult?.primarySubject)}
          mode={mode}
        />

        {/* Full-View Assistant on mobile when mobileView === 'chat' */}
        {mobileView === 'chat' && (
          <AssistantInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isGenerating={isGeneratingChat}
            suggestedQuestions={suggestedQuestions}
            isListening={isListeningMic}
            onToggleMic={handleToggleMic}
            speechTranscript={speechTranscript}
            onClearChat={handleClearChat}
            onPlaySpeech={handlePlaySpeech}
            isSpeaking={isSpeaking}
            onStopSpeech={handleStopSpeech}
            mode={mode}
            selectedObject={selectedObject}
            speechRate={speechRate}
            onSetSpeechRate={handleSetSpeechRate}
            className="flex lg:hidden flex-1 h-full"
            isFullView={true}
          />
        )}
      </div>

      {/* Target inspection banner on mobile if selectedObject and viewing camera */}
      {selectedObject && mobileView === 'camera' && (
        <div className="lg:hidden bg-cyan-950/90 border-t border-cyan-500/40 px-4 py-2 flex items-center justify-between z-20">
          <div className="flex items-center gap-2 text-xs truncate">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
            <span className="text-white font-semibold truncate">{selectedObject.name}</span>
            <span className="text-[10px] text-cyan-300 font-mono">({Math.round(selectedObject.confidence * 100)}%)</span>
          </div>
          <button
            onClick={() => setMobileView('intelligence')}
            className="flex items-center gap-1 text-[11px] font-semibold text-cyan-300 hover:text-white px-2.5 py-1 rounded-md bg-cyan-900/70 border border-cyan-500/40 shrink-0"
          >
            <span>Inspect</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Bottom Assistant Conversational Interface (Desktop Docked) */}
      <AssistantInterface
        messages={messages}
        onSendMessage={handleSendMessage}
        isGenerating={isGeneratingChat}
        suggestedQuestions={suggestedQuestions}
        isListening={isListeningMic}
        onToggleMic={handleToggleMic}
        speechTranscript={speechTranscript}
        onClearChat={handleClearChat}
        onPlaySpeech={handlePlaySpeech}
        isSpeaking={isSpeaking}
        onStopSpeech={handleStopSpeech}
        mode={mode}
        selectedObject={selectedObject}
        speechRate={speechRate}
        onSetSpeechRate={handleSetSpeechRate}
        className="hidden lg:flex"
      />

      {/* Mobile Bottom Tab Navigation Bar (< lg screens) */}
      <nav className="lg:hidden h-14 border-t border-neutral-800/90 bg-neutral-950/95 backdrop-blur-md px-4 flex items-center justify-around shrink-0 z-30 select-none">
        <button
          onClick={() => setMobileView('camera')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
            mobileView === 'camera' ? 'text-cyan-400' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Visualizer</span>
        </button>

        <button
          onClick={() => setMobileView('intelligence')}
          className={`relative flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
            mobileView === 'intelligence' ? 'text-cyan-400' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Intelligence</span>
          {analysisResult?.detectedItems && analysisResult.detectedItems.length > 0 && (
            <span className="absolute -top-0.5 right-1 px-1.5 py-0.2 rounded-full bg-cyan-600 text-white font-mono text-[9px] font-bold">
              {analysisResult.detectedItems.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setMobileView('chat')}
          className={`relative flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
            mobileView === 'chat' ? 'text-cyan-400' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Assistant</span>
          {messages.length > 1 && (
            <span className="absolute -top-0.5 right-1 px-1.5 py-0.2 rounded-full bg-neutral-800 border border-neutral-700 text-cyan-400 font-mono text-[9px]">
              {messages.length}
            </span>
          )}
        </button>
      </nav>


      {/* Object Explorer Modal */}
      {explorerObject && (
        <ObjectExplorerModal
          object={explorerObject}
          onClose={() => setExplorerObject(null)}
          mode={mode}
          onModeChange={setMode}
          onAskQuestion={(q) => handleSendMessage(q)}
          onPlaySpeech={handlePlaySpeech}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        confidenceThreshold={confidenceThreshold}
        onSetConfidenceThreshold={setConfidenceThreshold}
        groundingEnabled={groundingEnabled}
        onSetGroundingEnabled={setGroundingEnabled}
        ttsVoice={ttsVoice}
        onSetTtsVoice={setTtsVoice}
        speechRate={speechRate}
        onSetSpeechRate={handleSetSpeechRate}
      />

      {/* Saved Discoveries Archive Modal */}
      <SavedDiscoveriesModal
        isOpen={isDiscoveriesOpen}
        onClose={() => setIsDiscoveriesOpen(false)}
        discoveries={savedDiscoveries}
        onDeleteDiscovery={handleDeleteDiscovery}
        onLoadDiscovery={handleLoadDiscovery}
        onClearAll={handleClearAllDiscoveries}
      />
    </div>
  );
}
