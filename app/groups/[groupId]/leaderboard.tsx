import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/auth-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getLeaderboard, getGroupDetail, getUserXP } from '@/lib/api';

const TITLE_TIERS = [
  { frame: 'none', title: 'Newcomer', minLevel: 1, color: '#666' },
  { frame: 'bronze', title: 'Task Starter', minLevel: 3, color: '#cd7f32' },
  { frame: 'silver', title: 'Steady Worker', minLevel: 6, color: '#c0c0c0' },
  { frame: 'gold', title: 'Dedicated Bee', minLevel: 10, color: '#f5c518' },
  { frame: 'purple', title: 'Quest Champion', minLevel: 15, color: '#a855f7' },
  { frame: 'elite', title: 'Elite Bee', minLevel: 20, color: '#ef4444' },
];
function getTier(level = 1) {
  let t = TITLE_TIERS[0];
  for (const x of TITLE_TIERS) if (level >= x.minLevel) t = x;
  return t;
}

const MEDALS = ['🥇', '🥈', '🥉'];
const RANK_COLORS = ['#f5c518', '#c0c0c0', '#cd7f32'];

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
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <ThemedText style={{ color: C.textMuted, fontSize: 13 }}>{group?.name}</ThemedText>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
          {[{ key: 'LEADERBOARD', label: '🏆 Rankings' }, { key: 'HALL_OF_FAME', label: '⭐ Hall of Fame' }].map((t) => (
            <TouchableOpacity key={t.key} onPress={() => setActiveTab(t.key as any)} style={{
              paddingVertical: 8, paddingHorizontal: 18, borderRadius: Radius.full,
              backgroundColor: activeTab === t.key ? C.tint : C.backgroundElevated,
            }}>
              <ThemedText style={{ fontSize: 13, fontWeight: '600', color: activeTab === t.key ? '#000' : C.textMuted }}>{t.label}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'LEADERBOARD' && (
          leaderboard.length === 0 ? (
            <View style={{ alignItems: 'center', padding: 50, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed' }}>
              <ThemedText style={{ fontSize: 36, marginBottom: 10 }}>📭</ThemedText>
              <ThemedText style={{ fontWeight: '700', marginBottom: 4 }}>No activity this week yet</ThemedText>
              <ThemedText style={{ fontSize: 12, color: C.textMuted }}>Complete tasks to earn coins and appear here!</ThemedText>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {leaderboard.map((entry, i) => {
                const isMe = entry.userId === (user?.id ?? user?._id);
                const name = isMe ? 'You' : getMemberName(entry.userId);
                const initial = getInitial(entry.userId);
                const isTop3 = i < 3;
                const { level, tier } = getXpInfo(entry.userId);

                return (
                  <View key={i} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16,
                    backgroundColor: i === 0 ? 'rgba(245,197,24,0.1)' : C.card,
                    borderWidth: 1, borderColor: i === 0 ? 'rgba(245,197,24,0.45)' : isMe ? 'rgba(245,197,24,0.25)' : C.border,
                  }}>
                    <View style={{ minWidth: 32, alignItems: 'center' }}>
                      {isTop3 ? <ThemedText style={{ fontSize: 22 }}>{MEDALS[i]}</ThemedText> : <ThemedText style={{ fontSize: 14, fontWeight: '800', color: C.textMuted }}>#{i + 1}</ThemedText>}
                    </View>

                    <View style={{ position: 'relative' }}>
                      <View style={{
                        width: 44, height: 44, borderRadius: 22,
                        backgroundColor: isTop3 ? RANK_COLORS[i] : isMe ? C.tint : C.backgroundElevated,
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: tier.frame !== 'none' ? 3 : 0, borderColor: tier.color,
                      }}>
                        <ThemedText style={{ fontWeight: '800', fontSize: 16, color: (isTop3 || isMe) ? '#000' : C.text }}>{initial}</ThemedText>
                      </View>
                      {level > 1 && (
                        <View style={{ position: 'absolute', bottom: -4, right: -4, backgroundColor: C.background, borderWidth: 1, borderColor: tier.color, borderRadius: Radius.full, paddingHorizontal: 5, paddingVertical: 1 }}>
                          <ThemedText style={{ fontSize: 9, fontWeight: '800', color: tier.color }}>{level}</ThemedText>
                        </View>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <ThemedText style={{ fontWeight: '700', fontSize: 15, color: isMe ? C.tint : C.text }}>{name}</ThemedText>
                        {isMe && <ThemedText style={{ fontSize: 13 }}>🐝</ThemedText>}
                        {i === 0 && (
                          <View style={{ backgroundColor: 'rgba(245,197,24,0.15)', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 }}>
                            <ThemedText style={{ fontSize: 10, color: C.tint, fontWeight: '600' }}>Quest Master 👑</ThemedText>
                          </View>
                        )}
                      </View>
                      <ThemedText style={{ fontSize: 11, color: tier.color, fontWeight: '600', marginTop: 2 }}>{tier.title} · Lv.{level}</ThemedText>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <ThemedText style={{ color: C.tint, fontSize: 18, fontWeight: '900' }}>{entry.coins}</ThemedText>
                      <ThemedText style={{ color: C.textMuted, fontSize: 10, fontWeight: '600' }}>coins</ThemedText>
                    </View>
                  </View>
                );
              })}
            </View>
          )
        )}

        {activeTab === 'HALL_OF_FAME' && (
          <View style={{ gap: 16 }}>
            <ThemedText style={{ color: C.textMuted, fontSize: 12, textAlign: 'center' }}>Members who have reached each title tier in this group.</ThemedText>
            {hallOfFame.map(({ tier, holders }) => (
              <View key={tier.frame} style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: `${tier.color}44`, padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${tier.color}22`, borderWidth: 2, borderColor: tier.color, alignItems: 'center', justifyContent: 'center' }}>
                    <ThemedText style={{ fontSize: 14 }}>{tier.frame === 'elite' ? '👑' : tier.frame === 'purple' ? '💜' : tier.frame === 'gold' ? '🌟' : tier.frame === 'silver' ? '🥈' : '🥉'}</ThemedText>
                  </View>
                  <View>
                    <ThemedText style={{ fontWeight: '800', fontSize: 15, color: tier.color }}>{tier.title}</ThemedText>
                    <ThemedText style={{ fontSize: 11, color: C.textMuted }}>Level {tier.minLevel}+ required</ThemedText>
                  </View>
                </View>

                {holders.length === 0 ? (
                  <ThemedText style={{ color: C.textMuted, fontSize: 13, fontStyle: 'italic' }}>Nobody yet — be the first to reach Level {tier.minLevel}! 🐝</ThemedText>
                ) : (
                  <View style={{ gap: 8 }}>
                    {holders.map(({ member, level, totalXp }: any) => {
                      const isMe = (member.id ?? member._id) === (user?.id ?? user?._id);
                      return (
                        <View key={member.id ?? member._id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: C.backgroundElevated, borderRadius: 10 }}>
                          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${tier.color}22`, borderWidth: 2, borderColor: tier.color, alignItems: 'center', justifyContent: 'center' }}>
                            <ThemedText style={{ fontWeight: '800', fontSize: 13, color: tier.color }}>{member.fullName?.[0]?.toUpperCase()}</ThemedText>
                          </View>
                          <View style={{ flex: 1 }}>
                            <ThemedText style={{ fontSize: 13, fontWeight: '700', color: isMe ? C.tint : C.text }}>{member.fullName}{isMe ? ' (You)' : ''}</ThemedText>
                            <ThemedText style={{ fontSize: 11, color: C.textMuted }}>{totalXp} XP</ThemedText>
                          </View>
                          <View style={{ backgroundColor: `${tier.color}22`, borderWidth: 1, borderColor: `${tier.color}66`, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 2 }}>
                            <ThemedText style={{ fontSize: 11, fontWeight: '800', color: tier.color }}>Lv.{level}</ThemedText>
                          </View>
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
});
