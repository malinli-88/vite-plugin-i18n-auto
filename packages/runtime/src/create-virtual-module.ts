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
import { loadModule as loadLocaleJson } from "virtual:i18n-locale-index";

const DEFAULT_LOCALE = ${defaultLocaleJson};
const INITIAL_MODULES = ${initialModulesJson};
const DYNAMIC_TRANSLATE = ${dynamicJson};
const T_PROVIDER_VER = ${providerVer};

let currentLocale = DEFAULT_LOCALE;
/** 按语言与模块缓存拉取过的 JSON（不含仅用 Map 记住的默认语言） */
const messagesCache = new Map();
/** 默认语言各模块 JSON，用于建立「原文 -> key」反向表；切语言时不销毁 */
const defaultLocaleByMod = new Map();
let textToKey = Object.create(null);
let currentMessages = Object.create(null);

function cacheKey(locale, mod) {
  return locale + ":" + mod;
}

function rebuildTextToKeyFromMods() {
  textToKey = Object.create(null);
  for (const row of defaultLocaleByMod.values()) {
    for (const k of Object.keys(row)) {
      const v = row[k];
      if (typeof v === "string" && v) textToKey[v] = k;
    }
  }
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

const I18nCtx = React.createContext(null);

/** 按 key 取当前语言（手写 key 时用） */
export function t(key, params) {
  const raw = currentMessages[key] ?? key;
  return interpolate(raw, params);
}

/** 按原文从 textToKey / currentMessages 解析译文（$tr / useTranslate 回调共用，无 Hook） */
function resolveTrText(text, params) {
  const key = textToKey[text];
  const raw = key != null ? (currentMessages[key] !== undefined ? currentMessages[key] : text) : text;
  return interpolate(raw, params);
}

/**
 * 静态按原文取译文，只读模块表，无 useContext；插件默认注入，也可在任意作用域手写。
 * 同一原文对应多 key 时最后一次写入反向表者生效。
 */
export function $tr(text, params) {
  return resolveTrText(text, params);
}

/**
 * 仅可在组件或自定义 Hook 内调用；返回的函数按原文取译文并订阅 I18nCtx，切语言时触发重渲染。
 * 用法：const tr = useTranslate(); tr('中文')。勿在模块顶层调用本 Hook；与异步 $t 不同。
 */
export function useTranslate() {
  const ctx = React.useContext(I18nCtx);
  if (ctx) void ctx.locale;
  const localeTag = ctx ? ctx.locale : null;
  return React.useCallback((text, params) => resolveTrText(text, params), [localeTag]);
}

/** 不参与提取与替换，运行时常量原样返回（品牌名、固定展示文案等） */
export function $$t(text) {
  return text;
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

async function ensureDefaultLocaleModule(mod) {
  if (defaultLocaleByMod.has(mod)) return;
  const json = await loadLocaleJson(DEFAULT_LOCALE, mod);
  defaultLocaleByMod.set(mod, json);
  rebuildTextToKeyFromMods();
}

export async function preloadI18nModule(mod) {
  await ensureDefaultLocaleModule(mod);
  if (currentLocale === DEFAULT_LOCALE) {
    const row = defaultLocaleByMod.get(mod);
    if (row) Object.assign(currentMessages, row);
    return;
  }
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
    for (const m of initialModules) {
      await preloadI18nModule(m);
    }
    rerender((x) => x + 1);
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
  return React.createElement(
    I18nCtx.Provider,
    { value },
    ready ? children : null
  );
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
