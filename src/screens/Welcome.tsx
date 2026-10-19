import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, fonts } from '../theme';
import { PillButton } from '../components';
import { useApp } from '../state';
import { getOffering } from '../purchases';
import { getTrialEligibleIds, trialLabel } from '../trial';
import { requestReminderPermission } from '../reminder';

/**
 * First launch, before the paywall:
 *   1-3. Three value screens (outcomes, not UI instructions)
 *   a.   "Try Attendance Tracker Pro free"            } only when RevenueCat says this
 *   b.   "We'll remind you before your trial ends"   } Apple ID can get the free trial
 * Then App.tsx opens the paywall. In Free mode (Lifetime launch offer at 0)
 * a and b are skipped and the paywall behaves as it always has.
 */
const VALUE: { icon: string; title: string; body: string }[] = [
  {
    icon: '✅',
    title: 'Take attendance in seconds.',
    body: 'Everyone starts present; tap only who’s out.',
  },
  {
    icon: '📄',
    title: 'Totals for every person, ready to hand in.',
    body: 'Export the register as a PDF or CSV for your school office, league, or club.',
  },
  {
    icon: '🔒',
    title: 'Works offline. No account.',
    body: 'Nothing leaves your phone.',
  },
];

interface TrialOffer {
  /** "3 days free" */
  label: string;
  /** "$4.99/week" */
  then: string;
}

/** The trial to offer, or null when not eligible, in Free mode, or the store can't answer. */
async function loadTrialOffer(): Promise<TrialOffer | null> {
  const off = await getOffering();
  if (!off) return null;
  if (off.lifetime && off.lifetime.product.price === 0) return null;
  const pkg = off.weekly ?? off.annual;
  if (!pkg) return null;
  const label = trialLabel(pkg, await getTrialEligibleIds([pkg]));
  if (!label) return null;
  return { label, then: `${pkg.product.priceString}/${pkg === off.weekly ? 'week' : 'year'}` };
}

type Step = 0 | 1 | 2 | 'trial' | 'remind';

export default function Welcome({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isPro } = useApp();
  const [step, setStep] = useState<Step>(0);
  const [offer, setOffer] = useState<TrialOffer | null>(null);
  const [waiting, setWaiting] = useState(false);
  const offerPromise = useRef<Promise<TrialOffer | null> | null>(null);

  // Start the eligibility check now; it is ready long before the third screen.
  useEffect(() => {
    offerPromise.current = loadTrialOffer().catch(() => null);
  }, []);

  const next = async () => {
    if (step === 0 || step === 1) {
      setStep((step + 1) as Step);
      return;
    }
    if (step === 2) {
      setWaiting(true);
      const o = isPro ? null : await (offerPromise.current ?? Promise.resolve(null));
      setWaiting(false);
      if (o) {
        setOffer(o);
        setStep('trial');
      } else {
        onDone();
      }
      return;
    }
    if (step === 'trial') {
      setStep('remind');
      return;
    }
    // Reminder screen: ask for notifications, then on to the paywall whatever the answer.
    setWaiting(true);
    await requestReminderPermission();
    setWaiting(false);
    onDone();
  };

  let icon: string;
  let title: string;
  let body: string;
  if (step === 'trial') {
    icon = '🎁';
    title = 'Try Attendance Tracker Pro free';
    body = `${offer?.label ?? ''}, then ${offer?.then ?? ''}. Unlimited groups and sessions, the PDF and CSV report, and Face ID lock. Cancel anytime.`;
  } else if (step === 'remind') {
    icon = '🔔';
    title = 'We’ll remind you before your trial ends';
    body = 'We’ll remind you 1 day before your trial ends.';
  } else {
    ({ icon, title, body } = VALUE[step]);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg, paddingBottom: Math.max(insets.bottom, 20) }]}>
      <View style={styles.wrap}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>{body}</Text>
      </View>
      {typeof step === 'number' && (
        <View style={styles.dots}>
          {VALUE.map((_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === step ? theme.accent : theme.border }]} />
          ))}
        </View>
      )}
      <View style={styles.footer}>
        {waiting ? (
          <ActivityIndicator color={theme.accent} style={{ height: 50 }} />
        ) : (
          <PillButton theme={theme} label="Continue" onPress={next} />
        )}
        {step === 'trial' && (
          <Text style={[styles.noPayment, { color: theme.success }]}>✓ No payment now</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  wrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  icon: { fontSize: 52, marginBottom: 16 },
  title: { fontSize: 30, fontWeight: fonts.weight.bold, letterSpacing: -0.5 },
  body: { fontSize: 17, lineHeight: 24, marginTop: 10 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  footer: { paddingHorizontal: 24, gap: 12 },
  noPayment: { fontSize: 13, textAlign: 'center', fontWeight: fonts.weight.semibold },
});
