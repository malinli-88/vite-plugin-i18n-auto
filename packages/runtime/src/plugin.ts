import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { hasChinese } from '@vite-plugin-i18n-auto/core';
import { createVirtualModuleSource } from './create-virtual-module';
import { LOCALE_INDEX_STUB } from './locale-index-stub';
import { shouldProcessFile, toPosixRel } from './vite-filter';
import type { I18nRuntimeOptions, SerializableRuntimeConfig } from './types';

const RUNTIME_ID = 'virtual:i18n-runtime';
const RESOLVED_RUNTIME = '\0' + RUNTIME_ID;
const LOCALE_INDEX_VIRTUAL = 'virtual:i18n-locale-index';
const RESOLVED_LOCALE_STUB = '\0' + LOCALE_INDEX_VIRTUAL + '-stub';

function needsI18nInject(code: string): boolean {
  return hasChinese(code) || /\bt\s*\(/.test(code) || /\$t\s*\(/.test(code);
}

const VIRTUAL_RUNTIME_TYPES = `declare module "${RUNTIME_ID}" {
  import type * as React from "react";
  export type Locale = string;
  export type ModuleName = string;
  export function t(key: string, params?: Record<string, string | number>): string;
  export function $t(text: string): Promise<string>;
  export function use$t(text: string): { text: string; loading: boolean };
  export function preloadI18nModule(mod: ModuleName): Promise<void>;
  export function getLocale(): string;
  export function setLocale(locale: string): void;
  export function loadModule(mod: ModuleName): Promise<void>;
  export function loadModules(mods: ModuleName[]): Promise<void>;
  export function I18nProvider(props: {
    children: React.ReactNode;
    initialModules?: ModuleName[];
  }): React.ReactElement;
  export function useI18n(): {
    locale: string;
    t: typeof t;
    setLocale: (locale: string) => Promise<void>;
    loadModule: typeof loadModule;
    preloadI18nModule: typeof preloadI18nModule;
    ready: boolean;
  };
}
`;

export default function i18nRuntimePlugin(userOptions: I18nRuntimeOptions = {}): Plugin {
  const localesDir = userOptions.localesDir ?? 'src/locales';
  const defaultLocale = userOptions.defaultLocale ?? 'zh-CN';
  const initialModules = userOptions.initialModules ?? ['common'];
  const dynamicTranslate = userOptions.dynamicTranslate ?? null;
  const moduleMapping = userOptions.moduleMapping ?? (() => 'common');
  const autoImport = userOptions.autoImport ?? true;
  const injectProvider = userOptions.injectProvider ?? true;
  const entryFile = userOptions.entryFile ?? 'src/main.tsx';
  const typesOutput = userOptions.typesOutput ?? 'src/types/i18n-runtime.d.ts';

  const include = ['**/*.{tsx,jsx}'];
  const exclude = ['**/node_modules/**', '**/dist/**'];

  const serializable: SerializableRuntimeConfig = {
    defaultLocale,
    initialModules,
    dynamicTranslate,
    $tConfigVersion: JSON.stringify(dynamicTranslate ?? {}),
  };

  function resolveLocaleIndexPath(root: string): string {
    return path.resolve(root, localesDir, 'index.ts');
  }

  return {
    name: 'vite-plugin-i18n-auto-runtime',

    resolveId(id) {
      if (id === RUNTIME_ID) return RESOLVED_RUNTIME;
      if (id === LOCALE_INDEX_VIRTUAL) {
        const abs = resolveLocaleIndexPath(process.cwd());
        if (fs.existsSync(abs)) return abs;
        return RESOLVED_LOCALE_STUB;
      }
    },

    load(id) {
      if (id === RESOLVED_RUNTIME) {
        return createVirtualModuleSource(serializable);
      }
      if (id === RESOLVED_LOCALE_STUB) {
        return LOCALE_INDEX_STUB;
      }
    },

    transform(code, id) {
      if (id.includes('\0')) return null;
      const cleanId = id.split('?')[0];
      const ext = path.extname(cleanId);
      if (!['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts'].includes(ext)) return null;
      const cwd = process.cwd();
      const rel = toPosixRel(cwd, id);
      if (!rel || !shouldProcessFile(rel, include, exclude)) return null;

      let out = code;
      let changed = false;

      if (autoImport && needsI18nInject(code)) {
        if (!code.includes(RUNTIME_ID)) {
          const modName = moduleMapping(path.normalize(id));
          const inject = `import { t, $t, preloadI18nModule } from "${RUNTIME_ID}";\nvoid preloadI18nModule(${JSON.stringify(
            modName
          )});\n`;
          out = inject + out;
          changed = true;
        }
      }

      if (injectProvider && id.replace(/\\/g, '/').endsWith(entryFile.replace(/\\/g, '/'))) {
        if (!out.includes('I18nProvider')) {
          const wrapped = injectReactProvider(out);
          if (wrapped !== out) {
            out = wrapped;
            changed = true;
          }
        }
      }

      if (changed) return { code: out, map: null };
      return null;
    },

    async writeBundle() {
      const out = path.resolve(process.cwd(), typesOutput);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, VIRTUAL_RUNTIME_TYPES, 'utf8');
    },
  };
}

/** 在 createRoot(...).render(<App />) 外包一层 I18nProvider */
function injectReactProvider(code: string): string {
  const importLine = `import { I18nProvider } from "virtual:i18n-runtime";\n`;
  const createRootRe = /(\bcreateRoot\s*\([^)]+\)\s*\.\s*render\s*\(\s*)((?:<[^>]+>[\s\S]*<\/\w+>\s*)|(?:<[\s\S]+?\/?>\s*))(\)\s*\)?)/m;

  const m = code.match(createRootRe);
  if (!m) return code;

  let next = code;
  if (!next.includes(RUNTIME_ID)) {
    next = importLine + next;
  }
  return next.replace(createRootRe, (_all, before, inner, after) => {
    return `${before}<I18nProvider>${inner}</I18nProvider>${after}`;
  });
}
