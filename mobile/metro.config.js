// Metro bundler configuration
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Deshabilitar validación estricta de package exports para evitar warnings de Three.js
config.resolver.unstable_enablePackageExports = false;

// Configurar servidor para que escuche en todas las interfaces
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return middleware;
  },
};

module.exports = config;
