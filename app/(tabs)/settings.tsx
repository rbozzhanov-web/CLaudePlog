import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDataRefresh } from '@/src/db/dataVersion';
import {
  deleteImportBatch,
  listEntries,
  listImportBatches,
  replaceAllEntries,
  restoreEntries,
} from '@/src/db/queries/entries';
import {
  pickBackupText,
  readBackupStatus,
  shareBackup,
  sharePdf,
} from '@/src/lib/backup/backupFile';
import { mergeBackup, parseBackup } from '@/src/lib/backup/format';
import { ScreenTitle } from '@/src/components/ScreenTitle';
import { confirm, notify } from '@/src/lib/dialogs';
import { AppColors, useAppTheme } from '@/src/theme';

interface ImportBatch {
  importBatchId: string;
  count: number;
  date: string;
}

type Busy = 'export' | 'pdf' | 'restore' | 'replace' | undefined;

export default function SettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [backupStatus, setBackupStatus] = useState(readBackupStatus);
  const [busy, setBusy] = useState<Busy>(undefined);
  const insets = useSafeAreaInsets();

  const reload = useCallback(() => {
    listImportBatches().then(setBatches);
    setBackupStatus(readBackupStatus());
  }, []);

  useDataRefresh(reload);

  const confirmUndo = async (batch: ImportBatch) => {
    const ok = await confirm(
      'Undo import?',
      `This removes ${batch.count} flight${batch.count === 1 ? '' : 's'} imported together on ${new Date(
        batch.date,
      ).toLocaleDateString()}.`,
      { confirmLabel: 'Undo import', destructive: true },
    );
    if (!ok) return;

    await deleteImportBatch(batch.importBatchId);
    reload();
  };

  const runExport = async () => {
    setBusy('export');
    try {
      await shareBackup(await listEntries());
      setBackupStatus(readBackupStatus());
    } catch (error) {
      notify('Could not export', (error as Error).message);
    } finally {
      setBusy(undefined);
    }
  };

  const runPdf = async () => {
    setBusy('pdf');
    try {
      await sharePdf(await listEntries());
    } catch (error) {
      notify('Could not build the PDF', (error as Error).message);
    } finally {
      setBusy(undefined);
    }
  };

  /**
   * Merge and replace share everything up to the confirmation, so the counts a pilot is shown are
   * always the counts computed from the file actually picked.
   */
  const runRestore = async (mode: 'merge' | 'replace') => {
    setBusy(mode === 'merge' ? 'restore' : 'replace');
    try {
      const raw = await pickBackupText();
      if (raw === undefined) return;

      const parsed = parseBackup(raw);
      if (!parsed.ok) {
        notify('Could not read that backup', parsed.error);
        return;
      }

      const incoming = parsed.backup.entries;
      const existing = await listEntries();
      const { added, updated, unchanged } = mergeBackup(existing, incoming);

      const message =
        mode === 'merge'
          ? `${added} new, ${updated} updated, ${unchanged} unchanged. Nothing already in this logbook is deleted.`
          : `This deletes all ${existing.length} flight${
              existing.length === 1 ? '' : 's'
            } on this device and leaves only the ${incoming.length} in the backup.`;

      const ok = await confirm(
        mode === 'merge' ? 'Restore this backup?' : 'Replace the whole logbook?',
        message,
        {
          confirmLabel: mode === 'merge' ? 'Restore' : 'Replace everything',
          destructive: mode === 'replace',
        },
      );
      if (!ok) return;

      if (mode === 'merge') await restoreEntries(incoming);
      else await replaceAllEntries(incoming);

      reload();
      notify(
        'Restored',
        mode === 'merge'
          ? `${added} flight${added === 1 ? '' : 's'} added, ${updated} updated.`
          : `The logbook now holds ${incoming.length} flight${incoming.length === 1 ? '' : 's'}.`,
      );
    } catch (error) {
      notify('Could not restore', (error as Error).message);
    } finally {
      setBusy(undefined);
    }
  };

  const backupHint = backupStatus.modifiedAt
    ? `Saved automatically after every change. Last snapshot ${backupStatus.modifiedAt.toLocaleString()} — download it below to keep a copy off this device.`
    : 'Saved automatically after every change. Download a copy below to keep it off this device.';

  return (
    <View style={styles.screen}>
      <ScreenTitle title="Settings" />
      <FlatList
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]}
        data={batches}
        keyExtractor={(item) => item.importBatchId}
        ListHeaderComponent={
          <>
            <Text style={styles.sectionTitle}>Backup &amp; export</Text>
            <Text style={styles.hint}>{backupHint}</Text>

            <ActionButton label="Export backup file" onPress={runExport} busy={busy === 'export'} disabled={!!busy} />
            <ActionButton label="Export PDF logbook" onPress={runPdf} busy={busy === 'pdf'} disabled={!!busy} />
            <ActionButton
              label="Restore from a backup"
              onPress={() => runRestore('merge')}
              busy={busy === 'restore'}
              disabled={!!busy}
      />
          <ActionButton
            label="Replace everything from a backup"
            onPress={() => runRestore('replace')}
            busy={busy === 'replace'}
            disabled={!!busy}
            destructive
          />
          <Text style={styles.hint}>
            Restoring merges by flight, so the same backup can be restored twice without duplicating
            anything.
          </Text>

          <Text style={[styles.sectionTitle, styles.laterSection]}>Import history</Text>
        </>
      }
      ListEmptyComponent={<Text style={styles.emptyText}>No PDF imports yet.</Text>}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View>
            <Text style={styles.rowTitle}>{item.count} flights</Text>
            <Text style={styles.rowMeta}>{new Date(item.date).toLocaleString()}</Text>
          </View>
          <Pressable style={styles.undoButton} onPress={() => confirmUndo(item)}>
            <Text style={styles.undoButtonText}>Undo</Text>
          </Pressable>
        </View>
      )}
      />
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  busy,
  disabled,
  destructive,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  destructive?: boolean;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      style={[styles.actionButton, destructive && styles.destructiveButton, disabled && styles.actionDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      {busy ? (
        <ActivityIndicator color={destructive ? colors.danger : colors.text} />
      ) : (
        <Text style={[styles.actionButtonText, destructive && styles.destructiveButtonText]}>{label}</Text>
      )}
    </Pressable>
  );
}

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: c.text },
    laterSection: { marginTop: 28 },
    hint: { fontSize: 12, color: c.textMuted, marginBottom: 12, lineHeight: 17 },
    actionButton: {
      borderWidth: 1,
      borderColor: c.accent,
      backgroundColor: c.surfaceAlt,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginBottom: 8,
      minHeight: 44,
      justifyContent: 'center',
    },
    actionButtonText: { color: c.text, fontWeight: '600' },
    actionDisabled: { opacity: 0.5 },
    destructiveButton: { borderColor: c.danger, backgroundColor: 'transparent' },
    destructiveButtonText: { color: c.danger },
    emptyText: { color: c.textMuted },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    rowTitle: { fontSize: 15, fontWeight: '600', color: c.text },
    rowMeta: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    undoButton: { paddingHorizontal: 12, paddingVertical: 8 },
    undoButtonText: { color: c.danger, fontWeight: '600' },
  });
