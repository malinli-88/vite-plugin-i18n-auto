# vite-plugin-i18n-auto

面向 **Vite + React** 的国际化工具：构建阶段从源码中提取中文、生成分模块语言 JSON；运行时在虚拟模块中提供 **`t`（按 key 读语言包）**、**`$tr`（按原文静态取译文、无 Hook；自动改写的中文即为此调用）**、**`useTranslate()`**（返回随语言上下文更新的 **`tr`** 函数）、**`$t`（异步远端翻译）**、**`$$t`（固定原文、不进语言包）**，以及 **`useI18n`**、**`I18nProvider`** 等。业务里**直接写中文**会接入 **`$tr`**；按需预加载语言模块。

当前为早期版本，能力以仓库内实现为准；构建期 **AI 自动翻译** `translate: 'ai'` 仍在规划中。

## 环境要求

- Node.js **>= 18**
- **Vite** 4 / 5 / 6
- **React 18+**

## 安装

推荐（始终安装 registry 上的最新版）：

```bash
pnpm add -D @vite-plugin-i18n-auto/overall
```

与**当前文档、各包** `package.json` **对齐的已发布版本**（可锁版本、便于复盘与 CI）：

```bash
pnpm add -D @vite-plugin-i18n-auto/overall@0.1.2
```

> 每次在 npm **升版发布后**，请把上一行里的 `0.1.2` 改成新版本号，并同步更新下文「版本与 GitHub Release」中的说明。

同时需要 `@vitejs/plugin-react`、`vite`、`react`、`react-dom`（版本见示例 `package.json` 量级即可）。

### 版本与 GitHub Release

- **当前 npm 对照版本：**`0.1.2`（`@vite-plugin-i18n-auto/core`、`extract`、`runtime`、`overall` 同号发布时一致）。
- 在 [仓库 Releases](https://github.com/malinli-88/vite-plugin-i18n-auto/releases) 页点击 **Create a new release**：**Choose a tag** 新建 `v0.1.2`（与 `package.json` 的 `version` 对应，惯例加前缀 `v`），**Release title** 可写 `v0.1.2`，说明栏粘贴变更摘要即可；首次公开可写一句「首个公开发布，能力见 README」。
- 流程建议：**先本地构建并** `pnpm publish` **成功**，再打同名 tag、发 Release，这样文档、`npm` 与 GitHub 上用户看到的版本一致。

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
    }),
  ],
});
```

- `localesDir`：语言包根目录（同时作为构建提取输出目录与运行时读盘目录）。
- `include`：参与**提取词条**的 glob（可与 runtime 默认处理的 `tsx`/`jsx` 范围不同：无 JSX 的文件仍可被 extract 扫到）。
- 入口侧须**手写** `I18nProvider`，见下文「入口：包裹 `I18nProvider`」。

可选：`extract` / `runtime` 嵌套对象可对单侧做 `Partial` 覆盖；共享字段会同时下发给两侧。

TypeScript 可使用 `defineI18nAutoConfig`（无运行时代码）集中写出配置对象再传给 `i18nAuto(...)`。

## 入口：包裹 `I18nProvider`

请在应用入口（如 `src/main.tsx`）**手动**用 `I18nProvider` 包裹根组件，与示例一致。与 `createRoot(...).render` 的布局（如 `StrictMode`）顺序由你控制。

**首屏**会在 `initialModules` **预加载完成前**不渲染子树，避免 `t` 读到空表；切换语言时在拉取新语言 JSON 后再重渲染。

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

- **直接写中文**：构建期会改成 **`$tr('原文')`**（静态，无 React Hook，顶层/事件里也可执行；**但**模块顶层 `const` 只在 import 时算一次，切语言不会变，见示例注释）。
- **`useTranslate()`**：在组件或自定义 Hook 内调用，得到 **`const tr = useTranslate()`**，再用 **`tr('原文')`**；内部订阅上下文，适合 `memo` 边缘等需强制随语言刷新的场景。**勿**在模块顶层、`onClick`、`useEffect` 等里面调用 **`useTranslate` 本身**。
- **手写 `$tr('原文')`**：与插件注入同源，静态读表；可在任意位置调用。若需随上下文刷新，优先 **`useTranslate()`** 返回的 `tr`。
- **`$t`**：异步远端翻译，**不是**同步的 **`$tr`**，勿混用。
- **`useI18n()`**：取 `locale`、`setLocale` 等；`setLocale` 可与 `./locales/index` 导出的 `Locale` 类型一起用于切换语言。
- **`$$t('…')`**：该段文案**不进语言包**、也不会被改成可切换译文，任何语言下都显示传入字符串（适合品牌名等固定句）。需从 `virtual:i18n-runtime` import（见示例）。
- **`t('i18n_xxx')`**：按与语言包一致的 **key** 手写。
- **`$t`**：**异步**远端 `fetch`，依赖配置里的 `dynamicTranslate`，不读本地 JSON。
- **限制**：不同 key 若默认语言文案完全相同，可能对应到同一句译文；需区分文案或改用 `t('key')`。
- **占位符**：与 `t` 相同，使用 `params` 与 JSON 内 `{name}` 形式。

含可提取中文或手写上述 API 的 `*.tsx` / `*.jsx`，会按需注入 `virtual:i18n-runtime` 与预加载调用；`moduleMapping` 与 extract 一致时只在顶层配置一次即可。

> **插件顺序**：请保持 `react()` 与 `...i18nAuto(...)` 同写在 `plugins` 里（常见为 `react` 在前）。

## 语言包目录（与示例一致）

```text
src/locales/
  index.ts
  common/
    zh-CN.json
    en-US.json
