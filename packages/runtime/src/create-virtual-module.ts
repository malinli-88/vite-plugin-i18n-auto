import type { SerializableRuntimeConfig } from './types';

/**
 * 生成注入到 Vite 的虚拟模块源码（由用户项目的 Vite 编译，可使用 import react）
 */
export function createVirtualModuleSource(config: SerializableRuntimeConfig): string {
  const initialModulesJson = JSON.stringify(config.initialModules);
  const defaultLocaleJson = JSON.stringify(config.defaultLocale);
  const dynamicJson = JSON.stringify(config.dynamicTranslate ?? null);
  const providerVer = JSON.stringify(config.$tConfigVersion ?? '0');

  return `import * as React from "react";
import { loadModule as loadLocaleJson, locales as registeredLocales, modules as registeredModules } from "virtual:i18n-locale-index";

const DEFAULT_LOCALE = ${defaultLocaleJson};
const INITIAL_MODULES = ${initialModulesJson};
const DYNAMIC_TRANSLATE = ${dynamicJson};
const T_PROVIDER_VER = ${providerVer};

let currentLocale = DEFAULT_LOCALE;
const messagesCache = new Map();
let currentMessages = Object.create(null);

function cacheKey(locale, mod) {
  return locale + ":" + mod;
}

function interpolate(template, params) {
  if (!params) return template;
  let s = template;
  for (const name of Object.keys(params)) {
    const val = params[name];
    const ph = "{" + name + "}";
    const rep = val != null ? String(val) : ph;
    s = s.split(ph).join(rep);
  }
  return s;
}

export function t(key, params) {
  const raw = currentMessages[key] ?? key;
  return interpolate(raw, params);
}

const $tMem = new Map();

export async function $t(text) {
  if (!text) return text;
  const from = DEFAULT_LOCALE;
  const to = currentLocale;
  if (from === to) return text;
  const ck = T_PROVIDER_VER + "|" + from + "|" + to + "|" + text;
  if ($tMem.has(ck)) {
    const _hit = $tMem.get(ck);
    return _hit !== undefined ? _hit : text;
  }
  let out = text;
  if (DYNAMIC_TRANSLATE && DYNAMIC_TRANSLATE.type === "custom" && DYNAMIC_TRANSLATE.url) {
    const res = await fetch(DYNAMIC_TRANSLATE.url, {
      method: DYNAMIC_TRANSLATE.method ?? "POST",
      headers: {
        "Content-Type": "application/json",
        ...(DYNAMIC_TRANSLATE.headers ?? {}),
      },
      body: JSON.stringify({
        text,
        from,
        to,
      }),
    });
    const data = await res.json().catch(() => ({}));
    out = typeof data.translated === "string" ? data.translated : String(data.text ?? text);
  }
  $tMem.set(ck, out);
  return out;
}

export function use$t(text) {
  const [s, setS] = React.useState(text);
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void $t(text).then((r) => {
      if (!cancelled) {
        setS(r);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [text, currentLocale]);
  return { text: s, loading };
}

export async function preloadI18nModule(mod) {
  const k = cacheKey(currentLocale, mod);
  if (!messagesCache.has(k)) {
    const json = await loadLocaleJson(currentLocale, mod);
    messagesCache.set(k, json);
  }
  const row = messagesCache.get(k);
  if (row) Object.assign(currentMessages, row);
}

export function getLocale() {
  return currentLocale;
}

export function setLocale(locale) {
  if (locale === currentLocale) return;
  currentLocale = locale;
  messagesCache.clear();
  currentMessages = Object.create(null);
}

export async function loadModule(mod) {
  await preloadI18nModule(mod);
}

export async function loadModules(mods) {
  for (const m of mods) {
    await preloadI18nModule(m);
  }
}

const I18nCtx = React.createContext(null);

export function I18nProvider({
  children,
  initialModules = INITIAL_MODULES,
}) {
  const [ready, setReady] = React.useState(false);
  const [, rerender] = React.useState(0);
  React.useEffect(() => {
    let alive = true;
    void (async () => {
      for (const m of initialModules) {
        await preloadI18nModule(m);
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);
  const setLocaleWrap = React.useCallback(async (locale) => {
    setLocale(locale);
    rerender((x) => x + 1);
    for (const m of initialModules) {
      await preloadI18nModule(m);
    }
  }, [initialModules]);
  const value = React.useMemo(
    () => ({
      locale: currentLocale,
      t,
      setLocale: setLocaleWrap,
      loadModule,
      preloadI18nModule,
      ready,
    }),
    [ready, currentLocale, setLocaleWrap]
  );
  return React.createElement(I18nCtx.Provider, { value }, children);
}

export function useI18n() {
  const ctx = React.useContext(I18nCtx);
  if (!ctx) {
    throw new Error("useI18n 必须在 I18nProvider 内使用");
  }
  return ctx;
}
`;
}
