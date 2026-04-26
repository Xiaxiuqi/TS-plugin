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
 * 通用拖拽处理函数（支持鼠标和触摸）
 * @param $el 触发拖拽的元素
 * @param onStart 拖拽开始回调
 * @param onMove 拖拽移动回调
 * @param onEnd 拖拽结束回调
 */
export const handleDrag = ($el: any, onStart: any, onMove: any, onEnd: any): void => {
  const startDrag = (e: any) => {
    const isTouch = e.type === 'touchstart';
    if (!isTouch && e.button !== 0) return;

    // 检查是否点击了按钮或禁止拖拽的元素
    const $target = $(e.target);
    if (
      $target.closest(
        '.ci-close-btn, .ci-edit-btn, .ci-pin-btn, .ci-save-layout-btn, .ci-refresh-btn, .no-drag',
      ).length
    ) {
      return;
    }

    if (!isTouch) e.preventDefault();
    e.stopPropagation();
    const point = isTouch ? e.originalEvent.touches[0] : e;
    onStart(point, e);
    const moveEvent = isTouch ? 'touchmove' : 'mousemove';
    const endEvent = isTouch ? 'touchend' : 'mouseup';
    const moveHandler = (ev: any) => {
      const p = isTouch ? ev.originalEvent.touches[0] : ev;
      onMove(p, ev);
    };
    const endHandler = (ev: any) => {
      onEnd(ev);
      $(window).off(moveEvent, moveHandler).off(endEvent, endHandler);
      try {
        $(window.parent).off(moveEvent, moveHandler).off(endEvent, endHandler);
      } catch (e) {
        // Ignore cross-origin errors
      }
    };
    $(window).on(moveEvent, moveHandler).on(endEvent, endHandler);
    try {
      $(window.parent).on(moveEvent, moveHandler).on(endEvent, endHandler);
    } catch (e) {
      // Ignore cross-origin errors
    }
  };
  $el.on('mousedown touchstart', startDrag);
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
