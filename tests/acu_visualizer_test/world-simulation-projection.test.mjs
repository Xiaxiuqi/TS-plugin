import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../public/acu_world_simulation/index.js', import.meta.url), 'utf8');
const logic = source.slice(
  source.indexOf('function changedLedgerTarget('),
  source.indexOf('function viewRows('),
).replace('function changedLedgerTarget(', 'export function changedLedgerTarget(');
const { changedLedgerTarget } = await import(`data:text/javascript,${encodeURIComponent(logic)}`);
const state = (revision, index = 3, chatId = 'chat-1', signal = '旧信号') => ({
  chatId,
  ledgerMessageIndex: index,
  ledger: { revision, guidance: { signals: [signal] } },
});

test('账本变化时只刷新账本所在楼层一次', () => {
  const before = state(12);
  const committed = state(13);
  assert.equal(changedLedgerTarget(before, committed), 3);
  assert.equal(changedLedgerTarget(committed, committed), null);
  assert.equal(changedLedgerTarget(before, state(12, 3, 'chat-1', '新信号')), 3);
  assert.equal(changedLedgerTarget(before, state(12)), null);
  assert.equal(changedLedgerTarget(before, state(13, 4)), 4);
});

test('聊天切换或没有有效账本时不刷新', () => {
  assert.equal(changedLedgerTarget(state(12), state(13, 3, 'chat-2')), null);
  assert.equal(changedLedgerTarget(state(12), { chatId: 'chat-1', ledger: null, ledgerMessageIndex: 3 }), null);
  assert.equal(changedLedgerTarget(state(12), { chatId: 'chat-1', ledger: { revision: 13 }, ledgerMessageIndex: null }), null);
});

test('账本原地修改时通过读取快照识别变化', () => {
  const before = state(12);
  before.ledgerSignature = JSON.stringify(before.ledger);
  before.ledger.revision = 13;
  const next = { ...before, ledgerSignature: JSON.stringify(before.ledger) };
  assert.equal(changedLedgerTarget(before, next), 3);
  assert.equal(changedLedgerTarget(next, next), null);
});

const timerLogic = source.slice(source.indexOf('  let displayRefreshTimer = null;'), source.indexOf('  const clamp ='));
function scheduler() {
  let chatId = 'chat-1';
  let id = 0;
  const timers = new Map();
  const calls = [];
  const settings = { refreshInjectedMessage: true };
  const hostWindow = {
    setTimeout(callback, delay) { timers.set(++id, { callback, delay }); return id; },
    clearTimeout(timer) { timers.delete(timer); },
    TavernHelper: { refreshOneMessage(messageId) { calls.push(messageId); } },
  };
  const getSillyTavern = () => ({
    getCurrentChatId: () => chatId,
    getContext: () => ({ chat: [{}, {}, {}, { is_user: false }] }),
  });
  const api = new Function('hostWindow', 'settings', 'getSillyTavern', 'window', 'text',
    `let disposed = false;\n${timerLogic}\nreturn { scheduleDisplayRefresh, clearDisplayRefresh, dispose() { disposed = true; clearDisplayRefresh(); } };`
  )(hostWindow, settings, getSillyTavern, {}, value => String(value ?? ''));
  return {
    ...api, timers, calls, settings,
    switchChat() { chatId = 'chat-2'; },
    fire() {
      const pending = [...timers.values()];
      timers.clear();
      pending.forEach(timer => timer.callback());
    },
  };
}

test('延迟一秒刷新一次，连续账本变化合并重新计时', () => {
  const run = scheduler();
  run.scheduleDisplayRefresh(3, 'chat-1');
  assert.deepEqual(run.calls, []);
  assert.equal([...run.timers.values()][0].delay, 1000);
  const firstTimer = [...run.timers.keys()][0];
  run.scheduleDisplayRefresh(3, 'chat-1');
  assert.equal(run.timers.size, 1);
  assert.equal(run.timers.has(firstTimer), false);
  run.fire();
  assert.deepEqual(run.calls, [3]);
  run.fire();
  assert.deepEqual(run.calls, [3]);
});

test('取消任务、关闭开关、切换聊天或卸载后不刷新', () => {
  for (const stop of [
    run => run.clearDisplayRefresh(),
    run => { run.settings.refreshInjectedMessage = false; },
    run => run.switchChat(),
    run => run.dispose(),
  ]) {
    const run = scheduler();
    run.scheduleDisplayRefresh(3, 'chat-1');
    stop(run);
    run.fire();
    assert.deepEqual(run.calls, []);
  }
});
