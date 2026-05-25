/**
 * AI 请求限流队列
 * 所有 AI 调用（地图生成、组队补表）必须经过此队列
 * 默认并发 1，最大 3
 */

import { getSettings } from '../settings';
import { registerCleanup } from './memory';

interface QueueTask<T = any> {
  id: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
  /** 可选去重标识，相同 dedupeKey 的新任务会取消旧任务 */
  dedupeKey?: string;
}

let _queue: QueueTask[] = [];
let _running = 0;
let _destroyed = false;

function getMaxConcurrency(): number {
  try {
    return getSettings().aiConcurrency;
  } catch {
    return 1;
  }
}

function processQueue(): void {
  if (_destroyed) return;
  const max = getMaxConcurrency();

  while (_running < max && _queue.length > 0) {
    const task = _queue.shift()!;
    _running++;

    task
      .execute()
      .then(task.resolve)
      .catch(task.reject)
      .finally(() => {
        _running--;
        processQueue();
      });
  }
}

/**
 * 将 AI 任务加入队列
 * @param id 任务唯一标识
 * @param execute 实际执行函数
 * @param dedupeKey 可选去重键，相同 key 的旧任务会被取消
 */
export function enqueueAI<T>(
  id: string,
  execute: () => Promise<T>,
  dedupeKey?: string,
): Promise<T> {
  if (_destroyed) return Promise.reject(new Error('[EchoTomb] AI queue destroyed'));

  // 去重：移除队列中相同 dedupeKey 的待执行任务
  if (dedupeKey) {
    const removed = _queue.filter(t => t.dedupeKey === dedupeKey);
    _queue = _queue.filter(t => t.dedupeKey !== dedupeKey);
    for (const t of removed) {
      t.reject(new Error(`[EchoTomb] Task deduplicated: ${t.id}`));
    }
  }

  return new Promise<T>((resolve, reject) => {
    _queue.push({ id, execute, resolve, reject, dedupeKey });
    processQueue();
  });
}

/** 获取队列状态 */
export function getQueueStatus(): { queued: number; running: number; max: number } {
  return { queued: _queue.length, running: _running, max: getMaxConcurrency() };
}

/** 清空队列（卸载时调用） */
export function destroyQueue(): void {
  _destroyed = true;
  for (const task of _queue) {
    task.reject(new Error('[EchoTomb] Queue destroyed'));
  }
  _queue = [];
  _running = 0;
}

registerCleanup(destroyQueue);
