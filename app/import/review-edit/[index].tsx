import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { FlightEntryForm } from '@/src/components/FlightEntryForm';
import { NewFlightLogEntry } from '@/src/db/queries/entries';
import { partialEntryToFormValues } from '@/src/lib/formSchema';
import { useImportDraftStore } from '@/src/store/importDraft';
import { useAppTheme } from '@/src/theme';

export default function ReviewEditScreen() {
  const { index } = useLocalSearchParams<{ index: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  const candidateIndex = Number(index);
  const candidate = useImportDraftStore((state) => state.candidates[candidateIndex]);
  const updateCandidate = useImportDraftStore((state) => state.updateCandidate);

  if (!candidate) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ color: colors.text }}>This flight is no longer in the import batch.</Text>
      </View>
    );
  }

  const handleSubmit = (entry: NewFlightLogEntry) => {
    updateCandidate(candidateIndex, {
      ...candidate,
      fields: entry,
      confidence: 'high',
      unmatchedFields: [],
    });
    router.back();
  };

  return (
    <FlightEntryForm
      initialValues={partialEntryToFormValues(candidate.fields)}
      onSubmit={handleSubmit}
      submitLabel="Update flight"
    />
  );
}
