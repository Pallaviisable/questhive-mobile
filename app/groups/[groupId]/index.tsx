import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import {
  deactivateMember,
  deleteGroup,
  getGroupActivities,
  getGroupDetail,
  getGroupMemberAnalytics,
  getRedeemHistory,
  getUserXP,
  inviteByEmail, leaveGroup,
  reactivateMember,
  removeMember,
} from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, RefreshControl, ScrollView, StyleSheet, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

const C = Colors.dark;

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

const TIER_ICON: Record<string, any> = {
  elite: 'trophy-outline', purple: 'diamond-outline', gold: 'star-outline', silver: 'medal-outline', bronze: 'medal-outline', none: 'person-outline',
};

const ACTIVITY_ICON: Record<string, any> = {
  TASK_ASSIGNED: 'clipboard-outline', TASK_COMPLETED: 'checkmark-circle-outline', TASK_DENIED: 'close-circle-outline',
  TASK_CLAIMED: 'hand-left-outline', REWARD_REDEEMED: 'gift-outline', MEMBER_JOINED: 'log-in-outline',
  MEMBER_LEFT: 'log-out-outline', MEMBER_REMOVED: 'person-remove-outline', OPEN_TASK_REMINDER: 'time-outline',
  OPEN_TASK_PENALTY: 'alert-circle-outline', PLEDGE_MADE: 'handshake-outline', PLEDGE_FULFILLED: 'checkmark-circle-outline',
  PLEDGE_MISSED: 'close-circle-outline',
};

const TABS = [
  { key: 'MEMBERS', label: 'Members' },
  { key: 'ANALYTICS', label: 'Analytics' },
  { key: 'HALL_OF_FAME', label: 'Hall of Fame' },
  { key: 'ACTIVITY', label: 'Activity' },
  { key: 'REWARDS', label: 'Rewards' },
] as const;
type TabKey = typeof TABS[number]['key'];

function StatRing({ value, max, color, size = 48 }: { value: number; max: number; color: string; size?: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const r = size / 2 - 4;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.backgroundElevated2} strokeWidth={3.5} />
      <Circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3.5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <SvgText x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize={10} fontWeight="700" fill={color}>
        {pct}%
      </SvgText>
    </Svg>
  );
}

function Avatar({ name, size = 34, ringColor }: { name?: string; size?: number; ringColor?: string }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: C.backgroundElevated2, alignItems: 'center', justifyContent: 'center',
      borderWidth: ringColor ? 1.5 : 1, borderColor: ringColor || C.border,
    }}>
      <ThemedText style={{ color: C.text, fontWeight: '700', fontSize: size * 0.38 }}>
        {name?.[0]?.toUpperCase() || '?'}
      </ThemedText>
    </View>
  );
}

function LevelPill({ level, color }: { level: number; color: string }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: C.backgroundElevated2, borderWidth: 1, borderColor: C.border,
      borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2,
    }}>
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />
      <ThemedText style={{ fontSize: 10, fontWeight: '700', color: C.textMuted }}>LV {level}</ThemedText>
    </View>
  );
}

function Tag({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ backgroundColor: `${color}15`, borderColor: `${color}40`, borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 7, paddingVertical: 2 }}>
      <ThemedText style={{ fontSize: 9.5, fontWeight: '700', color, letterSpacing: 0.3 }}>{text}</ThemedText>
    </View>
  );
}

function GhostButton({ label, icon, color = C.text, borderColor = C.border, onPress }: { label: string; icon?: any; color?: string; borderColor?: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor, borderRadius: Radius.sm, paddingVertical: 8, paddingHorizontal: 14 }}>
      {icon && <Ionicons name={icon} size={13} color={color} />}
      <ThemedText style={{ color, fontWeight: '600', fontSize: 12.5 }}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

