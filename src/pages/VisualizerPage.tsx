import React, { useEffect, useState } from 'react';
import {
  GitGraph,
  Eye,
  EyeOff,
  Cpu,
  Table as TableIcon,
  Sparkles,
  Layers,
  Terminal,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { AutomatonGraph } from '../components/visualizer/AutomatonGraph';
import { TapeController } from '../components/visualizer/TapeController';
import { TransitionTable } from '../components/visualizer/TransitionTable';
import { ASTView } from '../components/visualizer/ASTView';

export const VisualizerPage: React.FC = () => {
  const {
    rules,
    selectedVisualizerRuleId,
    setSelectedVisualizerRuleId,
    customVisualizerRegex,
    setCustomVisualizerRegex,
    visualizerStage,
    setVisualizerStage,
    showTrapState,
    setShowTrapState,
    visualizerData,
    visualizerError,
    compileVisualizerAutomata,
    simResult,
    simStepIdx,
  } = useAppStore();

  const [activeSubTab, setActiveSubTab] = useState<'graph' | 'table' | 'ast'>('graph');

  useEffect(() => {
    compileVisualizerAutomata();
  }, []);

  const currentAutomaton =
    visualizerStage === 'eNFA'
      ? visualizerData?.nfa
      : visualizerStage === 'DFA'
      ? visualizerData?.dfa
      : visualizerData?.minDfa;

  const currentStep = simResult?.steps[simStepIdx] || {
    activeStates: [],
    activeEdges: [],
  };

  const nfaCount = visualizerData?.nfa?.states.length ?? 0;
  const dfaCount = visualizerData?.dfa?.states.filter((s) => !s.isTrap).length ?? 0;
  const minCount = visualizerData?.minDfa?.states.filter((s) => !s.isTrap).length ?? 0;
  const reductionPct = visualizerData?.minDfa?.reductionPct ?? 0;

  return (
    <div className="space-y-5">
      {/* Top Configuration & Metric Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Rule Selector / Custom Regex */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              Automaton Target Pattern
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              Theory: AST → ε-NFA → DFA → Hopcroft
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Pick Rule from Catalog:</label>
              <select
                value={selectedVisualizerRuleId}
                onChange={(e) => setSelectedVisualizerRuleId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="custom">✨ (a|b)*abb (Textbook Example / Custom)</option>
                {rules.map((r) => (
                  <option key={r.id} value={r.id}>
                    [{r.severity}] {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Active Regular Expression:</label>
              {selectedVisualizerRuleId === 'custom' ? (
                <input
                  type="text"
                  value={customVisualizerRegex}
                  onChange={(e) => setCustomVisualizerRegex(e.target.value)}
                  placeholder="Enter regex, e.g. (a|b)*abb"
                  className="w-full bg-slate-950 border border-slate-700 text-xs font-mono text-emerald-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 transition"
                />
              ) : (
                <div className="w-full bg-slate-950/80 border border-slate-800 text-xs font-mono text-emerald-400 px-3 py-2 rounded-lg truncate">
                  {rules.find((r) => r.id === selectedVisualizerRuleId)?.regex || ''}
                </div>
              )}
            </div>
          </div>

          {visualizerError ? (
            <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <span>{visualizerError}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Compiled OK
              </span>
              <span>•</span>
              <span>Alphabet: &#123;{(currentAutomaton?.alphabet || []).join(', ')}&#125;</span>
            </div>
          )}
        </div>

        {/* State Reduction Metrics */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              Automata Pipeline Stages
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 my-auto">
            <button
              onClick={() => {
                setVisualizerStage('eNFA');
                setActiveSubTab('graph');
              }}
              className={`p-2.5 rounded-lg border text-left transition ${
                visualizerStage === 'eNFA'
                  ? 'bg-indigo-950/70 border-indigo-500 text-white shadow-sm'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="text-[11px] text-slate-400">1. Thompson ε-NFA</div>
              <div className="text-lg font-bold font-mono text-sky-400 mt-0.5">
                {nfaCount} <span className="text-xs font-normal">states</span>
              </div>
            </button>

            <button
              onClick={() => {
                setVisualizerStage('DFA');
                setActiveSubTab('graph');
              }}
              className={`p-2.5 rounded-lg border text-left transition ${
                visualizerStage === 'DFA'
                  ? 'bg-indigo-950/70 border-indigo-500 text-white shadow-sm'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="text-[11px] text-slate-400">2. Subset DFA</div>
              <div className="text-lg font-bold font-mono text-purple-400 mt-0.5">
                {dfaCount} <span className="text-xs font-normal">states</span>
              </div>
            </button>

            <button
              onClick={() => {
                setVisualizerStage('MinDFA');
                setActiveSubTab('graph');
              }}
              className={`p-2.5 rounded-lg border text-left transition ${
                visualizerStage === 'MinDFA'
                  ? 'bg-indigo-950/70 border-indigo-500 text-white shadow-sm'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="text-[11px] text-slate-400">3. Hopcroft Min-DFA</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-bold font-mono text-emerald-400">{minCount}</span>
                {reductionPct > 0 && (
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-1 py-0.5 rounded">
                    -{reductionPct}%
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Graph & Simulator Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 8 columns: Graph Canvas or Auxiliary Tables */}
        <div className="lg:col-span-8 space-y-3">
          {/* Sub-view switcher bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveSubTab('graph')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                  activeSubTab === 'graph'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>React Flow Graph ({visualizerStage})</span>
              </button>

              <button
                onClick={() => setActiveSubTab('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                  activeSubTab === 'table'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Transition Table δ</span>
              </button>

              <button
                onClick={() => setActiveSubTab('ast')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                  activeSubTab === 'ast'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GitGraph className="w-3.5 h-3.5" />
                <span>AST Hierarchy</span>
              </button>
            </div>

            {/* Trap state toggle */}
            {visualizerStage !== 'eNFA' && activeSubTab === 'graph' && (
              <button
                onClick={() => setShowTrapState(!showTrapState)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg flex items-center gap-1.5 border transition ${
                  showTrapState
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="Show / Hide Dead Trap State (∅)"
              >
                {showTrapState ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                Trap State (∅)
              </button>
            )}
          </div>

          {/* Tab Content Display */}
          {activeSubTab === 'graph' && currentAutomaton && (
            <AutomatonGraph
              automaton={currentAutomaton}
              activeStates={currentStep.activeStates}
              activeEdges={currentStep.activeEdges}
              showTrapState={showTrapState}
            />
          )}

          {activeSubTab === 'table' && visualizerData?.minDfa && (
            <TransitionTable dfa={visualizerData.minDfa} showTrapState={showTrapState} />
          )}

          {activeSubTab === 'ast' && <ASTView ast={visualizerData?.ast ?? null} />}
        </div>

        {/* Right 4 columns: Interactive Tape Simulator & Trace */}
        <div className="lg:col-span-4 space-y-4">
          <TapeController />

          {/* State Path Trace */}
          {simResult && simResult.path && simResult.path.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Simulation State Path
              </h4>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 flex flex-wrap items-center gap-1.5 max-h-[140px] overflow-y-auto">
                {simResult.path.map((stId, idx) => (
                  <React.Fragment key={idx}>
                    <span
                      className={`px-2 py-0.5 rounded ${
                        idx === simStepIdx
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : idx < simStepIdx
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {stId}
                    </span>
                    {idx < simResult.path.length - 1 && <span className="text-slate-600">→</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
