(() => {
  'use strict';
  const KEY = 'cryptLord.worldMap';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const host = modules['cryptLord.afterNativeHost'];
  const service = modules['cryptLord.worldMapState'];
  if (!contract || !host || !service) throw Error('世界地图依赖尚未加载');
  const freshViews = () => ({ main: { x: 0, y: 0, scale: 1 }, shenqi: { x: 0, y: 0, scale: 1 } });
  const state = { mask: null, dialog: null, viewport: null, stage: null, image: null, overlay: null,
    result: null, map: 'main', views: freshViews(), data: null, stat: null, source: '', sequence: 0,
    disposed: false, cleanup: [], drag: null, focus: null, imageState: {}, secondAspect: .5135, generating: false };
  const doc = () => host.getHost()?.document || window.document;
  const win = () => doc().defaultView || window;
  const opened = () => !state.disposed && state.mask?.dataset.open === 'true';
  const active = ticket => opened() && ticket === state.sequence;
  function node(tag, cls, text) {
    const item = doc().createElement(tag);
    if (cls) item.className = cls;
    if (text !== undefined) item.textContent = text;
    return item;
  }
  function button(symbol, icon, title, callback) {
    const item = node('button', '', symbol);
    item.type = 'button';
    item.title = title;
    item.setAttribute('aria-label', title);
    item.addEventListener('click', callback);
    const fonts = doc().fonts;
    if (fonts?.load) void fonts.load('900 14px "Font Awesome 6 Free"').then(loaded => {
      if (loaded.length && item.isConnected) {
        const glyph = node('i', `fa-solid ${icon}`);
        glyph.setAttribute('aria-hidden', 'true');
        item.replaceChildren(glyph);
      }
    }).catch(() => {});
    return item;
  }
  function message(text, error = false) {
    state.result.textContent = text;
    state.result.dataset.error = String(error);
  }
  function imageMessage() {
    const status = state.imageState[state.map];
    state.mask.querySelector('[data-map-image-status]').textContent =
      status === 'error' ? '地图图片加载失败' : status !== 'loaded' ? '正在加载地图图片...' : '';
    state.mask.querySelector('[data-map-image-retry]').hidden = status !== 'error';
  }
  function loadImage() {
    const map = state.map, image = node('img', 'crypt-lord-world-map__image');
    image.alt = map === 'main' ? '世界地图' : '神弃之地地图';
    image.draggable = false;
    state.imageState[map] = 'loading';
    const finish = success => {
      if (state.disposed || state.image !== image) return;
      state.imageState[map] = success ? 'loaded' : 'error';
      if (success && map === 'shenqi') state.secondAspect = image.naturalHeight / image.naturalWidth;
      imageMessage();
      layout();
    };
    image.addEventListener('load', () => finish(true));
    image.addEventListener('error', () => finish(false));
    state.image?.remove();
    state.image = image;
    state.stage.prepend(image);
    image.src = service.images[map];
    imageMessage();
  }
  function layout() {
    if (!state.viewport || !opened()) return;
    const width = state.viewport.clientWidth, height = state.viewport.clientHeight;
    const aspect = state.map === 'main' ? service.yScale : state.secondAspect;
    const fitted = Math.min(width, height / aspect);
    state.stage.style.width = `${fitted}px`;
    state.stage.style.height = `${fitted * aspect}px`;
    const view = state.views[state.map];
    const maxX = Math.max(0, (fitted * view.scale + width) / 2 - 40);
    const maxY = Math.max(0, (fitted * aspect * view.scale + height) / 2 - 40);
    view.x = Math.max(-maxX, Math.min(maxX, view.x));
    view.y = Math.max(-maxY, Math.min(maxY, view.y));
    state.stage.style.transform = `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
    const lod = service.lod(view.scale);
    state.stage.style.setProperty('--map-inverse-scale', String(lod.inverseScale));
    state.stage.dataset.regions = String(lod.regions);
    state.stage.dataset.landmarks = String(lod.landmarks);
    state.stage.dataset.playerLabel = String(lod.playerLabel);
    state.mask.querySelector('[data-map-scale]').textContent = `${Math.round(view.scale * 100)}%`;
    state.mask.querySelector('[aria-label="缩小地图"]').disabled = service.zoom(view.scale, -.2) === view.scale;
    state.mask.querySelector('[aria-label="放大地图"]').disabled = service.zoom(view.scale, .2) === view.scale;
    // Keep the player's label first; omit lower-priority labels only where they collide.
    const occupied = [];
    for (const selector of ['.crypt-lord-world-map__player-label', '.crypt-lord-world-map__landmark-label', '.crypt-lord-world-map__region-label']) {
      for (const text of state.overlay.querySelectorAll(selector)) {
        text.style.visibility = '';
        if (!text.getClientRects().length) continue;
        const rect = text.getBoundingClientRect();
        if (occupied.some(other => rect.left < other.right + 2 && rect.right > other.left - 2 &&
          rect.top < other.bottom + 2 && rect.bottom > other.top - 2)) text.style.visibility = 'hidden';
        else occupied.push(rect);
      }
    }
  }
  function zoom(delta, point) {
    const view = state.views[state.map], old = view.scale;
    view.scale = service.zoom(old, delta);
    if (point && view.scale !== old) {
      const rect = state.viewport.getBoundingClientRect();
      const x = point.x - rect.left - rect.width / 2, y = point.y - rect.top - rect.height / 2;
      view.x = x - (x - view.x) * view.scale / old;
      view.y = y - (y - view.y) * view.scale / old;
    }
    layout();
  }
  function svg(tag, attrs) {
    const item = doc().createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) item.setAttribute(key, value);
    return item;
  }
  function label(cls, text, x, y, title) {
    const item = node('span', cls, text);
    item.style.left = `${x}%`;
    item.style.top = `${y}%`;
    if (title) item.title = title;
    return item;
  }
  function renderOverlay() {
    state.overlay.replaceChildren();
    if (state.map !== 'main' || !state.data) return;
    const shapes = svg('svg', { viewBox: '0 0 100 51.35', preserveAspectRatio: 'none', class: 'crypt-lord-world-map__regions' });
    for (const region of state.data.mainRegions) {
      const points = region.points.outer;
      const polygon = svg('polygon', { points: points.map(point => `${point.x},${point.y}`).join(' ') });
      const title = svg('title', {});
      title.textContent = region.name;
      polygon.append(title);
      shapes.append(polygon);
      state.overlay.append(label('crypt-lord-world-map__region-label', region.name,
        service.centerX(points), service.centerY(points) / service.yScale));
    }
    state.overlay.prepend(shapes);
    for (const landmark of state.data.landmarks) {
      const point = label('crypt-lord-world-map__landmark', '', parseFloat(landmark.marker.left),
        parseFloat(landmark.marker.top), `${landmark.name}${landmark.description ? `：${landmark.description}` : ''}`);
      point.append(node('span', 'crypt-lord-world-map__landmark-label', landmark.name));
      state.overlay.append(point);
    }
    const player = service.marker(state.stat || {});
    if (player.valid) {
      const point = label('crypt-lord-world-map__player', '', player.x, player.y, player.label);
      point.append(node('span', 'crypt-lord-world-map__player-label', player.label));
      state.overlay.append(point);
    }
    layout();
  }
  function select(map) {
    if (!['main', 'shenqi'].includes(map)) throw Error('未知地图');
    state.drag = null;
    const changed = state.map !== map;
    state.map = map;
    state.mask.querySelectorAll('[role="tab"]').forEach(tab => {
      tab.setAttribute('aria-selected', String(tab.dataset.map === map));
    });
    if (changed || !state.image) loadImage();
    renderOverlay();
    layout();
  }
  async function refresh() {
    if (!opened() || state.generating) return false;
    const ticket = ++state.sequence;
    state.data = null;
    state.stat = null;
    renderOverlay();
    message('正在读取地图与楼层位置...');
    state.mask.setAttribute('aria-busy', 'true');
    try {
      const loaded = await service.loadView(() => active(ticket) && !state.generating);
      if (!active(ticket)) return false;
      state.data = loaded.data;
      state.source = loaded.source;
      state.stat = loaded.position?.stat_data || {};
      renderOverlay();
      const marker = service.marker(state.stat);
      message(`${loaded.source} · ${marker.valid ? marker.label : '当前楼层暂无坐标'}`);
      return true;
    } catch (error) {
      if (active(ticket)) message(`地图读取失败：${error.message || error}`, true);
      return false;
    } finally {
      if (active(ticket)) state.mask.setAttribute('aria-busy', 'false');
    }
  }
  function close() {
    state.sequence++;
    state.drag = null;
    if (!state.mask) return;
    state.mask.dataset.open = 'false';
    state.mask.setAttribute('aria-busy', 'false');
    if (state.focus?.isConnected) state.focus.focus();
  }
  function syncViewport() {
    if (!state.mask) return;
    const view = win(), html = doc().documentElement, style = view.getComputedStyle(html);
    const transformed = style.transform !== 'none' || style.perspective !== 'none' || style.filter !== 'none';
    state.mask.style.top = `${transformed ? -html.getBoundingClientRect().top : 0}px`;
    state.mask.style.height = `${view.innerHeight}px`;
    if (state.dialog.style.left) {
      state.dialog.style.left = `${Math.max(8, Math.min(parseFloat(state.dialog.style.left), view.innerWidth - state.dialog.offsetWidth - 8))}px`;
      state.dialog.style.top = `${Math.max(8, Math.min(parseFloat(state.dialog.style.top), view.innerHeight - state.dialog.offsetHeight - 8))}px`;
    }
    layout();
  }
  function listen(target, name, fn, options) {
    target.addEventListener(name, fn, options);
    state.cleanup.push(() => target.removeEventListener(name, fn, options));
  }
  function mount() {
    if (state.disposed || state.mask || !doc().body) return Boolean(state.mask);
    const mask = node('section', 'crypt-lord-world-map');
    mask.dataset.open = 'false';
    const dialog = node('section', 'crypt-lord-world-map__dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', '世界地图');
    dialog.tabIndex = -1;
    const header = node('header');
    header.append(node('strong', '', '世界地图'),
      button('↻', 'fa-rotate-right', '刷新地图数据', () => void refresh()),
      button('×', 'fa-xmark', '关闭地图', close));
    const toolbar = node('nav', 'crypt-lord-world-map__toolbar');
    const tabs = node('div', 'crypt-lord-world-map__tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', '地图');
    for (const [id, title] of [['main', '世界地图'], ['shenqi', '神弃之地']]) {
      const tab = node('button', '', title);
      tab.type = 'button';
      tab.dataset.map = id;
      tab.setAttribute('role', 'tab');
      tab.addEventListener('click', () => select(id));
      tab.addEventListener('keydown', event => {
        if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
          event.preventDefault();
          select(id === 'main' ? 'shenqi' : 'main');
          tabs.querySelector('[aria-selected="true"]').focus();
        }
      });
      tabs.append(tab);
    }
    const scale = node('output');
    scale.dataset.mapScale = '';
    toolbar.append(tabs, button('−', 'fa-minus', '缩小地图', () => zoom(-.2)), scale,
      button('+', 'fa-plus', '放大地图', () => zoom(.2)),
      button('⌖', 'fa-expand', '重置地图视图', () => { state.views[state.map] = { x: 0, y: 0, scale: 1 }; layout(); }));
    const viewport = node('div', 'crypt-lord-world-map__viewport');
    const stage = node('div', 'crypt-lord-world-map__stage');
    const overlay = node('div', 'crypt-lord-world-map__overlay');
    stage.append(overlay);
    viewport.append(stage);
    const imageStatus = node('div', 'crypt-lord-world-map__image-status');
    const imageText = node('span');
    imageText.dataset.mapImageStatus = '';
    const retry = button('↻', 'fa-rotate-right', '重试地图图片', loadImage);
    retry.dataset.mapImageRetry = '';
    imageStatus.append(imageText, retry);
    viewport.append(imageStatus);
    const result = node('footer');
    result.setAttribute('role', 'status');
    dialog.append(header, toolbar, viewport, result);
    mask.append(dialog);
    doc().body.append(mask);
    Object.assign(state, { mask, dialog, viewport, stage, overlay, result });
    listen(mask, 'click', event => { if (event.target === mask) close(); });
    listen(mask, 'keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        const items = [...dialog.querySelectorAll('button:not(:disabled)')].filter(item => item.getClientRects().length);
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && [first, dialog].includes(doc().activeElement)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && [last, dialog].includes(doc().activeElement)) { event.preventDefault(); first?.focus(); }
      }
    });
    for (const [surface, type] of [[viewport, 'map'], [header, 'dialog']]) {
      listen(surface, 'pointerdown', event => {
        if (event.button !== 0 || event.target.closest('button')) return;
        const view = state.views[state.map], rect = dialog.getBoundingClientRect();
        state.drag = { type, pointer: event.pointerId, x: event.clientX, y: event.clientY,
          left: type === 'map' ? view.x : rect.left, top: type === 'map' ? view.y : rect.top };
        surface.setPointerCapture?.(event.pointerId);
        event.preventDefault();
      });
      listen(surface, 'pointermove', event => {
        const drag = state.drag;
        if (!drag || drag.type !== type || drag.pointer !== event.pointerId) return;
        const x = drag.left + event.clientX - drag.x, y = drag.top + event.clientY - drag.y;
        if (type === 'map') { Object.assign(state.views[state.map], { x, y }); layout(); }
        else { dialog.style.left = `${x}px`; dialog.style.top = `${y}px`; dialog.style.transform = 'none'; syncViewport(); }
      });
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(surface, name, () => { state.drag = null; });
    }
    listen(viewport, 'wheel', event => {
      event.preventDefault();
      zoom(event.deltaY > 0 ? -.2 : .2, { x: event.clientX, y: event.clientY });
    }, { passive: false });
    listen(win(), 'resize', syncViewport);
    listen(win(), 'scroll', syncViewport, { passive: true });
    const observer = new (win().ResizeObserver)(layout);
    observer.observe(viewport);
    state.cleanup.push(() => observer.disconnect());
    for (const target of new Set([window, win()])) listen(target, 'cryptLord:variables-updated', () => { if (opened()) void refresh(); });
    const events = host.tavernEvents();
    if (events?.GENERATION_STARTED) {
      const subscription = host.bindEvent(events.GENERATION_STARTED, (type, options, dryRun) => {
        if (['quiet', 'dryRun'].includes(type) || dryRun || options?.dryRun || options?.quiet_prompt) return;
        state.generating = true; state.sequence++; state.data = state.stat = null;
        renderOverlay();
        state.mask.setAttribute('aria-busy', 'false');
        state.mask.querySelector('[aria-label="刷新地图数据"]').disabled = true;
        if (opened()) message('正在生成，等待完整楼层位置。');
      });
      state.cleanup.push(() => subscription?.stop());
    }
    for (const name of new Set([events?.GENERATION_ENDED, events?.GENERATION_STOPPED].filter(Boolean))) {
      const subscription = host.bindEvent(name, () => {
        state.generating = false;
        state.mask.querySelector('[aria-label="刷新地图数据"]').disabled = false;
        if (opened()) void refresh();
      });
      state.cleanup.push(() => subscription?.stop());
    }
    if (events?.CHAT_CHANGED) {
      const subscription = host.bindEvent(events.CHAT_CHANGED, () => {
        close();
        state.generating = false;
        state.mask.querySelector('[aria-label="刷新地图数据"]').disabled = false;
        state.data = state.stat = null;
        state.views = freshViews();
        renderOverlay();
      });
      state.cleanup.push(() => subscription?.stop());
    }
    for (const name of new Set([events?.MESSAGE_UPDATED, events?.MESSAGE_RECEIVED, events?.MESSAGE_DELETED, events?.MESSAGE_SWIPED].filter(Boolean))) {
      const subscription = host.bindEvent(name, () => { if (opened()) void refresh(); });
      state.cleanup.push(() => subscription?.stop());
    }
    syncViewport();
    return true;
  }
  async function open(map = 'main') {
    if (!['main', 'shenqi'].includes(map)) throw Error('未知地图');
    if (!mount() || state.disposed) return false;
    if (!opened()) state.focus = doc().activeElement;
    state.mask.dataset.open = 'true';
    select(map);
    syncViewport();
    state.dialog.focus();
    if (state.generating) { message('正在生成，等待完整楼层位置。'); return true; }
    return refresh();
  }
  const api = Object.freeze({
    status: () => ({ key: KEY, ready: !state.disposed, mounted: Boolean(state.mask), open: Boolean(opened()),
      map: state.map, views: structuredClone(state.views) }),
    mount, open, close, refresh,
    dispose() {
      close();
      state.disposed = true;
      state.cleanup.splice(0).forEach(stop => stop());
      state.mask?.remove();
      state.mask = null;
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
