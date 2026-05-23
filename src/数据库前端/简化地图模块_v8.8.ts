// ==================== 简化版地图模块 v8.8 ====================
// 参照前端美化HTML,删除所有编辑功能,只保留浏览和互动

// 删除的功能:
// - 编辑按钮和编辑模式
// - 侧边栏和元素拖拽
// - mapLayout保存
// - 地点/元素拖拽调整

// 保留的功能:
// - 地图显示(地点矩形+文字)
// - 点击地点显示"前往XX"
// - 元素在数据库中配置显示
// - 点击元素显示互动选项
// - 缩放和平移

/**
 * 修改后的injectMapTables - 使用标准模板
 */
async function injectMapTables(): Promise<boolean> {
  const api = (window as any).AutoCardUpdaterAPI || (window.parent as any).AutoCardUpdaterAPI;
  if (!api || !api.exportTableAsJson || !api.importTableAsJson) {
    showToast('无法连接到数据库API', 'error');
    return false;
  }
  
  dbg('[地图注入] 开始注入标准地图表格');
  
  try {
    const existing = checkMapTablesExist();
    if (existing.hasLocation && existing.hasElement) {
      showToast('地图表格已存在', 'error');
      return false;
    }
    
    const locUid = generateTableUid();
    const elUid = generateTableUid();
    
    // 标准主要地点表
    const locationTable = {
      uid: locUid,
      name: '主要地点表' + MAP_TABLE_MARKER,
      domain: 'chat',
      type: 'dynamic',
      enable: true,
      required: false,
      triggerSend: false,
      triggerSendDeep: 1,
      config: {
        toChat: true,
        useCustomStyle: false,
        triggerSendToChat: false,
        alternateTable: false,
        insertTable: false,
        alternateLevel: 0,
        skipTop: false,
        selectedCustomStyleKey: '',
        customStyles: {}
      },
      sourceData: {
        note: '记录当前活动层级的具体地点。当地点层级深入时（如从"小区"进入"公寓楼"），此表会被清空并填充新层级的子地点。',
        initNode: '游戏初始化时，需为当前层级区域新增至少三个主要地点。',
        deleteNode: '当发生地点层级深入时，原表中的地点在移至"外部区域列表"后将被删除。',
        updateNode: '地点的环境描述等信息发生变化时更新。',
        insertNode: '在当前层级内发现新地点时添加。'
      },
      content: [
        [null, '地点名称', 'X坐标', 'Y坐标', '宽度', '高度', '环境描述']
      ],
      exportConfig: {}
    };
    
    // 标准地图元素表
    const elementTable = {
      uid: elUid,
      name: '地图元素表' + MAP_TABLE_MARKER,
      domain: 'chat',
      type: 'dynamic',
      enable: true,
      required: false,
      triggerSend: false,
      triggerSendDeep: 1,
      config: {
        toChat: true,
        useCustomStyle: false,
        triggerSendToChat: false,
        alternateTable: false,
        insertTable: false,
        alternateLevel: 0,
        skipTop: false,
        selectedCustomStyleKey: '',
        customStyles: {}
      },
      sourceData: {
        note: '记录场景中可交互的实体（怪物/NPC/物品）。`所属主地点`必须与主要地点表对应。',
        initNode: '新地点创建时，必须为其添加至少一个地图元素。',
        deleteNode: '实体被消灭/摧毁/取走，或者普通NPC因为剧情发展变成剧情重要角色时删除。',
        updateNode: '实体状态因交互改变时更新。每轮必须根据最新情景刷新所有互动选项。',
        insertNode: '场景中出现新的可交互实体时添加。'
      },
      content: [
        [null, '元素名称', '元素类型', '元素描述', '所属主地点', '状态', '互动选项1', '互动选项2', '互动选项3']
      ],
      exportConfig: {}
    };
    
    // 注入到数据库
    const data = api.exportTableAsJson();
    if (!data) {
      showToast('无法读取数据库', 'error');
      return false;
    }
    
    data[locUid] = locationTable;
    data[elUid] = elementTable;
    
    const success = api.importTableAsJson(JSON.stringify(data));
    
    if (success) {
      showToast('地图表格注入成功!');
      dbg('[地图注入] ✅ 成功');
      return true;
    } else {
      showToast('注入失败', 'error');
      return false;
    }
  } catch (e) {
    console.error('[地图注入] 错误:', e);
    showToast('注入失败: ' + e, 'error');
    return false;
  }
}

/**
 * 简化版renderMap - 参照前端美化HTML
 */
