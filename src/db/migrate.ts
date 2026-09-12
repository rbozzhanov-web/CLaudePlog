/** Storage is a flat localStorage-backed store (see webStorage.ts) — there is no schema to migrate. */
export function useDatabaseMigrations() {
  return { success: true, error: undefined as Error | undefined };
}
