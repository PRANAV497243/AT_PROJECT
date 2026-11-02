import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Mail,
  Lock,
  User,
  Phone,
  Globe,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  parseRegexToAST,
  buildThompsonNFA,
  buildSubsetDFA,
  minimizeDFA,
  DFA,
  matchesEquivClass,
} from '../engine';
import { useAppStore } from '../store/useAppStore';

interface ValidatorFieldConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  regex: string;
  placeholder: string;
  helpText: string;
}

const FIELD_CONFIGS: ValidatorFieldConfig[] = [
  {
    id: 'email',
    label: 'Email Address',
    icon: Mail,
    regex: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
    placeholder: 'alice.smith@domain.org',
    helpText: 'Requires valid username, @ symbol, domain name, and at least 2-letter TLD.',
  },
  {
    id: 'username',
    label: 'Username',
    icon: User,
    regex: '[a-zA-Z][a-zA-Z0-9_]{2,19}',
    placeholder: 'dev_alex_99',
    helpText: 'Must begin with a letter, 3 to 20 characters alphanumeric or underscore.',
  },
  {
    id: 'phone',
    label: 'Indian Phone Number',
    icon: Phone,
    regex: '(\\+91[\\s-]?)?[6-9]\\d{9}',
    placeholder: '+91 9876543210',
    helpText: '10 digits starting with 6-9, optional +91 prefix with space or hyphen.',
  },
  {
    id: 'url',
    label: 'Secure URL (HTTP/HTTPS)',
    icon: Globe,
    regex: 'https?://[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}(/[a-zA-Z0-9_.~:/?#@!$&\'()*+,;=-]*)?',
    placeholder: 'https://security.api.io/v1/auth',
    helpText: 'Requires http:// or https:// protocol followed by valid hostname and optional path.',
  },
];

const PASSWORD_SUB_RULES = [
  { id: 'len', label: '8+ Characters Length', regex: '.{8,}' },
  { id: 'digit', label: 'At least 1 Digit [0-9]', regex: '.*[0-9].*' },
  { id: 'upper', label: 'At least 1 Uppercase [A-Z]', regex: '.*[A-Z].*' },
  { id: 'lower', label: 'At least 1 Lowercase [a-z]', regex: '.*[a-z].*' },
];

interface FieldEvaluation {
  status: 'VALID' | 'INCOMPLETE' | 'TRAPPED' | 'EMPTY';
  currentState: string;
  path: string[];
  trapChar: string | null;
  trapIndex: number | null;
  message: string;
}

/**
 * Step-by-step DFA evaluator that pinpoints the exact character and state transition to Trap.
 */
function evaluateStringWithDFA(dfa: DFA, input: string): FieldEvaluation {
  if (!input) {
    return {
      status: 'EMPTY',
      currentState: dfa.startState,
      path: [dfa.startState],
      trapChar: null,
      trapIndex: null,
      message: 'Awaiting user input...',
    };
  }

  let curr = dfa.startState;
  const path = [curr];
  const equivClasses = dfa.equivClasses || [];
  const acceptSet = new Set(dfa.acceptStates);

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    let next: string | null = null;

    for (const t of dfa.transitions) {
      if (t.from === curr) {
        const eq = equivClasses.find((e) => e.label === t.symbol);
        let matches = false;
        if (eq) {
          matches = matchesEquivClass(eq, ch);
        } else if (t.symbol.length === 1) {
          matches = t.symbol === ch;
        }

        if (matches) {
          next = t.to;
          break;
        }
      }
    }

    const nextStateObj = dfa.states.find((s) => s.id === next);
    // If no transition exists OR it leads to dead trap state (∅)
    if (!next || nextStateObj?.isTrap || next === 'q_dead') {
      return {
        status: 'TRAPPED',
        currentState: '∅ (Trap)',
        path: [...path, 'q_dead'],
        trapChar: ch,
        trapIndex: i,
        message: `Fell into Trap State (∅) on character '${ch}' at index ${i + 1}.`,
      };
    }

    curr = next;
    path.push(curr);
  }

  const isAccepted = acceptSet.has(curr);
  return {
    status: isAccepted ? 'VALID' : 'INCOMPLETE',
    currentState: curr,
    path,
    trapChar: null,
    trapIndex: null,
    message: isAccepted
      ? `Accepted! Successfully ended in accept state ${curr}.`
      : `Incomplete input: reached non-accepting state ${curr}. More characters required.`,
  };
}

