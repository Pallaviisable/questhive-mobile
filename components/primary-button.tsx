import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = PressableProps & {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
};

export function PrimaryButton({ title, loading, variant = 'primary', disabled, style, ...rest }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const isGhost = variant === 'ghost';

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        isGhost
          ? { backgroundColor: 'transparent' }
          : { backgroundColor: colors.tint, opacity: pressed ? 0.85 : 1 },
        (disabled || loading) && !isGhost ? { opacity: 0.6 } : null,
        style as any,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={isGhost ? colors.tint : '#151718'} />
      ) : (
        <ThemedText
          style={isGhost ? { color: colors.tint } : styles.primaryLabel}
          type="defaultSemiBold">
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    color: '#151718',
  },
});
