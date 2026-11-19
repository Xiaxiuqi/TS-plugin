import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const modules = {};
const context = vm.createContext({ console, structuredClone, Math, Date,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
  } } });
context.window = context;
for (const name of ['battle-experience', 'battle-life-save', 'battle-tags',
  'battle-terrain-presets', 'natural-environment', 'battlefield-painter',
  'personal-battle-state', 'battle-formulas', 'battle-auras', 'battle-field-effect-reference',
  'battle-field-effects', 'battle-effect-transfer', 'battle-bribery', 'battle-balance',
  'battle-punishment', 'battle-exile', 'battle-active-leave', 'battle-events', 'battle-rewind',
  'battle-extra-action', 'battle-hard-control', 'battle-mind-deprive', 'battle-temp-control',
  'battle-permanent-control', 'battle-possession', 'battle-rule-change', 'battle-environment',
  'battle-fundamental', 'battle-summon', 'battle-ability-borrow', 'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const engine = modules['cryptLord.teamBattleState'], borrow = modules['cryptLord.battleAbilityBorrow'];
const fields = modules['cryptLord.battleFieldEffects'];
const pathways = Object.fromEntries(['律师', '偷盗者', '学徒', '观众', '通识者', '仲裁人',
  '歌颂者', '水手', '猎人', '囚犯', '收尸人', '药师', '占卜家', '恶棍', '入门者',
  '窥秘人', '阅读者', '萨满', '秘祈人', '罪犯', '吝啬鬼', '刺客']
  .map(path => [`${path}途径`, Array.from({ length: 10 }, (_, i) => `序列${9 - i}-${path}${9 - i}`)]));
const sequence = path => `序列0-${path}0`;
const card = seq => ({ 当前序列: seq, 活力: 10000, 当前活力: 10000,
  敏捷: 100, 当前敏捷: 100, 灵性: 1000000, 当前灵性: 1000000,
  理智: 10000, 当前理智: 10000, 人性: 1000000, 当前人性: 1000000, 运气: 40,
  序列能力列表: { 能力: [{ 名称: '试探', power: 1, range: 'global' },
    { 名称: '防御', power: 2, range: 'global' }] } });
const battleOf = data => data.cryptLord.teamBattle;
function start(source = '律师', authority = '律师') {
  const result = engine.start({ stat_data: card(sequence(authority)), npc_data: {
    来源: { ...card(sequence(source)), 灵性: 1000, 当前灵性: 1000,
      人性: 1000, 当前人性: 1000, 理智: 1000, 当前理智: 1000, 活力: 1000, 当前活力: 1000 },
    敌人: { ...card(sequence('猎人')), 灵性: 1000, 当前灵性: 1000,
      人性: 1000, 当前人性: 1000, 理智: 1000, 当前理智: 1000, 活力: 1000, 当前活力: 1000 },
  } }, { enemies: ['来源', '敌人'], pathways, summonPool: { pathways, abilities: {} }, seed: 923 });
  assert.equal(result.ok, true, result.error);
  const battle = battleOf(result.data);
  battle.phase = 'tactic';
  for (const u of battle.units) if (u.source !== 'player') u.controller = 'player';
  return result.data;
}
function request(data, id) {
  const choice = engine.abilityBorrowOptions(data)[0];
  const source = choice.sources.find(r => r.id === '来源');
  const d = source.abilities.find(r => r.id === id);
  assert.ok(d, id);
  return { authority: choice.authority, source: source.id, ability: id, method: d.method };
}
let data = start(), before = JSON.stringify(data);
const choices = engine.abilityBorrowOptions(data);
assert.equal(choices[0].authority, '“定义”权柄');
assert.ok(engine.abilityBorrowOptions(start('律师', '偷盗者')).some(r => r.authority === '“窃取”权柄'));
assert.equal(JSON.stringify(data), before, 'queries must not spend, draw or write');
fields.withRuntime(battleOf(data), data, undefined, rt => {
  const coverage = rt.borrowRegistry.validateCoverage();
  assert.equal(coverage.ok, true, JSON.stringify(coverage.problems));
  for (const denied of ['能力借用', '秘偶化', '历史投影', '外放灵魂', '召唤画中人'])
    assert.equal(rt.borrowRegistry.denied.has(denied), true);
});
// Entire native editors are available through the projected facade, with no data mutation.
for (const path of ['律师', '学徒', '观众', '通识者', '仲裁人', '水手', '歌颂者']) {
  data = start(path);
  for (const d of engine.abilityBorrowOptions(data)[0].sources.find(r => r.id === '来源').abilities) {
    const req = request(data, d.id), snapshot = JSON.stringify(data);
    const facade = borrow.facade(engine, () => data, req);
    const reads = { fieldEffect: 'fieldEffectOptions', effectTransfer: 'effectTransferOptions',
      bribery: 'briberyOptions', balance: 'balanceOptions', punishment: 'punishmentOptions',
      fundamentalRule: 'fundamentalOptions', changeEnvironment: 'environmentOptions',
      ruleChange: 'ruleChangeOptions', summon: 'summonOptions', extraAction: 'extraActionOptions',
      battleEvent: 'battleEventOptions', exile: 'exileOptions', rewind: 'rewindOptions',
      hardControl: 'hardControlOptions', mindDeprive: 'mindDepriveOptions',
      tempControl: 'tempControlOptions', permanentControl: 'permanentControlOptions',
      skillControl: 'skillControlOptions' };
    assert.ok(reads[d.method], d.id);
    facade[reads[d.method]](data);
    assert.equal(JSON.stringify(data), snapshot, d.id);
  }
}
// Source ledger, actual caster resources, identity, JSON restore and invalid-command atomicity.
data = start('学徒');
let req = request(data, 'extra:闪现（虚影分身）');
let result = engine.abilityBorrow(data, { ...req, request: '闪现（虚影分身）' }, () => .99);
assert.equal(result.ok, true, result.error);
assert.ok(battleOf(result.data).extraAction.used.来源);
assert.ok(!battleOf(result.data).extraAction.used.player);
assert.equal(battleOf(result.data).units[0].sequence, sequence('律师'));
assert.ok(battleOf(result.data).units[0].spirit < 1000000);
assert.equal(battleOf(result.data).units.find(u => u.id === '来源').spirit, 1000);
assert.ok(result.battle.lastTactic.outcomes[0].results[0].kind === 'borrowed-tactic');
assert.equal(JSON.stringify(result.data).includes('borrowScope'), false);
data = JSON.parse(JSON.stringify(result.data)); battleOf(data).phase = 'tactic';
before = JSON.stringify(data);
const invalid = engine.abilityBorrow(data, { ...req, method: 'summon', request: { subtype: '历史投影' } });
assert.equal(invalid.ok, false); assert.equal(JSON.stringify(data), before);
// Skill borrowing charges source rank but leaves real contest identity and granted-skill lifetime intact.
data = start('学徒'); req = request(data, 'skill-control:复制');
result = engine.abilityBorrow(data, { ...req, request: { mode: '复制', target: '来源', skill: '试探' } }, () => .99);
assert.equal(result.ok, true, result.error);
assert.ok(battleOf(result.data).units[0].skillControl.granted.some(r => r.name === '试探'));
assert.ok(!battleOf(result.data).units.find(u => u.id === '来源').skillControl?.banned?.length);
// Exercise every allowed action family through its actual native manager, not just its editor.
const exercised = new Set(['extraAction', 'skillControl']);
const reads = { fieldEffect: 'fieldEffectOptions', effectTransfer: 'effectTransferOptions',
  bribery: 'briberyOptions', balance: 'balanceOptions', punishment: 'punishmentOptions',
  fundamentalRule: 'fundamentalOptions', changeEnvironment: 'environmentOptions',
  ruleChange: 'ruleChangeOptions', summon: 'summonOptions', battleEvent: 'battleEventOptions',
  exile: 'exileOptions', rewind: 'rewindOptions', hardControl: 'hardControlOptions',
  mindDeprive: 'mindDepriveOptions', tempControl: 'tempControlOptions', permanentControl: 'permanentControlOptions' };
for (const path of ['律师', '学徒', '观众', '通识者', '仲裁人', '水手', '歌颂者',
  '猎人', '收尸人', '药师', '占卜家', '偷盗者']) {
  const baseline = start(path);
  for (const d of engine.abilityBorrowOptions(baseline)[0].sources.find(r => r.id === '来源').abilities) {
    if (exercised.has(d.method)) continue;
    data = structuredClone(baseline);
    if (d.method === 'mindDeprive') Object.assign(battleOf(data).units.find(u => u.id === '来源'),
      { x: battleOf(data).units[0].x + 1, y: battleOf(data).units[0].y });
    if (d.method === 'rewind') battleOf(data).units[0].hp -= 100;
    req = request(data, d.id);
    const facade = borrow.facade(engine, () => data, req), raw = facade[reads[d.method]](data);
    const choice = Array.isArray(raw) ? raw[0] : raw;
    if (!choice || choice.reason) continue;
    let params = { subtype: d.subtype, target: choice.targets?.[0]?.id };
    if (d.method === 'mindDeprive') params = undefined;
    if (d.method === 'battleEvent') params = d.subtype;
    if (d.method === 'summon') params.target = choice.rows[0]?.name;
    if (d.method === 'rewind') params.round = choice.rounds.find(r => r.differs)?.round;
    if (d.method === 'ruleChange') {
      params.presetKey = choice.presets[0]?.key;
      params.scope = choice.scopes[0];
      params.param = choice.params.find(r => r.dir === 'good')?.key;
    }
    if (d.method === 'fundamentalRule') {
      const atom = choice.atoms.find(r => r.type === 'number');
      params.mutations = [{ atomId: atom.id, value: atom.min === atom.current ? atom.max : atom.min }];
    }
    result = engine.abilityBorrow(data, { ...req, request: params }, () => .99);
    assert.equal(result.ok, true, `${d.id}: ${result.error}`);
    assert.equal(battleOf(result.data).units[0].sequence, sequence('律师'));
    assert.equal(JSON.stringify(result.data).includes('borrowScope'), false);
    exercised.add(d.method);
  }
}
assert.deepEqual([...exercised].sort(), [
  'extraAction', 'skillControl', ...Object.keys(reads),
].sort());
// A lost authority roll costs only the authority fee, never source quota or native fee.
data = start('学徒'); req = request(data, 'extra:闪现（虚影分身）');
const fee = engine.abilityBorrowOptions(data)[0].cost;
battleOf(data).units[0].spirit = fee + 1000;
let draw = 0;
result = engine.abilityBorrow(data, { ...req, request: '闪现（虚影分身）' },
  () => ++draw % 2 ? 0 : .99);
assert.equal(result.ok, true, result.error);
assert.equal(result.battle.lastTactic.outcomes[0].outcome, 'resisted');
assert.equal(result.battle.units[0].spirit, 1000);
assert.ok(!result.battle.extraAction.used.来源);
data = start('学徒'); req = request(data, 'skill-control:复制');
before = JSON.stringify(data);
assert.equal(engine.abilityBorrow(data, { ...req, request: {
  mode: '复制', target: '不存在', skill: '不存在',
} }, () => 0).ok, false);
assert.equal(JSON.stringify(data), before);
// Autonomous borrowing uses the original grouped plan and actual caster skill-state format.
data = start('律师', '偷盗者');
let b = battleOf(data), npc = b.units.find(r => r.id === '来源');
Object.assign(npc, { controller: 'npc', spirit: 10000000, maxSpirit: 10000000,
  humanity: 10000000, maxHumanity: 10000000, hp: 10000000, maxHp: 10000000 });
const npcRows = borrow.npc(b, data, ['敌人'], () => 0);
assert.equal(npcRows.length, 1);
assert.equal(npcRows[0].source, 'player');
assert.equal(npcRows[0].outcome, 'borrowed');
assert.ok(b.units[0].skillControl?.banned.length, JSON.stringify(npcRows));
assert.ok(npc.skillControl?.granted.length);
// Original exception: a summon can borrow alchemy; only the real source's quota is consumed.
data = start('律师', '通识者');
b = battleOf(data); npc = b.units.find(r => r.id === '来源');
Object.assign(npc, { controller: 'npc', isSummon: true, spirit: 10000000,
  maxSpirit: 10000000, humanity: 10000000, maxHumanity: 10000000 });
const groupPick = fields.withRuntime(b, data, undefined, rt => {
  const hero = rt.heroes.find(r => r.heroId === '来源'), owner = rt.heroes.find(r => r.heroId === 'player');
  const groups = rt.borrowRegistry.npcGroupsForSource(rt.bm, hero, owner, '“定义”权柄');
  const index = groups.findIndex(r => r.key === '召唤');
  assert.ok(index >= 0);
  return (index + .1) / groups.length;
});
const draws = [0, 0, 0, groupPick];
const nestedSummon = borrow.npc(b, data, ['敌人'], () => draws.shift() ?? 0);
assert.equal(nestedSummon[0].ability, 'summon:快速炼成');
assert.ok(b.units.some(r => r.summonOwnerId === '来源' && r.summonSubtype === '快速炼成'));
assert.ok(b.summon.counts.player.快速炼成);
assert.ok(!b.summon.counts.来源);
console.log('Ability borrowing: original catalog, complete editors, ownership and atomic floor settlement verified.');
