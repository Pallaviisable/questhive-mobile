import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getMyTasks, updateTaskStatus, claimTask } from '@/lib/api';

type Task = {
  id: string;
  title: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DENIED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  category: string;
  coinReward: number;
  isOpen?: boolean; // open tasks can be claimed
};

const STATUS_FILTERS = ['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'DENIED'] as const;

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      const { data } = await getMyTasks();
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleComplete = async (taskId: string) => {
    try {
      await updateTaskStatus(taskId, 'COMPLETED');
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'COMPLETED' } : t)));
    } catch {
      Alert.alert('Failed', 'Could not mark this task complete.');
    }
  };

  const handleClaim = async (taskId: string) => {
    try {
      await claimTask(taskId);
      loadTasks(); // claimed task moves out of "open" pool, refetch for accuracy
    } catch {
      Alert.alert('Failed', 'Could not claim this task. Someone may have claimed it first.');
    }
  };

  const filteredTasks = filter === 'ALL' ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Tasks</ThemedText>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={STATUS_FILTERS}
        keyExtractor={(f) => f}
        style={styles.filterRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, filter === item && styles.filterChipActive]}
            onPress={() => setFilter(item)}>
            <ThemedText style={filter === item ? styles.filterTextActive : styles.filterText}>
              {item}
            </ThemedText>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={filteredTasks}
        keyExtractor={(t) => t.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTasks(); }} />
        }
        renderItem={({ item }) => (
          <ThemedView style={styles.card}>
            <ThemedText style={styles.taskTitle}>{item.title}</ThemedText>
            <ThemedText style={styles.meta}>
              {item.category} • {item.priority} • {item.coinReward} coins
            </ThemedText>
            <ThemedView style={styles.actions}>
              {item.isOpen && item.status === 'PENDING' && (
                <TouchableOpacity style={styles.claimBtn} onPress={() => handleClaim(item.id)}>
                  <ThemedText style={styles.btnText}>Claim</ThemedText>
                </TouchableOpacity>
              )}
              {item.status !== 'COMPLETED' && item.status !== 'DENIED' && (
                <TouchableOpacity style={styles.completeBtn} onPress={() => handleComplete(item.id)}>
                  <ThemedText style={styles.btnText}>Mark Complete</ThemedText>
                </TouchableOpacity>
              )}
            </ThemedView>
          </ThemedView>
        )}
        ListEmptyComponent={!loading ? <ThemedText style={styles.empty}>No tasks here</ThemedText> : null}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { marginBottom: 12 },
  filterRow: { marginBottom: 12, maxHeight: 40 },
  filterChip: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.06)', marginRight: 8,
  },
  filterChipActive: { backgroundColor: '#4F46E5' },
  filterText: { fontSize: 13, opacity: 0.7 },
  filterTextActive: { fontSize: 13, color: 'white', fontWeight: '600' },
  card: { padding: 14, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.04)', marginBottom: 10 },
  taskTitle: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 12, opacity: 0.6, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  claimBtn: { backgroundColor: '#F59E0B', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  completeBtn: { backgroundColor: '#22C55E', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  btnText: { color: 'white', fontWeight: '600', fontSize: 13 },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.5 },
});
