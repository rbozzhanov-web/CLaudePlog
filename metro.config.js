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
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  middleware(req, res, next);
};

module.exports = config;
