(() => {
  'use strict';
  const KEY = 'cryptLord.scrollWorkshopState';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const forbidden = name => !String(name || '').trim() || String(name).startsWith('$') ||
    ['__proto__', 'constructor', 'prototype'].includes(String(name));
  const mutations = new Set(['scroll-save', 'scroll-delete', 'scroll-craft']);
  const sequence = (data, pool) => modules['cryptLord.audienceImagination'].resolve(pool, data).effectiveSequence;
  const gate = (data, pool) => modules['cryptLord.scrollWorkshopReference'].create({ pool }).resolve(sequence(data, pool));
  function guard(data) {
    try { modules['cryptLord.marionetteState'].guard(data); }
    catch (error) { throw Error(error.message.replaceAll('秘偶', '卷轴制造')); }
  }
  function create(data, pool, options = {}) {
    const draft = structuredClone(data), realWindow = options.window || window;
    const facade = { document: realWindow.document, crypto: realWindow.crypto,
      confirm: options.confirmSync || (text => realWindow.confirm(text)),
      PlayerProjectionResolver: { resolve: state => ({ effectiveSequence: sequence(state, pool) }) } };
    const mode = modules['cryptLord.scrollWorkshopReference'].create({ pool, window: facade });
    mode.scope = options.scope || (() => null);
    const templates = mode.templates, materials = mode.materials, validate = mode.validateDraft, newId = mode.newId;
    mode.templates = win => templates.call(mode, win).filter(row => !forbidden(row.id) && object(row.data))
      .map(row => ({ ...row, data: row.data.ID ? row.data : { ...row.data, ID: row.id } }));
    mode.materials = win => materials.call(mode, win).filter(row =>
      object(row.item) && Number.isFinite(row.available) && Number.isFinite(Number(row.item.数量)));
    mode.validateDraft = (win, config, id) => {
      const result = validate.call(mode, win, config, id);
      if (forbidden(config?.name)) result.errors.push('样式名称为空或为系统保留键');
      if (config?.extraEffect && !mode.EXTRA_EFFECTS.includes(config.extraEffect))
        result.errors.push('额外效果无效');
      if (id && (!mode.template(win, id) || forbidden(id))) result.errors.push('样式已不存在或ID无效');
      result.valid = result.errors.length === 0;
      return result;
    };
    mode.newId = () => {
      const base = newId.call(mode);
      let id = base, index = 2;
      while (mode.template(win, id)) id = `${base}-${index++}`;
      return id;
    };
    const dice = options.roll || mode.rollD100.bind(mode);
    mode.rollD100 = () => {
      const value = Number(dice());
      if (!Number.isInteger(value) || value < 1 || value > 100) throw Error('D100检定结果无效');
      return value;
    };
    let failure = null;
    const win = {
      game: { currentMvuState: draft }, _modeState: {}, isBusy: false,
      sd: () => draft.stat_data, playerSequence: () => sequence(draft, pool),
      esc: value => String(value ?? '').replace(/[&<>"']/g, char =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]),
      battleOngoing() { try { guard(draft); return false; } catch { return true; } },
      msg(text) {
        if (String(text).startsWith('制造失败，')) failure = Error(text);
        options.notice?.(text, Boolean(failure));
      },
      render: options.render || (() => {}),
      persist() {}, async persistZero() {},
      guardBattleMutation(act) {
        if (mutations.has(act)) {
          guard(draft);
          if (!gate(draft, pool).unlocked) throw Error('当前有效窥秘人序列未达到卷轴制造资格');
        }
        return false;
      },
    };
    const state = mode.state(win);
    return {
      data: draft, effects: [], mode, win, state,
      render() {
        let html = mode.render(win, mode.gate(win));
        html = html.replace(/<p class="ppw-hint">(?:当前制造位阶：|尚未保存卷轴样式。先建立|材料已全部消耗；)[\s\S]*?<\/p>/g, '')
          .replace('强化档位（只显示当前效果实际使用的参数）', '强化档位')
          .replace('已使用最廉价的灵性材料。', '')
          .replace(/；若不需要如此大的产量，优先使用灵性材料。/g, '。');
        try { guard(draft); } catch (error) {
          html = `<p class="ppw-warn">${win.esc(error.message)}</p>` + html;
          html = html.replace(/data-ppw="scroll-(save|delete|craft)"/g, '$& disabled')
            .replace(/<(input|select|textarea)\b/g, '<$1 disabled');
        }
        return html;
      },
      async action(act, arg) {
        const before = structuredClone(draft), beforeState = structuredClone(state);
        failure = null;
        try {
          if (mutations.has(act)) {
            const root = draft.stat_data?.$专属玩法;
            const pathway = root?.窥秘人途径;
            if (root !== undefined && !object(root) || pathway !== undefined && !object(pathway))
              throw Error('专属玩法或窥秘人途径变量格式无效');
            const play = draft.stat_data?.$专属玩法?.窥秘人途径?.卷轴制造玩法;
            if (play !== undefined && (!object(play) ||
              play.版本 !== undefined && play.版本 !== 1 ||
              play.卷轴样式 !== undefined && !object(play.卷轴样式)))
              throw Error('卷轴制造版本或变量格式无效');
            if (play && Object.entries(play.卷轴样式 || {}).some(([id, row]) =>
              id !== '$meta' && (forbidden(id) || !object(row) || row.ID && String(row.ID) !== id)))
              throw Error('卷轴样式ID或记录格式无效');
            if (act === 'scroll-delete' && forbidden(arg)) throw Error('卷轴样式ID无效');
            if (act === 'scroll-craft') {
              for (const key of ['其他列表', '消耗品列表']) {
                if (draft.stat_data[key] !== undefined && !object(draft.stat_data[key]))
                  throw Error(`${key}变量格式无效，未消耗材料`);
              }
              mode.captureManufacture(win);
              for (const [id, quantity] of Object.entries(state.allocations)) {
                if (quantity && (forbidden(id) || !mode.template(win, id)))
                  throw Error('分配的卷轴样式已不存在');
              }
              for (const row of mode.templates(win)) {
                if (!(Number(state.allocations[row.id]) > 0)) continue;
                const check = mode.validateDraft(win, mode.draftFromTemplate(row.data), row.id);
                if (!check.valid) throw Error(check.errors.join('；'));
              }
            }
          }
          await mode.action(win, act, arg);
          if (failure) throw failure;
        } catch (error) {
          // Original craft catches errors after changing dictionaries; restore the complete native draft.
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
