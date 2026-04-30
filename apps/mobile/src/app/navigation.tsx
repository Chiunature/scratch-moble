import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { EditorScreen } from '../screens/EditorScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import { RuntimeScreen } from '../screens/RuntimeScreen';

export type RootStackParamList = {
  Home: undefined;
  Editor: undefined;
  BuildGuide: undefined;
  RemoteControl: undefined;
  AiChat: undefined;
  Runtime: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#eef2ff' },
          headerTintColor: '#111827',
          headerTitleStyle: { fontWeight: '800' },
        }}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Editor"
          component={EditorScreen}
          options={{ title: '编程模式' }}
        />
        <Stack.Screen
          name="BuildGuide"
          component={PlaceholderScreen}
          options={{ title: '搭建说明' }}
        />
        <Stack.Screen
          name="RemoteControl"
          component={PlaceholderScreen}
          options={{ title: '遥控模式' }}
        />
        <Stack.Screen
          name="AiChat"
          component={PlaceholderScreen}
          options={{ title: 'AI 对话' }}
        />
        <Stack.Screen
          name="Runtime"
          component={RuntimeScreen}
          options={{ title: 'Runtime Demo' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
