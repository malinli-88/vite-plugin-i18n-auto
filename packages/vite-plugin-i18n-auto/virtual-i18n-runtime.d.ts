/**
 * 虚拟模块类型：在应用 src/vite-env.d.ts（或任意参与编译的 d.ts）中加一行
 * /// <reference types="@vite-plugin-i18n-auto/overall/virtual-i18n-runtime" />
 * 与应用内 vite-env.d.ts 中的 vite/client 并列即可，无需再维护生成的 src/types/i18n-runtime.d.ts。
 */
declare module "virtual:i18n-runtime" {
  import type * as React from "react";
  export type Locale = string;
  export type ModuleName = string;
  export function t(key: string, params?: Record<string, string | number>): string;
  /** 仅插件注入，请勿在业务中手写 */
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
