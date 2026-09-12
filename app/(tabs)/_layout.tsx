import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * A plain JS tab bar — this is a web-only PWA, so there is no native tab bar (and no Liquid
 * Glass) to reach for; expo-router/unstable-native-tabs has no web implementation at all. Each
 * screen renders its own large-title header via ScreenTitle, so the tab bar's own header is hidden.
 *
 * tabBarIcon: () => null — without an explicit icon, react-navigation's bottom-tabs falls back to
 * a debug "MissingIcon" placeholder (a triangle glyph meant to flag a forgotten icon during
 * development), which is what was actually showing above every label. This is a text-only tab bar
 * on purpose, so the fix is telling it not to reserve icon space at all, not adding real icons.
 *
 * tabBarStyle here overrides the library's default bottom padding, which reserves the *full*
 * home-indicator inset (34pt on Face ID iPhones) below the labels — correct per Apple's own
 * guidance, but on this text-only bar it reads as a lot of dead space. Halving it still keeps the
 * labels clear of the swipe-up gesture area without the bar eating a third of its own height in
 * empty padding.
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarIcon: () => null,
        tabBarLabelStyle: { fontSize: 14, fontWeight: '600' },
        tabBarStyle: { height: 50 + insets.bottom / 2, paddingBottom: insets.bottom / 2 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Logbook' }} />
      <Tabs.Screen name="pay" options={{ title: 'Зарплата' }} />
      <Tabs.Screen name="totals" options={{ title: 'Totals' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
