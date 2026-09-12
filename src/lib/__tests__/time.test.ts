import { hhmmToMinutes, minutesToHHMM, minutesToDecimalHours } from '../time';

describe('hhmmToMinutes', () => {
  it('parses valid HH:MM strings', () => {
    expect(hhmmToMinutes('07:37')).toBe(457);
    expect(hhmmToMinutes('00:00')).toBe(0);
    expect(hhmmToMinutes('23:59')).toBe(1439);
  });

  it('returns null for invalid or missing input', () => {
    expect(hhmmToMinutes(undefined)).toBeNull();
    expect(hhmmToMinutes('')).toBeNull();
    expect(hhmmToMinutes('24:00')).toBeNull();
    expect(hhmmToMinutes('7:5')).toBeNull();
    expect(hhmmToMinutes('not a time')).toBeNull();
  });
});

describe('minutesToHHMM', () => {
  it('formats minutes as zero-padded HH:MM', () => {
    expect(minutesToHHMM(457)).toBe('07:37');
    expect(minutesToHHMM(0)).toBe('00:00');
    expect(minutesToHHMM(1439)).toBe('23:59');
  });

  it('round-trips with hhmmToMinutes', () => {
    for (const value of ['00:26', '07:37', '19:00', '23:59']) {
      expect(minutesToHHMM(hhmmToMinutes(value)!)).toBe(value);
    }
  });

  it('clamps invalid input to 00:00', () => {
    expect(minutesToHHMM(-5)).toBe('00:00');
    expect(minutesToHHMM(NaN)).toBe('00:00');
  });
});

describe('minutesToDecimalHours', () => {
  it('converts minutes to decimal hours', () => {
    expect(minutesToDecimalHours(90)).toBe(1.5);
    expect(minutesToDecimalHours(457)).toBe(7.6);
    expect(minutesToDecimalHours(0)).toBe(0);
  });
});
