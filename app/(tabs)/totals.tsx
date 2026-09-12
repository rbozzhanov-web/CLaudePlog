import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenTitle } from '@/src/components/ScreenTitle';
import { getTotals, LogbookTotals } from '@/src/db/queries/totals';
import { minutesToDecimalHours, minutesToHHMM } from '@/src/lib/time';
import { useDataRefresh } from '@/src/db/dataVersion';
import { AppColors, useAppTheme } from '@/src/theme';


const ZERO: LogbookTotals = {
  entryCount: 0,
  totalMinutes: 0,
  picMinutes: 0,
  sicMinutes: 0,
  dualReceivedMinutes: 0,
  dualGivenMinutes: 0,
  soloMinutes: 0,
  dayMinutes: 0,
  nightMinutes: 0,
  instrumentMinutes: 0,
  crossCountryMinutes: 0,
  simulatorMinutes: 0,
  dayLandings: 0,
  nightLandings: 0,
  instrumentApproaches: 0,
};

export default function TotalsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [totals, setTotals] = useState<LogbookTotals>(ZERO);
  const insets = useSafeAreaInsets();

  useDataRefresh(useCallback(() => {
    getTotals().then(setTotals);
  }, []));

  return (
    <View style={styles.screen}>
      <ScreenTitle title="Totals" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]}
      >
        <Stat label="Total time" minutes={totals.totalMinutes} />
        <Stat label="PIC" minutes={totals.picMinutes} />
        <Stat label="SIC" minutes={totals.sicMinutes} />
        <Stat label="Dual received" minutes={totals.dualReceivedMinutes} />
        <Stat label="Dual given" minutes={totals.dualGivenMinutes} />
        <Stat label="Solo" minutes={totals.soloMinutes} />
        <Stat label="Day" minutes={totals.dayMinutes} />
        <Stat label="Night" minutes={totals.nightMinutes} />
        <Stat label="Instrument" minutes={totals.instrumentMinutes} />
        <Stat label="Cross-country" minutes={totals.crossCountryMinutes} />
        <View style={styles.divider} />
        <Stat label="Simulator" minutes={totals.simulatorMinutes} />
        <View style={styles.divider} />
        <CountStat label="Day landings" value={totals.dayLandings} />
        <CountStat label="Night landings" value={totals.nightLandings} />
        <CountStat label="Instrument approaches" value={totals.instrumentApproaches} />
        <CountStat label="Total flights logged" value={totals.entryCount} />
      </ScrollView>
    </View>
  );
}

function Stat({ label, minutes }: { label: string; minutes: number }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueGroup}>
        <Text style={styles.value}>{minutesToHHMM(minutes)}</Text>
        <Text style={styles.subvalue}>{minutesToDecimalHours(minutes)}h</Text>
      </View>
    </View>
  );
}

function CountStat({ label, value }: { label: string; value: number }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 16 },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    label: { fontSize: 15, color: c.text },
    valueGroup: { alignItems: 'flex-end' },
    value: { fontSize: 16, fontWeight: '600', color: c.text, fontVariant: ['tabular-nums'] },
    subvalue: { fontSize: 12, color: c.textMuted },
    divider: { height: 16 },
  });
