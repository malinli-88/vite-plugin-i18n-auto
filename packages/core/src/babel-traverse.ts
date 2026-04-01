import traverseImport from '@babel/traverse';
import type { NodePath } from '@babel/traverse';
import type * as t from '@babel/types';

/* CJS 打包进 ESM 后 default 可能落在 .default 上 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const traverseFn = ((traverseImport as any).default ?? traverseImport) as (
  ast: t.File,
  visitor: object
) => void;

export function traverseAst(ast: t.File, visitor: object): void {
  traverseFn(ast, visitor);
}

export type { NodePath };
