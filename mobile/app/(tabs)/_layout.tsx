/**
 * Layout principal con tabs (bottom navigation)
 */
import { Tabs, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useThemeColors } from '../../context/ThemeContext';
import { Shadows } from '../../constants/DesignSystem';

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colors = useThemeColors();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading]);

  const screenOptions = {
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle: {
      backgroundColor: colors.backgroundLight,
      borderTopColor: colors.backgroundLighter,
      borderTopWidth: 1,
      height: 65,
      paddingBottom: 4,
      paddingTop: 8,
      ...Shadows.md,
    },
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: '600',
    },
  };

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="garden"
        options={{
          title: 'Tu Jardín',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="leaf" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pokedex"
        options={{
          title: 'Pokedex',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sensors"
        options={{
          // Oculta hasta que exista el sensor físico: una pestaña que solo dice
          // "Próximamente" es motivo de rechazo en la revisión de Apple (guía 2.1).
          href: null,
          title: 'Dispositivos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="hardware-chip" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
