/**
 * PatternGuard - Shunting-Yard Parser & AST Builder
 * Converts token streams into an Abstract Syntax Tree (AST).
 * Handles operator precedence: Quantifiers (*, +, ?, {m,n}) > Concat (·) > Alternation (|).
 */

import { ASTNode, ParseError } from './types';
import { tokenizeRegex, Token } from './lexer';

let astNodeCounter = 1;

/**
 * Deep clones an ASTNode subtree, generating new unique node IDs.
 */
function cloneASTNode(node: ASTNode): ASTNode {
  return {
    ...node,
    id: `ast_${astNodeCounter++}`,
    children: node.children ? node.children.map(cloneASTNode) : undefined,
    charList: node.charList ? [...node.charList] : undefined,
  };
}

/**
 * Expands a repeat quantifier {m,n} over a child AST node into primitive AST nodes.
 * E.g.
 *   a{3}     => a·a·a
 *   a{2,}    => a·a·a*
 *   a{1,3}   => a·a?·a?
 *   a{0,2}   => a?·a?
 */
function expandRepeat(child: ASTNode, min: number, max: number): ASTNode {
  // Case: {0,0} -> epsilon (empty literal)
  if (min === 0 && max === 0) {
    return {
      id: `ast_${astNodeCounter++}`,
      type: 'LITERAL',
      value: '',
      label: 'ε',
    };
  }

  // Case: {0, Infinity} -> Kleene star
  if (min === 0 && max === Infinity) {
    return {
      id: `ast_${astNodeCounter++}`,
      type: 'KLEENE_STAR',
      operator: '*',
      label: 'Quantifier (*)',
      children: [child],
    };
  }

  // Case: {1, Infinity} -> Plus
  if (min === 1 && max === Infinity) {
    return {
      id: `ast_${astNodeCounter++}`,
      type: 'PLUS',
      operator: '+',
      label: 'Quantifier (+)',
      children: [child],
    };
  }

  // Case: {0, 1} -> Optional
  if (min === 0 && max === 1) {
    return {
      id: `ast_${astNodeCounter++}`,
      type: 'OPTIONAL',
      operator: '?',
      label: 'Quantifier (?)',
      children: [child],
    };
  }

  const parts: ASTNode[] = [];

  // 1. Mandatory occurrences (min copies)
  for (let k = 0; k < min; k++) {
    parts.push(k === 0 ? child : cloneASTNode(child));
  }

  // 2. Unbounded tail: {min,}
  if (max === Infinity) {
    parts.push({
      id: `ast_${astNodeCounter++}`,
      type: 'KLEENE_STAR',
      operator: '*',
      label: 'Quantifier (*)',
      children: [cloneASTNode(child)],
    });
  }
  // 3. Optional bounded occurrences: {min, max}
  else if (max > min) {
    for (let k = min; k < max; k++) {
      const optChild = parts.length === 0 && k === 0 ? child : cloneASTNode(child);
      parts.push({
        id: `ast_${astNodeCounter++}`,
        type: 'OPTIONAL',
        operator: '?',
        label: 'Quantifier (?)',
        children: [optChild],
      });
    }
  }

  // Chain parts with CONCAT (·)
  if (parts.length === 0) {
    return {
      id: `ast_${astNodeCounter++}`,
      type: 'LITERAL',
      value: '',
      label: 'ε',
    };
  }

  let result = parts[0];
  for (let k = 1; k < parts.length; k++) {
    result = {
      id: `ast_${astNodeCounter++}`,
      type: 'CONCAT',
      operator: '·',
      label: 'Concat (·)',
      children: [result, parts[k]],
    };
  }

  return result;
}

/**
 * Parses a regular expression pattern into an AST.
 */
