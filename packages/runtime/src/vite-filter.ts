import path from 'node:path';
import picomatch from 'picomatch';

export function toPosixRel(cwd: string, filePath: string): string | null {
  const rel = path.relative(cwd, filePath);
  if (!rel || rel.startsWith('..')) return null;
  return rel.split(path.sep).join('/');
}

export function shouldProcessFile(
  relPosix: string,
  include: string[],
  exclude: string[]
): boolean {
  const matchersIn = include.map((p) => picomatch(p, { dot: true }));
  const matchersEx = exclude.map((p) => picomatch(p, { dot: true }));
  const inc = matchersIn.some((m) => m(relPosix));
  const exc = matchersEx.some((m) => m(relPosix));
  return inc && !exc;
}
