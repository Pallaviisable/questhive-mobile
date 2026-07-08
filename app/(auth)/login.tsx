import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { FormInput } from '@/components/form-input';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/auth-context';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // AuthProvider flips isAuthenticated → root layout's Stack.Protected
      // swaps us into (tabs) automatically, no manual navigation needed.
    } catch (e: any) {
      const status = e?.response?.status;
      const serverMessage = e?.response?.data?.message;

      if (status === 403 || serverMessage?.toLowerCase?.().includes('verify')) {
        // Unverified account — send them to finish OTP verification.
        router.push({ pathname: '/(auth)/verify-email', params: { email: email.trim() } });
        return;
      }
      setError(serverMessage || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.container}>
          <ThemedText type="title" style={styles.title}>
            QuestHive
          </ThemedText>
          <ThemedText style={styles.subtitle}>Log in to keep your streak alive.</ThemedText>

          <FormInput
            placeholder="Email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <FormInput
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}

          <PrimaryButton title="Log In" loading={loading} onPress={handleLogin} />

          <Link href="/(auth)/request-access" style={styles.linkWrap}>
            <ThemedText type="link" style={styles.linkText}>
              Don&apos;t have an account? Request access
            </ThemedText>
          </Link>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 28,
    opacity: 0.7,
  },
  error: {
    color: '#DC2626',
    marginBottom: 12,
    textAlign: 'center',
  },
  linkWrap: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    textAlign: 'center',
  },
});
