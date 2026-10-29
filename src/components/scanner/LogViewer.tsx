import React, { useMemo, useState } from 'react';
import { FileText, Edit3, Eye, Copy, Check } from 'lucide-react';
import { MatchResult, Severity } from '../../engine';

interface LogViewerProps {
  inputText: string;
  setInputText: (text: string) => void;
  matches: MatchResult[];
  selectedSeverityFilter: string;
  selectedRuleFilter: string;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  inputText,
  setInputText,
  matches,
  selectedSeverityFilter,
  selectedRuleFilter,
}) => {
  const [viewMode, setViewMode] = useState<'highlighted' | 'raw'>('highlighted');
  const [copied, setCopied] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (selectedSeverityFilter !== 'ALL' && m.severity !== selectedSeverityFilter) return false;
      if (selectedRuleFilter !== 'ALL' && m.ruleId !== selectedRuleFilter) return false;
      return true;
    });
  }, [matches, selectedSeverityFilter, selectedRuleFilter]);

  const severityColorStyles: Record<Severity, { badge: string; highlight: string }> = {
    CRITICAL: {
      badge: 'bg-rose-500/20 text-rose-300 border border-rose-500/50',
      highlight: 'bg-rose-500/30 text-rose-200 border-b-2 border-rose-400 font-bold',
    },
    HIGH: {
      badge: 'bg-orange-500/20 text-orange-300 border border-orange-500/50',
      highlight: 'bg-orange-500/30 text-orange-200 border-b-2 border-orange-400 font-bold',
    },
    MEDIUM: {
      badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/50',
      highlight: 'bg-amber-500/30 text-amber-200 border-b-2 border-amber-400 font-bold',
    },
    LOW: {
      badge: 'bg-sky-500/20 text-sky-300 border border-sky-500/50',
      highlight: 'bg-sky-500/30 text-sky-200 border-b-2 border-sky-400 font-bold',
    },
    INFO: {
      badge: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50',
      highlight: 'bg-cyan-500/30 text-cyan-200 border-b-2 border-cyan-400 font-bold',
    },
  };

  // Build highlighted JSX segments for the text
  const renderedContent = useMemo(() => {
    if (!inputText) {
      return <div className="text-slate-500 italic p-4">No log data provided.</div>;
    }

    if (viewMode === 'raw') {
      return (
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste log entries here..."
          className="w-full h-[460px] bg-slate-950 font-mono text-xs text-slate-200 p-4 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
        />
      );
    }

    // Sort matches by start index
    const sorted = [...filteredMatches].sort((a, b) => a.start - b.start);
    const elements: React.ReactNode[] = [];
    let lastIdx = 0;

    sorted.forEach((m, idx) => {
      // Avoid backward overlaps in rendering
      if (m.start < lastIdx) return;

      // Plain text before match
      if (m.start > lastIdx) {
        elements.push(
          <span key={`text_${lastIdx}`}>{inputText.slice(lastIdx, m.start)}</span>
        );
      }

      // Highlighted match
      const style = severityColorStyles[m.severity] || severityColorStyles.MEDIUM;
      elements.push(
        <mark
          key={`match_${m.start}_${idx}`}
          onClick={() => setSelectedMatch(m)}
          title={`[${m.severity}] ${m.ruleName}: "${m.text}" (Click for details)`}
          className={`cursor-pointer px-1 py-0.5 rounded transition ${style.highlight} hover:ring-2 hover:ring-white/40`}
        >
          {m.text}
        </mark>
      );

      lastIdx = m.end;
    });

    // Remainder text
    if (lastIdx < inputText.length) {
      elements.push(
        <span key={`text_tail`}>{inputText.slice(lastIdx)}</span>
      );
    }

    return (
      <div className="relative font-mono text-xs leading-relaxed max-h-[460px] overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-4">
        {/* Render lines with line numbers */}
        <pre className="whitespace-pre-wrap break-all select-text font-mono text-slate-300">
          {elements}
        </pre>
      </div>
    );
  }, [inputText, filteredMatches, viewMode, setInputText]);

  const handleCopy = () => {
    navigator.clipboard.writeText(inputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      {/* Top Header & Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-slate-200">
            Log Inspector & Inline Highlight Feed
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            {filteredMatches.length} threat highlights
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('highlighted')}
              className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition ${
                viewMode === 'highlighted'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Highlighted View
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition ${
                viewMode === 'raw'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Raw Edit
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Copy log text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {renderedContent}

      {/* Selected Highlight Details Drawer / Modal */}
      {selectedMatch && (
        <div className="p-3.5 rounded-lg bg-slate-950 border border-indigo-500/40 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                severityColorStyles[selectedMatch.severity]?.badge
              }`}
            >
              {selectedMatch.severity}
            </span>
            <span className="font-semibold text-slate-200">{selectedMatch.ruleName}</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Line {selectedMatch.lineNumber}</span>
            <span className="text-slate-500">|</span>
            <span className="text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-600/30">
              Matched: &quot;{selectedMatch.text}&quot;
            </span>
          </div>

          <button
            onClick={() => setSelectedMatch(null)}
            className="text-xs text-slate-400 hover:text-white"
          >
            Dismiss ✕
          </button>
        </div>
      )}
    </div>
  );
};
