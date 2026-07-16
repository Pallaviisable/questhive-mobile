import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useDialog } from '@/contexts/dialog-context';
import { getSuperAdminUsers, deactivatePlatformUser, activatePlatformUser, removePlatformUser } from '@/lib/api';

type PlatformUser = { id: string; fullName: string; email: string; role: string; status: 'ACTIVE' | 'DEACTIVATED' };

export default function UsersScreen() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const dialog = useDialog();

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
      if (user.status === 'ACTIVE') await deactivatePlatformUser(user.id);
      else await activatePlatformUser(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: u.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE' } : u)));
    } catch {
      dialog.alert('Action failed', 'Could not update this user.');
    }
  };

  const handleRemove = (user: PlatformUser) => {
    dialog.alert('Remove user', `Remove ${user.fullName}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await removePlatformUser(user.id);
            setUsers((prev) => prev.filter((u) => u.id !== user.id));
          } catch {
            dialog.alert('Action failed', 'Could not remove this user.');
          }
        },
      },
    ]);
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
            <ThemedText style={styles.name}>{item.fullName}</ThemedText>
            <ThemedText style={styles.email}>{item.email} • {item.role?.replace('_', ' ')}</ThemedText>
            {item.role !== 'SUPER_ADMIN' && (
              <ThemedView style={styles.actions}>
                <TouchableOpacity
                  style={item.status === 'ACTIVE' ? styles.deactivateBtn : styles.activateBtn}
                  onPress={() => toggleActive(item)}>
                  <ThemedText style={styles.btnText}>{item.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(item)}>
                  <ThemedText style={styles.btnText}>Remove</ThemedText>
                </TouchableOpacity>
              </ThemedView>
            )}
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
  actions: { flexDirection: 'row', gap: 10 },
  deactivateBtn: { backgroundColor: '#F59E0B', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, alignSelf: 'flex-start' },
  activateBtn: { backgroundColor: '#22C55E', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, alignSelf: 'flex-start' },
  removeBtn: { backgroundColor: '#EF4444', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, alignSelf: 'flex-start' },
  btnText: { color: 'white', fontWeight: '600', fontSize: 13 },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.5 },
});
