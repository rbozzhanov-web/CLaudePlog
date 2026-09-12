import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useDataRefresh } from '@/src/db/dataVersion';
import { createEntry, listEntries } from '@/src/db/queries/entries';
import { FlightLogEntry } from '@/src/types/logbook';

/**
 * Smoke-test screen for the SQLite-web port — this is not the real Logbook UI yet (that gets
 * ported from Pilot-Logbook's app/(tabs)/index.tsx once this proves the database layer actually
 * works end to end on web: a write followed by a page reload has to still show the entry, which
 * only a real OPFS-backed write confirms.
 */
export default function LogbookScreen() {
  const [entries, setEntries] = useState<FlightLogEntry[]>([]);

  const reload = useCallback(() => {
    listEntries().then(setEntries);
  }, []);

  useDataRefresh(reload);

  const addTestEntry = async () => {
    const now = new Date().toISOString().slice(0, 10);
    await createEntry({
      date: now,
      departureAirport: 'UAAA',
      arrivalAirport: 'UACC',
      totalTimeMinutes: 115,
      picMinutes: 0,
      sicMinutes: 115,
      dualReceivedMinutes: 0,
      dualGivenMinutes: 0,
      soloMinutes: 0,
      dayMinutes: 115,
      nightMinutes: 0,
      actualInstrumentMinutes: 0,
      simulatedInstrumentMinutes: 0,
      crossCountryMinutes: 0,
      simulatorMinutes: 0,
      dayTakeoffs: 1,
      nightTakeoffs: 0,
      dayLandings: 1,
      nightLandings: 0,
      instrumentApproaches: 0,
      source: 'manual',
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Logbook</Text>
      <Pressable style={styles.button} onPress={addTestEntry}>
        <Text style={styles.buttonText}>Add test flight (UAAA→UACC)</Text>
      </Pressable>
      <Text style={styles.hint}>
        Reload the page after adding one — if it is still here, OPFS actually persisted it.
      </Text>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text>
              {item.date} · {item.departureAirport} → {item.arrivalAirport} ·{' '}
              {item.totalTimeMinutes} min
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.hint}>No entries yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  button: {
    backgroundColor: '#0B1E3D',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  hint: { fontSize: 13, color: '#666' },
  row: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ccc' },
});
