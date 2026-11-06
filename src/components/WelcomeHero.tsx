import React from 'react';
import { Eye, ArrowRight, Scan, MessageSquare, Compass, ShieldCheck, Zap } from 'lucide-react';

interface WelcomeHeroProps {
  onStartExploring: () => void;
}

export const WelcomeHero: React.FC<WelcomeHeroProps> = ({ onStartExploring }) => {
  return (
    <div className="fixed inset-0 z-40 bg-neutral-950 flex flex-col items-center justify-center p-6 select-none overflow-y-auto">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-cyan-600/10 blur-[140px] pointer-events-none rounded-full" />

      {/* Futuristic Reticle Grid Background */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #38bdf8 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative max-w-3xl w-full flex flex-col items-center text-center space-y-8 my-auto py-8">
        {/* Brand Emblem */}
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.25)]">
          <Eye className="w-8 h-8 text-cyan-400" />
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#38bdf8]" />
        </div>

        {/* Title & Tagline */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-cyan-400">
            <Zap className="w-3 h-3" />
            <span>MULTIMODAL PHYSICAL WORLD PERCEPTION</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white font-sans">
            VISION <span className="text-cyan-400">AI</span>
          </h1>

          <p className="text-lg sm:text-xl font-medium text-neutral-300 font-sans tracking-tight">
            "See Beyond What You See."
          </p>

          <p className="max-w-xl mx-auto text-sm text-neutral-400 leading-relaxed font-sans">
            An intelligent visual assistant that transforms what your camera sees into knowledge you can explore.
          </p>
        </div>

        {/* Three Primary Capabilities */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-left pt-2">
          {/* 1. See */}
          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-cyan-500/40 transition-all space-y-2 group">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Scan className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
              1. See
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Identify and understand physical entities, assemblies, materials, and mechanisms in real time.
            </p>
          </div>

          {/* 2. Ask */}
          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-cyan-500/40 transition-all space-y-2 group">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
              2. Ask
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Engage in rich contextual conversations about anything in view using voice or interactive text.
            </p>
          </div>

          {/* 3. Discover */}
          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-cyan-500/40 transition-all space-y-2 group">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Compass className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
              3. Discover
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Explore scientific operating principles, material compositions, and verified web citations.
            </p>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="pt-2">
          <button
            onClick={onStartExploring}
            className="flex items-center gap-3 px-8 py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] border border-cyan-400/40"
          >
            <span>Start Exploring</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Trust & Privacy Notice */}
        <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
          <span>Local client frame processing · Private session memory · Zero tracking</span>
        </div>
      </div>
    </div>
  );
};
