/**
 * PatternGuard - Worker Client Bridge
 * Manages communication with the Web Worker, handling promise resolution and synchronous fallback.
 */

import {
  Rule,
  ScanOptions,
  parseRegexToAST,
  buildThompsonNFA,
  buildMultiRuleNFA,
  buildSubsetDFA,
  minimizeDFA,
  DFAScanner,
  simulateAutomaton,
  NFA,
  DFA,
} from '../engine';
import { WorkerMessageResponse } from './scanner.worker';

type PendingResolver = {
  resolve: (data: any) => void;
  reject: (err: any) => void;
};

class WorkerClient {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, PendingResolver>();
  private reqCounter = 0;
  private fallbackScanner: DFAScanner | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
        this.worker = new Worker(new URL('./scanner.worker.ts', import.meta.url), {
          type: 'module',
        });

        this.worker.onmessage = (event: MessageEvent<WorkerMessageResponse>) => {
          const { id, status, data, error } = event.data;
          const pending = this.pendingRequests.get(id);
          if (pending) {
            this.pendingRequests.delete(id);
            if (status === 'SUCCESS') {
              pending.resolve(data);
            } else {
              pending.reject(new Error(error || 'Worker operation failed.'));
            }
          }
        };

        this.worker.onerror = (err) => {
          console.warn('Worker encountered an error, fallback mode enabled:', err);
        };
      }
    } catch (err) {
      console.warn('Failed to initialize Web Worker, falling back to main-thread engine:', err);
      this.worker = null;
    }
  }

  private sendRequest<T>(type: string, payload: any): Promise<T> {
    const id = `req_${++this.reqCounter}_${Date.now()}`;

    if (this.worker) {
      return new Promise<T>((resolve, reject) => {
        this.pendingRequests.set(id, { resolve, reject });
        this.worker!.postMessage({ id, type, payload });
      });
    }

    // Synchronous Fallback Execution
    return new Promise<T>((resolve, reject) => {
      try {
        switch (type) {
          case 'COMPILE_MULTI_DFA': {
            const rules: Rule[] = payload.rules;
            const nfa = buildMultiRuleNFA(rules);
            const dfa = buildSubsetDFA(nfa);
            const minDfa = minimizeDFA(dfa);
            this.fallbackScanner = new DFAScanner(minDfa, rules);
            resolve({
              stateCount: minDfa.states.length,
              transitionCount: minDfa.transitions.length,
              reductionPct: minDfa.reductionPct ?? 0,
              alphabet: minDfa.alphabet,
            } as any);
            break;
          }

          case 'SCAN_TEXT': {
            const { text, options = {}, rules } = payload;
            let scanner = this.fallbackScanner;
            if (!scanner && rules) {
              const nfa = buildMultiRuleNFA(rules);
              const dfa = buildSubsetDFA(nfa);
              const minDfa = minimizeDFA(dfa);
              scanner = new DFAScanner(minDfa, rules);
              this.fallbackScanner = scanner;
            }
            if (!scanner) {
              throw new Error('Scanner not compiled.');
            }
            const out = scanner.scan(text, options as ScanOptions);
            resolve(out as any);
            break;
          }

          case 'COMPILE_SINGLE_AUTOMATA': {
            const { regex } = payload;
            const ast = parseRegexToAST(regex);
            const nfa = buildThompsonNFA(ast);
            const dfa = buildSubsetDFA(nfa);
            const minDfa = minimizeDFA(dfa);
            resolve({ ast, nfa, dfa, minDfa } as any);
            break;
          }

          case 'SIMULATE': {
            const { automaton, inputString } = payload;
            const res = simulateAutomaton(automaton as NFA | DFA, inputString);
            resolve(res as any);
            break;
          }

          default:
            reject(new Error(`Unknown type: ${type}`));
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  public compileMultiDFA(rules: Rule[]) {
    return this.sendRequest<{
      stateCount: number;
      transitionCount: number;
      reductionPct: number;
      alphabet: string[];
    }>('COMPILE_MULTI_DFA', { rules });
  }

  public scanText(text: string, rules: Rule[], options?: ScanOptions) {
    return this.sendRequest<import('../engine').ScanOutput>('SCAN_TEXT', {
      text,
      options,
      rules,
    });
  }

  public compileSingleAutomata(regex: string) {
    return this.sendRequest<{
      ast: import('../engine').ASTNode;
      nfa: import('../engine').NFA;
      dfa: import('../engine').DFA;
      minDfa: import('../engine').DFA;
    }>('COMPILE_SINGLE_AUTOMATA', { regex });
  }

  public simulate(automaton: NFA | DFA, inputString: string) {
    return this.sendRequest<import('../engine').SimulationResult>('SIMULATE', {
      automaton,
      inputString,
    });
  }
}

export const workerClient = new WorkerClient();
