import { z } from 'zod';

import { toIcaoCode } from '@/src/lib/daynight/airportDb';
import { hhmmToMinutes, minutesToHHMM } from '@/src/lib/time';
import { FlightLogEntry, NEW_ENTRY_DEFAULTS } from '@/src/types/logbook';
import { NewFlightLogEntry } from '@/src/db/queries/entries';

const optionalTime = z
  .string()
  .trim()
  .refine((value) => value === '' || hhmmToMinutes(value) !== null, 'Use HH:MM');

const optionalCount = z
  .string()
  .trim()
  .refine((value) => value === '' || /^\d+$/.test(value), 'Whole number');

export const flightEntryFormSchema = z.object({
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  flightNumber: z.string().trim(),
  departureAirport: z
    .string()
    .trim()
    .min(3, 'Required')
    .max(4)
    .regex(/^[A-Za-z]{3,4}$/, '3-4 letters'),
  arrivalAirport: z
    .string()
    .trim()
    .min(3, 'Required')
    .max(4)
    .regex(/^[A-Za-z]{3,4}$/, '3-4 letters'),
  aircraftType: z.string().trim(),
  aircraftRegistration: z.string().trim(),
  timeOut: optionalTime,
  timeIn: optionalTime,
  totalTime: optionalTime,
  picTime: optionalTime,
  sicTime: optionalTime,
  dualReceivedTime: optionalTime,
  dualGivenTime: optionalTime,
  soloTime: optionalTime,
  dayTime: optionalTime,
  nightTime: optionalTime,
  actualInstrumentTime: optionalTime,
  simulatedInstrumentTime: optionalTime,
  crossCountryTime: optionalTime,
  simulatorTime: optionalTime,
  simulatorType: z.string().trim(),
  dayTakeoffs: optionalCount,
  nightTakeoffs: optionalCount,
  dayLandings: optionalCount,
  nightLandings: optionalCount,
  instrumentApproaches: optionalCount,
  pilotInCommandName: z.string().trim(),
  secondInCommandName: z.string().trim(),
  otherCrewNames: z.string().trim(),
  remarks: z.string().trim(),
})
  // totalTime used to be unconditionally required. A simulator session legitimately has no
  // flight time, so require one or the other instead — otherwise a sim entry can't be saved.
  .refine((values) => values.totalTime !== '' || values.simulatorTime !== '', {
    message: 'Enter a flight time, or a simulator time for a training session',
    path: ['totalTime'],
  });

export type FlightEntryFormValues = z.infer<typeof flightEntryFormSchema>;

export const EMPTY_FORM_VALUES: FlightEntryFormValues = {
  date: '',
  flightNumber: '',
  departureAirport: '',
  arrivalAirport: '',
  aircraftType: '',
  aircraftRegistration: '',
  timeOut: '',
  timeIn: '',
  totalTime: '',
  picTime: '',
  sicTime: '',
  dualReceivedTime: '',
  dualGivenTime: '',
  soloTime: '',
  dayTime: '',
  nightTime: '',
  actualInstrumentTime: '',
  simulatedInstrumentTime: '',
  crossCountryTime: '',
  simulatorTime: '',
  simulatorType: '',
  dayTakeoffs: '',
  nightTakeoffs: '',
  dayLandings: '',
  nightLandings: '',
  instrumentApproaches: '',
  pilotInCommandName: '',
  secondInCommandName: '',
  otherCrewNames: '',
  remarks: '',
};

function minutes(value: string): number {
  return hhmmToMinutes(value) ?? 0;
}

