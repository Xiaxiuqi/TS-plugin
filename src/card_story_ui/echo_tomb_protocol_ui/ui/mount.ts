/**
 * UI 挂载管理
 * 在 AI 楼层底部挂载状态栏容器
 */

import { createScriptIdDiv, teleportStyle } from '@util/script';
import { registerCleanup } from '../core/memory';
import { renderShell } from './shell';
import type { Settings } from '../settings';
import type { TavernBridge } from '../core/tavern';
import type { DatabaseAPI } from '../core/database';

const CONTAINER_CLASS = 'echo-tomb-status-bar';

let _$container: JQuery<HTMLDivElement> | null = null;
let _styleDestroy: (() => void) | null = null;

export interface MountContext {
  settings: Settings;
  bridge: TavernBridge;
  db: DatabaseAPI;
}

/**
 * 挂载状态栏到 AI 楼层底部
 * 策略：监听消息渲染事件，在最新 AI 楼层底部插入容器
 */
export function mountStatusBar(ctx: MountContext): void {
  // 创建容器
  _$container = createScriptIdDiv() as JQuery<HTMLDivElement>;
  _$container.addClass(CONTAINER_CLASS);

  // 将样式传送到酒馆页面 head
  const { destroy } = teleportStyle();
  _styleDestroy = destroy;

  // 监听 AI 消息渲染完成，将容器插入最新 AI 楼层底部
  const onMessageRendered = () => {
    attachToLastAiMessage();
    renderShell(_$container!, ctx);
  };

  eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, onMessageRendered);
  registerCleanup(() => eventRemoveListener(tavern_events.CHARACTER_MESSAGE_RENDERED, onMessageRendered));

  // 立即尝试挂载一次（如果已有消息）
  attachToLastAiMessage();
  if (_$container && _$container.parent().length > 0) {
    renderShell(_$container, ctx);
  }
}

/** 将容器附加到最新 AI 消息楼层底部 */
function attachToLastAiMessage(): void {
  if (!_$container) return;

  // 查找最新的 AI 消息楼层 DOM
  const $messages = $('.mes[is_user="false"]');
  if ($messages.length === 0) return;

  const $lastAi = $messages.last();
  const $mesText = $lastAi.find('.mes_text');
  if ($mesText.length === 0) return;

  // 避免重复挂载
  if ($mesText.find(`.${CONTAINER_CLASS}`).length > 0) return;

  $mesText.append(_$container);
}

/** 卸载状态栏 */
export function unmountStatusBar(): void {
  if (_$container) {
    _$container.remove();
    _$container = null;
  }
  if (_styleDestroy) {
    _styleDestroy();
    _styleDestroy = null;
  }
}

registerCleanup(unmountStatusBar);
