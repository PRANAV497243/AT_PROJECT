/**
 * PatternGuard - Lexer & Tokenizer
 * Converts raw regex strings into a verified token stream with explicit concatenation operators.
 * Supports: |, *, +, ?, ( ), ., [a-z], [^abc], \d, \w, \s, escapes, and {m,n}.
 */

import { ParseError } from './types';

export type TokenType =
  | 'LITERAL'
  | 'ANY_CHAR'       // .
  | 'CHAR_CLASS'    // [a-z] or [^abc]
  | 'OP'            // |, *, +, ?, (, )
  | 'REPEAT'        // {m,n}
  | 'CONCAT';       // ·

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
  charSet?: Set<string>;
  isNegated?: boolean;
  min?: number;
  max?: number;
}

// Built-in character sets for regex escapes
export const DIGITS = new Set('0123456789'.split(''));
export const WORD_CHARS = new Set(
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')
);
export const WHITESPACE_CHARS = new Set([' ', '\t', '\r', '\n', '\f', '\v']);

/**
 * Tokenizes regex string, validating syntax and inserting explicit concat operators.
 */
export function tokenizeRegex(pattern: string): Token[] {
  if (pattern === undefined || pattern === null) {
    throw new ParseError('Regular expression cannot be null or undefined.', 0);
  }
  if (pattern === '') {
    // Empty regex represents epsilon
    return [{ type: 'LITERAL', value: '', pos: 0 }];
  }

  const rawTokens: Token[] = [];
  let i = 0;
  const len = pattern.length;

  while (i < len) {
    const ch = pattern[i];

    // 1. Escaped characters: \d, \w, \s, \., \*, etc.
    if (ch === '\\') {
      if (i + 1 >= len) {
        throw new ParseError('Trailing backslash escape at end of pattern.', i);
      }
      const nextCh = pattern[i + 1];
      const pos = i;

      if (nextCh === 'd') {
        rawTokens.push({ type: 'CHAR_CLASS', value: '\\d', pos, charSet: new Set(DIGITS), isNegated: false });
        i += 2;
      } else if (nextCh === 'D') {
        rawTokens.push({ type: 'CHAR_CLASS', value: '\\D', pos, charSet: new Set(DIGITS), isNegated: true });
        i += 2;
      } else if (nextCh === 'w') {
        rawTokens.push({ type: 'CHAR_CLASS', value: '\\w', pos, charSet: new Set(WORD_CHARS), isNegated: false });
        i += 2;
      } else if (nextCh === 'W') {
        rawTokens.push({ type: 'CHAR_CLASS', value: '\\W', pos, charSet: new Set(WORD_CHARS), isNegated: true });
        i += 2;
      } else if (nextCh === 's') {
        rawTokens.push({ type: 'CHAR_CLASS', value: '\\s', pos, charSet: new Set(WHITESPACE_CHARS), isNegated: false });
        i += 2;
      } else if (nextCh === 'S') {
        rawTokens.push({ type: 'CHAR_CLASS', value: '\\S', pos, charSet: new Set(WHITESPACE_CHARS), isNegated: true });
        i += 2;
      } else if (nextCh === 'n') {
        rawTokens.push({ type: 'LITERAL', value: '\n', pos });
        i += 2;
      } else if (nextCh === 'r') {
        rawTokens.push({ type: 'LITERAL', value: '\r', pos });
        i += 2;
      } else if (nextCh === 't') {
        rawTokens.push({ type: 'LITERAL', value: '\t', pos });
        i += 2;
      } else {
        // Escaped literal (e.g. \., \+, \*, \\, \/, \-, \')
        rawTokens.push({ type: 'LITERAL', value: nextCh, pos });
        i += 2;
      }
    }
    // 2. Character Classes: [...] and [^...]
    else if (ch === '[') {
      const startPos = i;
      i++; // Skip '['
      let isNegated = false;
      if (i < len && pattern[i] === '^') {
        isNegated = true;
        i++;
      }

      const classChars = new Set<string>();
      let closed = false;

      // Handle literal ']' immediately after '[' or '[^'
      if (i < len && pattern[i] === ']') {
        classChars.add(']');
        i++;
      }

      while (i < len) {
        if (pattern[i] === ']') {
          closed = true;
          i++;
          break;
        }

        let currChar: string;
        if (pattern[i] === '\\') {
          if (i + 1 >= len) {
            throw new ParseError('Unterminated escape inside character class.', i);
          }
          const escaped = pattern[i + 1];
          if (escaped === 'd') {
            DIGITS.forEach(c => classChars.add(c));
            i += 2;
            continue;
          } else if (escaped === 'w') {
            WORD_CHARS.forEach(c => classChars.add(c));
            i += 2;
            continue;
          } else if (escaped === 's') {
            WHITESPACE_CHARS.forEach(c => classChars.add(c));
            i += 2;
            continue;
          } else if (escaped === 'n') {
            currChar = '\n';
          } else if (escaped === 't') {
            currChar = '\t';
          } else if (escaped === 'r') {
            currChar = '\r';
          } else {
            currChar = escaped;
          }
          i += 2;
        } else {
          currChar = pattern[i];
          i++;
        }

        // Check for range: e.g. a-z or 0-9
        if (i < len - 1 && pattern[i] === '-' && pattern[i + 1] !== ']') {
          i++; // Skip '-'
          let endChar: string;
          if (pattern[i] === '\\') {
            if (i + 1 >= len) {
              throw new ParseError('Unterminated escape in character class range.', i);
            }
            endChar = pattern[i + 1];
            i += 2;
          } else {
            endChar = pattern[i];
            i++;
          }

          const startCode = currChar.charCodeAt(0);
          const endCode = endChar.charCodeAt(0);
          if (startCode > endCode) {
            throw new ParseError(`Invalid range '${currChar}-${endChar}' in character class.`, startPos);
          }
          for (let code = startCode; code <= endCode; code++) {
            classChars.add(String.fromCharCode(code));
          }
        } else {
          classChars.add(currChar);
        }
      }

      if (!closed) {
        throw new ParseError("Unclosed character class '['.", startPos);
      }

      rawTokens.push({
        type: 'CHAR_CLASS',
        value: pattern.slice(startPos, i),
        pos: startPos,
        charSet: classChars,
        isNegated
      });
    }
    // 3. Range quantifiers: {m}, {m,}, {m,n}
    else if (ch === '{') {
      const startPos = i;
      const closeIdx = pattern.indexOf('}', i);
      if (closeIdx === -1) {
        // If not closed, treat as literal '{'
        rawTokens.push({ type: 'LITERAL', value: '{', pos: i });
        i++;
      } else {
        const body = pattern.slice(i + 1, closeIdx).trim();
        const commaIdx = body.indexOf(',');
        let min = 0;
        let max = Infinity;
        let valid = false;

        if (commaIdx === -1) {
          // Exactly {m}
          if (/^\d+$/.test(body)) {
            min = parseInt(body, 10);
            max = min;
            valid = true;
          }
        } else {
          const minStr = body.slice(0, commaIdx).trim();
          const maxStr = body.slice(commaIdx + 1).trim();
          if (/^\d+$/.test(minStr)) {
            min = parseInt(minStr, 10);
            if (maxStr === '') {
              // {m,}
              max = Infinity;
              valid = true;
            } else if (/^\d+$/.test(maxStr)) {
              // {m,n}
              max = parseInt(maxStr, 10);
              if (min <= max) {
                valid = true;
              } else {
                throw new ParseError(`Invalid range quantifier {${min},${max}}: min cannot exceed max.`, startPos);
              }
            }
          }
        }

        if (valid) {
          rawTokens.push({
            type: 'REPEAT',
            value: pattern.slice(startPos, closeIdx + 1),
            pos: startPos,
            min,
            max
          });
          i = closeIdx + 1;
        } else {
          // If not matching valid {m,n} format, treat as literal '{'
          rawTokens.push({ type: 'LITERAL', value: '{', pos: i });
          i++;
        }
      }
    }
    // 4. Wildcard dot '.'
    else if (ch === '.') {
      rawTokens.push({ type: 'ANY_CHAR', value: '.', pos: i });
      i++;
    }
    // 5. Standard Operators: |, *, +, ?, (, )
    else if (['|', '*', '+', '?', '(', ')'].includes(ch)) {
      rawTokens.push({ type: 'OP', value: ch, pos: i });
      i++;
    }
    // 6. Regular literal character
    else {
      rawTokens.push({ type: 'LITERAL', value: ch, pos: i });
      i++;
    }
  }

  // Validate balanced parentheses and operator syntax
  let parenDepth = 0;
  for (let idx = 0; idx < rawTokens.length; idx++) {
    const tok = rawTokens[idx];
    const prev = idx > 0 ? rawTokens[idx - 1] : null;

    if (tok.type === 'OP') {
      if (tok.value === '(') {
        parenDepth++;
        if (idx + 1 < rawTokens.length && rawTokens[idx + 1].type === 'OP' && rawTokens[idx + 1].value === ')') {
          throw new ParseError("Empty parentheses '()' are not allowed.", tok.pos);
        }
      } else if (tok.value === ')') {
        parenDepth--;
        if (parenDepth < 0) {
          throw new ParseError("Unmatched closing parenthesis ')'.", tok.pos);
        }
      } else if (['*', '+', '?'].includes(tok.value)) {
        if (!prev || (prev.type === 'OP' && ['(', '|'].includes(prev.value))) {
          throw new ParseError(`Unexpected quantifier '${tok.value}' without preceding atom.`, tok.pos);
        }
      } else if (tok.value === '|') {
        if (!prev || (prev.type === 'OP' && ['(', '|'].includes(prev.value))) {
          throw new ParseError("Unexpected alternation '|' at start of group.", tok.pos);
        }
        if (idx === rawTokens.length - 1 || (rawTokens[idx + 1].type === 'OP' && rawTokens[idx + 1].value === ')')) {
          throw new ParseError("Dangling alternation '|' without following expression.", tok.pos);
        }
      }
    } else if (tok.type === 'REPEAT') {
      if (!prev || (prev.type === 'OP' && ['(', '|'].includes(prev.value))) {
        throw new ParseError(`Unexpected quantifier '${tok.value}' without preceding atom.`, tok.pos);
      }
    }
  }

  if (parenDepth > 0) {
    throw new ParseError("Unclosed parenthesis '('.", len);
  }

  // Insert explicit concatenation operator (CONCAT '·')
  const tokensWithConcat: Token[] = [];
  for (let idx = 0; idx < rawTokens.length; idx++) {
    const t1 = rawTokens[idx];
    tokensWithConcat.push(t1);

    if (idx + 1 < rawTokens.length) {
      const t2 = rawTokens[idx + 1];

      const t1CanEndUnit =
        t1.type === 'LITERAL' ||
        t1.type === 'CHAR_CLASS' ||
        t1.type === 'ANY_CHAR' ||
        t1.type === 'REPEAT' ||
        (t1.type === 'OP' && [')', '*', '+', '?'].includes(t1.value));

      const t2CanStartUnit =
        t2.type === 'LITERAL' ||
        t2.type === 'CHAR_CLASS' ||
        t2.type === 'ANY_CHAR' ||
        (t2.type === 'OP' && t2.value === '(');

      if (t1CanEndUnit && t2CanStartUnit) {
        tokensWithConcat.push({ type: 'CONCAT', value: '·', pos: t1.pos });
      }
    }
  }

  return tokensWithConcat;
}
