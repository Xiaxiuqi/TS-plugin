/**
 * 回响坟冢协议 - 状态栏 UI
 * webpack 入口（自动被 src/**\/index.{ts,...} glob 收集）
 * 真正的应用启动逻辑在 main.ts
 */

import { reloadOnChatChange } from '@util/script';
import { bootstrapApp } from './main';
import { destroyAll } from './core/memory';

// 聊天切换时重载脚本，确保数据与当前聊天一致
reloadOnChatChange();

$(() => {
  bootstrapApp();
});

// 卸载时清理所有资源（兜底）
$(window).on('pagehide', () => {
  destroyAll();
});
