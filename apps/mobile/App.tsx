import React from 'react';
import { StatusBar } from 'react-native';

import { AppProviders } from './src/app/AppProviders';
import { RootNavigator } from './src/app/navigation';

function App() {
  return (
    <AppProviders>
      <StatusBar hidden />
      <RootNavigator />
    </AppProviders>
  );
}

export default App;
