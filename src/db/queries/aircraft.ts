import { v4 as uuidv4 } from 'uuid';

import { loadJson, saveJson } from '@/src/lib/webJsonStore';
import { Aircraft } from '@/src/types/logbook';

const AIRCRAFT_KEY = 'pilot-logbook:aircraft';

function parseAircraft(raw: unknown): Aircraft[] {
  return Array.isArray(raw) ? (raw as Aircraft[]) : [];
}

function loadAircraft(): Aircraft[] {
  return loadJson(AIRCRAFT_KEY, parseAircraft, []);
}

function saveAircraft(rows: Aircraft[]): void {
  saveJson(AIRCRAFT_KEY, rows);
}

export async function listAircraft(): Promise<Aircraft[]> {
  return [...loadAircraft()].sort((a, b) => (a.registration < b.registration ? -1 : 1));
}

/** Returns the existing aircraft for a registration, creating one if it doesn't exist yet. */
export async function getOrCreateAircraft(registration: string, type: string): Promise<Aircraft> {
  const existing = loadAircraft().find((a) => a.registration === registration);
  if (existing) return existing;

  const row: Aircraft = { id: uuidv4(), registration, type, createdAt: new Date().toISOString() };
  saveAircraft([...loadAircraft(), row]);
  return row;
}
