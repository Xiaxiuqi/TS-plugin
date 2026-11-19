import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const modules = {};
let books = {};
const context = vm.createContext({ console, structuredClone, Date, Math, Uint32Array,
  cryptLord: { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal() {},
    async waitGlobalInitialized(key) { return modules[key]; },
  } } });
context.window = context;
modules['cryptLord.hostApi'] = {
  async getWorldbookNames() { return Object.keys(books); },
  async getWorldbook(name) { return books[name]; },
};
for (const name of ['battle-experience', 'battle-life-save', 'battle-tags',
  'personal-battle-state', 'battle-terrain-presets', 'battle-formulas',
  'battle-conditional-params', 'battle-field-effect-reference', 'battle-report',
  'team-battle-state'])
  vm.runInContext(await readFile(new URL(`../../public/guimizhizhu_ui/core/${name}.js`,
    import.meta.url), 'utf8'), context);
const tags = modules['cryptLord.battleTags'];
const engine = modules['cryptLord.teamBattleState'];
const clean = value => JSON.parse(JSON.stringify(value, (key, row) => key === 'appliedAt' ? undefined : row));
const original = await readFile(new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/32a-js-battle-tags-movers-cpu.txt',
  import.meta.url), 'utf8');
const ast = ts.createSourceFile('original.js', original.slice(original.indexOf('class TagManager {')),
  99, true, ts.ScriptKind.JS);
const classes = ['TagManager', 'TagChecker'].map(name => ast.statements.find(node =>
  ts.isClassDeclaration(node) && node.name?.text === name).getText(ast));
const turn = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'TurnManager');
const apply = turn.members.find(node => node.name?.getText(ast) === 'applySkillTags').getText(ast);
const generated = await readFile(new URL('../../public/guimizhizhu_ui/core/battle-tags.js', import.meta.url), 'utf8');
for (const fragment of [...classes, apply])
  assert.ok(generated.includes(fragment.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '')));
const oracle = vm.runInNewContext(`${classes.join('\n')};
  ({ manager: new TagManager({ log() {} }, null), turn: { ${apply} } })`,
{ console: { log() {}, warn() {}, error() {} }, Date });

// Compare entire records against independently executed original classes, not a second approximation.
const actual = { name: '测试者', tags: [] }, expected = structuredClone(actual);
function same() { assert.deepEqual(clean(actual.tags), clean(expected.tags)); }
for (const args of [['火', 2, 2, 3], ['火', 8, 2, 99], ['木', 0, 5, 2]]) {
  tags.add(actual, ...args); oracle.manager.addTag(expected, ...args); same();
}
const mapping = { 猎人: { tags: ['火', '雷'], duration: 4, maxStacks: 3 } };
oracle.manager.tagMappingConfig = mapping;
for (const sequence of ['猎人', '猎人', '普通人']) {
  tags.sync(actual, sequence, mapping);
  oracle.manager.syncInherentTagsTo(expected, sequence); same();
}
oracle.turn.battleManager = { tagManager: oracle.manager };
oracle.turn.selectEffectTargets = oracle.turn.resolveHitList = () => [expected];
for (const skill of [
  { applyTags: [{ name: '印记', duration: 0, stacks: 2 }] },
  { applyTags: [{ name: '印记', durationChange: 120 }] },
  { applyTags: [{ name: '印记', stacksChange: -1 }] },
  { applyTags: [{ name: '零层', stacksChange: 0 }] },
  { removeTags: ['木'] },
  { removeTags: ['*'] },
]) {
  tags.applySkill(actual, actual, skill, true, { targets: [actual, actual] });
  oracle.turn.applySkillTags(expected, skill, expected); same();
}
console.log('1/4 original extraction, stacking, inherent rebuild and complete skill mutation parity passed');

const entry = (name, value) => ({ name, content: JSON.stringify(value) });
const damage = '【配置】标签伤害修正', healing = '【配置】标签治疗修正', mapName = '【配置】标签映射';
books = {
  unrelated: [entry(damage, { 火: { 木: 9 } })],
  '2历史孔隙': [entry(damage, { 火: { 木: .2 } }), entry(healing, { 火: { 火: .5 } })],
  '1源堡': [entry(damage, { 火: { 木: .3 } }), entry(damage, { 火: { 木: .5 } }), entry(mapName, mapping)],
};
const bookBefore = JSON.stringify(books);
let rules = await tags.load();
assert.equal(rules.damage.火.木, .5);
assert.equal(rules.healing.火.火, .5);
assert.equal(rules.sources[damage], '1源堡');
assert.equal(JSON.stringify(books), bookBefore);
books['1源堡'].push({ name: damage, content: '{bad' });
rules = await tags.load();
assert.deepEqual(clean(rules.damage), {});
assert.equal(rules.warnings.length, 1);
books = { fallback: [entry(damage, { 火: { 木: .5, 冰: '1', 雷: null } })] };
assert.deepEqual(clean((await tags.load()).damage), { 火: { 木: .5 } });
console.log('2/4 exact book priority, duplicate entries, invalid selected config and no worldbook writes passed');

