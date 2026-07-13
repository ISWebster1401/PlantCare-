// Metro bundler configuration
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Deshabilitar watchman: el proyecto vive bajo ~/Documents (sincronizado por
// iCloud Drive), donde watchman falla con "Resource deadlock avoided" (errno 35)
// al resolver el root y tumba a Metro. Sin watchman, Metro usa el crawler de
// Node (algo más lento pero estable). Solución de raíz: mover el repo a una
// carpeta fuera de iCloud, p.ej. ~/dev/PlantCare-.
config.resolver.useWatchman = false;

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

// Excluir rutas pesadas que Metro no necesita (no bloquear three/examples — usa GLTFLoader)
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : []),
  /node_modules\/three\/src\/renderers\/webgpu\/.*/,
  /node_modules\/@types\/three\/.*/,
];

// Forzar axios a usar la versión browser (no Node) porque React Native no tiene crypto
const axiosBrowserPath = path.resolve(__dirname, 'node_modules/axios/dist/browser/axios.cjs');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'axios') {
    return { filePath: axiosBrowserPath, type: 'sourceFile' };
  }
  // Delegar al resolver de Expo/Metro (context.resolveRequest), no a metro-resolver directo
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
