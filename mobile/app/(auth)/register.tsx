/**
 * Pantalla de registro - Rediseñada con DesignSystem + Tema dinámico
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { UserRegistration } from '../../types';
import { Button, Card, Emoji } from '../../components/ui';
import { Typography, Spacing, BorderRadius } from '../../constants/DesignSystem';
import { useTheme, useThemeColors, useThemeGradients } from '../../context/ThemeContext';

export default function RegisterScreen() {
  const [formData, setFormData] = useState<UserRegistration>({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register } = useAuth();
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();
  const colors = useThemeColors();
  const gradients = useThemeGradients();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const rotation = useSharedValue(0);
  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handleToggleTheme = () => {
    rotation.value = withSpring(rotation.value + 180);
    toggleTheme();
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }
    if (!/[A-Z]/.test(password)) {
      return 'La contraseña debe contener al menos una mayúscula';
    }
    if (!/[a-z]/.test(password)) {
      return 'La contraseña debe contener al menos una minúscula';
    }
    if (!/[0-9]/.test(password)) {
      return 'La contraseña debe contener al menos un número';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return 'La contraseña debe contener al menos un carácter especial';
    }
    return null;
  };

  const handleRegister = async () => {
    if (!formData.full_name.trim() || !formData.email.trim() || !formData.password || !formData.confirm_password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      Alert.alert('Error de validación', passwordError);
      return;
    }

    setIsLoading(true);
    try {
      await register(formData);
      Alert.alert(
        'Registro exitoso',
        'Tu cuenta ha sido creada. Te enviamos un código de verificación a tu correo.',
        [
          {
            text: 'Verificar correo',
            onPress: () =>
              router.replace({
                pathname: '/(auth)/verify-email',
                params: { email: formData.email },
              }),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error de registro', error.message || 'No se pudo crear la cuenta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <LinearGradient
        colors={Array.from(gradients.card) as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Botón de cambio de tema */}
      <TouchableOpacity
        style={styles.themeToggleButton}
        onPress={handleToggleTheme}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Animated.View style={animatedIconStyle}>
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={22}
            color={isDark ? '#FFD700' : colors.primary}
          />
        </Animated.View>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Emoji name="plant" size={56} style={styles.emoji} />
            <Text style={[styles.title, { color: colors.primary }]}>Únete a PlantCare</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Crea tu cuenta y comienza a cuidar tus plantas
            </Text>
          </View>

          {/* Toggle Login / Registro */}
          <View style={[styles.switchContainer, { backgroundColor: colors.backgroundLighter }]}>
            <TouchableOpacity
              style={styles.switchTab}
              onPress={() => router.replace('/(auth)/login')}
              disabled={isLoading}
            >
              <Text style={[styles.switchTabText, { color: colors.textSecondary }]}>Iniciar Sesión</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.switchTab, { backgroundColor: colors.primary }]}>
              <Text style={[styles.switchTabText, styles.switchTabTextActive]}>Crear Cuenta</Text>
            </TouchableOpacity>
          </View>

          <Card variant="elevated" style={styles.formCard}>
            <View style={styles.form}>
              <View style={[styles.inputContainer, { backgroundColor: colors.backgroundLighter, borderColor: colors.backgroundLighter }]}>
                <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Nombre completo"
                  placeholderTextColor={colors.textMuted}
                  value={formData.full_name}
                  onChangeText={(text) => setFormData({ ...formData, full_name: text })}
                  editable={!isLoading}
                />
              </View>

              <View style={[styles.inputContainer, { backgroundColor: colors.backgroundLighter, borderColor: colors.backgroundLighter }]}>
                <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Email"
                  placeholderTextColor={colors.textMuted}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              <View style={[styles.inputContainer, { backgroundColor: colors.backgroundLighter, borderColor: colors.backgroundLighter }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Contraseña"
                  placeholderTextColor={colors.textMuted}
                  value={formData.password}
                  onChangeText={(text) => setFormData({ ...formData, password: text })}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={styles.passwordEyeButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <View style={[styles.inputContainer, { backgroundColor: colors.backgroundLighter, borderColor: colors.backgroundLighter }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Confirmar contraseña"
                  placeholderTextColor={colors.textMuted}
                  value={formData.confirm_password}
                  onChangeText={(text) => setFormData({ ...formData, confirm_password: text })}
                  secureTextEntry={!showConfirmPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  style={styles.passwordEyeButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <Button
                title="Crear Cuenta"
                onPress={handleRegister}
                variant="primary"
                size="lg"
                loading={isLoading}
                disabled={isLoading}
                fullWidth
                style={styles.registerButton}
              />
            </View>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    themeToggleButton: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 56 : 16,
      right: 20,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: Spacing.lg,
    },
    content: {
      width: '100%',
    },
    header: {
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    emoji: {
      fontSize: 64,
      marginBottom: Spacing.sm,
    },
    title: {
      fontSize: Typography.sizes.xxl,
      fontWeight: Typography.weights.extrabold,
      marginBottom: Spacing.sm,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: Typography.sizes.base,
      fontWeight: Typography.weights.regular,
      textAlign: 'center',
    },
    switchContainer: {
      flexDirection: 'row',
      borderRadius: BorderRadius.md,
      padding: Spacing.xs,
      marginBottom: Spacing.lg,
    },
    switchTab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: BorderRadius.sm,
    },
    switchTabText: {
      fontSize: Typography.sizes.sm,
      fontWeight: Typography.weights.semibold,
    },
    switchTabTextActive: {
      color: '#fff',
    },
    formCard: {
      width: '100%',
    },
    form: {
      width: '100%',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      marginBottom: Spacing.md,
      paddingHorizontal: Spacing.md,
    },
    inputIcon: {
      marginRight: Spacing.sm,
    },
    input: {
      flex: 1,
      height: 48,
      fontSize: Typography.sizes.base,
      paddingVertical: 0,
    },
    passwordEyeButton: {
      marginLeft: Spacing.xs,
    },
    registerButton: {
      marginTop: Spacing.md,
      marginBottom: Spacing.lg,
    },
  });
}
