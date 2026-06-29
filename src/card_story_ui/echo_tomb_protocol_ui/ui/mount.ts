/**
 * UI 挂载管理
 * 职责：在 AI 楼层底部创建容器，推送 SFC 样式到页面 head，把上层传入的 Vue App
 * 挂载到该容器；并在酒馆消息重新渲染时把容器重新 attach 到最新 AI 楼层底部。
 *
 * 边界（见 stage-01 §8.1 P1-A）：
 *  - 本模块**不持有**也**不卸载** Vue 实例；Vue/Pinia 生命周期由 main.ts 集中收尾
 *  - `unmountStatusBar()` 只清理事件监听、DOM 容器与 teleport style，是本模块唯一的清理入口
 */

import type { App as VueApp } from 'vue';
import { createScriptIdDiv, teleportStyle } from '@util/script';

const CONTAINER_CLASS = 'echo-tomb-status-bar';

let _$container: JQuery<HTMLDivElement> | null = null;
let _styleDestroy: (() => void) | null = null;
let _onRenderedHandler: (() => void) | null = null;

/**
 * 创建容器、推送样式、挂载 Vue 应用。
 * - 容器只创建一次，Vue 只 mount 一次
 * - 通过 CHARACTER_MESSAGE_RENDERED 事件把容器重新 attach 到最新 AI 楼层底部
 *   （酒馆会重渲染 .mes_text，原位置容器会被替换掉，需要重新 attach）
 *
 * @param vueApp 由 main.ts 创建的 Vue 应用实例。本模块仅在此处对它调用一次 `mount`，
 *               不会保留引用，也不会调用 `unmount`。
 */
export function mountStatusBar(vueApp: VueApp): void {
  // 创建容器
  _$container = createScriptIdDiv() as JQuery<HTMLDivElement>;
  _$container.addClass(CONTAINER_CLASS);

  // SFC 样式从 iframe head 克隆到页面 head
  const { destroy } = teleportStyle();
  _styleDestroy = destroy;

  // 挂载 Vue（不保留 vueApp 引用）
  vueApp.mount(_$container[0]);

  // 首次 attach；若失败说明当前还没有 AI 楼层，会在 CHARACTER_MESSAGE_RENDERED 事件里再次尝试
  if (!attachToLastAiMessage()) {
    console.info(
      '[EchoTomb] 当前无 AI 楼层，状态栏挂在 detached 容器上，等待首条 AI 消息渲染后自动附加',
    );
  }

  // 监听后续消息渲染，重新 attach
  _onRenderedHandler = () => {
    const wasDetached = !_$container?.parent('.mes_text').length;
    if (attachToLastAiMessage() && wasDetached) {
      console.info('[EchoTomb] 状态栏已附加到首条 AI 消息楼层');
    }
  };
  eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, _onRenderedHandler);
}

/**
 * 将容器附加到最新 AI 消息楼层底部；如已存在则不重复插入。
 * @returns 是否成功附加（已存在视为成功；当前无 AI 楼层视为失败）
 */
function attachToLastAiMessage(): boolean {
  if (!_$container) return false;

  const $messages = $('.mes[is_user="false"]');
  if ($messages.length === 0) return false;

  const $lastAi = $messages.last();
  const $mesText = $lastAi.find('.mes_text');
  if ($mesText.length === 0) return false;

  // 如果最新 AI 楼层里已有容器，不重复追加
  if ($mesText.find(`.${CONTAINER_CLASS}`).length > 0) return true;

  // 从旧位置移到新位置（保持 Vue mount 状态不变）
  $mesText.append(_$container);
  return true;
}

/**
 * 清理本模块持有的资源：解绑事件监听、移除 DOM 容器、销毁 teleport 样式。
 *
 * 由 main.ts 在 Vue 实例 unmount 之后、Pinia 重置之后调用。本函数**不会**触碰
 * Vue 实例本身，避免出现双重 unmount（见 stage-01 §8.1）。
 */
export function unmountStatusBar(): void {
  if (_onRenderedHandler) {
    try {
      eventRemoveListener(tavern_events.CHARACTER_MESSAGE_RENDERED, _onRenderedHandler);
    } catch (e) {
      console.warn('[EchoTomb] 解绑 CHARACTER_MESSAGE_RENDERED 失败：', e);
    }
    _onRenderedHandler = null;
  }
  if (_$container) {
    _$container.remove();
    _$container = null;
  }
  if (_styleDestroy) {
    try {
      _styleDestroy();
    } catch (e) {
      console.warn('[EchoTomb] teleport style destroy 失败：', e);
    }
    _styleDestroy = null;
  }
}
