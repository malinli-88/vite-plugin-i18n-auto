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
      {/* $$t：不参与提取与翻译；切换 en-US 后上面段落会变英文，本行仍显示原文 */}
      <p style={{ marginTop: 16, color: '#888', fontSize: 14 }}>
        {$$t('此句不进入语言包，任何语言下都显示这一句')}
      </p>
    </div>
  );
}

export default App;
