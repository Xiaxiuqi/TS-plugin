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
  const CAMPAIGN_GROUPS = {
    return: 'prep', muster: 'prep', march: 'prep', parley: 'prep',
    battle: 'battle', aftermath: null,
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
  let disposed = false;
  let owner = null;
  let order = 0;
  let hiddenTicks = 0;
  let gesture = null;
  let controller = null;
  let loadingTimer = null;
  const scenes = new Map();
  const legacyScene = {};
  const documents = new Set();
  const soundTimers = new Set();
  let failures = 0;
  let voices = [];
  const buffers = new Map();
  const lastFire = new Map();
  const listeners = new Set();
  const cfg = () => configs[scope];
  const currentDocument = () => scenes.get(owner)?.document || document;
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
    applyVolume();
    notify();
  }
  function notify() { listeners.forEach(fn => fn()); }
  function get(name = scope) { return { ...configs[name] || cfg() }; }
  function set(patch, name = scope) {
    if (disposed) return;
    if (!configs[name]) throw new Error('未知音频作用域');
    if (typeof patch?.bgm === 'number') configs[name].bgm = clamp(patch.bgm);
    if (typeof patch?.sfx === 'number') configs[name].sfx = clamp(patch.sfx);
    if (patch && 'muted' in patch) configs[name].muted = Boolean(patch.muted);
    try { storage()?.setItem(KEYS[name], JSON.stringify(configs[name])); } catch { /* Playback remains available. */ }
    if (scope === name) applyVolume();
    if (scope === name && (cfg().muted || !cfg().sfx)) stopVoices();
    notify();
  }
  function applyVolume() {
    for (const audio of [deck, nextDeck]) {
      if (audio) audio.volume = clamp((audio._level || 0) * cfg().bgm * (cfg().muted ? 0 : 1));
    }
    if (bus) bus.gain.value = cfg().muted ? 0 : cfg().sfx;
  }
  function audioContext() {
    if (disposed) return null;
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
    if (context?.state === 'suspended') void context.resume().catch(() => hookGesture());
    if (group && deck?.paused && !currentDocument().hidden) play(deck);
  }
  function clearGesture() {
    if (gesture) gesture.document.removeEventListener('pointerdown', gesture.retry, true);
    gesture = null;
  }
  function hookGesture() {
    if (disposed || !group || gesture) return;
    const doc = currentDocument();
    const retry = () => {
      clearGesture();
      if (disposed || !group || doc.hidden) return;
      const context = audioContext();
      if (context?.state === 'suspended') void context.resume().catch(() => {});
      if (deck?.src) void deck.play().catch(() => {});
    };
    gesture = { document: doc, retry };
    doc.addEventListener('pointerdown', retry, true);
  }
  function stopVoices() {
    soundTimers.forEach(clearTimeout);
    soundTimers.clear();
    voices.forEach(voice => { try { voice.source.stop(); } catch { /* Already ended. */ } });
    voices = [];
    lastFire.clear();
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
    if (disposed || !group) return;
    if (file) audio.src = BASE + file;
    if (currentDocument().hidden) return;
    const source = audio.src;
    void audio.play().catch(() => {
      if (!disposed && audio === deck && audio.src === source && group) hookGesture();
    });
  }
  function advance(audio, failed) {
    if (disposed || audio !== deck || !group) return;
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
  function stopPlayback() {
    if (disposed) return;
    clearTimeout(leaveTimer);
    leaveTimer = null;
    clearInterval(watchTimer);
    watchTimer = null;
    clearGesture();
    stopVoices();
    owner = null;
    group = null;
    queue = [];
    for (const audio of [deck, nextDeck]) {
      if (audio) fade(audio, 0, 3000, () => audio.pause());
    }
    notify();
  }
  function stop() {
    if (disposed) return;
    scenes.clear();
    stopPlayback();
  }
  function visible(scene) {
    if (!scene.element) return true;
    const node = scene.element();
    return Boolean(node?.isConnected && node.dataset.open === 'true' &&
      node.getClientRects().length && node.ownerDocument.defaultView.getComputedStyle(node).visibility !== 'hidden');
  }
  function selectScene() {
    const candidates = [...scenes.entries()].filter(([, scene]) => visible(scene));
    const selected = candidates.sort((a, b) => b[1].order - a[1].order)[0];
    if (!selected) {
      stopVoices();
      clearGesture();
      owner = null;
      clearTimeout(leaveTimer);
      leaveTimer = setTimeout(stopPlayback, 400);
      return;
    }
    activate(selected[0], selected[1]);
  }
  function releaseScene(id, immediate = false) {
    scenes.delete(id);
    if (owner !== id) return;
    if (immediate && !scenes.size) stopPlayback();
    else selectScene();
  }
  function leave() {
    releaseScene(legacyScene);
  }
  function activate(id, scene) {
    if (disposed) return;
    clearTimeout(leaveTimer);
    leaveTimer = null;
    const resuming = !owner;
    if (owner !== id) { stopVoices(); clearGesture(); }
    owner = id;
    scope = scene.scope;
    watchDocument(scene.document);
    applyVolume();
    if (group !== scene.group) {
      stopVoices();
      group = scene.group;
      queue = shuffle(TRACKS[group]);
      failures = 0;
      crossfade();
    } else {
      if (failures >= TRACKS[group].length) {
        failures = 0;
        queue = shuffle(TRACKS[group]);
        play(deck, takeNext());
      }
      if (deck && (resuming || !deck._fade && deck._level < 1)) fade(deck, 1, 700);
    }
    unlock();
    if (!watchTimer) {
      watchTimer = setInterval(() => {
        if (disposed || !group || currentDocument().hidden) { hiddenTicks = 0; return; }
        const scene = scenes.get(owner);
        const active = scene && visible(scene) && (owner !== legacyScene || document.querySelector(
          '.crypt-lord-game-shell__modal[data-open="true"][data-audio-active="true"], .crypt-lord-war-replay[data-open="true"], .crypt-lord-campaign[data-open="true"], .crypt-lord-war-sandbox[data-open="true"]'));
        if (active) { hiddenTicks = 0; return; }
        if (++hiddenTicks >= 2) {
          hiddenTicks = 0;
          if (owner) releaseScene(owner);
        }
      }, 1000);
    }
    notify();
  }
  function enterScene(id, nextGroup, nextScope, element) {
    if (disposed) return false;
    if (!configs[nextScope]) throw new Error('音频作用域必须为 war 或 duel');
    if (!TRACKS[nextGroup]) { releaseScene(id); return false; }
    const node = element?.();
    const previous = scenes.get(id);
    const scene = { group: nextGroup, scope: nextScope, element,
      document: node?.ownerDocument || document, order: previous?.order || ++order };
    if (!visible(scene)) return false;
    scenes.set(id, scene);
    if (!previous || owner === id || !owner) activate(id, scene);
    return true;
  }
  function enter(nextGroup, nextScope) { return enterScene(legacyScene, nextGroup, nextScope); }
  function createScene(element) {
    const id = {};
    let released = false;
    return Object.freeze({
      enter(nextGroup, nextScope) { return !released && enterScene(id, nextGroup, nextScope, element); },
      leave() { releaseScene(id); },
      stop() { releaseScene(id, true); },
      fireVolley(...args) { return !released && owner === id && fireVolley(...args); },
      playHits(before, after) {
        if (released || owner !== id || !before || !after) return;
        const units = battle => battle.units || ['player', 'enemy']
          .filter(key => battle[key]).map(key => ({ ...battle[key], id: key }));
        const old = new Map(units(before).map(unit => [unit.id, unit]));
        const current = units(after);
        let hits;
        if (after.units && Array.isArray(after.log) && Array.isArray(before.log)) {
          // Native combat logs are bounded; align their overlapping records before selecting new hits.
          let overlap = Math.min(before.log.length, after.log.length);
          while (overlap && !after.log.slice(0, overlap).every((row, i) =>
            JSON.stringify(row) === JSON.stringify(before.log[before.log.length - overlap + i]))) overlap--;
          hits = after.log.slice(overlap).filter(row => row.target && Number(row.damage) > 0)
            .map(row => {
              const unit = current.find(item => item.id === row.target);
              const maximum = row.calculation?.attribute === 'sanity' ? unit?.maxSanity : unit?.maxHp;
              return unit ? { unit, ratio: row.damage / Math.max(1, maximum) } : null;
            }).filter(Boolean);
        } else hits = current.filter(unit => old.has(unit.id) && unit.hp < old.get(unit.id).hp)
          .map(unit => ({ unit, ratio: (old.get(unit.id).hp - unit.hp) / Math.max(1, unit.maxHp) }));
        hits.forEach(({ unit, ratio }, index) => {
          const rate = 1.12 - .30 * Math.max(0, Math.min(1, ratio / .25));
          const fire = () => !released && owner === id &&
            fireVolley('hit', 1, unit.x ?? 0, after.board?.cols || 12, rate, .85, 1);
          if (!index) fire();
          else {
            const timer = setTimeout(() => { soundTimers.delete(timer); fire(); }, index * 100);
            soundTimers.add(timer);
          }
        });
      },
      dispose() { released = true; releaseScene(id, true); },
    });
  }
  function useScope(nextScope) {
    if (!configs[nextScope]) throw new Error('未知音频作用域');
    scope = nextScope;
    applyVolume();
    notify();
  }
  function decode(context, buffer) {
    return new Promise((resolve, reject) => {
      const promise = context.decodeAudioData(buffer, resolve, reject);
      if (promise?.then) promise.then(resolve, reject);
    });
  }
  function preload() {
    if (disposed) return Promise.resolve();
    if (loading) return loading;
    const context = audioContext();
    if (!context) return Promise.resolve();
    controller = new window.AbortController();
    const signal = controller.signal;
    loadingTimer = setTimeout(() => controller?.abort(), 15000);
    const files = Object.entries(SFX).flatMap(([kind, count]) =>
      Array.from({ length: count }, (_, i) => `sfx-${kind}-${i + 1}.m4a`));
    loading = Promise.all(files.map(async file => {
      if (buffers.has(file)) return;
      try {
        const response = await fetch(BASE + file, { signal });
        if (!response.ok || disposed || signal.aborted) return;
        const buffer = await decode(context, await response.arrayBuffer());
        if (!disposed && !signal.aborted) buffers.set(file, buffer);
      } catch { /* Audio CDN failure must not block gameplay. */ }
    })).then(() => {
      clearTimeout(loadingTimer);
      loadingTimer = null; loading = null; controller = null;
    });
    return loading;
  }
  function fireVolley(kind, count = 1, x = 0, columns = 8, rate = 1, gain = .8, speed = 1) {
    if (disposed || !owner || currentDocument().hidden || !SFX[kind] ||
      cfg().muted || !cfg().sfx || ctx?.state !== 'running') return false;
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
    try { source.start(); } catch { return false; }
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
  function createReplay(result, scene) {
    const units = new Map((result.units || []).map(unit => [unit.id, unit]));
    const attacks = (result.events || []).filter(event => event.type === 'attack_start')
      .slice().sort((a, b) => a.tick - b.tick);
    let tick = 0, index = 0;
    return Object.freeze({
      seek(value) {
        tick = Math.floor(Number(value) || 0);
        index = 0;
        while (index < attacks.length && attacks[index].tick <= tick) index++;
      },
      advance(value, speed = 1) {
        const next = Math.floor(Number(value) || 0);
        if (next <= tick) { this.seek(next); return; }
        const buckets = new Map();
        while (index < attacks.length && attacks[index].tick <= next) {
          const event = attacks[index++];
          if (event.tick <= tick) continue;
          const unit = units.get(event.id), category = categoryOf(unit);
          const [rate, gain] = weightOf(unit?.troopId);
          const x = Number(event.from?.x) || 0;
          const bucket = buckets.get(category);
          if (!bucket) buckets.set(category, { count: 1, x, rate, gain });
          else {
            bucket.count++; bucket.x += x;
            if (gain > bucket.gain) { bucket.rate = rate; bucket.gain = gain; }
          }
        }
        tick = next;
        for (const [category, bucket] of buckets)
          scene.fireVolley(category, bucket.count, bucket.x / bucket.count,
            Number(result.conf?.cols) || 8, bucket.rate, bucket.gain, speed);
      },
    });
  }
  function onVisibility() {
    if (disposed || !group) return;
    if (currentDocument().hidden) {
      for (const audio of [deck, nextDeck]) audio?.pause();
      stopVoices();
    } else if (deck) play(deck);
  }
  function watchDocument(doc) {
    if (documents.has(doc)) return;
    documents.add(doc);
    doc.addEventListener('visibilitychange', onVisibility);
  }
  load();
  watchDocument(document);
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: !disposed, group, scope, scenes: scenes.size }); },
    get, set, load, unlock, preload, enter, useScope, leave, stop, fireVolley, categoryOf, weightOf,
    createScene, createReplay, campaignGroup: stage => CAMPAIGN_GROUPS[stage] || null,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    dispose() {
      if (disposed) return true;
      disposed = true;
      clearTimeout(leaveTimer);
      controller?.abort();
      clearTimeout(loadingTimer);
      scenes.clear();
      clearGesture();
      clearInterval(watchTimer);
      for (const audio of [deck, nextDeck]) {
        if (!audio) continue;
        clearInterval(audio._fade);
        audio.pause();
        audio.removeAttribute('src');
      }
      stopVoices();
      buffers.clear();
      group = null; owner = null;
      void ctx?.close?.().catch(() => {});
      documents.forEach(doc => doc.removeEventListener('visibilitychange', onVisibility));
      documents.clear();
      listeners.clear();
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
