import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { FormInput } from '@/components/form-input';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemeToggle } from '@/components/theme-toggle';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { forgotPassword } from '@/lib/api';

export default function ForgotPasswordScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Enter your email.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSent(true);
      setTimeout(() => {
        router.push({ pathname: '/(auth)/reset-password', params: { email: email.trim().toLowerCase() } });
      }, 1200);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.container}>
          <ThemeToggle style={styles.toggle} />

          <Animated.View entering={FadeInDown.duration(450).springify()} style={styles.iconWrap}>
            <Ionicons name="lock-closed" size={40} color={colors.tint} />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(450).delay(80).springify()}>
            <ThemedText type="title" style={styles.title}>Forgot password</ThemedText>
            <ThemedText style={styles.subtitle}>Enter your email to receive an OTP.</ThemedText>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(450).delay(160).springify()}>
            <FormInput
              label="Email address"
              placeholder="you@example.com"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            {!!error && (
              <>
                <ThemedText style={styles.error}>{error}</ThemedText>
                {error.toLowerCase().includes('expired') && (
                  <ThemedText
                    onPress={handleSubmit}
                    style={[styles.resendLink, { color: colors.tint }]}>
                    🔄 Resend OTP
                  </ThemedText>
                )}
              </>
            )}
            {sent && <ThemedText style={[styles.notice, { color: colors.success }]}>OTP sent to your email!</ThemedText>}

            {sent && (
              <ThemedText
                onPress={() => router.push({ pathname: '/(auth)/reset-password', params: { email: email.trim().toLowerCase() } })}
                style={[styles.enterOtpLink, { borderColor: colors.border, color: colors.muted }]}>
                Already have an OTP? Enter it →
              </ThemedText>
            )}

            <PrimaryButton
              title={sent ? 'Resend OTP' : 'Send OTP'}
              loading={loading}
              onPress={handleSubmit}
              style={styles.submitBtn}
            />

            <Link href="/(auth)/login" style={styles.linkWrap}>
              <ThemedText style={{ color: colors.tint, fontWeight: '600', textAlign: 'center' }}>
                ← Back to login
              </ThemedText>
            </Link>
          </Animated.View>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  toggle: { position: 'absolute', top: 16, right: 20 },
  iconWrap: { alignItems: 'center', marginBottom: 12 },
  title: { textAlign: 'center', marginBottom: 6, fontSize: 26 },
  subtitle: { textAlign: 'center', marginBottom: 26, opacity: 0.75 },
  error: { color: '#DC2626', marginBottom: 12, textAlign: 'center' },
  notice: { marginBottom: 12, textAlign: 'center' },
  submitBtn: { marginTop: 6 },
  linkWrap: { marginTop: 20 },
  resendLink: { marginTop: 8, textAlign: 'center', fontWeight: '600', fontSize: 13 },
  enterOtpLink: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 13,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
  },
});
