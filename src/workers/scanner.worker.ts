/**
 * PatternGuard - Background Web Worker for Automata Compilation & Text Scanning
 * Offloads CPU-intensive DFA compilation and multi-megabyte log scanning from UI thread.
 */

import {
  parseRegexToAST,
  buildThompsonNFA,
  buildMultiRuleNFA,
  buildSubsetDFA,
  minimizeDFA,
  DFAScanner,
  simulateAutomaton,
  Rule,
  DFA,
  NFA,
  ScanOptions,
} from '../engine';

let cachedScanner: DFAScanner | null = null;
let cachedDFA: DFA | null = null;

export interface WorkerMessageRequest {
  id: string;
  type: 'COMPILE_MULTI_DFA' | 'SCAN_TEXT' | 'COMPILE_SINGLE_AUTOMATA' | 'SIMULATE';
  payload: any;
}

export interface WorkerMessageResponse {
  id: string;
  type: string;
  status: 'SUCCESS' | 'ERROR';
  data?: any;
  error?: string;
}

self.onmessage = (event: MessageEvent<WorkerMessageRequest>) => {
  const { id, type, payload } = event.data;

  try {
    switch (type) {
      case 'COMPILE_MULTI_DFA': {
        const rules: Rule[] = payload.rules;
        const nfa = buildMultiRuleNFA(rules);
        const dfa = buildSubsetDFA(nfa);
        const minDfa = minimizeDFA(dfa);

        cachedDFA = minDfa;
        cachedScanner = new DFAScanner(minDfa, rules);

        const response: WorkerMessageResponse = {
          id,
          type,
          status: 'SUCCESS',
          data: {
            stateCount: minDfa.states.length,
            transitionCount: minDfa.transitions.length,
            reductionPct: minDfa.reductionPct ?? 0,
            alphabet: minDfa.alphabet,
          },
        };
        self.postMessage(response);
        break;
      }

      case 'SCAN_TEXT': {
        const { text, options = {}, rules } = payload;
        let scanner = cachedScanner;

        // If scanner not cached or rules passed, re-instantiate
        if (!scanner && cachedDFA) {
          scanner = new DFAScanner(cachedDFA, rules || []);
          cachedScanner = scanner;
        } else if (!scanner && rules) {
          const nfa = buildMultiRuleNFA(rules);
          const dfa = buildSubsetDFA(nfa);
          const minDfa = minimizeDFA(dfa);
          cachedDFA = minDfa;
          scanner = new DFAScanner(minDfa, rules);
          cachedScanner = scanner;
        }

        if (!scanner) {
          throw new Error('Scanner not initialized. Compile rules before scanning.');
        }

        const scanOutput = scanner.scan(text, options as ScanOptions);
        const response: WorkerMessageResponse = {
          id,
          type,
          status: 'SUCCESS',
          data: scanOutput,
        };
        self.postMessage(response);
        break;
      }

      case 'COMPILE_SINGLE_AUTOMATA': {
        const { regex } = payload;
        const ast = parseRegexToAST(regex);
        const nfa = buildThompsonNFA(ast);
        const dfa = buildSubsetDFA(nfa);
        const minDfa = minimizeDFA(dfa);

        const response: WorkerMessageResponse = {
          id,
          type,
          status: 'SUCCESS',
          data: { ast, nfa, dfa, minDfa },
        };
        self.postMessage(response);
        break;
      }

      case 'SIMULATE': {
        const { automaton, inputString } = payload;
        const result = simulateAutomaton(automaton as NFA | DFA, inputString);
        const response: WorkerMessageResponse = {
          id,
          type,
          status: 'SUCCESS',
          data: result,
        };
        self.postMessage(response);
        break;
      }

      default:
        throw new Error(`Unknown worker message type: ${type}`);
    }
  } catch (err: any) {
    self.postMessage({
      id,
      type,
      status: 'ERROR',
      error: err?.message || String(err),
    });
  }
};
