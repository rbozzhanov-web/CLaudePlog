import { calculateDayNight } from '../nightCalc';
import { isNight, solarElevationDegrees } from '../sunPosition';

// Reference civil-twilight instants for London Heathrow (51.4706, -0.4619) on 2026-03-15,
// taken from suncalc's own getTimes() dawn/dusk fields (civil twilight boundary). These verify
// our -6°-elevation threshold and isNight() wrapper against the library's own published events,
// independent of any of the app's higher-level logic.
const LHR = { lat: 51.4706, lon: -0.4619 };
const DAWN_UTC = new Date('2026-03-15T05:42:57.023Z');
const DUSK_UTC = new Date('2026-03-15T18:39:38.290Z');

describe('sunPosition.isNight', () => {
  it('is night just before dawn (civil twilight start) and day just after', () => {
    expect(isNight(new Date(DAWN_UTC.getTime() - 60_000), LHR)).toBe(true);
    expect(isNight(new Date(DAWN_UTC.getTime() + 60_000), LHR)).toBe(false);
  });

  it('is day just before dusk (civil twilight end) and night just after', () => {
    expect(isNight(new Date(DUSK_UTC.getTime() - 60_000), LHR)).toBe(false);
    expect(isNight(new Date(DUSK_UTC.getTime() + 60_000), LHR)).toBe(true);
  });

  it('reports elevation below -6 degrees exactly when isNight is true', () => {
    const midnight = new Date('2026-03-15T00:00:00Z');
    expect(solarElevationDegrees(midnight, LHR)).toBeLessThan(-6);
    expect(isNight(midnight, LHR)).toBe(true);
  });
});

