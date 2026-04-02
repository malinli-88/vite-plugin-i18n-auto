import type { Plugin } from 'vite';
import type { I18nExtractOptions } from '@vite-plugin-i18n-auto/extract';
import i18nExtract from '@vite-plugin-i18n-auto/extract';
import i18nRuntime from '@vite-plugin-i18n-auto/runtime';
import type { I18nRuntimeOptions } from '@vite-plugin-i18n-auto/runtime';
import type { I18nAutoOptions } from './types';

/**
 * 返回需注册到 Vite 的插件数组：[extract, runtime]（顺序已固定，extract 带 enforce:pre）
 * 使用：`plugins: [react(), ...i18nAuto({ ... })]`
 */
export function i18nAuto(userOptions: I18nAutoOptions = {}): Plugin[] {
  const baseExtract: I18nExtractOptions = {
    outputDir:
      userOptions.localesDir ??
      userOptions.extract?.outputDir ??
      userOptions.runtime?.localesDir ??
      'src/locales',
    defaultLocale: userOptions.defaultLocale ?? 'zh-CN',
    targetLocales: userOptions.targetLocales ?? ['en-US'],
    moduleMapping: userOptions.moduleMapping,
    include: userOptions.include,
    exclude: userOptions.exclude,
    translate: userOptions.translate ?? 'manual',
    skipCallNames: userOptions.skipCallNames,
    ...userOptions.extract,
  };

  const extractPlugin = i18nExtract(baseExtract);

  // runtime.localesDir 始终与 extract.outputDir 一致，避免双端配置漂移
  const runtimeOpts: I18nRuntimeOptions = {
    defaultLocale: baseExtract.defaultLocale ?? 'zh-CN',
    moduleMapping: baseExtract.moduleMapping,
    initialModules: userOptions.initialModules ?? ['common'],
    dynamicTranslate: userOptions.dynamicTranslate,
    autoImport: userOptions.autoImport ?? true,
    injectProvider: userOptions.injectProvider ?? false,
    entryFile: userOptions.entryFile ?? 'src/main.tsx',
    typesOutput: userOptions.typesOutput,
    ...userOptions.runtime,
    localesDir: baseExtract.outputDir!,
    inlineChineseToT:
      userOptions.runtime?.inlineChineseToT ?? userOptions.inlineChineseToT ?? true,
    skipCallNames: userOptions.runtime?.skipCallNames ?? userOptions.skipCallNames,
  };

  const runtimePlugin = i18nRuntime(runtimeOpts);

  return [extractPlugin, runtimePlugin];
}

export default i18nAuto;

/** 仅用于 TS 提示，运行时不做转换 */
export function defineI18nAutoConfig(options: I18nAutoOptions): I18nAutoOptions {
  return options;
}

export type {
  DynamicTranslateConfig,
  DynamicTranslateCustom,
  I18nAutoOptions,
  I18nExtractOptions,
  I18nRuntimeOptions,
  TranslateMode,
} from './types';
