(() => {
  'use strict';
  const KEY = 'cryptLord.battleAutoPilot';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const reference = modules['cryptLord.battleFieldEffectReference'];
  if (!reference?.createAutoPilot) throw Error('多人托管缺少原版 AutoPilotManager。');
  const original = reference.createAutoPilot({ loadSkillsFromCharacter: () => [] });
  const copy = value => structuredClone(value);
  const engine = () => modules['cryptLord.teamBattleState'];
  function initialize(battle) {
    for (const name of ['battleActionCpu', 'battleTacticCpu', 'battleAuras'])
      if (!modules[`cryptLord.${name}`]) throw Error(`多人托管缺少 ${name}，未进行结算。`);
    original.ensure(battle);
    battle.autoPilotMeta ||= { version: 1 };
  }
  function isOn(battle) { return Boolean(battle?.autoPilot?.on); }
  function drives(battle, actor) {
    if (!battle || !actor || !isOn(battle)) return false;
    return original.drives(battle, { controller: actor.controller || actor.source });
  }
  function autoAuras(battle, random) {
    const actor = battle.units.find(row => row.source === 'player' && !row.isSummon);
    if (!drives(battle, actor)) return;
    const auras = modules['cryptLord.battleAuras'];
    for (const row of auras.options(battle, actor))
      if (!row.active) auras.activate(battle, actor, row.subtype, random);
  }
  function skillsFor(moves) { return original.skillsFor({ moveSet: moves }); }
  function set(data, on) {
    const next = copy(data || {}), battle = next.cryptLord?.teamBattle;
    if (!battle || battle.status !== 'active') return { ok: false, error: '当前没有可托管的多人战斗。' };
    if (typeof on !== 'boolean') return { ok: false, error: '托管开关值无效。' };
    try {
      initialize(battle);
      if (isOn(battle) === on)
        return { ok: true, changed: false, data, battle: engine().get(data) };
      original.toggle(battle);
      if (on) autoAuras(battle, () => modules['cryptLord.battleFormulas'].draw(battle));
      battle.log.push({ at: Date.now(), round: battle.round, autoPilot: true,
        message: on ? '多人战斗托管已开启。' : '多人战斗托管已关闭。' });
      if (battle.log.length > 160) battle.log.shift();
      return { ok: true, data: next, battle: engine().get(next) };
    } catch (error) { return { ok: false, error: error.message }; }
  }
  function step(data, random) {
    const battle = data?.cryptLord?.teamBattle;
    if (!battle || battle.status !== 'active' || !isOn(battle))
      return { ok: false, error: '多人战斗托管已停止。' };
    try {
      initialize(copy(battle));
      if (battle.phase === 'tactic') return engine().tactic(data, 'skip', random, { autoPilot: true });
      const result = modules['cryptLord.battleActionCpu'].step(data, random, { autoPilot: true });
      return result.stopped ? { ok: false, error: '当前没有可托管的行动，已暂停。' } : result;
    } catch (error) { return { ok: false, error: error.message }; }
  }
  function finish(battle) {
    if (battle.autoPilot) battle.autoPilot.on = false;
  }
  const api = { initialize, isOn, drives, autoAuras, skillsFor, set, step, finish,
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
