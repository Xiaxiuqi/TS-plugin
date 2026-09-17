(() => {
  'use strict';
  const KEY = 'cryptLord.gameContextProviders';
  const BUILDER_KEY = 'cryptLord.contextBuilder';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  function mapProvider({ state }) {
    const map = window.GameDBManager?.DB?.mapData;
    const stat = state?.stat_data;
    if (!map?.mainRegions || !map?.landmarks || !stat) return null;
    const regions = map.mainRegions.map(region => {
      const points = region.points?.outer || [];
      const xs = points.map(point => Number(point.x)).filter(Number.isFinite);
      const ys = points.map(point => Number(point.y)).filter(Number.isFinite);
      if (!xs.length || !ys.length) return region.name;
      return `${region.name}（中心坐标：(${((Math.min(...xs) + Math.max(...xs)) / 2).toFixed(2)}, ${((Math.min(...ys) + Math.max(...ys)) / 2).toFixed(2)}）`;
    });
    const landmarks = map.landmarks.map(item => `${item.name}（属于${item.mainRegionName || '未知区域'}）`);
    const location = stat['当前坐标'] || {};
    return { role: 'system', position: 'in_chat', depth: 8, should_scan: false, content: `<地图地理总览>大型区域：${regions.join('、')}。知名地标：${landmarks.join('、')}。区域间移动必须符合地理逻辑并正确消耗时间。</地图地理总览>\n<当前空间情景>区域：${stat['当前区域'] || '未知'} / ${stat['当前地标'] || '未知'}；坐标：(${Number(location.x || 50).toFixed(2)}, ${Number(location.y || 50).toFixed(2)})。</当前空间情景>` };
  }

  function directivesProvider({ state }) {
    const db = window.GameDBManager;
    if (!state?.stat_data || typeof db?.getDirectiveByNameAndScope !== 'function') return null;
    const directives = [];
    const collect = (statuses, name, isNpc) => Object.keys(statuses || {}).forEach(key => {
      const match = key.match(/^\[.*?\](.*)$/);
      if (!match) return;
      const rule = db.getDirectiveByNameAndScope(match[1].trim(), isNpc);
      if (rule) directives.push(`- [${name === 'Player' ? '<User>' : name}] ${rule}`);
    });
    collect(state.stat_data.当前状态, 'Player', false);
    Object.entries(state.npc_data || {}).forEach(([name, data]) => collect(data?.当前状态, name, true));
    return directives.length ? { role: 'system', position: 'in_chat', depth: 4, should_scan: true, content: `[系统指令]\n${directives.join('\n')}` } : null;
  }

  let unregister = [];
  const api = Object.freeze({ status() { return Object.freeze({ key: KEY, ready: true, providers: Object.freeze(['map', 'system-directives']) }); }, dispose() { unregister.forEach(stop => stop()); unregister = []; try { contract.releaseGlobal(KEY, api); } catch {} if (modules[KEY] === api) delete modules[KEY]; return true; } });
  modules[KEY] = api;
  contract.waitGlobalInitialized(BUILDER_KEY, { timeoutMs: 10000 }).then(builder => { unregister = [builder.register('map', mapProvider, 20), builder.register('system-directives', directivesProvider, 40)]; contract.initializeGlobal(KEY, api); }).catch(error => { if (modules[KEY] === api) delete modules[KEY]; console.error(`[${KEY}] 注册上下文提供者失败`, error); });
})();
