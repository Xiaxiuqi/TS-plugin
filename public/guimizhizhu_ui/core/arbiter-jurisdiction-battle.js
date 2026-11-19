(() => {
  'use strict';
  const KEY = 'cryptLord.arbiterJurisdictionBattle';
  const root = window.cryptLord, modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const runtime = (data, battle, pool, personal = false) =>
    modules['cryptLord.shamanTerritoryBattle'].runtime(data, battle, pool, personal,
      'cryptLord.arbiterJurisdictionReference', 'jurisdictionEffect');
  function section(data, battle, pool, personal = false) {
    const rt = runtime(data, structuredClone(battle), pool, personal);
    const { cases } = rt.battle.collect(rt.bm);
    return cases.length ? rt.battle.promptSection(cases) : '';
  }
  function applyTeam(data, battle, pool, plan) {
    if (battle.jurisdictionMeta?.applied) return false;
    const rt = runtime(data, battle, pool), { cases, blocked } = rt.battle.collect(rt.bm);
    if (!cases.length && !blocked.length) return false;
    rt.battle.apply(rt.bm, cases, rt.battle.parse(plan, cases), blocked);
    battle.jurisdictionMeta = { version: 1, applied: true };
    return true;
  }
  function applyPersonal(data, plan) {
    const battle = data?.cryptLord?.personalBattle;
    if (!battle || battle.jurisdictionMeta?.applied) return false;
    const rt = runtime(data, battle, battle.player.picturePool || { pathways: {} }, true);
    const { cases, blocked } = rt.battle.collect(rt.bm);
    if (!cases.length && !blocked.length) return false;
    const parsed = rt.battle.parse(plan, cases), effects = { player: null, npc: null };
    for (const row of blocked) rt.bm.battleLogger.log(`${row.hero.name}的辖区不生效：${row.reason}`, 'warning');
    for (const row of cases) {
      const verdict = parsed.get(row.id);
      if (!verdict) { rt.bm.battleLogger.log(`${row.hero.name}的辖区判定缺失，本场无加成。`, 'warning'); continue; }
      if (verdict.place !== '辖区外') effects[row.kind === 'player' ? 'player' : 'npc'] = {
        type: 'buff', power: verdict.place === '正式任命辖区' ? 50 : 25, label: verdict.place };
    }
    modules['cryptLord.arbiterJurisdiction'].applyBattle(battle, effects);
    battle.jurisdictionMeta = { version: 1, applied: true };
    return true;
  }
  const api = { section, applyTeam, applyPersonal,
    strip: actor => modules['cryptLord.shamanTerritoryBattle'].strip(actor, 'jurisdictionEffect'),
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
