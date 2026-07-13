import { ActivityIndicator, StyleSheet, type PressableProps } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
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
    <PressableScale
      disabled={disabled || loading}
      style={[
        styles.button,
        isGhost
          ? { backgroundColor: 'transparent' }
          : {
              backgroundColor: colors.tint,
              shadowColor: colors.tint,
              shadowOpacity: scheme === 'dark' ? 0.35 : 0.25,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            },
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
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    color: '#151718',
  },
});
