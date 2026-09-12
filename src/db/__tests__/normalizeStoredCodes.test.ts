import { findEntriesNeedingCodeFix } from '../normalizeStoredCodes';
import { FlightLogEntry } from '@/src/types/logbook';

function entry(departureAirport: string, arrivalAirport: string, id = `${departureAirport}${arrivalAirport}`): FlightLogEntry {
  return {
    id,
    date: '2018-04-23',
    departureAirport,
    arrivalAirport,
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
    source: 'pdf_import',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('findEntriesNeedingCodeFix', () => {
  it('upgrades entries stored under a retired code', () => {
    // Exactly the case the user hit: 181 rows imported as TSE before the mapping existed.
    const changes = findEntriesNeedingCodeFix([entry('ALA', 'TSE')]);

    expect(changes).toHaveLength(1);
    expect(changes[0].departureAirport).toBe('UAAA');
    expect(changes[0].arrivalAirport).toBe('UACC');
  });

  it('leaves entries that are already canonical alone, so a clean logbook writes nothing', () => {
    expect(findEntriesNeedingCodeFix([entry('UAAA', 'UACC')])).toEqual([]);
  });

  it('keeps an unresolvable code exactly as the pilot flew it', () => {
    const changes = findEntriesNeedingCodeFix([entry('ZZZ', 'TSE')]);

    expect(changes).toHaveLength(1);
    expect(changes[0].departureAirport).toBe('ZZZ');
    expect(changes[0].arrivalAirport).toBe('UACC');
  });

  it('reports nothing when every code is unknown, rather than rewriting them', () => {
    expect(findEntriesNeedingCodeFix([entry('ZZZ', 'QQQ')])).toEqual([]);
  });

  it('is idempotent — a second pass over fixed entries finds nothing', () => {
    const first = findEntriesNeedingCodeFix([entry('ALA', 'TSE')]);
    const fixed: FlightLogEntry[] = first.map((change) => ({
      ...change.entry,
      departureAirport: change.departureAirport,
      arrivalAirport: change.arrivalAirport,
    }));

    expect(findEntriesNeedingCodeFix(fixed)).toEqual([]);
  });
});