function count(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formValuesToEntry(values: FlightEntryFormValues): NewFlightLogEntry {
  return {
    ...NEW_ENTRY_DEFAULTS,
    date: values.date,
    flightNumber: values.flightNumber || undefined,
    departureAirport: toIcaoCode(values.departureAirport),
    arrivalAirport: toIcaoCode(values.arrivalAirport),
    aircraftType: values.aircraftType || undefined,
    aircraftRegistration: values.aircraftRegistration || undefined,
    timeOut: values.timeOut || undefined,
    timeIn: values.timeIn || undefined,
    totalTimeMinutes: minutes(values.totalTime),
    picMinutes: minutes(values.picTime),
    sicMinutes: minutes(values.sicTime),
    dualReceivedMinutes: minutes(values.dualReceivedTime),
    dualGivenMinutes: minutes(values.dualGivenTime),
    soloMinutes: minutes(values.soloTime),
    dayMinutes: minutes(values.dayTime),
    nightMinutes: minutes(values.nightTime),
    actualInstrumentMinutes: minutes(values.actualInstrumentTime),
    simulatedInstrumentMinutes: minutes(values.simulatedInstrumentTime),
    crossCountryMinutes: minutes(values.crossCountryTime),
    simulatorMinutes: minutes(values.simulatorTime),
    simulatorType: values.simulatorType || undefined,
    dayTakeoffs: count(values.dayTakeoffs),
    nightTakeoffs: count(values.nightTakeoffs),
    dayLandings: count(values.dayLandings),
    nightLandings: count(values.nightLandings),
    instrumentApproaches: count(values.instrumentApproaches),
    pilotInCommandName: values.pilotInCommandName || undefined,
    secondInCommandName: values.secondInCommandName || undefined,
    otherCrewNames: values.otherCrewNames || undefined,
    remarks: values.remarks || undefined,
    source: 'manual',
  };
}

/** Like entryToFormValues, but tolerant of a partial/incomplete entry — used for PDF-import
 * candidates, which may be missing fields the parser couldn't populate. */
export function partialEntryToFormValues(entry: Partial<FlightLogEntry>): FlightEntryFormValues {
  return {
    ...EMPTY_FORM_VALUES,
    date: entry.date ?? '',
    flightNumber: entry.flightNumber ?? '',
    departureAirport: entry.departureAirport ?? '',
    arrivalAirport: entry.arrivalAirport ?? '',
    aircraftType: entry.aircraftType ?? '',
    aircraftRegistration: entry.aircraftRegistration ?? '',
    timeOut: entry.timeOut ?? '',
    timeIn: entry.timeIn ?? '',
    totalTime: entry.totalTimeMinutes !== undefined ? minutesToHHMM(entry.totalTimeMinutes) : '',
    picTime: entry.picMinutes !== undefined ? minutesToHHMM(entry.picMinutes) : '',
    sicTime: entry.sicMinutes !== undefined ? minutesToHHMM(entry.sicMinutes) : '',
    dualReceivedTime: entry.dualReceivedMinutes !== undefined ? minutesToHHMM(entry.dualReceivedMinutes) : '',
    dualGivenTime: entry.dualGivenMinutes !== undefined ? minutesToHHMM(entry.dualGivenMinutes) : '',
    soloTime: entry.soloMinutes !== undefined ? minutesToHHMM(entry.soloMinutes) : '',
    dayTime: entry.dayMinutes !== undefined ? minutesToHHMM(entry.dayMinutes) : '',
    nightTime: entry.nightMinutes !== undefined ? minutesToHHMM(entry.nightMinutes) : '',
    actualInstrumentTime: entry.actualInstrumentMinutes !== undefined ? minutesToHHMM(entry.actualInstrumentMinutes) : '',
    simulatedInstrumentTime:
      entry.simulatedInstrumentMinutes !== undefined ? minutesToHHMM(entry.simulatedInstrumentMinutes) : '',
    crossCountryTime: entry.crossCountryMinutes !== undefined ? minutesToHHMM(entry.crossCountryMinutes) : '',
    simulatorTime: entry.simulatorMinutes ? minutesToHHMM(entry.simulatorMinutes) : '',
    simulatorType: entry.simulatorType ?? '',
    dayTakeoffs: entry.dayTakeoffs !== undefined ? String(entry.dayTakeoffs) : '',
    nightTakeoffs: entry.nightTakeoffs !== undefined ? String(entry.nightTakeoffs) : '',
    dayLandings: entry.dayLandings !== undefined ? String(entry.dayLandings) : '',
    nightLandings: entry.nightLandings !== undefined ? String(entry.nightLandings) : '',
    instrumentApproaches: entry.instrumentApproaches !== undefined ? String(entry.instrumentApproaches) : '',
    pilotInCommandName: entry.pilotInCommandName ?? '',
    secondInCommandName: entry.secondInCommandName ?? '',
    otherCrewNames: entry.otherCrewNames ?? '',
    remarks: entry.remarks ?? '',
  };
}

export function entryToFormValues(entry: FlightLogEntry): FlightEntryFormValues {
  return {
    date: entry.date,
    flightNumber: entry.flightNumber ?? '',
    departureAirport: entry.departureAirport,
    arrivalAirport: entry.arrivalAirport,
    aircraftType: entry.aircraftType ?? '',
    aircraftRegistration: entry.aircraftRegistration ?? '',
    timeOut: entry.timeOut ?? '',
    timeIn: entry.timeIn ?? '',
    totalTime: minutesToHHMM(entry.totalTimeMinutes),
    picTime: minutesToHHMM(entry.picMinutes),
    sicTime: minutesToHHMM(entry.sicMinutes),
    dualReceivedTime: minutesToHHMM(entry.dualReceivedMinutes),
    dualGivenTime: minutesToHHMM(entry.dualGivenMinutes),
    soloTime: minutesToHHMM(entry.soloMinutes),
    dayTime: minutesToHHMM(entry.dayMinutes),
    nightTime: minutesToHHMM(entry.nightMinutes),
    actualInstrumentTime: minutesToHHMM(entry.actualInstrumentMinutes),
    simulatedInstrumentTime: minutesToHHMM(entry.simulatedInstrumentMinutes),
    crossCountryTime: minutesToHHMM(entry.crossCountryMinutes),
    // Guarded, unlike its neighbours: a backup file written before this column existed restores
    // entries with no simulatorMinutes at all, and minutesToHHMM(undefined) would render NaN into
    // the field. Native rows cannot hit this — the column has a SQL DEFAULT — but restores can.
    simulatorTime: entry.simulatorMinutes ? minutesToHHMM(entry.simulatorMinutes) : '',
    simulatorType: entry.simulatorType ?? '',
    dayTakeoffs: String(entry.dayTakeoffs),
    nightTakeoffs: String(entry.nightTakeoffs),
    dayLandings: String(entry.dayLandings),
    nightLandings: String(entry.nightLandings),
    instrumentApproaches: String(entry.instrumentApproaches),
    pilotInCommandName: entry.pilotInCommandName ?? '',
    secondInCommandName: entry.secondInCommandName ?? '',
    otherCrewNames: entry.otherCrewNames ?? '',
    remarks: entry.remarks ?? '',
  };
}
