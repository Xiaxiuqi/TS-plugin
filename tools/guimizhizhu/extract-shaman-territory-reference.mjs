import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const base = new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/', import.meta.url);
const source = await readFile(new URL('38-js-pathway-play.txt', base), 'utf8');
const ast = ts.createSourceFile('territory.js', source.slice(source.indexOf('const ShamanTerritoryCore =')), 99, true, ts.ScriptKind.JS);
const blocks = ast.statements.slice(0, 3).map(node => node.getText(ast));
if (!blocks[2].startsWith('const ShamanTerritoryBattle =') || !blocks[2].endsWith('};'))
  throw Error('Incomplete original territory core, mode or battle rules');
const helperSource = await readFile(new URL('30a2-js-battle-board-and-units.txt', base), 'utf8');
const helperAst = ts.createSourceFile('helpers.js', helperSource, 99, true, ts.ScriptKind.JS);
const cls = helperAst.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'LifeSaveManager');
const helpers = ['splitSequenceFragments', 'resolveFragment'].map(name =>
  cls.members.find(node => node.name?.getText(helperAst) === name).getText(helperAst).replace(/^static\s+/, '')).join(',\n');
const timeSource = await readFile(new URL('34b-js-schema-time-currency-domain.txt', base), 'utf8');
const timeAst = ts.createSourceFile('time.js', timeSource.slice(timeSource.indexOf('const CN_DIGIT =')), 99, true, ts.ScriptKind.JS);
const timeBlocks = timeAst.statements.slice(0, 3).map(node => node.getText(timeAst));
const minutesAst = ts.createSourceFile('minutes.js', timeSource.slice(timeSource.indexOf('function toMinutes(t)')), 99, true, ts.ScriptKind.JS);
await writeFile(new URL('../../public/guimizhizhu_ui/core/shaman-territory-reference.js', import.meta.url), `// Generated from the complete original territory core, management, battle and calendar helpers.
(() => {
  'use strict';
  const KEY = 'cryptLord.shamanTerritoryReference';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
${timeBlocks.join('\n')}
${minutesAst.statements[0].getText(minutesAst)}
  function create(deps) {
    const window = deps.window || {}, document = window.document;
    const GameDBManager = { DB: { godPathways: deps.pool.pathways } };
    const parseSequenceRank = modules['cryptLord.marionetteReference'].rank;
    const getPureName = text => String(text || '').replace(/[【】]/g, '').trim()
      .replace(/^序列\\d+(\\.\\d+)?[-—\\s]?/, '').trim().replace(/^(旧日|支柱)[-—\\s]?/, '').trim();
    const LifeSaveManager = {
${helpers}
    };
    window.TimePassageEngine = { _parseEra: parseEra, _toMinutes: toMinutes };
    const MysteryPryerScrollMode = modules['cryptLord.scrollWorkshopReference'].create({ pool: deps.pool, window });
    window.MysteryPryerScrollMode = MysteryPryerScrollMode;
${blocks.join('\n')}
    window.ShamanTerritoryCore = ShamanTerritoryCore;
    return { core: ShamanTerritoryCore, mode: ShamanTerritoryMode, battle: ShamanTerritoryBattle };
  }
  const api = { create, minutes: raw => toMinutes(parseEra(String(raw || ''))),
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
`.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted complete original territory management, battle and calendar rules.');
