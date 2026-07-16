import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormInput } from '@/components/form-input';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { joinGroup } from '@/lib/api';

export default function JoinGroupScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError('Enter an invite code to continue.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await joinGroup(trimmed);
      router.replace(`/groups/${data.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid or expired invite code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: `${colors.tint}18` }]}>
          <Ionicons name="key-outline" size={26} color={colors.tint} />
        </View>

        <ThemedText type="title" style={styles.title}>Join a Group</ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.textMuted }]}>
          Enter the invite code shared by your group admin.
        </ThemedText>

        <View style={styles.form}>
          <FormInput
            label="Invite code"
            placeholder="e.g. AB3XK9"
            autoCapitalize="characters"
            autoCorrect={false}
            value={code}
            onChangeText={(t: string) => setCode(t.toUpperCase())}
            maxLength={12}
          />

          {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}

          <PrimaryButton title="Join Group" loading={loading} onPress={handleJoin} style={styles.submitBtn} />
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  backBtn: { padding: 4 },
  content: { flex: 1, alignItems: 'center', paddingTop: Spacing.xl },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  title: { marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 13, textAlign: 'center', marginBottom: Spacing.xl, paddingHorizontal: Spacing.lg },
  form: { width: '100%' },
  error: { color: '#ef4444', fontSize: 13, marginTop: 4, marginBottom: 4 },
  submitBtn: { marginTop: Spacing.md },
});
