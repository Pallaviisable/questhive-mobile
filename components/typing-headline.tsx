import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const HEADLINES = ['Assign tasks.', 'Track progress.', 'Earn rewards.', 'Level up together.'];

export function TypingHeadline() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const [lineIdx, setLineIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const target = HEADLINES[lineIdx];

    if (!deleting && displayed.length < target.length) {
      const t = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), 60);
      return () => clearTimeout(t);
    }
    if (!deleting && displayed.length === target.length) {
      const t = setTimeout(() => setDeleting(true), 1400);
      return () => clearTimeout(t);
    }
    if (deleting && displayed.length > 0) {
      const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 30);
      return () => clearTimeout(t);
    }
    if (deleting && displayed.length === 0) {
      setDeleting(false);
      setLineIdx((i) => (i + 1) % HEADLINES.length);
    }
  }, [displayed, deleting, lineIdx]);

  return (
    <ThemedText style={[styles.text, { color: colors.tint }]}>
      {displayed}
      <ThemedText style={[styles.cursor, { color: colors.tint }]}>|</ThemedText>
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 15,
    fontWeight: '700',
  },
  cursor: {
    fontWeight: '400',
  },
});
