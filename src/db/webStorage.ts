import { loadJson, saveJson } from '@/src/lib/webJsonStore';
import { FlightLogEntry } from '@/src/types/logbook';

const ENTRIES_KEY = 'pilot-logbook:flight-entries';

/**
 * localStorage holds plain JSON with no schema, so entries written before a numeric field
 * existed come back `undefined` — and `number + undefined` is NaN, which would silently poison
 * every total. A real SQL column gets this for free from its DEFAULT; this needs it by hand.
 */
function withDefaults(entry: FlightLogEntry): FlightLogEntry {
  return { ...entry, simulatorMinutes: entry.simulatorMinutes ?? 0 };
}

function parseEntries(raw: unknown): FlightLogEntry[] {
  return Array.isArray(raw) ? (raw as FlightLogEntry[]).map(withDefaults) : [];
}

export function loadEntries(): FlightLogEntry[] {
  return loadJson(ENTRIES_KEY, parseEntries, []);
}

export function saveEntries(entries: FlightLogEntry[]): void {
  saveJson(ENTRIES_KEY, entries);
}
