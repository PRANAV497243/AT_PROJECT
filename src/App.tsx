import { useState } from 'react';
import {
  ShieldAlert,
  GitGraph,
  Sparkles,
  BookOpen,
  ShieldCheck,
  Code,
  Flame,
} from 'lucide-react';
import { useAppStore } from './store/useAppStore';
import { ThreatScannerPage } from './pages/ThreatScannerPage';
import { VisualizerPage } from './pages/VisualizerPage';
import { FormValidatorPage } from './pages/FormValidatorPage';
import { LexerGeneratorPage } from './pages/LexerGeneratorPage';
import { BenchmarkPage } from './pages/BenchmarkPage';

export default function App() {
  const { activeTab, setActiveTab } = useAppStore();
  const [showTocNotes, setShowTocNotes] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12 antialiased">
      {/* Top Sticky Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                  PatternGuard
                </h1>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  DFA Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automata Theory (Regex → ε-NFA → DFA → Hopcroft) • O(n) Zero Backtracking
              </p>
            </div>
          </div>

          {/* 5 Tabs Navigation & Theory Notes */}
          <div className="flex items-center gap-2">
            <nav className="flex flex-wrap items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-0.5">
              <button
                onClick={() => setActiveTab('scanner')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'scanner'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Threat Scanner</span>
              </button>

              <button
                onClick={() => setActiveTab('visualizer')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'visualizer'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GitGraph className="w-3.5 h-3.5 text-cyan-400" />
                <span>Visualizer</span>
              </button>

              <button
                onClick={() => setActiveTab('validator')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'validator'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Form Validator</span>
              </button>

              <button
                onClick={() => setActiveTab('lexer-gen')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'lexer-gen'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code className="w-3.5 h-3.5 text-purple-400" />
                <span>Lexer Gen</span>
              </button>

              <button
                onClick={() => setActiveTab('benchmark')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'benchmark'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>ReDoS Benchmark</span>
              </button>
            </nav>

            <button
              onClick={() => setShowTocNotes(!showTocNotes)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1 transition"
              title="Theory of Computation Architecture Notes"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden xl:inline">TOC Notes</span>
            </button>
          </div>
        </div>
      </header>

      {/* Theory of Computation Architecture Modal / Banner */}
      {showTocNotes && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Theory of Computation: Why DFA-Powered Scanning Guarantees ReDoS Immunity
              </h3>
              <button
                onClick={() => setShowTocNotes(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs text-slate-300">
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="font-semibold text-emerald-400 mb-1 flex items-center gap-1">
                  <span>1. Shunting-Yard AST</span>
                </div>
                Tokenizes classes <code className="text-amber-300">[a-z]</code>,{' '}
                <code className="text-amber-300">[^abc]</code>, escapes <code className="text-amber-300">\d,\w,\s</code>,
                wildcard <code className="text-amber-300">.</code>, and range quantifiers{' '}
                <code className="text-amber-300">&#123;m,n&#125;</code>.
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="font-semibold text-sky-400 mb-1 flex items-center gap-1">
                  <span>2. Thompson ε-NFA</span>
                </div>
                Recursively compiles AST into an ε-NFA. Multi-pattern union connects rules to a single root start
                state, tagging accepting states with rule IDs and priority.
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="font-semibold text-purple-400 mb-1 flex items-center gap-1">
                  <span>3. Subset Construction</span>
                </div>
                Transforms ε-closures into deterministic states with a 2,000-state safety threshold and atomic
                alphabet equivalence class partitioning.
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="font-semibold text-rose-400 mb-1 flex items-center gap-1">
                  <span>4. Hopcroft Minimization</span>
                </div>
                Merges distinguishable equivalence partitions while preserving distinct rule IDs, producing the
                unique minimal DFA for O(n) single-pass scanning.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main View Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-5">
        {activeTab === 'scanner' && <ThreatScannerPage />}
        {activeTab === 'visualizer' && <VisualizerPage />}
        {activeTab === 'validator' && <FormValidatorPage />}
        {activeTab === 'lexer-gen' && <LexerGeneratorPage />}
        {activeTab === 'benchmark' && <BenchmarkPage />}
      </main>
    </div>
  );
}
