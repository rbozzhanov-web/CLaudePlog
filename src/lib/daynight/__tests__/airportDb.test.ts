import { findAirportCoords, resolveIcaoCode, toIcaoCode } from '../airportDb';

describe('toIcaoCode', () => {
  it('converts IATA to ICAO', () => {
    expect(toIcaoCode('ALA')).toBe('UAAA');
    expect(toIcaoCode('NQZ')).toBe('UACC');
    expect(toIcaoCode('DXB')).toBe('OMDB');
    expect(toIcaoCode('LHR')).toBe('EGLL');
  });

  it('leaves an ICAO code unchanged', () => {
    expect(toIcaoCode('UAAA')).toBe('UAAA');
    expect(toIcaoCode('OMDB')).toBe('OMDB');
  });

  it('normalises case and surrounding whitespace', () => {
    expect(toIcaoCode(' ala ')).toBe('UAAA');
    expect(toIcaoCode('uaaa')).toBe('UAAA');
  });

  it('is idempotent, so re-saving an entry never drifts', () => {
    expect(toIcaoCode(toIcaoCode('ALA'))).toBe('UAAA');
  });

  it('keeps what the pilot entered when the code is unknown', () => {
    expect(toIcaoCode('ZZZ')).toBe('ZZZ');
    expect(toIcaoCode('QQQQ')).toBe('QQQQ');
  });

  it('returns empty input untouched rather than inventing a code', () => {
    expect(toIcaoCode('')).toBe('');
    expect(toIcaoCode('   ')).toBe('');
  });

  it('resolves the same airport whichever code form is used', () => {
    expect(findAirportCoords('ALA')).toEqual(findAirportCoords('UAAA'));
  });

  it('converts retired IATA codes the dataset no longer knows', () => {
    // Astana: TSE was retired in 2020, the dataset only carries NQZ. 181 rows of the user's
    // real report use TSE, so this silently failed for most of the logbook.
    expect(toIcaoCode('TSE')).toBe('UACC');
    expect(toIcaoCode('TSE')).toBe(toIcaoCode('NQZ'));
  });

  it('corrects airports the dataset has wrong', () => {
    // Bishkek Manas is FRU; the dataset record wrongly says BSZ.
    expect(toIcaoCode('FRU')).toBe('UCFM');
    // ...and its ICAO moved when Kyrgyzstan got the UC** block.
    expect(toIcaoCode('UAFM')).toBe('UCFM');
  });

  it('resolves coordinates through an override too, not just the code', () => {
    expect(findAirportCoords('TSE')).toEqual(findAirportCoords('UACC'));
    expect(findAirportCoords('FRU')).toBeDefined();
  });
});

describe('resolveIcaoCode', () => {
  it('reports a successful resolution', () => {
    expect(resolveIcaoCode('ALA')).toEqual({ code: 'UAAA', resolved: true });
    expect(resolveIcaoCode('TSE')).toEqual({ code: 'UACC', resolved: true });
  });

  it('keeps an unknown code but marks it unresolved, so it can be flagged', () => {
    expect(resolveIcaoCode('ZZZ')).toEqual({ code: 'ZZZ', resolved: false });
  });

  it('marks empty input unresolved rather than inventing a code', () => {
    expect(resolveIcaoCode('  ')).toEqual({ code: '', resolved: false });
  });
});
