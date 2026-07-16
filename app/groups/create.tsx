import { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

import { router } from 'expo-router';
import { FormInput } from '@/components/form-input';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useDialog } from '@/contexts/dialog-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createGroup } from '@/lib/api';

const TEMPLATES = ['Blank', 'Family', 'Study', 'Fitness', 'Work', 'Custom'];

export default function CreateGroupScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const styles = makeStyles(C);
  const dialog = useDialog();

  const [template, setTemplate] = useState('Blank');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      dialog.alert('Missing name', 'Please enter a group name.');
      return;
    }
    setLoading(true);
    try {
      await createGroup({ name: name.trim(), description: description.trim(), template });
      router.replace({ pathname: '/(tabs)/groups', params: { created: '1' } });
    } catch (e: any) {
      dialog.alert('Failed', e?.response?.data?.message || 'Could not create group.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText style={styles.label}>TEMPLATE</ThemedText>
        <ThemedView style={styles.templateGrid}>
          {TEMPLATES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.templateChip, template === t && styles.templateChipActive]}
              onPress={() => setTemplate(t)}>
              <ThemedText style={template === t ? styles.templateTextActive : styles.templateText}>
                {t}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ThemedView>

        <ThemedText style={styles.label}>GROUP NAME *</ThemedText>
        <FormInput placeholder="e.g. Study Squad" value={name} onChangeText={setName} />

        <ThemedText style={styles.label}>DESCRIPTION</ThemedText>
        <FormInput placeholder="Optional description" value={description} onChangeText={setDescription} multiline />

        <PrimaryButton title="Create Group" loading={loading} onPress={handleCreate} style={{ marginTop: Spacing.md }} />
      </ScrollView>
    </ThemedView>
  );
}

const makeStyles = (C: typeof Colors.dark) => StyleSheet.create({
  container: { padding: Spacing.lg },
  label: { fontSize: 12, color: C.textMuted, fontWeight: '700', letterSpacing: 0.4, marginTop: Spacing.md, marginBottom: Spacing.sm },
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, backgroundColor: 'transparent' },
  templateChip: {
    width: '31%', paddingVertical: 14, borderRadius: Radius.md,
    backgroundColor: C.backgroundElevated, borderWidth: 1, borderColor: C.border, alignItems: 'center',
  },
  templateChipActive: { backgroundColor: C.tint, borderColor: C.tint },
  templateText: { fontSize: 13, color: C.textMuted, fontWeight: '600' },
  templateTextActive: { fontSize: 13, color: '#0A0A0A', fontWeight: '700' },
});
