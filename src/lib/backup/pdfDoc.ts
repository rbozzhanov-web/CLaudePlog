import { groupEntriesByMonth, isYearDivider } from '@/src/lib/groupEntries';
import { minutesToHHMM } from '@/src/lib/time';
import { BRAND } from '@/src/theme/brand';
import { FlightLogEntry } from '@/src/types/logbook';

/**
 * Escapes text that came from a PDF report or a pilot's own typing before it is interpolated into
 * the printed logbook. A stray `&` in a remark should print as `&`, not truncate the document.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cell(value: string | number | undefined, className = ''): string {
  const text = value === undefined || value === '' ? '' : escapeHtml(String(value));
  return `<td class="${className}">${text}</td>`;
}

/** Minutes render as blank rather than "00:00" so a column of zeroes doesn't drown the real times. */
function time(minutes: number): string {
  return minutes > 0 ? minutesToHHMM(minutes) : '';
}

function counter(value: number): string {
  return value > 0 ? String(value) : '';
}

function isSimulatorSession(entry: FlightLogEntry): boolean {
  return entry.simulatorMinutes > 0 && entry.totalTimeMinutes === 0;
}

export interface PrintedTotals {
  flightCount: number;
  totalMinutes: number;
  picMinutes: number;
  sicMinutes: number;
  dayMinutes: number;
  nightMinutes: number;
  instrumentMinutes: number;
  simulatorMinutes: number;
  simulatorCount: number;
  dayLandings: number;
  nightLandings: number;
}

/**
 * Totalled from the very rows being printed rather than from a separate query, so the summary can
 * never disagree with the table above it — the failure that would matter most in a document a
 * pilot might hand to an inspector.
 */
export function summarise(entries: FlightLogEntry[]): PrintedTotals {
  const totals: PrintedTotals = {
    flightCount: 0,
    totalMinutes: 0,
    picMinutes: 0,
    sicMinutes: 0,
    dayMinutes: 0,
    nightMinutes: 0,
    instrumentMinutes: 0,
    simulatorMinutes: 0,
    simulatorCount: 0,
    dayLandings: 0,
    nightLandings: 0,
  };

  for (const entry of entries) {
    if (isSimulatorSession(entry)) {
      totals.simulatorCount += 1;
    } else {
      totals.flightCount += 1;
    }
    totals.totalMinutes += entry.totalTimeMinutes;
    totals.picMinutes += entry.picMinutes;
    totals.sicMinutes += entry.sicMinutes;
    totals.dayMinutes += entry.dayMinutes;
    totals.nightMinutes += entry.nightMinutes;
    totals.instrumentMinutes += entry.actualInstrumentMinutes + entry.simulatedInstrumentMinutes;
    // Simulator time is summed but deliberately never folded into totalMinutes: it is not flight
    // time, and the airline's own report totals it apart.
    totals.simulatorMinutes += entry.simulatorMinutes;
    totals.dayLandings += entry.dayLandings;
    totals.nightLandings += entry.nightLandings;
  }

  return totals;
}

const COLUMNS = [
  'Date',
  'Flight',
  'From',
  'To',
  'Type',
  'Registration',
  'Out',
  'In',
  'Total',
  'PIC',
  'SIC',
  'Day',
  'Night',
  'Instr',
  'Sim',
  'Ldg D/N',
  'Pilot in command',
];

function entryRow(entry: FlightLogEntry): string {
  const simulator = isSimulatorSession(entry);

  return `<tr class="${simulator ? 'sim' : ''}">
    ${cell(entry.date, 'nowrap')}
    ${cell(simulator ? entry.simulatorType ?? 'SIM' : entry.flightNumber)}
    ${cell(entry.departureAirport)}
    ${cell(simulator ? '' : entry.arrivalAirport)}
    ${cell(entry.aircraftType)}
    ${cell(simulator ? '' : entry.aircraftRegistration)}
    ${cell(simulator ? '' : entry.timeOut, 'num')}
    ${cell(simulator ? '' : entry.timeIn, 'num')}
    ${cell(time(entry.totalTimeMinutes), 'num')}
    ${cell(time(entry.picMinutes), 'num')}
    ${cell(time(entry.sicMinutes), 'num')}
    ${cell(time(entry.dayMinutes), 'num')}
    ${cell(time(entry.nightMinutes), 'num')}
    ${cell(time(entry.actualInstrumentMinutes + entry.simulatedInstrumentMinutes), 'num')}
    ${cell(time(entry.simulatorMinutes), 'num')}
    ${cell(
      entry.dayLandings + entry.nightLandings > 0
        ? `${counter(entry.dayLandings) || '0'}/${counter(entry.nightLandings) || '0'}`
        : '',
      'num',
    )}
    ${cell(entry.pilotInCommandName)}
  </tr>`;
}

