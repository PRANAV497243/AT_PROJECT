/**
 * PatternGuard - Subset Construction Algorithm (ε-NFA → DFA)
 * Converts non-deterministic ε-NFAs into deterministic DFAs.
 * Features:
 * - Atomic Alphabet Equivalence Partitioning (handles literals, \d, \w, \s, classes, .)
 * - 2,000 state safety limit with friendly error reporting
 * - Multi-rule priority resolution for accepting states
 */

import { NFA, DFA, DFAState, DFATransition, EquivClass, EPSILON, matchesSymbol } from './types';

const DFA_MAX_STATES = 2000;

/**
 * Computes the ε-closure of a set of NFA states.
 */
export function getEpsilonClosure(stateSet: Iterable<string>, transitions: NFA['transitions']): Set<string> {
  const closure = new Set<string>(stateSet);
  const stack = Array.from(stateSet);

  while (stack.length > 0) {
    const curr = stack.pop()!;
    for (const t of transitions) {
      if (t.from === curr && (t.isEpsilon || t.symbol === EPSILON) && !closure.has(t.to)) {
        closure.add(t.to);
        stack.push(t.to);
      }
    }
  }
  return closure;
}

/**
 * Partitions characters into atomic equivalence classes based on non-epsilon NFA transitions.
 * Two characters belong to the same equivalence class if and only if they match the exact same
 * set of transition matchers across the NFA.
 */
export function partitionAlphabet(transitions: NFA['transitions']): EquivClass[] {
  const nonEpsTransitions = transitions.filter((t) => !t.isEpsilon && t.symbol !== EPSILON);

  // If there are no transitions, return empty alphabet
  if (nonEpsTransitions.length === 0) {
    return [];
  }

  // Check if all transitions are simple single-character literals
  const allSingleChars = nonEpsTransitions.every((t) => t.symbol.length === 1 && t.symbol !== '.');
  if (allSingleChars) {
    const uniqueSymbols = Array.from(new Set(nonEpsTransitions.map((t) => t.symbol))).sort();
    return uniqueSymbols.map((sym, idx) => ({
      id: idx,
      label: sym,
      representative: sym,
      chars: [sym],
    }));
  }

  // Sample ASCII printable characters + common whitespace: 32..126, \t, \r
  const sampleChars: string[] = ['\t', '\r'];
  for (let c = 32; c <= 126; c++) {
    sampleChars.push(String.fromCharCode(c));
  }

  // Map signature string -> list of characters sharing this signature
  const signatureMap = new Map<string, string[]>();

  for (const ch of sampleChars) {
    const sigBits: string[] = [];
    for (let i = 0; i < nonEpsTransitions.length; i++) {
      const t = nonEpsTransitions[i];
      let matches = false;
      if (t.matcherDef) {
        matches = matchesSymbol(t.matcherDef, ch);
      } else if (t.symbol === '.') {
        matches = ch !== '\n';
      } else {
        matches = ch === t.symbol;
      }
      sigBits.push(matches ? '1' : '0');
    }

    const sig = sigBits.join('');
    // Only register signature if it matches at least one transition
    if (sig.includes('1')) {
      if (!signatureMap.has(sig)) {
        signatureMap.set(sig, []);
      }
      signatureMap.get(sig)!.push(ch);
    }
  }

  // Build EquivClasses from signatures
  const equivClasses: EquivClass[] = [];
  let classId = 0;

  for (const [, chars] of signatureMap.entries()) {
    const rep = chars[0];

    // Determine clean label for this equivalence class
    let label = '';
    if (chars.length === 1) {
      label = rep;
    } else {
      // Check if it's purely digits
      if (chars.every((c) => c >= '0' && c <= '9')) {
        label = chars.length === 10 ? '[0-9]' : `[${chars[0]}-${chars[chars.length - 1]}]`;
      } else if (chars.every((c) => c >= 'a' && c <= 'z')) {
        label = chars.length === 26 ? '[a-z]' : `[${chars[0]}-${chars[chars.length - 1]}]`;
      } else if (chars.every((c) => c >= 'A' && c <= 'Z')) {
        label = chars.length === 26 ? '[A-Z]' : `[${chars[0]}-${chars[chars.length - 1]}]`;
      } else {
        // Find the transition symbol it matches best
        const matchedTrans = nonEpsTransitions.filter((t) =>
          t.matcherDef ? matchesSymbol(t.matcherDef, rep) : t.symbol === '.' ? rep !== '\n' : t.symbol === rep
        );
        if (matchedTrans.length === 1) {
          label = matchedTrans[0].symbol;
        } else {
          label = chars.length <= 4 ? chars.join('') : `[${chars[0]}..${chars[chars.length - 1]}]`;
        }
      }
    }

    equivClasses.push({
      id: classId++,
      label,
      representative: rep,
      chars: [...chars],
    });
  }

  return equivClasses;
}

