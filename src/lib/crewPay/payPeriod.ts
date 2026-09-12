import { FlightLogEntry } from '@/src/types/logbook';
import { KZ_2026, KzTaxParams, PayrollResult, calculateNetPay } from './kzPayroll';
import { PayHoursSummary, summarisePayHours } from './normLookup';

/**
 * The pilot's own pay terms. None of these are derivable from the published norms — the norms give
 * hours, the contract gives money — so they are entered once and reused every month.
 *
 * The contract is denominated in EUR — salary, the flight-hour rate, and the night/productivity
 * allowances are all agreed in euros and converted to tenge at the rate on the last day of the
 * month the pilot is actually paid in. The transport allowance is the one exception: it is a fixed
 * tenge amount, unaffected by the rate. The pension/advance figures below are Kazakh schemes
 * settled in tenge regardless of the euro contract, so they stay in tenge (or, for the pension,
 * a rate applied to a tenge base) rather than converting.
 */
export interface PaySettings {
  /** € per block hour, applied to CrewPay Norm hours, then converted at the month's rate. */
  hourlyRateEur: number;
  /** The monthly salary line, paid regardless of hours flown. */
  monthlySalaryEur: number;
  /** Fixed allowances, entered as amounts because the rules behind them are not published. */
  nightAllowanceEur: number;
  productivityAllowanceEur: number;
  /**
   * Per-day rates for three irregular accruals — vacation pay, pilot training, and the
   * medical-exam reimbursement — multiplied by that month's day count (`MonthlyDays`, entered on
   * the screen) rather than a flat monthly amount.
   *
   * In tenge, not euros, and NOT converted by the month's rate: unlike salary/flight pay/night/
   * productivity, this is not a euro contract term. It is Kazakhstan's «средний дневной
   * заработок» (average daily earnings, Приказ Минтруда РК №908 от 30.11.2015) — a trailing
   * 12-month average of already-tenge-converted earnings — so multiplying it again by a single
   * month's EUR/KZT rate would double-convert. It also drifts month to month as that average
   * rolls forward (confirmed against three real payslips: 160 114,59 → 162 221,38 → 164 159,09
   * ₸/day across three consecutive months), so it is a setting the pilot re-enters when a payslip
   * shows it changed, not a one-time contract figure.
   */
  vacationDayRateTenge: number;
  trainingDayRateTenge: number;
  medicalExamDayRateTenge: number;
  /** Not part of the euro contract — a fixed tenge amount. */
  transportAllowance: number;
  /**
   * Взнос в КорпПП, 5% of the month's regular gross (salary + flight pay + allowances, excluding
   * this line itself so the rate never applies to its own output — see `calculateEarnings`). One
   * figure that appears four times on a payslip: imputed as income and taken straight back out,
   * the pilot's own contribution is withheld, and it comes off the income-tax base.
   */
  corporatePensionRate: number;
  /** Regular withholding, in tenge — not a percentage of anything. */
  advance: number;
  /**
   * Ст. 95, Закон РК №261-IV: up to 50% of income under an enforcement document, computed by
   * `calculateNetPay` on what is left after ОПВ/ВОСМС/ИПН/КорпПП, not on gross pay.
   */
  alimonyRate: number;
}

export const EMPTY_PAY_SETTINGS: PaySettings = {
  hourlyRateEur: 0,
  monthlySalaryEur: 0,
  transportAllowance: 0,
  nightAllowanceEur: 0,
  productivityAllowanceEur: 0,
  vacationDayRateTenge: 0,
  trainingDayRateTenge: 0,
  medicalExamDayRateTenge: 0,
  corporatePensionRate: 0,
  advance: 0,
  alimonyRate: 0,
};

/** How many days in a month count toward each of the three per-day accruals above. */
export interface MonthlyDays {
  vacationDays: number;
  trainingDays: number;
  medicalExamDays: number;
}

export const EMPTY_MONTHLY_DAYS: MonthlyDays = {
  vacationDays: 0,
  trainingDays: 0,
  medicalExamDays: 0,
};

