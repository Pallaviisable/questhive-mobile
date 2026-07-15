import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';

import { FormInput } from '@/components/form-input';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemeToggle } from '@/components/theme-toggle';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { requestAdminAccess } from '@/lib/api';

export default function RequestAccessScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !reason.trim()) {
      setError('Fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await requestAdminAccess({ fullName: name.trim(), email: email.trim().toLowerCase(), reason: reason.trim() });
      setSubmitted(true);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not submit request. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <ThemedView style={styles.container}>
        {/* ThemeToggle temporarily disabled */}
        <Animated.View entering={ZoomIn.duration(400).springify()} style={styles.successIconWrap}>
          <Ionicons name="checkmark-circle" size={72} color={colors.success} />
        </Animated.View>
        <Animated.View entering={FadeInUp.duration(400).delay(150)}>
          <ThemedText type="title" style={styles.title}>Request sent</ThemedText>
          <ThemedText style={styles.subtitle}>
            A Super Admin will review your request. You&apos;ll get an email with a registration link if approved.
          </ThemedText>
          <PrimaryButton title="Back to Login" onPress={() => router.replace('/(auth)/login')} />
        </Animated.View>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.container}>
          {/* ThemeToggle temporarily disabled */}

          <Animated.View entering={FadeInDown.duration(450).springify()} style={styles.brandRow}>
            <View style={[styles.logoBox, { backgroundColor: colors.tint }]}>
              <Ionicons name="layers" size={20} color="#151718" />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.brandName}>QuestHive</ThemedText>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(450).delay(80).springify()}>
            <ThemedText type="title" style={styles.title}>Request access</ThemedText>
            <ThemedText style={styles.subtitle}>
              Already have an account?{' '}
              <Link href="/(auth)/login">
                <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>Log in</ThemedText>
              </Link>
            </ThemedText>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(450).delay(160).springify()}>
            <FormInput label="Full name" placeholder="Your name" value={name} onChangeText={setName} />
            <FormInput
              label="Email address"
              placeholder="you@example.com"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <FormInput
              label="Why do you want to join?"
              placeholder="Tell us a bit about yourself"
              value={reason}
              onChangeText={setReason}
              multiline
            />

            {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}

            <PrimaryButton title="Submit request" loading={loading} onPress={handleSubmit} style={styles.submitBtn} />
          </Animated.View>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 },
  toggle: { position: 'absolute', top: 16, right: 20 },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28, gap: 10 },
  logoBox: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 18 },
  title: { marginBottom: 6, fontSize: 28 },
  subtitle: { marginBottom: 26, opacity: 0.85 },
  successIconWrap: { alignItems: 'center', marginBottom: 20 },
  error: { color: '#DC2626', marginBottom: 12, textAlign: 'center' },
  submitBtn: { marginTop: 6 },
});
