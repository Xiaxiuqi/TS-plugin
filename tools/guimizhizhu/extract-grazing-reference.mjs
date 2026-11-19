import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
const base = new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/', import.meta.url);
const text = (await readFile(new URL('37f-js-pathway-cores.txt', base), 'utf8')).replace(/\r\n?/g, '\n');
function object(name) {
  const start = text.indexOf(`const ${name} =`);
  if (start < 0) throw Error(`Missing ${name}`);
  const ast = ts.createSourceFile('original.js', text.slice(start), 99, true, ts.ScriptKind.JS);
  return ast.statements[0].getText(ast);
}
const battleText = await readFile(new URL('30a2-js-battle-board-and-units.txt', base), 'utf8');
const battleAst = ts.createSourceFile('battle.js', battleText, 99, true, ts.ScriptKind.JS);
const life = battleAst.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'LifeSaveManager');
const methods = life.members.filter(node => ['splitSequenceFragments', 'resolveFragment'].includes(node.name?.getText(battleAst)));
if (methods.length !== 2) throw Error('Missing original sequence helpers');
let mode = object('GrazingMode');
const legacyApiGuard = `if (!win.apiUrl || !win.apiKey || !win.apiModel) {
      win.msg('专属玩法API尚未配置。', 3500);
      win.openConfig();
      return;
    }`;
mode = mode.replace(legacyApiGuard, 'if (!win.ensureApiReady()) return;');
if (mode.includes('win.apiUrl')) throw Error('Legacy API guard was not replaced');
const output = `// Generated from the complete original grazing core and management mode.
(() => {
  'use strict';
  const KEY = 'cryptLord.grazingReference';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  function create(deps) {
    const window = deps.window;
    const document = window.document;
    const localStorage = { getItem: () => String(Boolean(deps.locked)) };
    const GameDBManager = { DB: { godPathways: deps.pool.pathways } };
    const parseSequenceRank = modules['cryptLord.marionetteReference'].rank;
    const LifeSaveManager = {
${methods.map(node => node.getText(battleAst).replace(/^static\s+/, '')).join(',\n')}
    };
    const PlayerProjectionResolver = { resolve: deps.projection };
    const PlayerProjectionSync = { syncAll: deps.sync };
    const AudienceImaginationCore = { mergeSequenceFragments: deps.mergeSequence };
    const fetchAvailableAbilities = deps.abilities;
${object('GrazingCore')}
${mode}
    GrazingMode.scope = deps.scope;
    return { core: GrazingCore, mode: GrazingMode };
  }
  const api = { create, status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
`;
await writeFile(new URL('../../public/guimizhizhu_ui/core/grazing-reference.js', import.meta.url),
  output.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, ''));
console.log('Extracted complete original grazing records, selections, prompts and management views.');