export interface PayEarnings {
  salary: number;
  flightPay: number;
  transportAllowance: number;
  nightAllowance: number;
  productivityAllowance: number;
  vacationPay: number;
  trainingPay: number;
  medicalExamPay: number;
  /** Company contribution imputed as income, then withheld again — no effect on take-home. */
  indirectIncome: number;
  total: number;
}

export interface PayPeriodResult {
  /** "YYYY-MM". */
  month: string;
  hours: PayHoursSummary;
  earnings: PayEarnings;
  payroll: PayrollResult;
  /** The EUR/KZT rate actually applied to this month's euro-denominated lines. */
  eurToKztRateUsed: number;
  /**
   * Months (within the same year, up to and including the target month) whose rate had to be
   * inferred rather than read from an explicit entry — see `resolveMonthlyRate`. Reported rather
   * than absorbed, the same way `PayHoursSummary.unlistedSectors` reports a sector paid on actual
   * time instead of a published norm: a borrowed rate changes the figure, so it must be visible.
   */
  fxFallbackMonths: string[];
}

/** A training session is not flying: it carries no block time and earns no flight pay. */
function isFlight(entry: FlightLogEntry): boolean {
  return entry.totalTimeMinutes > 0;
}

export function entriesForMonth(entries: FlightLogEntry[], month: string): FlightLogEntry[] {
  return entries.filter((entry) => entry.date.startsWith(month) && isFlight(entry));
}

export interface ResolvedRate {
  rate: number;
  /** False when the month had no rate of its own and one was borrowed (or defaulted to 0). */
  explicit: boolean;
}

/**
 * The EUR/KZT rate to use for one month: its own entry if there is one, otherwise the nearest
 * earlier month's entry from the same year, otherwise 0.
 *
 * Scoped to the calendar year deliberately — this mirrors the ИПН scale it feeds, which also
 * resets every January, so a rate is never borrowed across a year boundary.
 */
export function resolveMonthlyRate(rates: Record<string, number>, month: string): ResolvedRate {
  if (rates[month] !== undefined) return { rate: rates[month], explicit: true };

  const year = month.slice(0, 4);
  const monthNumber = Number(month.slice(5, 7));
  for (let earlier = monthNumber - 1; earlier >= 1; earlier -= 1) {
    const key = `${year}-${String(earlier).padStart(2, '0')}`;
    if (rates[key] !== undefined) return { rate: rates[key], explicit: false };
  }

  return { rate: 0, explicit: false };
}

/**
 * Builds one month's earnings from the logbook, the pilot's terms, and that month's EUR/KZT rate.
 *
 * Flight pay is norm hours × rate, not actual hours × rate — that is the whole point of the
 * published norms, and the difference between the two is what makes checking a payslip worthwhile.
 */
export function calculateEarnings(
  entries: FlightLogEntry[],
  settings: PaySettings,
  eurToKztRate: number,
  days: MonthlyDays,
): { hours: PayHoursSummary; earnings: PayEarnings } {
  const hours = summarisePayHours(entries);
  const flightPay = (hours.totalMinutes / 60) * settings.hourlyRateEur * eurToKztRate;

  const salary = settings.monthlySalaryEur * eurToKztRate;
  // Not converted: this allowance is a fixed tenge amount, not part of the euro contract.
  const transportAllowance = settings.transportAllowance;
  const nightAllowance = settings.nightAllowanceEur * eurToKztRate;
  const productivityAllowance = settings.productivityAllowanceEur * eurToKztRate;
  // Also not converted — see PaySettings.vacationDayRateTenge for why these three are tenge, not
  // euros multiplied by the month's rate.
  const vacationPay = settings.vacationDayRateTenge * days.vacationDays;
  const trainingPay = settings.trainingDayRateTenge * days.trainingDays;
  const medicalExamPay = settings.medicalExamDayRateTenge * days.medicalExamDays;

  // The base the 5% КорпПП rate applies to: everything the pilot is regularly paid this month,
  // excluding the pension line itself so the rate never compounds on its own output. A payslip
  // cannot confirm this exact base (the one on hand had both ОПВ and ВОСМС pinned to their
  // ceilings either way), so this is a documented assumption, not a verified fact.
  const regularGross =
    salary +
    flightPay +
    transportAllowance +
    nightAllowance +
    productivityAllowance +
    vacationPay +
    trainingPay +
    medicalExamPay;
  const indirectIncome = regularGross * settings.corporatePensionRate;

  const earnings: PayEarnings = {
    salary,
    flightPay,
    transportAllowance,
    nightAllowance,
    productivityAllowance,
    vacationPay,
    trainingPay,
    medicalExamPay,
    indirectIncome,
    total: regularGross + indirectIncome,
  };

  return { hours, earnings };
}

