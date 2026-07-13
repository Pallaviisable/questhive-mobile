import { Ionicons } from '@expo/vector-icons';
import { Link, router, useLocalSearchParams } from 'expo-router';
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
import { useColorScheme } from '@/hooks/use-color-scheme';
import { resendOtp, resetPassword } from '@/lib/api';

export default function ResetPasswordScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState(params.email ?? '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState(false);

  const isExpired = error.toLowerCase().includes('expired');

  const handleSubmit = async () => {
    if (!email.trim() || !otp.trim() || !newPassword) {
      setError('Fill in all fields.');
      return;
    }
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await resetPassword({ email: email.trim().toLowerCase(), otp: otp.trim(), newPassword });
      setSuccess(true);
      setTimeout(() => router.replace('/(auth)/login'), 1500);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Invalid OTP or something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError('Enter your email first.');
      return;
    }
    setError('');
    setNotice('');
    setResending(true);
    try {
      await resendOtp(email.trim().toLowerCase());
      setNotice('New OTP sent! Check your email.');
      setOtp('');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.container}>
          <ThemeToggle style={styles.toggle} />

          <Animated.View entering={FadeInDown.duration(450).springify()} style={styles.iconWrap}>
            <Ionicons name="key" size={40} color={colors.tint} />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(450).delay(80).springify()}>
            <ThemedText type="title" style={styles.title}>Reset password</ThemedText>
            <ThemedText style={styles.subtitle}>Enter the OTP sent to your email.</ThemedText>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(450).delay(160).springify()}>
            <FormInput
              label="Email address"
              placeholder="you@example.com"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <View style={styles.otpLabelRow}>
              <ThemedText style={[styles.label, { color: colors.muted }]}>OTP code</ThemedText>
              <PrimaryButton
                title={resending ? 'Sending...' : 'Resend OTP'}
                variant="ghost"
                loading={false}
                disabled={resending}
                onPress={handleResend}
                style={styles.resendBtn}
              />
            </View>
            <FormInput
              placeholder="Enter 6-digit OTP"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
            />

            <FormInput
              label="New password"
              placeholder="••••••••"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

            {!!error && (
              <View style={[
                styles.messageBox,
                { backgroundColor: isExpired ? 'rgba(245,197,24,0.08)' : 'rgba(239,68,68,0.1)', borderColor: isExpired ? colors.tint : '#ef4444' },
              ]}>
                <ThemedText style={{ color: isExpired ? colors.tint : '#DC2626', fontSize: 13, textAlign: 'center' }}>
                  {error}
                </ThemedText>
                {isExpired && (
                  <ThemedText
                    onPress={handleResend}
                    style={{ color: colors.tint, fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 8, textDecorationLine: 'underline' }}>
                    Click here to get a new OTP →
                  </ThemedText>
                )}
              </View>
            )}
            {!!notice && (
              <View style={[styles.messageBox, { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' }]}>
                <ThemedText style={{ color: colors.success, fontSize: 13, textAlign: 'center' }}>✓ {notice}</ThemedText>
              </View>
            )}
            {success && (
              <ThemedText style={[styles.notice, { color: colors.success }]}>
                Password reset! Redirecting to login...
              </ThemedText>
            )}

            <PrimaryButton title="Reset password" loading={loading} onPress={handleSubmit} style={styles.submitBtn} />

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
  label: { fontSize: 13, fontWeight: '600' },
  otpLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  resendBtn: { paddingVertical: 0, paddingHorizontal: 0 },
  messageBox: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12 },
  notice: { marginBottom: 12, textAlign: 'center' },
  submitBtn: { marginTop: 6 },
  linkWrap: { marginTop: 20 },
});
