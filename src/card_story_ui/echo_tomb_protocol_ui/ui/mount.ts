/**
 * UI 挂载管理
 * 职责：在 AI 楼层底部创建容器，推送 SFC 样式到页面 head，挂载 Vue 应用
 */

import type { App as VueApp } from 'vue';
import { createScriptIdDiv, teleportStyle } from '@util/script';
import { registerCleanup } from '../core/memory';

const CONTAINER_CLASS = 'echo-tomb-status-bar';

let _$container: JQuery<HTMLDivElement> | null = null;
let _styleDestroy: (() => void) | null = null;
let _vueApp: VueApp | null = null;
let _onRenderedHandler: (() => void) | null = null;

/**
 * 创建容器并挂载 Vue 应用。
 * 策略：
 *  - 容器只创建一次，Vue 只 mount 一次
 *  - 在 AI 消息渲染事件中动态 attach 到最新 AI 楼层底部（酒馆会重新渲染消息导致原容器被丢弃，需重新 attach）
 */
export function mountStatusBar(vueApp: VueApp): void {
  // 创建容器
  _$container = createScriptIdDiv() as JQuery<HTMLDivElement>;
  _$container.addClass(CONTAINER_CLASS);

  // SFC 样式从 iframe head 克隆到页面 head
  const { destroy } = teleportStyle();
  _styleDestroy = destroy;

  // 挂载 Vue
  _vueApp = vueApp;
  vueApp.mount(_$container[0]);

  // 首次 attach
  attachToLastAiMessage();

  // 监听后续消息渲染，重新 attach
  _onRenderedHandler = () => attachToLastAiMessage();
  eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, _onRenderedHandler);
  registerCleanup(() => {
    if (_onRenderedHandler) {
      eventRemoveListener(tavern_events.CHARACTER_MESSAGE_RENDERED, _onRenderedHandler);
      _onRenderedHandler = null;
    }
  });
}

/** 将容器附加到最新 AI 消息楼层底部；如已存在则不重复插入 */
function attachToLastAiMessage(): void {
  if (!_$container) return;

  const $messages = $('.mes[is_user="false"]');
  if ($messages.length === 0) return;

  const $lastAi = $messages.last();
  const $mesText = $lastAi.find('.mes_text');
  if ($mesText.length === 0) return;

  // 如果最新 AI 楼层里已有容器，不重复追加
  if ($mesText.find(`.${CONTAINER_CLASS}`).length > 0) return;

  // 从旧位置移到新位置（保持 Vue mount 状态不变）
  $mesText.append(_$container);
}

/** 卸载状态栏：unmount Vue 、移除 DOM 、销毁样式 */
export function unmountStatusBar(): void {
  if (_vueApp) {
    try {
      _vueApp.unmount();
    } catch (e) {
      console.error('[EchoTomb] unmount Vue app failed:', e);
    }
    _vueApp = null;
  }
  if (_$container) {
    _$container.remove();
    _$container = null;
  }
  if (_styleDestroy) {
    _styleDestroy();
    _styleDestroy = null;
  }
}
