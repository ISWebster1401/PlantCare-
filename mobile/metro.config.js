// Metro bundler configuration
// Suprime warnings de Three.js sobre package.json inválidos
const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  // Deshabilitar validación estricta de package exports para evitar warnings de Three.js
  config.resolver.unstable_enablePackageExports = false;

  return config;
})();
