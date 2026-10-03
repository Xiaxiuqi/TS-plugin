(() => {
  'use strict';
  const KEY = 'cryptLord.battleTeamConditions';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const selector = modules['cryptLord.battleConditionalParams'];
  if (!selector) throw Error(`[${KEY}] conditional selector unavailable`);
  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const has = skill => Boolean((skill?.conditionalParams || skill?.条件参数集)?.length);
  function view(battle, actor) {
    const formulas = modules['cryptLord.battleFormulas'];
    return { ...actor, power: battle.formulas && formulas
      ? formulas.attribute(battle, actor, 'attack') : actor.power,
      conditionDefense: battle.formulas && formulas
        ? formulas.attribute(battle, actor, 'defense') : actor.maxHp,
      conditionSpeed: actor.agility, level: actor.level ?? actor.divinity ?? 1 };
  }
  function effective(battle, actor, choice, skill) {
    const formulas = battle.formulas && modules['cryptLord.battleFormulas'];
    const strength = raw => Math.max(0, formulas ? formulas.strength(raw, actor) : number(raw));
    const heal = strength(skill.healAmt ?? skill.治疗量);
    const isHeal = skill.isHeal == null ? heal > 0 : skill.isHeal === true;
    const range = skill.range ?? skill.射程 ?? choice.range;
    return { ...choice, skill, power: strength(skill.power ?? skill.威力 ?? skill.伤害),
      heal: isHeal ? heal : 0, isHeal, healStat: skill.healType || choice.healStat,
      healValueType: skill.healValueType || choice.healValueType,
      damageType: skill.damageType || skill.伤害类型 || choice.damageType,
      range: ['global', '全图', '无限'].includes(range) ? Infinity :
        typeof range === 'object' ? number(range.max, choice.range) : number(range, choice.range),
      radius: Math.max(0, Math.floor(number(skill.aoeRadius ?? skill.范围半径 ??
        skill.爆炸半径, choice.radius ?? 2))) };
  }
  function session(battle, actor, choice, random) {
    const rolls = new Map();
    let caster = { ...actor, [choice.costKey || 'spirit']:
      Math.max(0, actor[choice.costKey || 'spirit'] - choice.cost) };
    const select = target => {
      const recipient = target || caster;
      if (!rolls.has(recipient.id)) rolls.set(recipient.id,
        Math.max(0, Math.min(.999999999, number(random()))));
      return selector.select(choice.skill, view(battle, caster), view(battle, recipient),
        rolls.get(recipient.id));
    };
    return {
      select: target => effective(battle, caster, choice, select(target)),
      bind: actor => { caster = actor; },
      rolls: () => Object.fromEntries([...rolls].map(([id, value]) => [id, Math.floor(value * 100) + 1])),
    };
  }
  function recipients(battle, actor, center, choice, interference) {
    if (interference && !interference.targets.length) return [];
    if (choice.targetType === 'self') return [actor];
    if (!['all', 'allEnemies', 'allAlly', 'allAllies'].includes(choice.targetType)) return [center];
    const ally = ['allAlly', 'allAllies'].includes(choice.targetType);
    const side = interference?.forceSide
      ? interference.forceSide === 'ally' ? actor.side : actor.side === 'ally' ? 'enemy' : 'ally'
      : ally ? actor.side : actor.side === 'ally' ? 'enemy' : 'ally';
    return battle.units.filter(unit => unit.hp > 0 && !unit.offField && !unit.activeLeaving &&
      unit.side === side && (!interference?.excludeSelf || unit !== actor) &&
      Math.max(Math.abs(unit.x - center.x), Math.abs(unit.y - center.y)) <= choice.radius);
  }
  function blockReason(battle, actor, choice, center, selected) {
    const bribes = modules['cryptLord.battleBribery'];
    if (!bribes) return '';
    const protectedTargetsExist = battle.units.some(target => bribes.blockReason(battle, actor,
      { ...choice, heal: 0, range: 1, targetType: 'single' }, target));
    if (!protectedTargetsExist) return '';
    const circle = selected.select(center);
    const selfArea = choice.range === 0 &&
      ['all', 'allEnemies'].includes(choice.targetType);
    if (!selfArea) return bribes.blockReason(battle, actor, { ...circle,
      heal: circle.isHeal ? Math.max(1, circle.heal) : 0, range: choice.range }, center);
    const attacked = recipients(battle, actor, center, circle)
      .filter(target => !selected.select(target).isHeal);
    const protectedTargets = attacked.filter(target => bribes.blockReason(battle, actor,
      { ...choice, targetType: 'single', range: 1, heal: 0 }, target));
    return protectedTargets.length && protectedTargets.length === attacked.length
      ? '本次条件范围攻击只能伤及贿赂魅惑的发动者，请选择其他行动。' : '';
  }
  const api = { has, session, recipients, blockReason, effective,
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
