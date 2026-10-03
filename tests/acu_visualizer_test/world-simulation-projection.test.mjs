import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../public/acu_world_simulation/index.js', import.meta.url), 'utf8');
const projectionLogic = source.slice(
  source.indexOf('const PROJECTION_PATTERN ='),
  source.indexOf('const STATUS ='),
) + source.slice(
  source.indexOf('function changedProjectionTargets('),
  source.indexOf('function viewRows('),
);
const { projectionSignature, changedProjectionTargets, isChatEditorOpen } = await import(`data:text/javascript,${encodeURIComponent(
  projectionLogic.replace('const projectionSignature =', 'export const projectionSignature =')
    .replace('function changedProjectionTargets(', 'export function changedProjectionTargets(')
    .replace('function isChatEditorOpen(', 'export function isChatEditorOpen('),
)}`);

const projection = text => `正文\n<!-- qrf-world-simulation-projection:v2:start -->\n<div hidden><与此同时>${text}</与此同时></div>\n<!-- qrf-world-simulation-projection:v2:end -->`;
const state = (revision, content, chatId = 'chat-1') => ({
  chatId,
  ledger: { revision },
  projections: new Map(projectionSignature(content ?? '') ? [[3, projectionSignature(content)]] : []),
});

test('only a changed database projection requests a display refresh', () => {
  const before = state(12, projection('旧内容'));
  const edited = state(12, projection('旧内容') + '\n正文编辑');
  const rerendered = state(12, projection('旧内容'));
  const ledgerOnly = state(13, projection('旧内容'));
  const injected = state(13, projection('新内容'));

  assert.deepEqual(changedProjectionTargets(before, edited), []);
  assert.deepEqual(changedProjectionTargets(before, rerendered), []);
  assert.deepEqual(changedProjectionTargets(before, ledgerOnly), []);
  assert.deepEqual(changedProjectionTargets(before, state(13, projection('新内容'), 'chat-2')), []);
  assert.deepEqual(changedProjectionTargets(before, injected), [[3, projectionSignature(projection('新内容'))]]);
  assert.deepEqual(changedProjectionTargets(before, state(12, projection('新内容'))), [[3, projectionSignature(projection('新内容'))]]);
  assert.deepEqual(changedProjectionTargets(before, state(12, null)), []);
  assert.deepEqual(changedProjectionTargets(before, state(12, '<!-- qrf-world-simulation-projection:v2:start -->')), []);
  assert.deepEqual(changedProjectionTargets(state(0, null), state(1, projection('首次注入'))).map(([index]) => index), [3]);
  assert.deepEqual(changedProjectionTargets(state(12, '正文'), state(12, '正文\n<与此同时>新信号</与此同时>')).map(([index]) => index), [3]);
  assert.deepEqual(changedProjectionTargets(state(12, '正文\n<与此同时>旧信号</与此同时>'),
    state(12, '正文\n<与此同时>新信号</与此同时>')).map(([index]) => index), [3]);
});

test('projection detection ignores unrelated body edits', () => {
  assert.equal(projectionSignature('普通正文'), null);
  assert.equal(projectionSignature('<!-- qrf-world-simulation-projection:v2:start -->孤立标签'), null);
  assert.equal(projectionSignature('<!-- qrf-world-simulation-projection:v1:start -->v1内容<!-- qrf-world-simulation-projection:v2:end -->'), null);
  assert.ok(projectionSignature('<!-- qrf-world-simulation-projection:v1:start -->v1内容<!-- qrf-world-simulation-projection:v1:end -->'));
  assert.equal(projectionSignature('<与此同时>没有结束标签'), null);
  assert.equal(projectionSignature('只有结束标签</与此同时>'), null);
  assert.ok(projectionSignature('<与此同时>新信号</与此同时>'));
  assert.equal(projectionSignature(projection('信号')),
    projectionSignature('正文\n<!-- 改版的投影注释 -->\n<与此同时>信号</与此同时>'));
  assert.equal(projectionSignature(projection('信号') + '\n正文编辑'), projectionSignature(projection('信号')));
  assert.notEqual(projectionSignature(projection('信号')), projectionSignature(projection('更新后的信号')));
});

test('an open chat editor suppresses a queued display refresh', () => {
  const selectors = [];
  const doc = { querySelector: selector => {
    selectors.push(selector);
    return selector.includes('#chat .mes textarea') ? {} : null;
  } };
  assert.equal(isChatEditorOpen(doc), true);
  assert.deepEqual(selectors, ['#chat .mes textarea, #chat .mes [contenteditable="true"]']);
  assert.equal(isChatEditorOpen({ querySelector: () => null }), false);
});
