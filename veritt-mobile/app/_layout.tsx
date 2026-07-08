import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import '../global.css';
import { useAuthBootstrap } from '@/hooks/useAuthBootstrap';
import { VrittToastHost } from '@/components/ui/VrittToast';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  useAuthBootstrap();

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#000000' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" options={{ presentation: 'modal' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="businesses/create" options={{ presentation: 'modal' }} />
      </Stack>
      <VrittToastHost />
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
