import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { listEntries } from '@/src/db/queries/entries';
import { annotateDuplicates } from '@/src/lib/pdfImport/dedupe';
import { extractPdfPages } from '@/src/lib/pdfImport/extractText';
import { parseRoster } from '@/src/lib/pdfImport/parseRoster';
import { useImportDraftStore } from '@/src/store/importDraft';
import { AppColors, useAppTheme } from '@/src/theme';

type Status = 'idle' | 'extracting' | 'parsing' | 'error';

const STATUS_LABEL: Record<Status, string> = {
  idle: 'Choose PDF report',
  error: 'Choose PDF report',
  extracting: 'Reading PDF…',
  parsing: 'Parsing flights…',
};

/** Opens a native file picker restricted to PDFs; resolves undefined if the pilot cancels. */
function pickPdfFile(): Promise<File | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,.pdf';

    const finish = (file: File | undefined) => {
      input.remove();
      resolve(file);
    };

    input.onchange = () => finish(input.files?.[0] ?? undefined);
    // Chromium and Safari both fire `cancel` on a dismissed file dialog.
    input.oncancel = () => finish(undefined);

    document.body.appendChild(input);
    input.click();
  });
}

export default function ImportPickScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const setDraft = useImportDraftStore((state) => state.setDraft);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string>();

  const pickAndImport = async () => {
    setErrorMessage(undefined);

    const file = await pickPdfFile();
    if (!file) return;

    try {
      setStatus('extracting');
      const pages = await extractPdfPages(file);

      setStatus('parsing');
      const { candidates, crossChecks, ruleId } = parseRoster(pages);
      const existingEntries = await listEntries();
      const annotated = annotateDuplicates(candidates, existingEntries);

      setDraft({ candidates: annotated, crossChecks, ruleId });
      setStatus('idle');
      router.push('/import/review');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setStatus('error');
    }
  };

  const busy = status === 'extracting' || status === 'parsing';

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        Choose a flight-time report or roster PDF from your airline. It will be parsed
        automatically, and you'll review every flight — including recomputed real day/night
        time — before anything is saved to your logbook.
      </Text>

      <Pressable style={styles.button} onPress={pickAndImport} disabled={busy}>
        {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.buttonText}>{STATUS_LABEL[status]}</Text>}
      </Pressable>

      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
    </View>
  );
}

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, padding: 24 },
    description: { fontSize: 15, color: c.text, lineHeight: 21, marginBottom: 24 },
    button: {
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
    },
    buttonText: { color: c.onPrimary, fontWeight: '700', fontSize: 16 },
    error: { color: c.danger, marginTop: 16 },
  });
