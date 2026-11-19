(() => {
  'use strict';
  const KEY = 'cryptLord.cloneState';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const native = modules['cryptLord.marionetteState'];
  const forbidden = name => !String(name || '').trim() || String(name).startsWith('$') ||
    ['__proto__', 'constructor', 'prototype'].includes(name);
  function gate(data, pool) { return native.gate(data, pool, 'clone'); }
  function guard(data) {
    try { native.guard(data); }
    catch (error) { throw Error(error.message.replaceAll('秘偶', '分身')); }
  }
  function create(data, pool, options = {}) {
    const session = native.create(data, pool, options, {
      reference: modules['cryptLord.cloneReference'], source: 'clone',
      label: '分身', renameKey: 'renameClone',
    });
    const { mode, win } = session;
    const materials = mode.materials;
    mode.materials = game => materials.call(mode, game).filter(row => {
      const item = game.currentMvuState.stat_data[row.listKey]?.[row.itemKey];
      return !forbidden(row.itemKey) && !item?.$强化模块安装?.模块ID &&
        (!Object.hasOwn(item, '数量') || Number(item.数量) >= 1);
    }).map((row, idx) => ({ ...row, idx }));
    const consume = mode.consume;
    mode.consume = (game, pick) => {
      const item = game.currentMvuState.stat_data[pick.listKey]?.[pick.itemKey];
      if (!item || item.$强化模块安装?.模块ID || !Number.isInteger(pick.份数) || pick.份数 < 1 ||
        Object.hasOwn(item, '数量') && pick.份数 > Number(item.数量) ||
        !Object.hasOwn(item, '数量') && pick.份数 !== 1)
        throw Error('材料数量或强化模块状态无效，未制造分身');
      return consume.call(mode, game, pick);
    };
    const sequenceOf = mode.seqStringOf;
    mode.seqStringOf = rank => {
      const sequence = sequenceOf.call(mode, rank);
      const library = pool.pathways?.偷盗者途径 || pool.pathways?.偷盗者 || [];
      if (!library.includes(sequence)) throw Error(`途径库缺少偷盗者序列${rank}，材料未消耗`);
      return sequence;
    };
    const uniqueName = mode.uniqueName;
    mode.uniqueName = (game, base) => {
      if (forbidden(base)) throw Error('无效分身名称');
      return uniqueName.call(mode, { currentMvuState: { ...game.currentMvuState,
        npc_data: { ...mode.npcPool(game), ...mode.relPool(game) } } }, base);
    };
    const prompt = win.game.showPromptModal;
    win.game.showPromptModal = async (...args) => {
      const value = await prompt(...args);
      if (value != null && (forbidden(String(value).trim()) ||
        Object.hasOwn(mode.relPool(win.game), String(value).trim())))
        throw Error('名称为系统保留键或已被人物关系列表占用');
      return value;
    };
    const action = session.action;
    session.action = async (act, arg) => {
      const before = JSON.stringify(session.data);
      const beforeState = structuredClone(session.state);
      const effectsCount = session.effects.length;
      session.state.lastError = '';
      try {
        await action(act, arg);
        if (session.state.lastError && JSON.stringify(session.data) !== before)
          throw Error(`${session.state.lastError}；本次草稿未提交`);
      } catch (error) {
        for (const key of Object.keys(session.data)) delete session.data[key];
        Object.assign(session.data, JSON.parse(before));
        for (const key of Object.keys(session.state)) delete session.state[key];
        Object.assign(session.state, beforeState);
        session.effects.splice(effectsCount);
        throw error;
      }
      return session.data;
    };
    return session;
  }
  const api = { create, gate, guard, status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
