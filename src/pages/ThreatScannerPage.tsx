import React, { useEffect, useState, useRef } from 'react';
import {
  Upload,
  FileCode,
  Sliders,
  Trash2,
  RefreshCw,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { SummaryDashboard } from '../components/scanner/SummaryDashboard';
import { LogViewer } from '../components/scanner/LogViewer';
import { RuleManagerModal } from '../components/scanner/RuleManagerModal';

export const ThreatScannerPage: React.FC = () => {
  const {
    inputText,
    setInputText,
    loadSampleLog,
    clearInputText,
    scanOutput,
    isScanning,
    isCompiling,
    scannerError,
    compileStats,
    runScan,
    compileMultiRuleDFA,
    rules,
    allowOverlapping,
    setAllowOverlapping,
    selectedSeverityFilter,
    setSelectedSeverityFilter,
    selectedRuleFilter,
  } = useAppStore();

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize and compile multi-pattern DFA on mount
  useEffect(() => {
    compileMultiRuleDFA();
  }, []);

  // Handle local log file upload (.log, .txt, .json)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setInputText(content);
        runScan();
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  const enabledRulesCount = rules.filter((r) => r.enabled).length;

  return (
    <div className="space-y-5">
      {/* Top Banner: Multi-DFA Engine Status & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100">
                Single-Pass O(n) Multi-Pattern DFA Engine
              </h2>
              {isCompiling ? (
                <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Compiling DFA...
                </span>
              ) : (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> DFA Ready
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {compileStats ? (
                <span>
                  {enabledRulesCount} rules unified into{' '}
                  <strong className="text-slate-200 font-mono">{compileStats.stateCount} minimal states</strong>{' '}
                  ({compileStats.reductionPct}% Hopcroft reduction) • ReDoS Immune
                </span>
              ) : (
                'Compiling unified automata from active rule catalog...'
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadSampleLog}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 transition"
            title="Load realistic server security log"
          >
            <FileCode className="w-3.5 h-3.5" />
            Load Sample Log
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".log,.txt,.json,.csv"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
            title="Upload custom log file"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            Upload Log
          </button>

          <button
            onClick={() => setIsRuleModalOpen(true)}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
            title="Configure rules and signatures"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Rules ({enabledRulesCount})</span>
          </button>

          <label className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950 px-2.5 py-2 rounded-lg border border-slate-800 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allowOverlapping}
              onChange={(e) => setAllowOverlapping(e.target.checked)}
              className="accent-indigo-500 rounded"
            />
            <span>Overlapping</span>
          </label>

          <button
            onClick={() => runScan()}
            disabled={isScanning || !inputText}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition shadow-sm disabled:opacity-40"
          >
            {isScanning ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            Scan Pass
          </button>

          {inputText && (
            <button
              onClick={clearInputText}
              className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
              title="Clear input"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Compiler / Scanner Error Banner */}
      {scannerError && (
        <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-3.5 text-xs text-rose-300 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{scannerError}</span>
        </div>
      )}

      {/* Summary Dashboard: Metrics, Severity Breakdown, Line Timeline */}
      <SummaryDashboard
        scanOutput={scanOutput}
        isScanning={isScanning}
        onFilterSeverity={(sev) => setSelectedSeverityFilter(sev)}
        selectedSeverity={selectedSeverityFilter}
      />

      {/* Log Inspector with Inline Highlights */}
      <LogViewer
        inputText={inputText}
        setInputText={setInputText}
        matches={scanOutput?.matches || []}
        selectedSeverityFilter={selectedSeverityFilter}
        selectedRuleFilter={selectedRuleFilter}
      />

      {/* Rule Manager Modal */}
      <RuleManagerModal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
      />
    </div>
  );
};
