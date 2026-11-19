import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { ability, combat, critical } from './judgment.fixtures.mjs';

const modules = {}, silent = { log() {}, warn() {}, error() {} };
const context = vm.createContext({ console: silent, Date, cryptLord: {
  __stage1Modules: modules, contract: { initializeGlobal(key, api) { modules[key] = api; },
    releaseGlobal() {} },
} });
context.window = context;
const current = await readFile(new URL('../../public/guimizhizhu_ui/core/judgment-state.js', import.meta.url), 'utf8');
vm.runInContext(current, context);
const state = modules['cryptLord.judgmentState'];
const original = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/41-js-judgment-script.txt', import.meta.url), 'utf8');
const parse = text => ts.createSourceFile('source.js', text, 99, true, ts.ScriptKind.JS);
const find = (tree, name) => {
  let result;
  const visit = node => {
    if (ts.isClassDeclaration(node) && node.name?.text === name) result = node;
    else ts.forEachChild(node, visit);
  };
  visit(tree);
  if (!result) throw Error(`Missing ${name}`);
  return result;
};
const originalTree = parse(original.slice(original.indexOf('(function()')));
const currentTree = parse(current);
const printer = ts.createPrinter({ removeComments: true });
const parserText = find(originalTree, 'JudgmentParser').getText(originalTree);
assert.equal(printer.printNode(ts.EmitHint.Unspecified, find(originalTree, 'JudgmentParser'), originalTree),
  printer.printNode(ts.EmitHint.Unspecified, find(currentTree, 'JudgmentParser'), currentTree));
const oracle = vm.runInNewContext(`${parserText}; new JudgmentParser()`, { console: silent, Date });
const native = new state.JudgmentParser();
const plain = value => JSON.parse(JSON.stringify(value, (_, row) =>
  Object.prototype.toString.call(row) === '[object Map]' ? [...row] : row));
for (const text of [ability, combat, critical, ability.replace('成功率阈值: 55', '成功率阈值: 40 + 15.28 + 17.2 ≈ 72'),
  combat.replace('抢占先机！', '攻守逆转！'), '未知原文']) {
  const actual = plain(native.parse(text)), expected = plain(oracle.parse(text));
  delete actual.timestamp; delete expected.timestamp;
  assert.deepEqual(actual, expected);
}
assert.equal(native.parse(combat).type, 'combat');
assert.equal(native.parse(critical).result.type, 'critical_success');
console.log('1/3 complete original parser and independent result parity passed');

const view = { document: {}, navigator: {}, setTimeout, clearTimeout };
const session = state.createSession(view, { console: silent, simplified: true });
assert.equal(session.complete(ability), true);
assert.equal(session.complete(combat), true);
assert.equal(session.complete(ability.replace(/【判定结果[^】]+】/, '')), false);
assert.equal(session.complete(combat.replace(/新防方投骰[^\n]+/, '')), false);
assert.equal(session.complete(ability.replace('【判定请求', '判定请求').replace('寻找线索】', '寻找线索>')), true);
assert.equal(state.logs(`${ability}\n${critical}\n${combat}`).length, 3);
assert.deepEqual(plain(state.logs(`<think>${ability}</think>\n${combat}\n<UpdateVariable>${ability}</UpdateVariable>`)), [combat]);
assert.equal(state.logs(`<thinking>${ability}`).length, 0);
session.dispose();
assert.equal(session.render(ability), null);
console.log('2/3 all request formats, stream completeness, multiple logs and hidden-tag isolation passed');

const ui = await readFile(new URL('../../public/guimizhizhu_ui/modules/judgment/index.js', import.meta.url), 'utf8');
assert.doesNotMatch(ui, /setChatMessages|replaceVariables|writeAssistant|inputAdapter|generateRaw|localStorage|window\.judgmentBeautifierInstance/);
assert.doesNotMatch(current, /window\.JudgmentBeautifier\s*=/);
assert.match(ui, /characterData: true/);
assert.match(ui, /subscriptions\.forEach\(handle => handle\.stop/);
assert.match(current, /timers\.forEach\(timer => hostWindow\.clearTimeout/);
console.log('3/3 read-only native boundary, isolated globals and lifecycle cleanup passed');
