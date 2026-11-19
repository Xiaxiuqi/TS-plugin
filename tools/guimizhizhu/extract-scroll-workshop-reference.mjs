import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const base = new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/', import.meta.url);
const text = (await readFile(new URL('38-js-pathway-play.txt', base), 'utf8')).replace(/\r\n?/g, '\n');
const ast = ts.createSourceFile('scroll.js', text.slice(text.indexOf('const MysteryPryerScrollMode =')), 99, true, ts.ScriptKind.JS);
const mode = ast.statements[0].getText(ast);
if (!mode.endsWith('};') || !mode.includes('async craft(win)')) throw Error('Incomplete original scroll mode');
async function helpers(file, className, names) {
  const source = await readFile(new URL(file, base), 'utf8');
  const ast = ts.createSourceFile(file, source, 99, true, ts.ScriptKind.JS);
  const cls = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === className);
  const methods = cls.members.filter(node => names.includes(node.name?.getText(ast)));
  if (methods.length !== names.length) throw Error(`Incomplete ${className} helpers`);
  return methods.map(node => node.getText(ast).replace(/^static\s+/, '')).join(',\n');
}
const sequences = await helpers('30a2-js-battle-board-and-units.txt', 'LifeSaveManager',
  ['splitSequenceFragments', 'resolveFragment']);
const effectSource = await readFile(new URL('32a-js-battle-tags-movers-cpu.txt', base), 'utf8');
const effectAst = ts.createSourceFile('effects.js', effectSource, 99, true, ts.ScriptKind.JS);
const effects = effectAst.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'ConsumableMoveBuilder');
if (!effects) throw Error('Missing original consumable/scroll move builder');
const area = await helpers('30a2-js-battle-board-and-units.txt', 'SkillRange', ['isAllType']);
await writeFile(new URL('../../public/guimizhizhu_ui/core/scroll-workshop-reference.js', import.meta.url), `// Generated from the complete original scroll editor, manufacturing mode and effect rules.
(() => {
  'use strict';
  const KEY = 'cryptLord.scrollWorkshopReference';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  function create(deps) {
    const window = deps.window || {}, document = window.document;
    const PlayerProjectionResolver = window.PlayerProjectionResolver;
    const GameDBManager = { DB: { godPathways: deps.pool.pathways,
      consumableConfig: { avgAttrByRank: deps.averages ||
        deps.pool.pictureConfig?.consumableConfig?.avgAttrByRank ||
        modules['cryptLord.battleFieldEffectReference']?.averages() || {} } } };
    const parseSequenceRank = modules['cryptLord.marionetteReference'].rank;
    const LifeSaveManager = {
${sequences}
    };
    const SkillRange = {
${area}
    };
    class Move { constructor(config) { Object.assign(this, config); } }
${effects.getText(effectAst)}
${mode}
    MysteryPryerScrollMode.buildMove = (item, key, rank) => ConsumableMoveBuilder.build(item, key, rank);
    return MysteryPryerScrollMode;
  }
  const api = { create,
    build: (item, key, rank, averages) => create({ pool: { pathways: {} }, averages }).buildMove(item, key, rank),
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
`.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted complete original scroll library, editor, allocation, rolls and products.');
