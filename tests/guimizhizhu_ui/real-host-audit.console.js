(() => {
  'use strict';

  const KEY = '__cryptLordNativeAudit';
  const root = window;
  root[KEY]?.stop?.();

  const state = {
    baseline: [],
    events: [],
    observer: null,
    listeners: [],
    startedAt: new Date().toISOString(),
  };

  function log(type, detail = {}) {
    const entry = Object.freeze({ at: new Date().toISOString(), type, ...detail });
    state.events.push(entry);
    if (state.events.length > 100) state.events.shift();
    console.info(`[CryptLordAudit] ${type}`, detail);
    return entry;
  }

  async function readMessages() {
    if (typeof root.getChatMessages !== 'function') {
      throw new Error('getChatMessages 不可用：请在 SillyTavern 主页面控制台运行。');
    }
    const result = await Promise.resolve(root.getChatMessages('0-{{lastMessageId}}'));
    if (!Array.isArray(result)) throw new Error('getChatMessages 未返回聊天楼层数组。');
    return result.map(message => ({
      id: Number(message?.message_id),
      role: String(message?.role || ''),
      message: String(message?.message || ''),
      data: message?.data && typeof message.data === 'object' ? message.data : {},
    }));
  }

  function nativeInput() {
    return document.querySelector('#send_textarea');
  }

  function uiSnapshot() {
    const input = nativeInput();
    const actionButtons = Array.from(document.querySelectorAll('[data-crypt-lord-action-options] button'));
    const stateCards = Array.from(document.querySelectorAll('[data-crypt-lord-floating-variable-editor-card]'));
    return Object.freeze({
      nativeInputPresent: !!input,
      nativeInputText: String(input?.value || ''),
      actionOptions: actionButtons.map(button => String(button.textContent || '').trim()).filter(Boolean),
      stateCardMessageIds: stateCards.map(card => card.getAttribute('data-crypt-lord-message-id')).filter(Boolean),
    });
  }

  function newFloors(current) {
    const prior = new Set(state.baseline.map(message => message.id));
    return current.filter(message => !prior.has(message.id));
  }

  function removedFloors(current) {
    const currentIds = new Set(current.map(message => message.id));
    return state.baseline.filter(message => !currentIds.has(message.id));
  }

  function assistantProtocolCheck(message) {
    if (!message) return { exists: false, readable: false, hasStatData: false, actions: 0 };
    const hiddenProtocol = /<(?:thinking|reasoning|think|UpdateVariable|JSONPatch|wlog|safe|EventCard|事件卡片|action)\b/i;
    return Object.freeze({
      exists: true,
      readable: Boolean(message.message.trim()) && !hiddenProtocol.test(message.message),
      hasStatData: Boolean(message.data?.stat_data && typeof message.data.stat_data === 'object'),
      actions: Array.isArray(message.data?.cryptLord?.actions) ? message.data.cryptLord.actions.length : 0,
      id: message.id,
      preview: message.message.slice(0, 160),
    });
  }

  async function reset(label = 'baseline') {
    state.baseline = await readMessages();
    log('baseline-reset', { label, floors: state.baseline.length });
    return Object.freeze({ label, floors: state.baseline.length, ui: uiSnapshot() });
  }

  async function report(label = 'report') {
    const current = await readMessages();
    const created = newFloors(current);
    const removed = removedFloors(current);
    const users = created.filter(message => message.role === 'user');
    const assistants = created.filter(message => message.role === 'assistant');
    const latestAssistant = [...current].reverse().find(message => message.role === 'assistant') || null;
    const result = Object.freeze({
      label,
      baselineFloors: state.baseline.length,
      currentFloors: current.length,
      created: created.map(message => Object.freeze({ id: message.id, role: message.role, preview: message.message.slice(0, 120) })),
      removed: removed.map(message => Object.freeze({ id: message.id, role: message.role, preview: message.message.slice(0, 120) })),
      exactNativePair: users.length === 1 && assistants.length === 1 && created.length === 2,
      userCount: users.length,
      assistantCount: assistants.length,
      latestAssistant: assistantProtocolCheck(latestAssistant),
      ui: uiSnapshot(),
    });
    console.group(`[CryptLordAudit] ${label}`);
    console.table(result.created);
    if (result.removed.length) console.table(result.removed);
    console.info('断言', {
      exactNativePair: result.exactNativePair,
      latestAssistantReadable: result.latestAssistant.readable,
      latestAssistantHasStatData: result.latestAssistant.hasStatData,
      latestAssistantActionCount: result.latestAssistant.actions,
      actionOptions: result.ui.actionOptions.length,
      stateCards: result.ui.stateCardMessageIds.length,
    });
    console.groupEnd();
    return result;
  }

  async function reportActionFill(label = 'action-fill') {
    const result = await report(label);
    const actionFillOnly = result.created.length === 0 && Boolean(result.ui.nativeInputText.trim());
    console.info('[CryptLordAudit] 行动选项只填入输入框', { actionFillOnly, input: result.ui.nativeInputText });
    return Object.freeze({ ...result, actionFillOnly });
  }

  function bind(target, eventName, handler, options) {
    target.addEventListener(eventName, handler, options);
    state.listeners.push(() => target.removeEventListener(eventName, handler, options));
  }

  function installObservers() {
    bind(document, 'click', event => {
      const target = event.target?.closest?.('#send_but, #btn-quick-send, [data-crypt-lord-action-options] button');
      if (!target) return;
      log('click', { selector: target.matches('#send_but') ? '#send_but' : target.matches('#btn-quick-send') ? '#btn-quick-send' : 'action-option' });
    }, true);
    bind(document, 'submit', event => {
      if (event.target?.matches?.('#send_form')) log('native-form-submit');
    }, true);
    bind(document, 'keydown', event => {
      if (event.key === 'Enter' && event.target?.matches?.('#send_textarea')) log('native-input-enter');
    }, true);
    const chat = document.querySelector('#chat') || document.body;
    state.observer = new MutationObserver(records => {
      const count = records.reduce((total, record) => total + record.addedNodes.length + record.removedNodes.length, 0);
      if (count) log('chat-dom-mutation', { nodes: count });
    });
    state.observer.observe(chat, { childList: true, subtree: true });
  }

  function stop() {
    state.listeners.splice(0).forEach(remove => remove());
    state.observer?.disconnect();
    state.observer = null;
    log('stopped');
    return true;
  }

  const api = Object.freeze({
    startedAt: state.startedAt,
    reset,
    report,
    reportActionFill,
    ui: uiSnapshot,
    events: () => Object.freeze([...state.events]),
    stop,
  });
  root[KEY] = api;
  installObservers();
  void reset('启动基线').then(() => {
    console.info('[CryptLordAudit] 已启动。先执行 await __cryptLordNativeAudit.reset("用例名")，完成操作后执行 await __cryptLordNativeAudit.report("用例名")。');
  }).catch(error => console.error('[CryptLordAudit] 初始化失败', error));
})();
