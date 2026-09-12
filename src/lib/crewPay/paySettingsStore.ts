import { loadJson, saveJson } from '@/src/lib/webJsonStore';
import { EMPTY_PAY_SETTINGS, PaySettings } from './payPeriod';

const STORAGE_KEY = 'pilot-logbook:pay-settings';

/**
 * The pilot's pay terms, kept in localStorage — the web equivalent of the native app's
 * pay-settings.json in Documents. See `webJsonStore.ts` for the storage mechanics.
 *
 * Missing or unreadable settings return zeros rather than throwing.
 *
 * A pay screen with every figure at zero is self-explanatory — nothing has been entered yet —
 * whereas a crash on first open is not. Each field is coalesced individually so a file written
 * before a field existed still loads.
 *
 * The four euro fields were renamed from plain tenge amounts (hourlyRate, monthlySalary, …) when
 * the contract turned out to be EUR-denominated. There is deliberately no migration from the old
 * keys: a tenge figure reinterpreted as euros would be wrong by two orders of magnitude, so an old
 * file simply reads as zero on those four fields and the pilot re-enters the real euro amounts.
 *
 * `corporatePensionRate` and `alimonyRate` similarly replaced flat tenge fields (`corporatePension`,
 * `alimony`) once both became law-derived percentages rather than figures copied off a payslip. A
 * tenge amount reinterpreted as a fraction would be nonsense (280 131 as "28 013 100%"), so the same
 * no-migration rule applies: old files read as 0 on these two and the rates are entered fresh.
 *
 * `vacationDayRateTenge`/`trainingDayRateTenge`/`medicalExamDayRateTenge` replaced flat monthly
 * euro amounts (`vacationPayEur`/`trainingPayEur`/`medicalExamPayEur`) once those turned out to be
 * a per-day average-earnings rate multiplied by a day count, not a euro contract figure — same
 * no-migration rule again, for the same reason: a monthly total read as a daily rate would be
 * wrong by whatever the day count happened to be.
 */
export function loadPaySettings(): PaySettings {
  return loadJson(
    STORAGE_KEY,
    (raw) => {
      const stored = raw as Partial<PaySettings>;
      return {
        hourlyRateEur: stored.hourlyRateEur ?? 0,
        monthlySalaryEur: stored.monthlySalaryEur ?? 0,
        transportAllowance: stored.transportAllowance ?? 0,
        nightAllowanceEur: stored.nightAllowanceEur ?? 0,
        productivityAllowanceEur: stored.productivityAllowanceEur ?? 0,
        vacationDayRateTenge: stored.vacationDayRateTenge ?? 0,
        trainingDayRateTenge: stored.trainingDayRateTenge ?? 0,
        medicalExamDayRateTenge: stored.medicalExamDayRateTenge ?? 0,
        corporatePensionRate: stored.corporatePensionRate ?? 0,
        advance: stored.advance ?? 0,
        alimonyRate: stored.alimonyRate ?? 0,
      };
    },
    { ...EMPTY_PAY_SETTINGS },
  );
}

export function savePaySettings(settings: PaySettings): void {
  saveJson(STORAGE_KEY, settings);
}
