import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '../screens/HomeScreen';
import { RuntimeScreen } from '../screens/RuntimeScreen';

export type RootStackParamList = {
  Home: undefined;
  Runtime: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Scratch Mobile' }}
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
