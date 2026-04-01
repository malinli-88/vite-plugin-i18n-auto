/** 是否包含需提取的中文（含常见 CJK 标点范围） */
const CHINESE_RE = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/;

export function hasChinese(text: string): boolean {
  return CHINESE_RE.test(text);
}
