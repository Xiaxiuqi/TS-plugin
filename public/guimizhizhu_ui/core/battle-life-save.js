(() => {
  'use strict';
  const KEY = 'cryptLord.battleLifeSave';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const PAIRS = [
    ['窥秘人', 2, '自身信息化'],
    ['罪犯', 2, '鲜血主宰', 5, '欲望化身'],
    ['药师', 4, '替身法术', 5, '月光化'],
    ['学徒', 4, '空间隐藏', 5, '闪现'],
    ['怪物', 2, '水银之躯', 5, '幸运'],
    ['律师', 5, '混乱', 5, '扭曲'],
    ['占卜家', 7, '纸人替身', 7, '伤害转移'],
    ['秘祈人', 3, '阴影替身之术', 6, '血肉魔法'],
    ['收尸人', 3, '死亡化身'],
    ['歌颂者', 2, '光形态'],
    ['耕种者', 5, '地底潜行', 8, '紧急治疗'],
    ['舞蹈家', 4, '制造「环」'],
    ['入门者', 2, '纯粹精神化'],
    ['掮客', 4, '神圣保护', 8, '阴影利用'],
    ['吝啬鬼', 5, '不灭之树'],
    ['恶棍', 4, '杨枝甘露治愈', 5, '树之自愈'],
    ['萨满', 5, '维度穿梭'],
    ['猎人', null, null, 6, '火焰瞬移'],
    ['刺客', 7, '魔镜替身', 7, '镜子/魔杖替身'],
    ['囚犯', null, null, 5, '镜面闪现'],
    ['战士', null, null, 3, '水银化'],
    ['偷盗者', 4, '身体时之虫化'],
  ];
  const defaults = Object.freeze(Object.fromEntries(PAIRS.map(([key, strong, strongName, weak, weakName]) =>
    [key, {
      strong: strong == null ? null : { from: strong, name: strongName },
      weak: weak == null ? null : { from: weak, name: weakName },
    }])));
  const defaultStrategy = Object.freeze({ stages: [
    { damageOverMaxRatio: .3 },
    { hpBelowRatio: .5, damageOverMaxRatio: .1 },
  ] });
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  function strategy(value) {
    if (!record(value) || !Array.isArray(value.stages) || !value.stages.length ||
      value.stages.length > 10) throw new Error('弱保命至少需要一条、至多十条阶段。');
    return { stages: value.stages.map(row => {
      const damageOverMaxRatio = Number(row?.damageOverMaxRatio);
      const hpBelowRatio = row?.hpBelowRatio == null || row.hpBelowRatio === ''
        ? null : Number(row.hpBelowRatio);
      if (!Number.isFinite(damageOverMaxRatio) || damageOverMaxRatio <= 0 || damageOverMaxRatio > 1 ||
        hpBelowRatio != null && (!Number.isFinite(hpBelowRatio) || hpBelowRatio <= 0 || hpBelowRatio > 1))
        throw new Error('伤害与活力阈值须在 0% 到 100% 之间。');
      return { damageOverMaxRatio, ...(hpBelowRatio == null ? {} : { hpBelowRatio }) };
    }) };
  }
  function storedStrategy(data) {
    try { return strategy(data?.cryptLord?.lifeSaveStrategy || defaultStrategy); }
    catch { return strategy(defaultStrategy); }
  }
  function saveStrategy(data, value) {
    const chosen = value == null ? null : strategy(value);
    const next = structuredClone(data || {});
    next.cryptLord = record(next.cryptLord) ? next.cryptLord : {};
    if (chosen) next.cryptLord.lifeSaveStrategy = chosen;
    else delete next.cryptLord.lifeSaveStrategy;
    if (next.cryptLord.personalBattle?.status === 'active' && next.cryptLord.personalBattle.player?.lifeSave)
      next.cryptLord.personalBattle.player.lifeSave.strategy = chosen || strategy(defaultStrategy);
    const team = next.cryptLord.teamBattle;
    if (team?.status === 'active') {
      const player = team.units?.find(actor => actor.source === 'player');
      if (player) {
        if (!player.lifeSave) initialize(player, player.sequence,
          player.pathway ?? next.stat_data?.当前途径 ?? next.stat_data?.途径 ??
            next.stat_data?.pathway ?? next.stat_data?.所属途径,
          team.lifeSaveTable);
        player.lifeSave.strategy = chosen || strategy(defaultStrategy);
      }
    }
    return { ok: true, data: next };
  }
  function tableEntry(value) {
    if (!record(value)) return null;
    const parse = part => {
      if (part === null) return null;
      if (!record(part) || !Number.isFinite(Number(part.from)) ||
        Number(part.from) < -2 || Number(part.from) > 10 ||
        typeof part.name !== 'string' || !part.name.trim()) return undefined;
      return { from: Number(part.from), name: part.name.trim().slice(0, 80) };
    };
    const strong = parse(value.strong);
    const weak = parse(value.weak);
    if (strong === undefined && weak === undefined) return null;
    return { ...(strong === undefined ? {} : { strong }), ...(weak === undefined ? {} : { weak }) };
  }
  async function load() {
    const table = structuredClone(defaults);
    const db = window.GameDBManager?.DB?.lifeSaveTable;
    if (record(db)) for (const [key, entry] of Object.entries(db)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) continue;
      const normalized = tableEntry(entry);
      if (normalized) table[key] = { ...table[key], ...normalized };
    }
    try {
      const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
      const books = await host.getWorldbookNames();
      for (const book of Array.isArray(books) ? books : []) {
        let entries;
        try { entries = await host.getWorldbook(book); } catch { continue; }
        for (const entry of Array.isArray(entries) ? entries : []) {
          if (![entry?.comment, entry?.name].some(value => String(value || '').includes('保命技能'))) continue;
          let parsed;
          try { parsed = JSON.parse(entry.content); } catch { continue; }
          if (!record(parsed)) continue;
          for (const [key, row] of Object.entries(parsed)) {
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
            const normalized = tableEntry(row);
            if (normalized) table[key] = { ...table[key], ...normalized };
          }
        }
      }
    } catch { /* No worldbook bridge: built-in table remains usable. */ }
    return table;
  }
  function eligibility(sequence, pathway, table = defaults, pathways = window.GameDBManager?.DB?.godPathways) {
    const result = { hasStrong: false, hasWeak: false, strongName: '', weakName: '' };
    if (String(sequence || '').includes('普通人')) return result;
    const fragments = String(sequence || '').split(/[/|，,;；与和及以及\s+&、]/u).filter(Boolean);
    const matching = [];
    for (const fragment of fragments) {
      const rank = Number(fragment.match(/序列[：:\s]*(\d+(?:\.\d+)?)/u)?.[1]);
      if (!Number.isFinite(rank)) continue;
      const pure = fragment.replace(/^序列[：:\s]*\d+(?:\.\d+)?[-—\s]*/u, '').trim();
      let found = false;
      for (const [name, entries] of Object.entries(record(pathways) ? pathways : {})) {
        if (Array.isArray(entries) && entries.some(row =>
          String(row).replace(/^序列[：:\s]*\d+(?:\.\d+)?[-—\s]*/u, '').trim() === pure)) {
          matching.push({ key: name.replace(/途径$/u, ''), rank });
          found = true;
        }
      }
      if (!found && pathway) matching.push({ key: String(pathway).replace(/途径$/u, ''), rank });
    }
    for (const { key, rank } of matching) {
      const row = table[key];
      if (!result.hasStrong && row?.strong && rank <= row.strong.from) {
        result.hasStrong = true; result.strongName = row.strong.name;
      }
      if (!result.hasWeak && row?.weak && rank <= row.weak.from) {
        result.hasWeak = true; result.weakName = row.weak.name;
      }
    }
    return result;
  }
  function initialize(actor, sequence, pathway, table, chosen = defaultStrategy) {
    const gate = eligibility(sequence, pathway, table);
    actor.lifeSave = {
      ...gate, strongLeft: gate.hasStrong ? 1 : 0, weakLeft: gate.hasWeak ? 3 : 0,
      strongUsed: 0, weakUsed: 0, strategy: strategy(chosen),
    };
    return actor.lifeSave;
  }
  function absorb(actor, incoming) {
    const damage = Math.max(0, Number(incoming) || 0);
    const empty = { damage, triggered: false, incoming: damage, absorbed: 0 };
    const ls = actor?.lifeSave;
    if (!ls || damage <= 0 || actor.hp <= 0 || actor.maxHp <= 0) return empty;
    const wouldDie = actor.hp - damage <= 0;
    let shield;
    let name;
    if (wouldDie && ls.strongLeft > 0) {
      shield = actor.maxHp * 2;
      ls.strongLeft -= 1; ls.strongUsed = (ls.strongUsed || 0) + 1;
      name = ls.strongName;
    } else if (ls.weakLeft > 0 && (wouldDie ||
      (ls.strategy?.stages || defaultStrategy.stages).some(stage =>
        damage > actor.maxHp * stage.damageOverMaxRatio &&
        (stage.hpBelowRatio == null || actor.hp / actor.maxHp < stage.hpBelowRatio)))) {
      shield = actor.maxHp * .2;
      ls.weakLeft -= 1; ls.weakUsed = (ls.weakUsed || 0) + 1;
      name = ls.weakName;
    } else return empty;
    const absorbed = Math.min(shield, damage);
    const finalDamage = damage - absorbed;
    return { damage: finalDamage, triggered: true, skillName: name || '保命',
      absorbPct: finalDamage <= 0 ? 100 : Math.min(99, Math.floor(absorbed / damage * 100)),
      incoming: damage, absorbed };
  }
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true }); },
    defaults, defaultStrategy, load, eligibility, initialize, absorb, strategy, storedStrategy, saveStrategy,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
