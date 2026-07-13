import { Ionicons } from '@expo/vector-icons';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { FormInput } from '@/components/form-input';
import { PasswordInput } from '@/components/password-input';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { validateInvite } from '@/lib/api';

type InviteData = {
  email: string;
  groupName?: string;
};

export default function RegisterScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { register } = useAuth();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [validating, setValidating] = useState(true);
  const [inviteError, setInviteError] = useState('');

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setInviteError('No invite token found. You need an invite link to register on QuestHive.');
      setValidating(false);
      return;
    }
    validateInvite(token)
      .then((res: any) => {
        if (res.data?.alreadyRegistered) {
          router.replace('/(auth)/login');
          return;
        }
        setInvite(res.data);
        setValidating(false);
      })
      .catch((e: any) => {
        setInviteError(e?.response?.data?.message || 'This invite link is invalid or has expired.');
        setValidating(false);
      });
  }, [token]);

  const handleRegister = async () => {
    if (!name.trim() || !username.trim() || !password) {
      setError('Fill in all fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords don\u2019t match.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await register({
        fullName: name.trim(),
        username: username.trim(),
        email: invite!.email,
        password,
        inviteToken: token!,
      });
      router.replace('/(auth)/login');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not create account. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <ThemedView style={[styles.container, styles.centerAll]}>
        <ActivityIndicator color={colors.tint} size="large" />
        <ThemedText style={{ marginTop: 12, color: colors.tint }}>Validating your invite...</ThemedText>
      </ThemedView>
    );
  }

  if (inviteError) {
    return (
      <ThemedView style={[styles.container, styles.centerAll]}>
        <ThemedText style={{ fontSize: 40, marginBottom: 8 }}>🐝</ThemedText>
        <ThemedText type="title" style={{ marginBottom: 16, textAlign: 'center' }}>Invalid Invite</ThemedText>
        <View style={[styles.errorBox, { borderColor: '#ef4444' }]}>
          <ThemedText style={{ color: '#ef4444', fontSize: 14, textAlign: 'center' }}>{inviteError}</ThemedText>
        </View>
        <ThemedText style={{ opacity: 0.7, fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
          You need a valid invite link to create an account.
        </ThemedText>
        <Link href="/(auth)/login">
          <ThemedText style={{ color: colors.tint, fontSize: 14 }}>← Back to Login</ThemedText>
        </Link>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.container}>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <ThemedText style={{ fontSize: 40, marginBottom: 8 }}>🐝</ThemedText>
            <ThemedText type="title" style={styles.title}>Join the Hive</ThemedText>
            {!!invite?.groupName && (
              <ThemedText style={{ opacity: 0.7, fontSize: 13, marginTop: 4 }}>
                Joining <ThemedText style={{ color: colors.tint, fontWeight: '700' }}>{invite.groupName}</ThemedText>
              </ThemedText>
            )}
          </View>

          <ThemedText style={[styles.label, { color: colors.muted }]}>
            Email <ThemedText style={{ opacity: 0.5, fontSize: 11 }}>(from your invite)</ThemedText>
          </ThemedText>
          <View style={[styles.readonlyField, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ThemedText style={{ opacity: 0.6 }}>{invite?.email}</ThemedText>
          </View>

          <FormInput label="Full Name" placeholder="Your full name" value={name} onChangeText={setName} />
          <FormInput label="Username" placeholder="Choose a username" value={username} onChangeText={setUsername} />
          <PasswordInput label="Password" placeholder="••••••••" value={password} onChangeText={setPassword} />
          <PasswordInput label="Confirm password" placeholder="••••••••" value={confirmPassword} onChangeText={setConfirmPassword} />

          {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}

          <PrimaryButton
            title="🐝 Create Account"
            loading={loading}
            onPress={handleRegister}
            style={styles.submitBtn}
          />

          <Link href="/(auth)/login" style={styles.linkWrap}>
            <ThemedText type="link" style={styles.linkText}>Already have an account? Log in</ThemedText>
          </Link>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  centerAll: { alignItems: 'center' },
  title: { textAlign: 'center', marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  readonlyField: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(239,68,68,0.1)',
    width: '100%',
  },
  error: { color: '#DC2626', marginBottom: 12, textAlign: 'center' },
  submitBtn: { marginTop: 6 },
  linkWrap: { marginTop: 20, alignItems: 'center' },
  linkText: { textAlign: 'center' },
});
