(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});

  function createEmptyState() {
    return {
      time: '', location: '', presentChars: '', elapsedTime: '',
      protagonist: { name: '', genderAge: '', appearance: '', currentOutfit: '', currentStatus: '', occupation: '', uniqueAbilities: '', innateTechnique: '', techniqueIntro: '', cursedTools: '', domainExpansion: '', reverseTechnique: '', permanentInjuries: '' },
      stats: { level: 1, exp: 0, kp: 0, cursedEnergy: { total: 0, current: 0, precision: 0, costRate: 1 }, basePhysical: 0, martialArts: 0, techniquePotential: '', potentialValue: 0, techniqueProficiency: '', burnout: '' },
      techniques: [], characters: [], shikigami: [], bindings: [], inventory: [], quests: [],
    };
  }

  const GameState = createEmptyState();

  function resetData() {
    Object.assign(GameState, createEmptyState());
    return GameState;
  }

  function getAutoCardAPI() {
    try { if (typeof parent !== 'undefined' && parent.AutoCardUpdaterAPI) return parent.AutoCardUpdaterAPI; } catch (e) { console.warn('[db-status-bar] parent AutoCardUpdaterAPI unavailable:', e); }
    if (window.AutoCardUpdaterAPI) return window.AutoCardUpdaterAPI;
    return null;
  }

  function get(headers, row, colName) {
    const idx = headers.indexOf(colName);
    if (idx === -1 || idx >= row.length) return undefined;
    return row[idx];
  }

  function normalizeSheetName(uid, name) { return String(name || '').trim(); }

  function parseNum(v, fallback) { const n = Number(v); return isNaN(n) ? (fallback || 0) : n; }

  function parseTables(tables) {
    resetData();
    if (!tables || typeof tables !== 'object') return GameState;
    for (const uid in tables) {
      const sheet = tables[uid];
      const sheetName = normalizeSheetName(uid, sheet?.name);
      if (!sheet || !sheetName || !sheet.content || sheet.content.length < 2) continue;
      const headers = sheet.content[0];
      const rows = sheet.content.slice(1);
      const g = (row, col) => get(headers, row, col);
      switch (sheetName) {
        case '全局数据表': parseGlobal(rows, g); break;
        case '主角信息表': parseProtagonistInfo(rows, g); break;
        case '主角属性表': parseProtagonistStats(rows, g); break;
        case '扩展术式表': parseTechniques(rows, g); break;
        case '重要角色表': parseCharacters(rows, g); break;
        case '咒灵/式神表': parseShikigami(rows, g); break;
        case '束缚表': parseBindings(rows, g); break;
        case '重要物品表': case '背包物品表': parseInventory(rows, g); break;
        case '任务与事件表': parseQuests(rows, g); break;
      }
    }
    return GameState;
  }

  function parseGlobal(rows, g) {
    if (!rows[0]) return;
    GameState.time = g(rows[0], '当前时间') || g(rows[0], 'cur_time') || '';
    GameState.location = g(rows[0], '当前位置') || g(rows[0], '主角当前所在地点') || g(rows[0], '当前地点') || g(rows[0], 'current_location') || '';
    GameState.presentChars = g(rows[0], '在场角色姓名') || g(rows[0], 'present_characters') || '';
    GameState.elapsedTime = g(rows[0], '经过的时间') || g(rows[0], 'elapsed_time') || '';
  }

  function parseProtagonistInfo(rows, g) {
    if (!rows[0]) return;
    const r = rows[0];
    const p = GameState.protagonist;
    p.name = g(r, '姓名') || g(r, 'name') || '';
    p.genderAge = g(r, '性别/年龄') || g(r, '性别年龄') || g(r, 'gender_age') || '';
    p.appearance = g(r, '外貌特征') || g(r, 'appearance') || '';
    p.currentOutfit = g(r, '当前衣着/装扮') || g(r, 'current_outfit') || '';
    p.currentStatus = g(r, '当前状态/伤情') || g(r, '当前状态') || g(r, 'current_status') || '';
    p.occupation = g(r, '职业/身份') || g(r, '职业身份') || g(r, 'occupation_identity') || '';
    p.uniqueAbilities = g(r, '独特能力与咒力特性') || g(r, 'unique_abilities') || '';
    p.innateTechnique = g(r, '生得术式') || g(r, 'innate_technique') || '';
    p.techniqueIntro = g(r, '术式简介') || g(r, '术式介绍') || g(r, 'technique_intro') || '';
    p.cursedTools = g(r, '持有的咒具') || g(r, '咒具') || g(r, 'cursed_tools') || '';
    p.domainExpansion = g(r, '领域') || g(r, '领域展开') || g(r, 'domain_expansion') || '';
    p.reverseTechnique = g(r, '反转术式') || g(r, 'reverse_technique') || '';
    p.permanentInjuries = g(r, '永久损伤') || g(r, 'permanent_injuries') || '';
  }

  function parseProtagonistStats(rows, g) {
    if (!rows[0]) return;
    const r = rows[0];
    const s = GameState.stats;
    s.level = parseNum(g(r, '等级') || g(r, 'level'), 1);
    s.exp = parseNum(g(r, '经验值') || g(r, '经验') || g(r, 'exp'), 0);
    s.kp = parseNum(g(r, '技能点') || g(r, 'KP') || g(r, 'kp'), 0);
    s.cursedEnergy.total = parseNum(g(r, '咒力量(咒力总量)') || g(r, '咒力总量') || g(r, 'cursed_energy_total'), 0);
    s.cursedEnergy.current = parseNum(g(r, '咒力当前值') || g(r, '咒力当前') || g(r, 'cursed_energy_current'), 0);
    s.cursedEnergy.precision = parseNum(g(r, '咒力操纵精度') || g(r, '咒力精度') || g(r, 'cursed_energy_precision'), 0);
    s.cursedEnergy.costRate = parseNum(g(r, '咒力消耗倍率') || g(r, '消耗倍率') || g(r, 'cursed_energy_cost_rate'), 1);
    s.basePhysical = parseNum(g(r, '基础肉体值') || g(r, '基础肉体') || g(r, 'base_physical'), 0);
    s.martialArts = parseNum(g(r, '武艺值') || g(r, '武艺') || g(r, 'martial_arts'), 0);
    s.techniquePotential = g(r, '术式潜力等级') || g(r, '术式潜力') || g(r, 'technique_potential') || '';
    s.potentialValue = parseNum(g(r, '术式潜力值') || g(r, 'technique_potential_value'), 0);
    s.techniqueProficiency = g(r, '术式精通等级') || g(r, '术式熟练度') || g(r, 'technique_proficiency') || '';
    s.burnout = g(r, '术式熔断与修复') || g(r, '术式熔断') || g(r, 'technique_burnout') || '';
  }

  function parseTechniques(rows, g) {
    GameState.techniques = [];
    rows.forEach(r => {
      const name = g(r, '术式/能力名称') || g(r, '术式名称') || g(r, 'tech_name');
      if (!name) return;
      const owner = g(r, '所属角色') || g(r, 'owner') || '';
      GameState.techniques.push({ owner, name, type: g(r, '类别') || g(r, '术式类型') || g(r, 'tech_type') || '', proficiency: g(r, '熟练度/阶段') || g(r, '熟练度') || g(r, 'proficiency') || '', effect: g(r, '效果描述') || g(r, 'effect_desc') || '', intro: g(r, '简介') || g(r, 'brief_intro') || '' });
    });
  }

  function parseCharacters(rows, g) {
    GameState.characters = [];
    rows.forEach(r => {
      const name = g(r, '姓名') || g(r, 'name');
      if (!name) return;
      GameState.characters.push({
        name, genderAge: g(r, '性别/年龄') || g(r, '性别年龄') || g(r, 'gender_age') || '',
        currentStatus: g(r, '当前状态/伤情') || g(r, '当前状态') || g(r, 'current_status') || '',
        isAbsent: (g(r, '是否离场') || g(r, 'is_absent') || '') === '是',
        occupation: g(r, '职业/身份') || g(r, '职业身份') || g(r, 'occupation_identity') || '',
        powerLevel: g(r, '战力等级') || g(r, 'power_level') || '',
        innateTechnique: g(r, '生得术式') || g(r, 'innate_technique') || '',
        bpA: g(r, 'BPA(总肉体值)') || g(r, '总BP') || g(r, 'total_bp') || '',
        bpB: g(r, 'BPB(术式强度)') || '',
        domain: g(r, '领域') || g(r, 'domain_expansion') || '',
        affection: parseNum(g(r, '好感度') || g(r, 'affection'), 0),
        trust: parseNum(g(r, '信任度') || g(r, 'trust'), 0),
        relationStage: g(r, '关系阶段') || g(r, 'relationship_stage') || ''
      });
    });
  }

  function parseShikigami(rows, g) {
    GameState.shikigami = [];
    rows.forEach(r => {
      const name = g(r, '名称') || g(r, '式神名称') || g(r, 'spirit_name');
      if (!name) return;
      const owner = g(r, '所属角色') || g(r, 'owner') || '';
      GameState.shikigami.push({ owner, name, type: g(r, '类型') || g(r, 'spirit_type') || '', origin: g(r, '起源') || g(r, 'origin') || '', technique: g(r, '术式') || g(r, 'technique') || '', ability: g(r, '能力简介') || g(r, '能力描述') || g(r, 'ability_desc') || '', bpA: g(r, 'BPA(总肉体值)') || g(r, '巅峰BP') || g(r, 'peak_bp') || '', bpB: g(r, 'BPB(术式强度)') || '', powerRank: g(r, '战力等级') || g(r, 'power_rank') || '', status: g(r, '当前状态') || g(r, 'current_status') || '' });
    });
  }

  function parseBindings(rows, g) {
    GameState.bindings = [];
    rows.forEach(r => {
      const name = g(r, '束缚名称');
      if (!name) return;
      GameState.bindings.push({ name, parties: g(r, '缔结方') || '', condition: g(r, '成立条件') || '', risk: g(r, '代价与风险') || '', penalty: g(r, '违约惩罚') || '', status: g(r, '当前状态') || '' });
    });
  }

  function parseInventory(rows, g) {
    GameState.inventory = [];
    rows.forEach(r => {
      const name = g(r, '物品名称') || g(r, 'item_name');
      if (!name) return;
      const owner = g(r, '拥有人') || g(r, 'owner') || '';
      GameState.inventory.push({ owner, name, quantity: parseNum(g(r, '数量') || g(r, 'quantity'), 1), desc: g(r, '描述') || g(r, 'description') || '', category: g(r, '类别') || g(r, '分类') || g(r, 'category') || '其他', location: g(r, '所在位置') || g(r, 'current_location') || '', effect: g(r, '效果') || g(r, 'effect') || '', remarks: g(r, '重要备注') || g(r, '备注') || g(r, 'remarks') || '' });
    });
  }

  function parseQuests(rows, g) {
    GameState.quests = [];
    rows.forEach(r => {
      const name = g(r, '任务名称');
      if (!name) return;
      GameState.quests.push({ name, rating: g(r, '任务评级') || g(r, '评级') || '', target: g(r, '目标情报') || '', client: g(r, '委派方/辅助监督') || g(r, '委派方') || '', desc: g(r, '详细描述') || g(r, '描述') || '', progress: g(r, '当前进度') || g(r, '进度') || '', reward: g(r, '报酬与风险') || g(r, '报酬') || '' });
    });
  }

  // ─── Rarity Color Mapping (from BP美化正则) ───
  function getRarityColor(label) {
    const s = String(label || '');
    if (/论外|出神入化/.test(s)) return { color: '#b54a4a', bg: 'rgba(181,74,74,.18)' };
    if (/强特级/.test(s)) return { color: '#a6782a', bg: 'rgba(183,154,98,.25)' };
    if (/特级|出类拔萃/.test(s)) return { color: '#8f5fa8', bg: 'rgba(138,129,157,.24)' };
    if (/一级|准一级|登堂入室|精通/.test(s)) return { color: '#527999', bg: 'rgba(116,139,157,.22)' };
    if (/二级|三级|熟练/.test(s)) return { color: '#617f58', bg: 'rgba(127,146,124,.2)' };
    return { color: '#6f6255', bg: 'rgba(117,107,96,.14)' };
  }

  // ─── Proficiency Bar Parser ───
  const PROF_STAGES = [
    { name: '初步觉醒', min: 0, max: 99, color: '#6f6255' },
    { name: '入门', min: 100, max: 199, color: '#6f6255' },
    { name: '精通', min: 200, max: 499, color: '#527999' },
    { name: '特级熟练', min: 500, max: 799, color: '#8f5fa8' },
    { name: '论外熟练', min: 800, max: 1000, color: '#b54a4a' }
  ];

  function parseProficiencyBar(value) {
    const s = String(value || '');
    const m = s.match(/([^(]+)\((\d+)\)/);
    if (!m) return null;
    const stageName = m[1].trim();
    const num = parseInt(m[2], 10);
    const stage = PROF_STAGES.find(st => st.name === stageName) || PROF_STAGES.find(st => num >= st.min && num <= st.max) || PROF_STAGES[0];
    const range = stage.max - stage.min || 1;
    const percent = Math.max(0, Math.min(100, ((num - stage.min) / range) * 100));
    return { stage: stage.name, num, min: stage.min, max: stage.max, percent, color: stage.color };
  }

  // ─── Item Category Color Mapping ───
  function getCategoryColor(category) {
    const map = {
      '武器': '#b54a4a',
      '护具': '#527999',
      '消耗品': '#617f58',
      '材料': '#6f6255',
      '货币': '#a6782a',
      '文件': '#8f5fa8',
      '饰品': '#8f5fa8',
      '衣物': '#527999'
    };
    return map[category] || '';
  }

  ui.dbStatusData = { GameState, parseTables, resetData, getAutoCardAPI, getRarityColor, parseProficiencyBar, getCategoryColor };
})();
