import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { extractFromSource, hasChinese } from '@vite-plugin-i18n-auto/core';
import { createVirtualModuleSource } from './create-virtual-module';
import { LOCALE_INDEX_STUB } from './locale-index-stub';
import { shouldProcessFile, toPosixRel } from './vite-filter';
import type { I18nRuntimeOptions, SerializableRuntimeConfig } from './types';

const RUNTIME_ID = 'virtual:i18n-runtime';
const RESOLVED_RUNTIME = '\0' + RUNTIME_ID;
const LOCALE_INDEX_VIRTUAL = 'virtual:i18n-locale-index';
const RESOLVED_LOCALE_STUB = '\0' + LOCALE_INDEX_VIRTUAL + '-stub';

function needsI18nInject(code: string): boolean {
  return (
    hasChinese(code) ||
    /(?<!\$)\bt\s*\(/.test(code) ||
    /\b__tr\s*\(/.test(code) ||
    /(?<!\$)\$t\s*\(/.test(code) ||
    /\buse\$t\s*\(/.test(code) ||
    /\$\$t\s*\(/.test(code)
  );
}

/** 按需列出 virtual 导入符号；仅 __tr/t/$t 需要 preload */
function collectVirtualImportNeeds(code: string): { names: string[]; needsPreload: boolean } {
  const names: string[] = [];
  let needsPreload = false;
  if (/\b__tr\s*\(/.test(code)) {
    names.push('__tr');
    needsPreload = true;
  }
  if (/(?<!\$)\bt\s*\(/.test(code)) {
    names.push('t');
    needsPreload = true;
  }
  if (/(?<!\$)\$t\s*\(/.test(code) || /\buse\$t\s*\(/.test(code)) {
    names.push('$t');
    needsPreload = true;
  }
  if (/\$\$t\s*\(/.test(code)) {
    names.push('$$t');
  }
  if (needsPreload) {
    names.push('preloadI18nModule');
  }
  return { names, needsPreload };
}

/**
 * 匹配 value import（Specifier 仅一对花括号，避免 [\s\S]*? 从 HMR 的 import { 错误匹配到本模块）。
 * 路径含 virtual:i18n-runtime 即可（含 Vite 解析后的 /@id/__x00__virtual:i18n-runtime）。
 */
const VIRTUAL_VALUE_IMPORT_RE =
  /import\s*\{([^}]*)\}\s*from\s*(["'])([^"']*virtual:i18n-runtime[^"']*)\2\s*;?\s*/;

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseImportSpecNames(inner: string): string[] {
  return inner
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.split(/\s+as\s+/)[0].trim());
}

/**
 * 已有 virtual 模块导入时补齐 __tr / t / $t / $$t / preloadI18nModule（避免仅含 useI18n 时漏掉 __tr）
 */
function ensureVirtualRuntimeBindings(code: string, modName: string): { code: string; changed: boolean } {
  let changed = false;
  const { names: required, needsPreload } = collectVirtualImportNeeds(code);
  if (required.length === 0) return { code, changed };

  const need = new Set(required);

  const m = code.match(VIRTUAL_VALUE_IMPORT_RE);
  if (!m) return { code, changed };

  const quote = m[2];
  const path = m[3];
  const fromSpec = `${quote}${path}${quote}`;
  const existing = parseImportSpecNames(m[1]);
  const merged = [...existing];
  for (const n of need) {
    if (!existing.includes(n)) {
      merged.push(n);
      changed = true;
    }
  }
  let next = code;
  if (changed) {
    // 必须用回调：字符串型 replacement 会把 $$ 当成转义成一个 $
    next = next.replace(VIRTUAL_VALUE_IMPORT_RE, () => `import { ${merged.join(', ')} } from ${fromSpec};\n`);
  }

  if (needsPreload && need.has('preloadI18nModule') && !/\bpreloadI18nModule\s*\(/.test(next)) {
    const inj = `void preloadI18nModule(${JSON.stringify(modName)});\n`;
    next = next.replace(
      new RegExp(
        `(import\\s*\\{[^}]*\\}\\s*from\\s*${escapeForRegex(fromSpec)}\\s*;\\s*)`
      ),
      `$1${inj}`
    );
    changed = true;
  }

  return { code: next, changed };
}

const VIRTUAL_RUNTIME_TYPES = `declare module "${RUNTIME_ID}" {
  import type * as React from "react";
  export type Locale = string;
  export type ModuleName = string;
  export function t(key: string, params?: Record<string, string | number>): string;
  /**
   * 仅由插件注入，按默认语言原文取译文；请勿在业务代码中手写或 import。
   */
  export function __tr(text: string, params?: Record<string, string | number>): string;
  export function $$t(text: string): string;
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
  const typesOutput = userOptions.typesOutput ?? '';
  const inlineChineseToT = userOptions.inlineChineseToT ?? true;
  const skipCallNames = userOptions.skipCallNames;

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
    enforce: 'pre',

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

      if (inlineChineseToT && hasChinese(code)) {
        // 与 extract 插件相同，保证 key 与语言包一致
        const normId = path.normalize(id);
        const keyRegistry = {};
        const { code: replaced, modified } = extractFromSource(code, {
          keyRegistry,
          filePath: normId,
          moduleName: moduleMapping(normId),
          defaultLocale,
          replaceInSource: true,
          translateCallee: '__tr',
          skipCallNames,
        });
        if (modified) {
          out = replaced;
          changed = true;
        }
      }

      if (autoImport && needsI18nInject(out)) {
        const modName = moduleMapping(path.normalize(cleanId));
        if (!out.includes(RUNTIME_ID)) {
          const { names, needsPreload } = collectVirtualImportNeeds(out);
          if (names.length > 0) {
            let inject = `import { ${names.join(', ')} } from "${RUNTIME_ID}";\n`;
            if (needsPreload) {
              inject += `void preloadI18nModule(${JSON.stringify(modName)});\n`;
            }
            out = inject + out;
            changed = true;
          }
        } else {
          const merged = ensureVirtualRuntimeBindings(out, modName);
          if (merged.changed) {
            out = merged.code;
            changed = true;
          }
        }
      }

      if (injectProvider && cleanId.replace(/\\/g, '/').endsWith(entryFile.replace(/\\/g, '/'))) {
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
      if (!typesOutput || !String(typesOutput).trim()) return;
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
