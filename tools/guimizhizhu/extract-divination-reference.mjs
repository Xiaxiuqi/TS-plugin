import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL(
  '../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/36b-js-faction-industry-mail-save.txt',
  import.meta.url), 'utf8');
const ast = ts.createSourceFile('original.js', source.slice(source.indexOf('class FastRelayWindow')),
  99, true, ts.ScriptKind.JS);
const original = ast.statements.find(ts.isClassDeclaration);
const members = [
  'PRESET_VERSION', 'MAX_PUSHES', 'MAX_SUCCESSES', 'CLARITY', 'TRUTH_POOLS', 'TRUTH_LABELS',
  'getPromptParam', 'getPromptRitual', 'getPromptTruthCandidates', 'buildDefaultPresets', 'phaseSystemPrompt',
  'normalizeQuestionType', 'shuffleArray', 'normalizePrimaryId', 'parseTruthCandidateResponse',
  'pickTruthFromCandidates', 'formatTruthForModel', 'stripTruthForDisplay', 'getPlayerStats',
  'calcThreshold', 'stageCoeff', 'antiBonusRatio', 'getEffectiveDivDc', 'resolveCheck', 'previewRates',
  'parseAndApplyParams', 'buildPendingRitual', 'commitPendingRitual', 'buildExportReport',
  'mergeTag', 'extractTagsFromText',
];
const body = members.map(name => {
  const found = original.members.find(node => node.name?.getText(ast) === name);
  if (!found) throw Error(`Missing original rule: ${name}`);
  return found.getText(ast);
}).join('\n');
const generated = `// BEGIN ORIGINAL DIVINATION
function originalRules(random = Math.random) {
  const Math = Object.create(globalThis.Math);
  Math.random = random;
  class FastRelayWindow {
${body}
  }
  return FastRelayWindow;
}
const Original = originalRules();
const MAX_PUSHES = Original.MAX_PUSHES, MAX_SUCCESSES = Original.MAX_SUCCESSES;
const CLARITY = Object.freeze(Original.CLARITY);
const TRUTH_POOLS = Object.freeze(Original.TRUTH_POOLS);
const TRUTH_LABELS = Object.freeze(Original.TRUTH_LABELS);
// END ORIGINAL DIVINATION`;
const target = new URL('../../public/guimizhizhu_ui/core/divination-state.js', import.meta.url);
let current = await readFile(target, 'utf8');
if (current.includes('// BEGIN ORIGINAL DIVINATION')) {
  current = current.replace(/\/\/ BEGIN ORIGINAL DIVINATION[\s\S]*?\/\/ END ORIGINAL DIVINATION/, generated);
} else {
  // Remove the old copied approximations by declaration, preserving host/preset adapters.
  const tree = ts.createSourceFile('native.js', current, 99, true, ts.ScriptKind.JS);
  const block = tree.statements[0].expression.expression.expression.body;
  const removed = new Set([
    ...members.filter(name => !name.startsWith('getPrompt') && name !== 'buildDefaultPresets'),
    'generateRuleParam', 'generateRuleTruth', 'generateRuleRitual',
  ]);
  const ranges = block.statements.filter(node =>
    ts.isFunctionDeclaration(node) && removed.has(node.name.text) ||
    ts.isVariableStatement(node) && node.declarationList.declarations.some(row =>
      ['MAX_PUSHES', 'MAX_SUCCESSES', 'CLARITY', 'TRUTH_POOLS', 'TRUTH_LABELS'].includes(row.name.getText(tree))))
    .map(node => [node.getFullStart(), node.end]).reverse();
  for (const [start, end] of ranges) current = current.slice(0, start) + current.slice(end);
  current = current.replace('  function createSession', `${generated}\n\n  function createSession`);
}
await writeFile(target, current.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log(`Extracted ${members.length} complete original divination rule members; no legacy memory/API UI.`);
