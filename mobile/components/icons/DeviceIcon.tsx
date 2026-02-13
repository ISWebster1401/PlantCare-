/**
 * Icono SVG de dispositivo/enchufe - para sección Dispositivos
 */
import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

interface DeviceIconProps {
  size?: number;
  color?: string;
}

export function DeviceIcon({ size = 24, color = '#FFFFFF' }: DeviceIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="6" y="2" width="12" height="16" rx="2" stroke={color} strokeWidth="2" fill="none" />
      <Path d="M9 22h6M12 18v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M8 6h8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}
