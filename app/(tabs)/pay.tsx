import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenTitle } from '@/src/components/ScreenTitle';
import { useDataRefresh } from '@/src/db/dataVersion';
import { listEntries } from '@/src/db/queries/entries';
import { CREWPAY_NORM_VERSION } from '@/src/lib/crewPay/normsTable';
import { EMPTY_MONTHLY_DAYS, MonthlyDays, PaySettings, calculatePayPeriod } from '@/src/lib/crewPay/payPeriod';
import { loadMonthlyRates, saveMonthlyRate } from '@/src/lib/crewPay/exchangeRateStore';
import { loadMonthlyDays, saveMonthlyDays } from '@/src/lib/crewPay/payDaysStore';
import { fetchNbrkEurRate } from '@/src/lib/crewPay/nbrkRate';
import { loadPaySettings, savePaySettings } from '@/src/lib/crewPay/paySettingsStore';
import { listYears } from '@/src/lib/logbookNavigation';
import { minutesToHHMM } from '@/src/lib/time';
import { AppColors, useAppTheme } from '@/src/theme';
import { FlightLogEntry } from '@/src/types/logbook';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const money = (value: number) =>
  value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Midnight-ending instant of a "YYYY-MM" month's last calendar day. */
function monthEndDate(month: string): Date {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  return new Date(year, monthNumber, 0, 23, 59, 59, 999);
}

/** No official NBRK rate can exist yet for a month whose last day hasn't happened. */
function monthHasEnded(month: string): boolean {
  return monthEndDate(month) <= new Date();
}

/**
 * The euro-denominated terms, in the order a payslip reads, plus the tenge-native ones that
 * follow them: transportAllowance because it is not part of the euro contract at all, the three
 * day-rates because they are Kazakhstan's average-daily-earnings figure (already tenge, and
 * already averaged across months — see PaySettings.vacationDayRateTenge), advance because it is a
 * plain tenge withholding, corporatePensionRate/alimonyRate because they are percentages applied
 * to tenge bases rather than amounts.
 */
const FIELDS: { key: keyof PaySettings; label: string; hint?: string; percentage?: boolean }[] = [
  { key: 'hourlyRateEur', label: 'Ставка за час налёта, €' },
  { key: 'monthlySalaryEur', label: 'Оклад (gross salary), €' },
  { key: 'nightAllowanceEur', label: 'Доплата за ночное время, €' },
  { key: 'productivityAllowanceEur', label: 'Доплата за продуктивность, €' },
  {
    key: 'vacationDayRateTenge',
    label: 'Ставка отпускных, ₸/день',
    hint: 'Средний дневной заработок по ведомости — меняется от месяца к месяцу, обновляйте по факту',
  },
  {
    key: 'trainingDayRateTenge',
    label: 'Ставка обучения, ₸/день',
    hint: 'Средний дневной заработок по ведомости — меняется от месяца к месяцу, обновляйте по факту',
  },
  {
    key: 'medicalExamDayRateTenge',
    label: 'Ставка за справки, ₸/день',
    hint: 'Средний дневной заработок по ведомости — меняется от месяца к месяцу, обновляйте по факту',
  },
  { key: 'transportAllowance', label: 'Фикс доплата за транспорт, ₸', hint: 'Не в евро — фиксированная сумма в тенге' },
  {
    key: 'corporatePensionRate',
    label: 'Взнос в КорпПП, %',
    hint: 'Начисляется как косвенный доход от обычного заработка и удерживается обратно',
    percentage: true,
  },
  { key: 'advance', label: 'Аванс, ₸' },
  {
    key: 'alimonyRate',
    label: 'Алименты, %',
    hint: 'Ст. 95, закон №261-IV — от суммы после ОПВ, ВОСМС, ИПН и взноса в КорпПП, не от начислений',
    percentage: true,
  },
];

