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
import { useApp, FREE_GROUP_LIMIT } from '../state';
import { getGroups, insertGroup, Group, prettyDate } from '../db';

export default function GroupsScreen({ onOpenGroup }: { onOpenGroup: (id: number) => void }) {
  const theme = useTheme();
  const { isPro, showPaywall, dataVersion, bumpData } = useApp();
  const [groups, setGroups] = useState<Group[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [detail, setDetail] = useState('');

  const load = useCallback(async () => setGroups(await getGroups()), []);
  useEffect(() => {
    load();
  }, [load, dataVersion]);

  const startAdd = () => {
    if (!isPro && groups.length >= FREE_GROUP_LIMIT) {
      showPaywall();
      return;
    }
    setName('');
    setDetail('');
    setAdding(true);
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Name the group', 'Something like "Period 3 Biology" or "U12 Girls".');
      return;
    }
    const id = await insertGroup(name, detail);
    setAdding(false);
    bumpData();
    onOpenGroup(id);
  };

  const renderItem = ({ item }: { item: Group }) => (
    <Pressable onPress={() => onOpenGroup(item.id)}>
      <Card theme={theme} style={styles.itemCard}>
        <View style={styles.itemRow}>
          <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}>
            <Text style={[styles.avatarText, { color: theme.accent }]}>
              {item.name.trim().slice(0, 1).toUpperCase() || '?'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.itemMeta, { color: theme.textFaint }]} numberOfLines={1}>
              {item.peopleCount} {item.peopleCount === 1 ? 'person' : 'people'} · {item.sessionCount}{' '}
              {item.sessionCount === 1 ? 'session' : 'sessions'}
              {item.lastSessionDate ? ` · last ${prettyDate(item.lastSessionDate, false)}` : ''}
            </Text>
          </View>
          <Text style={{ color: theme.textFaint, fontSize: 22 }}>›</Text>
        </View>
      </Card>
    </Pressable>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={groups}
        keyExtractor={(g) => String(g.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Groups</Text>
            <Text style={[styles.sub, { color: theme.textSecondary }]}>
              A class, a team, a room, a crew. Open one to take roll.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Card theme={theme} style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Set up your first group</Text>
            <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
              Add the roster once. From then on, taking attendance is one tap per exception.
            </Text>
            <PillButton theme={theme} label="Add a group" onPress={startAdd} />
          </Card>
        }
      />
      {groups.length > 0 && (
        <Pressable
          onPress={startAdd}
          style={[styles.fab, { backgroundColor: theme.accent }]}
          accessibilityLabel="Add group"
        >
          <Text style={styles.fabText}>＋</Text>
        </Pressable>
      )}

      <Modal visible={adding} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setAdding(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.sheet, { backgroundColor: theme.bg }]}
        >
          <View style={styles.sheetHeader}>
            <Pressable onPress={() => setAdding(false)} hitSlop={10}>
              <Text style={[styles.sheetAction, { color: theme.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>New group</Text>
            <Pressable onPress={save} hitSlop={10}>
              <Text style={[styles.sheetAction, { color: theme.accent, fontWeight: fonts.weight.bold }]}>Save</Text>
            </Pressable>
          </View>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Group name</Text>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
            value={name}
            onChangeText={setName}
            placeholder="Period 3 Biology"
            placeholderTextColor={theme.textFaint}
            autoFocus
            returnKeyType="next"
          />
          <Text style={[styles.label, { color: theme.textSecondary }]}>Detail (optional)</Text>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
            value={detail}
            onChangeText={setDetail}
            placeholder="Fall 2026 · Room 214"
            placeholderTextColor={theme.textFaint}
            returnKeyType="done"
            onSubmitEditing={save}
          />
          <Text style={[styles.hint, { color: theme.textFaint }]}>You add people on the next screen.</Text>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, paddingBottom: 100 },
  header: { marginBottom: 14 },
  title: { fontSize: 30, fontWeight: fonts.weight.bold, letterSpacing: -0.5 },
  sub: { fontSize: 14, marginTop: 4 },
  itemCard: { marginBottom: 10, paddingVertical: 14 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: fonts.weight.bold },
  itemName: { fontSize: 17, fontWeight: fonts.weight.semibold },
  itemMeta: { fontSize: 13, marginTop: 2 },
  empty: { alignItems: 'center', padding: 24, gap: 10, marginTop: 20 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 18, fontWeight: fonts.weight.bold },
  emptyBody: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 6 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32, fontWeight: fonts.weight.bold },
  sheet: { flex: 1, padding: 20 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sheetTitle: { fontSize: 17, fontWeight: fonts.weight.bold },
  sheetAction: { fontSize: 16 },
  label: { fontSize: 12, fontWeight: fonts.weight.semibold, marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 17 },
  hint: { fontSize: 12, marginTop: 14 },
});
