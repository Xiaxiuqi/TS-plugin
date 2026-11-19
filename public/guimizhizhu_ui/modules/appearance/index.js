(() => {
  'use strict';
  const KEY = 'cryptLord.appearanceUi', root = (window.cryptLord = window.cryptLord || {});
  const modules = root.__stage1Modules, contract = root.contract;
  const service = modules?.['cryptLord.appearance'], host = modules?.['cryptLord.afterNativeHost'];
  if (!service || !host) throw Error('外观模块依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const state = { settings: service.defaults(), saved: service.defaults(), revision: null,
    catalog: { fonts: service.fallbackFonts(), backgrounds: [], warnings: [] }, section: null, fields: {},
    disposed: false, editing: false, dirty: false, busy: false, epoch: 0, imageToken: 0, fontToken: 0,
    currentBackground: null, image: null, timer: null, observer: null, scanTimer: null,
    scanning: false, rescan: false, subscriptions: [], touched: new Map(), fontAbort: null, faces: [],
    fontAliases: new Map(), fontSignature: '', fontWait: null, reader: null };
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
    const variables = ['--cl-appearance-font', '--cl-appearance-display-font', '--cl-appearance-size', '--cl-appearance-image',
      '--cl-appearance-opacity', '--cl-appearance-blur', '--cl-appearance-width', '--cl-appearance-height', '--cl-appearance-scale'];
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
      image: state.currentBackground ? `url(${JSON.stringify(state.currentBackground.data)})` : 'none',
      opacity: String(settings.opacity), blur: `${settings.blur}px`,
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
  function stopImage() {
    state.imageToken++;
    state.reader?.abort(); state.reader = null;
    if (state.image) { state.image.cancel(); state.image = null; }
  }
  function loadImage(url, token) {
    return new Promise((resolve, reject) => {
      const image = new (win().Image)(), timer = win().setTimeout(() => finish(Error('图片加载超时')), 10000);
      const finish = error => {
        win().clearTimeout(timer); image.onload = null; image.onerror = null;
        if (state.image?.image === image) state.image = null;
        if (error) reject(error); else resolve(image);
      };
      state.image = { image, cancel: () => { finish(new DOMException('图片加载已取消', 'AbortError')); image.src = ''; } };
      image.onload = () => finish(token === state.imageToken ? null : new DOMException('图片加载已取消', 'AbortError'));
      image.onerror = () => finish(Error('图片无法加载，保留当前背景')); image.src = url;
    });
  }
  async function setBackground(id, random = false) {
    const pool = service.backgroundPool(state.settings, state.catalog);
    const target = random || id === 'default' ? service.randomBackground(pool, state.currentBackground?.id) : pool.find(bg => bg.id === id);
    stopImage(); const token = state.imageToken;
    if (!target) {
      if (id !== 'default' && pool.length) return setBackground('default', true);
      state.currentBackground = null; repaint(); return null;
    }
    if (target.data === state.currentBackground?.data) { state.currentBackground = target; repaint(); return target; }
    await loadImage(target.data, token);
    if (!valid(state.epoch) || token !== state.imageToken) throw new DOMException('图片操作已取消', 'AbortError');
    state.currentBackground = target; repaint(); return target;
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
  function timer() {
    if (state.timer) win().clearInterval(state.timer);
    state.timer = null;
    if (!state.saved.autoRandom || !state.revision || state.disposed || state.editing) return;
    state.timer = win().setInterval(async () => {
      if (doc().hidden || state.busy || state.editing) return;
      const token = state.epoch; state.busy = true; controls();
      try {
        const selected = await setBackground('default', true);
        if (!selected || !valid(token)) return;
        const saved = await service.saveSettings({ ...state.saved, background: selected.id }, state.revision, () => valid(token) && !state.editing);
        if (!valid(token)) return;
        state.revision = saved.revision;
        if (!saved.settings) { timer(); message(saved.warning); return; }
        state.saved = clone(saved.settings); state.settings = clone(saved.settings);
      } catch (error) {
        if (valid(token)) { state.saved.autoRandom = false; timer(); message(`自动换图已暂停：${error.message}`); }
      } finally { if (valid(token)) { state.busy = false; controls(); } }
    }, state.saved.interval * 60000);
  }
  function fillSelection() {
    if (!state.section) return;
    state.section.querySelectorAll('[data-background]').forEach(button =>
      button.setAttribute('aria-pressed', String(button.dataset.background === state.currentBackground?.id)));
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
    const gallery = state.section.querySelector('[data-appearance-gallery]'); gallery.replaceChildren();
    for (const background of service.backgroundPool(state.settings, state.catalog)) {
      const button = tool(background.name, 'image', () => void choose(background.id));
      button.replaceChildren(); button.dataset.background = background.id;
      const image = node('img'); image.src = background.data; image.alt = background.name; image.loading = 'lazy';
      image.addEventListener('error', () => {
        button.dataset.failed = 'true'; button.title = `${background.name}：无法加载`; image.hidden = true;
        const icon = node('i', 'fa-solid fa-triangle-exclamation'); icon.setAttribute('aria-hidden', 'true'); button.append(icon);
      });
      button.append(image, node('span', '', background.source === 'custom' ? background.name : '系统背景'));
      gallery.append(button);
    }
    if (!gallery.children.length) gallery.append(node('span', '', '图库为空'));
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
  async function choose(id, random = false) {
    if (state.busy || !state.revision) return;
    const token = state.epoch; state.busy = true; controls();
    try {
      const selected = await setBackground(id, random);
      if (!valid(token)) return;
      state.settings.background = selected?.id || 'default'; state.dirty = true;
      message('背景已预览，尚未保存。');
    } catch (error) { if (valid(token) && error.name !== 'AbortError') message(error.message); }
    finally { if (valid(token)) { state.busy = false; controls(); } }
  }
  async function reload(repair = false) {
    if (state.busy || !valid(state.epoch)) return false;
    if (state.editing && state.dirty && !repair && !win().confirm('放弃未保存的外观修改，重新读取？')) return false;
    const token = ++state.epoch; stopImage(); state.busy = true; controls();
    try {
      const [snapshot, catalog] = await Promise.all([service.readSnapshot(() => valid(token), repair), service.loadCatalog(() => valid(token))]);
      if (!valid(token)) return false;
      state.catalog = catalog; state.revision = snapshot.revision;
      state.saved = clone(snapshot.settings); state.settings = clone(snapshot.settings); state.dirty = false;
      if (repair) { state.settings = service.defaults(); state.dirty = true; }
      fill(); repaint(); void scan();
      let imageWarning = '';
      try { await setBackground(state.settings.background); }
      catch (error) { imageWarning = error.message; }
      if (!valid(token)) return false;
      message(imageWarning || snapshot.warning || catalog.warnings.join('；') || (repair ? '默认外观已预览，尚未保存。' : '外观设置已读取。'));
      void loadFont();
      timer(); return true;
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
      if (!saved.settings) { message(saved.warning); timer(); return false; }
      state.settings = clone(saved.settings); state.saved = clone(saved.settings);
      state.revision = saved.revision; state.dirty = false; repaint(); message(saved.warning || '外观设置已保存。'); return true;
    } catch (error) { if (valid(token)) message(error.message); return false; }
    finally { if (valid(token)) { state.busy = false; controls(); timer(); } }
  }
  async function importImage(file) {
    if (!file || state.busy || !state.revision) return;
    if (file.size > 5 * 1024 * 1024) { message('单张背景图片不能超过 5 MB'); return; }
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'].includes(file.type)) { message('背景必须是 PNG、JPEG、WebP、GIF 或 AVIF 位图'); return; }
    const token = state.epoch; state.busy = true; controls();
    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new (win().FileReader)(); state.reader = reader;
        const finish = error => {
          if (state.reader === reader) state.reader = null;
          reader.onload = null; reader.onerror = null; reader.onabort = null;
          if (error) reject(error); else resolve(reader.result);
        };
        reader.onload = () => finish(); reader.onerror = () => finish(Error('图片读取失败'));
        reader.onabort = () => finish(new DOMException('图片读取已取消', 'AbortError')); reader.readAsDataURL(file);
      });
      if (!valid(token)) return;
      const background = { id: `bg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, name: file.name, data: service.imageUrl(data, true) };
      stopImage(); await loadImage(data, state.imageToken);
      if (!valid(token)) return;
      state.settings = service.normalizeSettings({ ...state.settings, background: background.id,
        customBackgrounds: [...state.settings.customBackgrounds, background] });
      state.currentBackground = { ...background, source: 'custom' }; state.dirty = true;
      fill(); repaint(); message('图片已导入预览，尚未保存。');
    } catch (error) { if (valid(token) && error.name !== 'AbortError') message(error.message); }
    finally { if (valid(token)) { state.busy = false; controls(); } }
  }
  async function removeImage() {
    const id = state.currentBackground?.id;
    if (state.busy || !state.revision) return;
    if (!state.settings.customBackgrounds.some(bg => bg.id === id)) { message('只能删除自行导入的背景'); return; }
    if (!win().confirm('删除当前自定义背景？')) return;
    state.settings = service.deleteBackground(state.settings, id); state.dirty = true;
    state.currentBackground = null; fill(); repaint();
    await choose('default', true);
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
    const gallery = node('div', 'crypt-lord-appearance-gallery'); gallery.dataset.appearanceGallery = ''; fieldset.append(gallery);
    const imageTools = node('div', 'crypt-lord-appearance-actions'), file = node('input');
    file.type = 'file'; file.accept = 'image/png,image/jpeg,image/webp,image/gif,image/avif'; file.hidden = true;
    file.addEventListener('change', () => { const selected = file.files[0]; file.value = ''; void importImage(selected); });
    imageTools.append(tool('随机背景', 'shuffle', () => void choose('default', true)),
      tool('导入背景', 'image', () => file.click()), tool('删除当前自定义背景', 'trash-can', () => void removeImage()), file);
    fieldset.append(imageTools);
    input('opacity', '阅读区不透明度', 'number', 0, 1, 0.05); input('blur', '背景模糊', 'number', 0, 20, 1);
    input('autoRandom', '自动随机背景', 'checkbox'); input('interval', '换图间隔（分钟）', 'number', 1, 1440, 1);
    const layout = node('details', 'crypt-lord-appearance-layout');
    layout.append(node('summary', '', '布局与尺寸'),
      input('fullWidth', '工具窗口铺满', 'checkbox'),
      input('width', '阅读与窗口宽度', 'number', 800, 2500, 10),
      input('height', '工具窗口高度', 'number', 600, 1200, 10),
      input('mobileScale', '移动端工具缩放', 'number', 60, 100, 5));
    fieldset.append(layout);
    const actions = node('div', 'crypt-lord-appearance-actions'), status = node('span');
    status.dataset.appearanceStatus = ''; status.setAttribute('role', 'status');
    const reset = tool('恢复默认外观', 'rotate-left', () => { if (win().confirm('恢复默认外观并清空自定义图库？保存后生效。')) void reload(true); });
    reset.dataset.appearanceReset = '';
    const reread = tool('重新读取外观', 'rotate-right', () => void reload()); reread.dataset.appearanceReload = '';
    const commit = tool('保存外观', 'floppy-disk', () => void save(), '保存外观');
    commit.dataset.appearanceSave = ''; commit.className = 'is-primary';
    actions.append(status, reset, reread, commit); section.append(fieldset, actions); parent.append(section); fill(); return section;
  }
  async function open() { state.editing = true; timer(); return reload(); }
  function close() {
    const reread = !state.revision;
    state.editing = false; state.epoch++; stopImage(); state.busy = false; state.dirty = false;
    state.settings = clone(state.saved); fill(); repaint(); void loadFont();
    if (!valid(state.epoch)) return;
    void setBackground(state.saved.background).catch(error => { if (!state.disposed && error.name !== 'AbortError') message(error.message); });
    timer();
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
      close(); state.epoch++; stopImage(); clearFonts(); state.fontSignature = '';
      state.currentBackground = null;
      for (const [element, original] of state.touched) if (original.reading) { restore(element, original); state.touched.delete(element); }
      void reload();
    }));
    for (const event of [events?.CHARACTER_MESSAGE_RENDERED, events?.MESSAGE_UPDATED, events?.MESSAGE_SWIPED,
      events?.MESSAGE_DELETED, events?.MESSAGE_SWIPE_DELETED, events?.MESSAGE_EDITED].filter(Boolean))
      state.subscriptions.push(host.bindEvent(event, scheduleScan));
    void reload(); scheduleScan();
  }
  const api = Object.freeze({
    status: () => ({ key: KEY, ready: !state.disposed, dirty: state.dirty, busy: state.busy, background: state.currentBackground?.id }),
    current: () => clone(state.settings), mount, open, close, reload, save, start,
    dispose() {
      state.disposed = true; state.epoch++; stopImage(); clearFonts();
      win().clearInterval(state.timer); win().clearTimeout(state.scanTimer); state.observer?.disconnect();
      win().removeEventListener('resize', repaint); state.subscriptions.splice(0).forEach(subscription => subscription?.stop?.());
      for (const [element, original] of state.touched) restore(element, original);
      state.touched.clear(); state.section?.remove(); state.section = null;
      contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY]; return true;
    },
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api); start();
})();
