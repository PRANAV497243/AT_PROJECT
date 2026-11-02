import React, { useState, useMemo, useEffect } from 'react';
import {
  Code,
  Layers,
  Play,
  RotateCcw,
  Table as TableIcon,
} from 'lucide-react';
import {
  Rule,
  buildMultiRuleNFA,
  buildSubsetDFA,
  minimizeDFA,
  DFAScanner,
  MatchResult,
} from '../engine';

interface TokenRule {
  id: string;
  name: string;
  regex: string;
  priority: number;
  color: string;
  enabled: boolean;
}

const DEFAULT_LEXER_RULES: TokenRule[] = [
  {
    id: 'tok_keyword',
    name: 'KEYWORD',
    regex: '(function|return|if|else|const|let|var|while|for|break|continue|true|false|null)',
    priority: 90,
    color: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    enabled: true,
  },
  {
    id: 'tok_operator',
    name: 'OPERATOR',
    regex: '(===|==|!=|<=|>=|=>|\\+\\+|--|\\+|-|\\*|/|=|&&|\\|\\||<|>)',
    priority: 80,
    color: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    enabled: true,
  },
  {
    id: 'tok_string',
    name: 'STRING',
    regex: '"([^"\\\\\n]|\\\\.)*"|\'([^\'\\\\\n]|\\\\.)*\'',
    priority: 75,
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    enabled: true,
  },
  {
    id: 'tok_number',
    name: 'NUMBER',
    regex: '[0-9]+(\\.[0-9]+)?',
    priority: 70,
    color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    enabled: true,
  },
  {
    id: 'tok_identifier',
    name: 'IDENTIFIER',
    regex: '[a-zA-Z_][a-zA-Z0-9_]*',
    priority: 50,
    color: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    enabled: true,
  },
  {
    id: 'tok_punctuation',
    name: 'PUNCTUATION',
    regex: '[;:,\(\)\{\}\\[\\]]',
    priority: 40,
    color: 'bg-slate-800 text-slate-300 border-slate-700',
    enabled: true,
  },
];

const CODE_PRESETS = [
  {
    name: 'Recursive Factorial',
    code: `function factorial(n) {
  if (n <= 1) {
    return 1;
  }
  return n * factorial(n - 1);
}

const result = factorial(5);
`,
  },
  {
    name: 'User Authentication Handler',
    code: `const authenticate = (username, role) => {
  let isValid = false;
  if (role === "admin" && username != null) {
    isValid = true;
    return "ACCESS_GRANTED";
  }
  return "ACCESS_DENIED";
};
`,
  },
  {
    name: 'Math Calculations',
    code: `let total = 0;
for (let i = 0; i < 100; i++) {
  total += (i * 3.14) / 2;
}
return total;
`,
  },
];

