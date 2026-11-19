import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';

const original = new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35b-js-game-manager-core.txt', import.meta.url);
const source = await readFile(original, 'utf8');
const start = source.search(/^_parseEntryDateRange\(/m);
if (start < 0) throw Error('Original date parser not found');
const tree = ts.createSourceFile('original.js', `({${source.slice(start)}\n})`, 99, true, ts.ScriptKind.JS);
let member;
function visit(node) {
  if (ts.isMethodDeclaration(node) && node.name?.getText(tree) === '_parseEntryDateRange') member = node.getText(tree);
  ts.forEachChild(node, visit);
}
visit(tree);
if (!member) throw Error('Cannot extract original date parser');
const target = new URL('../../public/guimizhizhu_ui/core/original-plot-guide.js', import.meta.url);
const generated = `// BEGIN ORIGINAL PLOT DATE\n  const originalDateRules = {\n${member.replace(/,$/, '')}\n  };\n  // END ORIGINAL PLOT DATE`;
const output = (await readFile(target, 'utf8')).replace(
  /\/\/ BEGIN ORIGINAL PLOT DATE[\s\S]*?\/\/ END ORIGINAL PLOT DATE/, () => generated,
);
await writeFile(target, output.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted exact original plot date rule.');
