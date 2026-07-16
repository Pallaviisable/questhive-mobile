import { useCallback, useEffect, useState } from 'react';
import {
  ScrollView, View, TextInput, TouchableOpacity, Modal,
  ActivityIndicator, StyleSheet, Image, Linking,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDialog } from '@/contexts/dialog-context';
import { useAuth } from '@/contexts/auth-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getGroupDetail, getGroupTasks, getTasksAssignedByMe, createGroupTask,
  updateTaskStatus, deleteTask, claimTask, editTask, denyTask, updateTaskPriority,
  addTaskComment, addSubtask, completeSubtask, addCommitmentPledge,
  requestBonusReview, flagBonus, getReviewStatus, getUserXP, getGroupSuggestions,
} from '@/lib/api';

const CATEGORIES = ['GROCERIES', 'HOME', 'SCHOOL', 'PERSONAL', 'WORK', 'OTHER'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];
const priorityColor: Record<string, string> = { LOW: '#22c55e', MEDIUM: '#f5c518', HIGH: '#ef4444' };
const statusColor: Record<string, string> = { PENDING: '#9ca3af', IN_PROGRESS: '#3b82f6', COMPLETED: '#22c55e' };

const TITLE_TIERS = [
  { frame: 'none', title: 'Newcomer', minLevel: 1, color: '#8a8a8a' },
  { frame: 'bronze', title: 'Task Starter', minLevel: 3, color: '#cd7f32' },
  { frame: 'silver', title: 'Steady Worker', minLevel: 6, color: '#b8bec5' },
  { frame: 'gold', title: 'Dedicated Bee', minLevel: 10, color: '#f5c518' },
  { frame: 'purple', title: 'Quest Champion', minLevel: 15, color: '#a855f7' },
  { frame: 'elite', title: 'Elite Bee', minLevel: 20, color: '#ef4444' },
];
function getTier(level = 1) {
  let t = TITLE_TIERS[0];
  for (const x of TITLE_TIERS) if (level >= x.minLevel) t = x;
  return t;
}

/* ---------- Shared small components (theme-aware) ---------- */
function Tag({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ backgroundColor: `${color}15`, borderColor: `${color}40`, borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 7, paddingVertical: 2.5, marginRight: 6, marginBottom: 4 }}>
      <ThemedText style={{ fontSize: 9.5, fontWeight: '700', color, letterSpacing: 0.3 }}>{text}</ThemedText>
    </View>
  );
}

