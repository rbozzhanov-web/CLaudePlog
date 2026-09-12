import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { FlightEntryForm } from '@/src/components/FlightEntryForm';
import { deleteEntry, getEntry, NewFlightLogEntry, updateEntry } from '@/src/db/queries/entries';
import { confirm } from '@/src/lib/dialogs';
import { entryToFormValues, FlightEntryFormValues } from '@/src/lib/formSchema';
import { useAppTheme } from '@/src/theme';

export default function EditEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  const [initialValues, setInitialValues] = useState<FlightEntryFormValues>();

  useEffect(() => {
    if (!id) return;
    getEntry(id).then((entry) => {
      if (entry) setInitialValues(entryToFormValues(entry));
    });
  }, [id]);

  if (!initialValues) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const handleSubmit = async (entry: NewFlightLogEntry) => {
    await updateEntry(id, entry);
    router.back();
  };

  const handleDelete = async () => {
    const ok = await confirm('Delete this flight?', 'This cannot be undone.', {
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await deleteEntry(id);
    router.back();
  };

  return (
    <FlightEntryForm
      initialValues={initialValues}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
      submitLabel="Save changes"
    />
  );
}
