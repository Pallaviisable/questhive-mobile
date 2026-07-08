import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

import { FormInput } from '@/components/form-input';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { createGroup } from '@/lib/api';

const TEMPLATES = ['Blank', 'Family', 'Study', 'Fitness', 'Work', 'Custom'];

export default function CreateGroupScreen() {
  const [template, setTemplate] = useState('Blank');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter a group name.');
      return;
    }
    setLoading(true);
    try {
      await createGroup({ name: name.trim(), description: description.trim(), template });
      router.back();
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.message || 'Could not create group.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title" style={styles.title}>Create Group</ThemedText>

      <ThemedText style={styles.label}>TEMPLATE</ThemedText>
      <ThemedView style={styles.templateGrid}>
        {TEMPLATES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.templateChip, template === t && styles.templateChipActive]}
            onPress={() => setTemplate(t)}>
            <ThemedText style={template === t ? styles.templateTextActive : styles.templateText}>{t}</ThemedText>
          </TouchableOpacity>
        ))}
      </ThemedView>

      <ThemedText style={styles.label}>GROUP NAME *</ThemedText>
      <FormInput placeholder="e.g. Study Squad" value={name} onChangeText={setName} />

      <ThemedText style={styles.label}>DESCRIPTION</ThemedText>
      <FormInput placeholder="Optional description" value={description} onChangeText={setDescription} multiline />

      <PrimaryButton title="Create Group" loading={loading} onPress={handleCreate} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { marginBottom: 20 },
  label: { fontSize: 12, opacity: 0.6, marginTop: 16, marginBottom: 8 },
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  templateChip: {
    width: '31%', paddingVertical: 14, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.04)', alignItems: 'center',
  },
  templateChipActive: { backgroundColor: '#F59E0B' },
  templateText: { fontSize: 13, opacity: 0.7 },
  templateTextActive: { fontSize: 13, color: '#000', fontWeight: '700' },
});
