# vite-plugin-i18n-auto

面向 **Vite + React** 的国际化工具：构建阶段从源码中提取中文、生成分模块语言 JSON；运行时在虚拟模块中提供 **`t`（读语言包）**、**`$t`（远端翻译）**、**`$$t`（显式不参与提取/翻译）**。**源码中的中文**由插件在构建期自动接入运行时翻译（**无需**手写「按原文翻译」类 API），并支持按需预加载模块。

当前为早期版本，能力以仓库内实现为准；构建期 **AI 自动翻译 `translate: 'ai'`** 仍在规划中。

## 环境要求

- Node.js **>= 18**
- **Vite** 4 / 5 / 6
- **React 18+**

## 安装

```bash
pnpm add -D @vite-plugin-i18n-auto/overall
```

同时需要 **`@vitejs/plugin-react`**、**`vite`**、**`react`**、**`react-dom`**（版本见示例 `package.json` 量级即可）。


## Vite 配置（与 `examples/react-basic` 一致）

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
      initialModules: ['common'],
      entryFile: 'src/main.tsx',
      injectProvider: false,
    }),
  ],
});
```

- **`localesDir`**：语言包根目录（同时作为构建提取输出目录与运行时读盘目录）。
- **`include`**：参与**提取词条**的 glob（可与 runtime 默认处理的 `tsx`/`jsx` 范围不同：无 JSX 的文件仍可被 extract 扫到）。
- **`injectProvider: false`** 时需在入口**手写** `I18nProvider`（示例做法，避免自动包裹与 `StrictMode` 等布局冲突）。

可选：`extract` / `runtime` 嵌套对象可对单侧做 `Partial` 覆盖；共享字段会同时下发给两侧。

TypeScript 可使用 **`defineI18nAutoConfig`**（无运行时代码）集中写出配置对象再传给 `i18nAuto(...)`。

## 入口：包裹 `I18nProvider`

与示例 `src/main.tsx` 相同：在 `createRoot(...).render` 最外层包一层 `I18nProvider`。**首屏**会在 **`initialModules` 预加载完成前**不渲染子树，避免 `t` 读到空表；切换语言时在拉取新语言 JSON 后再重渲染。

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from 'virtual:i18n-runtime';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <I18nProvider>
    <StrictMode>
      <App />
    </StrictMode>
  </I18nProvider>
);
```

## 业务代码约定（与 `examples/react-basic/src/App.tsx` 一致）

- **直接写中文**：插件在 pre transform 中接入运行时；打包侧仍体现**默认语言原文字面量**，不是手写 `t('i18n_hash')`。切换语言时通过「原文 → key」反向表解析当前语文案（**不**做 DOM 扫描）。
- **`useI18n()`**：取 `locale`、`setLocale` 等；`setLocale` 可与 `./locales/index` 导出的 **`Locale`** 类型一起用于切换语言。
- **`$$t('…')`**：该段文案**不进语言包**、也**不会**被改成自动翻译形式，任何语言下都显示传入字符串（适合固定品牌句等）。可从 `virtual:i18n-runtime` 与 `useI18n` 等一同 import（示例中手写 import `$$t`）。
- **`t('i18n_xxx')`**：仍支持按与语言包一致的 **key** 手写。
- **`$t`**：走 **`dynamicTranslate`** 的远端 HTTP，不读本地 JSON。
- **限制**：不同 key 若默认语言文案完全相同，反向表可能串译；需区分文案或改用 `t('key')`。
- **占位符**：自动接入的中文与 **`t`** 相同，使用 **`params`** 与 JSON 内 **`{name}`** 形式。

含**可提取中文**，或手写 **`t` / `$t` / `$$t` / `use$t`** 的 **`*.tsx` / `*.jsx`**（runtime 默认处理 **`**/*.{tsx,jsx}`**）会按需注入 **`virtual:i18n-runtime`**；在需要读语言包或存在待处理中文时会注入 **`preloadI18nModule(模块名)`**；仅 **`$$t`** 且无其它依赖时一般不注入 preload。**`moduleMapping` 与 extract 一致时只用在顶层配置一次。**

> **插件顺序**：请保持 `react()` 与 **`...i18nAuto(...)`** 同写在 `plugins` 里（常见为 `react` 在前）。两者均为 `pre` 时会按注册顺序串联；实现上已避免误匹配 React HMR 注入的 `import { ... }`。

