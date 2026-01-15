/**
 * PlantAvatar Component - Estilo Duolingo/Pokémon
 * 
 * Avatar circular de planta con animaciones según mood y glow effect
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, Image, ImageSourcePropType } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { Text } from 'react-native';
import { Colors, BorderRadius, Shadows, PlantMoods, PlantMoodType, HealthStatuses, HealthStatus } from '../../constants/DesignSystem';

export interface PlantAvatarProps {
  imageUrl?: string;
  imageSource?: ImageSourcePropType;
  mood?: PlantMoodType;
  healthStatus?: HealthStatus;
  size?: number;
  showMoodEmoji?: boolean;
  showGlow?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedImage = Animated.createAnimatedComponent(Image);

export const PlantAvatar: React.FC<PlantAvatarProps> = ({
  imageUrl,
  imageSource,
  mood = 'happy',
  healthStatus = 'healthy',
  size = 80,
  showMoodEmoji = true,
  showGlow = true,
  style,
  accessibilityLabel,
}) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const glowOpacity = useSharedValue(0.5);

  const moodConfig = PlantMoods[mood];
  const healthConfig = HealthStatuses[healthStatus];
  const borderColor = healthConfig.color;

  useEffect(() => {
    // Animación según el mood
    switch (moodConfig.animation) {
      case 'bounce':
        scale.value = withRepeat(
          withSequence(
            withSpring(1.1, { damping: 8, stiffness: 200 }),
            withSpring(1, { damping: 8, stiffness: 200 })
          ),
          -1,
          true
        );
        break;
      case 'shake':
        translateX.value = withRepeat(
          withSequence(
            withTiming(-5, { duration: 100 }),
            withTiming(5, { duration: 100 }),
            withTiming(-5, { duration: 100 }),
            withTiming(0, { duration: 100 })
          ),
          -1,
          false
        );
        break;
      case 'wobble':
        rotation.value = withRepeat(
          withSequence(
            withTiming(-5, { duration: 200 }),
            withTiming(5, { duration: 200 }),
            withTiming(-5, { duration: 200 }),
            withTiming(0, { duration: 200 })
          ),
          -1,
          false
        );
        break;
      case 'pulse':
        scale.value = withRepeat(
          withSequence(
            withTiming(1.05, { duration: 800 }),
            withTiming(1, { duration: 800 })
          ),
          -1,
          false
        );
        break;
      case 'jump':
        translateY.value = withRepeat(
          withSequence(
            withSpring(-8, { damping: 5, stiffness: 200 }),
            withSpring(0, { damping: 5, stiffness: 200 })
          ),
          -1,
          false
        );
        break;
      case 'hearts':
        scale.value = withRepeat(
          withSequence(
            withTiming(1.1, { duration: 400 }),
            withTiming(1, { duration: 400 })
          ),
          -1,
          false
        );
        glowOpacity.value = withRepeat(
          withSequence(
            withTiming(0.8, { duration: 400 }),
            withTiming(0.5, { duration: 400 })
          ),
          -1,
          false
        );
        break;
    }
  }, [mood]);

  const avatarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const borderWidth = size * 0.08; // 8% del tamaño
  const emojiSize = size * 0.3; // 30% del tamaño

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
        },
        style,
      ]}
      accessibilityLabel={accessibilityLabel || `Planta ${moodConfig.message}`}
      accessibilityRole="image"
    >
      {/* Glow effect */}
      {showGlow && (
        <AnimatedView
          style={[
            styles.glow,
            {
              width: size * 1.3,
              height: size * 1.3,
              borderRadius: (size * 1.3) / 2,
              backgroundColor: borderColor,
            },
            Shadows.glow(borderColor),
            glowAnimatedStyle,
          ]}
        />
      )}

      {/* Avatar container */}
      <AnimatedView
        style={[
          styles.avatarContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: borderWidth,
            borderColor: borderColor,
          },
          avatarAnimatedStyle,
        ]}
      >
        {imageUrl ? (
          <AnimatedImage
            source={{ uri: imageUrl }}
            style={[
              styles.image,
              {
                width: size - borderWidth * 2,
                height: size - borderWidth * 2,
                borderRadius: (size - borderWidth * 2) / 2,
              },
            ]}
            resizeMode="cover"
          />
        ) : imageSource ? (
          <AnimatedImage
            source={imageSource}
            style={[
              styles.image,
              {
                width: size - borderWidth * 2,
                height: size - borderWidth * 2,
                borderRadius: (size - borderWidth * 2) / 2,
              },
            ]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.placeholder,
              {
                width: size - borderWidth * 2,
                height: size - borderWidth * 2,
                borderRadius: (size - borderWidth * 2) / 2,
                backgroundColor: Colors.backgroundLighter,
              },
            ]}
          >
            <Text style={[styles.placeholderEmoji, { fontSize: size * 0.4 }]}>
              🌱
            </Text>
          </View>
        )}

        {/* Mood emoji badge */}
        {showMoodEmoji && (
          <View
            style={[
              styles.moodBadge,
              {
                width: emojiSize,
                height: emojiSize,
                borderRadius: emojiSize / 2,
                backgroundColor: Colors.background,
                borderWidth: 2,
                borderColor: moodConfig.color,
              },
            ]}
          >
            <Text style={[styles.moodEmoji, { fontSize: emojiSize * 0.6 }]}>
              {moodConfig.emoji}
            </Text>
          </View>
        )}
      </AnimatedView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    zIndex: 0,
  },
  avatarContainer: {
    position: 'relative',
    zIndex: 1,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundLight,
  },
  image: {
    backgroundColor: Colors.backgroundLighter,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    textAlign: 'center',
  },
  moodBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  moodEmoji: {
    textAlign: 'center',
  },
});
