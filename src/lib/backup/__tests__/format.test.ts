import {
  BACKUP_FORMAT_VERSION,
  buildBackup,
  mergeBackup,
  parseBackup,
  serializeBackup,
} from '../format';
import { FlightLogEntry } from '@/src/types/logbook';

function entry(overrides: Partial<FlightLogEntry> = {}): FlightLogEntry {
  return {
    id: 'e1',
    date: '2018-04-23',
    departureAirport: 'UAAA',
    arrivalAirport: 'UACC',
    aircraftType: 'A320',
    aircraftRegistration: 'P4-KBE',
    timeOut: '03:15',
    timeIn: '05:00',
    totalTimeMinutes: 105,
    picMinutes: 0,
    sicMinutes: 105,
    dualReceivedMinutes: 0,
    dualGivenMinutes: 0,
    soloMinutes: 0,
    dayMinutes: 105,
    nightMinutes: 0,
    actualInstrumentMinutes: 0,
    simulatedInstrumentMinutes: 0,
    crossCountryMinutes: 0,
    simulatorMinutes: 0,
    dayTakeoffs: 1,
    nightTakeoffs: 0,
    dayLandings: 1,
    nightLandings: 0,
    instrumentApproaches: 0,
    pilotInCommandName: 'KISSELEV ALEXANDR',
    source: 'pdf_import',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('backup round trip', () => {
  it('restores every entry byte-for-byte, ids and timestamps included', () => {
    const entries = [entry(), entry({ id: 'e2', date: '2018-04-24', nightMinutes: 45, dayMinutes: 60 })];

    const result = parseBackup(serializeBackup(entries, '2026-08-25T10:00:00.000Z'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.entries).toEqual(entries);
    expect(result.backup.entryCount).toBe(2);
    expect(result.backup.exportedAt).toBe('2026-08-25T10:00:00.000Z');
  });

  it('records the count alongside the entries so a truncated file is obvious', () => {
    expect(buildBackup([entry()]).entryCount).toBe(1);
  });

  it('fills in a counter that predates the backup being written', () => {
    // A file written before simulatorMinutes existed must still restore, at zero rather than NaN.
    const { simulatorMinutes, ...older } = entry();
    const raw = JSON.stringify({
      app: 'pilot-logbook',
      formatVersion: 1,
      exportedAt: '2026-08-25T10:00:00.000Z',
      entryCount: 1,
      entries: [older],
    });

    const result = parseBackup(raw);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.entries[0].simulatorMinutes).toBe(0);
  });
});

describe('parseBackup rejections', () => {
  it('rejects a file that is not JSON', () => {
    const result = parseBackup('%PDF-1.4 not json at all');

    expect(result).toEqual({ ok: false, error: 'That file is not valid JSON.' });
  });

  it('rejects JSON that is not a Pilot Logbook backup', () => {
    const result = parseBackup(JSON.stringify({ some: 'other file' }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/not a Pilot Logbook backup/);
  });

  it('names the offending field when an entry is malformed', () => {
    const raw = JSON.stringify({
      app: 'pilot-logbook',
      formatVersion: 1,
      exportedAt: '2026-08-25T10:00:00.000Z',
      entryCount: 1,
      entries: [entry({ date: '23/04/2018' })],
    });

    const result = parseBackup(raw);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('entries.0.date');
  });

  it('refuses a backup from a newer app rather than importing part of it', () => {
    const raw = JSON.stringify({
      app: 'pilot-logbook',
      formatVersion: BACKUP_FORMAT_VERSION + 1,
      exportedAt: '2026-08-25T10:00:00.000Z',
      entryCount: 0,
      entries: [],
    });

    const result = parseBackup(raw);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/newer version of the app/);
  });
});

describe('mergeBackup', () => {
  it('adds entries the device does not have', () => {
    const result = mergeBackup([entry()], [entry({ id: 'e2' })]);

    expect(result).toMatchObject({ added: 1, updated: 0, unchanged: 0 });
    expect(result.merged).toHaveLength(2);
  });

  it('is idempotent — restoring the same file twice does not double the logbook', () => {
    const entries = [entry(), entry({ id: 'e2' })];

    const first = mergeBackup(entries, entries);
    const second = mergeBackup(first.merged, entries);

    expect(first.merged).toHaveLength(2);
    expect(second.merged).toHaveLength(2);
    expect(second).toMatchObject({ added: 0, updated: 0, unchanged: 2 });
  });

  it('updates an entry that changed, without touching the others', () => {
    const result = mergeBackup(
      [entry(), entry({ id: 'e2' })],
      [entry({ remarks: 'line check' })],
    );

    expect(result).toMatchObject({ added: 0, updated: 1, unchanged: 0 });
    expect(result.merged).toHaveLength(2);
    expect(result.merged.find((e) => e.id === 'e1')?.remarks).toBe('line check');
  });

  it('never drops a flight flown since the backup was taken', () => {
    const flownSince = entry({ id: 'later', date: '2026-08-24' });

    const result = mergeBackup([entry(), flownSince], [entry()]);

    expect(result.merged).toContainEqual(flownSince);
  });
});
