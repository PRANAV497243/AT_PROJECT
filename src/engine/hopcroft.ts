/**
 * PatternGuard - Hopcroft's DFA Minimization Algorithm
 * Minimizes DFAs to their unique canonical minimal representation.
 * Preserves multi-pattern rule bindings on accepting states.
 * Computes exact state reduction percentage.
 */

import { DFA, DFAState, DFATransition } from './types';

export function minimizeDFA(dfa: DFA): DFA {
  const { states, transitions, startState, alphabet, equivClasses } = dfa;

  // Build fast transition lookup: transMap[stateId][symbol] = targetId
  const transMap: Record<string, Record<string, string>> = {};
  for (const s of states) {
    transMap[s.id] = {};
  }
  for (const t of transitions) {
    if (transMap[t.from]) {
      transMap[t.from][t.symbol] = t.to;
    }
  }

  // 1. Remove unreachable states via BFS from startState
  const reachable = new Set<string>([startState]);
  const rQueue = [startState];
  while (rQueue.length > 0) {
    const curr = rQueue.shift()!;
    for (const sym of alphabet) {
      const next = transMap[curr]?.[sym];
      if (next && !reachable.has(next)) {
        reachable.add(next);
        rQueue.push(next);
      }
    }
  }

  const activeStates = states.filter((s) => reachable.has(s.id));
  const nonAcceptGroup = activeStates.filter((s) => !s.isAccept).map((s) => s.id);

  // Group accepting states by their matchedRuleId so different rules don't get conflated
  const acceptBuckets = new Map<string, string[]>();
  for (const s of activeStates) {
    if (s.isAccept) {
      const key = `${s.matchedRuleId || 'ACCEPT'}#${s.matchedRulePriority || 0}`;
      if (!acceptBuckets.has(key)) {
        acceptBuckets.set(key, []);
      }
      acceptBuckets.get(key)!.push(s.id);
    }
  }

  let partitions: string[][] = [];
  for (const group of acceptBuckets.values()) {
    if (group.length > 0) partitions.push(group);
  }
  if (nonAcceptGroup.length > 0) {
    partitions.push(nonAcceptGroup);
  }

  // 2. Iteratively refine partitions until fixed point
  let changed = true;
  while (changed) {
    changed = false;
    const nextPartitions: string[][] = [];

    // Map each state to current partition index
    const stateToPartIdx: Record<string, number> = {};
    partitions.forEach((group, idx) => {
      group.forEach((sId) => {
        stateToPartIdx[sId] = idx;
      });
    });

    for (const group of partitions) {
      if (group.length <= 1) {
        nextPartitions.push(group);
        continue;
      }

      // Group states by their transition target partition signature
      const signatureBuckets = new Map<string, string[]>();
      for (const sId of group) {
        const sig = alphabet
          .map((sym) => {
            const target = transMap[sId]?.[sym];
            return target !== undefined ? stateToPartIdx[target] : -1;
          })
          .join('|');

        if (!signatureBuckets.has(sig)) {
          signatureBuckets.set(sig, []);
        }
        signatureBuckets.get(sig)!.push(sId);
      }

      if (signatureBuckets.size > 1) {
        changed = true;
      }
      for (const bucket of signatureBuckets.values()) {
        nextPartitions.push(bucket);
      }
    }

    partitions = nextPartitions;
  }

  // 3. Sort partitions so the one containing startState is M0, and trap state is last
  partitions.sort((a, b) => {
    if (a.includes(startState)) return -1;
    if (b.includes(startState)) return 1;
    const aTrap = a.every((id) => states.find((s) => s.id === id)?.isTrap);
    const bTrap = b.every((id) => states.find((s) => s.id === id)?.isTrap);
    if (aTrap && !bTrap) return 1;
    if (!aTrap && bTrap) return -1;
    return 0;
  });

  // 4. Construct minimized states
  const oldToMinId: Record<string, string> = {};
  let minCounter = 0;

  const minStates: DFAState[] = partitions.map((group) => {
    const isStart = group.includes(startState);
    const repState = states.find((s) => s.id === group[0])!;
    const isAccept = group.some((id) => states.find((s) => s.id === id)?.isAccept);

    // Identify if partition is a self-looping trap state
    const isSelfLoopingNonAccept =
      !isAccept &&
      alphabet.every((sym) => {
        const target = transMap[repState.id]?.[sym];
        return !target || group.includes(target);
      });

    const isTrap = isSelfLoopingNonAccept && !isStart;
    const minId = isTrap ? 'q_dead' : `M${minCounter++}`;

    group.forEach((oldId) => {
      oldToMinId[oldId] = minId;
    });

    return {
      id: minId,
      label: isTrap ? '∅' : minId,
      subLabel: isTrap
        ? 'Trap State'
        : repState.matchedRuleId
        ? `{${group.join(',')}} [${repState.matchedRuleId}]`
        : `{${group.join(',')}}`,
      mergedStates: group,
      isStart,
      isAccept,
      isTrap,
      matchedRuleId: repState.matchedRuleId,
      matchedRulePriority: repState.matchedRulePriority,
      matchedRules: repState.matchedRules,
    };
  });

  // 5. Construct minimized transitions
  const minTransitions: DFATransition[] = [];
  const edgeDedupe = new Set<string>();

  for (const mState of minStates) {
    const repOldId = mState.mergedStates![0];
    for (const sym of alphabet) {
      const targetOld = transMap[repOldId]?.[sym];
      if (targetOld && oldToMinId[targetOld]) {
        const targetMin = oldToMinId[targetOld];
        const key = `${mState.id}-${sym}->${targetMin}`;
        if (!edgeDedupe.has(key)) {
          edgeDedupe.add(key);
          minTransitions.push({
            from: mState.id,
            to: targetMin,
            symbol: sym,
          });
        }
      }
    }
  }

  // Calculate state reduction percentage (ignoring dead/trap state)
  const dfaRealCount = dfa.states.filter((s) => !s.isTrap).length;
  const minRealCount = minStates.filter((s) => !s.isTrap).length;
  const reductionPct =
    dfaRealCount > 0 ? Math.max(0, Math.round(((dfaRealCount - minRealCount) / dfaRealCount) * 100)) : 0;

  return {
    type: 'MinDFA',
    states: minStates,
    transitions: minTransitions,
    startState: oldToMinId[startState] || 'M0',
    acceptStates: minStates.filter((s) => s.isAccept).map((s) => s.id),
    alphabet,
    equivClasses,
    reductionPct,
  };
}
