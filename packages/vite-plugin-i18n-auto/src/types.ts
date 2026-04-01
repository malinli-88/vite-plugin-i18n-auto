import type { TranslateMode } from '@vite-plugin-i18n-auto/core';
import type { I18nExtractOptions } from '@vite-plugin-i18n-auto/extract';
import type { I18nRuntimeOptions } from '@vite-plugin-i18n-auto/runtime';

/**
 * 单包统一配置：共享字段会同时作用于 extract 与 runtime。
 * - `localesDir` 等价于 extract.outputDir 与 runtime.localesDir
 * - `extract` / `runtime` 用于少量侧별覆盖（避免两边写两份相同配置）
 */
export interface I18nAutoOptions {
  /** 语言包根目录，同时作为 extract.outputDir 与 runtime.localesDir，默认 src/locales */
  localesDir?: string;
  include?: I18nExtractOptions['include'];
  exclude?: I18nExtractOptions['exclude'];
  defaultLocale?: string;
  targetLocales?: string[];
  moduleMapping?: I18nExtractOptions['moduleMapping'];
  replaceInSource?: boolean;
  translate?: TranslateMode;
  skipCallNames?: I18nExtractOptions['skipCallNames'];

  initialModules?: I18nRuntimeOptions['initialModules'];
  /** 与 I18nRuntimeOptions.dynamicTranslate 一致 */
  dynamicTranslate?: I18nRuntimeOptions['dynamicTranslate'];
  autoImport?: I18nRuntimeOptions['autoImport'];
  injectProvider?: I18nRuntimeOptions['injectProvider'];
  entryFile?: I18nRuntimeOptions['entryFile'];
  typesOutput?: I18nRuntimeOptions['typesOutput'];

  /** 合并进 extract 插件（优先级高于上面的共享字段） */
  extract?: Partial<I18nExtractOptions>;
  /** 合并进 runtime 插件（优先级高于上面的共享字段） */
  runtime?: Partial<I18nRuntimeOptions>;
}

export type { TranslateMode } from '@vite-plugin-i18n-auto/core';
export type { I18nExtractOptions } from '@vite-plugin-i18n-auto/extract';
export type {
  DynamicTranslateConfig,
  DynamicTranslateCustom,
  I18nRuntimeOptions,
} from '@vite-plugin-i18n-auto/runtime';
