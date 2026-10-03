(() => {
  'use strict';
  const KEY = 'cryptLord.dualWorldbookUi';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const service = modules['cryptLord.dualWorldbook'];
  const host = modules['cryptLord.afterNativeHost'];
  if (!service || !host) throw new Error('双库管理依赖尚未加载');
  const state = { panel: null, body: null, stats: null, result: null, report: [], tab: 'all', token: 0, busy: false, disposed: false, subscription: null };
  const doc = () => host.getHost()?.document || document;
  const win = () => doc().defaultView || window;
  function element(tag, cls, text) {
    const node = doc().createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(text, handler, title = text) {
    const node = element('button', '', text);
    node.type = 'button';
    node.title = title;
    node.addEventListener('click', handler);
    return node;
  }
  function message(text, error = false) {
    if (!state.result) return;
    state.result.textContent = text;
    state.result.dataset.error = String(error);
  }
  const active = token => !state.disposed && state.panel?.dataset.open === 'true' && state.token === token;
  function close() { state.token++; if (state.panel) state.panel.dataset.open = 'false'; }
  function mount() {
    if (state.disposed || state.panel || !doc().body) return Boolean(state.panel);
    const panel = element('section', 'crypt-lord-dual-books');
    panel.dataset.open = 'false';
    const header = element('header');
    const stats = element('span', 'crypt-lord-dual-books__stats', '同步中…');
    header.append(element('strong', '', '世界书管控中枢'), stats, button('↻', () => void reload(), '刷新双库数据'), button('×', close, '关闭'));
    const tabs = element('nav', 'crypt-lord-dual-books__tabs');
    const choices = [['all', '全部'], ['primary_only', '源堡'], ['library_only', '历史孔隙'], ['conflict', '双库冲突']];
    choices.forEach(([id, label]) => {
      const tab = button(label, () => { state.tab = id; render(); });
      tab.dataset.tab = id;
      tabs.append(tab);
    });
    const body = element('div', 'crypt-lord-dual-books__body');
    const result = element('div', 'crypt-lord-dual-books__result');
    panel.append(header, tabs, body, result);
    doc().body.append(panel);
    Object.assign(state, { panel, body, result, stats });
    let drag = null;
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const rect = panel.getBoundingClientRect();
      drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      header.setPointerCapture(event.pointerId);
    });
    header.addEventListener('pointermove', event => {
      if (!drag) return;
      panel.style.left = `${Math.max(8, Math.min(win().innerWidth - panel.offsetWidth - 8, drag.left + event.clientX - drag.x))}px`;
      panel.style.top = `${Math.max(8, Math.min(win().innerHeight - panel.offsetHeight - 8, drag.top + event.clientY - drag.y))}px`;
      panel.style.transform = 'none';
    });
    header.addEventListener('pointerup', () => { drag = null; });
    header.addEventListener('pointercancel', () => { drag = null; });
    const events = host.tavernEvents();
    if (events?.CHAT_CHANGED) state.subscription = host.bindEvent(events.CHAT_CHANGED, close);
    return true;
  }
  function actionButton(label, action, item, dangerous = false) {
    const node = button(label, () => void execute(action, item));
    if (dangerous) node.className = 'crypt-lord-dual-books__danger';
    return node;
  }
  function detail(label, entry) {
    const group = element('div', 'crypt-lord-dual-books__detail');
    group.append(element('b', '', label), element('span', '', String(entry?.content || '无内容').slice(0, 200)));
    group.title = String(entry?.content || '');
    return group;
  }
  function render() {
    if (!state.body) return;
    state.body.replaceChildren();
    state.panel.querySelectorAll('[data-tab]').forEach(tab => { tab.setAttribute('aria-selected', String(tab.dataset.tab === state.tab)); });
    const counts = { primary_only: 0, library_only: 0, conflict: 0, ambiguous: 0 };
    state.report.forEach(item => {
      if (item.status === 'identical') counts.primary_only++;
      else counts[item.status]++;
    });
    state.stats.textContent = `总计 ${state.report.length} · 源堡 ${counts.primary_only} · 孔隙 ${counts.library_only} · 冲突 ${counts.conflict}${counts.ambiguous ? ` · 重名 ${counts.ambiguous}` : ''}`;
    const filtered = state.report.filter(item => state.tab === 'all' ||
      (state.tab === 'primary_only' ? item.status === 'primary_only' || item.status === 'identical' : item.status === state.tab));
    if (!filtered.length) {
      state.body.append(element('p', 'crypt-lord-dual-books__empty', state.report.length ? '当前分类没有条目' : '双库中没有条目'));
      return;
    }
    filtered.forEach(item => {
      const entry = item.primaryData || item.libraryData;
      const row = element('article', 'crypt-lord-dual-books__entry');
      const title = element('div', 'crypt-lord-dual-books__entry-title');
      title.append(element('strong', '', item.name), element('span', '', ({
        primary_only: '仅源堡', library_only: '仅历史孔隙', identical: '双库已同步',
        conflict: '双库冲突', ambiguous: '同名条目不唯一',
      })[item.status]));
      row.append(title);
      if (item.status === 'conflict') {
        row.append(detail('源堡', item.primaryData), detail('孔隙', item.libraryData));
      } else row.append(detail(item.primaryData ? '源堡' : '孔隙', entry));
      if (item.status === 'ambiguous') {
        row.append(element('p', 'crypt-lord-dual-books__warning', '存在同名重复或缺少 UID，请在酒馆世界书编辑器中处理后刷新。'));
      } else {
        const actions = element('div', 'crypt-lord-dual-books__actions');
        if (item.primaryData) {
          const toggle = element('input');
          toggle.type = 'checkbox';
          toggle.checked = Boolean(item.primaryData.enabled);
          toggle.addEventListener('change', () => void execute('toggle', item));
          const label = element('label', 'crypt-lord-dual-books__toggle', '启用');
          label.prepend(toggle);
          actions.append(label);
        }
        if (item.status === 'primary_only' || item.status === 'identical') {
          actions.append(actionButton('移至孔隙', 'demote', item));
        } else if (item.status === 'library_only') {
          actions.append(actionButton('唤醒至源堡', 'promote', item));
        } else if (item.status === 'conflict') {
          actions.append(actionButton('用孔隙覆盖源堡', 'overwrite_primary', item),
            actionButton('用源堡覆盖孔隙', 'overwrite_library', item));
        }
        actions.append(actionButton('双库删除', 'delete', item, true));
        row.append(actions);
      }
      state.body.append(row);
    });
  }
  async function reload() {
    if (!mount()) return false;
    const token = state.token;
    message('正在比对双库…');
    try {
      const report = await service.compare();
      if (!active(token)) return false;
      state.report = report;
      render();
      message('');
      return true;
    } catch (error) {
      if (active(token)) message(`读取双库失败：${error?.message || error}`, true);
      return false;
    }
  }
  async function execute(action, item) {
    if (state.busy) return;
    const prompts = {
      promote: `将「${item.name}」唤醒至源堡并从孔隙移除？`,
      demote: `将「${item.name}」备份到孔隙后从源堡移除？`,
      overwrite_primary: `用孔隙版本覆盖源堡的「${item.name}」？源堡原内容将被替换。`,
      overwrite_library: `用源堡版本覆盖孔隙的「${item.name}」？孔隙原内容将被替换。`,
      delete: `从源堡和历史孔隙永久删除「${item.name}」？此操作不可撤销。`,
    };
    if (prompts[action] && !win().confirm(prompts[action])) { render(); return; }
    const token = state.token;
    state.busy = true;
    state.panel.setAttribute('aria-busy', 'true');
    try {
      await service.act(action, item, { guard: () => { if (!active(token)) throw new Error('聊天已切换，操作中断'); } });
      if (!active(token)) return;
      await reload();
      if (active(token)) message(`「${item.name}」操作完成`);
    } catch (error) {
      if (active(token)) {
        message(`操作失败：${error?.message || error}。请刷新核对双库状态。`, true);
        render();
      }
    } finally {
      state.busy = false;
      state.panel?.removeAttribute('aria-busy');
    }
  }
  async function open() {
    if (!mount()) return false;
    state.panel.dataset.open = 'true';
    state.panel.style.left = '';
    state.panel.style.top = '';
    state.panel.style.transform = '';
    state.tab = 'all';
    state.token++;
    return reload();
  }
  const api = Object.freeze({
    status() { return Object.freeze({ ready: Boolean(state.panel), open: state.panel?.dataset.open === 'true', count: state.report.length }); },
    mount, open, close, reload,
    dispose() {
      state.disposed = true;
      close();
      state.subscription?.stop();
      state.panel?.remove();
      state.panel = null;
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  mount();
})();
