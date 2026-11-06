import React from 'react';
import {
  Sparkles,
  Info,
  Layers,
  Cpu,
  Bookmark,
  ExternalLink,
  ChevronRight,
  Compass,
  Zap,
  Globe,
  Share2,
} from 'lucide-react';
import { VisionAnalysisResult, DetectedEntity, GroundingSource, VisionMode } from '../types/vision';
import { formatConfidence } from '../utils/visionMath';

interface IntelligencePanelProps {
  analysis: VisionAnalysisResult | null;
  selectedObject: DetectedEntity | null;
  onSelectObject: (obj: DetectedEntity | null) => void;
  onOpenExplorer: (obj: DetectedEntity) => void;
  onSaveDiscovery: () => void;
  isSaved: boolean;
  mode: VisionMode;
  className?: string;
}

export const IntelligencePanel: React.FC<IntelligencePanelProps> = ({
  analysis,
  selectedObject,
  onSelectObject,
  onOpenExplorer,
  onSaveDiscovery,
  isSaved,
  mode,
  className = '',
}) => {
  return (
    <aside className={`w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md flex flex-col h-full overflow-hidden select-none ${className}`}>

      {/* Panel Header */}
      <div className="h-11 px-4 border-b border-neutral-800/80 bg-neutral-900/40 flex items-center justify-between text-xs text-neutral-300 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-neutral-200">Intelligence Matrix</span>
        </div>

        {analysis && (
          <button
            onClick={onSaveDiscovery}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
              isSaved
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                : 'bg-neutral-800/70 hover:bg-neutral-700 text-neutral-300 border border-neutral-700/60'
            }`}
            title="Save this scene to discoveries archive"
          >
            <Bookmark className="w-3 h-3 text-cyan-400" />
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        )}
      </div>

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {!analysis && !selectedObject ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-neutral-400 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500">
              <Compass className="w-6 h-6 text-neutral-400" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-neutral-300">Awaiting Observation</p>
              <p className="text-[11px] text-neutral-400 max-w-xs leading-relaxed">
                Capture a camera frame or upload an image to view real-time scene decomposition, detected entities, and scientific analysis.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Scene Overview Card */}
            {analysis && (
              <div className="p-3.5 rounded-xl bg-neutral-900/40 border border-neutral-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-3 h-3 text-cyan-400" />
                    Scene Synthesis
                  </span>
                  {analysis.inferredContext && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700/40">
                      {analysis.inferredContext}
                    </span>
                  )}
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed">
                  {analysis.sceneDescription}
                </p>

                {/* Visual Attributes */}
                {analysis.visualAttributes && (
                  <div className="pt-2 border-t border-neutral-800/60 grid grid-cols-2 gap-2 text-[11px]">
                    {analysis.visualAttributes.lighting && (
                      <div>
                        <span className="text-neutral-400 block text-[10px]">Lighting</span>
                        <span className="text-neutral-200 truncate block">
                          {analysis.visualAttributes.lighting}
                        </span>
                      </div>
                    )}
                    {analysis.visualAttributes.environment && (
                      <div>
                        <span className="text-neutral-400 block text-[10px]">Environment</span>
                        <span className="text-neutral-200 truncate block">
                          {analysis.visualAttributes.environment}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Selected Object Deep Dive Card */}
            {selectedObject ? (
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/40 space-y-3 shadow-[0_0_20px_rgba(6,182,212,0.08)]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 block">
                      Target Inspector
                    </span>
                    <h4 className="text-sm font-bold text-white mt-0.5">
                      {selectedObject.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                      {formatConfidence(selectedObject.confidence)}
                    </span>
                    <button
                      onClick={() => onSelectObject(null)}
                      className="text-neutral-400 hover:text-neutral-200 text-xs px-1"
                      title="Clear selection"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="text-xs text-neutral-300 space-y-2">
                  <p className="leading-relaxed">
                    {selectedObject.summary || 'Physical object detected in the field of view.'}
                  </p>

                  {selectedObject.workingPrinciple && (
                    <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800/60 space-y-1">
                      <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                        Operating Mechanism
                      </span>
                      <p className="text-[11px] text-neutral-200 leading-normal">
                        {selectedObject.workingPrinciple}
                      </p>
                    </div>
                  )}

                  {selectedObject.material && (
                    <div className="flex items-center justify-between text-[11px] py-1 border-b border-neutral-800/40">
                      <span className="text-neutral-400">Material Composition</span>
                      <span className="text-neutral-200 font-medium">{selectedObject.material}</span>
                    </div>
                  )}

                  {selectedObject.practicalUse && (
                    <div className="flex items-center justify-between text-[11px] py-1 border-b border-neutral-800/40">
                      <span className="text-neutral-400">Primary Function</span>
                      <span className="text-neutral-200 font-medium truncate max-w-[180px]">
                        {selectedObject.practicalUse}
                      </span>
                    </div>
                  )}

                  {selectedObject.curiousFact && (
                    <div className="pt-1 text-[11px] text-cyan-200/90 italic">
                      "{selectedObject.curiousFact}"
                    </div>
                  )}
                </div>

                {/* Explore Deeper Action */}
                <button
                  onClick={() => onOpenExplorer(selectedObject)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Launch Deep Explorer ({mode === 'research' ? 'Research' : 'Learn'})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : null}

            {/* Detected Entities Grid */}
            {analysis?.detectedItems && analysis.detectedItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-cyan-400" />
                    Detected Entities ({analysis.detectedItems.length})
                  </span>
                  <span className="text-[10px] text-neutral-400">Select to inspect</span>
                </div>

                <div className="space-y-1.5">
                  {analysis.detectedItems.map((item) => {
                    const isSelected = selectedObject?.id === item.id || selectedObject?.name === item.name;
                    return (
                      <div
                        key={item.id || item.name}
                        onClick={() => onSelectObject(isSelected ? null : item)}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-500/50 shadow-sm'
                            : 'bg-neutral-900/40 border-neutral-800 hover:bg-neutral-900/70 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-cyan-400' : 'bg-neutral-500'}`} />
                          <div className="min-w-0">
                            <h5 className="text-xs font-semibold text-neutral-200 truncate">
                              {item.name}
                            </h5>
                            <span className="text-[10px] text-neutral-400 truncate block">
                              {item.category}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono text-neutral-400">
                            {formatConfidence(item.confidence)}
                          </span>
                          <ChevronRight className="w-3 h-3 text-neutral-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Google Search Grounding Sources */}
            {analysis?.groundingSources && analysis.groundingSources.length > 0 && (
              <div className="p-3 rounded-xl bg-neutral-900/30 border border-neutral-800/80 space-y-2">
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-cyan-400" />
                  Verified External Sources
                </span>
                <div className="space-y-1.5">
                  {analysis.groundingSources.map((source, i) => (
                    <a
                      key={i}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 p-1.5 rounded bg-neutral-900/60 hover:bg-neutral-850 border border-neutral-800 text-[11px] text-cyan-300 hover:text-cyan-200 transition-colors"
                    >
                      <span className="truncate">{source.title}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 text-neutral-400" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
