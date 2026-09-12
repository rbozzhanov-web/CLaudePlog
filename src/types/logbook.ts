export interface Aircraft {
  id: string;
  registration: string;
  type: string;
  createdAt: string;
}

export type EntrySource = 'manual' | 'pdf_import';

export interface FlightLogEntry {
  id: string;
  date: string; // ISO "YYYY-MM-DD"
  flightNumber?: string;
  departureAirport: string;
  arrivalAirport: string;
  aircraftId?: string;
  aircraftType?: string;
  aircraftRegistration?: string;

  timeOut?: string; // "HH:MM", UTC/Zulu
  timeOff?: string;
  timeOn?: string;
  timeIn?: string;
  totalTimeMinutes: number;

  picMinutes: number;
  sicMinutes: number;
  dualReceivedMinutes: number;
  dualGivenMinutes: number;
  soloMinutes: number;
  dayMinutes: number;
  nightMinutes: number;
  actualInstrumentMinutes: number;
  simulatedInstrumentMinutes: number;
  crossCountryMinutes: number;

  /**
   * Full-flight-simulator / training-device time. Deliberately separate from totalTimeMinutes:
   * simulator sessions are not flight time, and the airline's own report totals them apart.
   * Distinct from simulatedInstrumentMinutes, which is hood time in a real aircraft.
   */
  simulatorMinutes: number;
  /** Training-device code from the report, e.g. VPTI, PSIM, LPC, OPC. */
  simulatorType?: string;

  dayTakeoffs: number;
  nightTakeoffs: number;
  dayLandings: number;
  nightLandings: number;
  instrumentApproaches: number;

  pilotInCommandName?: string;
  secondInCommandName?: string;
  otherCrewNames?: string;
  remarks?: string;

  source: EntrySource;
  importBatchId?: string;
  createdAt: string;
  updatedAt: string;
}

export const NEW_ENTRY_DEFAULTS: Pick<
  FlightLogEntry,
  | 'picMinutes'
  | 'sicMinutes'
  | 'dualReceivedMinutes'
  | 'dualGivenMinutes'
  | 'soloMinutes'
  | 'dayMinutes'
  | 'nightMinutes'
  | 'actualInstrumentMinutes'
  | 'simulatedInstrumentMinutes'
  | 'crossCountryMinutes'
  | 'simulatorMinutes'
  | 'dayTakeoffs'
  | 'nightTakeoffs'
  | 'dayLandings'
  | 'nightLandings'
  | 'instrumentApproaches'
> = {
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
};
