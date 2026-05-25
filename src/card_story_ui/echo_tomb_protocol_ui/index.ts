/**
 * 回响坟冢协议 - 状态栏 UI 脚本入口
 * 运行模式: 酒馆助手脚本 (无沙盒 iframe)
 * 职责: 在 AI 楼层底部挂载状态栏 UI，读取数据库表格数据并展示
 */

import { reloadOnChatChange } from '@util/script';
import { initSettings } from './settings';
import { initTavernBridge } from './core/tavern';
import { initDatabase } from './core/database';
import { mountStatusBar, unmountStatusBar } from './ui/mount';
import { destroyAll } from './core/memory';

// 聊天切换时重载脚本，确保数据与当前聊天一致
reloadOnChatChange();

$(() => {
  // 初始化设置
  const settings = initSettings();

  // 初始化酒馆环境桥接
  const bridge = initTavernBridge();
  if (!bridge) {
    console.error('[EchoTomb] TavernHelper 环境不可用，状态栏无法加载');
    return;
  }

  // 初始化数据库 API
  const db = initDatabase();
  if (!db) {
    console.error('[EchoTomb] AutoCardUpdaterAPI 不可用，状态栏无法加载');
    return;
  }

  // 挂载状态栏 UI
  mountStatusBar({ settings, bridge, db });
});

// 卸载时清理所有资源
$(window).on('pagehide', () => {
  unmountStatusBar();
  destroyAll();
});
