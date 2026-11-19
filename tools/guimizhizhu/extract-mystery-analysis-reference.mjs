import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const base = new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/', import.meta.url);
const text = (await readFile(new URL('38-js-pathway-play.txt', base), 'utf8')).replace(/\r\n?/g, '\n');
const ast = ts.createSourceFile('analysis.js', text.slice(text.indexOf('const MysteryAnalysisCore ='),
  text.indexOf('const MysteryPryerScrollMode =')), 99, true, ts.ScriptKind.JS);
const originals = ast.statements.filter(node => ts.isVariableStatement(node) ||
  ts.isExpressionStatement(node) && node.expression.getText(ast).startsWith('Object.assign(MysteryAnalysisMode,'));
if (originals.length !== 4) throw Error('Incomplete original analysis core/mode/extensions');
const battle = await readFile(new URL('30a2-js-battle-board-and-units.txt', base), 'utf8');
const battleAst = ts.createSourceFile('battle.js', battle, 99, true, ts.ScriptKind.JS);
const life = battleAst.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'LifeSaveManager');
const methods = life.members.filter(node => ['splitSequenceFragments', 'resolveFragment'].includes(node.name?.getText(battleAst)));
const pathways = await readFile(new URL('37e-js-domain-affairs-window.txt', base), 'utf8');
const pathAst = ts.createSourceFile('pathways.js', pathways.slice(pathways.indexOf('const PathwaySeqUtil =')), 99, true, ts.ScriptKind.JS);
const pathMethods = pathAst.statements[0].declarationList.declarations[0].initializer.properties
  .filter(node => ['pathwayDb', 'pathwayText'].includes(node.name?.getText(pathAst)));
if (methods.length !== 2 || pathMethods.length !== 2) throw Error('Incomplete original sequence helpers');
await writeFile(new URL('../../public/guimizhizhu_ui/core/mystery-analysis-reference.js', import.meta.url), `// Generated from the complete original analysis core and all management mode extensions.
(() => {
  'use strict';
  const KEY = 'cryptLord.mysteryAnalysisReference';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  function create(deps) {
    const window = deps.window || {}, document = window.document;
    const GameDBManager = { DB: { ...deps.pool.pictureConfig, godPathways: deps.pool.pathways } };
    const parseSequenceRank = modules['cryptLord.marionetteReference'].rank;
    const LifeSaveManager = {
${methods.map(node => node.getText(battleAst).replace(/^static\s+/, '')).join(',\n')}
    };
    const PathwaySeqUtil = {
${pathMethods.map(node => node.getText(pathAst)).join(',\n')}
    };
${originals.map(node => node.getText(ast)).join('\n')}
    return { core: MysteryAnalysisCore, mode: MysteryAnalysisMode };
  }
  const api = { create, status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
`.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted complete original analysis certification, distribution and display workflow.');
