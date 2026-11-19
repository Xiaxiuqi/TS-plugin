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
  const hostApi = modules['cryptLord.hostApi'];
  const native = modules['cryptLord.nativeFloorSource'];
  const labels = { convene: '到场', present: '陈事', assign: '议处', closing: '散会' };
  if (!host || !workflow || !affairs || !store || !hostApi || !native) throw new Error(`[${KEY}] 依赖尚未加载`);
  const state = {
    shell: null, dialog: null, body: null, footer: null, targetId: null, data: null,
    story: '', turn: 0, busy: false, epoch: 0, operation: 0, drag: null, subscriptions: [], disposed: false,
    rules: null, stale: false, generating: false, pending: null, error: '',
    spot: '', members: [], action: '',
    source: null, dependencies: null, abilityLock: null, focus: null,
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
    node.disabled = state.busy || state.stale || state.generating || Boolean(state.pending);
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
  const inRules = fn => affairs.withRules(state.rules, fn);
  const requestOptions = guard => ({ rules: state.rules, guard, beforeRequest: async () => {
    await assertSource(guard);
    await affairs.assertRules(state.rules, guard);
  } });
  async function assertSource(valid) {
    if (!valid()) throw Error('窗口、聊天或生成状态已变化，操作已取消');
    try {
      assertServices();
      await native.assert(state.source, valid);
    } catch (error) {
      state.stale = true;
      throw error;
    }
  }
  function assertServices() {
    if (!state.dependencies || Object.entries(state.dependencies).some(([key, value]) => modules[key] !== value) ||
      state.dependencies['cryptLord.abilityState']?.locked?.(state.source.rows.at(-1)?.data) !== state.abilityLock)
      throw Error('事务保存、规则或能力锁定服务已变化，请重新读取');
  }
  async function run(fn, retry = false) {
    if (state.busy || state.stale || state.generating || state.pending && !retry) return;
    const epoch = state.epoch;
    const operation = ++state.operation;
    const valid = () => !state.disposed && epoch === state.epoch && mounted() && !state.stale &&
      state.shell.isConnected && state.shell.ownerDocument === doc() &&
      !state.generating && modules[KEY] === api && modules['cryptLord.domainAffairs'] === workflow &&
      modules['cryptLord.affairState'] === affairs && modules['cryptLord.stateStore'] === store &&
      modules['cryptLord.hostApi'] === hostApi;
    state.busy = true;
    state.error = '';
    render();
    try {
      if (!retry) { await assertSource(valid); await affairs.assertRules(state.rules, valid); }
      await fn(valid);
    } catch (error) {
      if (epoch === state.epoch) {
        if (state.pending?.transaction.status() === 'invalid') state.stale = true;
        state.error = error?.message || String(error); notify(state.error);
      }
    } finally {
      if (operation === state.operation) {
        state.busy = false;
        if (epoch === state.epoch) render();
      }
    }
  }
  async function commit(next, valid) {
    if (!valid() || state.pending) throw Error('窗口或待保存结果已变化，操作已取消');
    assertServices();
    const source = state.source, draft = clone(next), rules = state.rules;
    const pending = { before: clone(source.rows.at(-1).data) };
    pending.transaction = native.transaction(source, state.targetId, {
      guard: () => { assertServices(); return valid(); }, dependencies: state.dependencies,
      beforeWrite: () => affairs.assertRules(rules, valid),
      compute: () => ({ data: clone(draft), writeOptions: { affairRules: rules } }),
      async onSaved(result) {
        const fresh = await native.read(valid), expected = structuredClone(source);
        expected.rows.find(row => row.message_id === state.targetId).data = clone(result.data);
        const page = expected.swipes.find(row => row.message_id === state.targetId);
        page.swipes_data[page.swipe_id] = clone(result.data);
        if (native.signature(fresh) !== native.signature(expected)) throw Error('保存后楼层已变化，请重新读取');
        return { ...result, source: fresh };
      },
    });
    state.pending = pending;
    await finishCommit(await pending.transaction.run(), valid);
  }
  async function finishCommit(result, valid) {
    if (!valid()) throw Error('窗口或聊天已经变化，操作已取消');
    const before = state.pending.before;
    state.data = clone(result.data);
    if (result.source) state.source = result.source;
    else state.stale = true;
    state.abilityLock = state.dependencies['cryptLord.abilityState']?.locked?.(state.source.rows.at(-1)?.data);
    state.pending = null;
    if (result.warning) state.error = result.warning;
    try {
      if (!result.unchanged) modules['cryptLord.variableWorkbench']?.notifyUpdate?.({
        messageId: state.targetId, beforeData: before, afterData: clone(result.data), source: KEY,
      });
    } catch (error) { state.error = `已确认保存，面板通知失败：${error.message || error}`; }
  }
  function recover() {
    return run(async valid => {
      const transaction = state.pending.transaction;
      await finishCommit(await (transaction.status() === 'uncertain' ? transaction.inspect() : transaction.save()), valid);
    }, true);
  }
  function mount() {
    if (state.disposed || state.shell) return Boolean(state.shell);
    if (!doc().body) return false;
    const shell = el('section', 'crypt-lord-affairs');
    shell.dataset.open = 'false';
    const dialog = el('section', 'crypt-lord-affairs__dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.tabIndex = -1;
    dialog.setAttribute('aria-label', '领地事务评定');
    const header = el('header');
    header.append(el('strong', '', '领地事务评定'), el('span', '', ''));
    const closer = button('×', () => close(), 'crypt-lord-affairs__close');
    closer.disabled = false; closer.title = '关闭'; closer.setAttribute('aria-label', '关闭');
    header.appendChild(closer);
    const body = el('div', 'crypt-lord-affairs__body');
    const footer = el('footer', 'crypt-lord-affairs__footer');
    dialog.append(header, body, footer);
    shell.appendChild(dialog);
    doc().body.appendChild(shell);
    state.shell = shell; state.dialog = dialog; state.body = body; state.footer = footer;
    shell.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab') return;
      const controls = [...dialog.querySelectorAll('button, input, select, textarea, summary')]
        .filter(node => !node.disabled && node.getClientRects().length);
      if (!controls.length) { event.preventDefault(); dialog.focus(); }
      else if (event.shiftKey && [controls[0], dialog].includes(doc().activeElement)) {
        event.preventDefault(); controls.at(-1).focus();
      } else if (!event.shiftKey && [controls.at(-1), dialog].includes(doc().activeElement)) {
        event.preventDefault(); controls[0].focus();
      }
    });
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
    if (events?.CHAT_CHANGED) state.subscriptions.push(host.bindEvent(events.CHAT_CHANGED, () => {
      state.generating = false; close(true);
    }));
    if (events?.GENERATION_STARTED) state.subscriptions.push(host.bindEvent(events.GENERATION_STARTED, (_id, info, dryRun) => {
      const type = typeof _id === 'string' ? _id : info?.type ?? _id?.type;
      if (['quiet', 'quiet_prompt', 'dryRun'].includes(type) || info?.options?.quiet_prompt ||
        _id?.options?.quiet_prompt || info?.quiet_prompt || _id?.quiet_prompt || dryRun || info?.dryRun || _id?.dryRun ||
        info?.options?.dryRun || _id?.options?.dryRun) return;
      state.generating = true; state.stale = true; state.epoch++; state.operation++; state.busy = false;
      state.error = '原生生成已开始，请在生成结束后重新读取'; render();
    }));
    for (const event of new Set([events?.GENERATION_ENDED, events?.GENERATION_STOPPED].filter(Boolean))) {
      state.subscriptions.push(host.bindEvent(event, () => { state.generating = false; render(); }));
    }
    return true;
  }
  async function open(messageId, reread = false) {
    if (!mount() || state.generating) return false;
    if (mounted() && !reread && (!Number.isInteger(messageId) || messageId === state.targetId)) {
      state.dialog.focus(); return true;
    }
    if (!reread && state.pending &&
      !view().confirm('放弃待保存或待核对的事务结果并切换楼层？')) return false;
    if (!mounted()) state.focus = doc().activeElement;
    const epoch = ++state.epoch;
    state.operation++;
    const valid = () => !state.disposed && epoch === state.epoch && !state.generating &&
      state.shell.isConnected && state.shell.ownerDocument === doc() &&
      modules[KEY] === api && modules['cryptLord.domainAffairs'] === workflow &&
      modules['cryptLord.affairState'] === affairs && modules['cryptLord.stateStore'] === store &&
      modules['cryptLord.hostApi'] === hostApi;
    state.busy = true; state.stale = true; state.error = '';
    state.pending = null; state.data = null; state.rules = null;
    state.shell.dataset.open = 'true'; state.dialog.focus(); render();
    try {
      const dependencies = native.writeDependencies([KEY, 'cryptLord.domainAffairs', 'cryptLord.affairState',
        'cryptLord.domainState', 'cryptLord.industryState', 'cryptLord.cashflow',
        'cryptLord.responseNormalizer', 'cryptLord.variableSettlementApi']);
      const source = await native.read(valid), latest = source.rows.at(-1);
      if (!valid()) return false;
      const id = Number.isInteger(messageId) ? messageId : latest?.message_id;
      state.targetId = id;
      if (id !== latest?.message_id) throw Error('请在最新真实 assistant 楼层打开事务评定');
      const target = source.rows.find(row => row.message_id === id);
      if (!valid()) return false;
      if (id === 0 || target?.role !== 'assistant' || target.is_hidden || !target.data?.stat_data)
        throw Error('仅支持最新可见的非开场 assistant 角色楼层');
      const battle = modules['cryptLord.attributeRecalculation']?.busyBattle(target.data) ??
        ['teamBattle', 'personalBattle'].some(key => {
          const item = target.data.cryptLord?.[key];
          return item?.status === 'active' || key === 'teamBattle' && ['finished', 'ended'].includes(item?.status) && !item.settled ||
            key === 'personalBattle' && item?.status === 'finished' && item.result === 'victory' && item.enemy?.npcKey && !item.experienceClaimed;
        });
      if (battle) throw Error('请先结束并结算战斗');
      const messages = source.rows;
      const rules = await affairs.loadRules(valid);
      if (!valid()) return false;
      await native.assert(source, valid);
      if (Object.entries(dependencies).some(([key, value]) => modules[key] !== value))
        throw Error('事务来源服务已变化，请重新读取');
      if (!valid()) return false;
      state.targetId = id; state.rules = rules; state.source = source; state.dependencies = dependencies;
      state.abilityLock = dependencies['cryptLord.abilityState']?.locked?.(target.data);
      state.data = clone(target.data || {});
      const normalizer = dependencies['cryptLord.responseNormalizer'];
      if (!normalizer?.normalize) throw Error('原生正文解析服务尚未加载');
      const nativeText = text => normalizer.normalize(String(text || '')).message;
      const recent = Array.isArray(messages)
        ? messages.filter(item => item.role === 'assistant' && !item.is_hidden && item.message_id <= id).slice(-15)
          .map(item => ({ id: item.message_id, text: nativeText(item.message).trim() }))
          .filter(item => item.text).map(item => `#${item.id} ${item.text}`) : [];
      state.story = (recent.length ? recent.join('\n\n') : nativeText(target.message)).slice(-16000);
      state.turn = Math.max(1, messages.filter(item => item.role === 'assistant' && item.message_id !== 0).length);
      state.spot = state.data.stat_data?.领地?.地点 || ''; state.members = []; state.action = '';
      state.pending = null; state.stale = false;
      modules['cryptLord.domainConsole']?.close(true);
      return true;
    } catch (error) {
      if (valid()) state.error = error?.message || String(error);
      return false;
    } finally {
      if (epoch === state.epoch) { state.busy = false; render(); }
    }
  }
  function close(force = false) {
    if (force !== true && state.pending &&
      !view().confirm?.('关闭将放弃尚未保存的事务结果，确定继续？')) return;
    state.epoch += 1;
    state.operation += 1;
    state.busy = false;
    state.pending = null; state.drag = null;
    if (state.shell) state.shell.dataset.open = 'false';
    if (state.focus?.isConnected) state.focus.focus();
  }
  async function reload() {
    if (state.busy || state.generating) return;
    if (state.pending && !view().confirm?.('重新读取将放弃尚未保存的事务结果，确定继续？')) return;
    const id = state.targetId;
    await open(id, true);
  }
  function composer() {
    const document = doc(), node = document.querySelector('#send_textarea');
    return { document, node, draft: node?.value, input: modules['cryptLord.inputAdapter'] };
  }
  async function writeExport(valid, captured = composer()) {
    const text = state.data?.cryptLord?.domainAffairsExport?.text;
    if (!text) throw Error('没有已完成的评定纪实');
    const { input, document, node, draft } = captured;
    if (!input?.setInputText) throw Error('酒馆原生输入适配器不可用');
    if (!node) throw Error('找不到原生输入框');
    if (doc() !== document || !node.isConnected || document.querySelector('#send_textarea') !== node || node.value !== draft)
      throw Error('原生输入框或草稿已变化，未替换草稿');
    if (String(draft || '').trim() && !view().confirm?.('原生输入框已有草稿。写入评定纪实会替换草稿，确定继续？')) return;
    await assertSource(valid);
    if (!valid() || modules['cryptLord.inputAdapter'] !== input || doc() !== document ||
      !node.isConnected || document.querySelector('#send_textarea') !== node || node.value !== draft)
      throw Error('原生输入框或草稿已变化，未替换草稿');
    input.setInputText(text);
    notify('评定纪实已填入原生输入框，尚未发送', 'success');
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
    spot.placeholder = '评定地点'; spot.setAttribute('aria-label', '评定地点'); spot.value = state.spot;
    spot.disabled = state.busy || state.stale || Boolean(state.pending);
    spot.addEventListener('input', () => { state.spot = spot.value; });
    section.appendChild(spot);
    const members = el('div', 'crypt-lord-affairs__members');
    const relations = state.data.stat_data?.人物关系列表 || {};
    for (const [name, value] of Object.entries(relations)) {
      if (name.startsWith('$') || !(Number(value?.好感度) > 100)) continue;
      const row = el('label');
      const check = el('input'); check.type = 'checkbox'; check.value = name;
      check.checked = state.members.includes(name);
      check.disabled = state.busy || state.stale || Boolean(state.pending);
      check.addEventListener('change', () => {
        state.members = [...members.querySelectorAll('input:checked')].map(input => input.value);
      });
      row.append(check, el('span', '', `${name} · ${value.身份 || '属僚'}`));
      members.appendChild(row);
    }
    section.appendChild(members);
    section.appendChild(button('发起评定', () => run(async valid => {
      const next = inRules(() => workflow.start(state.data, state.turn, state.members, state.spot));
      await commit(next, valid);
      if (valid()) await commit(await workflow.checkAttendance(state.data, state.story, requestOptions(valid)), valid);
    }), 'is-primary'));
    section.lastChild.disabled = section.lastChild.disabled || !gate.ok;
    state.body.appendChild(section);
    const pending = affairs.pendingOwn(domainData);
    if (pending.length) {
      const section = el('section', 'crypt-lord-affairs__section');
      section.appendChild(el('h3', '', '亲办待验'));
      for (const todo of pending) {
        const row = el('div', 'crypt-lord-affairs__row');
        row.append(el('strong', '', todo.标题), el('span', '', todo.经过));
        row.appendChild(button('核验完成', () => run(async valid => {
          const result = await workflow.verifyClaim(state.data, state.story, todo.id, requestOptions(valid));
          if (!valid()) return;
          if (!result.accepted) { notify(`未通过：${result.reason}`, 'warning'); return; }
          const settled = inRules(() => workflow.claim(state.data, todo.id));
          await commit(settled.data, valid);
          if (valid()) notify(`验收通过：${todo.标题}`, 'success');
        })));
        section.appendChild(row);
      }
      state.body.appendChild(section);
    }
    if (state.data?.cryptLord?.domainAffairsExport?.text) {
      const section = el('details', 'crypt-lord-affairs__section');
      section.append(el('summary', '', '最近评定纪实'),
        el('p', 'crypt-lord-affairs__export', state.data.cryptLord.domainAffairsExport.text));
      section.appendChild(button('写入原生输入框', () => run(writeExport)));
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
        const drop = button('不等此人', () => run(async valid => commit(workflow.dropMember(state.data, member.姓名), valid)));
        drop.disabled = drop.disabled || Boolean(sessionData.transition); row.appendChild(drop);
      }
      section.appendChild(row);
    }
    const recheck = button('重新检测', () => run(async valid => {
      const next = await workflow.checkAttendance(state.data, state.story, requestOptions(valid));
      await commit(next, valid);
    }));
    recheck.disabled = recheck.disabled || Boolean(sessionData.transition); section.appendChild(recheck);
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
        select.disabled = state.busy || state.stale || Boolean(state.pending) ||
          Boolean(sessionData.transition) || sessionData.settled;
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
      block.appendChild(el('small', '', `${labels[record.stage] || record.stage} · ${record.action || '阶段推进'}`));
      block.appendChild(el('p', '', record.text));
      section.appendChild(block);
    }
    state.body.appendChild(section);
  }
  function sessionPage(sessionData) {
    const stage = sessionData.stage;
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
    field.setAttribute('aria-label', '本阶段补述');
    field.rows = 3;
    field.value = state.action;
    field.disabled = state.busy || state.stale || Boolean(state.pending) || Boolean(sessionData.transition);
    field.addEventListener('input', () => { state.action = field.value; });
    actions.appendChild(field);
    const narrate = button('演绎补述', () => run(async valid => {
      if (sessionData.transition) throw Error('请先完成待补的阶段正文');
      const action = state.action.trim();
      if (!action) throw new Error('请填写补述');
      const text = await workflow.narrate(state.data, state.story, stage, action, requestOptions(valid));
      await commit(workflow.addRecord(state.data, action, text), valid);
      if (valid()) state.action = '';
    }));
    narrate.disabled = narrate.disabled || Boolean(sessionData.transition); actions.appendChild(narrate);
    if (stage === 'convene' && !sessionData.opened) {
      actions.appendChild(button('放弃召集', () => run(async valid => commit(workflow.abort(state.data), valid))));
    }
    const nextLabel = { convene: '开始评定', present: '转入议处', assign: '定案散会', closing: '写入原生输入框' };
    const next = button(sessionData.transition ? '重试阶段演绎' : nextLabel[stage], () => run(async valid => {
      if (stage === 'closing') {
        const captured = composer(), { input } = captured;
        if (!input?.setInputText) throw Error('酒馆原生输入适配器不可用');
        await commit(inRules(() => workflow.finish(state.data)), valid);
        if (valid()) await writeExport(valid, captured);
        return;
      }
      if (!sessionData.transition) {
        if (stage === 'assign' && !view().confirm?.('散会即按指派名单结算，无法撤回。确定继续？')) return;
        let candidates = null;
        if (stage === 'convene') {
          if (!workflow.membersPresent(sessionData)) throw Error('属僚尚未到齐');
          if (!sessionData.opened || !affairs.todosOf(domain()).length)
            candidates = await workflow.generateCandidates(state.data, state.story, requestOptions(valid));
        }
        await commit(inRules(() => workflow.prepareAdvance(state.data, { candidates, turn: state.turn })), valid);
      }
      if (!valid()) return;
      const targetStage = session().transition.to;
      const prose = await workflow.narrate(state.data, state.story, targetStage, '', requestOptions(valid));
      await commit(workflow.completeAdvance(state.data, prose), valid);
    }), 'is-primary');
    next.disabled = next.disabled || !sessionData.transition &&
      ((stage === 'convene' && !workflow.membersPresent(sessionData)) ||
      (stage === 'assign' && affairs.todosOf(domain()).some(todo => todo.状态 === '待指派' && !todo.处理者)));
    actions.appendChild(next);
    state.footer.appendChild(actions);
  }
  function render() {
    try { return inRules(renderBody); }
    catch (error) {
      state.stale = true; state.error = error?.message || String(error);
      state.body?.appendChild(el('p', 'crypt-lord-affairs__error', state.error));
    }
  }
  function renderBody() {
    if (!mounted()) return;
    const scroll = state.body.scrollTop;
    state.body.replaceChildren();
    state.footer.replaceChildren();
    state.dialog.querySelector('header span').textContent = `${domain()?.领地名 || '独立领地'} · 楼层 #${state.targetId}`;
    const toolbar = el('div', 'crypt-lord-affairs__toolbar');
    const reloadButton = button('重新读取', () => reload());
    reloadButton.disabled = state.busy || state.generating; toolbar.appendChild(reloadButton);
    if (state.pending) {
      const phase = state.pending.transaction.status();
      const retry = button(phase === 'uncertain' ? '核对原生保存状态' : '保存待提交结果', recover);
      retry.disabled = state.busy || state.stale || state.generating || !['pending', 'uncertain'].includes(phase); toolbar.appendChild(retry);
    }
    state.body.appendChild(toolbar);
    if (state.error) state.body.appendChild(el('p', 'crypt-lord-affairs__error', state.error));
    if (!state.data || !state.rules) return;
    if (session()?.transition) state.body.appendChild(el('p', 'crypt-lord-affairs__note', '已保存阶段处置，正文待补。'));
    if (state.busy) state.body.appendChild(el('p', 'crypt-lord-affairs__pending', '正在处理事务，请稍候…'));
    const active = session();
    if (active) sessionPage(active);
    else startPage();
    state.body.scrollTop = scroll;
  }
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, open: mounted(), targetId: state.targetId, busy: state.busy,
      stale: state.stale, pending: Boolean(state.pending), phase: state.pending?.transaction.status() || null }),
    mount, open, close, reload,
    dispose() {
      state.disposed = true; close(true); state.subscriptions.forEach(subscription => subscription?.stop?.());
      state.shell?.remove(); state.shell = null;
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader may have released it. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
