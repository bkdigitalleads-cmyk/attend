import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { useTheme, fonts, Theme } from '../theme';
import { Card, PillButton, ProBadge, SectionTitle } from '../components';
import { useApp } from '../state';
import { exportCsv, getGroupReport, getGroups, Group, GroupReport } from '../db';
import { generateAndSharePdf } from '../report';
import { maybeRequestReviewAfterExport } from '../reviews';

export default function ReportScreen() {
  const theme = useTheme();
  const { isPro, showPaywall, dataVersion } = useApp();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [rep, setRep] = useState<GroupReport | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const gs = await getGroups();
    setGroups(gs);
    const id = groupId && gs.some((g) => g.id === groupId) ? groupId : (gs[0]?.id ?? null);
    setGroupId(id);
    setRep(id ? await getGroupReport(id) : null);
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load, dataVersion]);

  const requirePro = (fn: () => Promise<void>) => async () => {
    if (!isPro) {
      showPaywall();
      return;
    }
    if (!rep || rep.sessions.length === 0) {
      Alert.alert('Nothing to export yet', 'Take attendance at least once, then create the report.');
      return;
    }
    try {
      setBusy(true);
      await fn();
      maybeRequestReviewAfterExport();
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onPdf = requirePro(async () => {
    if (groupId) await generateAndSharePdf(groupId);
  });

  const onCsv = requirePro(async () => {
    if (!groupId) return;
    const csv = await exportCsv(groupId);
    const file = new File(Paths.cache, 'attendance.csv');
    if (file.exists) file.delete();
    file.write(csv);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export attendance' });
    }
  });

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={[styles.title, { color: theme.text }]}>Report</Text>
      <Text style={[styles.sub, { color: theme.textSecondary }]}>
        Per-person totals and the full register, as a PDF your office, league, or board will accept.
      </Text>

      {groups.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.picker} contentContainerStyle={{ gap: 8 }}>
          {groups.map((g) => {
            const active = g.id === groupId;
            return (
              <Pressable
                key={g.id}
                onPress={() => setGroupId(g.id)}
                style={[styles.pickChip, { backgroundColor: active ? theme.accent : theme.card, borderColor: active ? theme.accent : theme.border }]}
              >
                <Text style={[styles.pickText, { color: active ? '#fff' : theme.text }]}>{g.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {rep ? (
        <>
          <Card theme={theme} style={styles.statsCard}>
            <View style={styles.statRow}>
              <Stat label="Sessions" value={String(rep.sessions.length)} theme={theme} />
              <Stat label="People" value={String(rep.totals.length)} theme={theme} />
              <Stat label="Average" value={`${rep.avgPct}%`} theme={theme} />
            </View>
          </Card>

          <SectionTitle theme={theme}>By person</SectionTitle>
          <Card theme={theme} style={{ paddingVertical: 4 }}>
            {rep.totals.length === 0 ? (
              <Text style={[styles.emptyRow, { color: theme.textSecondary }]}>No people yet.</Text>
            ) : (
              rep.totals.map((t, i) => (
                <View key={t.person.id} style={[styles.personRow, i > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                  <Text style={[styles.personName, { color: t.person.active ? theme.text : theme.textFaint }]} numberOfLines={1}>
                    {t.person.name}
                  </Text>
                  <Text style={[styles.personCounts, { color: theme.textFaint }]}>
                    <Text style={{ color: theme.success }}>{t.present}P</Text> {t.late}L {t.absent}A {t.excused}E
                  </Text>
                  <View style={[styles.pctWrap, { backgroundColor: theme.cardAlt }]}>
                    <View style={[styles.pctBar, { width: `${t.pct}%`, backgroundColor: t.pct >= 90 ? theme.success : t.pct >= 75 ? theme.warn : theme.danger }]} />
                  </View>
                  <Text style={[styles.pct, { color: theme.text }]}>{t.pct}%</Text>
                </View>
              ))
            )}
          </Card>
        </>
      ) : (
        <Card theme={theme} style={{ marginTop: 16 }}>
          <Text style={[styles.emptyRow, { color: theme.textSecondary }]}>Add a group and take attendance to see totals here.</Text>
        </Card>
      )}

      <SectionTitle theme={theme}>Export</SectionTitle>
      <Card theme={theme} style={styles.exportCard}>
        <View style={styles.exportTitleRow}>
          <Text style={[styles.exportTitle, { color: theme.text }]}>Attendance report PDF</Text>
          {!isPro && <ProBadge theme={theme} />}
        </View>
        <Text style={[styles.exportBody, { color: theme.textSecondary }]}>
          Summary per person plus the register grid (P / L / A / E by date), with a signature line. Print it or share it from your phone.
        </Text>
        <PillButton theme={theme} label={busy ? 'Working…' : 'Create PDF'} onPress={onPdf} disabled={busy} />
      </Card>
      <Card theme={theme} style={styles.exportCard}>
        <View style={styles.exportTitleRow}>
          <Text style={[styles.exportTitle, { color: theme.text }]}>CSV spreadsheet</Text>
          {!isPro && <ProBadge theme={theme} />}
        </View>
        <Text style={[styles.exportBody, { color: theme.textSecondary }]}>
          One row per person per session. Opens in Excel, Numbers, or Google Sheets.
        </Text>
        <PillButton theme={theme} label={busy ? 'Working…' : 'Export CSV'} onPress={onCsv} disabled={busy} kind="ghost" />
      </Card>
    </ScrollView>
  );
}

function Stat({ label, value, theme }: { label: string; value: string; theme: Theme }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textFaint }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 26, fontWeight: fonts.weight.bold, letterSpacing: -0.5 },
  sub: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  picker: { marginTop: 14, flexGrow: 0 },
  pickChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7 },
  pickText: { fontSize: 14, fontWeight: fonts.weight.semibold },
  statsCard: { marginTop: 16, paddingVertical: 16 },
  statRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: fonts.weight.bold },
  statLabel: { fontSize: 12, marginTop: 2 },
  personRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
  personName: { flex: 1, fontSize: 15, fontWeight: fonts.weight.medium },
  personCounts: { fontSize: 11, width: 92 },
  pctWrap: { width: 54, height: 6, borderRadius: 3, overflow: 'hidden' },
  pctBar: { height: '100%', borderRadius: 3 },
  pct: { width: 42, textAlign: 'right', fontSize: 14, fontWeight: fonts.weight.bold },
  emptyRow: { fontSize: 14, paddingVertical: 8 },
  exportCard: { marginBottom: 12, gap: 10 },
  exportTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exportTitle: { fontSize: 16, fontWeight: fonts.weight.semibold },
  exportBody: { fontSize: 13, lineHeight: 18 },
});
