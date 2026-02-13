/**
 * Componente SVG para icono de IA amigable con temática de plantas
 * Diseño de hoja sonriente y simpática
 */
import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface PlantAIIconProps {
  size?: number;
  color?: string;
}

export const PlantAIIcon: React.FC<PlantAIIconProps> = ({ size = 24, color = '#9c27b0' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Hoja principal */}
      <Path
        d="M12 3C8 3 5 6 5 10c0 2 1 3.5 2 4.5v1c0 .5.5 1 1 1h4c.5 0 1-.5 1-1v-1c1-1 2-2.5 2-4.5 0-4-3-7-7-7z"
        fill={color}
      />
      {/* Ojos sonrientes */}
      <Circle cx="9.5" cy="10" r="1.2" fill="#fff" />
      <Circle cx="14.5" cy="10" r="1.2" fill="#fff" />
      {/* Sonrisa amigable */}
      <Path
        d="M9 12.5 Q12 14.5 15 12.5"
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Tallo de la hoja */}
      <Path
        d="M12 17 L12 19"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
};
