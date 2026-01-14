/**
 * Componente SVG para icono de IA
 * Reemplaza el emoji de robot por un SVG limpio y moderno
 */
import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface AIIconProps {
  size?: number;
  color?: string;
}

export const AIIcon: React.FC<AIIconProps> = ({ size = 24, color = '#9c27b0' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Cabeza del robot - forma redondeada */}
      <Path
        d="M12 3C8.13 3 5 6.13 5 10c0 2.5 1.25 4.75 3.25 6V18c0 .55.45 1 1 1h5.5c.55 0 1-.45 1-1v-2c2-1.25 3.25-3.5 3.25-6 0-3.87-3.13-7-7-7z"
        fill={color}
      />
      {/* Ojos */}
      <Circle cx="9" cy="10" r="1.5" fill="#fff" />
      <Circle cx="15" cy="10" r="1.5" fill="#fff" />
      {/* Boca - línea curva sonriente */}
      <Path
        d="M9 13.5 Q12 15.5 15 13.5"
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
};
