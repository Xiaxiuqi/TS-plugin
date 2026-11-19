(() => {
  'use strict';
  const KEY = 'cryptLord.audienceImaginationState';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const rules = (pool, options = {}) => modules['cryptLord.audienceImaginationReference'].create({ pool, ...options });
  const gate = (data, pool) => rules(pool).resolver.resolve(data).imaginationGate;
  function guard(data) {
    try { modules['cryptLord.marionetteState'].guard(data); }
    catch (error) { throw Error(error.message.replaceAll('秘偶', '空想')); }
  }
  function validate(data) {
    if (!object(data.stat_data)) throw Error('当前楼层没有角色状态');
    const root = data.stat_data.$专属玩法, path = root?.观众途径, play = path?.空想玩法;
    if (root !== undefined && !object(root) || path !== undefined && !object(path) ||
      play !== undefined && (!object(play) || play.版本 !== undefined && ![1, 2].includes(play.版本) ||
        play.空想栏位 !== undefined && !object(play.空想栏位) ||
        play.分离序列1特性 !== undefined && (!object(play.分离序列1特性) ||
          play.分离序列1特性.已使用次数 !== undefined &&
          (!Number.isInteger(play.分离序列1特性.已使用次数) || play.分离序列1特性.已使用次数 < 0))))
      throw Error('空想版本或变量格式无效');
    for (const field of ['序列能力列表', '辅助能力列表', '其他列表'])
      if (data.stat_data[field] !== undefined && !object(data.stat_data[field]))
        throw Error(`${field}格式无效，未修改空想记录`);
    const slots = play?.空想栏位;
    for (const key of ['栏位1', '栏位2'])
      if (slots?.[key] !== undefined && (!object(slots[key]) ||
        slots[key].途径 !== undefined && typeof slots[key].途径 !== 'string'))
        throw Error('空想栏位格式无效');
    for (const [key, row] of Object.entries(data.stat_data.其他列表 || {}))
      if (['__proto__', 'constructor', 'prototype'].includes(key) && row?.名称 === '作家特性')
        throw Error('作家特性物品编号无效');
  }
  function create(data, pool, options = {}) {
    const draft = structuredClone(data), realWindow = options.window || window;
    const locked = options.locked ?? modules['cryptLord.abilityState']?.locked?.(data, realWindow) ??
      (realWindow.localStorage?.getItem('ST_LoM_AbilityLock') === 'true');
    const facade = { document: realWindow.document, confirm: text => realWindow.confirm(text) };
    const original = rules(pool, { window: facade, locked });
    const { core, mode, resolver, sync } = original;
    const state = { values: core.playerSlotValues(draft) };
    mode.scope = options.scope || (() => null);
    mode.valuesFromDom = () => {
      const scope = mode.scope();
      return scope ? [1, 2].map(index => String(scope.querySelector(`[data-imagination-slot="${index}"]`)?.value || '').trim())
        : [...state.values];
    };
    const win = {
      game: { currentMvuState: draft }, isBusy: false,
      actualPlayerSequence: () => core.realSequence(draft),
      esc: value => String(value ?? '').replace(/[&<>"']/g, char =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]),
      msg: options.notice || (() => {}), render: options.render || (() => {}),
      persist() {}, async persistZero() {},
    };
    return {
      data: draft, effects: [], core, mode, win, state,
      render() {
        const preview = structuredClone(draft);
        core.savePlayerSlots(preview, state.values);
        win.game.currentMvuState = preview;
        let html;
        try { html = mode.render(win, resolver.resolve(draft).imaginationGate); }
        finally { win.game.currentMvuState = draft; }
        // Preserve the original controls without nesting decorative cards or importing its theme.
        html = html.replace(/ style="[^"]*"/g, '');
        try { guard(draft); validate(draft); } catch (error) {
          html = `<p class="ppw-warn">${win.esc(error.message)}</p>` + html;
          html = html.replace(/data-ppw="[^"]*"/g, '$& disabled')
            .replace(/<select\b/g, '<select disabled');
        }
        return html;
      },
      async action(act, arg) {
        if (!['save', 'clear-slot', 'separate-writer-trait'].includes(act)) return draft;
        const before = structuredClone(draft), beforeState = structuredClone(state);
        try {
          guard(draft); validate(draft);
          const snapshot = resolver.resolve(draft);
          if (!snapshot.imaginationGate.unlocked) throw Error('当前不具备空想资格');
          const values = mode.valuesFromDom();
          if (act === 'clear-slot') {
            if (![1, 2].includes(Number(arg))) throw Error('空想栏位编号无效');
            values[Number(arg) - 1] = '';
          }
          if (act === 'separate-writer-trait') {
            if (!core.canSeparateWriterTrait(draft, snapshot)) throw Error('序列0或上帝才能分离作家特性');
            const used = core.separationUsedCount(draft);
            if (used >= core.SEPARATION_LIMIT) throw Error('两次永久额度已用尽');
            const confirmed = await (options.confirm || (async text => facade.confirm(text)))(
              `确定分离一份作家特性？本次永久消耗一次额度，删除物品不会返还。完成后剩余 ${1 - used} 次。`);
            if (!confirmed) return draft;
            guard(draft); validate(draft);
            const result = core.separateWriterTrait(draft, resolver.resolve(draft));
            if (!result.ok) throw Error(result.reason);
            win.msg(`已获得作家特性，永久额度 ${result.used}/2。`);
          } else {
            const error = mode.validate(values, snapshot.imaginationGate);
            if (error) throw Error(error);
            core.savePlayerSlots(draft, values);
            sync.syncAll(draft, locked);
            state.values = values;
            win.msg('空想栏位与有效能力已同步。');
          }
          validate(draft);
        } catch (error) {
          for (const key of Object.keys(draft)) delete draft[key];
          Object.assign(draft, before);
          for (const key of Object.keys(state)) delete state[key];
          Object.assign(state, beforeState);
          throw error;
        }
        return draft;
      },
    };
  }
  function initializeTeam(data, battle, pool, random, cached) {
    if (battle.imaginationMeta || !pool?.pathways || !pool?.abilities) return;
    const original = rules(pool, { locked: data.stat_data.序列能力锁定 === true, random });
    const snapshot = original.resolver.resolve(data);
    modules['cryptLord.audienceImagination'].sync(data, pool, data.stat_data.序列能力锁定 === true);
    const cache = new Map();
    for (const [key, row] of Object.entries(cached || {})) {
      if (object(row) && row.baseSequence === data.npc_data?.[key]?.当前序列 &&
        row.projectionRank === original.core.resolveOwnerSequence(row.baseSequence).projectionRank &&
        Array.isArray(row.selections) && Array.isArray(row.abilities))
        cache.set(key, structuredClone(row));
    }
    let changed = false;
    for (const actor of battle.units) {
      if (actor.source === 'player') {
        if (!snapshot.imaginedSelections.length && !snapshot.grazedSelections.length) continue;
        actor.sequence = snapshot.effectiveSequence;
        actor.imagination = { real: snapshot.realSequence, effectiveSequence: snapshot.effectiveSequence,
          imagined: snapshot.imaginedSelections,
          grazed: snapshot.grazedSelections.map(({ name, sequence }) => ({ name, sequence })) };
        changed = true;
      } else if (actor.source === 'npc' && !actor.playSource && !actor.isSummon) {
        const projection = original.core.buildNpcBattleProjection(data.npc_data[actor.id], actor.id, cache);
        if (!projection) continue;
        actor.sequence = projection.effectiveSequence;
        actor.imagination = { effectiveSequence: projection.effectiveSequence,
          imagined: projection.imaginedPathways, abilities: projection.data.能力清单 };
        changed = true;
      }
    }
    if (changed) battle.imaginationMeta = { version: 1, npcCache: Object.fromEntries(cache) };
  }
  function cardFor(data, actor) {
    const card = data.npc_data?.[actor.id];
    return actor.imagination && card ? { ...card, 当前序列: actor.sequence,
      能力清单: actor.imagination.abilities } : card;
  }
  const api = { create, gate, guard, validate, initializeTeam, cardFor,
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
