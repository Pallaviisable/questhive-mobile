import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getPlatformAnalytics } from '@/lib/api';

type PlatformStats = {
  totalUsers: number;
  totalGroups: number;
  totalTasksCompleted: number;
  activeToday: number;
};

export default function AnalyticsScreen() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await getPlatformAnalytics();
      setStats(data);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStats(); }} />}
      contentContainerStyle={styles.container}>
      <ThemedText type="title" style={styles.title}>Platform Analytics</ThemedText>

      <ThemedView style={styles.grid}>
        <ThemedView style={styles.statCard}>
          <ThemedText style={styles.statValue}>{stats?.totalUsers ?? '...'}</ThemedText>
          <ThemedText style={styles.statLabel}>Total Users</ThemedText>
        </ThemedView>
        <ThemedView style={styles.statCard}>
          <ThemedText style={styles.statValue}>{stats?.totalGroups ?? '...'}</ThemedText>
          <ThemedText style={styles.statLabel}>Total Groups</ThemedText>
        </ThemedView>
        <ThemedView style={styles.statCard}>
          <ThemedText style={styles.statValue}>{stats?.totalTasksCompleted ?? '...'}</ThemedText>
          <ThemedText style={styles.statLabel}>Tasks Completed</ThemedText>
        </ThemedView>
        <ThemedView style={styles.statCard}>
          <ThemedText style={styles.statValue}>{stats?.activeToday ?? '...'}</ThemedText>
          <ThemedText style={styles.statLabel}>Active Today</ThemedText>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    width: '47%', padding: 16, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.04)', alignItems: 'center',
  },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 12, opacity: 0.6, marginTop: 4, textAlign: 'center' },
});
