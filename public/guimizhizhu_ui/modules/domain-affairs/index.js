(() => {
  'use strict';
  const KEY = 'cryptLord.domainAffairsUi';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const host = modules['cryptLord.afterNativeHost'];
  const workflow = modules['cryptLord.domainAffairs'];
  const affairs = modules['cryptLord.affairState'];
  const store = modules['cryptLord.stateStore'];
  if (!host || !workflow || !affairs || !store) throw new Error(`[${KEY}] 依赖尚未加载`);
  const state = {
    shell: null, dialog: null, body: null, targetId: null, baseline: '', data: null,
    story: '', turn: 0, busy: false, epoch: 0, operation: 0, drag: null, subscription: null, disposed: false,
  };
  const doc = () => host.getHost()?.document || window.document;
  const view = () => doc().defaultView || window;
  const clone = value => JSON.parse(JSON.stringify(value));
  function el(tag, className, text) {
    const node = doc().createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }
  function button(label, handler, className = '') {
    const node = el('button', className, label);
    node.type = 'button';
    node.disabled = state.busy;
    node.addEventListener('click', () => { void handler(); });
    return node;
  }
  function notify(text, kind = 'error') {
    const toast = window.toastr?.[kind];
    if (typeof toast === 'function') toast(text);
    else if (kind === 'error') console.warn(`[${KEY}]`, text);
  }
  function session() { return workflow.sessionOf(state.data); }
  function domain() { return state.data?.stat_data?.领地; }
  function mounted() { return state.shell?.dataset.open === 'true'; }
  async function run(fn) {
    if (state.busy) return;
    const epoch = state.epoch;
    const operation = ++state.operation;
    state.busy = true;
    render();
    try {
      await fn(() => epoch === state.epoch && mounted());
    } catch (error) {
      if (epoch === state.epoch) notify(error?.message || String(error));
    } finally {
      if (operation === state.operation) {
        state.busy = false;
        if (epoch === state.epoch) render();
      }
    }
  }
  async function commit(next, valid) {
    if (!valid()) throw new Error('窗口或聊天已经变化，操作已取消');
    const latest = await store.findLatestAssistant();
    const target = await store.readMessage(state.targetId);
    if (!valid() || latest?.message_id !== state.targetId || target?.role !== 'assistant') {
      throw new Error('当前 assistant 楼层已变化，请重新读取');
    }
    if (JSON.stringify(target.data || {}) !== state.baseline) {
      throw new Error('楼层变量已被其他操作修改，请重新读取后重试');
    }
    const before = clone(target.data || {});
    await store.writeAssistantData(state.targetId, next);
    state.data = next;
    state.baseline = JSON.stringify(next);
    modules['cryptLord.variableWorkbench']?.notifyUpdate?.({
      messageId: state.targetId, beforeData: before, afterData: next, source: KEY,
    });
  }
  function mount() {
    if (state.disposed || state.shell) return Boolean(state.shell);
    if (!doc().body) return false;
    const shell = el('section', 'crypt-lord-affairs');
    shell.dataset.open = 'false';
    const dialog = el('section', 'crypt-lord-affairs__dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-label', '领地事务评定');
    const header = el('header');
    header.append(el('strong', '', '领地事务评定'), el('span', '', ''));
    header.appendChild(button('×', () => close(), 'crypt-lord-affairs__close'));
    const body = el('div', 'crypt-lord-affairs__body');
    dialog.append(header, body);
    shell.appendChild(dialog);
    doc().body.appendChild(shell);
    state.shell = shell; state.dialog = dialog; state.body = body;
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const rect = dialog.getBoundingClientRect();
      state.drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      header.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    header.addEventListener('pointermove', event => {
      if (!state.drag) return;
      const rect = dialog.getBoundingClientRect();
      dialog.style.left = `${Math.max(8, Math.min(view().innerWidth - rect.width - 8, state.drag.left + event.clientX - state.drag.x))}px`;
      dialog.style.top = `${Math.max(8, Math.min(view().innerHeight - rect.height - 8, state.drag.top + event.clientY - state.drag.y))}px`;
      dialog.style.transform = 'none';
    });
    header.addEventListener('pointerup', () => { state.drag = null; });
    header.addEventListener('pointercancel', () => { state.drag = null; });
    const events = host.tavernEvents();
    if (events?.CHAT_CHANGED) state.subscription = host.bindEvent(events.CHAT_CHANGED, close);
    return true;
  }
  async function open(messageId) {
    if (!mount()) return false;
    const latest = await store.findLatestAssistant();
    const id = Number.isInteger(messageId) ? messageId : latest?.message_id;
    if (id !== latest?.message_id) throw new Error('请在最新真实 assistant 楼层打开事务评定');
    const target = await store.readMessage(id);
    if (target?.role !== 'assistant') throw new Error('找不到当前 assistant 楼层');
    const hostApi = modules['cryptLord.hostApi'];
    const messages = await hostApi.getChatMessages('0-{{lastMessageId}}');
    state.targetId = id;
    state.baseline = JSON.stringify(target.data || {});
    state.data = clone(target.data || {});
    const nativeText = text => {
      const raw = String(text || '');
      return raw.match(/<gametxt\b[^>]*>([\s\S]*?)<\/gametxt>/i)?.[1] ||
        raw.replace(/<(?:UpdateVariable|thinking|reasoning|analysis)\b[^>]*>[\s\S]*?<\/(?:UpdateVariable|thinking|reasoning|analysis)>/gi, '');
    };
    const recent = Array.isArray(messages)
      ? messages.filter(item => item.role === 'assistant' && item.message_id <= id).slice(-15)
        .map(item => ({ id: item.message_id, text: nativeText(item.message).trim() }))
        .filter(item => item.text).map(item => `#${item.id} ${item.text}`)
      : [];
    state.story = (recent.length ? recent.join('\n\n') : nativeText(target.message)).slice(-16000);
    state.turn = Math.max(1, Array.isArray(messages) ? messages.filter(item => item.role === 'assistant' && item.message_id !== 0).length : 0);
    state.epoch += 1;
    state.operation += 1;
    state.busy = false;
    modules['cryptLord.domainConsole']?.close();
    state.shell.dataset.open = 'true';
    render();
    return true;
  }
  function close() {
    state.epoch += 1;
    state.operation += 1;
    state.busy = false;
    if (state.shell) state.shell.dataset.open = 'false';
  }
  async function reload() {
    if (state.busy) return;
    const id = state.targetId;
    await open(id);
  }
  function startPage() {
    const domainData = domain();
    if (!domainData?.已建立) {
      state.body.appendChild(el('p', 'crypt-lord-affairs__note', '此楼层尚未建立领地。'));
      return;
    }
    const gate = affairs.canStart(domainData, state.turn);
    const section = el('section', 'crypt-lord-affairs__section');
    section.appendChild(el('h3', '', '召集评定'));
    section.appendChild(el('p', 'crypt-lord-affairs__note',
      gate.ok ? '选择属僚到场，或不选人而使用临时属吏。' : gate.reason));
    const spot = el('input');
    spot.placeholder = '评定地点'; spot.value = domainData.地点 || '';
    section.appendChild(spot);
    const members = el('div', 'crypt-lord-affairs__members');
    const relations = state.data.stat_data?.人物关系列表 || {};
    for (const [name, value] of Object.entries(relations)) {
      if (name.startsWith('$') || Number(value?.好感度) <= 100) continue;
      const row = el('label');
      const check = el('input'); check.type = 'checkbox'; check.value = name;
      row.append(check, el('span', '', `${name} · ${value.身份 || '属僚'}`));
      members.appendChild(row);
    }
    section.appendChild(members);
    section.appendChild(button('发起评定', () => run(async valid => {
      const names = [...members.querySelectorAll('input:checked')].map(input => input.value);
      const next = workflow.start(state.data, state.turn, names, spot.value);
      await commit(next, valid);
    }), 'is-primary'));
    section.lastChild.disabled = state.busy || !gate.ok;
    state.body.appendChild(section);
    const pending = affairs.pendingOwn(domainData);
    if (pending.length) {
      const section = el('section', 'crypt-lord-affairs__section');
      section.appendChild(el('h3', '', '亲办待验'));
      for (const todo of pending) {
        const row = el('div', 'crypt-lord-affairs__row');
        row.append(el('strong', '', todo.标题), el('span', '', todo.经过));
        row.appendChild(button('核验完成', () => run(async valid => {
          const result = await workflow.verifyClaim(state.data, state.story, todo.id);
          if (!valid()) return;
          if (!result.accepted) { notify(`未通过：${result.reason}`, 'warning'); return; }
          const settled = workflow.claim(state.data, todo.id);
          await commit(settled.data, valid);
          notify(`验收通过：${todo.标题}`, 'success');
        })));
        section.appendChild(row);
      }
      state.body.appendChild(section);
    }
  }
  function attendancePage(sessionData) {
    const section = el('section', 'crypt-lord-affairs__section');
    section.appendChild(el('h3', '', '到场核验'));
    const player = sessionData.attendance?.玩家;
    section.appendChild(el('p', 'crypt-lord-affairs__note', player
      ? `<User>：${player.在场 ? '在场' : '未到'} · ${player.理由}` : '尚未核验到场情况'));
    for (const member of sessionData.roster) {
      const result = sessionData.attendance?.成员?.[member.姓名];
      const row = el('div', 'crypt-lord-affairs__row');
      row.append(el('strong', '', member.姓名), el('span', '',
        member.路人 ? `${member.职衔} · 临时属吏` : `${result?.在场 ? '在场' : '未到'} · ${result?.理由 || '待检测'}`));
      if (!member.路人 && result && !result.在场) {
        row.appendChild(button('不等此人', () => run(async valid => commit(workflow.dropMember(state.data, member.姓名), valid))));
      }
      section.appendChild(row);
    }
    section.appendChild(button('重新检测', () => run(async valid => {
      const next = await workflow.checkAttendance(state.data, state.story);
      await commit(next, valid);
    })));
    state.body.appendChild(section);
  }
  function todoPage(sessionData) {
    const section = el('section', 'crypt-lord-affairs__section');
    section.appendChild(el('h3', '', `本期待办 · ${affairs.todosOf(domain()).length}`));
    for (const todo of affairs.todosOf(domain())) {
      const row = el('article', 'crypt-lord-affairs__todo');
      row.appendChild(el('strong', '', `${todo.标题} · ${todo.类型} · ${'★'.repeat(Math.min(5, Math.max(1, Number(todo.难度) || 2)))}`));
      row.appendChild(el('p', '', todo.经过));
      row.appendChild(el('small', '', `推荐：${(todo.推荐方法 || []).join('、') || '无'} · ${todo.状态}`));
      if (sessionData.stage === 'assign' && todo.状态 === '待指派') {
        const select = el('select');
        const roster = sessionData.roster.filter(item => item.路人 || sessionData.attendance?.成员?.[item.姓名]?.在场);
        for (const [value, label] of [
          ['', '尚未指派'], ...roster.map(item => [item.姓名, item.姓名]),
          ['<User>', '我亲自处置'], ['暂且搁下', '暂且搁下'],
        ]) {
          const option = el('option', '', label); option.value = value; select.appendChild(option);
        }
        select.value = todo.处理者 || '';
        select.disabled = state.busy;
        select.addEventListener('change', () => { void run(async valid => commit(workflow.assign(state.data, todo.id, select.value), valid)); });
        row.appendChild(select);
      } else row.appendChild(el('small', '', `承办：${todo.处理者 || '待定'} · ${todo.$结算?.回收率 ? `回收 ${Math.round(todo.$结算.回收率 * 100)}%` : ''}`));
      section.appendChild(row);
    }
    state.body.appendChild(section);
  }
  function recordsPage(sessionData) {
    if (!sessionData.records.length) return;
    const section = el('section', 'crypt-lord-affairs__section');
    section.appendChild(el('h3', '', '评定纪实'));
    for (const record of sessionData.records) {
      const block = el('div', 'crypt-lord-affairs__record');
      block.appendChild(el('small', '', `${record.stage} · ${record.action || '阶段推进'}`));
      block.appendChild(el('p', '', record.text));
      section.appendChild(block);
    }
    state.body.appendChild(section);
  }
  function sessionPage(sessionData) {
    const stage = sessionData.stage;
    const labels = { convene: '到场', present: '陈事', assign: '议处', closing: '散会' };
    const progress = el('nav', 'crypt-lord-affairs__steps');
    for (const key of workflow.stages) {
      const item = el('span', key === stage ? 'is-current' : '', labels[key]);
      progress.appendChild(item);
    }
    state.body.appendChild(progress);
    if (stage === 'convene') attendancePage(sessionData);
    else todoPage(sessionData);
    recordsPage(sessionData);
    const actions = el('section', 'crypt-lord-affairs__actions');
    const field = el('textarea');
    field.placeholder = '本阶段补述（不会发送原生楼层）';
    field.rows = 3;
    actions.appendChild(field);
    actions.appendChild(button('演绎补述', () => run(async valid => {
      const action = field.value.trim();
      if (!action) throw new Error('请填写补述');
      const text = await workflow.narrate(state.data, state.story, stage, action);
      await commit(workflow.addRecord(state.data, action, text), valid);
    })));
    if (stage === 'convene') {
      actions.appendChild(button('放弃召集', () => run(async valid => commit(workflow.abort(state.data), valid))));
    }
    const nextLabel = { convene: '开始评定', present: '转入议处', assign: '定案散会', closing: '写入原生输入框' };
    const next = button(nextLabel[stage], () => run(async valid => {
      if (stage === 'closing') {
        const text = workflow.exportText(state.data);
        const input = modules['cryptLord.inputAdapter'];
        if (!input) throw new Error('酒馆原生输入适配器不可用');
        const currentDraft = String(doc().querySelector('#send_textarea')?.value || '').trim();
        if (currentDraft && !view().confirm?.('原生输入框已有草稿。写入评定纪实会替换草稿，确定继续？')) return;
        input.setInputText(text);
        try {
          await commit(workflow.advance(state.data), valid);
        } catch (error) {
          notify('纪实已填入输入框，但清理状态失败；请重新读取并完成评定', 'warning');
          throw error;
        }
        close();
        return;
      }
      if (stage === 'assign' && !view().confirm?.('散会即按指派名单结算，无法撤回。确定继续？')) return;
      let candidates = null;
      if (stage === 'convene') {
        if (!workflow.membersPresent(sessionData)) throw new Error('属僚尚未到齐');
        candidates = await workflow.generateCandidates(state.data, state.story);
      }
      const nextData = workflow.advance(state.data, { candidates });
      const targetStage = nextData.cryptLord.domainAffairs.stage;
      const prose = await workflow.narrate(nextData, state.story, targetStage);
      await commit(workflow.addRecord(nextData, '', prose), valid);
    }), 'is-primary');
    next.disabled = state.busy || (stage === 'convene' && !workflow.membersPresent(sessionData)) ||
      (stage === 'assign' && affairs.todosOf(domain()).some(todo => todo.状态 === '待指派' && !todo.处理者));
    actions.appendChild(next);
    state.body.appendChild(actions);
  }
  function render() {
    if (!mounted() || !state.data) return;
    state.body.replaceChildren();
    state.dialog.querySelector('header span').textContent = `${domain()?.领地名 || '独立领地'} · 楼层 #${state.targetId}`;
    const toolbar = el('div', 'crypt-lord-affairs__toolbar');
    toolbar.appendChild(button('重新读取', () => reload()));
    state.body.appendChild(toolbar);
    if (state.busy) state.body.appendChild(el('p', 'crypt-lord-affairs__pending', '正在处理事务，请稍候…'));
    const active = session();
    if (active) sessionPage(active);
    else startPage();
  }
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, open: mounted(), targetId: state.targetId, busy: state.busy }),
    mount, open, close, reload,
    dispose() {
      state.disposed = true; close(); state.subscription?.stop?.();
      state.shell?.remove(); state.shell = null;
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader may have released it. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
