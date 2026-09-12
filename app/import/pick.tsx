import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/src/theme';

/**
 * PDF import isn't ported yet. The native app runs pdf.js inside a hidden WebView, since Hermes
 * can't execute it directly — a browser has no such problem, it can run pdf.js in-page, which is
 * actually simpler than the native setup. That's real follow-up work, not a stopgap to fix later
 * for its own sake: it just isn't part of this first web port, which is about the logbook and pay
 * calculator working at all.
 */
export default function ImportPickScreen() {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>PDF import isn&apos;t here yet</Text>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Add flights manually for now with &quot;+ New flight&quot;, or use the iOS app to import a
        roster PDF — its backup can be restored here once export/restore is ported too.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  hint: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
