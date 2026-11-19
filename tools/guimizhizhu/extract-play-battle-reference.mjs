import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const base = new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/', import.meta.url);
const common = ['id', '途径', '途径全名', '名称', 'GATE', 'TITLE', 'BAG_SOURCE',
  'resolve', 'bagOfState', 'recordsOfState', 'recordOfState'];
async function extract(file, names) {
  const text = await readFile(new URL(file, base), 'utf8');
  const results = [];
  for (const [name, keys] of names) {
    const from = text.indexOf(`const ${name} =`);
    if (from < 0) throw Error(`Missing source boundary for ${name}`);
    const ast = ts.createSourceFile(file, text.slice(from), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    let initializer;
    const visit = node => {
      if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name)
        initializer = node.initializer;
      ts.forEachChild(node, visit);
    };
    visit(ast);
    if (!initializer || !ts.isObjectLiteralExpression(initializer)) throw Error(`Missing ${name}`);
    const selected = keys.map(key => {
      const node = initializer.properties.find(property => property.name?.getText(ast) === key);
      if (!node) throw Error(`Missing ${name}.${key}`);
      return node.getText(ast);
    });
    results.push(`const ${name} = {\n${selected.join(',\n')}\n};`);
  }
  return results.join('\n');
}
const clones = await extract('37f-js-pathway-cores.txt', [
  ['MarauderCloneMode', [...common, 'PARASITE_MARK', 'isParasite', 'npcPoolOfState',
    'convertedOfPool', 'convertedOfState', 'parasitesOfPool', 'parasitesOfState',
    'purgeDead', 'DISPLAY_KEY', 'syncDisplayAbility']],
  ['MarionetteMode', [...common, 'MARK', 'isMarked', 'npcPoolOfState', 'markedOfPool',
    'markedOfState', 'purgeDead', 'DISPLAY_KEY', 'syncDisplayAbility']],
]);
const constructs = await extract('38-js-pathway-play.txt', [
  ['SavantMaterialMode', [...common, 'STORE_CRAFT', 'STORE_CONSTRUCTS', 'AUTONOMY_MARK',
    'CONSTRUCT_TYPES', 'GRADE_RANK', 'gradeOfRank', 'CONSTRUCT_DISPLAY_KEY',
    'craftStore', 'bagConstructsOfState', 'isAutonomous', 'autonomousConstructsOfState',
    'allConstructsOfState', 'settleBattleRecords', 'syncConstructDisplay']],
]);
const out = `// Generated from original pathway bag battle interfaces; regenerate with the test extractor.
(() => {
  'use strict';
  const KEY = 'cryptLord.battlePlayReference';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  function create({ LifeSaveManager, parseSequenceRank, effectivePlayerSequence }) {
    const AudienceImaginationCore = { effectivePlayerSequence };
    const window = { AudienceImaginationCore };
${clones}
${constructs}
    return [MarauderCloneMode, MarionetteMode, SavantMaterialMode];
  }
  const api = { create, status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
`;
await writeFile(new URL('../../public/guimizhizhu_ui/core/battle-play-reference.js',
  import.meta.url), out.replace(/[ \t]+$/gm, ''));
console.log('Extracted original clone, puppet and construct battle interfaces.');
