/**
 * Pantalla de Logros - Gamificación (Fase 1)
 */
import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { achievementsAPI, streaksAPI, AchievementItem, AchievementsSummary, StreakRecord } from '../services/api';
import { Button, ProgressBar } from '../components/ui';
import { Typography, Spacing, BorderRadius, Shadows } from '../constants/DesignSystem';
import { useThemeColors, useThemeGradients } from '../context/ThemeContext';

export default function AchievementsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const gradients = useThemeGradients();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [summary, setSummary] = useState<AchievementsSummary | null>(null);
  const [streak, setStreak] = useState<StreakRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    // La racha es complementaria: si falla, los logros igual se muestran
    streaksAPI.getMyStreak().then(setStreak).catch(() => setStreak(null));

    try {
      setSummary(await achievementsAPI.getMyAchievements());
    } catch (e) {
      console.error('Error cargando logros:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const renderAchievement = ({ item }: { item: AchievementItem }) => {
    const pct = item.requirement_value > 0
      ? Math.min((item.progress / item.requirement_value) * 100, 100)
      : 0;

    return (
      <View style={[styles.card, item.earned && styles.cardEarned]}>
        <View style={[styles.medal, { backgroundColor: item.earned ? colors.primary : colors.backgroundLighter }]}>
          <Ionicons
            name={item.earned ? 'trophy' : 'lock-closed'}
            size={22}
            color={item.earned ? colors.white : colors.textMuted}
          />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, !item.earned && styles.cardTitleLocked]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.points}>+{item.points}</Text>
          </View>

          {!!item.description && (
            <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          )}

          {item.earned ? (
            <Text style={styles.earnedLabel}>Conseguido</Text>
          ) : item.measurable ? (
            <View style={styles.progressRow}>
              <ProgressBar progress={pct} height={6} color={colors.primary} />
              <Text style={styles.progressText}>
                {item.progress}/{item.requirement_value}
              </Text>
            </View>
          ) : (
            <Text style={styles.soonLabel}>Disponible cuando conectes un sensor</Text>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradients.primary as [string, string]}
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
        <Text style={styles.title}>🏆 Mis Logros</Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{summary?.total_points ?? 0}</Text>
            <Text style={styles.statLabel}>Puntos</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {summary?.earned_count ?? 0}/{summary?.total_count ?? 0}
            </Text>
            <Text style={styles.statLabel}>Logros</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>🔥 {streak?.current_streak ?? 0}</Text>
            <Text style={styles.statLabel}>Racha</Text>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={summary?.achievements ?? []}
        renderItem={renderAchievement}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Aún no hay logros disponibles</Text>
        }
      />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: 60,
      paddingBottom: Spacing.lg,
      paddingHorizontal: Spacing.lg,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
    },
    backButton: { width: 40, height: 40, padding: 0, marginBottom: Spacing.xs },
    title: {
      fontSize: Typography.sizes.xxl,
      fontWeight: Typography.weights.extrabold,
      color: colors.white,
      marginBottom: Spacing.md,
    },
    statsRow: { flexDirection: 'row', gap: Spacing.sm },
    stat: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.sm,
      alignItems: 'center',
    },
    statValue: {
      fontSize: Typography.sizes.lg,
      fontWeight: Typography.weights.bold,
      color: colors.white,
    },
    statLabel: {
      fontSize: Typography.sizes.xs,
      color: colors.white,
      opacity: 0.85,
      marginTop: 1,
    },
    list: { padding: Spacing.lg, paddingBottom: Spacing.xl },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: colors.backgroundLight,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: colors.backgroundLighter,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      ...Shadows.soft,
    },
    cardEarned: { borderColor: colors.primary },
    medal: {
      width: 46,
      height: 46,
      borderRadius: 23,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardBody: { flex: 1 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    cardTitle: {
      flex: 1,
      fontSize: Typography.sizes.base,
      fontWeight: Typography.weights.bold,
      color: colors.text,
    },
    cardTitleLocked: { color: colors.textSecondary },
    points: {
      fontSize: Typography.sizes.sm,
      fontWeight: Typography.weights.bold,
      color: colors.accent,
    },
    cardDesc: {
      fontSize: Typography.sizes.sm,
      color: colors.textSecondary,
      marginTop: 2,
    },
    earnedLabel: {
      fontSize: Typography.sizes.xs,
      fontWeight: Typography.weights.bold,
      color: colors.primary,
      marginTop: Spacing.xs,
    },
    soonLabel: {
      fontSize: Typography.sizes.xs,
      color: colors.textMuted,
      marginTop: Spacing.xs,
    },
    progressRow: { marginTop: Spacing.sm, gap: 3 },
    progressText: {
      fontSize: Typography.sizes.xs,
      color: colors.textMuted,
      textAlign: 'right',
    },
    empty: {
      textAlign: 'center',
      color: colors.textSecondary,
      marginTop: Spacing.xl,
    },
    loader: { marginTop: 100 },
  });
}
