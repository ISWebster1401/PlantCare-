/**
 * Componente Emoji - Renderiza emojis como SVGs Twemoji.
 * Reemplaza emojis Unicode por componentes SVG para consistencia visual.
 */
import React from 'react';
import { View, ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import PlantSvg from '../../assets/emojis/plant.svg';
import DropletSvg from '../../assets/emojis/droplet.svg';
import SunSvg from '../../assets/emojis/sun.svg';
import ThermometerSvg from '../../assets/emojis/thermometer.svg';
import GrapeSvg from '../../assets/emojis/grape.svg';
import LeafSvg from '../../assets/emojis/leaf.svg';
import HappySvg from '../../assets/emojis/happy.svg';
import ThirstySvg from '../../assets/emojis/thirsty.svg';
import SickSvg from '../../assets/emojis/sick.svg';
import SleepingSvg from '../../assets/emojis/sleeping.svg';
import ExcitedSvg from '../../assets/emojis/excited.svg';
import LovedSvg from '../../assets/emojis/loved.svg';
import CheckSvg from '../../assets/emojis/check.svg';
import WarningSvg from '../../assets/emojis/warning.svg';
import AlertSvg from '../../assets/emojis/alert.svg';
import StarSvg from '../../assets/emojis/star.svg';
import FireSvg from '../../assets/emojis/fire.svg';
import SparklesSvg from '../../assets/emojis/sparkles.svg';
import HeartSvg from '../../assets/emojis/heart.svg';
import ClockSvg from '../../assets/emojis/clock.svg';
import CalendarSvg from '../../assets/emojis/calendar.svg';
import CameraSvg from '../../assets/emojis/camera.svg';
import MicrophoneSvg from '../../assets/emojis/microphone.svg';
import SettingsSvg from '../../assets/emojis/settings.svg';
import NotificationSvg from '../../assets/emojis/notification.svg';
import EnvelopeSvg from '../../assets/emojis/envelope.svg';

const emojiMap: Record<string, React.FC<SvgProps>> = {
  plant: PlantSvg,
  seedling: PlantSvg,
  droplet: DropletSvg,
  water: DropletSvg,
  sun: SunSvg,
  thermometer: ThermometerSvg,
  grape: GrapeSvg,
  leaf: LeafSvg,
  happy: HappySvg,
  thirsty: ThirstySvg,
  sick: SickSvg,
  sleeping: SleepingSvg,
  excited: ExcitedSvg,
  loved: LovedSvg,
  check: CheckSvg,
  warning: WarningSvg,
  alert: AlertSvg,
  star: StarSvg,
  fire: FireSvg,
  sparkles: SparklesSvg,
  heart: HeartSvg,
  clock: ClockSvg,
  calendar: CalendarSvg,
  camera: CameraSvg,
  microphone: MicrophoneSvg,
  settings: SettingsSvg,
  notification: NotificationSvg,
  envelope: EnvelopeSvg,
  email: EnvelopeSvg,
};

const unicodeToName: Record<string, string> = {
  '🌱': 'plant',
  '💧': 'droplet',
  '☀️': 'sun',
  '🌡️': 'thermometer',
  '🍇': 'grape',
  '🍃': 'leaf',
  '😊': 'happy',
  '😰': 'thirsty',
  '🤒': 'sick',
  '😴': 'sleeping',
  '🤩': 'excited',
  '🥰': 'loved',
  '✅': 'check',
  '⚠️': 'warning',
  '🚨': 'alert',
  '⭐': 'star',
  '🔥': 'fire',
  '✨': 'sparkles',
  '❤️': 'heart',
  '⏰': 'clock',
  '📅': 'calendar',
  '📷': 'camera',
  '🎤': 'microphone',
  '⚙️': 'settings',
  '🔔': 'notification',
  '✉️': 'envelope',
};

export type EmojiName = keyof typeof emojiMap;

export interface EmojiProps {
  name: EmojiName | string;
  size?: number;
  style?: ViewStyle;
  color?: string;
}

export const Emoji: React.FC<EmojiProps> = ({
  name,
  size = 24,
  style,
  color,
}) => {
  const emojiName = unicodeToName[name] || name;
  const SvgComponent = emojiMap[emojiName];

  if (!SvgComponent) {
    return null;
  }

  return (
    <View style={style}>
      <SvgComponent
        width={size}
        height={size}
        {...(color && { fill: color } as SvgProps)}
      />
    </View>
  );
};

export const InlineEmoji: React.FC<EmojiProps> = (props) => (
  <Emoji {...props} style={[{ marginHorizontal: 2 }, props.style]} />
);

export default Emoji;
