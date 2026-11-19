import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const base = new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/', import.meta.url);
const source = await readFile(new URL('38-js-pathway-play.txt', base), 'utf8');
const ast = ts.createSourceFile('arbiter.js', source.slice(source.indexOf('const ArbiterJurisdictionCore =')), 99, true, ts.ScriptKind.JS);
const blocks = ast.statements.slice(0, 3).map(node => node.getText(ast));
if (!blocks[2].startsWith('const ArbiterJurisdictionBattle =') || !blocks[2].endsWith('};'))
  throw Error('Incomplete original jurisdiction rules');
const helpersSource = await readFile(new URL('30a2-js-battle-board-and-units.txt', base), 'utf8');
const helpersAst = ts.createSourceFile('helpers.js', helpersSource, 99, true, ts.ScriptKind.JS);
const cls = helpersAst.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'LifeSaveManager');
const helpers = ['splitSequenceFragments', 'resolveFragment'].map(name =>
  cls.members.find(node => node.name?.getText(helpersAst) === name).getText(helpersAst).replace(/^static\s+/, '')).join(',\n');
await writeFile(new URL('../../public/guimizhizhu_ui/core/arbiter-jurisdiction-reference.js', import.meta.url), `// Generated from the complete original jurisdiction management and battle rules.
(() => {
  'use strict';
  const KEY = 'cryptLord.arbiterJurisdictionReference';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  function create(deps) {
    const window = deps.window || {}, document = window.document;
    const GameDBManager = { DB: { godPathways: deps.pool.pathways } };
    const parseSequenceRank = modules['cryptLord.marionetteReference'].rank;
    const getPureName = text => String(text || '').replace(/[【】]/g, '').trim()
      .replace(/^序列\\d+(\\.\\d+)?[-—\\s]?/, '').trim().replace(/^(旧日|支柱)[-—\\s]?/, '').trim();
    const LifeSaveManager = {
${helpers}
    };
    window.TimePassageEngine = { _parseEra: value => value,
      _toMinutes: value => modules['cryptLord.shamanTerritoryReference'].minutes(value) };
${blocks.join('\n')}
    window.ArbiterJurisdictionCore = ArbiterJurisdictionCore;
    return { core: ArbiterJurisdictionCore, mode: ArbiterJurisdictionMode, battle: ArbiterJurisdictionBattle };
  }
  const api = { create, status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
`.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted complete original jurisdiction core, mode and battle.');
