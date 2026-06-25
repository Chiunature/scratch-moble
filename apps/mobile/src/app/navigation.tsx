import React from 'react';
import { useTranslation } from '@scratch-mobile/i18n';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { EditorScreen } from '../screens/EditorScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ProjectsScreen } from '../screens/ProjectsScreen';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import { RemoteControlScreen } from '../screens/RemoteControlScreen';
import { RuntimeScreen } from '../screens/RuntimeScreen';
import { BleDevicesScreen } from '../screens/BleDevicesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors, fontWeight } from '../theme';

export type RootStackParamList = {
  Home: undefined;
  Projects: undefined;
  Editor: { projectId: string };
  BuildGuide: undefined;
  RemoteControl: undefined;
  AiChat: undefined;
  Runtime: undefined;
  BleDevices: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { t } = useTranslation('navigation');

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontWeight: fontWeight.extraBold },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Projects"
          component={ProjectsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Editor"
          component={EditorScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="BuildGuide"
          component={PlaceholderScreen}
          options={{ title: t('buildGuide') }}
        />
        <Stack.Screen
          name="RemoteControl"
          component={RemoteControlScreen}
          options={{ title: t('remoteControl') }}
        />
        <Stack.Screen
          name="AiChat"
          component={PlaceholderScreen}
          options={{ title: t('aiChat') }}
        />
        <Stack.Screen
          name="Runtime"
          component={RuntimeScreen}
          options={{ title: t('runtimeDemo') }}
        />
        <Stack.Screen
          name="BleDevices"
          component={BleDevicesScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
