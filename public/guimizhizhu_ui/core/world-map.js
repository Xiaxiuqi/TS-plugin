(() => {
  'use strict';
  const KEY = 'cryptLord.worldMapState';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (!contract) throw Error('地图规则依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  let disposed = false;
  const Y_SCALE = 51.35 / 100;
  const IMAGES = Object.freeze({
    main: 'https://files.catbox.moe/wpsj51.png',
    shenqi: 'https://www.helloimg.com/i/2026/03/01/69a4494492705.png',
  });
  // BEGIN ORIGINAL MAP RULES
  const defaultData = {
      mainRegions: [
        {
          id: "intis_republic",
          name: "因蒂斯共和国",
          type: "polygon",
          points: {
            outer: [
              { x: 38.93, y: 8.88 }, { x: 48.82, y: 10.99 }, { x: 49.97, y: 13.04 },
              { x: 48.99, y: 14.19 }, { x: 47.85, y: 13.22 }, { x: 44.59, y: 16.39 },
              { x: 39.73, y: 13.04 }, { x: 38.76, y: 10.87 }
            ],
            holes: []
          },
          style: {
            fill: "rgba(var(--rgb-primary), 0.3)",
            stroke: "var(--color-primary)"
          }
        }
        // ... (把你原来数组里的其他国家都补全在这里)
      ],
      landmarks: [
        {
          name: "廷根",
          type: "point",
          marker: { top: "26.34%", left: "55.36%" },
          mainRegionName: "鲁恩王国",
          id: "landmark_tingen",
          description: "鲁恩王国的重要城市，因非凡者事件闻名，是主角早期活动的核心场所。"
        }
        // ... (把你原来数组里的其他地标都补全在这里)
      ]
    };
  const geometry = {
  /**
   * 判断点是否在多边形内（射线法）
   * @param {Object} point - {x,y} 待判断坐标
   * @param {Array} polygon - 多边形顶点数组 [{x,y},...]
   */
  isPointInPolygon: (point, polygon) => {
  let inside = false;
  const x = point.x;
  const y = point.y;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
  },

  /**
   * 将点修正到多边形边缘（超出时拉回最近边缘）
   * @param {Object} point - 异常坐标
   * @param {Array} polygon - 目标多边形顶点
   */
  getClampedPointToPolygon: (point, polygon) => {
  const x = point.x;
  const y = point.y;
  const xs = polygon.map(p => p.x);
  const ys = polygon.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // 情况1：点在x范围外 → 修正到x边界，y保持原比例
  if (x < minX || x > maxX) {
    const targetX = x < minX ? minX : maxX;
    const yRatio = (y - minY) / (maxY - minY) || 0.5;
    const targetY = minY + yRatio * (maxY - minY);
    return { x: targetX, y: targetY };
  }
  // 情况2：点在y范围外 → 修正到y边界，x保持原比例
  if (y < minY || y > maxY) {
    const targetY = y < minY ? minY : maxY;
    const xRatio = (x - minX) / (maxX - minX) || 0.5;
    const targetX = minX + xRatio * (maxX - minX);
    return { x: targetX, y: targetY };
  }
  // 情况3：在范围内 → 直接返回
  return { x, y };
  }
};
  function locationRules(GameDBManager, GeometryHelper) {
    return {
    // 获取合法区域列表
    getValidRegions() {
      return GameDBManager.DB.mapData?.mainRegions?.map(r => r.name) || ["未知"];
    },
    // 获取合法地标列表
    getValidLandmarks() {
      return GameDBManager.DB.mapData?.landmarks?.map(l => l.name) || ["未知"];
    },
    // 判断是否异世界
    isAnotherWorld(region, landmark) {
      return !this.getValidRegions().includes(region) && !this.getValidLandmarks().includes(landmark);
    },
    // 根据地标查区域
    getRegionByLandmark(landmarkName) {
      const landmark = GameDBManager.DB.mapData?.landmarks?.find(l => l.name === landmarkName);
      if (landmark && landmark.mainRegionName) {
        return GameDBManager.DB.mapData?.mainRegions?.find(r => r.name === landmark.mainRegionName);
      }
      return null;
    },
    // 根据坐标查区域
    getRegionByCoord(coord) {
      return GameDBManager.DB.mapData?.mainRegions?.find(region => {
        const polygon = region.points?.outer;
        return polygon && GeometryHelper.isPointInPolygon(coord, polygon);
      });
    },
    // 计算区域中心点
    getRegionCenter(region) {
      const points = region?.points?.outer || [];
      if (!points.length) return { x: 50.0, y: 50.0 };
      const xs = points.map(p => p.x);
      const ys = points.map(p => p.y);
      return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
    },

    /**
     * 核心校验函数：传入 stat_data，直接在原对象上进行空间规则修正
     * @returns {boolean} 是否发生了数据变更
     */
    validateAndCorrectLocation(statData) {
      let modified = false;
      const currentRegion = statData["当前区域"];
      const currentLandmark = statData["当前地标"];
      let currentCoord = statData["当前坐标"];

      // 1. 坐标基础容错
      if (!currentCoord || typeof currentCoord !== 'object' || currentCoord.x === undefined || currentCoord.y === undefined) {
        currentCoord = { x: 50.0, y: 50.0 };
        statData["当前坐标"] = currentCoord;
        modified = true;
      } else {
        // 限制在 0-100 范围
        const validX = Math.max(0, Math.min(100, currentCoord.x));
        const validY = Math.max(0, Math.min(100, currentCoord.y));
        if (validX !== currentCoord.x || validY !== currentCoord.y) {
          currentCoord = { x: validX, y: validY };
          statData["当前坐标"] = currentCoord;
          modified = true;
        }
      }

      const anotherWorld = this.isAnotherWorld(currentRegion, currentLandmark);

      // 异世界：不做任何边缘检测，保留玩家输入
      if (anotherWorld) {
        console.log(`[地图引擎] 检测到异世界坐标，跳过地理逻辑强制修正。`);
        return modified;
      }

      // 2. 正常世界：地理逻辑强制纠偏
      const targetRegion = GameDBManager.DB.mapData?.mainRegions?.find(r => r.name === currentRegion);

      if (targetRegion) {
        // 如果在已知区域，但坐标出界了，强行拉回到边缘或中心
        if (!GeometryHelper.isPointInPolygon(currentCoord, targetRegion.points.outer)) {
          const clampedPoint = GeometryHelper.getClampedPointToPolygon(currentCoord, targetRegion.points.outer);
          statData["当前坐标"] = clampedPoint;
          console.log(`[地图引擎] 坐标越界，已修正至 ${currentRegion} 边缘:`, clampedPoint);
          modified = true;
        }
      } else {
        // 区域不合法，但地标合法，通过地标反推区域
        if (currentLandmark) {
          const regionByLandmark = this.getRegionByLandmark(currentLandmark);
          if (regionByLandmark) {
            statData["当前区域"] = regionByLandmark.name;
            console.log(`[地图引擎] 按地标补全区域: ${regionByLandmark.name}`);
            modified = true;
          }
        }
        // 连地标都没有，通过坐标反推区域
        else {
          const regionByCoord = this.getRegionByCoord(currentCoord);
          if (regionByCoord) {
            statData["当前区域"] = regionByCoord.name;
            console.log(`[地图引擎] 按坐标反推区域: ${regionByCoord.name}`);
            modified = true;
          }
        }
      }

      return modified;
    }
  };
  }
  const originalCenters = {
getCenterX(points) {
    const xs = points.map(p => p.x);
    return (Math.min(...xs) + Math.max(...xs)) / 2;
  },
getCenterY(points) {
    const ys = points.map(p => p.y);
    return (Math.min(...ys) + Math.max(...ys)) / 2;
  }
  };
  function jsonRules(console, toastr) {
    return {cleanAndParseJSON(rawContent, entryName = "未知条目", fallbackData = null) {
    if (!rawContent || !rawContent.trim()) {
      console.warn(`[DB警告] ${entryName} 内容为空，已启用兜底。`);
      return fallbackData;
    }

    try {
      // 1. 第一步：移除注释 (保持字符串内的内容不动)
      // 修正了对多行注释和单行注释的匹配，确保不会误删 URL 等
      let processed = rawContent.replace(/(".*?"|'.*?')|(\/\*[\s\S]*?\*\/|\/\/.*$)/gm, (match, group1) => {
        return group1 ? group1 : "";
      });

      // 2. 第二步：强力移除“尾随逗号”
      // 匹配：逗号 + 任意空白/换行 + 结束括号 (] 或 })
      // 使用 g 标识符全局替换所有层级的尾随逗号
      processed = processed.replace(/,([\s\r\n]*[\]}])/g, '$1');

      // 3. 第三步：处理 JSON 字符串中非法的“真换行”
      // 只有在双引号内部的换行符才会被替换为 \n 符号
      processed = processed.replace(/"([^"\\]*(\\.[^"\\]*)*)"/gs, (match) =>
        match.replace(/\n/g, "\\n").replace(/\r/g, "\\r")
      );

      // 4. 第四步：最终修剪
      processed = processed.trim();

      return JSON.parse(processed);
    } catch (err) {
      // 如果解析失败，尝试最后一种方案：暴力清理掉所有非标准的控制字符
      try {
        // 这里的逻辑处理极其隐蔽的编码错误（如 BOM 头或不可见字符）
        const extremeClean = rawContent
          .replace(/\/\/.*/g, '') // 简单暴力去单行注释
          .replace(/,[\s\r\n]*([\]}])/g, '$1')
          .trim();
        return JSON.parse(extremeClean);
      } catch (finalErr) {
        console.error(`[DB解析失败] ❌ ${entryName} 格式彻底损坏。报错: ${err.message}`);
        toastr.error(`警告：数据库${entryName}解析失败，请检查你的JSON格式是否正确！`);
        return fallbackData;
      }
    }
  }};
  }
  // END ORIGINAL MAP RULES
  function check(guard) {
    if (disposed || modules[KEY] !== api || guard && !guard()) throw Error('地图读取已取消。');
  }
  function normalize(value) {
    if (!value || typeof value !== 'object' || !Array.isArray(value.mainRegions) || !Array.isArray(value.landmarks)) throw Error('地图数据必须包含 mainRegions 和 landmarks 列表。');
    const next = structuredClone(value);
    for (const region of next.mainRegions) {
      if (!region || typeof region.name !== 'string' || !region.name.trim() || !Array.isArray(region.points?.outer) ||
        region.points.outer.length < 3 || region.points.outer.some(point => !Number.isFinite(point?.x) || !Number.isFinite(point?.y))) throw Error('地图区域的名称或多边形坐标无效。');
    }
    for (const landmark of next.landmarks) {
      if (!landmark || typeof landmark.name !== 'string' || !landmark.name.trim() ||
        !/^-?\d+(?:\.\d+)?%$/.test(String(landmark.marker?.left)) ||
        !/^-?\d+(?:\.\d+)?%$/.test(String(landmark.marker?.top))) throw Error('地图地标的名称或百分比坐标无效。');
    }
    return next;
  }
  async function load(guard) {
    check(guard);
    const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
    const sourceReader = modules['cryptLord.nativeFloorSource'];
    const owned = () => {
      check(guard);
      if (modules['cryptLord.hostApi'] !== host || modules['cryptLord.nativeFloorSource'] !== sourceReader)
        throw Error('地图来源服务已变化，请重新读取。');
      return true;
    };
    const bound = await host.getCharWorldbookNames('current');
    owned();
    const primary = bound?.primary || '1源堡';
    const names = [...new Set(['【源堡】玩家自建内容', ...(bound?.additional || []), '2历史孔隙']
      .filter(name => name && name !== primary)), primary], revision = [];
    const selected = new Map();
    for (const book of names) {
      let entries;
      try { entries = await host.getWorldbook(book); }
      catch (error) {
        if (book !== primary && /未能找到世界书|世界书.*(?:不存在|未找到)|(?:worldbook|lorebook).*?(?:not found|does not exist)/i.test(String(error.message || error))) {
          revision.push([book, null]); continue;
        }
        throw error;
      }
      owned();
      if (!Array.isArray(entries)) throw Error(`地图世界书“${book}”不可读取。`);
      const relevant = entries.filter(entry => {
        const name = String(entry.comment ?? entry.name ?? '');
        return name.startsWith('【配置') && name.includes('地图数据');
      });
      revision.push([book, relevant]);
      for (const entry of relevant) selected.set(String(entry.comment ?? entry.name), { book, entry });
    }
    const current = await host.getCharWorldbookNames('current');
    owned();
    if (JSON.stringify(bound) !== JSON.stringify(current)) throw Error('地图世界书绑定已改变，请重新读取。');
    let data = normalize(defaultData), source = '原版默认地图';
    for (const { book, entry } of selected.values()) {
      let parsed;
      try {
        const text = String(entry.content).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        try { parsed = JSON.parse(text); }
        catch { parsed = jsonRules(console, { error() {} }).cleanAndParseJSON(text, entry.comment ?? entry.name, null); }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error('地图配置不是对象');
      }
      catch { throw Error(`世界书“${book}”中的地图配置 JSON 损坏。`); }
      data = normalize({ ...data, ...parsed });
      source = `${book} · ${entry.comment ?? entry.name}`;
    }
    return { data, source, revision: JSON.stringify({ bound, revision }) };
  }
  async function readPosition(guard) {
    check(guard);
    const source = modules['cryptLord.nativeFloorSource'];
    if (!source) throw Error('原生楼层来源服务尚未加载');
    const loaded = await source.read(guard);
    await source.assert(loaded, guard);
    if (modules['cryptLord.nativeFloorSource'] !== source) throw Error('地图来源服务已变化');
    return position(loaded);
  }
  function position(loaded) {
    const latest = loaded.rows.filter(item => item.role === 'assistant').at(-1);
    if (latest?.is_hidden) throw Error('最新 assistant 楼层已隐藏，未显示旧地图位置。');
    return structuredClone(latest?.data || {});
  }
  async function loadView(guard) {
    check(guard);
    const source = modules['cryptLord.nativeFloorSource'];
    if (!source) throw Error('原生楼层来源服务尚未加载');
    const loaded = await source.read(guard);
    const owned = () => {
      check(guard);
      if (modules['cryptLord.nativeFloorSource'] !== source) throw Error('地图来源服务已变化');
      return source.assertIdentity(loaded, guard);
    };
    const rules = await load(owned), finalRules = await load(owned);
    if (rules.revision !== finalRules.revision) throw Error('地图配置在读取期间已变化，请重新读取。');
    await source.assert(loaded, owned);
    owned();
    return { ...rules, position: position(loaded) };
  }
  function engine(data) {
    const GameDBManager = { DB: { mapData: data } };
    const GeometryHelper = geometry;
    return locationRules(GameDBManager, GeometryHelper);
  }
  function correct(stat, data) {
    if (!stat || typeof stat !== 'object' || Array.isArray(stat)) return false;
    const normalized = normalize(data);
    const coordinate = stat.当前坐标;
    let repaired = false;
    // The original engine accepts absent coordinates but cannot handle NaN.
    if (coordinate && (coordinate.x === null || coordinate.y === null || coordinate.x === '' || coordinate.y === '' ||
      !Number.isFinite(Number(coordinate.x)) || !Number.isFinite(Number(coordinate.y)))) {
      stat.当前坐标 = { x: 50, y: 50 };
      repaired = true;
    }
    return engine(normalized).validateAndCorrectLocation(stat) || repaired;
  }
  function marker(stat = {}) {
    const coordinate = stat.当前坐标;
    const valid = coordinate && Number.isFinite(Number(coordinate.x)) && Number.isFinite(Number(coordinate.y)) &&
      coordinate.x !== null && coordinate.y !== null && coordinate.x !== '' && coordinate.y !== '';
    return { valid: Boolean(valid), x: Number(coordinate?.x), y: Number(coordinate?.y) / Y_SCALE,
      label: stat.当前区域 === '未知' ? '未知位置' : String(stat.当前地标 || stat.当前区域 || '未知位置') };
  }
  const lod = scale => ({ regions: scale >= .5 && scale <= 5, dots: true, landmarks: scale >= 1.2, playerLabel: scale >= .5, inverseScale: 1 / scale });
  const api = Object.freeze({
    status: () => ({ key: KEY, ready: !disposed }), images: IMAGES, yScale: Y_SCALE,
    defaults: () => structuredClone(defaultData), normalize, load, loadView, readPosition, correct, marker, lod,
    centerX: points => originalCenters.getCenterX(points), centerY: points => originalCenters.getCenterY(points),
    zoom: (scale, delta) => {
      const next = Math.round((scale + delta) * 1000) / 1000;
      return next >= .4 && next <= 5 ? next : scale;
    },
    dispose() { disposed = true; contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY]; return true; },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
