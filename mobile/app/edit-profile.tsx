/**
 * Pantalla de Editar Perfil - Rediseñada con DesignSystem
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { Button, Card } from '../components/ui';
import { Colors, Typography, Spacing, BorderRadius, Gradients } from '../constants/DesignSystem';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState((user as any)?.phone || '');
  const [bio, setBio] = useState((user as any)?.bio || '');
  const [location, setLocation] = useState((user as any)?.location || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);

  const handleSaveField = async (field: 'full_name' | 'phone' | 'bio' | 'location', value: string) => {
    const trimmedValue = value.trim();
    
    if (field === 'full_name' && trimmedValue.length < 2) {
      Alert.alert('Error', 'El nombre debe tener al menos 2 caracteres');
      return;
    }
    
    if (field === 'phone' && trimmedValue && trimmedValue.length > 20) {
      Alert.alert('Error', 'El teléfono no puede tener más de 20 caracteres');
      return;
    }
    
    if (field === 'bio' && trimmedValue.length > 500) {
      Alert.alert('Error', 'La biografía no puede tener más de 500 caracteres');
      return;
    }
    
    if (field === 'location' && trimmedValue.length > 100) {
      Alert.alert('Error', 'La ubicación no puede tener más de 100 caracteres');
      return;
    }

    const currentValue = field === 'full_name' ? user?.full_name : (user as any)?.[field] || '';
    if (trimmedValue === currentValue) {
      return;
    }

    setSavingField(field);
    setIsSaving(true);
    try {
      const updateData: any = { [field]: trimmedValue || null };
      await authAPI.updateMe(updateData);
      try {
        await refreshUser();
      } catch (refreshError) {
        console.warn('No se pudo refrescar usuario, pero la actualización fue exitosa:', refreshError);
      }
      Alert.alert('Éxito', `${field === 'full_name' ? 'Nombre' : field === 'phone' ? 'Teléfono' : field === 'bio' ? 'Biografía' : 'Ubicación'} actualizado correctamente`);
    } catch (error: any) {
      console.error(`Error actualizando ${field}:`, error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        Alert.alert('Sesión expirada', 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        router.replace('/(auth)/login');
      } else {
        Alert.alert('Error', error.response?.data?.detail || `No se pudo actualizar ${field === 'full_name' ? 'el nombre' : field === 'phone' ? 'el teléfono' : field === 'bio' ? 'la biografía' : 'la ubicación'}`);
      }
    } finally {
      setIsSaving(false);
      setSavingField(null);
    }
  };

  const handleChangeEmail = async () => {
    Alert.prompt(
      'Cambiar Email',
      'Ingresa tu nuevo email. Te enviaremos un código de verificación.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          onPress: async (newEmail) => {
            if (!newEmail || !newEmail.trim()) return;

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
              await authAPI.requestEmailChange(newEmail.trim());
              router.push({
                pathname: '/change-email',
                params: { newEmail: newEmail.trim() },
              });
            } catch (error: any) {
              console.error('Error solicitando cambio de email:', error);
              Alert.alert('Error', error.response?.data?.detail || 'No se pudo solicitar el cambio de email');
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
      <LinearGradient
        colors={Gradients.primary}
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
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <View style={styles.backButtonPlaceholder} />
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Card variant="elevated" style={styles.section}>
          <Text style={styles.sectionTitle}>Nombre</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Tu nombre completo"
              placeholderTextColor={Colors.textMuted}
              value={fullName}
              onChangeText={setFullName}
              editable={!isSaving}
            />
          </View>
          <Button
            title="Guardar Nombre"
            onPress={() => handleSaveField('full_name', fullName)}
            variant="primary"
            size="md"
            loading={isSaving && savingField === 'full_name'}
            disabled={isSaving || fullName.trim() === user?.full_name || !fullName.trim()}
            icon="checkmark"
            iconPosition="left"
            fullWidth
            style={styles.saveButton}
          />
        </Card>

        <Card variant="elevated" style={styles.section}>
          <Text style={styles.sectionTitle}>Teléfono</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Tu número de teléfono (opcional)"
              placeholderTextColor={Colors.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!isSaving}
            />
          </View>
          <Button
            title="Guardar Teléfono"
            onPress={() => handleSaveField('phone', phone)}
            variant="primary"
            size="md"
            loading={isSaving && savingField === 'phone'}
            disabled={isSaving || phone.trim() === ((user as any)?.phone || '')}
            icon="checkmark"
            iconPosition="left"
            fullWidth
            style={styles.saveButton}
          />
        </Card>

        <Card variant="elevated" style={styles.section}>
          <Text style={styles.sectionTitle}>Biografía</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="document-text-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Cuéntanos sobre ti (opcional, máx. 500 caracteres)"
              placeholderTextColor={Colors.textMuted}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              maxLength={500}
              editable={!isSaving}
            />
          </View>
          <Text style={styles.charCount}>{bio.length}/500</Text>
          <Button
            title="Guardar Biografía"
            onPress={() => handleSaveField('bio', bio)}
            variant="primary"
            size="md"
            loading={isSaving && savingField === 'bio'}
            disabled={isSaving || bio.trim() === ((user as any)?.bio || '')}
            icon="checkmark"
            iconPosition="left"
            fullWidth
            style={styles.saveButton}
          />
        </Card>

        <Card variant="elevated" style={styles.section}>
          <Text style={styles.sectionTitle}>Ubicación</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Tu ubicación (opcional, ej: Ciudad, País)"
              placeholderTextColor={Colors.textMuted}
              value={location}
              onChangeText={setLocation}
              editable={!isSaving}
              maxLength={100}
            />
          </View>
          <Button
            title="Guardar Ubicación"
            onPress={() => handleSaveField('location', location)}
            variant="primary"
            size="md"
            loading={isSaving && savingField === 'location'}
            disabled={isSaving || location.trim() === ((user as any)?.location || '')}
            icon="checkmark"
            iconPosition="left"
            fullWidth
            style={styles.saveButton}
          />
        </Card>

        <Card variant="elevated" style={styles.section}>
          <Text style={styles.sectionTitle}>Email</Text>
          <View style={styles.emailContainer}>
            <View style={styles.emailInfo}>
              <Text style={styles.emailText}>{user?.email}</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                <Text style={styles.verifiedText}>Verificado</Text>
              </View>
            </View>
            <Button
              title="Cambiar Email"
              onPress={handleChangeEmail}
              variant="secondary"
              size="md"
              loading={isChangingEmail}
              disabled={isChangingEmail}
              icon="mail-outline"
              iconPosition="left"
              fullWidth
              style={styles.changeEmailButton}
            />
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    paddingTop: 60,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  backButton: {
    width: 40,
    height: 40,
    padding: 0,
  },
  backButtonPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: Spacing.md,
  },
  charCount: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    textAlign: 'right',
    marginBottom: Spacing.sm,
  },
  saveButton: {
    marginTop: Spacing.xs,
  },
  emailContainer: {
    gap: Spacing.md,
  },
  emailInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.backgroundLighter,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.backgroundLighter,
  },
  emailText: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginLeft: Spacing.md,
  },
  verifiedText: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
  },
  changeEmailButton: {
    marginTop: Spacing.xs,
  },
});
