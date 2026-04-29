import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';

import { AppProviders } from './src/app/AppProviders';
import { RootNavigator } from './src/app/navigation';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <AppProviders>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <RootNavigator />
    </AppProviders>
  );
}

export default App;
