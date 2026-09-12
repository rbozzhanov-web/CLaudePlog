CREATE TABLE `aircraft` (
	`id` text PRIMARY KEY NOT NULL,
	`registration` text NOT NULL,
	`type` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `aircraft_registration_unique` ON `aircraft` (`registration`);--> statement-breakpoint
CREATE TABLE `flight_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`flight_number` text,
	`departure_airport` text NOT NULL,
	`arrival_airport` text NOT NULL,
	`aircraft_id` text,
	`aircraft_type` text,
	`aircraft_registration` text,
	`time_out` text,
	`time_off` text,
	`time_on` text,
	`time_in` text,
	`total_time_minutes` integer NOT NULL,
	`pic_minutes` integer DEFAULT 0 NOT NULL,
	`sic_minutes` integer DEFAULT 0 NOT NULL,
	`dual_received_minutes` integer DEFAULT 0 NOT NULL,
	`dual_given_minutes` integer DEFAULT 0 NOT NULL,
	`solo_minutes` integer DEFAULT 0 NOT NULL,
	`day_minutes` integer DEFAULT 0 NOT NULL,
	`night_minutes` integer DEFAULT 0 NOT NULL,
	`actual_instrument_minutes` integer DEFAULT 0 NOT NULL,
	`simulated_instrument_minutes` integer DEFAULT 0 NOT NULL,
	`cross_country_minutes` integer DEFAULT 0 NOT NULL,
	`simulator_minutes` integer DEFAULT 0 NOT NULL,
	`day_takeoffs` integer DEFAULT 0 NOT NULL,
	`night_takeoffs` integer DEFAULT 0 NOT NULL,
	`day_landings` integer DEFAULT 0 NOT NULL,
	`night_landings` integer DEFAULT 0 NOT NULL,
	`instrument_approaches` integer DEFAULT 0 NOT NULL,
	`simulator_type` text,
	`pilot_in_command_name` text,
	`second_in_command_name` text,
	`other_crew_names` text,
	`remarks` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`import_batch_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`aircraft_id`) REFERENCES `aircraft`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_flight_entries_date` ON `flight_entries` (`date`);--> statement-breakpoint
CREATE INDEX `idx_flight_entries_import_batch` ON `flight_entries` (`import_batch_id`);