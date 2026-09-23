import * as SQLite from 'expo-sqlite';

/**
 * Attendance Tracker data model (distinct from every sibling app):
 *   groups   — a class, team, club, room, crew
 *   people   — members of one group
 *   sessions — one meeting / practice / class on a date
 *   marks    — one status per (session, person)
 */

export const STATUSES = ['present', 'absent', 'late', 'excused'] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Excused',
};

export const STATUS_SHORT: Record<Status, string> = {
  present: 'P',
  absent: 'A',
  late: 'L',
  excused: 'E',
};

export interface Group {
  id: number;
  name: string;
  /** Free text: "Period 3", "U12 Girls", "Sunday 9am". */
  detail: string;
  createdAt: number;
  peopleCount: number;
  sessionCount: number;
  lastSessionDate: string | null;
}

export interface Person {
  id: number;
  groupId: number;
  name: string;
  note: string;
  active: boolean;
  sortKey: number;
}

export interface Session {
  id: number;
  groupId: number;
  /** YYYY-MM-DD local. */
  date: string;
  title: string;
  note: string;
  createdAt: number;
  presentCount: number;
  markedCount: number;
}

export interface Mark {
  sessionId: number;
  personId: number;
  status: Status;
  note: string;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('attend.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          detail TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS people (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          note TEXT NOT NULL DEFAULT '',
          active INTEGER NOT NULL DEFAULT 1,
          sort_key INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_people_group ON people(group_id);
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
          date TEXT NOT NULL,
          title TEXT NOT NULL DEFAULT '',
          note TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_group_date ON sessions(group_id, date);
        CREATE TABLE IF NOT EXISTS marks (
          session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
          person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
          status TEXT NOT NULL,
          note TEXT NOT NULL DEFAULT '',
          PRIMARY KEY (session_id, person_id)
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

// ---------- groups ----------

export async function getGroups(): Promise<Group[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(`
    SELECT g.*,
      (SELECT COUNT(*) FROM people p WHERE p.group_id = g.id AND p.active = 1) AS people_count,
      (SELECT COUNT(*) FROM sessions s WHERE s.group_id = g.id) AS session_count,
      (SELECT MAX(date) FROM sessions s WHERE s.group_id = g.id) AS last_date
    FROM groups g ORDER BY g.created_at ASC
  `);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    detail: r.detail ?? '',
    createdAt: r.created_at,
    peopleCount: r.people_count ?? 0,
    sessionCount: r.session_count ?? 0,
    lastSessionDate: r.last_date ?? null,
  }));
}

export async function getGroup(id: number): Promise<Group | null> {
  const all = await getGroups();
  return all.find((g) => g.id === id) ?? null;
}

export async function insertGroup(name: string, detail: string): Promise<number> {
  const db = await getDb();
  const res = await db.runAsync(
    'INSERT INTO groups (name, detail, created_at) VALUES (?, ?, ?)',
    [name.trim(), detail.trim(), Date.now()]
  );
  return res.lastInsertRowId;
}

export async function updateGroup(id: number, name: string, detail: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE groups SET name = ?, detail = ? WHERE id = ?', [
    name.trim(),
    detail.trim(),
    id,
  ]);
}

export async function deleteGroup(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM groups WHERE id = ?', [id]);
}

export async function countGroups(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>('SELECT COUNT(*) AS n FROM groups');
  return row?.n ?? 0;
}

// ---------- people ----------

