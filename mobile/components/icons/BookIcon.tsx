/**
 * Icono SVG de libro/plantadex - para títulos y empty state
 */
import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface BookIconProps {
  size?: number;
  color?: string;
  /** Si true, dibuja varios libros (estilo 📚) */
  stack?: boolean;
}

export function BookIcon({ size = 24, color = '#FFFFFF', stack = false }: BookIconProps) {
  if (stack) {
    // Tres libros juntos: cada uno con lomo (izq) + tapa (derecha)
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Libro 1 */}
        <Path d="M2 8h3v13H2V8z" fill={color} opacity={0.9} />
        <Path d="M5 8h2v13H5V8z" fill={color} />
        {/* Libro 2 */}
        <Path d="M9 5h3v16H9V5z" fill={color} opacity={0.95} />
        <Path d="M12 5h2v16h-2V5z" fill={color} />
        {/* Libro 3 */}
        <Path d="M16 4h3v17h-3V4z" fill={color} />
        <Path d="M19 4h2v17h-2V4z" fill={color} opacity={0.9} />
      </Svg>
    );
  }
  // Un solo libro cerrado (lomo + tapa)
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 2h2v20H4V2z" fill={color} opacity={0.9} />
      <Path d="M6 2h14v20H6V2z" fill={color} />
    </Svg>
  );
}
