import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/34a-js-worldbook-database-tools.txt', import.meta.url), 'utf8');
const members = [];
for (const name of ['_newToggleProfileId', 'buildDefaultToggleProfile', 'normalizeToggleProfiles']) {
  const start = source.search(new RegExp(`^\\s*${name}\\(`, 'm'));
  if (start < 0) throw Error(`Missing original member: ${name}`);
  const tree = ts.createSourceFile('original.js', `({${source.slice(start)}\n})`, 99, true, ts.ScriptKind.JS);
  let member;
  function visit(node) {
    if (ts.isMethodDeclaration(node) && node.name?.getText(tree) === name) member = node.getText(tree);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  if (!member) throw Error(`Cannot extract original member: ${name}`);
  members.push(member.replace(/,$/, ''));
}
const target = new URL('../../public/guimizhizhu_ui/core/worldbook-toggle-profiles.js', import.meta.url);
const generated = `// BEGIN ORIGINAL TOGGLE\n  const originalRules = {\n${members.join(',\n')}\n  };\n  // END ORIGINAL TOGGLE`;
const output = (await readFile(target, 'utf8')).replace(/\/\/ BEGIN ORIGINAL TOGGLE[\s\S]*?\/\/ END ORIGINAL TOGGLE/, () => generated);
await writeFile(target, output.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted three original worldbook toggle profile rules.');
