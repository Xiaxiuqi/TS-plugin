(() => {
  'use strict';
  const KEY = 'cryptLord.enhancementState';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const copy = value => structuredClone(value);
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const forbidden = key => !String(key).trim() || String(key).startsWith('$') ||
    ['__proto__', 'constructor', 'prototype'].includes(key);
  const mutations = new Set(['enhance-draw', 'enhance-install', 'enhance-detach', 'enhance-reconcile']);
  const gate = (data, pool) => modules['cryptLord.workshopState'].gate(data, pool);
  function guard(data) {
    try { modules['cryptLord.marionetteState'].guard(data); }
    catch (error) { throw Error(error.message.replaceAll('秘偶', '装备强化')); }
  }
  function validate(data) {
    if (!object(data.stat_data)) throw Error('当前楼层没有角色变量');
    const root = data.stat_data.$专属玩法, pathway = root?.通识者途径, play = pathway?.装备强化玩法;
    if (root !== undefined && !object(root) || pathway !== undefined && !object(pathway) ||
      play !== undefined && (!object(play) || play.版本 !== undefined && play.版本 !== 1 ||
        play.模块仓库 !== undefined && !object(play.模块仓库) ||
        play.抽取统计 !== undefined && !object(play.抽取统计))) throw Error('装备强化版本或存档格式无效');
    for (const [key, row] of Object.entries(play?.模块仓库 || {})) {
      if (key === '$meta') continue;
      if (forbidden(key) || !object(row) || row.六维比例 !== undefined && !object(row.六维比例) ||
        row.安装位置 != null && (!object(row.安装位置) || forbidden(row.安装位置.物品键 || '') ||
          !['武器列表', '衣物列表', '饰品列表', '封印物列表'].includes(row.安装位置.列表键)))
        throw Error('强化模块编号或安装记录无效');
      if (row.卸下次数 !== undefined && (!Number.isInteger(row.卸下次数) || row.卸下次数 < 0))
        throw Error('卸下次数无效');
      if (Object.values(row.六维比例 || {}).some(value => !Number.isFinite(Number(value))))
        throw Error('模块属性比例无效');
    }
    for (const [key, value] of Object.entries(play?.抽取统计 || {})) {
      if (['周期抽数', '总抽数', '周期材料总分'].includes(key) &&
        (!Number.isFinite(value) || value < 0 || key !== '周期材料总分' && !Number.isInteger(value)))
        throw Error('模块抽取统计无效');
    }
    for (const key of ['武器列表', '衣物列表', '饰品列表', '封印物列表']) {
      const list = data.stat_data[key];
      if (list !== undefined && !object(list)) throw Error(`${key}格式无效`);
      for (const [id, item] of Object.entries(list || {})) {
        if (id === '$meta') continue;
        if (forbidden(id)) throw Error('装备编号为系统保留键');
        if (!object(item)) continue;
        for (const stat of ['活力', '灵性', '理智', '人性', '敏捷', '运气'])
          if (item[stat] !== undefined && !Number.isFinite(Number(item[stat])))
            throw Error('装备属性必须为有限数值');
        const install = item.$强化模块安装;
        if (install !== undefined && (!object(install) || forbidden(install.模块ID || '') ||
          install.属性增量 !== undefined && (!object(install.属性增量) ||
            Object.values(install.属性增量).some(value => !Number.isFinite(Number(value))))))
          throw Error('装备强化安装增量无效');
      }
    }
  }
  function create(data, pool, options = {}) {
    const draft = copy(data), realWindow = options.window || window;
    const material = modules['cryptLord.workshopState'].create(draft, pool, options).mode;
    const facade = { document: realWindow.document, crypto: realWindow.crypto,
      confirm: options.confirmSync || (text => realWindow.confirm(text)) };
    const reference = modules['cryptLord.enhancementReference'].create({
      window: facade, material, random: options.random, scope: options.scope || (() => null),
    });
    const mode = reference.mode;
    const originalRows = mode.equipmentRows, originalModules = mode.modules;
    const findEquipment = mode.findEquipment;
    mode.findEquipment = (data, listKey, itemKey) => mode.EQUIPMENT_CATS.some(row => row.key === listKey) &&
      !forbidden(itemKey || '') && Object.hasOwn(data.stat_data?.[listKey] || {}, itemKey)
      ? findEquipment.call(mode, data, listKey, itemKey) : null;
    mode.equipmentRows = data => originalRows.call(mode, data).filter(row => !forbidden(row.itemKey));
    mode.modules = data => originalModules.call(mode, data).filter(row => !forbidden(row.id));
    // Random draws may share the same millisecond. Avoid an unbounded collision loop.
    const originalId = mode.moduleId;
    let serial = 0;
    mode.moduleId = () => `${originalId.call(mode)}-${(++serial).toString(36)}`;
    let failure = '';
    const win = {
      game: { currentMvuState: draft }, _modeState: {}, isBusy: false,
      playerSequence: () => modules['cryptLord.audienceImagination'].resolve(pool, draft).effectiveSequence,
      esc: value => String(value ?? '').replace(/[&<>"']/g, char =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]),
      msg(text) {
        if (/^(抽取失败|安装未能落盘|卸下未能落盘)/.test(text)) failure = text;
        options.notice?.(text);
      },
      render: options.render || (() => {}), persist() {}, async persistZero() {},
      guardBattleMutation(act) {
        if (mutations.has(act)) {
          guard(draft); validate(draft);
          if (act !== 'enhance-reconcile' && !gate(draft, pool).unlocked)
            throw Error('当前有效通识者序列不满足装备强化资格');
        }
        return false;
      },
    };
    const state = mode.state(win);
    return {
      data: draft, effects: [], mode, win, state, weapon: reference.weapon,
      render() {
        // Original render repairs references and persists. Keep native opening a pure read.
        const probe = copy(draft), needsRepair = mode.reconcile(probe);
        let html = state.view === 'detail' ? mode.renderDetail(win) : mode.renderMain(win);
        html = html.replace(/ style="[^"]*"/g, '');
        if (needsRepair) html = '<p class="ppw-warn">装备与模块引用不一致。</p>' +
          '<button type="button" data-ppw="enhance-reconcile">修复模块引用</button>' + html;
        try { guard(draft); validate(draft); } catch (error) {
          html = `<p class="ppw-warn">${win.esc(error.message)}</p>` + html;
          html = html.replace(/data-ppw="enhance-(draw|install|detach|reconcile)"/g, '$& disabled');
        }
        return html;
      },
      async action(act, arg) {
        const before = copy(draft), beforeState = copy(state);
        failure = '';
        try {
          if (mutations.has(act)) {
            win.guardBattleMutation(act);
            if (['enhance-install', 'enhance-detach'].includes(act) && forbidden(state.moduleId || ''))
              throw Error('强化模块编号无效');
            if (act === 'enhance-draw') {
              const materialPlay = draft.stat_data.$专属玩法?.通识者途径?.材料加工玩法;
              if (materialPlay?.版本 !== undefined && materialPlay.版本 !== 1)
                throw Error('不支持此材料仓库版本');
              const quantity = Number(mode.scope()?.querySelector('[data-enhance-draw-qty]')?.value || 1);
              if (!Number.isSafeInteger(quantity) || quantity < 1) throw Error('抽取数量必须为正整数');
              const group = material.materialGroup(draft, state.materialSignature);
              if (!group || quantity > Math.floor(group.qty + 1e-6)) throw Error('材料数量不足');
              const source = material.playStore(draft, false);
              if (!object(source?.bag) || Object.entries(source.bag).some(([id, row]) => id !== '$meta' &&
                (forbidden(id) || !object(row) || !Number.isFinite(Number(row.数量)) || Number(row.数量) < 0)))
                throw Error('材料仓库数量或编号无效');
            }
            if (act !== 'enhance-reconcile' && mode.reconcile(copy(draft)))
              throw Error('请先修复装备与模块引用');
          }
          if (act === 'enhance-open' && forbidden(arg || '')) throw Error('强化模块编号无效');
          if (act === 'enhance-reconcile') mode.reconcile(draft);
          else await mode.action(win, act, arg);
          if (failure) throw Error(failure);
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
  const api = { create, gate, guard, validate, status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