function renderMap() {
  try {
    renderExternalAreas();
    const locs = JSON.parse(JSON.stringify(state.cachedData.mapLocations || []));
    const rawElements = state.cachedData.mapElements || [];
    const allChars = [...state.cachedData.main, ...state.cachedData.side];
    const protLoc = state.cachedData.protagonistLoc;
    const $svg = $('#ci-map-svg');
    if (!$svg.length) return;
    $svg.empty();
    
    if (!locs.length) {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', '400');
      t.setAttribute('y', '300');
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('class', 'map-location-label');
      t.textContent = '暂无地图数据';
      $svg[0].appendChild(t);
      $svg.attr('viewBox', '0 0 800 600');
      return;
    }
    
    // 调整布局避免重叠
    const adjustedLocs = adjustLayout(locs);
    
    // 计算viewBox
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    adjustedLocs.forEach((l: any) => {
      minX = Math.min(minX, l.x);
      minY = Math.min(minY, l.y);
      maxX = Math.max(maxX, l.x + l.width);
      maxY = Math.max(maxY, l.y + l.height);
    });
    
    const padding = Math.max((maxX - minX) * 0.1, (maxY - minY) * 0.1, 50);
    const vbX = minX - padding, vbY = minY - padding;
    const vbW = (maxX - minX) + (padding * 2);
    const vbH = (maxY - minY) + (padding * 2);
    $svg.attr('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
    $svg.data('vb', { x: vbX, y: vbY, w: vbW, h: vbH });
    
    // 渲染地点
    adjustedLocs.forEach((loc: any) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'map-location-group');
      
      g.addEventListener('click', () => {
        const rect = g.getBoundingClientRect();
        showMapPopup(rect.left + rect.width / 2, rect.top + rect.height / 2, [`前往 ${loc.name}`]);
      });
      
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', String(loc.x));
      r.setAttribute('y', String(loc.y));
      r.setAttribute('width', String(loc.width));
      r.setAttribute('height', String(loc.height));
      r.setAttribute('class', 'map-location-rect');
      r.setAttribute('rx', '8');
      
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', String(loc.x + loc.width / 2));
      t.setAttribute('y', String(loc.y + loc.height / 2));
      t.setAttribute('class', 'map-location-label');
      t.textContent = loc.name;
      
      g.appendChild(r);
      g.appendChild(t);
      $svg[0].appendChild(g);
      
      // 渲染地点内的元素
      const locElements = rawElements.filter((e: any) => {
        const elLoc = String(e.location || '').trim();
        const locName = String(loc.name).trim();
        return locName.includes(elLoc) || elLoc.includes(locName);
      });
      
      const seedBase = stringHash(loc.name);
      locElements.forEach((el: any, i: number) => {
        // 使用伪随机位置
        const rx = pseudoRandom(seedBase + i * 100);
        const ry = pseudoRandom(seedBase + i * 100 + 1);
        const x = loc.x + 20 + rx * (loc.width - 70); // 留出50px给元素
        const y = loc.y + 20 + ry * (loc.height - 70);
        
        renderElement(el, x, y, $svg[0]);
      });
      
      // 渲染主角位置标记
      if (protLoc && String(protLoc).trim() === String(loc.name).trim()) {
        renderProtagonistMarker(loc.x + loc.width / 2, loc.y + loc.height / 2, $svg[0]);
      }
    });
    
  } catch (e) {
    console.error('[renderMap] Error:', e);
  }
}

/**
 * 渲染单个元素
 */
function renderElement(el: any, x: number, y: number, svg: SVGElement) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'map-element-group');
  
  // 30x30矩形
  const size = 30;
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', String(x));
  rect.setAttribute('y', String(y));
  rect.setAttribute('width', String(size));
  rect.setAttribute('height', String(size));
  rect.setAttribute('rx', '4');
  rect.setAttribute('fill', '#f5f5f5');
  rect.setAttribute('stroke', '#9e9e9e');
  rect.setAttribute('stroke-width', '1.5');
  g.appendChild(rect);
  
  // 文字在下方
  const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  txt.setAttribute('x', String(x + size / 2));
  txt.setAttribute('y', String(y + size + 12));
  txt.setAttribute('text-anchor', 'middle');
  txt.setAttribute('class', 'map-element-label');
  txt.textContent = el.name;
  g.appendChild(txt);
  
  // 点击事件
  g.addEventListener('click', (e) => {
    e.stopPropagation();
    const rect = g.getBoundingClientRect();
    const opts: string[] = [];
    
    // 自定义互动选项
    if (el.interactions && el.interactions.length > 0) {
      el.interactions.forEach((i: string) => {
        if (i && i.trim()) opts.push(i);
      });
    }
    
    // 默认选项
    if (opts.length === 0) {
      opts.push(`查看${el.name}`, `使用${el.name}`);
    }
    
    showMapPopup(rect.left + rect.width / 2, rect.top + rect.height / 2, opts);
  });
  
  svg.appendChild(g);
}

/**
 * 渲染主角位置标记
 */
function renderProtagonistMarker(x: number, y: number, svg: SVGElement) {
  const avatarGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  avatarGroup.setAttribute('class', 'protagonist-map-avatar');
  
  // 脉冲波
  const pulseCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  pulseCircle.setAttribute('cx', String(x));
  pulseCircle.setAttribute('cy', String(y));
  pulseCircle.setAttribute('r', '12');
  pulseCircle.setAttribute('class', 'pulse-wave');
  
  // 头像圆圈
  const avatarCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  avatarCircle.setAttribute('cx', String(x));
  avatarCircle.setAttribute('cy', String(y));
  avatarCircle.setAttribute('r', '12');
  avatarCircle.setAttribute('fill', '#4caf50');
  avatarCircle.setAttribute('stroke', '#fff');
  avatarCircle.setAttribute('stroke-width', '2');
  
  avatarGroup.appendChild(pulseCircle);
  avatarGroup.appendChild(avatarCircle);
  svg.appendChild(avatarGroup);
}
