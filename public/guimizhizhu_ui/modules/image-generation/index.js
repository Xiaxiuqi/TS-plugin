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
    settings: null, image: '', controller: null, busy: false, token: 0, disposed: false, subscription: null,
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
  function active(token) { return !state.disposed && state.panel?.dataset.open === 'true' && token === state.token; }
  function close() {
    ++state.token;
    state.controller?.abort();
    state.controller = null;
    state.image = '';
    if (state.panel) state.panel.dataset.open = 'false';
  }
  function mount() {
    if (state.disposed || state.panel || !doc().body) return Boolean(state.panel);
    const panel = el('section', 'crypt-lord-image');
    panel.dataset.open = 'false';
    const header = el('header');
    header.append(el('strong', '', '图像生成'), button('×', close, '关闭'));
    const body = el('div', 'crypt-lord-image__body');
    const status = el('div', 'crypt-lord-image__status');
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
    if (events?.CHAT_CHANGED) state.subscription = host.bindEvent(events.CHAT_CHANGED, close);
    return true;
  }
  function gather() {
    const get = key => state.body.querySelector(`[data-field="${key}"]`);
    return {
      name: get('name')?.value.trim() || '', rule: get('rule')?.value || '',
      prompt: get('prompt')?.value || '', change: get('change')?.value || '',
      width: get('width')?.value === '' ? null : Number(get('width')?.value),
      height: get('height')?.value === '' ? null : Number(get('height')?.value),
      settings: {
        custom: get('custom')?.checked || false, url: get('url')?.value.trim() || '',
        key: get('key')?.value.trim() || '', model: get('model')?.value.trim() || '',
        timeout: Number(get('timeout')?.value),
      },
    };
  }
  async function task(work) {
    if (state.busy) return;
    const token = state.token;
    state.busy = true;
    state.panel.setAttribute('aria-busy', 'true');
    try { await work(token); }
    catch (error) { if (active(token)) message(error?.message || String(error), true); }
    finally { state.busy = false; state.panel?.removeAttribute('aria-busy'); }
  }
  async function createImage(token, draft) {
    if ([draft.width, draft.height].some(value => value !== null && (!Number.isSafeInteger(value) || value <= 0))) {
      throw new Error('宽高必须是正整数或留空');
    }
    message('正在等待生图插件响应…');
    const controller = new AbortController();
    state.controller = controller;
    try {
      const image = await service.requestImage({ ...draft, timeout: draft.settings.timeout }, controller.signal);
      if (!active(token)) return;
      if (typeof image !== 'string' || !/^(data:image\/|https?:\/\/|blob:)/i.test(image)) throw new Error('生图插件未返回可显示的图片地址');
      state.image = image;
      if (draft.messageId != null) modules['cryptLord.nativeFloorStatusBar']?.setImage?.(draft.messageId, image);
      const preview = state.body.querySelector('.crypt-lord-image__preview');
      const picture = el('img');
      picture.src = image;
      picture.alt = '生成的图片';
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
    const previous = state.body.querySelector('[data-field="prompt"]')?.value || '';
    state.body.replaceChildren();
    const preset = current();
    const library = section('生图提示词套装');
    const select = el('select');
    state.presets.forEach(item => option(select, item.id, `${item.name}${item.locked ? ' · 锁定' : ''}`));
    select.value = preset?.id || 'default';
    select.addEventListener('change', () => { state.selected = select.value; render(); });
    library.append(field('当前套装', select), field('套装名称', input('text', preset?.name || '', 'name')));
    library.append(field('系统规则', textarea(preset?.prompt || '', 'rule', 7)));
    const row = el('div', 'crypt-lord-image__row');
    row.append(
      button('保存当前套', () => void task(async token => {
        const draft = gather();
        if (!draft.rule.trim()) throw new Error('套装内容不能为空');
        const list = state.presets.map(item => item.id === preset.id ?
          { ...item, name: item.locked ? item.name : draft.name || item.name, prompt: draft.rule } : item);
        const saved = await service.savePresets(list, state.revision);
        if (!active(token)) return;
        state.presets = saved.presets; state.revision = saved.revision;
        render(); message('套装已保存到世界书');
      })),
      button('另存为新套', () => void task(async token => {
        const draft = gather();
        if (!draft.rule.trim()) throw new Error('套装内容不能为空');
        const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const saved = await service.savePresets([...state.presets, {
          id, name: draft.name || '我的套装', prompt: draft.rule, locked: false,
        }], state.revision);
        if (!active(token)) return;
        state.presets = saved.presets; state.revision = saved.revision; state.selected = id;
        render(); message('新套装已保存');
      })),
      button('删除', () => void task(async token => {
        if (preset.locked) throw new Error('默认套装不可删除');
        if (!win().confirm(`删除套装「${preset.name}」？`)) return;
        const saved = await service.savePresets(state.presets.filter(item => item.id !== preset.id), state.revision);
        if (!active(token)) return;
        state.presets = saved.presets; state.revision = saved.revision; state.selected = 'default';
        render(); message('套装已删除');
      })),
      button('恢复默认', () => void task(async token => {
        const seed = service.defaultPreset();
        const saved = await service.savePresets(state.presets.map(item => item.id === 'default' ? seed : item), state.revision);
        if (!active(token)) return;
        state.presets = saved.presets; state.revision = saved.revision; state.selected = 'default';
        render(); message('已恢复默认套装');
      })),
    );
    library.append(row);
    const apiSection = section('提示词生成 API');
    const toggle = input('checkbox', '', 'custom');
    toggle.checked = state.settings.custom;
    const custom = el('div', 'crypt-lord-image__api');
    custom.hidden = !toggle.checked;
    toggle.addEventListener('change', () => { custom.hidden = !toggle.checked; });
    apiSection.append(field('使用独立 API', toggle));
    custom.append(
      field('URL', input('url', state.settings.url, 'url')),
      field('API Key', input('password', state.settings.key, 'key')),
      field('模型', input('text', state.settings.model, 'model')),
    );
    const models = el('select');
    option(models, '', '选择模型');
    models.addEventListener('change', () => {
      if (models.value) state.body.querySelector('[data-field="model"]').value = models.value;
    });
    const modelRow = el('div', 'crypt-lord-image__row');
    modelRow.append(models, button('拉取模型', () => void task(async token => {
      const draft = gather().settings;
      if (!draft.url || !draft.key) throw new Error('请填写 URL 和 Key');
      const names = await modules['cryptLord.hostApi'].getModelList({ apiurl: draft.url, key: draft.key });
      if (!active(token)) return;
      models.replaceChildren();
      option(models, '', '选择模型');
      (Array.isArray(names) ? names : []).forEach(item => option(models, String(item.id || item), String(item.id || item)));
      message(`已读取 ${models.options.length - 1} 个模型`);
    })));
    custom.append(modelRow);
    apiSection.append(custom, field('超时（秒）', input('number', String(state.settings.timeout), 'timeout')));
    apiSection.append(button('保存 API 设置', () => void task(async token => {
      state.settings = await service.saveSettings(gather().settings);
      if (active(token)) message('设置已保存');
    })));
    const creation = section('图像生成');
    creation.append(button('根据最新正文生成提示词', () => void task(async token => {
      message('正在读取正文并生成提示词…');
      const text = await service.story();
      if (!text) throw new Error('当前聊天没有可用的 assistant 正文');
      const draft = gather();
      const prompt = await service.generatePrompt(draft.rule, text, draft.settings);
      if (!active(token)) return;
      state.body.querySelector('[data-field="prompt"]').value = prompt;
      message('提示词已填入');
    })));
    creation.append(button('根据最新正文一键生图', () => void task(async token => {
      const text = await service.story();
      if (!text) throw new Error('当前聊天没有可用的 assistant 正文');
      const draft = gather();
      message('正在根据正文生成提示词…');
      draft.prompt = await service.generatePrompt(draft.rule, text, draft.settings);
      if (!active(token)) return;
      state.body.querySelector('[data-field="prompt"]').value = draft.prompt;
      await createImage(token, draft);
    })));
    creation.append(field('提示词', textarea(previous, 'prompt', 4)));
    creation.append(field('修改 / 添加', textarea('', 'change', 2)));
    const size = el('div', 'crypt-lord-image__row');
    size.append(field('宽度', input('number', '1024', 'width')), field('高度', input('number', '1024', 'height')));
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
  }
  async function open() {
    if (!mount()) return false;
    state.panel.dataset.open = 'true';
    state.panel.style.left = '';
    state.panel.style.top = '';
    state.panel.style.transform = '';
    const token = ++state.token;
    message('正在读取生图套装与设置…');
    try {
      const [saved, settings] = await Promise.all([service.loadPresets(), service.readSettings()]);
      if (!active(token)) return false;
      state.presets = saved.presets;
      state.revision = saved.revision;
      state.settings = settings;
      if (!state.presets.some(item => item.id === state.selected)) state.selected = 'default';
      render();
      message('');
      return true;
    } catch (error) { if (active(token)) message(error?.message || String(error), true); return false; }
  }
  async function oneClickForFloor(messageId) {
    if (!(await open())) return false;
    const token = state.token;
    return task(async () => {
      const messages = await modules['cryptLord.hostApi'].getChatMessages('0-{{lastMessageId}}');
      const latest = [...(Array.isArray(messages) ? messages : [])].reverse().find(item => item?.role === 'assistant');
      if (Number(latest?.message_id) !== Number(messageId)) throw new Error('当前楼层已不是最新回合，请重新选择');
      const text = service.latestStory([latest]);
      if (!text) throw new Error('本轮正文为空');
      const draft = gather();
      message('正在根据本轮正文生成提示词…');
      draft.prompt = await service.generatePrompt(draft.rule, text, draft.settings);
      if (!active(token)) return;
      const currentMessages = await modules['cryptLord.hostApi'].getChatMessages('0-{{lastMessageId}}');
      const currentLatest = [...(Array.isArray(currentMessages) ? currentMessages : [])].reverse().find(item => item?.role === 'assistant');
      if (Number(currentLatest?.message_id) !== Number(messageId)) throw new Error('楼层已变化，生图请求未发送');
      state.body.querySelector('[data-field="prompt"]').value = draft.prompt;
      draft.messageId = Number(messageId);
      await createImage(token, draft);
    });
  }
  const api = Object.freeze({
    status: () => Object.freeze({ ready: Boolean(state.panel), open: state.panel?.dataset.open === 'true' }),
    mount, open, oneClickForFloor, close,
    dispose() {
      state.disposed = true;
      close();
      state.subscription?.stop();
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
