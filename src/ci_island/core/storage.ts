/**
 * 浮岛存储工具
 * 安全的 localStorage 封装，解决 iframe/沙箱环境下不可用问题
 */

export function safeGetItem(key: string, defaultValue: string = ''): string {
  try {
    if (typeof localStorage !== 'undefined' && localStorage !== null) {
      return localStorage.getItem(key) || defaultValue;
    }
  } catch (e) {
    console.warn('[Storage] getItem失败:', e);
  }
  return defaultValue;
}

export function safeSetItem(key: string, value: string): boolean {
  try {
    if (typeof localStorage !== 'undefined' && localStorage !== null) {
      localStorage.setItem(key, value);
      return true;
    }
  } catch (e) {
    console.warn('[Storage] setItem失败:', e);
  }
  return false;
}

export function safeRemoveItem(key: string): boolean {
  try {
    if (typeof localStorage !== 'undefined' && localStorage !== null) {
      localStorage.removeItem(key);
      return true;
    }
  } catch (e) {
    console.warn('[Storage] removeItem失败:', e);
  }
  return false;
}
