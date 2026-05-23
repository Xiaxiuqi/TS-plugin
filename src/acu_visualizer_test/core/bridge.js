// ACU Visualizer 测试版外部环境桥接模块
// 来源：public/acu_visualizer/acu_visualizer-test.js 中 getCore()、getDataIsolationCode()、getIsolationKey() 的环境访问逻辑。
// 迁移原则：只封装访问方式，不改变原插件运行逻辑，不夹带优化。

import { DATABASE_SETTINGS_KEYS } from './constants.js';

export function getCore() {
  const w = window.parent || window;
  return {
    $: window.jQuery || w.jQuery,
    getDB: () => w.AutoCardUpdaterAPI || window.AutoCardUpdaterAPI,
  };
}

export function getParentWindow() {
  return window.parent || window;
}

export function getTopWindow() {
  try {
    return window.top || window;
  } catch (e) {
    return window;
  }
}

export function getPreferredStorage(settingsKeys = DATABASE_SETTINGS_KEYS) {
  let storage = window.localStorage;

  try {
    if (
      !storage.getItem(settingsKeys[0]) &&
      !storage.getItem(settingsKeys[1]) &&
      !storage.getItem(settingsKeys[2]) &&
      window.parent
    ) {
      try {
        storage = window.parent.localStorage;
      } catch (e) {
        storage = window.localStorage;
      }
    }
  } catch (e) {
    storage = window.localStorage;
  }

  return storage;
}

export function getUserscriptBridge() {
  try {
    return window.parent?.['__ACU_USERSCRIPT_BRIDGE__'] || window['__ACU_USERSCRIPT_BRIDGE__'] || null;
  } catch (e) {
    return window['__ACU_USERSCRIPT_BRIDGE__'] || null;
  }
}

export function getSillyTavern() {
  try {
    let ST = window.SillyTavern || (window.parent ? window.parent.SillyTavern : null);
    if (!ST && window.top && window.top.SillyTavern) ST = window.top.SillyTavern;
    return ST || null;
  } catch (e) {
    return window.SillyTavern || null;
  }
}

export function getCurrentChatId() {
  let chatId = '';
  try {
    const ST = getSillyTavern();
    if (ST) {
      if (typeof ST.getCurrentChatId === 'function') {
        chatId = ST.getCurrentChatId() || '';
      } else if (ST.chatId) {
        chatId = ST.chatId || '';
      }
    }
  } catch (e) {
    console.warn('[ACU] 获取聊天ID失败:', e);
  }
  return chatId;
}

export function getDataIsolationCode(settingsKeys = DATABASE_SETTINGS_KEYS) {
  let dataIsolationCode = '';

  try {
    const storage = getPreferredStorage(settingsKeys);

    try {
      const bridge = getUserscriptBridge();
      const tavernSettings = bridge?.extension_settings;
      if (
        tavernSettings &&
        tavernSettings.__userscripts &&
        tavernSettings.__userscripts['shujuku_v100__userscript_settings_v1']
      ) {
        const userscriptSettings = tavernSettings.__userscripts['shujuku_v100__userscript_settings_v1'];
        const v10GlobalMetaStr = userscriptSettings['shujuku_v100_globalMeta_v1'];
        if (v10GlobalMetaStr) {
          const v10GlobalMeta = JSON.parse(v10GlobalMetaStr);
          if (v10GlobalMeta && v10GlobalMeta.activeIsolationCode) {
            dataIsolationCode = v10GlobalMeta.activeIsolationCode;
            return dataIsolationCode;
          }
        }
      }
    } catch (e) {
      // 如果 Tavern 设置系统访问失败，继续尝试旧版 localStorage 设置。
    }

    for (const key of settingsKeys) {
      const settingsStr = storage.getItem(key);
      if (settingsStr) {
        const settings = JSON.parse(settingsStr);
        if (settings.dataIsolationEnabled && settings.dataIsolationCode) {
          dataIsolationCode = settings.dataIsolationCode;
          break;
        }
      }
    }
  } catch (e) {
    console.warn('[ACU] 读取数据隔离Code失败:', e);
  }

  return dataIsolationCode;
}

export function getIsolationKey() {
  const dataIsolationCode = getDataIsolationCode();
  const chatId = getCurrentChatId();

  let isolationKey = '';
  if (dataIsolationCode && chatId) {
    isolationKey = `${dataIsolationCode}_chat_${chatId}`;
  } else if (dataIsolationCode) {
    isolationKey = dataIsolationCode;
  } else if (chatId) {
    isolationKey = `chat_${chatId}`;
  }

  return isolationKey;
}
