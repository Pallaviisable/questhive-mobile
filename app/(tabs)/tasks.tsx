import { useCallback, useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/primary-button';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDialog } from '@/contexts/dialog-context';
import { getMyTasks, getMyPersonalTasks, createPersonalTask, updateTaskStatus, claimTask, deleteTask } from '@/lib/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';

function hexToRgba(hex: string, alpha: number) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
  const dialog = useDialog();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'ALL' | 'MYNEST'>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM', category: 'WORK', deadline: '' });
  const [showDatePicker, setShowDatePicker] = useState(false);
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
      dialog.alert('Failed', 'Could not delete this task.');
    }
  };

  const handleStart = async (taskId: string) => {
    try {
      await updateTaskStatus(taskId, 'IN_PROGRESS');
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'IN_PROGRESS' } : t)));
    } catch {
      dialog.alert('Failed', 'Could not start this task.');
    }
  };

  const handleComplete = async (taskId: string) => {
    try {
      await updateTaskStatus(taskId, 'COMPLETED');
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'COMPLETED' } : t)));
    } catch {
      dialog.alert('Failed', 'Could not mark this task complete.');
    }
  };

  const handleClaim = async (taskId: string) => {
    try {
      await claimTask(taskId);
      loadTasks();
    } catch {
      dialog.alert('Failed', 'Could not claim this task. Someone may have claimed it first.');
    }
  };

  const filteredTasks = filter === 'ALL' ? tasks : tasks.filter((t) => t.status === filter);

  const statusMeta = (status: Task['status']) => {
    if (status === 'COMPLETED') return { color: C.success, label: 'Completed' };
    if (status === 'IN_PROGRESS') return { color: C.info, label: 'In progress' };
    if (status === 'DENIED') return { color: C.danger, label: 'Denied' };
    return { color: C.textMuted, label: 'Pending' };
  };

  const counts = STATUS_FILTERS.reduce<Record<string, number>>((acc, f) => {
    acc[f] = f === 'ALL' ? tasks.length : tasks.filter((t) => t.status === f).length;
    return acc;
  }, {});

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.headerRow}>
        <View>
          <ThemedText style={styles.title}>Tasks</ThemedText>
          <ThemedText style={styles.subtitle}>{filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}</ThemedText>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={() => setShowCreate(true)} activeOpacity={0.7}>
          <Ionicons name="add" size={16} color={C.background} />
          <ThemedText style={styles.newBtnText}>New</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.segmentRow}>
        {[{ key: 'ALL', label: 'All tasks' }, { key: 'MYNEST', label: 'My Nest' }].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={styles.segmentItem}
            onPress={() => setTab(t.key as 'ALL' | 'MYNEST')}
            activeOpacity={0.7}>
            <ThemedText style={tab === t.key ? styles.segmentTextActive : styles.segmentText}>{t.label}</ThemedText>
            <View style={[styles.segmentUnderline, tab === t.key && { backgroundColor: C.tint }]} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.filterRowWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(f) => f}
          style={styles.filterRow}
          contentContainerStyle={{ gap: 6, paddingHorizontal: 20, paddingVertical: 2 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, filter === item && styles.filterChipActive]}
              onPress={() => setFilter(item)}
              activeOpacity={0.7}>
              <ThemedText style={filter === item ? styles.filterTextActive : styles.filterText}>
                {item.charAt(0) + item.slice(1).toLowerCase().replace('_', ' ')}
              </ThemedText>
              <ThemedText style={filter === item ? styles.filterCountActive : styles.filterCount}>{counts[item]}</ThemedText>
            </TouchableOpacity>
          )}
        />
        <LinearGradient
          pointerEvents="none"
          colors={[hexToRgba(C.background, 0), hexToRgba(C.background, 1)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.filterFade}
        />
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingBottom: Spacing.xl, paddingTop: Spacing.xs }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTasks(); }} tintColor={C.tint} />
        }
        renderItem={({ item }) => {
          const isOverdue = item.status !== 'COMPLETED' && !!item.deadline && new Date(item.deadline) < new Date();
          const meta = statusMeta(item.status);
          return (
            <View style={[styles.card, { borderLeftColor: meta.color }]}>
              <View style={styles.cardHeader}>
                <ThemedText style={styles.taskTitle} numberOfLines={1}>{item.title}</ThemedText>
                <View style={[styles.statusPill, { backgroundColor: `${meta.color}18` }]}>
                  <ThemedText style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</ThemedText>
                </View>
              </View>

              <ThemedText style={styles.meta}>{item.category.charAt(0) + item.category.slice(1).toLowerCase()} · {item.priority.charAt(0) + item.priority.slice(1).toLowerCase()} priority</ThemedText>

              <View style={styles.metaRow}>
                <View style={styles.coinTag}>
                  <Ionicons name="disc-outline" size={12} color={C.coin} />
                  <ThemedText style={styles.coinText}>{item.coinsReward} coins</ThemedText>
                </View>
                {item.deadline ? (
                  <View style={styles.deadlineTag}>
                    <Ionicons name="time-outline" size={12} color={isOverdue ? C.danger : C.textMuted} />
                    <ThemedText style={[styles.meta, { marginTop: 0 }, isOverdue && { color: C.danger, fontWeight: '700' }]}>
                      {isOverdue ? 'Overdue · ' : ''}
                      {new Date(item.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </ThemedText>
                  </View>
                ) : null}
              </View>

              <View style={styles.actions}>
                {!item.assignedToId && item.status === 'PENDING' && (
                  <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => handleClaim(item.id)} activeOpacity={0.75}>
                    <ThemedText style={styles.actionBtnPrimaryText}>Claim</ThemedText>
                  </TouchableOpacity>
                )}
                {item.status === 'PENDING' && (
                  <TouchableOpacity style={styles.actionBtnGhost} onPress={() => handleStart(item.id)} activeOpacity={0.75}>
                    <ThemedText style={styles.actionBtnGhostText}>Start</ThemedText>
                  </TouchableOpacity>
                )}
                {item.status === 'IN_PROGRESS' && (
                  <TouchableOpacity style={[styles.actionBtnGhost, { borderColor: C.success }]} onPress={() => handleComplete(item.id)} activeOpacity={0.75}>
                    <ThemedText style={[styles.actionBtnGhostText, { color: C.success }]}>Mark complete</ThemedText>
                  </TouchableOpacity>
                )}
                <View style={{ flex: 1 }} />
                {item.personal && (
                  <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item.id)} activeOpacity={0.75}>
                    <Ionicons name="trash-outline" size={15} color={C.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="checkmark-done-outline" size={22} color={C.textMuted} />
              </View>
              <ThemedText style={styles.emptyTitle}>Nothing here</ThemedText>
              <ThemedText style={styles.empty}>Tasks matching this filter will show up here</ThemedText>
            </View>
          ) : null
        }
      />

      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeaderRow}>
                <ThemedText style={styles.modalTitle}>Add to My Nest</ThemedText>
                <TouchableOpacity onPress={() => { setShowCreate(false); setCreateError(''); }}>
                  <Ionicons name="close" size={18} color={C.textMuted} />
                </TouchableOpacity>
              </View>
              <ThemedText style={styles.modalSubtitle}>Private task, only visible to you</ThemedText>
              {createError ? <ThemedText style={styles.errorText}>{createError}</ThemedText> : null}

              <ThemedText style={styles.label}>Title</ThemedText>
              <TextInput style={styles.input} placeholder="What needs to be done?" placeholderTextColor={C.textMuted} value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} />

              <ThemedText style={styles.label}>Description</ThemedText>
              <TextInput style={styles.input} placeholder="Optional details..." placeholderTextColor={C.textMuted} value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} />

              <ThemedText style={styles.label}>Priority</ThemedText>
              <View style={styles.pickRow}>
                {PRIORITIES.map((p) => (
                  <TouchableOpacity key={p} onPress={() => setForm({ ...form, priority: p })} style={[styles.pickChip, form.priority === p && styles.pickChipActive]}>
                    <ThemedText style={form.priority === p ? styles.pickChipTextActive : styles.pickChipText}>{p.charAt(0) + p.slice(1).toLowerCase()}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={styles.label}>Category</ThemedText>
              <View style={styles.pickRow}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setForm({ ...form, category: c })} style={[styles.pickChip, form.category === c && styles.pickChipActive]}>
                    <ThemedText style={form.category === c ? styles.pickChipTextActive : styles.pickChipText}>{c.charAt(0) + c.slice(1).toLowerCase()}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={styles.label}>Deadline</ThemedText>
              <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
                <ThemedText style={{ color: form.deadline ? C.text : C.textMuted, fontSize: 13.5 }}>
                  {form.deadline ? new Date(form.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Select a date'}
                </ThemedText>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={form.deadline ? new Date(form.deadline) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (event.type === 'set' && selectedDate) {
                      setForm((f) => ({ ...f, deadline: selectedDate.toISOString() }));
                    }
                    if (Platform.OS === 'android') setShowDatePicker(false);
                  }}
                />
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => { setShowCreate(false); setCreateError(''); }} style={styles.cancelBtn}>
                  <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
                </TouchableOpacity>
                <View style={{ flex: 2 }}>
                  <PrimaryButton title="Add task" onPress={handleCreateTask} />
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedView>
  );
}

