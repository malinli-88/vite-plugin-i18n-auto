import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { extractFromSource, writeLocaleArtifacts } from '@vite-plugin-i18n-auto/core';
import { shouldProcessFile, toPosixRel } from './filter.js';
import type { I18nExtractOptions } from './types.js';

const TEXT_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts']);

async function* walkFiles(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === 'dist') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      yield* walkFiles(p);
    } else {
      yield p;
    }
  }
}

/**
 * 与 Vite extract 插件相同的聚合 + 写盘逻辑，供 CLI / npm script 在无 dev server 时执行。
 */
export async function runExtractToDisk(
  cwd: string,
  userOptions: I18nExtractOptions = {}
): Promise<void> {
  const outputDir = userOptions.outputDir ?? 'src/locales';
  const outGlobSeg = outputDir.split(path.sep).join('/').replace(/^\/+/, '');
  const include = userOptions.include ?? ['**/*.{tsx,ts,jsx,js}'];
  const exclude = [
    '**/node_modules/**',
    '**/dist/**',
    '**/.git/**',
    `**/${outGlobSeg}/**`,
    ...(userOptions.exclude ?? []),
  ];
  const defaultLocale = userOptions.defaultLocale ?? 'zh-CN';
  const targetLocales = userOptions.targetLocales ?? ['en-US'];
  const moduleMapping = userOptions.moduleMapping ?? (() => 'common');
  const translate = userOptions.translate ?? 'manual';
  const skipCallNames = userOptions.skipCallNames;

  const aggregate = new Map<string, Map<string, Record<string, string>>>();
  const keyRegistry: object = {};

  for await (const abs of walkFiles(cwd)) {
    const ext = path.extname(abs);
    if (!TEXT_EXTS.has(ext)) continue;
    const rel = toPosixRel(cwd, abs);
    if (!rel || !shouldProcessFile(rel, include, exclude)) continue;

    const normId = path.normalize(abs);
    const modName = moduleMapping(normId);
    let byLocale = aggregate.get(modName);
    if (!byLocale) {
      byLocale = new Map();
      aggregate.set(modName, byLocale);
    }
    let defMap = byLocale.get(defaultLocale);
    if (!defMap) {
      defMap = {};
      byLocale.set(defaultLocale, defMap);
    }

    const code = await readFile(abs, 'utf8');
    const { messages } = extractFromSource(code, {
      keyRegistry,
      filePath: normId,
      moduleName: modName,
      defaultLocale,
      replaceInSource: false,
      skipCallNames,
    });
    Object.assign(defMap, messages);
  }

  await writeLocaleArtifacts({
    cwd,
    outputDir,
    aggregate,
    defaultLocale,
    targetLocales,
    translate,
  });
}
