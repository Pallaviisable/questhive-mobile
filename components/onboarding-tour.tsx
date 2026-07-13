import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { completeTour } from '@/lib/api';

type TourStep = {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  color: string;
};

const STEPS: TourStep[] = [
  { id: 'coins', title: 'Earn Coins', subtitle: 'Complete tasks, get rewarded', body: 'Every task you complete earns coins. Coins can be redeemed for real rewards set by your group admin — coffee, days off, anything.', color: '#f5c518' },
  { id: 'xp', title: 'Level Up with XP', subtitle: 'XP never resets', body: 'XP is permanent. Complete tasks to climb from Hive Newcomer all the way to Legendary Hive Master. Each level unlocks a new frame.', color: '#a855f7' },
  { id: 'streak', title: 'Build Streaks', subtitle: 'Consistency pays off', body: 'Complete tasks on consecutive days to build your streak. Longer streaks = bonus coins multiplier. Miss a day and it resets.', color: '#f97316' },
  { id: 'mynest', title: 'MyNest — Your Space', subtitle: 'Private personal tasks', body: 'MyNest is your private task space. Add personal goals, grocery lists, or anything only you can see. No one else in the group sees these.', color: '#22c55e' },
  { id: 'open', title: 'Open Tasks', subtitle: 'First come, first served', body: 'Open tasks have no assigned member. Anyone can claim them — and they pay bonus coins. Move fast.', color: '#3b82f6' },
  { id: 'leaderboard', title: 'Leaderboard', subtitle: 'Weekly glory awaits', body: 'The member with the most coins each week becomes Quest Master and earns a special bonus reward. Compete, win, repeat.', color: '#ef4444' },
];

/* ── Demo panels ── */

function DemoCoins({ active }: { active: boolean }) {
  const [count, setCount] = useState(120);
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => {
      setCount((c) => c + 10);
      Animated.sequence([
        Animated.timing(pop, { toValue: 1.18, duration: 150, useNativeDriver: true }),
        Animated.timing(pop, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }, 1200);
    return () => clearInterval(t);
  }, [active]);

  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      <Animated.View style={{
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(245,197,24,0.12)', borderWidth: 2, borderColor: 'rgba(245,197,24,0.3)',
        alignItems: 'center', justifyContent: 'center',
        transform: [{ scale: pop }],
      }}>
        <ThemedText style={{ fontSize: 28, fontWeight: '900', color: '#f5c518' }}>C</ThemedText>
      </Animated.View>
      <ThemedText style={{ fontSize: 32, fontWeight: '900', color: '#f5c518' }}>{count}</ThemedText>
      <ThemedText style={{ fontSize: 11, fontWeight: '600', opacity: 0.6 }}>COINS EARNED</ThemedText>
      <View style={{ backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 }}>
        <ThemedText style={{ fontSize: 12, color: '#22c55e', fontWeight: '700' }}>+10 task completed</ThemedText>
      </View>
    </View>
  );
}

function DemoXP({ active }: { active: boolean }) {
  const levels = ['Newcomer', 'Apprentice', 'Explorer', 'Veteran', 'Elite', 'Champion', 'Legendary'];
  const [lvl, setLvl] = useState(2);
  const pct = useRef(new Animated.Value(42)).current;
  const pctRef = useRef(42);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => {
      let next = pctRef.current + 8;
      if (next >= 95) {
        setLvl((l) => Math.min(l + 1, levels.length - 1));
        next = 10;
      }
      pctRef.current = next;
      Animated.timing(pct, { toValue: next, duration: 500, useNativeDriver: false }).start();
    }, 600);
    return () => clearInterval(t);
  }, [active]);

  const frameColor = ['#6b7280', '#22c55e', '#3b82f6', '#a855f7', '#f5c518'][Math.min(Math.floor(lvl / 1.5), 4)];
  const widthInterpolate = pct.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={{ alignItems: 'center', gap: 12, width: '100%' }}>
      <View style={{
        width: 64, height: 64, borderRadius: 16,
        backgroundColor: `${frameColor}18`, borderWidth: 2, borderColor: `${frameColor}50`,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <ThemedText style={{ fontSize: 10, fontWeight: '700', color: frameColor }}>LVL</ThemedText>
        <ThemedText style={{ fontSize: 22, fontWeight: '900', color: frameColor }}>{lvl + 1}</ThemedText>
      </View>
      <ThemedText style={{ fontSize: 14, fontWeight: '700' }}>{levels[lvl]}</ThemedText>
      <View style={{ width: '100%', height: 8, borderRadius: 999, backgroundColor: 'rgba(120,120,120,0.2)', overflow: 'hidden' }}>
        <Animated.View style={{ height: '100%', borderRadius: 999, backgroundColor: frameColor, width: widthInterpolate }} />
      </View>
    </View>
  );
}

