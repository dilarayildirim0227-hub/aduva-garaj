const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// Expo SDK 52 monorepo (workspace) çözümlemesini otomatik yapar
const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });
