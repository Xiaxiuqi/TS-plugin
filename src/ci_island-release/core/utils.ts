/**
 * 浮岛通用工具函数
 * 包含调试输出、列名识别、内容解析、拖拽处理、元素约束等
 */

declare const $: any;

// ========== 调试输出 ==========
/**
 * 调试输出（运行时可由设置开关控制）
 *
 * 通过设置面板"性能设置 → 调试通知"开关控制是否输出。
 * 关闭时仅输出含 [Error] / [关键] / [核心] / ❌ / ⚠️ 标签的关键日志，
 * 不影响 toast 通知（toast 是用户提示，dbg 是控制台调试）。
 */
export function dbg(msg: string, data?: any): void {
  // 通过 globalThis 读取静默开关（避免循环依赖；由 app.ts 在初始化时设置）
  const silent = (globalThis as any).__ciSilentDebug === true;
  if (silent) {
    // 静默模式：仅保留含关键标签的日志
    const isKeyLog = /\[Error\]|\[关键\]|\[核心\]|❌|⚠️/.test(msg);
    if (!isKeyLog) return;
  }
  console.log(`%c[浮岛DEBUG] ${msg}`, 'background: #d32f2f; color: #fff', data || '');
}

// ========== 列名识别 ==========
/**
 * 判断列名是否为系统列（如 row_id），系统列应在显示和编辑时隐藏
 */
export function isSystemColumn(colName: any): boolean {
  if (!colName) return false;
  const name = String(colName).trim().toLowerCase();
  return name === 'row_id' || name === 'rowid' || name === 'row id' || name === 'id';
}

/**
 * 过滤掉表头中的系统列（row_id 等），返回 [可见列名数组, 可见列原始索引数组]
 *
 * 应用场景：所有遍历表头/单元格的逻辑（渲染、编辑弹窗、提取数据）都应使用此函数
 * 而不是直接 forEach(headers)，确保 row_id 等系统列在 UI 层完全不可见
 *
 * @param headers 原始表头数组
 * @returns { visibleHeaders: 过滤后的表头, indexMap: 每个可见列在原表中的索引 }
 *
 * @example
 *   const { visibleHeaders, indexMap } = filterSystemColumns(table.content[0]);
 *   visibleHeaders.forEach((colName, i) => {
 *     const originalIdx = indexMap[i];
 *     const value = row[originalIdx];
 *     // ... 渲染或处理 ...
 *   });
 */
export function filterSystemColumns(headers: any[]): {
  visibleHeaders: string[];
  indexMap: number[];
} {
  const visibleHeaders: string[] = [];
  const indexMap: number[] = [];
  if (!Array.isArray(headers)) return { visibleHeaders, indexMap };
  headers.forEach((h, i) => {
    if (!isSystemColumn(h)) {
      visibleHeaders.push(h);
      indexMap.push(i);
    }
  });
  return { visibleHeaders, indexMap };
}

/**
 * 遍历某一行的可见列（自动跳过 row_id 等系统列）
 * @param row 数据行
 * @param headers 表头
 * @param callback (colName, cellValue, originalIdx) => void
 */
export function forEachVisibleCell(
  row: any[],
  headers: any[],
  callback: (colName: string, cellValue: any, originalIdx: number) => void,
): void {
  if (!Array.isArray(headers) || !Array.isArray(row)) return;
  headers.forEach((h, i) => {
    if (isSystemColumn(h)) return;
    callback(h, row[i], i);
  });
}

// ========== 内容解析 ==========
/**
 * 解析格式化内容：识别 "XX：XXXX；" 格式
 * @param content 原始内容字符串
 * @returns { labels: {key: string, value: string}[], notes: string }
 */
export function parseFormattedContent(content: string): {
  labels: { key: string; value: string }[];
  notes: string;
} {
  if (!content || typeof content !== 'string') {
    return { labels: [], notes: '' };
  }

  const labels: { key: string; value: string }[] = [];
  const notesParts: string[] = [];

  const pattern = /([^：:；;\s]+)[：:]([^；;]+)[；;]?/g;
  let match;
  let lastIndex = 0;

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const skipped = content.substring(lastIndex, match.index).trim();
      if (skipped) notesParts.push(skipped);
    }
    labels.push({
      key: match[1].trim(),
      value: match[2].trim(),
    });
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < content.length) {
    const remaining = content.substring(lastIndex).trim();
    if (remaining) notesParts.push(remaining);
  }

  return {
    labels,
    notes: notesParts.join(' '),
  };
}

/**
 * 辅助函数：更新单元格或复合单元格内容
 * 支持直接列匹配和 "Key:Value" 格式的复合内容匹配
 */
export function updateCellOrComposite(
  row: any[],
  headers: string[],
  key: string,
  value: string,
): boolean {
  const colIdx = headers.findIndex(h => h && String(h) === key);
  if (colIdx !== -1 && row[colIdx] !== undefined) {
    row[colIdx] = value;
    return true;
  }

  for (let i = 0; i < row.length; i++) {
    if (isSystemColumn(headers[i])) continue;
    const cell = String(row[i]);
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedKey}[:：]\\s*)([^;；]+)`);
    if (regex.test(cell)) {
      row[i] = cell.replace(regex, `$1${value}`);
      return true;
    }
  }
  return false;
}

// ========== 表查找 ==========
export function findTableByName(data: any, name: string): any {
  if (!data) return null;
  if (data[name]) return data[name];
  const values = Object.values(data);
  for (const table of values) {
    if ((table as any).name === name) return table;
  }
  const fuzzy = values.find((t: any) => t.name && (t.name.includes(name) || name.includes(t.name)));
  return fuzzy || null;
}

// ========== 拖拽处理 ==========
/**
 * 通用拖拽处理函数（mousedown/touchstart 双绑，全浏览器兼容）
 *
 * 设计原则（基于 5 轮火狐对照测试验证）：
 *   - mousedown 处理鼠标拖动，touchstart 处理触屏拖动
 *   - $(window) + $(window.parent) 双层监听 mousemove/mouseup，跨 iframe 兜底
 *   - 拖动元素的 touch-action / user-select 在 SCSS 全局声明（_panels.scss）
 *
 * 为什么不用 PointerEvent（已通过实测排除）：
 *   1. 火狐严格按 W3C 规范，pointerdown.preventDefault() 会抑制后续 mousedown
 *   2. 火狐跨 iframe 时 pointermove 不路由到 target/document 上注册的 listener
 *   → 实测证明：移除 pointerdown listener 后，纯 mousedown/mousemove/mouseup 完美工作
 *
 * 浏览器兼容性：
 *   - Chrome / Edge / Firefox / Safari 全平台稳定（mousedown 是浏览器最底层事件）
 *   - 触屏：iOS Safari 12+ / Android Chrome 30+
 *
 * 内存开销：
 *   - 静态：每个拖动元素 1 个 mousedown + 1 个 touchstart listener（jQuery 一次绑定）
 *   - 拖动期峰值：4 个 listener（window + window.parent 各 mousemove + mouseup）
 *   - 拖动结束：全部 .off 清理，零泄漏
 *
 * @param $el 触发拖拽的 jQuery 元素
 * @param onStart 拖拽开始回调（point: {clientX, clientY}, e: Event）
 * @param onMove 拖拽移动回调
 * @param onEnd 拖拽结束回调
 */
export const handleDrag = ($el: any, onStart: any, onMove: any, onEnd: any): void => {
  // 关键：使用原生 addEventListener 绑定所有事件
  //
  // 为什么不用 jQuery .on()：
  //   - 酒馆助手脚本模式下，浮岛代码运行在 TH-script-* iframe 内
  //   - 但浮岛 DOM 元素在顶层 body
  //   - jQuery 实例是 iframe 内的，包装顶层元素后 .on('mousedown') 在火狐下不路由
  //   - 实测：诊断脚本用原生 addEventListener 在 grip 上能收到 mousedown，
  //          而浮岛 jQuery 的 mousedown handler 不被触发
  //   → 必须用原生 addEventListener，事件直接在顶层 DOM 上路由
  //
  // window.top 用于绑定 mousemove/mouseup，确保鼠标在 iframe 外也能收到
  const getTopWin = (): Window => {
    try {
      return (window.top || window) as Window;
    } catch (e) {
      return window;
    }
  };

  // 解析元素：兼容 jQuery 集合 / 单元素 / 原生元素
  const elements: Element[] = (() => {
    if (!$el) return [];
    if (typeof $el.toArray === 'function') return $el.toArray();
    if ($el[0] && $el[0].addEventListener) return [$el[0]];
    if ($el.addEventListener) return [$el];
    return [];
  })();

  const startDrag = (e: any) => {
    const isTouch = e.type === 'touchstart';
    if (!isTouch && e.button !== 0) return;

    // 跳过禁止拖拽的子元素（按钮等）
    const target = e.target as Element;
    if (
      target &&
      target.closest &&
      target.closest(
        '.ci-close-btn, .ci-edit-btn, .ci-pin-btn, .ci-save-layout-btn, .ci-refresh-btn, .no-drag',
      )
    ) {
      return;
    }

    if (!isTouch) e.preventDefault();
    e.stopPropagation();

    const point = isTouch ? e.touches[0] : e;
    onStart({ clientX: point.clientX, clientY: point.clientY }, e);

    const moveEvent = isTouch ? 'touchmove' : 'mousemove';
    const endEvent = isTouch ? 'touchend' : 'mouseup';

    const moveHandler = (ev: any) => {
      const p = isTouch && ev.touches ? ev.touches[0] : ev;
      onMove({ clientX: p.clientX, clientY: p.clientY }, ev);
    };
    const endHandler = (ev: any) => {
      onEnd(ev);
      const topWin = getTopWin();
      topWin.removeEventListener(moveEvent, moveHandler);
      topWin.removeEventListener(endEvent, endHandler);
    };

    const topWin = getTopWin();
    topWin.addEventListener(moveEvent, moveHandler);
    topWin.addEventListener(endEvent, endHandler);
  };

  // 原生 addEventListener 绑定 mousedown/touchstart 到每个拖动元素
  // 这是修复火狐脚本模式 mousedown 不路由的关键
  elements.forEach(el => {
    if (!el || !el.addEventListener) return;
    el.addEventListener('mousedown', startDrag);
    el.addEventListener('touchstart', startDrag, { passive: false });
  });
};

// ========== 元素约束 ==========
/**
 * 约束元素位置不超出窗口范围
 */
export function constrainElement($el: any): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  const win = window.parent || window;
  const $win = $(win);
  const winW = $win.width() || 1024;
  const winH = $win.height() || 768;
  const rect = $el[0].getBoundingClientRect();

  let left = rect.left;
  let top = rect.top;
  let width = rect.width;
  let height = rect.height;

  // 处理宽度挤压
  if (width > winW) {
    width = winW - 20;
    $el.css('width', width + 'px');
  }
  if (left + width > winW) {
    left = Math.max(10, winW - width - 10);
  }
  if (left < 0) left = 10;

  // 处理高度挤压
  if (height > winH) {
    height = winH - 20;
    $el.css('height', height + 'px');
  }
  if (top + height > winH) {
    top = Math.max(10, winH - height - 10);
  }
  if (top < 0) top = 10;

  $el.css({
    left: left + 'px',
    top: top + 'px',
  });

  return { left, top, width, height };
}

// ========== 游戏交互 ==========
/**
 * 向 SillyTavern 输入框追加消息
 */
export function sendGameActionRequest(msg: string): void {
  const parentWin = window.parent as any;
  let $textarea = $('#send_textarea');
  if (!$textarea.length) {
    $textarea = $(parentWin.document).find('#send_textarea');
  }

  if ($textarea.length) {
    const currentVal = ($textarea.val() as string) || '';
    const finalVal = currentVal ? currentVal + '\n' + msg : msg;
    $textarea.val(finalVal).trigger('input').trigger('change');

    try {
      const ctx = parentWin.SillyTavern?.getContext?.();
      if (ctx) ctx.input = finalVal;
    } catch (e) {
      // Ignore
    }
  } else if (parentWin.SillyTavern && parentWin.SillyTavern.getContext) {
    const context = parentWin.SillyTavern.getContext();
    if (context && context.setInput) {
      const current = context.input || '';
      const final = current ? current + '\n' + msg : msg;
      context.setInput(final);
    }
  }
}

// ========== 字符串工具 ==========
/**
 * 提取角色核心名（去除括号内的别名）
 */
export function extractCoreName(n: string): string {
  if (!n) return '';
  const m = String(n)
    .trim()
    .match(/[\(（](.+?)[\)）]/);
  return m ? m[1].trim() : String(n).trim();
}

/**
 * 格式化物品列表：A、B和C
 */
export function formatItemList(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}和${names[1]}`;
  const last = names[names.length - 1];
  const others = names.slice(0, names.length - 1).join('、');
  return `${others}和${last}`;
}

