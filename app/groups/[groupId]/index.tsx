import { useCallback, useEffect, useState } from 'react';
import {
  ScrollView, View, TextInput, TouchableOpacity, Modal,
  ActivityIndicator, StyleSheet, RefreshControl,
} from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing, Radius } from '@/constants/theme';
import {
  getGroupDetail, inviteByEmail, leaveGroup, deleteGroup, removeMember,
  getGroupActivities, getRedeemHistory, deactivateMember, reactivateMember,
  getUserXP, getGroupMemberAnalytics,
} from '@/lib/api';

const C = Colors.dark;

const TITLE_TIERS = [
  { frame: 'none',   title: 'Newcomer',       minLevel: 1,  color: '#666'    },
  { frame: 'bronze', title: 'Task Starter',   minLevel: 3,  color: '#cd7f32' },
  { frame: 'silver', title: 'Steady Worker',  minLevel: 6,  color: '#c0c0c0' },
  { frame: 'gold',   title: 'Dedicated Bee',  minLevel: 10, color: '#f5c518' },
  { frame: 'purple', title: 'Quest Champion', minLevel: 15, color: '#a855f7' },
  { frame: 'elite',  title: 'Elite Bee',      minLevel: 20, color: '#ef4444' },
];
function getTier(level = 1) {
  let t = TITLE_TIERS[0];
  for (const x of TITLE_TIERS) if (level >= x.minLevel) t = x;
  return t;
}

const TIER_ICON: Record<string, any> = {
  elite: 'trophy', purple: 'diamond', gold: 'star', silver: 'medal', bronze: 'medal', none: 'medal-outline',
};

const ACTIVITY_ICON: Record<string, any> = {
  TASK_ASSIGNED: 'clipboard-outline', TASK_COMPLETED: 'checkmark-circle-outline', TASK_DENIED: 'close-circle-outline',
  TASK_CLAIMED: 'hand-left-outline', REWARD_REDEEMED: 'gift-outline', MEMBER_JOINED: 'log-in-outline',
  MEMBER_LEFT: 'log-out-outline', MEMBER_REMOVED: 'person-remove-outline', OPEN_TASK_REMINDER: 'time-outline',
  OPEN_TASK_PENALTY: 'alert-circle-outline', PLEDGE_MADE: 'handshake-outline', PLEDGE_FULFILLED: 'checkmark-circle-outline',
  PLEDGE_MISSED: 'close-circle-outline',
};

const TABS = [
  { key: 'MEMBERS',      label: 'Members',      icon: 'people-outline'       },
  { key: 'ANALYTICS',    label: 'Analytics',    icon: 'stats-chart-outline'  },
  { key: 'HALL_OF_FAME', label: 'Hall of Fame', icon: 'trophy-outline'       },
  { key: 'ACTIVITY',     label: 'Activity',     icon: 'notifications-outline' },
  { key: 'REWARDS',      label: 'Rewards',      icon: 'gift-outline'         },
] as const;
type TabKey = typeof TABS[number]['key'];

function StatRing({ value, max, color, size = 56 }: { value: number; max: number; color: string; size?: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.backgroundElevated} strokeWidth={4} />
      <Circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <SvgText x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize={11} fontWeight="700" fill={color}>
        {pct}%
      </SvgText>
    </Svg>
  );
}

function Avatar({ name, color, size = 36, glow }: { name?: string; color?: string; size?: number; glow?: string }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color || '#f5c518', alignItems: 'center', justifyContent: 'center',
      borderWidth: glow ? 2 : 0, borderColor: glow,
    }}>
      <ThemedText style={{ color: '#000', fontWeight: '800', fontSize: size * 0.4 }}>
        {name?.[0]?.toUpperCase() || '?'}
      </ThemedText>
    </View>
  );
}

function LevelPill({ level, color }: { level: number; color: string }) {
  return (
    <View style={{
      backgroundColor: `${color}18`, borderWidth: 1, borderColor: `${color}45`,
      borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2,
    }}>
      <ThemedText style={{ fontSize: 10, fontWeight: '800', color }}>LV {level}</ThemedText>
    </View>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ backgroundColor: `${color}22`, borderColor: `${color}55`, borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 }}>
      <ThemedText style={{ fontSize: 10, fontWeight: '700', color }}>{text}</ThemedText>
    </View>
  );
}

