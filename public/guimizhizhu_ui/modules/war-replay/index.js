(() => {
  'use strict';
  const KEY = 'cryptLord.warReplayUi';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const host = modules['cryptLord.afterNativeHost'];
  const replay = modules['cryptLord.warReplay'];
  const war = modules['cryptLord.warSim'];
  if (!host || !replay || !war) throw new Error(`[${KEY}] 依赖尚未加载`);
  const state = { root: null, dialog: null, board: null, clock: null, seek: null, play: null,
    model: null, tick: 0, speed: 1, playing: false, timer: null, drag: null, pan: null,
    zoom: 1, offsetX: 0, offsetY: 0, subscription: null, disposed: false };
  const doc = () => host.getHost()?.document || window.document;
  const view = () => doc().defaultView || window;
  function el(tag, className, text) {
    const node = doc().createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }
  function button(text, title, action) {
    const node = el('button', '', text);
    node.type = 'button';
    node.title = title;
    node.addEventListener('click', action);
    return node;
  }
  function pause() {
    state.playing = false;
    if (state.timer) view().clearInterval(state.timer);
    state.timer = null;
    if (modules['cryptLord.gameAudio']?.status()?.scope === 'war') modules['cryptLord.gameAudio'].stop();
    if (state.play) { state.play.textContent = '▶'; state.play.title = '播放'; }
  }
  function seek(value) {
    if (!state.model) return;
    state.tick = Math.max(0, Math.min(state.model.maxTick, Number(value) || 0));
    const frame = state.model.at(state.tick);
    const cols = Math.max(1, Number(state.model.result.conf?.cols) || 8);
    const rows = Math.max(1, Number(state.model.result.conf?.rows) || 6);
    state.board.style.setProperty('--war-cols', cols);
    state.board.style.setProperty('--war-rows', rows);
    state.board.replaceChildren();
    for (const unit of frame.units) {
      if (!unit.alive || !Number.isFinite(Number(unit.x)) || !Number.isFinite(Number(unit.y))) continue;
      const cell = el('div', `crypt-lord-war-replay__unit is-${unit.team === 'A' ? 'ally' : 'enemy'}`);
      cell.style.left = `${((Number(unit.x) + .5) / cols) * 100}%`;
      cell.style.top = `${((Number(unit.y) + .5) / rows) * 100}%`;
      cell.title = `${unit.name} · ${unit.hp}/${unit.maxHp} · 护盾 ${unit.shield}`;
      const icon = el('span', '', unit.icon || (unit.team === 'A' ? '◆' : '◇'));
      const name = el('small', '', unit.name);
      const health = el('i');
      health.style.width = `${Math.max(0, Math.min(100, 100 * unit.hp / (unit.maxHp || 1)))}%`;
      cell.append(icon, name, health);
      state.board.appendChild(cell);
    }
    state.seek.value = String(Math.round(state.tick));
    const seconds = Number(state.model.result.conf?.battleSecondsPerTick) || 36;
    state.clock.textContent = `${war.WarReport.durationOf(Math.floor(state.tick), seconds)} / ${state.model.settlement?.duration || war.WarReport.durationOf(state.model.maxTick, seconds)}`;
    state.root.querySelectorAll('[data-war-tick]').forEach(node => {
      node.classList.toggle('is-current', Number(node.dataset.warTick) <= state.tick);
    });
    if (state.tick >= state.model.maxTick) pause();
  }
  function play() {
    if (!state.model || state.playing) return;
    if (state.tick >= state.model.maxTick) seek(0);
    state.playing = true;
    state.play.textContent = 'Ⅱ';
    state.play.title = '暂停';
    void modules['cryptLord.gameAudio']?.playWarReplay(state.model.result);
    let previous = Date.now();
    state.timer = view().setInterval(() => {
      const now = Date.now();
      const elapsed = Math.min(200, now - previous);
      previous = now;
      seek(state.tick + elapsed * state.speed / (Number(state.model.result.conf?.tickMs) || 100));
    }, 40);
  }
  function transformBoard() {
    if (!state.board) return;
    state.board.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.zoom})`;
  }
  function resetBoard() {
    state.zoom = 1; state.offsetX = 0; state.offsetY = 0;
    transformBoard();
  }
  function setupBoard(viewport, board) {
    const clampOffset = () => {
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      state.offsetX = Math.max(-(state.zoom - 1) * width / 2, Math.min((state.zoom - 1) * width / 2, state.offsetX));
      state.offsetY = Math.max(-(state.zoom - 1) * height / 2, Math.min((state.zoom - 1) * height / 2, state.offsetY));
    };
    viewport.addEventListener('wheel', event => {
      event.preventDefault();
      const next = Math.max(1, Math.min(6, state.zoom * (event.deltaY < 0 ? 1.18 : 1 / 1.18)));
      if (next === state.zoom) return;
      const rect = viewport.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      state.offsetX += (x - state.offsetX) * (1 - next / state.zoom);
      state.offsetY += (y - state.offsetY) * (1 - next / state.zoom);
      state.zoom = next;
      clampOffset();
      transformBoard();
    }, { passive: false });
    viewport.addEventListener('pointerdown', event => {
      if (event.button !== 0 || state.zoom <= 1) return;
      state.pan = { x: event.clientX, y: event.clientY, left: state.offsetX, top: state.offsetY };
      viewport.setPointerCapture?.(event.pointerId);
    });
    viewport.addEventListener('pointermove', event => {
      if (!state.pan) return;
      state.offsetX = state.pan.left + event.clientX - state.pan.x;
      state.offsetY = state.pan.top + event.clientY - state.pan.y;
      clampOffset();
      transformBoard();
    });
    viewport.addEventListener('pointerup', () => { state.pan = null; });
    viewport.addEventListener('pointercancel', () => { state.pan = null; });
    viewport.addEventListener('dblclick', resetBoard);
    board.style.aspectRatio = `${Math.max(1, Number(state.model.result.conf?.cols) || 8)} / ${Math.max(1, Number(state.model.result.conf?.rows) || 6)}`;
  }
  function mount() {
    if (state.disposed || state.root) return Boolean(state.root);
    if (!doc().body) return false;
    const shell = el('section', 'crypt-lord-war-replay');
    shell.dataset.open = 'false';
    const dialog = el('section', 'crypt-lord-war-replay__dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-label', '战争回放');
    const header = el('header');
    header.append(el('strong', '', '战争沙盘'), el('span', '', ''));
    header.appendChild(button('×', '关闭', close));
    const body = el('div', 'crypt-lord-war-replay__body');
    dialog.append(header, body);
    shell.appendChild(dialog);
    doc().body.appendChild(shell);
    state.root = shell; state.dialog = dialog;
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const rect = dialog.getBoundingClientRect();
      state.drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      header.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    header.addEventListener('pointermove', event => {
      if (!state.drag) return;
      const rect = dialog.getBoundingClientRect();
      dialog.style.left = `${Math.max(8, Math.min(view().innerWidth - rect.width - 8, state.drag.left + event.clientX - state.drag.x))}px`;
      dialog.style.top = `${Math.max(8, Math.min(view().innerHeight - rect.height - 8, state.drag.top + event.clientY - state.drag.y))}px`;
      dialog.style.transform = 'none';
    });
    header.addEventListener('pointerup', () => { state.drag = null; });
    header.addEventListener('pointercancel', () => { state.drag = null; });
    const events = host.tavernEvents();
    if (events?.CHAT_CHANGED) state.subscription = host.bindEvent(events.CHAT_CHANGED, close);
    return true;
  }
  function open(result, options = {}) {
    if (!mount()) return false;
    pause();
    const report = war.buildReport(result);
    state.model = replay.create(result, report);
    state.tick = 0; state.speed = 1;
    const body = state.dialog.querySelector('.crypt-lord-war-replay__body');
    body.replaceChildren();
    state.dialog.querySelector('header span').textContent = `${options.title || '沙盘军演'} · ${result.winner === 'A' ? '我方获胜' : result.winner === 'B' ? '敌方获胜' : '平局'}`;
    const viewport = el('div', 'crypt-lord-war-replay__viewport');
    viewport.title = '滚轮缩放 · 放大后拖动 · 双击复位';
    const board = el('div', 'crypt-lord-war-replay__board');
    viewport.appendChild(board);
    state.board = board;
    resetBoard();
    setupBoard(viewport, board);
    const controls = el('div', 'crypt-lord-war-replay__controls');
    const playButton = button('▶', '播放', () => state.playing ? pause() : play());
    state.play = playButton;
    controls.append(
      button('↤', '重头', () => { pause(); seek(0); }),
      button('‹', '后退一段', () => { pause(); seek(state.tick - 10); }),
      playButton,
      button('›', '前进一段', () => { pause(); seek(state.tick + 10); }),
      button('↦', '直接结算', () => { pause(); seek(state.model.maxTick); }),
    );
    const speed = el('select');
    speed.title = '播放速度';
    for (const value of [1, 2, 4, 8]) {
      const option = el('option', '', `${value}×`);
      option.value = value; speed.appendChild(option);
    }
    speed.addEventListener('change', () => { state.speed = Number(speed.value); });
    controls.appendChild(speed);
    const clock = el('output');
    state.clock = clock; controls.appendChild(clock);
    const track = el('input', 'crypt-lord-war-replay__seek');
    track.type = 'range'; track.min = '0'; track.max = String(Math.max(1, state.model.maxTick));
    track.addEventListener('input', () => { pause(); seek(track.value); });
    state.seek = track;
    const summary = el('section', 'crypt-lord-war-replay__summary');
    summary.appendChild(el('h3', '', '战果与高光'));
    summary.appendChild(el('p', '', `${state.model.settlement?.reasonLabel || result.reason || ''} · ${state.model.settlement?.duration || ''}`));
    const picks = el('ol');
    for (const item of state.model.picks) {
      const row = el('li', '', `第 ${item.tick} 刻 · ${item.text}`);
      row.dataset.warTick = item.tick;
      row.addEventListener('click', () => { pause(); seek(item.tick); });
      picks.appendChild(row);
    }
    if (!state.model.picks.length) picks.appendChild(el('li', '', '本场没有特别战况'));
    summary.appendChild(picks);
    const stats = el('section', 'crypt-lord-war-replay__stats');
    stats.appendChild(el('h3', '', '双方战绩'));
    for (const unit of result.units) {
      stats.appendChild(el('div', '', `${unit.team === 'A' ? '我方' : '敌方'} · ${unit.name} · 剩余 ${unit.hp}/${unit.initialHp} · 输出 ${unit.damageDealt || 0} · 承伤 ${unit.damageTaken || 0} · 击破 ${unit.kills || 0}`));
    }
    const details = el('details', 'crypt-lord-war-replay__report');
    details.appendChild(el('summary', '', '完整战报'));
    details.appendChild(el('pre', '', report.text));
    details.appendChild(button('复制战报', '复制战报', async () => {
      try { await view().navigator.clipboard.writeText(report.text); } catch { /* Clipboard permission is optional. */ }
    }));
    body.append(viewport, controls, track, summary, stats, details);
    state.root.dataset.open = 'true';
    seek(0);
    return true;
  }
  function close() {
    pause();
    if (state.root) state.root.dataset.open = 'false';
    state.model = null;
  }
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, open: state.root?.dataset.open === 'true', tick: state.tick, playing: state.playing }),
    mount, open, close,
    dispose() {
      state.disposed = true; close(); state.subscription?.stop?.();
      state.root?.remove(); state.root = null;
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader may have released it. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
