import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const base = new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/', import.meta.url);
const source = await readFile(new URL('38-js-pathway-play.txt', base), 'utf8');
const ast = ts.createSourceFile('picture.js', source.slice(source.indexOf('const ShamanPictureMode =')), 99, true, ts.ScriptKind.JS);
const mode = ast.statements[0].getText(ast);
if (!mode.endsWith('};') || !mode.includes('async craft(win)')) throw Error('Incomplete original picture mode');
const helperSource = await readFile(new URL('30a2-js-battle-board-and-units.txt', base), 'utf8');
const helperAst = ts.createSourceFile('helpers.js', helperSource, 99, true, ts.ScriptKind.JS);
const cls = helperAst.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'LifeSaveManager');
const helpers = ['splitSequenceFragments', 'resolveFragment'].map(name =>
  cls.members.find(node => node.name?.getText(helperAst) === name).getText(helperAst).replace(/^static\s+/, '')).join(',\n');
await writeFile(new URL('../../public/guimizhizhu_ui/core/shaman-picture-reference.js', import.meta.url), `// Generated from the complete original ShamanPictureMode; no original plugin globals are modified.
(() => {
  'use strict';
  const KEY = 'cryptLord.shamanPictureReference';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  function create(deps) {
    const window = deps.window || {}, document = window.document;
    const PlayerProjectionResolver = window.PlayerProjectionResolver;
    const GameDBManager = { DB: { ...modules['cryptLord.battleFieldEffectReference'].summonDefaults(),
      abilitySystemDB: {}, ...deps.pool.pictureConfig,
      godPathways: deps.pool.pathways, sequenceAbilities: deps.pool.abilities || {} } };
    const parseSequenceRank = modules['cryptLord.marionetteReference'].rank;
    const getPureName = text => String(text || '').replace(/[【】]/g, '').trim()
      .replace(/^序列\\d+(\\.\\d+)?[-—\\s]?/, '').trim().replace(/^(旧日|支柱)[-—\\s]?/, '').trim();
    const LifeSaveManager = {
${helpers}
    };
    const math = Object.create(Math);
    math.random = deps.random || Math.random.bind(Math);
    const SummonManager = modules['cryptLord.battleFieldEffectReference'].create({
      Math: math, GameDBManager, parseSequenceRank,
    }).summon;
    const MysteryPryerScrollMode = modules['cryptLord.scrollWorkshopReference'].create({
      pool: deps.pool, window });
    window.MysteryPryerScrollMode = MysteryPryerScrollMode;
${mode}
    return ShamanPictureMode;
  }
  const api = { create, status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
`.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted complete original picture manufacturing, materials and inventory rules.');
