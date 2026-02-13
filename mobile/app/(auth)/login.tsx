/**
 * Pantalla de login - Rediseñada con DesignSystem
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { LoginCredentials } from '../../types';
import { Config } from '../../constants/Config';
import { Button, Card, Emoji } from '../../components/ui';
import { Colors, Typography, Spacing, BorderRadius, Gradients } from '../../constants/DesignSystem';

// Verificar si estamos en Expo Go (desarrollo) o en standalone build (producción)
const isStandalone = Constants.executionEnvironment === 'standalone' || Constants.executionEnvironment === 'storeClient';

// Necesario para completar el flujo de autenticación en el navegador
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();

  // Configurar redirect URI
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'plantcare',
    path: 'oauth',
    useProxy: false,
  });

  // Configurar Google OAuth
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: Config.GOOGLE_CLIENT_ID,
    redirectUri,
  });

  // Debug: Verificar configuración
  React.useEffect(() => {
    console.log('🔐 Google Auth Config:');
    console.log('  Client ID:', Config.GOOGLE_CLIENT_ID ? '✅ Configurado' : '❌ No configurado');
    console.log('  Redirect URI calculado:', redirectUri);
    if (request) {
      console.log('  Request: ✅ Preparado');
    } else {
      console.log('  Request: ⏳ Cargando...');
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

  // Manejar respuesta de Google
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
      style={styles.container}
    >
      <LinearGradient
        colors={Gradients.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Logo y título */}
          <View style={styles.header}>
            <Emoji name="plant" size={56} style={styles.emoji} />
            <Text style={styles.title}>PlantCare</Text>
            <Text style={styles.subtitle}>¡Cuida tus plantas de forma divertida!</Text>
          </View>

          {/* Formulario */}
          <Card variant="elevated" style={styles.formCard}>
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading && !googleLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Contraseña"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!isLoading && !googleLoading}
                />
              </View>

              <View style={styles.checkboxContainer}>
                <Button
                  title=""
                  onPress={() => setRememberMe(!rememberMe)}
                  variant="ghost"
                  size="sm"
                  icon={rememberMe ? 'checkbox' : 'checkbox-outline'}
                  iconPosition="left"
                  style={styles.checkboxButton}
                />
                <Text style={styles.checkboxLabel}>Recordarme</Text>
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
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>o</Text>
                    <View style={styles.dividerLine} />
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

              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>¿No tienes cuenta? </Text>
                <Button
                  title="Regístrate"
                  onPress={() => router.push('/(auth)/register')}
                  variant="ghost"
                  size="sm"
                  disabled={isLoading || googleLoading}
                />
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    marginBottom: Spacing.xl,
  },
  emoji: {
    fontSize: 64,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.sizes.giant,
    fontWeight: Typography.weights.extrabold,
    color: Colors.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
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
    backgroundColor: Colors.backgroundLighter,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.backgroundLighter,
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
    color: Colors.text,
    paddingVertical: 0,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  checkboxButton: {
    width: 40,
    height: 40,
    padding: 0,
  },
  checkboxLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  loginButton: {
    marginBottom: Spacing.md,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.backgroundLighter,
  },
  dividerText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    marginHorizontal: Spacing.md,
  },
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  registerText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
});
