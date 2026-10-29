import { create } from 'zustand';
import { Rule, ScanOutput, ASTNode, NFA, DFA, SimulationResult } from '../engine';
import { DEFAULT_RULES } from './defaultRules';
import { SAMPLE_LOG_FILE } from './sampleLog';
import { workerClient } from '../workers/workerClient';

const LOCAL_STORAGE_RULES_KEY = 'patternguard_rules_v1';

function loadPersistedRules(): Rule[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_RULES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load rules from localStorage:', err);
  }
  return DEFAULT_RULES;
}

function savePersistedRules(rules: Rule[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_RULES_KEY, JSON.stringify(rules));
  } catch (err) {
    console.error('Failed to save rules to localStorage:', err);
  }
}

export interface AppState {
  // Navigation
  activeTab: 'scanner' | 'visualizer';
  setActiveTab: (tab: 'scanner' | 'visualizer') => void;

  // Rules management
  rules: Rule[];
  addRule: (rule: Omit<Rule, 'id'>) => boolean;
  updateRule: (id: string, updates: Partial<Rule>) => boolean;
  deleteRule: (id: string) => void;
  toggleRule: (id: string) => void;
  resetRules: () => void;

  // Threat Scanner State
  inputText: string;
  setInputText: (text: string) => void;
  loadSampleLog: () => void;
  clearInputText: () => void;
  allowOverlapping: boolean;
  setAllowOverlapping: (val: boolean) => void;
  selectedSeverityFilter: string;
  setSelectedSeverityFilter: (filter: string) => void;
  selectedRuleFilter: string;
  setSelectedRuleFilter: (filter: string) => void;

  isScanning: boolean;
  isCompiling: boolean;
  scannerError: string | null;
  compileStats: {
    stateCount: number;
    transitionCount: number;
    reductionPct: number;
    alphabet: string[];
  } | null;
  scanOutput: ScanOutput | null;

  runScan: () => Promise<void>;
  compileMultiRuleDFA: () => Promise<void>;

  // Automata Visualizer State
  selectedVisualizerRuleId: string;
  setSelectedVisualizerRuleId: (ruleId: string) => void;
  customVisualizerRegex: string;
  setCustomVisualizerRegex: (regex: string) => void;
  visualizerStage: 'eNFA' | 'DFA' | 'MinDFA';
  setVisualizerStage: (stage: 'eNFA' | 'DFA' | 'MinDFA') => void;
  showTrapState: boolean;
  setShowTrapState: (show: boolean) => void;

  isCompilingVisualizer: boolean;
  visualizerError: string | null;
  visualizerData: {
    ast: ASTNode | null;
    nfa: NFA | null;
    dfa: DFA | null;
    minDfa: DFA | null;
  } | null;

