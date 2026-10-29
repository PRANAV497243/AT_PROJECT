import React from 'react';
import { ShieldAlert, Zap, AlertTriangle, Info, Clock, CheckCircle2 } from 'lucide-react';
import { ScanOutput } from '../../engine';

interface SummaryDashboardProps {
  scanOutput: ScanOutput | null;
  isScanning?: boolean;
  onFilterSeverity: (sev: string) => void;
  selectedSeverity: string;
}

export const SummaryDashboard: React.FC<SummaryDashboardProps> = ({
  scanOutput,
  onFilterSeverity,
  selectedSeverity,
}) => {
  if (!scanOutput) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center text-slate-400 text-xs">
        Paste or upload a log file above to run the O(n) single-pass DFA scanner.
      </div>
    );
  }

  const { matches, scannedLength, totalLines, durationMs, matchesBySeverity, matchesByRule } = scanOutput;
  const throughputMBs = durationMs > 0 ? ((scannedLength / 1024 / 1024) / (durationMs / 1000)).toFixed(1) : '—';

  const severityConfigs: Record<string, { label: string; color: string; bg: string; border: string }> = {
    CRITICAL: { label: 'Critical', color: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/30' },
    HIGH: { label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/30' },
    MEDIUM: { label: 'Medium', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' },
    LOW: { label: 'Low', color: 'text-sky-400', bg: 'bg-sky-500/15', border: 'border-sky-500/30' },
    INFO: { label: 'Info', color: 'text-cyan-400', bg: 'bg-cyan-500/15', border: 'border-cyan-500/30' },
  };

  // Group line matches into 5 timeline segments for the timeline visualizer
  const maxLine = Math.max(1, totalLines);
  const numBuckets = Math.min(20, maxLine);
  const bucketSize = Math.max(1, Math.ceil(maxLine / numBuckets));
  const timelineBuckets = new Array(numBuckets).fill(0);

  matches.forEach((m) => {
    const bucketIdx = Math.min(numBuckets - 1, Math.floor((m.lineNumber - 1) / bucketSize));
    timelineBuckets[bucketIdx]++;
  });
  const maxBucketMatches = Math.max(1, ...timelineBuckets);

  return (
    <div className="space-y-4">
      {/* 4 Key Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Threats & Detections</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">{matches.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Across {totalLines} log lines</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Scan Latency</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-300">
            {durationMs} <span className="text-xs font-normal text-slate-400">ms</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Single-pass O(n) (No ReDoS)</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Throughput Speed</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300">
            {throughputMBs} <span className="text-xs font-normal text-slate-400">MB/s</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {(scannedLength / 1024).toFixed(1)} KB scanned
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Rules Triggered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300">
            {Object.keys(matchesByRule).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">From active multi-DFA</div>
        </div>
      </div>

      {/* Row: Severity Chart & Line-Number Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Severity Breakdown Bar Chart */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Detections by Severity
            </h4>
            {selectedSeverity !== 'ALL' && (
              <button
                onClick={() => onFilterSeverity('ALL')}
                className="text-[11px] text-indigo-400 hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-5 gap-2">
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const).map((sev) => {
              const count = matchesBySeverity[sev] || 0;
              const cfg = severityConfigs[sev];
              const isSelected = selectedSeverity === sev;
              return (
                <button
                  key={sev}
                  onClick={() => onFilterSeverity(isSelected ? 'ALL' : sev)}
                  className={`p-2.5 rounded-lg border text-center transition ${
                    isSelected ? 'ring-2 ring-indigo-500' : ''
                  } ${cfg.bg} ${cfg.border}`}
                >
                  <div className={`text-[10px] font-bold uppercase ${cfg.color}`}>{cfg.label}</div>
                  <div className={`text-lg font-mono font-bold mt-0.5 ${cfg.color}`}>{count}</div>
                </button>
              );
            })}
          </div>

          {/* Matches per rule pill list */}
          <div className="pt-2 border-t border-slate-800/80">
            <span className="text-[11px] text-slate-400 block mb-1.5">Matches per Rule:</span>
            <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto">
              {Object.entries(matchesByRule).map(([ruleName, count]) => (
                <span
                  key={ruleName}
                  className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700/80 flex items-center gap-1.5"
                >
                  <span>{ruleName}</span>
                  <span className="bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded-full font-bold">
                    {count}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Line-Number Timeline */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-sky-400" />
              Line-Number Detection Timeline
            </h4>
            <span className="text-[11px] text-slate-500 font-mono">1 – {totalLines} lines</span>
          </div>

          {/* Histogram bar display */}
          <div className="space-y-1 my-auto">
            <div className="h-20 bg-slate-950 rounded-lg border border-slate-800/80 p-2 flex items-end gap-1">
              {timelineBuckets.map((count, bIdx) => {
                const heightPct = count > 0 ? Math.max(15, Math.round((count / maxBucketMatches) * 100)) : 4;
                const startL = bIdx * bucketSize + 1;
                const endL = Math.min(totalLines, (bIdx + 1) * bucketSize);
                return (
                  <div
                    key={bIdx}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative"
                  >
                    <div
                      className={`w-full rounded-t transition-all ${
                        count > 0 ? 'bg-rose-500 group-hover:bg-rose-400' : 'bg-slate-800/50'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    {/* Hover tooltip */}
                    <div className="absolute bottom-full mb-1 hidden group-hover:block z-20 bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-200 px-2 py-1 rounded shadow whitespace-nowrap">
                      Lines {startL}–{endL}: {count} threats
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
              <span>Start of log</span>
              <span>Mid</span>
              <span>End of log</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400">
            Spikes indicate concentrated injection attempts or credential stuffing burst windows.
          </div>
        </div>
      </div>
    </div>
  );
};
