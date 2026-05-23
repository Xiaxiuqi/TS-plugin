(() => {
  'use strict';

  const label = '[JJKS after-native overlay probe FUSE]';
  const incident = '旧 after-native overlay 探针已废弃：曾导致用户浏览器中最新用户/AI 楼层疑似丢失。';
  const hardRules = [
    '本熔断脚本只打印错误/警告。',
    '不会插入 DOM。',
    '不会调用任何模块 mount()。',
    '不会安装 MutationObserver 或任何自动监听。',
    '不会调用 refreshOneMessage()。',
    '不会读取或写入 raw message。',
    '不会调用任何 set/delete/update 类 API。',
    '不得再复制执行旧 overlay 探针。',
  ];

  const payload = Object.freeze({
    ok: false,
    disabled: true,
    script: 'tmp/story-ui-after-native-overlay-probe.js',
    reason: incident,
    hardRules,
    safeReplacement: true,
  });

  try {
    console.error(`${label} ${incident}`);
    console.warn(`${label} 为防止再次造成 displayed DOM 或最新楼层异常，本文件已替换为安全熔断脚本。`);
    hardRules.forEach(rule => console.warn(`${label} ${rule}`));
    console.warn(`${label} 返回对象仅用于确认熔断状态，不包含任何页面读写结果。`, payload);
  } catch (_) {
    // 即使控制台对象不可用，也不得执行任何替代动作。
  }

  return payload;
})();
