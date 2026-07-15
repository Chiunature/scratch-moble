import React, { Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from '@scratch-mobile/i18n';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { BuildGuideModelId } from '../features/buildGuide/data/bundles';
import { HomeScreen } from '../screens/HomeScreen';
import { ProjectsScreen } from '../screens/ProjectsScreen';
import { AiChatScreen } from '../screens/AiChatScreen';
import { RemoteControlScreen } from '../screens/RemoteControlScreen';
import { RuntimeScreen } from '../screens/RuntimeScreen';
import { BleDevicesScreen } from '../screens/BleDevicesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors, fontWeight } from '../theme';

const EditorScreen = React.lazy(() =>
  import('../screens/EditorScreen').then(module => ({
    default: module.EditorScreen,
  })),
);

const BuildGuidePickerScreen = React.lazy(() =>
  import('../screens/BuildGuidePickerScreen').then(module => ({
    default: module.BuildGuidePickerScreen,
  })),
);

const BuildGuideScreen = React.lazy(() =>
  import('../screens/BuildGuideScreen').then(module => ({
    default: module.BuildGuideScreen,
  })),
);

export type RootStackParamList = {
  Home: undefined;
  Projects: undefined;
  Editor: { projectId: string };
  BuildGuide: undefined;
  BuildGuidePlayer: { modelId: BuildGuideModelId };
  RemoteControl: undefined;
  AiChat: undefined;
  Runtime: undefined;
  BleDevices: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function LazyScreenFallback() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

function withSuspense<P extends object>(
  LazyComponent: React.ComponentType<P>,
): React.ComponentType<P> {
  return function SuspenseWrapped(props: P) {
    return (
      <Suspense fallback={<LazyScreenFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

const LazyEditorScreen = withSuspense(EditorScreen);
const LazyBuildGuidePickerScreen = withSuspense(BuildGuidePickerScreen);
const LazyBuildGuideScreen = withSuspense(BuildGuideScreen);

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
          component={LazyEditorScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="BuildGuide"
          component={LazyBuildGuidePickerScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="BuildGuidePlayer"
          component={LazyBuildGuideScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RemoteControl"
          component={RemoteControlScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AiChat"
          component={AiChatScreen}
          options={{ headerShown: false }}
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
