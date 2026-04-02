/* 由 vite-plugin-i18n-auto extract 生成，请勿手改模块/语言列表结构 */
export const modules = ["common"] as const;
export const locales = ["en-US","zh-CN"] as const;

export type ModuleName = (typeof modules)[number];
export type Locale = (typeof locales)[number];

export async function loadModule(
  locale: Locale,
  module: ModuleName
): Promise<Record<string, string>> {
  const mod = await import(/* @vite-ignore */ `./${module}/${locale}.json`);
  return (mod as { default: Record<string, string> }).default;
}
