(() => {
  'use strict';
  const KEY = 'cryptLord.systemSettingsUi';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract, modules = root.__stage1Modules;
  if (!contract || !modules?.['cryptLord.afterNativeHost']) throw new Error('系统设置宿主尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const host = modules['cryptLord.afterNativeHost'];
  const state = { panel: null, fields: {}, revision: null, loaded: false, dirty: false, busy: false,
    listing: false, token: 0, listToken: 0, disposed: false, focus: null, subscription: null, cleanups: [], appearance: null,
    qualityFields: {}, qualityRevision: null, qualityBusy: false, qualityDirty: false,
    progressionRevision: null, progressionBusy: false, progressionDirty: false };
  const doc = () => host.getHost()?.document || document;
  const view = () => doc().defaultView || window;
  const service = () => modules['cryptLord.variableSettlementApi'];
  const active = token => !state.disposed && modules[KEY] === api && modules['cryptLord.afterNativeHost'] === host &&
    state.token === token && state.panel?.dataset.open === 'true' && doc() === state.panel.ownerDocument;
  const requestGuard = token => {
    const selected = service(), sourceHost = modules['cryptLord.hostApi'];
    return () => active(token) && service() === selected && modules['cryptLord.hostApi'] === sourceHost;
  };
  const field = key => state.fields[key];
  function node(tag, className, text) {
    const item = doc().createElement(tag);
    if (className) item.className = className;
    if (text !== undefined) item.textContent = text;
    return item;
  }
  function tool(name, icon, action) {
    const item = node('button');
    item.type = 'button'; item.title = name; item.setAttribute('aria-label', name);
    item.innerHTML = `<i class="fa-solid fa-${icon}" aria-hidden="true"></i>`;
    item.addEventListener('click', action);
    return item;
  }
  function status(text) { state.panel.querySelector('[data-api-status]').textContent = text; }
  function errorText(error) {
    let text = String(error?.message || error);
    for (const key of ['apiKey', 'apiUrl']) if (field(key)?.value.trim()) text = text.split(field(key).value.trim()).join('[已隐藏]');
    return text;
  }
  function refresh() {
    const blocked = state.busy || !state.loaded || !state.revision;
    state.panel.setAttribute('aria-busy', String(state.busy));
    state.panel.querySelector('[data-api-fieldset]').disabled = blocked;
    state.panel.querySelector('[data-action="save"]').disabled = blocked || state.listing || !state.dirty;
    state.panel.querySelector('[data-action="reload"]').disabled = state.busy;
    state.panel.querySelector('[data-custom]').hidden = !field('useCustomApi').checked;
    state.panel.querySelector('[data-action="models"]').disabled = blocked || state.listing;
    state.panel.querySelector('[data-dirty]').textContent = state.dirty ? '未保存' : '已同步';
  }
  function values() {
    return Object.fromEntries(Object.entries(state.fields).map(([key, input]) =>
      [key, input.type === 'checkbox' ? input.checked : input.value]));
  }
  function fill(settings) {
    for (const [key, input] of Object.entries(state.fields)) {
      if (input.type === 'checkbox') input.checked = settings[key];
      else input.value = String(settings[key]);
    }
    field('apiKey').type = 'password';
    state.panel.querySelector('[data-action="reveal"]').setAttribute('aria-pressed', 'false');
    setModels([]);
  }
  function setModels(names) {
    const select = state.panel.querySelector('[aria-label="模型列表"]'), current = field('model').value.trim();
    select.replaceChildren();
    const placeholder = node('option', '', names.length ? '选择模型' : '暂无模型列表');
    placeholder.value = ''; select.append(placeholder);
    for (const name of [...new Set([current, ...names].filter(Boolean))]) {
      const option = node('option', '', name); option.value = name; option.selected = name === current; select.append(option);
    }
    select.disabled = !names.length;
  }
  function changed(key) {
    state.dirty = true;
    if (['apiUrl', 'apiKey', 'useCustomApi'].includes(key)) {
      state.listToken++; state.listing = false; setModels([]);
    }
    refresh(); status('配置有未保存的修改。');
  }
  function qualityControls() {
    if (!state.panel.querySelector('[data-quality-status]')) return;
    for (const input of Object.values(state.qualityFields)) input.disabled = state.qualityBusy || !state.qualityRevision;
    state.panel.querySelector('[data-quality-save]').disabled = state.qualityBusy || !state.qualityRevision || !state.qualityDirty;
    state.panel.querySelector('[data-quality-reload]').disabled = state.qualityBusy;
  }
  async function qualityRequest(save = false) {
    const quality = modules['cryptLord.generationQuality'];
    if (!quality || state.qualityBusy) return false;
    if (!save && state.qualityDirty && !view().confirm('放弃未保存的正文设置，重新读取？')) return false;
    const token = state.token, valid = () => active(token);
    const message = state.panel.querySelector('[data-quality-status]');
    state.qualityBusy = true; qualityControls(); message.textContent = save ? '正在保存正文设置...' : '正在读取正文设置...';
    try {
      const values = Object.fromEntries(Object.entries(state.qualityFields).map(([key, input]) => {
        if (!input.value.trim()) throw Error('正文设置不能为空');
        return [key, Number(input.value)];
      }));
      const result = save ? await quality.saveSettings(values, state.qualityRevision, valid) : await quality.readSnapshot(valid);
      if (!valid()) return false;
      state.qualityRevision = result.revision;
      if (result.settings) {
        state.qualityDirty = false;
        Object.entries(state.qualityFields).forEach(([key, input]) => { input.value = result.settings[key]; });
      }
      message.textContent = result.warning || (save ? '正文设置已保存。' : '正文设置已读取。');
      return true;
    } catch (error) { if (valid()) message.textContent = error.message; return false; }
    finally { if (valid()) { state.qualityBusy = false; qualityControls(); } }
  }
  function progressionControls() {
    const input = state.panel?.querySelector('[data-progression-input]'); if (!input) return;
    input.disabled = state.progressionBusy || !state.progressionRevision;
    state.panel.querySelector('[data-progression-save]').disabled =
      state.progressionBusy || !state.progressionRevision || !state.progressionDirty;
    state.panel.querySelector('[data-progression-reload]').disabled = state.progressionBusy;
  }
  async function progressionRequest(save = false) {
    const growth = modules['cryptLord.playerProgression']; if (!growth || state.progressionBusy) return false;
    if (!save && state.progressionDirty && !view().confirm('放弃未保存的成长设置，重新读取？')) return false;
    const token = state.token, valid = () => active(token);
    const message = state.panel.querySelector('[data-progression-status]'), input = state.panel.querySelector('[data-progression-input]');
    state.progressionBusy = true; progressionControls(); message.textContent = save ? '正在保存成长设置...' : '正在读取成长设置...';
    try {
      if (save && (!input.value.trim() || !Number.isInteger(Number(input.value)))) throw Error('消化单次增幅须为1至100的整数');
      const result = save ? await growth.saveSettings(Number(input.value), state.progressionRevision, valid) : await growth.readSettings(valid);
      if (!valid()) return false;
      state.progressionRevision = result.revision; state.progressionDirty = false; input.value = result.settings.maxDigestionDelta;
      message.textContent = result.warning || (save ? '成长设置已保存。' : '成长设置已读取。'); return true;
    } catch (error) {
      if (valid()) {
        if (!save) state.progressionRevision = null;
        message.textContent = error.message;
      } return false;
    } finally { if (valid()) { state.progressionBusy = false; progressionControls(); } }
  }
  async function reload() {
    if (state.busy) return false;
    if (state.dirty && !view().confirm('放弃未保存的 API 配置，重新读取？')) return false;
    const token = state.token, selected = service(), valid = requestGuard(token);
    state.listToken++; state.listing = false; state.busy = true; refresh(); status('正在读取系统配置...');
    try {
      const snapshot = await selected.readSnapshot(valid);
      if (!active(token)) return false;
      fill(snapshot.settings); state.revision = snapshot.revision; state.loaded = true; state.dirty = false;
      status('系统配置已读取。');
      return true;
    } catch (error) {
      if (active(token)) {
        state.loaded = false; state.revision = null;
        status(`读取失败：${errorText(error)}`);
      }
      return false;
    } finally { if (active(token)) { state.busy = false; refresh(); } }
  }
  async function save() {
    if (state.busy || state.listing || !state.loaded || !state.revision || !state.dirty) return false;
    const token = state.token, selected = service(), valid = requestGuard(token);
    const retry = Number(field('retryLimit').value);
    if (!field('retryLimit').value.trim() || !Number.isInteger(retry) || retry < 0 || retry > 999) {
      status('重试次数必须是 0 到 999 的整数。'); field('retryLimit').focus(); return false;
    }
    state.busy = true; refresh(); status('正在保存系统配置...');
    try {
      const saved = await selected.saveSettings(values(), state.revision, valid);
      if (!active(token)) return false;
      state.revision = saved.revision; state.dirty = false;
      status(saved.warning || '系统独立 API 配置已保存。');
      return true;
    } catch (error) {
      if (active(token)) {
        if (error.requiresReload || /来源|身份|别处更改/.test(error.message)) state.revision = null;
        status(`保存失败：${errorText(error)}${error.requiresReload ? '，草稿已保留，请重新读取。' : ''}`);
      }
      return false;
    } finally { if (active(token)) { state.busy = false; refresh(); } }
  }
  async function models() {
    if (state.busy || state.listing || !state.loaded || !state.revision) return;
    const token = state.token, listToken = ++state.listToken, selected = service(), sourceValid = requestGuard(token);
    const valid = () => sourceValid() && state.listToken === listToken;
    state.listing = true; refresh(); status('正在获取模型列表...');
    try {
      const names = await selected.getModelList({ apiurl: field('apiUrl').value, key: field('apiKey').value }, valid);
      if (!valid()) return;
      setModels(names);
      status(names.length ? `已获取 ${names.length} 个模型。` : '未返回模型，可手动填写模型名。');
    } catch (error) { if (active(token) && state.listToken === listToken) status(`模型列表获取失败：${errorText(error)}`); }
    finally { if (active(token) && state.listToken === listToken) { state.listing = false; refresh(); } }
  }
  function clamp() {
    if (!state.panel) return;
    const rect = state.panel.getBoundingClientRect(), win = view();
    if (rect.width > win.innerWidth - 16) state.panel.style.width = `${Math.max(0, win.innerWidth - 16)}px`;
    if (rect.height > win.innerHeight - 16) state.panel.style.height = `${Math.max(0, win.innerHeight - 16)}px`;
    state.panel.style.left = `${Math.max(8, Math.min(parseFloat(state.panel.style.left) || rect.left, win.innerWidth - state.panel.offsetWidth - 8))}px`;
    state.panel.style.top = `${Math.max(8, Math.min(parseFloat(state.panel.style.top) || rect.top, win.innerHeight - state.panel.offsetHeight - 8))}px`;
  }
  function close(closeAppearance = true) {
    modules['cryptLord.danmakuUi']?.closeSettings();
    if (closeAppearance) modules['cryptLord.appearanceUi']?.close();
    state.token++; state.listToken++; state.listing = false; state.busy = false;
    state.qualityBusy = false;
    state.progressionBusy = false;
    if (state.panel) {
      state.panel.dataset.open = 'false'; field('apiKey').type = 'password'; refresh();
      progressionControls();
    }
    if (state.focus?.isConnected) state.focus.focus();
  }
  async function open(appearance) {
    if (!mount()) return false;
    if (appearance) state.appearance = appearance;
    paintTheme();
    if (state.panel.dataset.open === 'true') return true;
    state.focus = doc().activeElement; state.token++; state.panel.dataset.open = 'true';
    state.panel.focus(); clamp();
    void modules['cryptLord.appearanceUi']?.open();
    void modules['cryptLord.danmakuUi']?.reloadMode();
    if (!state.qualityDirty || !state.qualityRevision) void qualityRequest();
    if (!state.progressionDirty || !state.progressionRevision) void progressionRequest();
    else {
      progressionControls();
      state.panel.querySelector('[data-progression-status]').textContent = '成长设置有未保存的修改。';
    }
    if (state.loaded && state.dirty && state.revision) refresh();
    else await reload();
    return true;
  }
  function paintTheme(value) {
    const theme = value || state.appearance?.get?.() || 'dark';
    state.panel.dataset.theme = theme;
    state.panel.querySelectorAll('[data-theme-choice]').forEach(button =>
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme)));
  }
  function mount() {
    if (state.disposed || state.panel) return Boolean(state.panel);
    if (!doc().body) return false;
    const panel = node('section', 'crypt-lord-system-settings');
    panel.dataset.open = 'false'; panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', '系统设置');
    const header = node('header'), tools = node('div', 'crypt-lord-system-settings__tools');
    header.append(node('strong', '', '系统设置'), node('span', '', '外观与生成'));
    const reloadButton = tool('重新读取', 'rotate-right', () => void reload()); reloadButton.dataset.action = 'reload';
    tools.append(reloadButton, tool('关闭', 'xmark', close)); header.append(tools);
    const main = node('main'), appearance = node('section', 'crypt-lord-system-settings__section');
    appearance.append(node('h3', '', '外观'));
    const themeGroup = node('div', 'crypt-lord-system-settings__themes');
    for (const [value, label, icon] of [['dark', '深色', 'moon'], ['light', '浅色', 'sun']]) {
      const button = tool(label, icon, () => { state.appearance?.set?.(value); paintTheme(value); });
      button.dataset.themeChoice = value; button.append(node('span', '', label)); themeGroup.append(button);
    }
    appearance.append(themeGroup);
    if (modules['cryptLord.appearanceUi']) modules['cryptLord.appearanceUi'].mount(main);
    else main.append(appearance);
    modules['cryptLord.danmakuUi']?.mountSettings(main);
    if (modules['cryptLord.playerProgression']) {
      const section = node('section', 'crypt-lord-system-settings__section'); section.append(node('h3', '', '玩家成长'));
      const row = node('label', 'crypt-lord-system-settings__row'), input = node('input');
      input.type = 'number'; input.min = '1'; input.max = '100'; input.step = '1'; input.value = '3';
      input.dataset.progressionInput = ''; input.setAttribute('aria-label', '消化进度单次增幅上限');
      input.addEventListener('input', () => { state.progressionDirty = true; progressionControls(); });
      row.append(node('span', '', '消化进度单次增幅上限'), input); section.append(row);
      const actions = node('div', 'crypt-lord-system-settings__quality-actions'), message = node('span');
      message.dataset.progressionStatus = ''; message.setAttribute('role', 'status');
      const reload = tool('重新读取成长设置', 'rotate-right', () => void progressionRequest()); reload.dataset.progressionReload = '';
      const save = tool('保存成长设置', 'floppy-disk', () => void progressionRequest(true)); save.dataset.progressionSave = '';
      actions.append(message, reload, save); section.append(actions); main.append(section);
    }
    const growthSection = node('section', 'crypt-lord-system-settings__section');
    growthSection.append(node('h3', '', '变量记录'));
    const growthButton = tool('变量增殖提醒', 'bell', () => {
      const token = state.token;
      void contract.waitGlobalInitialized('cryptLord.collectionGrowthUi', { timeoutMs: 10000 })
        .then(api => active(token) && api.open({ tab: 'settings' }))
        .catch(error => { if (active(token)) status(`提醒配置未打开：${error?.message || error}`); });
    });
    growthButton.className = 'is-command';
    growthButton.append(node('span', '', '变量增殖提醒')); growthSection.append(growthButton); main.append(growthSection);
    const fieldset = node('fieldset'), general = node('section', 'crypt-lord-system-settings__section');
    fieldset.dataset.apiFieldset = '';
    general.append(node('h3', '', '请求设置'));
    function input(key, label, type, parent) {
      const row = node('label', `crypt-lord-system-settings__row${type === 'checkbox' ? ' is-toggle' : ''}`);
      const control = node('input'); control.type = type; control.setAttribute('aria-label', label);
      control.dataset.setting = key; state.fields[key] = control;
      const caption = node('span', '', label);
      row.append(caption, control); parent.append(row);
      control.addEventListener(type === 'checkbox' ? 'change' : 'input', () => changed(key));
      return { row, control };
    }
    input('enabled', '自动变量结算', 'checkbox', general);
    input('streamingEnabled', '流式请求', 'checkbox', general);
    input('gemini37fPrefill', 'Gemini 3.6+ 预填兼容', 'checkbox', general);
    input('useCustomApi', '使用独立 API', 'checkbox', general);
    const custom = node('section', 'crypt-lord-system-settings__section'); custom.dataset.custom = '';
    custom.append(node('h3', '', '连接与模型'));
    const url = input('apiUrl', 'API URL', 'url', custom).control;
    url.placeholder = 'https://api.example.com/v1'; url.autocomplete = 'off'; url.spellcheck = false;
    const key = input('apiKey', 'API Key', 'password', custom);
    key.control.autocomplete = 'new-password'; key.control.spellcheck = false;
    const secret = node('div', 'crypt-lord-system-settings__secret');
    const reveal = tool('显示或隐藏密钥', 'eye', () => {
      const shown = key.control.type === 'password'; key.control.type = shown ? 'text' : 'password';
      reveal.setAttribute('aria-pressed', String(shown));
    });
    reveal.dataset.action = 'reveal'; reveal.setAttribute('aria-pressed', 'false');
    secret.append(key.control, reveal); key.row.append(secret);
    input('model', '模型名', 'text', custom).control.spellcheck = false;
    const modelRow = node('div', 'crypt-lord-system-settings__row');
    const select = node('select'); select.setAttribute('aria-label', '模型列表');
    select.addEventListener('change', () => { if (select.value) { field('model').value = select.value; changed('model'); } });
    const list = node('div', 'crypt-lord-system-settings__secret');
    const fetch = tool('获取模型列表', 'arrows-rotate', () => void models()); fetch.dataset.action = 'models';
    list.append(select, fetch); modelRow.append(node('span', '', '模型列表'), list); custom.append(modelRow);
    const retries = node('section', 'crypt-lord-system-settings__section');
    retries.append(node('h3', '', '失败处理'));
    const retry = input('retryLimit', '失败重试次数', 'number', retries).control;
    retry.min = '0'; retry.max = '999'; retry.step = '1';
    fieldset.append(general, custom, retries); main.append(fieldset);
    if (modules['cryptLord.generationQuality']) {
      const quality = node('section', 'crypt-lord-system-settings__section');
      quality.append(node('h3', '', '正文失败处理'));
      const defaults = modules['cryptLord.generationQuality'].defaults();
      for (const [key, label] of [['retryLimit', '正文重试次数'], ['streamTimeoutSeconds', '流式静默超时（秒）'],
        ['noStreamTimeoutSeconds', '非流式超时（秒）']]) {
        const row = node('label', 'crypt-lord-system-settings__row'), control = node('input');
        control.type = 'number'; control.min = '0'; control.max = key === 'retryLimit' ? '999' : '86400'; control.step = '1';
        control.value = defaults[key]; control.setAttribute('aria-label', label); state.qualityFields[key] = control;
        control.addEventListener('input', () => { state.qualityDirty = true; qualityControls(); });
        row.append(node('span', '', label), control); quality.append(row);
      }
      const actions = node('div', 'crypt-lord-system-settings__quality-actions'), message = node('span');
      message.dataset.qualityStatus = ''; message.setAttribute('role', 'status');
      const reload = tool('重新读取正文设置', 'rotate-right', () => void qualityRequest());
      reload.dataset.qualityReload = '';
      const save = tool('保存正文设置', 'floppy-disk', () => void qualityRequest(true));
      save.dataset.qualitySave = ''; save.append(node('span', '', '保存正文设置')); save.className = 'is-primary';
      actions.append(message, reload, save); quality.append(actions); main.append(quality);
    }
    const footer = node('footer'), message = node('span'); message.setAttribute('role', 'status'); message.dataset.apiStatus = '';
    const dirty = node('span', 'crypt-lord-system-settings__dirty'); dirty.dataset.dirty = '';
    const saveButton = tool('保存设置', 'floppy-disk', () => void save());
    saveButton.dataset.action = 'save'; saveButton.className = 'is-primary'; saveButton.append(node('span', '', '保存设置'));
    footer.append(message, dirty, saveButton); panel.append(header, main, footer);
    doc().body.append(panel); state.panel = panel;
    fill(service().defaults()); refresh(); paintTheme(); qualityControls(); progressionControls();
    let drag = null;
    header.addEventListener('pointerdown', event => {
      if (event.target.closest('button')) return;
      const rect = panel.getBoundingClientRect();
      drag = { token: state.token, id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      header.setPointerCapture(event.pointerId);
    });
    header.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId || !active(drag.token)) return;
      panel.style.left = `${drag.left + event.clientX - drag.x}px`; panel.style.top = `${drag.top + event.clientY - drag.y}px`; clamp();
    });
    for (const event of ['pointerup', 'pointercancel']) header.addEventListener(event, () => { drag = null; });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        const controls = [...panel.querySelectorAll('button,input,select')].filter(item => !item.matches(':disabled') && item.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && [first, panel].includes(doc().activeElement)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && [last, panel].includes(doc().activeElement)) { event.preventDefault(); first?.focus(); }
      }
    });
    view().addEventListener('resize', clamp); state.cleanups.push(() => view().removeEventListener('resize', clamp));
    const observer = new (view().ResizeObserver)(() => { if (panel.dataset.open === 'true') clamp(); });
    observer.observe(panel); state.cleanups.push(() => observer.disconnect());
    const events = host.tavernEvents();
    if (events?.CHAT_CHANGED) state.subscription = host.bindEvent(events.CHAT_CHANGED, () => {
      close(false); state.loaded = false; state.revision = null; state.dirty = false; fill(service().defaults()); refresh();
      state.qualityRevision = null; state.qualityDirty = false; qualityControls();
      state.progressionRevision = null; state.progressionDirty = false; progressionControls();
    });
    return true;
  }
  const api = Object.freeze({
    status: () => ({ key: KEY, ready: Boolean(state.panel), open: state.panel?.dataset.open === 'true', dirty: state.dirty }),
    mount, open, close, reload, save,
    dispose() {
      close(); state.disposed = true; state.subscription?.stop?.(); state.cleanups.splice(0).forEach(cleanup => cleanup());
      state.panel?.remove(); state.panel = null;
      contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY]; return true;
    },
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
