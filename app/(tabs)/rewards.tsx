import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getMyCoins, getMyRewards } from '@/lib/api';

type RewardEntry = {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
};

export default function RewardsScreen() {
  const [coins, setCoins] = useState<number | null>(null);
  const [history, setHistory] = useState<RewardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [coinsRes, historyRes] = await Promise.all([getMyCoins(), getMyRewards()]);
      setCoins(coinsRes.data?.coins ?? coinsRes.data);
      setHistory(historyRes.data);
    } catch (err) {
      console.error('Failed to load rewards', err);
      Alert.alert('Error', 'Could not load your coins right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.coinCard}>
        <ThemedText style={styles.coinLabel}>Your Coins</ThemedText>
        <ThemedText style={styles.coinValue}>{loading ? '...' : coins ?? 0}</ThemedText>
      </ThemedView>

      <ThemedText type="title" style={styles.historyTitle}>History</ThemedText>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
        }
        renderItem={({ item }) => (
          <ThemedView style={styles.historyRow}>
            <ThemedText style={styles.reason}>{item.reason}</ThemedText>
            <ThemedText style={item.amount >= 0 ? styles.positive : styles.negative}>
              {item.amount >= 0 ? '+' : ''}{item.amount}
            </ThemedText>
          </ThemedView>
        )}
        ListEmptyComponent={!loading ? <ThemedText style={styles.empty}>No coin history yet</ThemedText> : null}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  coinCard: {
    backgroundColor: '#4F46E5', borderRadius: 16, padding: 20,
    alignItems: 'center', marginBottom: 20,
  },
  coinLabel: { color: 'white', opacity: 0.8, fontSize: 13 },
  coinValue: { color: 'white', fontSize: 40, fontWeight: '800', marginTop: 4 },
  historyTitle: { marginBottom: 10 },
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  reason: { fontSize: 14, flex: 1, marginRight: 8 },
  positive: { color: '#22C55E', fontWeight: '700' },
  negative: { color: '#EF4444', fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.5 },
});