// ---------- Analytics tab ----------
function MemberAnalyticsTab({ groupId, currentUserId, adminId }: { groupId: string; currentUserId?: string; adminId?: string }) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('tasksCompleted');
  const [error, setError] = useState('');

  useEffect(() => {
    getGroupMemberAnalytics(groupId)
      .then(r => setMembers(r.data))
      .catch(() => setError('Failed to load analytics.'))
      .finally(() => setLoading(false));
  }, [groupId]);

  const sorted = [...members].sort((a, b) => (b[sort] || 0) - (a[sort] || 0));
  const SORT_OPTIONS = [
    { key: 'tasksCompleted', label: 'Tasks done' },
    { key: 'completionRatePercent', label: 'Completion' },
    { key: 'coins', label: 'Coins' },
    { key: 'totalXp', label: 'XP' },
    { key: 'streak', label: 'Streak' },
  ];

  if (loading) return <ActivityIndicator color={C.tint} style={{ marginVertical: 40 }} />;
  if (error) return <ThemedText style={{ color: C.danger, padding: 24 }}>{error}</ThemedText>;
  if (members.length === 0) return <ThemedText style={{ textAlign: 'center', padding: 40, color: C.textMuted }}>No members found.</ThemedText>;

  const totalTasks = members.reduce((s, m) => s + m.tasksAssigned, 0);
  const totalDone = members.reduce((s, m) => s + m.tasksCompleted, 0);
  const groupRate = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg }}>
        {[
          { label: 'Group tasks', value: totalTasks },
          { label: 'Completed', value: totalDone },
          { label: 'Completion rate', value: `${groupRate}%` },
          { label: 'Members', value: members.length },
        ].map((s, i) => (
          <View key={i} style={styles.statTile}>
            <ThemedText style={styles.statTileValue}>{s.value}</ThemedText>
            <ThemedText style={styles.statTileLabel}>{s.label}</ThemedText>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.md }}>
        {SORT_OPTIONS.map(o => (
          <TouchableOpacity key={o.key} onPress={() => setSort(o.key)} style={[styles.sortChip, sort === o.key && styles.sortChipActive]}>
            <ThemedText style={sort === o.key ? styles.sortChipTextActive : styles.sortChipText}>{o.label}</ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ gap: Spacing.sm }}>
        {sorted.map((m, i) => {
          const tier = getTier(m.level);
          const isMe = m.userId === currentUserId;
          const rateColor = m.completionRatePercent >= 80 ? C.success : m.completionRatePercent >= 50 ? '#f59e0b' : C.danger;
          return (
            <View key={m.userId} style={[styles.analyticsRow, isMe && { borderColor: `${C.tint}55` }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <View style={{ width: 20, alignItems: 'center' }}>
                  <ThemedText style={{ fontSize: 12, fontWeight: '700', color: i < 3 ? C.tint : C.textMuted }}>#{i + 1}</ThemedText>
                </View>
                <Avatar name={m.fullName} ringColor={tier.frame !== 'none' ? tier.color : undefined} />
                <View style={{ flex: 1, minWidth: 100 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <ThemedText style={{ fontSize: 13.5, fontWeight: '700', color: isMe ? C.tint : C.text }}>{m.fullName}{isMe ? ' (You)' : ''}</ThemedText>
                    {m.userId === adminId && <Tag text="ADMIN" color={C.tint} />}
                    <LevelPill level={m.level ?? 1} color={tier.color} />
                  </View>
                  <ThemedText style={{ fontSize: 10.5, color: C.textMuted, fontWeight: '600', marginTop: 2 }}>{tier.title}</ThemedText>
                </View>
                <StatRing value={m.tasksCompleted} max={m.tasksAssigned} color={rateColor} />
                <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Done', value: m.tasksCompleted },
                    { label: 'Denied', value: m.tasksDenied },
                    { label: 'Pending', value: m.tasksPending },
                    { label: 'Coins', value: m.coins },
                    { label: 'XP', value: m.totalXp },
                    { label: 'Streak', value: m.streak },
                  ].map((s, j) => (
                    <View key={j} style={{ alignItems: 'center', minWidth: 34 }}>
                      <ThemedText style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{s.value}</ThemedText>
                      <ThemedText style={{ fontSize: 8.5, color: C.textMuted, fontWeight: '600' }}>{s.label.toUpperCase()}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
              {m.tasksAssigned > 0 && (
                <View style={{ marginTop: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <ThemedText style={{ fontSize: 10, color: C.textMuted }}>
                      {m.tasksCompleted}/{m.tasksAssigned} tasks completed
                    </ThemedText>
                    <ThemedText style={{ fontSize: 10, color: rateColor, fontWeight: '700' }}>
                      {m.completionRatePercent}%
                    </ThemedText>
                  </View>
                  <View style={{ backgroundColor: C.backgroundElevated2, borderRadius: Radius.full, height: 3, overflow: 'hidden' }}>
                    <View style={{ height: '100%', borderRadius: Radius.full, backgroundColor: rateColor, width: `${m.completionRatePercent}%` }} />
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ---------- Main screen ----------
export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const [xpMap, setXpMap] = useState<Record<string, any>>({});
  const [inviteEmail, setInviteEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('MEMBERS');
  const [activities, setActivities] = useState<any[]>([]);
  const [groupRewards, setGroupRewards] = useState<any[]>([]);

  const [confirmModal, setConfirmModal] = useState<{ title: string; icon: any; message: string; confirmLabel: string; onConfirm: () => void } | null>(null);
  const [reasonModal, setReasonModal] = useState<{ title: string; subtitle: string; btnLabel: string; btnColor: string; onConfirm: (r: string) => void } | null>(null);
  const [reasonText, setReasonText] = useState('');

  const fetchGroup = useCallback(async () => {
    try {
      const res = await getGroupDetail(groupId);
      setGroup(res.data);
      fetchXpForMembers(res.data?.members || []);
    } catch { setError('Failed to load group.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [groupId]);

  const fetchXpForMembers = async (members: any[]) => {
    const results: Record<string, any> = {};
    await Promise.all(members.map(async (m) => {
      const memberId = m.id ?? m._id;
      try {
        const res = await getUserXP(memberId);
        results[memberId] = res.data;
      } catch { }
    }));
    setXpMap(results);
  };

  const getXpInfo = (userId: string) => {
    const xp = xpMap[userId];
    if (!xp) return { level: 1, tier: TITLE_TIERS[0] };
    return { level: xp.level || 1, tier: getTier(xp.level || 1) };
  };

  const fetchActivities = useCallback(async () => {
    try { const r = await getGroupActivities(groupId); setActivities(r.data); } catch { }
  }, [groupId]);
  const fetchGroupRewards = useCallback(async () => {
    try { const r = await getRedeemHistory(groupId); setGroupRewards(r.data); } catch { }
  }, [groupId]);

  useEffect(() => {
    fetchGroup(); fetchActivities(); fetchGroupRewards();
  }, [fetchGroup, fetchActivities, fetchGroupRewards]);

  const onRefresh = () => { setRefreshing(true); fetchGroup(); fetchActivities(); fetchGroupRewards(); };

  const handleInvite = async () => {
    setMsg(''); setError('');
    try { await inviteByEmail(groupId, inviteEmail); setMsg('Invite sent!'); setInviteEmail(''); }
    catch (err: any) { setError(err.response?.data?.message || 'Failed to send invite.'); }
  };

  const handleLeaveGroup = () => setConfirmModal({
    title: 'Leave Group', icon: 'log-out-outline', message: 'Are you sure you want to leave this group?', confirmLabel: 'Yes, Leave',
    onConfirm: async () => {
      try { await leaveGroup(groupId); router.replace('/groups' as any); }
      catch (err: any) { setError(err.response?.data?.message || 'Failed.'); }
      finally { setConfirmModal(null); }
    },
  });

  const handleDeleteGroup = () => setConfirmModal({
    title: 'Delete Group', icon: 'trash-outline', message: 'This permanently deletes the group for everyone. Continue?', confirmLabel: 'Yes, Delete',
    onConfirm: async () => {
      try { await deleteGroup(groupId); router.replace('/groups' as any); }
      catch (err: any) { setError(err.response?.data?.message || 'Failed.'); }
      finally { setConfirmModal(null); }
    },
  });

  const handleDeactivateMember = (member: any) => setReasonModal({
    title: 'Deactivate Member', subtitle: `Deactivate ${member.fullName}?`, btnLabel: 'Deactivate', btnColor: C.tint,
    onConfirm: async (reason) => {
      try { await deactivateMember(groupId, member.id, reason); setMsg(`${member.fullName} deactivated.`); fetchGroup(); }
      catch (err: any) { setError(err.response?.data?.message || 'Failed.'); }
      finally { setReasonModal(null); setReasonText(''); }
    },
  });

  const handleReactivateMember = async (member: any) => {
    try { await reactivateMember(groupId, member.id); setMsg(`${member.fullName} reactivated.`); fetchGroup(); }
    catch (err: any) { setError(err.response?.data?.message || 'Failed.'); }
  };

  const handleRemoveMember = (member: any) => setReasonModal({
    title: 'Remove Member', subtitle: `Remove ${member.fullName} from this group?`, btnLabel: 'Remove', btnColor: C.danger,
    onConfirm: async (reason) => {
      try { await removeMember(groupId, member.id, reason); setMsg(`${member.fullName} removed.`); fetchGroup(); }
      catch (err: any) { setError(err.response?.data?.message || 'Failed.'); }
      finally { setReasonModal(null); setReasonText(''); }
    },
  });

  const isAdmin = user?.id === group?.adminId;
  const deactivatedIds = group?.deactivatedMemberIds || [];
  const validMembers = group?.members?.filter((m: any) => m.fullName && m.fullName !== 'Unknown User') || [];

  const quickLinks = [
    { label: 'Tasks', icon: 'checkbox-outline', href: `/groups/${groupId}/tasks` },
    { label: 'Leaderboard', icon: 'podium-outline', href: `/groups/${groupId}/leaderboard` },
    { label: 'Chat', icon: 'chatbubbles-outline', href: `/groups/${groupId}/chat` },
    { label: 'Fairness', icon: 'scale-outline', href: `/groups/${groupId}/fairness` },
  ];

  const TITLE_TIERS_DISPLAY = TITLE_TIERS.slice(1).reverse();
  const hallOfFame = TITLE_TIERS_DISPLAY.map(tier => {
    const holders = validMembers
      .map((m: any) => ({ member: m, ...getXpInfo(m.id ?? m._id) }))
      .filter(({ level }: any) => getTier(level).frame === tier.frame)
      .sort((a: any, b: any) => b.level - a.level);
    return { tier, holders };
  });

  if (loading) {
    return (
      <ThemedView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.tint} size="large" />
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.md, paddingTop: insets.top + Spacing.sm, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.tint} />}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 }}>
          <View style={styles.headerIcon}>
            <Ionicons name="people-outline" size={22} color={C.tint} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.headerTitle}>{group?.name}</ThemedText>
            {group?.description ? <ThemedText style={styles.headerSubtitle} numberOfLines={2}>{group.description}</ThemedText> : null}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.md, marginBottom: Spacing.lg }} contentContainerStyle={{ gap: 8 }}>
          {quickLinks.map(link => (
            <GhostButton key={link.href} label={link.label} icon={link.icon} onPress={() => router.push(link.href as any)} />
          ))}
        </ScrollView>

        {msg ? (
          <View style={styles.msgBox}>
            <Ionicons name="checkmark-circle" size={14} color={C.success} />
            <ThemedText style={{ color: C.success, fontSize: 12.5 }}>{msg}</ThemedText>
          </View>
        ) : null}
        {error ? (
          <View style={styles.errBox}>
            <Ionicons name="alert-circle" size={14} color={C.danger} />
            <ThemedText style={{ color: C.danger, fontSize: 12.5 }}>{error}</ThemedText>
          </View>
        ) : null}

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.lg }}>
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: C.border }}>
            {TABS.map(t => (
              <TouchableOpacity key={t.key} onPress={() => setActiveTab(t.key)} style={{
                paddingVertical: 9, paddingHorizontal: 14,
                borderBottomWidth: 2, borderColor: activeTab === t.key ? C.tint : 'transparent',
              }}>
                <ThemedText style={{ fontSize: 12.5, fontWeight: activeTab === t.key ? '700' : '600', color: activeTab === t.key ? C.text : C.textMuted }}>
                  {t.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Members */}
        {activeTab === 'MEMBERS' && (
          <View style={{ gap: Spacing.md }}>
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <ThemedText style={styles.cardTitle}>Members</ThemedText>
                <ThemedText style={styles.cardTitleCount}>{validMembers.length}</ThemedText>
              </View>
              <View style={{ gap: 6 }}>
                {validMembers.map((member: any, i: number) => {
                  const isDeactivated = deactivatedIds.includes(member.id);
                  const memberId = member.id ?? member._id;
                  const { tier, level } = getXpInfo(memberId);
                  return (
                    <View key={i} style={[styles.memberRow, isDeactivated && styles.memberRowDeactivated]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <Avatar name={member.fullName} ringColor={tier.frame !== 'none' ? tier.color : undefined} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <ThemedText style={{ fontSize: 13.5, fontWeight: '600', color: isDeactivated ? C.textMuted : C.text }}>{member.fullName}</ThemedText>
                            <LevelPill level={level} color={tier.color} />
                          </View>
                          <ThemedText style={{ fontSize: 10.5, color: C.textMuted, fontWeight: '600', marginTop: 2 }}>{tier.title}</ThemedText>
                        </View>
                        {memberId === group?.adminId && <Tag text="ADMIN" color={C.tint} />}
                        {isDeactivated && <Tag text="DEACTIVATED" color={C.danger} />}
                      </View>
                      {isAdmin && memberId !== (user?.id ?? user?._id) && (
                        <View style={{ flexDirection: 'row', gap: 14 }}>
                          {isDeactivated
                            ? <TouchableOpacity onPress={() => handleReactivateMember(member)}><ThemedText style={{ color: C.success, fontSize: 11.5, fontWeight: '700' }}>Reactivate</ThemedText></TouchableOpacity>
                            : <TouchableOpacity onPress={() => handleDeactivateMember(member)}><ThemedText style={{ color: C.textMuted, fontSize: 11.5, fontWeight: '700' }}>Deactivate</ThemedText></TouchableOpacity>}
                          <TouchableOpacity onPress={() => handleRemoveMember(member)}><ThemedText style={{ color: C.danger, fontSize: 11.5, fontWeight: '700' }}>Remove</ThemedText></TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {isAdmin && (
              <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <ThemedText style={styles.cardTitle}>Invite by email</ThemedText>
                </View>
                <ThemedText style={{ color: C.textMuted, fontSize: 11.5, marginBottom: Spacing.sm }}>An invite link will be sent to their email.</ThemedText>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={styles.input} placeholder="member@example.com" placeholderTextColor={C.textMuted}
                    value={inviteEmail} onChangeText={setInviteEmail} keyboardType="email-address" autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={handleInvite} style={styles.primaryBtn}>
                    <ThemedText style={{ color: C.background, fontWeight: '700', fontSize: 12.5 }}>Send</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={{ alignItems: 'flex-end' }}>
              {!isAdmin && <GhostButton label="Leave group" icon="log-out-outline" color={C.danger} borderColor={C.danger} onPress={handleLeaveGroup} />}
              {isAdmin && <GhostButton label="Delete group" icon="trash-outline" color={C.danger} borderColor={C.danger} onPress={handleDeleteGroup} />}
            </View>
          </View>
        )}

        {activeTab === 'ANALYTICS' && (
          <MemberAnalyticsTab groupId={groupId} currentUserId={user?.id} adminId={group?.adminId} />
        )}

        {activeTab === 'HALL_OF_FAME' && (
          <View style={{ gap: Spacing.sm }}>
            {hallOfFame.map(({ tier, holders }) => (
              <View key={tier.frame} style={[styles.tierCard, { borderLeftColor: tier.color }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <View style={[styles.tierIconBox, { borderColor: `${tier.color}55` }]}>
                    <Ionicons name={TIER_ICON[tier.frame] ?? 'medal-outline'} size={14} color={tier.color} />
                  </View>
                  <View>
                    <ThemedText style={{ fontWeight: '700', fontSize: 13, color: C.text }}>{tier.title}</ThemedText>
                    <ThemedText style={{ fontSize: 10.5, color: C.textMuted }}>Level {tier.minLevel}+ required</ThemedText>
                  </View>
                </View>
                {holders.length === 0
                  ? <ThemedText style={{ color: C.textMuted, fontSize: 12, fontStyle: 'italic' }}>Nobody yet — be the first to reach Level {tier.minLevel}!</ThemedText>
                  : <View style={{ gap: 6 }}>
                    {holders.map(({ member, level }: any) => {
                      const isMe = (member.id ?? member._id) === (user?.id ?? user?._id);
                      return (
                        <View key={member.id ?? member._id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, backgroundColor: C.backgroundElevated, borderRadius: Radius.sm }}>
                          <Avatar name={member.fullName} size={26} ringColor={tier.color} />
                          <ThemedText style={{ flex: 1, fontSize: 12.5, fontWeight: '600', color: isMe ? C.tint : C.text }}>{member.fullName}{isMe ? ' (You)' : ''}</ThemedText>
                          <Tag text={`LV ${level}`} color={tier.color} />
                        </View>
                      );
                    })}
                  </View>}
              </View>
            ))}
          </View>
        )}

        {activeTab === 'ACTIVITY' && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <ThemedText style={styles.cardTitle}>Group activity</ThemedText>
            </View>
            {activities.length === 0
              ? <ThemedText style={{ color: C.textMuted, textAlign: 'center', padding: 32, fontSize: 12.5 }}>No activity yet. Start assigning tasks!</ThemedText>
              : <View style={{ gap: 6 }}>
                {activities.map((a, i) => (
                  <View key={i} style={styles.timelineRow}>
                    <View style={styles.timelineIcon}>
                      <Ionicons name={ACTIVITY_ICON[a.type] || 'bookmark-outline'} size={14} color={C.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={{ fontSize: 12.5, fontWeight: '600' }}>
                        <ThemedText style={{ color: C.tint }}>{a.actorName}</ThemedText>
                        {a.targetName ? <ThemedText style={{ color: C.textMuted }}> → {a.targetName}</ThemedText> : null}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>{a.detail}</ThemedText>
                      {a.coins !== 0 ? <ThemedText style={{ fontSize: 10.5, color: a.coins > 0 ? C.success : C.danger, marginTop: 2, fontWeight: '700' }}>{a.coins > 0 ? `+${a.coins}` : a.coins} coins</ThemedText> : null}
                    </View>
                    <ThemedText style={{ fontSize: 10, color: C.textMuted, textAlign: 'right' }}>
                      {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{'\n'}
                      {new Date(a.createdAt).toLocaleDateString()}
                    </ThemedText>
                  </View>
                ))}
              </View>}
          </View>
        )}

        {activeTab === 'REWARDS' && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <ThemedText style={styles.cardTitle}>Reward redemptions</ThemedText>
            </View>
            {groupRewards.length === 0
              ? <ThemedText style={{ color: C.textMuted, textAlign: 'center', padding: 32, fontSize: 12.5 }}>No rewards redeemed yet.</ThemedText>
              : <View style={{ gap: 6 }}>
                {groupRewards.map((r, i) => (
                  <View key={i} style={styles.timelineRow}>
                    <View style={styles.timelineIcon}>
                      <Ionicons name="gift-outline" size={14} color={C.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={{ fontSize: 12.5, fontWeight: '600' }}>{r.description}</ThemedText>
                      <ThemedText style={{ fontSize: 11, color: C.textMuted }}>{new Date(r.earnedAt).toLocaleDateString()}</ThemedText>
                    </View>
                    <ThemedText style={{ color: C.danger, fontWeight: '700', fontSize: 12.5 }}>-{r.coinsEarned}</ThemedText>
                  </View>
                ))}
              </View>}
          </View>
        )}
      </ScrollView>

      {/* Confirm modal (leave / delete) */}
      <Modal visible={!!confirmModal} transparent animationType="fade" onRequestClose={() => setConfirmModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              {confirmModal?.icon && <Ionicons name={confirmModal.icon} size={17} color={C.danger} />}
              <ThemedText style={{ fontSize: 16, fontWeight: '700' }}>{confirmModal?.title}</ThemedText>
            </View>
            <ThemedText style={{ color: C.textMuted, fontSize: 13, marginBottom: 20, lineHeight: 19 }}>{confirmModal?.message}</ThemedText>
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <GhostButton label="Cancel" onPress={() => setConfirmModal(null)} />
              <TouchableOpacity onPress={confirmModal?.onConfirm} style={styles.dangerBtn}>
                <ThemedText style={{ color: '#fff', fontWeight: '700', fontSize: 12.5 }}>{confirmModal?.confirmLabel}</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reason modal (deactivate / remove) */}
      <Modal visible={!!reasonModal} transparent animationType="fade" onRequestClose={() => { setReasonModal(null); setReasonText(''); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ThemedText style={{ fontSize: 16, fontWeight: '700', marginBottom: 6 }}>{reasonModal?.title}</ThemedText>
            <ThemedText style={{ color: C.textMuted, fontSize: 12.5, marginBottom: 14 }}>{reasonModal?.subtitle}</ThemedText>
            <TextInput
              style={[styles.input, { height: 76, textAlignVertical: 'top', width: '100%' }]}
              placeholder="Write a reason (optional)..." placeholderTextColor={C.textMuted}
              value={reasonText} onChangeText={setReasonText} multiline
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
              <GhostButton label="Cancel" onPress={() => { setReasonModal(null); setReasonText(''); }} />
              <TouchableOpacity onPress={() => reasonModal?.onConfirm(reasonText)} style={[styles.dangerBtn, reasonModal?.btnColor !== C.danger && { backgroundColor: reasonModal?.btnColor }]}>
                <ThemedText style={{ color: reasonModal?.btnColor === C.danger ? '#fff' : C.background, fontWeight: '700', fontSize: 12.5 }}>{reasonModal?.btnLabel}</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  headerIcon: { width: 46, height: 46, borderRadius: Radius.md, backgroundColor: C.backgroundElevated, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 19, fontWeight: '700', letterSpacing: -0.3, color: C.text },
  headerSubtitle: { fontSize: 12.5, color: C.textMuted, marginTop: 2 },

  card: { backgroundColor: C.backgroundElevated, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: C.border },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  cardTitle: { fontSize: 13.5, fontWeight: '700', color: C.text },
  cardTitleCount: { fontSize: 12, fontWeight: '600', color: C.textMuted },

  memberRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 10, borderRadius: Radius.sm, backgroundColor: C.backgroundElevated2, borderWidth: 1, borderColor: C.border,
  },
  memberRowDeactivated: { borderColor: `${C.danger}40`, opacity: 0.85 },

  input: {
    flex: 1, backgroundColor: C.backgroundElevated2, borderWidth: 1, borderColor: C.border,
    borderRadius: Radius.sm, color: C.text, paddingHorizontal: 12, paddingVertical: 9, fontSize: 12.5,
  },
  primaryBtn: { backgroundColor: C.tint, borderRadius: Radius.sm, paddingVertical: 9, paddingHorizontal: 16, justifyContent: 'center' },
  dangerBtn: { backgroundColor: C.danger, borderRadius: Radius.sm, paddingVertical: 9, paddingHorizontal: 18, justifyContent: 'center' },

  msgBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${C.success}12`, borderWidth: 1, borderColor: `${C.success}40`, borderRadius: Radius.sm, padding: 9, marginBottom: Spacing.sm },
  errBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${C.danger}12`, borderWidth: 1, borderColor: `${C.danger}40`, borderRadius: Radius.sm, padding: 9, marginBottom: Spacing.sm },

  statTile: { backgroundColor: C.backgroundElevated, borderWidth: 1, borderColor: C.border, borderRadius: Radius.md, padding: 14, alignItems: 'center', minWidth: 120, flex: 1 },
  statTileValue: { fontSize: 19, fontWeight: '700', color: C.text },
  statTileLabel: { fontSize: 9.5, color: C.textMuted, marginTop: 4, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },

  sortChip: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: Radius.sm, backgroundColor: C.backgroundElevated, borderWidth: 1, borderColor: C.border },
  sortChipActive: { backgroundColor: `${C.tint}15`, borderColor: C.tint },
  sortChipText: { fontSize: 11.5, fontWeight: '600', color: C.textMuted },
  sortChipTextActive: { fontSize: 11.5, fontWeight: '700', color: C.tint },

  analyticsRow: { backgroundColor: C.backgroundElevated, borderRadius: Radius.md, padding: 14, borderWidth: 1, borderColor: C.border },

  tierCard: { backgroundColor: C.backgroundElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, padding: Spacing.md },
  tierIconBox: { width: 30, height: 30, borderRadius: Radius.sm, backgroundColor: C.backgroundElevated2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 10, backgroundColor: C.backgroundElevated2, borderRadius: Radius.sm },
  timelineIcon: { width: 28, height: 28, borderRadius: Radius.sm, backgroundColor: C.backgroundElevated, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  modalBox: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: Radius.lg, padding: Spacing.lg, width: '100%', maxWidth: 420 },
});