export async function getPeople(groupId: number, includeInactive = false): Promise<Person[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM people WHERE group_id = ? ${includeInactive ? '' : 'AND active = 1'}
     ORDER BY sort_key ASC, name COLLATE NOCASE ASC, id ASC`,
    [groupId]
  );
  return rows.map((r) => ({
    id: r.id,
    groupId: r.group_id,
    name: r.name,
    note: r.note ?? '',
    active: r.active === 1,
    sortKey: r.sort_key ?? 0,
  }));
}

export async function insertPerson(groupId: number, name: string, note = ''): Promise<number> {
  const db = await getDb();
  const res = await db.runAsync(
    'INSERT INTO people (group_id, name, note, active, sort_key) VALUES (?, ?, ?, 1, 0)',
    [groupId, name.trim(), note.trim()]
  );
  return res.lastInsertRowId;
}

/** Paste a roster: one name per line (or comma separated). Returns count added. */
export async function insertPeopleBulk(groupId: number, text: string): Promise<number> {
  const names = text
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const db = await getDb();
  let n = 0;
  await db.withTransactionAsync(async () => {
    for (const name of names) {
      await db.runAsync(
        'INSERT INTO people (group_id, name, note, active, sort_key) VALUES (?, ?, ?, 1, 0)',
        [groupId, name, '']
      );
      n++;
    }
  });
  return n;
}

export async function updatePerson(id: number, name: string, note: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE people SET name = ?, note = ? WHERE id = ?', [
    name.trim(),
    note.trim(),
    id,
  ]);
}

export async function setPersonActive(id: number, active: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE people SET active = ? WHERE id = ?', [active ? 1 : 0, id]);
}

export async function deletePerson(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM people WHERE id = ?', [id]);
}

// ---------- sessions ----------

function rowToSession(r: any): Session {
  return {
    id: r.id,
    groupId: r.group_id,
    date: r.date,
    title: r.title ?? '',
    note: r.note ?? '',
    createdAt: r.created_at,
    presentCount: r.present_count ?? 0,
    markedCount: r.marked_count ?? 0,
  };
}

const SESSION_SELECT = `
  SELECT s.*,
    (SELECT COUNT(*) FROM marks m WHERE m.session_id = s.id AND m.status IN ('present','late')) AS present_count,
    (SELECT COUNT(*) FROM marks m WHERE m.session_id = s.id) AS marked_count
  FROM sessions s`;

export async function getSessions(groupId: number): Promise<Session[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `${SESSION_SELECT} WHERE s.group_id = ? ORDER BY s.date DESC, s.id DESC LIMIT 2000`,
    [groupId]
  );
  return rows.map(rowToSession);
}

export async function getSession(id: number): Promise<Session | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(`${SESSION_SELECT} WHERE s.id = ?`, [id]);
  return row ? rowToSession(row) : null;
}

export async function countSessions(groupId?: number): Promise<number> {
  const db = await getDb();
  const row = groupId
    ? await db.getFirstAsync<any>('SELECT COUNT(*) AS n FROM sessions WHERE group_id = ?', [groupId])
    : await db.getFirstAsync<any>('SELECT COUNT(*) AS n FROM sessions');
  return row?.n ?? 0;
}

/**
 * Create a session and pre-mark everyone present (the roll-call default:
 * one tap per exception, not one tap per person).
 */
export async function insertSession(
  groupId: number,
  date: string,
  title = '',
  defaultStatus: Status | null = 'present'
): Promise<number> {
  const db = await getDb();
  let id = 0;
  await db.withTransactionAsync(async () => {
    const res = await db.runAsync(
      'INSERT INTO sessions (group_id, date, title, note, created_at) VALUES (?, ?, ?, ?, ?)',
      [groupId, date, title.trim(), '', Date.now()]
    );
    id = res.lastInsertRowId;
    if (defaultStatus) {
      await db.runAsync(
        `INSERT INTO marks (session_id, person_id, status, note)
         SELECT ?, id, ?, '' FROM people WHERE group_id = ? AND active = 1`,
        [id, defaultStatus, groupId]
      );
    }
  });
  return id;
}

export async function updateSession(id: number, date: string, title: string, note: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE sessions SET date = ?, title = ?, note = ? WHERE id = ?', [
    date,
    title.trim(),
    note.trim(),
    id,
  ]);
}

export async function deleteSession(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM sessions WHERE id = ?', [id]);
}

// ---------- marks ----------

export async function getMarks(sessionId: number): Promise<Record<number, Mark>> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM marks WHERE session_id = ?', [sessionId]);
  const out: Record<number, Mark> = {};
  for (const r of rows) {
    out[r.person_id] = {
      sessionId: r.session_id,
      personId: r.person_id,
      status: r.status as Status,
      note: r.note ?? '',
    };
  }
  return out;
}

export async function setMark(
  sessionId: number,
  personId: number,
  status: Status,
  note = ''
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO marks (session_id, person_id, status, note) VALUES (?, ?, ?, ?)
     ON CONFLICT(session_id, person_id) DO UPDATE SET status = excluded.status, note = excluded.note`,
    [sessionId, personId, status, note]
  );
}

