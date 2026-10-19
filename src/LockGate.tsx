import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState as RNAppState, Keyboard, StyleSheet, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme, fonts } from './theme';
import { PillButton } from './components';
import { useApp } from './state';

const LockCtx = createContext<{ locked: boolean; unlock: () => void }>({
  locked: false,
  unlock: () => {},
});

/**
 * When Face ID lock is enabled, covers the app with an unlock screen
 * on launch and whenever the app returns from background.
 *
 * The app stays mounted underneath, so an open group, roll call or
 * half-typed roster is still there after unlocking.
 */
export default function LockGate({ children }: { children: React.ReactNode }) {
  const { settings, ready } = useApp();
  const [locked, setLocked] = useState(settings.lockEnabled);
  const authInFlight = useRef(false);
  const wasBackground = useRef(false);

  const unlock = useCallback(async () => {
    if (authInFlight.current) return;
    authInFlight.current = true;
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Attendance Tracker',
      });
      if (res.success) setLocked(false);
    } finally {
      authInFlight.current = false;
    }
  }, []);

  // Lock state must follow the setting once loaded.
  useEffect(() => {
    if (!ready) return;
    setLocked(settings.lockEnabled);
    if (settings.lockEnabled) unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, settings.lockEnabled]);

  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (state) => {
      if (state === 'background') {
        wasBackground.current = true;
        if (settings.lockEnabled) {
          Keyboard.dismiss();
          setLocked(true);
        }
      } else if (state === 'active' && wasBackground.current) {
        wasBackground.current = false;
        if (settings.lockEnabled) unlock();
      }
    });
    return () => sub.remove();
  }, [settings.lockEnabled, unlock]);

  const isLocked = settings.lockEnabled && locked;

  return (
    <LockCtx.Provider value={{ locked: isLocked, unlock }}>
      <View
        style={{ flex: 1 }}
        accessibilityElementsHidden={isLocked}
        importantForAccessibility={isLocked ? 'no-hide-descendants' : 'auto'}
      >
        {children}
      </View>
      <LockOverlay />
    </LockCtx.Provider>
  );
}

/** True while the Face ID lock screen is up. */
export function useLocked(): boolean {
  return useContext(LockCtx).locked;
}

/**
 * The unlock screen. LockGate draws one over the root view; every Modal
 * that shows roster data draws its own too, because iOS presents Modals
 * above the root view and a root overlay alone would not cover them.
 */
export function LockOverlay() {
  const theme = useTheme();
  const { locked, unlock } = useContext(LockCtx);
  if (!locked) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.container, { backgroundColor: theme.bg }]} accessibilityViewIsModal>
      <Text style={styles.emoji}>🔒</Text>
      <Text style={[styles.title, { color: theme.text }]}>Attendance Tracker is locked</Text>
      <Text style={[styles.sub, { color: theme.textSecondary }]}>
        Your rosters are protected with Face ID.
      </Text>
      <View style={{ marginTop: 20 }}>
        <PillButton theme={theme} label="Unlock" onPress={unlock} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 32, zIndex: 1000 },
  emoji: { fontSize: 44, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: fonts.weight.bold },
  sub: { fontSize: 15, marginTop: 6, textAlign: 'center' },
});