/**
 * Moves from a set of NFA states given an input character or matcher.
 */
export function moveNFA(
  stateSet: Iterable<string>,
  equivClass: EquivClass,
  transitions: NFA['transitions']
): Set<string> {
  const result = new Set<string>();
  const testChar = equivClass.representative;

  for (const s of stateSet) {
    for (const t of transitions) {
      if (t.from === s && !t.isEpsilon && t.symbol !== EPSILON) {
        let matches = false;
        if (t.matcherDef) {
          matches = matchesSymbol(t.matcherDef, testChar);
        } else if (t.symbol === '.') {
          matches = testChar !== '\n';
        } else {
          matches = testChar === t.symbol;
        }

        if (matches) {
          result.add(t.to);
        }
      }
    }
  }
  return result;
}

/**
 * Subset Construction: compiles ε-NFA into a DFA.
 */
export function buildSubsetDFA(nfa: NFA): DFA {
  const { transitions, startState, acceptStates, stateRuleMap = {} } = nfa;
  const acceptSet = new Set(acceptStates);

  const equivClasses = partitionAlphabet(transitions);
  const alphabet = equivClasses.map((eq) => eq.label);

  const sortStateIds = (set: Iterable<string>) =>
    Array.from(set).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

  const keyForSet = (set: Iterable<string>) => {
    const arr = sortStateIds(set);
    return arr.length === 0 ? 'DEAD' : arr.join(',');
  };

  const startClosure = getEpsilonClosure([startState], transitions);
  const dfaStatesMap = new Map<string, DFAState>();
  const dfaTransitions: DFATransition[] = [];
  const queue: Array<{ key: string; subsetSet: Set<string>; dfaState: DFAState }> = [];

  let dfaCounter = 0;

  function registerSubset(subsetSet: Set<string>, isStart = false): DFAState {
    const key = keyForSet(subsetSet);
    if (dfaStatesMap.has(key)) {
      return dfaStatesMap.get(key)!;
    }

    if (dfaStatesMap.size >= DFA_MAX_STATES) {
      throw new Error(
        `DFA state limit (${DFA_MAX_STATES} states) exceeded during Subset Construction. ` +
        `The regular expression pattern has an exponential state-space. ` +
        `Please simplify wildcards, quantifiers, or nested repetitions.`
      );
    }

    const sortedNfa = sortStateIds(subsetSet);
    const isTrap = sortedNfa.length === 0;
    const id = isTrap ? 'q_dead' : `D${dfaCounter++}`;

    // Collect matched rules from accepting NFA states
    const matchedRules: Array<{ ruleId: string; priority: number }> = [];
    let isAccept = false;

    for (const nfaId of sortedNfa) {
      if (acceptSet.has(nfaId)) {
        isAccept = true;
        const ruleInfo = stateRuleMap[nfaId];
        if (ruleInfo) {
          matchedRules.push(ruleInfo);
        }
      }
    }

    // Sort matched rules by priority descending
    matchedRules.sort((a, b) => b.priority - a.priority);
    const winningRule = matchedRules[0];

    const dfaState: DFAState = {
      id,
      label: isTrap ? '∅' : id,
      subLabel: isTrap
        ? 'Trap State'
        : winningRule
        ? `{${sortedNfa.join(',')}} [${winningRule.ruleId}]`
        : `{${sortedNfa.join(',')}}`,
      nfaStates: sortedNfa,
      isStart,
      isAccept,
      isTrap,
      matchedRuleId: winningRule?.ruleId,
      matchedRulePriority: winningRule?.priority,
      matchedRules,
    };

    dfaStatesMap.set(key, dfaState);
    queue.push({ key, subsetSet, dfaState });
    return dfaState;
  }

  // Register start state
  registerSubset(startClosure, true);

  while (queue.length > 0) {
    const { subsetSet, dfaState } = queue.shift()!;

    for (const eq of equivClasses) {
      const moved = moveNFA(subsetSet, eq, transitions);
      const targetClosure = getEpsilonClosure(moved, transitions);
      const targetDfaState = registerSubset(targetClosure, false);

      dfaTransitions.push({
        from: dfaState.id,
        to: targetDfaState.id,
        symbol: eq.label,
      });
    }
  }

  const allStates = Array.from(dfaStatesMap.values());
  const actualStart = allStates.find((s) => s.isStart)?.id || 'D0';
  const actualAccepts = allStates.filter((s) => s.isAccept).map((s) => s.id);

  return {
    type: 'DFA',
    states: allStates,
    transitions: dfaTransitions,
    startState: actualStart,
    acceptStates: actualAccepts,
    alphabet,
    equivClasses,
  };
}
