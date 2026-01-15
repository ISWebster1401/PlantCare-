/**
 * Pantalla de Notificaciones - Rediseñada con DesignSystem
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { notificationsAPI } from '../services/api';
import { NotificationResponse } from '../types';
import { Card, Button, Badge } from '../components/ui';
import { Colors, Typography, Spacing, BorderRadius, Gradients, Shadows } from '../constants/DesignSystem';

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await notificationsAPI.getNotifications(false);
      setNotifications(data);
    } catch (error: any) {
      console.error('Error cargando notificaciones:', error);
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        Alert.alert('Error', 'No se pudieron cargar las notificaciones');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
    } catch (error: any) {
      console.error('Error marcando notificación como leída:', error);
      Alert.alert('Error', 'No se pudo marcar la notificación como leída');
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) => prev.map((notif) => ({ ...notif, is_read: true })));
      Alert.alert('Éxito', 'Todas las notificaciones fueron marcadas como leídas');
    } catch (error: any) {
      console.error('Error marcando todas como leídas:', error);
      Alert.alert('Error', 'No se pudieron marcar todas las notificaciones como leídas');
    } finally {
      setMarkingAll(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const renderNotification = ({ item }: { item: NotificationResponse }) => (
    <Card
      variant={item.is_read ? 'default' : 'outlined'}
      onPress={() => handleMarkAsRead(item.id)}
      style={[
        styles.notificationCard,
        !item.is_read && styles.notificationUnread,
      ]}
    >
      <View style={styles.notificationContent}>
        {item.character_image_url ? (
          <Image
            source={{ uri: item.character_image_url }}
            style={styles.plantImage}
          />
        ) : (
          <View style={styles.plantImagePlaceholder}>
            <Ionicons name="leaf-outline" size={24} color={Colors.primary} />
          </View>
        )}
        
        <View style={styles.notificationTextContainer}>
          <Text style={[styles.notificationMessage, !item.is_read && styles.notificationMessageUnread]}>
            {item.message}
          </Text>
          {item.plant_name && (
            <Text style={styles.plantName}>{item.plant_name}</Text>
          )}
          <Text style={styles.notificationTime}>{formatDate(item.created_at)}</Text>
        </View>

        {!item.is_read && (
          <View style={styles.unreadDot} />
        )}
      </View>
    </Card>
  );

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={Gradients.sunset}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Button
            title=""
            onPress={() => router.back()}
            variant="ghost"
            size="sm"
            icon="arrow-back"
            style={styles.backButton}
          />
          <Text style={styles.headerTitle}>Notificaciones</Text>
          <View style={styles.backButtonPlaceholder} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Gradients.sunset}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Button
          title=""
          onPress={() => router.back()}
          variant="ghost"
          size="sm"
          icon="arrow-back"
          style={styles.backButton}
        />
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>🔔 Notificaciones</Text>
          {unreadCount > 0 && (
            <Badge status="warning" label={unreadCount.toString()} size="sm" />
          )}
        </View>
        <View style={styles.backButtonPlaceholder} />
      </LinearGradient>

      {unreadCount > 0 && (
        <View style={styles.markAllContainer}>
          <Button
            title="Marcar todas como leídas"
            onPress={handleMarkAllAsRead}
            variant="primary"
            size="md"
            loading={markingAll}
            disabled={markingAll}
            icon="checkmark-done"
            iconPosition="left"
            fullWidth
          />
        </View>
      )}

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🔕</Text>
          <Text style={styles.emptyText}>No hay notificaciones</Text>
          <Text style={styles.emptySubtext}>Tus notificaciones aparecerán aquí</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    paddingTop: 60,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  backButton: {
    width: 40,
    height: 40,
    padding: 0,
  },
  backButtonPlaceholder: {
    width: 40,
  },
  markAllContainer: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  listContent: {
    padding: Spacing.lg,
  },
  notificationCard: {
    marginBottom: Spacing.md,
  },
  notificationUnread: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  plantImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: Spacing.md,
    backgroundColor: Colors.backgroundLighter,
  },
  plantImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: Spacing.md,
    backgroundColor: Colors.backgroundLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  notificationMessageUnread: {
    color: Colors.text,
    fontWeight: Typography.weights.semibold,
  },
  plantName: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  notificationTime: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: Spacing.sm,
    marginTop: Spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
