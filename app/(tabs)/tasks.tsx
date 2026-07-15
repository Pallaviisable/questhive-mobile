import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Modal, RefreshControl, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/primary-button';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const styles = makeStyles(C);
  const insets = useSafeAreaInsets();

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
      loadTasks();
    } catch {
      Alert.alert('Failed', 'Could not claim this task. Someone may have claimed it first.');
    }
  };

  const filteredTasks = filter === 'ALL' ? tasks : tasks.filter((t) => t.status === filter);

  const statusColor = (status: Task['status']) => {
    if (status === 'COMPLETED') return C.success;
    if (status === 'IN_PROGRESS') return C.info;
    if (status === 'DENIED') return C.danger;
    return C.tint;
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.headerRow}>
        <ThemedText type="title" style={{ marginBottom: 0 }}>Tasks</ThemedText>
        <PrimaryButton title="+ Add Task" onPress={() => setShowCreate(true)} style={styles.addBtn} />
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
            <ThemedText style={filter === item ? styles.filterTextActive : styles.filterText}>{item}</ThemedText>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={filteredTasks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingBottom: Spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTasks(); }} tintColor={C.tint} />
        }
        renderItem={({ item }) => {
          const isOverdue = item.status !== 'COMPLETED' && item.deadline && new Date(item.deadline) < new Date();
          const dot = statusColor(item.status);
          return (
            <View style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={[styles.statusDot, { backgroundColor: dot }]} />
                <ThemedText style={styles.taskTitle}>{item.title}</ThemedText>
              </View>
              <ThemedText style={styles.meta}>{item.category} · {item.priority}</ThemedText>
              <View style={styles.metaRow}>
                <View style={styles.coinTag}>
                  <Ionicons name="disc-outline" size={12} color={C.coin} />
                  <ThemedText style={styles.coinText}>+{item.coinsReward}</ThemedText>
                </View>
                {item.deadline ? (
                  <ThemedText style={[styles.meta, isOverdue && { color: C.danger, fontWeight: '700' }]}>
                    {isOverdue ? 'Overdue · ' : ''}
                    {new Date(item.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </ThemedText>
                ) : null}
              </View>
              <View style={styles.actions}>
                {!item.assignedToId && item.status === 'PENDING' && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.tint }]} onPress={() => handleClaim(item.id)}>
                    <ThemedText style={styles.actionBtnTextDark}>Claim</ThemedText>
                  </TouchableOpacity>
                )}
                {item.status === 'PENDING' && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.info }]} onPress={() => handleStart(item.id)}>
                    <ThemedText style={styles.actionBtnText}>Start</ThemedText>
                  </TouchableOpacity>
                )}
                {item.status === 'IN_PROGRESS' && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.success }]} onPress={() => handleComplete(item.id)}>
                    <ThemedText style={styles.actionBtnText}>Mark Complete</ThemedText>
                  </TouchableOpacity>
                )}
                {item.personal && (
                  <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item.id)}>
                    <Ionicons name="trash-outline" size={14} color={C.danger} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={!loading ? <ThemedText style={styles.empty}>No tasks here</ThemedText> : null}
      />

      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.modalTitle}>Add to MyNest</ThemedText>
              <ThemedText style={styles.modalSubtitle}>Private personal task</ThemedText>
              {createError ? <ThemedText style={styles.errorText}>{createError}</ThemedText> : null}

              <ThemedText style={styles.label}>Title *</ThemedText>
              <TextInput style={styles.input} placeholder="What needs to be done?" placeholderTextColor={C.textMuted} value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} />

              <ThemedText style={styles.label}>Description</ThemedText>
              <TextInput style={styles.input} placeholder="Optional details..." placeholderTextColor={C.textMuted} value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} />

              <ThemedText style={styles.label}>Priority</ThemedText>
              <View style={styles.pickRow}>
                {PRIORITIES.map((p) => (
                  <TouchableOpacity key={p} onPress={() => setForm({ ...form, priority: p })} style={[styles.pickChip, form.priority === p && styles.pickChipActive]}>
                    <ThemedText style={form.priority === p ? styles.tabTextActive : styles.tabText}>{p}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={styles.label}>Category</ThemedText>
              <View style={styles.pickRow}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setForm({ ...form, category: c })} style={[styles.pickChip, form.category === c && styles.pickChipActive]}>
                    <ThemedText style={form.category === c ? styles.tabTextActive : styles.tabText}>{c}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={styles.label}>Deadline (YYYY-MM-DD)</ThemedText>
              <TextInput style={styles.input} placeholder="2026-07-15" placeholderTextColor={C.textMuted} value={form.deadline} onChangeText={(v) => setForm({ ...form, deadline: v })} />

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => { setShowCreate(false); setCreateError(''); }} style={[styles.cancelBtn, { flex: 1 }]}>
                  <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
                </TouchableOpacity>
                <View style={{ flex: 2 }}>
                  <PrimaryButton title="Add to Nest" onPress={handleCreateTask} />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const makeStyles = (C: typeof Colors.dark) => StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  addBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  tabRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  tabChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: Radius.full, backgroundColor: C.backgroundElevated, borderWidth: 1, borderColor: C.border },
  tabChipActive: { backgroundColor: C.tint, borderColor: C.tint },
  tabText: { color: C.textMuted, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#0A0A0A', fontWeight: '700', fontSize: 13 },
  filterRow: { marginBottom: Spacing.md, maxHeight: 40 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: Radius.full, backgroundColor: C.backgroundElevated, borderWidth: 1, borderColor: C.border, marginRight: Spacing.sm },
  filterChipActive: { backgroundColor: C.tint, borderColor: C.tint },
  filterText: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  filterTextActive: { fontSize: 12, color: '#0A0A0A', fontWeight: '700' },
  card: { padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: C.backgroundElevated, borderWidth: 1, borderColor: C.border, marginBottom: Spacing.sm },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  taskTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  meta: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  coinTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  coinText: { fontSize: 12, fontWeight: '700', color: C.coin },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  actionBtnTextDark: { color: '#0A0A0A', fontWeight: '700', fontSize: 13 },
  deleteBtn: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', paddingHorizontal: 10 },
  empty: { textAlign: 'center', marginTop: 40, color: C.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: Spacing.lg },
  modalBox: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: Radius.lg, padding: Spacing.lg, maxHeight: '85%' },
  modalTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  modalSubtitle: { fontSize: 12, color: C.textMuted, marginBottom: Spacing.md },
  label: { fontSize: 11, fontWeight: '700', marginTop: Spacing.sm, marginBottom: 6, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { borderWidth: 1, borderColor: C.border, backgroundColor: C.backgroundElevated, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 12, fontSize: 14, color: C.text },
  pickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radius.full, backgroundColor: C.backgroundElevated, borderWidth: 1, borderColor: C.border, marginBottom: 4 },
  pickChipActive: { backgroundColor: C.tint, borderColor: C.tint },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, alignItems: 'center' },
  cancelBtn: { backgroundColor: C.backgroundElevated, borderWidth: 1, borderColor: C.border, paddingVertical: 12, borderRadius: Radius.md, justifyContent: 'center' },
  cancelBtnText: { textAlign: 'center', fontWeight: '600', color: C.textMuted },
  errorText: { color: C.danger, fontSize: 12, marginBottom: 8 },
});
