import {readFile, writeFile} from 'node:fs/promises';
import ts from 'typescript';
const base = new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/', import.meta.url);
function method(source, name) {
  const start = source.indexOf(`${name}(`);
  if (start < 0) throw Error(name);
  const tree = ts.createSourceFile('original.js', `const methods={${source.slice(start)}`, 99, true, ts.ScriptKind.JS);
  return tree.statements[0].declarationList.declarations[0].initializer.properties[0].getText(tree);
}
const core = await readFile(new URL('35b-js-game-manager-core.txt', base), 'utf8');
const inventory = await readFile(new URL('35c-js-backup-load-restore.txt', base), 'utf8');
const database = await readFile(new URL('34a-js-worldbook-database-tools.txt', base), 'utf8');
const sort = method(core.slice(core.indexOf('getTierOrder(tier)')), 'sortByTier');
const order = method(core.slice(core.indexOf('getTierOrder(tier)')), 'getTierOrder');
const detail = method(inventory.slice(inventory.indexOf('renderItemDetailsForInventory(item) {')), 'renderItemDetailsForInventory');
const detailTree = ts.createSourceFile('detail.js', `const methods={${detail}}`, 99, true, ts.ScriptKind.JS);
let excluded;
function walk(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(detailTree) === 'excludeKeys') excluded = node.initializer.getText(detailTree);
  ts.forEachChild(node, walk);
}
walk(detailTree);
const tree = ts.createSourceFile('db.js', database, 99, true, ts.ScriptKind.JS);
let prune;
for (const statement of tree.statements) {
  if (!ts.isVariableStatement(statement)) continue;
  for (const node of statement.declarationList.declarations)
    if (node.name.getText(tree) === 'pruneEmptyStackables') prune = node.initializer.getText(tree);
}
if (!excluded || !prune || !sort.startsWith('sortByTier')) throw Error('原版物品规则提取失败');
const target = new URL('../../public/guimizhizhu_ui/core/inventory-state.js', import.meta.url);
const current = await readFile(target, 'utf8');
await writeFile(target, current.replace(/\/\/ BEGIN ORIGINAL INVENTORY RULES[\s\S]*?\/\/ END ORIGINAL INVENTORY RULES/,
  () => `// BEGIN ORIGINAL INVENTORY RULES\n  const original = {${order},\n${sort},\npruneEmptyStackables: ${prune},\ndetailExcluded: ${excluded}};\n  // END ORIGINAL INVENTORY RULES`)
  .replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted original inventory tier sorting, pruning and detail field exclusions.');
