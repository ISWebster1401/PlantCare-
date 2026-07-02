/**
 * Pantalla Home - Con modo oscuro (useThemeColors)
 */
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { plantsAPI, sensorsAPI } from '../../services/api';
import { StatCard, Button, Card, Emoji } from '../../components/ui';
import { PlantAIIcon } from '../../components/PlantAIIcon';
import { Typography, Spacing } from '../../constants/DesignSystem';
import { useThemeColors, useThemeGradients } from '../../context/ThemeContext';
import { Config } from '../../constants/Config';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();
  const gradients = useThemeGradients();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [plantCount, setPlantCount] = useState(0);
  const [activeSensors, setActiveSensors] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [plants, sensors] = await Promise.all([
        plantsAPI.getMyPlants(),
        sensorsAPI.getMySensors(),
      ]);

      setPlantCount(plants.length);
      setActiveSensors(sensors.filter((s) => s.status === 'active').length);
    } catch (error: any) {
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        if (error.isNetworkError || error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
          console.error('❌ Error de conexión:', error.userMessage || error.message);
          console.error('   Base URL:', error.baseURL || Config.API_URL);
        } else {
          console.error('Error cargando datos:', error);
        }
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const userName = user?.full_name?.split(' ')[0] || 'Usuario';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header con gradiente */}
      <LinearGradient
        colors={gradients.primary as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.greeting}>¡Hola, {userName}! 👋</Text>
        <Text style={styles.subtitle}>Bienvenido a tu jardín virtual</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Estadísticas */}
        <View style={styles.statsRow}>
          <StatCard
            icon="leaf"
            value={plantCount}
            label="Plantas"
            color={colors.primary}
            onPress={() => router.push('/(tabs)/garden')}
            style={styles.statCard}
          />
          <StatCard
            icon="hardware-chip"
            value={activeSensors}
            label="Sensores"
            color={colors.secondary}
            onPress={() => router.push('/(tabs)/sensors')}
            style={styles.statCard}
          />
        </View>

        {/* Acciones rápidas */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>

          <Card
            variant="elevated"
            onPress={() => router.push('/(tabs)/garden')}
            style={styles.actionCard}
          >
            <View style={styles.actionContent}>
              <View style={[styles.actionIcon, { backgroundColor: colors.primary + '20' }]}>
                <Text style={styles.actionEmoji}>🌿</Text>
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Ver Mi Jardín</Text>
                <Text style={styles.actionSubtitle}>Gestiona tus plantas</Text>
              </View>
            </View>
          </Card>

          <Card
            variant="elevated"
            onPress={() => router.push('/scan-plant')}
            gradient={gradients.primary as [string, string]}
            style={styles.actionCardPrimary}
          >
            <View style={styles.actionContent}>
              <View style={styles.actionIconPrimary}>
                <Emoji name="camera" size={32} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitlePrimary}>Escanear Nueva Planta</Text>
                <Text style={styles.actionSubtitlePrimary}>Agrega una planta a tu jardín</Text>
              </View>
            </View>
          </Card>

          <Card
            variant="elevated"
            onPress={() => router.push('/ai-chat')}
            style={styles.actionCard}
          >
            <View style={styles.actionContent}>
              <View style={[styles.actionIcon, { backgroundColor: colors.accent + '20' }]}>
                <PlantAIIcon size={24} color={colors.accent} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Chat con IA</Text>
                <Text style={styles.actionSubtitle}>Pregunta sobre tus plantas</Text>
              </View>
            </View>
          </Card>
        </View>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: 60,
      paddingBottom: Spacing.xl,
      paddingHorizontal: Spacing.lg,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
    },
    greeting: {
      fontSize: Typography.sizes.xxl,
      fontWeight: Typography.weights.extrabold,
      color: colors.white,
      marginBottom: Spacing.xs,
    },
    subtitle: {
      fontSize: Typography.sizes.base,
      fontWeight: Typography.weights.regular,
      color: colors.white,
      opacity: 0.9,
    },
    content: { padding: Spacing.lg },
    statsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
    statCard: { flex: 1 },
    actionsContainer: { marginTop: Spacing.md },
    sectionTitle: {
      fontSize: Typography.sizes.lg,
      fontWeight: Typography.weights.bold,
      color: colors.text,
      marginBottom: Spacing.md,
    },
    actionCard: { marginBottom: Spacing.md },
    actionCardPrimary: { marginBottom: Spacing.md },
    actionContent: { flexDirection: 'row', alignItems: 'center' },
    actionIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    actionIconPrimary: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    actionEmoji: { fontSize: 28 },
    actionEmojiPrimary: { fontSize: 28 },
    actionTextContainer: { flex: 1 },
    actionTitle: {
      fontSize: Typography.sizes.lg,
      fontWeight: Typography.weights.semibold,
      color: colors.text,
      marginBottom: Spacing.xs,
    },
    actionTitlePrimary: {
      fontSize: Typography.sizes.lg,
      fontWeight: Typography.weights.semibold,
      color: colors.white,
      marginBottom: Spacing.xs,
    },
    actionSubtitle: {
      fontSize: Typography.sizes.sm,
      fontWeight: Typography.weights.regular,
      color: colors.textSecondary,
    },
    actionSubtitlePrimary: {
      fontSize: Typography.sizes.sm,
      fontWeight: Typography.weights.regular,
      color: colors.white,
      opacity: 0.9,
    },
  });
}
