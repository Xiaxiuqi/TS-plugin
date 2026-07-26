(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const MapState = { location: '', mapElements: [] };

  function resetData() {
    MapState.location = '';
    MapState.mapElements = [];
    return MapState;
  }

  function getAutoCardAPI() {
    try {
      if (typeof parent !== 'undefined' && parent.AutoCardUpdaterAPI) return parent.AutoCardUpdaterAPI;
    } catch (error) {
      console.warn('[db-map] parent AutoCardUpdaterAPI unavailable:', error);
    }
    return window.AutoCardUpdaterAPI || null;
  }

  function get(headers, row, names) {
    for (const name of names) {
      const index = headers.indexOf(name);
      if (index >= 0 && index < row.length) return row[index];
    }
    return undefined;
  }

  function normalizeSheetName(uid, name) {
    const aliases = {
      sheet_MapElements: '地图元素表',
      map_elements: '地图元素表',
      sheet_map: '地图元素表',
    };
    const rawName = String(name || '').trim();
    const rawUid = String(uid || '').trim();
    return aliases[rawName] || aliases[rawUid] || rawName;
  }

  function parseNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function parseTables(tables) {
    resetData();
    let location = '';
    let mapElements = [];
    if (tables && typeof tables === 'object') {
      Object.keys(tables).forEach(uid => {
        const sheet = tables[uid];
        const sheetName = normalizeSheetName(uid, sheet?.name);
        if (!sheet?.content || sheet.content.length < 2) return;
        const headers = sheet.content[0];
        const rows = sheet.content.slice(1);
        if (sheetName === '全局数据表' && rows[0]) {
          location = get(headers, rows[0], ['当前位置', '主角当前所在地点', '当前地点', 'current_location']) || '';
        }
        if (sheetName === '地图元素表') {
          mapElements = rows.map(row => {
            const name = get(headers, row, ['元素名称', 'name']);
            if (!name) return null;
            return {
              name,
              type: get(headers, row, ['元素类型', 'type']) || '',
              x: parseNumber(get(headers, row, ['X坐标', 'x']), 400),
              y: parseNumber(get(headers, row, ['Y坐标', 'y']), 300),
              status: get(headers, row, ['状态', 'status']) || '',
              desc: get(headers, row, ['描述', 'description']) || '',
              area: get(headers, row, ['所属区域', 'area']) || '',
              lore: get(headers, row, ['传说背景', 'lore']) || '',
            };
          }).filter(Boolean);
        }
      });
    }
    MapState.location = String(location || '');
    MapState.mapElements = mapElements;
    return MapState;
  }

  ui.dbMapData = { MapState, getAutoCardAPI, parseTables, resetData };
})();
