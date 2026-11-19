import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const original = new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35c-js-backup-load-restore.txt', import.meta.url);
const source = await readFile(original, 'utf8');
function extract(text, name) {
  const start = text.search(new RegExp(`^\\s*(?:async\\s+)?${name}\\(`, 'm'));
  if (start < 0) throw Error(`Original member not found: ${name}`);
  const tree = ts.createSourceFile('original.js', `({${text.slice(start)}\n})`, 99, true, ts.ScriptKind.JS);
  let member;
  function visit(node) {
    if (ts.isMethodDeclaration(node) && node.name?.getText(tree) === name) member = node.getText(tree);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  if (!member) throw Error(`Cannot parse original member: ${name}`);
  return member.replace(/,$/, '');
}
const database = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/34a-js-worldbook-database-tools.txt', import.meta.url), 'utf8');
const generated = `// BEGIN ORIGINAL CUSTOM CONTENT
  function originalWriter(bridge) {
    const getWorldbookNames = bridge.getWorldbookNames;
    const TavernHelper = bridge;
    const createWorldbookEntries = bridge.createWorldbookEntries;
    const WorldbookManager = { _cache: { lastFetchTime: 0 } };
    const console = bridge.console || globalThis.console;
    const toastr = { error() {} };
    return {
      showTemporaryMessage: bridge.message,
      closeAllModals() {},
${extract(database, 'cleanAndParseJSON')},
${extract(source, 'writeCustomContentToLorebook')}
    };
  }
  // END ORIGINAL CUSTOM CONTENT`;
const file = new URL('../../public/guimizhizhu_ui/core/custom-content.js', import.meta.url);
const output = (await readFile(file, 'utf8')).replace(/\/\/ BEGIN ORIGINAL CUSTOM CONTENT[\s\S]*?\/\/ END ORIGINAL CUSTOM CONTENT/, () => generated);
await writeFile(file, output.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted original JSON parser and custom-content worldbook writer; isolated bridge only.');
