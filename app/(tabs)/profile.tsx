import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Share, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PasswordInput } from '@/components/password-input';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/contexts/auth-context';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { updateProfile, deleteAccount, requestEmailChange, confirmEmailChange, getMyCoins, getMyXP } from '@/lib/api';
import { FeedbackButton } from '@/components/feedback-button';
import { useDialog } from '@/contexts/dialog-context';

const FRAME_CONFIG: Record<string, { color: string; label: string }> = {
  LEGENDARY: { color: '#f5c518', label: 'Legendary' },
  CHAMPION: { color: '#a855f7', label: 'Champion' },
  ELITE: { color: '#3b82f6', label: 'Elite' },
  VETERAN: { color: '#22c55e', label: 'Veteran' },
  DEDICATED: { color: '#f97316', label: 'Dedicated' },
  NONE: { color: '#6b7280', label: 'Rising' },
};

const TABS = [
  { key: 'PROFILE', label: 'Profile', icon: 'person-outline' },
  { key: 'PASSWORD', label: 'Password', icon: 'lock-closed-outline' },
  { key: 'HELP', label: 'Help', icon: 'help-circle-outline' },
  { key: 'DANGER', label: 'Delete Account', icon: 'trash-outline' },
] as const;
type TabKey = typeof TABS[number]['key'];

const FAQ = [
  { q: 'How do I earn coins?', a: 'Complete group tasks assigned to you. Higher priority tasks give more coins. You also get streak bonuses for completing tasks on consecutive days.' },
  { q: 'What is an Open Task?', a: 'An Open Task has no assigned member — anyone in the group can claim it. First come, first served — and it pays bonus coins.' },
  { q: 'How do I redeem coins?', a: 'Go to Rewards → Redeem tab. Your group admin can create redeem options with a minimum of 50 coins.' },
  { q: 'What is MyNest?', a: "MyNest is your private task space — tasks only you can see. These don't earn coins since they're not group tasks." },
  { q: 'What is Quest Master?', a: 'Every Monday, the member who earned the most coins that week is crowned Quest Master and earns a bonus reward.' },
  { q: 'How do I change my email?', a: 'Profile tab → Change Email section. Enter new email, receive OTP, confirm. Done.' },
];

