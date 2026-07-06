import { StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/auth-context';

// Placeholder home screen — just enough to prove login → protected route
// works end to end. The real dashboard (quests, XP, group activity) is
// Week 2 scope.
export default function HomeScreen() {
  const { user, logout } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Hey{user?.name ? `, ${user.name}` : ''} 👋</ThemedText>
      <ThemedText style={styles.email}>{user?.email}</ThemedText>
      <ThemedText style={styles.note}>
        You&apos;re logged in. The dashboard, quests, and rewards screens land in Week 2.
      </ThemedText>
      <PrimaryButton title="Log out" variant="ghost" onPress={logout} style={styles.logout} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  email: {
    opacity: 0.7,
  },
  note: {
    marginTop: 16,
    opacity: 0.6,
  },
  logout: {
    marginTop: 32,
    alignSelf: 'flex-start',
  },
});
