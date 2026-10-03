(() => {
  'use strict';
  const KEY = 'cryptLord.savantMaterialUi';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const service = modules['cryptLord.savantMaterial'];
  const afterNative = modules['cryptLord.afterNativeHost'];
  if (!contract || !service || !afterNative) throw new Error('材料加工窗口依赖尚未加载');
  const state = { panel: null, body: null, notice: null, snapshot: null, selected: new Map(),
    queue: [], index: 0, candidate: 0, operations: ['', '', ''], phase: 'select',
    outcome: null, busy: false, token: 0, subscription: null, disposed: false };
  const doc = () => afterNative.getHost()?.document || document;
  const win = () => doc().defaultView || window;
  const el = (tag, className = '', text) => {
    const node = doc().createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (label, fn, title = '') => {
    const node = el('button', '', label);
    node.type = 'button';
    if (title) node.title = title;
    node.addEventListener('click', fn);
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
    state.queue = [];
    state.selected.clear();
  }
  function mount() {
    if (state.disposed || state.panel || !doc().body) return Boolean(state.panel);
    const panel = el('section', 'crypt-lord-savant-material');
    panel.dataset.open = 'false';
    const header = el('header');
    header.append(el('strong', '', '通识者 · 材料加工'), button('×', close, '关闭'));
    const body = el('main', 'crypt-lord-savant-material__body');
    const footer = el('footer', 'crypt-lord-savant-material__notice');
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
      fresh.message !== state.snapshot.message || JSON.stringify(fresh.data) !== state.snapshot.revision) {
      throw new Error('楼层正文或变量已变化，请重新读取');
    }
    return fresh;
  }
  async function refresh(token) {
    const latest = await (await store()).findLatestAssistant();
    if (!active(token)) return;
    if (!latest) throw new Error('没有真实 assistant 楼层');
    state.snapshot = { id: latest.message_id, message: latest.message,
      revision: JSON.stringify(latest.data), data: latest.data };
    state.phase = 'select';
    state.queue = [];
    state.selected.clear();
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
  async function open() {
    if (!mount()) return false;
    state.token++;
    const token = state.token;
    state.panel.dataset.open = 'true';
    state.panel.style.left = '';
    state.panel.style.top = '';
    state.panel.style.transform = '';
    state.snapshot = null;
    state.phase = 'select';
    state.body.replaceChildren();
    notice('正在读取当前楼层…');
    try {
      await refresh(token);
      if (active(token)) notice('');
    } catch (error) {
      if (active(token)) notice(error?.message || String(error), true);
    }
    return true;
  }
  function actions(...buttons) {
    const row = el('div', 'crypt-lord-savant-material__actions');
    row.append(...buttons);
    state.body.append(row);
  }
  function field(label, control) {
    const row = el('label', 'crypt-lord-savant-material__field');
    row.append(el('span', '', label), control);
    return row;
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
  function renderWarehouse() {
    const warehouse = el('section', 'crypt-lord-savant-material__section');
    const rows = service.batches(state.snapshot.data);
    warehouse.append(el('h3', '', `材料仓库 · ${rows.length} 批`));
    if (!rows.length) warehouse.append(el('p', 'crypt-lord-savant-material__muted', '尚无加工完成的材料。'));
    for (const row of rows) {
      const batch = el('div', 'crypt-lord-savant-material__warehouse');
      batch.append(el('strong', '', `${row.具体材质} · ${row.数量} 份`),
        el('span', 'crypt-lord-savant-material__muted',
          `${row.材质族} · ${row.等级} · ${row.关联途径 || '无'} · ${row.性质?.join('、') || '无性质'} · ${row.加工结果}`));
      warehouse.append(batch);
    }
    state.body.append(warehouse);
  }
  function renderSelect() {
    const access = service.gate(state.snapshot.data?.stat_data);
    state.body.append(el('p', 'crypt-lord-savant-material__muted',
      access.unlocked ? `当前有效序列 ${access.rank} · 每批最多 20 个来源` : '通识者序列6或知识之妖解锁材料加工。'));
    renderWarehouse();
    const rows = service.sources(state.snapshot.data);
    const section = el('section', 'crypt-lord-savant-material__section');
    section.append(el('h3', '', `待认定来源 · ${rows.length}`));
    if (!rows.length) section.append(el('p', '', '当前没有可加工的物品或尸体。'));
    rows.forEach((row, index) => {
      const line = el('div', 'crypt-lord-savant-material__source');
      const checkbox = el('input');
      checkbox.type = 'checkbox';
      checkbox.checked = state.selected.has(index);
      checkbox.disabled = !access.unlocked || state.busy;
      checkbox.setAttribute('aria-label', `选择${row.name}`);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) state.selected.set(index, row.stackable ? Number(quantity?.value) : 1);
        else state.selected.delete(index);
      });
      const label = el('label');
      label.append(checkbox, el('span', '', `${row.name} · ${row.kind === 'corpse'
        ? `尸体 · ${row.snapshot.当前序列}` : `${row.listKey} · ${row.snapshot.序列}`}`));
      line.append(label);
      let quantity = null;
      if (row.stackable) {
        quantity = el('input');
        quantity.type = 'number';
        quantity.min = '.01';
        quantity.max = String(row.available);
        quantity.step = '.01';
        quantity.value = String(state.selected.get(index) ?? Math.min(1, row.available));
        quantity.setAttribute('aria-label', `${row.name}数量`);
        quantity.addEventListener('change', () => {
          if (state.selected.has(index)) state.selected.set(index, Number(quantity.value));
        });
        line.append(quantity, el('span', '', `/ ${row.available}`));
      }
      section.append(line);
    });
    state.body.append(section);
    const start = button('认定所选来源', () => void run(recognize));
    start.disabled = !access.unlocked || !rows.length || state.busy;
    actions(start, button('重新读取楼层', () => void run(refresh)));
  }
  async function recognize(token) {
    const current = await verify(token);
    const all = service.sources(current.data);
    const picked = [...state.selected].map(([index, qty]) => {
      const source = all[index];
      if (!source) throw new Error('来源已变化，请重新选择');
      const selectedQty = source.stackable ? Number(qty) : 1;
      if (!Number.isFinite(selectedQty) || selectedQty <= 0 || selectedQty > source.available)
        throw new Error('所选数量必须大于零且不能超过现有数量');
      return { ...source, selectedQty };
    });
    if (!picked.length || picked.length > 20) throw new Error('请选择 1 到 20 个来源');
    notice('正在认定来源…');
    const raw = await service.request(picked, current.data.stat_data, current.message);
    await verify(token);
    const parsed = service.parseRecognition(raw, picked.length);
    state.queue = picked.map((source, index) => ({ source, ...parsed[index] }));
    state.index = 0;
    state.candidate = 0;
    state.operations = ['', '', ''];
    state.phase = 'queue';
    notice('认定完成，来源尚未消耗');
  }
  function renderQueue() {
    const row = state.queue[state.index];
    if (!row) {
      state.body.append(el('p', '', '本批来源已处理完毕。'));
      actions(button('返回来源', () => { state.phase = 'select'; render(); }));
      return;
    }
    state.body.append(el('h3', '', `来源 ${state.index + 1}/${state.queue.length} · ${row.source.name}`),
      el('p', 'crypt-lord-savant-material__muted',
        `投入 ${row.source.selectedQty} ${row.source.snapshot.单位 || '具'}；只能提取一种候选，其余会随加工损失。`));
    if (!row.candidates.length) {
      state.body.append(el('p', 'crypt-lord-savant-material__warning', row.reason));
      actions(button('下一个来源', nextSource));
      return;
    }
    const candidate = row.candidates[state.candidate] || row.candidates[0];
    const choice = select(row.candidates.map((item, index) => [
      String(index), `${item.material} · ${item.family} · ${item.grade}`,
    ]), '目标材质', String(state.candidate));
    choice.addEventListener('change', () => { state.candidate = Number(choice.value); render(); });
    state.body.append(field('目标材质', choice),
      el('p', 'crypt-lord-savant-material__muted',
        `${candidate.family} · 来源${candidate.grade} · ${candidate.pathway} · 性质：${candidate.traits.join('、') || '无'} · 难度 ${candidate.difficulty}`),
      el('p', 'crypt-lord-savant-material__muted', `线索：${candidate.clue}`));
    for (let i = 0; i < 3; i++) {
      const operation = select([['', '选择工序'], ...service.OPERATIONS.map(op => [op, op])],
        `第${i + 1}道工序`, state.operations[i]);
      operation.addEventListener('change', () => { state.operations[i] = operation.value; render(); });
      state.body.append(field(`第 ${i + 1} 道工序`, operation));
    }
    try {
      const risk = service.chance(candidate, row.source, state.operations,
        service.gate(state.snapshot.data.stat_data).rank,
        modules['cryptLord.savantEnhancement']?.productionBonuses?.(state.snapshot.data).successBonus || 0);
      state.body.append(el('p', 'crypt-lord-savant-material__muted',
        `风险：${risk.value >= 80 ? '低' : risk.value >= 60 ? '中' : risk.value >= 40 ? '高' : '极高'}`));
    } catch { /* The operation sequence is not complete yet. */ }
    const process = button('确认加工', () => void run(settle));
    process.disabled = state.busy || state.operations.some(op => !op) ||
      new Set(state.operations).size !== 3;
    actions(process, button('跳过来源', nextSource));
  }
  function nextSource() {
    state.index++;
    state.candidate = 0;
    state.operations = ['', '', ''];
    state.phase = 'queue';
    render();
  }
  async function settle(token) {
    const row = state.queue[state.index];
    const candidate = row?.candidates[state.candidate];
    if (!candidate) throw new Error('目标材质已变化');
    await verify(token);
    if (!win().confirm(`确定消耗“${row.source.name}”加工“${candidate.material}”？失败也不返还来源。`)) return;
    const fresh = await verify(token);
    const values = new Uint32Array(1);
    const roll = win().crypto?.getRandomValues
      ? (win().crypto.getRandomValues(values), 1 + values[0] % 100)
      : 1 + Math.floor(Math.random() * 100);
    const id = `material-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const outcome = service.process(fresh.data, row.source, candidate, state.operations, roll, id);
    await verify(token);
    await (await store()).writeAssistantData(fresh.message_id, outcome.data);
    if (!active(token)) return;
    const saved = await (await store()).readMessage(fresh.message_id);
    if (!active(token)) return;
    if (!saved || saved.role !== 'assistant' ||
      JSON.stringify(service.batches(saved.data)) !== JSON.stringify(service.batches(outcome.data)) ||
      JSON.stringify(service.sources(saved.data)) !== JSON.stringify(service.sources(outcome.data)))
      throw new Error('写入后楼层数据不一致，请重新读取');
    state.snapshot.data = saved.data;
    state.snapshot.revision = JSON.stringify(state.snapshot.data);
    modules['cryptLord.variableWorkbench']?.notifyUpdate?.({
      messageId: fresh.message_id, beforeData: fresh.data, afterData: state.snapshot.data,
      source: 'savant-material',
    });
    state.outcome = { ...outcome, sourceName: row.source.name };
    state.selected.clear();
    state.phase = 'result';
    notice(`加工结果：${outcome.result}`);
  }
  function renderResult() {
    const result = state.outcome;
    state.body.append(el('h3', '', `加工结果 · ${result.result}`),
      el('p', '', `${result.sourceName} · 投骰 ${result.roll} / 成功率 ${result.chance}%`),
      el('p', '', `工序匹配：${result.match.labels.join(' · ')}`),
      el('p', '', `标准工序：${result.standard.join(' → ')}`),
      el('p', '', result.batch
        ? `获得 ${result.batch.具体材质} · ${result.batch.等级} · ${result.batch.数量} 份`
        : '来源已消耗，无材料产出。'));
    actions(button('下一个来源', nextSource), button('查看材料仓库', () => {
      state.phase = 'select'; render();
    }));
  }
  function render() {
    if (!state.panel || state.panel.dataset.open !== 'true') return;
    state.body.replaceChildren();
    if (!state.snapshot) {
      state.body.append(el('p', '', '正在读取当前真实楼层…'));
      return;
    }
    if (state.phase === 'select') renderSelect();
    else if (state.phase === 'queue') renderQueue();
    else renderResult();
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
