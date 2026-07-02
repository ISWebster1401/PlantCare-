/**
 * Pasto decorativo en la parte inferior - estilo Pokémon GO (SVG ondulado, 3 capas)
 */
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

interface GrassFooterProps {
  isDark?: boolean;
}

export function GrassFooter({ isDark: isDarkProp }: GrassFooterProps) {
  const { isDark: themeDark } = useTheme();
  const isDark = isDarkProp ?? themeDark;

  const grassColors = isDark
    ? { front: '#1B5E20', middle: '#2E7D32', back: '#388E3C' }
    : { front: '#4CAF50', middle: '#66BB6A', back: '#81C784' };

  return (
    <View style={styles.container}>
      <Svg width={width} height={120} viewBox={`0 0 ${width} 120`}>
        <Defs>
          <LinearGradient id="grassGradient1" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={grassColors.front} />
            <Stop offset="100%" stopColor={isDark ? '#0D1F0D' : '#2E7D32'} />
          </LinearGradient>
          <LinearGradient id="grassGradient2" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={grassColors.middle} />
            <Stop offset="100%" stopColor={grassColors.front} />
          </LinearGradient>
          <LinearGradient id="grassGradient3" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={grassColors.back} />
            <Stop offset="100%" stopColor={grassColors.middle} />
          </LinearGradient>
        </Defs>

        <Path
          d={`M0,60 Q${width * 0.25},40 ${width * 0.5},55 T${width},50 L${width},120 L0,120 Z`}
          fill="url(#grassGradient3)"
        />
        <Path
          d={`M0,75 Q${width * 0.3},55 ${width * 0.6},70 T${width},65 L${width},120 L0,120 Z`}
          fill="url(#grassGradient2)"
        />
        <Path
          d={`M0,90 Q${width * 0.2},75 ${width * 0.4},85 T${width},80 L${width},120 L0,120 Z`}
          fill="url(#grassGradient1)"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
