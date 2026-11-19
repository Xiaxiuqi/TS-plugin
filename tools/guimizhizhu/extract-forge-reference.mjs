import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';

const path = '../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/';
const text = await readFile(new URL(`${path}34a-js-worldbook-database-tools.txt`, import.meta.url), 'utf8');
const ast = ts.createSourceFile('original.js', text.slice(text.indexOf('const GameDBManager =')),
  99, true, ts.ScriptKind.JS);
const declarations = ast.statements.filter(ts.isVariableStatement).flatMap(row => [...row.declarationList.declarations]);
const find = name => {
  const node = declarations.find(row => row.name.getText(ast) === name);
  if (!node) throw Error(`Missing original ${name}`);
  return node;
};
const fallback = find('GameDBManager').initializer.properties.find(row => row.name.getText(ast) === '_fallback').initializer;
const keys = ['sequenceBase', 'itemConfig', 'pathwayMatrix', 'traitDB'];
const defaults = keys.map(key => fallback.properties.find(row => row.name.getText(ast) === key).getText(ast));
const names = ['containsOldDayAttendant', 'resolveOldDayAttendantRank', 'parseItemSequenceRank',
  'getSequenceBaseValue', 'generateMundaneItemStats', 'generateItemStats'];
const output = `// Generated from original equipment rules; regenerate with extract-forge-reference.mjs.
(() => {
  'use strict';
  const root = window.cryptLord, modules = root.__stage1Modules;
  const KEY = 'cryptLord.itemForgeReference';
  if (modules[KEY]) { root.contract.initializeGlobal(KEY, modules[KEY]); return; }
  const defaults = { ${defaults.join(',\n')} };
  function create(config, random = Math.random) {
    const GameDBManager = { DB: config };
    const Math = Object.create(globalThis.Math);
    Math.random = random;
${names.map(name => `const ${find(name).getText(ast)};`).join('\n')}
    return { parseRank: parseItemSequenceRank, baseValue: getSequenceBaseValue,
      mundane: generateMundaneItemStats, extraordinary: generateItemStats };
  }
  const api = { defaults, create, status: () => ({ ready: true }),
    dispose() { root.contract.releaseGlobal(KEY); delete modules[KEY]; } };
  modules[KEY] = api; root.contract.initializeGlobal(KEY, api);
})();
`;
await writeFile(new URL('../../public/guimizhizhu_ui/core/item-forge-reference.js', import.meta.url),
  output.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted complete original equipment sequence and dual-pool allocation rules.');
