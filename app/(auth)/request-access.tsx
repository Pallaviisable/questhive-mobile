import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { FormInput } from '@/components/form-input';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { requestAdminAccess } from '@/lib/api';

export default function RequestAccessScreen() {
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
        <ThemedText type="title" style={styles.title}>Request sent</ThemedText>
        <ThemedText style={styles.subtitle}>
          A Super Admin will review your request. You'll get an email with a registration link if approved.
        </ThemedText>
        <PrimaryButton title="Back to Login" onPress={() => router.replace('/(auth)/login')} />
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.container}>
          <ThemedText type="title" style={styles.title}>Request Access</ThemedText>
          <ThemedText style={styles.subtitle}>QuestHive is invite-only. Tell us why you'd like to join.</ThemedText>

          <FormInput placeholder="Full name" value={name} onChangeText={setName} />
          <FormInput placeholder="Email" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <FormInput placeholder="Why do you want to join?" value={reason} onChangeText={setReason} multiline />

          {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}

          <PrimaryButton title="Submit Request" loading={loading} onPress={handleSubmit} />

          <Link href="/(auth)/login" style={styles.linkWrap}>
            <ThemedText type="link" style={styles.linkText}>Already have an account? Log in</ThemedText>
          </Link>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 4 },
  title: { textAlign: 'center', marginBottom: 6 },
  subtitle: { textAlign: 'center', marginBottom: 28, opacity: 0.7 },
  error: { color: '#DC2626', marginBottom: 12, textAlign: 'center' },
  linkWrap: { marginTop: 20, alignItems: 'center' },
  linkText: { textAlign: 'center' },
});
