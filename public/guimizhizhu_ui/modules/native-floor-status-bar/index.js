(() => {
  'use strict';

  const KEY = 'cryptLord.nativeFloorStatusBar';
  const HOST_KEY = 'cryptLord.afterNativeHost';
  const EDITOR_UI_KEY = 'cryptLord.nativeFloorEditorUi';
  const NORMALIZER_KEY = 'cryptLord.responseNormalizer';
  const IMAGE_UI_KEY = 'cryptLord.imageGenerationUi';
  const MODULE_ID = 'status-bar';
  const THEME_KEY = 'cryptLord.originalUi.theme';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const afterNative = root.__stage1Modules?.[HOST_KEY];
  if (!afterNative) throw new Error(`[${KEY}] shared/after-native-host.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const mounted = new Map();
  const images = new Map();
  let subscriptions = [];
  let disposed = false;
  let observer = null;
  let repairQueued = false;
  let epoch = 0;
  let scanToken = 0;
  let generating = false;

  function isRecord(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  function textValue(source, keys, fallback = '...') {
    for (const key of keys) {
      const value = source?.[key];
      if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
    }
    return fallback;
  }

  function numberValue(source, keys, fallback = 0) {
    for (const key of keys) {
      const value = Number(source?.[key]);
      if (Number.isFinite(value)) return value;
    }
    return fallback;
  }

  function currentTheme() {
    try { return window.localStorage?.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
  }

  function applyTheme(theme) {
    const normalized = theme === 'light' ? 'light' : 'dark';
    try { window.localStorage?.setItem(THEME_KEY, normalized); } catch { /* unavailable storage */ }
    mounted.forEach(element => { element.dataset.theme = normalized; });
    const hostDocument = afterNative.getHost()?.document;
    Array.from(hostDocument?.querySelectorAll?.('.crypt-lord-original-ui') || []).forEach(element => {
      element.dataset.theme = normalized;
    });
    return normalized;
  }

  function toggleTheme() {
    return applyTheme(currentTheme() === 'light' ? 'dark' : 'light');
  }

  function remove(messageId) {
    const id = Number(messageId);
    if (!mounted.has(id)) return false;
    afterNative.unmountTop(id, MODULE_ID);
    mounted.delete(id);
    return true;
  }

  async function openEditor(messageId) {
    const editorUi = await contract.waitGlobalInitialized(EDITOR_UI_KEY, { timeoutMs: 10000 });
    return editorUi.open(Number(messageId));
  }

  function openDiagnostics() {
    return root.debugManager?.open?.() === true;
  }

  function setImage(messageId, source) {
    const id = Number(messageId);
    if (!Number.isInteger(id) || !mounted.has(id)) return false;
    if (source) images.set(id, source);
    else images.delete(id);
    const bar = mounted.get(id);
    bar.querySelector('.crypt-lord-native-floor-status-bar__image')?.remove();
    if (source) {
      const figure = createElement('figure', 'crypt-lord-native-floor-status-bar__image');
      const picture = createElement('img');
      picture.src = source;
      picture.alt = '本轮配图';
      const clear = createButton('×', () => setImage(id, ''));
      clear.title = '移除本轮配图';
      figure.append(picture, clear);
      bar.append(figure);
    }
    return true;
  }

  function createButton(label, action) {
    const button = afterNative.createElement('button');
    button.type = 'button';
    button.className = 'crypt-lord-native-floor-status-bar__button';
    button.textContent = label;
    button.addEventListener('click', action);
    return button;
  }

  function createElement(tag, className, text) {
    const element = afterNative.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function walletEntries(stat) {
    const cashflow = modules['cryptLord.cashflow'];
    if (cashflow) return cashflow.project({ role: 'assistant', data: { stat_data: stat } }).countries
      .flatMap(group => group.coins.map(coin => ({ country: group.name, ...coin })));
    const wallet = stat?.货币;
    if (!isRecord(wallet)) return [];
    const entries = [];
    Object.entries(wallet).forEach(([country, group]) => {
      if (!isRecord(group)) return;
      Object.entries(group).forEach(([name, rawValue]) => {
        if (name === '$meta') return;
        const value = Number(rawValue);
        if (!Number.isFinite(value) || value === 0) return;
        entries.push({ country, name, value });
      });
    });
    return entries;
  }

  function createStatusItem(label, value, extraClass = '') {
    const item = createElement('div', `crypt-lord-native-floor-status-bar__status-item ${extraClass}`.trim());
    item.append(
      createElement('span', 'crypt-lord-native-floor-status-bar__label', label),
      createElement('strong', 'crypt-lord-native-floor-status-bar__value', value),
    );
    return item;
  }

  function createWallet(stat, messageId) {
    const wallet = createElement('div', 'crypt-lord-native-floor-status-bar__wallet');
    wallet.appendChild(createElement('span', 'crypt-lord-native-floor-status-bar__wallet-label', '钱包'));
    const list = createElement('div', 'crypt-lord-native-floor-status-bar__wallet-list');
    const entries = walletEntries(stat);
    if (!entries.length) {
      list.appendChild(createElement('span', 'crypt-lord-native-floor-status-bar__wallet-empty', '身无分文'));
    } else {
      entries.forEach(entry => {
        const item = createElement('span', 'crypt-lord-native-floor-status-bar__wallet-item', `${entry.value} ${entry.name}`);
        item.title = entry.country;
        list.appendChild(item);
      });
    }
    wallet.appendChild(list);
    const cashflow = modules['cryptLord.cashflow'];
    if (cashflow) {
      const groups = createElement('div', 'crypt-lord-native-floor-status-bar__cashflow');
      const report = cashflow.project({ role: 'assistant', data: { stat_data: stat } });
      const token = epoch;
      const open = () => {
        const bar = mounted.get(Number(messageId));
        void contract.waitGlobalInitialized('cryptLord.cashflowUi', { timeoutMs: 10000 })
          .then(api => !disposed && !generating && token === epoch && bar?.isConnected &&
            mounted.get(Number(messageId)) === bar && api.open(Number(messageId)))
          .catch(error => {
            if (!disposed && token === epoch) afterNative.getHost()?.window?.toastr?.error?.(error?.message || String(error));
          });
      };
      for (const [key, title, sign] of [['income', '月入（除产业外）', 1], ['expense', '月出（除产业外）', -1]]) {
        const row = createElement('div');
        const button = createButton(title, open); button.title = '查看本楼层稳定收支明细';
        row.append(button, createElement('span', sign > 0 ? 'crypt-lord-native-floor-status-bar__gain' :
          'crypt-lord-native-floor-status-bar__loss', cashflow.totals(report[key].buckets, sign) || '无'));
        groups.append(row);
      }
      const detail = createButton('', open); detail.title = '查看本楼层钱包与稳定收支';
      detail.setAttribute('aria-label', '查看本楼层钱包与稳定收支');
      const icon = createElement('i', 'fa-solid fa-wallet'); icon.setAttribute('aria-hidden', 'true'); detail.append(icon);
      groups.append(detail); wallet.append(groups);
    }
    return wallet;
  }

  function scrollToActions(messageId) {
    const host = afterNative.getHost();
    const selector = `[data-crypt-lord-action-options][data-crypt-lord-message-id="${Number(messageId)}"]`;
    host?.document?.querySelector?.(selector)?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }

  function statusText(message) {
    const hasState = Boolean(message?.data?.stat_data && typeof message.data.stat_data === 'object');
    const actions = modules[NORMALIZER_KEY]?.actionsForFloor?.(message)?.length || 0;
    return `${hasState ? '状态已同步' : '等待状态数据'} · ${actions ? `${actions} 个行动选项` : '无行动选项'}`;
  }

  function render(messageId, message, isLatest = false) {
    remove(messageId);
    if (disposed || generating || message?.role !== 'assistant' || message?.is_hidden) return false;
    const bar = afterNative.createElement('section');
    bar.className = 'crypt-lord-original-ui crypt-lord-native-floor-status-bar';
    bar.dataset.theme = currentTheme();
    bar.dataset.latest = isLatest ? 'true' : 'false';

    const stat = isRecord(message?.data?.stat_data) ? message.data.stat_data : {};
    const world = isRecord(message?.data?.world_data) ? message.data.world_data : {};
    const header = createElement('header', 'crypt-lord-native-floor-status-bar__header');
    const heading = createElement('div', 'crypt-lord-native-floor-status-bar__heading');
    heading.append(
      createElement('strong', 'crypt-lord-native-floor-status-bar__title', '诡秘之主 · 第五纪'),
      createElement('span', 'crypt-lord-native-floor-status-bar__floor', `原生 AI 楼层 #${messageId}`),
    );
    const actions = createElement('div', 'crypt-lord-native-floor-status-bar__actions');
    actions.className = 'crypt-lord-native-floor-status-bar__actions';
    actions.append(
      createButton('行动', () => scrollToActions(messageId)),
      createButton('编辑此 AI', () => {
        void openEditor(messageId).catch(error => {
          afterNative.getHost()?.window?.toastr?.error?.(error?.message || String(error));
        });
      }),
      createButton('明暗', toggleTheme),
      createButton('诊断', openDiagnostics),
    );
    if (modules['cryptLord.attributeRecalculation']) actions.append(createButton('属性', () => {
      const token = epoch;
      void contract.waitGlobalInitialized('cryptLord.attributeRecalculationUi', { timeoutMs: 10000 })
        .then(api => !disposed && !generating && token === epoch && api.open(Number(messageId)))
        .catch(error => {
          if (!disposed && token === epoch) afterNative.getHost()?.window?.toastr?.error?.(error?.message || String(error));
        });
    }));
    if (isLatest) actions.append(createButton('一键生图', () => {
      void contract.waitGlobalInitialized(IMAGE_UI_KEY, { timeoutMs: 10000 })
        .then(api => api.oneClickForFloor(messageId))
        .catch(error => afterNative.getHost()?.window?.toastr?.error?.(error?.message || String(error)));
    }));
    header.append(heading, actions);

    const statusGrid = createElement('div', 'crypt-lord-native-floor-status-bar__status-grid');
    const eraItem = createStatusItem('当前纪元', textValue(world, ['当前时间纪元'], textValue(stat, ['当前时间纪元', '当前纪元'])));
    eraItem.setAttribute('role', 'button');
    eraItem.tabIndex = 0;
    eraItem.title = '查阅此楼层原著剧情';
    eraItem.setAttribute('aria-label', `查阅楼层 #${messageId} 原著剧情`);
    const openPlot = () => {
      void contract.waitGlobalInitialized('cryptLord.originalPlotGuideUi', { timeoutMs: 10000 })
        .then(api => api.open(Number(messageId)))
        .catch(error => afterNative.getHost()?.window?.toastr?.error?.(error?.message || String(error)));
    };
    eraItem.addEventListener('click', openPlot);
    eraItem.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPlot(); }
    });
    statusGrid.append(
      createStatusItem('序列', textValue(stat, ['当前序列', '位阶', '序列'])),
      eraItem,
    );
    const digestion = Math.max(0, Math.min(100, numberValue(stat, ['消化进度'], 0)));
    const progressItem = createStatusItem('消化进度', `${digestion.toFixed(2)}%`, 'crypt-lord-native-floor-status-bar__status-item--progress');
    const progress = createElement('span', 'crypt-lord-native-floor-status-bar__progress');
    const fill = createElement('span', 'crypt-lord-native-floor-status-bar__progress-fill');
    fill.style.width = `${digestion}%`;
    progress.appendChild(fill);
    progressItem.appendChild(progress);
    progressItem.appendChild(createElement(
      'small',
      'crypt-lord-native-floor-status-bar__battle-exp',
      `战斗经验 Lv.${Math.max(0, Math.floor(numberValue(stat, ['$战斗经验等级', '战斗经验等级'], 0)))}`,
    ));
    statusGrid.appendChild(progressItem);

    const footer = createElement('footer', 'crypt-lord-native-floor-status-bar__footer');
    footer.append(
      createElement('span', 'crypt-lord-native-floor-status-bar__detail', statusText(message)),
      createElement('span', 'crypt-lord-native-floor-status-bar__native-note', isLatest ? '当前回合' : '历史状态'),
    );
    bar.append(header, statusGrid, createWallet(stat, messageId), footer);
    if (!afterNative.mountTop(messageId, MODULE_ID, bar)) return false;
    mounted.set(Number(messageId), bar);
    if (images.has(Number(messageId))) setImage(messageId, images.get(Number(messageId)));
    return true;
  }

  async function refresh(messageId) {
    const id = Number(messageId);
    if (!Number.isInteger(id) || disposed) return false;
    const token = epoch;
    const messages = modules['cryptLord.cashflow'] ?
      (await modules['cryptLord.cashflow'].scan(() => !disposed && !generating && token === epoch)).rows :
      await afterNative.listAssistantMessages();
    if (disposed || generating || token !== epoch) return false;
    const latestId = messages.reduce((max, item) => {
      const messageId = Number(item.message_id);
      return Number.isInteger(messageId) ? Math.max(max, messageId) : max;
    }, -1);
    const message = messages.find(item => Number(item.message_id) === id) || null;
    return render(id, message, id === latestId);
  }

  async function scan() {
    if (disposed || generating) return false;
    const token = ++scanToken, chatToken = epoch;
    const guard = () => !disposed && !generating && token === scanToken && chatToken === epoch;
    let messages;
    try {
      messages = modules['cryptLord.cashflow'] ? (await modules['cryptLord.cashflow'].scan(guard)).rows :
        await afterNative.listAssistantMessages();
    } catch (error) {
      if (guard()) {
        Array.from(mounted.keys()).forEach(remove);
        console.warn(`[${KEY}] 状态条读取失败，未修改楼层`, error);
      }
      return false;
    }
    if (!guard()) return false;
    const visible = new Set();
    const latestId = messages.reduce((max, item) => {
      const messageId = Number(item.message_id);
      return Number.isInteger(messageId) ? Math.max(max, messageId) : max;
    }, -1);
    for (const message of messages) {
      const id = Number(message.message_id);
      if (render(id, message, id === latestId)) visible.add(id);
    }
    Array.from(mounted.keys()).filter(id => !visible.has(id)).forEach(remove);
    return visible.size;
  }

  function needsRepair() {
    for (const [id, bar] of mounted) {
      const message = afterNative.getDisplayedMessageElement(id);
      if (!message || !bar.isConnected || message.contains?.(bar) === false) return true;
    }
    return false;
  }

  function observeReplacements() {
    if (observer || typeof MutationObserver !== 'function') return;
    const chat = afterNative.getHost()?.document?.querySelector?.('#chat');
    if (!chat) return;
    observer = new MutationObserver((records = []) => {
      const identityChanged = records.some(item => item.type === 'attributes');
      const structureChanged = records.some(item => !item.target?.closest?.('.crypt-lord-after-native-stack,.crypt-lord-before-native-stack') &&
        [...(item.addedNodes || []), ...(item.removedNodes || [])].some(node => node.nodeType === 1 &&
          (node.matches?.('.mes,.mes_text') || node.querySelector?.('.mes,.mes_text'))));
      if (identityChanged) { scanToken++; Array.from(mounted.keys()).forEach(remove); }
      if (disposed || generating || repairQueued || !identityChanged && !structureChanged && !needsRepair()) return;
      repairQueued = true;
      Promise.resolve().then(() => {
        repairQueued = false;
        if (!disposed && !generating && (identityChanged || structureChanged || needsRepair())) void scan();
      });
    });
    observer.observe(chat, { childList: true, subtree: true, attributes: true,
      attributeFilter: ['mesid', 'is_user', 'is_system', 'is_hidden'] });
  }

  function bind(name, handler) {
    const handle = afterNative.bindEvent(name, handler);
    if (handle?.stop) subscriptions.push(handle);
  }

  function mount() {
    if (disposed) return false;
    if (!subscriptions.length) {
      const events = afterNative.tavernEvents();
      if (events) {
        bind(events.CHARACTER_MESSAGE_RENDERED, () => { void scan(); });
        bind(events.MESSAGE_UPDATED, () => { void scan(); });
        bind(events.MESSAGE_SWIPED, () => { void scan(); });
        bind(events.MESSAGE_RECEIVED, () => { void scan(); });
        bind(events.MESSAGE_DELETED, messageId => {
          scanToken++; remove(messageId); images.delete(Number(messageId)); void scan();
        });
        bind(events.GENERATION_STARTED, (type, options, dryRun) => {
          if (type === 'quiet' || dryRun || options?.dryRun) return;
          generating = true; epoch++; scanToken++; Array.from(mounted.keys()).forEach(remove);
        });
        for (const name of new Set([events.GENERATION_ENDED, events.GENERATION_STOPPED].filter(Boolean)))
          bind(name, () => { generating = false; void scan(); });
        bind(events.CHAT_CHANGED, () => {
          epoch++; scanToken++; generating = false;
          Array.from(mounted.keys()).forEach(remove);
          images.clear();
          void Promise.resolve().then(scan);
        });
      }
      const hostWindow = afterNative.getHost()?.window || window;
      const updated = () => { void scan(); };
      hostWindow.addEventListener?.('cryptLord:variables-updated', updated);
      subscriptions.push({ stop: () => hostWindow.removeEventListener?.('cryptLord:variables-updated', updated) });
    }
    void scan();
    observeReplacements();
    return true;
  }

  const api = Object.freeze({
    status() {
      return Object.freeze({
        key: KEY,
        ready: !disposed && afterNative.status().ready,
        mounted: mounted.size > 0,
        bars: mounted.size,
        listeners: subscriptions.length,
      });
    },
    mount,
    refresh,
    setImage,
    dispose() {
      if (disposed) return true;
      disposed = true;
      epoch++; scanToken++;
      observer?.disconnect();
      observer = null;
      subscriptions.forEach(handle => { try { handle.stop(); } catch { /* idempotent */ } });
      subscriptions = [];
      Array.from(mounted.keys()).forEach(remove);
      images.clear();
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  if (!mount()) console.warn(`[${KEY}] 未找到可挂载的 SillyTavern 宿主楼层`);
})();
