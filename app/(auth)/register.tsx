import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { FormInput } from '@/components/form-input';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/auth-context';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
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
      const { email: registeredEmail } = await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      // Backend emails an OTP — collect it on the next screen.
      router.push({ pathname: '/(auth)/verify-email', params: { email: registeredEmail } });
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not create account. Try again.');
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
            Create account
          </ThemedText>
          <ThemedText style={styles.subtitle}>Join a group and start earning XP.</ThemedText>

          <FormInput placeholder="Full name" value={name} onChangeText={setName} />
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
          <FormInput
            placeholder="Confirm password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}

          <PrimaryButton title="Sign Up" loading={loading} onPress={handleRegister} />

          <Link href="/(auth)/login" style={styles.linkWrap}>
            <ThemedText type="link" style={styles.linkText}>
              Already have an account? Log in
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
