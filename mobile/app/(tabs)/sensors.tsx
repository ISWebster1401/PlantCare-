/**
 * Pantalla de Sensores/Dispositivos (placeholder)
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SensorsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Pantalla de Dispositivos</Text>
      <Text style={styles.subtext}>Próximamente...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1929',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    color: '#b0bec5',
  },
});
