const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Block _tmp_ directories created by pnpm for native modules (prevents ENOENT watch errors)
const blockList = config.resolver?.blockList ?? [];
const tmpPattern = /_tmp_\d+/;
config.resolver = config.resolver ?? {};
config.resolver.blockList = Array.isArray(blockList)
  ? [...blockList, tmpPattern]
  : tmpPattern;

// Transform packages that use private class fields (incompatible with hermesc without transform)
const defaultIgnore = config.transformer?.transformIgnorePatterns?.[0]
  ?? 'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)/)';

config.transformer = config.transformer ?? {};
config.transformer.transformIgnorePatterns = [
  defaultIgnore.replace(
    'node_modules/(?!(',
    'node_modules/(?!(lru-cache|glob|'
  ),
];

module.exports = config;
