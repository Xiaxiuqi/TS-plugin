import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';

const chunks = [
  ['34a-js-worldbook-database-tools.txt', ['getDefaultImagePromptSeed', 'buildDefaultImagePromptPreset', 'normalizeImagePromptPresets']],
  ['36a-js-items-equip-relationships.txt', ['_extractPicPromptFromText', '_cleanupImageGenRequest', '_scheduleImageGenTimeout', 'requestGenerateImage']],
];
const members = [];
for (const [file, names] of chunks) {
  const source = await readFile(new URL(`../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/${file}`, import.meta.url), 'utf8');
  for (const name of names) {
    const start = source.search(new RegExp(`^\\s*${name}\\(`, 'm'));
    if (start < 0) throw Error(`Missing original image rule: ${name}`);
    const tree = ts.createSourceFile('original.js', `({${source.slice(start)}\n})`, 99, true, ts.ScriptKind.JS);
    let found;
    function visit(node) {
      if (ts.isMethodDeclaration(node) && node.name?.getText(tree) === name) found = node;
      ts.forEachChild(node, visit);
    }
    visit(tree);
    if (!found) throw Error(`Missing original image rule: ${name}`);
    members.push(found.getText(tree).replace(/,$/, ''));
  }
}
const generated = `// BEGIN ORIGINAL IMAGE
function originalRules(bridge = {}) {
  const eventOn = bridge.on, eventEmit = bridge.emit, eventRemoveListener = bridge.remove;
  class ImageRules {
${members.join('\n')}
  }
  return new ImageRules();
}
// END ORIGINAL IMAGE`;
const target = new URL('../../public/guimizhizhu_ui/core/image-generation.js', import.meta.url);
let current = await readFile(target, 'utf8');
current = current.includes('// BEGIN ORIGINAL IMAGE')
  ? current.replace(/\/\/ BEGIN ORIGINAL IMAGE[\s\S]*?\/\/ END ORIGINAL IMAGE/, () => generated)
  : current.replace('  const DEFAULT_PROMPT', () => `${generated}\n  const DEFAULT_PROMPT`);
await writeFile(target, current.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log(`Extracted ${members.length} original image rules; no private history or API settings.`);
