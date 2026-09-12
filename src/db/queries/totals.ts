import { and, gte, lte, sql } from 'drizzle-orm';

import { getDb } from '../client';
import { flightEntries } from '../schema';

export interface LogbookTotals {
  entryCount: number;
  totalMinutes: number;
  picMinutes: number;
  sicMinutes: number;
  dualReceivedMinutes: number;
  dualGivenMinutes: number;
  soloMinutes: number;
  dayMinutes: number;
  nightMinutes: number;
  instrumentMinutes: number; // actual + simulated
  crossCountryMinutes: number;
  /** Training-device time, kept out of totalMinutes — it is not flight time. */
  simulatorMinutes: number;
  dayLandings: number;
  nightLandings: number;
  instrumentApproaches: number;
}

const ZERO_TOTALS: LogbookTotals = {
  entryCount: 0,
  totalMinutes: 0,
  picMinutes: 0,
  sicMinutes: 0,
  dualReceivedMinutes: 0,
  dualGivenMinutes: 0,
  soloMinutes: 0,
  dayMinutes: 0,
  nightMinutes: 0,
  instrumentMinutes: 0,
  crossCountryMinutes: 0,
  simulatorMinutes: 0,
  dayLandings: 0,
  nightLandings: 0,
  instrumentApproaches: 0,
};

export async function getTotals(range?: { from?: string; to?: string }): Promise<LogbookTotals> {
  const conditions = [];
  if (range?.from) conditions.push(gte(flightEntries.date, range.from));
  if (range?.to) conditions.push(lte(flightEntries.date, range.to));

  const rows = await getDb()
    .select({
      entryCount: sql<number>`count(*)`,
      totalMinutes: sql<number>`coalesce(sum(${flightEntries.totalTimeMinutes}), 0)`,
      picMinutes: sql<number>`coalesce(sum(${flightEntries.picMinutes}), 0)`,
      sicMinutes: sql<number>`coalesce(sum(${flightEntries.sicMinutes}), 0)`,
      dualReceivedMinutes: sql<number>`coalesce(sum(${flightEntries.dualReceivedMinutes}), 0)`,
      dualGivenMinutes: sql<number>`coalesce(sum(${flightEntries.dualGivenMinutes}), 0)`,
      soloMinutes: sql<number>`coalesce(sum(${flightEntries.soloMinutes}), 0)`,
      dayMinutes: sql<number>`coalesce(sum(${flightEntries.dayMinutes}), 0)`,
      nightMinutes: sql<number>`coalesce(sum(${flightEntries.nightMinutes}), 0)`,
      instrumentMinutes: sql<number>`coalesce(sum(${flightEntries.actualInstrumentMinutes} + ${flightEntries.simulatedInstrumentMinutes}), 0)`,
      crossCountryMinutes: sql<number>`coalesce(sum(${flightEntries.crossCountryMinutes}), 0)`,
      simulatorMinutes: sql<number>`coalesce(sum(${flightEntries.simulatorMinutes}), 0)`,
      dayLandings: sql<number>`coalesce(sum(${flightEntries.dayLandings}), 0)`,
      nightLandings: sql<number>`coalesce(sum(${flightEntries.nightLandings}), 0)`,
      instrumentApproaches: sql<number>`coalesce(sum(${flightEntries.instrumentApproaches}), 0)`,
    })
    .from(flightEntries)
    .where(conditions.length ? and(...conditions) : undefined);

  return rows[0] ?? ZERO_TOTALS;
}
