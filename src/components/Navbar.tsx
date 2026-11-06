import React from 'react';
import { Eye, Sparkles, BookOpen, Microscope, Radio, Settings, Bookmark } from 'lucide-react';
import { VisionMode, LiveVoiceStatus } from '../types/vision';

interface NavbarProps {
  mode: VisionMode;
  onModeChange: (mode: VisionMode) => void;
  activeTab: 'camera' | 'upload' | 'discoveries';
  onTabChange: (tab: 'camera' | 'upload' | 'discoveries') => void;
  onOpenSettings: () => void;
  onOpenDiscoveries: () => void;
  liveStatus: LiveVoiceStatus;
  onToggleLive: () => void;
  savedCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  mode,
  onModeChange,
  activeTab,
  onTabChange,
  onOpenSettings,
  onOpenDiscoveries,
  liveStatus,
  onToggleLive,
  savedCount,
}) => {
  return (
    <header className="h-14 border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between gap-6 shrink-0 z-30 select-none">
      {/* Zone 1: Single text element wordmark with futuristic aperture icon */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-400">
          <Eye className="w-4 h-4 text-cyan-400" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-bold tracking-tight text-white font-sans">
            VISION<span className="text-cyan-400 font-mono font-normal ml-0.5">AI</span>
          </span>
          <span className="hidden sm:inline-block text-[11px] font-mono text-neutral-400 tracking-wider">
            v3.8
          </span>
        </div>
      </div>

      {/* Zone 2: Clean single-line workspace navigation links */}
      <nav className="hidden md:flex items-center gap-1 p-1 bg-neutral-900/60 border border-neutral-800 rounded-lg">
        <button
          onClick={() => onTabChange('camera')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
            activeTab === 'camera'
              ? 'bg-neutral-800 text-cyan-300 shadow-sm border border-neutral-700/50'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          Live Vision
        </button>

        <button
          onClick={() => onTabChange('upload')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
            activeTab === 'upload'
              ? 'bg-neutral-800 text-cyan-300 shadow-sm border border-neutral-700/50'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Image Analysis
        </button>

        <button
          onClick={onOpenDiscoveries}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors whitespace-nowrap"
        >
          <Bookmark className="w-3.5 h-3.5" />
          Discoveries
          {savedCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-neutral-800 text-cyan-400 text-[10px] rounded font-mono">
              {savedCount}
            </span>
          )}
        </button>
      </nav>

      {/* Zone 3: Mode Switcher, Live Voice status, and Settings */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Intelligence Mode Segmented Control */}
        <div className="hidden sm:flex items-center p-0.5 bg-neutral-900 border border-neutral-800 rounded-lg">
          <button
            onClick={() => onModeChange('explore')}
            title="Explore: Balanced multimodal observation"
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              mode === 'explore'
                ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-300'
            }`}
          >
            Explore
          </button>
          <button
            onClick={() => onModeChange('learn')}
            title="Learning Mode: Simplified principles, intuitive analogies"
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              mode === 'learn'
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                : 'text-neutral-400 hover:text-neutral-300'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            Learn
          </button>
          <button
            onClick={() => onModeChange('research')}
            title="Research Mode: Scientific analysis, engineering principles, citations"
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              mode === 'research'
                ? 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                : 'text-neutral-400 hover:text-neutral-300'
            }`}
          >
            <Microscope className="w-3 h-3" />
            Research
          </button>
        </div>

        {/* Gemini Live Voice Session Button */}
        <button
          onClick={onToggleLive}
          title={liveStatus === 'connected' || liveStatus === 'listening' ? 'Disconnect Gemini Live' : 'Start Real-Time Voice Conversation (gemini-3.8-live)'}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all whitespace-nowrap ${
            liveStatus === 'listening' || liveStatus === 'speaking'
              ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.3)] animate-pulse'
              : liveStatus === 'connecting'
              ? 'bg-neutral-900 text-amber-400 border-amber-500/40'
              : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
          }`}
        >
          <Radio className="w-3 h-3 text-cyan-400" />
          <span className="hidden sm:inline">Live Voice</span>
          <span className="text-[10px] font-mono opacity-80">
            {liveStatus === 'disconnected' ? 'Off' : liveStatus}
          </span>
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          title="Vision AI Settings"
          aria-label="Vision AI Settings"
          className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/80 rounded-lg transition-colors border border-transparent hover:border-neutral-700"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
