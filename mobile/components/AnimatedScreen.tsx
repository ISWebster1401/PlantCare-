/**
 * Wrapper que agrega animaciones de entrada/salida a cualquier pantalla.
 * Usa Reanimated layout animations para transiciones fluidas.
 */
import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  FadeOutUp,
  SlideInRight,
  SlideOutLeft,
  SlideInDown,
  SlideOutDown,
  ZoomIn,
  ZoomOut,
  BounceIn,
} from 'react-native-reanimated';

type AnimationType =
  | 'fade'
  | 'fadeUp'
  | 'fadeDown'
  | 'slideRight'
  | 'slideUp'
  | 'zoom'
  | 'bounce';

interface AnimatedScreenProps {
  children: React.ReactNode;
  animation?: AnimationType;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
}

const animationMap = {
  fade:       { entering: FadeIn,       exiting: FadeOut },
  fadeUp:     { entering: FadeInUp,     exiting: FadeOutDown },
  fadeDown:   { entering: FadeInDown,   exiting: FadeOutUp },
  slideRight: { entering: SlideInRight, exiting: SlideOutLeft },
  slideUp:    { entering: SlideInDown,  exiting: SlideOutDown },
  zoom:       { entering: ZoomIn,       exiting: ZoomOut },
  bounce:     { entering: BounceIn,     exiting: FadeOut },
};

export const AnimatedScreen: React.FC<AnimatedScreenProps> = ({
  children,
  animation = 'fade',
  duration = 400,
  delay = 0,
  style,
}) => {
  const { entering, exiting } = animationMap[animation];

  return (
    <Animated.View
      entering={entering.duration(duration).delay(delay)}
      exiting={exiting.duration(Math.round(duration * 0.8))}
      style={[styles.container, style]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AnimatedScreen;