function payMonth(
  entries: FlightLogEntry[],
  month: string,
  settings: PaySettings,
  eurToKztRate: number,
  days: MonthlyDays,
  taxableYearToDate: number,
  params: KzTaxParams,
): Omit<PayPeriodResult, 'eurToKztRateUsed' | 'fxFallbackMonths'> {
  const { hours, earnings } = calculateEarnings(entriesForMonth(entries, month), settings, eurToKztRate, days);

  const payroll = calculateNetPay(
    {
      grossEarnings: earnings.total,
      voluntaryPension: earnings.indirectIncome,
      taxableYearToDate,
      alimonyRate: settings.alimonyRate,
      // The imputed company contribution is taken straight back out, alongside the ordinary
      // withholdings. Net effect of the pair is zero, which is why it can be added and removed.
      otherDeductions: settings.advance + earnings.indirectIncome,
    },
    params,
  );

  return { month, hours, earnings, payroll };
}

/**
 * Calculates a month, replaying the year up to it so the income-tax scale lands on the right band.
 *
 * ИПН is annual and cumulative, so a month cannot be computed on its own — the same flying is
 * taxed at 10% in January and 15% by midsummer. Rather than storing a running total that could
 * drift out of step with the logbook, every earlier month of the same year is recomputed from the
 * entries and the accumulated taxable base carried forward.
 *
 * Earnings are now euro-denominated too, so the replay needs each earlier month's *own* rate, not
 * the target month's — a March flown at March's rate, however different from today's, is what
 * actually built March's taxable income and therefore this year's running total. `rates` maps
 * "YYYY-MM" to an EUR/KZT rate for whichever months the pilot has entered one; a month missing
 * from it resolves via `resolveMonthlyRate` and is named in the returned `fxFallbackMonths`.
 *
 * The other assumption this makes is worth stating: today's settings (salary, allowances) are
 * applied to every month of the year. Where those changed mid-year, earlier months are
 * approximated, and the current month's band can be off if that error pushes the year-to-date
 * across the threshold.
 */
export function calculatePayPeriod(
  entries: FlightLogEntry[],
  month: string,
  settings: PaySettings,
  rates: Record<string, number>,
  monthlyDays: Record<string, MonthlyDays> = {},
  params: KzTaxParams = KZ_2026,
): PayPeriodResult {
  const year = month.slice(0, 4);
  const monthNumber = Number(month.slice(5, 7));
  const fxFallbackMonths: string[] = [];

  let taxableYearToDate = 0;
  for (let earlier = 1; earlier < monthNumber; earlier += 1) {
    const key = `${year}-${String(earlier).padStart(2, '0')}`;
    const resolved = resolveMonthlyRate(rates, key);
    if (!resolved.explicit) fxFallbackMonths.push(key);
    taxableYearToDate = payMonth(
      entries,
      key,
      settings,
      resolved.rate,
      monthlyDays[key] ?? EMPTY_MONTHLY_DAYS,
      taxableYearToDate,
      params,
    ).payroll.taxableYearToDateAfter;
  }

  const targetRate = resolveMonthlyRate(rates, month);
  if (!targetRate.explicit) fxFallbackMonths.push(month);

  const result = payMonth(
    entries,
    month,
    settings,
    targetRate.rate,
    monthlyDays[month] ?? EMPTY_MONTHLY_DAYS,
    taxableYearToDate,
    params,
  );
  return { ...result, eurToKztRateUsed: targetRate.rate, fxFallbackMonths };
}
