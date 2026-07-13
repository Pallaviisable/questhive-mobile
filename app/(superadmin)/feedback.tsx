import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { getAllFeedback, updateFeedbackStatus } from '@/lib/api';

const C = Colors.dark;

type Feedback = {
  id: string; username: string; type: 'BUG' | 'SUGGESTION';
  status: 'OPEN' | 'REVIEWED'; message: string; createdAt: string;
};

export default function FeedbackScreen() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await getAllFeedback();
      setItems(data);
    } catch (err) {
      console.error('Failed to load feedback', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markReviewed = async (id: string) => {
    try {
      await updateFeedbackStatus(id, 'REVIEWED');
      setItems((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'REVIEWED' } : f)));
    } catch {}
  };

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: Spacing.md }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.tint} />
        }
        ListEmptyComponent={!loading ? <ThemedText style={styles.empty}>No feedback yet</ThemedText> : null}
        renderItem={({ item }) => (
          <View style={{
            backgroundColor: C.card, borderWidth: 1,
            borderColor: item.status === 'OPEN' ? 'rgba(245,197,24,0.25)' : C.border,
            borderRadius: 14, padding: 16, marginBottom: 10,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <ThemedText style={{ fontWeight: '700', fontSize: 14 }}>{item.username}</ThemedText>
              <View style={{
                backgroundColor: item.type === 'BUG' ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)',
                borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2,
              }}>
                <ThemedText style={{ fontSize: 10, fontWeight: '700', color: item.type === 'BUG' ? '#f87171' : '#818cf8' }}>
                  {item.type === 'BUG' ? '🐛 Bug' : '💡 Suggestion'}
                </ThemedText>
              </View>
              <View style={{
                backgroundColor: item.status === 'OPEN' ? 'rgba(245,197,24,0.12)' : 'rgba(34,197,94,0.12)',
                borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2,
              }}>
                <ThemedText style={{ fontSize: 10, fontWeight: '700', color: item.status === 'OPEN' ? '#fbbf24' : '#34d399' }}>
                  {item.status}
                </ThemedText>
              </View>
            </View>
            <ThemedText style={{ fontSize: 13, color: C.textMuted, lineHeight: 19, marginBottom: 10 }}>{item.message}</ThemedText>
            <ThemedText style={{ fontSize: 11, color: C.textMuted, marginBottom: item.status === 'OPEN' ? 10 : 0 }}>
              {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </ThemedText>
            {item.status === 'OPEN' && (
              <TouchableOpacity
                onPress={() => markReviewed(item.id)}
                style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 }}
              >
                <ThemedText style={{ color: '#34d399', fontSize: 12, fontWeight: '600' }}>✓ Mark Reviewed</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.5 },
});
