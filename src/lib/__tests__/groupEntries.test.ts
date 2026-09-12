import { MonthSection, groupEntriesByMonth, isYearDivider } from '../groupEntries';
import { FlightLogEntry } from '@/src/types/logbook';

function entry(date: string, totalTimeMinutes: number, id = date + totalTimeMinutes): FlightLogEntry {
  return {
    id,
    date,
    departureAirport: 'UAAA',
    arrivalAirport: 'UACC',
    totalTimeMinutes,
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

function simulatorSession(date: string, simulatorMinutes: number): FlightLogEntry {
  return { ...entry(date, 0, `sim-${date}`), simulatorMinutes, simulatorType: 'VPTI' };
}

/** The year divider is a data row now, so tests read flights and dividers separately. */
function flightsOf(section: MonthSection) {
  return section.data.filter((row) => !isYearDivider(row));
}

/**
 * A year divider is placed at the end of the *preceding* month so it introduces its year rather
 * than following it; the newest year has no preceding month and rides on the first section.
 */
function yearDividerIntroducing(sections: MonthSection[], index: number) {
  if (index === 0) return sections[0].leadingYearHeader;
  return sections[index - 1].data.find(isYearDivider)?.yearHeader;
}

describe('groupEntriesByMonth', () => {
  it('returns nothing for an empty logbook', () => {
    expect(groupEntriesByMonth([])).toEqual([]);
  });

  it('groups a single month and sums its total', () => {
    const sections = groupEntriesByMonth([entry('2026-08-20', 150), entry('2026-08-02', 90)]);

    expect(sections).toHaveLength(1);
    expect(sections[0].key).toBe('2026-08');
    expect(sections[0].monthLabel).toBe('August 2026');
    expect(sections[0].flightCount).toBe(2);
    expect(sections[0].totalMinutes).toBe(240);
  });

  it('splits months and preserves the input order rather than re-sorting', () => {
    const sections = groupEntriesByMonth([
      entry('2026-08-20', 150),
      entry('2026-07-31', 60),
      entry('2026-07-01', 30),
    ]);

    expect(sections.map((s) => s.key)).toEqual(['2026-08', '2026-07']);
    expect(sections[1].totalMinutes).toBe(90);
    expect(flightsOf(sections[1]).map((e) => (isYearDivider(e) ? '' : e.date))).toEqual([
      '2026-07-31',
      '2026-07-01',
    ]);
  });

  it('marks the first section of each year with that year total', () => {
    const sections = groupEntriesByMonth([
      entry('2026-02-10', 100),
      entry('2026-01-10', 50),
      entry('2025-12-10', 200),
    ]);

    expect(sections.map((s) => s.key)).toEqual(['2026-02', '2026-01', '2025-12']);

    // First section of 2026 carries the whole year, not just its own month.
    expect(yearDividerIntroducing(sections, 0)).toEqual({ year: '2026', totalMinutes: 150, flightCount: 2 });
    // The second 2026 month gets no divider.
    expect(yearDividerIntroducing(sections, 1)).toBeUndefined();
    expect(yearDividerIntroducing(sections, 2)).toEqual({ year: '2025', totalMinutes: 200, flightCount: 1 });
  });

  it('handles every month name, including the December/January boundary', () => {
    const sections = groupEntriesByMonth([entry('2026-01-05', 10), entry('2025-12-31', 20)]);

    expect(sections.map((s) => s.monthLabel)).toEqual(['January 2026', 'December 2025']);
  });

  it('derives the month from the date string without a timezone round-trip', () => {
    // Parsed through Date in a negative-offset zone this would land in July.
    const sections = groupEntriesByMonth([entry('2026-08-01', 60)]);

    expect(sections[0].monthLabel).toBe('August 2026');
  });

  it('lists simulator sessions but does not count them as flights', () => {
    const sections = groupEntriesByMonth([
      entry('2026-03-20', 457),
      simulatorSession('2026-03-17', 360),
      simulatorSession('2026-03-05', 240),
    ]);

    expect(flightsOf(sections[0])).toHaveLength(3);
    expect(sections[0].flightCount).toBe(1);
    // Simulator time never enters the flight total.
    expect(sections[0].totalMinutes).toBe(457);
    expect(yearDividerIntroducing(sections, 0)).toEqual({ year: '2026', totalMinutes: 457, flightCount: 1 });
  });
});
