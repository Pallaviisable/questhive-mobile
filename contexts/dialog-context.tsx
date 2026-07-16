import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type DialogButtonStyle = 'default' | 'cancel' | 'destructive';

export type DialogButton = {
  text: string;
  style?: DialogButtonStyle;
  onPress?: () => void;
};

type DialogState = {
  visible: boolean;
  title: string;
  message?: string;
  buttons: DialogButton[];
};

type DialogContextValue = {
  alert: (title: string, message?: string, buttons?: DialogButton[]) => void;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within a DialogProvider');
  return ctx;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const [state, setState] = useState<DialogState>({ visible: false, title: '', buttons: [] });
  const closingRef = useRef(false);

  const alert = useCallback((title: string, message?: string, buttons?: DialogButton[]) => {
    setState({
      visible: true,
      title,
      message,
      buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }],
    });
  }, []);

  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setState((s) => ({ ...s, visible: false }));
    setTimeout(() => { closingRef.current = false; }, 200);
  };

  const handlePress = (btn: DialogButton) => {
    close();
    btn.onPress?.();
  };

  return (
    <DialogContext.Provider value={{ alert }}>
      {children}
      <Modal visible={state.visible} transparent animationType="fade" onRequestClose={close}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={close}>
          <TouchableOpacity activeOpacity={1} style={[styles.sheet, { backgroundColor: C.card, borderColor: C.border }]}>
            <ThemedText style={{ fontSize: 16, fontWeight: '700', marginBottom: state.message ? 8 : 16 }}>
              {state.title}
            </ThemedText>
            {!!state.message && (
              <ThemedText style={{ color: C.textMuted, fontSize: 13.5, lineHeight: 19, marginBottom: 18 }}>
                {state.message}
              </ThemedText>
            )}
            <View style={{ gap: 8 }}>
              {state.buttons.map((btn, i) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel';
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => handlePress(btn)}
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: isDestructive ? C.danger : isCancel ? C.backgroundElevated : C.tint,
                      },
                    ]}
                  >
                    <ThemedText
                      style={{
                        fontWeight: '700',
                        fontSize: 13.5,
                        color: isCancel ? C.text : isDestructive ? '#fff' : '#000',
                      }}
                    >
                      {btn.text}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </DialogContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: Spacing.lg, paddingBottom: 36 },
  actionBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
});
