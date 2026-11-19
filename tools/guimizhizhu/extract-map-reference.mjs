import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const original = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/38-js-pathway-play.txt', import.meta.url), 'utf8');
const tree = ts.createSourceFile('map.js', original.slice(original.indexOf('const GameMapManager =')), 99, true, ts.ScriptKind.JS);
const declarations = new Map();
function visit(node) {
  if (ts.isVariableDeclaration(node) && ['GameMapManager', 'GeometryHelper'].includes(node.name.getText(tree))) declarations.set(node.name.getText(tree), node.initializer);
  ts.forEachChild(node, visit);
}
visit(tree);
const manager = declarations.get('GameMapManager');
const member = name => manager.properties.find(node => node.name?.getText(tree) === name);
const db = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/34a-js-worldbook-database-tools.txt', import.meta.url), 'utf8');
const dbTree = ts.createSourceFile('database.js', db, 99, true, ts.ScriptKind.JS);
let fallback, parser;
function find(node) {
  if (ts.isMethodDeclaration(node) && node.name.getText(dbTree) === 'cleanAndParseJSON') parser = node.getText(dbTree);
  if (ts.isPropertyAssignment(node) && node.name.getText(dbTree) === '_fallback') fallback = node.initializer.properties.find(item => item.name?.getText(dbTree) === 'mapData')?.initializer.getText(dbTree);
  ts.forEachChild(node, find);
}
find(dbTree);
if (!fallback || !parser || !member('LocationEngine') || !declarations.get('GeometryHelper')) throw Error('原版地图提取失败');
const block = `// BEGIN ORIGINAL MAP RULES
  const defaultData = ${fallback};
  const geometry = ${declarations.get('GeometryHelper').getText(tree)};
  function locationRules(GameDBManager, GeometryHelper) {
    return ${member('LocationEngine').initializer.getText(tree)};
  }
  const originalCenters = {
${['getCenterX', 'getCenterY'].map(name => member(name).getText(tree)).join(',\n')}
  };
  function jsonRules(console, toastr) {
    return {${parser}};
  }
  // END ORIGINAL MAP RULES`;
const target = new URL('../../public/guimizhizhu_ui/core/world-map.js', import.meta.url);
const content = await readFile(target, 'utf8');
await writeFile(target, content.replace(/\/\/ BEGIN ORIGINAL MAP RULES[\s\S]*?\/\/ END ORIGINAL MAP RULES/, () => block)
  .replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted original map defaults, geometry, location engine, centers and JSON rules.');