const left = { name: '玩家', tags: [{ name: '火', duration: 3, stacks: 8 }] };
const right = { name: '敌人', tags: [{ name: '木', duration: 3, stacks: 4 }] };
const skill = { name: '雷击', skillTags: ['雷'] };
const relation = { 火: { 木: .5 }, 雷: { 木: 2 } };
const before = JSON.stringify([left, right, skill]);
const analysis = tags.analyze(left, right, skill, relation);
oracle.manager.tagDamageRelations = relation;
assert.equal(analysis.modifier, oracle.manager.calculateTagDamageModifier(left, right, skill));
assert.equal(analysis.rawModifier, 2.5);
assert.equal(analysis.matchedRelations[1].attackerTag.source, 'skill');
oracle.manager.tagHealingRelations = relation;
assert.equal(tags.analyze(left, right, skill, relation, 'healing').modifier,
  oracle.manager.calculateTagHealingModifier(left, right, skill));
assert.equal(tags.hasTag(left, '雷', skill), true);
assert.equal(tags.getTagStacks(left, '火'), 8);
assert.equal(tags.getTagDuration(left, '火'), 3);
tags.getTag(left, '火').stacks = 999;
assert.equal(JSON.stringify([left, right, skill]), before);
const data = { stat_data: { 名称: '玩家', 当前序列: '猎人',
  活力: 1000, 当前活力: 1000, 灵性: 1000, 当前灵性: 1000, 敏捷: 100, 当前敏捷: 100,
  序列能力列表: { 测试: [{ 名称: '群击', power: 20, range: 'global', targetType: 'allEnemies',
    skillTags: ['雷'], applyTags: [{ name: '印记', duration: 3, stacks: 1 }] }] } },
  npc_data: Object.fromEntries(['敌甲', '敌乙'].map(name => [name, {
    名称: name, 当前序列: '野兽', 活力: 1000, 当前活力: 1000, 敏捷: 10, 当前敏捷: 10,
  }])) };
const started = engine.start(data, { enemies: ['敌甲', '敌乙'], seed: 81,
  tagRules: { mapping: { ...mapping, 野兽: { tags: ['木'], duration: 4 } }, damage: relation, healing: {} } });
assert.equal(started.ok, true, started.error);
const battle = started.data.cryptLord.teamBattle;
Object.assign(battle, { queue: ['player', '敌甲', '敌乙'], index: 0, turnSlots: [] });
const snapshot = JSON.stringify(started.data);
const out = engine.action(started.data, { id: 'skill:测试:0', target: '敌甲' }, () => .99);
assert.equal(out.ok, true, out.error);
for (const enemy of out.battle.units.filter(row => row.side === 'enemy')) {
  assert.ok(enemy.hp < 1000);
  assert.equal(enemy.tags.find(row => row.name === '印记').stacks, 1);
}
assert.ok(out.battle.reportState.simple.some(row => row.includes('克制')));
assert.equal(JSON.stringify(started.data), snapshot);
const pure = JSON.stringify(out.data);
engine.get(out.data); engine.get(out.data);
assert.equal(JSON.stringify(out.data), pure);
const projected = out.battle.units[0];
tags.add(projected, '火', 7, 2, 99);
projected.sequence = '野兽';
engine.refreshProjectionPassives(out.battle, projected, {});
assert.equal(tags.getTagStacks(projected, '火'), 2);
assert.equal(tags.getTagStacks(projected, '木'), 1);
engine.refreshProjectionPassives(out.battle, projected, {});
assert.equal(tags.getTagStacks(projected, '木'), 1);
out.battle.summonMeta ||= { serial: 0 };
const summoned = engine.createSummonUnit(out.battle, data.npc_data.敌甲, '新召唤物', 'ally');
engine.prepareSummon(out.battle, summoned, out.data);
assert.equal(tags.getTagStacks(summoned, '木'), 1);
engine.prepareSummon(out.battle, summoned, out.data);
assert.equal(tags.getTagStacks(summoned, '木'), 1);
console.log('3/4 pure tag queries, exact modifiers, native AOE and sourced original report markers passed');

const timed = { name: '旧档', tags: ['旧标签', { name: '期限', stacks: 1, duration: 2 }] };
const lifecycle = { round: 1, log: [] };
tags.tick([timed, timed], lifecycle);
assert.equal(tags.getTagDuration(timed, '期限'), 1);
const once = JSON.stringify(timed);
tags.tick([timed], structuredClone(lifecycle));
assert.equal(JSON.stringify(timed), once);
lifecycle.round++;
tags.tick([timed], lifecycle);
assert.equal(tags.hasTag(timed, '期限'), false);
assert.throws(() => tags.tick([timed], { round: 3, tagLifecycle: { version: 9 } }));
assert.equal(tags.add(timed, '坏值', Infinity, 1), false);
assert.equal(tags.add(timed, '__proto__', 1, 1), false);
tags.applySkill(timed, timed, { applyTags: [{ name: '坏值', duration: NaN }] }, true);
assert.equal(tags.hasTag(timed, '坏值'), false);
console.log('4/4 legacy reads, deduplicated round expiry, reload idempotency and invalid-input guards passed');
