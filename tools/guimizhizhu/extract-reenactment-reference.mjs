import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = await readFile(path.join(base,
  '数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/37f-js-pathway-cores.txt'), 'utf8');
const catalogStart = source.indexOf('const MysteryReenactmentCanonCatalog = {');
const catalogEnd = source.indexOf('window.MysteryReenactmentCanonCatalog = MysteryReenactmentCanonCatalog;', catalogStart);
const coreStart = source.indexOf('const MysteryReenactmentCore = {', catalogEnd);
const coreEnd = source.indexOf('window.MysteryReenactmentCore = MysteryReenactmentCore;', coreStart);
if (catalogStart < 0 || catalogEnd < 0 || coreStart < 0 || coreEnd < 0) {
  throw new Error('原版神秘再现资料边界已变化，拒绝生成');
}
const catalogCode = source.slice(catalogStart, catalogEnd);
const coreCode = source.slice(coreStart, coreEnd);
const extracted = vm.runInNewContext(`${catalogCode}\n${coreCode}\n({
  catalog: MysteryReenactmentCanonCatalog.ENTRIES,
  timeline: MysteryReenactmentCore.HISTORY_TIMELINE
})`, { window: {} }, { timeout: 1000 });
if (extracted.catalog.length !== 16 || !extracted.timeline.includes('第零纪')) {
  throw new Error('原版目录或年表不完整，拒绝生成');
}
const payload = JSON.stringify(extracted);
const output = `(() => {
  'use strict';
  const KEY = 'cryptLord.reenactmentReference';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(\`[\${KEY}] shared/contract.js 尚未加载\`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const source = ${payload};
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, ready: true }),
    catalog: Object.freeze(source.catalog.map(row => Object.freeze(row))),
    timeline: source.timeline,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
`;
await writeFile(path.join(base, 'public/guimizhizhu_ui/core/mystery-reenactment-reference.js'), output);
console.log('Extracted original reenactment catalog (16 entries) and timeline');
