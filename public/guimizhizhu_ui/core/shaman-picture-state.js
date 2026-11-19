(() => {
  'use strict';
  const KEY = 'cryptLord.shamanPictureState';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const reserved = key => !String(key || '').trim() || String(key).startsWith('$') ||
    ['__proto__', 'prototype', 'constructor'].includes(String(key));
  const sequence = (data, pool) => modules['cryptLord.audienceImagination'].resolve(pool, data).effectiveSequence;
  const gate = (data, pool) => modules['cryptLord.shamanPictureReference'].create({ pool }).resolve(sequence(data, pool));
  function guard(data) {
    try { modules['cryptLord.marionetteState'].guard(data); }
    catch (error) { throw Error(error.message.replaceAll('秘偶', '画中人')); }
  }
  function validate(data) {
    if (!object(data.stat_data)) throw Error('当前楼层没有角色状态');
    const root = data.stat_data.$专属玩法, path = root?.萨满途径, play = path?.制造画中人玩法;
    if (root !== undefined && !object(root) || path !== undefined && !object(path) ||
      play !== undefined && (!object(play) || play.版本 !== undefined && play.版本 !== 1 ||
        play.画中人列表 !== undefined && !object(play.画中人列表)))
      throw Error('画中人玩法版本或变量格式无效');
    for (const [id, row] of Object.entries(play?.画中人列表 || {})) {
      if (id === '$meta') continue;
      if (reserved(id) || !object(row) || !object(row.角色卡) || row.ID && String(row.ID) !== id)
        throw Error('画中人ID或角色卡格式无效');
    }
    if (data.stat_data.其他列表 !== undefined && !object(data.stat_data.其他列表))
      throw Error('其他列表格式无效，未消耗材料');
  }
  function create(data, pool, options = {}) {
    const draft = structuredClone(data), realWindow = options.window || window;
    const facade = { document: realWindow.document, crypto: realWindow.crypto,
      confirm: options.confirmSync || (text => realWindow.confirm(text)),
      PlayerProjectionResolver: { resolve: data => ({ effectiveSequence: sequence(data, pool) }) } };
    const mode = modules['cryptLord.shamanPictureReference'].create({
      pool, window: facade, random: options.random });
    mode.scope = options.scope || (() => null);
    const materials = mode.materials, records = mode.recordsOfState, newId = mode.newId;
    mode.materials = win => materials.call(mode, win).filter(row =>
      !reserved(row.key) && object(row.item) && Number.isFinite(Number(row.item.数量)) &&
      Number.isFinite(row.available) && Number.isFinite(row.perUnit));
    mode.recordsOfState = data => records.call(mode, data).filter(row => !reserved(row.id))
      .map(row => ({ ...row, data: structuredClone(row.data) }));
    mode.newId = () => {
      const base = newId.call(mode);
      let id = base, index = 2;
      while (Object.hasOwn(mode.store(draft, false)?.list || {}, id)) id = `${base}-${index++}`;
      return id;
    };
    let failure = null;
    const win = {
      game: { currentMvuState: draft,
        showConfirmModal: options.confirm || (async text => facade.confirm(text)) },
      _modeState: {}, isBusy: false, sd: () => draft.stat_data,
      playerSequence: () => sequence(draft, pool),
      esc: value => String(value ?? '').replace(/[&<>"']/g, char =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]),
      msg(text) {
        if (String(text).startsWith('制造失败，')) failure = Error(text);
        options.notice?.(text, Boolean(failure));
      },
      render: options.render || (() => {}),
      persist() {}, async persistZero() {},
      guardBattleMutation(act) {
        if (act === 'picture-craft') {
          guard(draft);
          if (!gate(draft, pool).unlocked) throw Error('当前有效萨满序列不具备制造画中人的资格');
        }
        return false;
      },
    };
    const state = mode.state(win);
    return {
      data: draft, effects: [], mode, win, state,
      render() {
        let html = mode.render(win, mode.gate(win));
        html = html.replace('目标途径（位阶固定为当前萨满位阶）', '目标途径');
        try { guard(draft); } catch (error) {
          html = `<p class="ppw-warn">${win.esc(error.message)}</p>` + html;
          html = html.replace(/data-ppw="picture-craft"/g, '$& disabled')
            .replace(/<(input|select)\b/g, '<$1 disabled');
        }
        return html;
      },
      async action(act, arg) {
        const before = structuredClone(draft), beforeState = structuredClone(state);
        failure = null;
        try {
          if (act === 'picture-craft') {
            validate(draft);
            for (const [key, value] of Object.entries(state.materialQty)) {
              if (!Number.isFinite(Number(value)) || Number(value) < 0 || !Number.isInteger(Number(value)) ||
                Number(value) > 0 && (reserved(key) || !mode.materials(win).some(row => row.key === key &&
                  Number(value) <= row.available)))
                throw Error('材料选择已变化或数量无效，未消耗材料');
            }
          }
          await mode.action(win, act, arg);
          if (failure) throw failure;
          if (act === 'picture-craft' && JSON.stringify(before) !== JSON.stringify(draft)) {
            validate(draft);
            for (const row of mode.recordsOfState(draft)) {
              if (!['活力', '敏捷', '灵性', '理智', '人性', '运气'].every(key =>
                Number.isFinite(Number(row.data[key])) && Number(row.data[key]) > 0))
                throw Error('画中人六维属性无效，未消耗材料');
            }
          }
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
  const api = { create, gate, guard, status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
