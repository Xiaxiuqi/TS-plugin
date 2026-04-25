// ESM 兼容版 script.ts
const IFRAME_SRCDOC = `<!DOCTYPE html>
<html>
<head>
<link rel="stylesheet" href="https://testingcf.jsdelivr.net/npm/@fortawesome/fontawesome-free/css/all.min.css"></link>
<script src="https://testingcf.jsdelivr.net/gh/n0vi028/JS-Slash-Runner/lib/tailwindcss.min.js"></script>
<script src="https://testingcf.jsdelivr.net/npm/jquery"></script>
<script src="https://testingcf.jsdelivr.net/npm/jquery-ui/dist/jquery-ui.min.js"></script>
<link rel="stylesheet" href="https://testingcf.jsdelivr.net/npm/jquery-ui/themes/base/theme.min.css" />
<script src="https://testingcf.jsdelivr.net/npm/jquery-ui-touch-punch"></script>
<script src="https://testingcf.jsdelivr.net/npm/lodash"></script>
<script src="https://testingcf.jsdelivr.net/gh/n0vi028/JS-Slash-Runner/src/iframe/adjust_iframe_height.js"></script>
<style>
*,*::before,*::after{box-sizing:border-box;}
html,body{margin:0!important;padding:0;overflow:hidden!important;max-width:100%!important;}
</style>
</head>
<body>
</body>
</html>`;

export async function loadReadme(url: string): Promise<boolean> {
  const readme = await fetch(url);
  if (!readme.ok) {
    return false;
  }
  const readme_text = await readme.text();
  // 注意：replaceScriptInfo 需确保已在全局或导入
  if (typeof (window as any).replaceScriptInfo === 'function') {
    (window as any).replaceScriptInfo(readme_text);
  }
  return true;
}

/**
 * 将当前页面的样式传送（克隆）到目标容器
 * ESM 兼容实现：不依赖 Webpack HTML Loader，减少对 jQuery 的直接依赖
 */
export function teleportStyle(
  append_to: any = 'head',
): { destroy: () => void } {
  // 获取脚本 ID
  const scriptId = typeof getScriptId === 'function' ? getScriptId() : 'manual-style';
  
  // 使用原生 API 或 jQuery 获取目标
  const $target = typeof append_to === 'string' ? (window as any).$(append_to) : (window as any).$(append_to);
  
  if (!$target || $target.length === 0) {
    return { destroy: () => {} };
  }

  // 创建容器
  const $div = (window as any).$('<div style="display:none;">')
    .attr('data-teleported-style', scriptId);

  // 克隆所有 head 中的 style 标签
  const styles = document.querySelectorAll('head > style');
  styles.forEach(style => {
    // 过滤掉可能由本方法重复生成的样式（可选）
    if (!style.hasAttribute('data-teleported-style')) {
      const clone = style.cloneNode(true);
      $div.append(clone);
    }
  });

  $div.appendTo($target);

  return {
    destroy: () => $div.remove(),
  };
}

export function createScriptIdIframe(): JQuery<HTMLIFrameElement> {
  const $ = (window as any).$;
  return $(`<iframe>`).attr({
    'data-script-id': typeof getScriptId === 'function' ? getScriptId() : '',
    frameborder: 0,
    srcdoc: IFRAME_SRCDOC,
  }) as JQuery<HTMLIFrameElement>;
}

export function createScriptIdDiv(): JQuery<HTMLDivElement> {
  const $ = (window as any).$;
  return $('<div>').attr('data-script-id', typeof getScriptId === 'function' ? getScriptId() : '') as JQuery<HTMLDivElement>;
}

export function reloadOnChatChange(): any {
  const win = window as any;
  const SillyTavern = win.SillyTavern;
  const tavern_events = win.TavernEvents;
  const eventOn = win.eventOn;

  if (!SillyTavern || !eventOn) return;

  let chat_id = SillyTavern.getCurrentChatId();
  return eventOn(tavern_events.CHAT_CHANGED, (new_chat_id: any) => {
    if (chat_id !== new_chat_id) {
      chat_id = new_chat_id;
      window.location.reload();
    }
  });
}
