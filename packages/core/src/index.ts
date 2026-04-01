export { hasChinese } from './chinese.js';
export { makeStableKey, clearKeyRegistry } from './stable-key.js';
export { extractFromSource } from './babel-extract.js';
export {
  writeLocaleArtifacts,
  generateIndexTsContent,
  type WriteLocalesParams,
} from './locale-writer.js';
export { parseModulesAndLocalesFromIndexTs } from './parse-index.js';
export type { ExtractCodeOptions, ExtractCodeResult, TranslateMode } from './types.js';
