import { resolveIcaoCode } from '@/src/lib/daynight/airportDb';
import { FlightLogEntry } from '@/src/types/logbook';

export interface CodeNormalisation {
  entry: FlightLogEntry;
  departureAirport: string;
  arrivalAirport: string;
}

/**
 * Re-canonicalises airport codes on entries that were saved before a code could be resolved.
 *
 * Codes drift and the bundled dataset gets corrected, so an entry stored as `TSE` (Astana's
 * retired IATA) should become `UACC` once the app learns the mapping — otherwise the 181 rows
 * already imported stay wrong while only new imports are right.
 *
 * Only entries that actually change are returned, and only codes that genuinely resolve are
 * rewritten: an unknown code is left exactly as the pilot flew it rather than being guessed at.
 */
export function findEntriesNeedingCodeFix(entries: FlightLogEntry[]): CodeNormalisation[] {
  const changes: CodeNormalisation[] = [];

  for (const entry of entries) {
    const departure = resolveIcaoCode(entry.departureAirport);
    const arrival = resolveIcaoCode(entry.arrivalAirport);

    const departureAirport = departure.resolved ? departure.code : entry.departureAirport;
    const arrivalAirport = arrival.resolved ? arrival.code : entry.arrivalAirport;

    if (departureAirport === entry.departureAirport && arrivalAirport === entry.arrivalAirport) {
      continue;
    }

    changes.push({ entry, departureAirport, arrivalAirport });
  }

  return changes;
}
