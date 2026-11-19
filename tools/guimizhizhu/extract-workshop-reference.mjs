import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const base = new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/', import.meta.url);
async function object(file, name, select) {
  const text = await readFile(new URL(file, base), 'utf8');
  const start = text.indexOf(`const ${name} =`);
  if (start < 0) throw Error(`Missing ${name}`);
  const ast = ts.createSourceFile(file, text.slice(start), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const properties = ast.statements[0].declarationList.declarations[0].initializer.properties;
  return `const ${name} = {\n${properties.filter(node => !select || select(node, node.name.getText(ast)))
    .map(node => node.getText(ast)).join(',\n')}\n};`;
}
const reader = await object('37f-js-pathway-cores.txt', 'ReaderMysticCore', (node, name) =>
  ts.isPropertyAssignment(node) || ['clampIndex', 'enumValue', 'defaultEffect', 'defaultConfig',
    'normalizeEffect', 'normalizeConfig', 'pointsOf', 'avgAttrs', 'fixedFromAvg',
    'effectTargetOf', 'buildEffect', 'buildAbility'].includes(name));
const workshop = await object('38-js-pathway-play.txt', 'SavantMaterialMode');
const output = `// Generated from the complete original SavantMaterialMode and original ability builder.
(() => {
  'use strict';
  const KEY = 'cryptLord.workshopReference';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  function create(deps) {
    const window = deps.window;
    const document = window.document;
    const parseSequenceRank = modules['cryptLord.marionetteReference'].rank;
    const getSequenceBaseValue = rank => deps.db.sequenceBase[String(rank)] || 200;
    const getSequenceDivinity = rank => deps.db.divinityConfig.find(row => rank >= row.min && rank <= row.max)?.val || 1;
    const settleBattleExp = modules['cryptLord.battleExperience'].settle;
    const battleExpMultiplier = level => 1 + Math.max(0, Math.floor(Number(level) || 0)) * .02;
    const ConsumableMoveBuilder = { getAvgAttrs: rank => deps.averages[String(rank)] ||
      deps.averages['10'] || { 活力: 37, 敏捷: 45, 灵性: 43, 理智: 28, 人性: 27, 运气: 20 } };
    const NpcObjectiveSchema = { parse: deps.validateObjective };
    const NpcSubjectiveSchema = { parse: deps.validateSubjective };
    const PlayerProjectionResolver = { resolve: deps.projection };
    const AudienceImaginationCore = { effectivePlayerSequence: data => deps.projection(data).effectiveSequence };
    const SavantEquipmentEnhancementMode = modules['cryptLord.savantEnhancement'];
    const PathwayPlaySources = { withBag: deps.withBag };
    const PathwaySeqUtil = { pathwayNames: () => Object.keys(deps.pool.pathways || {}) };
${reader}
${workshop}
    SavantMaterialMode.resolve = deps.resolve;
    SavantMaterialMode.scope = deps.scope;
    return SavantMaterialMode;
  }
  const api = { create, status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
`;
await writeFile(new URL('../../public/guimizhizhu_ui/core/workshop-reference.js', import.meta.url),
  output.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted complete original workshop, abilities, maintenance, refits and autonomy lifecycle.');
