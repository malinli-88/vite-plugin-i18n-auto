export interface DynamicTranslateCustom {
  type: 'custom';
  url: string;
  method?: string;
  headers?: Record<string, string>;
}

export type DynamicTranslateConfig = DynamicTranslateCustom | { type: 'ai'; url?: string };

export interface I18nRuntimeOptions {
  /** 与 extract.outputDir 一致 */
  localesDir?: string;
  defaultLocale?: string;
  /** Provider 启动时预加载的模块 */
  initialModules?: string[];
  /** 运行时 $t 远端配置（占位：custom 为 fetch JSON） */
  dynamicTranslate?: DynamicTranslateConfig | null;
  moduleMapping?: (filePath: string) => string;
  /**
   * 在 pre transform（早于 React）中将中文改为 t('key')，与 extract 写入语言包的 key 一致；默认 true。
   * 仅在不希望插件改写 AST、准备手写 t() 时设 false。
   */
  inlineChineseToT?: boolean;
  /** 与 extract 一致：处于这些调用内的字面量不做中文提取/替换 */
  skipCallNames?: string[];
  /** 是否对命中文件注入 import + preload */
  autoImport?: boolean;
  /** 是否包裹 I18nProvider */
  injectProvider?: boolean;
  /** 入口文件路径片段，用于匹配 id */
  entryFile?: string;
  /**
   * 构建结束时写入 virtual 模块 .d.ts 的路径；不设则不在工程内生成文件。
   * 使用 @vite-plugin-i18n-auto/overall 时可在 vite-env.d.ts 引用包内类型，见包内 virtual-i18n-runtime.d.ts。
   */
  typesOutput?: string;
}

export interface SerializableRuntimeConfig {
  defaultLocale: string;
  initialModules: string[];
  dynamicTranslate: DynamicTranslateConfig | null;
  $tConfigVersion: string;
}
