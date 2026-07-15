import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedProgressBar } from '@/components/animated-progress-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCountUp } from '@/hooks/use-count-up';
import { useAuth } from '@/contexts/auth-context';
import { getGroupHealth, getMyCoins, getMyGroups, getMyTasks, getMyXP } from '@/lib/api';
import OnboardingTour from '@/components/onboarding-tour';
import { NotificationBell } from '@/components/notification-bell';

type Task = {
  id: string;
  title: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DENIED';
  priority: string;
  category: string;
  coins: number;
  dueDate: string | null;
};

type Group = {
  id: string;
  name: string;
  memberIds: string[];
};

type GroupWithHealth = Group & { health: number };

const todayLabel = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

const FRAME_CONFIG: Record<string, { color: string; label: string }> = {
  LEGENDARY: { color: '#f5c518', label: 'Legendary' },
  CHAMPION:  { color: '#a855f7', label: 'Champion'  },
  ELITE:     { color: '#3b82f6', label: 'Elite'     },
  VETERAN:   { color: '#22c55e', label: 'Veteran'   },
  DEDICATED: { color: '#f97316', label: 'Dedicated' },
  RISING:    { color: '#6b7280', label: 'Rising'    },
};

const CATEGORY_ICONS: Record<string, any> = {
  HOME: 'home-outline',
  FINANCE: 'wallet-outline',
  STUDY: 'book-outline',
  WORK: 'briefcase-outline',
  PERSONAL: 'person-outline',
};
const getCategoryIcon = (category: string) => CATEGORY_ICONS[category] ?? 'checkmark-circle-outline';

