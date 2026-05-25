/**
 * 内存管理与资源清理
 * 统一管理事件监听、定时器、缓存引用，卸载时一次性释放
 */

type CleanupFn = () => void;

const _cleanups: CleanupFn[] = [];
const _intervals: ReturnType<typeof setInterval>[] = [];
const _timeouts: ReturnType<typeof setTimeout>[] = [];

/** 注册一个清理函数，卸载时自动调用 */
export function registerCleanup(fn: CleanupFn): void {
  _cleanups.push(fn);
}

/** 创建可跟踪的 setInterval */
export function trackedInterval(fn: () => void, ms: number): ReturnType<typeof setInterval> {
  const id = setInterval(fn, ms);
  _intervals.push(id);
  return id;
}

/** 创建可跟踪的 setTimeout */
export function trackedTimeout(fn: () => void, ms: number): ReturnType<typeof setTimeout> {
  const id = setTimeout(fn, ms);
  _timeouts.push(id);
  return id;
}

/** 销毁所有跟踪资源 */
export function destroyAll(): void {
  // 清理定时器
  for (const id of _intervals) clearInterval(id);
  _intervals.length = 0;

  for (const id of _timeouts) clearTimeout(id);
  _timeouts.length = 0;

  // 执行所有清理函数
  for (const fn of _cleanups) {
    try {
      fn();
    } catch (e) {
      console.error('[EchoTomb] cleanup error:', e);
    }
  }
  _cleanups.length = 0;
}