export const LexerGeneratorPage: React.FC = () => {
  const [tokenRules, setTokenRules] = useState<TokenRule[]>(DEFAULT_LEXER_RULES);
  const [codeSnippet, setCodeSnippet] = useState(CODE_PRESETS[0].code);
  const [selectedTokenType, setSelectedTokenType] = useState<string>('ALL');
  const [tokens, setTokens] = useState<MatchResult[]>([]);
  const [lexerStats, setLexerStats] = useState<{
    stateCount: number;
    alphabetSize: number;
    compileTimeMs: number;
    tokenizeTimeMs: number;
  } | null>(null);

  // Compile combined Lexer DFA and tokenize
  const runLexer = () => {
    const compileStart = performance.now();

    // Map TokenRule to Rule
    const engineRules: Rule[] = tokenRules
      .filter((r) => r.enabled)
      .map((r) => ({
        id: r.id,
        name: r.name,
        regex: r.regex,
        category: 'CUSTOM',
        severity: 'INFO',
        description: `Token: ${r.name}`,
        enabled: true,
        priority: r.priority,
      }));

    try {
      const nfa = buildMultiRuleNFA(engineRules);
      const dfa = buildSubsetDFA(nfa);
      const minDfa = minimizeDFA(dfa);
      const compileTimeMs = +(performance.now() - compileStart).toFixed(2);

      const scanner = new DFAScanner(minDfa, engineRules);
      const scanOut = scanner.scan(codeSnippet, { allowOverlapping: false });

      setTokens(scanOut.matches);
      setLexerStats({
        stateCount: minDfa.states.length,
        alphabetSize: minDfa.alphabet.length,
        compileTimeMs,
        tokenizeTimeMs: scanOut.durationMs,
      });
    } catch (err) {
      console.error('Lexer DFA generation failed:', err);
    }
  };

  useEffect(() => {
    runLexer();
  }, [tokenRules]);

  const filteredTokens = useMemo(() => {
    if (selectedTokenType === 'ALL') return tokens;
    return tokens.filter((t) => t.ruleName === selectedTokenType);
  }, [tokens, selectedTokenType]);

  const tokenColorMap = useMemo(() => {
    const map = new Map<string, string>();
    tokenRules.forEach((r) => map.set(r.name, r.color));
    return map;
  }, [tokenRules]);

  return (
    <div className="space-y-6 lexer-gen-tab [font-variant-ligatures:none]" style={{ fontVariantLigatures: 'none' }}>
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Code className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-100">
              Lexer Generator: Multi-Rule DFA Tokenizer (Compiler Front-End)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Defines lexical grammar tokens (Keywords, Identifiers, Numbers, Operators, Strings).
            The engine compiles all rules into a <strong>single unified minimal DFA</strong> and tokenizes code
            in O(n) with zero backtracking.
          </p>
        </div>

        {lexerStats && (
          <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[10px]">DFA States</span>
              <span className="text-purple-300 font-bold">{lexerStats.stateCount} states</span>
            </div>
            <div className="h-6 w-[1px] bg-slate-800" />
            <div>
              <span className="text-slate-500 block text-[10px]">Compile Time</span>
              <span className="text-emerald-400 font-bold">{lexerStats.compileTimeMs} ms</span>
            </div>
            <div className="h-6 w-[1px] bg-slate-800" />
            <div>
              <span className="text-slate-500 block text-[10px]">Tokenize Pass</span>
              <span className="text-cyan-400 font-bold">{lexerStats.tokenizeTimeMs} ms</span>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Token Rules Editor + Code Snippet Input */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 5 Columns: Token Grammar Rules */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              Lexer Token Grammar
            </h3>
            <button
              onClick={() => setTokenRules(DEFAULT_LEXER_RULES)}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 hover:underline"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Rules
            </button>
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {tokenRules.map((rule) => (
              <div
                key={rule.id}
                className={`p-3 rounded-lg border text-xs transition ${
                  rule.enabled ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-950/40 border-slate-900 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(e) =>
                        setTokenRules((prev) =>
                          prev.map((r) => (r.id === rule.id ? { ...r, enabled: e.target.checked } : r))
                        )
                      }
                      className="accent-purple-500 rounded"
                    />
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${rule.color}`}>
                      {rule.name}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    Priority: {rule.priority}
                  </span>
                </div>

                <div className="font-mono text-[11px] text-emerald-400 bg-slate-900 px-2.5 py-1 rounded truncate">
                  {rule.regex}
                </div>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
            Higher priority resolves ambiguity (e.g., <code className="text-slate-400">KEYWORD</code> priority 90
            wins over <code className="text-slate-400">IDENTIFIER</code> priority 50 for tokens like &apos;function&apos;).
          </div>
        </div>

        {/* Right 7 Columns: Code Snippet & Presets */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-cyan-400" />
              Source Code Snippet
            </h3>

            {/* Presets */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-500 mr-1">Presets:</span>
              {CODE_PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setCodeSnippet(p.code)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono border transition ${
                    codeSnippet === p.code
                      ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={codeSnippet}
            onChange={(e) => setCodeSnippet(e.target.value)}
            placeholder="Type code snippet to tokenize..."
            style={{ fontVariantLigatures: 'none' }}
            className="w-full h-[280px] bg-slate-950 font-mono [font-variant-ligatures:none] text-xs text-slate-200 p-3 rounded-lg border border-slate-800 focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-400 font-mono">
              Tokens Matched: <strong className="text-white">{tokens.length}</strong>
            </span>

            <button
              onClick={runLexer}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Re-Tokenize Pass
            </button>
          </div>
        </div>
      </div>

      {/* Token Stream Visualizer & Filter */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Token Stream & Symbol Classification
            </h3>
          </div>

          {/* Token Type Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedTokenType('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium border transition ${
                selectedTokenType === 'ALL'
                  ? 'bg-slate-100 text-slate-950 border-white'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              ALL ({tokens.length})
            </button>
            {tokenRules.map((r) => {
              const count = tokens.filter((t) => t.ruleName === r.name).length;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedTokenType(r.name)}
                  className={`px-2.5 py-1 rounded text-xs font-mono border transition ${
                    selectedTokenType === r.name ? 'ring-2 ring-purple-400' : ''
                  } ${r.color}`}
                >
                  {r.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Visual Token Ribbon */}
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto">
          {filteredTokens.length === 0 ? (
            <span className="text-xs text-slate-500 italic">No tokens matched.</span>
          ) : (
            filteredTokens.map((t, idx) => (
              <span
                key={idx}
                className={`px-2 py-1 rounded font-mono text-xs font-semibold border flex items-center gap-1.5 ${
                  tokenColorMap.get(t.ruleName) || 'bg-slate-800 text-slate-200 border-slate-700'
                }`}
                title={`Token: ${t.ruleName} | Line ${t.lineNumber}`}
              >
                <span>{t.text}</span>
                <span className="text-[9px] opacity-60 uppercase font-sans">({t.ruleName})</span>
              </span>
            ))
          )}
        </div>

        {/* Structured Token Table */}
        <div className="overflow-x-auto max-h-[300px] rounded-lg border border-slate-800">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
              <tr>
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">Token Type</th>
                <th className="py-2 px-3">Lexeme</th>
                <th className="py-2 px-3">Line</th>
                <th className="py-2 px-3">Span (Offset)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
              {filteredTokens.map((t, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition">
                  <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        tokenColorMap.get(t.ruleName) || 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {t.ruleName}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-bold text-white font-mono">&quot;{t.text}&quot;</td>
                  <td className="py-2 px-3 text-slate-400">Line {t.lineNumber}</td>
                  <td className="py-2 px-3 text-slate-500 font-mono">[{t.start}..{t.end}]</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
