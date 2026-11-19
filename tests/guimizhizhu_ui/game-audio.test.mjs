import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = await readFile(path.join(base, 'public/guimizhizhu_ui/core/game-audio.js'), 'utf8');
const original = await readFile(path.join(base,
  '数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/37a-js-fast-romance-detective-tail.txt'), 'utf8');
const ast = ts.createSourceFile('audio.js', original, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const names = ['AUDIO_BASE', 'BGM_TRACKS', 'WAR_BGM_BY_STAGE', 'SFX_FILES', 'SFX_VARIANT_GAIN',
  'WAR_SFX_BY_TROOP', 'WAR_SFX_WEIGHT_DEFAULT', 'WAR_SFX_WEIGHT', 'GameAudio'];
const oracleSource = names.map(name => ast.statements.find(node => ts.isVariableStatement(node) &&
  node.declarationList.declarations.some(item => item.name.getText(ast) === name)).getText(ast)).join('\n');

function create(legacy = false, options = {}) {
  const files = [], decks = [], sources = [], gains = [], pans = [], fetches = [];
  const storage = new Map(), events = new Map(), intervals = new Map(), timeouts = new Map();
  let clock = 1000, timerId = 0, context;
  const math = Object.create(Math); math.random = () => .4;
  class Audio {
    constructor() { this.paused = true; this.volume = 0; this.events = {}; decks.push(this); }
    addEventListener(name, fn) { this.events[name] = fn; }
    play() {
      if (options.rejectPlay) return Promise.reject(Error('gesture required'));
      this.paused = false; files.push(this.src); return Promise.resolve();
    }
    pause() { this.paused = true; }
    removeAttribute() { this.src = ''; }
  }
  class AudioContext {
    constructor() { this.state = 'suspended'; this.currentTime = 1; this.destination = {}; context = this; }
    createGain() { const node = { gain: { value: 0 }, connect() {} }; gains.push(node); return node; }
    createStereoPanner() { const node = { pan: { value: 0 }, connect() {} }; pans.push(node); return node; }
    createBufferSource() {
      const node = { playbackRate: { value: 1 }, stopped: false, connect() {},
        start() { sources.push(node); }, stop() { node.stopped = true; } };
      return node;
    }
    resume() {
      if (options.rejectResume) return Promise.reject(Error('gesture required'));
      this.state = 'running'; return Promise.resolve();
    }
    decodeAudioData(bytes, fn) {
      if (options.decode) return options.decode(bytes, fn);
      fn({ duration: 4 });
    }
    close() { this.state = 'closed'; return Promise.resolve(); }
  }
  const doc = {
    hidden: false, visible: true,
    addEventListener(name, fn) { if (!events.has(name)) events.set(name, new Set()); events.get(name).add(fn); },
    removeEventListener(name, fn) { events.get(name)?.delete(fn); },
    querySelector() { return this.visible ? {} : null; },
    querySelectorAll() { return []; },
    getElementById() { return this.visible ? { style: { display: 'flex' } } : null; },
    emit(name) { events.get(name)?.forEach(fn => fn()); },
    defaultView: { getComputedStyle: () => ({ visibility: 'visible' }) },
  };
  const modules = {};
  const win = {
    Audio, AudioContext, AbortController, document: doc, console, Map, Set, Promise, Object, Array,
    Math: math, Date: { now: () => clock },
    DOMAIN_IMAGE_BASE: 'https://cdn.jsdelivr.net/gh/markswillmas-prog/guimika-domain-assets@main/v2/',
    PlayerSettingsWorldbook: { setLocalPreference(key, value) { storage.set(key, value); } },
    fetch: async (file, request) => {
      fetches.push({ file, request });
      if (options.fetch) return options.fetch(file, request);
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(4) };
    },
    setInterval(fn, delay) { const id = ++timerId; intervals.set(id, { fn, delay, next: clock + delay }); return id; },
    clearInterval(id) { intervals.delete(id); },
    setTimeout(fn, delay) { const id = ++timerId; timeouts.set(id, { fn, next: clock + delay }); return id; },
    clearTimeout(id) { timeouts.delete(id); },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    cryptLord: { __stage1Modules: modules, contract: { initializeGlobal() {}, releaseGlobal() {} } },
  };
  win.window = win;
  vm.runInNewContext(legacy ? `${oracleSource}\nwindow.audio = GameAudio;` : source, win);
  const audio = legacy ? win.audio : modules['cryptLord.gameAudio'];
  const sceneNode = () => ({
    isConnected: true, dataset: { open: 'true' }, ownerDocument: doc, getClientRects: () => [{}],
  });
  function advance(milliseconds) {
    const end = clock + milliseconds;
    while (true) {
      const jobs = [...timeouts].map(([id, job]) => ({ id, job, interval: false }))
        .concat([...intervals].map(([id, job]) => ({ id, job, interval: true })))
        .filter(item => item.job.next <= end).sort((a, b) => a.job.next - b.job.next);
      const job = jobs[0]; if (!job) break;
      clock = job.job.next;
      if (context) context.currentTime = clock / 1000;
      if (job.interval) job.job.next += job.job.delay; else timeouts.delete(job.id);
      job.job.fn();
    }
    clock = end;
    if (context) context.currentTime = clock / 1000;
  }
  return { audio, options, doc, modules, events, files, decks, sources, gains, pans, fetches,
    storage, intervals, timeouts, sceneNode, advance, context: () => context };
}

