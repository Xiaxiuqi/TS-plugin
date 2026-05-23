// ACU Visualizer 测试版 DOM 清理工具
// 仅用于清理测试版临时 UI 的 jQuery 事件与 DOM 引用，不改变 DOM class、CSS 或业务行为。

export function removeWithEvents($el) {
  if (!$el) return;
  try {
    $el.off?.('.acu');
    $el.find?.('*')?.off?.('.acu');
    $el.remove?.();
  } catch (error) {
    try {
      $el.remove?.();
    } catch (_ignored) {
      // 忽略清理阶段兜底失败，避免影响后续 destroy 流程。
    }
  }
}

export function removeTransientUi($, root = document) {
  if (!$ || !root) return;
  $(root)
    .find(
      [
        '.acu-cell-menu',
        '.acu-order-menu',
        '.acu-edit-overlay',
        '.acu-settings-overlay',
        '.acu-history-overlay',
        '.acu-shortcut-lite-overlay',
        '.acu-confirm-overlay',
      ].join(', '),
    )
    .each(function () {
      removeWithEvents($(this));
    });
}
