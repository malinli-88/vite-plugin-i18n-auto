import { createHash } from 'node:crypto';

const usedKeys = new WeakMap<object, Set<string>>();

/**
 * 基于文件路径与原文生成稳定 key，并在一次处理周期内按 registry 去重碰撞。
 */
export function makeStableKey(
  registry: object,
  filePath: string,
  literalText: string
): string {
  const h = createHash('sha256')
    .update(`${filePath}\0${literalText}`, 'utf8')
    .digest('hex')
    .slice(0, 12);
  let base = `i18n_${h}`;
  let set = usedKeys.get(registry);
  if (!set) {
    set = new Set();
    usedKeys.set(registry, set);
  }
  let key = base;
  let n = 0;
  while (set.has(key)) {
    key = `${base}_${++n}`;
  }
  set.add(key);
  return key;
}

/** 新一轮构建开始前清空某 registry（用聚合根对象作为 registry） */
export function clearKeyRegistry(registry: object): void {
  usedKeys.delete(registry);
}