function Label({ children, color }: { children: React.ReactNode; color: string }) {
  return <ThemedText style={{ fontSize: 11, fontWeight: '700', color, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>{children}</ThemedText>;
}

export default function ProfileScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const C = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { user, logout, refreshUser } = useAuth();
  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [])
  );
  const dialog = useDialog();
  const [activeTab, setActiveTab] = useState<TabKey>('PROFILE');
  const [coins, setCoins] = useState(user?.coins || 0);
  const [xp, setXp] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [newUsername, setNewUsername] = useState(user?.username || '');

  const [emailStep, setEmailStep] = useState<'IDLE' | 'OTP_SENT'>('IDLE');
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    getMyCoins().then((r) => setCoins(r.data.coins)).catch(() => {});
    getMyXP().then((r) => setXp(r.data)).catch(() => {});
  }, []);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleProfileUpdate = async () => {
    setLoading(true);
    try {
      const payload: any = { fullName };
      if (!user?.usernameChanged && newUsername !== user?.username) payload.newUsername = newUsername;
      await updateProfile(payload);
      showMsg('Profile updated successfully!');
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Update failed.', 'error');
    } finally { setLoading(false); }
  };

  const handleRequestEmailChange = async () => {
    if (!newEmail || !newEmail.includes('@')) { showMsg('Please enter a valid email address.', 'error'); return; }
    setLoading(true);
    try {
      await requestEmailChange({ newEmail });
      setEmailStep('OTP_SENT');
      showMsg('OTP sent to ' + newEmail);
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Failed to send OTP.', 'error');
    } finally { setLoading(false); }
  };

  const handleConfirmEmailChange = async () => {
    if (!emailOtp || emailOtp.length !== 6) { showMsg('Please enter the 6-digit OTP.', 'error'); return; }
    setLoading(true);
    try {
      await confirmEmailChange({ otp: emailOtp });
      setEmailStep('IDLE'); setNewEmail(''); setEmailOtp('');
      showMsg('Email updated successfully!');
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Verification failed.', 'error');
    } finally { setLoading(false); }
  };

  const handlePasswordUpdate = async () => {
    if (newPassword !== confirmPassword) { showMsg('Passwords do not match.', 'error'); return; }
    if (newPassword.length < 6) { showMsg('Password must be at least 6 characters.', 'error'); return; }
    setLoading(true);
    try {
      await updateProfile({ currentPassword, newPassword });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      showMsg('Password changed successfully!');
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Password change failed.', 'error');
    } finally { setLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) { showMsg('Please enter your password to confirm.', 'error'); return; }
    setLoading(true);
    try {
      await deleteAccount({ userId: user?.id, password: deletePassword });
      await logout();
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Delete failed.', 'error');
      setLoading(false);
    }
  };

  const frame = xp?.frame && xp.frame !== 'NONE' ? FRAME_CONFIG[xp.frame] : null;
  const frameColor = frame?.color || C.tint;

  const styles = makeStyles(C);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingTop: insets.top + Spacing.sm, paddingBottom: 60 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <ThemedText type="title" style={{ marginBottom: 4 }}>Settings</ThemedText>
            <ThemedText style={{ color: C.textMuted, fontSize: 13 }}>Manage your account preferences</ThemedText>
          </View>
          <ThemeToggle />
        </View>

        {/* Profile summary card */}
        <View style={{
          backgroundColor: C.card, borderWidth: 1, borderColor: frame ? `${frame.color}40` : C.border,
          borderRadius: Radius.lg, padding: 20, marginBottom: 20, alignItems: 'center',
        }}>
          <View style={{
            width: 64, height: 64, borderRadius: 32, backgroundColor: user?.avatarColor || C.tint,
            alignItems: 'center', justifyContent: 'center', marginBottom: 10,
            borderWidth: frame ? 2 : 0, borderColor: frame?.color,
          }}>
            <ThemedText style={{ fontSize: 26, fontWeight: '900', color: '#000' }}>{user?.fullName?.[0]?.toUpperCase() || '?'}</ThemedText>
          </View>
          <ThemedText style={{ fontWeight: '800', fontSize: 16 }}>{user?.fullName}</ThemedText>
          <ThemedText style={{ color: C.textMuted, fontSize: 12, marginBottom: 8 }}>@{user?.username}</ThemedText>
          {frame && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: `${frame.color}18`, borderWidth: 1, borderColor: `${frame.color}40`, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12 }}>
              <Ionicons name="star" size={11} color={frame.color} />
              <ThemedText style={{ fontSize: 10, fontWeight: '700', color: frame.color }}>{frame.label.toUpperCase()} FRAME</ThemedText>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
            <View style={{ flex: 1, backgroundColor: C.backgroundElevated, borderRadius: Radius.md, padding: 12, alignItems: 'center' }}>
              <Ionicons name="disc-outline" size={14} color={C.tint} style={{ marginBottom: 2 }} />
              <ThemedText style={{ fontSize: 20, fontWeight: '900', color: C.tint }}>{coins}</ThemedText>
              <ThemedText style={{ fontSize: 10, color: C.textMuted, fontWeight: '600' }}>COINS</ThemedText>
            </View>
            <View style={{ flex: 1, backgroundColor: C.backgroundElevated, borderRadius: Radius.md, padding: 12, alignItems: 'center' }}>
              <Ionicons name="trophy-outline" size={14} color={frameColor} style={{ marginBottom: 2 }} />
              <ThemedText style={{ fontSize: 20, fontWeight: '900', color: frameColor }}>{xp?.level || 1}</ThemedText>
              <ThemedText style={{ fontSize: 10, color: C.textMuted, fontWeight: '600' }}>LEVEL</ThemedText>
            </View>
          </View>
          {xp && (
            <View style={{ width: '100%', marginTop: 12 }}>
              <View style={{ backgroundColor: C.backgroundElevated, borderRadius: Radius.full, height: 6 }}>
                <View style={{ height: '100%', borderRadius: Radius.full, backgroundColor: frameColor, width: `${xp.progressPercent}%` }} />
              </View>
              <ThemedText style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>
                {xp.xpForNextLevel - xp.xpIntoCurrentLevel} XP to next level
              </ThemedText>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {TABS.map((t) => {
            const active = activeTab === t.key;
            const isDanger = t.key === 'DANGER';
            return (
              <TouchableOpacity key={t.key} onPress={() => setActiveTab(t.key)} style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.md,
                backgroundColor: active ? (isDanger ? 'rgba(239,68,68,0.1)' : C.backgroundElevated) : 'transparent',
                borderWidth: 1, borderColor: active ? (isDanger ? 'rgba(239,68,68,0.3)' : C.border) : 'transparent',
              }}>
                <Ionicons name={t.icon} size={13} color={active ? (isDanger ? C.danger : C.text) : C.textMuted} />
                <ThemedText style={{ fontSize: 12, fontWeight: '600', color: active ? (isDanger ? C.danger : C.text) : C.textMuted }}>
                  {t.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        {msg && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: msg.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
            borderWidth: 1, borderColor: msg.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)',
            borderRadius: Radius.md, padding: 12, marginBottom: 16,
          }}>
            <Ionicons name={msg.type === 'error' ? 'alert-circle' : 'checkmark-circle'} size={14} color={msg.type === 'error' ? C.danger : C.success} />
            <ThemedText style={{ color: msg.type === 'error' ? C.danger : C.success, fontSize: 13 }}>{msg.text}</ThemedText>
          </View>
        )}

        {activeTab === 'PROFILE' && (
          <View style={{ gap: 16 }}>
            <View style={styles.card}>
              <Label color={C.textMuted}>Full Name</Label>
              <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Your full name" placeholderTextColor={C.textMuted} />
              <View style={{ height: 12 }} />
              <Label color={C.textMuted}>Username {user?.usernameChanged ? '(already changed)' : '(can only change once)'}</Label>
              <TextInput
                style={[styles.input, user?.usernameChanged ? { opacity: 0.5 } : null]}
                value={newUsername} onChangeText={setNewUsername}
                editable={!user?.usernameChanged} placeholderTextColor={C.textMuted}
              />
              <TouchableOpacity onPress={handleProfileUpdate} disabled={loading} style={[styles.primaryBtn, { marginTop: 16, alignSelf: 'flex-start' }]}>
                {loading ? <ActivityIndicator color="#0A0A0A" /> : <ThemedText style={styles.primaryBtnText}>Save Profile</ThemedText>}
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <ThemedText style={{ fontWeight: '700', fontSize: 14, marginBottom: 4 }}>Your Invite Code</ThemedText>
              <ThemedText style={{ color: C.textMuted, fontSize: 12, marginBottom: 14 }}>
                Share this so someone can join as a Family Admin.
              </ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1, backgroundColor: C.backgroundElevated2, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 }}>
                  <ThemedText style={{ fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>{user?.inviteCode || '—'}</ThemedText>
                </View>
                <TouchableOpacity
                  disabled={!user?.inviteCode}
                  onPress={() => Share.share({ message: `Join me on QuestHive! Use my invite code ${user?.inviteCode} to sign up as a Family Admin.` })}
                  style={styles.secondaryBtn}
                >
                  <Ionicons name="share-outline" size={16} color={C.tint} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.card}>
              <ThemedText style={{ fontWeight: '700', fontSize: 14, marginBottom: 4 }}>Change Email</ThemedText>
              <ThemedText style={{ color: C.textMuted, fontSize: 12, marginBottom: 14 }}>Current: {user?.email}</ThemedText>
              {emailStep === 'IDLE' ? (
                <View>
                  <Label color={C.textMuted}>New Email Address</Label>
                  <TextInput style={styles.input} value={newEmail} onChangeText={setNewEmail} placeholder="new@email.com" placeholderTextColor={C.textMuted} keyboardType="email-address" autoCapitalize="none" />
                  <TouchableOpacity onPress={handleRequestEmailChange} disabled={loading} style={[styles.secondaryBtn, { marginTop: 12, alignSelf: 'flex-start' }]}>
                    <ThemedText style={styles.secondaryBtnText}>{loading ? 'Sending...' : 'Send OTP'}</ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  <View style={{ backgroundColor: 'rgba(245,197,24,0.08)', borderWidth: 1, borderColor: 'rgba(245,197,24,0.25)', borderRadius: Radius.sm, padding: 10 }}>
                    <ThemedText style={{ fontSize: 13, color: C.tint }}>OTP sent to {newEmail}</ThemedText>
                  </View>
                  <View>
                    <Label color={C.textMuted}>6-digit OTP</Label>
                    <TextInput style={styles.input} value={emailOtp} onChangeText={(v) => setEmailOtp(v.replace(/\D/g, ''))} placeholder="000000" placeholderTextColor={C.textMuted} keyboardType="number-pad" maxLength={6} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                    <TouchableOpacity onPress={handleConfirmEmailChange} disabled={loading} style={styles.primaryBtn}>
                      <ThemedText style={styles.primaryBtnText}>{loading ? 'Verifying...' : 'Confirm Email'}</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleRequestEmailChange} disabled={loading} style={styles.secondaryBtn}>
                      <ThemedText style={styles.secondaryBtnText}>Resend OTP</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setEmailStep('IDLE'); setEmailOtp(''); setNewEmail(''); }} style={styles.secondaryBtn}>
                      <ThemedText style={styles.secondaryBtnText}>Cancel</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {activeTab === 'PASSWORD' && (
          <View style={styles.card}>
            <ThemedText style={{ fontWeight: '700', fontSize: 14, marginBottom: 16 }}>Change Password</ThemedText>
            <PasswordInput label="Current Password" value={currentPassword} onChangeText={setCurrentPassword} placeholder="••••••••" />
            <PasswordInput label="New Password" value={newPassword} onChangeText={setNewPassword} placeholder="••••••••" />
            <PasswordInput label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="••••••••" />
            <View style={{ backgroundColor: C.backgroundElevated, borderWidth: 1, borderColor: C.border, borderRadius: Radius.md, padding: 12, marginBottom: 16 }}>
              <ThemedText style={{ fontSize: 12, color: C.textMuted, lineHeight: 18 }}>
                Use at least 6 characters. Mix letters, numbers, and symbols for a stronger password.
              </ThemedText>
            </View>
            <TouchableOpacity onPress={handlePasswordUpdate} disabled={loading} style={[styles.primaryBtn, { alignSelf: 'flex-start' }]}>
              {loading ? <ActivityIndicator color="#0A0A0A" /> : <ThemedText style={styles.primaryBtnText}>Update Password</ThemedText>}
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'HELP' && (
          <View style={{ gap: 10 }}>
            {FAQ.map((item, i) => (
              <View key={i} style={styles.card}>
                <ThemedText style={{ fontWeight: '700', fontSize: 13, marginBottom: 6 }}>{item.q}</ThemedText>
                <ThemedText style={{ color: C.textMuted, fontSize: 13, lineHeight: 19 }}>{item.a}</ThemedText>
              </View>
            ))}
            <View style={[styles.card, { borderColor: 'rgba(245,197,24,0.2)' }]}>
              <ThemedText style={{ fontWeight: '700', fontSize: 13, marginBottom: 6 }}>Contact Support</ThemedText>
              <ThemedText style={{ color: C.textMuted, fontSize: 13, lineHeight: 19 }}>
                Having an issue? Reach out at <ThemedText style={{ color: C.tint }}>pallavisable505@gmail.com</ThemedText>. We typically respond within 24 hours.
              </ThemedText>
            </View>
            <FeedbackButton />
          </View>
        )}

        {activeTab === 'DANGER' && (
          <View style={[styles.card, { borderColor: 'rgba(239,68,68,0.25)' }]}>
            <ThemedText style={{ fontWeight: '700', fontSize: 14, color: C.danger, marginBottom: 8 }}>Delete Account</ThemedText>
            <ThemedText style={{ color: C.textMuted, fontSize: 13, marginBottom: 18, lineHeight: 19 }}>
              This will permanently delete your account, tasks, coins, and rewards. This action cannot be undone.
            </ThemedText>
            {!showDeleteConfirm ? (
              <TouchableOpacity onPress={() => setShowDeleteConfirm(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 18, alignSelf: 'flex-start' }}>
                <Ionicons name="trash-outline" size={14} color={C.danger} />
                <ThemedText style={{ color: C.danger, fontWeight: '600', fontSize: 13 }}>I want to delete my account</ThemedText>
              </TouchableOpacity>
            ) : (
              <View style={{ gap: 12 }}>
                <ThemedText style={{ fontSize: 13, color: C.danger, fontWeight: '600' }}>Enter your password to confirm:</ThemedText>
                <PasswordInput value={deletePassword} onChangeText={setDeletePassword} placeholder="Your password" />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity onPress={handleDeleteAccount} disabled={loading} style={{ backgroundColor: C.danger, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 18 }}>
                    <ThemedText style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{loading ? 'Deleting...' : 'Delete My Account'}</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setShowDeleteConfirm(false); setDeletePassword(''); }} style={styles.secondaryBtn}>
                    <ThemedText style={styles.secondaryBtnText}>Cancel</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity
          onPress={() => dialog.alert('Log Out', 'Are you sure you want to log out?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Log Out', style: 'destructive', onPress: logout }])}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24, paddingVertical: 12 }}>
          <Ionicons name="log-out-outline" size={16} color={C.danger} />
          <ThemedText style={{ color: C.danger, fontWeight: '700', fontSize: 14 }}>Log Out</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (C: typeof Colors.dark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: Radius.lg, padding: 18 },
  input: { backgroundColor: C.backgroundElevated, borderWidth: 1, borderColor: C.border, borderRadius: Radius.md, color: C.text, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  primaryBtn: { backgroundColor: C.tint, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' },
  primaryBtnText: { color: '#0A0A0A', fontWeight: '700', fontSize: 13 },
  secondaryBtn: { backgroundColor: C.backgroundElevated, borderWidth: 1, borderColor: C.border, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 18, justifyContent: 'center' },
  secondaryBtnText: { color: C.textMuted, fontWeight: '600', fontSize: 13 },
});