// All fixtures below are real rows from the user's Air Astana flight-time report (Jul 2026).
// Cross-checking the report's raw arrival-minus-departure clock difference against its own
// "Flt time" column confirms these times are UTC/Zulu, which is what calculateDayNight expects.
describe('calculateDayNight (real Air Astana sample rows)', () => {
  it('classifies an all-daylight sector as day takeoff and day landing', () => {
    const result = calculateDayNight({
      date: '2026-07-02',
      departureAirport: 'NQZ',
      arrivalAirport: 'FRA',
      departureTime: '07:04',
      totalTimeMinutes: 7 * 60 + 37,
    });
    expect(result).toBeDefined();
    expect(result!.nightTakeoffs).toBe(0);
    expect(result!.dayTakeoffs).toBe(1);
    expect(result!.nightLandings).toBe(0);
    expect(result!.dayLandings).toBe(1);
    expect(result!.nightMinutes).toBe(0);
  });

  it('classifies a night departure with a daylight arrival correctly (report flags this as day-only)', () => {
    // The report's own TOFF/LND flags do not mark this sector as night at all — this is exactly
    // the discrepancy the user reported, confirming why night status must be computed, not parsed.
    const result = calculateDayNight({
      date: '2026-07-16',
      departureAirport: 'ALA',
      arrivalAirport: 'ICN',
      departureTime: '19:02',
      totalTimeMinutes: 5 * 60 + 29,
    });
    expect(result).toBeDefined();
    expect(result!.nightTakeoffs).toBe(1);
    expect(result!.nightLandings).toBe(0);
    expect(result!.nightMinutes).toBeGreaterThan(0);
  });

  it('classifies a day departure with a night landing correctly', () => {
    const result = calculateDayNight({
      date: '2026-07-24',
      departureAirport: 'NQZ',
      arrivalAirport: 'ALA',
      departureTime: '14:48',
      totalTimeMinutes: 1 * 60 + 53,
    });
    expect(result).toBeDefined();
    expect(result!.dayTakeoffs).toBe(1);
    expect(result!.nightLandings).toBe(1);
    // Fine-grained (5s step) reference simulation of this exact sector gives ~68.4 night minutes
    // out of 113; a 1-minute sampling step should land within a couple of minutes of that.
    expect(result!.nightMinutes).toBeGreaterThanOrEqual(65);
    expect(result!.nightMinutes).toBeLessThanOrEqual(72);
    expect(result!.dayMinutes + result!.nightMinutes).toBe(113);
  });

  it('classifies an all-night sector as night takeoff and night landing', () => {
    const result = calculateDayNight({
      date: '2026-07-30',
      departureAirport: 'ALA',
      arrivalAirport: 'NQZ',
      departureTime: '16:04',
      totalTimeMinutes: 1 * 60 + 45,
    });
    expect(result).toBeDefined();
    expect(result!.nightTakeoffs).toBe(1);
    expect(result!.nightLandings).toBe(1);
    expect(result!.nightMinutes).toBe(105);
    expect(result!.dayMinutes).toBe(0);
  });

  it('handles a same-airport local flight (zero great-circle distance) without error', () => {
    const result = calculateDayNight({
      date: '2026-07-19',
      departureAirport: 'ALA',
      arrivalAirport: 'ALA',
      departureTime: '12:02',
      totalTimeMinutes: 26,
    });
    expect(result).toBeDefined();
    expect(result!.dayTakeoffs).toBe(1);
    expect(result!.dayLandings).toBe(1);
    expect(result!.nightMinutes).toBe(0);
  });

  it('returns undefined when an airport code cannot be resolved', () => {
    const result = calculateDayNight({
      date: '2026-07-02',
      departureAirport: 'ZZZ',
      arrivalAirport: 'FRA',
      departureTime: '07:04',
      totalTimeMinutes: 60,
    });
    expect(result).toBeUndefined();
  });

  describe('5-minute rounding', () => {
    // A spread of real routes and departure times, chosen to land on a mix of day, night and
    // mixed flights rather than to hit any particular rounded value.
    const cases = [
      { date: '2026-01-15', from: 'ALA', to: 'FRA', time: '02:13', minutes: 457 },
      { date: '2026-06-21', from: 'NQZ', to: 'DXB', time: '17:47', minutes: 263 },
      { date: '2026-11-03', from: 'TSE', to: 'ALA', time: '05:31', minutes: 97 },
      { date: '2026-03-08', from: 'ALA', to: 'UACC', time: '22:09', minutes: 105 },
      { date: '2026-09-30', from: 'FRU', to: 'ALA', time: '12:41', minutes: 41 },
    ];

    it.each(cases)('rounds a mixed day/night flight to a multiple of 5 ($from→$to $time)', (c) => {
      const result = calculateDayNight({
        date: c.date,
        departureAirport: c.from,
        arrivalAirport: c.to,
        departureTime: c.time,
        totalTimeMinutes: c.minutes,
      });

      expect(result).toBeDefined();
      // A flight flown entirely in one condition keeps its exact block time: rounding unbroken
      // night down would invent daylight that never happened.
      const isSingleCondition =
        result!.nightMinutes === 0 || result!.nightMinutes === c.minutes;
      if (!isSingleCondition) expect(result!.nightMinutes % 5).toBe(0);
    });

    it('keeps an entirely-night flight exact rather than rounding it', () => {
      // Astana→Dubai departing 17:47Z in midsummer is unbroken night, 263 minutes.
      const result = calculateDayNight({
        date: '2026-06-21',
        departureAirport: 'NQZ',
        arrivalAirport: 'DXB',
        departureTime: '17:47',
        totalTimeMinutes: 263,
      });

      expect(result!.nightMinutes).toBe(263);
      expect(result!.dayMinutes).toBe(0);
    });

    it.each(cases)('keeps day + night equal to block time ($from→$to $time)', (c) => {
      const result = calculateDayNight({
        date: c.date,
        departureAirport: c.from,
        arrivalAirport: c.to,
        departureTime: c.time,
        totalTimeMinutes: c.minutes,
      });

      // The column that matters: a logbook whose day and night don't add up to the total is
      // wrong on its face, so day is derived from the rounded night rather than rounded itself.
      expect(result!.dayMinutes + result!.nightMinutes).toBe(c.minutes);
      expect(result!.dayMinutes).toBeGreaterThanOrEqual(0);
      expect(result!.nightMinutes).toBeGreaterThanOrEqual(0);
    });

    it('never rounds a fully-night flight past its own block time', () => {
      // Deep midwinter, high latitude, departing at night: essentially all night.
      const result = calculateDayNight({
        date: '2026-12-21',
        departureAirport: 'UACC',
        arrivalAirport: 'UAAA',
        departureTime: '19:00',
        totalTimeMinutes: 97,
      });

      expect(result!.nightMinutes).toBeLessThanOrEqual(97);
      expect(result!.dayMinutes).toBeGreaterThanOrEqual(0);
      expect(result!.dayMinutes + result!.nightMinutes).toBe(97);
    });
  });
});
