import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getNotifications, getUnreadCount, markAllRead, markNotificationRead } from '@/lib/api';

type NotificationItem = {
  id: string;
  title?: string;
  message?: string;
  body?: string;
  read?: boolean;
  isRead?: boolean;
  createdAt?: string;
  type?: string;
};

export function NotificationBell() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  const [visible, setVisible] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadUnread = useCallback(async () => {
    try {
      const res = await getUnreadCount();
      setUnread(res.data?.count ?? 0);
    } catch {
      // silent — don't break the header over a badge count
    }
  }, []);

  useEffect(() => {
    loadUnread();
    const interval = setInterval(loadUnread, 30000);
    return () => clearInterval(interval);
  }, [loadUnread]);

  const openPanel = async () => {
    setVisible(true);
    setLoading(true);
    try {
      const res = await getNotifications();
      setItems(res.data ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));
      setUnread(0);
    } catch {
      // non-fatal
    }
  };

  const handleItemPress = async (item: NotificationItem) => {
    if (!(item.read ?? item.isRead)) {
      try {
        await markNotificationRead(item.id);
        setItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, read: true, isRead: true } : n))
        );
        setUnread((c) => Math.max(0, c - 1));
      } catch {
        // non-fatal
      }
    }
  };

  return (
    <>
      <TouchableOpacity onPress={openPanel} style={styles.bellWrap} activeOpacity={0.7}>
        <Ionicons name="notifications-outline" size={24} color={colors.text} />
        {unread > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.danger, borderColor: colors.background }]}>
            <ThemedText style={styles.badgeText}>{unread > 9 ? '9+' : unread}</ThemedText>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable
            style={[styles.panel, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.panelHeader}>
              <ThemedText style={styles.panelTitle}>Notifications</ThemedText>
              {unread > 0 && (
                <TouchableOpacity onPress={handleMarkAll}>
                  <ThemedText style={[styles.markAll, { color: colors.tint }]}>Mark all read</ThemedText>
                </TouchableOpacity>
              )}
            </View>

            {loading ? (
              <ActivityIndicator color={colors.tint} style={{ marginVertical: 24 }} />
            ) : items.length === 0 ? (
              <ThemedText style={[styles.empty, { color: colors.textMuted }]}>
                You're all caught up.
              </ThemedText>
            ) : (
              <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 360 }}
                renderItem={({ item }) => {
                  const isRead = item.read ?? item.isRead;
                  return (
                    <TouchableOpacity
                      onPress={() => handleItemPress(item)}
                      style={[
                        styles.item,
                        { borderBottomColor: colors.border },
                        !isRead && { backgroundColor: `${colors.tint}0D` },
                      ]}>
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: isRead ? 'transparent' : colors.tint },
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.itemTitle}>
                          {item.title ?? 'Notification'}
                        </ThemedText>
                        <ThemedText style={[styles.itemBody, { color: colors.textMuted }]}>
                          {item.message ?? item.body ?? ''}
                        </ThemedText>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellWrap: { padding: 4, position: 'relative' },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', paddingTop: 60, paddingHorizontal: Spacing.md },
  panel: {
    alignSelf: 'flex-end',
    width: '86%',
    maxWidth: 340,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  panelTitle: { fontSize: 15, fontWeight: '800' },
  markAll: { fontSize: 12, fontWeight: '700' },
  empty: { textAlign: 'center', padding: Spacing.lg, fontSize: 13 },
  item: {
    flexDirection: 'row',
    gap: 10,
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start',
  },
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 5 },
  itemTitle: { fontSize: 13, fontWeight: '700' },
  itemBody: { fontSize: 12, marginTop: 2 },
});
