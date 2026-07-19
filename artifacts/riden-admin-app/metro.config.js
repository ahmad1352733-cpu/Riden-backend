const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Block _tmp_ directories created by pnpm for native modules (prevents ENOENT watch errors)
const blockList = config.resolver?.blockList ?? [];
const tmpPattern = /_tmp_\d+/;
config.resolver = config.resolver ?? {};
config.resolver.blockList = Array.isArray(blockList)
  ? [...blockList, tmpPattern]
  : tmpPattern;

module.exports = config;
