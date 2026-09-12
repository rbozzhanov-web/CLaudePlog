import { loadJson, saveJson } from '@/src/lib/webJsonStore';
import { EMPTY_MONTHLY_DAYS, MonthlyDays } from './payPeriod';

const STORAGE_KEY = 'pilot-logbook:pay-days';

/**
 * Day counts behind the three per-day accruals (vacation, training, medical exam), one record per
 * month, keyed "YYYY-MM" — the web equivalent of the native app's pay-days.json, kept in
 * localStorage instead. See `webJsonStore.ts` for the storage mechanics.
 */
export function loadMonthlyDays(): Record<string, MonthlyDays> {
  return loadJson(
    STORAGE_KEY,
    (raw) => {
      const stored = raw as Record<string, Partial<MonthlyDays>>;
      const days: Record<string, MonthlyDays> = {};
      for (const [month, value] of Object.entries(stored)) {
        days[month] = {
          vacationDays: value?.vacationDays ?? EMPTY_MONTHLY_DAYS.vacationDays,
          trainingDays: value?.trainingDays ?? EMPTY_MONTHLY_DAYS.trainingDays,
          medicalExamDays: value?.medicalExamDays ?? EMPTY_MONTHLY_DAYS.medicalExamDays,
        };
      }
      return days;
    },
    {},
  );
}

export function saveMonthlyDays(month: string, days: MonthlyDays): void {
  const all = loadMonthlyDays();
  all[month] = days;
  saveJson(STORAGE_KEY, all);
}
