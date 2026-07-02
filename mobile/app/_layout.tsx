/**
 * Root layout - Animaciones profesionales por pantalla
 */
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider, useThemeColors } from '../context/ThemeContext';

function ThemedStack() {
  const colors = useThemeColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
        animationDuration: 300,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      {/* Auth - Fade suave */}
      <Stack.Screen
        name="(auth)"
        options={{ animation: 'fade', animationDuration: 250 }}
      />

      {/* Tabs - Sin animación para cambio instantáneo */}
      <Stack.Screen
        name="(tabs)"
        options={{ animation: 'none' }}
      />

      {/* Detalle de planta - Modal desde abajo */}
      <Stack.Screen
        name="plant-detail"
        options={{
          animation: 'slide_from_bottom',
          animationDuration: 400,
          presentation: 'modal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
        }}
      />

      {/* Scanner - Fade desde abajo */}
      <Stack.Screen
        name="scan-plant"
        options={{
          animation: 'fade_from_bottom',
          animationDuration: 400,
        }}
      />

      {/* Scanner Pokedex - Fade desde abajo */}
      <Stack.Screen
        name="scan-pokedex"
        options={{
          animation: 'fade_from_bottom',
          animationDuration: 400,
        }}
      />

      {/* Pokedex entry - Fade elegante */}
      <Stack.Screen
        name="pokedex-entry-detail"
        options={{
          animation: 'fade',
          animationDuration: 300,
        }}
      />

      {/* Chat - Slide rápido desde la derecha */}
      <Stack.Screen
        name="ai-chat"
        options={{
          animation: 'slide_from_right',
          animationDuration: 250,
        }}
      />

      {/* Voice Call - Fade dramático fullscreen */}
      <Stack.Screen
        name="voice-call"
        options={{
          animation: 'fade',
          animationDuration: 500,
          presentation: 'fullScreenModal',
          gestureEnabled: false,
        }}
      />

      {/* Edit Profile - Modal desde abajo */}
      <Stack.Screen
        name="edit-profile"
        options={{
          animation: 'slide_from_bottom',
          animationDuration: 350,
          presentation: 'modal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
        }}
      />

      {/* Notifications - Slide desde derecha */}
      <Stack.Screen
        name="notifications"
        options={{
          animation: 'slide_from_right',
          animationDuration: 300,
        }}
      />

      {/* Change Email - Modal desde abajo */}
      <Stack.Screen
        name="change-email"
        options={{
          animation: 'slide_from_bottom',
          animationDuration: 350,
          presentation: 'modal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
        }}
      />

      {/* Settings - Slide suave desde derecha */}
      <Stack.Screen
        name="settings"
        options={{
          animation: 'slide_from_right',
          animationDuration: 300,
        }}
      />

      {/* Admin - Slide desde derecha */}
      <Stack.Screen
        name="admin"
        options={{
          animation: 'slide_from_right',
          animationDuration: 300,
        }}
      />

      {/* Watering - Fade desde abajo */}
      <Stack.Screen
        name="watering"
        options={{
          animation: 'fade_from_bottom',
          animationDuration: 350,
        }}
      />

      {/* Watering History - Slide desde derecha */}
      <Stack.Screen
        name="watering-history"
        options={{
          animation: 'slide_from_right',
          animationDuration: 300,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <ThemedStack />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
