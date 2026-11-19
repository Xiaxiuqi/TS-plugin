import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const base='../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/';
const text=await readFile(new URL(`${base}34a-js-worldbook-database-tools.txt`,import.meta.url),'utf8');
const tree=ts.createSourceFile('rules.js',text,99,true,ts.ScriptKind.JS);
const members=new Map();
function visit(node){
  if(ts.isVariableDeclaration(node)&&['evaluateCondition','applyDynamicStatus'].includes(node.name.getText(tree)))
    members.set(node.name.getText(tree),node.initializer.getText(tree));
  if(ts.isMethodDeclaration(node)&&['cleanAndParseJSON','getDirectiveByNameAndScope'].includes(node.name.getText(tree)))
    members.set(node.name.getText(tree),node.getText(tree));
  ts.forEachChild(node,visit);
}
visit(tree);
const game=await readFile(new URL(`${base}35a-js-init-storage-crossfire.txt`,import.meta.url),'utf8');
const gameTree=ts.createSourceFile('game.js',`const manager={${game.slice(game.indexOf('_assembleSystemDirectives(data)'))}`,99,true,ts.ScriptKind.JS);
const assembler=gameTree.statements[0].declarationList.declarations[0].initializer.properties[0].getText(gameTree);
if(members.size!==4||!assembler.startsWith('_assembleSystemDirectives'))throw Error('原版动态规则提取失败');
const block=`// BEGIN ORIGINAL DYNAMIC RULES
  function originalRules(GameDBManager, _) {
    const toastr = { error() {} };
    const parser = {${members.get('cleanAndParseJSON')}};
    GameDBManager.getDirectiveByNameAndScope = function(ruleName, isNPC) {
      return ({${members.get('getDirectiveByNameAndScope')}}).getDirectiveByNameAndScope.call(GameDBManager, ruleName, isNPC);
    };
    const evaluateCondition = ${members.get('evaluateCondition')};
    const applyDynamicStatus = ${members.get('applyDynamicStatus')};
    const manager = {${assembler}};
    return { parse: (...args) => parser.cleanAndParseJSON(...args), evaluate: evaluateCondition,
      apply: applyDynamicStatus, assemble: data => manager._assembleSystemDirectives(data) };
  }
  // END ORIGINAL DYNAMIC RULES`;
const target=new URL('../../public/guimizhizhu_ui/core/dynamic-status.js',import.meta.url);
const current=await readFile(target,'utf8');
await writeFile(target,current.replace(/\/\/ BEGIN ORIGINAL DYNAMIC RULES[\s\S]*?\/\/ END ORIGINAL DYNAMIC RULES/,()=>block)
  .replace(/\r\n?/g,'\n').replace(/[ \t]+$/gm,''));
console.log('Extracted original dynamic condition engine, status engine, scoped directive lookup, assembler and JSON parser.');
