import { parse } from '@babel/parser';
import type { NodePath } from '@babel/traverse';
import { traverseAst } from './babel-traverse.js';
import { generateCode } from './babel-generate.js';
import * as t from '@babel/types';
import type { ExtractCodeOptions, ExtractCodeResult } from './types.js';
import { hasChinese } from './chinese.js';
import { makeStableKey } from './stable-key.js';

const DEFAULT_SKIP_CALLS = ['t', '$t'];

function buildSkipSet(extra?: string[]): Set<string> {
  const s = new Set<string>(DEFAULT_SKIP_CALLS);
  if (extra) for (const n of extra) s.add(n);
  return s;
}

function calleeMatchesSkip(
  callee: t.CallExpression['callee'],
  skipNames: Set<string>
): boolean {
  if (t.isIdentifier(callee) && skipNames.has(callee.name)) return true;
  if (
    t.isMemberExpression(callee) &&
    !callee.computed &&
    t.isIdentifier(callee.object, { name: 'i18n' }) &&
    t.isIdentifier(callee.property, { name: 't' })
  ) {
    return true;
  }
  return false;
}

/** 字面量是否位于应跳过的 CallExpression 参数树内（t / $t / i18n.t） */
function isInsideSkippedCall(
  path: NodePath<t.StringLiteral | t.JSXText>,
  skipSet: Set<string>
): boolean {
  let p: NodePath<t.Node> | null = path.parentPath;
  while (p) {
    if (p.isCallExpression() && calleeMatchesSkip(p.node.callee, skipSet)) {
      return true;
    }
    p = p.parentPath;
  }
  return false;
}

/** import / export / dynamic import 的源字符串不提取 */
function isModuleSpecifierLiteral(path: NodePath<t.StringLiteral>): boolean {
  const p = path.parentPath;
  return !!(
    p?.isImportDeclaration() ||
    p?.isExportAllDeclaration() ||
    p?.isExportNamedDeclaration() ||
    p?.isImportExpression()
  );
}

function replaceStringLiteral(
  path: NodePath<t.StringLiteral>,
  key: string,
  messages: Record<string, string>,
  value: string
): void {
  messages[key] = value;
  path.replaceWith(t.callExpression(t.identifier('t'), [t.stringLiteral(key)]));
}

function replaceJsxText(
  path: NodePath<t.JSXText>,
  key: string,
  messages: Record<string, string>,
  value: string
): void {
  messages[key] = value;
  path.replaceWith(
    t.jsxExpressionContainer(t.callExpression(t.identifier('t'), [t.stringLiteral(key)]))
  );
}

/**
 * 从单文件源码提取中文并按选项替换为 t('key')
 */
export function extractFromSource(code: string, options: ExtractCodeOptions): ExtractCodeResult {
  const messages: Record<string, string> = {};

  let ast: t.File;
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
      errorRecovery: false,
    });
  } catch {
    return { messages: {}, code, modified: false };
  }

  const { keyRegistry, filePath, replaceInSource } = options;
  const skipSet = buildSkipSet(options.skipCallNames);

  traverseAst(ast, {
    StringLiteral(path) {
      const v = path.node.value;
      if (!hasChinese(v)) return;
      if (isModuleSpecifierLiteral(path)) return;
      if (isInsideSkippedCall(path, skipSet)) return;

      const key = makeStableKey(keyRegistry, filePath, v);
      if (replaceInSource) {
        replaceStringLiteral(path, key, messages, v);
      } else {
        messages[key] = v;
      }
    },
    JSXText(path) {
      const v = path.node.value;
      if (!hasChinese(v)) return;
      if (isInsideSkippedCall(path, skipSet)) return;
      if (!v.trim()) return;

      const key = makeStableKey(keyRegistry, filePath, v);
      if (replaceInSource) {
        replaceJsxText(path, key, messages, v);
      } else {
        messages[key] = v;
      }
    },
  });

  const hasMsgs = Object.keys(messages).length > 0;
  if (!hasMsgs) {
    return { messages: {}, code, modified: false };
  }

  if (!replaceInSource) {
    return { messages, code, modified: false };
  }

  const out = generateCode(ast, code);
  return {
    messages,
    code: out,
    modified: true,
  };
}
