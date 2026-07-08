import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { validateInvite } from '@/lib/api';

type InviteInfo = { groupName?: string; groupDescription?: string; memberCount?: number; type: string; email: string; alreadyRegistered: boolean; message?: string };

export default function InvitePreviewScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data } = await validateInvite(token);
        setInvite(data);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'This invite link is invalid or expired.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Checking your invite...</ThemedText>
      </ThemedView>
    );
  }

  if (error || !invite) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">Invite not valid</ThemedText>
        <ThemedText style={styles.subtitle}>{error}</ThemedText>
        <PrimaryButton title="Back to Login" onPress={() => router.replace('/(auth)/login')} />
      </ThemedView>
    );
  }

  // Someone already has an account with this invite's email — the backend
  // may have already auto-added them to the group (MEMBER invites). Either
  // way, signing up again would fail, so send them to log in instead.
  if (invite.alreadyRegistered) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>You're already in!</ThemedText>
        <ThemedText style={styles.subtitle}>
          {invite.message || 'You already have a QuestHive account.'}
        </ThemedText>
        <PrimaryButton title="Log In" onPress={() => router.replace('/(auth)/login')} />
      </ThemedView>
    );
  }

  const isAdminInvite = invite.type === 'ADMIN';

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>You're invited!</ThemedText>
      {isAdminInvite ? (
        <ThemedText style={styles.description}>
          You've been approved as a Family Admin on QuestHive. Create your account to get started.
        </ThemedText>
      ) : (
        <>
          <ThemedText style={styles.groupName}>{invite.groupName}</ThemedText>
          <ThemedText style={styles.subtitle}>
            {invite.memberCount} member{invite.memberCount === 1 ? '' : 's'}
          </ThemedText>
          {!!invite.groupDescription && (
            <ThemedText style={styles.description}>{invite.groupDescription}</ThemedText>
          )}
        </>
      )}

      <PrimaryButton
        title="Continue to Sign Up"
        onPress={() => router.push({ pathname: '/(auth)/register', params: { token } })}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, gap: 8 },
  title: { marginBottom: 4 },
  groupName: { fontSize: 20, fontWeight: '700' },
  subtitle: { opacity: 0.7, marginBottom: 8 },
  description: { textAlign: 'center', opacity: 0.8, marginBottom: 24 },
});
