declare module "virtual:i18n-runtime" {
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