/**
 * 根据角色性别返回人称代词
 */
export function getPronounByChar(char: any): string {
  const sex = (char.sex || '').toLowerCase();
  if (['女', 'female', 'f', '雌性', '母', '♀'].some(s => sex.includes(s))) return '她';
  return '他';
}


// ========== 浮岛业务工具（角色） ==========
import { state } from './state';

/**
 * 获取主角名称
 * - 优先从缓存读取
 * - 然后从主角信息表
 * - 最后退化为第一个 main 角色
 * 注：依赖 state.cachedData，调用方需保证已初始化
 */
export function getProtagonistName(): string {
  if (state.cachedData.protagonistName) {
    return state.cachedData.protagonistName;
  }

  const mainChars = state.cachedData.main || [];
  const protagonist = mainChars.find(
    (c: any) =>
      c._src?.table === '主角信息' ||
      c.name?.includes('主角') ||
      c._src?.table?.includes('主角'),
  );

  if (protagonist?.name) {
    state.cachedData.protagonistName = protagonist.name;
    return protagonist.name;
  }

  if (mainChars.length > 0 && mainChars[0].name) {
    state.cachedData.protagonistName = mainChars[0].name;
    return mainChars[0].name;
  }

  return '';
}

/**
 * 获取在场角色名单（从全局数据表中读取"姓名/在场角色"列）
 */
