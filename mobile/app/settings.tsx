/**
 * Pantalla de Configuración - Rediseñada con DesignSystem
 * 
 * Nota: Como eliminamos ThemeContext, esta pantalla ahora solo muestra información
 * El tema se maneja a nivel del sistema operativo
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from '../components/ui';
import { Colors, Typography, Spacing, Gradients } from '../constants/DesignSystem';

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Gradients.ocean}
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
        <Text style={styles.headerTitle}>⚙️ Configuración</Text>
        <View style={styles.backButtonPlaceholder} />
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Card variant="elevated" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={24} color={Colors.secondary} />
            <Text style={styles.sectionTitle}>Información</Text>
          </View>
          
          <Button
            title="Acerca de"
            onPress={() => {}}
            variant="ghost"
            size="md"
            icon="information-circle-outline"
            iconPosition="left"
            fullWidth
            style={styles.menuItem}
          />
          <View style={styles.divider} />
          <Button
            title="Ayuda"
            onPress={() => {}}
            variant="ghost"
            size="md"
            icon="help-circle-outline"
            iconPosition="left"
            fullWidth
            style={styles.menuItem}
          />
        </Card>
      </ScrollView>
    </View>
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  menuItem: {
    justifyContent: 'flex-start',
    paddingVertical: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.backgroundLighter,
    marginVertical: Spacing.xs,
  },
});
