/**
 * 数据库模板存取（适配 Extension Settings 与 LocalStorage）
 * 用于地图模板的注入与移除
 */
import { ACU_DB_NAMESPACE, ACU_DB_GLOBAL_META_KEY, ACU_DB_PROFILE_PREFIX } from '../core/constants';
import { safeGetItem, safeSetItem } from '../core/storage';

/**
 * 获取 Tavern Extension Settings 对象
 */
export function getTavernExtensionSettings(): any {
  const win = window as any;
  if (win.SillyTavern && win.SillyTavern.extensionSettings) {
    return win.SillyTavern.extensionSettings;
  }
  try {
    if (win.parent && win.parent.SillyTavern && win.parent.SillyTavern.extensionSettings) {
      return win.parent.SillyTavern.extensionSettings;
    }
  } catch (e) {
    // 忽略跨域错误
  }
  return null;
}

/**
 * 触发 Extension Settings 保存
 */
export function saveTavernExtensionSettings(): void {
  const win = window as any;
  const ST = win.SillyTavern || (win.parent ? win.parent.SillyTavern : null);
  if (ST) {
    if (typeof ST.saveSettingsDebounced === 'function') ST.saveSettingsDebounced();
    else if (typeof ST.saveSettings === 'function') ST.saveSettings();
  }
}

/**
 * 获取数据库模板（优先 Extension Settings，回退 LocalStorage）
 */
export function getDatabaseTemplate_ACU(): {
  key: string;
  content: string;
  source: 'extension' | 'local';
} | null {
  // 1. 尝试从 Extension Settings 读取（新版数据库）
  const settings = getTavernExtensionSettings();
  if (settings && settings.__userscripts && settings.__userscripts[ACU_DB_NAMESPACE]) {
    const ns = settings.__userscripts[ACU_DB_NAMESPACE];

    let activeCode = '';
    try {
      const metaStr = ns[ACU_DB_GLOBAL_META_KEY];
      if (metaStr) {
        const meta = JSON.parse(metaStr);
        activeCode = meta.activeIsolationCode || '';
      }
    } catch (e) {
      console.warn('[浮岛] 解析数据库GlobalMeta失败:', e);
    }

    const slot = activeCode ? encodeURIComponent(activeCode) : '__default__';
    const key = `${ACU_DB_PROFILE_PREFIX}__${slot}__template`;

    if (ns[key]) {
      console.log('[浮岛] 从Extension Settings读取到模板:', key);
      return { key, content: ns[key], source: 'extension' };
    }
  }

  // 2. 回退到 LocalStorage（旧版数据库）
  const possibleKeys = [
    'shujuku_v70_customTemplate',
    'shujuku_v36_customTemplate',
    'shujuku_v7_customTemplate',
    'acu_customTemplate',
  ];

  for (const key of possibleKeys) {
    const temp = safeGetItem(key);
    if (temp) {
      console.log('[浮岛] 从LocalStorage读取到模板:', key);
      return { key, content: temp, source: 'local' };
    }
  }

  // 3. 深度搜索 LocalStorage
  if (typeof localStorage !== 'undefined') {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('customTemplate')) {
        const temp = localStorage.getItem(key);
        if (temp && temp.includes('sheet_') && temp.includes('mate')) {
          console.log('[浮岛] 深度搜索从LocalStorage读取到模板:', key);
          return { key, content: temp, source: 'local' };
        }
      }
    }
  }

  return null;
}

/**
 * 保存数据库模板
 */
export function saveDatabaseTemplate_ACU(
  key: string,
  content: string,
  source: 'extension' | 'local',
): boolean {
  if (source === 'extension') {
    const settings = getTavernExtensionSettings();
    if (settings) {
      if (!settings.__userscripts) settings.__userscripts = {};
      if (!settings.__userscripts[ACU_DB_NAMESPACE]) settings.__userscripts[ACU_DB_NAMESPACE] = {};

      settings.__userscripts[ACU_DB_NAMESPACE][key] = content;
      saveTavernExtensionSettings();
      console.log('[浮岛] 模板已保存到 Extension Settings:', key);
      return true;
    }
    return false;
  } else {
    const result = safeSetItem(key, content);
    console.log('[浮岛] 模板已保存到 LocalStorage:', key);
    return result;
  }
}
