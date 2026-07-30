const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Permitir require('*.riv') en nativo / Metro
if (!config.resolver.assetExts.includes('riv')) {
  config.resolver.assetExts.push('riv');
}

module.exports = config;
