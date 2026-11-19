(() => {
  'use strict';
  const KEY = 'cryptLord.geographicContext';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (!contract) throw Error('地理上下文依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  let disposed = false, epoch = 0, injection = null, unregister = null, nativeReady = false;
  const subscriptions = [];
  // BEGIN ORIGINAL GEOGRAPHIC RULES
  function originalRules(GameDBManager, document) {
    const MapEarthTool = {
  // 地球级比例尺配置（常量）
  EARTH_CONFIG: {
  mapScaleKm: 40075, // 地球赤道周长（地图横向对应赤道）
  earthTotalArea: 510072000 // 地球总表面积(km²)，用于校验
  },
  // 计算区域实际面积
  calculatePolygonArea: (pointsData) => {
  let points = [];
  // 兼容不同格式的points数据
  if (pointsData?.outer) {
    points = pointsData.outer;
  } else if (Array.isArray(pointsData) && pointsData[0]?.outer) {
    points = pointsData[0].outer;
  } else if (Array.isArray(pointsData)) {
    points = pointsData;
  }
  if (points.length < 3) return 0;

  // 鞋带公式计算百分比面积
  const area = points.reduce((acc, p1, i) => {
    const p2 = points[(i + 1) % points.length];
    return acc + (p1.x * p2.y - p2.x * p1.y);
  }, 0);
  const percentageArea = Math.abs(area / 2);

  // 获取地图宽高比
  const mapImg = document.getElementById('map-image');
  const aspectRatio = mapImg && mapImg.naturalWidth > 0 && mapImg.naturalHeight > 0
    ? mapImg.naturalHeight / mapImg.naturalWidth
    : 7400 / 3800; // 地图原始宽高比

  // 换算成地球级实际面积
  const { mapScaleKm } = MapEarthTool.EARTH_CONFIG;
  return (percentageArea / (100 * 100)) * mapScaleKm * (mapScaleKm / aspectRatio);
  }
};
    const manager = {_assembleMapContext(stat_data) {
  if (!stat_data) return { mapOverview: "", spatialContextBlock: "" };

  // 🌟 从全局 DB 安全获取数据
  const mapData = GameDBManager.DB.mapData;
  if (!mapData || !mapData.mainRegions || !mapData.landmarks) {
    return { mapOverview: "<地图地理总览>数据加载中...</地图地理总览>", spatialContextBlock: "" };
  }

  // 1. 提取区域中心坐标
  const regionWithCenter = mapData.mainRegions.map((region) => {
    const xs = region.points.outer.map((p) => p.x);
    const ys = region.points.outer.map((p) => p.y);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
    return `${region.name}（中心坐标：(${centerX.toFixed(2)}, ${centerY.toFixed(2)})）`;
  });

  // 2. 提取地标精确坐标
  const landmarkWithCoord = mapData.landmarks.map((landmark) => {
    const landX = parseFloat(landmark.marker.left);
    const landY = parseFloat(landmark.marker.top) * (this.Y_SCALE || 1); // 兼容缩放
    return `${landmark.name}（坐标：(${landX.toFixed(2)}, ${landY.toFixed(2)})，属于${landmark.mainRegionName}）`;
  });

  const mapOverview = `
  <地图地理总览>
  - 大型区域（含中心坐标）：${regionWithCenter.join("、")}（神弃之地与西大陆为与世隔绝状态）
  - 知名地标：${landmarkWithCoord.join("、")}
  - 地理规则：区域间移动需符合地理逻辑（如南北大陆隔狂暴海相望，正常情况下需要坐船等交通工具），移动消耗的时间得正确更新，没有使用超凡手段下从一个城市移动到另一个城市应该经过漫长时间
  </地图地理总览>`;

  // 3. 玩家位置与面积计算
  const playerLocation = {
    区域: stat_data["当前区域"] || "未知",
    地标: stat_data["当前地标"] || "未知",
    坐标: stat_data["当前坐标"] || { x: 50.0, y: 50.0 },
  };

  let areaString = "未知";
  const playerRegion = mapData.mainRegions.find(
    (r) => r.name === playerLocation.区域 || r.name === playerLocation.地标
  );
  if (playerRegion) {
    const regionArea = MapEarthTool.calculatePolygonArea(playerRegion.points);
    areaString = `约 ${regionArea.toLocaleString()} km²`;
  }

  const spatialContextBlock = `
  <当前空间情景>
  【地图参考：本地图总宽度约为${MapEarthTool.EARTH_CONFIG.mapScaleKm}公里（与地球赤道周长一致）。坐标系为百分比制，(0,0)在左上角。如果有移动，请按照合理的数据继续修改，百分比小于百分之一的移动可忽略】
  - **玩家的位置**:
    - 区域: ${playerLocation.区域} / ${playerLocation.地标}
    - 坐标: (${playerLocation.坐标.x.toFixed(2)}, ${playerLocation.坐标.y.toFixed(2)})
    - 区域面积: ${areaString}
  </当前空间情景>`;

  return { mapOverview, spatialContextBlock };
}};
    return { assemble: manager._assembleMapContext, area: MapEarthTool.calculatePolygonArea };
  }
  // END ORIGINAL GEOGRAPHIC RULES
  const usable = guard => {
    if (disposed || guard && !guard()) throw Error('地理上下文读取已取消');
  };
  function imageSize() {
    const document = modules['cryptLord.afterNativeHost']?.getHost()?.document;
    const image = document?.querySelector('.crypt-lord-world-map__image[alt="世界地图"]') ||
      document?.getElementById('map-image');
    return image && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
      ? { naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight } : null;
  }
  function assemble(stat, data, size = null) {
    usable();
    if (!stat || typeof stat !== 'object' || Array.isArray(stat)) return null;
    const map = modules['cryptLord.worldMapState'];
    if (!map) throw Error('地图规则模块不可用');
    const normalized = map.normalize(data);
    const copy = structuredClone(stat);
    if (copy.当前坐标) {
      const coordinate = copy.当前坐标;
      if ([coordinate.x, coordinate.y].some(value => value === null || value === '' ||
        !Number.isFinite(Number(value)))) throw Error('原生楼层的当前坐标无效');
      copy.当前坐标 = { ...coordinate, x: Number(coordinate.x), y: Number(coordinate.y) };
    }
    const validSize = size && [size.naturalWidth, size.naturalHeight].every(value => Number.isFinite(value) && value > 0);
    const rules = originalRules({ DB: { mapData: normalized } }, { getElementById: () => validSize ? size : null });
    return rules.assemble.call({ Y_SCALE: map.yScale }, copy);
  }
  async function provide({ state, guard, native, reader, target } = {}) {
    usable(guard);
    if (!state?.stat_data) return null;
    reader ||= modules['cryptLord.nativeFloorSource'];
    if (!reader) throw Error('原生楼层来源服务尚未加载');
    native ||= await reader.read(guard);
    target ||= source(native.rows).target;
    const map = modules['cryptLord.worldMapState'];
    const owned = () => {
      usable(guard);
      if (modules['cryptLord.nativeFloorSource'] !== reader || modules['cryptLord.worldMapState'] !== map)
        throw Error('地理上下文来源服务已变化');
      return reader.assertIdentity(native, guard);
    };
    owned();
    if (!target || target.is_hidden || !native.rows.includes(target) ||
      reader.signature(target.data?.stat_data) !== reader.signature(state.stat_data))
      throw Error('地理来源楼层已变化，本次不使用旧位置');
    const stat = structuredClone(target.data.stat_data);
    if (!map) throw Error('地图规则模块不可用');
    const loaded = await map.load(owned), finalRules = await map.load(owned);
    owned();
    if (loaded.revision !== finalRules.revision) throw Error('地图配置在请求期间已变化');
    const blocks = assemble(stat, loaded.data, imageSize());
    await reader.assert(native, owned);
    owned();
    return blocks ? { role: 'system', position: 'in_chat', depth: 8, should_scan: false,
      content: `${blocks.spatialContextBlock}\n${blocks.mapOverview}` } : null;
  }
  function reset() {
    epoch++;
    const current = injection; injection = null;
    current?.uninject();
  }
  function source(messages, type) {
    if (!Array.isArray(messages)) throw Error('地理来源楼层不可读取');
    const rows = messages.filter(row => Number.isInteger(row?.message_id)).sort((a, b) => a.message_id - b.message_id);
    const last = rows.at(-1);
    const rewrite = ['swipe', 'regenerate'].includes(type) && last?.role === 'assistant';
    if (rows.filter(row => row.role === 'assistant').at(-1)?.is_hidden) throw Error('最新地理来源楼层已隐藏');
    const target = rows.filter(row => row.role === 'assistant' && (!rewrite || row.message_id < last.message_id)).at(-1);
    if (target?.is_hidden) throw Error('地理来源楼层已隐藏');
    return { target };
  }
  async function beforeGeneration(type, options, dryRun) {
    if (disposed || dryRun || options?.dryRun || type === 'quiet' || options?.quiet_prompt) return;
    reset();
    if (!['normal', 'regenerate', 'swipe', 'continue', 'append', '', undefined, null].includes(type)) return;
    // Owned helper requests already carry the context builder's map injection.
    if (modules['cryptLord.nativeFloor']?.hasActiveTurn()) return;
    const token = epoch, guard = () => !disposed && epoch === token;
    try {
      const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
      usable(guard);
      const reader = modules['cryptLord.nativeFloorSource'];
      if (!reader) throw Error('原生楼层来源服务尚未加载');
      const native = await reader.read(guard), original = source(native.rows, type);
      usable(guard);
      if (!original.target?.data?.stat_data) return;
      const prompt = await provide({ state: original.target.data, guard, native, reader, target: original.target });
      usable(guard);
      await reader.assert(native, guard);
      reader.assertIdentity(native, guard);
      if (modules['cryptLord.hostApi'] !== host || modules['cryptLord.nativeFloorSource'] !== reader)
        throw Error('地理上下文来源服务已变化');
      injection = host.injectPrompts([{ ...prompt, id: 'cryptLord.geography.native' }], { once: true });
    } catch (error) {
      if (guard()) console.warn(`[${KEY}] 本次未注入地理上下文，原生生成仍按原有上下文继续`, error);
    }
  }
  async function install() {
    const builder = await contract.waitGlobalInitialized('cryptLord.contextBuilder', { timeoutMs: 10000 });
    usable();
    unregister = builder.register('map', async context => {
      const token = epoch;
      try { return await provide({ ...context, guard: () => !disposed && epoch === token && (!context.guard || context.guard()) }); }
      catch (error) {
        if (!disposed && epoch === token) console.warn(`[${KEY}] 地理提示读取失败，本次不使用旧地图`, error);
        return null;
      }
    }, 20);
    const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents();
    if (events?.GENERATION_AFTER_COMMANDS && events.CHAT_CHANGED && events.GENERATION_STOPPED && events.GENERATION_ENDED) {
      for (const [name, handler] of [[events.GENERATION_AFTER_COMMANDS, beforeGeneration],
        [events.CHAT_CHANGED, reset], [events.GENERATION_STOPPED, reset], [events.GENERATION_ENDED, reset]]) {
        const subscription = after.bindEvent(name, handler);
        if (!subscription?.stop) throw Error('地理提示事件绑定失败');
        subscriptions.push(subscription);
      }
      nativeReady = true;
    }
    usable();
    contract.initializeGlobal(KEY, api);
  }
  const api = Object.freeze({
    status: () => ({ key: KEY, ready: !disposed && Boolean(unregister), nativeReady }),
    assemble, provide,
    area(points, size = null) {
      usable();
      const rules = originalRules({ DB: {} }, { getElementById: () => size });
      const result = rules.area(points);
      if (!Number.isFinite(result) || result < 0) throw Error('区域面积数据无效');
      return result;
    },
    dispose() {
      disposed = true; reset(); unregister?.(); unregister = null;
      subscriptions.splice(0).forEach(subscription => subscription.stop()); nativeReady = false;
      contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  void install().catch(error => {
    if (!disposed) { api.dispose(); console.error(`[${KEY}] 地理上下文注册失败`, error); }
  });
})();
