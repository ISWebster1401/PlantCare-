// Metro bundler configuration
// Suprime warnings de Three.js sobre package.json inválidos
const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  // Deshabilitar validación estricta de package exports para evitar warnings de Three.js
  config.resolver.unstable_enablePackageExports = false;

  // Aumentar timeout para Android (problema común con "New update available. Downloading...")
  config.server = {
    ...config.server,
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        // Aumentar timeout para requests grandes
        res.setTimeout(120000); // 2 minutos
        return middleware(req, res, next);
      };
    },
  };

  return config;
})();
