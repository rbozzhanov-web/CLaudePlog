import { collectCrewNames, filterCrewNames } from '../crewNames';
import { FlightLogEntry } from '@/src/types/logbook';

function entry(crew: Partial<FlightLogEntry>): FlightLogEntry {
  return {
    id: Math.random().toString(),
    date: '2026-01-01',
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
    ...crew,
  };
}

describe('collectCrewNames', () => {
  it('orders by how often the pilot flew with them, not alphabetically', () => {
    const names = collectCrewNames([
      entry({ pilotInCommandName: 'ZHUMABEKOV ALI' }),
      entry({ pilotInCommandName: 'KISSELEV ALEXANDR' }),
      entry({ pilotInCommandName: 'KISSELEV ALEXANDR' }),
    ]);

    expect(names).toEqual(['KISSELEV ALEXANDR', 'ZHUMABEKOV ALI']);
  });

  it('reads all three crew fields', () => {
    const names = collectCrewNames([
      entry({
        pilotInCommandName: 'A CAPTAIN',
        secondInCommandName: 'B OFFICER',
        otherCrewNames: 'C OBSERVER',
      }),
    ]);

    expect(names.sort()).toEqual(['A CAPTAIN', 'B OFFICER', 'C OBSERVER']);
  });

  it('treats one person as one person regardless of case, keeping the spelling first seen', () => {
    const names = collectCrewNames([
      entry({ pilotInCommandName: 'KISSELEV ALEXANDR' }),
      entry({ pilotInCommandName: 'Kisselev Alexandr' }),
    ]);

    expect(names).toEqual(['KISSELEV ALEXANDR']);
  });

  it('ignores blank and whitespace-only names', () => {
    expect(collectCrewNames([entry({ pilotInCommandName: '   ', secondInCommandName: '' })])).toEqual([]);
  });
});

describe('filterCrewNames', () => {
  const names = ['KISSELEV ALEXANDR', 'ALEXEEV PETR', 'MURATOV ALEX'];

  it('suggests nothing until the pilot starts typing', () => {
    expect(filterCrewNames(names, '')).toEqual([]);
    expect(filterCrewNames(names, '   ')).toEqual([]);
  });

  it('ranks a name starting with the query first, then keeps frequency order within a tier', () => {
    // ALEXEEV starts with the query. KISSELEV and MURATOV both merely have a *word* starting with
    // it, so they share the second tier and stay in the order collectCrewNames gave them — which
    // is most-flown-with first.
    expect(filterCrewNames(names, 'alex')).toEqual(['ALEXEEV PETR', 'KISSELEV ALEXANDR', 'MURATOV ALEX']);
  });

  it('matches a surname typed second', () => {
    expect(filterCrewNames(names, 'muratov')).toEqual(['MURATOV ALEX']);
  });

  it('does not offer back a name that is already typed in full', () => {
    expect(filterCrewNames(names, 'MURATOV ALEX')).toEqual([]);
  });

  it('caps the list so it never buries the form', () => {
    expect(filterCrewNames(['AA', 'AB', 'AC', 'AD', 'AE', 'AF'], 'a', 5)).toHaveLength(5);
  });
});
