import { PropsWithChildren } from 'react';
import { Pressable, PressableProps, ViewStyle, StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

type Props = PressableProps & PropsWithChildren<{ style?: StyleProp<ViewStyle> }>;

export function PressableScale({ children, style, onPressIn, onPressOut, ...rest }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={(e) => {
        scale.value = withTiming(0.96, { duration: 100 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: 150 });
        onPressOut?.(e);
      }}
      {...rest}>
      <Animated.View style={[style as any, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
