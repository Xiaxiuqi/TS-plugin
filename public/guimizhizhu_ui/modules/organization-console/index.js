(() => {
  'use strict';

  const KEY = 'cryptLord.organizationConsole';
  const STORE_KEY = 'cryptLord.stateStore';
  const HOST_KEY = 'cryptLord.afterNativeHost';
  const INDUSTRY_KEY = 'cryptLord.industryState';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const host = root.__stage1Modules?.[HOST_KEY];
  if (!host) throw new Error(`[${KEY}] shared/after-native-host.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const industryState = modules[INDUSTRY_KEY];
  if (!industryState) throw new Error(`[${KEY}] core/industry-state.js 尚未加载`);

  const SPECS = Object.freeze({
    industry: Object.freeze({
      title: '我的产业',
      keys: Object.freeze(['产业', '产业数据', 'industries', 'industry']),
      singular: '产业',
      defaultRecord: Object.freeze({ 名称: '新产业' }),
    }),
    faction: Object.freeze({
      title: '势力管理',
      keys: Object.freeze(['势力', '势力数据', 'factions', 'faction']),
      singular: '势力',
      defaultRecord: Object.freeze({ 名称: '新势力', 关系: '中立', 影响力: 0, 状态: '观望', 描述: '' }),
    }),
  });
  const state = { mask: null, dialog: null, body: null, kind: null, targetId: null, data: null, source: null, baseline: null,
    pathways: {}, drag: null, busy: false, epoch: 0, openSequence: 0, subscription: null, disposed: false };

  function record(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
  function clone(value) { return typeof window.structuredClone === 'function' ? window.structuredClone(value) : JSON.parse(JSON.stringify(value)); }
  function document() { return host.getHost()?.document || window.document; }
  function windowForDocument() { return document().defaultView || window; }
  function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
  function notify(message, level = 'info') { const fn = window.toastr?.[level]; if (typeof fn === 'function') fn(message); }
  function element(tag, className, text) { const node = document().createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
  function button(label, className, handler) { const node = element('button', className, label); node.type = 'button'; node.addEventListener('click', handler); return node; }
  function field(recordValue, names, fallback = '') { for (const name of names) if (recordValue?.[name] !== undefined && recordValue[name] !== null) return recordValue[name]; return fallback; }
  function inputValue(node, prior) { return typeof prior === 'number' ? number(node.value) : node.value; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function findSource(data, keys) {
    for (const domain of ['stat_data', 'world_data']) {
      const domainData = record(data?.[domain]) ? data[domain] : {};
      for (const key of keys) if (domainData[key] !== undefined) return { domain, key, value: domainData[key] };
    }
    return { domain: 'stat_data', key: keys[0], value: undefined };
  }
  function rowsFrom(value) {
    if (Array.isArray(value)) return value.map((item, index) => ({ id: String(index), value: record(item) ? item : { 名称: String(item ?? '') } }));
    if (record(value)) return Object.entries(value).filter(([key]) => key !== '$meta').map(([key, item]) => ({ id: key, value: record(item) ? item : { 名称: key, 数值: item } }));
    return [];
  }
  function writeRows(rows) {
    const original = state.source.value;
    if (Array.isArray(original)) return rows.map(row => row.value);
    return {
      ...(Object.hasOwn(original, '$meta') ? { $meta: clone(original.$meta) } : {}),
      ...Object.fromEntries(rows.map(row => [row.id || String(field(row.value, ['名称', 'name'], '未命名')), row.value])),
    };
  }
  function currentRows() { return rowsFrom(state.source?.value); }
  function close() { state.openSequence++; if (state.mask) state.mask.dataset.open = 'false'; }
  function dragDialog(header) {
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const rect = state.dialog.getBoundingClientRect();
      state.drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      header.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    header.addEventListener('pointermove', event => {
      if (!state.drag) return;
      const view = windowForDocument();
      const width = state.dialog.offsetWidth;
      const height = state.dialog.offsetHeight;
      state.dialog.style.left = `${clamp(state.drag.left + event.clientX - state.drag.x, 8, view.innerWidth - width - 8)}px`;
      state.dialog.style.top = `${clamp(state.drag.top + event.clientY - state.drag.y, 8, view.innerHeight - height - 8)}px`;
      state.dialog.style.transform = 'none';
    });
    header.addEventListener('pointerup', () => { state.drag = null; });
    header.addEventListener('pointercancel', () => { state.drag = null; });
  }
  function mount() {
    if (state.disposed || state.mask) return Boolean(state.mask);
    const body = document().body;
    if (!body) return false;
    const mask = element('section', 'crypt-lord-organization-console');
    mask.dataset.open = 'false';
    mask.innerHTML = '<section class="crypt-lord-organization-console__dialog" role="dialog" aria-modal="true"><header><strong data-console-title></strong><span>真实 assistant 楼层数据</span><button type="button" data-console-close title="关闭">×</button></header><div class="crypt-lord-organization-console__body" data-console-body></div></section>';
    state.mask = mask;
    state.dialog = mask.querySelector('.crypt-lord-organization-console__dialog');
    state.body = mask.querySelector('[data-console-body]');
    mask.addEventListener('click', event => { if (event.target === mask || event.target?.dataset?.consoleClose !== undefined) close(); });
    dragDialog(mask.querySelector('header'));
    body.appendChild(mask);
    const events = host.tavernEvents();
    if (events?.CHAT_CHANGED) state.subscription = host.bindEvent(events.CHAT_CHANGED, () => {
      state.epoch++;
      close();
    });
    return true;
  }
  function metric(label, value) { const item = element('div', 'crypt-lord-organization-console__metric'); item.append(element('span', '', label), element('strong', '', String(value))); return item; }
  function editableLine(label, prior, onChange) {
    const line = element('label', 'crypt-lord-organization-console__line');
    line.appendChild(element('span', '', label));
    const input = element('input');
    input.type = typeof prior === 'number' ? 'number' : 'text';
    input.value = String(prior ?? '');
    input.addEventListener('change', () => onChange(inputValue(input, prior)));
    line.appendChild(input);
    return line;
  }
  function renderIndustry(rows) {
    const summary = industryState.dashboard(state.source.value, undefined, industry => ({
      ...industry, ...industryState.principal(industry, state.data, state.pathways, state.source.value).fields,
    }));
    const metrics = element('div', 'crypt-lord-organization-console__metrics');
    metrics.append(metric('产业总估值', summary.valuation), metric('产业数量', summary.count),
      metric('预计总月收益', summary.monthlyReturn), metric('平均回报率', `${summary.averageRate}%`));
    state.body.appendChild(metrics);
    const output = element('div', 'crypt-lord-organization-console__production');
    output.appendChild(element('strong', '', '预计总月产出'));
    output.appendChild(element('span', '', summary.production.length
      ? summary.production.map(([name, amount]) => `${name} ${amount}`).join(' · ') : '暂无产出'));
    state.body.appendChild(output);
  }
  function updateEntry(entry, key, value) { entry.value[key] = value; }
  function industryCard(entry, index, expanded) {
    const industry = entry.value;
    const principal = industryState.principal(industry, state.data, state.pathways, state.source.value);
    const perf = industryState.evaluate({ ...industry, ...principal.fields });
    const card = element('article', 'crypt-lord-organization-console__card crypt-lord-organization-console__industry');
    const title = element('div', 'crypt-lord-organization-console__card-title');
    const identity = element('div', 'crypt-lord-organization-console__industry-identity');
    identity.append(element('strong', '', String(field(industry, ['名称'], `产业${index + 1}`))),
      element('span', '', `${industry.类型 || '未知类型'} · ${perf.scale}`));
    title.appendChild(identity);
    title.appendChild(button('删除', 'crypt-lord-organization-console__delete', () => {
      if (!windowForDocument().confirm('删除该产业记录？')) return;
      if (Array.isArray(state.source.value)) state.source.value.splice(Number(entry.id), 1);
      else delete state.source.value[entry.id];
      renderRows();
    }));
    card.appendChild(title);
    const overview = element('div', 'crypt-lord-organization-console__industry-overview');
    overview.append(metric('当前资本', `${perf.capital} ${perf.currency}`.trim()),
      metric('月净收益', `${Math.round(perf.monthlyReturn)} ${perf.currency}`.trim()),
      metric('月回报率', `${perf.baseRate}% → ${perf.actualRate.toFixed(2)}%`),
      metric('固定成本', `${Math.round(perf.actualFixedCost)} ${perf.currency}`.trim()));
    card.appendChild(overview);
    const details = element('details', 'crypt-lord-organization-console__industry-details');
    details.dataset.id = entry.id;
    details.open = expanded.has(entry.id);
    details.appendChild(element('summary', '', '经营详情与生产分配'));
    const content = element('div', 'crypt-lord-organization-console__industry-content');
    const principalStatus = element('div', 'crypt-lord-organization-console__principal');
    const stateLabel = {
      'no-principal': '未指派负责人', unrecognized: `负责人 ${principal.name} 未识别`,
      'no-relation': `负责人 ${principal.name} 关系未建立`,
    };
    const tierLabel = principal.source.startsWith('sequence-') ? `序列 ${principal.source.slice(9)}`
      : principal.source === 'old-day' ? '旧日' : principal.source === 'pillar' ? '支柱' : '普通人';
    const specialty = principal.specialty === 'matched' ? ` · 偏科 ${principal.pathway} +2档`
      : principal.specialty === 'generalist' ? ` · 万金油 ${principal.pathway} +1档` : '';
    const affinityLabel = principal.affinity >= 130 ? '心腹 · BUFF满效'
      : principal.affinity >= 30 ? `BUFF ${Math.round(principal.coefficient * 100)}%`
      : principal.affinity >= 0 ? '关系冷淡 · 效率减损' : '关系恶化 · 怠工';
    principalStatus.append(
      element('strong', '', stateLabel[principal.source] ||
        `${principal.name}（${tierLabel}${specialty}）· ${principal.tier}/12档 · 好感 ${principal.affinity} · ${affinityLabel}`),
      element('span', '', !principal.name || stateLabel[principal.source] ? '负责人需在 NPC 数据和人物关系列表中。'
        : principal.lightLoad ? `轻负荷：本产业不扣好感 · 合计 -${principal.totalDeduction}/周`
        : principal.floorReached ? '好感已达地板（≤10），本周不再扣减'
        : `本产业 -${principal.weeklyDeduction}/周 · 合计 -${principal.totalDeduction}/周`),
    );
    if (principal.sources.length > 1) principalStatus.title = principal.sources.map(item => `${item.name} -${item.perWeek}/周`).join('\n');
    content.appendChild(principalStatus);
    const edit = (label, key, fallback = '') => editableLine(label, field(industry, [key], fallback), value => {
      updateEntry(entry, key, value);
      if (['当前投入资本总额', '负责人'].includes(key)) renderRows();
    });
    const type = element('label', 'crypt-lord-organization-console__line');
    type.appendChild(element('span', '', '类型'));
    const choices = element('select');
    ['独立领地', '第一产业', '第二产业', '第三产业'].forEach(value => {
      const option = element('option', '', value);
      option.value = value;
      choices.appendChild(option);
    });
    choices.value = String(industry.类型 || '第一产业');
    choices.addEventListener('change', () => { industry.类型 = choices.value; renderRows(); });
    type.appendChild(choices);
    content.append(edit('名称', '名称'), type, edit('当前投入资本总额', '当前投入资本总额', '0 金镑'),
      edit('利润倍率', '利润倍率', 1), edit('负责人', '负责人'));
    const derived = element('div', 'crypt-lord-organization-console__derived');
    derived.appendChild(element('strong', '', '负责人派生经营属性'));
    for (const [label, value] of Object.entries(principal.fields)) derived.appendChild(metric(label, value));
    content.appendChild(derived);
    const lightLoad = element('label', 'crypt-lord-organization-console__light-load');
    const lightCheck = element('input');
    lightCheck.type = 'checkbox';
    lightCheck.checked = industry['$轻负荷运营'] === true;
    lightCheck.addEventListener('change', () => { industry['$轻负荷运营'] = lightCheck.checked; renderRows(); });
    lightLoad.append(lightCheck, element('span', '', '轻负荷运营（周结算收益减半）'));
    content.appendChild(lightLoad);
    const production = element('div', 'crypt-lord-organization-console__allocation');
    production.appendChild(element('strong', '', `生产分配 · ${perf.productType}`));
    perf.allocation.forEach((amount, index) => {
      const level = index + 1;
      const line = element('label', 'crypt-lord-organization-console__allocation-line');
      line.appendChild(element('span', '', `${level}级`));
      const input = element('input');
      input.type = 'number';
      input.min = '0'; input.max = '100'; input.step = '1';
      input.value = String(amount);
      input.disabled = level > perf.maxLevel;
      input.addEventListener('change', () => {
        try {
          const next = industryState.allocation(entry.value, level, input.value);
          if (Array.isArray(state.source.value)) state.source.value[Number(entry.id)] = next;
          else state.source.value[entry.id] = next;
          renderRows();
        } catch (error) {
          input.value = String(amount);
          notify(error.message, 'warning');
        }
      });
      line.append(input, element('span', '', `% · 预计 ${perf.production[index]}`));
      production.appendChild(line);
    });
    content.append(production, edit('产业情况概述', '产业情况概述'),
      edit('资产', '资产'), edit('收入来源', '收入来源'),
      edit('创建时间', '创建时间'), edit('上次结算时间', '上次结算时间'));
    details.appendChild(content);
    card.appendChild(details);
    return card;
  }
  function renderRows() {
    const scrollTop = state.body.scrollTop;
    const expanded = new Set(Array.from(state.body.querySelectorAll('.crypt-lord-organization-console__industry-details[open]'))
      .map(node => node.dataset.id));
    state.body.replaceChildren();
    const spec = SPECS[state.kind];
    const rows = currentRows();
    if (state.kind === 'industry') renderIndustry(rows);
    const toolbar = element('div', 'crypt-lord-organization-console__toolbar');
    toolbar.append(button(`新建${spec.singular}`, 'crypt-lord-organization-console__button', () => {
      if (state.kind === 'industry') {
        const existing = state.body.querySelector('.crypt-lord-organization-console__new-industry input');
        if (existing) { existing.focus(); return; }
        const form = element('div', 'crypt-lord-organization-console__new-industry');
        const nameInput = element('input');
        nameInput.type = 'text';
        nameInput.placeholder = '产业名称';
        nameInput.maxLength = 80;
        const create = () => {
          const name = nameInput.value.trim();
          if (!name) { nameInput.focus(); return; }
          const gameTime = state.data?.world_data?.当前时间纪元 || state.data?.stat_data?.当前时间纪元 || '';
          const next = industryState.create(name, gameTime);
          const source = state.source.value;
          if (Array.isArray(source)) source.push(next);
          else {
            const base = `industry_${Date.now()}`;
            let id = base;
            for (let index = 1; Object.hasOwn(source, id); index++) id = `${base}_${index}`;
            source[id] = next;
          }
          renderRows();
        };
        nameInput.addEventListener('keydown', event => { if (event.key === 'Enter') create(); });
        form.append(nameInput, button('创建', 'crypt-lord-organization-console__button is-primary', create),
          button('取消', 'crypt-lord-organization-console__button', () => form.remove()));
        toolbar.after(form);
        nameInput.focus();
        return;
      }
      const name = windowForDocument().prompt(`请输入${spec.singular}名称：`, spec.defaultRecord.名称);
      if (name === null || !name.trim()) return;
      const next = clone(spec.defaultRecord);
      next.名称 = name.trim();
      const source = state.source.value;
      if (Array.isArray(source)) source.push(next);
      else state.source.value[String(next.名称)] = next;
      renderRows();
    }), button('重新读取', 'crypt-lord-organization-console__button', () => { void open(state.kind, state.targetId); }), button('保存更改', 'crypt-lord-organization-console__button is-primary', () => { void save(); }));
    state.body.appendChild(toolbar);
    const list = element('div', 'crypt-lord-organization-console__list');
    rows.forEach((entry, index) => {
      if (state.kind === 'industry') {
        list.appendChild(industryCard(entry, index, expanded));
        return;
      }
      const card = element('article', 'crypt-lord-organization-console__card');
      const title = element('div', 'crypt-lord-organization-console__card-title');
      title.appendChild(element('strong', '', String(field(entry.value, ['名称', 'name'], entry.id || `${spec.singular}${index + 1}`))));
      title.appendChild(button('删除', 'crypt-lord-organization-console__delete', () => {
        if (!windowForDocument().confirm(`删除该${spec.singular}记录？`)) return;
        if (Array.isArray(state.source.value)) state.source.value.splice(Number(entry.id), 1); else delete state.source.value[entry.id];
        renderRows();
      }));
      card.appendChild(title);
      card.append(
        editableLine('名称', field(entry.value, ['名称', 'name'], ''), value => updateEntry(entry, '名称', value)),
        editableLine('关系', field(entry.value, ['关系', '立场', '态度'], '中立'), value => updateEntry(entry, '关系', value)),
        editableLine('影响力', field(entry.value, ['影响力', '声望', '势力值'], 0), value => updateEntry(entry, '影响力', value)),
        editableLine('状态', field(entry.value, ['状态', '阶段'], ''), value => updateEntry(entry, '状态', value)),
        editableLine('描述', field(entry.value, ['描述', '备注'], ''), value => updateEntry(entry, '描述', value)),
      );
      list.appendChild(card);
    });
    if (!rows.length) list.appendChild(element('div', 'crypt-lord-organization-console__empty', `暂无${spec.singular}。可通过剧情获得，或在此建立第一条记录。`));
    state.body.appendChild(list);
    state.body.scrollTop = scrollTop;
  }
  async function save() {
    if (state.busy) return;
    const epoch = state.epoch;
    const kind = state.kind;
    const messageId = state.targetId;
    state.busy = true;
    try {
      const store = await contract.waitGlobalInitialized(STORE_KEY, { timeoutMs: 10000 });
      if (epoch !== state.epoch) throw new Error('聊天已变化，请重新读取。');
      const target = await store.readMessage(messageId);
      if (target?.role !== 'assistant') throw new Error('目标楼层不是 assistant。');
      const current = findSource(target.data, SPECS[kind].keys);
      if (current.domain !== state.source.domain || current.key !== state.source.key ||
        JSON.stringify(current.value) !== state.baseline) throw new Error('产业或势力数据已变化，请重新读取。');
      if (kind === 'industry') {
        currentRows().forEach(row => {
          if (industryState.parseCurrency(row.value.当前投入资本总额).value < 0 ||
            !/^\s*\d+(?:[.,_]\d+)*\s*\S*\s*$/.test(String(row.value.当前投入资本总额 ?? ''))) {
            throw new Error(`「${row.value.名称 || row.id}」的投入资本格式无效。`);
          }
          const allocations = Array.from({ length: 5 }, (_, index) =>
            Number(row.value[`生产分配_${index + 1}级`] ?? (index === 0 ? 100 : 0)));
          if (allocations.some(amount => !Number.isFinite(amount) || amount < 0 || amount > 100) ||
            allocations.reduce((total, amount) => total + amount, 0) > 100) {
            throw new Error(`「${row.value.名称 || row.id}」的生产分配必须在 0 到 100% 之间且总和不超过 100%。`);
          }
        });
      }
      const before = clone(target.data || {});
      const next = clone(target.data || {});
      next[state.source.domain] = record(next[state.source.domain]) ? next[state.source.domain] : {};
      const rows = currentRows();
      if (kind === 'industry') rows.forEach(row => {
        row.value = { ...row.value, ...industryState.principal(row.value, target.data, state.pathways, state.source.value).fields };
      });
      next[state.source.domain][state.source.key] = writeRows(rows);
      if (epoch !== state.epoch || kind !== state.kind || messageId !== state.targetId) throw new Error('聊天已变化，请重新读取。');
      await store.writeAssistantData(messageId, next);
      state.data = next;
      state.source = findSource(next, SPECS[kind].keys);
      state.source.value = clone(state.source.value);
      state.baseline = JSON.stringify(state.source.value);
      root.__stage1Modules?.['cryptLord.variableWorkbench']?.notifyUpdate?.({ messageId, beforeData: before, afterData: next, source: 'organization-console' });
      notify(`${SPECS[kind].title}已保存到真实 assistant 楼层。`, 'success');
    } catch (error) { notify(`保存失败：${error?.message || error}`, 'error'); }
    finally { state.busy = false; }
  }
  async function open(kind, messageId) {
    if (!SPECS[kind]) throw new Error(`未知管理面板：${kind}`);
    if (!mount()) return false;
    const sequence = ++state.openSequence;
    const epoch = state.epoch;
    if (kind === 'industry') {
      try {
        const loaded = await industryState.loadConfigs();
        if (sequence !== state.openSequence || epoch !== state.epoch) return false;
        if (loaded.warnings.length) notify(`部分产业配置无效，已忽略：${loaded.warnings[0]}`, 'warning');
      } catch (error) {
        if (sequence !== state.openSequence || epoch !== state.epoch) return false;
        notify(`产业配置读取失败，使用默认规则：${error.message}`, 'warning');
      }
      try {
        const pathways = await industryState.loadPathways();
        if (sequence !== state.openSequence || epoch !== state.epoch) return false;
        state.pathways = pathways;
      } catch (error) {
        if (sequence !== state.openSequence || epoch !== state.epoch) return false;
        state.pathways = {};
        notify(`神之途径读取失败，负责人偏科加成暂不可用：${error.message}`, 'warning');
      }
    }
    const store = await contract.waitGlobalInitialized(STORE_KEY, { timeoutMs: 10000 });
    const target = await store.readMessage(messageId);
    if (sequence !== state.openSequence || epoch !== state.epoch) return false;
    if (target?.role !== 'assistant') throw new Error('请先选择一条真实 assistant 楼层。');
    state.kind = kind;
    state.targetId = target.message_id;
    state.data = clone(target.data || {});
    state.source = findSource(state.data, SPECS[kind].keys);
    state.baseline = JSON.stringify(state.source.value);
    state.source.value = state.source.value === undefined
      ? kind === 'industry' ? { $meta: { extensible: true, 总估值: '', 上次计算时间: '' } } : []
      : clone(state.source.value);
    state.mask.dataset.open = 'true';
    state.dialog.querySelector('[data-console-title]').textContent = `${SPECS[kind].title} · 楼层 #${state.targetId}`;
    const config = industryState.status();
    state.dialog.querySelector('header span').textContent = kind === 'industry'
      ? `真实 assistant 楼层数据 · ${config.source}` : '真实 assistant 楼层数据';
    renderRows();
    return true;
  }
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: Boolean(state.mask), open: state.mask?.dataset.open === 'true', kind: state.kind, targetId: state.targetId }); },
    mount,
    open,
    close,
    dispose() { state.disposed = true; state.subscription?.stop?.(); state.mask?.remove(); state.mask = null; try { contract.releaseGlobal(KEY, api); } catch {} if (modules[KEY] === api) delete modules[KEY]; return true; },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  mount();
})();
