(() => {
  'use strict';
  const KEY = 'cryptLord.attributeRecalculationUi', root = window.cryptLord, contract = root?.contract, modules = root?.__stage1Modules;
  const service = modules?.['cryptLord.attributeRecalculation'], after = modules?.['cryptLord.afterNativeHost'];
  if (!service || !after || !contract) throw Error('属性重算界面依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const state = { disposed: false, token: 0, busy: false, selected: null, panel: null, focus: null,
    loaded: null, confirm: false, generating: false, subscriptions: [] };
  const doc = () => after.getHost()?.document || document;
  const active = token => !state.disposed && token === state.token && state.panel?.dataset.open === 'true';
  function node(tag, cls = '', text) {
    const item = doc().createElement(tag); item.className = cls;
    if (text !== undefined) item.textContent = text; return item;
  }
  function tool(label, icon, action) {
    const item = node('button'); item.type = 'button'; item.title = label; item.setAttribute('aria-label', label);
    const image = node('i', `fa-solid fa-${icon}`); image.setAttribute('aria-hidden', 'true'); item.append(image);
    item.addEventListener('click', action); return item;
  }
  function controls() {
    if (!state.panel) return;
    const blocked = state.busy || state.generating;
    state.panel.setAttribute('aria-busy', String(state.busy));
    state.reload.disabled = blocked; state.select.disabled = blocked || !state.select.options.length;
    state.save.disabled = blocked || !state.loaded?.editable || !state.loaded.changed;
    state.save.setAttribute('aria-label', state.confirm ? '确认保存属性修正' : '修正本楼层属性');
    state.save.title = state.save.getAttribute('aria-label');
  }
  function close(returnFocus = true) {
    state.token++; state.busy = false; state.loaded = null; state.confirm = false;
    state.panel?.setAttribute('data-open', 'false'); state.main?.replaceChildren(); controls();
    if (returnFocus && state.focus?.isConnected) state.focus.focus(); state.focus = null;
  }
  const value = raw => raw === undefined || raw === null ? '未记录' : String(raw);
  const number = raw => Number.isFinite(raw) ? String(Number(raw.toFixed(4))) : String(raw);
  const signed = raw => `${raw > 0 ? '+' : ''}${number(raw)}`;
  function render(loaded) {
    const { report } = loaded, factors = report.factors;
    if (report.progression) {
      const growth = report.progression, section = node('section', 'crypt-lord-attributes__factors');
      section.append(node('h3', '', '序列成长'),
        node('p', '', `${growth.kind} · ${growth.sequence}`),
        node('p', '', `能力体系 ${growth.system} · 神性 ${growth.divinity} · 基础配额 ${growth.quota}`),
        node('p', '', `消化 ${number(growth.requestedDigestion)}% → ${number(growth.digestion)}% · 单次上限 ${growth.maxDigestionDelta}`),
        node('small', '', `经验 Lv.${growth.experience.level} · 进度 ${growth.experience.exp}/${growth.experience.need}`));
      state.main.append(section);
    }
    const summary = node('section', 'crypt-lord-attributes__factors');
    summary.append(node('p', '', `${loaded.floor.data.stat_data.当前序列 || '未记录序列'} · 战斗经验 Lv.${factors.level}`),
      node('p', '', `消化 ${factors.digestion}%（${signed(factors.digestionBonus * 100)}%） · 失控 ${factors.loss}%（${signed(factors.lossPenalty * 100)}%）`),
      node('p', '', `进度倍率 ${number(factors.multiplier)} · 经验倍率 ${number(factors.experienceMultiplier)}`));
    state.main.append(summary);
    const table = node('div', 'crypt-lord-attributes__rows');
    for (const row of report.rows) {
      const item = node('section', 'crypt-lord-attributes__row'); item.append(node('h3', '', row.key));
      const detail = node('div');
      detail.append(node('p', '', `上限 ${value(row.stored)} → ${value(row.next)}`));
      if (row.key !== '运气') detail.append(node('p', '', `当前 ${value(row.current)} → ${value(row.nextCurrent)}`));
      detail.append(node('small', '', row.validBase
        ? `基础 ${row.base} · 进度及经验后 ${row.adjusted} · 固定 ${signed(row.flat)} · 百分比 ${signed(row.percent)}%`
        : '基础值未记录，保留原生上限'));
      item.append(detail); table.append(item);
    }
    state.main.append(table);
    const sources = node('section', 'crypt-lord-attributes__sources'); sources.append(node('h3', '', '加成来源'));
    if (!report.bonuses.length) sources.append(node('p', '', '无'));
    for (const bonus of report.bonuses) {
      const changes = service.stats.filter(key => bonus.flat[key] || bonus.percent[key]).map(key =>
        `${key} ${signed(bonus.flat[key])} / ${signed(bonus.percent[key])}%`).join(' · ');
      const item = node('article'); item.append(node('h4', '', bonus.name),
        node('small', '', bonus.group), node('p', '', changes || '无六维加成')); sources.append(item);
    }
    state.main.append(sources);
    for (const warning of report.warnings) state.main.append(node('p', 'crypt-lord-attributes__warning', warning));
  }
  function show(loaded) {
    state.loaded = loaded; state.selected = loaded.floor.message_id; state.confirm = false;
    state.select.replaceChildren(...loaded.floors.slice().reverse().map(row => {
      const option = node('option', '', `#${row.messageId}${row.name ? ` · ${row.name}` : ''}`);
      option.value = row.messageId; option.selected = row.messageId === state.selected; return option;
    }));
    state.main.replaceChildren(); render(loaded);
    state.status.textContent = `#${state.selected} · ${loaded.reason ||
      (loaded.changed ? loaded.report.progression ? '成长及属性待修正' : '属性上限待修正' : '属性上限一致')}`;
  }
  async function reload() {
    if (state.panel?.dataset.open !== 'true' || state.generating || state.disposed) return false;
    const token = ++state.token, scroll = state.main.scrollTop;
    state.busy = true; state.loaded = null; state.confirm = false; state.main.replaceChildren(); controls();
    state.status.textContent = '正在读取原生属性...';
    try {
      const loaded = await service.load(state.selected, () => active(token) && !state.generating);
      if (!active(token)) return false; show(loaded); state.main.scrollTop = scroll; return true;
    } catch (error) {
      if (active(token)) {
        state.select.replaceChildren();
        if (error.floors) {
          const absent = node('option', '', '所选楼层已不可用'); absent.disabled = true; absent.selected = true;
          state.select.append(absent, ...error.floors.map(row => {
            const option = node('option', '', `#${row.messageId}${row.name ? ` · ${row.name}` : ''}`);
            option.value = row.messageId; return option;
          }));
        }
        state.status.textContent = `读取失败：${error.message || error}`;
      }
      return false;
    } finally { if (active(token)) { state.busy = false; controls(); } }
  }
  async function save() {
    if (!state.loaded?.editable || !state.loaded.changed || state.busy || state.generating) return false;
    if (!state.confirm) {
      const scope = state.loaded.report.progression ? '成长基础、六维上限及当前值' : '六维上限及当前值';
      state.confirm = true; state.status.textContent = `确认修正 #${state.selected} 的${scope}？`; controls(); return false;
    }
    const token = state.token, loaded = state.loaded; state.busy = true; controls(); state.status.textContent = '正在保存属性修正...';
    try {
      const result = await service.commit(loaded, () => active(token) && !state.generating);
      if (!active(token)) return false;
      if (result.loaded) show(result.loaded);
      else { state.loaded = null; state.main.replaceChildren(); }
      state.status.textContent = result.warning || (result.unchanged ? '属性已一致，未重复写入' : `#${state.selected} · 属性修正已保存`);
      return true;
    } catch (error) {
      if (active(token)) {
        state.loaded = null; state.confirm = false; state.main.replaceChildren(); state.status.textContent = `未保存：${error.message || error}`;
      }
      return false;
    } finally { if (active(token)) { state.busy = false; controls(); } }
  }
  function updated() {
    if (state.disposed || state.panel?.dataset.open !== 'true') return;
    // The save transaction owns its revision and post-write verification.
    if (state.busy && state.loaded) return;
    state.token++; state.busy = false; state.loaded = null; state.confirm = false; state.main.replaceChildren(); controls();
    if (state.generating) state.status.textContent = '正在生成，等待完整楼层'; else void reload();
  }
  function mount() {
    if (state.disposed) return false; if (state.panel) return true;
    const panel = node('section', 'crypt-lord-attributes'); panel.dataset.open = 'false'; panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', '属性上限与重算');
    const header = node('header'), tools = node('div', 'crypt-lord-attributes__tools');
    state.reload = tool('重新读取', 'rotate-right', () => void reload());
    state.save = tool('修正本楼层属性', 'floppy-disk', () => void save());
    tools.append(state.reload, state.save, tool('关闭', 'xmark', () => close()));
    header.append(node('strong', '', '属性上限与重算'), tools);
    const label = node('label', 'crypt-lord-attributes__selector', '楼层'), select = node('select');
    select.setAttribute('aria-label', '属性楼层');
    select.addEventListener('change', () => { state.selected = Number(select.value); state.main.scrollTop = 0; void reload(); }); label.append(select);
    const main = node('main'), status = node('p', 'crypt-lord-attributes__status'); status.setAttribute('role', 'status');
    panel.append(header, label, main, status); doc().body.append(panel); Object.assign(state, { panel, select, main, status });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const items = [...panel.querySelectorAll('button,select')].filter(item => !item.disabled && item.getClientRects().length);
      if (event.shiftKey && [items[0], panel].includes(doc().activeElement)) { event.preventDefault(); items.at(-1)?.focus(); }
      else if (!event.shiftKey && doc().activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus(); }
    });
    const events = after.tavernEvents() || {}, bind = (name, callback) => { if (name) state.subscriptions.push(after.bindEvent(name, callback)); };
    bind(events.CHAT_CHANGED, () => { close(false); state.selected = null; state.generating = false; });
    bind(events.GENERATION_STARTED, (type, options, dryRun) => {
      if (type === 'quiet' || dryRun || options?.dryRun) return;
      state.generating = true; state.token++; state.busy = false; state.loaded = null; updated();
    });
    for (const name of new Set([events.GENERATION_ENDED, events.GENERATION_STOPPED].filter(Boolean)))
      bind(name, () => { state.generating = false; updated(); });
    for (const name of new Set([events.MESSAGE_UPDATED, events.MESSAGE_DELETED, events.MESSAGE_SWIPED,
      events.MESSAGE_RECEIVED, events.CHARACTER_MESSAGE_RENDERED].filter(Boolean))) bind(name, updated);
    const hostWindow = doc().defaultView || window; hostWindow.addEventListener('cryptLord:variables-updated', updated);
    state.subscriptions.push({ stop: () => hostWindow.removeEventListener('cryptLord:variables-updated', updated) });
    controls(); return true;
  }
  async function open(messageId = null) {
    if (!mount()) return false;
    if (state.panel.dataset.open !== 'true') state.focus = doc().activeElement;
    state.panel.dataset.open = 'true'; state.selected = messageId; state.main.scrollTop = 0; state.panel.focus();
    state.generating = service.status().generating;
    if (state.generating) { state.status.textContent = '正在生成，等待完整楼层'; controls(); return true; }
    return reload();
  }
  const api = Object.freeze({ status: () => ({ key: KEY, ready: !state.disposed, busy: state.busy }), mount, open, close, reload,
    dispose() {
      close(false); state.disposed = true; state.subscriptions.forEach(item => item?.stop());
      state.panel?.remove(); contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY];
    } });
  modules[KEY] = api; contract.initializeGlobal(KEY, api); mount();
})();
