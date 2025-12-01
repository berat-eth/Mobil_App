const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Basic performance optimizations
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Enable tree shaking and optimize bundle
config.transformer.minifierConfig = {
  compress: {
    drop_console: !__DEV__, // Production'da console.log'ları kaldır
    drop_debugger: true,
    pure_funcs: __DEV__ ? [] : ['console.log', 'console.info', 'console.debug', 'console.warn'],
  },
  mangle: {
    keep_fnames: false, // Production'da fonksiyon isimlerini kısalt
  },
};

// JSON parse hatalarını önle
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// Symbolicate hatalarını önle
config.symbolicator = {
  customizeFrame: (frame) => {
    if (frame.file && frame.file.includes('node_modules')) {
      return null;
    }
    return frame;
  },
};

module.exports = config;
