(() => {
  'use strict';
  const KEY = 'cryptLord.materialProcessingState';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const copy = value => structuredClone(value);
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const forbidden = key => !String(key).trim() || String(key).startsWith('$') ||
    ['__proto__', 'constructor', 'prototype'].includes(key);
  const actions = new Set(['material-select', 'material-back', 'material-recognize',
    'material-target', 'material-process-back', 'material-skip', 'material-settle',
    'material-next', 'material-clear-queue']);
  const gate = (data, pool) => modules['cryptLord.workshopState'].gate(data, pool);
  function guard(data) {
    try { modules['cryptLord.marionetteState'].guard(data); }
    catch (error) { throw Error(error.message.replaceAll('秘偶', '材料加工')); }
  }
  function validate(data) {
    if (!object(data?.stat_data)) throw Error('当前楼层没有角色变量');
    const root = data.stat_data.$专属玩法, pathway = root?.通识者途径, play = pathway?.材料加工玩法;
    if (root !== undefined && !object(root) || pathway !== undefined && !object(pathway) ||
      play !== undefined && (!object(play) || play.版本 !== undefined && play.版本 !== 1 ||
        play.材料仓库 !== undefined && !object(play.材料仓库)))
      throw Error('材料加工版本或仓库格式无效');
    for (const [id, row] of Object.entries(play?.材料仓库 || {})) {
      if (id === '$meta') continue;
      if (forbidden(id) || !object(row) || !Number.isFinite(Number(row.数量)) || Number(row.数量) < 0)
        throw Error('材料仓库编号或数量无效');
    }
  }
  function create(data, pool, options = {}) {
    const session = modules['cryptLord.workshopState'].create(data, pool, options);
    const { mode, win, state, data: draft } = session;
    const originalAction = session.action;
    state.evidenceSnapshot = null;
    session.verifyEvidence = async () => {
      if (!state.evidenceSnapshot || !options.freshEvidenceList) return;
      const fresh = await options.freshEvidenceList();
      const byId = new Map(fresh.map(row => [row.序号, JSON.stringify(row)]));
      if (state.evidenceSnapshot.some(row => byId.get(row.序号) !== JSON.stringify(row)))
        throw Error('认定所依据的历史楼层已变化，请重新认定');
    };
    const callRaw = win.callRaw;
    win.callRaw = async (system, user) => {
      state.evidenceSnapshot = options.evidenceList ? copy(await options.evidenceList()) : null;
      const reply = await callRaw(system, user);
      await session.verifyEvidence();
      return reply;
    };
    const originalItems = mode.itemSources;
    mode.itemSources = win => originalItems.call(mode, win).filter(row => Number.isFinite(row.available));
    const originalCollect = mode.collectSources;
    mode.collectSources = win => {
      const picked = originalCollect.call(mode, win);
      // Do not silently turn NaN/Infinity input into consuming the entire source.
      mode.scope()?.querySelectorAll('[data-material-source]').forEach(element => {
        if (!element.querySelector('.ppw-material-source-cb')?.checked) return;
        const input = element.querySelector('.ppw-material-source-qty');
        if (input && (!input.value.trim() || !Number.isFinite(Number(input.value)) || Number(input.value) <= 0))
          throw Error('投入数量必须为有限正数');
      });
      return picked;
    };
    const originalId = mode.batchId;
    let serial = 0;
    mode.batchId = () => {
      const base = originalId.call(mode), bag = mode.playStore(draft, false)?.bag || {};
      let id;
      do { id = `${base}-${(++serial).toString(36)}`; } while (Object.hasOwn(bag, id));
      return id;
    };
    if (options.roll) mode.rollD100 = options.roll;
    mode.renderMain = (win, _access, locked) => `<section>
      <div class="ppw-row"><b>材料仓库</b><button type="button" class="ppw-btn"
        data-ppw="material-select"${locked ? ' disabled' : ''}>选择来源加工</button></div>
      ${mode.warehouseHtml(win)}</section>`;
    session.render = () => {
      let problem = '';
      try { guard(draft); validate(draft); } catch (error) { problem = error.message; }
      let html = problem ? mode.renderMain(win, gate(draft, pool), true) : mode.render(win, gate(draft, pool));
      html = html.replace(/ style="[^"]*"/g, '');
      if (problem) html = `<p class="ppw-warn">${win.esc(problem)}</p>` +
        html.replace(/data-ppw="material-(select|recognize|settle)"/g, '$& disabled');
      return html;
    };
    session.action = async (act, arg) => {
      if (!actions.has(act)) throw Error('材料加工不支持此操作');
      const before = copy(draft), beforeState = copy(state);
      try {
        if (['material-recognize', 'material-settle'].includes(act)) {
          guard(draft); validate(draft);
          if (!gate(draft, pool).unlocked) throw Error('当前有效通识者序列不满足材料加工资格');
        }
        if (act === 'material-settle') await session.verifyEvidence();
        if (act === 'material-target' && (!Number.isInteger(Number(arg)) || Number(arg) < 0))
          throw Error('候选材质编号无效');
        // Settlement is a one-shot action, even if invoked outside the visible button.
        if (act === 'material-settle' && state.view !== 'process') throw Error('请先选择本项加工材质');
        if (act === 'material-settle') {
          const operations = mode.readOperations();
          if (operations.some(value => !mode.OPERATIONS.includes(value))) throw Error('加工工序不在原版白名单');
        }
        await originalAction(act, arg);
        if (act === 'material-clear-queue') state.evidenceSnapshot = null;
        if (['material-recognize', 'material-settle'].includes(act)) validate(draft);
      } catch (error) {
        for (const key of Object.keys(draft)) delete draft[key];
        Object.assign(draft, before);
        for (const key of Object.keys(state)) delete state[key];
        Object.assign(state, beforeState);
        throw error;
      }
      return draft;
    };
    return session;
  }
  const api = { create, gate, guard, validate, status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
