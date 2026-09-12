/**
 * A tiny localStorage-backed JSON store shared by the three pay-related settings stores
 * (paySettingsStore/exchangeRateStore/payDaysStore) — the same role Documents/expo-file-system
 * plays in the native app, one key per file. Falls back to an in-memory map if localStorage
 * itself throws (private browsing, quota, disabled storage), the same safety net the old
 * (deleted) web build's webStorage.ts used for exactly this failure mode.
 */
const memoryFallback = new Map<string, string>();

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return memoryFallback.get(key) ?? null;
  }
}

function writeRaw(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    memoryFallback.set(key, value);
  }
}

/** Missing, unreadable, or malformed data returns `fallback` rather than throwing. */
export function loadJson<T>(key: string, parse: (raw: unknown) => T, fallback: T): T {
  const raw = readRaw(key);
  if (raw === null) return fallback;
  try {
    return parse(JSON.parse(raw));
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown): void {
  writeRaw(key, JSON.stringify(value));
}
