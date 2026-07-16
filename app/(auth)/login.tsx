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
import { TypingHeadline } from '@/components/typing-headline';
import { StatStrip } from '@/components/stat-strip';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LoginScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
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
    } catch (e: any) {
      const status = e?.response?.status;
      const serverMessage = e?.response?.data?.message;
      if (status === 403 || serverMessage?.toLowerCase?.().includes('verify')) {
        router.push({ pathname: '/(auth)/verify-email', params: { email: email.trim() } });
        return;
      }
      setError(serverMessage || 'Invalid email or password.');
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
            <ThemedText type="title" style={styles.title}>Sign in</ThemedText>
            <ThemedText style={styles.subtitle}>
              No account?{' '}
              <Link href="/(auth)/register">
                <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>Sign Up</ThemedText>
              </Link>
            </ThemedText>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(450).delay(120).springify()} style={{ marginBottom: 20 }}>
            <TypingHeadline />
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(450).delay(160).springify()}>
            <FormInput
              label="Email address"
              placeholder="you@example.com"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <View style={styles.passwordLabelRow}>
              <ThemedText style={[styles.label, { color: colors.muted }]}>Password</ThemedText>
              <Link href="/(auth)/forgot-password">
                <ThemedText style={{ color: colors.tint, fontSize: 13, fontWeight: '600' }}>
                  Forgot password?
                </ThemedText>
              </Link>
            </View>
            <PasswordInput placeholder="••••••" value={password} onChangeText={setPassword} />

            {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}

            <PrimaryButton title="Sign in" loading={loading} onPress={handleLogin} style={styles.submitBtn} />
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(450).delay(240).springify()} style={{ marginTop: 28 }}>
            <StatStrip />
          </Animated.View>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  toggle: { position: 'absolute', top: 16, right: 20 },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28, gap: 10 },
  logoBox: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 18 },
  title: { marginBottom: 6, fontSize: 28 },
  subtitle: { marginBottom: 26, opacity: 0.85 },
  label: { fontSize: 13, fontWeight: '600' },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  error: { color: '#DC2626', marginBottom: 12, textAlign: 'center' },
  submitBtn: { marginTop: 6 },
});