function DemoStreak({ active }: { active: boolean }) {
  const [streak, setStreak] = useState(3);
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setStreak((s) => (s < 7 ? s + 1 : 1)), 1000);
    return () => clearInterval(t);
  }, [active]);

  return (
    <View style={{ alignItems: 'center', gap: 14 }}>
      <ThemedText style={{ fontSize: 40, fontWeight: '900', color: '#f97316' }}>{streak} 🔥</ThemedText>
      <ThemedText style={{ fontSize: 11, fontWeight: '600', opacity: 0.6 }}>DAY STREAK</ThemedText>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {days.map((d, i) => (
          <View key={i} style={{
            width: 32, height: 32, borderRadius: 8,
            backgroundColor: i < streak ? 'rgba(249,115,22,0.2)' : 'rgba(120,120,120,0.1)',
            borderWidth: 1, borderColor: i < streak ? 'rgba(249,115,22,0.4)' : 'rgba(120,120,120,0.2)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <ThemedText style={{ fontSize: 11, fontWeight: '700', color: i < streak ? '#f97316' : undefined, opacity: i < streak ? 1 : 0.5 }}>{d}</ThemedText>
          </View>
        ))}
      </View>
      <ThemedText style={{ fontSize: 12, fontWeight: '600', color: '#f97316' }}>
        {streak >= 5 ? `${streak}x multiplier active!` : `${5 - streak} more days for 5x bonus`}
      </ThemedText>
    </View>
  );
}

function DemoMyNest() {
  const tasks = [
    { title: 'Buy groceries', done: true },
    { title: 'Call dentist', done: false },
    { title: 'Read for 30 min', done: true },
  ];
  return (
    <View style={{ gap: 8, width: '100%' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' }} />
        <ThemedText style={{ fontSize: 12, fontWeight: '700', color: '#22c55e' }}>MyNest — Private</ThemedText>
      </View>
      {tasks.map((t, i) => (
        <View key={i} style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10,
          backgroundColor: 'rgba(120,120,120,0.08)', borderWidth: 1, borderColor: 'rgba(120,120,120,0.15)',
        }}>
          <View style={{
            width: 16, height: 16, borderRadius: 5,
            backgroundColor: t.done ? 'rgba(34,197,94,0.2)' : 'transparent',
            borderWidth: 1.5, borderColor: t.done ? '#22c55e' : 'rgba(120,120,120,0.4)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {t.done && <ThemedText style={{ fontSize: 10, color: '#22c55e' }}>✓</ThemedText>}
          </View>
          <ThemedText style={{ fontSize: 13, textDecorationLine: t.done ? 'line-through' : 'none', opacity: t.done ? 0.5 : 1 }}>{t.title}</ThemedText>
          <ThemedText style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.5 }}>private</ThemedText>
        </View>
      ))}
    </View>
  );
}

function DemoOpen({ active }: { active: boolean }) {
  const [claimed, setClaimed] = useState(false);
  useEffect(() => { if (!active) setClaimed(false); }, [active]);

  return (
    <View style={{ width: '100%', padding: 16, borderRadius: 12, backgroundColor: 'rgba(120,120,120,0.08)', borderWidth: 1, borderColor: 'rgba(120,120,120,0.15)' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        <ThemedText style={{ fontSize: 13, fontWeight: '700' }}>Fix homepage bug</ThemedText>
        <ThemedText style={{ fontSize: 12, fontWeight: '800', color: '#f5c518' }}>+30 coins</ThemedText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#3b82f6' }} />
        <ThemedText style={{ fontSize: 11, color: '#3b82f6', fontWeight: '600' }}>OPEN — unclaimed</ThemedText>
      </View>
      <TouchableOpacity
        onPress={() => setClaimed(true)}
        disabled={claimed}
        style={{
          paddingVertical: 8, borderRadius: 8, alignItems: 'center',
          backgroundColor: claimed ? 'rgba(34,197,94,0.15)' : 'rgba(245,197,24,0.1)',
          borderWidth: 1, borderColor: claimed ? 'rgba(34,197,94,0.3)' : 'rgba(245,197,24,0.3)',
        }}>
        <ThemedText style={{ fontSize: 13, fontWeight: '700', color: claimed ? '#22c55e' : '#f5c518' }}>
          {claimed ? '✓ Claimed by you!' : 'Claim this task →'}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
}

function DemoLeaderboard() {
  const board = [
    { name: 'Priya S.', coins: 340, rank: 1, isYou: false },
    { name: 'You', coins: 280, rank: 2, isYou: true },
    { name: 'Aryan K.', coins: 210, rank: 3, isYou: false },
  ];
  return (
    <View style={{ gap: 8, width: '100%' }}>
      {board.map((u, i) => (
        <View key={i} style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10,
          backgroundColor: u.isYou ? 'rgba(245,197,24,0.08)' : 'rgba(120,120,120,0.08)',
          borderWidth: 1, borderColor: u.isYou ? 'rgba(245,197,24,0.25)' : 'rgba(120,120,120,0.15)',
        }}>
          <View style={{
            width: 24, height: 24, borderRadius: 6,
            backgroundColor: i === 0 ? '#f5c518' : i === 1 ? '#6b7280' : '#cd7c2f',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <ThemedText style={{ fontSize: 11, fontWeight: '900', color: '#000' }}>{u.rank}</ThemedText>
          </View>
          <ThemedText style={{ flex: 1, fontSize: 13, fontWeight: u.isYou ? '700' : '500' }}>{u.name}</ThemedText>
          <ThemedText style={{ fontSize: 13, fontWeight: '700', opacity: 0.8 }}>{u.coins}</ThemedText>
        </View>
      ))}
    </View>
  );
}

const DEMOS: Record<string, React.ComponentType<{ active: boolean }>> = {
  coins: DemoCoins,
  xp: DemoXP,
  streak: DemoStreak,
  mynest: DemoMyNest,
  open: DemoOpen,
  leaderboard: DemoLeaderboard,
};

export default function OnboardingTour({ onComplete }: { onComplete: () => void }) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const celebrateScale = useRef(new Animated.Value(1)).current;
  const confettiAnims = useRef(
    Array.from({ length: 18 }, () => ({
      translateY: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
    }))
  ).current;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const Demo = DEMOS[current.id];

  const go = (next: number) => {
    const dir = next > step ? 1 : -1;
    slideAnim.setValue(dir * 40);
    contentOpacity.setValue(0);
    setStep(next);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const runConfetti = () => {
    confettiAnims.forEach((a, i) => {
      a.translateY.setValue(0);
      a.rotate.setValue(0);
      a.opacity.setValue(1);
      Animated.parallel([
        Animated.timing(a.translateY, { toValue: 200, duration: 800 + i * 100, delay: i * 40, useNativeDriver: true }),
        Animated.timing(a.rotate, { toValue: 720, duration: 800 + i * 100, delay: i * 40, useNativeDriver: true }),
        Animated.timing(a.opacity, { toValue: 0, duration: 800 + i * 100, delay: i * 40, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleFinish = async () => {
    setCelebrate(true);
    runConfetti();
    Animated.sequence([
      Animated.timing(celebrateScale, { toValue: 1.08, duration: 200, useNativeDriver: true }),
      Animated.timing(celebrateScale, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    setTimeout(async () => {
      setCompleting(true);
      try {
        await completeTour();
      } catch {
        // non-fatal — local skip still works fine
      }
      onComplete();
    }, 1200);
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>

        {celebrate && confettiAnims.map((a, i) => {
          const confettiColors = ['#f5c518', '#22c55e', '#3b82f6', '#a855f7', '#ef4444'];
          const rotateInterpolate = a.rotate.interpolate({ inputRange: [0, 720], outputRange: ['0deg', '720deg'] });
          return (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: '30%',
                left: `${10 + i * 5}%`,
                width: 8,
                height: 8,
                borderRadius: i % 2 === 0 ? 4 : 2,
                backgroundColor: confettiColors[i % 5],
                opacity: a.opacity,
                transform: [{ translateY: a.translateY }, { rotate: rotateInterpolate }],
              }}
            />
          );
        })}

        <Animated.View
          style={[
            styles.card,
            { backgroundColor: colors.backgroundElevated, borderColor: colors.border },
            { transform: [{ scale: celebrate ? celebrateScale : 1 }] },
          ]}>

          <View style={[styles.progressTrack, { backgroundColor: colors.backgroundElevated2 }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: current.color, width: `${((step + 1) / STEPS.length) * 100}%` },
              ]}
            />
          </View>

          <View style={styles.dotsRow}>
            {STEPS.map((s, i) => (
              <TouchableOpacity key={s.id} onPress={() => go(i)} activeOpacity={0.7}>
                <View
                  style={[
                    styles.dot,
                    {
                      width: i === step ? 22 : 7,
                      backgroundColor:
                        i === step ? s.color : i < step ? `${s.color}99` : colors.backgroundElevated2,
                    },
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>

          <Animated.View style={[styles.content, { opacity: contentOpacity, transform: [{ translateX: slideAnim }] }]}>
            <View style={[styles.stepLabel, { backgroundColor: `${current.color}20`, borderColor: `${current.color}50` }]}>
              <View style={[styles.stepDotSmall, { backgroundColor: current.color }]} />
              <ThemedText style={[styles.stepLabelText, { color: current.color }]}>
                {step + 1} of {STEPS.length} — {current.subtitle}
              </ThemedText>
            </View>

            <ThemedText style={styles.title}>{current.title}</ThemedText>
            <ThemedText style={[styles.body, { color: colors.textMuted }]}>{current.body}</ThemedText>

            <View style={[styles.demoBox, { backgroundColor: colors.backgroundElevated2, borderColor: colors.border }]}>
              <Demo active={true} />
            </View>

            <View style={styles.buttonRow}>
              {step > 0 && (
                <TouchableOpacity onPress={() => go(step - 1)} style={[styles.backBtn, { borderColor: colors.border }]}>
                  <ThemedText style={[styles.backBtnText, { color: colors.textMuted }]}>Back</ThemedText>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={isLast ? handleFinish : () => go(step + 1)}
                disabled={completing}
                style={[styles.nextBtn, { backgroundColor: celebrate ? '#22c55e' : current.color }]}>
                <ThemedText style={styles.nextBtnText}>
                  {celebrate ? 'Welcome to QuestHive!' : isLast ? 'Enter the Hive' : 'Next →'}
                </ThemedText>
              </TouchableOpacity>
            </View>

            {!isLast && (
              <TouchableOpacity onPress={handleFinish} style={styles.skipBtn}>
                <ThemedText style={[styles.skipBtnText, { color: colors.textMuted }]}>Skip tour</ThemedText>
              </TouchableOpacity>
            )}
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressTrack: {
    height: 3,
    width: '100%',
  },
  progressFill: {
    height: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: Spacing.md,
  },
  dot: {
    height: 7,
    borderRadius: 999,
  },
  content: {
    padding: Spacing.lg,
  },
  stepLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  stepDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stepLabelText: {
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  demoBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    marginBottom: 28,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  backBtn: {
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  nextBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0A0A0A',
  },
  skipBtn: {
    width: '100%',
    marginTop: 12,
    alignItems: 'center',
    padding: 4,
  },
  skipBtnText: {
    fontSize: 12,
  },
});
