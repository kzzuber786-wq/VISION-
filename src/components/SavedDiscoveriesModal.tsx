import React from 'react';
import { X, Bookmark, Trash2, Calendar, ExternalLink, Eye } from 'lucide-react';
import { SavedDiscovery } from '../types/vision';

interface SavedDiscoveriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  discoveries: SavedDiscovery[];
  onDeleteDiscovery: (id: string) => void;
  onLoadDiscovery: (discovery: SavedDiscovery) => void;
  onClearAll: () => void;
}

export const SavedDiscoveriesModal: React.FC<SavedDiscoveriesModalProps> = ({
  isOpen,
  onClose,
  discoveries,
  onDeleteDiscovery,
  onLoadDiscovery,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <Bookmark className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">Saved Discoveries Archive</h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
              {discoveries.length} items
            </span>
          </div>

          <div className="flex items-center gap-2">
            {discoveries.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-[11px] text-neutral-400 hover:text-rose-400 transition-colors mr-2"
              >
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {discoveries.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-2 text-neutral-400">
              <Bookmark className="w-8 h-8 text-neutral-600 mb-1" />
              <p className="text-xs font-semibold text-neutral-300">Archive Empty</p>
              <p className="text-[11px] text-neutral-500 max-w-xs">
                When analyzing camera scenes or uploaded images, click "Save" in the intelligence panel to preserve discoveries here.
              </p>
            </div>
          ) : (
            discoveries.map((disc) => (
              <div
                key={disc.id}
                className="p-3.5 rounded-xl bg-neutral-950/50 border border-neutral-800/80 hover:border-cyan-500/40 transition-all flex items-start gap-4"
              >
                {disc.imageThumbnail && (
                  <img
                    src={disc.imageThumbnail}
                    alt={disc.title}
                    className="w-20 h-16 object-cover rounded-lg border border-neutral-800 shrink-0 bg-neutral-900"
                  />
                )}

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white truncate">{disc.title}</h4>
                    <span className="text-[10px] text-neutral-500 font-mono flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      {new Date(disc.timestamp).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-300 line-clamp-2 leading-relaxed">
                    {disc.sceneDescription}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-cyan-400 font-mono">
                      {disc.detectedCount} Entities Identified
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onLoadDiscovery(disc);
                          onClose();
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] font-medium transition-colors"
                      >
                        <Eye className="w-3 h-3 text-cyan-400" />
                        <span>Inspect</span>
                      </button>

                      <button
                        onClick={() => onDeleteDiscovery(disc.id)}
                        className="p-1 text-neutral-500 hover:text-rose-400 transition-colors"
                        title="Delete Discovery"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
