import { describe, it, expect } from 'vitest';
import {
  parseRegexToAST,
  buildThompsonNFA,
  buildSubsetDFA,
  minimizeDFA,
  simulateAutomaton,
} from '../engine';
import { DEFAULT_RULES } from '../store/defaultRules';

describe('Visualizer Verification with structuredClone (Web Worker postMessage)', () => {
  it('1. Verifies SQL Injection rule in ε-NFA, DFA, and Min-DFA', () => {
    const sqliRule = DEFAULT_RULES.find((r) => r.id === 'rule_sqli')!;
    expect(sqliRule).toBeDefined();

    const ast = parseRegexToAST(sqliRule.regex);
    const nfa = buildThompsonNFA(ast);
    const dfa = buildSubsetDFA(nfa);
    const minDfa = minimizeDFA(dfa);

    // Emulate Web Worker postMessage structured-cloning
    const clonedAst = structuredClone(ast);
    const clonedNfa = structuredClone(nfa);
    const clonedDfa = structuredClone(dfa);
    const clonedMinDfa = structuredClone(minDfa);

    // Verify all tabs show non-zero states
    expect(clonedAst.type).toBeDefined();
    expect(clonedNfa.states.length).toBeGreaterThan(0);
    expect(clonedDfa.states.length).toBeGreaterThan(0);
    expect(clonedMinDfa.states.length).toBeGreaterThan(0);

    console.log(
      `SQL Injection States -> ε-NFA: ${clonedNfa.states.length}, DFA: ${clonedDfa.states.length}, Min-DFA: ${clonedMinDfa.states.length}`
    );

    // Verify step simulation (Play animation)
    const simResult = simulateAutomaton(clonedMinDfa, "' OR 1=1");
    expect(simResult.isAccepted).toBe(true);
    expect(simResult.steps.length).toBe("' OR 1=1".length + 1);
    expect(simResult.path.length).toBe("' OR 1=1".length + 1);
  });

  it('2. Verifies IPv4 Address rule in ε-NFA, DFA, and Min-DFA', () => {
    const ipv4Rule = DEFAULT_RULES.find((r) => r.id === 'rule_ipv4')!;
    expect(ipv4Rule).toBeDefined();

    const ast = parseRegexToAST(ipv4Rule.regex);
    const nfa = buildThompsonNFA(ast);
    const dfa = buildSubsetDFA(nfa);
    const minDfa = minimizeDFA(dfa);

    const clonedNfa = structuredClone(nfa);
    const clonedDfa = structuredClone(dfa);
    const clonedMinDfa = structuredClone(minDfa);

    expect(clonedNfa.states.length).toBeGreaterThan(0);
    expect(clonedDfa.states.length).toBeGreaterThan(0);
    expect(clonedMinDfa.states.length).toBeGreaterThan(0);

    console.log(
      `IPv4 Address States -> ε-NFA: ${clonedNfa.states.length}, DFA: ${clonedDfa.states.length}, Min-DFA: ${clonedMinDfa.states.length}`
    );

    // Play animation on '192.168.1.1'
    const simResult = simulateAutomaton(clonedMinDfa, '192.168.1.1');
    expect(simResult.isAccepted).toBe(true);
    expect(simResult.steps.length).toBe('192.168.1.1'.length + 1);
    expect(simResult.path.length).toBe('192.168.1.1'.length + 1);
  });

  it('3. Verifies custom (a|b)*abb pattern in ε-NFA, DFA, and Min-DFA', () => {
    const customRegex = '(a|b)*abb';
    const ast = parseRegexToAST(customRegex);
    const nfa = buildThompsonNFA(ast);
    const dfa = buildSubsetDFA(nfa);
    const minDfa = minimizeDFA(dfa);

    const clonedNfa = structuredClone(nfa);
    const clonedDfa = structuredClone(dfa);
    const clonedMinDfa = structuredClone(minDfa);

    expect(clonedNfa.states.length).toBe(14); // Standard Thompson NFA for (a|b)*abb (14 states)
    expect(clonedDfa.states.filter((s) => !s.isTrap).length).toBe(5); // Unminimized DFA (5 states)
    expect(clonedMinDfa.states.filter((s) => !s.isTrap).length).toBe(4); // Minimized Hopcroft DFA (4 canonical states)

    console.log(
      `(a|b)*abb States -> ε-NFA: ${clonedNfa.states.length}, DFA: ${clonedDfa.states.length}, Min-DFA: ${clonedMinDfa.states.length}`
    );

    // Play animation on 'aabb'
    const simResult = simulateAutomaton(clonedMinDfa, 'aabb');
    expect(simResult.isAccepted).toBe(true);
    expect(simResult.steps.length).toBe(5); // 0 (start) + 4 chars
    expect(simResult.path.length).toBe(5);
  });
});
