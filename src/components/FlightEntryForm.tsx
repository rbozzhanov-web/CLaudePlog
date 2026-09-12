import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { calculateDayNight } from '@/src/lib/daynight/nightCalc';
import { minutesToHHMM } from '@/src/lib/time';
import {
  EMPTY_FORM_VALUES,
  FlightEntryFormValues,
  flightEntryFormSchema,
  formValuesToEntry,
} from '@/src/lib/formSchema';
import { NewFlightLogEntry, listCrewNames } from '@/src/db/queries/entries';
import { AppColors, useAppTheme } from '@/src/theme';
import { CrewNameField } from './CrewNameField';
import { DateField } from './DateField';


interface FlightEntryFormProps {
  initialValues?: FlightEntryFormValues;
  onSubmit: (entry: NewFlightLogEntry) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  submitLabel?: string;
}

export function FlightEntryForm({ initialValues, onSubmit, onDelete, submitLabel = 'Save' }: FlightEntryFormProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FlightEntryFormValues>({
    resolver: zodResolver(flightEntryFormSchema),
    defaultValues: initialValues ?? EMPTY_FORM_VALUES,
  });

  const [nightCalcNote, setNightCalcNote] = useState<string>();
  // Loaded once per form: the names come from the logbook itself, so they only change when an
  // entry is saved — by which point this form is closing.
  const [crewNames, setCrewNames] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    listCrewNames().then((names) => {
      if (!cancelled) setCrewNames(names);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const recalculateDayNight = () => {
    const values = getValues();
    const result = calculateDayNight({
      date: values.date,
      departureAirport: values.departureAirport.toUpperCase(),
      arrivalAirport: values.arrivalAirport.toUpperCase(),
      departureTime: values.timeOut,
      totalTimeMinutes: formValuesToEntry(values).totalTimeMinutes,
    });

    if (!result) {
      setNightCalcNote('Could not compute — check date, airports, and time out (UTC).');
      return;
    }

    setValue('dayTime', minutesToHHMM(result.dayMinutes), { shouldDirty: true });
    setValue('nightTime', minutesToHHMM(result.nightMinutes), { shouldDirty: true });
    setValue('dayTakeoffs', String(result.dayTakeoffs), { shouldDirty: true });
    setValue('nightTakeoffs', String(result.nightTakeoffs), { shouldDirty: true });
    setValue('dayLandings', String(result.dayLandings), { shouldDirty: true });
    setValue('nightLandings', String(result.nightLandings), { shouldDirty: true });
    setNightCalcNote('Day/night computed from real sun position at each airport.');
  };

  const submit = handleSubmit(async (values) => {
    await onSubmit(formValuesToEntry(values));
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Section title="Flight info">
        <DateField control={control} name="date" label="Date (UTC)" error={errors.date?.message} />
        <TextField control={control} name="flightNumber" label="Flight number" autoCapitalize="characters" />
        <View style={styles.row}>
          <TextField
            control={control}
            name="departureAirport"
            label="From"
            autoCapitalize="characters"
            maxLength={4}
            style={styles.half}
            error={errors.departureAirport?.message}
          />
          <TextField
            control={control}
            name="arrivalAirport"
            label="To"
            autoCapitalize="characters"
            maxLength={4}
            style={styles.half}
            error={errors.arrivalAirport?.message}
          />
        </View>
        <View style={styles.row}>
          <TextField control={control} name="aircraftType" label="Aircraft type" style={styles.half} />
          <TextField
            control={control}
            name="aircraftRegistration"
            label="Registration"
            autoCapitalize="characters"
            style={styles.half}
          />
        </View>
      </Section>

      <Section title="Block times (UTC)">
        <View style={styles.row}>
          <TextField control={control} name="timeOut" label="Time out" placeholder="HH:MM" style={styles.half} />
          <TextField control={control} name="timeIn" label="Time in" placeholder="HH:MM" style={styles.half} />
        </View>
        <TextField
          control={control}
          name="totalTime"
          label="Total time"
          placeholder="HH:MM"
          error={errors.totalTime?.message}
        />
        <Pressable style={styles.recalcButton} onPress={recalculateDayNight}>
          <Text style={styles.recalcButtonText}>Compute day/night from airports &amp; times</Text>
        </Pressable>
        {nightCalcNote && <Text style={styles.hint}>{nightCalcNote}</Text>}
      </Section>

      <Section title="Duty role &amp; conditions">
        <View style={styles.row}>
          <TextField control={control} name="picTime" label="PIC" placeholder="HH:MM" style={styles.half} />
          <TextField control={control} name="sicTime" label="SIC" placeholder="HH:MM" style={styles.half} />
        </View>
        <View style={styles.row}>
          <TextField control={control} name="dualReceivedTime" label="Dual received" placeholder="HH:MM" style={styles.half} />
          <TextField control={control} name="dualGivenTime" label="Dual given" placeholder="HH:MM" style={styles.half} />
        </View>
        <View style={styles.row}>
          <TextField control={control} name="soloTime" label="Solo" placeholder="HH:MM" style={styles.half} />
          <TextField control={control} name="crossCountryTime" label="Cross-country" placeholder="HH:MM" style={styles.half} />
        </View>
        <View style={styles.row}>
          <TextField control={control} name="dayTime" label="Day time" placeholder="HH:MM" style={styles.half} />
          <TextField control={control} name="nightTime" label="Night time" placeholder="HH:MM" style={styles.half} />
        </View>
        <View style={styles.row}>
          <TextField control={control} name="actualInstrumentTime" label="Actual instr." placeholder="HH:MM" style={styles.half} />
          <TextField control={control} name="simulatedInstrumentTime" label="Simulated instr." placeholder="HH:MM" style={styles.half} />
        </View>
      </Section>

      <Section title="Simulator">
        <View style={styles.row}>
          <TextField control={control} name="simulatorTime" label="Session time" placeholder="HH:MM" style={styles.half} />
          <TextField
            control={control}
            name="simulatorType"
            label="Device / check"
            placeholder="VPTI, LPC…"
            autoCapitalize="characters"
            style={styles.half}
          />
        </View>
        <Text style={styles.hint}>
          Training-device time. Kept out of flight totals, and day/night isn&apos;t computed for it.
        </Text>
      </Section>

      <Section title="Landings &amp; approaches">
        <View style={styles.row}>
          <TextField control={control} name="dayTakeoffs" label="Day takeoffs" keyboardType="number-pad" style={styles.half} />
          <TextField control={control} name="nightTakeoffs" label="Night takeoffs" keyboardType="number-pad" style={styles.half} />
        </View>
        <View style={styles.row}>
          <TextField control={control} name="dayLandings" label="Day landings" keyboardType="number-pad" style={styles.half} />
          <TextField control={control} name="nightLandings" label="Night landings" keyboardType="number-pad" style={styles.half} />
        </View>
        <TextField control={control} name="instrumentApproaches" label="Instrument approaches" keyboardType="number-pad" />
      </Section>

      <Section title="Crew &amp; remarks">
        <CrewNameField
          control={control}
          name="pilotInCommandName"
          label="PIC name (if not you)"
          suggestions={crewNames}
        />
        <CrewNameField
          control={control}
          name="secondInCommandName"
          label="SIC / FO name"
          suggestions={crewNames}
        />
        <CrewNameField control={control} name="otherCrewNames" label="Other crew" suggestions={crewNames} />
        <TextField control={control} name="remarks" label="Remarks" multiline />
      </Section>

      <Pressable style={styles.submitButton} onPress={submit} disabled={isSubmitting}>
        <Text style={styles.submitButtonText}>{isSubmitting ? 'Saving…' : submitLabel}</Text>
      </Pressable>

      {onDelete && (
        <Pressable style={styles.deleteButton} onPress={onDelete}>
          <Text style={styles.deleteButtonText}>Delete entry</Text>
        </Pressable>
      )}
    </ScrollView>
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

interface TextFieldProps {
  control: ReturnType<typeof useForm<FlightEntryFormValues>>['control'];
  name: keyof FlightEntryFormValues;
  label: string;
  placeholder?: string;
  error?: string;
  style?: object;
  autoCapitalize?: 'none' | 'characters' | 'words' | 'sentences';
  keyboardType?: 'default' | 'number-pad';
  maxLength?: number;
  multiline?: boolean;
}

function TextField({
  control,
  name,
  label,
  placeholder,
  error,
  style,
  autoCapitalize = 'none',
  keyboardType = 'default',
  maxLength,
  multiline,
}: TextFieldProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <View style={[styles.field, style]}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={[styles.input, multiline && styles.multilineInput]}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            placeholderTextColor={colors.placeholder}
            autoCapitalize={autoCapitalize}
            keyboardType={keyboardType}
            maxLength={maxLength}
            multiline={multiline}
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      )}
    />
  );
}

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 48 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: c.text },
    row: { flexDirection: 'row', gap: 12 },
    field: { marginBottom: 12, flex: 1 },
    half: { flex: 1 },
    label: { fontSize: 13, color: c.textMuted, marginBottom: 4 },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.card,
      color: c.text,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
    },
    multilineInput: { minHeight: 80, textAlignVertical: 'top' },
    errorText: { color: c.danger, fontSize: 12, marginTop: 4 },
    hint: { fontSize: 12, color: c.textMuted, marginTop: 6 },
    recalcButton: {
      marginTop: 8,
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.accent,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center',
    },
    recalcButtonText: { color: c.text, fontWeight: '600' },
    submitButton: {
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    submitButtonText: { color: c.onPrimary, fontWeight: '700', fontSize: 16 },
    deleteButton: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
    deleteButtonText: { color: c.danger, fontWeight: '600' },
  });
