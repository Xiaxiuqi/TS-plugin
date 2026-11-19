import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const base = new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/', import.meta.url);
async function object(file, name, excluded = []) {
  const text = await readFile(new URL(file, base), 'utf8');
  const start = text.indexOf(`const ${name} =`);
  if (start < 0) throw Error(`Missing ${name}`);
  const ast = ts.createSourceFile(file, text.slice(start), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const value = ast.statements[0].declarationList.declarations[0].initializer;
  if (!ts.isObjectLiteralExpression(value)) throw Error(`Invalid ${name}`);
  return `const ${name} = {\n${value.properties.filter(node =>
    !excluded.includes(node.name?.getText(ast))).map(node => {
      const source = node.getText(ast);
      // The original craft branch references this flag but declares it in runCertify instead.
      return node.name?.getText(ast) === 'runCraft'
        ? source.replace('let made = 0;', 'let made = 0;\n        let equipmentChanged = false;')
        : source;
    }).join(',\n')}\n};`;
}
const sequences = await object('37e-js-domain-affairs-window.txt', 'PathwaySeqUtil');
const guard = await object('37f-js-pathway-cores.txt', 'PathwayEntityRoleGuard');
const mode = await object('37f-js-pathway-cores.txt', 'MarauderCloneMode',
  ['buildRecord', 'rollAbilities', 'journeyList', 'scope', 'queryAll']);
const output = `// Generated from complete original MarauderCloneMode; native adapters are in clone-state.js.
(() => {
  'use strict';
  const KEY = 'cryptLord.cloneReference';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const parseSequenceRank = modules['cryptLord.marionetteReference'].rank;
  function create(deps) {
    const window = deps.window || globalThis.window;
    const GameDBManager = { DB: { godPathways: deps.pool.pathways } };
    const NpcObjectiveSchema = { parse: deps.validateObjective };
    const NpcSubjectiveSchema = { parse: deps.validateSubjective };
    const getAbilitySystemFromWorldbook = sequence => deps.synthesize(sequence).能力体系;
    const getPureName = text => {
      const pure = String(text || '').replace(/[【】]/g, '').trim()
        .replace(/^序列\\d+(\\.\\d+)?[-—\\s]?/, '').trim();
      return pure.includes('旧日侍者') ? pure : pure.replace(/^(旧日|支柱)[-—\\s]?/, '').trim();
    };
${sequences}
${guard}
${mode}
    MarauderCloneMode.resolve = deps.resolveGate;
    MarauderCloneMode.scope = deps.scope;
    MarauderCloneMode.queryAll = selector => Array.from(deps.scope()?.querySelectorAll(selector) || []);
    MarauderCloneMode.journeyList = deps.evidenceList;
    MarauderCloneMode.rollAbilities = deps.rollAbilities;
    MarauderCloneMode.buildRecord = (name, sequence, source, origin) => ({
      ...deps.synthesize(sequence), 名称: name, 能力清单: deps.rollAbilities(sequence),
      $战斗经验: 0, $战斗经验等级: 0,
      $id: 'clone-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e4),
      $创建时间: new Date().toISOString(),
      ...(origin === '寄生' ? { $来源: '寄生', $来源寄生: String(source || '') } :
        { $来源材料: String(source || '') }),
    });
    return MarauderCloneMode;
  }
  const api = { create, rank: parseSequenceRank, status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
`;
await writeFile(new URL('../../public/guimizhizhu_ui/core/clone-reference.js', import.meta.url),
  output.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted complete original clone creation, parasite certification, lifecycle and narrative.');
