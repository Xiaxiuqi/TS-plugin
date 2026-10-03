(() => {
  'use strict';
  const KEY = 'cryptLord.battleFormulas';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] contract unavailable`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const MAX = Number.MAX_SAFE_INTEGER;
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const finite = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isNaN(n) ? fallback : Math.max(-MAX, Math.min(MAX, n));
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, finite(value)));
  const divide = (a, b) => finite(a) / Math.max(1, Math.abs(finite(b)));
  const power = (base, exponent) => finite(Math.pow(Math.max(0, finite(base)), exponent), MAX);
  const round = (value, mode = 'floor') => mode === 'ceil' ? Math.ceil(finite(value))
    : mode === 'round' ? Math.round(finite(value)) : Math.floor(finite(value));
  const sources = ['constant1', 'divinity', 'currentVitality', 'currentAgility',
    'currentSpirit', 'currentSanity', 'currentHumanity', 'luck', 'maxVitality',
    'maxAgility', 'maxSpirit', 'maxSanity', 'maxHumanity', 'maxCurrent', 'minCurrent',
    'avgCurrent', 'maxMaximum', 'minMaximum', 'avgMaximum', 'physicalPair', 'mentalPair'];
  const atoms = Object.create(null);
  const number = (id, value, min, max, step = .05) => {
    atoms[id] = { id, type: 'number', defaultValue: value, min, max, step };
  };
  const enumeration = (id, value, options) => {
    atoms[id] = { id, type: 'enum', defaultValue: value, options };
  };
  const source = (id, value, derived = false) =>
    enumeration(id, value, derived ? [...sources, 'derivedAttack', 'derivedDefense'] : sources);
  const rounding = id => enumeration(id, 'floor', ['floor', 'round', 'ceil']);
  const randomCatalog = (family, mode = 'uniform') => {
    enumeration(`${family}.randomMode`, mode, ['uniform', 'none']);
    number(`${family}.randomMin`, .9, 0, 2);
    number(`${family}.randomMax`, 1.1, 0, 2);
  };
  const modifierCatalog = family => enumeration(`${family}.modifierMode`, 'additive',
    ['additive', 'multiplicative', 'maxAbs']);
  for (const kind of ['attack', 'defense']) {
    for (const [type, value] of Object.entries({
      physical: 'physicalPair', mystical: 'currentSpirit', mental: 'mentalPair', mixed: 'luck',
    })) source(`${kind}.${type}Source`, value);
    source(`${kind}.referenceSource`, 'maxCurrent');
    number(`${kind}.specificWeight`, .4, 0, 2);
    number(`${kind}.referenceWeight`, .6, 0, 2);
    enumeration(`${kind}.combine`, 'add', ['add', 'subtract']);
    rounding(`${kind}.rounding`);
  }
  for (const stat of ['attack', 'defense', 'speed']) {
    enumeration(`modifiers.${stat}Percentage`, 'normal', ['normal', 'reversed']);
    enumeration(`modifiers.${stat}Fixed`, 'normal', ['normal', 'reversed']);
    enumeration(`modifiers.${stat}Order`, 'percentThenFixed', ['percentThenFixed', 'fixedThenPercent']);
  }
  for (const family of ['damage', 'accuracyDamage']) {
    source(`${family}.attackSource`, 'derivedAttack', true);
    source(`${family}.defenseSource`, 'derivedDefense', true);
    enumeration(`${family}.ratioDirection`, 'attackOverDefense', ['attackOverDefense', 'defenseOverAttack']);
    number(`${family}.ratioExponent`, family === 'damage' ? 1 : 0, 0, 2);
    number(`${family}.divinityExponent`, 1, 0, 2);
    randomCatalog(family);
    modifierCatalog(family);
    enumeration(`${family}.punishmentMode`, 'final', ['final', 'merged', 'ignore']);
    rounding(`${family}.rounding`);
  }
  enumeration('damage.divinitySource', 'divinity', ['divinity', 'constant1']);
  number('damage.powerScale', 1, 0, 2);
  number('damage.powerExponent', 1, 0, 1);
  number('accuracyDamage.fixedScale', 1, 0, 2);
  for (const family of ['damage', 'healing']) {
    number(`${family}.tagMin`, -.75, -1, 0);
    number(`${family}.tagMax`, 1.5, 0, 3);
  }
  source('accuracy.attackerSource', 'currentAgility', true);
  source('accuracy.defenderSource', 'maxCurrent', true);
  enumeration('accuracy.direction', 'attacker', ['attacker', 'defender']);
  number('accuracy.curveExponent', 1, 0, 2);
  number('accuracy.contestMultiplier', 1.2, 0, 3);
  for (const [name, value] of Object.entries({ Shotgun: 1.2, Pistol: 1.6, Rifle: 2, Sniper: 2.4 }))
    number(`accuracy.coef${name}`, value, 0, 4);
  number('accuracy.distanceDecay', .4, 0, 1);
  number('accuracy.minChance', .05, 0, 1, .01);
  number('accuracy.maxChance', .95, 0, 1, .01);
  enumeration('healing.basis', 'targetMax',
    ['targetMax', 'targetMissing', 'healerMax', 'healerCurrent', 'targetCurrent']);
  enumeration('healing.fixedMode', 'raw', ['raw', 'scaled']);
  number('healing.scale', 1, 0, 2);
  modifierCatalog('healing');
  randomCatalog('healing', 'none');
  rounding('healing.rounding');
  source('initiative.source', 'currentAgility');
  enumeration('initiative.useSpeedEffects', 'yes', ['yes', 'no']);
  randomCatalog('initiative');
  enumeration('initiative.direction', 'highFirst', ['highFirst', 'lowFirst']);
  enumeration('initiative.tie', 'random', ['random', 'stable']);
  for (const [name, value] of Object.entries({ base: 4, seqLow: 0, seqMid: 1,
    seqHigh: 2, min: 3, max: 7 })) number(`movement.${name}`, value, 0, 12, 1);
  enumeration('movement.seqDirection', 'add', ['add', 'subtract']);
  source('movement.relativeSource', 'currentAgility');
  number('movement.curveCoefficient', 2, 0, 4);
  enumeration('movement.relativeDirection', 'add', ['add', 'subtract']);
  enumeration('movement.rounding', 'round', ['floor', 'round', 'ceil']);
  enumeration('movement.order', 'default', ['default', 'preClamp', 'postClamp']);
  const groups = [
    ...['damage', 'accuracyDamage', 'healing', 'initiative'].map(f =>
      [`${f}.randomMin`, `${f}.randomMax`]),
    ['accuracy.minChance', 'accuracy.maxChance'], ['damage.tagMin', 'damage.tagMax'],
    ['healing.tagMin', 'healing.tagMax'], ['movement.min', 'movement.max'],
  ];
  function validate(id, input) {
    const atom = atoms[id];
    if (!atom) return { ok: false, error: '未知公式原子。' };
    if (atom.type === 'enum') return atom.options.includes(input)
      ? { ok: true, value: input } : { ok: false, error: '公式选项无效。' };
    const n = Number(input);
    const units = (n - atom.min) / atom.step;
    if (input == null || String(input).trim() === '' || !Number.isFinite(n) ||
      n < atom.min || n > atom.max ||
      Math.abs(units - Math.round(units)) > 1e-9 * Math.max(1, Math.abs(units)))
      return { ok: false, error: '公式数值越界或步长不符。' };
    return { ok: true, value: n };
  }
  function initialize(seed, overrides = {}) {
    const values = {};
    for (const [id, input] of Object.entries(record(overrides) ? overrides : {})) {
      const parsed = validate(id, input);
      if (!parsed.ok) throw new Error(`${id}: ${parsed.error}`);
      values[id] = parsed.value;
    }
    for (const [lo, hi] of groups)
      if ((values[lo] ?? atoms[lo].defaultValue) > (values[hi] ?? atoms[hi].defaultValue))
        throw new Error(`公式下界不能大于上界：${lo}`);
    const pathways = window.GameDBManager?.DB?.godPathways;
    return { version: 1, seed: (Number(seed) >>> 0) || 0x6d2b79f5, values,
      pathways: record(pathways) ? structuredClone(pathways) : {},
      agilityThresholds: [0, .29, .49, .79] };
  }
  function draw(battle) {
    let x = battle.formulas.seed >>> 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    battle.formulas.seed = x >>> 0;
    return (x >>> 0) / 4294967296;
  }
  function candidates(battle, id) {
    const laws = (battle?.fundamentalRules?.laws || []).filter(law => !law.removed &&
      battle.round >= law.startRound && battle.round <= law.endRound &&
      battle.units.some(actor => actor.id === law.sourceHeroId && actor.hp > 0));
    const result = laws.flatMap(law => {
      const mutation = (law.mutations || []).find(row => row.atomId === id);
      const parsed = mutation && validate(id, mutation.value);
      return parsed?.ok ? [{ value: parsed.value, serial: finite(law.serial), default: false }] : [];
    }).sort((a, b) => b.serial - a.serial);
    const saved = battle?.formulas?.values?.[id];
    result.push({ value: saved != null && validate(id, saved).ok ? saved : atoms[id].defaultValue,
      serial: -1, default: true });
    return result;
  }
  function value(battle, id) {
    if (!atoms[id]) throw new Error(`未知公式原子：${id}`);
    const group = groups.find(pair => pair.includes(id));
    if (!group) return candidates(battle, id)[0].value;
    const lists = group.map(key => candidates(battle, key)), indexes = [0, 0];
    for (let guard = 0; guard < 64; guard++) {
      const picks = lists.map((list, i) => list[indexes[i]]);
      if (picks[0].value <= picks[1].value) return picks[group.indexOf(id)].value;
      const next = picks.map((pick, i) => ({ pick, i }))
        .filter(row => !row.pick.default && indexes[row.i] < lists[row.i].length - 1)
        .sort((a, b) => b.pick.serial - a.pick.serial)[0];
      if (!next) break;
      indexes[next.i]++;
    }
    return atoms[id].defaultValue;
  }
  function sourceValue(id, actor, derived = {}) {
    const current = [actor.hp, actor.agility, actor.spirit, actor.sanity, actor.humanity,
      actor.luck].map(v => finite(v));
    const maximum = [actor.maxHp, actor.maxAgility, actor.maxSpirit, actor.maxSanity,
      actor.maxHumanity, actor.luck].map(v => finite(v));
    const map = {
      constant1: 1, divinity: actor.divinity ?? 1, currentVitality: actor.hp,
      currentAgility: actor.agility, currentSpirit: actor.spirit, currentSanity: actor.sanity,
      currentHumanity: actor.humanity, luck: actor.luck, maxVitality: actor.maxHp,
      maxAgility: actor.maxAgility, maxSpirit: actor.maxSpirit, maxSanity: actor.maxSanity,
      maxHumanity: actor.maxHumanity, maxCurrent: Math.max(...current), minCurrent: Math.min(...current),
      avgCurrent: current.reduce((a, b) => a + b, 0) / 6,
      maxMaximum: Math.max(...maximum), minMaximum: Math.min(...maximum),
      avgMaximum: maximum.reduce((a, b) => a + b, 0) / 6,
      physicalPair: (finite(actor.hp) + finite(actor.agility)) / 2,
      mentalPair: (finite(actor.sanity) + finite(actor.humanity)) / 2,
      derivedAttack: derived.attack, derivedDefense: derived.defense,
    };
    return finite(map[id]);
  }
  const resolveSource = (battle, id, actor, derived) =>
    sourceValue(value(battle, id), actor, derived);
  function factor(mode, values) {
    const nums = values.map(v => finite(v));
    if (mode === 'multiplicative') return finite(nums.reduce((a, b) => a * Math.max(0, 1 + b), 1));
    if (mode === 'maxAbs') return Math.max(0, 1 +
      nums.reduce((a, b) => Math.abs(b) > Math.abs(a) ? b : a, 0));
    return Math.max(0, 1 + nums.reduce((a, b) => a + b, 0));
  }
  function randomFactor(battle, family, random) {
    if (value(battle, `${family}.randomMode`) === 'none') return 1;
    const lo = value(battle, `${family}.randomMin`), hi = value(battle, `${family}.randomMax`);
    return lo + clamp(random(), 0, 1) * Math.max(0, hi - lo);
  }
  function modified(battle, actor, stat, base, context = {}) {
    const bribery = finite(context.briberyPercent);
    if (!actor.effects?.length && !bribery) return base;
    let pct = -bribery / 100, fixed = 0;
    for (const effect of actor.effects || []) {
      if (effect.stat !== stat || !['buff', 'debuff'].includes(effect.type)) continue;
      if (context.ignoreDefenseBuff && stat === 'defense' && effect.type === 'buff') continue;
      const amount = finite(effect.power) * (effect.type === 'buff' ? 1 : -1);
      if (effect.valueType === 'fixed') fixed += amount;
      else if (effect.valueType === 'percentage') pct += amount / 100;
    }
    if (value(battle, `modifiers.${stat}Percentage`) === 'reversed') pct *= -1;
    if (value(battle, `modifiers.${stat}Fixed`) === 'reversed') fixed *= -1;
    const result = value(battle, `modifiers.${stat}Order`) === 'fixedThenPercent'
      ? (base + fixed) * (1 + pct) : base * (1 + pct) + fixed;
    return Math.max(0, round(result, stat === 'speed' ? 'floor' : value(battle, `${stat}.rounding`)));
  }
  function attribute(battle, actor, kind, type = 'physical', context = {}) {
    type = ['physical', 'mystical', 'mental', 'mixed'].includes(type) ? type : 'physical';
    const a = resolveSource(battle, `${kind}.${type}Source`, actor) * value(battle, `${kind}.specificWeight`);
    const b = resolveSource(battle, `${kind}.referenceSource`, actor) * value(battle, `${kind}.referenceWeight`);
    const base = Math.max(0, round(value(battle, `${kind}.combine`) === 'subtract'
      ? a - b : a + b, value(battle, `${kind}.rounding`)));
    return modified(battle, actor, kind, base, context);
  }
  function tagModifier(battle, actor, target, skill, family) {
    const left = [...(actor.tags || []).map(row => typeof row === 'string' ? row : row.name),
      ...(skill.skillTags || skill.技能标签 || [])];
    const right = (target.tags || []).map(row => typeof row === 'string' ? row : row.name);
    const relations = battle.tagRules?.[family] || {};
    const matches = left.flatMap(from => right.flatMap(to =>
      relations[from]?.[to] == null ? [] : [finite(relations[from][to])]));
    const total = family === 'healing' ? factor(value(battle, 'healing.modifierMode'), matches) - 1
      : matches.reduce((a, b) => a + b, 0);
    return clamp(total, value(battle, `${family}.tagMin`), value(battle, `${family}.tagMax`));
  }
  const strength = (config, actor, fallback = 0) => record(config)
    ? finite(config[actor.rank] ?? config.default ?? config['9'], fallback) : finite(config, fallback);
  function damageModifier(actor, increase, decrease) {
    return (actor.effects || []).filter(row => row.valueType === 'percentage' &&
      ['buff', 'debuff'].includes(row.type)).reduce((sum, row) =>
      row.stat === increase ? sum + finite(row.power) / 100
        : row.stat === decrease ? sum - finite(row.power) / 100 : sum, 0);
  }
  function damage(battle, actor, target, skill, random = () => draw(battle), context = {}) {
    const bribery = modules['cryptLord.battleBribery'];
    const type = skill.damageType || 'physical';
    const family = skill.isAccuracyWeapon ? 'accuracyDamage' : 'damage';
    const attack = attribute(battle, actor, 'attack', type,
      { ...context, briberyPercent: bribery?.weakenPercent(battle, actor, target, 'attack') });
    const defense = attribute(battle, target, 'defense', type,
      { ...context, briberyPercent: bribery?.weakenPercent(battle, actor, target, 'defense') });
    const derived = { attack, defense };
    const a = resolveSource(battle, `${family}.attackSource`, actor, derived);
    const b = resolveSource(battle, `${family}.defenseSource`, target, derived);
    const ratio = power(value(battle, `${family}.ratioDirection`) === 'defenseOverAttack'
      ? divide(b, a) : divide(a, b), value(battle, `${family}.ratioExponent`));
    const base = skill.isAccuracyWeapon ? Math.max(0, finite(skill.fixedDamage)) *
      value(battle, 'accuracyDamage.fixedScale') : power(Math.max(0, strength(skill.power, actor, 1)) *
        value(battle, 'damage.powerScale'), value(battle, 'damage.powerExponent'));
    const divine = power(skill.isAccuracyWeapon ? actor.divinity ?? 1
      : sourceValue(value(battle, 'damage.divinitySource'), actor),
    value(battle, `${family}.divinityExponent`));
    const tag = tagModifier(battle, actor, target, skill, 'damage');
    const modifiers = [damageModifier(actor, 'damageDealtIncrease', 'damageDealtDecrease'),
      damageModifier(target, 'damageTakenIncrease', 'damageTakenDecrease'), tag];
    const punishment = Math.max(0, finite(skill.punishmentMultiplier, 1));
    const mode = value(battle, `${family}.punishmentMode`);
    if (mode === 'merged') modifiers.push(punishment - 1);
    const randomScale = randomFactor(battle, family, random);
    const amount = Math.max(0, round(base * ratio * divine * randomScale *
      factor(value(battle, `${family}.modifierMode`), modifiers) *
      (mode === 'final' ? punishment : 1), value(battle, `${family}.rounding`)));
    return { amount, attribute: type === 'mental' ? 'sanity' : 'hp', damageType: type,
      attack, defense, divinity: actor.divinity ?? 1, power: base, tag, randomScale,
      ...(context.ignoreDefenseBuff ? { ignoredDefenseBuff: true } : {}) };
  }
  const healingKeys = { 活力: ['hp', 'maxHp'], 敏捷: ['agility', 'maxAgility'],
    灵性: ['spirit', 'maxSpirit'], 理智: ['sanity', 'maxSanity'], 人性: ['humanity', 'maxHumanity'] };
  function healing(battle, actor, target, skill, random = () => draw(battle)) {
    const [key, max] = healingKeys[skill.healType] || healingKeys.活力;
    const basisMode = value(battle, 'healing.basis');
    const basis = basisMode === 'targetMissing' ? Math.max(0, target[max] - target[key])
      : basisMode === 'healerMax' ? actor[max] : basisMode === 'healerCurrent' ? actor[key]
        : basisMode === 'targetCurrent' ? target[key] : target[max];
    const heal = Math.max(0, strength(skill.healAmt, actor));
    const fixed = skill.healValueType === 'fixed';
    const base = fixed && value(battle, 'healing.fixedMode') === 'raw' ? heal : basis * heal;
    const roundingMode = value(battle, 'healing.rounding');
    const tag = tagModifier(battle, actor, target, skill, 'healing');
    const raw = Math.max(0, round(round(base * value(battle, 'healing.scale'), roundingMode) *
      (1 + tag) * randomFactor(battle, 'healing', random), roundingMode));
    return { amount: Math.max(0, Math.min(raw, target[max] - target[key])),
      attribute: key, raw, tag, basis };
  }
  const gates = { 仲裁人: 8, 窥秘人: 8, 怪物: 8, 不眠者: 8, 阅读者: 7,
    吝啬鬼: 7, 罪犯: 9, 战士: 9, 猎人: 9 };
  const titles = ['失序者', '知识之妖', '光之钥', '永恒之暗', '上帝', '欲望母树',
    '恶魔之父', '毁灭天灾', '第四支柱'];
  function contest(battle, actor) {
    const sequence = String(actor.sequence || '');
    if (sequence.includes('普通人')) return 1;
    const pure = value => String(value || '').replace(
      /^序列\s*[：:]?\s*\d+(?:\.\d+)?[-—\s]*/u, '').trim();
    const eligible = titles.some(title => sequence.includes(title)) ||
      sequence.split(/[/|，,;；与和及以及\s+&、]/u).some(fragment => {
        const match = fragment.match(/序列\s*[：:]?\s*(\d+(?:\.\d+)?)/);
        if (!match) return false;
        const library = Object.entries(battle.formulas.pathways || {}).find(([, entries]) =>
          Array.isArray(entries) && entries.some(entry => pure(entry) === pure(fragment)));
        const pathway = library?.[0]?.replace(/途径$/u, '').trim() ||
          String(actor.pathway || '').replace(/途径$/u, '').trim() || pure(fragment);
        return gates[pathway] != null && Number(match[1]) <= gates[pathway];
      });
    return eligible ? value(battle, 'accuracy.contestMultiplier') : 1;
  }
  function accuracy(battle, actor, target, skill, context = {}) {
    if (!skill.isAccuracyWeapon) return 1;
    const coef = { 霰弹枪级: 'Shotgun', 手枪级: 'Pistol', 步枪级: 'Rifle', 狙击枪级: 'Sniper' }[skill.accuracyTier];
    if (!coef) return 1;
    const bribery = modules['cryptLord.battleBribery'];
    const derived = { attack: attribute(battle, actor, 'attack', skill.damageType,
      { ...context, briberyPercent: bribery?.weakenPercent(battle, actor, target, 'attack') }),
      defense: attribute(battle, target, 'defense', skill.damageType,
        { ...context, briberyPercent: bribery?.weakenPercent(battle, actor, target, 'defense') }) };
    const a = resolveSource(battle, 'accuracy.attackerSource', actor, derived) * contest(battle, actor);
    const b = resolveSource(battle, 'accuracy.defenderSource', target, derived) * contest(battle, target);
    if (a + b <= 0) return 1;
    const exponent = value(battle, 'accuracy.curveExponent');
    const left = power(a, exponent), right = power(b, exponent);
    const base = divide(value(battle, 'accuracy.direction') === 'defender' ? right : left, left + right);
    const distance = Math.max(Math.abs(actor.x - target.x), Math.abs(actor.y - target.y));
    const reach = skill.range;
    const decay = Number.isFinite(reach) && reach > 1
      ? 1 - value(battle, 'accuracy.distanceDecay') * (Math.max(1, distance) - 1) / (reach - 1) : 1;
    return clamp(base * value(battle, `accuracy.coef${coef}`) * decay,
      value(battle, 'accuracy.minChance'), value(battle, 'accuracy.maxChance'));
  }
  function initiative(battle, random = () => draw(battle)) {
    const rows = battle.units.filter(row => row.hp > 0).map((actor, index) => {
      const base = resolveSource(battle, 'initiative.source', actor);
      const speed = value(battle, 'initiative.useSpeedEffects') === 'yes'
        ? modified(battle, actor, 'speed', base) : base;
      return { id: actor.id, index, speed: speed * randomFactor(battle, 'initiative', random) };
    });
    const low = value(battle, 'initiative.direction') === 'lowFirst';
    const stable = value(battle, 'initiative.tie') === 'stable';
    rows.sort((a, b) => (low ? a.speed - b.speed : b.speed - a.speed) ||
      (stable ? a.index - b.index : random() - .5));
    return rows.map(row => row.id);
  }
  function movement(battle, actor) {
    const id = value(battle, 'movement.relativeSource');
    const sorted = battle.units.map(row => sourceValue(id, row)).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length ? sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2 : 0;
    const relative = sourceValue(id, actor);
    const bonus = round(relative + median <= 0 ? 0 :
      value(battle, 'movement.curveCoefficient') * relative / (relative + median),
    value(battle, 'movement.rounding'));
    const rank = Number(actor.rank), seq = !Number.isFinite(rank) || rank >= 7 ? 'seqLow'
      : rank >= 3 ? 'seqMid' : 'seqHigh';
    const raw = value(battle, 'movement.base') + value(battle, `movement.${seq}`) *
      (value(battle, 'movement.seqDirection') === 'subtract' ? -1 : 1) +
      bonus * (value(battle, 'movement.relativeDirection') === 'subtract' ? -1 : 1);
    const bounded = n => clamp(n, value(battle, 'movement.min'), value(battle, 'movement.max'));
    const adjust = (base, env = true) => {
      let move = base + (env ? finite(actor.envMoveBonus) : 0);
      const thresholds = battle.formulas.agilityThresholds;
      const ratio = actor.maxAgility > 0 ? actor.agility / actor.maxAgility : 1;
      if (Array.isArray(thresholds) && thresholds.length === 4) {
        if (ratio <= thresholds[0]) move = 0;
        else if (ratio <= thresholds[1]) move = Math.min(move, 1);
        else if (ratio <= thresholds[2]) move = Math.min(move, 2);
        else if (ratio <= thresholds[3]) move = Math.round(move * .8);
      }
      move *= Math.max(0, 1 - Math.max(finite(actor.enemyControlMovePct),
        finite(actor.mindDepriveMovePct)) / 100);
      let fixed = 0, pct = 0;
      for (const effect of actor.effects || []) {
        if (effect.stat !== 'movement' || !['buff', 'debuff'].includes(effect.type)) continue;
        const n = Math.max(0, finite(effect.power)) * (effect.type === 'buff' ? 1 : -1);
        if (effect.valueType === 'fixed') fixed += n; else pct += n / 100;
      }
      return Math.max(0, Math.round(Math.max(0, move + fixed) * Math.max(0, 1 + pct)));
    };
    const order = value(battle, 'movement.order');
    const final = order === 'preClamp' ? bounded(adjust(raw))
      : order === 'postClamp' ? adjust(bounded(raw + finite(actor.envMoveBonus)), false)
        : adjust(bounded(raw));
    return actor.picturePersonImmobile ? 0 : clamp(round(final, value(battle, 'movement.rounding')), 0, 12);
  }
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, ready: true }),
    catalog: () => structuredClone(atoms), initialize, validate, value, draw, sourceValue,
    strength, factor, attribute, tagModifier, damage, healing, accuracy, initiative, movement,
    dispose() {
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