function OutlineButton({ label, icon, color = C.tint, onPress }: { label: string; icon?: any; color?: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: color, borderRadius: Radius.sm, paddingVertical: 8, paddingHorizontal: 16 }}>
      {icon && <Ionicons name={icon} size={14} color={color} />}
      <ThemedText style={{ color, fontWeight: '600', fontSize: 13 }}>{label}</ThemedText>
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
    { key: 'tasksCompleted', label: 'Tasks Done' },
    { key: 'completionRatePercent', label: 'Completion %' },
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
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Group tasks', value: totalTasks, color: C.text },
          { label: 'Completed', value: totalDone, color: C.success },
          { label: 'Completion rate', value: `${groupRate}%`, color: C.tint },
          { label: 'Members', value: members.length, color: C.info },
        ].map((s, i) => (
          <View key={i} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: Radius.md, padding: 16, alignItems: 'center', minWidth: 130, flex: 1 }}>
            <ThemedText style={{ fontSize: 22, fontWeight: '800', color: s.color }}>{s.value}</ThemedText>
            <ThemedText style={{ fontSize: 10, color: C.textMuted, marginTop: 5, fontWeight: '600' }}>{s.label.toUpperCase()}</ThemedText>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {SORT_OPTIONS.map(o => (
          <TouchableOpacity key={o.key} onPress={() => setSort(o.key)} style={{
            paddingVertical: 5, paddingHorizontal: 14, borderRadius: Radius.full,
            backgroundColor: sort === o.key ? 'rgba(245,197,24,0.12)' : C.backgroundElevated,
            borderWidth: 1, borderColor: sort === o.key ? 'rgba(245,197,24,0.3)' : C.border,
          }}>
            <ThemedText style={{ fontSize: 12, fontWeight: '600', color: sort === o.key ? C.tint : C.textMuted }}>{o.label}</ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ gap: 10 }}>
        {sorted.map((m, i) => {
          const tier = getTier(m.level);
          const isMe = m.userId === currentUserId;
          const rateColor = m.completionRatePercent >= 80 ? C.success : m.completionRatePercent >= 50 ? '#f59e0b' : C.danger;
          return (
            <View key={m.userId} style={{
              backgroundColor: C.card, borderRadius: 14, padding: 16,
              borderWidth: 1, borderColor: isMe ? 'rgba(245,197,24,0.3)' : C.border,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <View style={{ width: 24, alignItems: 'center' }}>
                  {i < 3
                    ? <Ionicons name="medal" size={18} color={i === 0 ? '#f5c518' : i === 1 ? '#c0c0c0' : '#cd7f32'} />
                    : <ThemedText style={{ fontSize: 13, fontWeight: '700', color: C.textMuted }}>#{i + 1}</ThemedText>}
                </View>
                <Avatar name={m.fullName} color={m.avatarColor} glow={tier.frame !== 'none' ? tier.color : undefined} />
                <View style={{ flex: 1, minWidth: 100 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <ThemedText style={{ fontSize: 14, fontWeight: '700', color: isMe ? C.tint : C.text }}>{m.fullName}{isMe ? ' (You)' : ''}</ThemedText>
                    {m.userId === adminId && <Badge text="ADMIN" color={C.tint} />}
                    <LevelPill level={m.level ?? 1} color={tier.color} />
                  </View>
                  <ThemedText style={{ fontSize: 11, color: tier.color, fontWeight: '600', marginTop: 2 }}>{tier.title}</ThemedText>
                </View>
                <StatRing value={m.tasksCompleted} max={m.tasksAssigned} color={rateColor} />
                <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Done', value: m.tasksCompleted, color: C.success },
                    { label: 'Denied', value: m.tasksDenied, color: C.danger },
                    { label: 'Pending', value: m.tasksPending, color: '#f59e0b' },
                    { label: 'Coins', value: m.coins, color: C.tint },
                    { label: 'XP', value: m.totalXp, color: C.purple },
                    { label: 'Streak', value: m.streak, color: '#f97316' },
                  ].map((s, j) => (
                    <View key={j} style={{ alignItems: 'center', minWidth: 36 }}>
                      <ThemedText style={{ fontSize: 14, fontWeight: '800', color: s.color }}>{s.value}</ThemedText>
                      <ThemedText style={{ fontSize: 9, color: C.textMuted, fontWeight: '600' }}>{s.label.toUpperCase()}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
              {m.tasksAssigned > 0 && (
                <View style={{ marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <ThemedText style={{ fontSize: 10, color: C.textMuted }}>
                      {m.tasksCompleted}/{m.tasksAssigned} tasks completed
                    </ThemedText>
                    <ThemedText style={{ fontSize: 10, color: rateColor, fontWeight: '700' }}>
                      {m.completionRatePercent}%
                    </ThemedText>
                  </View>
                  <View style={{ backgroundColor: C.backgroundElevated, borderRadius: Radius.full, height: 4, overflow: 'hidden' }}>
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
      } catch {}
    }));
    setXpMap(results);
  };

  const getXpInfo = (userId: string) => {
    const xp = xpMap[userId];
    if (!xp) return { level: 1, tier: TITLE_TIERS[0] };
    return { level: xp.level || 1, tier: getTier(xp.level || 1) };
  };

  const fetchActivities = useCallback(async () => {
    try { const r = await getGroupActivities(groupId); setActivities(r.data); } catch {}
  }, [groupId]);
  const fetchGroupRewards = useCallback(async () => {
    try { const r = await getRedeemHistory(groupId); setGroupRewards(r.data); } catch {}
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
    { label: 'Tasks',       icon: 'checkbox-outline',    href: `/groups/${groupId}/tasks` },
    { label: 'Leaderboard', icon: 'podium-outline',      href: `/groups/${groupId}/leaderboard` },
    { label: 'Chat',        icon: 'chatbubbles-outline', href: `/groups/${groupId}/chat` },
    { label: 'Fairness',    icon: 'scale-outline',       href: `/groups/${groupId}/fairness` },
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
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.md, paddingTop: insets.top + Spacing.sm, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.tint} />}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <View style={{ width: 56, height: 56, borderRadius: Radius.lg, backgroundColor: 'rgba(245,197,24,0.15)', borderWidth: 1, borderColor: 'rgba(245,197,24,0.25)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="people-outline" size={26} color={C.tint} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="title">{group?.name}</ThemedText>
            <ThemedText style={{ color: C.textMuted, fontSize: 13 }}>{group?.description}</ThemedText>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, marginBottom: 20 }}>
          {quickLinks.map(link => (
            <OutlineButton key={link.href} label={link.label} icon={link.icon} onPress={() => router.push(link.href as any)} />
          ))}
        </View>

        {msg ? (
          <View style={styles.msgBox}>
            <Ionicons name="checkmark-circle" size={14} color={C.success} />
            <ThemedText style={{ color: C.success, fontSize: 13 }}>{msg}</ThemedText>
          </View>
        ) : null}
        {error ? (
          <View style={styles.errBox}>
            <Ionicons name="alert-circle" size={14} color={C.danger} />
            <ThemedText style={{ color: C.danger, fontSize: 13 }}>{error}</ThemedText>
          </View>
        ) : null}

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: C.border }}>
            {TABS.map(t => (
              <TouchableOpacity key={t.key} onPress={() => setActiveTab(t.key)} style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingVertical: 10, paddingHorizontal: 16,
                borderBottomWidth: 2, borderColor: activeTab === t.key ? C.tint : 'transparent',
              }}>
                <Ionicons name={t.icon} size={15} color={activeTab === t.key ? C.tint : C.textMuted} />
                <ThemedText style={{ fontSize: 13, fontWeight: activeTab === t.key ? '700' : '500', color: activeTab === t.key ? C.tint : C.textMuted }}>
                  {t.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Members */}
        {activeTab === 'MEMBERS' && (
          <View style={{ gap: 16 }}>
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="people-outline" size={16} color={C.text} />
                <ThemedText style={styles.cardTitle}>Members ({validMembers.length})</ThemedText>
              </View>
              <View style={{ gap: 8 }}>
                {validMembers.map((member: any, i: number) => {
                  const isDeactivated = deactivatedIds.includes(member.id);
                  const memberId = member.id ?? member._id;
                  const { tier, level } = getXpInfo(memberId);
                  return (
                    <View key={i} style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      padding: 12, borderRadius: 10,
                      backgroundColor: isDeactivated ? 'rgba(239,68,68,0.05)' : C.backgroundElevated,
                      borderWidth: isDeactivated ? 1 : 0, borderColor: 'rgba(239,68,68,0.2)',
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <Avatar name={member.fullName} color={member.avatarColor} glow={tier.frame !== 'none' ? tier.color : undefined} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <ThemedText style={{ fontSize: 14, fontWeight: '600', color: isDeactivated ? '#666' : C.text }}>{member.fullName}</ThemedText>
                            <LevelPill level={level} color={tier.color} />
                          </View>
                          <ThemedText style={{ fontSize: 11, color: tier.color, fontWeight: '600', marginTop: 2 }}>{tier.title}</ThemedText>
                        </View>
                        {memberId === group?.adminId && <Badge text="Admin" color={C.tint} />}
                        {isDeactivated && <Badge text="DEACTIVATED" color={C.danger} />}
                      </View>
                      {isAdmin && memberId !== (user?.id ?? user?._id) && (
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          {isDeactivated
                            ? <TouchableOpacity onPress={() => handleReactivateMember(member)}><ThemedText style={{ color: C.success, fontSize: 12, fontWeight: '600' }}>Reactivate</ThemedText></TouchableOpacity>
                            : <TouchableOpacity onPress={() => handleDeactivateMember(member)}><ThemedText style={{ color: C.tint, fontSize: 12, fontWeight: '600' }}>Deactivate</ThemedText></TouchableOpacity>}
                          <TouchableOpacity onPress={() => handleRemoveMember(member)}><ThemedText style={{ color: C.danger, fontSize: 12, fontWeight: '600' }}>Remove</ThemedText></TouchableOpacity>
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
                  <Ionicons name="mail-outline" size={16} color={C.text} />
                  <ThemedText style={styles.cardTitle}>Invite by Email</ThemedText>
                </View>
                <ThemedText style={{ color: C.textMuted, fontSize: 12, marginBottom: 12 }}>An invite link will be sent to their email.</ThemedText>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TextInput
                    style={styles.input} placeholder="member@example.com" placeholderTextColor={C.textMuted}
                    value={inviteEmail} onChangeText={setInviteEmail} keyboardType="email-address" autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={handleInvite} style={styles.primaryBtn}>
                    <ThemedText style={{ color: '#000', fontWeight: '700', fontSize: 13 }}>Send</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={{ alignItems: 'flex-end' }}>
              {!isAdmin && <OutlineButton label="Leave Group" icon="log-out-outline" color={C.danger} onPress={handleLeaveGroup} />}
              {isAdmin && <OutlineButton label="Delete Group" icon="trash-outline" color={C.danger} onPress={handleDeleteGroup} />}
            </View>
          </View>
        )}

        {activeTab === 'ANALYTICS' && (
          <MemberAnalyticsTab groupId={groupId} currentUserId={user?.id} adminId={group?.adminId} />
        )}

        {activeTab === 'HALL_OF_FAME' && (
          <View style={{ gap: 16 }}>
            {hallOfFame.map(({ tier, holders }) => (
              <View key={tier.frame} style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: `${tier.color}44`, padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: `${tier.color}22`, borderWidth: 2, borderColor: tier.color, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={TIER_ICON[tier.frame] ?? 'medal-outline'} size={16} color={tier.color} />
                  </View>
                  <View>
                    <ThemedText style={{ fontWeight: '800', fontSize: 14, color: tier.color }}>{tier.title}</ThemedText>
                    <ThemedText style={{ fontSize: 11, color: C.textMuted }}>Level {tier.minLevel}+ required</ThemedText>
                  </View>
                </View>
                {holders.length === 0
                  ? <ThemedText style={{ color: C.textMuted, fontSize: 13, fontStyle: 'italic' }}>Nobody yet — be the first to reach Level {tier.minLevel}!</ThemedText>
                  : <View style={{ gap: 8 }}>
                      {holders.map(({ member, level }: any) => {
                        const isMe = (member.id ?? member._id) === (user?.id ?? user?._id);
                        return (
                          <View key={member.id ?? member._id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, backgroundColor: C.backgroundElevated, borderRadius: 8 }}>
                            <Avatar name={member.fullName} color={`${tier.color}22`} size={28} glow={tier.color} />
                            <ThemedText style={{ flex: 1, fontSize: 13, fontWeight: '600', color: isMe ? C.tint : C.text }}>{member.fullName}{isMe ? ' (You)' : ''}</ThemedText>
                            <Badge text={`Lv.${level}`} color={tier.color} />
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
              <Ionicons name="notifications-outline" size={16} color={C.text} />
              <ThemedText style={styles.cardTitle}>Group Activity</ThemedText>
            </View>
            {activities.length === 0
              ? <ThemedText style={{ color: C.textMuted, textAlign: 'center', padding: 32, fontSize: 13 }}>No activity yet. Start assigning tasks!</ThemedText>
              : <View style={{ gap: 8 }}>
                  {activities.map((a, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, backgroundColor: C.backgroundElevated, borderRadius: 10 }}>
                      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(245,197,24,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name={ACTIVITY_ICON[a.type] || 'bookmark-outline'} size={15} color={C.tint} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontSize: 13, fontWeight: '600' }}>
                          <ThemedText style={{ color: C.tint }}>{a.actorName}</ThemedText>
                          {a.targetName ? <ThemedText style={{ color: C.textMuted }}> → {a.targetName}</ThemedText> : null}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{a.detail}</ThemedText>
                        {a.coins !== 0 ? <ThemedText style={{ fontSize: 11, color: a.coins > 0 ? C.tint : C.danger, marginTop: 2, fontWeight: '700' }}>{a.coins > 0 ? `+${a.coins}` : a.coins} coins</ThemedText> : null}
                      </View>
                      <ThemedText style={{ fontSize: 11, color: C.textMuted, textAlign: 'right' }}>
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
              <Ionicons name="trophy-outline" size={16} color={C.text} />
              <ThemedText style={styles.cardTitle}>Group Reward Redemptions</ThemedText>
            </View>
            {groupRewards.length === 0
              ? <ThemedText style={{ color: C.textMuted, textAlign: 'center', padding: 32, fontSize: 13 }}>No rewards redeemed yet.</ThemedText>
              : <View style={{ gap: 8 }}>
                  {groupRewards.map((r, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: C.backgroundElevated, borderRadius: 10 }}>
                      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(245,197,24,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="gift-outline" size={16} color={C.tint} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontSize: 13, fontWeight: '600' }}>{r.description}</ThemedText>
                        <ThemedText style={{ fontSize: 11, color: C.textMuted }}>{new Date(r.earnedAt).toLocaleDateString()}</ThemedText>
                      </View>
                      <ThemedText style={{ color: C.danger, fontWeight: '700', fontSize: 13 }}>-{r.coinsEarned}</ThemedText>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              {confirmModal?.icon && <Ionicons name={confirmModal.icon} size={18} color={C.danger} />}
              <ThemedText style={{ fontSize: 18, fontWeight: '700' }}>{confirmModal?.title}</ThemedText>
            </View>
            <ThemedText style={{ color: C.textMuted, fontSize: 14, marginBottom: 24, lineHeight: 20 }}>{confirmModal?.message}</ThemedText>
            <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }}>
              <OutlineButton label="Cancel" onPress={() => setConfirmModal(null)} />
              <TouchableOpacity onPress={confirmModal?.onConfirm} style={{ backgroundColor: C.danger, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 20 }}>
                <ThemedText style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>{confirmModal?.confirmLabel}</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reason modal (deactivate / remove) */}
      <Modal visible={!!reasonModal} transparent animationType="fade" onRequestClose={() => { setReasonModal(null); setReasonText(''); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ThemedText style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>{reasonModal?.title}</ThemedText>
            <ThemedText style={{ color: C.textMuted, fontSize: 13, marginBottom: 16 }}>{reasonModal?.subtitle}</ThemedText>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top', width: '100%' }]}
              placeholder="Write a reason (optional)..." placeholderTextColor={C.textMuted}
              value={reasonText} onChangeText={setReasonText} multiline
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <OutlineButton label="Cancel" onPress={() => { setReasonModal(null); setReasonText(''); }} />
              <TouchableOpacity onPress={() => reasonModal?.onConfirm(reasonText)} style={{ backgroundColor: reasonModal?.btnColor, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 20 }}>
                <ThemedText style={{ color: reasonModal?.btnColor === C.danger ? '#fff' : '#000', fontWeight: '700', fontSize: 13 }}>{reasonModal?.btnLabel}</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  card: { backgroundColor: C.card, borderRadius: Radius.md, padding: 24, borderWidth: 1, borderColor: C.border },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  input: {
    flex: 1, backgroundColor: C.backgroundElevated, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, color: C.text, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13,
  },
  primaryBtn: { backgroundColor: C.tint, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18, justifyContent: 'center' },
  msgBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: C.success, borderRadius: 8, padding: 10, marginBottom: 16 },
  errBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: C.danger, borderRadius: 8, padding: 10, marginBottom: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 28, width: '100%', maxWidth: 420 },
});
