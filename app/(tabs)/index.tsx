import { StyleSheet, Text, View } from 'react-native';

export default function LogbookScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Logbook</Text>
      <Text style={styles.hint}>Placeholder — data layer and real screen come next.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: '700' },
  hint: { fontSize: 13, color: '#666' },
});
