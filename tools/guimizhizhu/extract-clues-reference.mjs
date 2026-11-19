import {readFile,writeFile} from 'node:fs/promises';
import ts from 'typescript';
const file=new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/35b-js-game-manager-core.txt',import.meta.url);
const source=await readFile(file,'utf8');
const marker='_extractLastTagContent(tagName, text, ignoreCase = false)';
const tree=ts.createSourceFile('original.js',`const rules={${source.slice(source.indexOf(marker))}`,99,true,ts.ScriptKind.JS);
const member=tree.statements[0].declarationList.declarations[0].initializer.properties[0].getText(tree);
if(!member.startsWith(marker))throw Error('原版线索标签提取失败');
const target=new URL('../../public/guimizhizhu_ui/core/current-clues.js',import.meta.url);
const current=await readFile(target,'utf8');
await writeFile(target,current.replace(/\/\/ BEGIN ORIGINAL CLUE RULES[\s\S]*?\/\/ END ORIGINAL CLUE RULES/,
  ()=>`// BEGIN ORIGINAL CLUE RULES\n  const original = {${member}};\n  // END ORIGINAL CLUE RULES`)
  .replace(/\r\n?/g,'\n').replace(/[ \t]+$/gm,''));
console.log('Extracted complete original last-tag rule for current clues.');
