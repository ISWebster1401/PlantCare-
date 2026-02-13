/**
 * Pantalla de Verificación de Cambio de Email
 */
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

export default function ChangeEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ newEmail?: string }>();
  const { refreshUser } = useAuth();

  const [newEmail] = useState(params.newEmail || '');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleVerify = async () => {
    if (!code.trim() || code.trim().length !== 4) {
      Alert.alert('Error', 'Por favor ingresa el código de 4 dígitos');
      return;
    }

    if (!newEmail.trim()) {
      Alert.alert('Error', 'Email no válido');
      return;
    }

    setIsLoading(true);
    try {
      const updatedUser = await authAPI.confirmEmailChange(newEmail.trim(), code.trim());
      await refreshUser();
      Alert.alert(
        'Email actualizado',
        'Tu email ha sido cambiado exitosamente.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error confirmando cambio de email:', error);
      Alert.alert(
        'Error al verificar',
        error.response?.data?.detail || 'Código inválido o expirado.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!newEmail.trim()) {
      Alert.alert('Error', 'Email no válido');
      return;
    }

    setIsResending(true);
    try {
      await authAPI.requestEmailChange(newEmail.trim());
      Alert.alert('Código reenviado', 'Hemos enviado un nuevo código a tu correo.');
      setCode(''); // Limpiar código anterior
    } catch (error: any) {
      console.error('Error reenviando código:', error);
      Alert.alert(
        'Error al reenviar',
        error.response?.data?.detail || 'No se pudo reenviar el código.'
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verificar Nuevo Email</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Código de Verificación</Text>
        <Text style={styles.subtitle}>
          Te enviamos un código de 4 dígitos a:
        </Text>
        <Text style={styles.emailText}>{newEmail}</Text>
        <Text style={styles.subtitle}>
          Ingresa el código para confirmar el cambio de email.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Código (4 dígitos)"
          placeholderTextColor="#666"
          value={code}
          onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 4))}
          keyboardType="number-pad"
          maxLength={4}
          editable={!isLoading && !isResending}
          autoFocus
        />

        <TouchableOpacity
          style={[styles.button, (isLoading || code.length !== 4) && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={isLoading || code.length !== 4 || isResending}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.buttonText}>Verificar y Cambiar Email</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleResend}
          disabled={isLoading || isResending}
          style={styles.resendButton}
        >
          {isResending ? (
            <ActivityIndicator color="#4caf50" />
          ) : (
            <>
              <Ionicons name="refresh" size={16} color="#4caf50" />
              <Text style={styles.resendText}>
                ¿No recibiste el código? <Text style={styles.resendBold}>Reenviar código</Text>
              </Text>
            </>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
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
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 24,
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4caf50',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 6,
  },
  resendText: {
    color: '#b0bec5',
    textAlign: 'center',
    fontSize: 14,
  },
  resendBold: {
    color: '#4caf50',
    fontWeight: '600',
  },
});
