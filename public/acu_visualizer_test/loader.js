// ACU Visualizer 测试版稳定加载器
// 酒馆助手推荐固定导入本文件：
// import 'https://ts-plugin.pages.dev/acu_visualizer_test/loader.js'
//
// loader 本身保持稳定 URL，内部使用受控版本号导入 main.js，避免浏览器 ESM 裸 URL 模块缓存导致旧入口不重新执行。

import { ACU_VISUALIZER_TEST_VERSION } from './version.js';

const globalObject = window;

const mainUrl = new URL('./main.js', import.meta.url);
mainUrl.searchParams.set('v', ACU_VISUALIZER_TEST_VERSION);

globalObject.__ACU_VISUALIZER_TEST_LOADER_IMPORTING__ = true;
let moduleNamespace;
try {
  moduleNamespace = await import(mainUrl.href);
} finally {
  delete globalObject.__ACU_VISUALIZER_TEST_LOADER_IMPORTING__;
}

if (typeof moduleNamespace.bootstrapAcuVisualizerTest !== 'function') {
  throw new Error('[ACU TEST LOADER] main.js does not export bootstrapAcuVisualizerTest()');
}

const instance = moduleNamespace.bootstrapAcuVisualizerTest();

globalObject.ACUVisualizerTestLoader = {
  version: ACU_VISUALIZER_TEST_VERSION,
  mainUrl: mainUrl.href,
  loadedAt: new Date().toISOString(),
  module: moduleNamespace,
  instance,
};

console.log('[ACU TEST LOADER] loaded', globalObject.ACUVisualizerTestLoader);
