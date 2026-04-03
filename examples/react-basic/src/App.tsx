import { useState } from 'react';
import {
  useI18n,
  $$t,
  t,
  $t,
  use$t,
  useTranslate,
  $tr,
} from 'virtual:i18n-runtime';
import type { Locale } from './locales/index';

/** use$t 须在组件内使用 */
function AsyncTranslateLine() {
  const { text, loading } = use$t('Async $t demo text');
  return (
    <span style={{ color: loading ? '#999' : 'inherit' }}>
      {loading ? t('demo_async_loading') : text}
    </span>
  );
}

const title = () => {
  return $tr('你好，示例')
};

function App() {
  const { locale, setLocale, t: tFromCtx } = useI18n();
  const tr = useTranslate();
  const [asyncTResult, setAsyncTResult] = useState<string | null>(null);

  const switchLocale = async (next: Locale) => {
    if (next !== locale) await setLocale(next);
  };

  return (
    <div style={{ padding: 16, maxWidth: 640, margin: '0 auto' }}>
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: '1px solid #e5e5e5',
        }}
      >
        {/* 1a 直接中文：JSX 子文本，构建期自动接入语言包 */}
        <span style={{ color: '#666', fontSize: 14 }}>当前语言</span>
        <code style={{ fontSize: 14 }}>{locale}</code>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => void switchLocale('zh-CN')}
            disabled={locale === 'zh-CN'}
            style={{
              padding: '6px 12px',
              cursor: locale === 'zh-CN' ? 'default' : 'pointer',
              opacity: locale === 'zh-CN' ? 0.55 : 1,
            }}
          >
            简体中文
          </button>
          <button
            type="button"
            onClick={() => void switchLocale('en-US')}
            disabled={locale === 'en-US'}
            style={{
              padding: '6px 12px',
              cursor: locale === 'en-US' ? 'default' : 'pointer',
              opacity: locale === 'en-US' ? 0.55 : 1,
            }}
          >
            English
          </button>
        </div>
      </header>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, margin: '0 0 12px', color: '#333' }}>
          {t('demo_section_1')}
        </h2>
        {/* 1b JSX 子文本（勿用模块顶层 const 承载可变译文，见前文说明） */}
        <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>{title()}</h1>
        <p style={{ margin: '0 0 12px' }}>这是中文界面</p>
        {/* 2 useTranslate()：订阅语言上下文，仅组件/自定义 Hook 内使用 */}
        <p style={{ fontSize: 13, color: '#666', margin: '0 0 12px' }}>
          <span style={{ color: '#a66' }}>useTranslate：</span>
          {tr('这是中文界面')}
        </p>
        <p style={{ margin: '0 0 8px', fontSize: 13, color: '#555' }}>
          {t('demo_line_1c')}
        </p>
        <p style={{ marginBottom: 8 }}>
          <abbr title="应用程序编程接口">API</abbr>
          <span style={{ marginLeft: 8 }} title="悬停查看这条原生 title">
            悬停这条文字
          </span>
        </p>
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            maxWidth: 320,
            fontSize: 14,
          }}
        >
          搜索框标签
          <input
            type="search"
            placeholder="请输入关键词"
            aria-label="搜索输入框"
            style={{
              padding: '8px 10px',
              fontSize: 14,
              border: '1px solid #ccc',
              borderRadius: 4,
            }}
          />
        </label>
      </section>

      <section style={{ marginBottom: 24, paddingTop: 16, borderTop: '1px solid #eee' }}>
        <h2 style={{ fontSize: 15, margin: '0 0 12px', color: '#333' }}>
          {t('demo_section_3')}
        </h2>
        <p style={{ margin: '0 0 8px', fontSize: 14 }}>
          <span style={{ color: '#06c' }}>import {'{'} t {'}'}：</span>
          {t('demo_t_by_key')}
        </p>
        <p style={{ margin: 0, fontSize: 14 }}>
          <span style={{ color: '#06c' }}>useI18n().t：</span>
          {tFromCtx('demo_t_by_key')}
        </p>
      </section>

      <section style={{ marginBottom: 24, paddingTop: 16, borderTop: '1px solid #eee' }}>
        {/* 标题用 t(key)：若在 h2 内混写中文与内联大括号，只会给第一段中文生成 $tr，且 en-US 未补词条时会一直显示中文 */}
        <h2 style={{ fontSize: 15, margin: '0 0 12px', color: '#333' }}>
          {t('demo_section_4')}
        </h2>
        <p
          style={{
            fontSize: 12,
            color: '#666',
            margin: '0 0 8px',
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          t(key, {'{'} count: 3 {'}'})
        </p>
        <p style={{ margin: 0, fontSize: 14 }}>{t('demo_interpolate', { count: 3 })}</p>
      </section>

      <section style={{ marginBottom: 24, paddingTop: 16, borderTop: '1px solid #eee' }}>
        <h2 style={{ fontSize: 15, margin: '0 0 12px', color: '#333' }}>
          {t('demo_section_5')}
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: '#888' }}>
          {$$t('此句不进入语言包，任何语言下都显示这一句')}
        </p>
      </section>

      <section style={{ marginBottom: 24, paddingTop: 16, borderTop: '1px solid #eee' }}>
        <h2 style={{ fontSize: 15, margin: '0 0 12px', color: '#333' }}>
          {t('demo_section_6')}
        </h2>
        <p style={{ margin: '0 0 8px', fontSize: 14 }}>
          <button
            type="button"
            style={{
              padding: '4px 10px',
              fontSize: 13,
              marginRight: 8,
              cursor: 'pointer',
            }}
            onClick={() => {
              void $t('hello from $t').then((s) => setAsyncTResult(s));
            }}
          >
            {t('demo_btn_async_t')}
          </button>
          {asyncTResult != null ? (
            <code style={{ fontSize: 13 }}>结果：{asyncTResult}</code>
          ) : null}
        </p>
        <p style={{ margin: 0, fontSize: 14 }}>
          <span style={{ color: '#680' }}>use$t：</span>
          <AsyncTranslateLine />
        </p>
      </section>
    </div>
  );
}

export default App;
