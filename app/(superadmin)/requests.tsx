import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getSuperAdminRequests, approveAdminRequest, rejectAdminRequest } from '@/lib/api';

type AdminRequest = { id: string; fullName: string; email: string; reason: string };

export default function RequestsScreen() {
  const [pending, setPending] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPending = useCallback(async () => {
    try {
      const { data } = await getSuperAdminRequests();
      setPending(data);
    } catch (err) {
      console.error('Failed to load pending requests', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);

  const handleDecision = async (requestId: string, approve: boolean) => {
    try {
      if (approve) await approveAdminRequest(requestId);
      else await rejectAdminRequest(requestId);
      setPending((prev) => prev.filter((r) => r.id !== requestId));
    } catch {
      Alert.alert('Action failed', 'Could not process this request. Try again.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Family Admin Requests</ThemedText>
      <FlatList
        data={pending}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPending(); }} />
        }
        renderItem={({ item }) => (
          <ThemedView style={styles.card}>
            <ThemedText style={styles.name}>{item.fullName}</ThemedText>
            <ThemedText style={styles.email}>{item.email}</ThemedText>
            <ThemedText style={styles.reason}>{item.reason}</ThemedText>
            <ThemedView style={styles.actions}>
              <TouchableOpacity style={styles.approveBtn} onPress={() => handleDecision(item.id, true)}>
                <ThemedText style={styles.btnText}>Approve</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => handleDecision(item.id, false)}>
                <ThemedText style={styles.btnText}>Reject</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        )}
        ListEmptyComponent={!loading ? <ThemedText style={styles.empty}>No pending requests</ThemedText> : null}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { marginBottom: 12 },
  card: { padding: 14, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.04)', marginBottom: 10 },
  name: { fontSize: 16, fontWeight: '600' },
  email: { fontSize: 13, opacity: 0.6, marginTop: 2 },
  reason: { fontSize: 13, opacity: 0.8, marginTop: 6 },
  actions: { flexDirection: 'row', marginTop: 10, gap: 10 },
  approveBtn: { backgroundColor: '#22C55E', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  rejectBtn: { backgroundColor: '#EF4444', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  btnText: { color: 'white', fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.5 },
});
