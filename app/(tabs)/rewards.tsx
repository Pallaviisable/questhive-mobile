import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Modal, RefreshControl, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCountUp } from '@/hooks/use-count-up';
import {
  getMyCoins, getMyRewards, getMyGroups,
  getRedeemOptions, redeemOption, createRedeemOption, getRedeemHistory, deleteRedeemOption,
} from '@/lib/api';

type RewardEntry = {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
};

type Group = { id: string; name: string };
type RedeemOpt = { id: string; title: string; description?: string; coinsRequired: number };
type RedeemHist = { id: string; optionTitle?: string; coinsSpent: number; redeemedAt: string };

const MIN_COINS = 50;

const REWARD_ICONS = ['gift-outline', 'cafe-outline', 'game-controller-outline', 'film-outline', 'fast-food-outline', 'bicycle-outline'];
const getRewardIcon = (title: string) => {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash + title.charCodeAt(i)) % REWARD_ICONS.length;
  return REWARD_ICONS[hash];
};

export default function RewardsScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();

  const [coins, setCoins] = useState<number | null>(null);
  const [history, setHistory] = useState<RewardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'REDEEM' | 'HISTORY'>('REDEEM');
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [redeemOptions, setRedeemOptions] = useState<RedeemOpt[]>([]);
  const [redeemHistory, setRedeemHistory] = useState<RedeemHist[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', coinsRequired: '' });
  const [createError, setCreateError] = useState('');

  const animatedCoins = useCountUp(coins ?? 0);

  const loadData = useCallback(async () => {
    try {
      const [coinsRes, historyRes, groupsRes] = await Promise.all([getMyCoins(), getMyRewards(), getMyGroups()]);
      setCoins(coinsRes.data?.coins ?? coinsRes.data);
      setHistory(historyRes.data);
      setGroups(groupsRes.data);
      if (groupsRes.data?.length > 0) {
        setSelectedGroup((prev) => prev || groupsRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load rewards', err);
      Alert.alert('Error', 'Could not load your coins right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadRedeemData = useCallback(async () => {
    if (!selectedGroup) return;
    try {
      const [optsRes, histRes] = await Promise.all([getRedeemOptions(selectedGroup), getRedeemHistory(selectedGroup)]);
      setRedeemOptions(optsRes.data);
      setRedeemHistory(histRes.data);
    } catch (err) {
      console.error('Failed to load redeem data', err);
    }
  }, [selectedGroup]);

  useEffect(() => { loadRedeemData(); }, [loadRedeemData]);

  const handleRedeem = async (optId: string, cost: number, title: string) => {
    if ((coins ?? 0) < cost) { Alert.alert('Not enough coins', 'Keep completing tasks!'); return; }
    Alert.alert('Redeem reward', `Spend ${cost} coins on "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Redeem', onPress: async () => {
          try {
            await redeemOption(optId);
            loadData();
            loadRedeemData();
          } catch (err: any) {
            Alert.alert('Failed', err?.response?.data?.message || 'Redemption failed.');
          }
        },
      },
    ]);
  };

  const handleCreateOption = async () => {
    setCreateError('');
    const cost = parseInt(form.coinsRequired, 10);
    if (!form.title.trim()) { setCreateError('Title is required.'); return; }
    if (Number.isNaN(cost) || cost < MIN_COINS) { setCreateError(`Minimum ${MIN_COINS} coins required.`); return; }
    try {
      await createRedeemOption(selectedGroup, { ...form, coinsRequired: cost });
      setShowCreate(false);
      setForm({ title: '', description: '', coinsRequired: '' });
      loadRedeemData();
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || 'Failed to create option.');
    }
  };

  const handleDeleteOption = async (id: string) => {
    Alert.alert('Delete option', 'Delete this redeem option?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteRedeemOption(id);
            setRedeemOptions((prev) => prev.filter((o) => o.id !== id));
          } catch {
            Alert.alert('Failed', 'Could not delete this option.');
          }
        },
      },
    ]);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingHorizontal: Spacing.md, paddingTop: insets.top + Spacing.sm }}>
        <ThemedText type="title" style={{ marginBottom: Spacing.sm }}>Rewards</ThemedText>
        <View style={[styles.coinCard, { backgroundColor: colors.backgroundElevated, borderColor: 'rgba(245,197,24,0.3)' }]}>
          <View style={[styles.coinIconCircle, { backgroundColor: 'rgba(245,197,24,0.15)' }]}>
            <Ionicons name="disc-outline" size={26} color={colors.coin} />
          </View>
          <ThemedText style={[styles.coinLabel, { color: colors.textMuted }]}>Your Coins</ThemedText>
          <ThemedText style={[styles.coinValue, { color: colors.coin }]}>{loading ? '...' : animatedCoins}</ThemedText>
        </View>

        <View style={styles.tabRow}>
          {[
            { key: 'REDEEM', label: 'Redeem', icon: 'gift-outline' },
            { key: 'HISTORY', label: 'History', icon: 'time-outline' },
          ].map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.tabChip,
                  { backgroundColor: active ? `${colors.tint}22` : colors.backgroundElevated2, borderColor: active ? `${colors.tint}66` : colors.border },
                ]}
                onPress={() => setTab(t.key as 'REDEEM' | 'HISTORY')}>
                <Ionicons name={t.icon as any} size={14} color={active ? colors.tint : colors.textMuted} />
                <ThemedText style={{ color: active ? colors.tint : colors.textMuted, fontWeight: active ? '700' : '600', fontSize: 13 }}>{t.label}</ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {tab === 'REDEEM' ? (
        <>
          <View style={[styles.groupRow, { paddingHorizontal: Spacing.md }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
              {groups.map((g) => {
                const active = selectedGroup === g.id;
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.groupChip, { backgroundColor: active ? `${colors.tint}22` : colors.backgroundElevated2, borderColor: active ? `${colors.tint}66` : colors.border }]}
                    onPress={() => setSelectedGroup(g.id)}>
                    <ThemedText style={{ color: active ? colors.tint : colors.textMuted, fontWeight: active ? '700' : '600', fontSize: 13 }}>{g.name}</ThemedText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.tint }]} onPress={() => setShowCreate(true)}>
              <Ionicons name="add" size={15} color="#0A0A0A" />
              <ThemedText style={styles.addBtnText}>Add</ThemedText>
            </TouchableOpacity>
          </View>

          <FlatList
            data={redeemOptions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); loadRedeemData(); }} tintColor={colors.tint} />
            }
            renderItem={({ item }) => {
              const canAfford = (coins ?? 0) >= item.coinsRequired;
              return (
                <View style={[styles.optCard, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
                  <View style={[styles.optIconCircle, { backgroundColor: 'rgba(245,197,24,0.12)' }]}>
                    <Ionicons name={getRewardIcon(item.title) as any} size={22} color={colors.coin} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.optTitle}>{item.title}</ThemedText>
                    {item.description ? <ThemedText style={[styles.optDesc, { color: colors.textMuted }]}>{item.description}</ThemedText> : null}
                    <View style={[styles.costPill, { backgroundColor: 'rgba(245,197,24,0.15)', borderColor: 'rgba(245,197,24,0.35)' }]}>
                      <Ionicons name="disc-outline" size={11} color={colors.coin} />
                      <ThemedText style={[styles.costPillText, { color: colors.coin }]}>{item.coinsRequired}</ThemedText>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.redeemBtn, { backgroundColor: canAfford ? colors.tint : colors.backgroundElevated2, borderWidth: canAfford ? 0 : 1, borderColor: colors.border }]}
                      disabled={!canAfford}
                      onPress={() => handleRedeem(item.id, item.coinsRequired, item.title)}>
                      {!canAfford && <Ionicons name="lock-closed-outline" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />}
                      <ThemedText style={{ color: canAfford ? '#0A0A0A' : colors.textMuted, fontWeight: '700', fontSize: 13 }}>{canAfford ? 'Redeem' : 'Locked'}</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteOption(item.id)}>
                      <ThemedText style={[styles.deleteLink, { color: colors.danger }]}>Delete</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.backgroundElevated2 }]}>
                  <Ionicons name="gift-outline" size={28} color={colors.textMuted} />
                </View>
                <ThemedText style={[styles.empty, { color: colors.textMuted }]}>No redeem options yet</ThemedText>
              </View>
            }
          />
        </>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.tint} />
          }
          renderItem={({ item }) => (
            <View style={[styles.historyRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.historyIconCircle, { backgroundColor: item.amount >= 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)' }]}>
                <Ionicons name={item.amount >= 0 ? 'arrow-up-outline' : 'arrow-down-outline'} size={14} color={item.amount >= 0 ? colors.success : colors.danger} />
              </View>
              <ThemedText style={styles.reason}>{item.reason}</ThemedText>
              <ThemedText style={[item.amount >= 0 ? { color: colors.success } : { color: colors.danger }, styles.amountText]}>
                {item.amount >= 0 ? '+' : ''}{item.amount}
              </ThemedText>
            </View>
          )}
          ListHeaderComponent={<ThemedText type="title" style={styles.historyTitle}>Earned History</ThemedText>}
          ListFooterComponent={
            <View style={{ marginTop: 24 }}>
              <ThemedText type="title" style={styles.historyTitle}>Redemption History</ThemedText>
              {redeemHistory.length === 0 ? (
                <ThemedText style={[styles.empty, { color: colors.textMuted }]}>No redemptions yet</ThemedText>
              ) : (
                redeemHistory.map((r) => (
                  <View key={r.id} style={[styles.historyRow, { borderBottomColor: colors.border }]}>
                    <View style={[styles.historyIconCircle, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                      <Ionicons name="gift-outline" size={14} color={colors.danger} />
                    </View>
                    <ThemedText style={styles.reason}>{r.optionTitle || 'Redeemed reward'}</ThemedText>
                    <ThemedText style={[{ color: colors.danger }, styles.amountText]}>-{r.coinsSpent}</ThemedText>
                  </View>
                ))
              )}
            </View>
          }
          ListEmptyComponent={!loading ? <ThemedText style={[styles.empty, { color: colors.textMuted }]}>No coin history yet</ThemedText> : null}
        />
      )}

      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
            <ScrollView>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Ionicons name="gift-outline" size={16} color={colors.text} />
                <ThemedText style={{ fontSize: 16, fontWeight: '800' }}>New Redeem Option</ThemedText>
              </View>
              <ThemedText style={{ fontSize: 12, color: colors.textMuted, marginBottom: 14 }}>Min {MIN_COINS} coins</ThemedText>
              {createError ? <ThemedText style={[styles.errorText, { color: colors.danger }]}>{createError}</ThemedText> : null}

              <ThemedText style={[styles.label, { color: colors.textMuted }]}>Title *</ThemedText>
              <TextInput style={[styles.input, { backgroundColor: colors.backgroundElevated2, borderColor: colors.border, color: colors.text }]} placeholder="e.g. Coffee treat" placeholderTextColor={colors.textMuted} value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} />

              <ThemedText style={[styles.label, { color: colors.textMuted }]}>Description</ThemedText>
              <TextInput style={[styles.input, { backgroundColor: colors.backgroundElevated2, borderColor: colors.border, color: colors.text }]} placeholder="Optional details..." placeholderTextColor={colors.textMuted} value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} />

              <ThemedText style={[styles.label, { color: colors.textMuted }]}>Coins Required (min {MIN_COINS})</ThemedText>
              <TextInput style={[styles.input, { backgroundColor: colors.backgroundElevated2, borderColor: colors.border, color: colors.text }]} placeholder={`e.g. ${MIN_COINS}`} placeholderTextColor={colors.textMuted} keyboardType="numeric" value={form.coinsRequired} onChangeText={(v) => setForm({ ...form, coinsRequired: v })} />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <TouchableOpacity onPress={() => { setShowCreate(false); setCreateError(''); }} style={[styles.cancelBtn, { flex: 1, backgroundColor: colors.backgroundElevated2 }]}>
                  <ThemedText style={{ textAlign: 'center', fontWeight: '600' }}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreateOption} style={[styles.addBtn, { flex: 2, backgroundColor: colors.tint, justifyContent: 'center' }]}>
                  <ThemedText style={styles.addBtnText}>Create</ThemedText>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  coinCard: {
    borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.lg,
    alignItems: 'center', marginBottom: Spacing.md,
  },
  coinIconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  coinLabel: { fontSize: 13 },
  coinValue: { fontSize: 38, fontWeight: '800', marginTop: 2 },
  historyTitle: { marginBottom: 10, fontSize: 16 },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyIconCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  reason: { fontSize: 14, flex: 1 },
  amountText: { fontWeight: '700', fontSize: 14 },
  empty: { textAlign: 'center', fontSize: 13 },
  emptyWrap: { alignItems: 'center', marginTop: 60, gap: 4 },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  tabChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radius.full, borderWidth: 1 },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  groupChip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: Radius.full, borderWidth: 1, marginRight: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 9, paddingHorizontal: 14, borderRadius: Radius.md },
  addBtnText: { color: '#0A0A0A', fontWeight: '700', fontSize: 13 },
  optCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, marginBottom: Spacing.sm,
  },
  optIconCircle: { width: 46, height: 46, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  optTitle: { fontSize: 15, fontWeight: '700' },
  optDesc: { fontSize: 12, marginTop: 2, marginBottom: 8 },
  costPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderWidth: 1, borderRadius: Radius.full, paddingVertical: 3, paddingHorizontal: 8 },
  costPillText: { fontSize: 12, fontWeight: '800' },
  redeemBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radius.md },
  deleteLink: { fontSize: 12, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalBox: { borderRadius: Radius.lg, borderWidth: 1, padding: 20, maxHeight: '85%' },
  label: { fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 12, fontSize: 14 },
  cancelBtn: { paddingVertical: 10, borderRadius: Radius.md, justifyContent: 'center' },
  errorText: { fontSize: 12, marginBottom: 8 },
});