```

- `translate`：`false` 仅默认语言；`'manual'` 生成目标语言占位；`'ai'` **未实现**。
- 再次构建会 **合并** JSON：目标语言已有非空译文不会被空串覆盖。

## 命令行提取写盘（`pnpm run extract:auto-i18n`）

`vite dev` 下语言包**不一定**随时落盘；需要**主动跑一轮与 extract 插件相同的扫描写盘**时，使用包自带的 CLI `i18n-extract`（安装 `@vite-plugin-i18n-auto/overall` 后即可通过 `pnpm exec` 调用）。

1. 在项目根增加配置文件（字段与提取插件选项一致，建议与 `vite.config` 里 `localesDir` / `include` / 语言列表保持一致），例如 `i18n-extract.config.mjs`：

```js
export default {
  outputDir: 'src/locales',
  include: ['src/**/*.{tsx,ts,jsx,js}'],
  defaultLocale: 'zh-CN',
  targetLocales: ['en-US'],
  translate: 'manual',
};
```

2. 在 `package.json` 中增加脚本（名称可自定，下表为推荐命名）：

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

可选参数：`--cwd <项目根>` 指定工作目录。配置须为 **Node 可直接** `import` **的 ESM/CJS**（`.mjs` / `.cjs`），见 `i18n-extract --help`。

程序化调用可使用 `import { runExtractToDisk } from '@vite-plugin-i18n-auto/extract'`。

## 常用配置一览


| 字段                                | 示例                                                                | 含义                                                                                                                                                                                               |
| --------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `localesDir`                      | `src/locales`                                                     | 语言根目录                                                                                                                                                                                            |
| `include`                         | `['src/**/*.{tsx,ts,jsx,js}']`                                    | extract 扫描范围（glob 列表）                                                                                                                                                                            |
| `exclude`                         | `['**/*.spec.tsx', 'src/generated/**']`                           | 从 extract 中排除的 glob；命中者**不参与**词条扫描与语言包写盘；不配则仅按 `include`。                                                                                                                                        |
| `defaultLocale` / `targetLocales` | `zh-CN` / `['en-US']`                                             | 语言列表                                                                                                                                                                                             |
| `translate`                       | `false` / `'manual'` / `'ai'`                                     | `false`：磁盘与 `index.ts` **仅保留默认语言**，不写 `targetLocales` 对应 JSON。`'manual'`：为每个目标语言写/合并 JSON，缺 key 时补**空串占位**，便于人工翻译。`'ai'`：构建期自动填译**尚未实现**；写盘侧当前与 `'manual'` 同属「生成目标语言文件 + 占位」分支，具体以后续实现为准（见文首说明）。 |
| `initialModules`                  | `['common']`                                                      | `I18nProvider` 启动时预加载的语言包模块，首屏依赖的模块需列入。                                                                                                                                                          |
| `moduleMapping`                   | `(normId) => 'common'`                                            | 按源文件路径映射到语言包**模块名**（如 `common`）；用于分目录存放各模块 JSON，并与运行时的语言包预加载一致；聚合配置下只配一次；默认恒为 `'common'`。                         |
| `skipCallNames`                   | `['formatMessage']`                                               | 调用名为列表中任一项的函数时，其**参数里的字符串字面量**不提取、也不被 `inlineChineseToT` 替换（与 extract、runtime 共用同一列表）。                                                                                                           |
| `inlineChineseToT`                | `true`（默认）                                                        | 构建时把源码里的**中文**改写成与语言包 **key** 对齐的运行时调用；设为 `false` 则不改写，适合全部手写 `t('key')` 的场景。                                                                  |
| `dynamicTranslate`                | `{ type: 'custom', url: '/api/t', method: 'POST', headers: { } }` | 配置 `$t` 的远端请求：`custom` 时向 `url` 发请求，可选 `method`、`headers`；`type: 'ai'` 仅为类型占位，行为以 README「说明与限制」为准。传 `null` 或不配则不走该链路。                                                                            |
| `autoImport`                      | `true`（默认）                                                        | 是否在需要的文件中自动注入对 `virtual:i18n-runtime` 的 import 及语言包预加载；设为 `false` 时需自行 import 并保证预载。                                                                                         |
| `typesOutput`                     | `src/types/i18n-runtime.d.ts`                                     | 构建结束时把 `virtual:i18n-runtime` 的 `.d.ts` 写入该路径（相对工程根）；**不设或空串**则不落盘，可仅用三斜线引用 `@vite-plugin-i18n-auto/overall/virtual-i18n-runtime`。                                                               |
| `extract`                         | `{ exclude: ['**/*.spec.ts'] }`                                   | `Partial<I18nExtractOptions>`：只覆盖 **extract 插件**选项，并与顶层共享字段**深度合并**；**同名键以此对象为准**（例如只在这里写 `exclude`、`translate` 等仅构建提取需要细化的项）。                                                                   |
| `runtime`                         | `{ inlineChineseToT: false }`                                     | `Partial<I18nRuntimeOptions>`：只覆盖 **runtime 插件**选项，合并规则同 `extract`。聚合包内 `runtime.localesDir` 仍会强制与 `extract` **的** `outputDir`**（即** `localesDir`**）** 一致，勿拆成两个目录。                               |


（表中未列字段、以及与 `I18nExtractOptions` / `I18nRuntimeOptions` 完全一致的嵌套类型，以包内导出的 `I18nAutoOptions` 为准。）

## TypeScript 与 `virtual:i18n-runtime`

业务中示例：

```ts
import { useI18n, $$t, I18nProvider, useTranslate } from 'virtual:i18n-runtime';
import type { Locale } from './locales/index';
```

在 `src/vite-env.d.ts`（或已被 `tsconfig` include 的声明文件）中：

```ts
/// <reference types="vite/client" />
/// <reference types="@vite-plugin-i18n-auto/overall/virtual-i18n-runtime" />
```

若希望在构建结束时把 virtual 模块类型**落盘**到工程内，可配置 `runtime.typesOutput`（不设则依赖包内三斜线引用即可）。

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
- `$t` **的** `type: 'ai'` 仅为类型预留，当前以 `custom` **+** `url` 为主。

## 许可证

[MIT](https://github.com/malinli-88/vite-plugin-i18n-auto/blob/main/LICENSE) · 源码：[github.com/malinli-88/vite-plugin-i18n-auto](https://github.com/malinli-88/vite-plugin-i18n-auto)