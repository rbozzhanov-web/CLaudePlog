import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { Aircraft } from '@/src/types/logbook';
import { getDb } from '../client';
import { aircraft } from '../schema';

function fromRow(row: typeof aircraft.$inferSelect): Aircraft {
  return {
    id: row.id,
    registration: row.registration,
    type: row.type,
    createdAt: row.createdAt,
  };
}

export async function listAircraft(): Promise<Aircraft[]> {
  const rows = await getDb().select().from(aircraft).orderBy(aircraft.registration);
  return rows.map(fromRow);
}

/** Returns the existing aircraft for a registration, creating one if it doesn't exist yet. */
export async function getOrCreateAircraft(registration: string, type: string): Promise<Aircraft> {
  const existing = await getDb().select().from(aircraft).where(eq(aircraft.registration, registration)).limit(1);
  if (existing[0]) return fromRow(existing[0]);

  const row = { id: uuidv4(), registration, type, createdAt: new Date().toISOString() };
  await getDb().insert(aircraft).values(row);
  return fromRow(row);
}
