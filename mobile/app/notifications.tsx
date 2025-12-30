/**
 * Pantalla de Notificaciones
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { notificationsAPI } from '../services/api';
import { NotificationResponse } from '../types';

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
      // Actualizar estado local
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
      // Actualizar estado local
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
    <TouchableOpacity
      style={[styles.notificationItem, !item.is_read && styles.notificationUnread]}
      onPress={() => handleMarkAsRead(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        {item.character_image_url ? (
          <Image
            source={{ uri: item.character_image_url }}
            style={styles.plantImage}
          />
        ) : (
          <View style={styles.plantImagePlaceholder}>
            <Ionicons name="leaf-outline" size={24} color="#4caf50" />
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

        {!item.is_read && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notificaciones</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4caf50" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        <View style={styles.placeholder} />
      </View>

      {unreadCount > 0 && (
        <TouchableOpacity
          style={styles.markAllButton}
          onPress={handleMarkAllAsRead}
          disabled={markingAll}
        >
          {markingAll ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={20} color="#fff" />
              <Text style={styles.markAllText}>Marcar todas como leídas</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={64} color="#64748b" />
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
              tintColor="#4caf50"
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
    backgroundColor: '#0a1929',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4caf50',
    margin: 16,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  markAllText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  notificationItem: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  notificationUnread: {
    borderColor: '#4caf50',
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
    marginRight: 12,
    backgroundColor: '#334155',
  },
  plantImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 16,
    color: '#cbd5e1',
    marginBottom: 4,
  },
  notificationMessageUnread: {
    color: '#fff',
    fontWeight: '600',
  },
  plantName: {
    fontSize: 14,
    color: '#4caf50',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4caf50',
    marginLeft: 8,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#cbd5e1',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
