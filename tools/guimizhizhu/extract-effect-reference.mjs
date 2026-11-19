import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';

const base = new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/', import.meta.url);
const parse = async (file, start) => {
  const text = await readFile(new URL(file, base), 'utf8');
  return ts.createSourceFile(file, text.slice(text.indexOf(start)), 99, true, ts.ScriptKind.JS);
};
const effects = await parse('30b-js-battle-team-effects-config.txt', 'class EffectManager {');
const turns = await parse('32a-js-battle-tags-movers-cpu.txt', 'class TurnManager {');
const attributes = await parse('30a1a-js-basics-and-attribute.txt', 'class AttributeCalculator {');
const cls = (ast, name) => ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === name);
const effect = cls(effects, 'EffectManager');
const process = cls(turns, 'TurnManager')?.members.find(node => node.name?.getText(turns) === 'processCharacterEffects');
const recalc = cls(attributes, 'AttributeCalculator')?.members.find(node =>
  node.name?.getText(attributes) === 'recalculateAllSixDimStats');
if (!effect || !process || !recalc) throw Error('Missing complete original effect lifecycle');
const output = `// Generated from original EffectManager and TurnManager; regenerate with extract-effect-reference.mjs.
(() => {
  'use strict';
  const root = window.cryptLord, modules = root.__stage1Modules;
  const KEY = 'cryptLord.battleEffectReference';
  if (modules[KEY]) { root.contract.initializeGlobal(KEY, modules[KEY]); return; }
  function create(deps = {}) {
    const console = deps.console || { log() {}, warn() {}, error() {} };
    const window = deps.window || {};
    const EffectTransferManager = deps.transfer;
    const EnemyControlManager = deps.control || { markDamaged() {} };
    class OriginalAttributes { ${recalc.getText(attributes)} }
    const AttributeCalculator = deps.attributes || OriginalAttributes;
${effect.getText(effects)}
    return { manager: new EffectManager(), attributes: OriginalAttributes,
      turn: { ${process.getText(turns)} } };
  }
  const api = { create, status: () => ({ ready: true }),
    dispose() { root.contract.releaseGlobal(KEY); delete modules[KEY]; } };
  modules[KEY] = api; root.contract.initializeGlobal(KEY, api);
})();
`;
await writeFile(new URL('../../public/guimizhizhu_ui/core/battle-effect-reference.js', import.meta.url),
  output.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted complete EffectManager, effect turn lifecycle and six-stat recalculation.');