test('Original audio parity: preferences, full troop table, tracks, gain/pan/rate, volleys and replay edges', async () => {
  const actual = create(), oracle = create(true);
  for (const name of ['war', 'duel']) {
    const patch = { bgm: .3, sfx: .7, muted: name === 'war' };
    actual.audio.set(patch, name); oracle.audio.set(patch, name);
    assert.equal(actual.storage.get(`guimi-${name}-audio`), oracle.storage.get(`guimi-${name}-audio`));
  }
  const troopDeclaration = ast.statements.find(node => ts.isVariableStatement(node) &&
    node.declarationList.declarations.some(item => item.name.getText(ast) === 'WAR_SFX_BY_TROOP'));
  const troopNames = troopDeclaration.declarationList.declarations[0].initializer.properties.map(p => p.name.getText(ast));
  for (const troopId of [...troopNames, 'unknown']) {
    assert.equal(actual.audio.categoryOf({ troopId }), oracle.audio.categoryOf({ troopId }), troopId);
    assert.equal(JSON.stringify(actual.audio.weightOf(troopId)), JSON.stringify(oracle.audio.weightOf(troopId)), troopId);
  }
  for (const unit of [{ name: '骑兵' }, { icon: 'artillery' }, { name: '轰炸舰' }, {}])
    assert.equal(actual.audio.categoryOf(unit), oracle.audio.categoryOf(unit));
  const groups = { return: 'prep', muster: 'prep', march: 'prep', parley: 'prep', battle: 'battle', aftermath: null };
  for (const [stage, group] of Object.entries(groups)) assert.equal(actual.audio.campaignGroup(stage), group);
  actual.audio.enter('prep', 'duel'); oracle.audio.enter('prep', 'duel');
  actual.advance(800); oracle.advance(800);
  assert.equal(actual.files.at(-1), oracle.files.at(-1));
  assert.equal(actual.decks.at(-1).volume, oracle.decks.at(-1).volume);
  const previous = actual.files.length;
  actual.audio.enter('prep', 'duel');
  assert.equal(actual.files.length, previous, 'render deduplication must not restart a track');
  actual.audio.enter('battle', 'duel'); oracle.audio.enter('battle', 'duel');
  oracle.audio.unlock();
  await actual.audio.preload(); await oracle.audio.preload();
  actual.advance(800); oracle.advance(800);
  assert.equal(actual.files.at(-1), oracle.files.at(-1));
  assert.equal(actual.fetches.length, 18);
  for (const kind of ['melee', 'gun', 'autogun', 'cannon', 'bomb', 'hit']) {
    actual.audio.fireVolley(kind, 4, 6, 12, .82, .95, 4);
    oracle.audio.fireVolley(kind, 4, 6, 12, .82, .95, 4);
    assert.equal(actual.sources.at(-1).playbackRate.value, oracle.sources.at(-1).playbackRate.value);
    assert.equal(actual.gains.at(-1).gain.value, oracle.gains.at(-1).gain.value);
    assert.equal(actual.pans.at(-1).pan.value, oracle.pans.at(-1).pan.value);
    assert.equal(actual.audio.fireVolley(kind), false, '70ms multiplied by speed');
    actual.advance(300); oracle.advance(300);
  }
  for (let i = 0; i < 8; i++) { actual.audio.fireVolley('hit'); actual.advance(100); }
  assert.ok(actual.sources.some(node => node.stopped), 'six-voice limit');
  actual.audio.set({ muted: true }, 'duel');
  assert.equal(actual.audio.fireVolley('gun'), false);
  assert.ok(actual.sources.every(node => node.stopped), 'muting stops outstanding voices');
  actual.audio.set({ muted: false }, 'duel');
  const scene = actual.audio.createScene(actual.sceneNode);
  scene.enter('battle', 'war'); actual.audio.set({ muted: false }, 'war');
  const result = { conf: { cols: 8 }, units: [
    { id: 'a', troopId: 'sixPounderBoat' }, { id: 'b', troopId: 'railwayGun' },
  ], events: [
    { tick: 0, type: 'attack_start', id: 'a', from: { x: 7 } },
    { tick: 2, type: 'attack_start', id: 'a', from: { x: 2 } },
    { tick: 3, type: 'attack_start', id: 'b', from: { x: 6 } },
    { tick: 3, type: 'hit', id: 'a', amount: 1 },
    { tick: 7, type: 'attack_start', id: 'b', from: { x: 0 } },
  ] };
  const replay = actual.audio.createReplay(result, scene), calls = [];
  const traced = actual.audio.createReplay(result, { fireVolley: (...args) => calls.push(args) });
  traced.seek(0); traced.advance(3, 4);
  assert.deepEqual(calls[0], ['cannon', 2, 4, 8, .82, 1, 4]);
  traced.advance(3); traced.seek(6); traced.advance(7);
  assert.equal(calls.length, 2, 'one emission per edge, no backfill on seek');
  traced.seek(0); traced.advance(7, 8); assert.equal(calls.length, 3);
  const warSource = await readFile(path.join(base,
    '数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/37c-js-domain-and-war-windows.txt'), 'utf8');
  const warAst = ts.createSourceFile('war.js', warSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const windowClass = warAst.statements.find(node => ts.isClassDeclaration(node) && node.name.text === 'WarWindow');
  const emitter = ['_firstAt', '_sfxUnit', '_emitSfx'].map(name =>
    windowClass.members.find(node => node.name?.getText(warAst) === name).getText(warAst)).join('\n');
  const emitted = [], originalAudio = { categoryOf: oracle.audio.categoryOf, weightOf: oracle.audio.weightOf,
    fireVolley: (...args) => emitted.push(args) };
  const legacy = { GameAudio: originalAudio }; legacy.window = legacy;
  vm.runInNewContext(`window.emitter = new (class {
    ${emitter}
    conf() { return this.result.conf; }
  })();`, legacy);
  legacy.emitter.result = result; legacy.emitter.playing = true;
  for (const [tick, speed, seeking] of [[0, 1, true], [3, 4, false], [3, 1, false],
    [6, 1, true], [7, 1, false], [0, 1, true], [7, 8, false]]) {
    legacy.emitter.playTick = tick; legacy.emitter.speed = speed;
    legacy.emitter.playing = !seeking; legacy.emitter._emitSfx();
  }
  assert.equal(JSON.stringify(calls), JSON.stringify(emitted), 'independent original replay emitter parity');
  replay.seek(0); actual.advance(400);
  const count = actual.sources.length; replay.advance(3, 4);
  assert.equal(actual.sources.length, count + 1);
  scene.playHits({ units: [{ id: 'a', hp: 100 }, { id: 'b', hp: 100 }] },
    { board: { cols: 12 }, units: [{ id: 'a', hp: 90, maxHp: 100, x: 1 },
      { id: 'b', hp: 70, maxHp: 100, x: 11 }] });
  actual.advance(150);
  assert.equal(actual.pans.at(-1).pan.value, .8, 'hit follows target column');
  actual.advance(400);
  const beforeLog = { units: [{ id: 'a', hp: 100, maxHp: 100, maxSanity: 100, x: 1 }], log: [
    { actor: 'a', target: 'a', damage: 7, at: 1 }, { message: 'old tail', at: 2 },
  ] };
  const afterLog = { ...beforeLog, board: { cols: 12 }, log: [
    beforeLog.log[1], { actor: 'enemy', target: 'a', damage: 25,
      calculation: { attribute: 'sanity' } }, { actor: 'a', cost: 20 },
    { actor: 'a', target: 'a', healing: 15 },
  ] };
  const beforeSanity = actual.sources.length;
  scene.playHits(beforeLog, afterLog);
  assert.equal(actual.sources.length, beforeSanity + 1, 'new structured sanity hit, no cost/heal or old hit');
  assert.ok(Math.abs(actual.sources.at(-1).playbackRate.value - .82 * .99) < 1e-9);
  scene.playHits(afterLog, afterLog); actual.advance(500);
  assert.equal(actual.sources.length, beforeSanity + 1, 'unchanged persisted logs cannot replay sounds');
  scene.leave(); actual.audio.stop(); actual.audio.dispose();
  assert.equal(actual.intervals.size, 0); assert.equal(actual.timeouts.size, 0);
});

test('Complete lifecycle: scene handoff, visibility, gesture retry, CDN retry, late decode and disposal', async () => {
  const actual = create();
  const prepNode = actual.sceneNode(), replayNode = actual.sceneNode();
  const prep = actual.audio.createScene(() => prepNode), replay = actual.audio.createScene(() => replayNode);
  prep.enter('prep', 'war'); actual.advance(800);
  replay.enter('battle', 'war'); actual.advance(800);
  const count = actual.files.length;
  prep.enter('prep', 'war');
  assert.equal(actual.audio.status().group, 'battle', 'background rerender must not steal replay');
  assert.equal(actual.files.length, count);
  prep.leave();
  assert.equal(actual.audio.status().group, 'battle', 'closing another war window cannot stop replay');
  prep.enter('prep', 'war');
  replay.leave();
  assert.equal(actual.audio.status().group, 'prep', 'return to live preparation owner');
  await actual.audio.preload();
  actual.doc.hidden = true; actual.doc.emit('visibilitychange');
  assert.ok(actual.decks.every(deck => deck.paused), 'both crossfade decks pause');
  assert.equal(prep.fireVolley('gun'), false);
  actual.doc.hidden = false; actual.doc.emit('visibilitychange');
  assert.ok(actual.decks.some(deck => !deck.paused));
  prep.leave(); actual.advance(200); prep.enter('prep', 'war'); actual.advance(1000);
  assert.equal(actual.audio.status().group, 'prep', '400ms transfer grace');
  assert.ok(actual.decks.some(deck => !deck.paused && deck.volume > 0));
  prepNode.dataset.open = 'false'; actual.advance(2500);
  assert.equal(actual.audio.status().group, null, 'actual owner disappears');
  actual.advance(3100); assert.ok(actual.decks.every(deck => deck.paused));
  assert.equal(prep.enter('battle', 'war'), false, 'closed owner cannot restart playback');
  actual.audio.dispose(); assert.equal(actual.context().state, 'closed');
  actual.audio.stop(); actual.audio.leave();
  prepNode.dataset.open = 'true';
  assert.equal(prep.enter('prep', 'war'), false);
  assert.equal(actual.audio.fireVolley('gun'), false);
  assert.equal(actual.intervals.size, 0); assert.equal(actual.timeouts.size, 0);

  const denied = create(false, { rejectPlay: true, rejectResume: true });
  denied.audio.enter('battle', 'duel'); await Promise.resolve(); await Promise.resolve();
  assert.equal(denied.events.get('pointerdown').size, 1);
  denied.options.rejectPlay = false; denied.options.rejectResume = false;
  denied.doc.emit('pointerdown'); await Promise.resolve();
  assert.equal(denied.context().state, 'running'); assert.ok(denied.files.length);
  denied.audio.dispose(); assert.equal(denied.events.get('pointerdown').size, 0);

  const retry = create(false, { fetch: async file => ({
    ok: !file.endsWith('sfx-hit-1.m4a'), arrayBuffer: async () => new ArrayBuffer(4),
  }) });
  retry.audio.enter('battle', 'duel'); await retry.audio.preload();
  assert.equal(retry.audio.fireVolley('hit'), false);
  retry.options.fetch = null; await retry.audio.preload();
  assert.equal(retry.fetches.length, 19, 'retry only missing audio files');
  assert.equal(retry.audio.fireVolley('hit'), true);
  for (let i = 0; i < 10; i++) retry.decks.at(-1).events.error();
  const failures = retry.files.length; retry.decks.at(-1).events.error();
  assert.equal(retry.files.length, failures, 'one failed round, no infinite CDN loop');
  retry.audio.enter('battle', 'duel');
  assert.ok(retry.files.length > failures, 'explicit scene entry retries a failed BGM round');
  retry.audio.dispose();

  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const late = create(false, { decode: async (_bytes, callback) => { await gate; callback({ duration: 4 }); } });
  late.audio.enter('battle', 'war');
  const pending = late.audio.preload(); await Promise.resolve(); await Promise.resolve();
  late.audio.dispose();
  assert.ok(late.fetches.every(request => request.request.signal.aborted));
  release(); await pending;
  assert.equal(late.audio.enter('battle', 'war'), false);
  assert.equal(late.audio.fireVolley('hit'), false);
  assert.equal(late.intervals.size, 0); assert.equal(late.timeouts.size, 0);
});
