/**
 * Pantalla de Sensores/Dispositivos (placeholder)
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function SensorsScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme.colors);
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Pantalla de Dispositivos</Text>
      <Text style={styles.subtext}>Próximamente...</Text>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 20,
    color: colors.text,
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
