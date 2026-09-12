import { Tabs } from 'expo-router';

/**
 * A plain JS tab bar — this is a web-only PWA, so there is no native tab bar (and no Liquid
 * Glass) to reach for; expo-router/unstable-native-tabs has no web implementation at all.
 */
export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Logbook' }} />
      <Tabs.Screen name="pay" options={{ title: 'Зарплата' }} />
      <Tabs.Screen name="totals" options={{ title: 'Totals' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
