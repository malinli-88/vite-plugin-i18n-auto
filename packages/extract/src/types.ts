import type { TranslateMode } from '@vite-plugin-i18n-auto/core';

export interface I18nExtractOptions {
  /** glob，默认包含 tsx/ts/jsx/js */
  include?: string[];
  /** glob */
  exclude?: string[];
  /** 与 runtime 的 localesDir 同一目录 */
  outputDir?: string;
  defaultLocale?: string;
  targetLocales?: string[];
  moduleMapping?: (filePath: string) => string;
  replaceInSource?: boolean;
  translate?: TranslateMode;
  skipCallNames?: string[];
}
