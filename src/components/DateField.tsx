import { useMemo } from 'react';
import { Control, Controller } from 'react-hook-form';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { FlightEntryFormValues } from '@/src/lib/formSchema';
import { AppColors, useAppTheme } from '@/src/theme';

export interface DateFieldProps {
  control: Control<FlightEntryFormValues>;
  name: 'date';
  label: string;
  error?: string;
}

/**
 * A plain "YYYY-MM-DD" text field — there is no web equivalent of
 * `@react-native-community/datetimepicker`'s native wheel, so this validates the typed text
 * instead of opening a picker. The same approach the old (deleted) web build used for its
 * DateField.web.tsx.
 */
export function DateField({ control, name, label, error }: DateFieldProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange } }) => (
        <View style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.placeholder}
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      )}
    />
  );
}

const createStyles = (c: AppColors) =>
  StyleSheet.create({
    field: { marginBottom: 12, flex: 1 },
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
    errorText: { color: c.danger, fontSize: 12, marginTop: 4 },
  });
