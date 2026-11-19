(() => {
  'use strict';
  const KEY = 'cryptLord.appearanceUi', root = (window.cryptLord = window.cryptLord || {});
  const modules = root.__stage1Modules, contract = root.contract;
  const service = modules?.['cryptLord.appearance'], host = modules?.['cryptLord.afterNativeHost'];
  if (!service || !host) throw Error('外观模块依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const state = { settings: service.defaults(), saved: service.defaults(), revision: null,
    catalog: { fonts: service.fallbackFonts(), warnings: [] }, section: null, fields: {},
    disposed: false, editing: false, dirty: false, busy: false, epoch: 0, fontToken: 0,
    observer: null, scanTimer: null,
    scanning: false, rescan: false, subscriptions: [], touched: new Map(), fontAbort: null, faces: [],
    fontAliases: new Map(), fontSignature: '', fontWait: null };
  const ownedDocument = host.getHost()?.document || document;
  const doc = () => ownedDocument;
  const win = () => doc().defaultView || window;
  const valid = token => !state.disposed && state.epoch === token &&
    modules['cryptLord.afterNativeHost'] === host && modules['cryptLord.appearance'] === service &&
    (host.getHost()?.document || document) === ownedDocument;
  const clone = value => structuredClone(value);
  function node(tag, className, text) {
    const value = doc().createElement(tag); if (className) value.className = className;
    if (text !== undefined) value.textContent = text; return value;
  }
  function tool(name, icon, callback, label) {
    const button = node('button'); button.type = 'button'; button.title = name; button.setAttribute('aria-label', name);
    button.innerHTML = `<i class="fa-solid fa-${icon}" aria-hidden="true"></i>`;
    if (label) button.append(node('span', '', label));
    button.addEventListener('click', callback); return button;
  }
  function message(text) { const target = state.section?.querySelector('[data-appearance-status]'); if (target) target.textContent = text; }
  function remember(element, reading = false) {
    if (state.touched.has(element)) return;
    const variables = ['--cl-appearance-font', '--cl-appearance-display-font', '--cl-appearance-size',
      '--cl-appearance-width', '--cl-appearance-height', '--cl-appearance-scale'];
    state.touched.set(element, { reading, variables: variables.map(key => [key, element.style.getPropertyValue(key),
      element.style.getPropertyPriority(key)]), theme: element.getAttribute('data-theme'),
    full: element.getAttribute('data-cl-appearance-full'), motion: element.getAttribute('data-cl-appearance-motion'),
    className: reading ? 'crypt-lord-reading-appearance' : 'crypt-lord-appearance-surface',
    hadClass: element.classList.contains(reading ? 'crypt-lord-reading-appearance' : 'crypt-lord-appearance-surface') });
    element.classList.add(reading ? 'crypt-lord-reading-appearance' : 'crypt-lord-appearance-surface');
  }
  function restore(element, original) {
    for (const [key, value, priority] of original.variables) {
      if (value) element.style.setProperty(key, value, priority); else element.style.removeProperty(key);
    }
    for (const [attr, value] of [['data-theme', original.theme], ['data-cl-appearance-full', original.full],
      ['data-cl-appearance-motion', original.motion]]) {
      if (value === null) element.removeAttribute(attr); else element.setAttribute(attr, value);
    }
    if (!original.hadClass) element.classList.remove(original.className);
  }
  function paint(element) {
    const settings = state.settings, font = state.catalog.fonts[settings.font] || state.catalog.fonts['font-serif'];
    const display = font.isArt ? font : Object.values(state.catalog.fonts).find(value => value.isArt) || font;
    const scopedFont = css => css.replace(/"[^"]*"|'[^']*'|[^,]+/g, part => {
      const family = part.trim().replace(/^["']|["']$/g, '');
      return state.fontAliases.has(family) ? JSON.stringify(state.fontAliases.get(family)) : part;
    });
    const values = { font: scopedFont(font.css), 'display-font': scopedFont(display.css), size: `${settings.fontSize}px`,
      width: `${settings.width}px`, height: `${settings.height}px`,
      scale: String(win().innerWidth <= 768 ? settings.mobileScale / 100 : 1) };
    for (const [key, value] of Object.entries(values)) element.style.setProperty(`--cl-appearance-${key}`, value);
    element.dataset.theme = settings.theme;
    element.dataset.clAppearanceFull = String(settings.fullWidth);
    element.dataset.clAppearanceMotion = settings.disableAnimations ? 'off' : 'on';
  }
  function repaint() {
    if (!valid(state.epoch)) return;
    for (const [element, original] of state.touched) {
      if (!element.isConnected) { restore(element, original); state.touched.delete(element); }
      else paint(element);
    }
    fillSelection();
  }
  async function scan() {
    if (!valid(state.epoch)) return;
    if (state.scanning) { state.rescan = true; return; }
    const token = state.epoch; state.scanning = true;
    try {
      // Only namespace-owned surfaces and publicly verified assistant text are eligible.
      for (const element of doc().body.querySelectorAll('[class^="crypt-lord-"]')) {
        if (element.matches('.crypt-lord-reading-appearance') || element.closest('.mes_text,.custom-mes_text')) continue;
        if (element.parentElement?.closest('[class^="crypt-lord-"]')) continue;
        remember(element); paint(element);
      }
      const rows = await service.readFloors(() => valid(token));
      if (!valid(token)) return;
      const current = new Set();
      for (const row of rows) {
        if (row.role !== 'assistant' || row.is_hidden) continue;
        const message = host.getDisplayedMessageElement(row.message_id);
        if (!message || message.getAttribute('is_user') === 'true') continue;
        const text = message?.querySelector('.mes_text,.custom-mes_text');
        if (text && !text.closest('[class^="crypt-lord-original-ui"]')) { remember(text, true); current.add(text); paint(text); }
      }
      for (const [element, original] of state.touched) if (original.reading && !current.has(element)) {
        restore(element, original); state.touched.delete(element);
      }
    } catch (error) {
      if (valid(token)) {
        for (const [element, original] of state.touched) if (original.reading) { restore(element, original); state.touched.delete(element); }
        message(`阅读样式同步失败：${error.message}`);
      }
    }
    finally { state.scanning = false; if (state.rescan) { state.rescan = false; scheduleScan(); } }
  }
  function scheduleScan() {
    if (state.disposed || state.scanTimer) return;
    state.scanTimer = win().setTimeout(() => { state.scanTimer = null; void scan(); }, 80);
  }
  function clearFonts() {
    state.fontToken++; state.fontAbort?.abort(); state.fontAbort = null;
    state.fontWait?.cancel(); state.fontWait = null;
    state.faces.splice(0).forEach(face => doc().fonts.delete(face));
    state.fontAliases.clear();
  }
  async function loadFont() {
    const font = state.catalog.fonts[state.settings.font] || state.catalog.fonts['font-serif'];
    const signature = JSON.stringify(font);
    if (signature === state.fontSignature) return;
    state.fontSignature = signature; clearFonts(); const token = state.fontToken;
    try {
      let css = font.customCSS || '';
      if (font.url) {
        const controller = new AbortController(); state.fontAbort = controller;
        const timeout = win().setTimeout(() => controller.abort(), 10000);
        try {
          const response = await win().fetch(font.url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
          if (!response.ok) throw Error('字体资源无法读取');
          css += `\n${await response.text()}`;
        } finally { win().clearTimeout(timeout); }
      }
      if (!valid(state.epoch) || token !== state.fontToken || !css) return;
      if (css.length > 2 * 1024 * 1024) throw Error('字体配置过大');
      const sheet = new (win().CSSStyleSheet)(); sheet.replaceSync(css);
      const aliases = new Map(), faces = [];
      for (const rule of sheet.cssRules) {
        if (rule.type !== win().CSSRule.FONT_FACE_RULE) continue;
        const family = rule.style.getPropertyValue('font-family').trim().replace(/^["']|["']$/g, '');
        const descriptors = {};
        for (const [property, key] of [['font-weight', 'weight'], ['font-style', 'style'], ['font-stretch', 'stretch'],
          ['unicode-range', 'unicodeRange'], ['font-display', 'display']]) {
          const value = rule.style.getPropertyValue(property); if (value) descriptors[key] = value;
        }
        if (!aliases.has(family)) aliases.set(family, `CryptLordFont_${Date.now()}_${token}_${aliases.size}`);
        const source = rule.style.getPropertyValue('src').replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/gi,
          (_match, double, single, bare) => {
            const url = new URL(double ?? single ?? bare, font.url || doc().baseURI);
            if (!['https:', 'http:', 'data:'].includes(url.protocol) || url.username || url.password) throw Error('字体文件地址无效');
            return `url(${JSON.stringify(url.href)})`;
          });
        faces.push(new (win().FontFace)(aliases.get(family), source, descriptors));
      }
      if (!faces.length) throw Error('未找到可用的字体定义，仅使用本机字体');
      faces.forEach(face => { doc().fonts.add(face); state.faces.push(face); });
      state.fontAliases = aliases; repaint();
      const sample = [...state.touched].find(([, original]) => original.reading)?.[0].textContent.slice(0, 120) || '调查：廷根的街道';
      let timeout;
      try {
        // Let the browser request only the unicode subsets needed by visible reading text.
        await Promise.race([doc().fonts.load(`${state.settings.fontSize}px ${[...aliases.values()].map(name => JSON.stringify(name)).join(',')}`, sample),
          new Promise((_resolve, reject) => {
            timeout = win().setTimeout(() => reject(Error('字体加载超时')), 10000);
            state.fontWait = { token, cancel: () => reject(new DOMException('字体加载已取消', 'AbortError')) };
          })]);
      } finally {
        win().clearTimeout(timeout);
        if (state.fontWait?.token === token) state.fontWait = null;
      }
    } catch (error) {
      if (!state.disposed && token === state.fontToken) {
        state.faces.splice(0).forEach(face => doc().fonts.delete(face)); state.fontAliases.clear(); repaint();
        state.fontSignature = ''; message(`字体未载入，使用本机备用字体：${error.message}`);
      }
    }
  }
  function fillSelection() {
    if (!state.section) return;
    state.section.querySelectorAll('[data-theme-choice]').forEach(button =>
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === state.settings.theme)));
    for (const key of ['width', 'height']) {
      state.fields[key].disabled = state.busy || state.settings.fullWidth;
      state.section.querySelector(`[data-range="${key}"]`).disabled = state.busy || state.settings.fullWidth;
    }
  }
  function controls() {
    if (!state.section) return;
    state.section.querySelector('fieldset').disabled = state.busy || !state.revision;
    state.section.querySelector('[data-appearance-save]').disabled = state.busy || !state.revision || !state.dirty;
    state.section.querySelector('[data-appearance-reload]').disabled = state.busy;
    state.section.querySelector('[data-appearance-reset]').disabled = state.busy;
    fillSelection();
  }
  function fill() {
    if (!state.section) return;
    const fonts = state.fields.font; fonts.replaceChildren();
    for (const [id, font] of Object.entries(state.catalog.fonts)) {
      const option = node('option', '', font.name); option.value = id; fonts.append(option);
    }
    if (!state.catalog.fonts[state.settings.font]) {
      const option = node('option', '', '系统衬线体（备用）'); option.value = state.settings.font; fonts.append(option);
    }
    for (const [key, input] of Object.entries(state.fields)) {
      if (input.type === 'checkbox') input.checked = state.settings[key]; else input.value = state.settings[key];
      const range = state.section.querySelector(`[data-range="${key}"]`); if (range) range.value = input.value;
    }
    controls();
  }
  function values() {
    return service.normalizeSettings({ ...state.settings, ...Object.fromEntries(Object.entries(state.fields).map(([key, input]) =>
      [key, input.type === 'checkbox' ? input.checked : key === 'font' ? input.value : input.value.trim() === '' ? '' : Number(input.value)])) });
  }
  function change() {
    try { state.settings = values(); state.dirty = true; repaint(); controls(); message('外观有未保存的修改。'); void loadFont(); }
    catch (error) { state.dirty = true; controls(); message(error.message); }
  }
  async function reload(repair = false) {
    if (state.busy || !valid(state.epoch)) return false;
    if (state.editing && state.dirty && !repair && !win().confirm('放弃未保存的外观修改，重新读取？')) return false;
    const token = ++state.epoch; state.busy = true; controls();
    try {
      const [snapshot, catalog] = await Promise.all([service.readSnapshot(() => valid(token), repair), service.loadCatalog(() => valid(token))]);
      if (!valid(token)) return false;
      state.catalog = catalog; state.revision = snapshot.revision;
      state.saved = clone(snapshot.settings); state.settings = clone(snapshot.settings); state.dirty = false;
      if (repair) { state.settings = service.defaults(); state.dirty = true; }
      fill(); repaint(); void scan();
      message(snapshot.warning || catalog.warnings.join('；') || (repair ? '默认外观已预览，尚未保存。' : '外观设置已读取。'));
      void loadFont();
      return true;
    } catch (error) { if (valid(token)) { state.revision = null; message(error.message); } return false; }
    finally { if (valid(token)) { state.busy = false; controls(); } }
  }
  async function save() {
    if (state.busy || !state.revision || !state.dirty) return false;
    let next; try { next = values(); } catch (error) { message(error.message); return false; }
    const token = state.epoch; state.busy = true; controls();
    try {
      const saved = await service.saveSettings(next, state.revision, () => valid(token) && state.editing);
      if (!valid(token)) return false;
      state.revision = saved.revision;
      if (!saved.settings) { message(saved.warning); return false; }
      state.settings = clone(saved.settings); state.saved = clone(saved.settings);
      state.revision = saved.revision; state.dirty = false; repaint(); message(saved.warning || '外观设置已保存。'); return true;
    } catch (error) { if (valid(token)) message(error.message); return false; }
    finally { if (valid(token)) { state.busy = false; controls(); } }
  }
  function mount(parent) {
    if (state.disposed || state.section) return state.section;
    const section = node('section', 'crypt-lord-system-settings__section crypt-lord-appearance-controls');
    section.append(node('h3', '', '外观与阅读')); state.section = section;
    const fieldset = node('fieldset'), themes = node('div', 'crypt-lord-system-settings__themes');
    for (const [theme, name, icon] of [['dark', '深色', 'moon'], ['light', '浅色', 'sun']]) {
      const button = tool(name, icon, () => { state.settings.theme = theme; state.dirty = true; repaint(); controls(); message('主题有未保存的修改。'); }, name);
      button.dataset.themeChoice = theme; themes.append(button);
    }
    fieldset.append(themes);
    function input(key, title, type, min, max, step) {
      const row = node('label', `crypt-lord-system-settings__row${type === 'checkbox' ? ' is-toggle' : ''}`);
      const control = node(type === 'select' ? 'select' : 'input');
      if (type !== 'select') control.type = type;
      control.setAttribute('aria-label', title); control.dataset.appearance = key; state.fields[key] = control;
      row.append(node('span', '', title));
      if (type === 'number') {
        const group = node('div', 'crypt-lord-appearance-number'), range = node('input');
        range.type = 'range'; range.min = control.min = min; range.max = control.max = max; range.step = control.step = step;
        range.dataset.range = key; range.setAttribute('aria-label', `${title}滑块`);
        range.addEventListener('input', () => { control.value = range.value; change(); });
        control.addEventListener('input', () => { range.value = control.value; change(); });
        group.append(range, control); row.append(group);
      } else { row.append(control); control.addEventListener('change', change); }
      fieldset.append(row);
      return row;
    }
    input('font', '字体', 'select'); input('fontSize', '正文字号', 'number', 12, 40, 1);
    input('disableAnimations', '禁用视觉特效', 'checkbox');
    const layout = node('details', 'crypt-lord-appearance-layout');
    layout.append(node('summary', '', '布局与尺寸'),
      input('fullWidth', '工具窗口铺满', 'checkbox'),
      input('width', '阅读与窗口宽度', 'number', 800, 2500, 10),
      input('height', '工具窗口高度', 'number', 600, 1200, 10),
      input('mobileScale', '移动端工具缩放', 'number', 60, 100, 5));
    fieldset.append(layout);
    const actions = node('div', 'crypt-lord-appearance-actions'), status = node('span');
    status.dataset.appearanceStatus = ''; status.setAttribute('role', 'status');
    const reset = tool('恢复默认外观', 'rotate-left', () => { if (win().confirm('恢复默认外观？保存后生效。')) void reload(true); });
    reset.dataset.appearanceReset = '';
    const reread = tool('重新读取外观', 'rotate-right', () => void reload()); reread.dataset.appearanceReload = '';
    const commit = tool('保存外观', 'floppy-disk', () => void save(), '保存外观');
    commit.dataset.appearanceSave = ''; commit.className = 'is-primary';
    actions.append(status, reset, reread, commit); section.append(fieldset, actions); parent.append(section); fill(); return section;
  }
  async function open() { state.editing = true; return reload(); }
  function close() {
    const reread = !state.revision;
    state.editing = false; state.epoch++; state.busy = false; state.dirty = false;
    state.settings = clone(state.saved); fill(); repaint(); void loadFont();
    if (!valid(state.epoch)) return;
    if (reread && !state.disposed) void reload();
  }
  function start() {
    if (state.disposed || state.observer || !doc().body) return;
    state.observer = new (win().MutationObserver)(mutations => {
      const selector = '.mes[mesid],.mes_text,.custom-mes_text,[class^="crypt-lord-"]';
      if (mutations.some(change => ['mesid', 'is_user'].includes(change.attributeName) ||
        [...change.addedNodes, ...change.removedNodes].some(value => value.nodeType === 1 &&
          (value.matches(selector) || value.querySelector(selector))))) scheduleScan();
    });
    state.observer.observe(doc().body, { childList: true, subtree: true, attributes: true, attributeFilter: ['mesid', 'is_user'] });
    win().addEventListener('resize', repaint);
    const events = host.tavernEvents();
    if (events?.CHAT_CHANGED) state.subscriptions.push(host.bindEvent(events.CHAT_CHANGED, () => {
      close(); state.epoch++; clearFonts(); state.fontSignature = '';
      for (const [element, original] of state.touched) if (original.reading) { restore(element, original); state.touched.delete(element); }
      void reload();
    }));
    for (const event of [events?.CHARACTER_MESSAGE_RENDERED, events?.MESSAGE_UPDATED, events?.MESSAGE_SWIPED,
      events?.MESSAGE_DELETED, events?.MESSAGE_SWIPE_DELETED, events?.MESSAGE_EDITED].filter(Boolean))
      state.subscriptions.push(host.bindEvent(event, scheduleScan));
    void reload(); scheduleScan();
  }
  const api = Object.freeze({
    status: () => ({ key: KEY, ready: !state.disposed, dirty: state.dirty, busy: state.busy }),
    current: () => clone(state.settings), mount, open, close, reload, save, start,
    dispose() {
      state.disposed = true; state.epoch++; clearFonts();
      win().clearTimeout(state.scanTimer); state.observer?.disconnect();
      win().removeEventListener('resize', repaint); state.subscriptions.splice(0).forEach(subscription => subscription?.stop?.());
      for (const [element, original] of state.touched) restore(element, original);
      state.touched.clear(); state.section?.remove(); state.section = null;
      contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY]; return true;
    },
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api); start();
})();
