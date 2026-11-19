(() => {
  'use strict';
  const KEY = 'cryptLord.imageGenerationUi';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const service = modules['cryptLord.imageGeneration'];
  const host = modules['cryptLord.afterNativeHost'];
  if (!service || !host) throw new Error('图像生成依赖尚未加载');
  const state = {
    panel: null, body: null, status: null, presets: [], revision: '', selected: 'default',
    settings: null, image: '', controller: null, busy: false, token: 0, disposed: false, subscriptions: [],
    drafts: {}, creation: null, generating: service.status().generating, focus: null,
  };
  const doc = () => host.getHost()?.document || document;
  const win = () => doc().defaultView || window;
  const el = (tag, className = '', text) => {
    const node = doc().createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  function button(text, fn, title = text) {
    const node = el('button', '', text);
    node.type = 'button';
    node.title = title;
    node.setAttribute('aria-label', title);
    node.addEventListener('click', fn);
    return node;
  }
  function field(label, input) {
    const row = el('label', 'crypt-lord-image__field');
    row.append(el('span', '', label), input);
    return row;
  }
  function option(select, value, name) {
    const node = el('option', '', name);
    node.value = value;
    select.append(node);
  }
  function message(text, error = false) {
    state.status.textContent = text;
    state.status.dataset.error = String(error);
  }
  function current() { return state.presets.find(item => item.id === state.selected) || state.presets[0]; }
  function active(token) { return !state.disposed && state.panel?.dataset.open === 'true' && token === state.token &&
    modules[KEY] === api && modules['cryptLord.imageGeneration'] === service &&
    modules['cryptLord.afterNativeHost'] === host && state.panel.ownerDocument === doc(); }
  function close() {
    remember();
    ++state.token;
    state.controller?.abort();
    state.controller = null;
    state.image = '';
    state.busy = false;
    state.panel?.removeAttribute('aria-busy');
    if (state.panel) state.panel.dataset.open = 'false';
    if (state.focus?.isConnected) state.focus.focus();
  }
  function cancel() {
    if (!state.busy) return;
    ++state.token;
    state.controller?.abort();
    state.controller = null;
    state.busy = false;
    state.panel.removeAttribute('aria-busy');
    controls();
    message('生成已取消');
  }
  function mount() {
    if (state.disposed || state.panel || !doc().body) return Boolean(state.panel);
    const panel = el('section', 'crypt-lord-image');
    panel.dataset.open = 'false';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '图像生成');
    panel.tabIndex = -1;
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        const nodes = [...panel.querySelectorAll('button,input,select,textarea')]
          .filter(node => !node.disabled && node.getClientRects().length);
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && (doc().activeElement === first || doc().activeElement === panel)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (doc().activeElement === last || doc().activeElement === panel)) { event.preventDefault(); first?.focus(); }
      }
    });
    const header = el('header');
    header.append(el('strong', '', '图像生成'), button('取消', cancel), button('×', close, '关闭'));
    const body = el('div', 'crypt-lord-image__body');
    const status = el('div', 'crypt-lord-image__status');
    status.setAttribute('role', 'status');
    panel.append(header, body, status);
    doc().body.append(panel);
    Object.assign(state, { panel, body, status });
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
    const bind = (name, fn) => { if (name) { const sub = host.bindEvent(name, fn); if (sub) state.subscriptions.push(sub); } };
    bind(events?.CHAT_CHANGED, () => {
      state.generating = false;
      close();
      state.drafts = {}; state.creation = null; state.revision = null; state.settings = null;
    });
    bind(events?.GENERATION_STARTED, (type, options, dryRun) => {
      if (dryRun || options?.dryRun || ['quiet', 'dryRun'].includes(type) || options?.quiet_prompt) return;
      remember();
      state.token++;
      state.controller?.abort(); state.controller = null; state.busy = false;
      state.generating = true; state.revision = null; state.settings = null;
      state.panel.removeAttribute('aria-busy');
      if (!state.body.children.length) state.body.append(button('重新读取', () => { close(); void open(); }));
      controls();
      message('正文生成中，生图操作已暂停，草稿已保留。', true);
    });
    const ended = () => {
      state.generating = false; controls();
      if (state.panel.dataset.open === 'true') message('生成已结束，请重新读取后继续。', true);
    };
    bind(events?.GENERATION_ENDED, ended);
    bind(events?.GENERATION_STOPPED, ended);
    return true;
  }
  function gather() {
    const get = key => state.body.querySelector(`[data-field="${key}"]`);
    return {
      name: get('name')?.value.trim() || '', rule: get('rule')?.value || '',
      prompt: get('prompt')?.value || '', change: get('change')?.value || '',
      width: get('width')?.value === '' ? null : Number(get('width')?.value),
      height: get('height')?.value === '' ? null : Number(get('height')?.value),
      settings: { timeout: Number(get('timeout')?.value), selected: state.selected },
    };
  }
  function remember() {
    if (!state.body.querySelector('[data-field="rule"]')) return;
    const draft = gather();
    state.drafts[state.selected] = { name: draft.name, prompt: draft.rule };
    state.creation = draft;
  }
  function controls() {
    state.body.querySelectorAll('button,input,textarea,select').forEach(node => {
      node.disabled = state.busy || state.generating || node.dataset.locked === 'true' ||
        node.dataset.requiresLibrary === 'true' && !state.revision;
    });
  }
  async function task(work) {
    if (state.busy || state.generating) return;
    const token = state.token;
    remember();
    state.busy = true;
    controls();
    state.panel.setAttribute('aria-busy', 'true');
    try { await work(token); }
    catch (error) {
      if (active(token)) {
        if (error.requiresReload) { state.revision = null; state.settings = null; }
        message(error?.message || String(error), true);
      }
    }
    finally {
      if (active(token)) {
        state.busy = false;
        state.panel.removeAttribute('aria-busy');
        controls();
      }
    }
  }
  function validateImage(draft) {
    if ([draft.width, draft.height].some(value => value !== null && (!Number.isSafeInteger(value) || value <= 0))) {
      throw new Error('宽高必须是正整数或留空');
    }
    if (!Number.isSafeInteger(draft.settings.timeout) || draft.settings.timeout <= 0 ||
      draft.settings.timeout > Math.floor(Number.MAX_SAFE_INTEGER / 1000)) throw Error('超时必须为有效正整数');
  }
  async function createImage(token, draft) {
    validateImage(draft);
    message('正在等待生图插件响应…');
    if (draft.witness) await service.verifyFloor(draft.witness, () => active(token));
    if (!state.revision) throw Error('请先重新读取生图套装');
    const revision = state.revision;
    const bar = draft.witness ? modules['cryptLord.nativeFloorStatusBar'] : null;
    await service.verifyPresets(revision, () => active(token));
    if (!active(token)) return;
    const controller = new AbortController();
    state.controller = controller;
    try {
      const image = await service.requestImage({ ...draft, revision, timeout: draft.settings.timeout },
        controller.signal, () => active(token));
      if (!active(token)) return;
      if (typeof image !== 'string' || !/^(data:image\/|https?:\/\/|blob:)/i.test(image)) throw new Error('生图插件未返回可显示的图片地址');
      const picture = el('img');
      picture.alt = '生成的图片';
      await new Promise((resolve, reject) => {
        const finish = error => {
          clearTimeout(timer);
          controller.signal.removeEventListener('abort', abort);
          picture.onload = picture.onerror = null;
          if (error) reject(error); else resolve();
        };
        const abort = () => finish(Error('生图请求已取消'));
        const timer = setTimeout(() => finish(Error('图片加载超时，请重试')), 15000);
        controller.signal.addEventListener('abort', abort, { once: true });
        picture.onload = () => finish();
        picture.onerror = () => finish(Error('图片无法加载，请重试'));
        picture.src = image;
      });
      if (draft.witness) await service.verifyFloor(draft.witness, () => active(token));
      await service.verifyPresets(revision, () => active(token));
      if (!active(token)) return;
      if (draft.witness) {
        if (!bar?.setImage || modules['cryptLord.nativeFloorStatusBar'] !== bar || bar.setImage(draft.witness.id, image) === false)
          throw Error('原生楼层插图区尚未就绪，请重试');
      }
      state.image = image;
      const preview = state.body.querySelector('.crypt-lord-image__preview');
      preview.replaceChildren(picture);
      message('图像生成完成');
    } finally { if (state.controller === controller) state.controller = null; }
  }
  function section(title) {
    const node = el('section', 'crypt-lord-image__section');
    node.append(el('h3', '', title));
    state.body.append(node);
    return node;
  }
  function input(type, value, key) {
    const node = el('input');
    node.type = type;
    if (type === 'number') { node.min = '1'; node.step = '1'; }
    node.value = value;
    node.dataset.field = key;
    return node;
  }
  function textarea(value, key, rows) {
    const node = el('textarea');
    node.value = value;
    node.rows = rows;
    node.dataset.field = key;
    return node;
  }
  function render() {
    state.body.replaceChildren();
    const base = current();
    const preset = { ...base, ...state.drafts[base?.id] };
    const draft = state.creation || { prompt: '', change: '', width: 1024, height: 1024, settings: state.settings };
    const library = section('生图提示词套装');
    const select = el('select');
    state.presets.forEach(item => option(select, item.id, `${item.name}${item.locked ? ' · 锁定' : ''}`));
    select.value = preset?.id || 'default';
    select.addEventListener('change', () => { remember(); state.selected = select.value; render(); });
    const name = input('text', preset?.name || '', 'name');
    name.dataset.locked = String(Boolean(preset?.locked));
    library.append(field('当前套装', select), field('套装名称', name));
    library.append(field('系统规则', textarea(preset?.prompt || '', 'rule', 7)));
    const row = el('div', 'crypt-lord-image__row');
    row.append(
      button('保存当前套', () => void task(async token => {
        const draft = gather();
        if (!draft.rule.trim()) throw new Error('套装内容不能为空');
        const list = state.presets.map(item => item.id === preset.id ?
          { ...item, name: item.locked ? item.name : draft.name || item.name, prompt: draft.rule } : item);
        const saved = await service.savePresets(list, state.revision, () => active(token));
        if (!active(token)) return;
        state.presets = saved.presets; state.revision = saved.revision;
        delete state.drafts[preset.id];
        render(); message(saved.warning || '套装已保存到世界书', Boolean(saved.warning));
      })),
      button('另存为新套', () => void task(async token => {
        const draft = gather();
        if (!draft.rule.trim()) throw new Error('套装内容不能为空');
        const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const saved = await service.savePresets([...state.presets, {
          id, name: draft.name || '我的套装', prompt: draft.rule, locked: false,
        }], state.revision, () => active(token));
        if (!active(token)) return;
        state.presets = saved.presets; state.revision = saved.revision; state.selected = id;
        render(); message(saved.warning || '新套装已保存', Boolean(saved.warning));
      })),
      button('删除', () => void task(async token => {
        if (preset.locked) throw new Error('默认套装不可删除');
        if (!win().confirm(`删除套装「${preset.name}」？`)) return;
        const saved = await service.savePresets(state.presets.filter(item => item.id !== preset.id), state.revision, () => active(token));
        if (!active(token)) return;
        state.presets = saved.presets; state.revision = saved.revision; state.selected = 'default';
        render(); message(saved.warning || '套装已删除', Boolean(saved.warning));
      })),
      button('恢复默认', () => void task(async token => {
        const seed = service.defaultPreset();
        const saved = await service.savePresets(state.presets.map(item => item.id === 'default' ? seed : item), state.revision, () => active(token));
        if (!active(token)) return;
        state.presets = saved.presets; state.revision = saved.revision; state.selected = 'default';
        delete state.drafts.default;
        render(); message(saved.warning || '已恢复默认套装', Boolean(saved.warning));
      })),
    );
    row.querySelectorAll('button')[2].dataset.locked = String(Boolean(preset.locked));
    row.querySelectorAll('button').forEach(node => { node.dataset.requiresLibrary = 'true'; });
    row.append(button('重新读取', () => void task(async token => {
      const dirty = Object.entries(state.drafts).some(([id, draft]) => {
        const original = state.presets.find(item => item.id === id);
        return original && (original.name !== draft.name || original.prompt !== draft.prompt);
      });
      if (dirty && !win().confirm('重新读取将放弃未保存的套装编辑，继续？')) return;
      const [saved, settings] = await Promise.all([
        service.loadPresets(false, () => active(token)), service.readSettings(() => active(token)),
      ]);
      if (!active(token)) return;
      state.presets = saved.presets; state.revision = saved.revision; state.settings = settings; state.drafts = {};
      if (!state.presets.some(item => item.id === state.selected)) state.selected = 'default';
      render(); message('套装已重新读取');
    })));
    library.append(row);
    const settingsSection = section('生成设置');
    settingsSection.append(field('超时（秒）', input('number', String(draft.settings.timeout), 'timeout')));
    settingsSection.append(button('保存设置', () => void task(async token => {
      const settings = gather().settings;
      if (!Number.isSafeInteger(settings.timeout) || settings.timeout <= 0 ||
        settings.timeout > Math.floor(Number.MAX_SAFE_INTEGER / 1000)) throw Error('超时必须为有效正整数');
      const saved = await service.saveSettings(settings, () => active(token), state.settings);
      if (active(token)) { state.settings = saved.settings; message(saved.warning || '设置已保存', Boolean(saved.warning)); }
    })));
    const creation = section('图像生成');
    const creationActions = el('div', 'crypt-lord-image__row');
    creationActions.append(button('根据最新正文生成提示词', () => void task(async token => {
      message('正在读取正文并生成提示词…');
      if (!state.revision) throw Error('请先重新读取生图套装');
      const witness = await service.readFloor(null, () => active(token));
      if (!active(token)) return;
      const draft = gather();
      const prompt = await service.generatePrompt(draft.rule, witness.text, () => active(token),
        { witness, revision: state.revision });
      await service.verifyFloor(witness, () => active(token));
      if (!active(token)) return;
      state.body.querySelector('[data-field="prompt"]').value = prompt;
      message('提示词已填入');
    })));
    creationActions.append(button('根据最新正文一键生图', () => void task(async token => {
      await generateForFloor(token);
    })));
    creation.append(creationActions);
    creation.append(field('提示词', textarea(draft.prompt, 'prompt', 4)));
    creation.append(field('修改 / 添加', textarea(draft.change, 'change', 2)));
    const size = el('div', 'crypt-lord-image__row');
    size.append(field('宽度', input('number', draft.width ?? '', 'width')), field('高度', input('number', draft.height ?? '', 'height')));
    creation.append(size);
    creation.append(button('发送生成请求', () => void task(token => createImage(token, gather()))));
    const preview = el('div', 'crypt-lord-image__preview');
    if (state.image) {
      const picture = el('img');
      picture.src = state.image;
      picture.alt = '生成的图片';
      preview.append(picture);
    }
    creation.append(preview);
    controls();
  }
  async function open() {
    if (!mount()) return false;
    if (state.panel.dataset.open === 'true') return true;
    state.focus = doc().activeElement;
    if (state.generating) {
      state.panel.dataset.open = 'true';
      if (!state.body.children.length) state.body.append(button('重新读取', () => { close(); void open(); }));
      controls(); state.panel.focus(); message('正文生成中，生图操作已暂停。', true);
      return false;
    }
    state.body.replaceChildren();
    state.panel.dataset.open = 'true';
    state.panel.style.left = '';
    state.panel.style.top = '';
    state.panel.style.transform = '';
    const token = ++state.token;
    message('正在读取生图套装与设置…');
    try {
      const [saved, settings] = await Promise.all([service.loadPresets(false, () => active(token)), service.readSettings(() => active(token))]);
      if (!active(token)) return false;
      state.presets = saved.presets;
      state.revision = saved.revision;
      state.settings = settings;
      state.selected = settings.selected;
      if (!state.presets.some(item => item.id === state.selected)) state.selected = 'default';
      render();
      state.panel.focus();
      message('');
      return true;
    } catch (error) {
      if (active(token)) {
        state.body.replaceChildren(button('重新读取', () => { close(); void open(); }), button('读取默认套装', () => void task(async token => {
          const [saved, settings] = await Promise.all([service.loadPresets(true, () => active(token)), service.readSettings(() => active(token))]);
          if (!active(token)) return;
          state.presets = saved.presets; state.revision = saved.revision; state.settings = settings;
          state.selected = 'default'; render(); message('默认套装已读取，尚未保存');
        })));
        message(error?.message || String(error), true);
      }
      return false;
    }
  }
  async function generateForFloor(token, messageId) {
    if (!state.revision) throw Error('请先重新读取生图套装');
    const witness = await service.readFloor(messageId, () => active(token));
    if (!active(token)) return;
    const draft = gather();
    validateImage(draft);
    message('正在根据本轮正文生成提示词…');
    draft.prompt = await service.generatePrompt(draft.rule, witness.text, () => active(token),
      { witness, revision: state.revision });
    await service.verifyFloor(witness, () => active(token));
    if (!active(token)) return;
    state.body.querySelector('[data-field="prompt"]').value = draft.prompt;
    draft.witness = witness;
    await createImage(token, draft);
  }
  async function oneClickForFloor(messageId) {
    if (!(await open())) return false;
    return task(token => generateForFloor(token, messageId));
  }
  const api = Object.freeze({
    status: () => Object.freeze({ ready: Boolean(state.panel), open: state.panel?.dataset.open === 'true' }),
    mount, open, oneClickForFloor, close,
    dispose() {
      state.disposed = true;
      close();
      state.subscriptions.forEach(sub => sub.stop());
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
