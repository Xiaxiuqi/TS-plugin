import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const base = new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/', import.meta.url);
async function object(file, name, excluded = []) {
  const text = await readFile(new URL(file, base), 'utf8');
  const start = text.indexOf(`const ${name} =`);
  if (start < 0) throw Error(`Missing ${name}`);
  const ast = ts.createSourceFile(file, text.slice(start), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const statement = ast.statements[0];
  const value = statement.declarationList.declarations[0].initializer;
  if (!ts.isObjectLiteralExpression(value)) throw Error(`Invalid ${name}`);
  return `const ${name} = {\n${value.properties.filter(node =>
    !excluded.includes(node.name?.getText(ast))).map(node => node.getText(ast)).join(',\n')}\n};`;
}
const sequences = await object('37e-js-domain-affairs-window.txt', 'PathwaySeqUtil');
const guard = await object('37f-js-pathway-cores.txt', 'PathwayEntityRoleGuard');
const mode = await object('37f-js-pathway-cores.txt', 'MarionetteMode',
  ['buildRecord', 'rollAbilities', 'journeyList', 'scope', 'queryAll']);
const database = await readFile(new URL('34a-js-worldbook-database-tools.txt', base), 'utf8');
const rankSource = database.slice(database.indexOf('const containsOldDayAttendant ='),
  database.indexOf('// 解析装备序列'));
const output = `// Generated from the original complete MarionetteMode; native adapters are in marionette-state.js.
(() => {
  'use strict';
  const KEY = 'cryptLord.marionetteReference';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
${rankSource}
  function create(deps) {
    const window = deps.window || globalThis.window;
    const GameDBManager = { DB: { godPathways: deps.pool.pathways } };
    const NpcObjectiveSchema = { parse: deps.validateObjective };
    const NpcSubjectiveSchema = { parse: deps.validateSubjective };
    const getPureName = text => {
      const pure = String(text || '').replace(/[【】]/g, '').trim()
        .replace(/^序列\\d+(\\.\\d+)?[-—\\s]?/, '').trim();
      return containsOldDayAttendant(pure) ? pure : pure.replace(/^(旧日|支柱)[-—\\s]?/, '').trim();
    };
${sequences}
${guard}
${mode}
    MarionetteMode.resolve = deps.resolveGate;
    MarionetteMode.scope = deps.scope;
    MarionetteMode.queryAll = selector => Array.from(deps.scope()?.querySelectorAll(selector) || []);
    MarionetteMode.journeyList = deps.evidenceList;
    MarionetteMode.rollAbilities = deps.rollAbilities;
    MarionetteMode.buildRecord = (name, sequence, source) => ({
      ...deps.synthesize(sequence), 名称: name, 能力清单: deps.rollAbilities(sequence),
      $战斗经验: 0, $战斗经验等级: 0,
      $id: 'puppet-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e4),
      $创建时间: new Date().toISOString(), $来源剧情: String(source || ''),
    });
    return MarionetteMode;
  }
  const api = { create, rank: parseSequenceRank, status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
`;
await writeFile(new URL('../../public/guimizhizhu_ui/core/marionette-reference.js', import.meta.url),
  output.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted complete original marionette workflows, prompts, parsers and views.');
