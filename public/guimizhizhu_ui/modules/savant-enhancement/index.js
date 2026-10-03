(() => {
  'use strict';
  const KEY = 'cryptLord.savantEnhancementUi';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const service = modules['cryptLord.savantEnhancement'];
  const material = modules['cryptLord.savantMaterial'];
  const afterNative = modules['cryptLord.afterNativeHost'];
  if (!contract || !service || !material || !afterNative) throw new Error('装备强化窗口依赖尚未加载');
  const state = { panel: null, body: null, notice: null, snapshot: null, selected: '',
    detail: '', busy: false, token: 0, subscription: null, disposed: false, recent: [] };
  const doc = () => afterNative.getHost()?.document || document;
  const win = () => doc().defaultView || window;
  const el = (tag, className = '', text) => {
    const node = doc().createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (text, action, disabled = false) => {
    const node = el('button', '', text);
    node.type = 'button';
    node.disabled = disabled;
    node.addEventListener('click', action);
    return node;
  };
  const active = token => !state.disposed && state.token === token && state.panel?.dataset.open === 'true';
  const store = () => contract.waitGlobalInitialized('cryptLord.stateStore', { timeoutMs: 10000 });
  function notice(text, error = false) {
    state.notice.textContent = text;
    state.notice.dataset.error = String(error);
  }
  function close() {
    state.token++;
    state.panel?.setAttribute('data-open', 'false');
    state.busy = false;
  }
  function mount() {
    if (state.disposed || state.panel || !doc().body) return Boolean(state.panel);
    const panel = el('section', 'crypt-lord-savant-enhancement');
    panel.dataset.open = 'false';
    const header = el('header');
    header.append(el('strong', '', '通识者 · 装备强化'), button('×', close));
    const body = el('main', 'crypt-lord-savant-enhancement__body');
    const footer = el('footer', 'crypt-lord-savant-enhancement__notice');
    footer.setAttribute('role', 'status');
    panel.append(header, body, footer);
    doc().body.append(panel);
    Object.assign(state, { panel, body, notice: footer });
    let drag = null;
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const rect = panel.getBoundingClientRect();
      drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      header.setPointerCapture?.(event.pointerId);
    });
    header.addEventListener('pointermove', event => {
      if (!drag) return;
      panel.style.left = `${Math.max(8, Math.min(win().innerWidth - panel.offsetWidth - 8, drag.left + event.clientX - drag.x))}px`;
      panel.style.top = `${Math.max(8, Math.min(win().innerHeight - panel.offsetHeight - 8, drag.top + event.clientY - drag.y))}px`;
      panel.style.transform = 'none';
    });
    header.addEventListener('pointerup', () => { drag = null; });
    header.addEventListener('pointercancel', () => { drag = null; });
    const events = afterNative.tavernEvents();
    if (events?.CHAT_CHANGED) state.subscription = afterNative.bindEvent(events.CHAT_CHANGED, close);
    return true;
  }
  async function verify(token) {
    if (!active(token) || !state.snapshot) throw new Error('窗口或聊天已变化');
    const fresh = await (await store()).findLatestAssistant();
    if (!active(token) || !fresh || fresh.message_id !== state.snapshot.id ||
      fresh.message !== state.snapshot.message || JSON.stringify(fresh.data) !== state.snapshot.revision)
      throw new Error('楼层正文或变量已变化，请重新读取');
    return fresh;
  }
  async function refresh(token) {
    const fresh = await (await store()).findLatestAssistant();
    if (!active(token)) return;
    if (!fresh) throw new Error('没有真实 assistant 楼层');
    state.snapshot = { id: fresh.message_id, message: fresh.message,
      revision: JSON.stringify(fresh.data), data: fresh.data };
    state.detail = '';
    state.recent = [];
    render();
  }
  async function run(work) {
    if (state.busy) return;
    const token = state.token;
    state.busy = true;
    state.panel.setAttribute('aria-busy', 'true');
    render();
    try { await work(token); }
    catch (error) { if (active(token)) notice(error?.message || String(error), true); }
    finally {
      if (active(token)) {
        state.busy = false;
        state.panel.removeAttribute('aria-busy');
        render();
      }
    }
  }
  async function commit(token, fresh, next) {
    await verify(token);
    await (await store()).writeAssistantData(fresh.message_id, next);
    if (!active(token)) return;
    const saved = await (await store()).readMessage(fresh.message_id);
    if (!active(token)) return;
    if (!saved || saved.role !== 'assistant' ||
      JSON.stringify(service.modulesOf(saved.data)) !== JSON.stringify(service.modulesOf(next)) ||
      JSON.stringify(service.equipment(saved.data)) !== JSON.stringify(service.equipment(next)) ||
      JSON.stringify(material.groups(saved.data)) !== JSON.stringify(material.groups(next)))
      throw new Error('楼层写入后数据不一致，请重新读取');
    state.snapshot.data = saved.data;
    state.snapshot.revision = JSON.stringify(saved.data);
    modules['cryptLord.variableWorkbench']?.notifyUpdate?.({
      messageId: fresh.message_id, beforeData: fresh.data, afterData: saved.data,
      source: 'savant-enhancement',
    });
  }
  async function open() {
    if (!mount()) return false;
    state.token++;
    const token = state.token;
    state.panel.dataset.open = 'true';
    state.panel.style.left = '';
    state.panel.style.top = '';
    state.panel.style.transform = '';
    state.snapshot = null;
    state.body.replaceChildren();
    notice('正在读取当前楼层…');
    try { await refresh(token); if (active(token)) notice(''); }
    catch (error) { if (active(token)) notice(error?.message || String(error), true); }
    return true;
  }
  function select(options, label, value = '') {
    const node = el('select');
    node.setAttribute('aria-label', label);
    for (const [id, text] of options) {
      const option = el('option', '', text);
      option.value = id;
      node.append(option);
    }
    node.value = value;
    return node;
  }
  function field(label, control) {
    const row = el('label', 'crypt-lord-savant-enhancement__field');
    row.append(el('span', '', label), control);
    return row;
  }
  function actions(...buttons) {
    const row = el('div', 'crypt-lord-savant-enhancement__actions');
    row.append(...buttons);
    state.body.append(row);
  }
  function detailText(rec) {
    const ratios = Object.entries(rec.六维比例 || {})
      .map(([key, value]) => `${key}${value >= 0 ? '+' : ''}${value}%`).join('、');
    const production = rec.生产增益
      ? `${({ successBonus: '加工成功率', yieldBonus: '加工产量',
        craftDiscount: '制造耗材节约', repairBonus: '维修量' })[rec.生产增益.type]}：${rec.生产增益.value}`
      : '';
    const weapon = rec.武器效果;
    const weaponText = weapon ? [
      ...Object.keys(weapon.mundane?.up || {}).map(key => `${key}升档`),
      ...Object.keys(weapon.mundane?.down || {}).map(key => `${key}降档`),
      weapon.extraordinary?.attackBase && `攻击转${weapon.extraordinary.attackBase}`,
      weapon.extraordinary?.healBase && `恢复转${weapon.extraordinary.healBase}`,
      weapon.extraordinary?.extra, weapon.extraordinary?.scope && `${weapon.extraordinary.scope}范围`,
    ].filter(Boolean).join('、') : '';
    return [ratios, weaponText, production].filter(Boolean).join(' · ');
  }
  function renderMain() {
    const data = state.snapshot.data;
    const access = material.gate(data.stat_data);
    if (!access.unlocked) {
      state.body.append(el('p', '', '通识者序列6或知识之妖解锁装备强化。'));
      return;
    }
    const reconciliation = service.reconcile(data);
    if (reconciliation.changed) {
      state.body.append(el('p', 'crypt-lord-savant-enhancement__warning',
        '检测到装备或模块引用不一致。孤立模块会丢失；孤立装备增量将撤销。'));
      actions(button('修复异常引用', () => void run(async token => {
        const fresh = await verify(token);
        await commit(token, fresh, service.reconcile(fresh.data).data);
        notice('异常引用已修复');
      })));
    }
    const groups = material.groups(data).filter(group => Math.floor(group.qty + 1e-6) >= 1 &&
      service.CONFIG[group.family]);
    if (!groups.some(row => row.signature === state.selected)) state.selected = groups[0]?.signature || '';
    const selected = groups.find(row => row.signature === state.selected);
    const section = el('section', 'crypt-lord-savant-enhancement__section');
    section.append(el('h3', '', '模块抽取'),
      el('p', 'crypt-lord-savant-enhancement__muted', '1份加工材料可抽取1个模块；材质族决定模板，等级决定品质。'));
    const groupSelect = select(groups.map(row =>
      [row.signature, `${row.material} · ${row.family} · ${row.grade} · ${row.qty}份`]), '加工材料', state.selected);
    groupSelect.addEventListener('change', () => { state.selected = groupSelect.value; render(); });
    const quantity = el('input');
    quantity.type = 'number';
    quantity.min = '1';
    quantity.step = '1';
    quantity.max = String(Math.min(100, Math.floor(selected?.qty || 1)));
    quantity.value = '1';
    quantity.setAttribute('aria-label', '抽取数量');
    section.append(field('加工材料', groupSelect), field('抽取数量', quantity));
    const pity = service.store(data)?.抽取统计 || {};
    const count = Math.max(0, Number(pity.周期抽数) || 0);
    const average = count ? (Number(pity.周期材料总分) || 0) / count : 0;
    section.append(el('p', 'crypt-lord-savant-enhancement__muted',
      `保底 ${count}/20 · 平均材料分 ${average.toFixed(2)} · 预计保底 ${service.RARITIES[service.pityFloor(average)]}`));
    if (selected) section.append(el('p', 'crypt-lord-savant-enhancement__muted',
      service.RARITIES.map((rarity, index) =>
        `${rarity} ${service.WEIGHTS[selected.grade]?.[index] ?? service.WEIGHTS.普通[index]}%`).join(' · ')));
    section.append(button('抽取强化模块', () => void run(async token => {
      const qty = Number(quantity.value);
      if (!Number.isInteger(qty) || qty < 1 || qty > 100) throw new Error('抽取数量须为1至100');
      if (!win().confirm(`消耗 ${qty} 份加工材料进行 ${qty} 次抽取？`)) return;
      const fresh = await verify(token);
      const result = service.draw(fresh.data, state.selected, qty);
      await commit(token, fresh, result.data);
      state.recent = result.results;
      notice(`抽取完成，获得 ${result.results.length} 个模块`);
    }), !selected || state.busy));
    state.body.append(section);
    if (state.recent.length) state.body.append(el('p', 'crypt-lord-savant-enhancement__muted',
      `最近抽取：${state.recent.map(row => `${row.品质}·${row.名称}`).join('、')}`));
    const warehouse = el('section', 'crypt-lord-savant-enhancement__section');
    const rows = service.modulesOf(data);
    warehouse.append(el('h3', '', `模块仓库 · ${rows.length}`));
    if (!rows.length) warehouse.append(el('p', 'crypt-lord-savant-enhancement__muted', '尚无强化模块。'));
    for (const row of rows) {
      const item = el('div', 'crypt-lord-savant-enhancement__module');
      item.append(el('strong', '', `${row.品质} · ${row.名称}`),
        el('span', 'crypt-lord-savant-enhancement__muted',
          `${detailText(row)} · ${row.安装位置 ? `已安装于${row.安装位置.装备名称}` : '未安装'}`),
        button('查看', () => { state.detail = row.id; render(); }));
      warehouse.append(item);
    }
    state.body.append(warehouse);
    actions(button('重新读取楼层', () => void run(refresh)));
  }
  function renderDetail() {
    const data = state.snapshot.data;
    const rec = service.modulesOf(data).find(row => row.id === state.detail);
    if (!rec) { state.detail = ''; renderMain(); return; }
    state.body.append(el('h3', '', `${rec.品质} · ${rec.名称}`),
      el('p', '', detailText(rec)),
      el('p', 'crypt-lord-savant-enhancement__muted',
        `${rec.材质族} · ${rec.来源材料} · ${rec.材料等级} · 已卸下 ${rec.卸下次数 || 0} 次`));
    if (rec.安装位置) {
      const count = (Number(rec.卸下次数) || 0) + 1;
      const risk = service.detachRisk(count);
      const equipment = service.equipment(data).find(row =>
        row.listKey === rec.安装位置.列表键 && row.itemKey === rec.安装位置.物品键);
      if (rec.生产增益) state.body.append(el('p', 'crypt-lord-savant-enhancement__muted',
        equipment?.item.isEquipped === true && equipment.listKey !== '武器列表'
          ? '生产增益已生效' : '生产增益休眠：须安装在已装备的非武器宿主'));
      if (rec.武器效果) state.body.append(el('p', 'crypt-lord-savant-enhancement__muted',
        equipment?.listKey === '武器列表' && (equipment.item.战斗效果 || equipment.item.$战斗分类)
          ? '武器参数将在个人战斗中按当前分类或旧式效果投影'
          : '未分类武器将在下次开战绘图时尝试分类；失败时保留原参数'));
      state.body.append(el('p', risk ? 'crypt-lord-savant-enhancement__warning' : '',
        `宿主：${rec.安装位置.装备名称} · 第${count}次卸下${risk ? `，永久损坏风险 ${risk}%` : '，必定安全'}`));
      actions(button('卸下模块', () => void run(async token => {
        if (!win().confirm(`卸下“${rec.名称}”？${risk ? `本次有 ${risk}% 的永久损坏风险。` : ''}`)) return;
        const fresh = await verify(token);
        const outcome = service.detach(fresh.data, rec.id);
        await commit(token, fresh, outcome.data);
        if (outcome.broken) state.detail = '';
        notice(outcome.broken ? '模块卸下时永久损坏' : '模块已安全卸下');
      })));
    } else {
      const rows = service.equipment(data);
      const choice = select([['', '选择目标装备'],
        ...rows.filter(row => !row.item.$强化模块安装?.模块ID)
          .map(row => [JSON.stringify([row.listKey, row.itemKey]), `${row.listKey} · ${row.name}`])],
      '目标装备');
      state.body.append(field('目标装备', choice));
      actions(button('安装模块', () => void run(async token => {
        if (!choice.value) throw new Error('请选择目标装备');
        const [listKey, itemKey] = JSON.parse(choice.value);
        const fresh = await verify(token);
        await commit(token, fresh, service.install(fresh.data, rec.id, listKey, itemKey));
        notice('模块已安装');
      })));
    }
    actions(button('返回模块仓库', () => { state.detail = ''; render(); }));
  }
  function render() {
    if (!state.panel || state.panel.dataset.open !== 'true') return;
    state.body.replaceChildren();
    if (!state.snapshot) state.body.append(el('p', '', '正在读取真实 assistant 楼层…'));
    else if (state.detail) renderDetail();
    else renderMain();
    state.body.style.pointerEvents = state.busy ? 'none' : '';
  }
  const api = Object.freeze({
    status: () => ({ ready: Boolean(state.panel), open: state.panel?.dataset.open === 'true' }),
    mount, open, close,
    dispose() {
      state.disposed = true;
      close();
      state.subscription?.stop();
      state.panel?.remove();
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  mount();
})();