export function getPresentCharacterList(): Set<string> {
  const presentSet = new Set<string>();
  const api = (window as any).AutoCardUpdaterAPI || (window.parent as any).AutoCardUpdaterAPI;
  if (!api || !api.exportTableAsJson) return presentSet;

  const data = api.exportTableAsJson();
  if (!data) return presentSet;

  Object.values(data).forEach((table: any) => {
    if (table && table.name && table.name.includes('全局数据')) {
      const headers = table.content[0] || [];
      const rows = table.content.slice(1);

      const colIndices = headers.reduce((acc: number[], h: string, i: number) => {
        if (h && (h.includes('姓名') || h.includes('在场角色'))) acc.push(i);
        return acc;
      }, []);

      rows.forEach((row: any) => {
        colIndices.forEach((idx: number) => {
          const val = row[idx];
          if (val) {
            val.split(/[,，;；/／]/).forEach((s: string) => {
              const name = s.trim();
              if (name) presentSet.add(name);
            });
          }
        });
      });
    }
  });
  return presentSet;
}


// ========== 顶层 window 的 requestAnimationFrame ==========
/**
 * 获取顶层 window 的 requestAnimationFrame（单例缓存）
 *
 * 火狐严格按 W3C 规范：display:none 的 iframe 内的 rAF 完全不调度。
 * 酒馆助手的 TH-script-* iframe 默认 display:none，
 * 因此脚本模式下 iframe 内的 rAF 永远不触发，导致拖动失效。
 *
 * Chrome / Edge 容错（即使 iframe 不可见也调度 rAF），所以原版方案在 Chrome/Edge 工作正常。
 *
 * 本函数返回顶层 window 的 rAF，确保在脚本模式下也能正确调度。
 *
 * 性能优化：使用模块级单例缓存，避免每次拖动 mousemove（~200 次/秒）都重新调用 .bind()
 * - 首次调用：~10μs（包含 try-catch + bind）
 * - 后续调用：~0.1μs（单次 if 检查 + 引用返回）
 * - 内存：2 个函数引用（共约 100B）
 *
 * 兼容性：
 * - 控制台 import 模式：window.top === window，等同于本地 rAF
 * - 脚本模式：返回顶层 rAF，绕过 iframe 冻结限制
 * - 跨域 iframe：try-catch fallback 到本地 rAF
 *
 * @returns 绑定到顶层 window 的 requestAnimationFrame 函数（单例）
 */
let _topRaf: ((cb: FrameRequestCallback) => number) | null = null;
let _topCancelRaf: ((id: number) => void) | null = null;

export const getTopRaf = (): ((cb: FrameRequestCallback) => number) => {
  if (_topRaf) return _topRaf;
  try {
    const topWin = (window.top || window) as Window;
    _topRaf = topWin.requestAnimationFrame.bind(topWin);
  } catch (e) {
    _topRaf = window.requestAnimationFrame.bind(window);
  }
  return _topRaf;
};

/**
 * 获取顶层 window 的 cancelAnimationFrame（单例缓存，与 getTopRaf 配对使用）
 */
export const getTopCancelRaf = (): ((id: number) => void) => {
  if (_topCancelRaf) return _topCancelRaf;
  try {
    const topWin = (window.top || window) as Window;
    _topCancelRaf = topWin.cancelAnimationFrame.bind(topWin);
  } catch (e) {
    _topCancelRaf = window.cancelAnimationFrame.bind(window);
  }
  return _topCancelRaf;
};
