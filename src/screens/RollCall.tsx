import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, fonts, Theme } from '../theme';
import { useApp } from '../state';
import {
  deleteSession,
  getMarks,
  getPeople,
  getSession,
  Mark,
  Person,
  Session,
  setAllMarks,
  setMark,
  shiftDate,
  Status,
  STATUSES,
  STATUS_LABEL,
  STATUS_SHORT,
  todayIso,
  updateSession,
  prettyDate,
} from '../db';

function statusColor(theme: Theme, s: Status): string {
  switch (s) {
    case 'present':
      return theme.success;
    case 'late':
      return theme.warn;
    case 'absent':
      return theme.danger;
    case 'excused':
      return theme.muted;
  }
}

/**
 * The roll-call screen: everyone starts Present when the session is created,
 * so taking attendance is one tap per exception. Tapping a chip saves at once.
 */
export default function RollCall({
  sessionId,
  onClose,
}: {
  sessionId: number | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { bumpData } = useApp();
  const [session, setSession] = useState<Session | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [marks, setMarks] = useState<Record<number, Mark>>({});
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState('');

  const load = useCallback(async () => {
    if (!sessionId) return;
    const s = await getSession(sessionId);
    setSession(s);
    setTitle(s?.title ?? '');
    if (s) {
      setPeople(await getPeople(s.groupId));
      setMarks(await getMarks(s.id));
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const tap = async (personId: number, status: Status) => {
    if (!session) return;
    Haptics.selectionAsync().catch(() => {});
    setMarks((m) => ({ ...m, [personId]: { sessionId: session.id, personId, status, note: '' } }));
    await setMark(session.id, personId, status);
    bumpData();
  };

  const allPresent = async () => {
    if (!session) return;
    await setAllMarks(session.id, session.groupId, 'present');
    await load();
    bumpData();
  };

  const moveDate = async (days: number) => {
    if (!session) return;
    const next = shiftDate(session.date, days);
    if (next > todayIso()) return;
    await updateSession(session.id, next, session.title, session.note);
    await load();
    bumpData();
  };

  const saveTitle = async () => {
    if (!session) return;
    setEditingTitle(false);
    await updateSession(session.id, session.date, title, session.note);
    await load();
    bumpData();
  };

  const remove = () => {
    if (!session) return;
    Alert.alert('Delete this session?', 'All marks for this date are removed. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSession(session.id);
          bumpData();
          onClose();
        },
      },
    ]);
  };

  const counts = STATUSES.reduce(
    (acc, s) => {
      acc[s] = people.filter((p) => marks[p.id]?.status === s).length;
      return acc;
    },
    {} as Record<Status, number>
  );

  const renderPerson = ({ item }: { item: Person }) => {
    const current = marks[item.id]?.status;
    return (
      <View style={[styles.row, { borderBottomColor: theme.border }]}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.chips}>
          {STATUSES.map((s) => {
            const active = current === s;
            const c = statusColor(theme, s);
            return (
              <Pressable
                key={s}
                onPress={() => tap(item.id, s)}
                accessibilityLabel={`${item.name} ${STATUS_LABEL[s]}`}
                accessibilityState={{ selected: active }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? c : theme.card,
                    borderColor: active ? c : theme.border,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: active ? '#fff' : theme.textSecondary }]}>
                  {STATUS_SHORT[s]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={sessionId != null} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={[styles.headerAction, { color: theme.accent }]}>Done</Text>
          </Pressable>
          <View style={styles.dateRow}>
            <Pressable onPress={() => moveDate(-1)} hitSlop={10}>
              <Text style={[styles.arrow, { color: theme.accent }]}>‹</Text>
            </Pressable>
            <Text style={[styles.date, { color: theme.text }]}>{session ? prettyDate(session.date, false) : ''}</Text>
            <Pressable onPress={() => moveDate(1)} hitSlop={10}>
              <Text style={[styles.arrow, { color: session && session.date < todayIso() ? theme.accent : theme.border }]}>›</Text>
            </Pressable>
          </View>
          <Pressable onPress={remove} hitSlop={10}>
            <Text style={[styles.headerAction, { color: theme.danger }]}>Delete</Text>
          </Pressable>
        </View>

        <View style={styles.titleRow}>
          {editingTitle ? (
            <TextInput
              style={[styles.titleInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Session name (optional)"
              placeholderTextColor={theme.textFaint}
              autoFocus
              onBlur={saveTitle}
              onSubmitEditing={saveTitle}
              returnKeyType="done"
            />
          ) : (
            <Pressable onPress={() => setEditingTitle(true)} hitSlop={6}>
              <Text style={[styles.titleText, { color: session?.title ? theme.text : theme.textFaint }]}>
                {session?.title || 'Add a session name'}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.summary}>
          {STATUSES.map((s) => (
            <View key={s} style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: statusColor(theme, s) }]}>{counts[s]}</Text>
              <Text style={[styles.summaryLabel, { color: theme.textFaint }]}>{STATUS_LABEL[s]}</Text>
            </View>
          ))}
          <Pressable onPress={allPresent} style={[styles.allBtn, { borderColor: theme.accent }]}>
            <Text style={[styles.allBtnText, { color: theme.accent }]}>All present</Text>
          </Pressable>
        </View>

        <FlatList
          data={people}
          keyExtractor={(p) => String(p.id)}
          renderItem={renderPerson}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.textSecondary }]}>
              No people in this group yet. Close this and add the roster under People.
            </Text>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 58,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerAction: { fontSize: 16, fontWeight: fonts.weight.semibold },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  arrow: { fontSize: 28, fontWeight: fonts.weight.bold, paddingHorizontal: 6 },
  date: { fontSize: 17, fontWeight: fonts.weight.bold },
  titleRow: { paddingHorizontal: 20, paddingTop: 12 },
  titleText: { fontSize: 15 },
  titleInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15 },
  summary: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 14 },
  summaryItem: { alignItems: 'center' },
  summaryNum: { fontSize: 18, fontWeight: fonts.weight.bold },
  summaryLabel: { fontSize: 10 },
  allBtn: { marginLeft: 'auto', borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  allBtnText: { fontSize: 13, fontWeight: fonts.weight.semibold },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  name: { flex: 1, fontSize: 17, fontWeight: fonts.weight.medium },
  chips: { flexDirection: 'row', gap: 6 },
  chip: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 15, fontWeight: fonts.weight.bold },
  empty: { padding: 32, textAlign: 'center', fontSize: 15, lineHeight: 22 },
});
