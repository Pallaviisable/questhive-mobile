import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { FormInput } from '@/components/form-input';
import { PasswordInput } from '@/components/password-input';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemeToggle } from '@/components/theme-toggle';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RegisterScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name.trim() || !username.trim() || !email.trim() || !code.trim() || !password) {
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
        email: email.trim().toLowerCase(),
        password,
        code: code.trim(),
      });
      router.replace('/(auth)/login');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not create account. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.container}>
          <ThemeToggle style={styles.toggle} />

          <Animated.View entering={FadeInDown.duration(450).springify()} style={styles.brandRow}>
            <View style={[styles.logoBox, { backgroundColor: colors.tint }]}>
              <Ionicons name="layers" size={20} color="#151718" />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.brandName}>QuestHive</ThemedText>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(450).delay(80).springify()}>
            <ThemedText type="title" style={styles.title}>Join the Hive</ThemedText>
            <ThemedText style={styles.subtitle}>
              Already have an account?{' '}
              <Link href="/(auth)/login">
                <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>Log in</ThemedText>
              </Link>
            </ThemedText>
            <ThemedText style={[styles.helper, { color: colors.muted }]}>
              Ask an existing member for a personal invite code, or use the group code they sent you.
            </ThemedText>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(450).delay(160).springify()}>
            <FormInput label="Full Name" placeholder="Your full name" value={name} onChangeText={setName} />
            <FormInput label="Username" placeholder="Choose a username" value={username} onChangeText={setUsername} />
            <FormInput
              label="Email address"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <FormInput
              label="Invite code"
              placeholder="e.g. QH-123456"
              autoCapitalize="none"
              value={code}
              onChangeText={setCode}
            />
            <PasswordInput label="Password" placeholder="••••••••" value={password} onChangeText={setPassword} />
            <PasswordInput label="Confirm password" placeholder="••••••••" value={confirmPassword} onChangeText={setConfirmPassword} />

            {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}

            <PrimaryButton
              title="🐝 Create Account"
              loading={loading}
              onPress={handleRegister}
              style={styles.submitBtn}
            />
          </Animated.View>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  toggle: { position: 'absolute', top: 16, right: 20 },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28, gap: 10 },
  logoBox: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 18 },
  title: { marginBottom: 6, fontSize: 28 },
  subtitle: { marginBottom: 8, opacity: 0.85 },
  helper: { fontSize: 12, marginBottom: 22, opacity: 0.8 },
  error: { color: '#DC2626', marginBottom: 12, textAlign: 'center' },
  submitBtn: { marginTop: 6 },
});
