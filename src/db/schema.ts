import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const aircraft = sqliteTable('aircraft', {
  id: text('id').primaryKey(),
  registration: text('registration').notNull().unique(),
  type: text('type').notNull(),
  createdAt: text('created_at').notNull(),
});

export const flightEntries = sqliteTable(
  'flight_entries',
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    flightNumber: text('flight_number'),
    departureAirport: text('departure_airport').notNull(),
    arrivalAirport: text('arrival_airport').notNull(),
    aircraftId: text('aircraft_id').references(() => aircraft.id, { onDelete: 'set null' }),
    aircraftType: text('aircraft_type'),
    aircraftRegistration: text('aircraft_registration'),

    timeOut: text('time_out'),
    timeOff: text('time_off'),
    timeOn: text('time_on'),
    timeIn: text('time_in'),
    totalTimeMinutes: integer('total_time_minutes').notNull(),

    picMinutes: integer('pic_minutes').notNull().default(0),
    sicMinutes: integer('sic_minutes').notNull().default(0),
    dualReceivedMinutes: integer('dual_received_minutes').notNull().default(0),
    dualGivenMinutes: integer('dual_given_minutes').notNull().default(0),
    soloMinutes: integer('solo_minutes').notNull().default(0),
    dayMinutes: integer('day_minutes').notNull().default(0),
    nightMinutes: integer('night_minutes').notNull().default(0),
    actualInstrumentMinutes: integer('actual_instrument_minutes').notNull().default(0),
    simulatedInstrumentMinutes: integer('simulated_instrument_minutes').notNull().default(0),
    crossCountryMinutes: integer('cross_country_minutes').notNull().default(0),
    simulatorMinutes: integer('simulator_minutes').notNull().default(0),

    dayTakeoffs: integer('day_takeoffs').notNull().default(0),
    nightTakeoffs: integer('night_takeoffs').notNull().default(0),
    dayLandings: integer('day_landings').notNull().default(0),
    nightLandings: integer('night_landings').notNull().default(0),
    instrumentApproaches: integer('instrument_approaches').notNull().default(0),

    simulatorType: text('simulator_type'),

    pilotInCommandName: text('pilot_in_command_name'),
    secondInCommandName: text('second_in_command_name'),
    otherCrewNames: text('other_crew_names'),
    remarks: text('remarks'),

    source: text('source').notNull().default('manual'),
    importBatchId: text('import_batch_id'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_flight_entries_date').on(table.date),
    index('idx_flight_entries_import_batch').on(table.importBatchId),
  ],
);
