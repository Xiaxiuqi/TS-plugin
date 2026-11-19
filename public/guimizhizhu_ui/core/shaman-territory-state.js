(() => {
  'use strict';
  const KEY = 'cryptLord.shamanTerritoryState';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const reserved = key => !String(key || '').trim() || String(key).startsWith('$') ||
    ['__proto__', 'prototype', 'constructor'].includes(String(key));
  const reference = pool => modules['cryptLord.shamanTerritoryReference'].create({ pool });
  const sequence = (data, pool) => modules['cryptLord.audienceImagination'].resolve(pool, data).effectiveSequence;
  const gate = (data, pool) => reference(pool).core.resolve(sequence(data, pool));
  function guard(data) {
    try { modules['cryptLord.marionetteState'].guard(data); }
    catch (error) { throw Error(error.message.replaceAll('秘偶', '领地图腾')); }
  }
  function validate(data) {
    if (!object(data.stat_data)) throw Error('当前楼层没有角色状态');
    const root = data.stat_data.$专属玩法, path = root?.萨满途径, play = path?.设置领地图腾玩法;
    if (root !== undefined && !object(root) || path !== undefined && !object(path) ||
      play !== undefined && (!object(play) || play.版本 !== undefined && play.版本 !== 1 ||
        play.领地半径公里 !== undefined && (!Number.isFinite(Number(play.领地半径公里)) ||
          Number(play.领地半径公里) < 0)))
      throw Error('领地图腾版本或变量格式无效');
    if (data.stat_data.其他列表 !== undefined && !object(data.stat_data.其他列表))
      throw Error('其他列表格式无效，未消耗材料');
  }
  function sync(data, pool) {
    if (!data?.stat_data?.$专属玩法?.萨满途径?.设置领地图腾玩法) return false;
    validate(data);
    return reference(pool).core.syncRadius(data, sequence(data, pool));
  }
  function create(data, pool, options = {}) {
    const draft = structuredClone(data), realWindow = options.window || window;
    const facade = { document: realWindow.document,
      confirm: options.confirmSync || (text => realWindow.confirm(text)) };
    const { core, mode } = modules['cryptLord.shamanTerritoryReference'].create({ pool, window: facade });
    mode.scope = options.scope || (() => null);
    const materials = mode.eligibleMaterials;
    mode.eligibleMaterials = (win, access) => materials.call(mode, win, access).filter(row =>
      !reserved(row.key) && object(row.item) && Number.isFinite(Number(row.item.数量)) &&
      Number.isFinite(row.available) && Number.isFinite(row.perUnit));
    let evidenceSnapshot = null;
    async function verifyEvidence() {
      if (!evidenceSnapshot || !options.freshEvidenceList) return;
      const fresh = await options.freshEvidenceList();
      const byId = new Map(fresh.map(row => [row.序号, JSON.stringify(row)]));
      if (evidenceSnapshot.some(row => byId.get(row.序号) !== JSON.stringify(row)))
        throw Error('用于认证的原生历史楼层已变化，请重新读取');
    }
    const win = {
      game: { currentMvuState: draft,
        showConfirmModal: options.confirm || (async text => facade.confirm(text)) },
      _modeState: {}, isBusy: false, sd: () => draft.stat_data,
      playerSequence: () => sequence(draft, pool),
      esc: value => String(value ?? '').replace(/[&<>"']/g, char =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]),
      msg: options.notice || (() => {}), render: options.render || (() => {}),
      persist() {}, async persistZero() {}, ensureApiReady: () => true,
      async callRaw(system, user) {
        evidenceSnapshot = options.evidenceList ? structuredClone(await options.evidenceList()) : null;
        const reply = await modules['cryptLord.marionetteState'].request(
          system, user, options.evidence || options.message || '',
          `<玩家资料>\n${JSON.stringify({ 名称: draft.stat_data.名称 || draft.stat_data.姓名 || '',
            当前序列: win.playerSequence(), 当前时间纪元: draft.world_data?.当前时间纪元 || '' })}\n</玩家资料>`, options);
        await verifyEvidence();
        return reply;
      },
    };
    const state = mode.state(win);
    return {
      data: draft, effects: [], core, mode, win, state, verifyEvidence,
      render() {
        // Original render grows the radius; render a disposable copy, never mutate the native draft.
        win.game.currentMvuState = structuredClone(draft);
        let html;
        try { html = mode.render(win, mode.gate(win)); }
        finally { win.game.currentMvuState = draft; }
        const preview = structuredClone(draft);
        if (core.syncRadius(preview, win.playerSequence()))
          html += '<div class="ppw-actions"><button type="button" data-ppw="shaman-sync-radius">更新领地半径</button></div>';
        html = html.replace(/ placeholder="输入需要认证的具体地点"/g, '')
          .replace('材料识别、位阶和换算完全沿用卷轴制造玩法。', '');
        try { guard(draft); } catch (error) {
          html = `<p class="ppw-warn">${win.esc(error.message)}</p>` + html;
          html = html.replace(/data-ppw="shaman-(certify|sync-radius)"/g, '$& disabled')
            .replace(/<(input|select)\b/g, '<$1 disabled');
        }
        return html;
      },
      async action(act) {
        if (!['shaman-certify', 'shaman-sync-radius'].includes(act)) return draft;
        const before = structuredClone(draft), beforeState = structuredClone(state);
        evidenceSnapshot = null;
        try {
          guard(draft); validate(draft);
          if (!gate(draft, pool).unlocked) throw Error('当前有效萨满序列不具备领地图腾资格');
          if (act === 'shaman-sync-radius') { sync(draft, pool); return draft; }
          mode.capture(win);
          if (core.hasTerritory(core.record(draft, false))) {
            for (const [key, value] of Object.entries(state.materialQty)) {
              if (!Number.isFinite(Number(value)) || Number(value) < 0 || !Number.isInteger(Number(value)) ||
                Number(value) > 0 && (reserved(key) || !mode.eligibleMaterials(win).some(row =>
                  row.key === key && Number(value) <= row.available)))
                throw Error('材料选择已变化或数量无效，未消耗材料');
            }
          }
          await mode.action(win, act);
          if (state.result?.reason?.startsWith('操作失败：')) throw Error(state.result.reason);
          validate(draft);
        } catch (error) {
          for (const key of Object.keys(draft)) delete draft[key];
          Object.assign(draft, before);
          for (const key of Object.keys(state)) delete state[key];
          Object.assign(state, beforeState);
          evidenceSnapshot = null;
          throw error;
        }
        return draft;
      },
    };
  }
  const api = { create, gate, guard, sync, status: () => ({ mounted: true }),
    dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
