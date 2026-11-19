import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';

const original = '../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/';
const battle = await readFile(new URL(`${original}30a2-js-battle-board-and-units.txt`, import.meta.url), 'utf8');
const tools = await readFile(new URL(`${original}34a-js-worldbook-database-tools.txt`, import.meta.url), 'utf8');
const parse = text => ts.createSourceFile('original.js', text, 99, true, ts.ScriptKind.JS);
const ast = parse(battle.slice(battle.indexOf('const LIFE_SAVE_TABLE')));
const helpers = parse(tools.slice(tools.indexOf('const containsOldDayAttendant')));
function declaration(source, name) {
  for (const row of source.statements) {
    if (ts.isClassDeclaration(row) && row.name?.text === name) return row.getText(source);
    if (ts.isVariableStatement(row)) {
      const found = row.declarationList.declarations.find(node => node.name.getText(source) === name);
      if (found) return `const ${found.getText(source)};`;
    }
  }
  throw Error(`Missing original declaration: ${name}`);
}
const names = ['containsOldDayAttendant', 'resolveOldDayAttendantRank', 'parseSequenceRank', 'getPureName'];
const generated = `// BEGIN ORIGINAL LIFE SAVE
${declaration(ast, 'LIFE_SAVE_TABLE')}
function originalManager(table, pathways, chosen) {
  const GameDBManager = { DB: { lifeSaveTable: table, godPathways: pathways } };
  let preference = chosen == null ? null : JSON.stringify(chosen);
  const localStorage = { getItem: () => preference };
  const PlayerSettingsWorldbook = {
    setLocalPreference(_key, value) { preference = value; },
    removeLocalPreference() { preference = null; },
  };
${names.map(name => declaration(helpers, name)).join('\n')}
${declaration(ast, 'LifeSaveManager')}
  return LifeSaveManager;
}
// END ORIGINAL LIFE SAVE`;
const target = new URL('../../public/guimizhizhu_ui/core/battle-life-save.js', import.meta.url);
const source = await readFile(target, 'utf8');
if (!source.includes('// BEGIN ORIGINAL LIFE SAVE')) throw Error('Generated region is missing');
await writeFile(target, source.replace(/\/\/ BEGIN ORIGINAL LIFE SAVE[\s\S]*?\/\/ END ORIGINAL LIFE SAVE/,
  generated).replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted complete original LifeSaveManager and sequence helpers.');
