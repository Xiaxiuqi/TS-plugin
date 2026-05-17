// ACU Visualizer 测试版稳定加载器
// 酒馆助手推荐固定导入本文件：
// import 'https://ts-plugin.pages.dev/acu_visualizer_test/loader.js'
//
// loader 本身保持稳定 URL，内部使用受控版本号导入 main.js，避免浏览器 ESM 裸 URL 模块缓存导致旧入口不重新执行。

import { ACU_VISUALIZER_TEST_VERSION } from './version.js';

const globalObject = window;
const previous = globalObject.ACUVisualizerTest;

try {
  previous?.destroy?.();
} catch (error) {
  console.warn('[ACU TEST LOADER] destroy previous instance failed:', error);
}

const mainUrl = new URL('./main.js', import.meta.url);
mainUrl.searchParams.set('v', ACU_VISUALIZER_TEST_VERSION);

const moduleNamespace = await import(mainUrl.href);

globalObject.ACUVisualizerTestLoader = {
  version: ACU_VISUALIZER_TEST_VERSION,
  mainUrl: mainUrl.href,
  loadedAt: new Date().toISOString(),
  module: moduleNamespace,
};

console.log('[ACU TEST LOADER] loaded', globalObject.ACUVisualizerTestLoader);
