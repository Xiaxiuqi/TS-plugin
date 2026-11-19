import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';

const members = [];
for (const [file, names] of [
  ['34a-js-worldbook-database-tools.txt', ['renderTemplate']],
  ['35b-js-game-manager-core.txt', ['_extractLastTagContent']],
  ['36a-js-items-equip-relationships.txt', ['triggerEventGeneration', '_handleEventCardGeneration']],
]) {
  const source = await readFile(new URL(`../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/${file}`, import.meta.url), 'utf8');
  for (const name of names) {
    const start = source.search(new RegExp(`^\\s*(?:async\\s+)?${name}\\(`, 'm'));
    if (start < 0) throw Error(`Missing original event method: ${name}`);
    const tree = ts.createSourceFile('original.js', `({${source.slice(start)}\n})`, 99, true, ts.ScriptKind.JS);
    let member;
    function visit(node) {
      if (ts.isMethodDeclaration(node) && node.name?.getText(tree) === name) member = node.getText(tree);
      ts.forEachChild(node, visit);
    }
    visit(tree);
    if (!member) throw Error(`Cannot extract original event method: ${name}`);
    members.push(member.replace(/,$/, ''));
  }
}
const generated = `// BEGIN ORIGINAL EVENT
function originalRules(bridge = {}) {
  const Math = Object.create(globalThis.Math);
  Math.random = bridge.random || globalThis.Math.random;
  const console = bridge.console || globalThis.console;
  const WorldbookManager = bridge.worldbook;
  let GameDBManager;
  class EventRules {
${members.join('\n')}
  }
  const rules = new EventRules();
  rules.DB = { templates: { event_template: bridge.template }, eventWordbank: bridge.wordbank };
  rules._fallback = { templates: {} };
  rules.showTemporaryMessage = bridge.message || (() => {});
  rules.handleAction = bridge.handleAction || (() => {});
  rules.closeAllModals = () => {};
  GameDBManager = rules;
  return rules;
}
// END ORIGINAL EVENT`;
const target = new URL('../../public/guimizhizhu_ui/core/event-generator.js', import.meta.url);
let source = await readFile(target, 'utf8');
source = source.replace(/\/\/ BEGIN ORIGINAL EVENT[\s\S]*?\/\/ END ORIGINAL EVENT/, () => generated);
await writeFile(target, source.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted four original event methods; native sending and private storage are not bound.');
