/**
 * Vue 应用启动
 * 职责：探测环境 → 创建 Pinia → 创建 App → 挂载到 AI 楼层底部
 */

import { createApp, type App as VueApp } from 'vue';
import { createPinia, type Pinia } from 'pinia';
import { initSettings } from './settings';
import { initTavernBridge } from './core/tavern';
import { initDatabase } from './core/database';
import { mountStatusBar, unmountStatusBar } from './ui/mount';
import { registerCleanup } from './core/memory';
import AppRoot from './App.vue';
import './styles/theme.scss';

let _vueApp: VueApp | null = null;
let _pinia: Pinia | null = null;

/**
 * 启动入口。在 jQuery ready 阶段被调用。
 * 失败时记录错误但不抛出，避免污染酒馆主页面。
 */
export function bootstrapApp(): void {
  // 1. 探测酒馆环境
  const bridge = initTavernBridge();
  if (!bridge) {
    console.error('[EchoTomb] SillyTavern 环境不可用，状态栏无法加载');
    return;
  }

  // 2. 探测数据库 API
  const db = initDatabase();
  if (!db) {
    console.error('[EchoTomb] AutoCardUpdaterAPI 不可用，状态栏无法加载');
    return;
  }

  // 3. 加载持久化设置（zod schema 校验）
  initSettings();

  // 4. 创建 Pinia 与 Vue App
  _pinia = createPinia();
  _vueApp = createApp(AppRoot);
  _vueApp.use(_pinia);

  // 5. 挂载到酒馆 AI 楼层
  mountStatusBar(_vueApp);

  // 6. 注册卸载链路
  registerCleanup(() => {
    if (_vueApp) {
      _vueApp.unmount();
      _vueApp = null;
    }
    if (_pinia) {
      // 重置所有 store 状态
      _pinia.state.value = {};
      _pinia = null;
    }
    unmountStatusBar();
  });
}
