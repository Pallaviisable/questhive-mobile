import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/primary-button';
import { useAuth } from '@/contexts/auth-context';
import { StyleSheet } from 'react-native';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">{user?.name ?? 'Profile'}</ThemedText>
      <ThemedText style={styles.email}>{user?.email}</ThemedText>
      <ThemedText style={styles.role}>{user?.role}</ThemedText>
      <PrimaryButton title="Log Out" onPress={logout} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, gap: 8 },
  email: { opacity: 0.6 },
  role: { opacity: 0.4, fontSize: 12, marginBottom: 16 },
});
