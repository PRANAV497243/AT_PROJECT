/**
 * PatternGuard - Export Utilities
 * Functions for exporting graphs (SVG/PNG), automata (JSON), scan reports (CSV/JSON),
 * and generating low-level standalone code (Python, C99, TypeScript).
 */

import { DFA, MatchResult, ScanOutput } from '../engine';

/**
 * Downloads a string or blob as a file in the browser.
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports compiled DFA or Min-DFA as a structured JSON file.
 */
export function exportAutomatonJSON(automaton: DFA, regexName = 'automaton') {
  const data = {
    metadata: {
      generatedBy: 'PatternGuard DFA Engine',
      exportedAt: new Date().toISOString(),
      type: automaton.type,
      stateCount: automaton.states.length,
      transitionCount: automaton.transitions.length,
      reductionPct: automaton.reductionPct ?? 0,
      alphabet: automaton.alphabet,
    },
    automaton: {
      startState: automaton.startState,
      acceptStates: automaton.acceptStates,
      alphabet: automaton.alphabet,
      states: automaton.states,
      transitions: automaton.transitions,
      equivClasses: automaton.equivClasses,
    },
  };
  downloadFile(JSON.stringify(data, null, 2), `${regexName}-${automaton.type.toLowerCase()}.json`, 'application/json');
}

/**
 * Exports scan results as a CSV report.
 */
