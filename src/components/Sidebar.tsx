import React from 'react';
import {
  Video,
  Image as ImageIcon,
  Bookmark,
  Plus,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Globe,
  Camera,
  History,
} from 'lucide-react';
import { VisionMode } from '../types/vision';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeTab: 'camera' | 'upload' | 'discoveries';
  onTabChange: (tab: 'camera' | 'upload' | 'discoveries') => void;
  onNewSession: () => void;
  onOpenDiscoveries: () => void;
  savedCount: number;
  mode: VisionMode;
  isDetectorReady: boolean;
  isCameraActive: boolean;
  groundingEnabled: boolean;
  historyLength: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  activeTab,
  onTabChange,
  onNewSession,
  onOpenDiscoveries,
  savedCount,
  mode,
  isDetectorReady,
  isCameraActive,
  groundingEnabled,
  historyLength,
}) => {
  return (
    <aside
      className={`hidden lg:flex border-r border-neutral-800/80 bg-neutral-950/70 backdrop-blur-md flex-col justify-between transition-all duration-300 z-20 shrink-0 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Section */}
      <div className="p-3 space-y-4">
        {/* New Session Action */}
        <button
          onClick={onNewSession}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] border border-cyan-400/30 ${
            collapsed ? 'justify-center px-0' : ''
          }`}
          title="Start New Vision Session"
        >
          <Plus className="w-4 h-4 shrink-0" />
          {!collapsed && <span>New Session</span>}
        </button>

        {/* Primary Views */}
        <div className="space-y-1">
          <button
            onClick={() => onTabChange('camera')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'camera'
                ? 'bg-neutral-800/90 text-cyan-300 border border-neutral-700/60'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
            } ${collapsed ? 'justify-center px-0' : ''}`}
            title="Live Camera Vision"
          >
            <Video className="w-4 h-4 shrink-0 text-cyan-400" />
            {!collapsed && <span className="truncate">Live Vision</span>}
          </button>

          <button
            onClick={() => onTabChange('upload')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'upload'
                ? 'bg-neutral-800/90 text-cyan-300 border border-neutral-700/60'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
            } ${collapsed ? 'justify-center px-0' : ''}`}
            title="Image Analysis"
          >
            <ImageIcon className="w-4 h-4 shrink-0 text-cyan-400" />
            {!collapsed && <span className="truncate">Image Analysis</span>}
          </button>

          <button
            onClick={onOpenDiscoveries}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'discoveries'
                ? 'bg-neutral-800/90 text-cyan-300 border border-neutral-700/60'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
            } ${collapsed ? 'justify-center px-0' : ''}`}
            title="Saved Discoveries"
          >
            <Bookmark className="w-4 h-4 shrink-0 text-cyan-400" />
            {!collapsed && (
              <div className="flex items-center justify-between w-full">
                <span className="truncate">Saved Objects</span>
                {savedCount > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-cyan-400">
                    {savedCount}
                  </span>
                )}
              </div>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-neutral-800/60 my-2" />

        {/* Current Session Metadata */}
        {!collapsed && (
          <div className="px-3 py-2 space-y-2 text-[11px] text-neutral-400 bg-neutral-900/40 rounded-lg border border-neutral-800/50">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Current Mode</span>
              <span className="font-medium capitalize text-neutral-200">{mode}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <History className="w-3 h-3 text-neutral-400" />
                Interactions
              </span>
              <span className="font-mono text-neutral-300">{historyLength}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Hardware Status & Collapse Toggle */}
      <div className="p-3 border-t border-neutral-800/80 space-y-3">
        {!collapsed && (
          <div className="space-y-1.5 text-[11px] text-neutral-400">
            <div className="flex items-center justify-between py-0.5">
              <span className="flex items-center gap-1.5">
                <Camera className="w-3 h-3 text-neutral-400" />
                Camera
              </span>
              <span className={`font-mono text-[10px] ${isCameraActive ? 'text-emerald-400' : 'text-neutral-400'}`}>
                {isCameraActive ? 'ONLINE' : 'STANDBY'}
              </span>
            </div>

            <div className="flex items-center justify-between py-0.5">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3 h-3 text-neutral-400" />
                COCO-SSD Engine
              </span>
              <span className={`font-mono text-[10px] ${isDetectorReady ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isDetectorReady ? 'ACTIVE' : 'READY'}
              </span>
            </div>

            <div className="flex items-center justify-between py-0.5">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-neutral-400" />
                Google Search
              </span>
              <span className={`font-mono text-[10px] ${groundingEnabled ? 'text-cyan-400' : 'text-neutral-400'}`}>
                {groundingEnabled ? 'GROUNDED' : 'OFF'}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 rounded-lg transition-colors border border-transparent hover:border-neutral-800"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
