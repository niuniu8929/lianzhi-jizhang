// babel.config.js - Babel 配置文件
// react-native-reanimated/plugin 必须是 plugins 数组的最后一个插件
// 参考：https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-reanimated 必须是最后一个插件
      'react-native-reanimated/plugin',
    ],
  };
};