export function exportReportCSV(matches: MatchResult[], filename = 'patternguard-threat-report.csv') {
  const headers = ['Line', 'Rule ID', 'Rule Name', 'Severity', 'Start Offset', 'End Offset', 'Matched Text', 'Line Content'];
  const rows = matches.map((m) => [
    m.lineNumber,
    `"${m.ruleId.replace(/"/g, '""')}"`,
    `"${m.ruleName.replace(/"/g, '""')}"`,
    m.severity,
    m.start,
    m.end,
    `"${m.text.replace(/"/g, '""')}"`,
    `"${m.lineContent.replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8');
}

/**
 * Exports scan summary and all matches as a JSON report.
 */
export function exportReportJSON(scanOutput: ScanOutput, filename = 'patternguard-threat-report.json') {
  downloadFile(JSON.stringify(scanOutput, null, 2), filename, 'application/json');
}

/**
 * Captures an HTML/SVG element and exports it as an SVG file.
 */
export function exportElementAsSVG(containerElement: HTMLElement | null, filename = 'patternguard-automaton.svg') {
  if (!containerElement) return;
  const svg = containerElement.querySelector('svg');
  if (!svg) {
    alert('No SVG canvas found to export.');
    return;
  }
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);
  downloadFile(svgString, filename, 'image/svg+xml;charset=utf-8');
}

/**
 * Captures an HTML element and exports it as a PNG image using an offscreen canvas.
 */
export function exportElementAsPNG(containerElement: HTMLElement | null, filename = 'patternguard-automaton.png') {
  if (!containerElement) return;
  const svg = containerElement.querySelector('svg');
  if (!svg) {
    alert('No SVG canvas found to export.');
    return;
  }

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const URLObj = window.URL || window.webkitURL || window;
  const blobURL = URLObj.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const width = containerElement.clientWidth || 1000;
    const height = containerElement.clientHeight || 600;
    canvas.width = width * 2; // high resolution 2x
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(2, 2);
    ctx.fillStyle = '#020617'; // slate-950 background
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    URLObj.revokeObjectURL(blobURL);
    const pngURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngURL;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  img.src = blobURL;
}

/**
 * Generates standalone production code (Python, C99, TypeScript) implementing the Min-DFA.
 */
export function generateCodeExports(automaton: DFA, regex = '(a|b)*abb') {
  const { states, transitions, startState, acceptStates, alphabet } = automaton;

  // Build transition dictionary: transMap[stateId][symbol] = targetId
  const transMap: Record<string, Record<string, string>> = {};
  states.forEach((s) => {
    transMap[s.id] = {};
  });
  transitions.forEach((t) => {
    transMap[t.from][t.symbol] = t.to;
  });

  // 1. Python DFA Class
  const pythonCode = `# ==============================================================================
# Auto-generated by PatternGuard DFA Engine
# Target Regex: ${regex}
# DFA States: ${states.length} | Alphabet: {${alphabet.join(', ')}}
# Complexity: O(n) Time, O(1) Memory per character. Zero backtracking (ReDoS immune).
# ==============================================================================

from typing import Dict, Set

class PatternGuardDFA:
    def __init__(self):
        self.start_state: str = "${startState}"
        self.accept_states: Set[str] = {${acceptStates.map((s) => `"${s}"`).join(', ')}}
        self.transitions: Dict[str, Dict[str, str]] = ${JSON.stringify(transMap, null, 12).replace(/\n/g, '\n        ')}

    def match(self, input_text: str) -> bool:
        """Evaluates whether the entire input_text is accepted by the DFA."""
        curr_state = self.start_state
        for char in input_text:
            next_state = self.transitions.get(curr_state, {}).get(char)
            if next_state is None or next_state == "q_dead":
                return False
            curr_state = next_state
        return curr_state in self.accept_states

    def scan(self, text: str):
        """Scans text in O(n) for matching substrings using longest match."""
        matches = []
        n = len(text)
        i = 0
        while i < n:
            curr = self.start_state
            last_match = None
            for j in range(i, n):
                ch = text[j]
                curr = self.transitions.get(curr, {}).get(ch)
                if not curr or curr == "q_dead":
                    break
                if curr in self.accept_states:
                    last_match = (i, j + 1, text[i:j + 1])
            if last_match:
                matches.append(last_match)
                i = last_match[1]
            else:
                i += 1
        return matches

if __name__ == "__main__":
    dfa = PatternGuardDFA()
    test_cases = ["abb", "aabb", "babb", "ab", ""]
    print("Testing PatternGuard DFA runner for: ${regex}")
    for s in test_cases:
        print(f"  Input: '{s}' -> Accepted: {dfa.match(s)}")
`;

  // 2. C99 Switch-Case State Machine
  const stateEnumMap: Record<string, string> = {};
  states.forEach((s) => {
    stateEnumMap[s.id] = `STATE_${s.id.toUpperCase()}`;
  });

  const cSwitchCases = states
    .map((s) => {
      const charCases = alphabet
        .map((sym) => {
          const target = transMap[s.id]?.[sym];
          if (!target || target === 'q_dead') {
            return `                case '${sym}': return false;`;
          }
          return `                case '${sym}': state = ${stateEnumMap[target]}; break;`;
        })
        .join('\n');

      return `        case ${stateEnumMap[s.id]}:\n            switch (c) {\n${charCases}\n                default: return false;\n            }\n            break;`;
    })
    .join('\n');

  const cCode = `/* ==============================================================================
 * Auto-generated C99 DFA State Machine by PatternGuard
 * Regex: ${regex}
 * Zero heap allocations, O(1) state transitions via jump table.
 * ============================================================================== */
#include <stdio.h>
#include <stdbool.h>

typedef enum {
${states.map((s) => `    ${stateEnumMap[s.id]}`).join(',\n')}
} DFAState;

bool patternguard_match(const char *input) {
    if (!input) return false;
    DFAState state = ${stateEnumMap[startState]};

    for (int i = 0; input[i] != '\\0'; i++) {
        char c = input[i];
        switch (state) {
${cSwitchCases}
            default:
                return false;
        }
    }

    return (${acceptStates.map((s) => `state == ${stateEnumMap[s]}`).join(' || ') || 'false'});
}

int main(void) {
    const char *tests[] = {"abb", "aabb", "babb", "ab", ""};
    int n = sizeof(tests) / sizeof(tests[0]);

    printf("PatternGuard C99 DFA Runner: %s\\n", "${regex}");
    for (int i = 0; i < n; i++) {
        printf("  Input \\"%s\\" -> %s\\n", tests[i], patternguard_match(tests[i]) ? "ACCEPT" : "REJECT");
    }
    return 0;
}
`;

  // 3. TypeScript Runner
  const tsCode = `/**
 * Auto-generated TypeScript DFA Class by PatternGuard
 * Regex: ${regex}
 */

export class CompiledDFA {
  public readonly startState = '${startState}';
  public readonly acceptStates = new Set<string>([${acceptStates.map((s) => `'${s}'`).join(', ')}]);
  public readonly transitions: Record<string, Record<string, string>> = ${JSON.stringify(transMap, null, 2)};

  public match(text: string): boolean {
    let curr: string | undefined = this.startState;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      curr = this.transitions[curr]?.[ch];
      if (!curr || curr === 'q_dead') return false;
    }
    return this.acceptStates.has(curr);
  }
}
`;

  return { pythonCode, cCode, tsCode };
}
