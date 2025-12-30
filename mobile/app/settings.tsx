/**
 * Pantalla de Configuración
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, themeMode, setThemeMode } = useTheme();

  const styles = createStyles(theme.colors);

  const handleToggleTheme = async (value: boolean) => {
    await setThemeMode(value ? 'light' : 'dark');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Sección de Apariencia */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Apariencia</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons 
                name={theme.mode === 'light' ? 'sunny' : 'moon'} 
                size={24} 
                color={theme.colors.icon} 
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Modo Claro</Text>
                <Text style={styles.settingDescription}>
                  Cambia entre tema claro y oscuro
                </Text>
              </View>
            </View>
            <Switch
              value={theme.mode === 'light'}
              onValueChange={handleToggleTheme}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.surface}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="color-palette-outline" size={24} color={theme.colors.icon} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Tema Actual</Text>
                <Text style={styles.settingDescription}>
                  {theme.mode === 'light' ? 'Modo Claro' : 'Modo Oscuro'}
                  {themeMode === 'system' && ' (Sistema)'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sección de Información */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="information-circle-outline" size={24} color={theme.colors.icon} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Acerca de</Text>
                <Text style={styles.settingDescription}>Versión y más información</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.iconSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="help-circle-outline" size={24} color={theme.colors.icon} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Ayuda</Text>
                <Text style={styles.settingDescription}>Soporte y preguntas frecuentes</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.iconSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