## 语言包目录（与示例一致）

```text
src/locales/
  index.ts
  common/
    zh-CN.json
    en-US.json
```

- **`translate`**：`false` 仅默认语言；`'manual'` 生成目标语言占位；**`'ai'` 未实现**。
- 再次构建会 **合并** JSON：目标语言已有非空译文不会被空串覆盖。

## 命令行提取写盘（`pnpm run extract:auto-i18n`）

`vite dev` 下语言包**不一定**随时落盘；需要**主动跑一轮与 extract 插件相同的扫描写盘**时，使用包自带的 CLI **`i18n-extract`**（安装 **`@vite-plugin-i18n-auto/overall`** 后即可通过 `pnpm exec` 调用）。

1. 在项目根增加配置文件（字段与 **`I18nExtractOptions`** 一致，建议与 `vite.config` 里 `localesDir` / `include` / 语言列表保持一致），例如 `i18n-extract.config.mjs`：

```js
export default {
  outputDir: 'src/locales',
  include: ['src/**/*.{tsx,ts,jsx,js}'],
  defaultLocale: 'zh-CN',
  targetLocales: ['en-US'],
  translate: 'manual',
};
```

2. 在 **`package.json`** 中增加脚本（名称可自定，下表为推荐命名）：

```json
{
  "scripts": {
    "extract:auto-i18n": "i18n-extract --config i18n-extract.config.mjs"
  }
}
```

3. 执行：

```bash
pnpm run extract:auto-i18n
```

可选参数：`--cwd <项目根>` 指定工作目录。配置须为 **Node 可直接 `import` 的 ESM/CJS**（`.mjs` / `.cjs`），见 `i18n-extract --help`。

程序化调用可使用 **`import { runExtractToDisk } from '@vite-plugin-i18n-auto/extract'`**。

## 常用配置一览

| 字段 | 示例 | 含义 |
|------|------|------|
| `localesDir` | `src/locales` | 语言根目录 |
| `include` | `['src/**/*.{tsx,ts,jsx,js}']` | extract 扫描范围 |
| `defaultLocale` / `targetLocales` | `zh-CN` / `['en-US']` | 语言列表 |
| `translate` | `'manual'` | 目标语言占位模式 |
| `initialModules` | `['common']` | Provider 预载模块 |
| `entryFile` | `src/main.tsx` | 自动包 `I18nProvider` 时的匹配路径（示例关闭自动包裹） |
| `injectProvider` | `false` | 是否尝试改写入口 render（示例为手写 Provider） |
| `moduleMapping` / `skipCallNames` / `inlineChineseToT` / `dynamicTranslate` / `autoImport` / `typesOutput` / `extract` / `runtime` | — | 进阶用法见包内类型 `I18nAutoOptions` |

## TypeScript 与 `virtual:i18n-runtime`

业务中示例：

```ts
import { useI18n, $$t, I18nProvider } from 'virtual:i18n-runtime';
import type { Locale } from './locales/index';
```

在 `src/vite-env.d.ts`（或已被 `tsconfig` include 的声明文件）中：

```ts
/// <reference types="vite/client" />
/// <reference types="@vite-plugin-i18n-auto/overall/virtual-i18n-runtime" />
```

若希望在构建结束时把 virtual 模块类型**落盘**到工程内，可配置 **`runtime.typesOutput`**（不设则依赖包内三斜线引用即可）。

## 仓库内开发与运行示例

```bash
pnpm install
pnpm build
cd examples/react-basic
pnpm dev
```

库包单独构建：`pnpm --filter "@vite-plugin-i18n-auto/*" run build`。

## 说明与限制

- 首版面向 **React + JSX/TSX**。
- **`$t` 的 `type: 'ai'`** 仅为类型预留，当前以 **`custom` + `url`** 为主。
- **自动 `injectProvider`** 不保证覆盖所有入口写法；生产环境可参考示例手写 `I18nProvider`。

## 许可证

[MIT](https://github.com/malinli-88/vite-plugin-i18n-auto/blob/main/LICENSE) · 源码：[github.com/malinli-88/vite-plugin-i18n-auto](https://github.com/malinli-88/vite-plugin-i18n-auto)
