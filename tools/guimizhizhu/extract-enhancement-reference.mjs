import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const base = new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/', import.meta.url);
const source = await readFile(new URL('38-js-pathway-play.txt', base), 'utf8');
const ast = ts.createSourceFile('enhancement.js',
  source.slice(source.indexOf('const SAVANT_MODULE_RARITIES'), source.indexOf('const MysteryAnalysisCore')), 99, true, ts.ScriptKind.JS);
const names = new Set(['SAVANT_MODULE_RARITIES', 'SAVANT_MODULE_RARITY_MULT', 'SAVANT_MODULE_PROBABILITIES',
  'SAVANT_MODULE_ROLE_NAMES', 'SAVANT_MODULE_ROLE_MIN_RARITY', 'SAVANT_MODULE_FAMILY_META',
  'SAVANT_EQUIPMENT_MODULE_CONFIG', 'EquipmentModuleWeaponResolver', 'SavantEquipmentEnhancementMode']);
const statements = ast.statements.filter(node =>
  ts.isFunctionDeclaration(node) && node.name?.text === 'savantModuleGenericRatios' ||
  ts.isVariableStatement(node) && names.has(node.declarationList.declarations[0].name.getText(ast)) ||
  ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) &&
    node.expression.expression.getText(ast) === 'Object.assign' &&
    node.expression.arguments[0]?.getText(ast) === 'SavantEquipmentEnhancementMode');
if (statements.length !== 13) throw Error(`Unexpected original statement count ${statements.length}`);
const battle = await readFile(new URL('32a-js-battle-tags-movers-cpu.txt', base), 'utf8');
const battleAst = ts.createSourceFile('battle.js', battle.slice(battle.indexOf('class SkillLoader {')), 99, true, ts.ScriptKind.JS);
const loader = battleAst.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'SkillLoader');
const methods = loader.members.filter(node =>
  ['weaponAccuracyClass', 'hasLegacyWeaponEffect', 'playerWeaponBuildMode'].includes(node.name?.getText(battleAst)));
const output = `// Generated from the complete original equipment enhancement mode, catalog and weapon resolver.
(() => {
  'use strict';
  const KEY = 'cryptLord.enhancementReference';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  function create(deps = {}) {
    const window = deps.window || {};
    const document = window.document;
    const SavantMaterialMode = deps.material || { cloneValue: value => structuredClone(value),
      rankOfGrade: value => modules['cryptLord.savantMaterial'].rankOf(value) };
    const classifier = modules['cryptLord.weaponClassifier'];
    const WEAPON_CLASS_VOCAB = classifier.vocab;
    const isWeaponClassValid = value => classifier.valid(value);
    const parseItemSequenceRank = value => classifier.rankOf(value);
    const ConsumableMoveBuilder = {
      isAttackEffect: value => ['物理攻击', '法术攻击', '精神攻击', '命运攻击'].includes(value),
      isHealEffect: value => ['活力恢复', '敏捷恢复', '灵性恢复', '人性恢复', '理智恢复'].includes(value),
    };
    class SkillLoader {
      static ACCURACY_RANK_MIN = 7;
      static WEAPON_CLASS_FIELD = '$战斗分类';
${methods.map(node => node.getText(battleAst)).join('\n')}
    }
${statements.map(node => node.getText(ast)).join('\n')}
    if (deps.random) SavantEquipmentEnhancementMode.random = deps.random;
    if (deps.scope) SavantEquipmentEnhancementMode.scope = deps.scope;
    return { mode: SavantEquipmentEnhancementMode, weapon: EquipmentModuleWeaponResolver,
      buildMode: item => SkillLoader.playerWeaponBuildMode(item),
      rarities: SAVANT_MODULE_RARITIES, probabilities: SAVANT_MODULE_PROBABILITIES,
      config: SAVANT_EQUIPMENT_MODULE_CONFIG };
  }
  const api = { create, status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
`;
await writeFile(new URL('../../public/guimizhizhu_ui/core/enhancement-reference.js', import.meta.url),
  output.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted complete original enhancement catalog, mode and weapon construction rules.');
