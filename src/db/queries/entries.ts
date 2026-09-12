import { and, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { collectCrewNames } from '@/src/lib/crewNames';
import { FlightLogEntry } from '@/src/types/logbook';
import { getDb } from '../client';
import { bumpDataVersion } from '../dataVersion';
import { flightEntries } from '../schema';

export type NewFlightLogEntry = Omit<FlightLogEntry, 'id' | 'createdAt' | 'updatedAt'>;

function toRow(entry: NewFlightLogEntry, id: string, now: string) {
  return {
    id,
    date: entry.date,
    flightNumber: entry.flightNumber ?? null,
    departureAirport: entry.departureAirport,
    arrivalAirport: entry.arrivalAirport,
    aircraftId: entry.aircraftId ?? null,
    aircraftType: entry.aircraftType ?? null,
    aircraftRegistration: entry.aircraftRegistration ?? null,
    timeOut: entry.timeOut ?? null,
    timeOff: entry.timeOff ?? null,
    timeOn: entry.timeOn ?? null,
    timeIn: entry.timeIn ?? null,
    totalTimeMinutes: entry.totalTimeMinutes,
    picMinutes: entry.picMinutes,
    sicMinutes: entry.sicMinutes,
    dualReceivedMinutes: entry.dualReceivedMinutes,
    dualGivenMinutes: entry.dualGivenMinutes,
    soloMinutes: entry.soloMinutes,
    dayMinutes: entry.dayMinutes,
    nightMinutes: entry.nightMinutes,
    actualInstrumentMinutes: entry.actualInstrumentMinutes,
    simulatedInstrumentMinutes: entry.simulatedInstrumentMinutes,
    crossCountryMinutes: entry.crossCountryMinutes,
    simulatorMinutes: entry.simulatorMinutes,
    simulatorType: entry.simulatorType ?? null,
    dayTakeoffs: entry.dayTakeoffs,
    nightTakeoffs: entry.nightTakeoffs,
    dayLandings: entry.dayLandings,
    nightLandings: entry.nightLandings,
    instrumentApproaches: entry.instrumentApproaches,
    pilotInCommandName: entry.pilotInCommandName ?? null,
    secondInCommandName: entry.secondInCommandName ?? null,
    otherCrewNames: entry.otherCrewNames ?? null,
    remarks: entry.remarks ?? null,
    source: entry.source,
    importBatchId: entry.importBatchId ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

function fromRow(row: typeof flightEntries.$inferSelect): FlightLogEntry {
  return {
    id: row.id,
    date: row.date,
    flightNumber: row.flightNumber ?? undefined,
    departureAirport: row.departureAirport,
    arrivalAirport: row.arrivalAirport,
    aircraftId: row.aircraftId ?? undefined,
    aircraftType: row.aircraftType ?? undefined,
    aircraftRegistration: row.aircraftRegistration ?? undefined,
    timeOut: row.timeOut ?? undefined,
    timeOff: row.timeOff ?? undefined,
    timeOn: row.timeOn ?? undefined,
    timeIn: row.timeIn ?? undefined,
    totalTimeMinutes: row.totalTimeMinutes,
    picMinutes: row.picMinutes,
    sicMinutes: row.sicMinutes,
    dualReceivedMinutes: row.dualReceivedMinutes,
    dualGivenMinutes: row.dualGivenMinutes,
    soloMinutes: row.soloMinutes,
    dayMinutes: row.dayMinutes,
    nightMinutes: row.nightMinutes,
    actualInstrumentMinutes: row.actualInstrumentMinutes,
    simulatedInstrumentMinutes: row.simulatedInstrumentMinutes,
    crossCountryMinutes: row.crossCountryMinutes,
    simulatorMinutes: row.simulatorMinutes,
    simulatorType: row.simulatorType ?? undefined,
    dayTakeoffs: row.dayTakeoffs,
    nightTakeoffs: row.nightTakeoffs,
    dayLandings: row.dayLandings,
    nightLandings: row.nightLandings,
    instrumentApproaches: row.instrumentApproaches,
    pilotInCommandName: row.pilotInCommandName ?? undefined,
    secondInCommandName: row.secondInCommandName ?? undefined,
    otherCrewNames: row.otherCrewNames ?? undefined,
    remarks: row.remarks ?? undefined,
    source: row.source as FlightLogEntry['source'],
    importBatchId: row.importBatchId ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listEntries(range?: { from?: string; to?: string }): Promise<FlightLogEntry[]> {
  const conditions = [];
  if (range?.from) conditions.push(gte(flightEntries.date, range.from));
  if (range?.to) conditions.push(lte(flightEntries.date, range.to));

  const rows = await getDb()
    .select()
    .from(flightEntries)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(flightEntries.date), desc(flightEntries.timeOut));

  return rows.map(fromRow);
}

export async function getEntry(id: string): Promise<FlightLogEntry | undefined> {
  const rows = await getDb().select().from(flightEntries).where(eq(flightEntries.id, id)).limit(1);
  return rows[0] ? fromRow(rows[0]) : undefined;
}

export async function createEntry(entry: NewFlightLogEntry): Promise<FlightLogEntry> {
  const id = uuidv4();
  const now = new Date().toISOString();
  const row = toRow(entry, id, now);
  await getDb().insert(flightEntries).values(row);
  bumpDataVersion();
  return fromRow(row);
}

/** Bulk insert used by the PDF import commit step; every row shares the caller-supplied importBatchId. */
export async function createEntries(entries: NewFlightLogEntry[]): Promise<FlightLogEntry[]> {
  const now = new Date().toISOString();
  const rows = entries.map((entry) => toRow(entry, uuidv4(), now));
  if (rows.length === 0) return [];
  await getDb().insert(flightEntries).values(rows);
  bumpDataVersion();
  return rows.map(fromRow);
}

export async function updateEntry(
  id: string,
  entry: NewFlightLogEntry,
): Promise<FlightLogEntry> {
  const existing = await getEntry(id);
  const now = new Date().toISOString();
  const row = toRow(entry, id, existing?.createdAt ?? now);
  row.updatedAt = now;
  await getDb().update(flightEntries).set(row).where(eq(flightEntries.id, id));
  bumpDataVersion();
  return fromRow(row);
}

export async function deleteEntry(id: string): Promise<void> {
  await getDb().delete(flightEntries).where(eq(flightEntries.id, id));
  bumpDataVersion();
}

export async function deleteImportBatch(importBatchId: string): Promise<void> {
  await getDb().delete(flightEntries).where(eq(flightEntries.importBatchId, importBatchId));
  bumpDataVersion();
}

export async function listImportBatches(): Promise<{ importBatchId: string; count: number; date: string }[]> {
  const rows = await getDb()
    .select()
    .from(flightEntries)
    .where(eq(flightEntries.source, 'pdf_import'));

  const batches = new Map<string, { count: number; date: string }>();
  for (const row of rows) {
    if (!row.importBatchId) continue;
    const existing = batches.get(row.importBatchId);
    if (existing) {
      existing.count += 1;
      if (row.createdAt > existing.date) existing.date = row.createdAt;
    } else {
      batches.set(row.importBatchId, { count: 1, date: row.createdAt });
    }
  }

  return Array.from(batches.entries())
    .map(([importBatchId, value]) => ({ importBatchId, ...value }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/**
 * Every crew name already in the logbook, most-flown-with first, for the entry form's suggestions.
 *
 * Only the three name columns are selected — there is no index on them, so this is a full scan,
 * and there is no reason to drag 35 columns through it.
 */
export async function listCrewNames(): Promise<string[]> {
  const rows = await getDb()
    .select({
      pilotInCommandName: flightEntries.pilotInCommandName,
      secondInCommandName: flightEntries.secondInCommandName,
      otherCrewNames: flightEntries.otherCrewNames,
    })
    .from(flightEntries);

  return collectCrewNames(rows);
}

/**
 * SQLite caps the parameters in one statement; at ~35 columns a row this stays comfortably under
 * even the old 999-variable limit's modern successor.
 */
const RESTORE_CHUNK_SIZE = 100;

function toRestoredRow(entry: FlightLogEntry) {
  // Unlike createEntries, the id and both timestamps come from the backup: a restore has to be
  // idempotent, and regenerating ids would turn every restore into a duplicated logbook.
  const row = toRow(entry, entry.id, entry.createdAt);
  row.updatedAt = entry.updatedAt;
  return row;
}

/**
 * Writes backup entries over whatever shares their id, leaving every other row alone.
 *
 * Delete-then-insert rather than an upsert with 35 explicit setters: the effect is the same and
 * the statement cannot silently miss a column added later.
 */
export async function restoreEntries(entries: FlightLogEntry[]): Promise<void> {
  if (entries.length === 0) return;

  for (let start = 0; start < entries.length; start += RESTORE_CHUNK_SIZE) {
    const chunk = entries.slice(start, start + RESTORE_CHUNK_SIZE);
    await getDb()
      .delete(flightEntries)
      .where(inArray(flightEntries.id, chunk.map((entry) => entry.id)));
    await getDb().insert(flightEntries).values(chunk.map(toRestoredRow));
  }

  bumpDataVersion();
}

/** The destructive restore: the backup becomes the whole logbook. Always confirmed by the caller. */
export async function replaceAllEntries(entries: FlightLogEntry[]): Promise<void> {
  await getDb().delete(flightEntries);

  for (let start = 0; start < entries.length; start += RESTORE_CHUNK_SIZE) {
    const chunk = entries.slice(start, start + RESTORE_CHUNK_SIZE);
    await getDb().insert(flightEntries).values(chunk.map(toRestoredRow));
  }

  bumpDataVersion();
}
