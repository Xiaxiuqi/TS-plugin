import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';

const base = '../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/';
const [tools, schema] = await Promise.all(['34a-js-worldbook-database-tools', '34b-js-schema-time-currency-domain']
  .map(name => readFile(new URL(`${base}${name}.txt`, import.meta.url), 'utf8')));
const tree = text => ts.createSourceFile('original.js', text, 99, true, ts.ScriptKind.JS);
const declarations = tree(tools).statements.filter(ts.isVariableStatement)
  .flatMap(node => [...node.declarationList.declarations]);
const find = name => {
  const node = declarations.find(value => value.name.getText() === name);
  if (!node) throw Error(`Missing original ${name}`);
  return `const ${node.getText()};`;
};
const fallback = declarations.find(value => value.name.getText() === 'GameDBManager').initializer.properties
  .find(value => value.name.getText() === '_fallback').initializer;
const defaults = ['consumableConfig', 'maxBonusConfig'].map(name =>
  fallback.properties.find(value => value.name.getText() === name).getText());
const schemaTree = tree(schema);
const sealed = schemaTree.statements.find(node => ts.isVariableStatement(node) &&
  node.declarationList.declarations.some(value => value.name.getText() === 'syncSealedItemLevelAndNumber'));
const attitude = schemaTree.statements.find(node => ts.isFunctionDeclaration(node) &&
  node.name?.getText() === 'deriveAttitudeFromAffinity');
if (!sealed || !attitude) throw Error('Missing original schema derivations');
const names = ['containsOldDayAttendant', 'resolveOldDayAttendantRank', 'parseSequenceRank',
  'getMaxBonusPercent', 'parseTraitSequenceRank', 'isMeaningfulTraitSequence', 'tierToEquivalentSeqRank',
  'getTraitDefaultBonusPercent', 'generateConsumableStats', 'constrainBonusPercent', 'constrainSingleEquipment',
  'pruneEmptyStackables'];
const output = `// Generated from original item and relationship rules; use extract-item-derivation-reference.mjs.
(() => {
  'use strict';
  const root = window.cryptLord, modules = root.__stage1Modules, KEY = 'cryptLord.itemDerivationReference';
  if (modules[KEY]) { root.contract.initializeGlobal(KEY, modules[KEY]); return; }
  const defaults = { ${defaults.join(',\n')} };
  function create(config, random = globalThis.Math.random) {
    const GameDBManager = { DB: config }, Math = Object.create(globalThis.Math);
    Math.random = random;
${names.map(find).join('\n')}
${sealed.getText()}
${attitude.getText()}
    return { rank: parseSequenceRank, consumable: generateConsumableStats, bonus: constrainBonusPercent,
      trait: getTraitDefaultBonusPercent, single: constrainSingleEquipment, prune: pruneEmptyStackables,
      sealed: syncSealedItemLevelAndNumber, attitude: deriveAttitudeFromAffinity };
  }
  const api = Object.freeze({ defaults, create, status: () => ({ ready: true }),
    dispose() { root.contract.releaseGlobal(KEY, api); delete modules[KEY]; } });
  modules[KEY] = api; root.contract.initializeGlobal(KEY, api);
})();
`;
await writeFile(new URL('../../public/guimizhizhu_ui/core/item-derivation-reference.js', import.meta.url),
  output.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted original consumables, bonuses, traits, equipment constraints and subjective attitude.');
