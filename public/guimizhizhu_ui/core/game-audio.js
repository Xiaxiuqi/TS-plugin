(() => {
  'use strict';

  const KEY = 'cryptLord.gameAudio';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const BASE = 'https://cdn.jsdelivr.net/gh/markswillmas-prog/guimika-domain-assets@main/audio/';
  const TRACKS = {
    prep: ['bgm-prep-1.m4a', 'bgm-prep-2.m4a', 'bgm-prep-3.m4a', 'bgm-prep-4.m4a'],
    battle: Array.from({ length: 10 }, (_, i) => `bgm-battle-${i + 1}.m4a`),
  };
  const SFX = {
    melee: 3, gun: 4, autogun: 3, cannon: 3, bomb: 4, hit: 1,
  };
  const VARIANT_GAIN = {
    melee: [2.20, 1.50, 1.13], gun: [1.01, .91, .71, 1.58],
    autogun: [1.01, 1.01, 1.15], cannon: [.97, 1.09, 1.22],
    bomb: [1.24, 1.58, 1, 1.28], hit: [1],
  };
  const TROOP_SFX = {
    pikeMilitia: 'melee', outrider: 'melee', dragoon: 'melee',
    militia: 'gun', jaeger: 'gun', lineInfantry: 'gun', rifleSkirmisher: 'gun',
    steamRifleSquad: 'gun', observationBalloon: 'gun', fieldMedics: 'gun',
    staffOfficers: 'gun', ammoTender: 'gun', repairShip: 'gun',
    signalAirship: 'gun', spotterAirship: 'gun',
    gatlingCrew: 'autogun', gunAirship: 'autogun', armedAirship: 'autogun',
    armoredTrain: 'autogun',
    qfGunCrew: 'cannon', siegeBattery: 'cannon', railwayGun: 'cannon',
    armedSchooner: 'cannon', sixPounderBoat: 'cannon', sailFrigate: 'cannon',
    paddleGunship: 'cannon', qfGunboat: 'cannon', shipOfTheLine: 'cannon',
    steamCruiser: 'cannon', ironcladShip: 'cannon', gunshipAirship: 'cannon',
    skyFlagship: 'cannon',
    bomberAirship: 'bomb', torpedoBoat: 'bomb', grenadier: 'bomb',
  };
  const TROOP_WEIGHT = {
    railwayGun: [.82, 1], siegeBattery: [.85, 1],
    ironcladShip: [.88, .95], shipOfTheLine: [.9, .95], paddleGunship: [.92, .9],
    sixPounderBoat: [1.15, .72], armedSchooner: [1.15, .7], steamCruiser: [1.12, .75],
    militia: [.92, .9], jaeger: [.95, .9], lineInfantry: [1.05, .9],
    fieldMedics: [1.2, .45], staffOfficers: [1.2, .45], ammoTender: [1.15, .45],
    repairShip: [1.15, .45], signalAirship: [1.25, .4], spotterAirship: [1.25, .4],
  };
  const KEYS = { war: 'guimi-war-audio', duel: 'guimi-duel-audio' };
  const configs = { war: { bgm: .5, sfx: .7, muted: false }, duel: { bgm: .5, sfx: .7, muted: false } };
  const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
  let scope = 'war';
  let group = null;
  let queue = [];
  let ctx = null;
  let bus = null;
  let loading = null;
  let deck = null;
  let nextDeck = null;
  let leaveTimer = null;
  let watchTimer = null;
  let replayTimers = [];
  let failures = 0;
  let voices = [];
  const buffers = new Map();
  const lastFire = new Map();
  const listeners = new Set();
  const cfg = () => configs[scope];
  const storage = () => {
    try { return window.localStorage; } catch { return null; }
  };

  function load() {
    for (const name of Object.keys(KEYS)) {
      try {
        const saved = JSON.parse(storage()?.getItem(KEYS[name]) || 'null');
        if (typeof saved?.bgm === 'number') configs[name].bgm = clamp(saved.bgm);
        if (typeof saved?.sfx === 'number') configs[name].sfx = clamp(saved.sfx);
        if (saved && 'muted' in saved) configs[name].muted = Boolean(saved.muted);
      } catch { /* Invalid local preferences fall back to defaults. */ }
    }
  }
  function notify() { listeners.forEach(fn => fn()); }
  function get(name = scope) { return { ...configs[name] || cfg() }; }
  function set(patch, name = scope) {
    if (!configs[name]) throw new Error('未知音频作用域');
    if (typeof patch?.bgm === 'number') configs[name].bgm = clamp(patch.bgm);
    if (typeof patch?.sfx === 'number') configs[name].sfx = clamp(patch.sfx);
    if (patch && 'muted' in patch) configs[name].muted = Boolean(patch.muted);
    try { storage()?.setItem(KEYS[name], JSON.stringify(configs[name])); } catch { /* Playback remains available. */ }
    if (scope === name) applyVolume();
    notify();
  }
  function applyVolume() {
    for (const audio of [deck, nextDeck]) {
      if (audio) audio.volume = clamp((audio._level || 0) * cfg().bgm * (cfg().muted ? 0 : 1));
    }
    if (bus) bus.gain.value = cfg().muted ? 0 : cfg().sfx;
  }
  function audioContext() {
    if (ctx) return ctx;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    try {
      ctx = new AudioContext();
      bus = ctx.createGain();
      bus.connect(ctx.destination);
      applyVolume();
    } catch { ctx = null; }
    return ctx;
  }
  function unlock() {
    const context = audioContext();
    if (context?.state === 'suspended') void context.resume().catch(() => {});
  }
  function shuffle(items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function takeNext() {
    if (!queue.length) queue = shuffle(TRACKS[group] || []);
    return queue.shift();
  }
  function fade(audio, target, duration, done) {
    if (!audio) return;
    clearInterval(audio._fade);
    const from = audio._level || 0;
    const start = Date.now();
    audio._fade = setInterval(() => {
      const progress = Math.min(1, (Date.now() - start) / duration);
      audio._level = from + (target - from) * progress;
      applyVolume();
      if (progress === 1) {
        clearInterval(audio._fade);
        audio._fade = null;
        done?.();
      }
    }, 40);
  }
  function makeDeck() {
    const audio = new window.Audio();
    audio.preload = 'none';
    audio._level = 0;
    audio.addEventListener('ended', () => advance(audio, false));
    audio.addEventListener('error', () => advance(audio, true));
    return audio;
  }
  function play(audio, file) {
    audio.src = BASE + file;
    void audio.play().catch(() => {});
  }
  function advance(audio, failed) {
    if (audio !== deck || !group) return;
    failures = failed ? failures + 1 : 0;
    if (failures >= TRACKS[group].length) return;
    const file = takeNext();
    if (file) play(audio, file);
  }
  function crossfade() {
    const old = deck;
    const audio = nextDeck || makeDeck();
    nextDeck = old;
    deck = audio;
    const file = takeNext();
    if (!file) return;
    play(audio, file);
    fade(audio, 1, 700);
    if (old) fade(old, 0, 700, () => old.pause());
  }
  function stop() {
    clearTimeout(leaveTimer);
    leaveTimer = null;
    replayTimers.forEach(clearTimeout);
    replayTimers = [];
    clearInterval(watchTimer);
    watchTimer = null;
    group = null;
    queue = [];
    for (const audio of [deck, nextDeck]) {
      if (audio) fade(audio, 0, 3000, () => audio.pause());
    }
    notify();
  }
  function leave() {
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(stop, 400);
  }
  function enter(nextGroup, nextScope) {
    if (!configs[nextScope]) throw new Error('音频作用域必须为 war 或 duel');
    replayTimers.forEach(clearTimeout);
    replayTimers = [];
    clearTimeout(leaveTimer);
    leaveTimer = null;
    scope = nextScope;
    applyVolume();
    if (!TRACKS[nextGroup]) { stop(); return; }
    unlock();
    if (group !== nextGroup) {
      group = nextGroup;
      queue = shuffle(TRACKS[group]);
      failures = 0;
      crossfade();
    } else if (deck?.paused && !document.hidden) void deck.play().catch(() => {});
    if (!watchTimer) {
      watchTimer = setInterval(() => {
        if (group && !document.hidden && !document.querySelector(
          '.crypt-lord-game-shell__modal[data-open="true"][data-audio-active="true"], .crypt-lord-domain-console[data-open="true"]'
        )) stop();
      }, 2000);
    }
    notify();
  }
  function useScope(nextScope) {
    if (!configs[nextScope]) throw new Error('未知音频作用域');
    scope = nextScope;
    applyVolume();
    notify();
  }
  function decode(buffer) {
    return new Promise((resolve, reject) => {
      const promise = ctx.decodeAudioData(buffer, resolve, reject);
      if (promise?.then) promise.then(resolve, reject);
    });
  }
  function preload() {
    if (loading) return loading;
    if (!audioContext()) return Promise.resolve();
    const files = Object.entries(SFX).flatMap(([kind, count]) =>
      Array.from({ length: count }, (_, i) => `sfx-${kind}-${i + 1}.m4a`));
    loading = Promise.all(files.map(async file => {
      if (buffers.has(file)) return;
      try {
        const response = await fetch(BASE + file);
        if (response.ok) buffers.set(file, await decode(await response.arrayBuffer()));
      } catch { /* Audio CDN failure must not block gameplay. */ }
    })).then(() => { if (!buffers.size) loading = null; });
    return loading;
  }
  function fireVolley(kind, count = 1, x = 0, columns = 8, rate = 1, gain = .8, speed = 1) {
    if (!SFX[kind] || cfg().muted || !cfg().sfx || ctx?.state !== 'running') return false;
    const now = ctx.currentTime * 1000;
    if (now - (lastFire.get(kind) ?? -Infinity) < 70 * Math.max(1, speed)) return false;
    const index = Math.floor(Math.random() * SFX[kind]);
    const buffer = buffers.get(`sfx-${kind}-${index + 1}.m4a`);
    if (!buffer) return false;
    lastFire.set(kind, now);
    voices = voices.filter(voice => voice.until > now);
    while (voices.length >= 6) {
      try { voices.shift().source.stop(); } catch { /* A voice may have already ended. */ }
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = Math.max(.5, rate * (1 + (Math.random() - .5) * .1));
    const volume = ctx.createGain();
    volume.gain.value = Math.max(0, gain) * VARIANT_GAIN[kind][index] *
      (1 + .12 * Math.min(Math.max(0, count - 1), 4)) * (speed >= 4 ? .7 : 1);
    source.connect(volume);
    if (ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, x / Math.max(1, columns - 1) * 1.6 - .8));
      volume.connect(pan);
      pan.connect(bus);
    } else volume.connect(bus);
    source.start();
    voices.push({ source, until: now + buffer.duration * 1000 / source.playbackRate.value });
    return true;
  }
  function categoryOf(unit) {
    const preset = TROOP_SFX[unit?.troopId];
    if (preset) return preset;
    const icon = String(unit?.icon || '').toLowerCase();
    if (/pike|spear|cavalry|sword|spartan/.test(icon)) return 'melee';
    if (/grenade|explos|bomb|flame/.test(icon)) return 'bomb';
    if (/turret|gatling/.test(icon)) return 'autogun';
    if (/cannon|artillery|siege|catapult/.test(icon)) return 'cannon';
    if (/musket|rifle|archer|crossbow|infantry/.test(icon)) return 'gun';
    const name = String(unit?.name || '');
    if (/机枪|加特林/.test(name)) return 'autogun';
    if (/鱼雷|掷弹|投弹|航弹|轰炸/.test(name)) return 'bomb';
    if (/炮|舰/.test(name)) return 'cannon';
    if (/矛|枪骑|骑兵|马刀|冲锋/.test(name)) return 'melee';
    return 'gun';
  }
  function weightOf(troopId) { return TROOP_WEIGHT[troopId] || [1, .8]; }
  async function playWarReplay(result) {
    if (!Array.isArray(result?.events) || !result.events.length) return false;
    enter('battle', 'war');
    await preload();
    if (group !== 'battle' || scope !== 'war') return false;
    const units = new Map((result.units || []).map(unit => [unit.id, unit]));
    const attacks = result.events.filter(event => event.type === 'attack_start' || event.type === 'hit');
    if (!attacks.length) { leave(); return true; }
    const first = Number(attacks[0].tick) || 0;
    const last = Number(attacks.at(-1).tick) || first;
    const scale = Math.min(120, 6500 / Math.max(1, last - first));
    attacks.forEach(event => {
      const delay = Math.max(0, (Number(event.tick) - first) * scale);
      replayTimers.push(setTimeout(() => {
        if (group !== 'battle' || scope !== 'war' || document.hidden) return;
        const unit = units.get(event.id || event.attackerId || event.byId);
        const category = event.type === 'hit' ? 'hit' : categoryOf(unit);
        const [rate, gain] = weightOf(unit?.troopId);
        fireVolley(category, 1, Number(event.from?.x ?? event.x ?? unit?.x) || 0, Number(result.conf?.cols) || 8, rate, gain);
      }, delay));
    });
    replayTimers.push(setTimeout(() => {
      replayTimers = [];
      leave();
    }, Math.max(400, (last - first) * scale + 500)));
    return true;
  }
  function onVisibility() {
    if (!deck || !group) return;
    if (document.hidden) deck.pause();
    else void deck.play().catch(() => {});
  }
  load();
  document.addEventListener('visibilitychange', onVisibility);
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true, group, scope }); },
    get, set, load, unlock, preload, enter, useScope, leave, stop, fireVolley, categoryOf, weightOf, playWarReplay,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    dispose() {
      clearTimeout(leaveTimer);
      replayTimers.forEach(clearTimeout);
      replayTimers = [];
      clearInterval(watchTimer);
      for (const audio of [deck, nextDeck]) {
        if (!audio) continue;
        clearInterval(audio._fade);
        audio.pause();
        audio.removeAttribute('src');
      }
      voices.forEach(voice => { try { voice.source.stop(); } catch { /* Already ended. */ } });
      void ctx?.close?.();
      document.removeEventListener('visibilitychange', onVisibility);
      listeners.clear();
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
