import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';

import { I18nextProvider, initI18n, i18n } from '@scratch-mobile/i18n';

import { AppProviders } from './src/app/AppProviders';
import { RootNavigator } from './src/app/navigation';
import { loadSavedLocale } from './src/services/i18n/localeStorage';

function App() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const savedLocale = await loadSavedLocale();
      await initI18n(savedLocale ?? 'zh-CN');
      setI18nReady(true);
    })();
  }, []);

  if (!i18nReady) {
    return null;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <AppProviders>
        <StatusBar hidden />
        <RootNavigator />
      </AppProviders>
    </I18nextProvider>
  );
}

export default App;
