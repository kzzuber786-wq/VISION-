import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  ExternalLink,
  Trash2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Globe,
  Loader2,
} from 'lucide-react';
import { ChatMessage, VisionMode, DetectedEntity } from '../types/vision';

interface AssistantInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isGenerating: boolean;
  suggestedQuestions: string[];
  isListening: boolean;
  onToggleMic: () => void;
  speechTranscript: string;
  onClearChat: () => void;
  onPlaySpeech: (text: string) => void;
  isSpeaking: boolean;
  onStopSpeech: () => void;
  mode: VisionMode;
  selectedObject: DetectedEntity | null;
  speechRate: number;
  onSetSpeechRate: (rate: number) => void;
  className?: string;
  isFullView?: boolean;
}

export const AssistantInterface: React.FC<AssistantInterfaceProps> = ({
  messages,
  onSendMessage,
  isGenerating,
  suggestedQuestions,
  isListening,
  onToggleMic,
  speechTranscript,
  onClearChat,
  onPlaySpeech,
  isSpeaking,
  onStopSpeech,
  mode,
  selectedObject,
  speechRate,
  onSetSpeechRate,
  className = '',
  isFullView = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(isFullView);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFullView) {
      setIsExpanded(true);
    }
  }, [isFullView]);

  // Auto scroll messages to bottom
  useEffect(() => {
    if (isExpanded || isFullView) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isExpanded, isFullView]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isGenerating) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleSuggestionClick = (q: string) => {
    onSendMessage(q);
  };

  return (
    <div className={`border-t border-neutral-800/80 bg-neutral-950/95 backdrop-blur-md flex flex-col z-20 shrink-0 transition-all duration-300 ${isFullView ? 'flex-1 h-full' : ''} ${className}`}>
      {/* Expandable Conversation History Drawer */}
      {(isExpanded || isFullView) && (
        <div className={`${isFullView ? 'flex-1' : 'h-72'} border-b border-neutral-800/80 overflow-y-auto p-4 space-y-4`}>

          <div className="flex items-center justify-between text-xs text-neutral-400 pb-2 border-b border-neutral-800/60">
            <span className="flex items-center gap-1.5 font-medium text-neutral-300">
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
              Vision Conversation Log ({messages.length})
            </span>
            <div className="flex items-center gap-3">
              {messages.length > 0 && (
                <button
                  onClick={onClearChat}
                  className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear Log</span>
                </button>
              )}
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 text-neutral-400 hover:text-neutral-200"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {messages.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center text-neutral-400 text-xs">
              <p>No questions asked in this session yet.</p>
              <p className="text-[11px] text-neutral-400 mt-1">
                Ask about the mechanisms, materials, or science visible in the camera frame.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col space-y-1.5 max-w-2xl ${
                  msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                }`}
              >
                <div className="flex items-center gap-2 text-[10px] text-neutral-400 px-1 font-mono">
                  <span>{msg.role === 'user' ? 'You' : 'VISION AI'}</span>
                  <span>·</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-cyan-600 text-white rounded-br-none shadow-sm'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-bl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Sources Grounding links if present */}
                  {msg.groundingSources && msg.groundingSources.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-neutral-800 space-y-1">
                      <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5 text-cyan-400" />
                        Grounded Sources
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {msg.groundingSources.map((src, i) => (
                          <a
                            key={i}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-750 text-[10px] text-cyan-300 border border-neutral-700/50 transition-colors"
                          >
                            <span className="truncate max-w-[140px]">{src.title}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Read aloud TTS button on assistant reply */}
                  {msg.role === 'assistant' && (
                    <div className="mt-2 pt-1 flex items-center justify-between text-[11px] text-neutral-400 border-t border-neutral-800/40">
                      <button
                        onClick={() => onPlaySpeech(msg.content)}
                        className="flex items-center gap-1 hover:text-cyan-300 transition-colors"
                      >
                        <Volume2 className="w-3 h-3 text-cyan-400" />
                        <span>Speak (Gemini TTS)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Suggested Questions Pill Row */}
      {suggestedQuestions.length > 0 && (
        <div className="px-4 py-2 border-b border-neutral-800/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            Suggested:
          </span>
          {suggestedQuestions.slice(0, 4).map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestionClick(q)}
              className="text-xs text-neutral-300 hover:text-cyan-300 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 rounded-lg px-2.5 py-1 whitespace-nowrap transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Live Voice Speech-to-Text Transcription Banner */}
      {isListening && (
        <div className="px-4 py-2 bg-cyan-950/60 border-b border-cyan-500/40 flex items-center justify-between text-xs text-cyan-200">
          <div className="flex items-center gap-3">
            <div className="flex items-end gap-0.5 h-4">
              <span className="w-0.5 h-3 bg-cyan-400 rounded-full animate-wave-1" />
              <span className="w-0.5 h-4 bg-cyan-300 rounded-full animate-wave-2" />
              <span className="w-0.5 h-2 bg-cyan-400 rounded-full animate-wave-3" />
              <span className="w-0.5 h-4 bg-cyan-300 rounded-full animate-wave-4" />
              <span className="w-0.5 h-2.5 bg-cyan-400 rounded-full animate-wave-5" />
            </div>
            <span className="font-mono text-[11px] tracking-wide">
              {speechTranscript ? `"${speechTranscript}"` : 'Listening... Speak your observation or question'}
            </span>
          </div>
          <button
            onClick={onToggleMic}
            className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 border border-cyan-500/30 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Main Console Input Bar */}
      <div className="p-3 px-4 flex items-center gap-3">
        {/* Toggle Log Expand */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
            isExpanded
              ? 'bg-neutral-800 text-cyan-300 border-neutral-700'
              : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border-neutral-800'
          }`}
          title="Toggle Conversation Drawer"
        >
          <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline font-mono text-[11px]">{messages.length}</span>
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex-1 relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              selectedObject
                ? `Ask anything about ${selectedObject.name}...`
                : 'Ask VISION AI about the physical scene or mechanisms...'
            }
            disabled={isGenerating}
            className="w-full bg-neutral-900/90 border border-neutral-800 focus:border-cyan-500/70 rounded-xl px-4 py-2.5 text-xs text-neutral-100 placeholder:text-neutral-400 focus:outline-none transition-all pr-24"
          />

          <div className="absolute right-1.5 flex items-center gap-1">
            {/* Push to talk Microphone */}
            <button
              type="button"
              onClick={onToggleMic}
              title={isListening ? 'Stop Listening' : 'Push to Talk Voice Input'}
              className={`p-1.5 rounded-lg transition-all ${
                isListening
                  ? 'bg-rose-600 text-white shadow-[0_0_12px_#f43f5e]'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Submit Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim() || isGenerating}
              className="p-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-lg transition-all shadow-sm"
              title="Send Prompt"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </form>

        {/* Voice Playback Controls */}
        <div className="hidden sm:flex items-center gap-1.5 text-neutral-400">
          {isSpeaking ? (
            <div className="flex items-center gap-2 px-2.5 py-1 bg-cyan-950/60 border border-cyan-500/40 rounded-lg">
              <div className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 h-2.5 bg-cyan-400 rounded-full animate-wave-1" />
                <span className="w-0.5 h-3 bg-cyan-300 rounded-full animate-wave-2" />
                <span className="w-0.5 h-1.5 bg-cyan-400 rounded-full animate-wave-3" />
                <span className="w-0.5 h-3 bg-cyan-300 rounded-full animate-wave-4" />
              </div>
              <span className="text-[10px] font-mono text-cyan-300">Speaking</span>
              <button
                onClick={onStopSpeech}
                title="Stop Voice Playback"
                className="flex items-center gap-1 text-[10px] text-rose-400 hover:text-rose-300 ml-1"
              >
                <VolumeX className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onPlaySpeech('VISION AI is ready to observe, analyze, and explain.')}
              title="Test Voice Speech Output"
              className="p-2 hover:bg-neutral-900 hover:text-neutral-200 rounded-lg transition-colors"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          )}

          {/* Voice rate selector */}
          <select
            aria-label="Voice Speed"
            value={speechRate}
            onChange={(e) => onSetSpeechRate(parseFloat(e.target.value))}
            className="bg-neutral-900 border border-neutral-800 text-[10px] rounded px-1.5 py-1 text-neutral-300 focus:outline-none"
          >
            <option value="0.8">0.8x</option>
            <option value="1.0">1.0x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
          </select>
        </div>
      </div>
    </div>
  );
};
