/**
 * 从 extract 生成的 index.ts 源码中解析 modules、locales（禁止 eval）
 */
export function parseModulesAndLocalesFromIndexTs(source: string): {
  modules: string[];
  locales: string[];
} {
  const modMatch = source.match(/export const modules = (\[[^\]]*\])\s+as\s+const/);
  const locMatch = source.match(/export const locales = (\[[^\]]*\])\s+as\s+const/);
  let modules: string[] = [];
  let locales: string[] = [];
  try {
    if (modMatch) modules = JSON.parse(modMatch[1]) as string[];
  } catch {
    modules = [];
  }
  try {
    if (locMatch) locales = JSON.parse(locMatch[1]) as string[];
  } catch {
    locales = [];
  }
  return { modules, locales };
}
