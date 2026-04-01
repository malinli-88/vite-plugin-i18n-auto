import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import i18nAuto from 'vite-plugin-i18n-auto';

export default defineConfig({
  plugins: [
    react(),
    ...i18nAuto({
      localesDir: 'src/locales',
      include: ['src/**/*.{tsx,ts,jsx,js}'],
      defaultLocale: 'zh-CN',
      targetLocales: ['en-US'],
      translate: 'manual',
      replaceInSource: true,
      initialModules: ['common'],
      entryFile: 'src/main.tsx',
      injectProvider: false,
    }),
  ],
});
