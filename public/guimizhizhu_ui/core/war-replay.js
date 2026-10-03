(() => {
  'use strict';
  const KEY = 'cryptLord.warReplay';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  function create(result, report) {
    if (!result || !Array.isArray(result.units) || !Array.isArray(result.events)) throw new Error('缺少可回放的战斗事件');
    const events = result.events.map((event, index) => ({ event, index }))
      .sort((a, b) => (Number(a.event.tick) || 0) - (Number(b.event.tick) || 0) || a.index - b.index)
      .map(item => item.event);
    const starts = new Map();
    for (const event of events) {
      if (event.type === 'spawn') starts.set(event.id, event);
    }
    const units = result.units.map(unit => ({
      id: unit.id, name: unit.name || unit.id, icon: unit.icon || '', team: unit.team,
      x: starts.get(unit.id)?.x ?? unit.x, y: starts.get(unit.id)?.y ?? unit.y,
      hp: unit.initialHp, maxHp: unit.initialHp, shield: 0, pp: 0,
      alive: true, damageDealt: unit.damageDealt || 0, damageTaken: unit.damageTaken || 0,
      kills: unit.kills || 0,
    }));
    const names = new Map(units.map(unit => [unit.id, unit.name]));
    const label = id => names.get(id) || id || '未知';
    const significant = new Set(['death', 'ability', 'heal', 'shield', 'dodge', 'blocked']);
    const highlights = events.filter(event => significant.has(event.type)).map(event => {
      let text = '';
      if (event.type === 'death') text = `${label(event.killerId)} 击溃 ${label(event.id)}`;
      if (event.type === 'ability') text = `${label(event.id)} 发动 ${event.skillName || event.skill || '能力'}`;
      if (event.type === 'heal') text = `${label(event.sourceId)} 治疗 ${label(event.id)} ${event.amount || 0}`;
      if (event.type === 'shield') text = `${label(event.id)} 获得护盾 ${event.amount || 0}`;
      if (event.type === 'dodge') text = `${label(event.id)} 闪避攻击`;
      if (event.type === 'blocked') text = `${label(event.id)} 格挡攻击`;
      return { tick: Number(event.tick) || 0, type: event.type, text };
    });
    const candidates = [];
    const add = (type, event, text, score, team) => {
      candidates.push({ tick: Number(event.tick) || 0, type, text, score, team: team || event.team || '' });
    };
    const deaths = events.filter(event => event.type === 'death');
    const hits = events.filter(event => event.type === 'hit' && Number(event.amount) > 0);
    const maxHp = id => Number(units.find(unit => unit.id === id)?.maxHp) || 1;
    if (deaths.length) {
      const first = deaths[0];
      add('first', first, `首支部队被打垮：${label(first.killerId)} 击溃 ${label(first.id)}`, 78,
        units.find(unit => unit.id === first.killerId)?.team);
      if (deaths.length > 1) {
        const final = deaths.at(-1);
        add('final', final, `${label(final.killerId)} 击溃 ${label(final.id)}，战斗结束`, 76,
          units.find(unit => unit.id === final.killerId)?.team);
      }
    }
    if (result.reason === 'stalemate') add('stale', { tick: result.ticks }, '双方无力再战，战斗以僵局告终', 76);
    for (const death of deaths) {
      const hit = hits.filter(item => item.id === death.id && item.tick <= death.tick).at(-1);
      if (!hit) continue;
      const percent = Math.round(100 * hit.amount / maxHp(death.id));
      if (percent < 25 && hit.cause !== 'ability') continue;
      add('decap', death, `${label(death.killerId)} 一击打垮 ${label(death.id)}，损失其 ${percent}% 兵力`,
        100 + Math.min(20, Math.round(percent / 5)), units.find(unit => unit.id === death.killerId)?.team);
    }
    hits.map(event => ({ event, percent: Math.round(100 * event.amount / maxHp(event.id)) }))
      .filter(item => item.percent >= 20)
      .sort((a, b) => b.percent - a.percent).slice(0, 3)
      .forEach(({ event, percent }) => add('heavy', event,
        `${label(event.sourceId)} 重创 ${label(event.id)}，单次损失 ${percent}% 兵力`,
        65 + Math.min(25, Math.round(percent / 4)), units.find(unit => unit.id === event.sourceId)?.team));
    for (const type of ['blocked', 'dodge']) {
      const grouped = new Map();
      for (const event of events.filter(item => item.type === type)) {
        const previous = grouped.get(event.id);
        if (previous && event.tick - previous.end <= 30) {
          previous.end = event.tick; previous.count += 1;
        } else grouped.set(event.id, { event, end: event.tick, count: 1 });
      }
      for (const run of grouped.values()) {
        if (run.count < (type === 'blocked' ? 2 : 3)) continue;
        add(type, run.event, `${label(run.event.id)} 连续${type === 'blocked' ? '格挡' : '闪避'} ${run.count} 次攻击`,
          type === 'blocked' ? 90 : 80);
      }
    }
    const survivors = new Set(result.units.filter(unit => unit.alive).map(unit => unit.id));
    for (const event of events.filter(item => item.type === 'heal' && survivors.has(item.id))) {
      const before = Math.max(0, Number(event.hp) - Number(event.amount));
      if (before / maxHp(event.id) >= .2 || Number(event.amount) <= 0) continue;
      add('revive', event, `${label(event.sourceId)} 救治 ${label(event.id)}，其兵力从 ${Math.round(100 * before / maxHp(event.id))}% 回升至 ${Math.round(100 * event.hp / maxHp(event.id))}%`, 95);
    }
    const shields = new Map();
    for (const event of events.filter(item => item.type === 'shield' && Number(item.amount) > 0)) {
      const previous = shields.get(event.id) || { event, amount: 0 };
      previous.amount += Number(event.amount);
      shields.set(event.id, previous);
    }
    for (const [id, value] of shields) {
      const taken = hits.filter(item => item.id === id).reduce((sum, item) => sum + Number(item.amount), 0);
      const percent = Math.round(100 * value.amount / (value.amount + taken));
      if (percent >= 15) add('shield', value.event, `${label(id)} 的护盾吸收了所受攻击的 ${percent}%`, 70);
    }
    const caps = { decap: 2, revive: 1, blocked: 1, dodge: 1, first: 1, final: 1, stale: 1, shield: 1, heavy: 2 };
    const sorted = candidates.sort((a, b) => b.score - a.score);
    const picks = [];
    const used = new Map();
    const take = candidate => {
      if (picks.includes(candidate) || (used.get(candidate.type) || 0) >= (caps[candidate.type] || 1)) return false;
      picks.push(candidate);
      used.set(candidate.type, (used.get(candidate.type) || 0) + 1);
      return true;
    };
    for (const team of ['A', 'B']) {
      let quota = 2;
      for (const candidate of sorted.filter(item => item.team === team)) {
        if (quota && picks.length < 8 && take(candidate)) quota -= 1;
      }
    }
    for (const candidate of sorted) {
      if (picks.length >= 8) break;
      take(candidate);
    }
    picks.sort((a, b) => a.tick - b.tick);
    const digest = [
      `【战果】${result.winner === 'A' ? '我方获胜' : result.winner === 'B' ? '我方战败' : '双方平局'} · ${report?.settlement?.duration || ''}`,
      `【兵力】我方 ${units.filter(unit => unit.team === 'A').length} 支参战；敌方 ${units.filter(unit => unit.team === 'B').length} 支参战`,
      '【战场高光】', ...picks.map(item => `第 ${item.tick} 刻｜${item.text}`),
      '【双方终局】',
      ...result.units.map(unit => `${unit.team === 'A' ? '我方' : '敌方'}·${unit.name} ${unit.alive ? `存续，余 ${Math.round(100 * unit.hp / (unit.initialHp || 1))}%` : '已打垮'}`),
    ].join('\n');
    const maxTick = Math.max(0, Number(result.ticks) || 0);
    const settlement = report?.settlement || modules['cryptLord.warSim']?.settlement(result);
    function at(value) {
      const tick = Math.max(0, Math.min(maxTick, Number(value) || 0));
      const state = new Map(units.map(unit => [unit.id, { ...unit }]));
      const recent = [];
      for (const event of events) {
        if ((Number(event.tick) || 0) > tick) break;
        const unit = state.get(event.id);
        if (!unit) continue;
        if (event.type === 'spawn') {
          unit.x = event.x; unit.y = event.y;
          unit.hp = event.hp; unit.maxHp = event.maxHp || unit.maxHp;
        } else if (event.type === 'move' && event.to) {
          unit.x = event.to.x; unit.y = event.to.y;
        } else if (event.type === 'hit' || event.type === 'heal') {
          unit.hp = Math.max(0, Number(event.hp) || 0);
          if (event.shield !== undefined) unit.shield = Number(event.shield) || 0;
          if (event.x !== undefined) { unit.x = event.x; unit.y = event.y; }
        } else if (event.type === 'shield') {
          unit.shield = Number(event.shield) || unit.shield + (Number(event.amount) || 0);
        } else if (event.type === 'death') {
          unit.alive = false; unit.hp = 0;
        }
        if (event.pp !== undefined) unit.pp = Number(event.pp) || 0;
        if (significant.has(event.type) && tick - (Number(event.tick) || 0) <= 12) {
          recent.push({ tick: event.tick, type: event.type, id: event.id });
        }
      }
      return { tick, units: [...state.values()], recent: recent.slice(-8) };
    }
    return Object.freeze({ result, report, settlement, events, highlights, picks, digest, maxTick, at });
  }
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, ready: true }),
    create,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader may have released it. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
