import { useI18n, $$t } from 'virtual:i18n-runtime';
import type { Locale } from './locales/index';

function App() {
  const { locale, setLocale } = useI18n();

  const switchLocale = async (next: Locale) => {
    if (next !== locale) await setLocale(next);
  };

  console.log(locale);

  return (
    <div style={{ padding: 16, maxWidth: 560, margin: '0 auto' }}>
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: '1px solid #e5e5e5',
        }}
      >
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
          >简体中文</button>
          <button
            type="button"
            onClick={() => void switchLocale('en-US')}
            disabled={locale === 'en-US'}
            style={{
              padding: '6px 12px',
              cursor: locale === 'en-US' ? 'default' : 'pointer',
              opacity: locale === 'en-US' ? 0.55 : 1,
            }}
          >English</button>
        </div>
      </header>
      <h1>你好，示例</h1>
      <p>这是中文界面</p>

      <section style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #e5e5e5' }}>
        <h2 style={{ fontSize: 16, margin: '0 0 12px', fontWeight: 600 }}>
          测试：写在 JSX 属性里的中文
        </h2>
        <p style={{ margin: '0 0 12px', color: '#555', fontSize: 14, lineHeight: 1.5 }}>
          下面包含写在 title、placeholder、aria-label 等属性里的中文；切换 English 后应与正文一起参与翻译。
        </p>
        <p style={{ marginBottom: 12 }}>
          <abbr title="应用程序编程接口">API</abbr>
          <span style={{ marginLeft: 8 }} title="悬停查看这条原生 title">
            悬停这条文字
          </span>
        </p>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 320, fontSize: 14 }}>
          搜索框标签
          <input
            type="search"
            placeholder="请输入关键词"
            aria-label="搜索输入框"
            style={{ padding: '8px 10px', fontSize: 14, border: '1px solid #ccc', borderRadius: 4 }}
          />
        </label>
      </section>

      {/* $$t：不参与提取与翻译；切换 en-US 后上面段落会变英文，本行仍显示原文 */}
      <p style={{ marginTop: 16, color: '#888', fontSize: 14 }}>
        {$$t('此句不进入语言包，任何语言下都显示这一句')}
      </p>
    </div>
  );
}

export default App;
