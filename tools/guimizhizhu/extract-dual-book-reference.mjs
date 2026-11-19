import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const root = new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/', import.meta.url);
const combined = (await readFile(new URL('33b-js-performance-optimizer.txt', root), 'utf8')) +
  (await readFile(new URL('34a-js-worldbook-database-tools.txt', root), 'utf8'));
const ui = await readFile(new URL('36a-js-items-equip-relationships.txt', root), 'utf8');
function extract(source, name) {
  const start = source.search(new RegExp(`^\\s*async\\s+${name}\\(`, 'm'));
  if (start < 0) throw Error(`Missing original member: ${name}`);
  const tree = ts.createSourceFile('original.js', `({${source.slice(start)}\n})`, 99, true, ts.ScriptKind.JS);
  let member;
  function visit(node) {
    if (ts.isMethodDeclaration(node) && node.name?.getText(tree) === name) member = node.getText(tree);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  if (!member) throw Error(`Cannot extract original member: ${name}`);
  return member.replace(/,$/, '');
}
const members = ['saveEntries', 'compareBooks', 'removeEntries'].map(name => extract(combined, name));
const generated = `// BEGIN ORIGINAL DUAL BOOKS
  function originalRules(bridge = {}) {
    const getWorldbook = bridge.getWorldbook;
    const updateWorldbookWith = bridge.updateWorldbookWith;
    const createWorldbookEntries = bridge.createWorldbookEntries;
    const deleteWorldbookEntries = bridge.deleteWorldbookEntries;
    const console = bridge.console || globalThis.console;
    const WorldbookManager = {
      PRIMARY_BOOK: PRIMARY, LIBRARY_BOOK: LIBRARY,
      _cache: { lastFetchTime: 0 },
${members.join(',\n')}
    };
    const handler = {
      showTemporaryMessage() {},
      fetchAndRenderWorldbookList() {},
${extract(ui, 'handleWorldbookAction')}
    };
    return { manager: WorldbookManager, handler };
  }
  // END ORIGINAL DUAL BOOKS`;
const target = new URL('../../public/guimizhizhu_ui/core/dual-worldbook.js', import.meta.url);
const output = (await readFile(target, 'utf8')).replace(/\/\/ BEGIN ORIGINAL DUAL BOOKS[\s\S]*?\/\/ END ORIGINAL DUAL BOOKS/, () => generated);
await writeFile(target, output.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted four original dual-worldbook members; host commits remain guarded.');
