import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { PressableScale } from '@/components/pressable-scale';
import { Colors } from '@/constants/theme';
import { useAppTheme } from '@/contexts/theme-context';

export function ThemeToggle({ style }: { style?: any }) {
  const { scheme, toggleScheme } = useAppTheme();
  const colors = Colors[scheme];
  const rotate = useSharedValue(scheme === 'dark' ? 0 : 1);

  const animatedStyle = useAnimatedStyle(() => {
    const deg = withTiming(rotate.value * 180, { duration: 300 });
    return {
      transform: [{ rotate: deg + 'deg' }],
    };
  });

  const handlePress = () => {
    rotate.value = rotate.value === 0 ? 1 : 0;
    toggleScheme();
  };

  return (
    <PressableScale
      onPress={handlePress}
      style={[
        styles.toggle,
        { backgroundColor: colors.card, borderColor: colors.border },
        style,
      ]}>
      <Animated.View style={animatedStyle}>
        <Ionicons
          name={scheme === 'dark' ? 'moon' : 'sunny'}
          size={18}
          color={colors.tint}
        />
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  toggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
