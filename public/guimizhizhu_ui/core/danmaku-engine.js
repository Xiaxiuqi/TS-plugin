(() => {
  'use strict';
  const KEY = 'cryptLord.danmakuEngine', root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract, modules = root.__stage1Modules;
  if (!contract || !modules) throw Error('弹幕动画共享契约尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const THEMES = Object.freeze(['', '', '', 'gold', 'cyan', 'pink', 'emerald', 'purple', 'red',
    'silver', 'copper', 'coffee', 'slate', 'blue', 'olive', 'amber']);
  const engines = new Set();
  let disposed = false;
  // Adapted from original 33b DanmakuOptimizer: DOM pool, queue, tracks and rAF.
  class Engine {
    constructor(layer, options = {}) {
      this.layer = layer; this.window = layer.ownerDocument.defaultView;
      this.random = options.random || Math.random;
      this.now = options.now || (() => this.window.performance.now());
      this.mobile = this.window.innerWidth <= 768;
      this.maxDanmaku = this.mobile ? 10 : 8;
      this.baseDuration = this.mobile ? 20000 : 25000;
      this.laneCount = this.mobile ? 12 : 20;
      this.minLaunchInterval = 600; this.maxLaunchInterval = 2200;
      this.maxPoolSize = this.maxDanmaku + 10; this.domPool = [];
      this.activeDanmaku = []; this.pendingQueue = []; this.lanes = [];
      this.frame = null; this.enabled = false; this.pausedAt = null; this.destroyed = false;
      this.containerWidth = 0; this.nextLaunchTime = 0;
      for (let i = 0; i < this.maxDanmaku; i++) this.domPool.push(this.pill());
      engines.add(this);
    }
    pill() {
      const node = this.layer.ownerDocument.createElement('div');
      node.className = 'crypt-lord-danmaku-pill'; return node;
    }
    recycle(node) {
      node.remove(); node.textContent = ''; node.className = 'crypt-lord-danmaku-pill'; node.removeAttribute('style');
      if (this.domPool.length < this.maxPoolSize) this.domPool.push(node);
    }
    getBestLane(newDuration, newWidth, now) {
      const available = [];
      for (let i = 0; i < this.lanes.length; i++) {
        const last = this.lanes[i];
        if (!last) { available.push(i); continue; }
        const elapsed = now - last.startTime;
        const moved = elapsed / last.duration * (this.containerWidth + last.width);
        if (moved <= last.width + 30) continue;
        if (newDuration < last.duration && moved <= this.containerWidth * .35) continue;
        // Original tail/35% gate plus a velocity check for very long faster comments.
        const gap = moved - last.width;
        const relativeSpeed = (this.containerWidth + newWidth) / newDuration -
          (this.containerWidth + last.width) / last.duration;
        const overlapTime = Math.max(0, (this.containerWidth + last.width - moved) /
          ((this.containerWidth + last.width) / last.duration));
        if (relativeSpeed > 0 && gap - relativeSpeed * overlapTime < 30) continue;
        available.push(i);
      }
      return available.length ? available[Math.floor(this.random() * available.length)] : -1;
    }
    clear() {
      if (this.frame !== null) this.window.cancelAnimationFrame(this.frame);
      this.frame = null;
      this.activeDanmaku.forEach(item => this.recycle(item.element));
      this.activeDanmaku = []; this.pendingQueue = []; this.lanes.fill(null); this.nextLaunchTime = 0;
      this.layer.replaceChildren();
    }
    play(texts, reduced = false) {
      if (this.destroyed) return;
      this.clear(); this.enabled = true; this.pausedAt = null; this.layer.hidden = false;
      this.containerWidth = this.layer.clientWidth || this.window.innerWidth;
      const height = this.layer.clientHeight || this.window.innerHeight;
      // Keep original upper 88%, but reserve enough vertical room on short viewports.
      this.lanes = new Array(Math.max(1, Math.min(this.laneCount, Math.floor(height * .88 / (this.mobile ? 36 : 42))))).fill(null);
      this.pendingQueue = texts.filter(Boolean).map(text => ({ text, theme: THEMES[Math.floor(this.random() * THEMES.length)] }));
      if (reduced) {
        for (const [index, request] of this.pendingQueue.splice(0, this.lanes.length).entries()) {
          const node = this.domPool.pop() || this.pill(); node.textContent = request.text;
          node.classList.add('is-static'); if (request.theme) node.classList.add(`dm-theme-${request.theme}`);
          node.style.top = `${index * 88 / this.lanes.length + 5}%`; this.layer.append(node);
          this.activeDanmaku.push({ element: node, text: request.text, static: true });
        }
        this.pendingQueue = []; return;
      }
      this.start();
    }
    dispatch(now) {
      if (!this.pendingQueue.length || this.activeDanmaku.length >= this.maxDanmaku || now < this.nextLaunchTime) return;
      const request = this.pendingQueue[0], variance = this.baseDuration * .40;
      const duration = this.baseDuration + (this.random() * variance * 2 - variance);
      const node = this.domPool.pop() || this.pill(); node.textContent = request.text;
      if (request.theme) node.classList.add(`dm-theme-${request.theme}`);
      this.layer.append(node);
      const width = node.offsetWidth, lane = this.getBestLane(duration, width, now);
      if (lane === -1) { this.recycle(node); this.nextLaunchTime = now + 100; return; }
      this.pendingQueue.shift();
      this.nextLaunchTime = now + this.random() * (this.maxLaunchInterval - this.minLaunchInterval) + this.minLaunchInterval;
      const height = this.layer.clientHeight || this.window.innerHeight;
      const spacing = height * .88 / this.lanes.length;
      const jitterLimit = Math.min(height * .02, Math.max(0, (spacing - (node.offsetHeight || (this.mobile ? 33 : 38)) - 4) / 2));
      const jitter = (this.random() * 2 - 1) * jitterLimit / height * 100;
      node.style.top = `${Math.max(0, lane * 88 / this.lanes.length + 5 + jitter)}%`;
      node.style.opacity = '1';
      const item = { element: node, text: request.text, startTime: now, duration, width, lane };
      this.activeDanmaku.push(item); this.lanes[lane] = item;
    }
    tick(now) {
      this.dispatch(now);
      this.activeDanmaku = this.activeDanmaku.filter(item => {
        const progress = (now - item.startTime) / item.duration;
        if (progress >= 1) {
          if (this.lanes[item.lane] === item) this.lanes[item.lane] = null;
          this.recycle(item.element); return false;
        }
        item.element.style.transform = `translate3d(${-progress * (this.containerWidth + item.width)}px,0,0)`;
        return true;
      });
    }
    start() {
      if (this.frame !== null || !this.enabled || this.pausedAt !== null) return;
      if (!this.pendingQueue.length && (!this.activeDanmaku.length || this.activeDanmaku[0].static)) return;
      this.frame = this.window.requestAnimationFrame(() => {
        this.frame = null;
        if (!this.enabled || this.pausedAt !== null || this.destroyed) return;
        this.tick(this.now()); this.start();
      });
    }
    pause() {
      if (!this.enabled || this.pausedAt !== null) return;
      this.pausedAt = this.now();
      if (this.frame !== null) this.window.cancelAnimationFrame(this.frame);
      this.frame = null;
    }
    resume() {
      if (this.pausedAt === null) return;
      const elapsed = this.now() - this.pausedAt;
      this.activeDanmaku.forEach(item => { if (!item.static) item.startTime += elapsed; });
      this.nextLaunchTime += elapsed; this.pausedAt = null; this.start();
    }
    stop() { this.enabled = false; this.pausedAt = null; this.clear(); this.layer.hidden = true; }
    status() {
      return { active: this.activeDanmaku.length, queued: this.pendingQueue.length, pool: this.domPool.length,
        playing: this.enabled, paused: this.pausedAt !== null, frame: this.frame !== null,
        mobile: this.mobile, duration: this.baseDuration, lanes: this.lanes.length };
    }
    dispose() { this.stop(); this.destroyed = true; this.domPool = []; engines.delete(this); }
  }
  const api = Object.freeze({ status: () => ({ key: KEY, ready: !disposed, engines: engines.size }), themes: THEMES,
    create(layer, options) { if (disposed) throw Error('弹幕动画已卸载'); return new Engine(layer, options); },
    dispose() {
      disposed = true; [...engines].forEach(engine => engine.dispose()); contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY]; return true;
    } });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
