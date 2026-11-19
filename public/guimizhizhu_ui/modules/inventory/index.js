(() => {
  'use strict';
  const KEY = 'cryptLord.inventoryUi', root = window.cryptLord;
  const contract = root?.contract, modules = root?.__stage1Modules;
  const service = modules?.['cryptLord.inventoryState'], after = modules?.['cryptLord.afterNativeHost'];
  if (!contract || !service || !after) throw Error('物品栏界面依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const state = { panel: null, token: 0, disposed: false, busy: false, messageId: null,
    loaded: null, batch: false, selected: new Map(), gift: null, itemPreview: null, focus: null, subscriptions: [], stale: false,
    session: 0, pending: null, generating: false };
  const doc = () => after.getHost()?.document || document;
  const element = (tag, className = '', text) => {
    const node = doc().createElement(tag); node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const current = () => !state.disposed && modules[KEY] === api && modules['cryptLord.inventoryState'] === service &&
    modules['cryptLord.afterNativeHost'] === after && state.panel?.ownerDocument === doc() && state.panel?.dataset.open === 'true';
  const active = token => current() && token === state.token;
  const sessionGuard = () => { const session = state.session; return () => current() && session === state.session && !state.generating; };
  const keyOf = row => `${row.listKey}\0${row.itemKey}`;
  function button(label, icon, action, compact = false) {
    const node = element('button'); node.type = 'button'; node.title = label; node.setAttribute('aria-label', label);
    const symbol = element('i', `fa-solid ${icon}`); symbol.setAttribute('aria-hidden', 'true'); node.append(symbol);
    if (compact) node.dataset.fallback = icon === 'fa-xmark' ? '\u00d7' : '\u21bb';
    if (!compact) node.append(element('span', '', label));
    node.addEventListener('click', action); return node;
  }
  function close(force = false) {
    if (!force && state.pending && !doc().defaultView.confirm('关闭将放弃本次待保存结果；若已发出保存，请再次打开后核对实际楼层。确定关闭？')) return;
    state.token++; state.session++; state.pending = null; state.busy = false; state.panel?.setAttribute('data-open', 'false');
    state.selected.clear(); state.batch = false; state.gift = null; state.itemPreview = null;
    if (state.focus?.isConnected) state.focus.focus(); state.focus = null;
  }
  function mount() {
    if (state.disposed) return false;
    if (state.panel) return true;
    const panel = element('section', 'crypt-lord-inventory');
    panel.dataset.open = 'false'; panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', '物品栏');
    const header = element('header'), tools = element('div', 'crypt-lord-inventory__tools');
    tools.append(button('重新读取', 'fa-rotate-right', () => void reload(true), true), button('关闭', 'fa-xmark', () => close(), true));
    header.append(element('strong', '', '物品栏'), tools);
    state.status = element('p', 'crypt-lord-inventory__status'); state.status.setAttribute('role', 'status');
    const recovery = element('div', 'crypt-lord-inventory__recovery'), main = element('main'), fieldset = element('fieldset');
    main.append(fieldset); panel.append(header, state.status, recovery, main); doc().body.append(panel);
    Object.assign(state, { panel, fieldset, recovery });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
      if (event.key !== 'Tab') return;
      const nodes = [...panel.querySelectorAll('button,input,select,textarea,summary,[tabindex="0"]')]
        .filter(node => !node.matches(':disabled') && node.getClientRects().length && node.checkVisibility());
      const first = nodes[0], last = nodes.at(-1);
      if (!first) { event.preventDefault(); panel.focus(); }
      else if (event.shiftKey && [first, panel].includes(doc().activeElement)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && [last, panel].includes(doc().activeElement)) { event.preventDefault(); first.focus(); }
    });
    let drag = null;
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const rect = panel.getBoundingClientRect(); drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      header.setPointerCapture?.(event.pointerId);
    });
    header.addEventListener('pointermove', event => {
      if (!drag) return;
      const view = doc().defaultView;
      panel.style.left = `${Math.max(8, Math.min(view.innerWidth - panel.offsetWidth - 8, drag.left + event.clientX - drag.x))}px`;
      panel.style.top = `${Math.max(8, Math.min(view.innerHeight - panel.offsetHeight - 8, drag.top + event.clientY - drag.y))}px`;
      panel.style.transform = 'none';
    });
    for (const name of ['pointerup', 'pointercancel']) header.addEventListener(name, () => { drag = null; });
    const events = after.tavernEvents();
    if (events?.CHAT_CHANGED) state.subscriptions.push(after.bindEvent(events.CHAT_CHANGED, () => {
      close(true); state.loaded = null; state.messageId = null; state.generating = false;
    }));
    if (events?.GENERATION_STARTED) state.subscriptions.push(after.bindEvent(events.GENERATION_STARTED, (type, options, dryRun) => {
      if (['quiet', 'quiet_prompt', 'dryRun'].includes(type) || options?.quiet_prompt || options?.dryRun || dryRun) return;
      state.generating = true; state.session++; state.token++; state.busy = false; state.stale = true;
      if (state.panel.dataset.open === 'true') { state.status.textContent = '正在生成，已取消旧操作；草稿保留，结束后请重新读取'; render(); }
    }));
    for (const event of new Set([events?.GENERATION_ENDED, events?.GENERATION_STOPPED].filter(Boolean)))
      state.subscriptions.push(after.bindEvent(event, () => { state.generating = false; if (state.panel.dataset.open === 'true') render(); }));
    for (const name of new Set([events?.MESSAGE_UPDATED, events?.MESSAGE_DELETED, events?.MESSAGE_SWIPED, events?.CHARACTER_MESSAGE_RENDERED].filter(Boolean))) {
      state.subscriptions.push(after.bindEvent(name, () => {
        if (state.panel.dataset.open !== 'true' || state.busy) return;
        if (state.selected.size || state.itemPreview || state.gift || state.pending) {
          state.stale = true; state.status.textContent = '楼层已更新，请重新读取'; render();
        } else void reload();
      }));
    }
    return true;
  }
  function fields(parent, entries) {
    if (!entries?.length) return;
    const list = element('dl');
    for (const [name, value] of entries) list.append(element('dt', '', name), element('dd', '', typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)));
    parent.append(list);
  }
  function countSelection() {
    const count = state.fieldset.querySelector('[data-selection-count]');
    if (count) count.textContent = `已选 ${state.selected.size} 项`;
    const remove = state.fieldset.querySelector('[aria-label="删除选中"]');
    if (remove) remove.disabled = !state.selected.size || state.stale;
    const selectAll = state.fieldset.querySelector('[aria-label="全选"]');
    const checkboxes = [...state.fieldset.querySelectorAll('[data-select-item]:not(:disabled)')];
    if (selectAll) {
      selectAll.checked = checkboxes.length > 0 && checkboxes.every(node => node.checked);
      selectAll.indeterminate = checkboxes.some(node => node.checked) && !selectAll.checked;
    }
  }
  function render() {
    state.recovery.replaceChildren();
    const pending = state.pending, phase = pending?.transaction.status();
    if (pending) {
      const retry = button(phase === 'uncertain' ? '核对保存' : '重试保存', phase === 'uncertain' ? 'fa-magnifying-glass' : 'fa-floppy-disk',
        () => void recover());
      retry.disabled = state.busy || state.stale || !['pending', 'uncertain'].includes(phase);
      state.recovery.append(retry, button('放弃结果并重新读取', 'fa-rotate-right', () => void reload(true)));
      state.recovery.lastChild.disabled = state.busy || state.generating;
    }
    state.panel.querySelector('header [aria-label="重新读取"]').disabled = state.busy || state.generating;
    state.fieldset.replaceChildren(); state.fieldset.disabled = state.busy || Boolean(pending) || state.generating;
    if (!state.loaded) { state.fieldset.append(element('p', '', '尚未读取物品')); return; }
    const editable = state.loaded.editable && !state.stale;
    const toolbar = element('div', 'crypt-lord-inventory__toolbar');
    if (state.itemPreview) {
      const preview = state.itemPreview;
      toolbar.append(button('返回物品栏', 'fa-arrow-left', () => { state.itemPreview = null; render(); }));
      const save = button('确认整批修正', 'fa-check', () => void commitItems());
      save.disabled = !editable || !preview.editable || !preview.changed; toolbar.append(save);
      state.fieldset.append(toolbar);
      for (const report of preview.reports) {
        const section = element('details', 'crypt-lord-inventory__category'); section.open = true;
        section.append(element('summary', '', `${report.list} · ${report.name}`));
        const keys = [...new Set([...Object.keys(report.before || {}), ...Object.keys(report.after || {})])];
        fields(section, keys.filter(key => key !== '$物品属性同步' &&
          JSON.stringify(report.before?.[key]) !== JSON.stringify(report.after?.[key])).map(key => [key,
          `${JSON.stringify(report.before?.[key]) ?? '未设置'} → ${JSON.stringify(report.after?.[key]) ?? '移除'}`]));
        state.fieldset.append(section);
      }
      if (!preview.changed) state.fieldset.append(element('p', '', '物品及属性已一致'));
      else if (!preview.reports.length) state.fieldset.append(element('p', '', '同步装备加成后的六维上限'));
      return;
    }
    if (state.gift) {
      toolbar.append(button('返回物品栏', 'fa-arrow-left', () => { state.gift = null; render(); }));
      state.fieldset.append(toolbar);
      const item = state.gift, gain = service.giftGain(item.raw);
      state.fieldset.append(element('h3', '', item.name), element('p', '', `赠予经验 +${gain}`));
      const candidates = Object.entries(state.loaded.floor.data?.npc_data || {}).filter(([name, npc]) =>
        !['$meta', '__proto__', 'constructor', 'prototype'].includes(name) && npc && typeof npc === 'object' && !Array.isArray(npc));
      if (!candidates.length) state.fieldset.append(element('p', '', '没有可赠予的 NPC'));
      const list = element('div', 'crypt-lord-inventory__targets');
      for (const [name, npc] of candidates) {
        const target = button(name, 'fa-user', () => void mutate({ type: 'gift', selection: item.selection, npcName: name }));
        target.append(element('small', '', `${npc.当前序列 || '普通人'} · Lv.${Number(npc.$战斗经验等级) || 0}`));
        target.disabled = !editable; list.append(target);
      }
      state.fieldset.append(list); return;
    }
    const toggle = button(state.batch ? '退出批量' : '批量删除', 'fa-list-check', () => {
      state.batch = !state.batch; state.selected.clear(); render();
    });
    toggle.disabled = !editable || !state.loaded.groups.some(group => group.entries.some(item => service.lists.includes(item.listKey)));
    toolbar.append(toggle);
    if (!state.batch && modules['cryptLord.itemDerivation']) {
      const validate = button('校验物品', 'fa-wand-magic-sparkles', () => void previewItems());
      validate.disabled = state.stale; toolbar.append(validate);
    }
    if (state.batch) {
      const allLabel = element('label'), all = element('input'); all.type = 'checkbox'; all.setAttribute('aria-label', '全选');
      all.addEventListener('change', () => {
        const checked = all.checked;
        for (const node of state.fieldset.querySelectorAll('[data-select-item]:not(:disabled)')) {
          node.checked = checked; node.dispatchEvent(new (doc().defaultView.Event)('change'));
        }
        countSelection();
      });
      allLabel.append(all, element('span', '', '全选'));
      const count = element('span', '', `已选 ${state.selected.size} 项`); count.dataset.selectionCount = '';
      const remove = button('删除选中', 'fa-trash-can', () => void mutate({ type: 'remove', selections: [...state.selected.values()] }));
      remove.classList.add('is-danger'); toolbar.append(allLabel, count, remove);
    }
    state.fieldset.append(toolbar);
    for (const group of state.loaded.groups) {
      const section = element('details', 'crypt-lord-inventory__category'); section.open = true;
      section.append(element('summary', '', `${group.label} · ${group.entries.length}`));
      if (!group.entries.length) section.append(element('p', 'crypt-lord-inventory__empty', '空无一物'));
      const list = element('div', 'crypt-lord-inventory__list');
      for (const item of group.entries) {
        const row = element('article', 'crypt-lord-inventory__item'); row.dataset.itemKey = item.itemKey; row.dataset.listKey = item.listKey;
        const controls = element('div', 'crypt-lord-inventory__item-controls');
        if (state.batch) {
          const checkbox = element('input'); checkbox.type = 'checkbox'; checkbox.dataset.selectItem = '';
          checkbox.setAttribute('aria-label', `选择 ${item.name}`);
          const identity = keyOf(item), selection = state.selected.get(identity);
          checkbox.checked = Boolean(selection); checkbox.disabled = Boolean(item.installed) || !editable || !service.lists.includes(item.listKey);
          let input;
          const update = () => {
            if (checkbox.checked) state.selected.set(identity, { ...item.selection,
              amount: input ? Number(input.value) : null,
              expectedQuantity: input ? Number(item.raw.数量 ?? item.raw.quantity) : undefined });
            else state.selected.delete(identity);
            countSelection();
          };
          checkbox.addEventListener('change', update); controls.append(checkbox);
          if (item.quantity !== null) {
            input = element('input'); input.type = 'number'; input.min = '0.1'; input.step = '0.1';
            input.max = String(item.raw.数量 ?? item.raw.quantity); input.value = String(selection?.amount ?? input.max);
            input.disabled = checkbox.disabled; input.setAttribute('aria-label', `删除 ${item.name} 的数量`);
            input.addEventListener('input', update); controls.append(input);
          }
        }
        const detail = element('details'), summary = element('summary');
        const name = element('strong', '', item.trait && !item.name.includes(item.trait) ? `${item.trait} · ${item.name}` : item.name);
        summary.append(name);
        if (item.quantity !== null) summary.append(element('span', 'crypt-lord-inventory__quantity', `x${item.quantity} ${item.unit}`));
        const tags = element('div', 'crypt-lord-inventory__tags');
        for (const text of [item.tier !== '无' ? item.tier : '', item.pathway, item.type, item.equipped ? '已装备' : ''].filter(Boolean))
          tags.append(element('span', '', text));
        const content = element('div', 'crypt-lord-inventory__detail');
        content.append(tags, element('p', '', item.description));
        if (item.installed) {
          const engine = modules['cryptLord.enhancementReference']?.create()?.mode;
          const rec = engine?.moduleOf?.(state.loaded.floor.data, item.installed);
          const extra = rec ? [engine?.weaponText?.(rec.武器效果), engine?.productionText?.(rec.生产增益)].filter(Boolean) : [];
          content.append(element('p', '', `强化模块：${rec ? `${rec.品质} · ${rec.名称}` : item.installed}`));
          fields(content, Object.entries(item.raw.$强化模块安装?.属性增量 || {}));
          extra.forEach(text => content.append(element('p', '', text)));
        }
        fields(content, item.details.extra); fields(content, item.details.stats);
        item.details.effects.forEach(text => content.append(element('p', 'crypt-lord-inventory__effect', text)));
        if (item.details.sideEffect) content.append(element('p', 'crypt-lord-inventory__side-effect', `副作用：${item.details.sideEffect}`));
        fields(content, item.details.structured);
        if (!state.batch) {
          const actions = element('div', 'crypt-lord-inventory__actions');
          if (group.equipable && service.lists.includes(item.listKey)) {
            const equip = button(item.equipped ? '卸下' : '装备', item.equipped ? 'fa-minus' : 'fa-check',
              () => void mutate({ type: item.equipped ? 'unequip' : 'equip', selection: item.selection }));
            equip.disabled = !editable; actions.append(equip);
          }
          if (service.giftLists.includes(item.listKey)) {
            const gift = button('赠予 NPC', 'fa-gift', () => { state.gift = item; render(); });
            gift.disabled = !editable || Boolean(item.installed); if (item.installed) gift.title = '请先卸下强化模块';
            actions.append(gift);
          }
          content.append(actions);
        }
        detail.append(summary, content); row.append(controls, detail); list.append(row);
      }
      section.append(list); state.fieldset.append(section);
    }
    if (state.loaded.compatibility?.length) {
      const legacy = element('details', 'crypt-lord-inventory__category');
      legacy.append(element('summary', '', '兼容记录 · 只读'));
      fields(legacy, state.loaded.compatibility); state.fieldset.append(legacy);
    }
    countSelection();
  }
  async function operate(action) {
    if (state.busy || state.panel?.dataset.open !== 'true') return;
    const token = ++state.token; state.busy = true; render(); state.status.textContent = '处理中...';
    try { await action(() => active(token)); }
    catch (error) {
      if (active(token)) {
        const phase = state.pending?.transaction.status();
        if (phase === 'failed') state.pending = null;
        if (phase === 'invalid') state.stale = true;
        state.status.textContent = `${['pending', 'uncertain', 'invalid'].includes(phase) ? '' : '未提交：'}${error.message || error}`;
      }
    }
    finally {
      if (token === state.token && state.panel?.dataset.open === 'true') {
        state.busy = false;
        if (!current()) { state.stale = true; state.status.textContent = '宿主或管理服务已变化，请重新加载界面'; }
        render();
      }
    }
  }
  async function reload(discard = false) {
    if (state.busy || state.generating) return;
    if ((discard || state.pending) && (state.selected.size || state.gift || state.itemPreview || state.pending) &&
      !doc().defaultView.confirm('放弃所选物品、校验草稿和待保存结果并重新读取？保存状态不明时将读取实际楼层。')) return;
    state.session++; state.pending = null;
    return operate(async guard => {
      state.loaded = null; state.stale = false; state.selected.clear(); state.batch = false; state.gift = null; state.itemPreview = null; render();
      const loaded = await service.load(state.messageId, guard);
      if (!guard()) return;
      state.loaded = loaded;
      const count = loaded.groups.reduce((sum, group) => sum + group.entries.length, 0);
      state.status.textContent = `#${loaded.floor.message_id} · ${count} 项${loaded.reason ? ` · ${loaded.reason}` : ''}`;
    });
  }
  async function previewItems() {
    if (!state.loaded || state.stale) return;
    return operate(async guard => {
      const preview = await modules['cryptLord.itemDerivation'].load(state.loaded.floor.message_id, guard);
      if (!guard()) return;
      state.itemPreview = preview;
      state.status.textContent = `#${preview.floor.message_id} · ${preview.reports.length} 处变化${preview.reason ? ` · ${preview.reason}` : ' · 待确认'}`;
    });
  }
  async function commitItems() {
    const preview = state.itemPreview;
    if (!preview?.editable || !preview.changed || state.stale || state.pending || state.busy) return;
    if (!doc().defaultView.confirm('确认整批修正物品、特性和人物态度，并同步装备属性上限？')) return;
    return operate(async guard => {
      const transaction = modules['cryptLord.itemDerivation'].begin(preview, sessionGuard());
      const finish = async (result, guard) => {
        state.pending = null; state.itemPreview = null;
        try { state.loaded = await service.load(preview.floor.message_id, guard); }
        catch (error) { state.loaded = null; result.warning = result.warning || `已确认保存，但物品栏读取失败：${error.message}`; }
        if (!guard()) return;
        state.status.textContent = result.warning || (result.unchanged ? '物品及属性已一致' : '已完成整批修正');
        if (!result.unchanged) {
          try { modules['cryptLord.variableWorkbench']?.notifyUpdate?.({
            messageId: preview.floor.message_id, beforeData: preview.floor.data, afterData: result.data, source: 'inventory-repair',
          }); } catch (error) { console.warn('物品已保存，变量面板通知失败', error); }
        }
        for (const refresh of [
          () => modules['cryptLord.gameShell']?.refresh?.(),
          () => modules['cryptLord.nativeFloorStatusBar']?.refresh?.(preview.floor.message_id),
        ]) {
          try { await refresh(); } catch (error) { console.warn('物品已保存，面板刷新失败', error); }
          if (!guard()) return;
        }
      };
      state.pending = { transaction, finish }; render();
      const result = await transaction.run(); if (guard()) await finish(result, guard);
    });
  }
  async function mutate(action) {
    if (state.busy || state.pending || !state.loaded?.editable || state.stale) return;
    const baseline = state.loaded, operation = structuredClone(action), token = state.token;
    if (action.type === 'remove' && !action.selections.length) return;
    if (action.type === 'remove' && !doc().defaultView.confirm(`确定删除选中的 ${action.selections.length} 件物品？此操作不可恢复。`)) return;
    if (action.type === 'gift' && !doc().defaultView.confirm(`将「${action.selection.name}」赠予 ${action.npcName}？装备会移出物品栏，赠予经验 +${service.giftGain(action.selection.snapshot)}。`)) return;
    if (!active(token)) return;
    return operate(async guard => {
      const transaction = service.begin(baseline, operation, sessionGuard());
      const finish = async (result, guard) => {
        state.pending = null;
        state.loaded = result.loaded; state.selected.clear(); state.batch = false; state.gift = null;
        state.status.textContent = result.warning || (action.type === 'gift' ? `已赠予 ${action.npcName} · +${result.gain} 经验 · Lv.${result.level}`
          : action.type === 'remove' ? `已删除 ${result.removed} 项` : `已${action.type === 'equip' ? '装备' : '卸下'} ${action.selection.name}`);
        try {
          modules['cryptLord.variableWorkbench']?.notifyUpdate?.({
            messageId: baseline.floor.message_id, beforeData: baseline.floor.data, afterData: result.data, source: `inventory-${action.type}`,
          });
        } catch (error) { console.warn('物品已保存，变量面板通知失败', error); }
        for (const refresh of [
          () => modules['cryptLord.gameShell']?.refresh?.(),
          () => modules['cryptLord.nativeFloorStatusBar']?.refresh?.(baseline.floor.message_id),
        ]) {
          try { await refresh(); } catch (error) { console.warn('物品已保存，面板刷新失败', error); }
          if (!guard()) return;
        }
      };
      state.pending = { transaction, finish }; render();
      const result = await transaction.run(); if (guard()) await finish(result, guard);
    });
  }
  async function recover() {
    const pending = state.pending;
    if (!pending || state.stale || state.generating) return;
    return operate(async guard => {
      const result = await (pending.transaction.status() === 'uncertain' ? pending.transaction.inspect() : pending.transaction.save());
      if (guard()) await pending.finish(result, guard);
    });
  }
  async function open(messageId = null) {
    if (!mount() || messageId !== null && (!Number.isInteger(messageId) || messageId < 0)) return false;
    if (state.panel.dataset.open === 'true' && (state.messageId === messageId || state.busy || state.pending)) {
      state.panel.focus(); return state.messageId === messageId;
    }
    if (state.panel.dataset.open === 'true' && (state.selected.size || state.gift || state.itemPreview) &&
      !doc().defaultView.confirm('放弃当前物品草稿并切换楼层？')) return false;
    if (state.panel.dataset.open !== 'true') state.focus = doc().activeElement;
    state.messageId = messageId; state.panel.dataset.open = 'true'; state.panel.focus(); render();
    if (state.generating) state.status.textContent = '正在生成，请结束后重新读取';
    await reload(); return true;
  }
  const api = Object.freeze({
    status: () => ({ ready: !state.disposed, open: state.panel?.dataset.open === 'true' }),
    mount, open, close, reload,
    dispose() {
      state.disposed = true; close(true); state.subscriptions.forEach(subscription => subscription?.stop());
      state.panel?.remove(); contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api); mount();
})();
