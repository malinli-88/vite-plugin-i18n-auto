import genImport from '@babel/generator';
import type * as t from '@babel/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generateFn = ((genImport as any).default ?? genImport) as (
  ast: t.Node,
  opts?: object,
  code?: string
) => { code: string };

export function generateCode(ast: t.File, code: string): string {
  return generateFn(ast, { retainLines: false, compact: false }, code).code;
}
