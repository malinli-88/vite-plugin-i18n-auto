import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { I18nExtractOptions } from './types.js';
import { runExtractToDisk } from './run-extract.js';

function printHelp(): void {
  console.log(`用法: i18n-extract [选项]

从源码聚合中文并写入语言包（与 Vite extract 插件逻辑一致），不启动 dev server。

选项:
  --cwd <路径>          项目根目录，默认当前目录
  --config <文件>       导出 I18nExtractOptions 或与 vite 侧一致的 .mjs/.cjs/.ts（需能直接被 node 运行）
  -h, --help            显示帮助

示例 package.json:
  "scripts": {
    "extract:auto-i18n": "i18n-extract --config i18n-extract.config.mjs"
  }

配置文件示例 i18n-extract.config.mjs:
  export default {
    outputDir: 'src/locales',
    include: ['src/**/*.{tsx,ts,jsx,js}'],
    defaultLocale: 'zh-CN',
    targetLocales: ['en-US'],
    translate: 'manual',
  };
`);
}

async function loadConfig(configPath: string): Promise<I18nExtractOptions> {
  const abs = path.resolve(configPath);
  const mod = await import(pathToFileURL(abs).href);
  const cfg = mod.default ?? mod;
  if (cfg && typeof cfg === 'object') return cfg as I18nExtractOptions;
  return {};
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes('-h') || argv.includes('--help')) {
    printHelp();
    return;
  }

  let cwd = process.cwd();
  let configPath: string | null = null;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--cwd' && argv[i + 1]) {
      cwd = path.resolve(argv[++i]);
    } else if (a === '--config' && argv[i + 1]) {
      configPath = argv[++i];
    }
  }

  const options = configPath ? await loadConfig(path.isAbsolute(configPath) ? configPath : path.join(cwd, configPath)) : {};

  await runExtractToDisk(cwd, options);
  console.log('i18n-extract: 已写入', options.outputDir ?? 'src/locales');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
