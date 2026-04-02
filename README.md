# vite-plugin-i18n-auto

面向 **Vite + React** 的国际化工具：构建阶段从源码中提取中文、生成分模块语言 JSON；运行时在虚拟模块中提供 **`t`（读语言包）** 与 **`$t`（远端翻译）**，并支持按需预加载模块。

当前为早期版本，能力以仓库内实现为准；构建期 **AI 自动翻译 `translate: 'ai'`** 仍在规划中。

## 仓库结构

| 路径 | 说明 |
|------|------|
| `packages/core` | AST 提取、写盘、`index.ts` 生成、索引解析工具 |
| `packages/vite-plugin-i18n-auto` | **`@vite-plugin-i18n-auto/overall`**：推荐安装，一次配置同时启用 extract + runtime |
| `packages/extract` | `@vite-plugin-i18n-auto/extract` — 可单独使用 |
| `packages/runtime` | `@vite-plugin-i18n-auto/runtime` — 可单独使用 |
| `examples/react-basic` | 最小可运行示例 |

## 环境要求

- Node.js **>= 18**
- **Vite** 4 / 5 / 6
- **React 18+**（使用 runtime 时）

## 安装

推荐使用聚合包（单依赖）：

```bash
pnpm add -D @vite-plugin-i18n-auto/overall
```

仅需子包时：

```bash
pnpm add -D @vite-plugin-i18n-auto/extract @vite-plugin-i18n-auto/runtime
```

本 monorepo 内示例通过 `workspace:*` 依赖 **`@vite-plugin-i18n-auto/overall`**（见 `examples/react-basic/package.json`）。

## 在 Vite 中使用（推荐：`@vite-plugin-i18n-auto/overall`）

聚合函数 **`i18nAuto(options)`** 返回 **`[extractPlugin, runtimePlugin]`**，展开到 `flatten` 的 `plugins` 即可，无需手写顺序：

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import i18nAuto from '@vite-plugin-i18n-auto/overall';

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
```

- **`localesDir`**：同时作为 extract 的 **`outputDir`** 与 runtime 的 **`localesDir`**，避免两处填不同路径。
- **`extract`** / **`runtime`**：可选的局部覆盖对象，结构与各自子包选项一致（合并后 **runtime 的 `localesDir` 仍会强制与 extract 的 `outputDir` 一致**）。

TypeScript 可使用 **`defineI18nAutoConfig`** 获得提示（无运行时逻辑）：

```ts
import i18nAuto, { defineI18nAutoConfig } from '@vite-plugin-i18n-auto/overall';

const i18nOptions = defineI18nAutoConfig({
  localesDir: 'src/locales',
  defaultLocale: 'zh-CN',
});
```

## 分拆使用两个子包（可选）

**`extract` 必须使用 `enforce: 'pre'`（包内已设置）**，并放在 **`runtime` 之前**：`react()` → `i18nExtract` → `i18nRuntime`。

```ts
import i18nExtract from '@vite-plugin-i18n-auto/extract';
import i18nRuntime from '@vite-plugin-i18n-auto/runtime';

export default defineConfig({
  plugins: [
    react(),
    i18nExtract({
      outputDir: 'src/locales',
      defaultLocale: 'zh-CN',
      targetLocales: ['en-US'],
      translate: 'manual',
      replaceInSource: true,
    }),
    i18nRuntime({
      localesDir: 'src/locales',
      defaultLocale: 'zh-CN',
      initialModules: ['common'],
      injectProvider: false,
    }),
  ],
});
```

## 根组件包裹 `I18nProvider`

`injectProvider: true` 时尝试自动包裹入口 `render`；**`StrictMode` 等嵌套 JSX 时容易匹配失败**，建议在 `main.tsx` **手写** `I18nProvider`（见 `examples/react-basic/src/main.tsx`）。

## 业务代码约定

- 可直接写 **中文**；`replaceInSource: true` 时构建管线内会替换为 `t('key')`，磁盘源码可仍为中文。
- **`t('key', { name })`**：语言包 + 占位符 `{name}`。
- **`$t(字符串)`**：走 **`dynamicTranslate`** 配置的 HTTP，不读 JSON。

含中文或 `t` / `$t` 的 `.tsx` / `.jsx` 会自动注入 `virtual:i18n-runtime` 与 **`preloadI18nModule(模块名)`**；**`moduleMapping` 在 extract 与 runtime 侧须一致**（聚合包下只配一次即可）。

## 语言包目录

```text
src/locales/
  index.ts
  common/
    zh-CN.json
    en-US.json
```

- **`translate`**：`false` 仅默认语言；`'manual'` 生成目标语言占位；**`'ai'` 未实现**。
- 再次构建会 **合并** JSON：目标语言已有非空译文不会被空串覆盖。

## 聚合包选项说明（`i18nAuto`）

共享字段会分别传给 extract / runtime（`localesDir` 已对齐）。完整类型可从包内导入：

`I18nAutoOptions`、`TranslateMode`、`I18nExtractOptions`、`I18nRuntimeOptions`、`DynamicTranslateConfig` 等。

与子包文档一致的摘录：

| 常用字段 | 含义 |
|----------|------|
| `localesDir` | 语言根目录（= extract `outputDir` + runtime `localesDir`） |
| `include` / `exclude` | extract glob |
| `defaultLocale` / `targetLocales` | 语言列表（extract） |
| `moduleMapping` | 文件路径到模块名 |
| `replaceInSource` / `translate` / `skipCallNames` | extract |
| `initialModules` / `dynamicTranslate` / `autoImport` / `injectProvider` / `entryFile` / `typesOutput` | runtime |
| `extract` / `runtime` | 对单侧选项的 `Partial` 覆盖 |

## 类型与虚拟模块

```ts
import { t, $t, I18nProvider, useI18n } from 'virtual:i18n-runtime';
```

构建结束会写入 **`typesOutput`**（默认 `src/types/i18n-runtime.d.ts`），请在 `tsconfig.json` 的 `include` 中覆盖该路径。

## 本地开发与构建

```bash
pnpm install
pnpm build
```

仅构建库包（含聚合包）：

```bash
pnpm --filter "@vite-plugin-i18n-auto/*" run build
```

运行示例：

```bash
cd examples/react-basic
pnpm dev
```

## 说明与限制

- 首版面向 **React + JSX/TSX**。
- **`$t` 的 `type: 'ai'`** 仅为类型预留，当前以 **`custom` + `url`** 为主。
- **自动 `injectProvider`** 不保证覆盖所有入口写法。

## 许可证

MIT（发布前请在仓库根目录补充 `LICENSE` 文件。）
