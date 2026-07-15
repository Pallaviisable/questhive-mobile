import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList, View, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/auth-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getChatMessages, sendChatMessage, getGroupDetail, getUserXP } from '@/lib/api';

const TITLE_TIERS = [
  { frame: 'none', title: 'Newcomer', minLevel: 1, color: '#666' },
  { frame: 'bronze', title: 'Task Starter', minLevel: 3, color: '#cd7f32' },
  { frame: 'silver', title: 'Steady Worker', minLevel: 6, color: '#c0c0c0' },
  { frame: 'gold', title: 'Dedicated Bee', minLevel: 10, color: '#f5c518' },
  { frame: 'purple', title: 'Quest Champion', minLevel: 15, color: '#a855f7' },
  { frame: 'elite', title: 'Elite Bee', minLevel: 20, color: '#ef4444' },
];
function getTier(level = 1) {
  let t = TITLE_TIERS[0];
  for (const x of TITLE_TIERS) if (level >= x.minLevel) t = x;
  return t;
}

export default function ChatScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const styles = makeStyles(C);
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const [xpMap, setXpMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);



  const fetchMessages = useCallback(async () => {
    try { const res = await getChatMessages(groupId); setMessages(res.data); } catch {}
  }, [groupId]);

  const fetchGroupXp = useCallback(async () => {
    try {
      const groupRes = await getGroupDetail(groupId);
      const members = groupRes.data?.members || [];
      const results: Record<string, any> = {};
      await Promise.all(members.map(async (m: any) => {
        const id = m.id ?? m._id;
        try { const res = await getUserXP(id); results[id] = res.data; } catch {}
      }));
      setXpMap(results);
    } catch {}
  }, [groupId]);

  useEffect(() => {
    (async () => { setLoading(true); await Promise.all([fetchMessages(), fetchGroupXp()]); setLoading(false); })();
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchMessages, fetchGroupXp]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try { await sendChatMessage(groupId, input.trim()); setInput(''); await fetchMessages(); } catch {}
    setSending(false);
  };

  const getXpInfo = (userId?: string) => {
    if (!userId) return { level: 1, tier: TITLE_TIERS[0] };
    const xp = xpMap[userId];
    if (!xp) return { level: 1, tier: TITLE_TIERS[0] };
    const level = xp.level || 1;
    return { level, tier: getTier(level) };
  };

  const myXp = getXpInfo(user?.id ?? user?._id);

  if (loading) {
    return <ThemedView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={C.tint} size="large" /></ThemedView>;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ThemedView style={styles.container}>
        <View style={{ padding: Spacing.md, paddingBottom: 0 }}>
          <ThemedText type="title" style={{ marginBottom: 8 }}>💬 Group Chat</ThemedText>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item, i) => item.id || String(i)}
          contentContainerStyle={{ padding: Spacing.md, gap: 10 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={<ThemedText style={{ textAlign: 'center', color: C.textMuted, padding: 60 }}>No messages yet. Say hello! 👋</ThemedText>}
          renderItem={({ item: msg }) => {
            const isMe = msg.userId === (user?.id ?? user?._id);
            const { level, tier } = getXpInfo(msg.userId);
            const initial = (msg.authorName || '?')[0]?.toUpperCase();

            return (
              <View style={{ flexDirection: 'row', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
                {!isMe && (
                  <View style={{ position: 'relative' }}>
                    <View style={{
                      width: 32, height: 32, borderRadius: 16, backgroundColor: C.backgroundElevated,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: tier.frame !== 'none' ? 2 : 0, borderColor: tier.color,
                    }}>
                      <ThemedText style={{ fontWeight: '800', fontSize: 13, color: tier.color }}>{initial}</ThemedText>
                    </View>
                    {level > 1 && (
                      <View style={{ position: 'absolute', bottom: -3, right: -3, backgroundColor: C.background, borderWidth: 1, borderColor: tier.color, borderRadius: Radius.full, paddingHorizontal: 3 }}>
                        <ThemedText style={{ fontSize: 7, fontWeight: '800', color: tier.color }}>{level}</ThemedText>
                      </View>
                    )}
                  </View>
                )}

                <View style={{ maxWidth: '75%' }}>
                  {!isMe && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3, paddingLeft: 2 }}>
                      <ThemedText style={{ fontSize: 11, color: C.tint, fontWeight: '700' }}>{msg.authorName}</ThemedText>
                      {tier.frame !== 'none' && (
                        <View style={{ backgroundColor: `${tier.color}22`, borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 1 }}>
                          <ThemedText style={{ fontSize: 9, color: tier.color, fontWeight: '600' }}>{tier.title}</ThemedText>
                        </View>
                      )}
                    </View>
                  )}
                  <View style={{
                    padding: 12, borderRadius: 16,
                    borderBottomRightRadius: isMe ? 4 : 16, borderBottomLeftRadius: isMe ? 16 : 4,
                    backgroundColor: isMe ? 'rgba(245,197,24,0.15)' : C.card,
                    borderWidth: 1, borderColor: isMe ? 'rgba(245,197,24,0.3)' : C.border,
                  }}>
                    <ThemedText style={{ fontSize: 14, lineHeight: 20 }}>{msg.content}</ThemedText>
                    <ThemedText style={{ fontSize: 10, color: C.textMuted, marginTop: 4, textAlign: 'right' }}>
                      {new Date(msg.sentAt || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </ThemedText>
                  </View>
                </View>

                {isMe && (
                  <View style={{ position: 'relative' }}>
                    <View style={{
                      width: 32, height: 32, borderRadius: 16, backgroundColor: C.tint,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: myXp.tier.frame !== 'none' ? 2 : 0, borderColor: myXp.tier.color,
                    }}>
                      <ThemedText style={{ fontWeight: '800', fontSize: 13, color: '#000' }}>{(user?.fullName || 'Y')[0]?.toUpperCase()}</ThemedText>
                    </View>
                    {myXp.level > 1 && (
                      <View style={{ position: 'absolute', bottom: -3, right: -3, backgroundColor: C.background, borderWidth: 1, borderColor: myXp.tier.color, borderRadius: Radius.full, paddingHorizontal: 3 }}>
                        <ThemedText style={{ fontSize: 7, fontWeight: '800', color: myXp.tier.color }}>{myXp.level}</ThemedText>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          }}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor={C.textMuted}
            multiline
          />
          <TouchableOpacity onPress={sendMessage} disabled={sending || !input.trim()} style={[styles.sendBtn, { opacity: input.trim() ? 1 : 0.5 }]}>
            <ThemedText style={{ fontSize: 18, color: '#000' }}>➤</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (C: typeof Colors.dark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', padding: Spacing.md, borderTopWidth: 1, borderColor: C.border },
  input: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, color: C.text, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
  sendBtn: { backgroundColor: C.tint, borderRadius: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