export default function PayScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [entries, setEntries] = useState<FlightLogEntry[]>([]);
  const [settings, setSettings] = useState<PaySettings>(loadPaySettings);
  const [rates, setRates] = useState<Record<string, number>>(loadMonthlyRates);
  const [monthlyDays, setMonthlyDays] = useState<Record<string, MonthlyDays>>(loadMonthlyDays);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  // The single source of truth for "what rate does this month have right now", kept in lockstep
  // with `rates` state by every write below — read synchronously (never via a post-render effect)
  // so a manual edit can never lose a race against a slower in-flight NBRK fetch for the same
  // month: whichever writes ratesRef.current second wins, and both writes are synchronous.
  const ratesRef = useRef(rates);
  const attemptedRef = useRef<Set<string>>(new Set());
  const [fetchingMonth, setFetchingMonth] = useState<string | undefined>(undefined);
  const [fetchErrorMonth, setFetchErrorMonth] = useState<string | undefined>(undefined);

  useDataRefresh(
    useCallback(() => {
      listEntries().then(setEntries);
    }, []),
  );

  const setRateValue = useCallback((targetMonth: string, value: number) => {
    ratesRef.current = { ...ratesRef.current, [targetMonth]: value };
    setRates(ratesRef.current);
    saveMonthlyRate(targetMonth, value);
  }, []);

  const attemptFetch = useCallback(
    async (candidate: string, isTarget: boolean) => {
      if (attemptedRef.current.has(candidate)) return;
      attemptedRef.current.add(candidate);
      if (isTarget) {
        setFetchingMonth(candidate);
        setFetchErrorMonth(undefined);
      }
      try {
        const rate = await fetchNbrkEurRate(candidate);
        // A manual edit that landed while this was in flight wins — never overwrite it.
        if (ratesRef.current[candidate] === undefined) setRateValue(candidate, rate);
      } catch {
        if (isTarget) setFetchErrorMonth(candidate);
      } finally {
        if (isTarget) setFetchingMonth((current) => (current === candidate ? undefined : current));
      }
    },
    [setRateValue],
  );

  // On mount and whenever the viewed month changes: fetch that month's own rate first (with the
  // loading indicator below), then silently backfill January..month-1 of the same year in the
  // background — sequentially, since this hits an undocumented, unauthenticated NBRK endpoint and
  // there is no reason to hammer it in parallel. A month already attempted this session, one with
  // a rate already stored, or one whose last day hasn't happened yet, is skipped.
  useEffect(() => {
    const year = month.slice(0, 4);
    const monthNumber = Number(month.slice(5, 7));
    const monthsInYearSoFar = Array.from(
      { length: monthNumber },
      (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`,
    );
    const orderedMonths = [month, ...monthsInYearSoFar.filter((m) => m !== month)];

    let cancelled = false;
    (async () => {
      for (const candidate of orderedMonths) {
        if (cancelled) return;
        if (ratesRef.current[candidate] !== undefined) continue;
        if (!monthHasEnded(candidate)) continue;
        await attemptFetch(candidate, candidate === month);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [month, attemptFetch]);

  const retryRateFetch = () => {
    attemptedRef.current.delete(month);
    attemptFetch(month, true);
  };

  const years = useMemo(() => listYears(entries), [entries]);
  const result = useMemo(
    () => calculatePayPeriod(entries, month, settings, rates, monthlyDays),
    [entries, month, settings, rates, monthlyDays],
  );

  const update = (key: keyof PaySettings, text: string, percentage?: boolean) => {
    // Commas are what a Russian keyboard offers for a decimal point.
    const value = Number(text.replace(/\s/g, '').replace(',', '.'));
    const parsed = Number.isFinite(value) ? value : 0;
    // Percentage fields are typed as whole numbers (50 for 50%) but stored as fractions, since
    // that is what calculateNetPay/calculateEarnings actually multiply by.
    const next = { ...settings, [key]: percentage ? parsed / 100 : parsed };
    setSettings(next);
    savePaySettings(next);
  };

  const updateRate = (text: string) => {
    const value = Number(text.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(value)) return;
    setRateValue(month, value);
  };

  const updateDays = (key: keyof MonthlyDays, text: string) => {
    const value = Number(text.replace(/\s/g, '').replace(',', '.'));
    const parsed = Number.isFinite(value) ? value : 0;
    const current = monthlyDays[month] ?? EMPTY_MONTHLY_DAYS;
    const next = { ...current, [key]: parsed };
    setMonthlyDays((prev) => ({ ...prev, [month]: next }));
    saveMonthlyDays(month, next);
  };

  const [year, monthIndex] = [month.slice(0, 4), Number(month.slice(5, 7)) - 1];
  const daysThisMonth = monthlyDays[month] ?? EMPTY_MONTHLY_DAYS;
  const { hours, earnings, payroll, eurToKztRateUsed, fxFallbackMonths } = result;
  const rateMissingThisMonth = fxFallbackMonths.includes(month);
  // Every fallback month except possibly the current one — those already show their own notice
  // next to the rate field, so listing it again in the general warning would be redundant.
  const earlierFallbackMonths = fxFallbackMonths.filter((m) => m !== month);

  return (
    <View style={styles.screen}>
      <ScreenTitle title="Зарплата" />

      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.periodRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {(years.length ? years : [year]).map((value) => (
              <Chip
                key={value}
                label={value}
                active={value === year}
                onPress={() => setMonth(`${value}-${month.slice(5, 7)}`)}
              />
            ))}
          </ScrollView>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {MONTHS.map((name, index) => (
            <Chip
              key={name}
              label={name.slice(0, 3)}
              active={index === monthIndex}
              onPress={() => setMonth(`${year}-${String(index + 1).padStart(2, '0')}`)}
            />
          ))}
        </ScrollView>

        <View style={styles.rateField}>
          <View style={styles.rateFieldHeader}>
            <Text style={[styles.fieldLabel, styles.rateFieldLabel]}>
              Курс НБРК EUR/KZT (на последний день месяца)
            </Text>
            {monthHasEnded(month) && (
              <Pressable onPress={retryRateFetch} disabled={fetchingMonth === month} hitSlop={8}>
                <Text style={styles.refreshLink}>🔄 Обновить</Text>
              </Pressable>
            )}
          </View>
          <TextInput
            // Forces a remount on month change so the field shows *that* month's rate rather than
            // keeping whatever was last typed — defaultValue only reads once per mounted instance.
            key={month}
            style={styles.input}
            defaultValue={rates[month] ? String(rates[month]) : ''}
            onChangeText={updateRate}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.placeholder}
          />
          <Text style={styles.hint}>
            Официальный курс Нацбанка РК, а не рыночный или банковский — компания переводит
            евровые суммы именно по нему. Подтягивается автоматически на конец месяца, но поле
            остаётся редактируемым.
          </Text>
          {fetchingMonth === month && <Text style={styles.hint}>Загрузка курса НБРК…</Text>}
          {fetchErrorMonth === month && (
            <Text style={styles.warning}>Не удалось получить курс НБРК — введите вручную</Text>
          )}
          {rateMissingThisMonth && fetchingMonth !== month && fetchErrorMonth !== month && (
            <Text style={styles.warning}>
              Курс на этот месяц не введён
              {eurToKztRateUsed > 0
                ? ` — использован ближайший предыдущий: ${eurToKztRateUsed}`
                : ' — евровые суммы посчитаны как 0'}
            </Text>
          )}
        </View>

        <View style={styles.daysField}>
          <Text style={styles.fieldLabel}>Дни за месяц</Text>
          <View style={styles.daysRow}>
            <DayInput
              label="Отпуск"
              value={daysThisMonth.vacationDays}
              month={month}
              onChangeText={(text) => updateDays('vacationDays', text)}
            />
            <DayInput
              label="Обучение"
              value={daysThisMonth.trainingDays}
              month={month}
              onChangeText={(text) => updateDays('trainingDays', text)}
            />
            <DayInput
              label="Справки"
              value={daysThisMonth.medicalExamDays}
              month={month}
              onChangeText={(text) => updateDays('medicalExamDays', text)}
            />
          </View>
          <Text style={styles.hint}>
            Количество дней за этот месяц — сумму по ставке из настроек ниже считает приложение.
          </Text>
        </View>

        <Section title="Налёт к оплате">
          <Row label="По нормам CrewPay" value={minutesToHHMM(hours.normMinutes)} />
          {hours.sectorsOnActual > 0 && (
            <Row label="По фактическому времени" value={minutesToHHMM(hours.actualMinutes)} />
          )}
          <Row label="Итого часов" value={minutesToHHMM(hours.totalMinutes)} strong />
          <Text style={styles.hint}>
            {hours.sectorsOnNorm + hours.sectorsOnActual} секторов · норма v{CREWPAY_NORM_VERSION}
          </Text>
          {hours.unlistedSectors.length > 0 && (
            <Text style={styles.warning}>
              Нет в списке норм, взято фактическое время: {hours.unlistedSectors.join(', ')}
            </Text>
          )}
        </Section>

        <Section title="Начисления">
          <Row label="Оклад" value={money(earnings.salary)} />
          <Row label="Налёт" value={money(earnings.flightPay)} />
          <Row label="Ночное время" value={money(earnings.nightAllowance)} />
          <Row label="Продуктивность" value={money(earnings.productivityAllowance)} />
          {earnings.vacationPay !== 0 && <Row label="Отпускные" value={money(earnings.vacationPay)} />}
          {earnings.trainingPay !== 0 && <Row label="Обучение пилотов" value={money(earnings.trainingPay)} />}
          {earnings.medicalExamPay !== 0 && (
            <Row label="Оплата справок" value={money(earnings.medicalExamPay)} />
          )}
          <Row label="Транспорт" value={money(earnings.transportAllowance)} />
          <Row label="Косвенный доход" value={money(earnings.indirectIncome)} />
          <Row label="Итого начисления" value={money(earnings.total)} strong />
          {earlierFallbackMonths.length > 0 && (
            <Text style={styles.warning}>
              Курс не введён для {earlierFallbackMonths.join(', ')} — использован ближайший
              предыдущий курс года, что может сдвинуть накопленную базу ИПН
            </Text>
          )}
        </Section>

        <Section title="Удержания">
          <Row label="ОПВ" value={money(payroll.opv)} />
          <Row label="ВОСМС" value={money(payroll.vosms)} />
          <Row label="ИПН" value={money(payroll.ipn)} />
          <Row label="Взнос в КорпПП" value={money(payroll.voluntaryPension)} />
          <Row label="Алименты" value={money(payroll.alimony)} />
          <Row label="Прочие удержания" value={money(payroll.otherDeductions)} />
          <Row label="Итого удержания" value={money(payroll.totalDeductions)} strong />
          {payroll.taxedAtLowerRate > 0 && payroll.taxedAtUpperRate > 0 && (
            <Text style={styles.hint}>
              ИПН по двум ступеням: {money(payroll.taxedAtLowerRate)} по 10% и{' '}
              {money(payroll.taxedAtUpperRate)} по 15%
            </Text>
          )}
        </Section>

        <View style={styles.netBlock}>
          <Text style={styles.netLabel}>К выплате</Text>
          <Text style={styles.netValue}>{money(payroll.netPay)}</Text>
        </View>

        <Section title="Ставки и доплаты">
          <Text style={styles.hint}>
            Из контракта — из опубликованных норм они не выводятся. Применяются ко всем месяцам
            года, поэтому при изменении в середине года ранние месяцы считаются приблизительно.
            Евровые строки переводятся в тенге по курсу выбранного месяца — см. поле выше.
          </Text>
          {FIELDS.map((field) => {
            const stored = settings[field.key];
            const displayed = field.percentage ? stored * 100 : stored;
            return (
              <View key={field.key} style={styles.field}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  defaultValue={displayed ? String(displayed) : ''}
                  onChangeText={(text) => update(field.key, text, field.percentage)}
                  // Only the last field in FIELDS can end up under the keyboard with nothing left
                  // to scroll into view below it — automaticallyAdjustKeyboardInsets on the outer
                  // ScrollView covers everything else, but its "scroll first responder into view"
                  // heuristic is not guaranteed this close to a nested-ScrollView-heavy screen's
                  // content edge, so this field also forces the scroll deterministically.
                  onFocus={
                    field.key === 'alimonyRate'
                      ? () => scrollRef.current?.scrollToEnd({ animated: true })
                      : undefined
                  }
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.placeholder}
                />
                {field.hint && <Text style={styles.hint}>{field.hint}</Text>}
              </View>
            );
          })}
        </Section>
      </ScrollView>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function DayInput({
  label,
  value,
  month,
  onChangeText,
}: {
  label: string;
  value: number;
  month: string;
  onChangeText: (text: string) => void;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.dayInputGroup}>
      <Text style={styles.dayInputLabel}>{label}</Text>
      <TextInput
        // Remounts on month change, same trick as the rate field above — defaultValue only reads
        // once per mounted instance, so this keeps it showing *that* month's day count.
        key={month}
        style={styles.dayInput}
        defaultValue={value ? String(value) : ''}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={colors.placeholder}
      />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.row, strong && styles.rowStrong]}>
      <Text style={[styles.rowLabel, strong && styles.rowLabelStrong]}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowValueStrong]}>{value}</Text>
    </View>
  );
}

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    container: { flex: 1 },
    content: { padding: 16, paddingBottom: 48 },
    periodRow: { marginBottom: 8 },
    chips: { gap: 8, paddingBottom: 8 },
    chip: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { color: c.textMuted, fontWeight: '600', fontSize: 13 },
    chipTextActive: { color: c.onPrimary },

    rateField: {
      marginTop: 8,
      marginBottom: 4,
      padding: 12,
      backgroundColor: c.surfaceAlt,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.accent,
    },
    rateFieldHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
      gap: 8,
    },
    rateFieldLabel: { flex: 1, marginBottom: 0 },
    refreshLink: { fontSize: 13, fontWeight: '600', color: c.primary },

    daysField: {
      marginTop: 4,
      marginBottom: 4,
      padding: 12,
      backgroundColor: c.surfaceAlt,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    daysRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    dayInputGroup: { flex: 1 },
    dayInputLabel: { fontSize: 12, color: c.textMuted, marginBottom: 4 },
    dayInput: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.card,
      color: c.text,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 15,
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
    },

    section: { marginTop: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 8 },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      paddingVertical: 7,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    rowStrong: { borderBottomWidth: 0, borderTopWidth: 1, borderTopColor: c.accent, marginTop: 4 },
    rowLabel: { fontSize: 14, color: c.textMuted, flex: 1 },
    rowLabelStrong: { color: c.text, fontWeight: '700' },
    rowValue: { fontSize: 15, color: c.text, fontVariant: ['tabular-nums'] },
    rowValueStrong: { fontWeight: '700' },

    netBlock: {
      marginTop: 24,
      backgroundColor: c.surfaceAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.accent,
      padding: 16,
      alignItems: 'center',
    },
    netLabel: { fontSize: 13, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    netValue: {
      fontSize: 28,
      fontWeight: '800',
      color: c.text,
      marginTop: 4,
      fontVariant: ['tabular-nums'],
    },

    hint: { fontSize: 12, color: c.textMuted, marginTop: 6, lineHeight: 17 },
    warning: { fontSize: 12, color: c.warning, marginTop: 6, lineHeight: 17 },
    field: { marginTop: 12 },
    fieldLabel: { fontSize: 13, color: c.textMuted, marginBottom: 4 },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.card,
      color: c.text,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      fontVariant: ['tabular-nums'],
    },
  });
