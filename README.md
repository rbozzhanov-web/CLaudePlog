# Pilot Logbook — PWA

A web/PWA companion to the [Pilot-Logbook](https://github.com/rbozzhanov-web/pilot-logbook) iOS app — same pilot logbook and Kazakhstan payroll calculator, running as an installable Progressive Web App so it can be opened on any device without a native install.

This is a separate, web-only Expo project. It does not replace the native iOS app; the two are maintained independently, sharing platform-agnostic logic (payroll/tax calculations, norm lookups, PDF parsing) ported over as plain TypeScript.

## Stack

- Expo SDK 57 + Expo Router (web-only — no native iOS/Android build target)
- `localStorage` for local storage — the same approach this app's very first (later removed) web build used. An earlier version of this project tried `expo-sqlite`'s experimental web implementation (SQLite compiled to WASM, running in a Worker over OPFS), but that path turned out to be unreliable in Safari specifically: its "synchronous" API is faked with a busy-wait loop that depends on `Atomics.pause`, an API Safari doesn't implement, so every database call risked timing out on the one browser this app actually needs to run in.
- PWA manifest + a minimal hand-rolled service worker for installability and offline use

## Status

Feature-complete for a first version: Logbook, Totals, Settings (backup export/restore, PDF export) and Pay (crew-pay/tax calculator with NBRK exchange-rate auto-fetch) are all real screens. 185 tests pass, `expo export -p web` produces a working static build, and it's been confirmed working end-to-end in real Safari on an iPhone — data survives a page reload.

**Known limitation:** the NBRK exchange-rate fetch (`src/lib/crewPay/nbrkRate.ts`) calls `nationalbank.kz` directly from the browser. That endpoint sends no CORS header, so browsers will likely block it — the app already degrades gracefully to manual rate entry when the fetch fails, but a same-origin proxy (a Cloudflare Pages Function) would fix it properly and hasn't been built yet.

## Local development

```
npm install
npx expo start --web
```

## Deploying

Deploys to **Cloudflare Pages** via GitHub Actions:

1. Create a Cloudflare Pages project (any name — pass it to the workflow below) with **no** build command configured; this repo builds in CI and pushes the finished `dist/` folder directly.
2. In the GitHub repo settings, add two secrets: `CLOUDFLARE_API_TOKEN` (a token with Pages edit permission) and `CLOUDFLARE_ACCOUNT_ID`.
3. Run the **Deploy PWA to Cloudflare Pages** workflow (`workflow_dispatch`) from the Actions tab, passing the project name from step 1.

The workflow type-checks, runs the test suite, exports the static build, and deploys it — the same manual-trigger pattern the iOS repo uses for its IPA builds. Nothing about this app's storage requires Cloudflare specifically anymore (that requirement went away with `expo-sqlite`/OPFS) — it stays on Cloudflare Pages because it's already set up and working, not because another host would need it.
