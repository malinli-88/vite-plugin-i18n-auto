/** extract 尚未生成 index 时的占位（纯 JS，供 Vite 直接解析） */
export const LOCALE_INDEX_STUB = `export const modules = [];
export const locales = ["zh-CN"];
export async function loadModule() {
  return {};
}
`;
