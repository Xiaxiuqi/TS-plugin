// ACU Visualizer 测试版单文件构建入口
// 该文件只作为 webpack 打包入口使用，输出 public/acu_visualizer_test/index.js。
// 不推荐酒馆助手直接 import 本源码文件。

import { bootstrapAcuVisualizerTest } from './main.js';
import searchCss from './styles/search.css?raw';
import tableCss from './styles/table.css?raw';

const bundledCss = [`/* table.css */\n${tableCss}`, `/* search.css */\n${searchCss}`].join('\n\n');

window.__ACU_VISUALIZER_TEST_BUNDLED_CSS__ = bundledCss;
try {
  if (window.parent && window.parent !== window) {
    window.parent.__ACU_VISUALIZER_TEST_BUNDLED_CSS__ = bundledCss;
  }
} catch (error) {
  console.warn('[ACU TEST] failed to expose bundled CSS to parent window:', error);
}

bootstrapAcuVisualizerTest();