function IconTag({ text, color, icon }: { text: string; color: string; icon: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${color}12`, borderColor: `${color}35`, borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 7, paddingVertical: 2.5, marginRight: 6, marginBottom: 4 }}>
      <Ionicons name={icon} size={10} color={color} />
      <ThemedText style={{ fontSize: 9.5, fontWeight: '700', color }}>{text}</ThemedText>
    </View>
  );
}

function Chip({ label, active, color, icon, onPress, C }: any) {
  const c = color || C.tint;
  return (
    <TouchableOpacity onPress={onPress} style={{
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radius.full,
      backgroundColor: active ? `${c}18` : C.backgroundElevated,
      borderWidth: 1, borderColor: active ? `${c}55` : C.border, marginRight: 6, marginBottom: 6,
    }}>
      {icon && <Ionicons name={icon} size={12} color={active ? c : C.textMuted} />}
      <ThemedText style={{ fontSize: 12, fontWeight: '700', color: active ? c : C.textMuted }}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

function CoinTag({ value, color, prefix = '+' }: { value: number; color: string; prefix?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Ionicons name="disc-outline" size={12} color={color} />
      <ThemedText style={{ fontSize: 11, color, fontWeight: '700' }}>{prefix}{value}</ThemedText>
    </View>
  );
}

/* ---------- Task Detail Modal ---------- */
function TaskDetailModal({ task, user, xpMap, onClose, onRefresh, C, styles }: any) {
  const dialog = useDialog();
  const [comments, setComments] = useState(task.comments || []);
  const [subtasks, setSubtasks] = useState(task.subtasks || []);
  const [pledge, setPledge] = useState(task.pledgeMessage || '');
  const [commentText, setCommentText] = useState('');
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [pledgeText, setPledgeText] = useState('');
  const [tab, setTab] = useState<'SUBTASKS' | 'COMMENTS' | 'PLEDGE' | 'REVIEW'>('SUBTASKS');
  const [saving, setSaving] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<any>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const isAssignedToMe = task.assignedToId === user?.id;
  const showReviewTab = task.status === 'COMPLETED' && (task.bonusCoins > 0 || task.openTaskBonus);

  useEffect(() => { if (tab === 'REVIEW') loadReviewStatus(); }, [tab]);

  const loadReviewStatus = async () => {
    setReviewLoading(true);
    try { const res = await getReviewStatus(task.id); setReviewStatus(res.data); }
    catch { setReviewStatus(null); }
    setReviewLoading(false);
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSaving(true);
    try { const res = await addTaskComment(task.id, { content: commentText.trim() }); setComments(res.data.comments || []); setCommentText(''); onRefresh(); }
    catch { dialog.alert('Failed', 'Could not add comment'); }
    setSaving(false);
  };
  const handleAddSubtask = async () => {
    if (!subtaskTitle.trim()) return;
    setSaving(true);
    try { const res = await addSubtask(task.id, { title: subtaskTitle.trim() }); setSubtasks(res.data.subtasks || []); setSubtaskTitle(''); onRefresh(); }
    catch { dialog.alert('Failed', 'Could not add subtask'); }
    setSaving(false);
  };
  const handleCompleteSubtask = async (subtaskId: string) => {
    try { const res = await completeSubtask(task.id, subtaskId); setSubtasks(res.data.subtasks || []); onRefresh(); }
    catch { dialog.alert('Failed', 'Could not complete subtask'); }
  };
  const handlePledge = async () => {
    if (!pledgeText.trim()) return;
    setSaving(true);
    try { await addCommitmentPledge(task.id, { message: pledgeText.trim() }); setPledge(pledgeText.trim()); setPledgeText(''); onRefresh(); }
    catch { dialog.alert('Failed', 'Could not save pledge'); }
    setSaving(false);
  };
  const handleRequestReview = async () => { setSaving(true); try { await requestBonusReview(task.id, task.bonusCoins || 0); await loadReviewStatus(); } catch {} setSaving(false); };
  const handleFlagBonus = async () => { setSaving(true); try { await flagBonus(task.id); await loadReviewStatus(); } catch {} setSaving(false); };

  const completedSubtasks = subtasks.filter((s: any) => s.completed).length;
  const subtaskProgress = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  const assigneeXp = xpMap?.[task.assignedToId];
  const assigneeTier = assigneeXp ? getTier(assigneeXp.level || 1) : TITLE_TIERS[0];
  const assigneeLevel = assigneeXp?.level || 1;

  const tabs = [
    { key: 'SUBTASKS', label: `Subtasks${subtasks.length ? ` (${subtasks.length})` : ''}`, icon: 'list-outline' },
    { key: 'COMMENTS', label: `Comments${comments.length ? ` (${comments.length})` : ''}`, icon: 'chatbubble-outline' },
    ...(isAssignedToMe ? [{ key: 'PLEDGE', label: 'Pledge', icon: 'ribbon-outline' }] : []),
    ...(showReviewTab ? [{ key: 'REVIEW', label: 'Bonus Review', icon: 'scale-outline' }] : []),
  ];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { maxHeight: '88%' }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              <Tag text={task.priority} color={priorityColor[task.priority]} />
              <Tag text={task.status.replace('_', ' ')} color={statusColor[task.status]} />
              <Tag text={task.category} color={C.textMuted} />
            </View>
            <ThemedText style={{ fontSize: 17, fontWeight: '700', color: C.text }}>{task.title}</ThemedText>
            {task.description ? <ThemedText style={{ color: C.textMuted, fontSize: 13, marginTop: 6, lineHeight: 18 }}>{task.description}</ThemedText> : null}
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              {task.deadline ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="time-outline" size={13} color={C.textMuted} />
                  <ThemedText style={{ fontSize: 12, color: C.textMuted }}>{new Date(task.deadline).toLocaleDateString()}</ThemedText>
                </View>
              ) : null}
              <CoinTag value={task.coinsReward} color={C.tint} prefix="" />
              {task.assignedToId && assigneeTier.frame !== 'none' && (
                <Tag text={`${assigneeTier.title} Lv.${assigneeLevel}`} color={assigneeTier.color} />
              )}
            </View>

            {subtasks.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <View style={{ height: 5, backgroundColor: C.backgroundElevated2, borderRadius: Radius.full, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${subtaskProgress}%`, backgroundColor: C.success, borderRadius: Radius.full }} />
                </View>
              </View>
            )}

            {pledge ? (
              <View style={{ marginTop: 10, backgroundColor: 'rgba(168,85,247,0.08)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.28)', borderRadius: Radius.md, padding: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="ribbon-outline" size={12} color="#a855f7" />
                  <ThemedText style={{ fontSize: 10.5, color: '#a855f7', fontWeight: '700', letterSpacing: 0.3 }}>COMMITMENT PLEDGE</ThemedText>
                </View>
                <ThemedText style={{ fontSize: 13, color: C.text }}>{pledge}</ThemedText>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, borderBottomWidth: 1, borderColor: C.border }}>
              {tabs.map((t) => (
                <TouchableOpacity key={t.key} onPress={() => setTab(t.key as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 2, borderColor: tab === t.key ? C.tint : 'transparent' }}>
                  <Ionicons name={t.icon as any} size={13} color={tab === t.key ? C.tint : C.textMuted} />
                  <ThemedText style={{ fontSize: 12, fontWeight: '700', color: tab === t.key ? C.tint : C.textMuted }}>{t.label}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ marginTop: 14, gap: 8 }}>
              {tab === 'SUBTASKS' && (
                <View style={{ gap: 8 }}>
                  {subtasks.length === 0 && <ThemedText style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: 16 }}>No subtasks yet.</ThemedText>}
                  {subtasks.map((s: any, i: number) => (
                    <View key={s.id ?? i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: C.backgroundElevated2, borderRadius: Radius.sm, borderWidth: 1, borderColor: C.border }}>
                      <TouchableOpacity disabled={s.completed} onPress={() => handleCompleteSubtask(s.id)} style={{ width: 20, height: 20, borderRadius: 6, borderWidth: s.completed ? 0 : 1.5, borderColor: C.border, backgroundColor: s.completed ? C.success : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                        {s.completed ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
                      </TouchableOpacity>
                      <ThemedText style={{ flex: 1, fontSize: 13, color: s.completed ? C.textMuted : C.text, textDecorationLine: s.completed ? 'line-through' : 'none' }}>{s.title}</ThemedText>
                    </View>
                  ))}
                  {task.status !== 'COMPLETED' && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <TextInput style={styles.input} placeholder="Add subtask..." placeholderTextColor={C.textMuted} value={subtaskTitle} onChangeText={setSubtaskTitle} />
                      <TouchableOpacity disabled={saving || !subtaskTitle.trim()} onPress={handleAddSubtask} style={styles.smallBtn}><ThemedText style={styles.smallBtnText}>Add</ThemedText></TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {tab === 'COMMENTS' && (
                <View style={{ gap: 10 }}>
                  {comments.length === 0 && <ThemedText style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: 16 }}>No comments yet.</ThemedText>}
                  {comments.map((c: any, i: number) => {
                    const isMe = c.userId === user?.id;
                    return (
                      <View key={c.id ?? i} style={{ alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                        <View style={{ maxWidth: '85%', backgroundColor: isMe ? `${C.tint}12` : C.backgroundElevated2, borderWidth: 1, borderColor: isMe ? `${C.tint}30` : C.border, borderRadius: Radius.md, padding: 10 }}>
                          {!isMe && <ThemedText style={{ fontSize: 11, color: C.tint, fontWeight: '700', marginBottom: 3 }}>{c.authorName}</ThemedText>}
                          <ThemedText style={{ fontSize: 13, color: C.text }}>{c.content}</ThemedText>
                        </View>
                      </View>
                    );
                  })}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput style={styles.input} placeholder="Write a comment..." placeholderTextColor={C.textMuted} value={commentText} onChangeText={setCommentText} />
                    <TouchableOpacity disabled={saving || !commentText.trim()} onPress={handleAddComment} style={styles.smallBtn}><ThemedText style={styles.smallBtnText}>Send</ThemedText></TouchableOpacity>
                  </View>
                </View>
              )}


              {tab === 'PLEDGE' && (
                <View>
                  {pledge ? (
                    <View style={{ backgroundColor: 'rgba(168,85,247,0.08)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.28)', borderRadius: Radius.md, padding: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Ionicons name="ribbon-outline" size={14} color="#a855f7" />
                        <ThemedText style={{ fontSize: 13, color: '#a855f7', fontWeight: '700' }}>Active Pledge</ThemedText>
                      </View>
                      <ThemedText style={{ fontSize: 14, color: C.text }}>{pledge}</ThemedText>
                    </View>
                  ) : (
                    <View>
                      <ThemedText style={{ color: C.textMuted, fontSize: 13, marginBottom: 12 }}>Make a commitment pledge. Visible to all group members.</ThemedText>
                      <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline placeholder="I commit to completing this task by..." placeholderTextColor={C.textMuted} value={pledgeText} onChangeText={setPledgeText} />
                      <TouchableOpacity disabled={saving || !pledgeText.trim()} onPress={handlePledge} style={[styles.smallBtn, { marginTop: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(168,85,247,0.16)' }]}>
                        <Ionicons name="ribbon-outline" size={14} color="#a855f7" />
                        <ThemedText style={{ color: '#a855f7', fontWeight: '700', fontSize: 13 }}>Make Pledge</ThemedText>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {tab === 'REVIEW' && (
                <View style={{ gap: 14 }}>
                  <ThemedText style={{ color: C.textMuted, fontSize: 13 }}>Members can flag a bonus as disproportionate or request a review.</ThemedText>
                  <View style={{ backgroundColor: C.backgroundElevated2, borderRadius: Radius.md, borderWidth: 1, borderColor: C.border, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 38, height: 38, borderRadius: Radius.sm, backgroundColor: `${C.tint}15`, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="disc-outline" size={18} color={C.tint} />
                    </View>
                    <View>
                      <ThemedText style={{ fontSize: 12, color: C.textMuted }}>Bonus Coins Awarded</ThemedText>
                      <ThemedText style={{ fontSize: 19, fontWeight: '800', color: C.tint }}>{task.bonusCoins || task.coinsReward || 0}</ThemedText>
                    </View>
                  </View>
                  {reviewLoading ? <ActivityIndicator color={C.tint} /> : (
                    <View style={{ gap: 10 }}>
                      {reviewStatus && (
                        <View style={{ backgroundColor: C.backgroundElevated2, borderRadius: Radius.md, borderWidth: 1, borderColor: C.border, padding: 14 }}>
                          <ThemedText style={{ fontSize: 10.5, color: C.textMuted, fontWeight: '700', marginBottom: 6, letterSpacing: 0.3 }}>REVIEW STATUS</ThemedText>
                          <ThemedText style={{ fontWeight: '700', color: reviewStatus.status === 'FLAGGED' ? C.danger : C.tint }}>{reviewStatus.status}</ThemedText>
                          {reviewStatus.flagCount > 0 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
                              <Ionicons name="flag-outline" size={12} color={C.danger} />
                              <ThemedText style={{ fontSize: 12, color: C.danger }}>{reviewStatus.flagCount} member(s) flagged this bonus.</ThemedText>
                            </View>
                          )}
                        </View>
                      )}
                      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                        {!isAssignedToMe && reviewStatus?.status !== 'FLAGGED' && (
                          <TouchableOpacity disabled={saving} onPress={handleFlagBonus} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${C.danger}10`, borderWidth: 1, borderColor: `${C.danger}30`, borderRadius: Radius.sm, paddingVertical: 10, paddingHorizontal: 14 }}>
                            <Ionicons name="flag-outline" size={14} color={C.danger} />
                            <ThemedText style={{ color: C.danger, fontWeight: '700', fontSize: 13 }}>Flag as Disproportionate</ThemedText>
                          </TouchableOpacity>
                        )}
                        {isAssignedToMe && reviewStatus?.status !== 'PENDING' && reviewStatus?.status !== 'APPROVED' && (
                          <TouchableOpacity disabled={saving} onPress={handleRequestReview} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${C.tint}10`, borderWidth: 1, borderColor: `${C.tint}30`, borderRadius: Radius.sm, paddingVertical: 10, paddingHorizontal: 14 }}>
                            <Ionicons name="chatbubble-ellipses-outline" size={14} color={C.tint} />
                            <ThemedText style={{ color: C.tint, fontWeight: '700', fontSize: 13 }}>Request Bonus Review</ThemedText>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
          <TouchableOpacity onPress={onClose} style={{ alignSelf: 'flex-end', marginTop: 14 }}>
            <ThemedText style={{ color: C.textMuted, fontSize: 13, fontWeight: '600' }}>Close</ThemedText>
          </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

function SuggestionsModal({ suggestions, loading, onClose, onUse, C, styles }: any) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Ionicons name="bulb-outline" size={16} color={C.tint} />
            <ThemedText style={{ fontSize: 16, fontWeight: '800' }}>AI Task Suggestions</ThemedText>
          </View>
          <ThemedText style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>Based on your group's task history</ThemedText>
          {loading ? <ActivityIndicator color={C.tint} /> : suggestions.length === 0 ? (
            <ThemedText style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: 20 }}>No suggestions available yet.</ThemedText>
          ) : (
            <ScrollView style={{ maxHeight: 320 }}>
              {suggestions.map((s: any, i: number) => (
                <View key={i} style={{ backgroundColor: C.backgroundElevated2, borderWidth: 1, borderColor: C.border, borderRadius: Radius.md, padding: 14, marginBottom: 10 }}>
                  <ThemedText style={{ fontWeight: '700', fontSize: 14, marginBottom: 4, color: C.text }}>{s.title}</ThemedText>
                  <ThemedText style={{ fontSize: 11, color: C.textMuted, marginBottom: 8 }}>{s.reason}</ThemedText>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                    <Tag text={s.category} color={C.tint} />
                    <Tag text={s.priority} color="#3b82f6" />
                  </View>
                  <TouchableOpacity onPress={() => onUse(s)} style={[styles.smallBtn, { alignSelf: 'flex-start' }]}><ThemedText style={styles.smallBtnText}>Use this</ThemedText></TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
          <TouchableOpacity onPress={onClose} style={{ alignSelf: 'flex-end', marginTop: 10 }}>
            <ThemedText style={{ color: C.textMuted, fontSize: 13 }}>Close</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* ---------- Main Screen ---------- */
export default function GroupTasksScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const styles = makeStyles(C);
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dialog = useDialog();

  const [tasks, setTasks] = useState<any[]>([]);
  const [group, setGroup] = useState<any>(null);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [view, setView] = useState<'ASSIGNED_BY_ME' | 'ALL'>('ALL');
  const [error, setError] = useState('');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editError, setEditError] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [xpMap, setXpMap] = useState<Record<string, any>>({});

  const [form, setForm] = useState({ assignedToId: '', title: '', description: '', priority: 'MEDIUM', category: 'WORK', deadline: '', bonusCoins: '' });
  const [editForm, setEditForm] = useState({ title: '', description: '', priority: 'MEDIUM', category: 'WORK', deadline: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, groupRes] = await Promise.all([
        view === 'ASSIGNED_BY_ME' ? getTasksAssignedByMe(groupId) : getGroupTasks(groupId),
        getGroupDetail(groupId),
      ]);
      setTasks(tasksRes.data);
      setGroup(groupRes.data);
      fetchGroupXp(groupRes.data?.members || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [groupId, view]);

  const fetchGroupXp = async (members: any[]) => {
    const results: Record<string, any> = {};
    await Promise.all(members.map(async (m) => {
      const id = m.id ?? m._id;
      try { const res = await getUserXP(id); results[id] = res.data; } catch {}
    }));
    setXpMap(results);
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLoadSuggestions = async () => {
    setSuggestionsLoading(true); setShowSuggestions(true);
    try { const res = await getGroupSuggestions(groupId); setSuggestions(res.data); }
    catch { setSuggestions([]); }
    setSuggestionsLoading(false);
  };

  const handleCreate = async () => {
    setError('');
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (form.assignedToId && form.assignedToId === user?.id) {
      setError('You cannot assign a task to yourself. Use My Nest for personal tasks.');
      return;
    }
    try {
      await createGroupTask({
        ...form,
        groupId,
        assignedToId: form.assignedToId || null,
        bonusCoins: form.bonusCoins ? parseInt(form.bonusCoins) : null,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      });
      setShowCreate(false);
      setForm({ assignedToId: '', title: '', description: '', priority: 'MEDIUM', category: 'WORK', deadline: '', bonusCoins: '' });
      fetchData();
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to create task.'); }
  };

  const handleEdit = async () => {
    setEditError('');
    try {
      await editTask(editingTask.id, {
        ...editForm,
        deadline: editForm.deadline ? new Date(editForm.deadline).toISOString() : null,
      });
      setEditingTask(null); fetchData();
    }
    catch (err: any) { setEditError(err.response?.data?.message || 'Failed to update task.'); }
  };

  const handlePriorityChange = async (taskId: string, newPriority: string) => {
    try { await updateTaskPriority(taskId, newPriority); fetchData(); }
    catch { dialog.alert('Failed', 'Could not update priority'); }
  };

  const openEditModal = (task: any) => {
    setEditingTask(task); setEditError('');
    setEditForm({ title: task.title || '', description: task.description || '', priority: task.priority || 'MEDIUM', category: task.category || 'WORK', deadline: task.deadline || '' });
  };

  const getMemberName = (userId: string | null) => {
    if (!userId) return 'Unassigned';
    const member = group?.members?.find((m: any) => (m.id ?? m._id) === userId);
    return member ? member.fullName : 'Unknown';
  };

  const getMemberXpInfo = (userId: string | null) => {
    if (!userId) return { level: 1, tier: TITLE_TIERS[0] };
    const xp = xpMap[userId];
    if (!xp) return { level: 1, tier: TITLE_TIERS[0] };
    return { level: xp.level || 1, tier: getTier(xp.level || 1) };
  };

  const isAdmin = group?.adminId === user?.id;
  const filtered = filterStatus === 'ALL' ? tasks : tasks.filter((t) => t.status === filterStatus);
  const total = tasks.length;
  const pending = tasks.filter((t) => t.status === 'PENDING').length;
  const inProg = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
  const openCount = tasks.filter((t) => !t.assignedToId).length;

  if (loading) {
    return <ThemedView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={C.tint} size="large" /></ThemedView>;
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingTop: insets.top + Spacing.sm, paddingBottom: 60 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <View style={styles.headerIcon}>
            <Ionicons name="checkbox-outline" size={20} color={C.tint} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.headerTitle}>Group Tasks</ThemedText>
            <ThemedText style={styles.headerSubtitle}>{group?.name}</ThemedText>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <TouchableOpacity onPress={handleLoadSuggestions} style={styles.outlineBtn}>
            <Ionicons name="bulb-outline" size={13} color={C.tint} />
            <ThemedText style={{ fontSize: 12, color: C.tint, fontWeight: '600' }}>Suggestions</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowCreate(true)} style={styles.primaryBtn}>
            <Ionicons name="add" size={14} color={C.background} />
            <ThemedText style={{ fontSize: 12, color: C.background, fontWeight: '700' }}>Assign Task</ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }} contentContainerStyle={{ gap: 8 }}>
          {[
            { label: 'Total', value: total, icon: 'list-outline' },
            { label: 'Pending', value: pending, icon: 'time-outline' },
            { label: 'In Progress', value: inProg, icon: 'sync-outline', color: '#3b82f6' },
            { label: 'Completed', value: completed, icon: 'checkmark-circle-outline', color: C.success },
            { label: 'Open', value: openCount, icon: 'lock-open-outline', color: C.tint },
          ].map((s) => (
            <View key={s.label} style={styles.statTile}>
              <Ionicons name={s.icon as any} size={14} color={s.color || C.textMuted} style={{ marginBottom: 4 }} />
              <ThemedText style={{ fontSize: 17, fontWeight: '800', color: s.color || C.text }}>{s.value}</ThemedText>
              <ThemedText style={{ fontSize: 9.5, color: C.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 }}>{s.label}</ThemedText>
            </View>
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 }}>
          <Chip label="By Me" icon="paper-plane-outline" active={view === 'ASSIGNED_BY_ME'} onPress={() => setView('ASSIGNED_BY_ME')} C={C} />
          <Chip label="All" icon="eye-outline" active={view === 'ALL'} onPress={() => setView('ALL')} C={C} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((s) => (
            <Chip key={s} label={s.replace('_', ' ')} active={filterStatus === s} onPress={() => setFilterStatus(s)} C={C} />
          ))}
          <ThemedText style={{ fontSize: 11, color: C.textMuted, marginLeft: 'auto' }}>{filtered.length} of {tasks.length}</ThemedText>
        </View>

        {filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="file-tray-outline" size={22} color={C.textMuted} />
            </View>
            <ThemedText style={{ fontWeight: '700', color: C.text, fontSize: 13.5 }}>No tasks here</ThemedText>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filtered.map((task, i) => {
              const isOpenTask = !task.assignedToId;
              const isCreator = task.assignedById === user?.id;
              const isAssignedToMe = task.assignedToId === user?.id;
              const hasSubtasks = (task.subtasks || []).length > 0;
              const hasComments = (task.comments || []).length > 0;
              const hasPledge = !!task.pledgeMessage;
              const { level: assigneeLevel, tier: assigneeTier } = getMemberXpInfo(task.assignedToId);

              return (
                <View key={task.id ?? i} style={[styles.taskCard, isOpenTask && { borderColor: `${C.tint}45` }]}>
                  {isOpenTask && (
                    <View style={styles.openTaskBar}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Ionicons name="lock-open-outline" size={12} color={C.tint} />
                        <ThemedText style={{ fontSize: 11, fontWeight: '700', color: C.tint }}>Open Task — Anyone can claim</ThemedText>
                      </View>
                      {task.openTaskBonus && <IconTag icon="star-outline" text="Bonus" color={C.success} />}
                    </View>
                  )}
                  <View style={{ padding: 16 }}>
                    <ThemedText style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 6 }}>{task.title}</ThemedText>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                      {isAdmin && task.status !== 'COMPLETED' ? (
                        PRIORITIES.map((p) => (
                          <TouchableOpacity key={p} onPress={() => handlePriorityChange(task.id, p)} style={{ opacity: task.priority === p ? 1 : 0.4 }}>
                            <Tag text={p} color={priorityColor[p]} />
                          </TouchableOpacity>
                        ))
                      ) : (
                        <Tag text={task.priority} color={priorityColor[task.priority]} />
                      )}
                      <Tag text={task.status.replace('_', ' ')} color={statusColor[task.status]} />
                    </View>

                    {task.description ? <ThemedText style={{ color: C.textMuted, fontSize: 12, marginBottom: 8 }}>{task.description}</ThemedText> : null}

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8, alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="person-outline" size={12} color={C.textMuted} />
                        <ThemedText style={{ fontSize: 11, color: C.textMuted }}>{getMemberName(task.assignedToId)}</ThemedText>
                      </View>
                      {task.assignedToId && assigneeTier.frame !== 'none' && <Tag text={`${assigneeTier.title} Lv.${assigneeLevel}`} color={assigneeTier.color} />}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="folder-outline" size={12} color={C.textMuted} />
                        <ThemedText style={{ fontSize: 11, color: C.textMuted }}>{task.category}</ThemedText>
                      </View>
                      {task.deadline ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="time-outline" size={12} color={C.textMuted} />
                          <ThemedText style={{ fontSize: 11, color: C.textMuted }}>{new Date(task.deadline).toLocaleDateString()}</ThemedText>
                        </View>
                      ) : null}
                      <CoinTag value={task.coinsReward} color={C.tint} prefix="" />
                    </View>

                    {(hasSubtasks || hasComments || hasPledge) && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
                        {hasSubtasks && <IconTag icon="list-outline" text={`${(task.subtasks || []).filter((s: any) => s.completed).length}/${(task.subtasks || []).length}`} color="#3b82f6" />}
                        {hasComments && <IconTag icon="chatbubble-outline" text={`${(task.comments || []).length}`} color={C.success} />}
                        {hasPledge && <IconTag icon="ribbon-outline" text="pledged" color="#a855f7" />}
                      </View>
                    )}

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      <TouchableOpacity onPress={() => setSelectedTask(task)} style={styles.tinyOutline}><ThemedText style={{ fontSize: 12, color: C.tint, fontWeight: '600' }}>Details</ThemedText></TouchableOpacity>
                      {isOpenTask && !isCreator && (
                        <TouchableOpacity onPress={() => claimTask(task.id).then(fetchData)} style={styles.tinyPrimary}>
                          <Ionicons name="hand-left-outline" size={12} color={C.background} />
                          <ThemedText style={{ fontSize: 12, color: C.background, fontWeight: '700' }}>Claim</ThemedText>
                        </TouchableOpacity>
                      )}
                      {isAssignedToMe && task.status === 'PENDING' && (
                        <TouchableOpacity onPress={() => updateTaskStatus(task.id, 'IN_PROGRESS').then(fetchData)} style={styles.tinyOutline}><ThemedText style={{ fontSize: 12, color: C.tint, fontWeight: '600' }}>Start</ThemedText></TouchableOpacity>
                      )}
                      {isAssignedToMe && task.status === 'IN_PROGRESS' && (
                        <TouchableOpacity onPress={() => updateTaskStatus(task.id, 'COMPLETED').then(fetchData)} style={styles.tinyPrimary}>
                          <Ionicons name="checkmark-circle-outline" size={13} color={C.background} />
                          <ThemedText style={{ fontSize: 12, color: C.background, fontWeight: '700' }}>Done</ThemedText>
                        </TouchableOpacity>
                      )}
                      {isAssignedToMe && task.status !== 'COMPLETED' && (
                        <TouchableOpacity onPress={() => denyTask(task.id).then(fetchData)} style={styles.tinyDanger}><Ionicons name="close-outline" size={14} color={C.danger} /></TouchableOpacity>
                      )}
                      {(isCreator || isAdmin) && task.status !== 'COMPLETED' && (
                        <>
                          <TouchableOpacity onPress={() => openEditModal(task)} style={styles.tinyInfo}><Ionicons name="create-outline" size={14} color="#3b82f6" /></TouchableOpacity>
                          <TouchableOpacity onPress={() => deleteTask(task.id).then(fetchData)} style={styles.tinyDanger}><Ionicons name="trash-outline" size={14} color={C.danger} /></TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {selectedTask && (
        <TaskDetailModal task={selectedTask} user={user} xpMap={xpMap} onClose={() => setSelectedTask(null)} onRefresh={() => { fetchData(); setSelectedTask(null); }} C={C} styles={styles} />
      )}

      {showSuggestions && (
        <SuggestionsModal
          suggestions={suggestions} loading={suggestionsLoading}
          onClose={() => setShowSuggestions(false)}
          onUse={(s: any) => { setForm((f) => ({ ...f, title: s.title, category: s.category, priority: s.priority })); setShowSuggestions(false); setShowCreate(true); }}
          C={C} styles={styles}
        />
      )}

      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Ionicons name="checkbox-outline" size={16} color={C.text} />
                <ThemedText style={{ fontSize: 16, fontWeight: '800' }}>Assign Task</ThemedText>
              </View>
              <ThemedText style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>Leave "Assign To" empty for an open task</ThemedText>
              {error ? <View style={styles.errBox}><ThemedText style={{ color: C.danger, fontSize: 12 }}>{error}</ThemedText></View> : null}

              <ThemedText style={styles.label}>Title *</ThemedText>
              <TextInput style={styles.input} placeholder="What needs to be done?" placeholderTextColor={C.textMuted} value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} />

              <ThemedText style={styles.label}>Assign To</ThemedText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <Chip label="Open Task" icon="lock-open-outline" active={!form.assignedToId} onPress={() => setForm({ ...form, assignedToId: '' })} C={C} />
                {group?.members?.map((m: any) => (
                  <Chip key={m.id ?? m._id} label={m.fullName} active={form.assignedToId === (m.id ?? m._id)} onPress={() => setForm({ ...form, assignedToId: m.id ?? m._id })} C={C} />
                ))}
              </View>

              <ThemedText style={styles.label}>Description</ThemedText>
              <TextInput style={styles.input} placeholder="Optional..." placeholderTextColor={C.textMuted} value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} />

              <ThemedText style={styles.label}>Priority</ThemedText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {PRIORITIES.map((p) => <Chip key={p} label={p} active={form.priority === p} color={priorityColor[p]} onPress={() => setForm({ ...form, priority: p })} C={C} />)}
              </View>

              <ThemedText style={styles.label}>Category</ThemedText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {CATEGORIES.map((c) => <Chip key={c} label={c} active={form.category === c} onPress={() => setForm({ ...form, category: c })} C={C} />)}
              </View>

              <ThemedText style={styles.label}>Deadline (YYYY-MM-DD)</ThemedText>
              <TextInput style={styles.input} placeholder="2026-07-15" placeholderTextColor={C.textMuted} value={form.deadline} onChangeText={(v) => setForm({ ...form, deadline: v })} />

              <ThemedText style={styles.label}>Bonus Coins</ThemedText>
              <TextInput style={styles.input} placeholder="0" placeholderTextColor={C.textMuted} keyboardType="numeric" value={form.bonusCoins} onChangeText={(v) => setForm({ ...form, bonusCoins: v })} />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <TouchableOpacity onPress={() => { setShowCreate(false); setError(''); }} style={[styles.outlineBtn, { flex: 1, justifyContent: 'center' }]}><ThemedText style={{ color: C.textMuted, fontWeight: '600' }}>Cancel</ThemedText></TouchableOpacity>
                <TouchableOpacity onPress={handleCreate} style={[styles.primaryBtn, { flex: 2, justifyContent: 'center' }]}>
                  <Ionicons name="checkmark" size={15} color={C.background} />
                  <ThemedText style={{ color: C.background, fontWeight: '700' }}>Assign Task</ThemedText>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!editingTask} transparent animationType="fade" onRequestClose={() => setEditingTask(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <Ionicons name="create-outline" size={16} color={C.text} />
                <ThemedText style={{ fontSize: 16, fontWeight: '800' }}>Edit Task</ThemedText>
              </View>
              {editError ? <View style={styles.errBox}><ThemedText style={{ color: C.danger, fontSize: 12 }}>{editError}</ThemedText></View> : null}

              <ThemedText style={styles.label}>Title *</ThemedText>
              <TextInput style={styles.input} value={editForm.title} onChangeText={(v) => setEditForm({ ...editForm, title: v })} placeholderTextColor={C.textMuted} />

              <ThemedText style={styles.label}>Description</ThemedText>
              <TextInput style={styles.input} value={editForm.description} onChangeText={(v) => setEditForm({ ...editForm, description: v })} placeholderTextColor={C.textMuted} />

              <ThemedText style={styles.label}>Priority</ThemedText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {PRIORITIES.map((p) => <Chip key={p} label={p} active={editForm.priority === p} color={priorityColor[p]} onPress={() => setEditForm({ ...editForm, priority: p })} C={C} />)}
              </View>

              <ThemedText style={styles.label}>Category</ThemedText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {CATEGORIES.map((c) => <Chip key={c} label={c} active={editForm.category === c} onPress={() => setEditForm({ ...editForm, category: c })} C={C} />)}
              </View>

              <ThemedText style={styles.label}>Deadline (YYYY-MM-DD)</ThemedText>
              <TextInput style={styles.input} value={editForm.deadline} onChangeText={(v) => setEditForm({ ...editForm, deadline: v })} placeholderTextColor={C.textMuted} />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <TouchableOpacity onPress={() => setEditingTask(null)} style={[styles.outlineBtn, { flex: 1, justifyContent: 'center' }]}><ThemedText style={{ color: C.textMuted, fontWeight: '600' }}>Cancel</ThemedText></TouchableOpacity>
                <TouchableOpacity onPress={handleEdit} style={[styles.primaryBtn, { flex: 2, justifyContent: 'center' }]}><ThemedText style={{ color: C.background, fontWeight: '700' }}>Save Changes</ThemedText></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const makeStyles = (C: typeof Colors.dark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },

  headerIcon: { width: 42, height: 42, borderRadius: Radius.md, backgroundColor: C.backgroundElevated, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, color: C.text },
  headerSubtitle: { fontSize: 12.5, color: C.textMuted, marginTop: 2 },

  statTile: { backgroundColor: C.backgroundElevated, borderWidth: 1, borderColor: C.border, borderRadius: Radius.md, padding: 12, minWidth: 84 },

  taskCard: { backgroundColor: C.backgroundElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  openTaskBar: { backgroundColor: `${C.tint}12`, paddingVertical: 6, paddingHorizontal: 14, borderBottomWidth: 1, borderColor: `${C.tint}25`, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  emptyWrap: { alignItems: 'center', padding: 48, backgroundColor: C.backgroundElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed' },
  emptyIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: C.backgroundElevated2, borderWidth: 1, borderColor: C.border, marginBottom: 10 },

  label: { fontSize: 11, fontWeight: '700', color: C.textMuted, marginTop: 14, marginBottom: 6, textTransform: 'uppercase' },
  input: { flex: 1, backgroundColor: C.backgroundElevated2, borderWidth: 1, borderColor: C.border, borderRadius: Radius.sm, color: C.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  primaryBtn: { backgroundColor: C.tint, borderRadius: Radius.sm, paddingVertical: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 5 },
  outlineBtn: { borderWidth: 1, borderColor: C.tint, borderRadius: Radius.sm, paddingVertical: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 5 },
  smallBtn: { backgroundColor: C.tint, borderRadius: Radius.sm, paddingVertical: 8, paddingHorizontal: 14 },
  smallBtnText: { color: C.background, fontWeight: '700', fontSize: 13 },
  tinyOutline: { borderWidth: 1, borderColor: `${C.tint}35`, backgroundColor: `${C.tint}10`, borderRadius: Radius.sm, paddingVertical: 6, paddingHorizontal: 10 },
  tinyPrimary: { backgroundColor: C.tint, borderRadius: Radius.sm, paddingVertical: 6, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  tinyDanger: { borderWidth: 1, borderColor: `${C.danger}30`, backgroundColor: `${C.danger}10`, borderRadius: Radius.sm, paddingVertical: 6, paddingHorizontal: 10 },
  tinyInfo: { borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: Radius.sm, paddingVertical: 6, paddingHorizontal: 10 },
  errBox: { backgroundColor: `${C.danger}10`, borderWidth: 1, borderColor: C.danger, borderRadius: Radius.sm, padding: 10, marginBottom: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalBox: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: Radius.lg, padding: 22, width: '100%', maxWidth: 480, maxHeight: '85%' },
});
