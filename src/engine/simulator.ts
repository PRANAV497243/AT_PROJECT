/**
 * PatternGuard - Step-by-Step Automaton Simulator
 * Simulates ε-NFA, DFA, or Min-DFA on an input tape string.
 * Returns step trace, active states, active transitions, and full state path.
 */

import { NFA, DFA, SimulationResult, SimulationStep, EPSILON, matchesSymbol, matchesEquivClass } from './types';
import { getEpsilonClosure } from './subset';

export function simulateAutomaton(automaton: NFA | DFA, inputString: string): SimulationResult {
  const { type, states, transitions, startState, acceptStates } = automaton;
  const acceptSet = new Set(acceptStates);
  const steps: SimulationStep[] = [];
  const path: string[] = [];

  // ==========================================
  // Simulation on ε-NFA (Non-deterministic)
  // ==========================================
  if (type === 'eNFA') {
    let currentActive = getEpsilonClosure([startState], transitions);
    path.push(Array.from(currentActive).join(','));

    steps.push({
      stepIndex: 0,
      charIndex: -1,
      symbol: null,
      activeStates: Array.from(currentActive),
      activeEdges: transitions
        .filter((t) => (t.isEpsilon || t.symbol === EPSILON) && currentActive.has(t.from) && currentActive.has(t.to))
        .map((t) => `${t.from}->${t.to}`),
      description: `Initial ε-closure from ${startState}: {${Array.from(currentActive).join(', ')}}`,
    });

    for (let i = 0; i < inputString.length; i++) {
      const ch = inputString[i];
      const directEdges: string[] = [];
      const movedSet = new Set<string>();

      for (const s of currentActive) {
        for (const t of transitions) {
          if (t.from === s && !t.isEpsilon && t.symbol !== EPSILON) {
            let matches = false;
            if (t.matcherDef) {
              matches = matchesSymbol(t.matcherDef, ch);
            } else if (t.symbol === '.') {
              matches = ch !== '\n';
            } else {
              matches = t.symbol === ch;
            }

            if (matches) {
              movedSet.add(t.to);
              directEdges.push(`${t.from}->${t.to}`);
            }
          }
        }
      }

      const nextClosure = getEpsilonClosure(movedSet, transitions);
      const epsEdges = transitions
        .filter((t) => (t.isEpsilon || t.symbol === EPSILON) && nextClosure.has(t.from) && nextClosure.has(t.to))
        .map((t) => `${t.from}->${t.to}`);

      currentActive = nextClosure;
      path.push(Array.from(currentActive).join(','));

      steps.push({
        stepIndex: i + 1,
        charIndex: i,
        symbol: ch,
        activeStates: Array.from(currentActive),
        activeEdges: [...directEdges, ...epsEdges],
        description:
          currentActive.size > 0
            ? `Consumed '${ch}' → Active states: {${Array.from(currentActive).join(', ')}}`
            : `Consumed '${ch}' → No valid transitions (Automaton Halted / Rejected)`,
      });
    }

    const matchedAcceptState = Array.from(currentActive).find((s) => acceptSet.has(s));
    const isAccepted = matchedAcceptState !== undefined;
    const acceptObj = states.find((s) => s.id === matchedAcceptState);

    return {
      isAccepted,
      matchedRuleId: acceptObj?.ruleId,
      steps,
      path,
    };
  }

  // ==========================================
  // Simulation on DFA / Min-DFA (Deterministic)
  // ==========================================
  let currState: string | null = startState;
  path.push(currState);

  steps.push({
    stepIndex: 0,
    charIndex: -1,
    symbol: null,
    activeStates: currState ? [currState] : [],
    activeEdges: [],
    description: `Start at initial state ${currState}`,
  });

  const equivClasses = (automaton as DFA).equivClasses || [];

  for (let i = 0; i < inputString.length; i++) {
    const ch = inputString[i];
    if (!currState) {
      steps.push({
        stepIndex: i + 1,
        charIndex: i,
        symbol: ch,
        activeStates: [],
        activeEdges: [],
        description: `Consumed '${ch}': Already in reject / dead state`,
      });
      break;
    }

    // Find valid transition from currState matching ch
    let targetState: string | null = null;
    let matchedEdgeId: string | null = null;

    for (const t of transitions) {
      if (t.from === currState) {
        const eq = equivClasses.find((e) => e.label === t.symbol);
        let matches = false;
        if (eq) {
          matches = matchesEquivClass(eq, ch);
        } else if (t.symbol.length === 1) {
          matches = t.symbol === ch;
        }

        if (matches) {
          targetState = t.to;
          matchedEdgeId = `${currState}->${t.to}`;
          break;
        }
      }
    }

    if (targetState !== null) {
      const prevState = currState;
      currState = targetState;
      path.push(currState);

      const targetObj = states.find((s) => s.id === currState);
      steps.push({
        stepIndex: i + 1,
        charIndex: i,
        symbol: ch,
        activeStates: [currState],
        activeEdges: matchedEdgeId ? [matchedEdgeId] : [],
        description: targetObj?.isTrap
          ? `Consumed '${ch}': ${prevState} → Trap State (∅) [Rejected]`
          : `Consumed '${ch}': Transitioned ${prevState} → ${currState}`,
      });
    } else {
      currState = null;
      steps.push({
        stepIndex: i + 1,
        charIndex: i,
        symbol: ch,
        activeStates: [],
        activeEdges: [],
        description: `Consumed '${ch}': Character not in alphabet or transition leads to Dead State (Rejected)`,
      });
      break;
    }
  }

  const finalStateObj = states.find((s) => s.id === currState);
  const isAccepted = currState !== null && acceptSet.has(currState) && !finalStateObj?.isTrap;

  return {
    isAccepted,
    matchedRuleId: finalStateObj?.matchedRuleId,
    steps,
    path: path.filter((p): p is string => Boolean(p)),
  };
}
