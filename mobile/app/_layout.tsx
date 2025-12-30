/**
 * Root layout para Expo Router
 */
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a1929' },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="scan-plant" options={{ headerShown: false }} />
        <Stack.Screen name="plant-detail" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
