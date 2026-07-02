/**
 * Pantalla de login - Rediseñada con DesignSystem + Tema dinámico
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
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { LoginCredentials } from '../../types';
import { Config } from '../../constants/Config';
import { Button, Card, Emoji } from '../../components/ui';
import { Typography, Spacing, BorderRadius } from '../../constants/DesignSystem';
import { useTheme, useThemeColors, useThemeGradients } from '../../context/ThemeContext';

const isStandalone = Constants.executionEnvironment === 'standalone' || Constants.executionEnvironment === 'storeClient';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { login, loginWithGoogle } = useAuth();
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

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'plantcare',
    path: 'oauth',
    useProxy: false,
  });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: Config.GOOGLE_CLIENT_ID,
    redirectUri,
  });

  React.useEffect(() => {
    console.log('[AUTH] Google Auth Config:');
    console.log('  Client ID:', Config.GOOGLE_CLIENT_ID ? 'Configured' : 'Not configured');
    console.log('  Redirect URI:', redirectUri);
    if (request) {
      console.log('  Request: Ready');
    } else {
      console.log('  Request: Loading...');
    }
  }, [request, redirectUri]);

  const handleGoogleLogin = React.useCallback(async (idToken: string) => {
    if (!Config.GOOGLE_CLIENT_ID) {
      Alert.alert('Error', 'Google Sign-In no está configurado');
      return;
    }

    setGoogleLoading(true);
    try {
      await loginWithGoogle(idToken);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error de inicio de sesión', error.message || 'No se pudo iniciar sesión con Google');
    } finally {
      setGoogleLoading(false);
    }
  }, [loginWithGoogle, router]);

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        handleGoogleLogin(id_token);
      }
    } else if (response?.type === 'error') {
      setGoogleLoading(false);
      const errorMessage = response.error?.message || 'No se pudo autenticar con Google';
      Alert.alert('Error', errorMessage);
      console.error('Google Auth Error:', response.error);
    }
  }, [response, handleGoogleLogin]);

  const handleGooglePress = async () => {
    if (!Config.GOOGLE_CLIENT_ID) {
      Alert.alert('Error', 'Google Sign-In no está configurado');
      return;
    }
    if (!request) {
      Alert.alert('Error', 'Google Sign-In aún no está listo. Por favor espera un momento.');
      return;
    }
    setGoogleLoading(true);
    try {
      const result = await promptAsync();
      if (result.type === 'dismiss') {
        setGoogleLoading(false);
      }
    } catch (error: any) {
      setGoogleLoading(false);
      Alert.alert('Error', 'No se pudo abrir la autenticación de Google');
      console.error('Prompt error:', error);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setIsLoading(true);
    try {
      const credentials: LoginCredentials = {
        email: email.trim(),
        password,
        remember_me: rememberMe,
      };

      await login(credentials);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error de inicio de sesión', error.message || 'No se pudo iniciar sesión');
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
            <Text style={[styles.title, { color: colors.primary }]}>PlantCare</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              ¡Cuida tus plantas de forma divertida!
            </Text>
          </View>

          {/* Toggle Login / Registro */}
          <View style={[styles.switchContainer, { backgroundColor: colors.backgroundLighter }]}>
            <TouchableOpacity style={[styles.switchTab, { backgroundColor: colors.primary }]}>
              <Text style={[styles.switchTabText, styles.switchTabTextActive]}>Iniciar Sesión</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.switchTab}
              onPress={() => router.replace('/(auth)/register')}
              disabled={isLoading || googleLoading}
            >
              <Text style={[styles.switchTabText, { color: colors.textSecondary }]}>Crear Cuenta</Text>
            </TouchableOpacity>
          </View>

          <Card variant="elevated" style={styles.formCard}>
            <View style={styles.form}>
              <View style={[styles.inputContainer, { backgroundColor: colors.backgroundLighter, borderColor: colors.backgroundLighter }]}>
                <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Email"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading && !googleLoading}
                />
              </View>

              <View style={[styles.inputContainer, { backgroundColor: colors.backgroundLighter, borderColor: colors.backgroundLighter }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Contraseña"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!isLoading && !googleLoading}
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

              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  onPress={() => setRememberMe(!rememberMe)}
                  style={styles.rememberMeButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  disabled={isLoading || googleLoading}
                >
                  <Ionicons
                    name={rememberMe ? 'checkbox' : 'checkbox-outline'}
                    size={20}
                    color={colors.primary}
                  />
                </TouchableOpacity>
                <Text style={[styles.checkboxLabel, { color: colors.textSecondary }]}>Recordarme</Text>
              </View>

              <Button
                title="Iniciar Sesión"
                onPress={handleLogin}
                variant="primary"
                size="lg"
                loading={isLoading}
                disabled={isLoading || googleLoading}
                fullWidth
                style={styles.loginButton}
              />

              {Config.GOOGLE_CLIENT_ID && isStandalone && (
                <>
                  <View style={styles.divider}>
                    <View style={[styles.dividerLine, { backgroundColor: colors.backgroundLighter }]} />
                    <Text style={[styles.dividerText, { color: colors.textMuted }]}>ó</Text>
                    <View style={[styles.dividerLine, { backgroundColor: colors.backgroundLighter }]} />
                  </View>

                  <Button
                    title="Continuar con Google"
                    onPress={handleGooglePress}
                    variant="secondary"
                    size="lg"
                    loading={googleLoading}
                    disabled={isLoading || googleLoading || !request}
                    icon="logo-google"
                    iconPosition="left"
                    fullWidth
                  />
                </>
              )}
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
      fontSize: Typography.sizes.giant,
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
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    rememberMeButton: {
      width: 28,
      height: 28,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxLabel: {
      fontSize: Typography.sizes.sm,
      marginLeft: Spacing.xs,
    },
    loginButton: {
      marginBottom: Spacing.sm,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: Spacing.md,
    },
    dividerLine: {
      flex: 1,
      height: 1,
    },
    dividerText: {
      fontSize: Typography.sizes.sm,
      marginHorizontal: Spacing.md,
    },
    passwordEyeButton: {
      marginLeft: Spacing.xs,
    },
  });
}
