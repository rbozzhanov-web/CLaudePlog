import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppColors, useAppTheme } from '@/src/theme';

export interface DatePickerProps {
  /** "YYYY-MM-DD" to open on. */
  initialDate: string;
  onPick: (date: string) => void;
  onCancel: () => void;
}

/**
 * A standalone date picker for "jump to date", unlike `DateField` which is bound to a
 * react-hook-form control. Same plain-text-field approach as `DateField` — no web equivalent of
 * the native wheel picker exists, so typing "YYYY-MM-DD" and confirming replaces spinning to it.
 */
export function DatePicker({ initialDate, onPick, onCancel }: DatePickerProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [pending, setPending] = useState(initialDate);

  return (
    <View style={styles.panel}>
      <TextInput
        style={styles.input}
        value={pending}
        onChangeText={setPending}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.placeholder}
        autoFocus
      />
      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={onCancel}>
          <Text style={styles.actionText}>Cancel</Text>
        </Pressable>
        <Pressable style={[styles.action, styles.primaryAction]} onPress={() => onPick(pending)}>
          <Text style={styles.primaryActionText}>Jump to {pending}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    panel: {
      backgroundColor: c.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      padding: 16,
      gap: 12,
    },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.background,
      color: c.text,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
    },
    actions: { flexDirection: 'row', gap: 12 },
    action: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    actionText: { color: c.text, fontWeight: '600' },
    primaryAction: { backgroundColor: c.primary, borderColor: c.primary },
    primaryActionText: { color: c.onPrimary, fontWeight: '700' },
  });