export default function DashboardScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [groups, setGroups] = useState<GroupWithHealth[]>([]);
  const [coins, setCoins] = useState(0);
  const [xpData, setXpData] = useState<{
    level: number;
    totalXp: number;
    xpForNextLevel: number;
    xpIntoCurrentLevel: number;
    progressPercent: number;
    title: string;
    frame: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTour, setShowTour] = useState(false);

  const animatedCoins = useCountUp(coins);

  const loadData = useCallback(async () => {
    try {
      const [tasksRes, groupsRes, coinsRes, xpRes] = await Promise.all([
        getMyTasks(),
        getMyGroups(),
        getMyCoins(),
        getMyXP().catch(() => null),
      ]);

      setTasks(tasksRes.data ?? []);
      setCoins(coinsRes.data?.coins ?? coinsRes.data ?? 0);

      if (xpRes?.data) {
        const d = xpRes.data;
        setXpData({
          level: d.level ?? 1,
          totalXp: d.totalXp ?? 0,
          xpForNextLevel: d.xpForNextLevel ?? 0,
          xpIntoCurrentLevel: d.xpIntoCurrentLevel ?? 0,
          progressPercent: d.progressPercent ?? 0,
          title: d.title ?? 'Hive Newcomer',
          frame: d.frame ?? 'NONE',
        });
      }

      const groupList: Group[] = groupsRes.data ?? [];
      const withHealth = await Promise.all(
        groupList.map(async (g) => {
          try {
            const h = await getGroupHealth(g.id);
            return { ...g, health: h.data?.healthPercent ?? 0 };
          } catch {
            return { ...g, health: 0 };
          }
        })
      );
      setGroups(withHealth);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (user && !user.hasSeenTour) {
      setShowTour(true);
    }
  }, [user]);

  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'PENDING').length,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter((t) => t.status === 'COMPLETED').length,
    overdue: tasks.filter((t) => t.status !== 'COMPLETED' && t.dueDate && new Date(t.dueDate) < new Date()).length,
    myGroups: groups.length,
  };

  const STAT_ITEMS = [
    { label: 'Total Tasks', value: stats.total, color: colors.text, icon: 'list-outline' },
    { label: 'Pending', value: stats.pending, color: colors.tint, icon: 'time-outline' },
    { label: 'In Progress', value: stats.inProgress, color: colors.info, icon: 'sync-outline' },
    { label: 'Completed', value: stats.completed, color: colors.success, icon: 'checkmark-circle-outline' },
    { label: 'Overdue', value: stats.overdue, color: colors.danger, icon: 'alert-circle-outline' },
    { label: 'My Groups', value: stats.myGroups, color: colors.purple, icon: 'people-outline' },
  ];

  const recentTasks = tasks.slice(0, 5);
  const xpPercent = xpData ? Math.min(100, xpData.progressPercent) : 0;
  const frame = xpData?.frame ? FRAME_CONFIG[xpData.frame] : undefined;
  const frameColor = frame?.color ?? colors.tint;

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.sm }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData(); }}
            tintColor={colors.tint}
          />
        }>

        <View style={styles.headerRow}>
          <View style={{ flex: 1, marginRight: Spacing.sm }}>
            <ThemedText style={styles.welcome} numberOfLines={1}>
              Welcome back, <ThemedText style={[styles.welcomeName, { color: colors.tint }]}>{(user?.fullName ?? 'there').split(' ')[0]}</ThemedText>
            </ThemedText>
            <ThemedText style={[styles.date, { color: colors.textMuted }]}>{todayLabel()}</ThemedText>
          </View>
          <View style={styles.headerRight}>
            <NotificationBell />
            <View style={[styles.coinPill, { backgroundColor: colors.backgroundElevated2, borderColor: colors.border }]}>
              <ThemedText style={[styles.coinPillValue, { color: colors.coin }]}>{animatedCoins}</ThemedText>
              <ThemedText style={[styles.coinPillLabel, { color: colors.textMuted }]}>coins</ThemedText>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
          <View style={styles.levelRow}>
            <View style={[
              styles.levelBadge,
              {
                backgroundColor: `${frameColor}15`,
                borderWidth: 1.5,
                borderColor: `${frameColor}40`,
                borderRadius: Radius.md,
                paddingVertical: 6,
                shadowColor: frameColor,
                shadowOpacity: 0.3,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 0 },
              },
            ]}>
              <ThemedText style={[styles.levelBadgeLabel, { color: frameColor }]}>LVL</ThemedText>
              <ThemedText style={[styles.levelBadgeNum, { color: frameColor }]}>{xpData?.level ?? 1}</ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <ThemedText style={[styles.levelTitle, { marginBottom: 0 }]}>{xpData?.title ?? 'Hive Newcomer'}</ThemedText>
                {frame && (
                  <View style={{
                    backgroundColor: `${frame.color}15`,
                    borderWidth: 1,
                    borderColor: `${frame.color}35`,
                    borderRadius: Radius.full,
                    paddingVertical: 2,
                    paddingHorizontal: 8,
                  }}>
                    <ThemedText style={{ color: frame.color, fontSize: 10, fontWeight: '700', letterSpacing: 0.4 }}>
                      {frame.label.toUpperCase()}
                    </ThemedText>
                  </View>
                )}
              </View>
              <View style={styles.xpBarRow}>
                <AnimatedProgressBar
                  percent={xpPercent}
                  color={frameColor}
                  trackColor={colors.backgroundElevated2}
                />
              </View>
              <ThemedText style={[styles.xpSubtext, { color: colors.textMuted }]}>
                {xpData ? `${xpData.xpForNextLevel - xpData.xpIntoCurrentLevel} XP to next level · Total: ${xpData.totalXp} XP` : 'Loading XP...'}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {STAT_ITEMS.map((s) => (
            <View key={s.label} style={[styles.statBox, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
              <Ionicons name={s.icon as any} size={16} color={s.color} style={{ marginBottom: 4 }} />
              <ThemedText style={[styles.statValue, { color: s.color }]}>{s.value}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Recent Tasks</ThemedText>
          <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
            <ThemedText style={[styles.viewAll, { color: colors.tint }]}>View all →</ThemedText>
          </TouchableOpacity>
        </View>
        <View style={[styles.card, { backgroundColor: colors.backgroundElevated, borderColor: colors.border, padding: 0 }]}>
          {recentTasks.length === 0 && !loading && (
            <ThemedText style={[styles.empty, { color: colors.textMuted }]}>No tasks yet</ThemedText>
          )}
          {recentTasks.map((t, i) => {
            const isOverdue = t.status !== 'COMPLETED' && t.dueDate && new Date(t.dueDate) < new Date();
            const dotColor = isOverdue ? colors.danger : t.status === 'COMPLETED' ? colors.success : colors.tint;
            return (
              <View
                key={t.id}
                style={[
                  styles.taskRow,
                  i < recentTasks.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                ]}>
                <View style={[styles.taskIconCircle, { backgroundColor: `${dotColor}20` }]}>
                  <Ionicons name={getCategoryIcon(t.category)} size={16} color={dotColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.taskTitle}>{t.title}</ThemedText>
                  <ThemedText style={[styles.taskMeta, { color: colors.textMuted }]}>
                    {t.priority} · {t.category}
                    {t.dueDate ? ` · ${new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.taskCoin, { color: colors.coin }]}>+{t.coins}</ThemedText>
              </View>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>My Groups</ThemedText>
          <TouchableOpacity onPress={() => router.push('/(tabs)/groups')}>
            <ThemedText style={[styles.viewAll, { color: colors.tint }]}>View all →</ThemedText>
          </TouchableOpacity>
        </View>
        <View style={{ gap: Spacing.sm }}>
          {groups.length === 0 && !loading && (
            <ThemedText style={[styles.empty, { color: colors.textMuted }]}>No groups yet</ThemedText>
          )}
          {groups.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={[styles.groupCard, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}
              onPress={() => router.push(`/groups/${g.id}`)}
              activeOpacity={0.7}>
              <View style={styles.groupRow}>
                <View>
                  <ThemedText style={styles.groupName}>{g.name}</ThemedText>
                  <ThemedText style={[styles.groupMeta, { color: colors.textMuted }]}>
                    {g.memberIds?.length ?? 0} members
                  </ThemedText>
                </View>
                <ThemedText style={[styles.groupHealthPct, { color: g.health > 50 ? colors.success : colors.tint }]}>
                  {g.health}%
                </ThemedText>
              </View>
              <AnimatedProgressBar
                percent={g.health}
                color={g.health > 50 ? colors.success : colors.tint}
                trackColor={colors.backgroundElevated2}
                height={6}
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.quickActions}>
          <QuickAction label="Tasks" icon="checkbox-outline" color={colors.success} onPress={() => router.push('/(tabs)/tasks')} />
          <QuickAction label="Rewards" icon="gift-outline" color={colors.info} onPress={() => router.push('/(tabs)/rewards')} />
          <QuickAction label="Groups" icon="people-outline" color={colors.tint} onPress={() => router.push('/(tabs)/groups')} />
          <QuickAction label="Settings" icon="settings-outline" color={colors.purple} onPress={() => router.push('/(tabs)/profile')} />
        </View>
      </ScrollView>

      {showTour && (
        <OnboardingTour
          onComplete={() => {
            setShowTour(false);
            updateUser({ hasSeenTour: true });
          }}
        />
      )}
    </ThemedView>
  );
}

function QuickAction({ label, icon, color, onPress }: { label: string; icon: any; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: color }]} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name={icon} size={16} color="#0A0A0A" style={{ marginRight: 6 }} />
      <ThemedText style={styles.quickActionText}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.xl },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  welcome: { fontSize: 20, fontWeight: '700' },
  welcomeName: { fontWeight: '800' },
  date: { fontSize: 13, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  coinPill: {
    flexDirection: 'row', alignItems: 'baseline', gap: 4,
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.full, borderWidth: 1,
  },
  coinPillValue: { fontSize: 16, fontWeight: '800' },
  coinPillLabel: { fontSize: 11 },
  card: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.md },
  levelRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  levelBadge: { alignItems: 'center', width: 48 },
  levelBadgeLabel: { fontSize: 10, fontWeight: '700' },
  levelBadgeNum: { fontSize: 22, fontWeight: '800' },
  levelTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  xpBarRow: { marginBottom: 6 },
  xpSubtext: { fontSize: 11 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  statBox: {
    width: '31%', borderRadius: Radius.md, borderWidth: 1, paddingVertical: 14, alignItems: 'center', gap: 2,
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm, marginTop: Spacing.xs },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  viewAll: { fontSize: 13, fontWeight: '600' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: Spacing.md },
  taskIconCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  taskTitle: { fontSize: 14, fontWeight: '600' },
  taskMeta: { fontSize: 11, marginTop: 2 },
  taskCoin: { fontSize: 13, fontWeight: '700' },
  empty: { textAlign: 'center', padding: Spacing.md, fontSize: 13 },
  groupCard: { borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: 10 },
  groupRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupName: { fontSize: 15, fontWeight: '700' },
  groupMeta: { fontSize: 11, marginTop: 2 },
  groupHealthPct: { fontSize: 14, fontWeight: '800' },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  quickActionBtn: { flexGrow: 1, minWidth: '46%', flexDirection: 'row', paddingVertical: 12, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  quickActionText: { color: '#0A0A0A', fontWeight: '700', fontSize: 13 },
});
