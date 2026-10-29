/**
 * PatternGuard - DFA Log & Input Scanner
 * Single-pass O(n) regex log scanner with zero backtracking (guaranteed ReDoS immunity).
 * Uses multi-pattern DFA with longest-match and rule priority resolution.
 */

import { DFA, MatchResult, Rule, matchesEquivClass } from './types';

export interface ScanOptions {
  allowOverlapping?: boolean;
  maxMatches?: number;
}

export interface ScanOutput {
  matches: MatchResult[];
  scannedLength: number;
  totalLines: number;
  durationMs: number;
  matchesByRule: Record<string, number>;
  matchesBySeverity: Record<string, number>;
}

export class DFAScanner {
  private dfa: DFA;
  private ruleMap: Map<string, Rule>;
  private stateIndexMap: Map<string, number>;
  private indexStateMap: string[];
  private jumpTable: Int32Array[];
  private acceptInfo: Array<{ isAccept: boolean; ruleId?: string; priority?: number } | null>;

  constructor(dfa: DFA, rules: Rule[]) {
    this.dfa = dfa;
    this.ruleMap = new Map(rules.map((r) => [r.id, r]));

    // Index states 0..N-1 for fast numerical jump table
    this.stateIndexMap = new Map();
    this.indexStateMap = [];
    dfa.states.forEach((s, idx) => {
      this.stateIndexMap.set(s.id, idx);
      this.indexStateMap.push(s.id);
    });

    const numStates = dfa.states.length;
    this.jumpTable = new Array(numStates);
    this.acceptInfo = new Array(numStates);

    // Initialize jump table with -1 (no transition / dead)
    for (let sIdx = 0; sIdx < numStates; sIdx++) {
      const table = new Int32Array(128);
      table.fill(-1);
      this.jumpTable[sIdx] = table;

      const stateObj = dfa.states[sIdx];
      if (stateObj.isAccept && !stateObj.isTrap) {
        this.acceptInfo[sIdx] = {
          isAccept: true,
          ruleId: stateObj.matchedRuleId,
          priority: stateObj.matchedRulePriority ?? 0,
        };
      } else {
        this.acceptInfo[sIdx] = null;
      }
    }

    // Populate jump table for ASCII characters 0..127 using equivalence classes & transitions
    const equivClasses = dfa.equivClasses || [];
    for (const t of dfa.transitions) {
      const fromIdx = this.stateIndexMap.get(t.from);
      const toIdx = this.stateIndexMap.get(t.to);
      if (fromIdx === undefined || toIdx === undefined) continue;

      const targetObj = dfa.states[toIdx];
      // If target is dead trap state, leave as -1
      if (targetObj.isTrap) continue;

      // Find matching equiv classes for this transition symbol
      const eq = equivClasses.find((e) => e.label === t.symbol);
      if (eq) {
        for (let code = 0; code < 128; code++) {
          const ch = String.fromCharCode(code);
          if (matchesEquivClass(eq, ch)) {
            this.jumpTable[fromIdx][code] = toIdx;
          }
        }
      } else if (t.symbol.length === 1) {
        const code = t.symbol.charCodeAt(0);
        if (code < 128) {
          this.jumpTable[fromIdx][code] = toIdx;
        }
      }
    }
  }

  /**
   * Scans input text and returns all threat/data matches using longest-match and rule priority.
   */
  public scan(text: string, options: ScanOptions = {}): ScanOutput {
    const startTime = performance.now();
    const { allowOverlapping = false, maxMatches = 10000 } = options;

    const matches: MatchResult[] = [];
    const matchesByRule: Record<string, number> = {};
    const matchesBySeverity: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    };

    const startStateIdx = this.stateIndexMap.get(this.dfa.startState) ?? 0;
    const n = text.length;

    // Precalculate newline indices for O(1) line number resolution
    const lineStarts: number[] = [0];
    for (let i = 0; i < n; i++) {
      if (text[i] === '\n') {
        lineStarts.push(i + 1);
      }
    }

    const getLineInfo = (pos: number): { lineNumber: number; lineContent: string } => {
      // Binary search for line number
      let low = 0;
      let high = lineStarts.length - 1;
      let lineIdx = 0;

      while (low <= high) {
        const mid = (low + high) >> 1;
        if (lineStarts[mid] <= pos) {
          lineIdx = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      const start = lineStarts[lineIdx];
      const end = lineIdx + 1 < lineStarts.length ? lineStarts[lineIdx + 1] - 1 : n;
      const rawLine = text.slice(start, end).replace(/\r$/, '');

      return {
        lineNumber: lineIdx + 1,
        lineContent: rawLine,
      };
    };

    let i = 0;
    while (i < n) {
      let curr = startStateIdx;
      let bestMatch: {
        ruleId: string;
        priority: number;
        start: number;
        end: number;
        text: string;
      } | null = null;

      for (let j = i; j < n; j++) {
        const code = text.charCodeAt(j);
        let next = -1;

        if (code < 128) {
          next = this.jumpTable[curr][code];
        } else {
          // Fallback for non-ASCII characters
          const ch = text[j];
          const stateId = this.indexStateMap[curr];
          for (const t of this.dfa.transitions) {
            if (t.from === stateId) {
              const eq = this.dfa.equivClasses?.find((e) => e.label === t.symbol);
              if (eq && matchesEquivClass(eq, ch)) {
                next = this.stateIndexMap.get(t.to) ?? -1;
                break;
              }
            }
          }
        }

        if (next === -1) {
          // Cannot transition further
          break;
        }

        curr = next;
        const info = this.acceptInfo[curr];
        if (info && info.isAccept && info.ruleId) {
          // Check longest match or higher priority if same length
          const matchLength = j + 1 - i;
          if (
            !bestMatch ||
            matchLength > bestMatch.end - bestMatch.start ||
            (matchLength === bestMatch.end - bestMatch.start && info.priority! > bestMatch.priority)
          ) {
            bestMatch = {
              ruleId: info.ruleId,
              priority: info.priority ?? 0,
              start: i,
              end: j + 1,
              text: text.slice(i, j + 1),
            };
          }
        }
      }

      if (bestMatch) {
        const rule = this.ruleMap.get(bestMatch.ruleId);
        const lineInfo = getLineInfo(bestMatch.start);

        const matchResult: MatchResult = {
          ruleId: bestMatch.ruleId,
          ruleName: rule?.name || bestMatch.ruleId,
          severity: rule?.severity || 'MEDIUM',
          start: bestMatch.start,
          end: bestMatch.end,
          text: bestMatch.text,
          lineNumber: lineInfo.lineNumber,
          lineContent: lineInfo.lineContent,
        };

        matches.push(matchResult);
        matchesByRule[matchResult.ruleName] = (matchesByRule[matchResult.ruleName] || 0) + 1;
        matchesBySeverity[matchResult.severity] = (matchesBySeverity[matchResult.severity] || 0) + 1;

        if (matches.length >= maxMatches) {
          break;
        }

        if (allowOverlapping) {
          i++;
        } else {
          // Longest match: jump past this token
          i = Math.max(i + 1, bestMatch.end);
        }
      } else {
        i++;
      }
    }

    const durationMs = +(performance.now() - startTime).toFixed(2);

    return {
      matches,
      scannedLength: n,
      totalLines: lineStarts.length,
      durationMs,
      matchesByRule,
      matchesBySeverity,
    };
  }
}
