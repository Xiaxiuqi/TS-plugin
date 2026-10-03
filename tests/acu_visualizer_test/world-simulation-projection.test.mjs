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
