/**
 * Texto con emoji SVG - Muestra un emoji junto a texto.
 */
import React from 'react';
import { View, Text, TextStyle, ViewStyle } from 'react-native';
import { Emoji } from './Emoji';
import type { EmojiName } from './Emoji';

export interface TextWithEmojiProps {
  emoji: EmojiName;
  text: string;
  emojiSize?: number;
  textStyle?: TextStyle;
  style?: ViewStyle;
  emojiPosition?: 'left' | 'right';
}

export const TextWithEmoji: React.FC<TextWithEmojiProps> = ({
  emoji,
  text,
  emojiSize = 20,
  textStyle,
  style,
  emojiPosition = 'left',
}) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
    {emojiPosition === 'left' && (
      <Emoji name={emoji} size={emojiSize} style={{ marginRight: 8 }} />
    )}
    <Text style={textStyle}>{text}</Text>
    {emojiPosition === 'right' && (
      <Emoji name={emoji} size={emojiSize} style={{ marginLeft: 8 }} />
    )}
  </View>
);

export default TextWithEmoji;
