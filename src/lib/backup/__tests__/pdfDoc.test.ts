import { buildLogbookHtml, summarise } from '../pdfDoc';
import { FlightLogEntry } from '@/src/types/logbook';

function entry(overrides: Partial<FlightLogEntry> = {}): FlightLogEntry {
  return {
    id: 'e1',
    date: '2018-04-23',
    departureAirport: 'UAAA',
    arrivalAirport: 'UACC',
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
    ...overrides,
  };
}

const simulatorSession = (overrides: Partial<FlightLogEntry> = {}) =>
  entry({
    id: 'sim1',
    totalTimeMinutes: 0,
    sicMinutes: 0,
    dayMinutes: 0,
    dayLandings: 0,
    dayTakeoffs: 0,
    simulatorMinutes: 240,
    simulatorType: 'VPTI',
    ...overrides,
  });

describe('summarise', () => {
  it('keeps simulator time out of flight time and counts the sessions separately', () => {
    const totals = summarise([entry(), simulatorSession()]);

    expect(totals.flightCount).toBe(1);
    expect(totals.totalMinutes).toBe(105);
    expect(totals.simulatorCount).toBe(1);
    expect(totals.simulatorMinutes).toBe(240);
  });

  it('combines actual and simulated instrument time into one figure', () => {
    const totals = summarise([entry({ actualInstrumentMinutes: 20, simulatedInstrumentMinutes: 10 })]);

    expect(totals.instrumentMinutes).toBe(30);
  });

  it('totals an empty logbook to zero rather than NaN', () => {
    expect(summarise([])).toMatchObject({ flightCount: 0, totalMinutes: 0, simulatorMinutes: 0 });
  });
});

describe('buildLogbookHtml', () => {
  const html = buildLogbookHtml(
    [entry({ date: '2018-04-24', nightMinutes: 45, dayMinutes: 60 }), entry(), simulatorSession({ date: '2018-03-02' })],
    new Date('2026-08-25T00:00:00.000Z'),
  );

  it('prints the grand total, and it is the sum of the rows above it', () => {
    // 105 + 105 flight minutes; the 240 simulator minutes must not be in there.
    expect(html).toContain('<dd>03:30</dd>');
    expect(html).toContain('<dt>Simulator (1)</dt><dd>04:00</dd>');
  });

  it('groups into months with a year rule, the same as the screen', () => {
    expect(html).toContain('April 2018');
    expect(html).toContain('March 2018');
    expect(html).toContain('2018 — 2 flights');
  });

  it('escapes text that came from a report rather than letting it break the document', () => {
    const withMarkup = buildLogbookHtml([entry({ pilotInCommandName: 'SMITH & <b>JONES</b>' })]);

    expect(withMarkup).toContain('SMITH &amp; &lt;b&gt;JONES&lt;/b&gt;');
    expect(withMarkup).not.toContain('<b>JONES</b>');
  });

  it('renders an empty logbook as a valid document rather than failing', () => {
    const empty = buildLogbookHtml([]);

    expect(empty).toContain('<dt>Flights</dt><dd>0</dd>');
    expect(empty).toContain('</html>');
  });
});
