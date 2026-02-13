/**
 * Pasto decorativo en la parte inferior - estilo Pokémon GO (soporta tema)
 */
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useThemeColors } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');
const BLADE_WIDTH = 14;
const BLADES = Math.ceil(width / BLADE_WIDTH) + 4;

export function GrassFooter() {
  const colors = useThemeColors();
  return (
    <View style={styles.container}>
      {Array.from({ length: BLADES }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.blade,
            {
              width: BLADE_WIDTH,
              marginLeft: i === 0 ? 0 : -BLADE_WIDTH / 2,
              height: 24 + (i % 5) * 4,
              backgroundColor:
                i % 3 === 0
                  ? colors.primary
                  : i % 3 === 1
                  ? colors.primaryLight
                  : colors.primaryDark,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    height: 32,
    overflow: 'hidden',
  },
  blade: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    opacity: 0.9,
  },
});
