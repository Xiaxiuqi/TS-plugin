import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const base = new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/', import.meta.url);
const text = (await readFile(new URL('37f-js-pathway-cores.txt', base), 'utf8')).replace(/\r\n?/g, '\n');
function object(name) {
  const start = text.indexOf(`const ${name} =`);
  if (start < 0) throw Error(`Missing ${name}`);
  const ast = ts.createSourceFile('original.js', text.slice(start), 99, true, ts.ScriptKind.JS);
  return ast.statements[0].getText(ast);
}
const battle = await readFile(new URL('30a2-js-battle-board-and-units.txt', base), 'utf8');
const ast = ts.createSourceFile('battle.js', battle, 99, true, ts.ScriptKind.JS);
const life = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'LifeSaveManager');
const methods = life.members.filter(node => ['splitSequenceFragments', 'resolveFragment'].includes(node.name?.getText(ast)));
if (methods.length !== 2) throw Error('Missing sequence helpers');
const mode = object('ReaderMysticMode');
if (mode.includes('win.apiUrl')) throw Error('Unexpected separate API configuration');
await writeFile(new URL('../../public/guimizhizhu_ui/core/reader-reference.js', import.meta.url), `// Generated from the complete original ReaderMysticCore and ReaderMysticMode.
(() => {
  'use strict';
  const KEY = 'cryptLord.readerReference';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  function create(deps) {
    const window = deps.window, document = window.document;
    const GameDBManager = { DB: { godPathways: deps.pool.pathways } };
    const parseSequenceRank = modules['cryptLord.marionetteReference'].rank;
    const LifeSaveManager = {
${methods.map(node => node.getText(ast).replace(/^static\s+/, '')).join(',\n')}
    };
    const ConsumableMoveBuilder = { getAvgAttrs: rank => deps.averages[String(rank)] ||
      deps.averages['10'] || { 活力: 37, 敏捷: 45, 灵性: 43, 理智: 28, 人性: 27, 运气: 20 } };
${object('ReaderMysticCore')}
${mode}
    ReaderMysticMode.scope = deps.scope;
    return { core: ReaderMysticCore, mode: ReaderMysticMode };
  }
  const api = { create, status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
`.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted complete original reader learning, editor, prompts and calculations.');
