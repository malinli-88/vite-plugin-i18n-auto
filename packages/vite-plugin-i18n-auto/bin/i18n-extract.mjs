#!/usr/bin/env node
/**
 * 将 CLI 子进程转发到 @vite-plugin-i18n-auto/extract（避免 dynamic import 时 dist/cli.js 首行 shebang 语法错误）。
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const req = createRequire(import.meta.url);
const cliEntry = req.resolve('@vite-plugin-i18n-auto/extract/cli');
const r = spawnSync(process.execPath, [cliEntry, ...process.argv.slice(2)], {
  stdio: 'inherit',
});
process.exit(r.status ?? 1);