  // Simulation State
  simInput: string;
  setSimInput: (input: string) => void;
  simStepIdx: number;
  setSimStepIdx: (idx: number | ((prev: number) => number)) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean | ((prev: boolean) => boolean)) => void;
  animSpeedMs: number;
  setAnimSpeedMs: (speed: number) => void;
  simResult: SimulationResult | null;

  compileVisualizerAutomata: () => Promise<void>;
  runSimulation: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeTab: 'scanner',
  setActiveTab: (activeTab) => set({ activeTab }),

  rules: loadPersistedRules(),

  addRule: (newRuleData) => {
    const id = `rule_custom_${Date.now()}`;
    const newRule: Rule = { ...newRuleData, id };
    const updated = [...get().rules, newRule];
    savePersistedRules(updated);
    set({ rules: updated });
    get().compileMultiRuleDFA();
    return true;
  },

  updateRule: (id, updates) => {
    const updated = get().rules.map((r) => (r.id === id ? { ...r, ...updates } : r));
    savePersistedRules(updated);
    set({ rules: updated });
    get().compileMultiRuleDFA();
    return true;
  },

  deleteRule: (id) => {
    const updated = get().rules.filter((r) => r.id !== id);
    savePersistedRules(updated);
    set({ rules: updated });
    get().compileMultiRuleDFA();
  },

  toggleRule: (id) => {
    const updated = get().rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    savePersistedRules(updated);
    set({ rules: updated });
    get().compileMultiRuleDFA();
  },

  resetRules: () => {
    savePersistedRules(DEFAULT_RULES);
    set({ rules: DEFAULT_RULES });
    get().compileMultiRuleDFA();
  },

  // Threat Scanner
  inputText: SAMPLE_LOG_FILE,
  setInputText: (inputText) => set({ inputText }),
  loadSampleLog: () => {
    set({ inputText: SAMPLE_LOG_FILE });
    get().runScan();
  },
  clearInputText: () => set({ inputText: '', scanOutput: null }),
  allowOverlapping: false,
  setAllowOverlapping: (allowOverlapping) => {
    set({ allowOverlapping });
    get().runScan();
  },
  selectedSeverityFilter: 'ALL',
  setSelectedSeverityFilter: (selectedSeverityFilter) => set({ selectedSeverityFilter }),
  selectedRuleFilter: 'ALL',
  setSelectedRuleFilter: (selectedRuleFilter) => set({ selectedRuleFilter }),

  isScanning: false,
  isCompiling: false,
  scannerError: null,
  compileStats: null,
  scanOutput: null,

  compileMultiRuleDFA: async () => {
    const { rules } = get();
    set({ isCompiling: true, scannerError: null });
    try {
      const stats = await workerClient.compileMultiDFA(rules);
      set({ compileStats: stats, isCompiling: false });
      // Re-run scan with freshly compiled DFA
      if (get().inputText) {
        get().runScan();
      }
    } catch (err: any) {
      set({
        scannerError: `DFA Compilation Error: ${err?.message || err}`,
        isCompiling: false,
      });
    }
  },

  runScan: async () => {
    const { inputText, rules, allowOverlapping } = get();
    if (!inputText) {
      set({ scanOutput: null });
      return;
    }

    set({ isScanning: true, scannerError: null });
    try {
      const output = await workerClient.scanText(inputText, rules, { allowOverlapping });
      set({ scanOutput: output, isScanning: false });
    } catch (err: any) {
      set({
        scannerError: `Scanner Execution Error: ${err?.message || err}`,
        isScanning: false,
      });
    }
  },

  // Automata Visualizer
  selectedVisualizerRuleId: 'custom',
  setSelectedVisualizerRuleId: (selectedVisualizerRuleId) => {
    set({ selectedVisualizerRuleId });
    get().compileVisualizerAutomata();
  },
  customVisualizerRegex: '(a|b)*abb',
  setCustomVisualizerRegex: (customVisualizerRegex) => {
    set({ customVisualizerRegex });
    get().compileVisualizerAutomata();
  },
  visualizerStage: 'MinDFA',
  setVisualizerStage: (visualizerStage) => {
    set({ visualizerStage });
    get().runSimulation();
  },
  showTrapState: false,
  setShowTrapState: (showTrapState) => set({ showTrapState }),

  isCompilingVisualizer: false,
  visualizerError: null,
  visualizerData: null,

  simInput: 'abb',
  setSimInput: (simInput) => {
    set({ simInput, simStepIdx: 0, isPlaying: false });
    get().runSimulation();
  },
  simStepIdx: 0,
  setSimStepIdx: (action) =>
    set((state) => ({
      simStepIdx: typeof action === 'function' ? action(state.simStepIdx) : action,
    })),
  isPlaying: false,
  setIsPlaying: (action) =>
    set((state) => ({
      isPlaying: typeof action === 'function' ? action(state.isPlaying) : action,
    })),
  animSpeedMs: 650,
  setAnimSpeedMs: (animSpeedMs) => set({ animSpeedMs }),
  simResult: null,

  compileVisualizerAutomata: async () => {
    const { selectedVisualizerRuleId, rules, customVisualizerRegex } = get();
    let regexToCompile = customVisualizerRegex;

    if (selectedVisualizerRuleId !== 'custom') {
      const rule = rules.find((r) => r.id === selectedVisualizerRuleId);
      if (rule) {
        regexToCompile = rule.regex;
      }
    }

    set({ isCompilingVisualizer: true, visualizerError: null });
    try {
      const data = await workerClient.compileSingleAutomata(regexToCompile);
      set({ visualizerData: data, isCompilingVisualizer: false });
      get().runSimulation();
    } catch (err: any) {
      set({
        visualizerError: err?.message || String(err),
        isCompilingVisualizer: false,
      });
    }
  },

  runSimulation: async () => {
    const { visualizerData, visualizerStage, simInput } = get();
    if (!visualizerData) return;

    let automaton: NFA | DFA | null = null;
    if (visualizerStage === 'eNFA') automaton = visualizerData.nfa;
    else if (visualizerStage === 'DFA') automaton = visualizerData.dfa;
    else automaton = visualizerData.minDfa;

    if (!automaton) return;

    try {
      const result = await workerClient.simulate(automaton, simInput);
      set({ simResult: result, simStepIdx: 0, isPlaying: false });
    } catch (err: any) {
      console.error('Simulation error:', err);
    }
  },
}));
