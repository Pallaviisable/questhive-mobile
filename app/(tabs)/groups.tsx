import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getMyGroups } from '@/lib/api';

type Group = {
  id: string;
  name: string;
  memberIds: string[];
  template?: string;
  description?: string;
  taskCount?: number;
};

export default function GroupsScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGroups = useCallback(async () => {
    try {
      const { data } = await getMyGroups();
      setGroups(data);
    } catch (err) {
      console.error('Failed to load groups', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedView>
          <ThemedText type="title">My Groups</ThemedText>
          <ThemedText style={styles.subtitle}>Manage and explore your hives</ThemedText>
        </ThemedView>
        <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/groups/create')}>
          <ThemedText style={styles.createBtnText}>+ Create Group</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <ThemedView style={styles.card}>
            <ThemedText style={styles.name}>{item.name}</ThemedText>
            <ThemedText style={styles.meta}>{item.memberIds?.length ?? 0} members</ThemedText>
            <ThemedText style={styles.description}>
              {item.description || item.template || 'No description added.'}
            </ThemedText>
            <ThemedView style={styles.footer}>
              <TouchableOpacity onPress={() => router.push(`/groups/${item.id}/tasks`)}>
                <ThemedText style={styles.viewTasks}>View Tasks →</ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.taskCount}>{item.taskCount ?? 0} tasks</ThemedText>
            </ThemedView>
          </ThemedView>
        )}
        ListEmptyComponent={!loading ? <ThemedText style={styles.empty}>No groups yet</ThemedText> : null}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  subtitle: { fontSize: 13, opacity: 0.6, marginTop: 2 },
  createBtn: { backgroundColor: '#F59E0B', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  createBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
  card: { padding: 16, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.04)', marginBottom: 12 },
  name: { fontSize: 17, fontWeight: '700' },
  meta: { fontSize: 12, opacity: 0.6, marginTop: 2 },
  description: { fontSize: 13, opacity: 0.7, marginTop: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  viewTasks: { color: '#F59E0B', fontWeight: '700', fontSize: 13 },
  taskCount: { fontSize: 12, opacity: 0.5 },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.5 },
});