export async function setAllMarks(sessionId: number, groupId: number, status: Status): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO marks (session_id, person_id, status, note)
     SELECT ?, id, ?, '' FROM people WHERE group_id = ? AND active = 1
     ON CONFLICT(session_id, person_id) DO UPDATE SET status = excluded.status`,
    [sessionId, status, groupId]
  );
}

// ---------- stats / report ----------

export interface PersonTotals {
  person: Person;
  present: number;
  absent: number;
  late: number;
  excused: number;
  /** Sessions where this person had any mark. */
  marked: number;
  /** (present + late) / sessions in range, 0..100. */
  pct: number;
}

export interface GroupReport {
  group: Group;
  sessions: Session[]; // oldest first
  people: Person[];
  marks: Record<number, Record<number, Status>>; // sessionId -> personId -> status
  totals: PersonTotals[];
  avgPct: number;
}

export async function getGroupReport(
  groupId: number,
  fromDate?: string,
  toDate?: string
): Promise<GroupReport | null> {
  const db = await getDb();
  const group = await getGroup(groupId);
  if (!group) return null;
  const people = await getPeople(groupId, true);
  const sessRows = await db.getAllAsync<any>(
    `${SESSION_SELECT} WHERE s.group_id = ?
       ${fromDate ? 'AND s.date >= ?' : ''} ${toDate ? 'AND s.date <= ?' : ''}
     ORDER BY s.date ASC, s.id ASC`,
    [groupId, ...(fromDate ? [fromDate] : []), ...(toDate ? [toDate] : [])]
  );
  const sessions = sessRows.map(rowToSession);
  const ids = sessions.map((s) => s.id);
  const marks: Record<number, Record<number, Status>> = {};
  if (ids.length > 0) {
    const mrows = await db.getAllAsync<any>(
      `SELECT session_id, person_id, status FROM marks WHERE session_id IN (${ids
        .map(() => '?')
        .join(',')})`,
      ids
    );
    for (const m of mrows) {
      (marks[m.session_id] ??= {})[m.person_id] = m.status as Status;
    }
  }
  const totals: PersonTotals[] = people
    .filter((p) => p.active || ids.some((sid) => marks[sid]?.[p.id]))
    .map((p) => {
      const t = { person: p, present: 0, absent: 0, late: 0, excused: 0, marked: 0, pct: 0 };
      for (const sid of ids) {
        const st = marks[sid]?.[p.id];
        if (!st) continue;
        t.marked++;
        t[st]++;
      }
      const denom = sessions.length;
      t.pct = denom > 0 ? Math.round(((t.present + t.late) / denom) * 100) : 0;
      return t;
    });
  const avgPct =
    totals.length > 0 ? Math.round(totals.reduce((a, t) => a + t.pct, 0) / totals.length) : 0;
  return { group, sessions, people, marks, totals, avgPct };
}

export async function deleteAllData(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM marks; DELETE FROM sessions; DELETE FROM people; DELETE FROM groups;');
}

/** CSV export: one row per (session, person). */
export async function exportCsv(groupId: number): Promise<string> {
  const rep = await getGroupReport(groupId);
  if (!rep) return '';
  const q = (s: string) => '"' + s.replace(/"/g, '""') + '"';
  const lines = ['date,session,name,status'];
  for (const s of rep.sessions) {
    for (const p of rep.people) {
      const st = rep.marks[s.id]?.[p.id];
      if (!st) continue;
      lines.push([s.date, q(s.title), q(p.name), st].join(','));
    }
  }
  return lines.join('\r\n');
}

export function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

export function prettyDate(iso: string, withYear = true): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: withYear ? undefined : 'short',
    month: 'short',
    day: 'numeric',
    year: withYear ? 'numeric' : undefined,
  });
}
