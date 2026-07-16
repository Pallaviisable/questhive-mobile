import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getLeaderboard, getGroupDetail, getUserXP } from '@/lib/api';

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
const RANK_ICON: any[] = ['trophy', 'medal', 'medal'];
const RANK_ICON_COLOR = ['#f5c518', '#b8bec5', '#cd7f32'];

function Tag({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ backgroundColor: `${color}15`, borderColor: `${color}40`, borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 7, paddingVertical: 2 }}>
      <ThemedText style={{ fontSize: 9.5, fontWeight: '700', color, letterSpacing: 0.3 }}>{text}</ThemedText>
    </View>
  );
}

export default function LeaderboardScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const styles = makeStyles(C);
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const [leaderboard, setLeaderboard] = useState<{ userId: string; coins: number }[]>([]);
  const [group, setGroup] = useState<any>(null);
  const [xpMap, setXpMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'LEADERBOARD' | 'HALL_OF_FAME'>('LEADERBOARD');

  const fetchData = useCallback(async () => {
    try {
      const [lbRes, groupRes] = await Promise.all([getLeaderboard(groupId), getGroupDetail(groupId)]);
      const entries = Object.entries(lbRes.data)
        .map(([userId, coins]) => ({ userId, coins: coins as number }))
        .sort((a, b) => b.coins - a.coins);
      setLeaderboard(entries);
      setGroup(groupRes.data);

      const xpResults: Record<string, any> = {};
      await Promise.all((groupRes.data?.members || []).map(async (m: any) => {
        const id = m.id ?? m._id;
        try { const res = await getUserXP(id); xpResults[id] = res.data; } catch {}
      }));
      setXpMap(xpResults);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [groupId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getMember = (userId: string) => group?.members?.find((m: any) =>
    m._id === userId || m.id === userId || String(m._id) === String(userId)
  );
  const getMemberName = (userId: string) => getMember(userId)?.fullName || userId;
  const getInitial = (userId: string) => {
    const name = getMemberName(userId);
    if (name === userId && userId.length > 10) return '?';
    return (name[0] || '?').toUpperCase();
  };
  const getXpInfo = (userId: string) => {
    const xp = xpMap[userId];
    if (!xp) return { level: 1, totalXp: 0, tier: TITLE_TIERS[0] };
    const level = xp.level || 1;
    return { level, totalXp: xp.totalXp || xp.xp || 0, tier: getTier(level) };
  };

  const hallOfFame = TITLE_TIERS.slice(1).map((tier) => {
    const holders = (group?.members || [])
      .map((m: any) => ({ member: m, ...getXpInfo(m.id ?? m._id) }))
      .filter(({ level }: any) => getTier(level).frame === tier.frame)
      .sort((a: any, b: any) => b.level - a.level);
    return { tier, holders };
  }).reverse();

  if (loading) {
    return <ThemedView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={C.tint} size="large" /></ThemedView>;
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 60 }}>
        <View style={{ marginBottom: Spacing.md }}>
          <ThemedText style={styles.title}>Leaderboard</ThemedText>
          <ThemedText style={styles.subtitle}>{group?.name}</ThemedText>
        </View>

        <View style={styles.segmentRow}>
          {[{ key: 'LEADERBOARD', label: 'Rankings' }, { key: 'HALL_OF_FAME', label: 'Hall of Fame' }].map((t) => (
            <TouchableOpacity key={t.key} onPress={() => setActiveTab(t.key as any)} style={styles.segmentItem}>
              <ThemedText style={activeTab === t.key ? styles.segmentTextActive : styles.segmentText}>{t.label}</ThemedText>
              <View style={[styles.segmentUnderline, activeTab === t.key && { backgroundColor: C.tint }]} />
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'LEADERBOARD' && (
          leaderboard.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="podium-outline" size={22} color={C.textMuted} />
              </View>
              <ThemedText style={styles.emptyTitle}>No activity this week yet</ThemedText>
              <ThemedText style={styles.empty}>Complete tasks to earn coins and appear here</ThemedText>
            </View>
          ) : (
            <View style={{ gap: Spacing.sm }}>
              {leaderboard.map((entry, i) => {
                const isMe = entry.userId === (user?.id ?? user?._id);
                const name = isMe ? 'You' : getMemberName(entry.userId);
                const initial = getInitial(entry.userId);
                const isTop3 = i < 3;
                const { level, tier } = getXpInfo(entry.userId);

                return (
                  <View key={i} style={[styles.rankRow, i === 0 && styles.rankRowFirst, isMe && !isTop3 && styles.rankRowMe]}>
                    <View style={{ minWidth: 26, alignItems: 'center' }}>
                      {isTop3
                        ? <Ionicons name={RANK_ICON[i]} size={17} color={RANK_ICON_COLOR[i]} />
                        : <ThemedText style={{ fontSize: 12.5, fontWeight: '700', color: C.textMuted }}>#{i + 1}</ThemedText>}
                    </View>

                    <View style={{ position: 'relative' }}>
                      <View style={[styles.avatarCircle, { borderWidth: tier.frame !== 'none' ? 1.5 : 1, borderColor: tier.frame !== 'none' ? tier.color : C.border }]}>
                        <ThemedText style={{ fontWeight: '700', fontSize: 14.5, color: C.text }}>{initial}</ThemedText>
                      </View>
                      {level > 1 && (
                        <View style={[styles.levelBadge, { borderColor: tier.color }]}>
                          <ThemedText style={{ fontSize: 8.5, fontWeight: '800', color: tier.color }}>{level}</ThemedText>
                        </View>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <ThemedText style={{ fontWeight: '700', fontSize: 13.5, color: isMe ? C.tint : C.text }}>{name}</ThemedText>
                        {i === 0 && <Tag text="TOP SCORER" color={C.tint} />}
                      </View>
                      <ThemedText style={{ fontSize: 10.5, color: C.textMuted, fontWeight: '600', marginTop: 2 }}>{tier.title} · Lv.{level}</ThemedText>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <ThemedText style={{ color: C.tint, fontSize: 15.5, fontWeight: '800' }}>{entry.coins}</ThemedText>
                      <ThemedText style={{ color: C.textMuted, fontSize: 9.5, fontWeight: '600' }}>coins</ThemedText>
                    </View>
                  </View>
                );
              })}
            </View>
          )
        )}

        {activeTab === 'HALL_OF_FAME' && (
          <View style={{ gap: Spacing.sm }}>
            <ThemedText style={{ color: C.textMuted, fontSize: 11.5, marginBottom: 4 }}>Members who have reached each title tier in this group.</ThemedText>
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

                {holders.length === 0 ? (
                  <ThemedText style={{ color: C.textMuted, fontSize: 12, fontStyle: 'italic' }}>Nobody yet — be the first to reach Level {tier.minLevel}!</ThemedText>
                ) : (
                  <View style={{ gap: 6 }}>
                    {holders.map(({ member, level, totalXp }: any) => {
                      const isMe = (member.id ?? member._id) === (user?.id ?? user?._id);
                      return (
                        <View key={member.id ?? member._id} style={styles.holderRow}>
                          <View style={[styles.avatarCircle, { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: tier.color }]}>
                            <ThemedText style={{ fontWeight: '700', fontSize: 12.5, color: C.text }}>{member.fullName?.[0]?.toUpperCase()}</ThemedText>
                          </View>
                          <View style={{ flex: 1 }}>
                            <ThemedText style={{ fontSize: 12.5, fontWeight: '700', color: isMe ? C.tint : C.text }}>{member.fullName}{isMe ? ' (You)' : ''}</ThemedText>
                            <ThemedText style={{ fontSize: 10.5, color: C.textMuted }}>{totalXp} XP</ThemedText>
                          </View>
                          <Tag text={`LV ${level}`} color={tier.color} />
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const makeStyles = (C: typeof Colors.dark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  title: { fontSize: 19, fontWeight: '700', letterSpacing: -0.3, color: C.text },
  subtitle: { fontSize: 12.5, color: C.textMuted, marginTop: 2 },

  segmentRow: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: C.border },
  segmentItem: { paddingBottom: 10 },
  segmentText: { fontSize: 13, color: C.textMuted, fontWeight: '600' },
  segmentTextActive: { fontSize: 13, color: C.text, fontWeight: '700' },
  segmentUnderline: { height: 2, marginTop: 10, borderRadius: 1, backgroundColor: 'transparent' },

  rankRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: Radius.md,
    backgroundColor: C.backgroundElevated, borderWidth: 1, borderColor: C.border,
  },
  rankRowFirst: { borderColor: `${C.tint}55` },
  rankRowMe: { borderColor: `${C.tint}40` },

  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.backgroundElevated2, alignItems: 'center', justifyContent: 'center' },
  levelBadge: { position: 'absolute', bottom: -3, right: -3, backgroundColor: C.background, borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 4, paddingVertical: 1 },

  emptyWrap: { alignItems: 'center', marginTop: 56, gap: 4 },
  emptyIconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: C.backgroundElevated, borderWidth: 1, borderColor: C.border, marginBottom: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  empty: { textAlign: 'center', color: C.textMuted, fontSize: 12 },

  tierCard: { backgroundColor: C.backgroundElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, padding: Spacing.md },
  tierIconBox: { width: 30, height: 30, borderRadius: Radius.sm, backgroundColor: C.backgroundElevated2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  holderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, backgroundColor: C.backgroundElevated2, borderRadius: Radius.sm },
});
