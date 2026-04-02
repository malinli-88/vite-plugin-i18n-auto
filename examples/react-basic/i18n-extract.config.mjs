/**
 * 与 vite.config.ts 里 i18nAuto 共享同一套提取配置，供 pnpm run extract:auto-i18n 使用。
 */
export default {
  outputDir: 'src/locales',
  include: ['src/**/*.{tsx,ts,jsx,js}'],
  defaultLocale: 'zh-CN',
  targetLocales: ['en-US'],
  translate: 'manual',
};
