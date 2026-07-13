import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { getFairnessReport, getConcentrationReport, getGroupTasks, flagBonus } from '@/lib/api';

const C = Colors.dark;

function statusColor(status?: string) {
  if (status === 'FAIR') return '#22c55e';
  if (status === 'SLIGHTLY_UNEVEN') return '#f59e0b';
  return '#ef4444';
}
function statusEmoji(status?: string) {
  if (status === 'FAIR') return '✅';
  if (status === 'SLIGHTLY_UNEVEN') return '⚠️';
  return '🚨';
}

export default function FairnessScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const [report, setReport] = useState<any>(null);
  const [concentration, setConcentration] = useState<any>(null);
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewMsg, setReviewMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const [r1, r2, r3] = await Promise.all([
        getFairnessReport(groupId),
        getConcentrationReport(groupId),
        getGroupTasks(groupId),
      ]);
      setReport(r1.data);
      setConcentration(r2.data);
      const reviews = (r3.data || []).filter((t: any) => t.pendingPeerReview);
      setPendingReviews(reviews);
    } catch {}
    setLoading(false);
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  const handleFlag = async (taskId: string) => {
    try {
      await flagBonus(taskId);
      setReviewMsg('✅ Flagged successfully. Admin will be notified.');
      setPendingReviews((prev) => prev.filter((t) => t.id !== taskId));
    } catch {
      setReviewMsg('❌ Could not flag. You may have already flagged this.');
    }
    setTimeout(() => setReviewMsg(''), 3000);
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.tint} size="large" />
      </ThemedView>
    );
  }

  if (!report) {
    return (
      <ThemedView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ThemedText style={{ color: '#ef4444' }}>Failed to load report.</ThemedText>
      </ThemedView>
    );
  }

  const members = Object.keys(report.memberNames || {});
  const maxCount = Math.max(...members.map((id) => report.taskCountPerMember[id] || 0), 1);
  const sColor = statusColor(report.fairnessStatus);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: Spacing.md }}>
      <ThemedText type="title" style={{ marginBottom: 4 }}>⚖️ Fairness Report</ThemedText>
      <ThemedText style={{ color: C.textMuted, fontSize: 13, marginBottom: 20 }}>
        Task distribution across group members
      </ThemedText>

      <View style={{
        backgroundColor: C.card, borderWidth: 1, borderColor: `${sColor}40`,
        borderRadius: 16, padding: 18, marginBottom: 20, flexDirection: 'row',
        alignItems: 'center', gap: 12,
      }}>
        <ThemedText style={{ fontSize: 28 }}>{statusEmoji(report.fairnessStatus)}</ThemedText>
        <View style={{ flex: 1 }}>
          <ThemedText style={{ fontWeight: '800', fontSize: 15, color: sColor }}>
            {(report.fairnessStatus || '').replace('_', ' ')}
          </ThemedText>
          <ThemedText style={{ color: C.textMuted, fontSize: 13, marginTop: 2 }}>
            {report.suggestion}
          </ThemedText>
        </View>
      </View>

      <View style={{ gap: 12 }}>
        {members.map((memberId) => {
          const count = report.taskCountPerMember[memberId] || 0;
          const coins = report.coinsPerMember[memberId] || 0;
          const pct = Math.round((count / maxCount) * 100);
          return (
            <View key={memberId} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <ThemedText style={{ fontWeight: '600' }}>{report.memberNames[memberId]}</ThemedText>
                <ThemedText style={{ color: C.textMuted, fontSize: 13 }}>{count} tasks · 🪙 {coins}</ThemedText>
              </View>
              <View style={{ backgroundColor: C.background, borderRadius: Radius.full, height: 8 }}>
                <View style={{ height: '100%', borderRadius: Radius.full, backgroundColor: C.tint, width: `${pct}%` }} />
              </View>
            </View>
          );
        })}
      </View>

      {concentration?.alerts?.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <ThemedText style={{ fontSize: 16, fontWeight: '700', marginBottom: 12 }}>🚨 Fairness Alerts</ThemedText>
          <View style={{ gap: 10 }}>
            {concentration.alerts.map((alert: string, i: number) => (
              <View key={i} style={{ backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 12, padding: 14 }}>
                <ThemedText style={{ fontSize: 13, color: '#fca5a5', lineHeight: 19 }}>{alert}</ThemedText>
              </View>
            ))}
          </View>
        </View>
      )}

      {pendingReviews.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <ThemedText style={{ fontSize: 16, fontWeight: '700', marginBottom: 6 }}>🔍 Pending Bonus Reviews</ThemedText>
          <ThemedText style={{ color: C.textMuted, fontSize: 13, marginBottom: 14 }}>
            These tasks have bonus coins above the threshold. Members can flag them within 24 hours.
          </ThemedText>
          <View style={{ gap: 10 }}>
            {pendingReviews.map((task) => (
              <View key={task.id} style={{ backgroundColor: 'rgba(245,197,24,0.06)', borderWidth: 1, borderColor: 'rgba(245,197,24,0.25)', borderRadius: 12, padding: 14 }}>
                <ThemedText style={{ fontWeight: '700', fontSize: 14, marginBottom: 4 }}>{task.title}</ThemedText>
                <ThemedText style={{ color: C.textMuted, fontSize: 12, marginBottom: 10 }}>
                  🪙 Bonus: <ThemedText style={{ color: C.tint, fontWeight: '700' }}>{task.bonusCoinsAmount} coins</ThemedText>
                  {task.peerReviewDeadline ? `   ⏰ Deadline: ${new Date(task.peerReviewDeadline).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}` : ''}
                </ThemedText>
                <TouchableOpacity
                  onPress={() => handleFlag(task.id)}
                  style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 }}
                >
                  <ThemedText style={{ color: '#f87171', fontSize: 13, fontWeight: '600' }}>🚩 Flag as Unfair</ThemedText>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          {reviewMsg ? (
            <View style={{ marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: reviewMsg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
              <ThemedText style={{ color: reviewMsg.startsWith('✅') ? '#86efac' : '#fca5a5', fontSize: 13 }}>{reviewMsg}</ThemedText>
            </View>
          ) : null}
        </View>
      )}

      {concentration && (!concentration.alerts || concentration.alerts.length === 0) && (
        <View style={{ marginTop: 24, backgroundColor: 'rgba(34,197,94,0.08)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', borderRadius: 12, padding: 14 }}>
          <ThemedText style={{ fontSize: 13, color: '#86efac' }}>✅ No concentration or disparity alerts in the last 14 days.</ThemedText>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
});
