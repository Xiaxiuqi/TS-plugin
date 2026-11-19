import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const base = new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/', import.meta.url);
const text = (await Promise.all(['37f-js-pathway-cores.txt', '38-js-pathway-play.txt']
  .map(file => readFile(new URL(file, base), 'utf8')))).join('\n').replace(/\r\n?/g, '\n');
function object(name) {
  const start = text.indexOf(`const ${name} =`);
  if (start < 0) throw Error(`Missing ${name}`);
  const ast = ts.createSourceFile('original.js', text.slice(start), 99, true, ts.ScriptKind.JS);
  const node = ast.statements[0];
  if (!node.getText(ast).trim().endsWith('};')) throw Error(`Incomplete ${name}`);
  return node.getText(ast);
}
const battle = await readFile(new URL('30a2-js-battle-board-and-units.txt', base), 'utf8');
const ast = ts.createSourceFile('battle.js', battle, 99, true, ts.ScriptKind.JS);
const life = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'LifeSaveManager');
const methods = life.members.filter(node => ['splitSequenceFragments', 'resolveFragment'].includes(node.name?.getText(ast)));
if (methods.length !== 2) throw Error('Missing sequence helpers');
const pathwayText = await readFile(new URL('37e-js-domain-affairs-window.txt', base), 'utf8');
const pathwayAst = ts.createSourceFile('pathways.js', pathwayText.slice(pathwayText.indexOf('const PathwaySeqUtil =')), 99, true, ts.ScriptKind.JS);
const pathwayMethods = pathwayAst.statements[0].declarationList.declarations[0].initializer.properties
  .filter(node => ['pathwayDb', 'pathwayText'].includes(node.name?.getText(pathwayAst)));
if (pathwayMethods.length !== 2) throw Error('Missing original pathway prompt helpers');
await writeFile(new URL('../../public/guimizhizhu_ui/core/mystery-roster-reference.js', import.meta.url), `// Generated from the complete original mystery core, catalog and management mode.
(() => {
  'use strict';
  const KEY = 'cryptLord.mysteryRosterReference';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  function create(deps) {
    const window = deps.window, document = window.document;
    const localStorage = { getItem: () => String(Boolean(deps.locked)) };
    const GameDBManager = { DB: { godPathways: deps.pool.pathways } };
    const parseSequenceRank = modules['cryptLord.marionetteReference'].rank;
    const LifeSaveManager = {
${methods.map(node => node.getText(ast).replace(/^static\s+/, '')).join(',\n')}
    };
    const { core: ReaderMysticCore, mode: ReaderMysticMode } = modules['cryptLord.readerReference'].create(deps);
    const ConsumableMoveBuilder = { getAvgAttrs: rank => deps.averages[String(rank)] ||
      deps.averages['10'] || { 活力: 37, 敏捷: 45, 灵性: 43, 理智: 28, 人性: 27, 运气: 20 } };
    const PathwaySeqUtil = {
${pathwayMethods.map(node => node.getText(pathwayAst)).join(',\n')}
    };
${object('MysteryReenactmentCanonCatalog')}
    MysteryReenactmentCanonCatalog.ENTRIES.forEach(row => {
      row.battleName = MysteryReenactmentCanonCatalog.PREFIX + row.spellName;
    });
${object('MysteryReenactmentCore')}
${object('MysteryReenactmentMode')}
    MysteryReenactmentMode.scope = deps.scope;
    return { core: MysteryReenactmentCore, mode: MysteryReenactmentMode, catalog: MysteryReenactmentCanonCatalog };
  }
  const api = { create, status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
`.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted complete mystery archive, certification, permanent unlocks and spell editor.');
