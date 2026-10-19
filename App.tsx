import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, fonts } from './src/theme';
import { AppProvider, useApp } from './src/state';
import LockGate, { useLocked } from './src/LockGate';
import GroupsScreen from './src/screens/Groups';
import GroupDetail from './src/screens/GroupDetail';
import ReportScreen from './src/screens/Report';
import SettingsScreen from './src/screens/Settings';
import PaywallModal from './src/screens/Paywall';
import Onboarding from './src/screens/Onboarding';
import Welcome from './src/screens/Welcome';
import { countGroups, countSessions } from './src/db';
import { maybeRequestReviewOnLaunch } from './src/reviews';

const ONBOARDED_KEY = 'attend.onboarded.v1';

export const PRIVACY_URL = 'https://bkdigitalleads-cmyk.github.io/attend/privacy.html';

type Tab = 'groups' | 'report' | 'settings';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'groups', label: 'Groups', icon: '👥' },
  { key: 'report', label: 'Report', icon: '📄' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
];

function Shell() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready, isPro, showPaywall, paywallVisible } = useApp();
  const [tab, setTab] = useState<Tab>('groups');
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [openGroupId, setOpenGroupId] = useState<number | null>(null);
  // Onboarding order: value screens (+ trial and reminder screens), paywall, attribution question.
  const [step, setStep] = useState<'welcome' | 'paywall' | 'question'>('welcome');
  const paywallOpened = useRef(false);

  useEffect(() => {
    (async () => {
      if ((await AsyncStorage.getItem(ONBOARDED_KEY)) === '1') return setOnboarded(true);
      // Anyone who already has groups or sessions has used the app: no onboarding.
      if ((await countGroups()) > 0 || (await countSessions()) > 0) {
        AsyncStorage.setItem(ONBOARDED_KEY, '1').catch(() => {});
        return setOnboarded(true);
      }
      setOnboarded(false);
    })().catch(() => setOnboarded(true)); // fail open: never trap the user
  }, []);

  // Paywall in onboarding, right after the value screens (Young, Gate 3).
  const finishWelcome = () => {
    if (paywallOpened.current) return;
    paywallOpened.current = true;
    if (isPro) {
      setStep('question');
      return;
    }
    setStep('paywall');
    showPaywall();
  };

  // When the paywall closes (purchase or ✕), move on to the attribution question.
  useEffect(() => {
    if (paywallOpened.current && !paywallVisible) setStep('question');
  }, [paywallVisible]);

  const finishOnboarding = () => {
    setOnboarded(true);
    AsyncStorage.setItem(ONBOARDED_KEY, '1').catch(() => {});
  };

  if (!ready || onboarded === null) {
    return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  }

  if (!onboarded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
        {step === 'welcome' && <Welcome onDone={finishWelcome} />}
        {step === 'question' && <Onboarding onDone={finishOnboarding} />}
        <PaywallModal privacyUrl={PRIVACY_URL} onboarding />
      </View>
    );
  }

  return (
    <LockGate>
      <LaunchReview />
      <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
        <View style={{ flex: 1 }}>
          {tab === 'groups' && <GroupsScreen onOpenGroup={setOpenGroupId} />}
          {tab === 'report' && <ReportScreen />}
          {tab === 'settings' && <SettingsScreen />}
        </View>
        <View
          style={[
            styles.tabBar,
            { backgroundColor: theme.card, borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, 10) },
          ]}
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={styles.tabItem}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.tabIcon, { opacity: active ? 1 : 0.45 }]}>{t.icon}</Text>
                <Text style={[styles.tabLabel, { color: active ? theme.accent : theme.textFaint }]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <GroupDetail groupId={openGroupId} onClose={() => setOpenGroupId(null)} />
        <PaywallModal privacyUrl={PRIVACY_URL} />
      </View>
    </LockGate>
  );
}

/** Once per launch, after any Face ID unlock: the "later calendar day" rating trigger. */
function LaunchReview() {
  const locked = useLocked();
  const done = useRef(false);
  useEffect(() => {
    if (locked || done.current) return;
    done.current = true;
    maybeRequestReviewOnLaunch();
  }, [locked]);
  return null;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="auto" />
        <Shell />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  tabItem: { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 11, fontWeight: fonts.weight.medium },
});
