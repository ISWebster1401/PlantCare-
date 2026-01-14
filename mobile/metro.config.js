// Metro bundler configuration
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Deshabilitar validación estricta de package exports para evitar warnings de Three.js
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
