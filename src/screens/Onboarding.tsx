import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, fonts } from '../theme';

/**
 * First launch, in this order:
 *   1. Paywall (App.tsx opens it the moment the shell mounts un-onboarded)
 *   2. This one-tap attribution question
 *   3. Home
 * No slides, no sign-up. Stored locally only; never leaves the device.
 */
export const SOURCE_KEY = 'attend.source.v1';

const SOURCES = [
  'App Store search',
  'Another teacher, coach, or leader',
  'TikTok, Instagram, or YouTube',
  'Google or a website',
  'Somewhere else',
];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const theme = useTheme();

  const pick = (source: string) => {
    AsyncStorage.setItem(SOURCE_KEY, source).catch(() => {});
    onDone();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.wrap}>
        <Text style={styles.icon}>👋</Text>
        <Text style={[styles.title, { color: theme.text }]}>One quick question</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Where did you hear about Attendance Tracker? One tap; it helps us make the app better.
        </Text>
        <View style={styles.list}>
          {SOURCES.map((s) => (
            <Pressable
              key={s}
              onPress={() => pick(s)}
              style={({ pressed }) => [
                styles.btn,
                { backgroundColor: pressed ? theme.accentSoft : theme.card, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.btnText, { color: theme.text }]}>{s}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => pick('skipped')} hitSlop={10} style={styles.skip}>
          <Text style={[styles.skipText, { color: theme.textFaint }]}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  wrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  icon: { fontSize: 44, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: fonts.weight.bold, letterSpacing: -0.5 },
  body: { fontSize: 16, lineHeight: 23, marginTop: 8 },
  list: { marginTop: 24, gap: 10 },
  btn: { borderRadius: 14, borderWidth: 1, paddingVertical: 15, paddingHorizontal: 18 },
  btnText: { fontSize: 16, fontWeight: fonts.weight.medium },
  skip: { alignSelf: 'center', marginTop: 18, padding: 6 },
  skipText: { fontSize: 14 },
});
