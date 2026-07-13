import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getMyGroups } from '@/lib/api';

type Group = {
  id: string;
  name: string;
  memberIds: string[];
  taskIds?: string[];
  template?: string;
  description?: string;
};

export default function GroupsScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const params = useLocalSearchParams<{ created?: string }>();

  const loadGroups = useCallback(async () => {
    try {
      const { data } = await getMyGroups();
      setGroups(data);
    } catch (err) {
      console.error('Failed to load groups', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkRole = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        setIsSuperAdmin(user?.role === 'SUPER_ADMIN');
      }
    } catch {}
  }, []);

  useEffect(() => { checkRole(); }, [checkRole]);

  // Refresh every time the tab is focused (e.g. coming back after creating a group)
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
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedView>
          <ThemedText type="title">My Groups</ThemedText>
          <ThemedText style={styles.subtitle}>Manage and explore your hives</ThemedText>
          {isSuperAdmin && (
            <TouchableOpacity onPress={() => router.push('/(superadmin)/requests' as any)}>
              <ThemedText style={styles.superAdminLink}>🛡 Open Super Admin Dashboard →</ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>
        <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/groups/create')}>
          <ThemedText style={styles.createBtnText}>+ Create Group</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {successMsg ? (
        <View style={styles.successBox}>
          <ThemedText style={styles.successText}>✓ {successMsg}</ThemedText>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <ThemedText style={styles.loadingText}>Loading groups...</ThemedText>
        </View>
      ) : (
      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/groups/${item.id}`)} activeOpacity={0.7}>
            <ThemedView style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={styles.iconBox}>
                  <ThemedText style={{ fontSize: 20 }}>🐝</ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.name}>{item.name}</ThemedText>
                  <ThemedText style={styles.meta}>{item.memberIds?.length ?? 0} members</ThemedText>
                </View>
              </View>
              <ThemedText style={styles.description} numberOfLines={2}>
                {item.description || 'No description added.'}
              </ThemedText>
              <ThemedView style={styles.footer}>
                <ThemedText style={styles.viewTasks}>View Tasks →</ThemedText>
                <ThemedText style={styles.taskCount}>{item.taskIds?.length ?? 0} tasks</ThemedText>
              </ThemedView>
            </ThemedView>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <ThemedText style={{ fontSize: 40, marginBottom: 12 }}>🐝</ThemedText>
              <ThemedText style={styles.emptyTitle}>No groups yet</ThemedText>
              <ThemedText style={styles.empty}>Create or join a group to get started!</ThemedText>
            </View>
          ) : null
        }
      />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  subtitle: { fontSize: 13, opacity: 0.6, marginTop: 2 },
  superAdminLink: { color: '#F59E0B', fontSize: 13, fontWeight: '600', marginTop: 10 },
  createBtn: { backgroundColor: '#F59E0B', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  createBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
  successBox: { backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: '#22c55e', borderRadius: 10, padding: 10, marginBottom: 14 },
  successText: { color: '#22c55e', fontSize: 13 },
  card: { padding: 16, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.04)', marginBottom: 12 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(245,197,24,0.15)', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 17, fontWeight: '700' },
  meta: { fontSize: 12, opacity: 0.6, marginTop: 2 },
  description: { fontSize: 13, opacity: 0.7 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  viewTasks: { color: '#F59E0B', fontWeight: '700', fontSize: 13 },
  taskCount: { fontSize: 12, opacity: 0.5 },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 80, gap: 12 },
  loadingText: { color: '#F59E0B', fontWeight: '600', fontSize: 13 },
  emptyWrap: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  empty: { textAlign: 'center', opacity: 0.5, fontSize: 13 },
});
