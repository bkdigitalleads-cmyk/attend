/**
 * Attendance report PDF, generated on-device with expo-print.
 * Page 1: summary per person (present / absent / late / excused / %).
 * Page 2+: the register grid, people down the side, sessions across the top,
 * P / A / L / E in each cell. Styled like the sign-in sheet a school office,
 * league, or church already knows how to read.
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getGroupReport, GroupReport, STATUS_SHORT, prettyDate } from './db';
import { Settings } from './state';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const DEFAULTS: Settings = { lockEnabled: false, orgName: '', leaderName: '' };

async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem('attend.settings.v1');
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    // fall through
  }
  return { ...DEFAULTS };
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${m}/${d}`;
}

export function buildReportHtml(rep: GroupReport, settings: Settings): string {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const range =
    rep.sessions.length > 0
      ? `${prettyDate(rep.sessions[0].date)} to ${prettyDate(rep.sessions[rep.sessions.length - 1].date)}`
      : 'No sessions yet';

  const summaryRows = rep.totals
    .map(
      (t) => `
    <tr>
      <td>${esc(t.person.name)}${t.person.active ? '' : ' <span class="inactive">(inactive)</span>'}</td>
      <td class="num">${t.present}</td>
      <td class="num">${t.late}</td>
      <td class="num">${t.absent}</td>
      <td class="num">${t.excused}</td>
      <td class="num"><b>${t.pct}%</b></td>
    </tr>`
    )
    .join('');

  // Register grid, chunked so wide groups still fit on landscape letter.
  const PER_PAGE = 18;
  const chunks: typeof rep.sessions[] = [];
  for (let i = 0; i < rep.sessions.length; i += PER_PAGE) {
    chunks.push(rep.sessions.slice(i, i + PER_PAGE));
  }
  const grids = chunks
    .map((sess) => {
      const head = sess.map((s) => `<th class="d">${shortDate(s.date)}</th>`).join('');
      const body = rep.totals
        .map((t) => {
          const cells = sess
            .map((s) => {
              const st = rep.marks[s.id]?.[t.person.id];
              return `<td class="c ${st ?? 'none'}">${st ? STATUS_SHORT[st] : '·'}</td>`;
            })
            .join('');
          return `<tr><td class="n">${esc(t.person.name)}</td>${cells}</tr>`;
        })
        .join('');
      return `<table class="grid"><tr><th class="n">Name</th>${head}</tr>${body}</table>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  @page { size: letter landscape; margin: 28px; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #141b2e; margin: 0; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  .sub { color: #4e5872; font-size: 12px; margin-bottom: 10px; }
  .summary { display: flex; gap: 10px; margin: 10px 0 12px; }
  .box { flex: 1; background: #eef1f8; border: 1px solid #d9deea; border-radius: 8px; padding: 8px 12px; }
  .box .v { font-size: 18px; font-weight: 700; }
  .box .l { font-size: 10px; color: #4e5872; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; color: #4e5872; border-bottom: 2px solid #1f3a93; padding: 4px 6px; }
  td { border-bottom: 1px solid #e2e6f0; padding: 5px 6px; font-size: 11px; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  .inactive { color: #8b94ab; font-size: 10px; }
  h2 { font-size: 13px; margin: 18px 0 2px; color: #1f3a93; }
  .grid { page-break-inside: auto; }
  .grid th.d, .grid td.c { text-align: center; width: 34px; font-size: 10px; padding: 4px 2px; }
  .grid td.n, .grid th.n { width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .grid td.present { color: #1e8e5a; font-weight: 700; }
  .grid td.late { color: #d08a0b; font-weight: 700; }
  .grid td.absent { color: #c0392b; font-weight: 700; }
  .grid td.excused { color: #4e5872; }
  .grid td.none { color: #c3c9d9; }
  .legend { font-size: 10px; color: #4e5872; margin-top: 6px; }
  .sig { display: flex; gap: 40px; margin-top: 30px; width: 60%; }
  .sig div { flex: 1; border-top: 1px solid #141b2e; padding-top: 4px; font-size: 10px; color: #4e5872; }
  .footer { margin-top: 18px; color: #8b94ab; font-size: 9px; text-align: center; }
</style></head>
<body>
  <h1>Attendance Report: ${esc(rep.group.name)}${rep.group.detail ? ` <span style="font-weight:400;color:#4e5872">· ${esc(rep.group.detail)}</span>` : ''}</h1>
  <div class="sub">${settings.orgName ? esc(settings.orgName) + ' · ' : ''}${range} · Generated ${today}</div>
  <div class="summary">
    <div class="box"><div class="v">${rep.sessions.length}</div><div class="l">sessions</div></div>
    <div class="box"><div class="v">${rep.totals.length}</div><div class="l">people</div></div>
    <div class="box"><div class="v">${rep.avgPct}%</div><div class="l">average attendance</div></div>
  </div>
  <table>
    <tr><th>Name</th><th class="num">Present</th><th class="num">Late</th><th class="num">Absent</th><th class="num">Excused</th><th class="num">Attendance</th></tr>
    ${summaryRows}
  </table>
  ${rep.sessions.length > 0 ? `<h2>Register</h2>${grids}<div class="legend">P present · L late · A absent · E excused · dot means not marked</div>` : ''}
  <div class="sig">
    <div>${settings.leaderName ? esc(settings.leaderName) + ' — ' : ''}Teacher / coach signature</div>
    <div>Date</div>
  </div>
  <div class="footer">Recorded with Attendance Tracker: Check In for iPhone. All data stays on the device.</div>
</body></html>`;
}

export async function generateAndSharePdf(groupId: number): Promise<void> {
  const rep = await getGroupReport(groupId);
  if (!rep) throw new Error('Group not found');
  const settings = await loadSettings();
  const html = buildReportHtml(rep, settings);
  const { uri } = await Print.printToFileAsync({ html, width: 792, height: 612 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Attendance report',
      UTI: 'com.adobe.pdf',
    });
  }
}
