import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function FormInput(props: TextInputProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <TextInput
      placeholderTextColor={colors.muted}
      style={[
        styles.input,
        {
          color: colors.text,
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 14,
  },
});
