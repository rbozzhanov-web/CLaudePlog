import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { v4 as uuidv4 } from 'uuid';

import { createEntries, NewFlightLogEntry } from '@/src/db/queries/entries';
import { notify } from '@/src/lib/dialogs';
import { minutesToHHMM } from '@/src/lib/time';
import { useImportDraftStore } from '@/src/store/importDraft';
import { AppColors, useAppTheme } from '@/src/theme';
import { FlightLogEntry } from '@/src/types/logbook';

const REQUIRED_FIELDS = ['date', 'departureAirport', 'arrivalAirport', 'totalTimeMinutes'] as const;

function missingRequiredFields(fields: Partial<FlightLogEntry>): string[] {
  return REQUIRED_FIELDS.filter((field) => fields[field] === undefined || fields[field] === '');
}

export default function ImportReviewScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { candidates, crossChecks, clear } = useImportDraftStore();
  const [included, setIncluded] = useState<boolean[]>(() =>
    candidates.map((candidate) => !candidate.isDuplicate && candidate.confidence !== 'low'),
  );
  const [importBatchId] = useState(() => uuidv4());
  const [saving, setSaving] = useState(false);

  const includedCount = included.filter(Boolean).length;

  const summary = useMemo(() => {
    const duplicateCount = candidates.filter((c) => c.isDuplicate).length;
    const needsReviewCount = candidates.filter((c) => c.confidence !== 'high').length;
    return { duplicateCount, needsReviewCount };
  }, [candidates]);

  const save = async (toSave: NewFlightLogEntry[]) => {
    setSaving(true);
    try {
      await createEntries(toSave);
      clear();
      router.dismissTo('/');
    } finally {
      setSaving(false);
    }
  };

  const confirmSave = () => {
    if (includedCount === 0) {
      notify('Nothing selected', 'Include at least one flight to save.');
      return;
    }

    const includedCandidates = candidates.filter((_, index) => included[index]);
    const incomplete = includedCandidates.filter((candidate) => missingRequiredFields(candidate.fields).length > 0);
    if (incomplete.length > 0) {
      notify(
        'Some flights need more info',
        `${incomplete.length} selected flight${incomplete.length === 1 ? ' is' : 's are'} missing a required field ` +
          '(date, airports, or total time). Edit them or turn them off before saving.',
      );
      return;
    }

    const toSave = includedCandidates.map((candidate) => ({
      ...(candidate.fields as NewFlightLogEntry),
      importBatchId,
    }));
    save(toSave);
  };

  if (candidates.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No flights to review.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {candidates.length} flight{candidates.length === 1 ? '' : 's'} found · {summary.duplicateCount} already in
          logbook · {summary.needsReviewCount} need review
        </Text>
        {crossChecks.map((check, index) => (
          <Text key={index} style={[styles.crossCheck, check.matches ? styles.crossCheckOk : styles.crossCheckBad]}>
            {check.label}: parsed {minutesToHHMM(check.parsedTotalMinutes)} vs. report{' '}
            {minutesToHHMM(check.reportedTotalMinutes)} {check.matches ? '✓' : '✗'}
          </Text>
        ))}
      </View>

      <FlatList
        data={candidates}
        keyExtractor={(_, index) => String(index)}
        renderItem={({ item: candidate, index }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.route}>
                {candidate.fields.departureAirport ?? '?'} → {candidate.fields.arrivalAirport ?? '?'}
              </Text>
              <Switch
                value={included[index]}
                onValueChange={(value) =>
                  setIncluded((prev) => prev.map((v, i) => (i === index ? value : v)))
                }
              />
            </View>
            <Text style={styles.meta}>
              {candidate.fields.date ?? 'unknown date'}
              {candidate.fields.totalTimeMinutes !== undefined
                ? ` · ${minutesToHHMM(candidate.fields.totalTimeMinutes)}`
                : ''}
              {candidate.fields.aircraftRegistration ? ` · ${candidate.fields.aircraftRegistration}` : ''}
            </Text>

            {candidate.unmatchedFields.length > 0 && (
              <View style={styles.issues}>
                {candidate.unmatchedFields.map((issue) => (
                  <Text key={issue} style={styles.issueText}>
                    • {issue}
                  </Text>
                ))}
              </View>
            )}

            <View style={styles.badgeRow}>
              <Badge label={confidenceLabel(candidate.confidence)} tone={confidenceTone(candidate.confidence)} />
              {candidate.isDuplicate && <Badge label="Already in logbook" tone="warn" />}
              {candidate.fields.nightMinutes !== undefined && (
                <Badge
                  label={`Night ${minutesToHHMM(candidate.fields.nightMinutes)}`}
                  tone="neutral"
                />
              )}
            </View>

            <Pressable
              style={styles.editButton}
              onPress={() => router.push({ pathname: '/import/review-edit/[index]', params: { index: String(index) } })}
            >
              <Text style={styles.editButtonText}>Edit before saving</Text>
            </Pressable>
          </View>
        )}
      />

      <Pressable style={styles.saveButton} onPress={confirmSave} disabled={saving}>
        <Text style={styles.saveButtonText}>{saving ? 'Saving…' : `Save ${includedCount} entries`}</Text>
      </Pressable>
    </View>
  );
}

function confidenceLabel(confidence: string): string {
  if (confidence === 'high') return 'Looks good';
  if (confidence === 'medium') return 'Check this';
  return 'Incomplete';
}

function confidenceTone(confidence: string): 'ok' | 'warn' | 'bad' {
  if (confidence === 'high') return 'ok';
  if (confidence === 'medium') return 'warn';
  return 'bad';
}

function Badge({ label, tone }: { label: string; tone: 'ok' | 'warn' | 'bad' | 'neutral' }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.badge, styles[`badge_${tone}`]]}>
      <Text style={[styles.badgeText, styles[`badgeText_${tone}`]]}>{label}</Text>
    </View>
  );
}

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText: { color: c.textMuted },
    summaryBar: { padding: 16, backgroundColor: c.surfaceAlt, gap: 4 },
    summaryText: { fontSize: 13, color: c.text },
    crossCheck: { fontSize: 12 },
    crossCheckOk: { color: c.success },
    crossCheckBad: { color: c.danger },
    card: {
      padding: 16,
      backgroundColor: c.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    route: { fontSize: 16, fontWeight: '600', color: c.text },
    meta: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    issues: {
      marginTop: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: c.badgeWarn,
      gap: 2,
    },
    issueText: { fontSize: 12, color: c.badgeWarnText, lineHeight: 17 },
    badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    badge_ok: { backgroundColor: c.badgeOk },
    badge_warn: { backgroundColor: c.badgeWarn },
    badge_bad: { backgroundColor: c.badgeBad },
    badge_neutral: { backgroundColor: c.badgeNeutral },
    badgeText: { fontSize: 11, fontWeight: '600', color: c.text },
    badgeText_ok: { color: c.badgeOkText },
    badgeText_warn: { color: c.badgeWarnText },
    badgeText_bad: { color: c.badgeBadText },
    badgeText_neutral: { color: c.badgeNeutralText },
    editButton: { marginTop: 10, alignSelf: 'flex-start' },
    editButtonText: { color: c.primary, fontWeight: '600', fontSize: 13 },
    saveButton: {
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      margin: 16,
    },
    saveButtonText: { color: c.onPrimary, fontWeight: '700', fontSize: 16 },
  });
