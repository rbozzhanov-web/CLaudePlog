import { loadEntries } from '../webStorage';

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
  let entries = loadEntries();
  if (range?.from) entries = entries.filter((e) => e.date >= range.from!);
  if (range?.to) entries = entries.filter((e) => e.date <= range.to!);

  return entries.reduce<LogbookTotals>(
    (totals, entry) => ({
      entryCount: totals.entryCount + 1,
      totalMinutes: totals.totalMinutes + entry.totalTimeMinutes,
      picMinutes: totals.picMinutes + entry.picMinutes,
      sicMinutes: totals.sicMinutes + entry.sicMinutes,
      dualReceivedMinutes: totals.dualReceivedMinutes + entry.dualReceivedMinutes,
      dualGivenMinutes: totals.dualGivenMinutes + entry.dualGivenMinutes,
      soloMinutes: totals.soloMinutes + entry.soloMinutes,
      dayMinutes: totals.dayMinutes + entry.dayMinutes,
      nightMinutes: totals.nightMinutes + entry.nightMinutes,
      instrumentMinutes: totals.instrumentMinutes + entry.actualInstrumentMinutes + entry.simulatedInstrumentMinutes,
      crossCountryMinutes: totals.crossCountryMinutes + entry.crossCountryMinutes,
      // Coalesced because localStorage has no schema: entries saved before this field existed
      // carry `undefined`, and `number + undefined` is NaN, which would poison the whole reduce.
      simulatorMinutes: totals.simulatorMinutes + (entry.simulatorMinutes ?? 0),
      dayLandings: totals.dayLandings + entry.dayLandings,
      nightLandings: totals.nightLandings + entry.nightLandings,
      instrumentApproaches: totals.instrumentApproaches + entry.instrumentApproaches,
    }),
    ZERO_TOTALS,
  );
}
