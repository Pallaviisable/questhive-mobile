import { useState } from 'react';
import { Modal, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { submitFeedback } from '@/lib/api';

type FeedbackType = 'BUG' | 'SUGGESTION';

export function FeedbackButton() {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('BUG');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const close = () => {
    setOpen(false);
    setTimeout(() => { setSent(false); setMessage(''); setType('BUG'); }, 200);
  };

  const submit = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      await submitFeedback({ type, message });
      setSent(true);
      setTimeout(close, 1500);
    } catch {
      setSending(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[styles.row, { backgroundColor: C.card, borderColor: C.border }]}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ThemedText style={{ fontSize: 18 }}>💬</ThemedText>
          <View>
            <ThemedText style={{ fontWeight: '700', fontSize: 13 }}>Send Feedback</ThemedText>
            <ThemedText style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>Report a bug or suggest an idea</ThemedText>
          </View>
        </View>
        <ThemedText style={{ color: C.textMuted, fontSize: 18 }}>›</ThemedText>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={close}>
          <TouchableOpacity activeOpacity={1} style={[styles.sheet, { backgroundColor: C.card, borderColor: C.border }]}>
            <ThemedText style={{ fontSize: 16, fontWeight: '700', marginBottom: 14 }}>Send Feedback</ThemedText>

            {sent ? (
              <ThemedText style={{ color: C.success, fontWeight: '600', paddingVertical: 20, textAlign: 'center' }}>
                ✅ Thanks for your feedback!
              </ThemedText>
            ) : (
              <>
                <View style={[styles.typeRow, { marginBottom: 12 }]}>
                  {(['BUG', 'SUGGESTION'] as FeedbackType[]).map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setType(t)}
                      style={[
                        styles.typeBtn,
                        { borderColor: type === t ? C.tint : C.border, backgroundColor: type === t ? `${C.tint}18` : 'transparent' },
                      ]}
                    >
                      <ThemedText style={{ fontSize: 13, fontWeight: '600', color: type === t ? C.tint : C.textMuted }}>
                        {t === 'BUG' ? '🐛 Bug Report' : '💡 Suggestion'}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={[styles.textarea, { backgroundColor: C.backgroundElevated, borderColor: C.border, color: C.text }]}
                  placeholder="Describe your feedback..."
                  placeholderTextColor={C.textMuted}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={4}
                />

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <TouchableOpacity
                    onPress={submit}
                    disabled={!message.trim() || sending}
                    style={[styles.actionBtn, { backgroundColor: C.tint, opacity: !message.trim() || sending ? 0.6 : 1 }]}
                  >
                    <ThemedText style={{ color: '#000', fontWeight: '700', fontSize: 13 }}>
                      {sending ? 'Sending...' : 'Submit'}
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={close} style={[styles.actionBtn, { backgroundColor: C.backgroundElevated }]}>
                    <ThemedText style={{ color: C.text, fontWeight: '600', fontSize: 13 }}>Cancel</ThemedText>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: Spacing.lg, paddingBottom: 36 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  textarea: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 13, minHeight: 90, textAlignVertical: 'top' },
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
});
