import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Modal, RefreshControl, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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

export default function RewardsScreen() {
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

  const handleRedeem = async (optId: string, cost: number) => {
    if ((coins ?? 0) < cost) { Alert.alert('Not enough coins', 'Keep completing tasks!'); return; }
    try {
      await redeemOption(optId);
      loadData();
      loadRedeemData();
    } catch (err: any) {
      Alert.alert('Failed', err?.response?.data?.message || 'Redemption failed.');
    }
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
    <ThemedView style={styles.container}>
      <ThemedView style={styles.coinCard}>
        <ThemedText style={styles.coinLabel}>Your Coins</ThemedText>
        <ThemedText style={styles.coinValue}>{loading ? '...' : coins ?? 0}</ThemedText>
      </ThemedView>

      <View style={styles.tabRow}>
        {[{ key: 'REDEEM', label: 'Redeem' }, { key: 'HISTORY', label: 'History' }].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabChip, tab === t.key && styles.tabChipActive]}
            onPress={() => setTab(t.key as 'REDEEM' | 'HISTORY')}>
            <ThemedText style={tab === t.key ? styles.tabTextActive : styles.tabText}>{t.label}</ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'REDEEM' ? (
        <>
          <View style={styles.groupRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
              {groups.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.groupChip, selectedGroup === g.id && styles.groupChipActive]}
                  onPress={() => setSelectedGroup(g.id)}>
                  <ThemedText style={selectedGroup === g.id ? styles.tabTextActive : styles.tabText}>{g.name}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
              <ThemedText style={styles.addBtnText}>+ Add</ThemedText>
            </TouchableOpacity>
          </View>

          <FlatList
            data={redeemOptions}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); loadRedeemData(); }} />
            }
            renderItem={({ item }) => {
              const canAfford = (coins ?? 0) >= item.coinsRequired;
              return (
                <ThemedView style={styles.optCard}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.optTitle}>{item.title}</ThemedText>
                    {item.description ? <ThemedText style={styles.optDesc}>{item.description}</ThemedText> : null}
                    <ThemedText style={styles.optCost}>{item.coinsRequired} coins</ThemedText>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.redeemBtn, !canAfford && styles.redeemBtnDisabled]}
                      disabled={!canAfford}
                      onPress={() => handleRedeem(item.id, item.coinsRequired)}>
                      <ThemedText style={styles.btnText}>{canAfford ? 'Redeem' : 'Locked'}</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteOption(item.id)}>
                      <ThemedText style={styles.deleteLink}>Delete</ThemedText>
                    </TouchableOpacity>
                  </View>
                </ThemedView>
              );
            }}
            ListEmptyComponent={<ThemedText style={styles.empty}>No redeem options yet</ThemedText>}
          />
        </>
      ) : (
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
          ListHeaderComponent={<ThemedText type="title" style={styles.historyTitle}>Earned History</ThemedText>}
          ListFooterComponent={
            <View style={{ marginTop: 24 }}>
              <ThemedText type="title" style={styles.historyTitle}>Redemption History</ThemedText>
              {redeemHistory.length === 0 ? (
                <ThemedText style={styles.empty}>No redemptions yet</ThemedText>
              ) : (
                redeemHistory.map((r) => (
                  <ThemedView key={r.id} style={styles.historyRow}>
                    <ThemedText style={styles.reason}>{r.optionTitle || 'Redeemed reward'}</ThemedText>
                    <ThemedText style={styles.negative}>-{r.coinsSpent}</ThemedText>
                  </ThemedView>
                ))
              )}
            </View>
          }
          ListEmptyComponent={!loading ? <ThemedText style={styles.empty}>No coin history yet</ThemedText> : null}
        />
      )}

      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView>
              <ThemedText style={{ fontSize: 16, fontWeight: '800', marginBottom: 2 }}>New Redeem Option</ThemedText>
              <ThemedText style={{ fontSize: 12, opacity: 0.6, marginBottom: 14 }}>Min {MIN_COINS} coins</ThemedText>
              {createError ? <ThemedText style={styles.errorText}>{createError}</ThemedText> : null}

              <ThemedText style={styles.label}>Title *</ThemedText>
              <TextInput style={styles.input} placeholder="e.g. Coffee treat" placeholderTextColor="#888" value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} />

              <ThemedText style={styles.label}>Description</ThemedText>
              <TextInput style={styles.input} placeholder="Optional details..." placeholderTextColor="#888" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} />

              <ThemedText style={styles.label}>Coins Required (min {MIN_COINS})</ThemedText>
              <TextInput style={styles.input} placeholder={`e.g. ${MIN_COINS}`} placeholderTextColor="#888" keyboardType="numeric" value={form.coinsRequired} onChangeText={(v) => setForm({ ...form, coinsRequired: v })} />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <TouchableOpacity onPress={() => { setShowCreate(false); setCreateError(''); }} style={[styles.cancelBtn, { flex: 1 }]}>
                  <ThemedText style={{ textAlign: 'center', fontWeight: '600' }}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreateOption} style={[styles.addBtn, { flex: 2, alignItems: 'center' }]}>
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
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tabChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#eee' },
  tabChipActive: { backgroundColor: '#4F46E5' },
  tabText: { color: '#333', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#fff', fontWeight: '700', fontSize: 13 },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  groupChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#eee', marginRight: 8 },
  groupChipActive: { backgroundColor: '#4F46E5' },
  addBtn: { backgroundColor: '#4F46E5', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  optCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: 14, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.03)', marginBottom: 10,
  },
  optTitle: { fontSize: 15, fontWeight: '700' },
  optDesc: { fontSize: 12, opacity: 0.6, marginTop: 2 },
  optCost: { fontSize: 14, fontWeight: '800', color: '#4F46E5', marginTop: 6 },
  redeemBtn: { backgroundColor: '#4F46E5', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  redeemBtnDisabled: { backgroundColor: '#ccc' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  deleteLink: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: '#fff', borderRadius: 14, padding: 20, maxHeight: '85%' },
  label: { fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 6, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, fontSize: 14, color: '#000' },
  cancelBtn: { backgroundColor: '#eee', paddingVertical: 10, borderRadius: 8, justifyContent: 'center' },
  errorText: { color: '#EF4444', fontSize: 12, marginBottom: 8 },
});
