import { Tabs } from 'expo-router';

/**
 * A plain JS tab bar — this is a web-only PWA, so there is no native tab bar (and no Liquid
 * Glass) to reach for; expo-router/unstable-native-tabs has no web implementation at all. Each
 * screen renders its own large-title header via ScreenTitle, so the tab bar's own header is hidden.
 *
 * tabBarIcon: () => null — without an explicit icon, react-navigation's bottom-tabs falls back to
 * a debug "MissingIcon" placeholder (a triangle glyph meant to flag a forgotten icon during
 * development), which is what was actually showing above every label. This is a text-only tab bar
 * on purpose, so the fix is telling it not to reserve icon space at all, not adding real icons.
 */
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarIcon: () => null }}>
      <Tabs.Screen name="index" options={{ title: 'Logbook' }} />
      <Tabs.Screen name="pay" options={{ title: 'Зарплата' }} />
      <Tabs.Screen name="totals" options={{ title: 'Totals' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
