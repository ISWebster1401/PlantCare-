/**
 * Componentes para animar items de listas con stagger effect.
 * Cada item aparece con un delay progresivo según su index.
 */
import React from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
  SlideInRight,
  Layout,
} from 'react-native-reanimated';

interface AnimatedListItemProps {
  children: React.ReactNode;
  index: number;
  style?: ViewStyle;
}

/** Items que aparecen desde abajo con stagger (para listas verticales). */
export const AnimatedListItem: React.FC<AnimatedListItemProps> = ({
  children,
  index,
  style,
}) => (
  <Animated.View
    entering={FadeInDown.duration(400).delay(index * 80).springify()}
    exiting={FadeOutDown.duration(300)}
    layout={Layout.springify()}
    style={style}
  >
    {children}
  </Animated.View>
);

/** Items que aparecen desde la derecha con stagger (para listas horizontales). */
export const AnimatedHorizontalItem: React.FC<AnimatedListItemProps> = ({
  children,
  index,
  style,
}) => (
  <Animated.View
    entering={SlideInRight.duration(400).delay(index * 100).springify()}
    layout={Layout.springify()}
    style={style}
  >
    {children}
  </Animated.View>
);
