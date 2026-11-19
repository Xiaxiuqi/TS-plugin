(() => {
  'use strict';
  const KEY = 'cryptLord.danmakuUi', root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract, modules = root.__stage1Modules;
  const host = modules?.['cryptLord.afterNativeHost'], service = modules?.['cryptLord.danmaku'];
  const animation = modules?.['cryptLord.danmakuEngine'];
  if (!host || !service || !animation) throw Error('弹幕模块依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const state = { disposed: false, epoch: 0, scanToken: 0, playToken: 0, modeToken: 0, modeBusy: false,
    mode: null, rows: [], selected: null, playing: null, source: null, panel: null, layer: null,
    engine: null, observer: null, timer: null, buttons: new Map(), sections: [], cleanups: [],
    reduced: null, generating: false, paused: false, scanning: false, rescan: false, focus: null, modePending: null,
    listRevision: null };
  const ownedDocument = host.getHost()?.document || document;
  const doc = () => ownedDocument, win = () => doc().defaultView || window;
  const valid = epoch => !state.disposed && state.epoch === epoch &&
    modules['cryptLord.afterNativeHost'] === host && modules['cryptLord.danmaku'] === service &&
    (host.getHost()?.document || document) === ownedDocument;
  function node(tag, className, text) {
    const item = doc().createElement(tag);
    if (className) item.className = className; if (text !== undefined) item.textContent = text; return item;
  }
  function tool(label, icon, action, caption) {
    const button = node('button'); button.type = 'button'; button.title = label; button.setAttribute('aria-label', label);
    button.innerHTML = `<i class="fa-solid fa-${icon}" aria-hidden="true"></i>`;
    if (caption) button.append(node('span', '', caption)); button.addEventListener('click', action); return button;
  }
  function status(text) { const target = state.panel?.querySelector('[data-dm-status]'); if (target) target.textContent = text; }
  function reduced() {
    return state.reduced?.matches || state.layer?.dataset.clAppearanceMotion === 'off' ||
      modules['cryptLord.appearanceUi']?.current?.().disableAnimations === true;
  }
  function controls() {
    for (const [id, button] of state.buttons) {
      button.setAttribute('aria-pressed', String(id === state.playing));
      button.disabled = state.generating;
    }
    if (!state.panel) return;
    const available = state.rows.some(row => row.messageId === state.selected);
    state.panel.querySelector('select').disabled = state.generating || !state.rows.length;
    state.panel.querySelector('[data-dm-show]').checked = state.playing !== null;
    state.panel.querySelector('[data-dm-show]').disabled = state.generating || !available;
    state.panel.querySelector('[data-dm-replay]').disabled = state.generating || !available;
    const pause = state.panel.querySelector('[data-dm-pause]');
    pause.disabled = state.playing === null || reduced();
    pause.setAttribute('aria-pressed', String(state.paused));
    pause.title = state.paused ? '继续弹幕' : '暂停弹幕'; pause.setAttribute('aria-label', pause.title);
    pause.firstChild.className = `fa-solid fa-${state.paused ? 'play' : 'pause'}`;
  }
  function modeControls(text) {
    for (const section of state.sections) {
      const input = section.querySelector('input');
      input.disabled = state.generating || state.modeBusy || !state.mode?.revision;
      input.checked = state.modePending ?? (state.mode?.mode === 'on');
      input.indeterminate = state.modePending === null && Boolean(state.mode && !['on', 'off'].includes(state.mode.mode));
      section.querySelector('button').disabled = state.generating || state.modeBusy;
      if (text) section.querySelector('[role="status"]').textContent = text;
      section.setAttribute('aria-busy', String(state.modeBusy));
    }
  }
  function modeText() {
    return !state.mode?.mode ? '弹幕模式未确认，请重新读取' : state.mode.mode === 'mixed' ? '条目启用状态不一致' :
      state.mode?.mode === 'on' ? '弹幕格式已开启' : '普通正文格式已开启';
  }
  async function reloadMode() {
    if (state.generating || state.modeBusy || state.disposed) return false;
    const token = ++state.modeToken, epoch = state.epoch, guard = () => valid(epoch) && state.modeToken === token;
    state.modeBusy = true; modeControls('正在读取世界书...');
    try {
      const snapshot = await service.readMode(guard);
      if (!guard()) return false;
      state.mode = snapshot; modeControls(modeText()); return true;
    } catch (error) {
      if (guard()) { state.mode = null; modeControls(error.message); } return false;
    } finally { if (guard()) { state.modeBusy = false; modeControls(); } }
  }
  async function setMode(enabled) {
    if (state.generating || state.modeBusy || !state.mode?.revision || state.disposed) { modeControls(); return false; }
    if (!win().confirm(`${enabled ? '开启' : '关闭'}弹幕生成模式，并联动切换「1源堡」的 5 个弹幕与格式条目？`)) {
      modeControls(); return false;
    }
    const token = ++state.modeToken, epoch = state.epoch, guard = () => valid(epoch) && state.modeToken === token;
    const expected = state.mode.revision;
    state.modeBusy = true; state.modePending = enabled; modeControls('正在切换世界书条目...');
    try {
      const result = await service.setMode(enabled, expected, guard);
      if (!guard()) return false;
      state.mode = result; modeControls(result.warning || modeText()); return true;
    } catch (error) {
      if (guard()) { state.mode = null; modeControls(`切换失败：${error.message}`); } return false;
    } finally { if (guard()) { state.modeBusy = false; state.modePending = null; modeControls(); } }
  }
  function mountSettings(parent) {
    if (state.disposed) return null;
    const section = node('section', 'crypt-lord-danmaku-settings');
    section.append(node('h3', '', '弹幕'));
    const row = node('label'), input = node('input'); input.type = 'checkbox'; input.setAttribute('aria-label', '弹幕生成模式');
    row.append(node('span', '', '弹幕生成模式'), input);
    input.addEventListener('change', () => void setMode(input.checked));
    const reload = tool('重新读取弹幕配置', 'rotate-right', () => void reloadMode());
    const message = node('span', '', '尚未读取'); message.setAttribute('role', 'status');
    const bottom = node('div'); bottom.append(message, reload); section.append(row, bottom); parent.append(section);
    state.sections.push(section); modeControls(); return section;
  }
  function stop() {
    state.playToken++; state.engine?.stop(); state.playing = null; state.source = null; state.paused = false; controls();
  }
  function rebuildEngine() {
    state.engine?.dispose(); state.engine = animation.create(state.layer);
  }
  async function play(messageId = state.selected) {
    if (state.disposed || state.generating) return false;
    const epoch = state.epoch, token = ++state.playToken;
    try {
      const rows = await service.readFloors(() => valid(epoch) && token === state.playToken && !state.generating);
      if (!valid(epoch) || token !== state.playToken || state.generating) return false;
      const row = rows.find(item => item.messageId === messageId);
      const element = host.getDisplayedMessageElement(messageId);
      if (!row || !element?.isConnected || element.getAttribute('is_user') === 'true') {
        stop(); status('该原生 assistant 楼层已变化或没有弹幕。'); schedule(); return false;
      }
      state.selected = messageId; state.rows = rows; state.playing = messageId; state.source = row;
      state.paused = false; fill();
      if (state.engine.mobile !== (win().innerWidth <= 768)) rebuildEngine();
      state.engine.play(row.comments, reduced());
      if (doc().hidden) state.engine.pause();
      controls(); status(`正在显示 #${messageId} 的 ${row.comments.length} 条弹幕`); return true;
    } catch (error) {
      if (valid(epoch) && token === state.playToken) { stop(); status(`弹幕读取失败：${error.message}`); } return false;
    }
  }
  function pause() {
    if (state.playing === null || reduced()) return;
    state.paused = !state.paused;
    if (state.paused) state.engine.pause(); else state.engine.resume();
    controls();
  }
  function fill() {
    if (!state.panel) return;
    const select = state.panel.querySelector('select'), list = state.panel.querySelector('[data-dm-list]');
    select.replaceChildren(...state.rows.slice().reverse().map(row => {
      const option = node('option', '', `#${row.messageId} · ${row.comments.length} 条`);
      option.value = row.messageId; option.selected = row.messageId === state.selected; return option;
    }));
    const current = state.rows.find(row => row.messageId === state.selected);
    select.disabled = !state.rows.length || state.generating;
    const listRevision = JSON.stringify([current?.messageId, current?.comments]);
    if (state.listRevision !== listRevision) {
      list.replaceChildren(...(current?.comments || []).map((text, index) => {
        const line = node('li'); line.append(node('span', 'crypt-lord-danmaku-index', String(index + 1)), node('p', '', text)); return line;
      }));
      state.panel.querySelector('main').scrollTop = 0; state.listRevision = listRevision;
    }
    state.panel.querySelector('[data-dm-empty]').hidden = Boolean(current);
    controls();
  }
  async function scan() {
    if (state.disposed || state.generating) return;
    if (state.scanning) { state.rescan = true; return; }
    state.scanning = true;
    const epoch = state.epoch, token = state.scanToken;
    try {
      const rows = await service.readFloors(() => valid(epoch) && token === state.scanToken && !state.generating);
      if (!valid(epoch) || token !== state.scanToken || state.generating) return;
      state.rows = rows;
      const visible = new Map();
      for (const row of rows) {
        const element = host.getDisplayedMessageElement(row.messageId);
        if (!element?.isConnected || element.getAttribute('is_user') === 'true') continue;
        let button = state.buttons.get(row.messageId);
        if (!button || !element.contains(button)) {
          button?.remove();
          button = tool(`楼层 #${row.messageId} 弹幕`, 'comments', () => {
            if (state.playing === row.messageId) stop(); else void play(row.messageId);
          }, `弹幕 ${row.comments.length}`);
          button.className = 'crypt-lord-danmaku-floor-tool';
          const anchor = element.querySelector('.mes_text,.custom-mes_text');
          if (!anchor) continue;
          anchor.insertAdjacentElement('afterend', button);
        }
        button.querySelector('span').textContent = `弹幕 ${row.comments.length}`; visible.set(row.messageId, button);
      }
      for (const [id, button] of state.buttons) if (visible.get(id) !== button) button.remove();
      state.buttons = visible;
      if (state.source) {
        const current = rows.find(row => row.messageId === state.playing);
        const element = host.getDisplayedMessageElement(state.playing);
        if (!current || !element?.isConnected || element.getAttribute('is_user') === 'true' ||
          current.raw !== state.source.raw || current.swipeId !== state.source.swipeId) stop();
      }
      if (!rows.some(row => row.messageId === state.selected)) state.selected = rows.at(-1)?.messageId ?? null;
      fill();
    } catch (error) {
      if (valid(epoch) && token === state.scanToken) {
        stop(); state.buttons.forEach(button => button.remove()); state.buttons.clear();
        state.rows = []; state.selected = null; fill(); status(`楼层读取失败：${error.message}`);
      }
    } finally {
      state.scanning = false;
      if (state.rescan) { state.rescan = false; schedule(); }
    }
  }
  function schedule() {
    if (state.disposed) return;
    state.scanToken++;
    if (state.timer !== null) return;
    state.timer = win().setTimeout(() => { state.timer = null; void scan(); }, 80);
  }
  async function open(messageId = null) {
    if (state.disposed || !mount()) return false;
    state.focus = doc().activeElement; state.panel.hidden = false; state.panel.focus();
    if (messageId != null) state.selected = messageId;
    await scan(); if (state.disposed || state.panel.hidden) return false;
    void reloadMode(); return true;
  }
  function closeSettings() { state.modeToken++; state.modeBusy = false; state.modePending = null; modeControls(); }
  function close() {
    closeSettings(); stop(); if (state.panel) state.panel.hidden = true;
    if (state.focus?.isConnected) state.focus.focus();
  }
  function mount() {
    if (state.disposed || state.layer) return Boolean(state.layer);
    if (!doc().body) return false;
    const layer = node('div', 'crypt-lord-danmaku-layer'); layer.hidden = true; layer.setAttribute('aria-hidden', 'true');
    const panel = node('section', 'crypt-lord-danmaku-dialog'); panel.hidden = true; panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', '楼层弹幕');
    panel.innerHTML = '<header><strong>楼层弹幕</strong><div data-dm-header></div></header><nav><select aria-label="弹幕楼层"></select><label><span>显示弹幕</span><input type="checkbox" aria-label="显示弹幕" data-dm-show></label><div data-dm-tools></div></nav><main><p data-dm-empty>暂无弹幕</p><ol data-dm-list></ol></main><div data-dm-mode></div><footer role="status" data-dm-status>只读楼层弹幕</footer>';
    state.layer = layer; state.panel = panel; doc().body.append(layer, panel); rebuildEngine();
    panel.querySelector('[data-dm-header]').append(tool('刷新弹幕楼层', 'rotate-right', () => void scan()),
      tool('关闭楼层弹幕', 'xmark', close));
    const replay = tool('重播弹幕', 'rotate-left', () => void play()); replay.dataset.dmReplay = '';
    const pauseButton = tool('暂停弹幕', 'pause', pause); pauseButton.dataset.dmPause = '';
    panel.querySelector('[data-dm-tools]').append(pauseButton, replay);
    panel.querySelector('[data-dm-show]').addEventListener('change', event => { if (event.target.checked) void play(); else stop(); });
    panel.querySelector('select').addEventListener('change', event => {
      stop(); state.selected = Number(event.target.value); fill(); status(`已选择 #${state.selected}`);
    });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const items = [...panel.querySelectorAll('button,input,select,[tabindex="0"]')]
        .filter(item => !item.disabled && item.getClientRects().length && win().getComputedStyle(item).visibility !== 'hidden');
      const first = items[0], last = items.at(-1);
      if (!first) { event.preventDefault(); panel.focus(); }
      else if (event.shiftKey && (doc().activeElement === first || doc().activeElement === panel)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (doc().activeElement === last || doc().activeElement === panel)) {
        event.preventDefault(); first.focus();
      }
    });
    mountSettings(panel.querySelector('[data-dm-mode]'));
    state.reduced = win().matchMedia('(prefers-reduced-motion: reduce)');
    const motionChanged = () => { if (state.playing !== null) void play(state.playing); };
    state.reduced.addEventListener('change', motionChanged);
    state.cleanups.push(() => state.reduced.removeEventListener('change', motionChanged));
    const appearanceObserver = new (win().MutationObserver)(motionChanged);
    appearanceObserver.observe(layer, { attributes: true, attributeFilter: ['data-cl-appearance-motion'] });
    state.cleanups.push(() => appearanceObserver.disconnect());
    const visibility = () => {
      if (doc().hidden) state.engine.pause(); else if (!state.paused) state.engine.resume();
    };
    doc().addEventListener('visibilitychange', visibility);
    state.cleanups.push(() => doc().removeEventListener('visibilitychange', visibility));
    const resize = () => { if (state.playing !== null) { stop(); status('窗口尺寸已变化，可重新播放弹幕。'); } };
    win().addEventListener('resize', resize); state.cleanups.push(() => win().removeEventListener('resize', resize));
    const edited = () => { stop(); schedule(); };
    win().addEventListener('cryptLord:message-edited', edited);
    state.cleanups.push(() => win().removeEventListener('cryptLord:message-edited', edited));
    const events = host.tavernEvents() || {};
    function bind(key, handler) {
      if (!events[key]) return;
      const subscription = host.bindEvent(events[key], handler);
      if (subscription) state.cleanups.push(() => subscription.stop());
    }
    bind('CHAT_CHANGED', () => {
      state.epoch++; close(); state.mode = null; modeControls('尚未读取'); state.rows = []; state.selected = null;
      state.generating = false; state.buttons.forEach(button => button.remove()); state.buttons.clear(); fill(); schedule();
    });
    bind('GENERATION_STARTED', (type, options = {}, dryRun) => {
      if (['quiet', 'quiet_prompt'].includes(String(type || '').toLowerCase()) ||
        options?.dryRun || options?.dry_run || dryRun === true) return;
      state.generating = true; stop(); state.scanToken++; closeSettings(); state.mode = null;
      modeControls('正文生成中，结束后请重新读取弹幕配置'); controls();
    });
    for (const name of ['GENERATION_ENDED', 'GENERATION_STOPPED']) bind(name, () => {
      state.generating = false; schedule(); controls(); modeControls();
    });
    for (const name of ['MESSAGE_RECEIVED', 'MESSAGE_SWIPED', 'MESSAGE_UPDATED', 'MESSAGE_EDITED',
      'MESSAGE_DELETED', 'MESSAGE_SWIPE_DELETED']) bind(name, edited);
    bind('CHARACTER_MESSAGE_RENDERED', schedule);
    for (const name of ['WORLDINFO_UPDATED', 'WORLDINFO_SETTINGS_UPDATED']) bind(name, () => {
      if (!state.modeBusy) { state.mode = null; modeControls('世界书已变化，请重新读取'); }
    });
    const chat = doc().querySelector('#chat');
    if (chat) {
      state.observer = new (win().MutationObserver)(changes => {
        const relevant = changes.some(change => {
          if (change.type === 'attributes') return true;
          return [...change.addedNodes, ...change.removedNodes].some(item => item.nodeType === 1 &&
            !item.matches('[class^="crypt-lord-"]') && (item.matches('.mes,.mes_text,.custom-mes_text') ||
              item.querySelector('.mes,.mes_text,.custom-mes_text')));
        });
        if (relevant) schedule();
      });
      state.observer.observe(chat, { childList: true, subtree: true, attributes: true, attributeFilter: ['is_user', 'mesid'] });
    }
    schedule(); return true;
  }
  const api = Object.freeze({ status: () => ({ key: KEY, ready: !state.disposed && Boolean(state.layer), open: Boolean(state.panel && !state.panel.hidden),
    playing: state.playing, selected: state.selected, modeBusy: state.modeBusy, rows: state.rows.length,
    animation: state.engine?.status() }), mount, mountSettings, open, close, closeSettings, reloadMode, setMode, play, pause, stop, refresh: scan,
    dispose() {
      state.disposed = true; state.epoch++; close(); state.observer?.disconnect();
      if (state.timer !== null) win().clearTimeout(state.timer);
      state.cleanups.splice(0).forEach(cleanup => cleanup()); state.buttons.forEach(button => button.remove());
      state.buttons.clear(); state.sections.forEach(section => section.remove()); state.sections = [];
      state.engine?.dispose(); state.layer?.remove(); state.panel?.remove();
      contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY]; return true;
    } });
  modules[KEY] = api; contract.initializeGlobal(KEY, api); mount();
})();
