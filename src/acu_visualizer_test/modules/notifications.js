// ACU Visualizer 测试版通知模块
// 来源：public/acu_visualizer/acu_visualizer-test.js 中 showNotification()、updateNotificationPositions()、removeNotification()。
// 迁移原则：保留原 DOM class、队列行为、动画时间与间距，不夹带优化。

import { getCore } from '../core/bridge.js';
import { acuButtonIconLabel } from '../core/constants.js';

export const NOTIFICATION_SPACING = 10;
export const notificationQueue = [];

export function showNotification(message, type = 'success', core = getCore()) {
  const { $ } = core;

  const notification = $(
    `
      <div class="acu-notification ${type}">
        ${message}
      </div>
    `,
  );

  $('body').append(notification);
  notificationQueue.push(notification);
  updateNotificationPositions();

  setTimeout(() => {
    removeNotification(notification, core);
  }, 3000);
}

export function updateNotificationPositions(queue = notificationQueue) {
  let currentTop = 20;
  queue.forEach(notification => {
    notification.css('top', `${currentTop}px`);
    const notificationHeight = notification.outerHeight() || 0;
    currentTop += notificationHeight + NOTIFICATION_SPACING;
  });
}

export function removeNotification(notification, core = getCore()) {
  const { $ } = core;

  notification.fadeOut(500, function () {
    $(this).remove();

    const index = notificationQueue.indexOf(notification);
    if (index > -1) {
      notificationQueue.splice(index, 1);
    }

    updateNotificationPositions();
  });
}

export function clearNotifications(core = getCore()) {
  const { $ } = core;
  notificationQueue.forEach(notification => {
    try {
      notification.stop?.(true, true);
      notification.remove?.();
    } catch (error) {
      try {
        $(notification).remove();
      } catch (_ignored) {}
    }
  });
  notificationQueue.length = 0;
}

export function showLoadSuccessNotification() {
  const now = Date.now();
  const hostWindow = window.parent || window;
  if (
    hostWindow.__ACU_VISUALIZER_TEST_LAST_LOAD_NOTIFICATION_AT__ &&
    now - hostWindow.__ACU_VISUALIZER_TEST_LAST_LOAD_NOTIFICATION_AT__ < 5000
  ) {
    return;
  }
  hostWindow.__ACU_VISUALIZER_TEST_LAST_LOAD_NOTIFICATION_AT__ = now;
  console.log('[ACU] 正在触发加载成功通知...');
  showNotification(`${acuButtonIconLabel('check', '表格数据已成功加载')}`, 'success');
}
