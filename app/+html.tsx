import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Expo Router's static web export renders each route to HTML in Node, then wraps every one of
 * them in this single document — it's the only place to put PWA tags (manifest link, theme
 * color, apple touch icon) that the router itself has no per-route concept of.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/*
          viewport-fit=cover is required for two things at once: it's what lets the installed PWA
          draw edge-to-edge under the notch/Dynamic Island and home indicator instead of leaving
          them as blank bars, and it's the only thing that makes `env(safe-area-inset-*)` resolve
          to real values instead of 0 — which is what react-native-safe-area-context's web
          implementation reads. Without it, ScreenTitle's top padding and every screen's bottom
          inset (insets.bottom) come out as 0 even though iOS is actually overlaying the status bar
          (apple-mobile-web-app-status-bar-style below is "black-translucent", an overlay style) and
          the home indicator on top of the content — which is exactly why content was clipped at the
          top and ran under the home indicator when opened as an installed app.
        */}
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <title>Pilot Logbook</title>

        <ScrollViewStyleReset />

        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0B1E3D" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Logbook" />

        <script dangerouslySetInnerHTML={{ __html: registerServiceWorker }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const registerServiceWorker = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
}
`;
