import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/32a-js-battle-tags-movers-cpu.txt', import.meta.url), 'utf8');
const ast = ts.createSourceFile('tags.js', source.slice(source.indexOf('class TagManager {')),
  99, true, ts.ScriptKind.JS);
const classes = ['TagManager', 'TagChecker'].map(name => ast.statements.find(node =>
  ts.isClassDeclaration(node) && node.name?.text === name));
const turn = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'TurnManager');
const apply = turn?.members.find(node => node.name?.getText(ast) === 'applySkillTags');
if (classes.some(node => !node) || !apply || ast.parseDiagnostics.length)
  throw Error('Could not extract complete original tag classes and circle application');
const path = new URL('../../public/guimizhizhu_ui/core/battle-tags.js', import.meta.url);
const file = await readFile(path, 'utf8');
const start = '// BEGIN ORIGINAL TAG RULES', end = '// END ORIGINAL TAG RULES';
const a = file.indexOf(start), b = file.indexOf(end);
if (a < 0 || b < a) throw Error('Missing generated tag rule markers');
const output = `${start}
  function originalTags(logger, worldbooks) {
    const console = { log() {}, warn() {}, error() {} };
${classes.map(node => node.getText(ast)).join('\n')}
    return { manager: new TagManager(logger, worldbooks), checker: new TagChecker(),
      turn: { ${apply.getText(ast)} } };
  }
  `;
await writeFile(path, (file.slice(0, a) + output + file.slice(b))
  .replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted complete original TagManager, TagChecker and TurnManager.applySkillTags.');