const makeStyles = (C: typeof Colors.dark) => StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  subtitle: { fontSize: 12.5, color: C.textMuted, marginTop: 2 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.tint, paddingVertical: 8, paddingHorizontal: 12, borderRadius: Radius.sm },
  newBtnText: { color: C.background, fontWeight: '700', fontSize: 13 },

  segmentRow: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: C.border },
  segmentItem: { paddingBottom: 10 },
  segmentText: { fontSize: 13.5, color: C.textMuted, fontWeight: '600' },
  segmentTextActive: { fontSize: 13.5, color: C.text, fontWeight: '700' },
  segmentUnderline: { height: 2, marginTop: 10, borderRadius: 1, backgroundColor: 'transparent' },

  filterRowWrap: { position: 'relative', marginTop: Spacing.xs, marginBottom: Spacing.md },
  filterRow: { maxHeight: 48 },
  filterFade: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 32 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: Radius.full, backgroundColor: C.backgroundElevated2, borderWidth: 1.5, borderColor: C.border },
  filterChipActive: { backgroundColor: `${C.tint}18`, borderColor: C.tint },
  filterText: { fontSize: 12.5, lineHeight: 16, color: C.text, fontWeight: '700' },
  filterTextActive: { fontSize: 12.5, lineHeight: 16, color: C.tint, fontWeight: '800' },
  filterCount: { fontSize: 11, lineHeight: 14, color: C.text, fontWeight: '700' },
  filterCountActive: { fontSize: 11, lineHeight: 14, color: C.tint, fontWeight: '800' },

  card: { padding: Spacing.md, borderRadius: Radius.md, backgroundColor: C.backgroundElevated, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, marginBottom: Spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 },
  taskTitle: { fontSize: 14.5, fontWeight: '700', flex: 1 },
  statusPill: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: Radius.full },
  statusPillText: { fontSize: 10.5, fontWeight: '700' },
  meta: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  coinTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  coinText: { fontSize: 12, fontWeight: '600', color: C.coin },
  deadlineTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  actionBtnPrimary: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: Radius.sm, backgroundColor: C.tint },
  actionBtnPrimaryText: { color: C.background, fontWeight: '700', fontSize: 12.5 },
  actionBtnGhost: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: Radius.sm, borderWidth: 1, borderColor: C.info },
  actionBtnGhostText: { color: C.info, fontWeight: '700', fontSize: 12.5 },
  iconBtn: { padding: 6, borderRadius: Radius.sm },

  emptyWrap: { alignItems: 'center', marginTop: 56, gap: 4 },
  emptyIconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: C.backgroundElevated, borderWidth: 1, borderColor: C.border, marginBottom: 6 },
  emptyTitle: { fontSize: 14.5, fontWeight: '700' },
  empty: { textAlign: 'center', color: C.textMuted, fontSize: 12.5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: Spacing.lg },
  modalBox: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: Radius.lg, padding: Spacing.lg, maxHeight: '85%' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 15.5, fontWeight: '700' },
  modalSubtitle: { fontSize: 12, color: C.textMuted, marginBottom: Spacing.md, marginTop: 2 },
  label: { fontSize: 10.5, fontWeight: '700', marginTop: Spacing.sm, marginBottom: 6, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: C.border, backgroundColor: C.backgroundElevated2, borderRadius: Radius.sm, paddingVertical: 10, paddingHorizontal: 12, fontSize: 13.5, color: C.text },
  pickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pickChip: { paddingVertical: 6, paddingHorizontal: 11, borderRadius: Radius.sm, backgroundColor: C.backgroundElevated2, borderWidth: 1, borderColor: C.border, marginBottom: 4 },
  pickChipActive: { backgroundColor: `${C.tint}18`, borderColor: C.tint },
  pickChipText: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  pickChipTextActive: { fontSize: 12, color: C.tint, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, alignItems: 'center' },
  cancelBtn: { flex: 1, backgroundColor: C.backgroundElevated2, borderWidth: 1, borderColor: C.border, paddingVertical: 12, borderRadius: Radius.sm, justifyContent: 'center' },
  cancelBtnText: { textAlign: 'center', fontWeight: '600', color: C.textMuted, fontSize: 13 },
  errorText: { color: C.danger, fontSize: 12, marginBottom: 8 },
});
