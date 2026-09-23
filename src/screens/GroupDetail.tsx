import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme, fonts } from '../theme';
import { Card, PillButton } from '../components';
import { useApp, FREE_SESSION_LIMIT } from '../state';
import {
  countSessions,
  deleteGroup,
  deletePerson,
  getGroup,
  getPeople,
  getSessions,
  Group,
  insertPeopleBulk,
  insertPerson,
  insertSession,
  Person,
  prettyDate,
  Session,
  setPersonActive,
  todayIso,
  updateGroup,
  updatePerson,
} from '../db';
import RollCall from './RollCall';

type Seg = 'sessions' | 'people';

export default function GroupDetail({ groupId, onClose }: { groupId: number | null; onClose: () => void }) {
  const theme = useTheme();
  const { isPro, showPaywall, dataVersion, bumpData } = useApp();
  const [group, setGroup] = useState<Group | null>(null);
  const [seg, setSeg] = useState<Seg>('sessions');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [rollId, setRollId] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [editName, setEditName] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [gName, setGName] = useState('');
  const [gDetail, setGDetail] = useState('');

  const load = useCallback(async () => {
    if (!groupId) return;
    const g = await getGroup(groupId);
    setGroup(g);
    setSessions(await getSessions(groupId));
    setPeople(await getPeople(groupId, true));
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load, dataVersion]);

  useEffect(() => {
    // Fresh group with no roster: start on People.
    if (group && group.peopleCount === 0 && group.sessionCount === 0) setSeg('people');
  }, [group?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const takeAttendance = async () => {
    if (!groupId) return;
    if (people.filter((p) => p.active).length === 0) {
      setSeg('people');
      Alert.alert('Add the roster first', 'Add at least one person, then take attendance.');
      return;
    }
    if (!isPro && (await countSessions()) >= FREE_SESSION_LIMIT) {
      showPaywall();
      return;
    }
    const existing = sessions.find((s) => s.date === todayIso());
    if (existing) {
      setRollId(existing.id);
      return;
    }
    const id = await insertSession(groupId, todayIso());
    bumpData();
    setRollId(id);
  };

  const addPerson = async () => {
    if (!groupId || !newName.trim()) return;
    await insertPerson(groupId, newName);
    setNewName('');
    bumpData();
  };

  const addPasted = async () => {
    if (!groupId) return;
    const n = await insertPeopleBulk(groupId, pasteText);
    setPasteOpen(false);
    setPasteText('');
    bumpData();
    if (n > 0) Alert.alert('Roster added', `${n} ${n === 1 ? 'person' : 'people'} added.`);
  };

  const openEdit = (p: Person) => {
    setEditPerson(p);
    setEditName(p.name);
    setEditNote(p.note);
  };

  const saveEdit = async () => {
    if (!editPerson) return;
    if (!editName.trim()) {
      Alert.alert('Name required');
      return;
    }
    await updatePerson(editPerson.id, editName, editNote);
    setEditPerson(null);
    bumpData();
  };

  const toggleActive = async () => {
    if (!editPerson) return;
    await setPersonActive(editPerson.id, !editPerson.active);
    setEditPerson(null);
    bumpData();
  };

  const removePerson = () => {
    if (!editPerson) return;
    Alert.alert('Delete this person?', 'Their attendance marks are deleted too. Use "Mark inactive" to keep history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePerson(editPerson.id);
          setEditPerson(null);
          bumpData();
        },
      },
    ]);
  };

  const openEditGroup = () => {
    if (!group) return;
    setGName(group.name);
    setGDetail(group.detail);
    setEditGroupOpen(true);
  };

  const saveGroup = async () => {
    if (!group || !gName.trim()) return;
    await updateGroup(group.id, gName, gDetail);
    setEditGroupOpen(false);
    bumpData();
  };

  const removeGroup = () => {
    if (!group) return;
    Alert.alert('Delete this group?', 'Every person, session, and mark in it is erased. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete group',
        style: 'destructive',
        onPress: async () => {
          await deleteGroup(group.id);
          setEditGroupOpen(false);
          bumpData();
          onClose();
        },
      },
    ]);
  };

  const activePeople = people.filter((p) => p.active);
  const inactivePeople = people.filter((p) => !p.active);

  const renderSession = ({ item }: { item: Session }) => {
    const total = activePeople.length;
    return (
      <Pressable onPress={() => setRollId(item.id)}>
        <Card theme={theme} style={styles.sessionCard}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sessionDate, { color: theme.text }]}>{prettyDate(item.date)}</Text>
            {item.title ? (
              <Text style={[styles.sessionTitle, { color: theme.textSecondary }]} numberOfLines={1}>
                {item.title}
              </Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.sessionCount, { color: theme.success }]}>
              {item.presentCount}
              <Text style={{ color: theme.textFaint, fontWeight: fonts.weight.regular }}>/{Math.max(total, item.markedCount)}</Text>
            </Text>
            <Text style={[styles.sessionCountLabel, { color: theme.textFaint }]}>present</Text>
          </View>
        </Card>
      </Pressable>
    );
  };

  const renderPerson = ({ item }: { item: Person }) => (
    <Pressable onPress={() => openEdit(item)} style={[styles.personRow, { borderBottomColor: theme.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.personName, { color: item.active ? theme.text : theme.textFaint }]}>{item.name}</Text>
        {item.note ? <Text style={[styles.personNote, { color: theme.textFaint }]}>{item.note}</Text> : null}
      </View>
      <Text style={{ color: theme.textFaint }}>›</Text>
    </Pressable>
  );

  return (
    <Modal visible={groupId != null} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={[styles.headerAction, { color: theme.accent }]}>‹ Groups</Text>
          </Pressable>
          <Pressable onPress={openEditGroup} hitSlop={10}>
            <Text style={[styles.headerAction, { color: theme.accent }]}>Edit</Text>
          </Pressable>
        </View>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {group?.name ?? ''}
          </Text>
          {group?.detail ? (
            <Text style={[styles.detail, { color: theme.textSecondary }]} numberOfLines={1}>
              {group.detail}
            </Text>
          ) : null}
        </View>

        <View style={[styles.segWrap, { backgroundColor: theme.cardAlt }]}>
          {(['sessions', 'people'] as Seg[]).map((s) => (
            <Pressable
              key={s}
              onPress={() => setSeg(s)}
              style={[styles.segBtn, seg === s && { backgroundColor: theme.card }]}
            >
              <Text style={[styles.segText, { color: seg === s ? theme.text : theme.textSecondary }]}>
                {s === 'sessions' ? `Sessions (${sessions.length})` : `People (${activePeople.length})`}
              </Text>
            </Pressable>
          ))}
        </View>

        {seg === 'sessions' ? (
          <FlatList
            data={sessions}
            keyExtractor={(s) => String(s.id)}
            renderItem={renderSession}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <View style={{ marginBottom: 14 }}>
                <PillButton theme={theme} label="Take attendance today" onPress={takeAttendance} />
              </View>
            }
            ListEmptyComponent={
              <Text style={[styles.empty, { color: theme.textSecondary }]}>
                No sessions yet. Tap the button and everyone starts Present; mark only the exceptions.
              </Text>
            }
          />
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <FlatList
              data={[...activePeople, ...inactivePeople]}
              keyExtractor={(p) => String(p.id)}
              renderItem={renderPerson}
              contentContainerStyle={styles.list}
              ListHeaderComponent={
                <View style={{ marginBottom: 10 }}>
                  <View style={[styles.addRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <TextInput
                      style={[styles.addInput, { color: theme.text }]}
                      value={newName}
                      onChangeText={setNewName}
                      placeholder="Add a name and press return"
                      placeholderTextColor={theme.textFaint}
                      returnKeyType="done"
                      blurOnSubmit={false}
                      onSubmitEditing={addPerson}
                      autoCapitalize="words"
                    />
                    <Pressable onPress={addPerson} hitSlop={8}>
                      <Text style={[styles.addBtn, { color: theme.accent }]}>Add</Text>
                    </Pressable>
                  </View>
                  <Pressable onPress={() => setPasteOpen(true)} style={styles.pasteLink}>
                    <Text style={[styles.pasteText, { color: theme.accent }]}>Paste a whole roster…</Text>
                  </Pressable>
                </View>
              }
              ListEmptyComponent={
                <Text style={[styles.empty, { color: theme.textSecondary }]}>
                  Add each person once. Paste a list from your class roster or team sheet to do it in one go.
                </Text>
              }
            />
          </KeyboardAvoidingView>
        )}

        <RollCall sessionId={rollId} onClose={() => setRollId(null)} />

        {/* Paste roster */}
        <Modal visible={pasteOpen} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setPasteOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: theme.bg }]}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setPasteOpen(false)} hitSlop={10}>
                <Text style={[styles.sheetAction, { color: theme.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Paste roster</Text>
              <Pressable onPress={addPasted} hitSlop={10}>
                <Text style={[styles.sheetAction, { color: theme.accent, fontWeight: fonts.weight.bold }]}>Add</Text>
              </Pressable>
            </View>
            <Text style={[styles.hint, { color: theme.textSecondary }]}>One name per line, or separated by commas.</Text>
            <TextInput
              style={[styles.pasteBox, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
              value={pasteText}
              onChangeText={setPasteText}
              multiline
              autoFocus
              placeholder={'Ava Johnson\nLiam Chen\nSofia Martinez'}
              placeholderTextColor={theme.textFaint}
              textAlignVertical="top"
            />
          </View>
        </Modal>

        {/* Edit person */}
        <Modal visible={editPerson != null} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setEditPerson(null)}>
          <View style={[styles.sheet, { backgroundColor: theme.bg }]}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setEditPerson(null)} hitSlop={10}>
                <Text style={[styles.sheetAction, { color: theme.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Edit person</Text>
              <Pressable onPress={saveEdit} hitSlop={10}>
                <Text style={[styles.sheetAction, { color: theme.accent, fontWeight: fonts.weight.bold }]}>Save</Text>
              </Pressable>
            </View>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Name</Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
              value={editName}
              onChangeText={setEditName}
              autoCapitalize="words"
            />
            <Text style={[styles.label, { color: theme.textSecondary }]}>Note (optional)</Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
              value={editNote}
              onChangeText={setEditNote}
              placeholder="Jersey 12 · parent: Dana"
              placeholderTextColor={theme.textFaint}
            />
            <View style={{ marginTop: 24, gap: 12 }}>
              <PillButton
                theme={theme}
                kind="ghost"
                label={editPerson?.active ? 'Mark inactive (keep history)' : 'Mark active again'}
                onPress={toggleActive}
              />
              <Pressable onPress={removePerson} style={{ alignSelf: 'center', padding: 8 }}>
                <Text style={{ color: theme.danger, fontSize: 15 }}>Delete person and their marks</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Edit group */}
        <Modal visible={editGroupOpen} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setEditGroupOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: theme.bg }]}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setEditGroupOpen(false)} hitSlop={10}>
                <Text style={[styles.sheetAction, { color: theme.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Edit group</Text>
              <Pressable onPress={saveGroup} hitSlop={10}>
                <Text style={[styles.sheetAction, { color: theme.accent, fontWeight: fonts.weight.bold }]}>Save</Text>
              </Pressable>
            </View>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Group name</Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
              value={gName}
              onChangeText={setGName}
            />
            <Text style={[styles.label, { color: theme.textSecondary }]}>Detail</Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
              value={gDetail}
              onChangeText={setGDetail}
              placeholder="Fall 2026 · Room 214"
              placeholderTextColor={theme.textFaint}
            />
            <Pressable onPress={removeGroup} style={{ alignSelf: 'center', padding: 8, marginTop: 28 }}>
              <Text style={{ color: theme.danger, fontSize: 15 }}>Delete this group</Text>
            </Pressable>
          </View>
        </Modal>
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
  titleBlock: { paddingHorizontal: 20, paddingTop: 14 },
  title: { fontSize: 26, fontWeight: fonts.weight.bold, letterSpacing: -0.5 },
  detail: { fontSize: 14, marginTop: 2 },
  segWrap: { flexDirection: 'row', margin: 20, marginBottom: 6, borderRadius: 10, padding: 3 },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segText: { fontSize: 14, fontWeight: fonts.weight.semibold },
  list: { padding: 20, paddingTop: 10, paddingBottom: 60 },
  sessionCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingVertical: 14 },
  sessionDate: { fontSize: 16, fontWeight: fonts.weight.semibold },
  sessionTitle: { fontSize: 13, marginTop: 2 },
  sessionCount: { fontSize: 18, fontWeight: fonts.weight.bold },
  sessionCountLabel: { fontSize: 11 },
  empty: { textAlign: 'center', fontSize: 15, lineHeight: 22, padding: 20 },
  addRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  addInput: { flex: 1, fontSize: 16, paddingVertical: 12 },
  addBtn: { fontSize: 16, fontWeight: fonts.weight.bold, paddingLeft: 10 },
  pasteLink: { alignSelf: 'flex-start', paddingVertical: 8 },
  pasteText: { fontSize: 14, fontWeight: fonts.weight.semibold },
  personRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  personName: { fontSize: 17 },
  personNote: { fontSize: 12, marginTop: 2 },
  sheet: { flex: 1, padding: 20 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: fonts.weight.bold },
  sheetAction: { fontSize: 16 },
  hint: { fontSize: 13, marginBottom: 10 },
  pasteBox: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16, maxHeight: 360 },
  label: { fontSize: 12, fontWeight: fonts.weight.semibold, marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 17 },
});
