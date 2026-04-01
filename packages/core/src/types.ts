export type TranslateMode = false | 'manual' | 'ai';

export interface ExtractCodeOptions {
  /** 用于稳定 key 去重的 registry，通常每轮 build 一个对象 */
  keyRegistry: object;
  /** 当前文件绝对路径或 id */
  filePath: string;
  /** 归属语言模块名 */
  moduleName: string;
  /** 默认语言代码 */
  defaultLocale: string;
  /** 是否改写 AST 为 t('key') */
  replaceInSource: boolean;
  /** 静态通道 callee：处于这些调用内的字面量不提取 */
  skipCallNames?: string[];
}

export interface ExtractCodeResult {
  /** 本文件为 defaultLocale 贡献的 key -> 原文 */
  messages: Record<string, string>;
  /** 替换后的完整源码；未改写则与输入相同 */
  code: string;
  /** 是否发生过替换 */
  modified: boolean;
}
