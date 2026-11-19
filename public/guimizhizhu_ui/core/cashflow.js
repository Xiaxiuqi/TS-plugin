(() => {
  'use strict';
  const KEY = 'cryptLord.cashflow', root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract, modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (!contract) throw Error('钱包与收支契约尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const RESERVED = new Set(['$meta', '__proto__', 'constructor', 'prototype']);
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const entries = value => record(value) ? Object.entries(value).filter(([key]) => !RESERVED.has(key)) : [];
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const PATHS = Object.freeze(Object.fromEntries([
    ['鲁恩王国', ['金镑', '银苏勒', '铜便士']], ['弗萨克帝国', ['金霍恩', '弗银', '戈比']],
    ['因蒂斯共和国', ['费尔金', '里克', '科佩']], ['费内波特王国', ['金里索', '塞塔', '德根']],
    ['其他', ['萨森金', '波特金', '兹罗提', '花纹金币', '德力西']],
  ].flatMap(([country, names]) => names.map(name => [name, Object.freeze([country, name])]))));
  const ALIASES = Object.freeze({ 镑: '金镑', 磅: '金镑', 苏勒: '银苏勒', 便士: '铜便士',
    霍恩: '金霍恩', 里索: '金里索', 萨森: '萨森金', 波特: '波特金' });
  const RULES = Object.freeze(Object.fromEntries([
    ['鲁恩王国', [240, 12, 1]], ['弗萨克帝国', [100, 10, 1]],
    ['因蒂斯共和国', [100, 5, 1]], ['费内波特王国', [100, 10, 1]],
  ].map(([country, rates]) => [country, Object.freeze({ fields: Object.freeze(Object.keys(PATHS)
    .filter(name => PATHS[name][0] === country)), rates: Object.freeze(rates) })])));
  const MONTH = Object.freeze({ 天: 30, 周: 4, 月: 1, 年: 1 / 12 });
  const DAYS = Object.freeze({ 天: 1, 周: 7, 月: 30, 年: 365 });
  let disposed = false, epoch = 0, generating = false;
  function parseAmount(value) {
    if (typeof value === 'number') return { value: Math.round(value), currency: '' };
    if (typeof value !== 'string' || !value.trim()) return { value: 0, currency: '' };
    const cleaned = value.trim().replace(/[\s,_：:]/g, ''), match = cleaned.match(/(-?\d+(?:\.\d+)?)/);
    return { value: match ? Math.round(Number(match[1]) || 0) : 0, currency: match ? cleaned.replace(match[0], '').trim() : '' };
  }
  function currency(raw) { return own(ALIASES, raw) ? ALIASES[raw] : raw; }
  function walletPath(raw) {
    const trimmed = String(raw || '').trim(), name = currency(trimmed);
    if (RESERVED.has(name)) return null;
    return !trimmed ? PATHS.金镑 : own(PATHS, name) ? PATHS[name] : ['其他', trimmed];
  }
  function delta(wallet, name, amount) {
    if (!record(wallet) || !Number.isFinite(amount)) return false;
    if (amount === 0) return true;
    const path = walletPath(name);
    if (!path || !own(wallet, path[0]) || !record(wallet[path[0]])) return false;
    const raw = wallet[path[0]][path[1]];
    const old = ['number', 'string'].includes(typeof raw) ? Number(raw) || 0 : 0, next = old + amount;
    if (!Number.isFinite(next)) return false;
    wallet[path[0]][path[1]] = next; return true;
  }
  function normalizeCountry(wallet, rule) {
    const total = rule.fields.reduce((sum, key, index) => {
      const value = ['number', 'string'].includes(typeof wallet[key]) ? Number(wallet[key]) : NaN;
      return sum + (Number.isFinite(value) ? value : 0) * rule.rates[index];
    }, 0);
    if (!Number.isFinite(total)) return null;
    const result = {}; let remain = total;
    rule.fields.forEach((key, index) => {
      result[key] = index === rule.fields.length - 1 ? remain : Math.trunc(remain / rule.rates[index]);
      remain -= result[key] * rule.rates[index];
    });
    return result;
  }
  function normalize(data) {
    const wallet = data?.stat_data?.货币; if (!record(wallet)) return false;
    let changed = false;
    for (const [country, rule] of Object.entries(RULES)) {
      if (!record(wallet[country])) continue;
      const next = normalizeCountry(wallet[country], rule); if (!next) continue;
      for (const [key, value] of Object.entries(next)) if (wallet[country][key] !== value) {
        wallet[country][key] = value; changed = true;
      }
    }
    const history = wallet.货币变动记录;
    if (history !== undefined) {
      const recent = Object.fromEntries(entries(history).slice(-5));
      if (JSON.stringify(history) !== JSON.stringify(recent)) { wallet.货币变动记录 = recent; changed = true; }
    }
    return changed;
  }
  function collect(group) {
    const lines = [], buckets = Object.create(null), known = Object.keys(PATHS);
    for (const [name, entry] of entries(group)) {
      if (!record(entry)) { lines.push({ name, invalid: true }); continue; }
      const parsed = parseAmount(entry.金额), period = entry.周期 || '月', factor = own(MONTH, period) ? MONTH[period] : 0;
      const unit = currency(parsed.currency.trim()) || '金镑';
      const monthly = parsed.value > 0 && factor ? Math.round(parsed.value * factor) : 0;
      const invalid = !(parsed.value > 0 && factor && monthly !== 0 && Number.isFinite(monthly)) || RESERVED.has(unit);
      if (!invalid) buckets[unit] = (buckets[unit] || 0) + monthly;
      lines.push({ name, period: String(period), value: parsed.value, currency: unit, monthly,
        last: String(entry.上次结算时间 || ''), invalid });
    }
    const rank = unit => known.includes(unit) ? known.indexOf(unit) : 1000;
    lines.sort((a, b) => a.invalid !== b.invalid ? a.invalid ? 1 : -1 :
      a.currency !== b.currency ? rank(a.currency) - rank(b.currency) || String(a.currency || '').localeCompare(String(b.currency || ''), 'zh') :
        a.name.localeCompare(b.name, 'zh'));
    return { lines, buckets };
  }
  function totals(buckets, sign = 1) {
    const known = Object.keys(PATHS).filter(key => own(buckets, key));
    const unknown = Object.keys(buckets).filter(key => !own(PATHS, key)).sort();
    return [...known, ...unknown].map(key => `${sign > 0 ? '+' : '-'}${buckets[key]} ${key}`).join('  ');
  }
  function project(floor) {
    if (floor?.role !== 'assistant') throw Error('只能查看真实 assistant 楼层的钱包');
    const stat = record(floor.data?.stat_data) ? floor.data.stat_data : {}, wallet = stat.货币;
    const countries = [], warnings = [];
    if (!record(wallet)) warnings.push(wallet === undefined ? '本楼层没有钱包数据' : '钱包数据格式异常');
    for (const country of [...Object.keys(RULES), '其他']) {
      const group = wallet?.[country]; if (group === undefined) continue;
      if (!record(group)) { warnings.push(`${country}钱袋格式异常`); continue; }
      const coins = entries(group).flatMap(([name, raw]) => {
        if (!['number', 'string'].includes(typeof raw)) { warnings.push(`${country} · ${name}金额无效`); return []; }
        const value = Number(raw);
        if (!Number.isFinite(value)) { warnings.push(`${country} · ${name}金额无效`); return []; }
        return value === 0 ? [] : [{ name, value }];
      });
      countries.push({ name: country, coins });
    }
    for (const key of ['稳定长期收入', '稳定长期支出'])
      if (stat[key] !== undefined && !record(stat[key])) warnings.push(`${key}格式异常`);
    return { messageId: floor.message_id, countries, income: collect(stat.稳定长期收入), expense: collect(stat.稳定长期支出),
      history: entries(wallet?.货币变动记录).slice(-5).map(([time, value]) => ({ time,
        text: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '') })), warnings };
  }
  function settle(data, nowMinutes, settledTime, toMinutes) {
    const stat = data?.stat_data;
    if (!record(stat?.货币) || !Number.isFinite(nowMinutes) || !settledTime) return false;
    let changed = false;
    for (const [key, sign] of [['稳定长期收入', 1], ['稳定长期支出', -1]]) {
      for (const [, entry] of entries(stat[key])) {
        if (!record(entry)) continue;
        const parsed = parseAmount(entry.金额), period = entry.周期 || '月', days = own(DAYS, period) ? DAYS[period] : 0;
        if (!Number.isFinite(parsed.value) || parsed.value <= 0 || !days || !walletPath(parsed.currency)) continue;
        if (!entry.上次结算时间 || !Number.isFinite(toMinutes(entry.上次结算时间))) {
          entry.上次结算时间 = settledTime; changed = true; continue;
        }
        const cycles = Math.floor((nowMinutes - toMinutes(entry.上次结算时间)) / (days * 1440));
        if (cycles <= 0 || !Number.isSafeInteger(cycles) || !delta(stat.货币, parsed.currency, parsed.value * cycles * sign)) continue;
        entry.上次结算时间 = settledTime; changed = true;
      }
    }
    return changed;
  }
  function check(guard, token) {
    if (disposed || token !== epoch || guard && !guard()) throw new DOMException('钱包读取已取消', 'AbortError');
    if (generating) throw Error('正在生成，等待完整楼层');
  }
  async function snapshot(host, guard, token) {
    check(guard, token);
    const rows = structuredClone(await host.getChatMessages('0-{{lastMessageId}}')); check(guard, token);
    const revision = structuredClone(await host.getChatMessages('0-{{lastMessageId}}', { include_swipes: true })); check(guard, token);
    if (!Array.isArray(rows) || !Array.isArray(revision)) throw Error('原生楼层不可读取');
    if (rows.some(row => !Number.isInteger(row.message_id) || row.message_id < 0) ||
      new Set(rows.map(row => row.message_id)).size !== rows.length) throw Error('原生楼层编号异常');
    return { rows: rows.sort((a, b) => a.message_id - b.message_id), revision };
  }
  async function scan(guard) {
    const token = epoch; check(guard, token);
    const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 }); check(guard, token);
    const first = await snapshot(host, guard, token), final = await snapshot(host, guard, token);
    if (JSON.stringify(first) !== JSON.stringify(final)) throw Error('读取期间正文、变量或消息页已变化，请重新读取');
    const rows = first.rows.filter(row => row.role === 'assistant' && !row.is_hidden);
    return { rows, reports: rows.map(project), floors: rows.map(row => ({ messageId: row.message_id, name: String(row.name || '') })) };
  }
  async function load(messageId = null, guard) {
    if (messageId !== null && (!Number.isInteger(messageId) || messageId < 0)) throw Error('楼层编号无效');
    const result = await scan(guard), report = messageId === null ? result.reports.at(-1) :
      result.reports.find(item => item.messageId === messageId);
    if (!report) throw Object.assign(Error('所选原生 assistant 楼层不存在或已隐藏'), { code: 'CASHFLOW_FLOOR_UNAVAILABLE', floors: result.floors });
    return { report, floors: result.floors };
  }
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents() || {}, subscriptions = [];
  const bind = (event, callback) => { if (event) subscriptions.push(after.bindEvent(event, callback)); };
  bind(events.CHAT_CHANGED, () => { epoch++; generating = false; });
  bind(events.GENERATION_STARTED, (type, options, dryRun) => {
    if (type !== 'quiet' && !dryRun && !options?.dryRun) { epoch++; generating = true; }
  });
  for (const event of new Set([events.GENERATION_ENDED, events.GENERATION_STOPPED].filter(Boolean)))
    bind(event, () => { generating = false; });
  const api = Object.freeze({ status: () => ({ key: KEY, ready: !disposed, generating }), paths: PATHS, rules: RULES,
    parseAmount, currency, walletPath, delta, normalizeCountry, normalize, collect, totals, project, settle, scan, load,
    dispose() {
      disposed = true; epoch++; subscriptions.forEach(item => item?.stop()); contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    } });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
