(() => {
  'use strict';

  const KEY = 'cryptLord.weaponClassifier';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const VOCAB = Object.freeze({
    威力量级: ['棍棒级', '砍刀级', '手枪级', '重型手枪级', '步枪级', '狙击枪级', '炸弹级'],
    精度: ['近战无精度', '霰弹枪级', '手枪级', '步枪级', '狙击枪级'],
    射程: ['近战', '中距离', '远程', '极远'],
    AOE: ['无AOE', '霰弹枪级', '手雷级'],
  });
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  function rankOf(value) {
    const raw = String(value || '').trim();
    if (raw.includes('支柱')) return -2;
    if (raw.includes('旧日')) return -1;
    const number = raw.match(/^\d+(?:\.\d+)?$/)?.[0] ||
      raw.match(/序列[：:\s]*(\d+(?:\.\d+)?)/)?.[1];
    return number === undefined ? 10 : Number(number);
  }
  function valid(value) {
    return record(value) && Object.entries(VOCAB).every(([key, values]) => values.includes(value[key]));
  }
  function collect(data) {
    const bag = data?.stat_data?.武器列表;
    if (!record(bag) && !Array.isArray(bag)) return [];
    const seen = new Set();
    return Object.entries(bag).flatMap(([key, item]) => {
      if (key === '$meta' || !record(item) || rankOf(item.序列) < 7 || valid(item.$战斗分类)) return [];
      const name = String(item.名称 || key).trim();
      if (!name || seen.has(name)) return [];
      seen.add(name);
      return [{ key, 名称: name, 序列: String(item.序列 || '普通'),
        描述: String(item.描述 || '') }];
    });
  }
  function section(weapons) {
    if (!Array.isArray(weapons) || !weapons.length) return '';
    const rows = weapons.map(({ 名称, 序列, 描述 }) =>
      `${JSON.stringify(名称)} | ${JSON.stringify(序列)} | ${JSON.stringify(String(描述).slice(0, 60))}`).join('\n');
    return `\n附加任务：为这些玩家武器分类，按名称、描述所指现实兵器判断，与序列高低无关。
名称 | 序列 | 描述
${rows}
四维每项必须原样取自词表：
威力量级：${VOCAB.威力量级.join('、')}
精度：${VOCAB.精度.join('、')}（冷兵器选近战无精度）
射程：${VOCAB.射程.join('、')}
AOE：${VOCAB.AOE.join('、')}
在原战场 JSON 中添加 "武器分类":[{"名称":"上表原名","威力量级":"手枪级","精度":"手枪级","射程":"中距离","AOE":"无AOE"}]。
每件一条，名称不得改字；无法判断时不编造。武器分类是附加任务，不能影响战场绘制。`;
  }
  function parse(raw) {
    const out = new Map();
    for (const row of Array.isArray(raw) ? raw : []) {
      if (!record(row)) continue;
      const name = String(row.名称 || '').trim();
      if (!name || out.has(name)) continue;
      const cls = Object.fromEntries(Object.keys(VOCAB).map(key => [key, String(row[key] || '').trim()]));
      if (valid(cls)) out.set(name, cls);
    }
    return out;
  }
  function apply(data, requested, classes) {
    if (typeof classes?.get !== 'function' || !classes.size || !Array.isArray(requested)) {
      return { data, applied: 0 };
    }
    const bag = data?.stat_data?.武器列表;
    if (!record(bag) && !Array.isArray(bag)) return { data, applied: 0 };
    const next = structuredClone(data);
    let applied = 0;
    for (const entry of requested) {
      const cls = classes.get(entry.名称);
      const item = next.stat_data.武器列表[entry.key];
      if (!valid(cls) || !record(item) || valid(item.$战斗分类) ||
        String(item.名称 || entry.key).trim() !== entry.名称 ||
        String(item.序列 || '普通') !== entry.序列 ||
        String(item.描述 || '') !== entry.描述 ||
        rankOf(item.序列) < 7) continue;
      item.$战斗分类 = { ...cls };
      applied++;
    }
    return { data: applied ? next : data, applied };
  }
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, ready: true }),
    vocab: VOCAB, rankOf, valid, collect, section, parse, apply,
    dispose() {
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