export function parseRegexToAST(pattern: string, ruleId?: string): ASTNode {
  astNodeCounter = 1;
  const tokens = tokenizeRegex(pattern);

  // If pattern is empty, return empty literal
  if (tokens.length === 1 && tokens[0].type === 'LITERAL' && tokens[0].value === '') {
    return {
      id: `ast_${astNodeCounter++}`,
      type: 'LITERAL',
      value: '',
      label: 'ε',
      ruleId,
    };
  }

  const precedence: Record<string, number> = {
    '|': 1,
    '·': 2,
    '*': 3,
    '+': 3,
    '?': 3,
    REPEAT: 3,
  };

  const outputQueue: Token[] = [];
  const opStack: Token[] = [];

  for (const token of tokens) {
    if (token.type === 'LITERAL' || token.type === 'CHAR_CLASS' || token.type === 'ANY_CHAR') {
      outputQueue.push(token);
    } else if (token.type === 'REPEAT') {
      // Repeat quantifier binds immediately like * / + / ?
      while (
        opStack.length > 0 &&
        opStack[opStack.length - 1].value !== '(' &&
        (precedence[opStack[opStack.length - 1].value] || 0) >= precedence.REPEAT
      ) {
        outputQueue.push(opStack.pop()!);
      }
      outputQueue.push(token);
    } else if (token.type === 'CONCAT') {
      while (
        opStack.length > 0 &&
        opStack[opStack.length - 1].value !== '(' &&
        (precedence[opStack[opStack.length - 1].value] || 0) >= precedence['·']
      ) {
        outputQueue.push(opStack.pop()!);
      }
      opStack.push(token);
    } else if (token.type === 'OP') {
      if (token.value === '(') {
        opStack.push(token);
      } else if (token.value === ')') {
        while (opStack.length > 0 && opStack[opStack.length - 1].value !== '(') {
          outputQueue.push(opStack.pop()!);
        }
        if (opStack.length === 0) {
          throw new ParseError("Unmatched closing parenthesis ')'.", token.pos);
        }
        opStack.pop(); // Remove '('
      } else {
        // Binary operator (|) or unary quantifier (*, +, ?)
        const currentPrec = precedence[token.value] || 0;
        while (
          opStack.length > 0 &&
          opStack[opStack.length - 1].value !== '(' &&
          (precedence[opStack[opStack.length - 1].value] || 0) >= currentPrec
        ) {
          outputQueue.push(opStack.pop()!);
        }
        opStack.push(token);
      }
    }
  }

  while (opStack.length > 0) {
    const top = opStack.pop()!;
    if (top.value === '(') {
      throw new ParseError("Unclosed parenthesis '('.", top.pos);
    }
    outputQueue.push(top);
  }

  // Construct AST from Postfix Output Queue
  const astStack: ASTNode[] = [];

  for (const tok of outputQueue) {
    if (tok.type === 'LITERAL') {
      astStack.push({
        id: `ast_${astNodeCounter++}`,
        type: 'LITERAL',
        value: tok.value,
        label: tok.value === '' ? 'ε' : `'${tok.value}'`,
        ruleId,
      });
    } else if (tok.type === 'ANY_CHAR') {
      astStack.push({
        id: `ast_${astNodeCounter++}`,
        type: 'ANY_CHAR',
        label: 'Any (.)',
        ruleId,
      });
    } else if (tok.type === 'CHAR_CLASS') {
      astStack.push({
        id: `ast_${astNodeCounter++}`,
        type: 'CHAR_CLASS',
        charList: tok.charSet ? Array.from(tok.charSet) : undefined,
        isNegated: tok.isNegated,
        label: tok.value,
        ruleId,
      });
    } else if (tok.type === 'REPEAT') {
      const child = astStack.pop();
      if (!child) {
        throw new ParseError(`Malformed quantifier '${tok.value}'.`, tok.pos);
      }
      const expanded = expandRepeat(child, tok.min ?? 0, tok.max ?? Infinity);
      astStack.push(expanded);
    } else if (tok.type === 'OP' && ['*', '+', '?'].includes(tok.value)) {
      const child = astStack.pop();
      if (!child) {
        throw new ParseError(`Malformed quantifier '${tok.value}'.`, tok.pos);
      }
      astStack.push({
        id: `ast_${astNodeCounter++}`,
        type: tok.value === '*' ? 'KLEENE_STAR' : tok.value === '+' ? 'PLUS' : 'OPTIONAL',
        operator: tok.value,
        label: `Quantifier (${tok.value})`,
        children: [child],
        ruleId,
      });
    } else if (tok.type === 'CONCAT' || (tok.type === 'OP' && tok.value === '|')) {
      const isConcat = tok.type === 'CONCAT' || tok.value === '·';
      const right = astStack.pop();
      const left = astStack.pop();
      if (!left || !right) {
        throw new ParseError(`Malformed operator '${tok.value}'.`, tok.pos);
      }
      astStack.push({
        id: `ast_${astNodeCounter++}`,
        type: isConcat ? 'CONCAT' : 'UNION',
        operator: isConcat ? '·' : '|',
        label: isConcat ? 'Concat (·)' : 'Union (|)',
        children: [left, right],
        ruleId,
      });
    }
  }

  if (astStack.length !== 1) {
    throw new ParseError('Invalid regular expression syntax.', 0);
  }

  return astStack[0];
}
