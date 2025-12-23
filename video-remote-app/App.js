import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ConnectionScreen from './src/screens/ConnectionScreen';
import RemoteScreen from './src/screens/RemoteScreen';
import BackgroundRemovalScreen from './src/screens/BackgroundRemovalScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Connection"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#6366F1',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 18,
            },
            headerShadowVisible: true,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen
            name="Connection"
            component={ConnectionScreen}
            options={{
              title: 'VBR - 接続',
              headerLeft: () => null,
              headerBackVisible: false,
            }}
          />
          <Stack.Screen
            name="Remote"
            component={RemoteScreen}
            options={{
              title: 'VBR - リモコン',
            }}
          />
          <Stack.Screen
            name="BackgroundRemoval"
            component={BackgroundRemovalScreen}
            options={{
              title: 'VBR - 背景除去',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
