import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/34a-js-worldbook-database-tools.txt', import.meta.url), 'utf8');
function extract(name) {
  const start = source.search(new RegExp(`^\\s*${name}\\(`, 'm'));
  if (start < 0) throw Error(`Missing original member ${name}`);
  const tree = ts.createSourceFile('original.js', `({${source.slice(start)}\n})`, 99, true, ts.ScriptKind.JS);
  let member;
  function visit(node) {
    if (ts.isMethodDeclaration(node) && node.name?.getText(tree) === name) member = node.getText(tree);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  if (!member) throw Error(`Cannot parse ${name}`);
  return member.replace(/,$/, '');
}
const block = `// BEGIN ORIGINAL QUICK SHORTCUTS
  const originalRules = {
${['_parseQuickShortcuts', '_normalizeQuickShortcutState'].map(extract).join(',\n')}
  };
  // END ORIGINAL QUICK SHORTCUTS`;
const target = new URL('../../public/guimizhizhu_ui/core/quick-shortcuts.js', import.meta.url);
const output = (await readFile(target, 'utf8')).replace(/\/\/ BEGIN ORIGINAL QUICK SHORTCUTS[\s\S]*?\/\/ END ORIGINAL QUICK SHORTCUTS/, () => block);
await writeFile(target, output.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted original shortcut parsing and state normalization.');
