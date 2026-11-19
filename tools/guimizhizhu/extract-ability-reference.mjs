import {readFile, writeFile} from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/34a-js-worldbook-database-tools.txt', import.meta.url), 'utf8');
const tree = ts.createSourceFile('database.js', source, 99, true, ts.ScriptKind.JS);
const names = ['containsOldDayAttendant', 'resolveOldDayAttendantRank', 'parseSequenceRank', 'getPureName', 'buildAbilityKey', 'fetchAvailableAbilities'];
const selected = Object.fromEntries(tree.statements.filter(ts.isVariableStatement)
  .flatMap(statement => [...statement.declarationList.declarations])
  .filter(node => names.includes(node.name.getText(tree)))
  .map(node => [node.name.getText(tree), node.initializer.getText(tree)]));
if (names.some(name => !selected[name])) throw Error('原版能力规则提取不完整');
const rules = names.slice(0, 5).map(name => `const ${name} = ${selected[name]};`).join('\n');
const target = new URL('../../public/guimizhizhu_ui/core/ability-state.js', import.meta.url);
const current = await readFile(target, 'utf8');
await writeFile(target, current.replace(/\/\/ BEGIN ORIGINAL ABILITY RULES[\s\S]*?\/\/ END ORIGINAL ABILITY RULES/,
  () => `// BEGIN ORIGINAL ABILITY RULES\n/* eslint-disable no-useless-escape */\n${rules}\nconst originalAbilities = GameDBManager => ${selected.fetchAvailableAbilities};\n/* eslint-enable no-useless-escape */\n  // END ORIGINAL ABILITY RULES`)
  .replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted complete original sequence selection, mapping and ranking rules.');
