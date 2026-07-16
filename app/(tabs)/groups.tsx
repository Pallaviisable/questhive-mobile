import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { AnimatedProgressBar } from '@/components/animated-progress-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getGroupHealth, getMyGroups } from '@/lib/api';

type Group = {
  id: string;
  name: string;
  memberIds: string[];
  taskIds?: string[];
  template?: string;
  description?: string;
};

type GroupWithHealth = Group & { health: number };

const AVATAR_COLORS = ['#f5c518', '#3b82f6', '#22c55e', '#a855f7', '#f97316', '#ef4444'];

export default function GroupsScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();

  const [groups, setGroups] = useState<GroupWithHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const params = useLocalSearchParams<{ created?: string }>();

  const loadGroups = useCallback(async () => {
    try {
      const { data } = await getMyGroups();
      const list: Group[] = data ?? [];
      const withHealth = await Promise.all(
        list.map(async (g) => {
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
      console.error('Failed to load groups', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const { user: authUser } = useAuth();

  useEffect(() => { setIsSuperAdmin(authUser?.role === 'SUPER_ADMIN'); }, [authUser]);

  useFocusEffect(
    useCallback(() => {
      loadGroups();
      if (params.created === '1') {
        setSuccessMsg('Group created successfully!');
        router.setParams({ created: undefined });
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    }, [loadGroups, params.created])
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <ThemedText type="title">My Groups</ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.textMuted }]}>Manage and explore your hives</ThemedText>
        {isSuperAdmin && (
          <TouchableOpacity onPress={() => router.push('/(superadmin)/requests' as any)} style={styles.superAdminLink}>
            <Ionicons name="shield-checkmark-outline" size={13} color={colors.tint} />
            <ThemedText style={[styles.superAdminLinkText, { color: colors.tint }]}>Open Super Admin Dashboard →</ThemedText>
          </TouchableOpacity>
        )}
        <View style={styles.headerBtnRow}>
          <TouchableOpacity style={[styles.joinBtn, { borderColor: colors.tint, flex: 1 }]} onPress={() => router.push('/groups/join')} activeOpacity={0.85}>
            <Ionicons name="key-outline" size={15} color={colors.tint} />
            <ThemedText style={[styles.joinBtnText, { color: colors.tint }]}>Join</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.tint, flex: 1 }]} onPress={() => router.push('/groups/create')} activeOpacity={0.85}>
            <Ionicons name="add" size={16} color="#0A0A0A" />
            <ThemedText style={styles.createBtnText}>Create</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {successMsg ? (
        <View style={[styles.successBox, { borderColor: colors.success, backgroundColor: `${colors.success}15` }]}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <ThemedText style={[styles.successText, { color: colors.success }]}>{successMsg}</ThemedText>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText style={[styles.loadingText, { color: colors.tint }]}>Loading groups...</ThemedText>
        </View>
      ) : (
      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ paddingBottom: Spacing.xl }}
        renderItem={({ item }) => {
          const members = item.memberIds ?? [];
          const visibleAvatars = members.slice(0, 4);
          const overflow = members.length - visibleAvatars.length;
          const healthColor = item.health >= 70 ? colors.success : item.health >= 40 ? colors.tint : colors.danger;

          return (
            <TouchableOpacity onPress={() => router.push(`/groups/${item.id}`)} activeOpacity={0.7}>
              <View style={[styles.card, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.name}>{item.name}</ThemedText>
                    <View style={styles.avatarStackRow}>
                      {visibleAvatars.map((id, i) => (
                        <View
                          key={id}
                          style={[
                            styles.avatarCircle,
                            {
                              backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
                              marginLeft: i === 0 ? 0 : -10,
                              zIndex: visibleAvatars.length - i,
                              borderColor: colors.backgroundElevated,
                            },
                          ]}>
                          <Ionicons name="person" size={11} color="#0A0A0A" />
                        </View>
                      ))}
                      {overflow > 0 && (
                        <View style={[styles.avatarCircle, styles.overflowCircle, { marginLeft: -10, borderColor: colors.backgroundElevated, backgroundColor: colors.backgroundElevated2 }]}>
                          <ThemedText style={styles.overflowText}>+{overflow}</ThemedText>
                        </View>
                      )}
                      <ThemedText style={[styles.meta, { color: colors.textMuted, marginLeft: 8 }]}>
                        {members.length} member{members.length === 1 ? '' : 's'}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={[styles.healthBadge, { backgroundColor: `${healthColor}18`, borderColor: `${healthColor}40` }]}>
                    <ThemedText style={[styles.healthBadgeText, { color: healthColor }]}>{item.health}%</ThemedText>
                  </View>
                </View>

                <ThemedText style={[styles.description, { color: colors.textMuted }]} numberOfLines={2}>
                  {item.description || 'No description added.'}
                </ThemedText>

                <AnimatedProgressBar
                  percent={item.health}
                  color={healthColor}
                  trackColor={colors.backgroundElevated2}
                  height={5}
                />

                <View style={styles.footer}>
                  <View style={styles.footerLeft}>
                    <Ionicons name="list-outline" size={13} color={colors.textMuted} />
                    <ThemedText style={[styles.taskCount, { color: colors.textMuted }]}>{item.taskIds?.length ?? 0} tasks</ThemedText>
                  </View>
                  <View style={styles.footerLeft}>
                    <ThemedText style={[styles.viewTasks, { color: colors.tint }]}>View Tasks</ThemedText>
                    <Ionicons name="chevron-forward" size={13} color={colors.tint} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.backgroundElevated2 }]}>
                <Ionicons name="people-outline" size={28} color={colors.textMuted} />
              </View>
              <ThemedText style={styles.emptyTitle}>No groups yet</ThemedText>
              <ThemedText style={[styles.empty, { color: colors.textMuted }]}>Create or join a group to get started!</ThemedText>
            </View>
          ) : null
        }
      />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.md },
  header: { marginBottom: Spacing.md },
  subtitle: { fontSize: 13, marginTop: 2 },
  superAdminLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  superAdminLinkText: { fontSize: 13, fontWeight: '600' },
  headerBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.md },
  joinBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 9, paddingHorizontal: 12, borderRadius: Radius.md, borderWidth: 1.5 },
  joinBtnText: { fontWeight: '700', fontSize: 13 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 9, paddingHorizontal: 14, borderRadius: Radius.md },
  createBtnText: { color: '#0A0A0A', fontWeight: '700', fontSize: 13 },
  successBox: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: Radius.md, padding: 10, marginBottom: Spacing.sm },
  successText: { fontSize: 13, fontWeight: '600' },
  card: { padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, marginBottom: Spacing.sm, gap: 10 },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  name: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  avatarStackRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  overflowCircle: { alignItems: 'center', justifyContent: 'center' },
  overflowText: { fontSize: 9, fontWeight: '700' },
  meta: { fontSize: 12 },
  healthBadge: { borderWidth: 1, borderRadius: Radius.full, paddingVertical: 5, paddingHorizontal: 10 },
  healthBadgeText: { fontSize: 13, fontWeight: '800' },
  description: { fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewTasks: { fontWeight: '700', fontSize: 13 },
  taskCount: { fontSize: 12 },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 80, gap: 12 },
  loadingText: { fontWeight: '600', fontSize: 13 },
  emptyWrap: { alignItems: 'center', marginTop: 60, gap: 4 },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  empty: { textAlign: 'center', fontSize: 13 },
});
