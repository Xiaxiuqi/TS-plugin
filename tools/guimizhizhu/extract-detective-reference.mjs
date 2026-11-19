import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL(
  '../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/37a-js-fast-romance-detective-tail.txt',
  import.meta.url), 'utf8');
const ast = ts.createSourceFile('original.js', source.slice(source.indexOf('class DetectiveCaseWindow')),
  99, true, ts.ScriptKind.JS);
const original = ast.statements.find(ts.isClassDeclaration);
const names = [
  'GEN_STEPS', 'RESERVED_TAGS', 'DEFAULT_FOLD_TAGS', 'normalizeFoldTags',
  'escapeTagName', 'stripCustomFolds', 'packWorldRecord', 'getCustomPromptForStage',
  'parseBlock', 'buildGenVars', 'parseClues', 'unlockedText', 'applyUnlock',
  'truthFull', 'recentText', 'wrapRecent',
];
const body = names.map(name => {
  const member = original.members.find(row => row.name?.getText(ast) === name);
  if (!member) throw Error(`Missing original detective rule: ${name}`);
  return member.getText(ast);
}).join('\n');
const generated = `// BEGIN ORIGINAL DETECTIVE
class DetectiveCaseWindow {
${body}
}
function createRules(currentCase, options = {}) {
  return Object.assign(Object.create(DetectiveCaseWindow.prototype), {
    currentCase, dialogCount: options.dialogCount ?? 200,
    customFoldTags: Object.create(DetectiveCaseWindow.prototype).normalizeFoldTags(
      options.folds ?? DetectiveCaseWindow.DEFAULT_FOLD_TAGS),
    customPromptGen: options.gen || '', customPromptIntro: options.intro || '',
    customPromptPlay: options.play || '',
  });
}
// END ORIGINAL DETECTIVE`;
const target = new URL('../../public/guimizhizhu_ui/core/detective-rules.js', import.meta.url);
let current = await readFile(target, 'utf8');
current = current.includes('// BEGIN ORIGINAL DETECTIVE')
  ? current.replace(/\/\/ BEGIN ORIGINAL DETECTIVE[\s\S]*?\/\/ END ORIGINAL DETECTIVE/, () => generated)
  : current.replace('const api = Object.freeze(', () => `${generated}\nconst api = Object.freeze(`)
    .replace('prompts: DCW_PROMPTS,', 'createRules, steps: DetectiveCaseWindow.GEN_STEPS, prompts: DCW_PROMPTS,');
await writeFile(target, current.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log(`Extracted ${names.length} original detective rule members; no storage or memory methods.`);
