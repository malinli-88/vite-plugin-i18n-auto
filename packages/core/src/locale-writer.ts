import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { TranslateMode } from './types.js';

export interface WriteLocalesParams {
  cwd: string;
  outputDir: string;
  /** moduleName -> locale -> messages */
  aggregate: Map<string, Map<string, Record<string, string>>>;
  defaultLocale: string;
  targetLocales: string[];
  translate: TranslateMode;
}

/** 生成可供 runtime 安全解析的 index.ts（JSON 数组单行，便于正则 + JSON.parse） */
export function generateIndexTsContent(
  moduleNames: string[],
  locales: string[]
): string {
  const modSorted = [...moduleNames].sort();
  const locSorted = [...locales].sort();
  const localeUnion = locSorted.map((l) => JSON.stringify(l)).join(' | ');
  const moduleUnion = modSorted.map((m) => JSON.stringify(m)).join(' | ');
  const modulesJson = JSON.stringify(modSorted);
  const localesJson = JSON.stringify(locSorted);

  return `/* 由 vite-plugin-i18n-auto extract 生成，请勿手改模块/语言列表结构 */
export type Locale = ${localeUnion};
export type ModuleName = ${moduleUnion};

export const modules = ${modulesJson} as const;
export const locales = ${localesJson} as const;

export async function loadModule(
  locale: Locale,
  module: ModuleName
): Promise<Record<string, string>> {
  const mod = await import(/* @vite-ignore */ \`./\${module}/\${locale}.json\`);
  return (mod as { default: Record<string, string> }).default;
}
`;
}

/**
 * 填充目标语言 key（占位空串），便于 manual / ai 写入
 */
function ensureTargetPlaceholders(
  aggregate: Map<string, Map<string, Record<string, string>>>,
  defaultLocale: string,
  targetLocales: string[]
): void {
  for (const [, byLoc] of aggregate) {
    const def = byLoc.get(defaultLocale) ?? {};
    for (const tl of targetLocales) {
      if (!byLoc.has(tl)) byLoc.set(tl, {});
      const tgt = byLoc.get(tl)!;
      for (const key of Object.keys(def)) {
        if (!(key in tgt)) tgt[key] = '';
      }
    }
  }
}

async function readJsonFile(file: string): Promise<Record<string, string>> {
  try {
    const raw = await readFile(file, 'utf8');
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function mergeDefaultLocale(
  existing: Record<string, string>,
  incoming: Record<string, string>
): Record<string, string> {
  return { ...existing, ...incoming };
}

/** 目标语言：已有非空译文不被空字符串覆盖 */
function mergeTargetLocale(
  existing: Record<string, string>,
  incoming: Record<string, string>
): Record<string, string> {
  const out = { ...incoming };
  for (const [k, v] of Object.entries(existing)) {
    if (v && String(v).trim() !== '' && (!out[k] || String(out[k]).trim() === '')) {
      out[k] = v;
    }
  }
  return out;
}

/**
 * 将聚合结果写入磁盘并生成 index.ts
 */
export async function writeLocaleArtifacts(params: WriteLocalesParams): Promise<void> {
  const root = path.resolve(params.cwd, params.outputDir);
  await mkdir(root, { recursive: true });

  const { aggregate, defaultLocale, targetLocales, translate } = params;

  if (translate !== false) {
    ensureTargetPlaceholders(aggregate, defaultLocale, targetLocales);
  }

  const localesToWrite =
    translate === false ? [defaultLocale] : [defaultLocale, ...targetLocales];

  const moduleNames = [...aggregate.keys()].sort();

  for (const mod of moduleNames) {
    const byLoc = aggregate.get(mod)!;
    const modDir = path.join(root, mod);
    await mkdir(modDir, { recursive: true });

    for (const loc of localesToWrite) {
      const file = path.join(modDir, `${loc}.json`);
      const incoming = { ...(byLoc.get(loc) ?? {}) };
      const existing = await readJsonFile(file);
      const merged =
        loc === defaultLocale
          ? mergeDefaultLocale(existing, incoming)
          : mergeTargetLocale(existing, incoming);
      await writeFile(file, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
    }
  }

  const indexLocales =
    translate === false ? [defaultLocale] : [defaultLocale, ...targetLocales];
  const indexContent = generateIndexTsContent(moduleNames, [...new Set(indexLocales)]);
  await writeFile(path.join(root, 'index.ts'), indexContent, 'utf8');
}
