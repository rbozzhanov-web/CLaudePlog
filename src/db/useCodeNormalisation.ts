import { useEffect, useRef } from 'react';

import { listEntries, updateEntry } from './queries/entries';
import { findEntriesNeedingCodeFix } from './normalizeStoredCodes';

/**
 * Re-canonicalises airport codes on already-saved entries, once per app launch after migrations.
 *
 * Needed because the code mapping improves over time — retired IATA codes get added, dataset
 * errors get corrected — and entries imported under the old mapping would otherwise stay wrong
 * forever while only new imports benefit.
 *
 * Cheap in the normal case: it rewrites only rows whose codes actually change, so once the
 * logbook is clean this walks the list and writes nothing.
 */
export function useStoredCodeNormalisation(enabled: boolean): void {
  const done = useRef(false);

  useEffect(() => {
    if (!enabled || done.current) return;
    done.current = true;

    void (async () => {
      try {
        const entries = await listEntries();
        const changes = findEntriesNeedingCodeFix(entries);

        for (const { entry, departureAirport, arrivalAirport } of changes) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id, createdAt, updatedAt, ...rest } = entry;
          await updateEntry(id, { ...rest, departureAirport, arrivalAirport });
        }
      } catch {
        // A failure here must never block the app: the codes stay as they were and the next
        // launch tries again.
      }
    })();
  }, [enabled]);
}
