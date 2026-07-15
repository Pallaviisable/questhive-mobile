import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { FormInput } from '@/components/form-input';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/auth-context';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { verifyEmail, resendOtp } = useAuth();
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];

  const [email] = useState(params.email ?? '');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const handleVerify = async () => {
    if (!otp.trim()) {
      setError('Enter the code we emailed you.');
      return;
    }
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await verifyEmail(email, otp.trim());
      // If verifyEmail returned a session, AuthProvider already flipped us
      // into (tabs). If not (backend just confirms and expects a manual
      // login), send them to the login screen.
      router.replace('/(auth)/login');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setNotice('');
    setResending(true);
    try {
      await resendOtp(email);
      setNotice('New code sent.');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not resend the code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.container}>
          <ThemedText type="title" style={styles.title}>
            Check your email
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            {email ? `We sent a code to ${email}.` : 'Enter the verification code we emailed you.'}
          </ThemedText>

          <FormInput
            placeholder="6-digit code"
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
          />

          {!!error && <ThemedText style={[styles.error, { color: C.danger }]}>{error}</ThemedText>}
          {!!notice && <ThemedText style={[styles.notice, { color: C.success }]}>{notice}</ThemedText>}

          <PrimaryButton title="Verify" loading={loading} onPress={handleVerify} />
          <PrimaryButton
            title="Resend code"
            variant="ghost"
            loading={resending}
            onPress={handleResend}
            style={{ marginTop: 8 }}
          />
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
    marginBottom: 12,
    textAlign: 'center',
  },
  notice: {
    marginBottom: 12,
    textAlign: 'center',
  },
});
