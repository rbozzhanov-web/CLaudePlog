import { existsSync, readFileSync } from 'fs';

import { parseRoster } from '../parseRoster';
import { ExtractedPage } from '../types';

/**
 * End-to-end check against a real 16-page Air Astana flight-time report, extracted with the same
 * pdf.js build the app ships. The report's own totals line is the oracle:
 *
 *   Totals : | 1210:45 | 146 | 157 | 1210:45 | 167:00
 *              ^ Flt time                      ^ SYNTH. DEVICES
 *
 * The airline totals training-device time separately from flight time, and so must we — before
 * this was fixed the parser merged them into 1377:45, over-reporting flight hours by 167.
 *
 * The extracted page data is large and personal, so it isn't committed; the test skips when
 * absent and runs when the fixture is generated locally.
 */
const FIXTURE = '/tmp/realcheck/pages.json';
const describeIfFixture = existsSync(FIXTURE) ? describe : describe.skip;

describeIfFixture('the real Air Astana report', () => {
  const pages = JSON.parse(readFileSync(FIXTURE, 'utf8')) as ExtractedPage[];
  const result = parseRoster(pages);

  const flights = result.candidates.filter((c) => (c.fields.simulatorMinutes ?? 0) === 0);
  const simulators = result.candidates.filter((c) => (c.fields.simulatorMinutes ?? 0) > 0);
  const sum = (list: typeof result.candidates, pick: (c: (typeof result.candidates)[number]) => number) =>
    list.reduce((total, candidate) => total + pick(candidate), 0);

  it('separates flights from simulator sessions', () => {
    expect(flights).toHaveLength(286);
    expect(simulators).toHaveLength(39);
  });

  it('matches the report’s own Flt time total of 1210:45', () => {
    expect(sum(flights, (c) => c.fields.totalTimeMinutes ?? 0)).toBe(1210 * 60 + 45);
  });

  it('matches the report’s own SYNTH. DEVICES total of 167:00', () => {
    expect(sum(simulators, (c) => c.fields.simulatorMinutes ?? 0)).toBe(167 * 60);
  });

  it('never counts simulator time as flight time', () => {
    expect(sum(simulators, (c) => c.fields.totalTimeMinutes ?? 0)).toBe(0);
  });

  it('never treats a device code as a PIC name', () => {
    const deviceCodes = ['VPTI', 'PSIM', 'LPC', 'OPC', 'LOFT', 'LVO', 'RCRM', 'SUPI', 'SUPV', 'MTCV', 'GRT'];
    const names = result.candidates.map((c) => c.fields.pilotInCommandName).filter(Boolean);

    expect(names.filter((name) => deviceCodes.includes(name!))).toEqual([]);
    expect(simulators.every((c) => c.fields.pilotInCommandName === undefined)).toBe(true);
  });

  it('reads a PIC name for every real flight', () => {
    expect(flights.every((c) => (c.fields.pilotInCommandName ?? '').length > 0)).toBe(true);
  });

  it('resolves every airport code in the report to ICAO', () => {
    // Before the historical-code overrides, TSE (181 rows) and FRU passed through untouched.
    const codes = new Set(
      result.candidates.flatMap((c) => [c.fields.departureAirport, c.fields.arrivalAirport]),
    );

    expect(codes.size).toBeGreaterThan(0);
    expect([...codes].filter((code) => (code ?? '').length !== 4)).toEqual([]);
    // Astana specifically: the report writes TSE, the logbook must read UACC.
    expect(codes.has('UACC')).toBe(true);
    expect(codes.has('TSE')).toBe(false);
  });

  it('computes no day/night for simulator sessions', () => {
    expect(sum(simulators, (c) => (c.fields.dayMinutes ?? 0) + (c.fields.nightMinutes ?? 0))).toBe(0);
  });

  it('recognises every device type in the report', () => {
    const types = new Set(simulators.map((c) => c.fields.simulatorType));

    expect(types).toEqual(
      new Set(['PSIM', 'SUPI', 'OPC', 'VPTI', 'SUPV', 'RCRM', 'LPC', 'GRT', 'MTCV', 'LVO', 'LOFT']),
    );
  });
});
