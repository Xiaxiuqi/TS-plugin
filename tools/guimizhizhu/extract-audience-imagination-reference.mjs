import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const base = new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/', import.meta.url);
async function source(file) {
  return ts.createSourceFile(file, await readFile(new URL(file, base), 'utf8'), 99, true, ts.ScriptKind.JS);
}
function named(ast, name) {
  const node = ast.statements.find(node => ts.isVariableStatement(node)
    ? node.declarationList.declarations.some(declaration => declaration.name.getText(ast) === name)
    : node.name?.text === name);
  if (!node) throw Error(`Missing original ${name}`);
  return node.getText(ast);
}
const audience = await source('37e-js-domain-affairs-window.txt');
const pathway = await source('37f-js-pathway-cores.txt');
const db = await source('34a-js-worldbook-database-tools.txt');
const battle = await source('30a2-js-battle-board-and-units.txt');
const life = battle.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'LifeSaveManager');
const helpers = ['splitSequenceFragments', 'resolveFragment'].map(name =>
  life.members.find(node => node.name?.getText(battle) === name).getText(battle).replace(/^static\s+/, '')).join(',\n');
const output = `// Generated from the complete original imagination, projection resolver and weighted NPC ability rules.
(() => {
  'use strict';
  const KEY = 'cryptLord.audienceImaginationReference';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  function create(deps) {
    const window = deps.window || {}, document = window.document;
    const localStorage = { getItem: () => String(Boolean(deps.locked)) };
    const Math = Object.create(globalThis.Math);
    Math.random = deps.random || globalThis.Math.random;
    const GameDBManager = { DB: { godPathways: deps.pool.pathways || {},
      sequenceAbilities: Object.fromEntries(Object.entries(deps.pool.abilities || {}).map(([key, rows]) =>
        [key, Array.isArray(rows) ? rows.map(row => ({ ...row, name: row.name ?? row.名称,
          description: row.description ?? row.描述, type: row.type ?? row.类型 })) : rows])) } };
    const parseSequenceRank = modules['cryptLord.marionetteReference'].rank;
    const containsOldDayAttendant = value => String(value || '').includes('旧日侍者');
${['getPureName', 'buildAbilityKey', 'fetchAvailableAbilities',
  'NPC_GENERATED_FALLBACK_ABILITY', 'createNpcGeneratedFallbackAbility', 'generateNpcAbilities']
  .map(name => named(db, name)).join('\n')}
    const LifeSaveManager = {
${helpers}
    };
${['PathwaySeqUtil', 'AudienceImaginationCore'].map(name => named(audience, name)).join('\n')}
${['GrazingCore', 'PlayerProjectionResolver', 'PlayerProjectionSync', 'AudienceImaginationMode']
  .map(name => named(pathway, name)).join('\n')}
    window.AudienceImaginationCore = AudienceImaginationCore;
    window.GrazingCore = GrazingCore;
    window.PlayerProjectionResolver = PlayerProjectionResolver;
    window.PlayerProjectionSync = PlayerProjectionSync;
    window.ReaderMysticCore = { ABILITY_GROUP: '#秘术强化',
      syncPlayerProjection: data => modules['cryptLord.readerMystic']?.sync(data, deps.pool) };
    window.MysteryReenactmentCore = { ABILITY_GROUP: '#神秘再现',
      syncPlayerProjection: data => modules['cryptLord.mysteryReenactment']?.sync(data, deps.pool) };
    // Legacy records can omit activation arrays. Keep reads pure and reject reserved dictionary keys.
    const souls = GrazingCore.soulsOfState, forbidden = key =>
      !String(key).trim() || String(key).startsWith('$') || ['__proto__', 'constructor', 'prototype'].includes(key);
    GrazingCore.soulsOfState = data => Object.fromEntries(Object.entries(souls.call(GrazingCore, data))
      .filter(([key, row]) => !forbidden(key) && row && typeof row === 'object' && !Array.isArray(row)));
    const play = GrazingCore.playOfState;
    GrazingCore.playOfState = (data, create) => {
      const stored = data.stat_data?.$专属玩法?.秘祈人途径?.放牧玩法;
      if (!create && stored && typeof stored === 'object' && !Array.isArray(stored) &&
        stored.灵魂列表 && !Array.isArray(stored.激活灵魂))
        return { ...stored, 激活灵魂: [], 休眠灵魂: Array.isArray(stored.休眠灵魂) ? stored.休眠灵魂 : [] };
      return play.call(GrazingCore, data, create);
    };
    return { core: AudienceImaginationCore, grazing: GrazingCore,
      resolver: PlayerProjectionResolver, sync: PlayerProjectionSync, mode: AudienceImaginationMode,
      abilities: fetchAvailableAbilities, npcAbilities: generateNpcAbilities };
  }
  const api = { create, status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
`;
await writeFile(new URL('../../public/guimizhizhu_ui/core/audience-imagination-reference.js', import.meta.url),
  output.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted complete original imagination, one-pass cross-grant and NPC weighted ability sampling.');
