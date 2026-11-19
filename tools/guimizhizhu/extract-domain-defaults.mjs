import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const split = path.join(base, '数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split');

async function extract(file, key) {
  const text = await readFile(path.join(split, file), 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let initializer = null;
  function visit(node) {
    if (['domainConfig', 'warConfig'].includes(key) && ts.isPropertyAssignment(node) &&
      node.name.getText(source) === key && node.initializer.getText(source).length > 1000)
      initializer = node.initializer;
    if (key === 'DOMAIN_PEER_ROSTER' && ts.isBinaryExpression(node) &&
      node.left.getText(source) === `window.${key}`) initializer = node.right;
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!initializer) throw new Error(`${file}: ${key} not found`);
  return vm.runInNewContext(`(${initializer.getText(source)})`, Object.create(null), { timeout: 1000 });
}

const config = await extract('34a-js-worldbook-database-tools.txt', 'domainConfig');
const warConfig = await extract('34a-js-worldbook-database-tools.txt', 'warConfig');
const roster = await extract('37b-js-game-audio.txt', 'DOMAIN_PEER_ROSTER');
if (Object.keys(config.stages || {}).length !== 8 || Object.keys(roster).length !== 8)
  throw new Error('Original domain configuration is incomplete');
const output = `// Generated from the original regex domainConfig, warConfig and DOMAIN_PEER_ROSTER.\n` +
  `(() => {\n  'use strict';\n  const KEY = 'cryptLord.domainDefaults';\n` +
  `  const root = (window.cryptLord = window.cryptLord || {});\n` +
  `  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));\n` +
  `  if (modules[KEY]) { root.contract.initializeGlobal(KEY, modules[KEY]); return; }\n` +
  `  const api = Object.freeze({ config: ${JSON.stringify(config)}, warConfig: ${JSON.stringify(warConfig)}, roster: ${JSON.stringify(roster)},\n` +
  `    status() { return Object.freeze({ key: KEY, ready: true }); },\n` +
  `    dispose() { try { root.contract.releaseGlobal(KEY, api); } catch { /* Loader may have released this global. */ } if (modules[KEY] === api) delete modules[KEY]; return true; },\n` +
  `  });\n  modules[KEY] = api;\n  root.contract.initializeGlobal(KEY, api);\n})();\n`;
await writeFile(path.join(base, 'public/guimizhizhu_ui/core/domain-defaults.js'), output);
console.log('Extracted original eight-tier domain defaults and peer rosters');
