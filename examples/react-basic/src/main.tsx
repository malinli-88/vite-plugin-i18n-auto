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
