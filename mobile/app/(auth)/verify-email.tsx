/**
 * Pantalla de verificación de email - Rediseñada con DesignSystem
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../../services/api';
import { Button, Card } from '../../components/ui';
import { Colors, Typography, Spacing, BorderRadius, Gradients } from '../../constants/DesignSystem';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState(params.email || '');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    if (!email.trim() || !code.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu email y el código de 4 dígitos.');
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.verifyCode(email.trim(), code.trim());
      Alert.alert(
        'Correo verificado',
        'Tu correo ha sido verificado correctamente. Ahora puedes iniciar sesión.',
        [
          {
            text: 'Ir al login',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Error al verificar',
        error.response?.data?.detail || error.message || 'Código inválido o expirado.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Ingresa tu email para reenviar el código.');
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.resendCode(email.trim());
      Alert.alert('Código reenviado', 'Hemos enviado un nuevo código a tu correo.');
    } catch (error: any) {
      Alert.alert(
        'Error al reenviar',
        error.response?.data?.detail || error.message || 'No se pudo reenviar el código.'
      );
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
          <View style={styles.header}>
            <Text style={styles.emoji}>✉️</Text>
            <Text style={styles.title}>Verifica tu correo</Text>
            <Text style={styles.subtitle}>
              Te enviamos un código de 4 dígitos a tu email. Ingrésalo para activar tu cuenta.
            </Text>
          </View>

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
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="key-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Código de verificación (4 dígitos)"
                  placeholderTextColor={Colors.textMuted}
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={4}
                  editable={!isLoading}
                />
              </View>

              <Button
                title="Verificar código"
                onPress={handleVerify}
                variant="primary"
                size="lg"
                loading={isLoading}
                disabled={isLoading}
                fullWidth
                style={styles.verifyButton}
              />

              <Button
                title="Reenviar código"
                onPress={handleResend}
                variant="ghost"
                size="md"
                disabled={isLoading}
                fullWidth
                style={styles.resendButton}
              />

              <Button
                title="← Volver al inicio de sesión"
                onPress={() => router.replace('/(auth)/login')}
                variant="ghost"
                size="sm"
                disabled={isLoading}
                fullWidth
              />
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
    fontSize: Typography.sizes.xxl,
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
    paddingHorizontal: Spacing.md,
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
  verifyButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  resendButton: {
    marginBottom: Spacing.md,
  },
});
