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
  // 顺序：先卸 Vue 实例（触发 onUnmounted 钩子）→ 重置 Pinia → 再清 DOM/样式/事件
  // 见 stage-01 §8.1：Vue 实例只在 main.ts 这一处持有与卸载，mount.ts 不再 unmount
  registerCleanup(() => {
    if (_vueApp) {
      try {
        _vueApp.unmount();
      } catch (e) {
        console.warn('[EchoTomb] Vue 实例 unmount 失败：', e);
      }
      _vueApp = null;
    }
    if (_pinia) {
      _pinia.state.value = {};
      _pinia = null;
    }
    unmountStatusBar();
  });
}
