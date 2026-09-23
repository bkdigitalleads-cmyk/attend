import Constants from 'expo-constants';
import React, { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme, fonts } from '../theme';
import { Card, SectionTitle, ProBadge } from '../components';
import { useApp } from '../state';
import { deleteAllData } from '../db';
import { restorePurchases, isBillingAvailable } from '../purchases';

const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = 'https://bkdigitalleads-cmyk.github.io/attend/privacy.html';
const SUPPORT_URL = 'https://bkdigitalleads-cmyk.github.io/attend/support.html';

export default function SettingsScreen() {
  const theme = useTheme();
  const { settings, updateSettings, isPro, setIsPro, showPaywall, bumpData } = useApp();
  const [busy, setBusy] = useState(false);

  const onToggleLock = async () => {
    if (!isPro) {
      showPaywall();
      return;
    }
    if (!settings.lockEnabled) {
      const hw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hw || !enrolled) {
        Alert.alert('Face ID unavailable', 'Set up Face ID or a device passcode in iOS Settings first.');
        return;
      }
    }
    await updateSettings({ lockEnabled: !settings.lockEnabled });
  };

  const onRestore = async () => {
    if (!isBillingAvailable()) {
      Alert.alert('Unavailable', 'Purchases are not available right now.');
      return;
    }
    setBusy(true);
    const res = await restorePurchases();
    setBusy(false);
    if (res.ok) {
      setIsPro(res.isPro);
      Alert.alert(
        res.isPro ? 'Restored' : 'No purchases found',
        res.isPro ? 'Your Pro access is back.' : 'We couldn’t find a previous purchase on this Apple ID.'
      );
    } else {
      Alert.alert('Restore failed', res.error ?? 'Please try again.');
    }
  };

  const onDeleteAll = () => {
    Alert.alert('Delete everything?', 'Every group, person, session, and mark is permanently erased from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete everything',
        style: 'destructive',
        onPress: async () => {
          await deleteAllData();
          bumpData();
        },
      },
    ]);
  };

  const rowText = (label: string, pro?: boolean) => (
    <View style={styles.rowLabel}>
      <Text style={[styles.rowText, { color: theme.text }]}>{label}</Text>
      {pro && !isPro ? <ProBadge theme={theme} /> : null}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={[styles.title, { color: theme.text }]}>Settings</Text>

      {!isPro && (
        <Pressable onPress={showPaywall}>
          <Card theme={theme} style={{ ...styles.upsell, backgroundColor: theme.accentSoft }}>
            <Text style={[styles.upsellTitle, { color: theme.accent }]}>Attendance Tracker Pro</Text>
            <Text style={[styles.upsellSub, { color: theme.text }]}>
              Unlimited groups and sessions · PDF report · CSV export · Face ID lock. Starts with 3 days free.
            </Text>
          </Card>
        </Pressable>
      )}

      <SectionTitle theme={theme}>On the report</SectionTitle>
      <Card theme={theme}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>School, club, or organization</Text>
        <TextInput
          style={[styles.nameInput, { color: theme.text }]}
          value={settings.orgName}
          onChangeText={(v) => updateSettings({ orgName: v })}
          placeholder="Lincoln High School"
          placeholderTextColor={theme.textFaint}
        />
        <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>Your name (signature line)</Text>
        <TextInput
          style={[styles.nameInput, { color: theme.text }]}
          value={settings.leaderName}
          onChangeText={(v) => updateSettings({ leaderName: v })}
          placeholder="Coach Rivera"
          placeholderTextColor={theme.textFaint}
        />
      </Card>

      <SectionTitle theme={theme}>Security</SectionTitle>
      <Card theme={theme}>
        <View style={styles.row}>
          {rowText('Lock with Face ID', true)}
          <Switch value={settings.lockEnabled} onValueChange={onToggleLock} trackColor={{ true: theme.accent }} />
        </View>
      </Card>

      <SectionTitle theme={theme}>Privacy & data</SectionTitle>
      <Card theme={theme}>
        <Text style={[styles.privacyNote, { color: theme.textSecondary }]}>
          Rosters and attendance never leave this iPhone. No account, no cloud, no tracking. Use the Report tab to export a copy.
        </Text>
      </Card>

      <SectionTitle theme={theme}>Purchases & support</SectionTitle>
      <Card theme={theme}>
        <Pressable onPress={onRestore} disabled={busy} style={styles.row}>
          {rowText('Restore purchases')}
          <Text style={{ color: theme.textFaint }}>›</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(TERMS_URL)} style={styles.row}>
          {rowText('Terms of Use (EULA)')}
          <Text style={{ color: theme.textFaint }}>›</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} style={styles.row}>
          {rowText('Privacy Policy')}
          <Text style={{ color: theme.textFaint }}>›</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(SUPPORT_URL)} style={styles.row}>
          {rowText('Support')}
          <Text style={{ color: theme.textFaint }}>›</Text>
        </Pressable>
      </Card>

      <SectionTitle theme={theme}>Danger zone</SectionTitle>
      <Card theme={theme}>
        <Pressable onPress={onDeleteAll} style={styles.row}>
          <Text style={[styles.rowText, { color: theme.danger }]}>Delete all data</Text>
        </Pressable>
      </Card>

      <Text style={[styles.version, { color: theme.textFaint }]}>
        Attendance Tracker v{Constants.expoConfig?.version ?? ''} · Made in NYC
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 48 },
  title: { fontSize: 26, fontWeight: fonts.weight.bold, letterSpacing: -0.5, marginBottom: 8 },
  upsell: { marginTop: 8, borderWidth: 0 },
  upsellTitle: { fontSize: 17, fontWeight: fonts.weight.bold, marginBottom: 4 },
  upsellSub: { fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, minHeight: 40 },
  rowLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { fontSize: 16 },
  label: { fontSize: 12, fontWeight: fonts.weight.semibold, marginBottom: 4 },
  nameInput: { fontSize: 17, paddingVertical: 2 },
  privacyNote: { fontSize: 13, lineHeight: 19, paddingVertical: 4 },
  version: { textAlign: 'center', marginTop: 28, fontSize: 12 },
});
