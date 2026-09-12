import { useRouter } from 'expo-router';

import { FlightEntryForm } from '@/src/components/FlightEntryForm';
import { createEntry, NewFlightLogEntry } from '@/src/db/queries/entries';

export default function NewEntryScreen() {
  const router = useRouter();

  const handleSubmit = async (entry: NewFlightLogEntry) => {
    await createEntry(entry);
    router.back();
  };

  return <FlightEntryForm onSubmit={handleSubmit} submitLabel="Save flight" />;
}
