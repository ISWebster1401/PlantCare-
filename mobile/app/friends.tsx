/**
 * Pantalla social: ranking de rachas entre amigos e invitaciones.
 *
 * El ranking y la lista de amigos son la misma cosa — la lista ordenada por
 * racha, contigo incluido — así que se muestran juntos en vez de duplicar la
 * información en dos pestañas.
 */
import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { friendsAPI, Friend, RankingEntry } from '../services/api';
import { Button } from '../components/ui';
import { Typography, Spacing, BorderRadius, Shadows } from '../constants/DesignSystem';
import { useThemeColors, useThemeGradients } from '../context/ThemeContext';

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function FriendsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const gradients = useThemeGradients();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [requests, setRequests] = useState<Friend[]>([]);
  const [sent, setSent] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [inviteVisible, setInviteVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [r, req, s] = await Promise.all([
        friendsAPI.getRanking(),
        friendsAPI.getRequests(),
        friendsAPI.getSent(),
      ]);
      setRanking(r);
      setRequests(req);
      setSent(s);
    } catch (e) {
      console.error('Error cargando amigos:', e);
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

  const handleInvite = async () => {
    const correo = email.trim();
    if (!correo) return;
    try {
      setSending(true);
      const res = await friendsAPI.sendRequest(correo);
      setInviteVisible(false);
      setEmail('');
      Alert.alert('Listo', res.message);
      load();
    } catch (e: any) {
      Alert.alert('Ups', e?.response?.data?.detail || 'No se pudo enviar la invitación.');
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async (f: Friend) => {
    try {
      setBusyId(f.friendship_id);
      await friendsAPI.accept(f.friendship_id);
      await load();
    } catch (e: any) {
      Alert.alert('Ups', e?.response?.data?.detail || 'No se pudo aceptar.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (f: Friend) => {
    try {
      setBusyId(f.friendship_id);
      await friendsAPI.remove(f.friendship_id);
      await load();
    } catch (e: any) {
      Alert.alert('Ups', e?.response?.data?.detail || 'No se pudo completar.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRemoveFriend = (f: RankingEntry) => {
    Alert.alert(
      'Eliminar amigo',
      `¿Sacar a ${f.full_name} de tus amigos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await friendsAPI.remove(f.friendship_id);
              await load();
            } catch (e: any) {
              Alert.alert('Ups', e?.response?.data?.detail || 'No se pudo eliminar.');
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </View>
    );
  }

  const soloYo = ranking.length <= 1;

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
        <Text style={styles.headerTitle}>👥 Amigos</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setInviteVisible(true)}
          activeOpacity={0.8}
          accessibilityLabel="Invitar a un amigo"
        >
          <Ionicons name="person-add" size={20} color={colors.white} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Invitaciones recibidas: van primero porque piden acción */}
        {requests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Te quieren agregar</Text>
            {requests.map((f) => (
              <View key={f.friendship_id} style={styles.requestCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{f.full_name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.requestBody}>
                  <Text style={styles.name} numberOfLines={1}>{f.full_name}</Text>
                  <Text style={styles.sub}>
                    {f.plants_count} {f.plants_count === 1 ? 'planta' : 'plantas'}
                  </Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => handleAccept(f)}
                    disabled={busyId === f.friendship_id}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark" size={18} color={colors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleReject(f)}
                    disabled={busyId === f.friendship_id}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Ranking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ranking de rachas 🔥</Text>

          {soloYo ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={styles.emptyTitle}>Todavía estás solo acá</Text>
              <Text style={styles.emptyText}>
                Invita a alguien y compitan por quién cuida sus plantas más días seguidos.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => setInviteVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyBtnText}>Invitar a un amigo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            ranking.map((f) => (
              <TouchableOpacity
                key={`${f.user_id}`}
                style={[styles.rankCard, f.is_me && styles.rankCardMe]}
                onLongPress={() => !f.is_me && handleRemoveFriend(f)}
                activeOpacity={f.is_me ? 1 : 0.7}
              >
                <Text style={styles.position}>{MEDALS[f.position] || `${f.position}.`}</Text>
                <View style={[styles.avatar, f.is_me && styles.avatarMe]}>
                  <Text style={styles.avatarText}>{f.full_name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.rankBody}>
                  <Text style={styles.name} numberOfLines={1}>
                    {f.full_name}{f.is_me ? ' (tú)' : ''}
                  </Text>
                  <Text style={styles.sub}>
                    {f.plants_count} {f.plants_count === 1 ? 'planta' : 'plantas'} · récord {f.best_streak}
                  </Text>
                </View>
                <View style={styles.streakBox}>
                  <Text style={styles.streakNum}>{f.current_streak}</Text>
                  <Text style={styles.streakLabel}>🔥 días</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Invitaciones enviadas, a la espera */}
        {sent.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Esperando respuesta</Text>
            {sent.map((f) => (
              <View key={f.friendship_id} style={styles.pendingCard}>
                <View style={styles.avatarMuted}>
                  <Text style={styles.avatarTextMuted}>{f.full_name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.pendingName} numberOfLines={1}>{f.full_name}</Text>
                <TouchableOpacity onPress={() => handleReject(f)} activeOpacity={0.7}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {!soloYo && (
          <Text style={styles.hint}>Mantén presionado a un amigo para eliminarlo</Text>
        )}
      </ScrollView>

      {/* Modal: invitar por correo */}
      <Modal
        visible={inviteVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInviteVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Invitar a un amigo</Text>
            <Text style={styles.modalDesc}>
              Escribe el correo con el que se registró en PlantCare.
            </Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="correo@ejemplo.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setInviteVisible(false);
                  setEmail('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSend, (!email.trim() || sending) && styles.modalSendOff]}
                onPress={handleInvite}
                disabled={!email.trim() || sending}
                activeOpacity={0.85}
              >
                <Text style={styles.modalSendText}>{sending ? 'Enviando...' : 'Invitar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loader: { marginTop: 80 },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 60,
      paddingBottom: Spacing.lg,
      paddingHorizontal: Spacing.lg,
    },
    backButton: { width: 40 },
    headerTitle: {
      fontSize: Typography.sizes.xl,
      fontWeight: Typography.weights.bold,
      color: colors.white,
    },
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
    },

    content: { flex: 1 },
    contentContainer: { padding: Spacing.lg, paddingBottom: Spacing.xl * 2 },

    section: { marginBottom: Spacing.xl },
    sectionTitle: {
      fontSize: Typography.sizes.base,
      fontWeight: Typography.weights.bold,
      color: colors.text,
      marginBottom: Spacing.md,
    },

    /* --- ranking --- */
    rankCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: colors.backgroundLight,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      ...Shadows.sm,
    },
    rankCardMe: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    position: {
      fontSize: Typography.sizes.base,
      fontWeight: Typography.weights.bold,
      color: colors.textSecondary,
      minWidth: 26,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarMe: { backgroundColor: colors.primary },
    avatarText: {
      fontSize: Typography.sizes.base,
      fontWeight: Typography.weights.bold,
      color: colors.white,
    },
    rankBody: { flex: 1 },
    name: {
      fontSize: Typography.sizes.base,
      fontWeight: Typography.weights.semibold,
      color: colors.text,
    },
    sub: {
      fontSize: Typography.sizes.xs,
      color: colors.textMuted,
      marginTop: 2,
    },
    streakBox: { alignItems: 'center', minWidth: 46 },
    streakNum: {
      fontSize: Typography.sizes.lg,
      fontWeight: Typography.weights.bold,
      color: colors.primary,
    },
    streakLabel: { fontSize: 10, color: colors.textMuted },

    /* --- invitaciones recibidas --- */
    requestCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: colors.primaryPastel,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
    },
    requestBody: { flex: 1 },
    requestActions: { flexDirection: 'row', gap: Spacing.sm },
    acceptBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rejectBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* --- enviadas --- */
    pendingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    avatarMuted: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.backgroundLighter,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarTextMuted: {
      fontSize: Typography.sizes.sm,
      fontWeight: Typography.weights.bold,
      color: colors.textMuted,
    },
    pendingName: { flex: 1, fontSize: Typography.sizes.sm, color: colors.textSecondary },
    cancelText: { fontSize: Typography.sizes.sm, color: colors.critical },

    /* --- vacío --- */
    empty: {
      alignItems: 'center',
      backgroundColor: colors.backgroundLight,
      borderRadius: BorderRadius.lg,
      padding: Spacing.xl,
    },
    emptyEmoji: { fontSize: 40, marginBottom: Spacing.sm },
    emptyTitle: {
      fontSize: Typography.sizes.base,
      fontWeight: Typography.weights.bold,
      color: colors.text,
      marginBottom: Spacing.xs,
    },
    emptyText: {
      fontSize: Typography.sizes.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: Spacing.lg,
    },
    emptyBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full,
    },
    emptyBtnText: {
      color: colors.white,
      fontWeight: Typography.weights.semibold,
      fontSize: Typography.sizes.sm,
    },

    hint: {
      fontSize: Typography.sizes.xs,
      color: colors.textMuted,
      textAlign: 'center',
    },

    /* --- modal --- */
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.lg,
    },
    modalCard: {
      width: '100%',
      backgroundColor: colors.backgroundLight,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
    },
    modalTitle: {
      fontSize: Typography.sizes.lg,
      fontWeight: Typography.weights.bold,
      color: colors.text,
    },
    modalDesc: {
      fontSize: Typography.sizes.sm,
      color: colors.textSecondary,
      marginTop: Spacing.xs,
      marginBottom: Spacing.md,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.primaryLight,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      fontSize: Typography.sizes.base,
      color: colors.text,
      backgroundColor: colors.background,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: Spacing.md,
      marginTop: Spacing.lg,
    },
    modalCancel: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
    modalCancelText: { color: colors.textSecondary, fontSize: Typography.sizes.base },
    modalSend: {
      backgroundColor: colors.primary,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.full,
    },
    modalSendOff: { opacity: 0.5 },
    modalSendText: {
      color: colors.white,
      fontWeight: Typography.weights.semibold,
      fontSize: Typography.sizes.base,
    },
  });
}
