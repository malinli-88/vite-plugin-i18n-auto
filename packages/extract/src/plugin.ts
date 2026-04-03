import path from 'node:path';
import type { Plugin } from 'vite';
import {
  extractFromSource,
  writeLocaleArtifacts,
  type TranslateMode,
} from '@vite-plugin-i18n-auto/core';
import { shouldProcessFile, toPosixRel } from './filter.js';
import type { I18nExtractOptions } from './types.js';

const VIRTUAL_PREFIX = '\0virtual:';

export default function i18nExtractPlugin(userOptions: I18nExtractOptions = {}): Plugin {
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
  const translate: TranslateMode = userOptions.translate ?? 'manual';
  const skipCallNames = userOptions.skipCallNames;

  /** module -> locale -> messages */
  const aggregate = new Map<string, Map<string, Record<string, string>>>();
  let keyRegistry: object = {};

  return {
    name: 'vite-plugin-i18n-auto-extract',
    enforce: 'pre',

    buildStart() {
      aggregate.clear();
      keyRegistry = {};
    },

    transform(code, id) {
      if (id.includes('\0') || id.startsWith(VIRTUAL_PREFIX)) return null;
      const cleanId = id.split('?')[0];
      const ext = path.extname(cleanId);
      if (!['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts'].includes(ext)) return null;
      const cwd = process.cwd();
      const rel = toPosixRel(cwd, id);
      if (!rel || !shouldProcessFile(rel, include, exclude)) return null;

      const normId = path.normalize(id);
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

      // 仅聚合文案写语言包；中文改为 $tr('原文')（静态）由 @vite-plugin-i18n-auto/runtime 的 inlineChineseToT 统一处理
      const { messages } = extractFromSource(code, {
        keyRegistry,
        filePath: normId,
        moduleName: modName,
        defaultLocale,
        replaceInSource: false,
        skipCallNames,
      });

      Object.assign(defMap, messages);

      return null;
    },

    async buildEnd() {
      await writeLocaleArtifacts({
        cwd: process.cwd(),
        outputDir,
        aggregate,
        defaultLocale,
        targetLocales,
        translate,
      });
    },
  };
}
