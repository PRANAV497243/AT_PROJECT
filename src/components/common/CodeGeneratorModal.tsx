import React, { useState } from 'react';
import { Code2, Copy, Check, X, FileTerminal } from 'lucide-react';
import { DFA } from '../../engine';
import { generateCodeExports } from '../../utils/exportUtils';

interface CodeGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  automaton: DFA | null;
  regex: string;
}

export const CodeGeneratorModal: React.FC<CodeGeneratorModalProps> = ({
  isOpen,
  onClose,
  automaton,
  regex,
}) => {
  const [lang, setLang] = useState<'python' | 'c' | 'ts'>('python');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !automaton) return null;

  const codes = generateCodeExports(automaton, regex);
  const currentCode = lang === 'python' ? codes.pythonCode : lang === 'c' ? codes.cCode : codes.tsCode;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                Export Minimized DFA Code
                <span className="text-[11px] font-mono font-normal text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-700/50">
                  {regex}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Deterministic O(n) state machine with zero runtime dependencies.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Language Switcher & Copy */}
        <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setLang('python')}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                lang === 'python' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Python DFA Class
            </button>
            <button
              onClick={() => setLang('c')}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                lang === 'c' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              C99 Switch-Case
            </button>
            <button
              onClick={() => setLang('ts')}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                lang === 'ts' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              TypeScript DFA Class
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Code
              </>
            )}
          </button>
        </div>

        {/* Code Content */}
        <div className="p-4 flex-1 overflow-auto bg-slate-950">
          <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre select-text">
            {currentCode}
          </pre>
        </div>

        {/* Footer Note */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <FileTerminal className="w-3.5 h-3.5 text-indigo-400" />
            Direct drop-in. Runs in strictly O(n) single pass with zero backtracking.
          </span>
          <span className="font-mono text-slate-500">
            {automaton.states.length} states • {automaton.alphabet.length} alphabet
          </span>
        </div>
      </div>
    </div>
  );
};
