import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useDatabaseMigrations } from '@/src/db/migrate';
import { useStoredCodeNormalisation } from '@/src/db/useCodeNormalisation';
import { startAutoBackup } from '@/src/lib/backup/autoBackup';
import { AppColors, navigationTheme, useAppTheme } from '@/src/theme';

/**
 * Expo Router wraps a route in this boundary only if the route file exports a component named
 * `ErrorBoundary` (receives `{ error, retry }`) — without it, any uncaught render/effect error
 * anywhere in the app unmounts the tree to a blank screen with no visible message.
 */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.center}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
      <Pressable onPress={retry} style={styles.retryButton}>
        <Text style={styles.retryButtonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const { dark, colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const theme = useMemo(() => navigationTheme(dark), [dark]);
  const { success, error } = useDatabaseMigrations();
  useStoredCodeNormalisation(success);

  useEffect(() => {
    if (!success) return undefined;
    return startAutoBackup();
  }, [success]);

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="auto" />
      {error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Database error</Text>
          <Text style={styles.errorMessage}>{error.message}</Text>
        </View>
      ) : !success ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <Stack screenOptions={{ headerTitleStyle: { fontWeight: '600' } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="entry/new" options={{ title: 'New flight' }} />
          <Stack.Screen name="entry/[id]" options={{ title: 'Edit flight' }} />
          <Stack.Screen name="import/pick" options={{ title: 'Import from PDF' }} />
        </Stack>
      )}
    </ThemeProvider>
  );
}

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: c.background,
    },
    errorTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: c.text },
    errorMessage: { color: c.danger, textAlign: 'center' },
    retryButton: {
      marginTop: 16,
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 20,
    },
    retryButtonText: { color: c.onPrimary, fontWeight: '700' },
  });
