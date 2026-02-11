/**
 * Componente Emoji - Renderiza emojis como SVGs Twemoji desde CDN.
 * Consistencia visual con la app móvil.
 */
import React from 'react';

const TWEMOJI_CDN = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg';

// Mapa: nombre -> codepoint hexadecimal (sin U+)
const emojiCodepoints: Record<string, string> = {
  plant: '1f331',
  seedling: '1f331',
  droplet: '1f4a7',
  water: '1f4a7',
  sun: '2600',
  thermometer: '1f321',
  grape: '1f347',
  leaf: '1f33c',
  happy: '1f60a',
  thirsty: '1f630',
  sick: '1f912',
  sleeping: '1f634',
  excited: '1f929',
  loved: '1f970',
  check: '2705',
  warning: '26a0',
  alert: '1f6a8',
  star: '2b50',
  fire: '1f525',
  sparkles: '2728',
  heart: '2764',
  clock: '23f0',
  calendar: '1f4c5',
  camera: '1f4f7',
  microphone: '1f3a4',
  settings: '2699',
  notification: '1f514',
  envelope: '2709',
  email: '2709',
};

export type EmojiName = keyof typeof emojiCodepoints;

export interface EmojiProps {
  name: EmojiName | string;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

export const Emoji: React.FC<EmojiProps> = ({
  name,
  size = 24,
  style,
  className,
}) => {
  const codepoint = emojiCodepoints[name];

  if (!codepoint) {
    return null;
  }

  const src = `${TWEMOJI_CDN}/${codepoint}.svg`;

  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style,
      }}
      className={className}
      draggable={false}
    />
  );
};

export default Emoji;
