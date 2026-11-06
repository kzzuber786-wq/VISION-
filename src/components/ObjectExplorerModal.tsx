import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Microscope,
  ExternalLink,
  Volume2,
  Sparkles,
  Zap,
  Globe,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { DetectedEntity, VisionMode, GroundingSource } from '../types/vision';
import { deepResearchObject } from '../services/api';
import { formatConfidence } from '../utils/visionMath';

interface ObjectExplorerModalProps {
  object: DetectedEntity | null;
  onClose: () => void;
  mode: VisionMode;
  onModeChange: (mode: VisionMode) => void;
  onAskQuestion: (question: string) => void;
  onPlaySpeech: (text: string) => void;
}

export const ObjectExplorerModal: React.FC<ObjectExplorerModalProps> = ({
  object,
  onClose,
  mode,
  onModeChange,
  onAskQuestion,
  onPlaySpeech,
}) => {
  if (!object) return null;

  const [activeTab, setActiveTab] = useState<'overview' | 'research'>(
    mode === 'research' ? 'research' : 'overview'
  );
  const [researchReport, setResearchReport] = useState<string | null>(null);
  const [researchSources, setResearchSources] = useState<GroundingSource[]>([]);
  const [isResearching, setIsResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);

  const handleTriggerResearch = async () => {
    setIsResearching(true);
    setResearchError(null);
    try {
      const data = await deepResearchObject({
        objectName: object.name,
        category: object.category,
        summary: object.summary || '',
      });
      setResearchReport(data.report);
      setResearchSources(data.sources || []);
      setActiveTab('research');
    } catch (err: any) {
      setResearchError(err.message || 'Research investigation failed.');
    } finally {
      setIsResearching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">{object.name}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                  {formatConfidence(object.confidence)}
                </span>
              </div>
              <span className="text-xs text-neutral-400">{object.category}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPlaySpeech(object.summary || object.name)}
              className="p-2 text-neutral-400 hover:text-cyan-300 hover:bg-neutral-800 rounded-lg transition-colors"
              title="Read Aloud Summary"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Controls: Overview / Learning vs Grounded Research Report */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-neutral-800 bg-neutral-950/30">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Learning Overview
          </button>

          <button
            onClick={() => {
              setActiveTab('research');
              if (!researchReport && !isResearching) {
                handleTriggerResearch();
              }
            }}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'research'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Microscope className="w-3.5 h-3.5" />
            Scientific Research
            {researchReport && <CheckCircle className="w-3 h-3 text-emerald-400 ml-1" />}
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-neutral-200 text-xs leading-relaxed">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-2">
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Core Understanding
                </span>
                <p className="text-neutral-200 text-xs">
                  {object.summary || 'A recognized physical object analyzed via computer vision.'}
                </p>
              </div>

              {object.workingPrinciple && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    How It Works Under the Hood
                  </h4>
                  <p className="p-3 rounded-xl bg-neutral-950/40 border border-neutral-800 text-neutral-300">
                    {object.workingPrinciple}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {object.material && (
                  <div className="p-3 rounded-xl bg-neutral-950/40 border border-neutral-800 space-y-1">
                    <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                      Material Characteristics
                    </span>
                    <span className="text-neutral-200 font-medium block">
                      {object.material}
                    </span>
                  </div>
                )}

                {object.practicalUse && (
                  <div className="p-3 rounded-xl bg-neutral-950/40 border border-neutral-800 space-y-1">
                    <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                      Practical Applications
                    </span>
                    <span className="text-neutral-200 font-medium block">
                      {object.practicalUse}
                    </span>
                  </div>
                )}
              </div>

              {object.curiousFact && (
                <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-cyan-200">
                  <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider block mb-1">
                    Curious Scientific Observation
                  </span>
                  "{object.curiousFact}"
                </div>
              )}

              {/* Quick Questions to ask about this object */}
              <div className="pt-2 border-t border-neutral-800 space-y-2">
                <span className="text-[11px] font-semibold text-neutral-400 block">
                  Explore Further with Assistant:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    `How is a ${object.name} manufactured?`,
                    `What are the historical origins of ${object.name}?`,
                    `What are typical failure modes of ${object.name}?`,
                  ].map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        onAskQuestion(q);
                        onClose();
                      }}
                      className="text-[11px] px-3 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-750 text-neutral-200 border border-neutral-700/60 transition-colors text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'research' && (
            <div className="space-y-4">
              {isResearching ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-3 text-center">
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-neutral-200">
                      Querying Scientific Knowledge & Search Grounding
                    </p>
                    <p className="text-xs text-neutral-400">
                      Retrieving engineering principles, material science, and verified web sources...
                    </p>
                  </div>
                </div>
              ) : researchError ? (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 space-y-2">
                  <p className="text-xs font-semibold">Research Error</p>
                  <p className="text-xs">{researchError}</p>
                  <button
                    onClick={handleTriggerResearch}
                    className="px-3 py-1 rounded bg-neutral-800 text-white text-xs font-medium"
                  >
                    Retry Investigation
                  </button>
                </div>
              ) : researchReport ? (
                <div className="space-y-4">
                  <div className="prose prose-invert prose-xs max-w-none bg-neutral-950/40 p-4 rounded-xl border border-neutral-800 whitespace-pre-wrap leading-relaxed">
                    {researchReport}
                  </div>

                  {researchSources.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                      <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Globe className="w-3 h-3 text-cyan-400" />
                        Authoritative Sources (Google Search Grounding)
                      </span>
                      <div className="space-y-1.5">
                        {researchSources.map((source, idx) => (
                          <a
                            key={idx}
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between gap-2 p-2 rounded bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-cyan-300 text-[11px] transition-colors"
                          >
                            <span className="truncate">{source.title}</span>
                            <ExternalLink className="w-3 h-3 shrink-0 text-neutral-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <Microscope className="w-8 h-8 text-neutral-500" />
                  <p className="text-xs text-neutral-400">
                    No active research report yet for this object.
                  </p>
                  <button
                    onClick={handleTriggerResearch}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                  >
                    Run Scientific Investigation
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between text-xs">
          <span className="text-neutral-400 font-mono text-[11px]">
            VISION AI Inspector · Gemini 3.8
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium rounded-lg transition-colors"
          >
            Close Explorer
          </button>
        </div>
      </div>
    </div>
  );
};
