/**
 * Tienda - Canjear puntos de logros por accesorios
 */
import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { storeAPI, StoreItem, StoreSummary } from '../services/api';
import { Button } from '../components/ui';
import { Typography, Spacing, BorderRadius, Shadows } from '../constants/DesignSystem';
import { useThemeColors, useThemeGradients } from '../context/ThemeContext';

export default function StoreScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const gradients = useThemeGradients();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [store, setStore] = useState<StoreSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redeemingId, setRedeemingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setStore(await storeAPI.getStore());
    } catch (e) {
      console.error('Error cargando tienda:', e);
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

  const handleRedeem = (item: StoreItem) => {
    Alert.alert(
      'Canjear accesorio',
      `¿Canjear ${item.name} por ${item.cost_points} puntos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Canjear',
          onPress: async () => {
            setRedeemingId(item.id);
            try {
              const res = await storeAPI.redeem(item.id);
              await load();
              Alert.alert('¡Listo!', `${res.message}\n\nTe quedan ${res.available_points} puntos.`);
            } catch (e: any) {
              Alert.alert(
                'No se pudo canjear',
                e?.response?.data?.detail || 'Intenta de nuevo.',
              );
            } finally {
              setRedeemingId(null);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: StoreItem }) => (
    <View style={[styles.card, item.owned && styles.cardOwned]}>
      <View style={styles.iconBox}>
        <Text style={styles.icon}>{item.icon || '🎁'}</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        {!!item.description && (
          <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
        )}
        <Text style={styles.cost}>{item.cost_points} puntos</Text>
      </View>

      {item.owned ? (
        <View style={styles.ownedBadge}>
          <Text style={styles.ownedText}>Tuyo</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.buyButton, !item.affordable && styles.buyButtonDisabled]}
          onPress={() => handleRedeem(item)}
          disabled={!item.affordable || redeemingId === item.id}
          activeOpacity={0.8}
        >
          {redeemingId === item.id ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.buyText}>{item.affordable ? 'Canjear' : 'Falta'}</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

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
        <Text style={styles.title}>🛍️ Tienda</Text>
        <View style={styles.balanceBox}>
          <Text style={styles.balanceValue}>{store?.available_points ?? 0}</Text>
          <Text style={styles.balanceLabel}>puntos disponibles</Text>
        </View>
        <Text style={styles.hint}>Gana puntos consiguiendo logros</Text>
      </LinearGradient>

      <FlatList
        data={store?.items ?? []}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
        }
        ListEmptyComponent={<Text style={styles.empty}>La tienda está vacía por ahora</Text>}
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
      marginBottom: Spacing.sm,
    },
    balanceBox: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: Spacing.xs,
    },
    balanceValue: {
      fontSize: Typography.sizes.xl,
      fontWeight: Typography.weights.extrabold,
      color: colors.white,
    },
    balanceLabel: { fontSize: Typography.sizes.sm, color: colors.white, opacity: 0.9 },
    hint: {
      fontSize: Typography.sizes.xs,
      color: colors.white,
      opacity: 0.85,
      marginTop: Spacing.xs,
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
    cardOwned: { borderColor: colors.primary },
    iconBox: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.backgroundLighter,
      justifyContent: 'center',
      alignItems: 'center',
    },
    icon: { fontSize: 26 },
    body: { flex: 1 },
    name: {
      fontSize: Typography.sizes.base,
      fontWeight: Typography.weights.bold,
      color: colors.text,
    },
    desc: { fontSize: Typography.sizes.sm, color: colors.textSecondary, marginTop: 1 },
    cost: {
      fontSize: Typography.sizes.sm,
      fontWeight: Typography.weights.bold,
      color: colors.accent,
      marginTop: Spacing.xs,
    },
    buyButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full,
      minWidth: 84,
      alignItems: 'center',
    },
    buyButtonDisabled: { backgroundColor: colors.backgroundLighter },
    buyText: {
      color: colors.white,
      fontWeight: Typography.weights.bold,
      fontSize: Typography.sizes.sm,
    },
    ownedBadge: {
      backgroundColor: colors.primary + '25',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full,
      minWidth: 84,
      alignItems: 'center',
    },
    ownedText: {
      color: colors.primary,
      fontWeight: Typography.weights.bold,
      fontSize: Typography.sizes.sm,
    },
    empty: { textAlign: 'center', color: colors.textSecondary, marginTop: Spacing.xl },
    loader: { marginTop: 100 },
  });
}
