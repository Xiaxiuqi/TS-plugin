(() => {
  'use strict';

  const KEY = 'cryptLord.worldMap';
  const STORE_KEY = 'cryptLord.stateStore';
  const HOST_KEY = 'cryptLord.afterNativeHost';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const host = root.__stage1Modules?.[HOST_KEY];
  if (!host) throw new Error(`[${KEY}] shared/after-native-host.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const MAP_IMAGE = 'https://files.catbox.moe/wpsj51.png';
  let mask = null;
  let viewport = null;
  let canvas = null;
  let marker = null;
  let label = null;
  let scale = 1;
  let offset = { x: 0, y: 0 };
  let mapDrag = null;
  let dialogDrag = null;
  let disposed = false;

  function clamp(value, min, max) {
    if (min > max) return (min + max) / 2;
    return Math.max(min, Math.min(max, value));
  }
  function viewportRect() { return viewport?.getBoundingClientRect?.() || null; }
  function clampOffset(nextOffset = offset, nextScale = scale) {
    const rect = viewportRect();
    if (!rect) return { ...nextOffset };
    // The canvas fills the viewport before scaling, so its reachable edge is
    // exactly half of the extra scaled size away from the viewport center.
    const maxX = Math.max(0, rect.width * (nextScale - 1) / 2);
    const maxY = Math.max(0, rect.height * (nextScale - 1) / 2);
    return {
      x: clamp(nextOffset.x, -maxX, maxX),
      y: clamp(nextOffset.y, -maxY, maxY),
    };
  }
  function transform() {
    if (!canvas) return;
    offset = clampOffset(offset);
    canvas.style.transform = `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`;
  }
  function dialogTransform(dialog) {
    const x = dialogDrag?.offset?.x || 0;
    const y = dialogDrag?.offset?.y || 0;
    dialog.style.transform = `translate(${x}px, ${y}px)`;
  }
  function setScale(nextScale, clientX, clientY) {
    const rect = viewportRect();
    const previousScale = scale;
    scale = clamp(nextScale, 0.5, 16);
    if (!rect || scale === previousScale) {
      transform();
      return;
    }
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const anchorX = Number.isFinite(clientX) ? clientX : centerX;
    const anchorY = Number.isFinite(clientY) ? clientY : centerY;
    const ratio = scale / previousScale;
    // Keep the map point beneath the pointer fixed while zooming.
    offset = clampOffset({
      x: anchorX - centerX - (anchorX - centerX - offset.x) * ratio,
      y: anchorY - centerY - (anchorY - centerY - offset.y) * ratio,
    });
    transform();
  }
  function reset() { scale = 1; offset = { x: 0, y: 0 }; transform(); }
  function close() { if (mask) mask.dataset.open = 'false'; }
  function currentStat(data) { return data?.stat_data && typeof data.stat_data === 'object' ? data.stat_data : {}; }

  async function refresh() {
    if (!mask) return false;
    const store = await contract.waitGlobalInitialized(STORE_KEY, { timeoutMs: 10000 });
    const stat = currentStat(await store.readAssistantData());
    const coordinate = stat['当前坐标'] && typeof stat['当前坐标'] === 'object' ? stat['当前坐标'] : null;
    const x = Number(coordinate?.x);
    const y = Number(coordinate?.y);
    const valid = Number.isFinite(x) && Number.isFinite(y);
    marker.style.display = valid ? 'block' : 'none';
    if (valid) {
      marker.style.left = `${Math.max(0, Math.min(100, x))}%`;
      marker.style.top = `${Math.max(0, Math.min(100, y))}%`;
    }
    label.textContent = [stat['当前区域'], stat['当前地标']].filter(Boolean).join(' · ') || '当前位置尚未写入坐标';
    return true;
  }

  function mount() {
    if (disposed || mask) return Boolean(mask);
    const document = host.getHost()?.document;
    if (!document?.body) return false;
    mask = document.createElement('section');
    mask.className = 'crypt-lord-world-map';
    mask.dataset.open = 'false';
    mask.innerHTML = '<div class="crypt-lord-world-map__dialog" role="dialog" aria-modal="true" aria-label="世界地图"><header class="crypt-lord-world-map__header"><strong>世界地图</strong><span class="crypt-lord-world-map__location"></span><div class="crypt-lord-world-map__tools"><button type="button" data-map-action="zoom-out" title="缩小">−</button><button type="button" data-map-action="reset" title="重置视图">◎</button><button type="button" data-map-action="zoom-in" title="放大">+</button><button type="button" data-map-action="close" title="关闭">×</button></div></header><div class="crypt-lord-world-map__viewport"><div class="crypt-lord-world-map__canvas"><img src="https://files.catbox.moe/wpsj51.png" alt="诡秘之主世界地图"><span class="crypt-lord-world-map__marker" aria-label="当前位置"><i></i></span></div></div></div>';
    const dialog = mask.querySelector('.crypt-lord-world-map__dialog');
    const header = mask.querySelector('.crypt-lord-world-map__header');
    viewport = mask.querySelector('.crypt-lord-world-map__viewport');
    canvas = mask.querySelector('.crypt-lord-world-map__canvas');
    marker = mask.querySelector('.crypt-lord-world-map__marker');
    label = mask.querySelector('.crypt-lord-world-map__location');
    mask.addEventListener('click', event => {
      if (event.target === mask || event.target?.dataset?.mapAction === 'close') close();
      if (event.target?.dataset?.mapAction === 'zoom-in') setScale(scale * 1.5);
      if (event.target?.dataset?.mapAction === 'zoom-out') setScale(scale / 1.5);
      if (event.target?.dataset?.mapAction === 'reset') reset();
    });
    viewport.addEventListener('wheel', event => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.0015);
      setScale(scale * factor, event.clientX, event.clientY);
    }, { passive: false });
    viewport.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      mapDrag = { x: event.clientX, y: event.clientY, offset: { ...offset }, pointerId: event.pointerId };
      viewport.dataset.dragging = 'true';
      viewport.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    viewport.addEventListener('pointermove', event => {
      if (!mapDrag || event.pointerId !== mapDrag.pointerId) return;
      offset = clampOffset({ x: mapDrag.offset.x + event.clientX - mapDrag.x, y: mapDrag.offset.y + event.clientY - mapDrag.y });
      transform();
    });
    const endMapDrag = event => {
      if (mapDrag && (!event || event.pointerId === mapDrag.pointerId)) mapDrag = null;
      delete viewport.dataset.dragging;
    };
    viewport.addEventListener('pointerup', endMapDrag);
    viewport.addEventListener('pointercancel', endMapDrag);
    viewport.addEventListener('lostpointercapture', endMapDrag);
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target?.closest?.('button')) return;
      const rect = dialog.getBoundingClientRect();
      const origin = { x: dialogDrag?.offset?.x || 0, y: dialogDrag?.offset?.y || 0 };
      dialogDrag = {
        startX: event.clientX,
        startY: event.clientY,
        origin,
        offset: { ...origin },
        rect: { left: rect.left - origin.x, top: rect.top - origin.y, width: rect.width, height: rect.height },
      };
      header.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    header.addEventListener('pointermove', event => {
      if (!dialogDrag?.origin) return;
      const hostWindow = document.defaultView || window;
      const margin = 8;
      const minX = margin - dialogDrag.rect.left;
      const maxX = hostWindow.innerWidth - margin - (dialogDrag.rect.left + dialogDrag.rect.width);
      const minY = margin - dialogDrag.rect.top;
      const maxY = hostWindow.innerHeight - margin - (dialogDrag.rect.top + dialogDrag.rect.height);
      dialogDrag.offset = {
        x: clamp(dialogDrag.origin.x + event.clientX - dialogDrag.startX, minX, maxX),
        y: clamp(dialogDrag.origin.y + event.clientY - dialogDrag.startY, minY, maxY),
      };
      dialogTransform(dialog);
    });
    const endDialogDrag = () => { if (dialogDrag) delete dialogDrag.origin; };
    header.addEventListener('pointerup', endDialogDrag);
    header.addEventListener('pointercancel', endDialogDrag);
    document.body.appendChild(mask);
    transform();
    return true;
  }

  async function open() {
    if (!mount()) return false;
    reset();
    mask.dataset.open = 'true';
    try {
      await refresh();
    } catch (error) {
      label.textContent = '当前位置尚未写入坐标';
      console.warn(`[${KEY}] 无法读取当前楼层状态`, error);
    }
    return true;
  }
  const api = Object.freeze({ status() { return Object.freeze({ key: KEY, ready: Boolean(mask), open: mask?.dataset.open === 'true', image: MAP_IMAGE, scale }); }, mount, open, close, refresh, dispose() { disposed = true; mask?.remove(); mask = null; try { contract.releaseGlobal(KEY, api); } catch {} if (modules[KEY] === api) delete modules[KEY]; return true; } });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  mount();
})();
