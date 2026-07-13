import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const STATS = [
  { value: '10', label: 'Active users', color: '#22c55e' },
  { value: '34', label: 'Tasks tracked', color: '#f5c518' },
  { value: '68%', label: 'Completion rate', color: '#818cf8' },
];

export function StatStrip() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <View style={styles.row}>
      {STATS.map((s, i) => (
        <View
          key={i}
          style={[styles.card, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
          <ThemedText style={[styles.value, { color: s.color }]}>{s.value}</ThemedText>
          <ThemedText style={[styles.label, { color: colors.textMuted }]}>{s.label}</ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  card: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  value: {
    fontSize: 17,
    fontWeight: '800',
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
});
