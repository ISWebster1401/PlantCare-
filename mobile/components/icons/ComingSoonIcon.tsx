/**
 * Icono SVG "próximamente" - reloj/calendario estilizado
 */
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

interface ComingSoonIconProps {
  size?: number;
  color?: string;
}

export function ComingSoonIcon({ size = 24, color = '#FFFFFF' }: ComingSoonIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none" />
      <Path d="M12 6v6l4 2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
