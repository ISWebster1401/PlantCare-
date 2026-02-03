/**
 * Root layout para Expo Router
 */
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { Colors } from '../constants/DesignSystem';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="scan-plant" options={{ headerShown: false }} />
        <Stack.Screen name="plant-detail" options={{ headerShown: false }} />
        <Stack.Screen name="ai-chat" options={{ headerShown: false }} />
        <Stack.Screen name="voice-call" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="change-email" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
