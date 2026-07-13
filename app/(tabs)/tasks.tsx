import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Modal, RefreshControl, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getMyTasks, getMyPersonalTasks, createPersonalTask, updateTaskStatus, claimTask, deleteTask } from '@/lib/api';

type Task = {
  id: string;
  title: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DENIED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  category: string;
  coinsReward: number;
  deadline?: string | null;
  assignedToId?: string | null;
  personal?: boolean;
  assignedById?: string | null;
};

const CATEGORIES = ['GROCERIES', 'HOME', 'SCHOOL', 'PERSONAL', 'WORK', 'OTHER'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

const STATUS_FILTERS = ['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'DENIED'] as const;

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'ALL' | 'MYNEST'>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM', category: 'WORK', deadline: '' });
  const [createError, setCreateError] = useState('');

  const loadTasks = useCallback(async () => {
    try {
      const { data } = tab === 'MYNEST' ? await getMyPersonalTasks() : await getMyTasks();
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useEffect(() => { setLoading(true); loadTasks(); }, [loadTasks]);

  const handleCreateTask = async () => {
    setCreateError('');
    if (!form.title.trim()) { setCreateError('Title is required.'); return; }
    try {
      await createPersonalTask({ ...form, deadline: form.deadline ? new Date(form.deadline).toISOString() : null });
      setShowCreate(false);
      setForm({ title: '', description: '', priority: 'MEDIUM', category: 'WORK', deadline: '' });
      loadTasks();
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || 'Failed to create task.');
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch {
      Alert.alert('Failed', 'Could not delete this task.');
    }
  };

  const handleStart = async (taskId: string) => {
    try {
      await updateTaskStatus(taskId, 'IN_PROGRESS');
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'IN_PROGRESS' } : t)));
    } catch {
      Alert.alert('Failed', 'Could not start this task.');
    }
  };

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
      <View style={styles.headerRow}>
        <ThemedText type="title" style={{ marginBottom: 0 }}>Tasks</ThemedText>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <ThemedText style={styles.addBtnText}>+ Add Task</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {[{ key: 'ALL', label: 'All Tasks' }, { key: 'MYNEST', label: 'MyNest' }].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabChip, tab === t.key && styles.tabChipActive]}
            onPress={() => setTab(t.key as 'ALL' | 'MYNEST')}>
            <ThemedText style={tab === t.key ? styles.tabTextActive : styles.tabText}>{t.label}</ThemedText>
          </TouchableOpacity>
        ))}
      </View>

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
              {item.category} • {item.priority} • {item.coinsReward} coins
            </ThemedText>
            {item.deadline ? (
              <ThemedText style={[styles.meta, item.status !== 'COMPLETED' && new Date(item.deadline) < new Date() && { color: '#ef4444' }]}>
                {item.status !== 'COMPLETED' && new Date(item.deadline) < new Date() ? 'Overdue · ' : ''}
                {new Date(item.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </ThemedText>
            ) : null}
            <ThemedView style={styles.actions}>
              {!item.assignedToId && item.status === 'PENDING' && (
                <TouchableOpacity style={styles.claimBtn} onPress={() => handleClaim(item.id)}>
                  <ThemedText style={styles.btnText}>Claim</ThemedText>
                </TouchableOpacity>
              )}
              {item.status === 'PENDING' && (
                <TouchableOpacity style={styles.startBtn} onPress={() => handleStart(item.id)}>
                  <ThemedText style={styles.btnText}>Start</ThemedText>
                </TouchableOpacity>
              )}
              {item.status === 'IN_PROGRESS' && (
                <TouchableOpacity style={styles.completeBtn} onPress={() => handleComplete(item.id)}>
                  <ThemedText style={styles.btnText}>Mark Complete</ThemedText>
                </TouchableOpacity>
              )}
              {item.personal && (
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                  <ThemedText style={styles.btnText}>Delete</ThemedText>
                </TouchableOpacity>
              )}
            </ThemedView>
          </ThemedView>
        )}
        ListEmptyComponent={!loading ? <ThemedText style={styles.empty}>No tasks here</ThemedText> : null}
      />

      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView>
              <ThemedText style={{ fontSize: 16, fontWeight: '800', marginBottom: 2 }}>Add to MyNest</ThemedText>
              <ThemedText style={{ fontSize: 12, opacity: 0.6, marginBottom: 14 }}>Private personal task</ThemedText>
              {createError ? <ThemedText style={styles.errorText}>{createError}</ThemedText> : null}

              <ThemedText style={styles.label}>Title *</ThemedText>
              <TextInput style={styles.input} placeholder="What needs to be done?" placeholderTextColor="#888" value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} />

              <ThemedText style={styles.label}>Description</ThemedText>
              <TextInput style={styles.input} placeholder="Optional details..." placeholderTextColor="#888" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} />

              <ThemedText style={styles.label}>Priority</ThemedText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {PRIORITIES.map((p) => (
                  <TouchableOpacity key={p} onPress={() => setForm({ ...form, priority: p })} style={[styles.pickChip, form.priority === p && styles.pickChipActive]}>
                    <ThemedText style={form.priority === p ? styles.tabTextActive : styles.tabText}>{p}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={styles.label}>Category</ThemedText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setForm({ ...form, category: c })} style={[styles.pickChip, form.category === c && styles.pickChipActive]}>
                    <ThemedText style={form.category === c ? styles.tabTextActive : styles.tabText}>{c}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={styles.label}>Deadline (YYYY-MM-DD)</ThemedText>
              <TextInput style={styles.input} placeholder="2026-07-15" placeholderTextColor="#888" value={form.deadline} onChangeText={(v) => setForm({ ...form, deadline: v })} />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <TouchableOpacity onPress={() => { setShowCreate(false); setCreateError(''); }} style={[styles.cancelBtn, { flex: 1 }]}>
                  <ThemedText style={{ textAlign: 'center', fontWeight: '600' }}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreateTask} style={[styles.addBtn, { flex: 2, alignItems: 'center' }]}>
                  <ThemedText style={styles.addBtnText}>Add to Nest</ThemedText>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  startBtn: { backgroundColor: '#3b82f6', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addBtn: { backgroundColor: '#3b82f6', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tabChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#eee' },
  tabChipActive: { backgroundColor: '#3b82f6' },
  tabText: { color: '#333', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#fff', fontWeight: '700', fontSize: 13 },
  deleteBtn: { backgroundColor: '#ef4444', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, marginLeft: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: '#fff', borderRadius: 14, padding: 20, maxHeight: '85%' },
  label: { fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 6, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, fontSize: 14, color: '#000' },
  pickChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#eee', marginBottom: 4 },
  pickChipActive: { backgroundColor: '#3b82f6' },
  cancelBtn: { backgroundColor: '#eee', paddingVertical: 10, borderRadius: 8, justifyContent: 'center' },
  errorText: { color: '#ef4444', fontSize: 12, marginBottom: 8 },
  completeBtn: { backgroundColor: '#22C55E', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  btnText: { color: 'white', fontWeight: '600', fontSize: 13 },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.5 },
});