/**
 * A printable logbook: the same month sections and year totals the app shows on screen, laid out
 * for A4 landscape. This is the "show someone" document — restoring onto a new device goes
 * through the JSON backup instead.
 */
export function buildLogbookHtml(entries: FlightLogEntry[], generatedAt = new Date()): string {
  const sections = groupEntriesByMonth(entries);
  const totals = summarise(entries);

  const body = sections
    .map((section) => {
      const rows = section.data
        .map((row) =>
          isYearDivider(row)
            ? `<tr class="year"><td colspan="${COLUMNS.length}">${escapeHtml(row.yearHeader.year)} — ${
                row.yearHeader.flightCount
              } flights · ${minutesToHHMM(row.yearHeader.totalMinutes)}</td></tr>`
            : entryRow(row),
        )
        .join('\n');

      return `<tr class="month"><td colspan="${COLUMNS.length}">${escapeHtml(section.monthLabel)}
        <span class="month-total">${section.flightCount} · ${minutesToHHMM(section.totalMinutes)}</span>
      </td></tr>\n${rows}`;
    })
    .join('\n');

  const leadingYear = sections[0]?.leadingYearHeader;
  const leadingYearRow = leadingYear
    ? `<tr class="year"><td colspan="${COLUMNS.length}">${escapeHtml(leadingYear.year)} — ${
        leadingYear.flightCount
      } flights · ${minutesToHHMM(leadingYear.totalMinutes)}</td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Pilot Logbook</title>
<style>
  @page { margin: 12mm; }
  body { font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif; color: ${BRAND.navy}; margin: 0; }
  h1 { font-size: 18px; margin: 0 0 2px; letter-spacing: 0.5px; }
  .subtitle { font-size: 10px; color: #5A6577; margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 9px; }
  /* A real logbook runs to many pages: repeat the column headings on each one, and never split a
     flight or a month heading across a page break. */
  thead { display: table-header-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  tr.month td, tr.year td { break-after: avoid; page-break-after: avoid; }
  th { background: ${BRAND.navy}; color: #fff; text-align: left; padding: 5px 4px; font-weight: 600; }
  td { padding: 3px 4px; border-bottom: 0.5px solid #D8DEE7; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.nowrap { white-space: nowrap; }
  tr.month td { background: #EEF1F6; font-weight: 700; padding: 5px 4px; }
  tr.month .month-total { float: right; font-weight: 600; color: #5A6577; }
  tr.year td { background: #fff; border-bottom: 1.5px solid ${BRAND.gold}; font-size: 12px; font-weight: 800; padding: 10px 4px 4px; }
  tr.sim td { color: #5A6577; font-style: italic; }
  .totals { break-inside: avoid; page-break-inside: avoid; margin-top: 14px; border-top: 2px solid ${BRAND.gold}; padding-top: 8px; font-size: 11px; }
  .totals dl { display: flex; flex-wrap: wrap; margin: 0; gap: 4px 22px; }
  .totals div { min-width: 90px; }
  .totals dt { font-size: 9px; color: #5A6577; text-transform: uppercase; letter-spacing: 0.4px; }
  .totals dd { margin: 1px 0 0; font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }
</style>
</head>
<body>
  <h1>Pilot Logbook</h1>
  <p class="subtitle">Generated ${escapeHtml(generatedAt.toISOString().slice(0, 10))} · all times UTC · hours as HH:MM</p>
  <table>
    <thead><tr>${COLUMNS.map((column) => `<th>${column}</th>`).join('')}</tr></thead>
    <tbody>
      ${leadingYearRow}
      ${body}
    </tbody>
  </table>
  <div class="totals">
    <dl>
      <div><dt>Flights</dt><dd>${totals.flightCount}</dd></div>
      <div><dt>Total time</dt><dd>${minutesToHHMM(totals.totalMinutes)}</dd></div>
      <div><dt>PIC</dt><dd>${minutesToHHMM(totals.picMinutes)}</dd></div>
      <div><dt>SIC</dt><dd>${minutesToHHMM(totals.sicMinutes)}</dd></div>
      <div><dt>Day</dt><dd>${minutesToHHMM(totals.dayMinutes)}</dd></div>
      <div><dt>Night</dt><dd>${minutesToHHMM(totals.nightMinutes)}</dd></div>
      <div><dt>Instrument</dt><dd>${minutesToHHMM(totals.instrumentMinutes)}</dd></div>
      <div><dt>Landings D/N</dt><dd>${totals.dayLandings}/${totals.nightLandings}</dd></div>
      <div><dt>Simulator (${totals.simulatorCount})</dt><dd>${minutesToHHMM(totals.simulatorMinutes)}</dd></div>
    </dl>
  </div>
</body>
</html>`;
}
