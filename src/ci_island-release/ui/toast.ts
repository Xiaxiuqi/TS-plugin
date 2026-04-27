/**
 * Toast 消息提示
 */
declare const $: any;

export function showToast(msg: string, type: 'success' | 'error' = 'success'): void {
  // 同步输出到console
  if (type === 'error') {
    console.error('[浮岛通知]', msg);
  } else {
    console.log('[浮岛通知]', msg);
  }

  const $t = $('#ci-toast');
  if (!$t || $t.length === 0) return;

  // 清空并重建内容
  $t.empty();

  // 消息文本（可选中复制）
  const $msg = $('<span>').addClass('ci-toast-msg').text(msg).css({
    'user-select': 'text',
    cursor: 'text',
    flex: '1',
    'padding-right': '8px',
  });

  // 关闭按钮
  const $close = $('<span>')
    .addClass('ci-toast-close')
    .html('×')
    .css({
      cursor: 'pointer',
      'font-size': '24px',
      'line-height': '1',
      opacity: '0.7',
      'margin-left': '8px',
    })
    .on('mouseover', function (this: any) {
      $(this).css('opacity', '1');
    })
    .on('mouseout', function (this: any) {
      $(this).css('opacity', '0.7');
    })
    .on('click', function () {
      $t.removeClass('show');
    });

  $t.append($msg).append($close);

  $t.css({
    background: type === 'error' ? '#f44336' : '#4caf50',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
  });

  $t.addClass('show');

  // 成功消息3秒后自动消失，错误消息5秒后自动消失
  const autoHideDelay = type === 'success' ? 3000 : 5000;
  setTimeout(() => $t.removeClass('show'), autoHideDelay);
}