export const FormValidatorPage: React.FC = () => {
  const { setActiveTab, setSelectedVisualizerRuleId, setCustomVisualizerRegex } = useAppStore();

  // Form values
  const [formValues, setFormValues] = useState<Record<string, string>>({
    email: 'alice.smith@domain.org',
    username: 'dev_alex_99',
    phone: '+91 9876543210',
    url: 'https://security.api.io/v1/auth',
    password: 'SecurePassword123!',
  });

  // Precompile DFAs for fields
  const compiledDFAs = useMemo(() => {
    const map = new Map<string, DFA>();
    FIELD_CONFIGS.forEach((cfg) => {
      try {
        const ast = parseRegexToAST(cfg.regex);
        const nfa = buildThompsonNFA(ast);
        const dfa = buildSubsetDFA(nfa);
        const minDfa = minimizeDFA(dfa);
        map.set(cfg.id, minDfa);
      } catch (err) {
        console.error(`Failed to compile DFA for ${cfg.id}:`, err);
      }
    });

    PASSWORD_SUB_RULES.forEach((rule) => {
      try {
        const ast = parseRegexToAST(rule.regex);
        const nfa = buildThompsonNFA(ast);
        const dfa = buildSubsetDFA(nfa);
        const minDfa = minimizeDFA(dfa);
        map.set(`pwd_${rule.id}`, minDfa);
      } catch (err) {
        console.error(`Failed to compile DFA for pwd_${rule.id}:`, err);
      }
    });

    return map;
  }, []);

  const handleChange = (id: string, val: string) => {
    setFormValues((prev) => ({ ...prev, [id]: val }));
  };

  const handleInspectInVisualizer = (regex: string) => {
    setSelectedVisualizerRuleId('custom');
    setCustomVisualizerRegex(regex);
    setActiveTab('visualizer');
  };

  // Evaluate password sub-rules
  const passwordVal = formValues.password || '';
  const passwordResults = useMemo(() => {
    return PASSWORD_SUB_RULES.map((rule) => {
      const dfa = compiledDFAs.get(`pwd_${rule.id}`);
      if (!dfa) {
        return { ...rule, passed: false, state: '—', evalResult: null };
      }
      const evalRes = evaluateStringWithDFA(dfa, passwordVal);
      return {
        ...rule,
        passed: evalRes.status === 'VALID',
        state: evalRes.currentState,
        evalResult: evalRes,
      };
    });
  }, [compiledDFAs, passwordVal]);

  const allPasswordPassed = passwordResults.every((r) => r.passed);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-100">
              Form Validator Playground: Live DFA State Machine Execution
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Type into any field below to watch the compiled Min-DFA consume characters in real time.
            If an input violates the formal grammar, the engine pinpoints the <strong>exact character</strong>{' '}
            and index that transitioned the automaton into the dead Trap State (∅).
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-300 font-mono">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Real-time Transition Evaluation</span>
        </div>
      </div>

      {/* Grid of Standard Input Fields */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {FIELD_CONFIGS.map((cfg) => {
          const Icon = cfg.icon;
          const val = formValues[cfg.id] || '';
          const dfa = compiledDFAs.get(cfg.id);
          const evalResult = dfa ? evaluateStringWithDFA(dfa, val) : null;

          return (
            <div
              key={cfg.id}
              className={`bg-slate-900 border rounded-xl p-4 transition space-y-3 ${
                evalResult?.status === 'VALID'
                  ? 'border-emerald-500/40 shadow-sm shadow-emerald-500/5'
                  : evalResult?.status === 'TRAPPED'
                  ? 'border-rose-500/50 shadow-sm shadow-rose-500/5'
                  : 'border-slate-800'
              }`}
            >
              {/* Field Label & Inspect Button */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Icon className="w-4 h-4 text-indigo-400" />
                  <span>{cfg.label}</span>
                </label>

                <button
                  onClick={() => handleInspectInVisualizer(cfg.regex)}
                  className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline"
                  title="Open this grammar in the Automata Visualizer"
                >
                  <span>Inspect DFA</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {/* Input Box */}
              <div className="relative">
                <input
                  type="text"
                  value={val}
                  onChange={(e) => handleChange(cfg.id, e.target.value)}
                  placeholder={cfg.placeholder}
                  className={`w-full bg-slate-950 font-mono text-xs px-3.5 py-2.5 rounded-lg border focus:outline-none transition ${
                    evalResult?.status === 'VALID'
                      ? 'border-emerald-500/60 text-emerald-300 focus:border-emerald-400'
                      : evalResult?.status === 'TRAPPED'
                      ? 'border-rose-500/80 text-rose-200 focus:border-rose-400'
                      : 'border-slate-700 text-slate-200 focus:border-indigo-500'
                  }`}
                />

                {/* Right Status Badge */}
                <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
                  {evalResult?.status === 'VALID' && (
                    <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded">
                      <CheckCircle2 className="w-3 h-3" /> VALID
                    </span>
                  )}
                  {evalResult?.status === 'TRAPPED' && (
                    <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-rose-400 bg-rose-950/70 border border-rose-500/40 px-2 py-0.5 rounded animate-pulse">
                      <XCircle className="w-3 h-3" /> TRAP STATE
                    </span>
                  )}
                  {evalResult?.status === 'INCOMPLETE' && (
                    <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-400 bg-amber-950/70 border border-amber-500/30 px-2 py-0.5 rounded">
                      <AlertTriangle className="w-3 h-3" /> INCOMPLETE
                    </span>
                  )}
                </div>
              </div>

              {/* Character Tape with Trap Highlight */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>DFA Tape Stream:</span>
                  <span className="font-mono text-indigo-300">
                    State: <strong className="font-bold text-white">{evalResult?.currentState}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1 min-h-[28px] overflow-x-auto py-0.5">
                  {val.length === 0 ? (
                    <span className="text-[11px] font-mono text-slate-600 italic">ε (empty tape)</span>
                  ) : (
                    val.split('').map((char, cIdx) => {
                      const isTrap = evalResult?.trapIndex === cIdx;
                      const isPastTrap = evalResult?.trapIndex !== null && cIdx > evalResult!.trapIndex!;
                      return (
                        <span
                          key={cIdx}
                          className={`min-w-[20px] h-6 px-1.5 rounded font-mono text-xs font-bold border flex items-center justify-center transition ${
                            isTrap
                              ? 'bg-rose-500 text-white border-rose-400 scale-110 shadow-lg shadow-rose-500/40'
                              : isPastTrap
                              ? 'bg-slate-900 border-slate-800 text-slate-600 line-through'
                              : 'bg-emerald-950/60 border-emerald-700/40 text-emerald-300'
                          }`}
                          title={`Index ${cIdx}: '${char}'`}
                        >
                          {char === ' ' ? '␣' : char}
                        </span>
                      );
                    })
                  )}
                </div>

                {/* Status Message */}
                <div
                  className={`text-[11px] font-mono pt-1.5 border-t border-slate-800/80 flex items-center justify-between ${
                    evalResult?.status === 'VALID'
                      ? 'text-emerald-400'
                      : evalResult?.status === 'TRAPPED'
                      ? 'text-rose-400'
                      : 'text-amber-300'
                  }`}
                >
                  <span>{evalResult?.message}</span>
                  {evalResult?.trapChar && (
                    <span className="bg-rose-950/80 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 rounded font-bold">
                      Failed at &apos;{evalResult.trapChar}&apos;
                    </span>
                  )}
                </div>
              </div>

              {/* Formal Regex Help */}
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>{cfg.helpText}</span>
                <code className="text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                  {cfg.regex.length > 28 ? `${cfg.regex.slice(0, 26)}…` : cfg.regex}
                </code>
              </div>
            </div>
          );
        })}
      </div>

      {/* Password Policy Multi-DFA Card */}
      <div
        className={`bg-slate-900 border rounded-xl p-5 space-y-4 transition ${
          allPasswordPassed
            ? 'border-emerald-500/50 shadow-sm shadow-emerald-500/5'
            : 'border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Password Policy Validator (Conjunction of 4 Language DFAs)
            </h3>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${
              allPasswordPassed
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}
          >
            {allPasswordPassed ? 'POLICY SATISFIED' : 'REQUIREMENTS PENDING'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-5">
            <label className="text-[11px] text-slate-400 block mb-1">Password String:</label>
            <input
              type="text"
              value={formValues.password || ''}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="Enter password..."
              className={`w-full bg-slate-950 font-mono text-sm px-3.5 py-2.5 rounded-lg border focus:outline-none transition ${
                allPasswordPassed
                  ? 'border-emerald-500 text-emerald-300'
                  : 'border-slate-700 text-slate-100 focus:border-indigo-500'
              }`}
            />
          </div>

          <div className="md:col-span-7 grid grid-cols-2 gap-2.5">
            {passwordResults.map((pr) => (
              <div
                key={pr.id}
                className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition ${
                  pr.passed
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  {pr.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
                  )}
                  <span className="font-medium">{pr.label}</span>
                </div>
                <span className="text-[10px] font-mono text-indigo-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                  {pr.state}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
          In formal language theory, password requirements represent the regular language intersection{' '}
          <code className="text-slate-400 font-mono">L = L(8+) ∩ L(Digit) ∩ L(Upper) ∩ L(Lower)</code>.
          Evaluated concurrently with zero backtracking.
        </div>
      </div>
    </div>
  );
};
