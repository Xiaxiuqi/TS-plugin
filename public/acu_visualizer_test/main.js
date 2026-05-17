// ACU Visualizer 测试版模块化入口
// 来源：public/acu_visualizer/acu_visualizer-test.js 尾部 IIFE 初始化结构。
// 迁移原则：仅组装测试版生命周期入口，不接入正式插件，不夹带优化。

import { getCore } from './core/bridge.js';
import { initAcuVisualizerTest } from './core/lifecycle.js';

(function () {
  'use strict';

  const core = getCore();
  const lifecycle = initAcuVisualizerTest({ core });

  window.ACUVisualizerTest = window.ACUVisualizerTest || {};
  window.ACUVisualizerTest.version = 'modular-test-migration';
  window.ACUVisualizerTest.lifecycle = lifecycle;
  window.ACUVisualizerTest.destroy = function destroy() {
    lifecycle.destroy();
  };
})();
