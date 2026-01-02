/**
 * Panel de Administración - Mobile
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { adminAPI } from '../services/api';
import {
  AdminStats,
  UserAdminResponse,
  DeviceAdminResponse,
  DeviceCodeBatch,
} from '../types';
import { Ionicons } from '@expo/vector-icons';

type TabType = 'dashboard' | 'users' | 'devices';

export default function AdminPanelScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de datos
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserAdminResponse[]>([]);
  const [devices, setDevices] = useState<DeviceAdminResponse[]>([]);

  // Estados para filtros
  const [userSearch, setUserSearch] = useState('');
  const [deviceSearch, setDeviceSearch] = useState('');

  // Estado para generación de códigos
  const [codeGeneration, setCodeGeneration] = useState<DeviceCodeBatch>({
    device_type: 'humidity_sensor',
    quantity: 1,
  });

  const styles = createStyles(theme.colors);

  // Verificar permisos
  if (!user || user.role_id !== 2) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Panel Admin</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed" size={64} color={theme.colors.error} />
          <Text style={styles.accessDeniedTitle}>Acceso Denegado</Text>
          <Text style={styles.accessDeniedText}>
            No tienes permisos para acceder al panel de administración.
          </Text>
        </View>
      </View>
    );
  }

  const loadStats = async () => {
    try {
      setError(null);
      const data = await adminAPI.getStats();
      setStats(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error cargando estadísticas');
    }
  };

  const loadUsers = async () => {
    try {
      setError(null);
      const data = await adminAPI.getUsers({ search: userSearch || undefined });
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error cargando usuarios');
    }
  };

  const loadDevices = async () => {
    try {
      setError(null);
      const data = await adminAPI.getDevices({ search: deviceSearch || undefined });
      setDevices(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error cargando dispositivos');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'dashboard') {
        await loadStats();
      } else if (activeTab === 'users') {
        await loadUsers();
      } else if (activeTab === 'devices') {
        await loadDevices();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const toggleUserStatus = async (userId: number, currentStatus: boolean) => {
    Alert.alert(
      currentStatus ? 'Desactivar Usuario' : 'Activar Usuario',
      `¿Estás seguro de que deseas ${currentStatus ? 'desactivar' : 'activar'} este usuario?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminAPI.toggleUserStatus(userId, !currentStatus);
              await loadUsers();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.detail || 'No se pudo actualizar el usuario');
            }
          },
        },
      ]
    );
  };

  const generateDeviceCodes = async () => {
    try {
      setLoading(true);
      const codes = await adminAPI.generateDeviceCodes(codeGeneration);
      Alert.alert(
        'Códigos Generados',
        `Se generaron ${codes.length} código(s) exitosamente.`,
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'No se pudieron generar los códigos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    const loadData = async () => {
      try {
        if (activeTab === 'dashboard') {
          await loadStats();
        } else if (activeTab === 'users') {
          await loadUsers();
        } else if (activeTab === 'devices') {
          await loadDevices();
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [activeTab]);

  const renderDashboard = () => {
    if (!stats) return null;

    return (
      <View style={styles.dashboardContent}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="people" size={24} color={theme.colors.primary} />
              <Text style={styles.statLabel}>Usuarios</Text>
            </View>
            <Text style={styles.statValue}>{stats.total_users}</Text>
            <Text style={styles.statDetail}>
              {stats.active_users} activos • {stats.inactive_users} inactivos
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="hardware-chip" size={24} color={theme.colors.primary} />
              <Text style={styles.statLabel}>Dispositivos</Text>
            </View>
            <Text style={styles.statValue}>{stats.total_devices}</Text>
            <Text style={styles.statDetail}>
              {stats.connected_devices} conectados • {stats.unconnected_devices} disponibles
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="trending-up" size={24} color={theme.colors.primary} />
              <Text style={styles.statLabel}>Hoy</Text>
            </View>
            <Text style={styles.statValue}>{stats.new_users_today}</Text>
            <Text style={styles.statDetail}>Nuevos usuarios</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="analytics" size={24} color={theme.colors.primary} />
              <Text style={styles.statLabel}>Lecturas</Text>
            </View>
            <Text style={styles.statValue}>{stats.total_readings_today}</Text>
            <Text style={styles.statDetail}>Hoy</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderUsers = () => {
    return (
      <View style={styles.listContent}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar usuarios..."
            placeholderTextColor={theme.colors.textTertiary}
            value={userSearch}
            onChangeText={setUserSearch}
            onSubmitEditing={loadUsers}
          />
          <TouchableOpacity onPress={loadUsers} style={styles.searchButton}>
            <Ionicons name="arrow-forward" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {users.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={styles.emptyText}>No hay usuarios</Text>
          </View>
        ) : (
          users.map((userItem) => (
            <View key={userItem.id} style={styles.listItem}>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle}>
                  {userItem.first_name} {userItem.last_name}
                </Text>
                <Text style={styles.listItemSubtitle}>{userItem.email}</Text>
                <View style={styles.listItemBadges}>
                  <View style={[styles.badge, userItem.active ? styles.badgeActive : styles.badgeInactive]}>
                    <Text style={styles.badgeText}>{userItem.active ? 'Activo' : 'Inactivo'}</Text>
                  </View>
                  <View style={[styles.badge, styles.badgeRole]}>
                    <Text style={styles.badgeText}>{userItem.role_name || 'Usuario'}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => toggleUserStatus(userItem.id, userItem.active)}
                style={[
                  styles.actionButton,
                  userItem.active ? styles.actionButtonWarning : styles.actionButtonSuccess,
                ]}
              >
                <Ionicons
                  name={userItem.active ? 'pause' : 'play'}
                  size={20}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    );
  };

  const renderDevices = () => {
    return (
      <View style={styles.listContent}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar dispositivos..."
            placeholderTextColor={theme.colors.textTertiary}
            value={deviceSearch}
            onChangeText={setDeviceSearch}
            onSubmitEditing={loadDevices}
          />
          <TouchableOpacity onPress={loadDevices} style={styles.searchButton}>
            <Ionicons name="arrow-forward" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {devices.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="hardware-chip-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={styles.emptyText}>No hay dispositivos</Text>
          </View>
        ) : (
          devices.map((device) => (
            <View key={device.id} style={styles.listItem}>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle}>{device.name || device.device_code}</Text>
                <Text style={styles.listItemSubtitle}>{device.device_type}</Text>
                <View style={styles.listItemBadges}>
                  <View style={[styles.badge, device.connected ? styles.badgeConnected : styles.badgeDisconnected]}>
                    <Text style={styles.badgeText}>{device.connected ? 'Conectado' : 'Disponible'}</Text>
                  </View>
                  {device.user_name && (
                    <Text style={styles.listItemUser}>{device.user_name}</Text>
                  )}
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Panel Admin</Text>
        <View style={styles.backButton} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dashboard' && styles.tabActive]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Ionicons
            name="stats-chart"
            size={20}
            color={activeTab === 'dashboard' ? theme.colors.primary : theme.colors.iconSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'dashboard' && styles.tabTextActive,
            ]}
          >
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.tabActive]}
          onPress={() => setActiveTab('users')}
        >
          <Ionicons
            name="people"
            size={20}
            color={activeTab === 'users' ? theme.colors.primary : theme.colors.iconSecondary}
          />
          <Text
            style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}
          >
            Usuarios
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'devices' && styles.tabActive]}
          onPress={() => setActiveTab('devices')}
        >
          <Ionicons
            name="hardware-chip"
            size={20}
            color={activeTab === 'devices' ? theme.colors.primary : theme.colors.iconSecondary}
          />
          <Text
            style={[styles.tabText, activeTab === 'devices' && styles.tabTextActive]}
          >
            Dispositivos
          </Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'devices' && renderDevices()}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.surface,
    gap: 6,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.iconSecondary,
  },
  tabTextActive: {
    color: colors.text,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '20',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: colors.error,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  dashboardContent: {
    padding: 16,
  },
  statsGrid: {
    gap: 16,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statDetail: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  listContent: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 12,
  },
  searchButton: {
    padding: 8,
  },
  listItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  listItemSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  listItemBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeActive: {
    backgroundColor: colors.primary + '30',
  },
  badgeInactive: {
    backgroundColor: colors.error + '30',
  },
  badgeRole: {
    backgroundColor: colors.border,
  },
  badgeConnected: {
    backgroundColor: colors.primary + '30',
  },
  badgeDisconnected: {
    backgroundColor: colors.textTertiary + '30',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  listItemUser: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  actionButtonWarning: {
    backgroundColor: colors.error + '30',
  },
  actionButtonSuccess: {
    backgroundColor: colors.primary + '30',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
});
