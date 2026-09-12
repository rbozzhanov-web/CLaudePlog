import { groupEntriesByMonth } from '../groupEntries';
import { filterByYear, findNearestEntry, listYears } from '../logbookNavigation';
import { FlightLogEntry } from '@/src/types/logbook';

function entry(date: string): FlightLogEntry {
  return {
    id: date,
    date,
    departureAirport: 'UAAA',
    arrivalAirport: 'UACC',
    totalTimeMinutes: 105,
    picMinutes: 0,
    sicMinutes: 0,
    dualReceivedMinutes: 0,
    dualGivenMinutes: 0,
    soloMinutes: 0,
    dayMinutes: 0,
    nightMinutes: 0,
    actualInstrumentMinutes: 0,
    simulatedInstrumentMinutes: 0,
    crossCountryMinutes: 0,
    simulatorMinutes: 0,
    dayTakeoffs: 0,
    nightTakeoffs: 0,
    dayLandings: 0,
    nightLandings: 0,
    instrumentApproaches: 0,
    source: 'manual',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

// Newest first, matching what listEntries() returns.
const logbook = [entry('2026-03-10'), entry('2026-01-20'), entry('2025-11-05'), entry('2025-02-01')];

describe('listYears', () => {
  it('returns the years actually flown, newest first', () => {
    expect(listYears(logbook)).toEqual(['2026', '2025']);
  });

  it('returns nothing for an empty logbook', () => {
    expect(listYears([])).toEqual([]);
  });
});

describe('filterByYear', () => {
  it('keeps only that year', () => {
    expect(filterByYear(logbook, '2025').map((e) => e.date)).toEqual(['2025-11-05', '2025-02-01']);
  });

  it('treats no year as "all years" and returns the same array', () => {
    expect(filterByYear(logbook, undefined)).toBe(logbook);
  });
});

describe('findNearestEntry', () => {
  const sections = groupEntriesByMonth(logbook);

  it('lands on an exact match', () => {
    // 2025-11-05 is the only row of the third month section.
    expect(findNearestEntry(sections, '2025-11-05')).toEqual({ sectionIndex: 2, rowIndex: 0 });
  });

  it('prefers the closest flight on or before the date', () => {
    // Between 2026-01-20 and 2026-03-10 — the pilot means the part of the book around then, so
    // the flight that had already happened wins over the one still ahead.
    expect(findNearestEntry(sections, '2026-02-15')).toEqual({ sectionIndex: 1, rowIndex: 0 });
  });

  it('falls back to the closest flight after a date that precedes the whole logbook', () => {
    expect(findNearestEntry(sections, '2020-01-01')).toEqual({ sectionIndex: 3, rowIndex: 0 });
  });

  it('returns nothing for an empty logbook', () => {
    expect(findNearestEntry([], '2026-01-01')).toBeUndefined();
  });

  it('never lands on a year divider', () => {
    // The 2025 divider is appended to the end of the January 2026 section, so a naive scan could
    // return it for a date in late 2025.
    const location = findNearestEntry(sections, '2025-12-31')!;
    const row = sections[location.sectionIndex].data[location.rowIndex];

    expect(row).toHaveProperty('date', '2025-11-05');
  });
});
