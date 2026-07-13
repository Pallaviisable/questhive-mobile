import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = TextInputProps & { label?: string };

export function PasswordInput({ label, ...props }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [visible, setVisible] = useState(false);
  const focus = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: focus.value === 1 ? colors.tint : colors.border,
    transform: [{ scale: withTiming(focus.value === 1 ? 1.01 : 1, { duration: 150 }) }],
  }));

  return (
    <View style={styles.field}>
      {!!label && (
        <ThemedText style={[styles.label, { color: colors.muted }]}>{label}</ThemedText>
      )}
      <Animated.View
        style={[styles.wrap, { backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center' }, animatedStyle]}>
        <TextInput
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text, flex: 1 }]}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={!visible}
          onFocus={(e) => {
            focus.value = withTiming(1, { duration: 150 });
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            focus.value = withTiming(0, { duration: 150 });
            props.onBlur?.(e);
          }}
          {...props}
        />
        <Pressable onPress={() => setVisible((v) => !v)} style={styles.eyeButton} hitSlop={10}>
          <Ionicons name={visible ? 'eye-off' : 'eye'} size={20} color={colors.muted} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  wrap: { borderWidth: 1.5, borderRadius: 12 },
  input: { paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  eyeButton: { paddingHorizontal: 12 },
});
