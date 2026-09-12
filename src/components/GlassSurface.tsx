import { StyleProp, View, ViewProps, ViewStyle } from 'react-native';

export interface GlassSurfaceProps extends ViewProps {
  /** Air Astana navy/gold at low alpha, so the brand survives the system material. Unused here. */
  tintColor?: string;
  glassEffectStyle?: 'clear' | 'regular';
  /** Applied instead of the (nonexistent, on web) glass effect — the solid background it stands in for. */
  fallbackStyle?: StyleProp<ViewStyle>;
}

/**
 * The native app's GlassSurface degrades to a plain themed View wherever iOS 26 Liquid Glass
 * isn't available (`expo-glass-effect`'s own `isGlassAvailable` check). On the web that is
 * unconditionally true — there is no such effect to check for — so this is just the fallback
 * branch, with no dependency on `expo-glass-effect` at all (it's a native module with nothing to
 * offer a browser).
 */
export function GlassSurface({ fallbackStyle, style, children, ...rest }: GlassSurfaceProps) {
  return (
    <View style={[style, fallbackStyle]} {...rest}>
      {children}
    </View>
  );
}
