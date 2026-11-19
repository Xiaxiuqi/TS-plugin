import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const original = await readFile(new URL(
  '../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35a-js-init-storage-crossfire.txt', import.meta.url), 'utf8');
const tree = ts.createSourceFile('original.js', original.slice(original.indexOf('const ChronicleCore =')), 99, true, ts.ScriptKind.JS);
const object = tree.statements[0].declarationList.declarations[0].initializer;
const names = ['DICT', 'parseTextToEvents', 'stringifyEventToText'];
const body = names.map(name => {
  const node = object.properties.find(item => item.name?.getText(tree) === name);
  if (!node) throw Error(`Missing original member: ${name}`);
  return node.getText(tree);
}).join(',\n');
const generated = `// BEGIN ORIGINAL JOURNEY RULES
const ChronicleCore = {
${body}
};
// Prevent prototype names from being mistaken for legacy field aliases.
ChronicleCore.DICT.ALIAS_MAP = Object.assign(Object.create(null), ChronicleCore.DICT.ALIAS_MAP);
// END ORIGINAL JOURNEY RULES`;
const target = new URL('../../public/guimizhizhu_ui/core/journey-reader.js', import.meta.url);
const content = await readFile(target, 'utf8');
await writeFile(target, content.replace(/\/\/ BEGIN ORIGINAL JOURNEY RULES[\s\S]*?\/\/ END ORIGINAL JOURNEY RULES/, generated)
  .replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted original journey dictionary, parser and serializer; no memory/snapshot engine.');
