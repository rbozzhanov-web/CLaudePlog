# Pilot Logbook — PWA

A web/PWA companion to the [Pilot-Logbook](https://github.com/rbozzhanov-web/pilot-logbook) iOS app — same pilot logbook and Kazakhstan payroll calculator, running as an installable Progressive Web App so it can be opened on any device without a native install.

This is a separate, web-only Expo project. It does not replace the native iOS app; the two are maintained independently, sharing platform-agnostic logic (schema, payroll/tax calculations, norm lookups) ported over as plain TypeScript.

## Stack

- Expo SDK 57 + Expo Router (web-only — no native iOS/Android build target)
- `expo-sqlite`'s web implementation (alpha, wa-sqlite/WASM + OPFS) for local storage, via Drizzle ORM
- PWA manifest + service worker for installability and offline use

## Status

Scaffolding in progress. See the project plan for the staged rollout (shell → local database → ported screens → PWA wrapper → hosting).
