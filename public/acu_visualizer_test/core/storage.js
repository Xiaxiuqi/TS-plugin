// 存储模块占位：后续集中封装 localStorage 读写、清理、快照与历史分片。

export function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error('[ACU-Test] localStorage 写入失败:', key, error);
    return false;
  }
}

export function readJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn('[ACU-Test] localStorage JSON 读取失败:', key, error);
    return fallback;
  }
}

export function writeJSON(key, value) {
  return safeLocalStorageSet(key, JSON.stringify(value));
}
