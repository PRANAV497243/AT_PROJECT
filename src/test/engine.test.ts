/**
 * PatternGuard - Engine Test Suite (Vitest)
 * Tests:
 * 1. Empty string
 * 2. Nested stars
 * 3. Classic (a|b)*abb
 * 4. Overlapping matches
 * 5. Invalid regex syntax errors with position
 * 6. Character classes, escapes, and quantifiers {m,n}
 * 7. Multi-rule priority resolution
 */

import { describe, it, expect } from 'vitest';
import {
  parseRegexToAST,
  buildThompsonNFA,
  buildSubsetDFA,
  minimizeDFA,
  simulateAutomaton,
  buildMultiRuleNFA,
  DFAScanner,
  ParseError,
  Rule,
} from '../engine';

describe('PatternGuard Automata Engine', () => {
  describe('1. Empty String Regex', () => {
    it('should parse empty string into epsilon AST and accept empty string', () => {
      const ast = parseRegexToAST('');
      expect(ast.type).toBe('LITERAL');
      expect(ast.value).toBe('');

      const nfa = buildThompsonNFA(ast);
      expect(nfa.states.length).toBeGreaterThanOrEqual(2);

      const dfa = buildSubsetDFA(nfa);
      const minDfa = minimizeDFA(dfa);

      const simEmpty = simulateAutomaton(minDfa, '');
      expect(simEmpty.isAccepted).toBe(true);

      const simNonEmpty = simulateAutomaton(minDfa, 'a');
      expect(simNonEmpty.isAccepted).toBe(false);
    });
  });

  describe('2. Nested Stars: (a*)* and (a|b*)*', () => {
    it('should compile and simulate nested star patterns without infinite loops', () => {
      const ast = parseRegexToAST('(a*)*');
      const nfa = buildThompsonNFA(ast);
      const dfa = buildSubsetDFA(nfa);
      const minDfa = minimizeDFA(dfa);

      // (a*)* accepts empty string, a, aa, aaaaa
      expect(simulateAutomaton(minDfa, '').isAccepted).toBe(true);
      expect(simulateAutomaton(minDfa, 'a').isAccepted).toBe(true);
      expect(simulateAutomaton(minDfa, 'aaa').isAccepted).toBe(true);
      // Rejects b
      expect(simulateAutomaton(minDfa, 'b').isAccepted).toBe(false);
      expect(simulateAutomaton(minDfa, 'aab').isAccepted).toBe(false);
    });

    it('should handle (a|b*)* with mixed quantifiers', () => {
      const ast = parseRegexToAST('(a|b*)*');
      const nfa = buildThompsonNFA(ast);
      const dfa = buildSubsetDFA(nfa);
      const minDfa = minimizeDFA(dfa);

      expect(simulateAutomaton(minDfa, '').isAccepted).toBe(true);
      expect(simulateAutomaton(minDfa, 'a').isAccepted).toBe(true);
      expect(simulateAutomaton(minDfa, 'bb').isAccepted).toBe(true);
      expect(simulateAutomaton(minDfa, 'ababbb').isAccepted).toBe(true);
      expect(simulateAutomaton(minDfa, 'c').isAccepted).toBe(false);
    });
  });

  describe('3. Textbook Pattern: (a|b)*abb', () => {
    const pattern = '(a|b)*abb';
    const ast = parseRegexToAST(pattern);
    const nfa = buildThompsonNFA(ast);
    const dfa = buildSubsetDFA(nfa);
    const minDfa = minimizeDFA(dfa);

    it('should construct valid ε-NFA, DFA, and Minimized DFA', () => {
      expect(nfa.states.length).toBeGreaterThan(0);
      expect(dfa.states.length).toBeGreaterThan(0);
      expect(minDfa.states.length).toBeLessThanOrEqual(dfa.states.length);
      // The canonical minimal DFA for (a|b)*abb has exactly 4 non-trap states (M0, M1, M2, M3)
      const realStates = minDfa.states.filter((s) => !s.isTrap);
      expect(realStates.length).toBe(4);
      expect(minDfa.reductionPct).toBeGreaterThanOrEqual(0);
    });

    it('should accept valid strings ending in abb', () => {
      const testCases = ['abb', 'aabb', 'babb', 'ababb', 'bbabb', 'aaaaabb'];
      for (const str of testCases) {
        const result = simulateAutomaton(minDfa, str);
        expect(result.isAccepted, `Failed to accept '${str}'`).toBe(true);
        expect(result.path.length).toBe(str.length + 1);
      }
    });

    it('should reject invalid strings', () => {
      const invalidCases = ['', 'a', 'b', 'ab', 'ba', 'abba', 'abbb', 'bbab'];
      for (const str of invalidCases) {
        const result = simulateAutomaton(minDfa, str);
        expect(result.isAccepted, `Incorrectly accepted '${str}'`).toBe(false);
      }
    });
  });

  describe('4. Scanner: Overlapping & Longest Matches', () => {
    const rules: Rule[] = [
      {
        id: 'r_ab',
        name: 'Pattern AB',
        regex: 'ab',
        category: 'CUSTOM',
        severity: 'LOW',
        description: 'Matches ab',
        enabled: true,
        priority: 10,
      },
      {
        id: 'r_aba',
        name: 'Pattern ABA',
        regex: 'aba',
        category: 'CUSTOM',
        severity: 'HIGH',
        description: 'Matches aba',
        enabled: true,
        priority: 20,
      },
      {
        id: 'r_card',
        name: 'Card Pattern',
        regex: '\\d{4}-\\d{4}',
        category: 'SENSITIVE_DATA',
        severity: 'CRITICAL',
        description: 'Card format',
        enabled: true,
        priority: 50,
      },
    ];

    it('should find longest match with priority when overlapping is disabled', () => {
      const multiNfa = buildMultiRuleNFA(rules);
      const dfa = buildSubsetDFA(multiNfa);
      const minDfa = minimizeDFA(dfa);
      const scanner = new DFAScanner(minDfa, rules);

      // In 'ababa', longest match at index 0 is 'aba'.
      // With allowOverlapping = false, it skips to index 3 ('ba'), which doesn't match 'ab' or 'aba'.
      const out = scanner.scan('ababa', { allowOverlapping: false });
      expect(out.matches.length).toBe(1);
      expect(out.matches[0].ruleId).toBe('r_aba');
      expect(out.matches[0].text).toBe('aba');
      expect(out.matches[0].start).toBe(0);
      expect(out.matches[0].end).toBe(3);
    });

    it('should find all overlapping matches when allowOverlapping = true', () => {
      const multiNfa = buildMultiRuleNFA(rules);
      const dfa = buildSubsetDFA(multiNfa);
      const minDfa = minimizeDFA(dfa);
      const scanner = new DFAScanner(minDfa, rules);

      // In 'ababa', start 0 matches 'aba', start 2 matches 'aba'
      const out = scanner.scan('ababa', { allowOverlapping: true });
      expect(out.matches.length).toBe(2);
      expect(out.matches[0].start).toBe(0);
      expect(out.matches[0].text).toBe('aba');
      expect(out.matches[1].start).toBe(2);
      expect(out.matches[1].text).toBe('aba');
    });

    it('should detect sensitive data cards across lines', () => {
      const multiNfa = buildMultiRuleNFA(rules);
      const dfa = buildSubsetDFA(multiNfa);
      const minDfa = minimizeDFA(dfa);
      const scanner = new DFAScanner(minDfa, rules);

      const log = "User log\nTransaction card 1234-5678 processed\nSuccess";
      const out = scanner.scan(log);
      expect(out.matches.length).toBe(1);
      expect(out.matches[0].ruleId).toBe('r_card');
      expect(out.matches[0].text).toBe('1234-5678');
      expect(out.matches[0].lineNumber).toBe(2);
    });
  });

  describe('5. Invalid Regex Syntax Errors with Exact Position', () => {
    it('should report unclosed parenthesis with position', () => {
      expect(() => parseRegexToAST('(a|b')).toThrow(ParseError);
      try {
        parseRegexToAST('(a|b');
      } catch (err: any) {
        expect(err.message).toContain('position');
      }
    });

    it('should report unmatched closing parenthesis with position', () => {
      expect(() => parseRegexToAST('a|b)')).toThrow(ParseError);
      try {
        parseRegexToAST('a|b)');
      } catch (err: any) {
        expect(err.message).toContain('position');
      }
    });

    it('should report invalid range [z-a] with position', () => {
      expect(() => parseRegexToAST('[z-a]')).toThrow(ParseError);
      try {
        parseRegexToAST('[z-a]');
      } catch (err: any) {
        expect(err.message).toContain("Invalid range 'z-a'");
      }
    });

    it('should report invalid quantifier bounds {5,2}', () => {
      expect(() => parseRegexToAST('a{5,2}')).toThrow(ParseError);
      try {
        parseRegexToAST('a{5,2}');
      } catch (err: any) {
        expect(err.message).toContain('min cannot exceed max');
      }
    });

    it('should report unexpected quantifier without atom', () => {
      expect(() => parseRegexToAST('+a')).toThrow(ParseError);
      expect(() => parseRegexToAST('*a')).toThrow(ParseError);
      expect(() => parseRegexToAST('?a')).toThrow(ParseError);
    });

    it('should report dangling alternation |', () => {
      expect(() => parseRegexToAST('a|')).toThrow(ParseError);
      expect(() => parseRegexToAST('|a')).toThrow(ParseError);
    });
  });

  describe('6. Character Classes, Escapes and Quantifiers {m,n}', () => {
    it('should match digits with \\d and bounded repeat {2,4}', () => {
      const ast = parseRegexToAST('\\d{2,4}');
      const nfa = buildThompsonNFA(ast);
      const dfa = buildSubsetDFA(nfa);
      const minDfa = minimizeDFA(dfa);

      expect(simulateAutomaton(minDfa, '1').isAccepted).toBe(false);
      expect(simulateAutomaton(minDfa, '12').isAccepted).toBe(true);
      expect(simulateAutomaton(minDfa, '123').isAccepted).toBe(true);
      expect(simulateAutomaton(minDfa, '1234').isAccepted).toBe(true);
      expect(simulateAutomaton(minDfa, '12345').isAccepted).toBe(false);
      expect(simulateAutomaton(minDfa, '12a').isAccepted).toBe(false);
    });

    it('should match negated character classes [^abc]', () => {
      const ast = parseRegexToAST('[^abc]+');
      const nfa = buildThompsonNFA(ast);
      const dfa = buildSubsetDFA(nfa);
      const minDfa = minimizeDFA(dfa);

      expect(simulateAutomaton(minDfa, 'xyz').isAccepted).toBe(true);
      expect(simulateAutomaton(minDfa, 'a').isAccepted).toBe(false);
      expect(simulateAutomaton(minDfa, 'b').isAccepted).toBe(false);
    });

    it('should support wildcard dot .', () => {
      const ast = parseRegexToAST('a.c');
      const nfa = buildThompsonNFA(ast);
      const dfa = buildSubsetDFA(nfa);
      const minDfa = minimizeDFA(dfa);

      expect(simulateAutomaton(minDfa, 'abc').isAccepted).toBe(true);
      expect(simulateAutomaton(minDfa, 'a-c').isAccepted).toBe(true);
      expect(simulateAutomaton(minDfa, 'a1c').isAccepted).toBe(true);
      expect(simulateAutomaton(minDfa, 'ac').isAccepted).toBe(false);
    });
  });

  describe('7. Web Worker postMessage Structured Cloning (Serializable Automata)', () => {
    it('should cleanly clone AST, ε-NFA, DFA, and Min-DFA for (a|b)*abb without functions', () => {
      const regex = '(a|b)*abb';
      const ast = parseRegexToAST(regex);
      const nfa = buildThompsonNFA(ast);
      const dfa = buildSubsetDFA(nfa);
      const minDfa = minimizeDFA(dfa);

      // Verify structuredClone works without throwing DataCloneError
      const clonedAst = structuredClone(ast);
      const clonedNfa = structuredClone(nfa);
      const clonedDfa = structuredClone(dfa);
      const clonedMinDfa = structuredClone(minDfa);

      expect(clonedAst.type).toBeDefined();
      expect(clonedNfa.states.length).toBe(nfa.states.length);
      expect(clonedDfa.states.length).toBe(dfa.states.length);
      expect(clonedMinDfa.states.length).toBe(minDfa.states.length);

      // Verify simulation works on cloned MinDFA
      expect(simulateAutomaton(clonedMinDfa, 'abb').isAccepted).toBe(true);
      expect(simulateAutomaton(clonedMinDfa, 'aabb').isAccepted).toBe(true);
      expect(simulateAutomaton(clonedMinDfa, 'ab').isAccepted).toBe(false);
    });

    it('should cleanly clone SQL Injection rule and simulate on cloned Min-DFA', () => {
      const regex = "(' OR 1=1)|(' or '1'='1)|(UNION SELECT)|(--)";
      const ast = parseRegexToAST(regex);
      const nfa = buildThompsonNFA(ast);
      const dfa = buildSubsetDFA(nfa);
      const minDfa = minimizeDFA(dfa);

      const clonedMinDfa = structuredClone(minDfa);
      expect(clonedMinDfa.states.length).toBeGreaterThan(0);
      expect(clonedNfaStates(structuredClone(nfa))).toBeGreaterThan(0);

      expect(simulateAutomaton(clonedMinDfa, "' OR 1=1").isAccepted).toBe(true);
      expect(simulateAutomaton(clonedMinDfa, 'UNION SELECT').isAccepted).toBe(true);
      expect(simulateAutomaton(clonedMinDfa, '--').isAccepted).toBe(true);
      expect(simulateAutomaton(clonedMinDfa, 'normal input').isAccepted).toBe(false);
    });

    it('should cleanly clone IPv4 Address rule and simulate on cloned Min-DFA', () => {
      const regex = '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}';
      const ast = parseRegexToAST(regex);
      const nfa = buildThompsonNFA(ast);
      const dfa = buildSubsetDFA(nfa);
      const minDfa = minimizeDFA(dfa);

      const clonedMinDfa = structuredClone(minDfa);
      expect(clonedMinDfa.states.length).toBeGreaterThan(0);

      expect(simulateAutomaton(clonedMinDfa, '192.168.1.1').isAccepted).toBe(true);
      expect(simulateAutomaton(clonedMinDfa, '10.0.0.1').isAccepted).toBe(true);
      expect(simulateAutomaton(clonedMinDfa, '999.999.999.999').isAccepted).toBe(true);
      expect(simulateAutomaton(clonedMinDfa, 'abc.def.ghi.jkl').isAccepted).toBe(false);
    });
  });
});

function clonedNfaStates(nfa: any) {
  return nfa.states.length;
}
