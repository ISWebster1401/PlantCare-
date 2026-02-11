// Metro bundler configuration
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Soporte para SVGs como componentes (Twemoji emojis)
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts, 'svg'],
};

// Deshabilitar validación estricta de package exports para evitar warnings de Three.js
config.resolver.unstable_enablePackageExports = false;

// Forzar axios a usar la versión browser (no Node) porque React Native no tiene crypto
const axiosBrowserPath = path.resolve(__dirname, 'node_modules/axios/dist/browser/axios.cjs');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'axios') {
    return { filePath: axiosBrowserPath, type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
