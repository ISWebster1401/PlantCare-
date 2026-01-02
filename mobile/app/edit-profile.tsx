/**
 * Pantalla de Editar Perfil
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
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../services/api';

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  
  const styles = createStyles(theme.colors);

  const handleSaveName = async () => {
    if (!fullName.trim() || fullName.trim() === user?.full_name) {
      return;
    }

    if (fullName.trim().length < 2) {
      Alert.alert('Error', 'El nombre debe tener al menos 2 caracteres');
      return;
    }

    setIsSaving(true);
    try {
      const updatedUser = await authAPI.updateMe(fullName.trim());
      try {
        await refreshUser();
      } catch (refreshError) {
        // Si refreshUser falla (puede ser por token expirado), no es crítico
        // El usuario ya se actualizó en el backend
        console.warn('No se pudo refrescar usuario, pero la actualización fue exitosa:', refreshError);
      }
      Alert.alert('Éxito', 'Nombre actualizado correctamente');
    } catch (error: any) {
      console.error('Error actualizando nombre:', error);
      // Si es 401, el interceptor ya limpió la sesión
      if (error.response?.status === 401 || error.response?.status === 403) {
        Alert.alert(
          'Sesión expirada',
          'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
        );
        router.replace('/(auth)/login');
      } else {
        Alert.alert(
          'Error',
          error.response?.data?.detail || 'No se pudo actualizar el nombre'
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeEmail = async () => {
    Alert.prompt(
      'Cambiar Email',
      'Ingresa tu nuevo email. Te enviaremos un código de verificación.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Continuar',
          onPress: async (newEmail) => {
            if (!newEmail || !newEmail.trim()) {
              return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(newEmail.trim())) {
              Alert.alert('Error', 'Por favor ingresa un email válido');
              return;
            }

            if (newEmail.trim().toLowerCase() === user?.email.toLowerCase()) {
              Alert.alert('Error', 'El nuevo email debe ser diferente al actual');
              return;
            }

            setIsChangingEmail(true);
            try {
              const response = await authAPI.requestEmailChange(newEmail.trim());
              router.push({
                pathname: '/change-email',
                params: { newEmail: newEmail.trim() },
              });
            } catch (error: any) {
              console.error('Error solicitando cambio de email:', error);
              Alert.alert(
                'Error',
                error.response?.data?.detail || 'No se pudo solicitar el cambio de email'
              );
            } finally {
              setIsChangingEmail(false);
            }
          },
        },
      ],
      'plain-text',
      undefined,
      'email-address'
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Sección de Nombre */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nombre</Text>
          <TextInput
            style={styles.input}
            placeholder="Tu nombre completo"
            placeholderTextColor={theme.colors.textTertiary}
            value={fullName}
            onChangeText={setFullName}
            editable={!isSaving}
          />
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.buttonDisabled]}
            onPress={handleSaveName}
            disabled={isSaving || fullName.trim() === user?.full_name || !fullName.trim()}
          >
            {isSaving ? (
              <ActivityIndicator color={theme.colors.text} />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color={theme.colors.text} />
                <Text style={styles.saveButtonText}>Guardar Nombre</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Sección de Email */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email</Text>
          <View style={styles.emailContainer}>
            <View style={styles.emailInfo}>
              <Text style={styles.emailText}>{user?.email}</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
                <Text style={styles.verifiedText}>Verificado</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.changeEmailButton, isChangingEmail && styles.buttonDisabled]}
              onPress={handleChangeEmail}
              disabled={isChangingEmail}
            >
              {isChangingEmail ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : (
                <>
                  <Ionicons name="mail-outline" size={20} color={theme.colors.primary} />
                  <Text style={styles.changeEmailText}>Cambiar Email</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  saveButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  emailContainer: {
    gap: 12,
  },
  emailInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emailText: {
    fontSize: 16,
    color: colors.textSecondary,
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 12,
  },
  verifiedText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  changeEmailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: colors.primary,
    gap: 8,
  },
  changeEmailText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
