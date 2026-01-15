/**
 * Pantalla de Perfil - Rediseñada con DesignSystem
 */
import React from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Card, Button } from '../../components/ui';
import { Colors, Typography, Spacing, BorderRadius, Gradients, Shadows } from '../../constants/DesignSystem';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header con gradiente */}
      <LinearGradient
        colors={Gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color={Colors.primary} />
          </View>
        </View>
        <Text style={styles.name}>{user?.full_name || 'Usuario'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </LinearGradient>

      <View style={styles.content}>
        <Card variant="elevated" style={styles.menuCard}>
          <Button
            title="Editar Perfil"
            onPress={() => router.push('/edit-profile')}
            variant="ghost"
            size="lg"
            icon="person-outline"
            iconPosition="left"
            fullWidth
            style={styles.menuItem}
          />
          <View style={styles.divider} />
          <Button
            title="Notificaciones"
            onPress={() => router.push('/notifications')}
            variant="ghost"
            size="lg"
            icon="notifications-outline"
            iconPosition="left"
            fullWidth
            style={styles.menuItem}
          />
          <View style={styles.divider} />
          <Button
            title="Configuración"
            onPress={() => router.push('/settings')}
            variant="ghost"
            size="lg"
            icon="settings-outline"
            iconPosition="left"
            fullWidth
            style={styles.menuItem}
          />
          {user?.role_id === 2 && (
            <>
              <View style={styles.divider} />
              <Button
                title="Panel Admin"
                onPress={() => router.push('/admin')}
                variant="ghost"
                size="lg"
                icon="shield-checkmark-outline"
                iconPosition="left"
                fullWidth
                style={[styles.menuItem, styles.adminItem]}
              />
            </>
          )}
        </Card>

        <Button
          title="Cerrar Sesión"
          onPress={handleLogout}
          variant="danger"
          size="lg"
          icon="log-out-outline"
          iconPosition="left"
          fullWidth
          style={styles.logoutButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.white,
    ...Shadows.lg,
  },
  name: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  email: {
    fontSize: Typography.sizes.base,
    color: Colors.white,
    opacity: 0.9,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 120, // Más espacio arriba para subir el contenido
  },
  menuCard: {
    marginBottom: Spacing.lg,
  },
  menuItem: {
    height: 'auto' as any,
    minHeight: 72,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    justifyContent: 'flex-start' as any,
  },
  adminItem: {
    borderTopWidth: 1,
    borderTopColor: Colors.backgroundLighter,
    marginTop: Spacing.xs,
    paddingTop: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.backgroundLighter,
    marginVertical: Spacing.sm,
  },
  logoutButton: {
    marginTop: Spacing.lg,
    minHeight: 56,
  },
});
