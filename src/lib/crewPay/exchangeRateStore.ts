import { loadJson, saveJson } from '@/src/lib/webJsonStore';

const STORAGE_KEY = 'pilot-logbook:fx-rates';

/**
 * EUR/KZT rates for the pay screen, one per month, keyed "YYYY-MM" — the web equivalent of the
 * native app's fx-rates.json in Documents, kept in localStorage instead. See `webJsonStore.ts`
 * for the storage mechanics.
 *
 * Specifically the official National Bank of Kazakhstan (НБРК) rate on the last day of the
 * month, not a market or bank-counter rate — that is what the euro-denominated contract is
 * actually converted at. This is a local cache: a value can arrive either from `nbrkRate.ts`'s
 * fetch or from the pilot typing a correction into the rate field — once stored, both look
 * identical, since a rate does not carry where it came from.
 */
export function loadMonthlyRates(): Record<string, number> {
  return loadJson(
    STORAGE_KEY,
    (raw) => {
      const stored = raw as Record<string, unknown>;
      const rates: Record<string, number> = {};
      for (const [month, value] of Object.entries(stored)) {
        if (typeof value === 'number' && Number.isFinite(value)) rates[month] = value;
      }
      return rates;
    },
    {},
  );
}

export function saveMonthlyRate(month: string, rate: number): void {
  const rates = loadMonthlyRates();
  rates[month] = rate;
  saveJson(STORAGE_KEY, rates);
}
