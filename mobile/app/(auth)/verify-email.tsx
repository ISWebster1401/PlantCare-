import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { authAPI } from '../../services/api';

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
      <View style={styles.content}>
        <Text style={styles.title}>Verifica tu correo</Text>
        <Text style={styles.subtitle}>
          Te enviamos un código de 4 dígitos a tu email. Ingrésalo para activar tu cuenta.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />

        <TextInput
          style={styles.input}
          placeholder="Código de verificación (4 dígitos)"
          placeholderTextColor="#666"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={4}
          editable={!isLoading}
        />

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verificar código</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} disabled={isLoading}>
          <Text style={styles.linkText}>
            ¿No recibiste el código? <Text style={styles.linkBold}>Reenviar código</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/(auth)/login')} disabled={isLoading}>
          <Text style={[styles.linkText, { marginTop: 16 }]}>
            ← Volver al inicio de sesión
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1929',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4caf50',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#b0bec5',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: {
    backgroundColor: '#4caf50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkText: {
    color: '#b0bec5',
    textAlign: 'center',
    fontSize: 14,
  },
  linkBold: {
    color: '#4caf50',
    fontWeight: '600',
  },
});

