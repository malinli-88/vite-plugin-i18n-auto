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
  /** 是否对命中文件注入 import + preload */
  autoImport?: boolean;
  /** 是否包裹 I18nProvider */
  injectProvider?: boolean;
  /** 入口文件路径片段，用于匹配 id */
  entryFile?: string;
  /** 写入 virtual 模块类型声明 */
  typesOutput?: string;
}

export interface SerializableRuntimeConfig {
  defaultLocale: string;
  initialModules: string[];
  dynamicTranslate: DynamicTranslateConfig | null;
  $tConfigVersion: string;
}
