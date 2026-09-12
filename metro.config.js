// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Required so Metro can inline the .sql migration files Drizzle Kit generates
// (see https://orm.drizzle.team/docs/get-started/expo-new)
config.resolver.sourceExts.push('sql');

// expo-sqlite's web implementation ships as a WASM build (wa-sqlite) running in a Worker.
config.resolver.assetExts.push('wasm');

// SharedArrayBuffer — which the web SQLite worker bridge needs for its synchronous API — is only
// available on a cross-origin-isolated page. This sets that up for the dev server; the production
// static export needs the same two headers set by the host (see public/_headers).
//
// require-corp, not credentialless: Safari has no support at all for the credentialless value
// (it's a Chrome-only extension, not yet in the HTML spec) — it just silently ignores the header,
// so the page never becomes cross-origin isolated and SharedArrayBuffer stays undefined. This app
// exists specifically to run in Safari on an iPhone, so that's not an acceptable trade either way.
// require-corp works in Safari since 15.2, and needs no Cross-Origin-Resource-Policy header on any
// subresource here since everything the page loads (icons, the worker bundle, wasm) is same-origin.
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  middleware(req, res, next);
};

module.exports = config;
