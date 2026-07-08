import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getSuperAdminUsers, deactivatePlatformUser, activatePlatformUser } from '@/lib/api';

type PlatformUser = { id: string; name: string; email: string; role: string; isActive: boolean };

export default function UsersScreen() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const { data } = await getSuperAdminUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const toggleActive = async (user: PlatformUser) => {
    try {
      if (user.isActive) await deactivatePlatformUser(user.id);
      else await activatePlatformUser(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u)));
    } catch {
      Alert.alert('Action failed', 'Could not update this user.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>All Users</ThemedText>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadUsers(); }} />
        }
        renderItem={({ item }) => (
          <ThemedView style={styles.card}>
            <ThemedText style={styles.name}>{item.name}</ThemedText>
            <ThemedText style={styles.email}>{item.email} • {item.role}</ThemedText>
            <TouchableOpacity
              style={item.isActive ? styles.deactivateBtn : styles.activateBtn}
              onPress={() => toggleActive(item)}>
              <ThemedText style={styles.btnText}>{item.isActive ? 'Deactivate' : 'Activate'}</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}
        ListEmptyComponent={!loading ? <ThemedText style={styles.empty}>No users found</ThemedText> : null}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { marginBottom: 12 },
  card: { padding: 14, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.04)', marginBottom: 10 },
  name: { fontSize: 16, fontWeight: '600' },
  email: { fontSize: 13, opacity: 0.6, marginTop: 2, marginBottom: 8 },
  deactivateBtn: { backgroundColor: '#EF4444', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, alignSelf: 'flex-start' },
  activateBtn: { backgroundColor: '#22C55E', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, alignSelf: 'flex-start' },
  btnText: { color: 'white', fontWeight: '600', fontSize: 13 },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.5 },
});
