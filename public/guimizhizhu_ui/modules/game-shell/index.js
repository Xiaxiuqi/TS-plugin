(() => {
  'use strict';

  const KEY = 'cryptLord.gameShell';
  const HOST_KEY = 'cryptLord.afterNativeHost';
  const EDITOR_KEY = 'cryptLord.nativeFloorEditorUi';
  const INPUT_KEY = 'cryptLord.inputAdapter';
  const MAP_KEY = 'cryptLord.worldMap';
  const STATE_STORE_KEY = 'cryptLord.stateStore';
  const VARIABLE_PATCH_KEY = 'cryptLord.variablePatch';
  const VARIABLE_SETTLEMENT_API_KEY = 'cryptLord.variableSettlementApi';
  const VARIABLE_WORKBENCH_KEY = 'cryptLord.variableWorkbench';
  const AI_CONTEXT_CONFIG_UI_KEY = 'cryptLord.aiContextConfigUi';
  const EQUIPMENT_STATE_KEY = 'cryptLord.equipmentState';
  const CHARACTER_PANEL_STATE_KEY = 'cryptLord.characterPanelState';
  const MYSTERY_ANALYSIS_KEY = 'cryptLord.mysteryAnalysis';
  const SCROLL_CRAFTING_KEY = 'cryptLord.scrollCrafting';
  const SHAMAN_TERRITORY_KEY = 'cryptLord.shamanTerritory';
  const SHAMAN_PICTURE_KEY = 'cryptLord.shamanPicture';
  const IMAGINATION_KEY = 'cryptLord.audienceImagination';
  const GRAZING_KEY = 'cryptLord.grazingState';
  const READER_MYSTIC_KEY = 'cryptLord.readerMystic';
  const REENACTMENT_KEY = 'cryptLord.mysteryReenactment';
  const ARBITER_JURISDICTION_KEY = 'cryptLord.arbiterJurisdiction';
  const RELATIONSHIP_STATE_KEY = 'cryptLord.relationshipState';
  const INVENTORY_STATE_KEY = 'cryptLord.inventoryState';
  const ABILITY_STATE_KEY = 'cryptLord.abilityState';
  const PERSONAL_BATTLE_STATE_KEY = 'cryptLord.personalBattleState';
  const TEAM_BATTLE_STATE_KEY = 'cryptLord.teamBattleState';
  const BATTLE_LIFE_SAVE_KEY = 'cryptLord.battleLifeSave';
  const BATTLEFIELD_PAINTER_KEY = 'cryptLord.battlefieldPainter';
  const GAME_AUDIO_KEY = 'cryptLord.gameAudio';
  const GAME_AUDIO_CONTROL_KEY = 'cryptLord.gameAudioControl';
  const NORMALIZER_KEY = 'cryptLord.responseNormalizer';
  const ABILITY_LOCK_KEY = 'ST_LoM_AbilityLock';
  const QUICK_SHORTCUTS_KEY = 'cryptLord.quickShortcuts';
  const ORGANIZATION_CONSOLE_KEY = 'cryptLord.organizationConsole';
  const DOMAIN_CONSOLE_KEY = 'cryptLord.domainConsole';
  const DLC_MANAGER_KEY = 'cryptLord.dlcManager';
  const WORLDBOOK_PROFILES_KEY = 'cryptLord.worldbookToggleProfilesUi';
  const DUAL_WORLDBOOK_KEY = 'cryptLord.dualWorldbookUi';
  const CUSTOM_CONTENT_KEY = 'cryptLord.customContentUi';
  const IMAGE_GENERATION_KEY = 'cryptLord.imageGenerationUi';
  const RANDOM_EVENTS_KEY = 'cryptLord.randomEventsUi';
  const EVENT_GENERATOR_KEY = 'cryptLord.eventGeneratorUi';
  const DETECTIVE_CASE_KEY = 'cryptLord.detectiveCaseUi';
  const DIVINATION_UI_KEY = 'cryptLord.divinationUi';
  const ORIGINAL_PLOT_GUIDE_KEY = 'cryptLord.originalPlotGuideUi';
  const SAVANT_MATERIAL_UI_KEY = 'cryptLord.savantMaterialUi';
  const SAVANT_ENHANCEMENT_UI_KEY = 'cryptLord.savantEnhancementUi';
  const SOURCE_CASTLE_UI_KEY = 'cryptLord.sourceCastleUi';
  const THEATER_CONSOLE_KEY = 'cryptLord.theaterConsole';
  const THEME_KEY = 'cryptLord.originalUi.theme';
  const POSITION_KEY = 'cryptLord.gameShell.position';
  const COMMAND_POSITION_KEY = 'cryptLord.commandPanel.layout.v1';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const afterNative = root.__stage1Modules?.[HOST_KEY];
  if (!afterNative) throw new Error(`[${KEY}] shared/after-native-host.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const equipmentState = modules[EQUIPMENT_STATE_KEY];
  if (!equipmentState) throw new Error(`[${KEY}] core/equipment-state.js 尚未加载`);
  const EQUIPMENT_LISTS = equipmentState.lists;
  const inventoryState = modules[INVENTORY_STATE_KEY];
  if (!inventoryState) throw new Error(`[${KEY}] core/inventory-state.js 尚未加载`);
  const abilityState = modules[ABILITY_STATE_KEY];
  if (!abilityState) throw new Error(`[${KEY}] core/ability-state.js 尚未加载`);
  const personalBattleState = modules[PERSONAL_BATTLE_STATE_KEY];
  if (!personalBattleState) throw new Error(`[${KEY}] core/personal-battle-state.js 尚未加载`);
  const teamBattleState = modules[TEAM_BATTLE_STATE_KEY];
  const characterPanelState = modules[CHARACTER_PANEL_STATE_KEY];
  if (!characterPanelState) throw new Error(`[${KEY}] core/character-panel-state.js 尚未加载`);
  const relationshipState = modules[RELATIONSHIP_STATE_KEY];
  if (!relationshipState) throw new Error(`[${KEY}] core/relationship-state.js 尚未加载`);

  const ATTRIBUTE_DEFINITIONS = Object.freeze([
    Object.freeze({ label: '活力', current: '当前活力', maximum: '活力' }),
    Object.freeze({ label: '灵性', current: '当前灵性', maximum: '灵性' }),
    Object.freeze({ label: '理智', current: '当前理智', maximum: '理智' }),
    Object.freeze({ label: '人性', current: '当前人性', maximum: '人性' }),
    Object.freeze({ label: '敏捷', current: '当前敏捷', maximum: '敏捷' }),
    Object.freeze({ label: '运气', current: '当前运气', maximum: '运气' }),
  ]);
  const FEATURES = Object.freeze([
    Object.freeze({ id: 'actions', label: '行动选项', keys: ['cryptLord.actions'] }),
    Object.freeze({ id: 'pathway-play', label: '途径玩法', keys: ['途径专属', '放牧', '秘偶', '分身'] }),
    Object.freeze({ id: 'detective', label: '事件真相', keys: ['案件', '破案', '侦探', '线索'] }),
    Object.freeze({ id: 'journey', label: '本周目经历', keys: [] }),
    Object.freeze({ id: 'inventory', label: '物品栏', keys: ['物品栏', '物品', '背包'] }),
    Object.freeze({ id: 'relationships', label: '人物关系', keys: ['人物关系', 'npc_data', 'NPC数据'] }),
    Object.freeze({ id: 'abilities', label: '序列能力', keys: ['序列能力列表', '能力清单'] }),
    Object.freeze({ id: 'battle', label: '战斗系统', keys: ['战斗', '战斗数据'] }),
    Object.freeze({ id: 'divination', label: '占卜系统', keys: ['占卜'] }),
    Object.freeze({ id: 'original-plot-guide', label: '原著剧情指引', keys: [] }),
    Object.freeze({ id: 'command', label: '指令中心', keys: ['指令', '命令'] }),
    Object.freeze({ id: 'source-castle', label: '源堡系统', keys: ['源堡', '源堡系统'] }),
    Object.freeze({ id: 'archive', label: '档案详情', keys: [] }),
    Object.freeze({ id: 'industry', label: '我的产业', keys: ['产业', '产业数据'] }),
    Object.freeze({ id: 'faction', label: '势力管理', keys: ['势力', '势力数据'] }),
    Object.freeze({ id: 'domain', label: '独立领地', keys: ['领地'] }),
    Object.freeze({ id: 'theater', label: '进入剧场', keys: ['剧场', '剧场点数'] }),
    Object.freeze({ id: 'custom-content', label: '自建内容', keys: ['自建内容', '自定义内容'] }),
    Object.freeze({ id: 'image-generation', label: '图像生成', keys: [] }),
    Object.freeze({ id: 'random-events', label: '随机事件', keys: [] }),
    Object.freeze({ id: 'event-generator', label: '事件词库生成', keys: [] }),
    Object.freeze({ id: 'map', label: '世界地图', keys: ['地图', 'map_data', '当前位置'] }),
    Object.freeze({ id: 'variables', label: '变量修改器', keys: [] }),
    Object.freeze({ id: 'variable-ai-config', label: '变量 AI 配置', keys: [] }),
    Object.freeze({ id: 'dlc', label: 'DLC管理器', keys: ['DLC', 'dlc', '扩展内容'] }),
    Object.freeze({ id: 'worldbook-profiles', label: '世界书开关方案', keys: [] }),
    Object.freeze({ id: 'dual-worldbook', label: '双库世界书管理', keys: [] }),
    Object.freeze({ id: 'worldbook', label: '世界书', keys: [], hostButton: '#WIDrawerIcon' }),
    Object.freeze({ id: 'extracted', label: '提取内容', keys: ['cryptLord'] }),
    Object.freeze({ id: 'settings', label: '系统设置', keys: [] }),
    Object.freeze({ id: 'diagnostics', label: '诊断', keys: [] }),
  ]);

  const state = {
    root: null,
    left: null,
    leftBody: null,
    menu: null,
    modal: null,
    modalTitle: null,
    modalBody: null,
    modalDialog: null,
    modalPosition: { x: 0, y: 0 },
    commandBall: null,
    commandPanel: null,
    commandBody: null,
    commandLoadToken: 0,
    current: null,
    subscriptions: [],
    cleanups: [],
    inventoryBusy: false,
    questBusy: false,
    relationshipBusy: false,
    relationshipBatch: false,
    relationshipSelected: new Set(),
    inventoryBatch: false,
    abilitiesBusy: false,
    battleBusy: false,
    battleAutoTimer: null,
    battleAutoSteps: 0,
    battleAutoPaused: false,
    battleTerrainTool: 'move',
    pathwayPool: null,
    pathwayPoolPromise: null,
    mysteryBusy: false,
    mysterySummaries: null,
    mysteryResult: '',
    scrollView: 'list',
    scrollEditId: '',
    scrollDraft: null,
    scrollMaterial: '',
    scrollQuantity: 1,
    scrollAllocation: {},
    scrollResults: null,
    scrollBusy: false,
    shamanPlace: '',
    shamanMaterials: {},
    shamanBusy: false,
    pictureBusy: false,
    picturePathway: '',
    pictureMaterials: {},
    imaginationBusy: false,
    grazingBusy: false,
    grazingCandidate: '',
    grazingDraft: null,
    grazingResult: '',
    readerBusy: false,
    readerEditSlot: 1,
    readerLearningSlot: 1,
    readerCandidate: '',
    readerDraft: null,
    readerResult: '',
    reenactBusy: false,
    reenactSlot: 1,
    reenactDraft: null,
    reenactResult: '',
    arbiterDraft: null,
    arbiterBusy: false,
    arbiterResult: '',
    chatToken: 0,
    refreshToken: 0,
    disposed: false,
  };

  function record(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  function safeText(value, fallback = '—') {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    try { return JSON.stringify(value); } catch { return fallback; }
  }

  function notify(message, level = 'info') {
    const fn = window.toastr?.[level];
    if (typeof fn === 'function') fn(message);
    else console[level === 'error' ? 'error' : 'info'](`[${KEY}] ${message}`);
  }

  function cancelBattleAuto() {
    if (state.battleAutoTimer != null) clearTimeout(state.battleAutoTimer);
    state.battleAutoTimer = null;
  }

  function displayValue(value, fallback = '—', depth = 0) {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (depth >= 2) return '…';
    if (Array.isArray(value)) {
      const items = value.map(item => displayValue(item, '', depth + 1)).filter(item => item && item !== '—').slice(0, 4);
      return items.length ? items.join('、') : fallback;
    }
    if (record(value)) {
      const entries = Object.entries(value).filter(([key]) => key !== '$meta');
      if (!entries.length) return fallback;
      return entries.slice(0, 3).map(([key, item]) => {
        const text = displayValue(item, '', depth + 1);
        return text ? `${key}：${text}` : key;
      }).join('；');
    }
    return fallback;
  }

  function numeric(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function messageText(message) {
    return typeof message?.message === 'string' ? message.message : '';
  }

  function journeyFromText(text) {
    const block = String(text || '').match(/<本周目经历>\s*([\s\S]*?)(?:<\/本周目经历>|(?=\n\s*<[^>]+>)|$)/i);
    if (!block) return null;
    const fields = {};
    block[1].split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*([^|\n]{1,24})\|\s*(.*?)\s*$/);
      if (match && match[2]) fields[match[1].trim()] = match[2].trim();
    });
    // Earlier regex records commonly serialize all journey fields onto one line.
    // Preserve their full values without requiring a migration or a write-back.
    if (Object.keys(fields).length <= 1) {
      const labels = ['序号', '日期', '时间', '大纲', '地点', '在场人物', '详细描述', '核心侧写', '事件标签', '核心锚点'];
      const labelPattern = labels.join('|');
      const inline = new RegExp(`(?:^|\\s)(${labelPattern})\\|\\s*([\\s\\S]*?)(?=\\s+(?:${labelPattern})\\||$)`, 'g');
      let match = inline.exec(block[1]);
      while (match) {
        if (match[2].trim()) fields[match[1]] = match[2].trim();
        match = inline.exec(block[1]);
      }
    }
    return Object.keys(fields).length ? fields : null;
  }

  function displayedText(messageElement) {
    return String(messageElement?.innerText || messageElement?.textContent || '');
  }

  function legacySnapshot(messageElement) {
    const source = displayedText(messageElement?.closest?.('.mes')?.querySelector?.('.mes_reasoning'));
    if (!source) return { stat: {}, data: {} };
    const read = label => source.match(new RegExp(`(?:^|\\n)\\s*(?:[-*]\\s*)?${label}[：:]\\s*([^\\n]+)`, 'm'))?.[1]?.trim();
    const stat = {};
    const data = {};
    const path = read('选择途径');
    const sequence = read('当前序列') || read('初始序列');
    const talents = read('天赋');
    const premise = read('自定义人设');
    const items = read('物品');
    const allocation = read('属性分配') || read('初始属性');
    if (path) stat.当前途径 = path;
    if (sequence) stat.当前序列 = sequence;
    if (talents) stat.天赋 = talents;
    if (premise) stat.非凡特性 = premise;
    if (items) {
      const inventory = items.split(/[，,、]/).map(item => item.trim()).filter(Boolean);
      stat.装备 = inventory;
      data.物品栏 = inventory;
    }
    if (allocation) {
      allocation.split(/[，,；;]/).forEach(part => {
        const match = part.match(/(活力|灵性|理智|人性|敏捷|运气)\s*\+?\s*(\d+(?:\.\d+)?)/);
        if (match) stat[match[1]] = numeric(match[2]);
      });
    }
    return { stat, data };
  }

  function compatibilityFor(message, messageElement = null) {
    const storedText = messageText(message);
    const renderedText = displayedText(messageElement);
    const journey = journeyFromText(storedText) || journeyFromText(renderedText);
    const normalizer = modules[NORMALIZER_KEY];
    const actions = normalizer?.extractLegacyActions?.(`${storedText}\n${renderedText}`, messageElement) || [];
    const legacy = legacySnapshot(messageElement);
    if (!journey && !actions.length && !Object.keys(legacy.stat).length) return null;
    const stat = { ...legacy.stat };
    const portrait = String(journey?.['核心侧写'] || '').match(/^\s*([^：:；;\s]{1,40})\s*[：:]/);
    if (portrait?.[1]) stat.名称 = portrait[1];
    if (journey?.地点) stat.当前地点 = journey.地点;
    const time = [journey?.日期, journey?.时间].filter(Boolean).join(' ');
    if (time) stat.当前状态 = time;
    if (journey?.['核心锚点']) stat.当前任务 = journey['核心锚点'];
    return { journey, stat, actions, data: legacy.data };
  }

  function statForCurrent(current = state.current) {
    if (record(current?.data?.stat_data)) {
      const stat = current.data.stat_data;
      const fallback = current.compatibility?.stat || {};
      const display = { ...stat };
      for (const key of ['名称', '当前地点', '当前状态', '当前任务']) {
        const value = stat[key];
        const empty = value == null || value === '' ||
          record(value) && !Object.keys(value).some(child => child !== '$meta');
        if (empty && fallback[key] !== undefined) display[key] = fallback[key];
      }
      return display;
    }
    return current?.compatibility?.stat || {};
  }

  function actionsForCurrent(current = state.current) {
    const nativeActions = current?.data?.cryptLord?.actions;
    if (Array.isArray(nativeActions)) return nativeActions.map(value => String(value ?? '').trim()).filter(Boolean).slice(0, 8);
    return current?.compatibility?.actions || [];
  }

  function theme() {
    try { return window.localStorage?.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
  }

  function setTheme(value) {
    const next = value === 'light' ? 'light' : 'dark';
    try { window.localStorage?.setItem(THEME_KEY, next); } catch { /* unavailable storage */ }
    const document = afterNative.getHost()?.document;
    Array.from(document?.querySelectorAll?.('.crypt-lord-original-ui') || []).forEach(node => { node.dataset.theme = next; });
    state.root?.setAttribute('data-theme', next);
  }

  function element(tag, className, text) {
    const node = afterNative.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(label, className, handler) {
    const node = element('button', className, label);
    node.type = 'button';
    node.addEventListener('click', handler);
    return node;
  }

  function findPath(source, path) {
    return path.split('.').reduce((value, key) => record(value) || Array.isArray(value) ? value?.[key] : undefined, source);
  }

  function valueFor(feature, current) {
    const payloads = [current?.data, current?.compatibility?.data, current?.compatibility?.stat].filter(record);
    for (const payload of payloads) {
      for (const key of feature.keys) {
        const value = findPath(payload, key) ?? findPath(payload?.stat_data, key);
        if (value !== undefined && value !== null) return value;
      }
    }
    return undefined;
  }

  function clear(node) {
    while (node?.firstChild) node.removeChild(node.firstChild);
  }

  function renderValue(parent, value, depth = 0) {
    if (depth > 3 || !record(value) && !Array.isArray(value)) {
      parent.appendChild(element('div', 'crypt-lord-game-shell__plain-value', safeText(value)));
      return;
    }
    if (Array.isArray(value)) {
      if (!value.length) {
        parent.appendChild(element('div', 'crypt-lord-game-shell__empty', '暂无记录'));
        return;
      }
      const list = element('div', 'crypt-lord-game-shell__value-list');
      value.slice(0, 60).forEach(item => {
        const entry = element('div', 'crypt-lord-game-shell__value-entry');
        renderValue(entry, item, depth + 1);
        list.appendChild(entry);
      });
      parent.appendChild(list);
      return;
    }
    const list = element('dl', 'crypt-lord-game-shell__value-grid');
    Object.entries(value).filter(([key]) => key !== '$meta').slice(0, 80).forEach(([key, item]) => {
      list.append(element('dt', 'crypt-lord-game-shell__value-key', key));
      const detail = element('dd', 'crypt-lord-game-shell__value-detail');
      renderValue(detail, item, depth + 1);
      list.appendChild(detail);
    });
    parent.appendChild(list);
  }

  function inventoryEntry(value, category, hint = '', source = null) {
    if (value === null || value === undefined || value === '') return [];
    if (Array.isArray(value)) return value.flatMap((item, index) => inventoryEntry(item, category, '', source ? { ...source, itemKey: String(index) } : null));
    if (!record(value)) return [{ category, name: hint || safeText(value), quantity: null, description: '', details: null }];
    const name = safeText(value.名称 ?? value.名字 ?? value.物品名 ?? value.name ?? hint, '未命名物品');
    const quantity = value.数量 ?? value.数目 ?? value.count ?? value.quantity ?? null;
    const description = safeText(value.描述 ?? value.说明 ?? value.简介 ?? value.效果 ?? value.description ?? '', '');
    const looksLikeItem = ['名称', '名字', '物品名', 'name', '数量', '数目', 'count', 'quantity', '描述', '说明', '效果', '品质', '类型', '等级'].some(key => Object.hasOwn(value, key));
    if (looksLikeItem) return [{ category, name, quantity, description, details: value, source: source?.itemKey !== undefined ? source : null }];
    return Object.entries(value)
      .filter(([key]) => key !== '$meta')
      .flatMap(([key, item]) => {
        if (typeof item === 'number') return [{ category, name: key, quantity: item, description: '', details: { 数量: item } }];
        if (typeof item === 'string') return [{ category, name: key, quantity: null, description: item, details: { 描述: item } }];
        return inventoryEntry(item, category, key, source ? { ...source, itemKey: key } : null);
      });
  }

  function inventoryGroups(current = state.current) {
    const data = record(current?.data) ? current.data : {};
    const stat = statForCurrent(current);
    const world = record(data.world_data) ? data.world_data : {};
    const definitions = [
      { label: '武器', listKey: '武器列表', values: [stat.武器列表] },
      { label: '衣物', listKey: '衣物列表', values: [stat.衣物列表] },
      { label: '饰品', listKey: '饰品列表', values: [stat.饰品列表] },
      { label: '封印物', listKey: '封印物列表', values: [stat.封印物列表] },
      { label: '扮演法', listKey: '扮演法列表', values: [stat.扮演法列表] },
      { label: '辅助能力', listKey: '辅助能力列表', values: [stat.辅助能力列表] },
      { label: '消耗品', listKey: '消耗品列表', values: [stat.消耗品列表] },
      { label: '杂物', listKey: '其他列表', values: [stat.其他列表] },
      { label: '已装备 / 封印物', values: [stat.装备, stat.装备栏, stat.封印物, stat.封印物品, data.装备, data.装备栏] },
      { label: '背包物品', values: [stat.物品栏, stat.背包, stat.物品, data.物品栏, data.背包, data.物品, world.物品栏, world.背包] },
      { label: '消耗品与材料', values: [stat.消耗品, stat.材料, stat.道具, data.消耗品, data.材料, data.道具, world.消耗品, world.材料] },
      { label: '货币与资源', values: [stat.货币, stat.资源, stat.金钱, stat.金镑, data.货币, data.资源, world.货币, world.资源] },
    ];
    const seen = new Set();
    return definitions.map(group => {
      const entries = group.values.flatMap(value => {
        if (value === undefined || value === null || seen.has(value)) return [];
        seen.add(value);
        if (group.listKey === '武器列表' && record(value) && !Array.isArray(value)) {
          const enhancement = modules['cryptLord.savantEnhancement'];
          const projected = enhancement ? Object.fromEntries(Object.entries(value)
            .map(([key, item]) => [key, enhancement.resolveWeapon(item, data, group.listKey, key)])) : value;
          return inventoryEntry(projected, group.label, '', { listKey: group.listKey });
        }
        return inventoryEntry(value, group.label, '', group.listKey ? { listKey: group.listKey } : null);
      });
      return { ...group, entries };
    }).filter(group => group.entries.length);
  }

  async function setEquipped(entry, enabled) {
    if (state.inventoryBusy || !entry?.source || !Number.isInteger(state.current?.message_id)) return;
    const { listKey, itemKey } = entry.source;
    state.inventoryBusy = true;
    try {
      const store = await contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 });
      const messageId = state.current.message_id;
      const message = await store.readMessage(messageId);
      if (message?.role !== 'assistant') throw new Error('目标楼层不再是 assistant。');
      const before = message.data || {};
      const next = equipmentState.apply(before, listKey, itemKey, entry.name, enabled);
      await store.writeAssistantData(messageId, next);
      if (state.current?.message_id === messageId) state.current.data = next;
      root.__stage1Modules?.[VARIABLE_WORKBENCH_KEY]?.notifyUpdate?.({
        messageId, beforeData: before, afterData: next, source: enabled ? 'inventory-equip' : 'inventory-unequip',
      });
      renderLeftPanel();
      notify(`${enabled ? '已装备' : '已卸下'} ${entry.name}`, 'success');
    } catch (error) {
      notify(`装备操作失败：${error?.message || error}`, 'error');
    } finally {
      state.inventoryBusy = false;
      if (state.modal?.getAttribute('data-open') === 'true' && state.modalTitle?.textContent === '物品栏') renderInventory();
    }
  }

  async function batchDeleteInventory(selections) {
    if (state.inventoryBusy || !Number.isInteger(state.current?.message_id)) return;
    const hostWindow = afterNative.getHost()?.window || window;
    if (!hostWindow.confirm?.(`确定删除选中的 ${selections.length} 件物品吗？此操作不可恢复。`)) return;
    state.inventoryBusy = true;
    try {
      const store = await contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 });
      const messageId = state.current.message_id;
      const message = await store.readMessage(messageId);
      if (message?.role !== 'assistant') throw new Error('目标楼层不再是 assistant。');
      const before = message.data || {};
      const result = inventoryState.remove(before, selections);
      await store.writeAssistantData(messageId, result.data);
      if (state.current?.message_id === messageId) state.current.data = result.data;
      root.__stage1Modules?.[VARIABLE_WORKBENCH_KEY]?.notifyUpdate?.({
        messageId, beforeData: before, afterData: result.data, source: 'inventory-batch-delete',
      });
      state.inventoryBatch = false;
      renderLeftPanel();
      notify(`已删除 ${result.removed} 件物品。`, 'success');
    } catch (error) {
      notify(`批量删除失败：${error?.message || error}`, 'error');
    } finally {
      state.inventoryBusy = false;
      if (state.modal?.dataset.open === 'true' && state.modalTitle?.textContent === '物品栏') renderInventory();
    }
  }

  async function giftInventory(entry, npcName) {
    if (state.inventoryBusy || !Number.isInteger(state.current?.message_id)) return;
    const messageId = state.current.message_id;
    const hostWindow = afterNative.getHost()?.window || window;
    const gain = inventoryState.giftGain(entry.details);
    if (!hostWindow.confirm?.(`确定将「${entry.name}」赠予 ${npcName}？装备将移出物品栏，NPC 获得 ${gain} 战斗经验。`)) return;
    state.inventoryBusy = true;
    try {
      const store = await contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 });
      if (state.current?.message_id !== messageId) throw new Error('当前楼层已变化，请重新打开物品栏。');
      const message = await store.readMessage(messageId);
      if (message?.role !== 'assistant') throw new Error('目标楼层不再是 assistant。');
      const before = message.data || {};
      const result = inventoryState.gift(before, {
        ...entry.source,
        name: String(entry.details?.名称 ?? entry.details?.name ?? entry.name),
        id: entry.details?.id,
      }, npcName);
      if (state.current?.message_id !== messageId) throw new Error('当前楼层已变化，请重新打开物品栏。');
      await store.writeAssistantData(messageId, result.data);
      if (state.current?.message_id === messageId) state.current.data = result.data;
      root.__stage1Modules?.[VARIABLE_WORKBENCH_KEY]?.notifyUpdate?.({
        messageId, beforeData: before, afterData: result.data, source: 'inventory-gift-npc',
      });
      renderLeftPanel();
      notify(`已将「${entry.name}」赠予 ${npcName}，+${result.gain} 战斗经验（Lv.${result.level}）。`, 'success');
      renderInventory();
    } catch (error) {
      notify(`赠予失败：${error?.message || error}`, 'error');
    } finally {
      state.inventoryBusy = false;
      if (state.modalTitle?.textContent === '赠予装备') renderGiftPicker(entry);
    }
  }

  function renderGiftPicker(entry) {
    if (!openModal('赠予装备')) return;
    const npcData = state.current?.data?.npc_data;
    const candidates = record(npcData)
      ? Object.entries(npcData).filter(([name, npc]) => name !== '$meta' && record(npc))
      : [];
    const back = button('返回物品栏', 'crypt-lord-game-shell__inventory-action', renderInventory);
    back.disabled = state.inventoryBusy;
    state.modalBody.appendChild(back);
    const gain = inventoryState.giftGain(entry.details);
    state.modalBody.appendChild(element('p', 'crypt-lord-game-shell__gift-summary',
      `将「${entry.name}」赠予 NPC，转化为 +${gain} 战斗经验；装备将移出你的物品栏，写入 NPC 持有物品文本，不提供装备属性加成。`));
    if (!candidates.length) {
      state.modalBody.appendChild(element('div', 'crypt-lord-game-shell__empty', '当前楼层没有可赠予的 NPC。'));
      return;
    }
    const list = element('div', 'crypt-lord-game-shell__gift-list');
    candidates.forEach(([name, npc]) => {
      const row = button('', 'crypt-lord-game-shell__gift-target', () => { void giftInventory(entry, name); });
      row.disabled = state.inventoryBusy;
      row.append(
        element('strong', '', name),
        element('span', '', `${safeText(npc.当前序列, '普通人')} · Lv.${Number(npc.$战斗经验等级) || 0}`),
      );
      list.appendChild(row);
    });
    state.modalBody.appendChild(list);
  }

  async function renderBattleSystem() {
    if (!openModal('战斗系统')) return;
    const hostWindow = afterNative.getHost()?.window || window;
    const gameAudio = modules[GAME_AUDIO_KEY];
    const gameAudioControl = modules[GAME_AUDIO_CONTROL_KEY];
    state.modal.dataset.audioActive = 'true';
    const body = state.modalBody;
    clear(body);

    const stat = statForCurrent();
    const domain = stat.领地;
    const garrison = domain?.驻军 || {};
    const armies = garrison.军队 || [];
    const loose = garrison.散兵 || [];
    const domainState = root.__stage1Modules?.['cryptLord.domainState'] || window.cryptLord?.domainState;

    const personal = element('section', 'crypt-lord-game-shell__battle-session');
    const battle = personalBattleState.get(state.current?.data);
    const activeTeam = teamBattleState?.get(state.current?.data);
    const lifeSave = modules[BATTLE_LIFE_SAVE_KEY];
    if (gameAudio) {
      const inBattle = battle?.status === 'active' || activeTeam?.status === 'active';
      gameAudio.enter(inBattle ? 'battle' : 'prep', 'duel');
      if (inBattle) void gameAudio.preload();
    }
    const modifierLabels = {
      attack: '攻击',
      defense: '防御',
      speed: '速度',
      damageDealtIncrease: '造成伤害增加',
      damageDealtDecrease: '造成伤害减少',
      damageTakenIncrease: '受到伤害增加',
      damageTakenDecrease: '受到伤害减少',
    };
    const effectDetail = effect => ['buff', 'debuff'].includes(effect.type)
      ? `${modifierLabels[effect.stat] || effect.stat} ${['attack', 'defense'].includes(effect.stat) ? (effect.type === 'buff' ? '+' : '-') : ''}${effect.power}${effect.valueType === 'percentage' ? '%' : ' 点'}`
      : `${effect.power} 点`;
    const renderPersonalBattle = () => { void renderBattleSystem(); };
    const scheduleAuto = () => {
      cancelBattleAuto();
      const current = personalBattleState.get(state.current?.data);
      if (state.disposed || state.modal?.dataset.open !== 'true' ||
        state.modalTitle?.textContent !== '战斗系统' || current?.status !== 'active' ||
        !current.autoPilot?.on || state.battleAutoPaused || state.battleAutoSteps >= 40) return;
      const token = state.chatToken;
      const messageId = state.current.message_id;
      const battleId = current.id;
      state.battleAutoTimer = setTimeout(() => {
        state.battleAutoTimer = null;
        if (state.disposed || token !== state.chatToken ||
          messageId !== state.current?.message_id ||
          battleId !== state.current?.data?.cryptLord?.personalBattle?.id ||
          !state.current.data.cryptLord.personalBattle.autoPilot?.on ||
          state.modal?.dataset.open !== 'true' ||
          state.modalTitle?.textContent !== '战斗系统') return;
        state.battleAutoSteps += 1;
        void commitBattle(data => {
          if (data.cryptLord?.personalBattle?.id !== battleId ||
            !data.cryptLord.personalBattle.autoPilot?.on)
            return { ok: false, error: '战斗或托管状态已变化。' };
          const action = personalBattleState.autoPilotAction(data);
          if (!action) return { ok: false, error: '当前没有可托管的行动。' };
          return action.type === 'move'
            ? personalBattleState.move(data, action.x, action.y)
            : personalBattleState.act(data, action);
        }, true, true);
      }, 450);
    };
    const commitBattle = async (operation, sound = false, automatic = false) => {
      if (state.battleBusy || !Number.isInteger(state.current?.message_id)) return;
      cancelBattleAuto();
      state.battleBusy = true;
      let succeeded = false;
      const token = state.chatToken;
      try {
        const store = await contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 });
        const messageId = state.current.message_id;
        const message = await store.readMessage(messageId);
        if (message?.role !== 'assistant') throw new Error('目标楼层不再是 assistant。');
        const before = message.data || {};
        const result = await operation(before, message.message);
        if (!result?.ok) throw new Error(result?.error || '战斗操作失败。');
        if (automatic && (state.modal?.dataset.open !== 'true' ||
          state.modalTitle?.textContent !== '战斗系统' ||
          !state.current?.data?.cryptLord?.personalBattle?.autoPilot?.on))
          throw new Error('托管已停止。');
        if (state.disposed || token !== state.chatToken || state.current?.message_id !== messageId)
          throw new Error('聊天或楼层已变化');
        const fresh = await store.readMessage(messageId);
        if (fresh?.role !== 'assistant' || fresh.message !== message.message ||
          JSON.stringify(fresh.data) !== JSON.stringify(before)) throw new Error('楼层正文或变量已变化，请重试');
        if (automatic && state.modal?.dataset.open !== 'true') throw new Error('托管窗口已关闭。');
        if (result.changed === false) {
          state.current.data = result.data;
          succeeded = true;
          return;
        }
        await store.writeAssistantData(messageId, result.data);
        const enemyHp = data => (data?.cryptLord?.teamBattle?.units || [])
          .filter(unit => unit.side === 'enemy').reduce((sum, unit) => sum + numeric(unit.hp), 0);
        if (sound && (
          numeric(result.data?.cryptLord?.personalBattle?.enemy?.hp, Infinity) <
            numeric(before?.cryptLord?.personalBattle?.enemy?.hp, Infinity) ||
          (before?.cryptLord?.teamBattle && enemyHp(result.data) < enemyHp(before))
        )) gameAudio?.fireVolley('hit');
        if (state.current?.message_id === messageId) state.current.data = result.data;
        root.__stage1Modules?.[VARIABLE_WORKBENCH_KEY]?.notifyUpdate?.({
          messageId, beforeData: before, afterData: result.data,
          source: result.data?.cryptLord?.teamBattle?.id !== before?.cryptLord?.teamBattle?.id ||
            result.data?.cryptLord?.teamBattle?.round !== before?.cryptLord?.teamBattle?.round ||
            result.data?.cryptLord?.teamBattle?.index !== before?.cryptLord?.teamBattle?.index
            ? 'team-battle' : 'personal-battle',
        });
        renderLeftPanel();
        succeeded = true;
      } catch (error) {
        if (automatic) state.battleAutoPaused = true;
        notify(`战斗操作失败：${error?.message || error}`, 'error');
      } finally {
        state.battleBusy = false;
        if (succeeded && state.modal?.dataset.open === 'true' &&
          state.modalTitle?.textContent === '战斗系统') renderPersonalBattle();
        if (automatic && state.battleAutoSteps >= 40) {
          state.battleAutoPaused = true;
          notify('托管已暂停：连续执行达到 40 步，请手动关闭后重新开启。', 'warning');
        } else if (succeeded && (automatic || personalBattleState.get(state.current?.data)?.autoPilot?.on)) {
          scheduleAuto();
        }
      }
    };
    const team = teamBattleState?.get(state.current?.data);
    if (lifeSave) {
      const activePlayer = team?.status === 'active'
        ? team.units.find(unit => unit.source === 'player')
        : battle?.status === 'active' ? battle.player : null;
      const current = activePlayer?.lifeSave;
      const eligibility = current || lifeSave.eligibility(stat.当前序列,
        stat.当前途径 ?? stat.途径 ?? stat.pathway ?? stat.所属途径, battle?.lifeSaveTable);
      if (eligibility.hasWeak) {
        const editor = element('details', 'crypt-lord-game-shell__battle-strategy');
        editor.appendChild(element('summary', '', `弱保命策略 · ${eligibility.weakName}${current ? `（剩余 ${current.weakLeft} 次）` : ''}`));
        const rows = element('div', 'crypt-lord-game-shell__battle-strategy-rows');
        const addRow = (stage = { damageOverMaxRatio: .3 }) => {
          const row = element('div', 'crypt-lord-game-shell__battle-strategy-row');
          const field = (label, value) => {
            const wrapper = element('label', 'crypt-lord-game-shell__battle-strategy-field');
            const input = element('input', 'crypt-lord-game-shell__settings-input');
            input.type = 'number'; input.min = '1'; input.max = '100'; input.step = '1';
            input.value = String(Math.round(value * 100));
            wrapper.append(element('span', '', label), input);
            return { wrapper, input };
          };
          const damage = field('来伤超过最大活力 %', stage.damageOverMaxRatio);
          const limit = element('label', 'crypt-lord-game-shell__battle-strategy-field');
          const enabled = element('input');
          enabled.type = 'checkbox'; enabled.checked = stage.hpBelowRatio != null;
          const hp = field('且当前活力低于 %', stage.hpBelowRatio ?? .5);
          hp.input.disabled = !enabled.checked;
          enabled.addEventListener('change', () => { hp.input.disabled = !enabled.checked; });
          limit.append(enabled, hp.wrapper);
          const remove = button('×', 'crypt-lord-game-shell__battle-effect-remove', () => {
            if (rows.childElementCount > 1) row.remove();
          });
          remove.title = '删除阶段'; remove.setAttribute('aria-label', '删除阶段');
          row.append(damage.wrapper, limit, remove);
          row.readStage = () => ({
            damageOverMaxRatio: Number(damage.input.value) / 100,
            ...(enabled.checked ? { hpBelowRatio: Number(hp.input.value) / 100 } : {}),
          });
          rows.appendChild(row);
        };
        (current?.strategy || lifeSave.storedStrategy(state.current?.data)).stages.forEach(addRow);
        const controls = element('div', 'crypt-lord-game-shell__battle-actions');
        controls.append(
          button('添加阶段', 'crypt-lord-game-shell__button', () => {
            if (rows.childElementCount < 10) addRow();
          }),
          button('恢复默认', 'crypt-lord-game-shell__button', () => {
            void commitBattle(data => lifeSave.saveStrategy(data, null));
          }),
          button('保存策略', 'crypt-lord-game-shell__button is-primary', () => {
            void commitBattle(data => lifeSave.saveStrategy(data, {
              stages: Array.from(rows.children, row => row.readStage()),
            }));
          }),
        );
        editor.append(rows, controls);
        body.appendChild(editor);
      }
      if (current?.hasStrong) body.appendChild(element('p', 'crypt-lord-game-shell__battle-resource',
        `强保命 · ${current.strongName} · 剩余 ${current.strongLeft} 次`));
    }
    if (teamBattleState) {
    const teamSession = element('section', 'crypt-lord-game-shell__battle-session');
    teamSession.appendChild(element('div', 'crypt-lord-game-shell__battle-heading', '多人战斗'));
    if (!team || team.status === 'finished') {
      const choices = teamBattleState.roster(state.current?.data);
      const setup = element('div', 'crypt-lord-game-shell__team-setup');
      const allyList = element('div', 'crypt-lord-game-shell__team-roster');
      const enemyList = element('div', 'crypt-lord-game-shell__team-roster');
      for (const row of choices) {
        for (const [list, side] of [[allyList, 'ally'], [enemyList, 'enemy']]) {
          const label = element('label', 'crypt-lord-game-shell__team-option');
          const checkbox = element('input');
          checkbox.type = 'checkbox';
          checkbox.value = row.key;
          checkbox.dataset.side = side;
          label.append(checkbox, element('span', '', `${row.name} · 序列 ${row.rank} · 活力 ${row.hp}`));
          list.appendChild(label);
        }
      }
      const allies = element('div');
      allies.append(element('strong', '', '我方盟友'), allyList);
      const enemies = element('div');
      enemies.append(element('strong', '', '敌方单位'), enemyList);
      setup.append(allies, enemies);
      teamSession.appendChild(setup);
      const launch = button('开始多人战斗', 'crypt-lord-game-shell__button is-primary', () => {
        const picked = side => Array.from(setup.querySelectorAll(`input[data-side="${side}"]:checked`),
          checkbox => checkbox.value);
        const allyKeys = picked('ally');
        const enemyKeys = picked('enemy');
        if (!enemyKeys.length || allyKeys.some(key => enemyKeys.includes(key))) {
          notify('至少选择一名敌人；同一 NPC 不能同时属于双方。', 'warning');
          return;
        }
        void commitBattle(async (data, evidence) => {
          const preflight = teamBattleState.start(data, {
            allies: allyKeys, enemies: enemyKeys,
          });
          if (!preflight.ok) return preflight;
          let lifeSaveTable;
          try { lifeSaveTable = await lifeSave?.load(); }
          catch (error) { notify(`保命配置不可用，本场按内置规则：${error?.message || error}`, 'warning'); }
          let tagRules;
          try { tagRules = await modules['cryptLord.battleTags']?.load(); }
          catch (error) { notify(`标签配置不可用，本场不使用标签修正：${error?.message || error}`, 'warning'); }
          let pathways = state.pathwayPool?.pathways;
          if (modules['cryptLord.battleFieldEffects'] && !pathways) {
            try {
              if (state.pathwayPoolPromise) await state.pathwayPoolPromise;
              pathways = (state.pathwayPool || await abilityState.loadPool()).pathways;
            } catch (error) {
              notify(`途径库不可用，本场使用现有途径信息：${error?.message || error}`, 'warning');
            }
          }
          let opening = null;
          try {
            const [host, settlement] = await Promise.all([
              contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 }),
              contract.waitGlobalInitialized(VARIABLE_SETTLEMENT_API_KEY, { timeoutMs: 10000 }),
            ]);
            const painter = modules[BATTLEFIELD_PAINTER_KEY];
            if (!painter) throw new Error('战场绘制模块不可用');
            const actors = preflight.battle.units.map(unit => ({
              编号: unit.id, 名称: unit.name, 阵营: unit.side === 'ally' ? '我方' : '敌方',
            }));
            const weapons = modules['cryptLord.weaponClassifier']?.collect(data) || [];
            const npcWeapons = modules['cryptLord.npcWeaponAssigner']
              ?.collectTeam(preflight.data) || [];
            const prompt = painter.prompt(preflight.battle.board.cols,
              preflight.battle.board.rows, evidence, actors, weapons, npcWeapons);
            const settings = await settlement.readSettings();
            const config = {
              should_silence: true, should_stream: false, max_chat_history: 0,
              use_mes_examples: false, use_story_string: false, use_authors_note: false,
              use_persona: false,
              ordered_prompts: [
                { role: 'system', content: prompt.system },
                { role: 'user', content: prompt.user },
              ],
            };
            if (settings.useCustomApi) {
              if (!settings.apiUrl || !settings.model)
                throw new Error('系统副 API 未配置完整');
              config.custom_api = { apiurl: settings.apiUrl, key: settings.apiKey,
                model: settings.model, source: 'openai' };
            }
            opening = painter.parse(await host.generateRaw(config));
            if (!opening) throw new Error('模型未返回有效战场 JSON');
          } catch (error) {
            notify(`战场生成不可用，本场以普通棋盘开战：${error?.message || error}`, 'warning');
          }
          return teamBattleState.start(data, {
            allies: allyKeys, enemies: enemyKeys, opening, lifeSaveTable, tagRules, pathways,
          });
        });
      });
      launch.disabled = state.battleBusy || !choices.length ||
        personalBattleState.get(state.current?.data)?.status === 'active' ||
        (team?.status === 'finished' && !team.settled);
      teamSession.appendChild(launch);
      if (team?.status === 'finished') {
        teamSession.appendChild(element('p', 'crypt-lord-game-shell__battle-result',
          `上一场：${({ victory: '胜利', defeat: '失败', draw: '平局' })[team.result] || team.result}`));
        const summary = teamBattleState.report(state.current?.data);
        const report = element('div', 'crypt-lord-game-shell__battle-log');
        for (const unit of team.units) report.appendChild(element('p', '',
          `${unit.name} · ${unit.side === 'ally' ? '我方' : '敌方'} · 活力 ${unit.hp}/${unit.maxHp} · 输出 ${unit.damage} · 治疗 ${unit.healing} · 击倒 ${unit.kills}${unit.lifeSave?.hasStrong || unit.lifeSave?.hasWeak ? ` · 保命已用 强 ${unit.lifeSave.strongUsed}/1 · 弱 ${unit.lifeSave.weakUsed}/3` : ''}`));
        report.appendChild(element('p', '', `经验池 ${summary?.experience?.pool || 0}`));
        teamSession.appendChild(report);
        if (!team.settled) {
          const actions = element('div', 'crypt-lord-game-shell__battle-actions');
          actions.append(
            button('确认战报与经验', 'crypt-lord-game-shell__button is-primary',
              () => { void commitBattle(data => teamBattleState.settle(data, team.id, true)); }),
            button('放弃结算', 'crypt-lord-game-shell__button',
              () => { void commitBattle(data => teamBattleState.settle(data, team.id, false)); }),
          );
          teamSession.appendChild(actions);
        }
      }
    } else {
      const actor = team.units.find(unit => unit.id === team.queue[team.index]);
      teamSession.appendChild(element('p', 'crypt-lord-game-shell__battle-turn',
        `第 ${team.round} 回合 · ${team.phase === 'tactic' ? '战术阶段' : `行动：${actor?.name || '未知'}`}`));
      const overview = element('div', 'crypt-lord-game-shell__battle-overview');
      const formulas = team.formulas?.version === 1 && modules['cryptLord.battleFormulas'];
      for (const unit of team.units) {
        const card = element('article', 'crypt-lord-game-shell__battle-unit');
        card.append(element('strong', '', `${unit.side === 'ally' ? '我方' : '敌方'} · ${unit.name}`),
          element('span', '', `活力 ${unit.hp}/${unit.maxHp} · 灵性 ${unit.spirit}/${unit.maxSpirit} · 理智 ${unit.sanity}/${unit.maxSanity} · (${unit.x}, ${unit.y})`));
        if (formulas) {
          card.appendChild(element('span', '',
            `敏捷 ${unit.agility}/${unit.maxAgility} · 人性 ${unit.humanity}/${unit.maxHumanity} · 运气 ${unit.luck} · 神性 ${unit.divinity}`));
          const types = { physical: '物理', mystical: '神秘', mental: '精神', mixed: '混合' };
          card.appendChild(element('span', '', Object.entries(types).map(([type, label]) =>
            `${label} ${formulas.attribute(team, unit, 'attack', type)}/${formulas.attribute(team, unit, 'defense', type)}`).join(' · ')));
          card.appendChild(element('span', '', `移动 ${unit.moveRemaining}/${unit.movement}`));
        }
        if (unit.fallbackWeapon) card.appendChild(element('span', '',
          `本场武器 · ${unit.fallbackWeapon.显示名} · ${unit.fallbackWeapon.射程}`));
        const effects = (unit.effects || []).filter(effect => !effect.auraEffect && !effect.fieldEffect);
        if (effects.length) card.appendChild(element('span', '',
          effects.map(effect => `${effect.passive ? '被动 · ' : ''}${effect.name} ${effect.power}${effect.valueType === 'fixed' ? ' 点' : '%'} · ${effect.battlePersistent ? '整场' : `${effect.duration} 回合`}`).join('、')));
        for (const line of modules['cryptLord.battleAuras']?.statusLines(team, unit) || [])
          card.appendChild(element('span', 'crypt-lord-game-shell__battle-aura-status', line));
        for (const line of modules['cryptLord.battleFieldEffects']?.statusLines(team, unit) || [])
          card.appendChild(element('span', 'crypt-lord-game-shell__battle-field-status', line));
        for (const line of modules['cryptLord.battleEffectTransfer']?.statusLines(team, unit) || [])
          card.appendChild(element('span', 'crypt-lord-game-shell__battle-field-status', line));
        for (const line of modules['cryptLord.battleBribery']?.statusLines(team, unit) || [])
          card.appendChild(element('span', 'crypt-lord-game-shell__battle-field-status', line));
        if (unit.tags?.length) card.appendChild(element('span',
          'crypt-lord-game-shell__battle-tags',
          unit.tags.map(tag => `${tag.name} ×${tag.stacks} · ${tag.duration} 回合`).join('、')));
        if (unit.lifeSave?.hasStrong || unit.lifeSave?.hasWeak) card.appendChild(element('span',
          'crypt-lord-game-shell__battle-life-save', [
            unit.lifeSave.hasStrong ? `${unit.lifeSave.strongName} ${unit.lifeSave.strongLeft}/1` : '',
            unit.lifeSave.hasWeak ? `${unit.lifeSave.weakName} ${unit.lifeSave.weakLeft}/3` : '',
          ].filter(Boolean).join(' · ')));
        overview.appendChild(card);
      }
      teamSession.appendChild(overview);
      const auraChoices = teamBattleState.auraOptions(state.current?.data);
      if (auraChoices.length) {
        const controls = element('div', 'crypt-lord-game-shell__battle-aura-controls');
        for (const choice of auraChoices) {
          const label = element('label', 'crypt-lord-game-shell__battle-aura-control');
          const toggle = element('input', '');
          toggle.type = 'checkbox';
          toggle.checked = choice.active;
          toggle.disabled = state.battleBusy || team.phase !== 'tactic' ||
            !(team.units.find(unit => unit.source === 'player')?.hp > 0);
          toggle.setAttribute('aria-label', `${choice.name}光环开关`);
          toggle.title = choice.active ? '关闭光环' : choice.everActivated ? '重新开启光环' : '开启光环';
          label.title = choice.description;
          toggle.addEventListener('change', () => {
            const enabled = toggle.checked;
            toggle.checked = choice.active;
            void commitBattle(data => teamBattleState.aura(data, choice.subtype, enabled));
          });
          label.append(toggle, element('span', '', `${choice.name} · 范围 ${choice.radius} 格 · 自身 ${choice.stacks} 层`));
          controls.appendChild(label);
        }
        teamSession.appendChild(controls);
      }
      if (team.scene) teamSession.appendChild(element('p',
        'crypt-lord-game-shell__battle-resource', team.scene));
      if (team.board?.base) teamSession.appendChild(element('p',
        'crypt-lord-game-shell__battle-resource',
        `基底 · ${team.board.base.name}（分级 ${team.board.base.tier}）`));
      if (team.naturalEnv) teamSession.appendChild(element('p',
        'crypt-lord-game-shell__battle-resource',
        Object.values(team.naturalEnv).filter(Boolean).join(' · ')));
      const board = element('div', 'crypt-lord-game-shell__battle-board');
      board.style.setProperty('--cl-battle-cols', String(team.board.cols));
      const reachable = new Set(teamBattleState.reachable(state.current?.data).map(cell => `${cell.x},${cell.y}`));
      const tacticalCells = new Map();
      let tacticAction = null;
      let updateTerrainChoices = null;
      for (let y = 0; y < team.board.rows; y++) for (let x = 0; x < team.board.cols; x++) {
        const occupied = team.units.find(unit => unit.hp > 0 && unit.x === x && unit.y === y);
        const tile = team.terrain?.find(row => row.x === x && row.y === y);
        const family = tile?.id ? modules['cryptLord.battleTerrainPresets']
          ?.option(tile.id)?.family : null;
        const cell = element('button', `crypt-lord-game-shell__battle-cell${tile
          ? ` is-terrain-${tile.blocked ? 'barrier' : family ? `family-${family}` : 'scene'}` : ''}${occupied
          ? ` is-${occupied.side === 'ally' ? 'player' : 'enemy'}` : ''}${reachable.has(`${x},${y}`) ? ' is-reachable' : ''}`);
        cell.type = 'button';
        cell.title = occupied ? `${occupied.name} · ${occupied.hp}/${occupied.maxHp}` :
          tile ? `${tile.name}${tile.duration == null ? '' : ` · ${tile.duration} 回合`}` :
            `${team.board.base?.name || '平地'} (${x}, ${y})`;
        cell.textContent = occupied ? occupied.name.slice(0, 1) : tile ? tile.id ? '◆' : '△' : '';
        cell.disabled = team.phase === 'tactic'
          ? state.battleBusy : Boolean(occupied) || !reachable.has(`${x},${y}`) ||
            state.battleBusy || (actor?.controller || actor?.source) !== 'player';
        if (team.phase === 'tactic') cell.addEventListener('click', () => {
          if (tacticAction?.value !== '改变地形') return;
          const key = `${x},${y}`;
          if (tacticalCells.has(key)) {
            tacticalCells.delete(key);
            cell.classList.remove('is-tactic-selected');
          } else {
            const points = [...tacticalCells.values(), { x, y }];
            if (points.length > 9 || Math.max(...points.map(point => point.x)) -
              Math.min(...points.map(point => point.x)) > 2 ||
              Math.max(...points.map(point => point.y)) -
              Math.min(...points.map(point => point.y)) > 2) {
              notify('所选格子须在 3×3 范围内，最多 9 格。', 'warning'); return;
            }
            tacticalCells.set(key, { x, y });
            cell.classList.add('is-tactic-selected');
          }
          updateTerrainChoices?.();
        });
        else if (!cell.disabled) cell.addEventListener('click', () => {
          void commitBattle(data => {
            const moved = teamBattleState.action(data, { type: 'move', x, y });
            return moved.ok ? teamBattleState.advanceAuto(moved.data) : moved;
          });
        });
        board.appendChild(cell);
      }
      const boardWrap = element('div', 'crypt-lord-game-shell__battle-board-wrap');
      boardWrap.appendChild(board);
      teamSession.appendChild(boardWrap);
      const props = element('details', 'crypt-lord-game-shell__battle-props');
      const livingProps = (team.props || []).filter(row => row.数量 > 0);
      props.appendChild(element('summary', '', `现场物件 · ${livingProps.length} 种`));
      if (livingProps.length) for (const prop of livingProps)
        props.appendChild(element('p', '', `${prop.名称} ×${prop.数量} · ${prop.描述 || '无描述'}`));
      else props.appendChild(element('p', '', '当前没有可用的现场物件。'));
      teamSession.appendChild(props);
      if (team.phase === 'tactic') {
        const controls = element('div', 'crypt-lord-game-shell__battle-actions');
        const action = element('select', 'crypt-lord-game-shell__settings-input');
        tacticAction = action;
        const skillControl = teamBattleState.skillControlOptions(state.current?.data);
        const fieldChoices = teamBattleState.fieldEffectOptions(state.current?.data);
        const transferChoices = teamBattleState.effectTransferOptions(state.current?.data);
        const briberyChoices = teamBattleState.briberyOptions(state.current?.data);
        for (const label of ['待命', '对角色使用战术', '改变地形',
          ...fieldChoices.length ? ['施加效果'] : [],
          ...transferChoices.length ? ['效果传递'] : [],
          ...briberyChoices.length ? ['贿赂'] : [],
          ...Object.keys(skillControl?.modes || {}).length ? ['技能干涉'] : []]) {
          const option = element('option', '', label); option.value = label; action.appendChild(option);
        }
        const target = element('select', 'crypt-lord-game-shell__settings-input');
        for (const unit of team.units.filter(row => row.hp > 0)) {
          const option = element('option', '', `${unit.side === 'ally' ? '我方' : '敌方'} · ${unit.name}`);
          option.value = unit.id; target.appendChild(option);
        }
        const description = element('textarea', 'crypt-lord-game-shell__settings-input');
        description.rows = 2;
        description.placeholder = '写明依据的能力、手段和目标；待命可留空';
        description.maxLength = 500;
        const terrainControls = element('div', 'crypt-lord-game-shell__battle-terrain-controls');
        const operation = element('select', 'crypt-lord-game-shell__settings-input');
        for (const [value, label] of [['add', '添加地形'], ['remove', '移除地形']]) {
          const option = element('option', '', label); option.value = value; operation.appendChild(option);
        }
        const kind = element('select', 'crypt-lord-game-shell__settings-input');
        const passable = element('option', '', '通行地形'); passable.value = 'passable';
        kind.appendChild(passable);
        const presets = modules['cryptLord.battleTerrainPresets']?.options() || [];
        for (const preset of presets) {
          const option = element('option', '', preset.name); option.value = preset.id; kind.appendChild(option);
        }
        const terrainName = element('input', 'crypt-lord-game-shell__settings-input');
        terrainName.placeholder = '通行地形名称';
        terrainName.maxLength = 40;
        const clear = element('select', 'crypt-lord-game-shell__settings-input');
        const controlFields = element('div', 'crypt-lord-game-shell__battle-terrain-controls');
        const controlTarget = element('select', 'crypt-lord-game-shell__settings-input');
        const controlMode = element('select', 'crypt-lord-game-shell__settings-input');
        const controlSkill = element('select', 'crypt-lord-game-shell__settings-input');
        for (const [mode, ability] of Object.entries(skillControl?.modes || {})) {
          const option = element('option', '', `${mode} · ${ability}`);
          option.value = mode; controlMode.appendChild(option);
        }
        for (const unit of skillControl?.targets || []) {
          const option = element('option', '', unit.name);
          option.value = unit.id; controlTarget.appendChild(option);
        }
        const syncControlSkills = () => {
          controlSkill.replaceChildren();
          const row = skillControl?.targets.find(unit => unit.id === controlTarget.value);
          for (const skill of row?.skills || []) {
            const option = element('option', '',
              `${skill.name}${skill.banned ? ' · 已封锁' : ''}`);
            option.value = skill.name; controlSkill.appendChild(option);
          }
        };
        controlTarget.addEventListener('change', syncControlSkills);
        syncControlSkills();
        controlFields.append(controlTarget, controlMode, controlSkill);
        const fieldControls = element('div', 'crypt-lord-game-shell__battle-field-controls');
        const fieldSubtype = element('select', 'crypt-lord-game-shell__settings-input');
        fieldSubtype.setAttribute('aria-label', '施加效果能力');
        const fieldTarget = element('select', 'crypt-lord-game-shell__settings-input');
        fieldTarget.setAttribute('aria-label', '施加效果目标');
        const fieldInfo = element('p', 'crypt-lord-game-shell__battle-field-info');
        const fieldPreview = element('div', 'crypt-lord-game-shell__battle-field-preview');
        for (const choice of fieldChoices) {
          const option = element('option', '', `${choice.action} · ${choice.name}`);
          option.value = choice.subtype; fieldSubtype.appendChild(option);
        }
        const syncFieldPreview = () => {
          const choice = fieldChoices.find(row => row.subtype === fieldSubtype.value);
          fieldInfo.textContent = choice
            ? `${choice.description} · 消耗 ${choice.cost} 点${choice.resource}${Number.isFinite(choice.remaining) ? ` · 本场剩余 ${choice.remaining} 次` : ''}${choice.reason ? ` · ${choice.reason}` : ''}`
            : '';
          fieldPreview.replaceChildren();
          if (choice?.hint) fieldPreview.appendChild(element('p', '', choice.hint));
          for (const row of teamBattleState.fieldEffectPreview(state.current?.data,
            fieldSubtype.value, fieldTarget.value))
            fieldPreview.appendChild(element('p', row.blocked || !row.power ? 'is-blocked' : '',
              `${row.name} · ${row.detail}${row.blocked ? ' · 已有不弱于本次的同类效果' : ''}`));
        };
        const syncFieldTargets = () => {
          const choice = fieldChoices.find(row => row.subtype === fieldSubtype.value);
          const previous = fieldTarget.value;
          fieldTarget.replaceChildren();
          fieldTarget.hidden = !choice?.needsPick;
          for (const unit of choice?.targets || []) {
            const option = element('option', '', `${unit.side === 'ally' ? '我方' : '敌方'} · ${unit.name}`);
            option.value = unit.id; fieldTarget.appendChild(option);
          }
          if (choice?.targets.some(row => row.id === previous)) fieldTarget.value = previous;
          syncFieldPreview();
        };
        fieldSubtype.addEventListener('change', syncFieldTargets);
        fieldTarget.addEventListener('change', syncFieldPreview);
        fieldControls.append(fieldSubtype, fieldTarget, fieldInfo, fieldPreview);
        syncFieldTargets();
        const transferControls = element('div', 'crypt-lord-game-shell__battle-transfer-controls');
        const transferSubtype = element('select', 'crypt-lord-game-shell__settings-input');
        transferSubtype.setAttribute('aria-label', '效果传递能力');
        const transferTarget = element('select', 'crypt-lord-game-shell__settings-input');
        transferTarget.setAttribute('aria-label', '效果传递目标');
        const transferInfo = element('p', 'crypt-lord-game-shell__battle-transfer-info');
        const transferPreview = element('div', 'crypt-lord-game-shell__battle-transfer-preview');
        for (const choice of transferChoices) {
          const option = element('option', '', choice.name); option.value = choice.subtype;
          transferSubtype.appendChild(option);
        }
        const syncTransferPreview = () => {
          const choice = transferChoices.find(row => row.subtype === transferSubtype.value);
          transferInfo.textContent = choice
            ? `${choice.description} · 消耗 ${choice.cost} 点灵性 · ${choice.direction}` : '';
          transferPreview.replaceChildren();
          const value = teamBattleState.effectTransferPreview(state.current?.data,
            transferSubtype.value, transferTarget.value);
          if (value?.current) transferPreview.appendChild(element('p', '',
            `现有关系：${value.current.name} → ${value.current.target} · 剩余 ${value.current.rounds} 回合`));
          if (value) transferPreview.appendChild(element('p', '',
            `扣费后出手属性 ${value.casterValue} · 目标六维最高 ${value.targetValue ?? '未选择'}`));
          if (choice?.gift) {
            for (const effect of choice.gifts) transferPreview.appendChild(element('p', '',
              `${effect.name} · ${effect.power}${effect.valueType === 'percentage' ? '%' : '点'} · ${effect.duration} 回合`));
            if (!choice.gifts.length) transferPreview.appendChild(element('p', 'is-blocked', '当前没有可赠予的负面效果。'));
          } else if (choice) transferPreview.appendChild(element('p', '',
            '成功后从下一回合起持续三个完整回合；刷新或换人失败时保留原关系。'));
          if (value?.reason) transferPreview.appendChild(element('p', 'is-blocked', value.reason));
        };
        const syncTransferTargets = () => {
          const choice = transferChoices.find(row => row.subtype === transferSubtype.value);
          const previous = transferTarget.value;
          transferTarget.replaceChildren();
          for (const unit of choice?.targets || []) {
            const option = element('option', '', unit.name); option.value = unit.id;
            transferTarget.appendChild(option);
          }
          if (choice?.targets.some(row => row.id === previous)) transferTarget.value = previous;
          syncTransferPreview();
        };
        transferSubtype.addEventListener('change', syncTransferTargets);
        transferTarget.addEventListener('change', syncTransferPreview);
        transferControls.append(transferSubtype, transferTarget, transferInfo, transferPreview);
        syncTransferTargets();
        const briberyControls = element('div', 'crypt-lord-game-shell__battle-bribery-controls');
        const briberySubtype = element('select', 'crypt-lord-game-shell__settings-input');
        briberySubtype.setAttribute('aria-label', '贿赂能力');
        const briberyTarget = element('select', 'crypt-lord-game-shell__settings-input');
        briberyTarget.setAttribute('aria-label', '贿赂目标');
        const briberyInfo = element('p', 'crypt-lord-game-shell__battle-bribery-info');
        const briberyPreview = element('div', 'crypt-lord-game-shell__battle-bribery-preview');
        for (const choice of briberyChoices) {
          const option = element('option', '', choice.name); option.value = choice.subtype;
          briberySubtype.appendChild(option);
        }
        const syncBriberyPreview = () => {
          const value = teamBattleState.briberyPreview(state.current?.data,
            briberySubtype.value, briberyTarget.value);
          briberyPreview.replaceChildren();
          if (!value) { briberyInfo.textContent = ''; return; }
          const effect = briberySubtype.value === '贿赂：削弱'
            ? `仅针对发动者的攻击及防御 −${value.power}%`
            : briberySubtype.value === '贿赂：关联' ? '仅发动者对该目标的战术拼点 ×1.2'
              : '禁止直接攻击发动者或选其为范围中心 · 5% 概率临时倒戈一回合';
          briberyInfo.textContent = `${effect} · 消耗 ${value.cost} 点灵性 · 持续 ${value.rounds} 回合`;
          briberyPreview.appendChild(element('p', '',
            `扣费后出手属性 ${value.casterValue} · 目标灵性/理智/人性最高 ${value.targetValue ?? '未选择'}`));
          if (value.current) briberyPreview.appendChild(element('p', '',
            `现有关系：${value.current.target} · 第 ${value.current.until} 回合末到期`));
          if (value.reason) briberyPreview.appendChild(element('p', 'is-blocked', value.reason));
        };
        const syncBriberyTargets = () => {
          const choice = briberyChoices.find(row => row.subtype === briberySubtype.value);
          const previous = briberyTarget.value;
          briberyTarget.replaceChildren();
          for (const unit of choice?.targets || []) {
            const option = element('option', '', unit.name); option.value = unit.id;
            briberyTarget.appendChild(option);
          }
          if (choice?.targets.some(row => row.id === previous)) briberyTarget.value = previous;
          syncBriberyPreview();
        };
        briberySubtype.addEventListener('change', syncBriberyTargets);
        briberyTarget.addEventListener('change', syncBriberyPreview);
        briberyControls.append(briberySubtype, briberyTarget, briberyInfo, briberyPreview);
        syncBriberyTargets();
        updateTerrainChoices = () => {
          terrainControls.hidden = action.value !== '改变地形';
          target.hidden = action.value !== '对角色使用战术';
          controlFields.hidden = action.value !== '技能干涉';
          fieldControls.hidden = action.value !== '施加效果';
          transferControls.hidden = action.value !== '效果传递';
          briberyControls.hidden = action.value !== '贿赂';
          description.hidden = ['技能干涉', '施加效果', '效果传递', '贿赂', '待命'].includes(action.value);
          kind.hidden = operation.value !== 'add';
          terrainName.hidden = operation.value !== 'add' || kind.value !== 'passable';
          clear.hidden = operation.value !== 'remove';
          const selected = clear.value;
          clear.replaceChildren();
          const names = new Set([...tacticalCells.values()].flatMap(point =>
            team.terrain?.filter(tile => tile.x === point.x && tile.y === point.y)
              .map(tile => tile.name) || []));
          for (const value of names) {
            const option = element('option', '', value); option.value = value; clear.appendChild(option);
          }
          if (names.has(selected)) clear.value = selected;
        };
        action.addEventListener('change', updateTerrainChoices);
        operation.addEventListener('change', updateTerrainChoices);
        kind.addEventListener('change', updateTerrainChoices);
        terrainControls.append(operation, kind, terrainName, clear);
        updateTerrainChoices();
        const submit = button('请求战术裁决', 'crypt-lord-game-shell__button is-primary', () => {
          if (action.value === '贿赂') {
            const value = teamBattleState.briberyPreview(state.current?.data,
              briberySubtype.value, briberyTarget.value);
            if (!value || value.reason) {
              notify(value?.reason || '请选择贿赂能力与目标。', 'warning'); return;
            }
            void commitBattle(data => {
              const result = teamBattleState.bribery(data, {
                subtype: briberySubtype.value, target: briberyTarget.value,
              });
              return result.ok ? teamBattleState.advanceAuto(result.data) : result;
            });
            return;
          }
          if (action.value === '效果传递') {
            const value = teamBattleState.effectTransferPreview(state.current?.data,
              transferSubtype.value, transferTarget.value);
            if (!value || value.reason) {
              notify(value?.reason || '请选择效果传递能力与目标。', 'warning'); return;
            }
            void commitBattle(data => {
              const result = teamBattleState.effectTransfer(data, {
                subtype: transferSubtype.value, target: transferTarget.value,
              });
              return result.ok ? teamBattleState.advanceAuto(result.data) : result;
            });
            return;
          }
          if (action.value === '施加效果') {
            const choice = fieldChoices.find(row => row.subtype === fieldSubtype.value);
            if (!choice || choice.reason) {
              notify(choice?.reason || '请选择施加效果能力。', 'warning'); return;
            }
            void commitBattle(data => {
              const result = teamBattleState.fieldEffect(data, {
                subtype: fieldSubtype.value, target: fieldTarget.value || null,
              });
              return result.ok ? teamBattleState.advanceAuto(result.data) : result;
            });
            return;
          }
          if (action.value === '技能干涉') {
            if (!controlTarget.value || !controlMode.value || !controlSkill.value) {
              notify('请选择目标、干涉模式和技能。', 'warning'); return;
            }
            void commitBattle(data => {
              const result = teamBattleState.skillControl(data, {
                target: controlTarget.value, mode: controlMode.value, skill: controlSkill.value,
              });
              return result.ok ? teamBattleState.advanceAuto(result.data) : result;
            });
            return;
          }
          const declaration = { action: action.value, target: target.value,
            means: description.value.trim() };
          if (declaration.action !== '待命' && !declaration.means) {
            notify('请写明具体能力与手段。', 'warning'); return;
          }
          if (declaration.action === '改变地形') {
            const cells = [...tacticalCells.values()].map(point => [point.x, point.y]);
            if (!cells.length) { notify('请在棋盘上选择格子。', 'warning'); return; }
            if (operation.value === 'remove' && !clear.value) {
              notify('所选格子没有可移除的地形。', 'warning'); return;
            }
            if (operation.value === 'add' && kind.value === 'passable' &&
              !terrainName.value.trim()) {
              notify('请填写通行地形名称。', 'warning'); return;
            }
            declaration.brush = { 形状: 'cells', 格子: cells,
              ...(operation.value === 'remove' ? { 清除: [clear.value] }
                : kind.value === 'passable' ? { 名称: terrainName.value.trim() }
                  : { 地形: kind.value }) };
          }
          void commitBattle(async data => {
            const prompt = teamBattleState.tacticPrompt(data, declaration);
            const [host, settlement] = await Promise.all([
              contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 }),
              contract.waitGlobalInitialized(VARIABLE_SETTLEMENT_API_KEY, { timeoutMs: 10000 }),
            ]);
            const settings = await settlement.readSettings();
            const config = {
              should_silence: true, should_stream: false, max_chat_history: 0,
              use_mes_examples: false, use_story_string: false, use_authors_note: false,
              use_persona: false,
              ordered_prompts: [
                { role: 'system', content: prompt.rules },
                { role: 'system', content: prompt.situation },
                { role: 'user', content: '审计申报并安排所有 NPC 的战术行动，只输出 JSON。' },
              ],
            };
            if (settings.useCustomApi) {
              if (!settings.apiUrl || !settings.model)
                return { ok: false, error: '系统副 API 尚未填写 URL 或模型名。' };
              config.custom_api = { apiurl: settings.apiUrl, key: settings.apiKey,
                model: settings.model, source: 'openai' };
            }
            const plan = teamBattleState.parsePlan(await host.generateRaw(config));
            if (!plan) return { ok: false, error: '战术模型未返回可识别的完整 JSON，可直接重试。' };
            const progressed = teamBattleState.tactic(data, { declaration, plan });
            return progressed.ok ? teamBattleState.advanceAuto(progressed.data) : progressed;
          });
        });
        action.addEventListener('change', () => {
          submit.textContent = action.value === '技能干涉' ? '执行技能干涉'
            : action.value === '施加效果' ? '发动效果'
            : action.value === '效果传递' ? '发动效果传递' : '请求战术裁决';
          if (action.value === '贿赂') submit.textContent = '发动贿赂';
        });
        controls.append(action, target, terrainControls, controlFields, fieldControls, transferControls, briberyControls, description, submit);
        teamSession.appendChild(controls);
        teamSession.appendChild(button('跳过战术阶段', 'crypt-lord-game-shell__button', () => {
          void commitBattle(data => {
            const progressed = teamBattleState.tactic(data);
            return progressed.ok ? teamBattleState.advanceAuto(progressed.data) : progressed;
          });
        }));
      } else if ((actor?.controller || actor?.source) === 'player') {
        const actions = element('div', 'crypt-lord-game-shell__battle-actions');
        const skill = element('select', 'crypt-lord-game-shell__settings-input');
        const target = element('select', 'crypt-lord-game-shell__settings-input');
        skill.setAttribute('aria-label', '战斗行动');
        target.setAttribute('aria-label', '行动目标');
        const conditionPreview = element('div', 'crypt-lord-game-shell__condition-preview');
        const resources = { hp: '活力', agility: '敏捷', spirit: '灵性', sanity: '理智', humanity: '人性' };
        const available = teamBattleState.options(state.current?.data);
        for (const choice of available) {
          const itemLabel = choice.consumable
            ? `${choice.consumable.isScroll ? '卷轴' : '消耗品'} · 剩余 ${choice.quantity} · `
            : choice.auxiliary ? '辅助 · ' : '';
          const magnitude = choice.heal
            ? formulas && choice.healValueType !== 'fixed'
              ? `${Number((choice.heal * 100).toFixed(2))}%` : choice.heal
            : choice.power;
          const label = choice.heal ? `${choice.healStat || '活力'}恢复`
            : formulas ? choice.weapon?.mode === 'accuracy' ? '固定伤害' : '威力' : '伤害';
          const option = element('option', '',
            `${itemLabel}${choice.name} · ${resources[choice.costKey || 'spirit']} ${choice.cost} · ${choice.conditional ? '条件结算' : `${label} ${magnitude}`}`);
          if (choice.auxiliary) option.title =
            `${choice.auxiliary.description || choice.name} · 射程 1-3 格${choice.auxiliary.area ? ' · 圆心半径 2 格' : ''}`;
          option.value = choice.id;
          option.disabled = !choice.targets.length || actor[choice.costKey || 'spirit'] < choice.cost;
          skill.appendChild(option);
        }
        const syncPreview = () => {
          clear(conditionPreview);
          const value = teamBattleState.actionPreview?.(state.current?.data, skill.value, target.value);
          conditionPreview.hidden = !value;
          if (!value) return;
          const center = team.units.find(unit => unit.id === value.center);
          conditionPreview.appendChild(element('strong', '', `${value.name} · 中心 ${center?.name || value.center} · 半径 ${value.radius} 格`));
          if (value.reason) conditionPreview.appendChild(element('p', '', value.reason));
          if (!value.targets.length) conditionPreview.appendChild(element('p', '', '无有效目标'));
          for (const row of value.targets) {
            const healing = formulas && row.healValueType !== 'fixed'
              ? `${Number((row.heal * 100).toFixed(2))}%` : row.heal;
            const type = ({ physical: '物理', mystical: '法术', mental: '精神', mixed: '混合' })[row.damageType] || row.damageType;
            conditionPreview.appendChild(element('p', '', `${row.name} · ${row.isHeal
              ? `${row.healStat || '活力'}恢复 ${healing}` : `${type}威力 ${row.power}`}`));
          }
          if (value.effects.length) conditionPreview.appendChild(element('p', '',
            `整圈效果 · ${value.effects.join('、')}`));
        };
        const syncTargets = () => {
          clear(target);
          const choice = available.find(row => row.id === skill.value);
          for (const id of choice?.targets || []) {
            const unit = team.units.find(row => row.id === id);
            const option = element('option', '', `${unit?.name || id} · 活力 ${unit?.hp}`);
            option.value = id;
            target.appendChild(option);
          }
          syncPreview();
        };
        skill.addEventListener('change', syncTargets);
        target.addEventListener('change', syncPreview);
        syncTargets();
        actions.append(skill, target,
          button('执行', 'crypt-lord-game-shell__button is-primary', () => {
            void commitBattle(data => {
              const acted = teamBattleState.action(data, { id: skill.value, target: target.value });
              return acted.ok ? teamBattleState.advanceAuto(acted.data) : acted;
            }, true);
          }),
          button('待命', 'crypt-lord-game-shell__button', () => {
            void commitBattle(data => {
              const waited = teamBattleState.action(data, { type: 'wait' });
              return waited.ok ? teamBattleState.advanceAuto(waited.data) : waited;
            });
          }));
        teamSession.appendChild(actions);
        teamSession.appendChild(conditionPreview);
      } else {
        teamSession.appendChild(button('执行非玩家行动', 'crypt-lord-game-shell__button', () => {
          void commitBattle(data => teamBattleState.advanceAuto(data));
        }));
      }
      if (team.lastTactic) {
        const result = element('div', 'crypt-lord-game-shell__battle-log');
        result.appendChild(element('strong', '', `第 ${team.lastTactic.round} 回合战术裁决`));
        if (team.lastTactic.audit) result.appendChild(element('p', '',
          `申报${team.lastTactic.audit.可行 ? '可行' : '不可行'} · ${team.lastTactic.audit.依据能力 || '无依据'} · ${team.lastTactic.audit.理由 || ''}`));
        for (const row of team.lastTactic.outcomes || []) {
          const actorName = team.units.find(unit => unit.id === row.actor)?.name || row.actor;
          const targetName = team.units.find(unit => unit.id === row.target)?.name || row.target;
          const status = { applied: '生效', resisted: '拼点失败',
            weaker: '同类效果较强', infeasible: '不可行' }[row.outcome] || row.outcome;
          result.appendChild(element('p', '',
            `${actorName}${targetName ? ` → ${targetName}` : ''} · ${row.mode ? `${row.mode}「${row.skill}」 · ` : ''}${status}${row.roll ? ` · ${row.roll.caster}:${row.roll.defender}` : row.scores ? ` · ${row.scores.caster}:${row.scores.defender}` : ''}${row.reason ? ` · ${row.reason}` : ''}${row.spent?.length ? ` · 消耗 ${row.spent.join('、')}` : ''}`));
        }
        teamSession.appendChild(result);
      }
      const log = element('div', 'crypt-lord-game-shell__battle-log');
      team.log.slice(-12).reverse().forEach(entry => {
        const calculation = entry.calculation;
        if (!calculation) {
          log.appendChild(element('p', '', `R${entry.round} · ${entry.message}`));
          return;
        }
        const detail = element('details', 'crypt-lord-game-shell__battle-calculation');
        detail.appendChild(element('summary', '', `R${entry.round} · ${entry.message}`));
        detail.appendChild(element('p', '', calculation.kind === 'healing'
          ? `基准 ${calculation.basis} · 标签 ${Math.round(calculation.tag * 100)}% · 应恢复 ${calculation.raw} · 实恢复 ${calculation.amount}`
          : `攻击 ${calculation.attack} · 防御 ${calculation.defense} · 神性 ${calculation.divinity} · 威力 ${calculation.power} · 标签 ${Math.round(calculation.tag * 100)}% · 命中 ${Math.round(calculation.chance * 100)}% · 浮动 ${calculation.randomScale.toFixed(3)} · 来伤 ${calculation.amount}`));
        log.appendChild(detail);
      });
      teamSession.appendChild(log);
    }
    body.appendChild(teamSession);
    if (team?.status === 'active') return;
    }
    const heading = element('div', 'crypt-lord-game-shell__battle-heading');
    heading.appendChild(element('div', '', '个人战斗'));
    if (gameAudioControl) heading.appendChild(gameAudioControl.create(afterNative.getHost()?.document || document, 'duel'));
    personal.appendChild(heading);
    if (!battle || battle.status !== 'active') {
      const form = element('div', 'crypt-lord-game-shell__battle-setup');
      const npcChoices = Object.entries(state.current?.data?.npc_data || {})
        .filter(([key, npc]) => key !== '$meta' && npc && typeof npc === 'object' &&
          Number.isFinite(Number(npc.当前活力)) && Number(npc.当前活力) > 0);
      const opponent = element('select', 'crypt-lord-game-shell__settings-input');
      const practice = element('option', '', '训练假人（不结算经验）');
      practice.value = '';
      opponent.appendChild(practice);
      npcChoices.forEach(([key, npc]) => {
        const option = element('option', '', `${key} · ${safeText(npc.当前序列, '普通人')} · 活力 ${npc.当前活力}`);
        option.value = key;
        opponent.appendChild(option);
      });
      const enemyName = element('input', 'crypt-lord-game-shell__settings-input');
      enemyName.value = battle?.enemy?.name || '训练假人';
      enemyName.placeholder = '敌人名称';
      const enemyHp = element('input', 'crypt-lord-game-shell__settings-input');
      enemyHp.type = 'number';
      enemyHp.min = '1';
      enemyHp.value = String(battle?.enemy?.maxHp || Math.max(20, Math.round(numeric(stat.活力 ?? stat.当前活力, 30) * .85)));
      const enemyPower = element('input', 'crypt-lord-game-shell__settings-input');
      enemyPower.type = 'number';
      enemyPower.min = '1';
      enemyPower.value = String(battle?.enemy?.power || 4);
      const setupField = (label, input) => {
        const field = element('label', 'crypt-lord-game-shell__battle-setup-field');
        field.append(element('span', '', label), input);
        return field;
      };
      const customFields = [setupField('训练目标', enemyName), setupField('活力', enemyHp), setupField('攻击', enemyPower)];
      opponent.addEventListener('change', () => {
        customFields.forEach(field => { field.hidden = Boolean(opponent.value); });
      });
      form.append(setupField('对手', opponent), ...customFields);
      personal.appendChild(form);
      const startPersonalBattle = button('开始个人战斗', 'crypt-lord-game-shell__button is-primary', () => {
        if (opponent.value && !hostWindow.confirm?.(`与 ${opponent.value} 进行真实 NPC 对局？胜利领取经验时会将该 NPC 当前活力结算为 0。`)) return;
        void commitBattle(async (data, evidence) => {
          let shamanJudgment = null;
          let arbiterJudgment = null;
          try {
            shamanJudgment = await modules[SHAMAN_TERRITORY_KEY]?.judgeBattle?.(data, opponent.value, evidence);
          } catch (error) {
            notify(`领地判定不可用，本场按中性处理：${error?.message || error}`, 'warning');
          }
          try {
            arbiterJudgment = await modules[ARBITER_JURISDICTION_KEY]?.judgeBattle?.(data, opponent.value, evidence);
          } catch (error) {
            notify(`辖区判定不可用，本场按中性处理：${error?.message || error}`, 'warning');
          }
          let imaginationPool = null;
          if (modules[IMAGINATION_KEY]) {
            try { imaginationPool = await abilityState.loadPool(); }
            catch (error) { notify(`空想途径库不可用：${error?.message || error}`, 'warning'); }
          }
          let tagRules = null;
          try { tagRules = await modules['cryptLord.battleTags']?.load(); }
          catch (error) { notify(`战斗标签配置不可用：${error?.message || error}`, 'warning'); }
          let lifeSaveTable;
          try { lifeSaveTable = await lifeSave?.load(); }
          catch (error) { notify(`保命配置不可用，本场按内置规则：${error?.message || error}`, 'warning'); }
          const started = personalBattleState.start(data, {
            npcKey: opponent.value,
            enemyName: enemyName.value,
            enemyHp: enemyHp.value,
            enemyPower: enemyPower.value,
            shamanJudgment,
            arbiterJudgment,
            imaginationPool,
            tagRules,
            lifeSaveTable,
          });
          const painter = modules[BATTLEFIELD_PAINTER_KEY];
          if (!painter || !started?.ok) return started;
          try {
            const painted = await painter.generate(started.data, evidence, state.current.message_id);
            if (painted.ok) {
              if (painted.terrainFallback) notify(`战场绘制回退普通棋盘：${painted.terrainFallback}`, 'warning');
              return painted;
            }
            notify(`战场绘制回退普通棋盘：${painted.error}`, 'warning');
          } catch (error) {
            notify(`战场绘制回退普通棋盘：${error?.message || error}`, 'warning');
          }
          return started;
        });
      });
      startPersonalBattle.disabled = team?.status === 'finished' && !team.settled;
      personal.appendChild(startPersonalBattle);
      if (battle?.result) personal.appendChild(element('p', 'crypt-lord-game-shell__battle-result', `上一场：${battle.result === 'victory' ? '胜利' : battle.result === 'defeat' ? '失败' : '撤离'}`));
      const experience = personalBattleState.experiencePreview(state.current?.data);
      if (experience) {
        const report = element('section', 'crypt-lord-game-shell__battle-exp-report');
        report.appendChild(element('strong', '', `战后经验 · ${experience.enemy.name}（序列 ${experience.enemy.rank}）`));
        report.appendChild(element('p', '', `经验池 ${experience.player.gain} · 玩家 Lv.${experience.player.before.level} → Lv.${experience.player.after.level} · 进度 ${experience.player.after.exp}/${experience.player.after.need}`));
        const actions = element('div', 'crypt-lord-game-shell__row');
        actions.append(
          button('确认结算', 'crypt-lord-game-shell__button is-primary', () => {
            void commitBattle(data => personalBattleState.settleExperience(data, experience.battleId, true));
          }),
          button('放弃经验', 'crypt-lord-game-shell__button', () => {
            if (!hostWindow.confirm?.('放弃本场经验？NPC 活力不会改动，此操作不可撤销。')) return;
            void commitBattle(data => personalBattleState.settleExperience(data, experience.battleId, false));
          }),
        );
        report.appendChild(actions);
        personal.appendChild(report);
      }
    } else {
      const autoControl = element('label', 'crypt-lord-game-shell__battle-auto');
      const autoToggle = element('input');
      autoToggle.type = 'checkbox';
      autoToggle.checked = Boolean(battle.autoPilot?.on);
      autoToggle.disabled = state.battleBusy;
      autoToggle.addEventListener('change', () => {
        cancelBattleAuto();
        state.battleAutoSteps = 0;
        state.battleAutoPaused = false;
        void commitBattle(data => personalBattleState.setAutoPilot(data, autoToggle.checked));
      });
      autoControl.append(autoToggle, element('span', '', '托管本场战斗'));
      personal.appendChild(autoControl);
      if (battle.autoPilot?.on && state.battleAutoPaused)
        personal.appendChild(element('span', 'crypt-lord-game-shell__battle-hint', '托管已暂停，请关闭后重新开启'));
      if (battle.autoPilot?.on && !state.battleBusy && state.battleAutoSteps < 40) scheduleAuto();
      const overview = element('div', 'crypt-lord-game-shell__battle-overview');
      const unit = (label, actor, target) => {
        const card = element('article', 'crypt-lord-game-shell__battle-unit');
        card.append(element('strong', '', actor.name), element('span', '', `${label} · HP ${actor.hp}/${actor.maxHp}`));
        const track = element('span', 'crypt-lord-game-shell__attribute-track');
        const fill = element('span', 'crypt-lord-game-shell__attribute-fill');
        fill.style.width = `${Math.max(0, Math.min(100, actor.hp / actor.maxHp * 100))}%`;
        track.appendChild(fill);
        card.appendChild(track);
        if (actor.effects?.length) {
          const effectList = element('div', 'crypt-lord-game-shell__battle-effects');
          actor.effects.forEach(effect => {
            const row = element('div', 'crypt-lord-game-shell__battle-effect');
            row.appendChild(element('span', '', `${effect.name} · ${effectDetail(effect)}${effect.environment ? ' · 环境' : ` / ${effect.duration} 次`}`));
            if (!effect.environment) {
              const remove = button('×', 'crypt-lord-game-shell__battle-effect-remove', () => {
                void commitBattle(data => personalBattleState.removeEffect(data, target, effect.name));
              });
              remove.title = `移除${actor.name}的${effect.name}`;
              remove.setAttribute('aria-label', remove.title);
              row.appendChild(remove);
            }
            effectList.appendChild(row);
          });
          card.appendChild(effectList);
        }
        if (actor.tags?.length) card.appendChild(element('p', 'crypt-lord-game-shell__battle-resource',
          actor.tags.map(tag => typeof tag === 'string' ? tag
            : `${tag.name} ×${tag.stacks} · ${tag.duration}回合`).join(' / ')));
        if (actor.lifeSave && (actor.lifeSave.hasStrong || actor.lifeSave.hasWeak))
          card.appendChild(element('p', 'crypt-lord-game-shell__battle-resource',
            [actor.lifeSave.hasStrong ? `${actor.lifeSave.strongName} ${actor.lifeSave.strongLeft}/1` : '',
              actor.lifeSave.hasWeak ? `${actor.lifeSave.weakName} ${actor.lifeSave.weakLeft}/3` : '']
              .filter(Boolean).join(' · ')));
        return card;
      };
      overview.append(unit('我方', battle.player, 'player'), unit('敌方', battle.enemy, 'enemy'));
      if (battle.picture) overview.appendChild(unit('画中人 · 移动力0', battle.picture, 'picture'));
      personal.append(overview, element('p', 'crypt-lord-game-shell__battle-resource', `第 ${battle.round} 回合 · 灵性 ${battle.player.spirit}/${battle.player.maxSpirit} · 理智 ${battle.player.sanity}/${battle.player.maxSanity} · 人性 ${battle.player.humanity}/${battle.player.maxHumanity}`));
      if (battle.board?.scene) personal.appendChild(element('p', 'crypt-lord-game-shell__battle-resource', battle.board.scene));
      if (battle.board?.naturalEnv) {
        const env = battle.board.naturalEnv;
        personal.appendChild(element('p', 'crypt-lord-game-shell__battle-resource',
          [env.地貌, env.天气, env.时间].filter(Boolean).join(' · ')));
      }
      if (battle.board?.props?.length) {
        const props = element('details', 'crypt-lord-game-shell__battle-props');
        props.appendChild(element('summary', '', `现场物品 · ${battle.board.props.length} 种`));
        battle.board.props.forEach(item => props.appendChild(element('p', '', `${item.名称} ×${item.数量} · ${item.描述}`)));
        personal.appendChild(props);
      }
      if (battle.canon?.environment) personal.appendChild(element('p', 'crypt-lord-game-shell__battle-resource', '环境 · 神秘再现·理想乡（我方受到伤害 -50%）'));
      if (battle.canon?.exile) personal.appendChild(element('p', 'crypt-lord-game-shell__battle-resource', `桃花源隔绝 · 敌方剩余 ${battle.canon.exile} 回合`));
      if (battle.canon?.sleep) personal.appendChild(element('p', 'crypt-lord-game-shell__battle-resource', '敌方沉睡 · 下一次行动跳过'));
      if (battle.player.imagination || battle.enemy.imagination) {
        personal.appendChild(element('p', 'crypt-lord-game-shell__battle-resource',
          `空想有效序列 · 我方 ${battle.player.imagination?.effectiveSequence || stat.当前序列 || '普通人'} · 敌方 ${battle.enemy.imagination?.effectiveSequence || state.current?.data?.npc_data?.[battle.enemy.npcKey]?.当前序列 || '普通人'}`));
      }
      const turnLabel = battle.currentTurn === 'player' ? '玩家行动' : '敌方行动';
      personal.appendChild(element('p', 'crypt-lord-game-shell__battle-turn', `${turnLabel} · 移动 ${battle.player.moveRemaining}/${battle.player.moveMax} · 坐标 (${battle.player.x}, ${battle.player.y})`));

      const terrainTools = element('div', 'crypt-lord-game-shell__battle-terrain-tools');
      const terrainRounds = element('input', 'crypt-lord-game-shell__settings-input crypt-lord-game-shell__battle-number');
      terrainRounds.type = 'number';
      terrainRounds.min = '0';
      terrainRounds.max = state.battleTerrainTool && personalBattleState.terrainOptions()
        .some(row => row.id === state.battleTerrainTool && row.family) ? '3' : '9';
      terrainRounds.value = String(state.battleTerrainRounds ?? 3);
      terrainRounds.title = '地形存在回合（0 为永久）';
      terrainRounds.setAttribute('aria-label', '地形存在回合');
      terrainRounds.addEventListener('change', () => { state.battleTerrainRounds = terrainRounds.value; });
      const selectedTerrain = state.battleTerrainTool || 'move';
      const selectTool = tool => {
        state.battleTerrainTool = tool;
        state.battleTerrainRounds = personalBattleState.terrainOptions().some(row => row.id === tool && row.family)
          || tool === 'fire' ? 3 : 0;
        renderPersonalBattle();
      };
      const moveTool = button('移动', `crypt-lord-game-shell__terrain-tool${selectedTerrain === 'move' ? ' is-active' : ''}`, () => selectTool('move'));
      moveTool.title = '显示本回合按地形移动消耗计算出的可达格';
      terrainTools.appendChild(moveTool);
      const terrainOptions = personalBattleState.terrainOptions();
      terrainOptions.filter(terrain => !terrain.family).forEach(terrain => {
        const label = `${terrain.symbol || '○'} ${terrain.name}`;
        const control = button(label, `crypt-lord-game-shell__terrain-tool is-${terrain.id}${selectedTerrain === terrain.id ? ' is-active' : ''}`, () => selectTool(terrain.id));
        control.title = terrain.blocked ? `${terrain.name}：不可通行` : `${terrain.name}：移动消耗 ${terrain.moveCost}${terrain.damage ? `，${terrain.channel === 'residue' ? '踏入后沾染' : '行动开始时伤害'} ${terrain.damage}` : ''}`;
        terrainTools.appendChild(control);
      });
      const hazardSelect = element('select', 'crypt-lord-game-shell__settings-input crypt-lord-game-shell__terrain-select');
      hazardSelect.setAttribute('aria-label', '危险地形画笔');
      const placeholder = element('option', '', '危险地形…');
      placeholder.value = '';
      hazardSelect.appendChild(placeholder);
      for (const [family, label] of [['surface', '地表'], ['cloud', '云雾'], ['geo', '地质']]) {
        const group = element('optgroup');
        group.label = label;
        terrainOptions.filter(terrain => terrain.family === family).forEach(terrain => {
          const option = element('option', '', `${terrain.name} · 移动 ${terrain.moveCost}`);
          option.value = terrain.id;
          group.appendChild(option);
        });
        hazardSelect.appendChild(group);
      }
      hazardSelect.value = terrainOptions.some(row => row.id === selectedTerrain && row.family) ? selectedTerrain : '';
      hazardSelect.addEventListener('change', () => selectTool(hazardSelect.value || 'move'));
      terrainTools.appendChild(hazardSelect);
      terrainTools.appendChild(terrainRounds);
      terrainTools.appendChild(element('span', 'crypt-lord-game-shell__battle-hint', '回合，0 为永久'));
      personal.appendChild(terrainTools);

      const board = element('div', 'crypt-lord-game-shell__battle-board');
      board.style.setProperty('--cl-battle-cols', String(battle.board?.cols || 12));
      const canMove = battle.currentTurn === 'player' && !state.battleBusy;
      const reachable = new Map(personalBattleState.reachable(state.current?.data).map(cell => [`${cell.x},${cell.y}`, cell.cost]));
      for (let y = 0; y < numeric(battle.board?.rows, 10); y += 1) {
        for (let x = 0; x < numeric(battle.board?.cols, 12); x += 1) {
          const occupied = battle.player.x === x && battle.player.y === y ? 'player'
            : !battle.canon?.exile && battle.enemy.x === x && battle.enemy.y === y ? 'enemy'
              : battle.picture?.x === x && battle.picture?.y === y ? 'picture' : '';
          const terrain = personalBattleState.terrainAt(state.current?.data, x, y);
          const cell = element('button', `crypt-lord-game-shell__battle-cell is-terrain-${terrain.id}${terrain.family ? ` is-terrain-family-${terrain.family}` : ''}${occupied ? ` is-${occupied}` : ''}`);
          cell.type = 'button';
          cell.dataset.x = String(x);
          cell.dataset.y = String(y);
          cell.title = occupied === 'player' ? `${battle.player.name} (${x}, ${y})`
            : occupied === 'enemy' ? `${battle.enemy.name} (${x}, ${y})`
              : `${terrain.name} (${x}, ${y})${terrain.blocked ? ' · 不可通行' : ` · 移动消耗 ${terrain.moveCost}`}${terrain.damage ? ` · ${terrain.channel === 'residue' ? '踏入后沾染' : '行动开始时伤害'} ${terrain.damage}` : ''}${terrain.rounds ? ` · 剩余 ${terrain.rounds} 回合` : ''}`;
          if (occupied === 'player') cell.textContent = '我';
          if (occupied === 'enemy') cell.textContent = '敌';
          if (occupied === 'picture') cell.textContent = '画';
          if (!occupied) cell.textContent = terrain.symbol;
          if (selectedTerrain !== 'move') {
            if (!state.battleBusy) cell.addEventListener('click', () => { void commitBattle(data => personalBattleState.paintTerrain(data, x, y, selectedTerrain, terrainRounds.value)); });
            else cell.disabled = true;
          } else if (!occupied && canMove && reachable.has(`${x},${y}`)) {
            cell.classList.add('is-reachable');
            cell.addEventListener('click', () => { void commitBattle(data => personalBattleState.move(data, x, y)); });
          } else {
            cell.disabled = !occupied;
          }
          board.appendChild(cell);
        }
      }
      const boardWrap = element('div', 'crypt-lord-game-shell__battle-board-wrap');
      boardWrap.appendChild(board);
      personal.appendChild(boardWrap);
      const actions = element('div', 'crypt-lord-game-shell__battle-actions');
      actions.appendChild(button('普通攻击', 'crypt-lord-game-shell__button is-primary', () => { void commitBattle(data => personalBattleState.act(data, { type: 'basic' }), true); }));
      const canon = personalBattleState.canonOptions(state.current?.data);
      if (canon.length) {
        const tactics = element('div', 'crypt-lord-game-shell__battle-tactics');
        tactics.appendChild(element('strong', '', '神秘再现 · 原著战术'));
        const controls = element('div', 'crypt-lord-game-shell__battle-actions');
        canon.forEach(row => {
          const control = button(`${row.name} · 灵${row.cost}`, 'crypt-lord-game-shell__button', () => {
            void commitBattle(data => personalBattleState.useCanon(data, row.id));
          });
          control.disabled = !row.ready;
          control.title = row.reason || '消耗一次个人战斗行动，结算后进入敌方回合';
          controls.appendChild(control);
        });
        tactics.appendChild(controls);
        personal.appendChild(tactics);
      }
      if (battle.canon?.exile) actions.appendChild(button('等待敌人返回', 'crypt-lord-game-shell__button', () => {
        void commitBattle(data => personalBattleState.act(data, { type: 'wait' }));
      }));
      if (Object.keys(modules[GRAZING_KEY]?.soulsOf(state.current?.data) || {}).some(name => name !== '$meta')) {
        const grazing = button('放牧组合', 'crypt-lord-game-shell__button', renderPathwayPlay);
        grazing.title = '打开秘祈人放牧名册，切换激活灵魂';
        actions.appendChild(grazing);
      }
      const picture = modules[SHAMAN_PICTURE_KEY];
      if (picture?.gate(state.current?.data?.stat_data).unlocked && !battle.picture) {
        const rows = picture.records(state.current?.data).filter(row =>
          !battle.pictureLosses?.some(loss => loss.id === row.id));
        if (rows.length) {
          const select = scrollSelect(rows.map(row => [row.id, `${row.name} · ${row.card.当前序列}`]),
            rows[0].id, '画中人成品');
          const control = button(`召唤画中人 · 灵${picture.summonCost(
            modules[SCROLL_CRAFTING_KEY]?.rankOf(state.current?.data?.stat_data?.当前序列))}`,
          'crypt-lord-game-shell__button', () => {
            void commitBattle(data => personalBattleState.summonPicture(data, select.value));
          });
          actions.append(select, control);
        }
      }
      personalBattleState.abilities(state.current?.data).forEach(ability => {
        const cost = ability.cost;
        const label = `${ability.name}${ability.type.includes('治疗') ? ' · 治疗' : ability.power ? ` · 威力${ability.power}` : ''}${ability.effects.length ? ` · 效果${ability.effects.length}` : ''} · 活${cost.hp}/敏${cost.agility}/灵${cost.spirit}/理${cost.sanity}/人${cost.humanity}`;
        const control = button(label, 'crypt-lord-game-shell__button', () => { void commitBattle(data => personalBattleState.act(data, { type: 'ability', group: ability.group, index: ability.index }), true); });
        control.title = [ability.description || ability.type,
          ...ability.effects.map(effect => `${effect.name}：${effectDetail(effect)}，${effect.duration} 次`)].join('\n');
        actions.appendChild(control);
      });
      personalBattleState.weaponMoves(state.current?.data).forEach(weapon => {
        const label = `${weapon.name} · ${weapon.mode === 'accuracy'
          ? `固定伤害${weapon.damage}${weapon.accuracyTier === '近战无精度' ? ' · 必中' : ` · ${weapon.accuracyTier}`}`
          : weapon.healing ? `恢复${weapon.healing}` : `威力${weapon.damage}`} · 射程${Number.isFinite(weapon.range) ? weapon.range : '自身'}${weapon.cost ? ` · 灵${weapon.cost}` : ''}`;
        const control = button(label, 'crypt-lord-game-shell__button', () => {
          void commitBattle(data => personalBattleState.act(data, { type: 'weapon', key: weapon.key }), true);
        });
        control.title = [weapon.description, weapon.area ? '范围效果（当前单敌战斗只结算单目标）' : '',
          ...weapon.effects.map(effect => `${effect.name}：${effectDetail(effect)}，${effect.duration} 次`)]
          .filter(Boolean).join('\n');
        actions.appendChild(control);
      });
      personalBattleState.auxiliaryMoves(state.current?.data).forEach(move => {
        const control = button(`${move.name} · ${move.healing ? `恢复${move.healing}` : `威力${move.damage}`} · 灵${move.cost}`,
          'crypt-lord-game-shell__button', () => {
            void commitBattle(data => personalBattleState.act(data, { type: 'auxiliary', key: move.key }), true);
          });
        control.title = [move.description, move.area ? '全体效果（当前单敌战斗只结算单目标）' : '',
          ...move.effects.map(effect => `${effect.name}：${effectDetail(effect)}，${effect.duration} 次`)]
          .filter(Boolean).join('\n');
        actions.appendChild(control);
      });
      personalBattleState.scrollMoves(state.current?.data).forEach(scroll => {
        const control = button(`${scroll.name} · ${scroll.quantity}张 · ${scroll.healing ? `恢复${scroll.healAmt}` : `威力${scroll.power}`} · 灵${scroll.cost}`,
          'crypt-lord-game-shell__button', () => {
            void commitBattle(data => personalBattleState.act(data, { type: 'scroll', key: scroll.key }), true);
          });
        control.title = scroll.description;
        actions.appendChild(control);
      });
      personalBattleState.consumableMoves(state.current?.data).filter(item => !item.isScroll).forEach(item => {
        const control = button(`${item.name} · ${item.quantity}件 · ${item.healing ? `恢复${item.healAmt}` : `威力${item.power}`} · 灵${item.cost}`,
          'crypt-lord-game-shell__button', () => {
            void commitBattle(data => personalBattleState.act(data, { type: 'consumable', key: item.key }), true);
          });
        control.title = [item.description, item.effects.map(effect => effect.name).join('、'),
          '使用后消耗一件；全体效果在个人战斗中只结算单目标'].filter(Boolean).join('\n');
        actions.appendChild(control);
      });
      actions.appendChild(button('撤离', 'crypt-lord-game-shell__button', () => { void commitBattle(data => personalBattleState.act(data, { type: 'retreat' })); }));
      personal.appendChild(actions);
      const effectTools = element('div', 'crypt-lord-game-shell__battle-effect-tools');
      const targetSelect = element('select', 'crypt-lord-game-shell__settings-input');
      [['enemy', '敌方'], ['player', '我方']].forEach(([value, label]) => {
        const option = element('option', '', label);
        option.value = value;
        targetSelect.appendChild(option);
      });
      targetSelect.setAttribute('aria-label', '效果目标');
      const typeSelect = element('select', 'crypt-lord-game-shell__settings-input');
      [['poison', '持续伤害'], ['regen', '持续恢复'], ['buff', '增益'], ['debuff', '减益']].forEach(([value, label]) => {
        const option = element('option', '', label);
        option.value = value;
        typeSelect.appendChild(option);
      });
      typeSelect.setAttribute('aria-label', '效果类型');
      const statSelect = element('select', 'crypt-lord-game-shell__settings-input');
      Object.entries(modifierLabels).forEach(([value, label]) => {
        const option = element('option', '', label);
        option.value = value;
        statSelect.appendChild(option);
      });
      statSelect.setAttribute('aria-label', '修正属性');
      const valueTypeSelect = element('select', 'crypt-lord-game-shell__settings-input');
      [['fixed', '固定值'], ['percentage', '百分比']].forEach(([value, label]) => {
        const option = element('option', '', label);
        option.value = value;
        valueTypeSelect.appendChild(option);
      });
      valueTypeSelect.setAttribute('aria-label', '修正数值形式');
      const syncModifierFields = () => {
        const modifier = ['buff', 'debuff'].includes(typeSelect.value);
        statSelect.hidden = !modifier;
        valueTypeSelect.hidden = !modifier;
        valueTypeSelect.querySelector('[value="fixed"]').disabled = !['attack', 'defense'].includes(statSelect.value);
        if (modifier && !['attack', 'defense'].includes(statSelect.value)) valueTypeSelect.value = 'percentage';
      };
      typeSelect.addEventListener('change', syncModifierFields);
      statSelect.addEventListener('change', syncModifierFields);
      syncModifierFields();
      const effectPower = element('input', 'crypt-lord-game-shell__settings-input crypt-lord-game-shell__battle-number');
      effectPower.type = 'number';
      effectPower.min = '1';
      effectPower.max = '100';
      effectPower.value = '2';
      effectPower.setAttribute('aria-label', '每次效果点数');
      const effectDuration = element('input', 'crypt-lord-game-shell__settings-input crypt-lord-game-shell__battle-number');
      effectDuration.type = 'number';
      effectDuration.min = '1';
      effectDuration.max = '9';
      effectDuration.value = '3';
      effectDuration.setAttribute('aria-label', '效果持续行动次数');
      effectTools.append(targetSelect, typeSelect, statSelect, valueTypeSelect, effectPower, effectDuration,
        button('施加效果', 'crypt-lord-game-shell__button', () => {
          void commitBattle(data => personalBattleState.applyEffect(
            data, targetSelect.value, typeSelect.value, effectPower.value, effectDuration.value,
            statSelect.value, valueTypeSelect.value,
          ));
        }));
      personal.appendChild(effectTools);
    }
    if (battle?.log?.length) {
      const log = element('div', 'crypt-lord-game-shell__battle-log');
      battle.log.slice(-12).reverse().forEach(entry => log.appendChild(element('p', '', `R${entry.round} · ${entry.message}`)));
      personal.appendChild(log);
    }
    body.appendChild(personal);

    const section = element('div', 'crypt-lord-game-shell__panel-section');
    section.append(
      element('h3', 'crypt-lord-game-shell__section-title', '领地战备与编队状态'),
      element('p', 'crypt-lord-game-shell__battle-resource',
        `在编正规军：${armies.length} 支 ｜ 散兵库存：${loose.length} 组 ｜ 出战名单：${(domain?.出战名单 || []).length} 支`),
    );
    body.appendChild(section);

    if (armies.length) {
      const list = element('div', 'crypt-lord-game-shell__action-list');
      armies.forEach(army => {
        const count = domainState ? domainState.armyCount(army) : 0;
        const hp = domainState ? domainState.armyHp(army) : 0;
        const atk = domainState ? domainState.armyAtk(army) : 0;
        const isDeployed = (domain?.出战名单 || []).includes(army.id);
        const item = element('div', 'crypt-lord-game-shell__row');
        item.style.padding = '6px 8px';
        item.style.background = 'rgba(255,255,255,0.04)';
        item.style.borderRadius = '4px';
        item.style.marginBottom = '4px';
        item.innerHTML = `<strong>${army.名称 || army.id}</strong> [${army.军种 || '陆军'}] · ${count}人 · 生命 ${hp} · 攻击 ${atk} · ${isDeployed ? '<span style="color:#6b8f71;">【出战中】</span>' : '<span style="color:#aaa;">【驻防】</span>'}`;
        list.appendChild(item);
      });
      body.appendChild(list);
    } else {
      body.appendChild(element('div', 'crypt-lord-game-shell__empty', '领地暂未编成正规军队，可在「独立领地」控制台招兵并整编。'));
    }

    const actionRow = element('div', 'crypt-lord-game-shell__row');
    actionRow.style.marginTop = '12px';
    actionRow.style.display = 'flex';
    actionRow.style.gap = '8px';

    if (domainState && domain) {
      actionRow.appendChild(button('沙盘军演（四对四对抗演习）', 'crypt-lord-game-shell__button is-primary', () => {
        const drill = domainState.runDrill(domain);
        notify(drill.summary || '沙盘军演演练完毕', 'info');
        void renderBattleSystem();
        root.__stage1Modules?.['cryptLord.warReplayUi']?.open(drill.result, { title: '沙盘军演' });
      }));
    }
    actionRow.appendChild(button('前往独立领地作战中心', 'crypt-lord-game-shell__button', () => {
      closeModal();
      void openDomainConsole();
    }));
    body.appendChild(actionRow);
  }

  function renderPathwayPlay() {
    if (!openModal("途径专属玩法")) return;
    const pathwayPlayState = root.__stage1Modules?.["cryptLord.pathwayPlayState"] || window.cryptLord?.pathwayPlayState;
    if (!pathwayPlayState) {
      state.modalBody.appendChild(element("div", "crypt-lord-game-shell__empty", "途径玩法系统尚未就绪。"));
      return;
    }
    const stat = statForCurrent();
    const resolved = pathwayPlayState.resolvePathway(stat);
    const playData = pathwayPlayState.getPlayData(state.current?.data);

    const header = element("div", "crypt-lord-game-shell__pathway-header");
    header.append(
      element("strong", "", `当前途径：${resolved.title} · ${resolved.sequence}`),
      element("span", "crypt-lord-game-shell__muted", `位阶：序列${resolved.rank <= 9 ? resolved.rank : "普通人"}`)
    );
    state.modalBody.appendChild(header);

    const list = element("div", "crypt-lord-game-shell__pathway-features");
    if (!resolved.features.length) {
      list.appendChild(element("div", "crypt-lord-game-shell__empty", "当前途径暂无专属独立机制，通用非凡能力请在「序列能力」中查看与发动。"));
    } else {
      resolved.features.forEach(feat => {
        const item = element("div", "crypt-lord-game-shell__pathway-item");
        const top = element("div", "crypt-lord-game-shell__pathway-item-head");
        top.append(
          element("strong", "", feat.name),
          element("span", feat.unlocked ? "crypt-lord-game-shell__tag--unlocked" : "crypt-lord-game-shell__tag--locked", feat.unlocked ? "已解锁" : "未达序列要求")
        );
        item.append(top, element("p", "crypt-lord-game-shell__muted", feat.desc));

        if (feat.unlocked) {
          const actionBox = element("div", "crypt-lord-game-shell__pathway-actions");
          if (feat.id === "marionette") {
            const count = playData.marionettes.length;
            actionBox.appendChild(element("span", "", `当前操控秘偶数：${count}`));
            actionBox.appendChild(button("派遣秘偶协同行动", "crypt-lord-game-shell__small-button", () => {
              const target = playData.marionettes[0]?.name || "目标待定";
              const prompt = pathwayPlayState.formatActionPrompt("marionette", "协同侦察与潜行防御", target);
              void fillAction(prompt);
              notify("已将秘偶行动指令填入酒馆输入框", "success");
            }));
          } else if (feat.id === "grazing") {
            // The native-floor grazing roster is rendered below.
          } else if (feat.id === "imagination") {
            // The original spectator mechanism is an effective-pathway projection, rendered below.
          } else if (feat.id === "clone") {
            actionBox.appendChild(button("派遣寄生分身", "crypt-lord-game-shell__small-button", () => {
              const prompt = pathwayPlayState.formatActionPrompt("clone", "寄生监视与分化潜伏", "目标人物/环境");
              void fillAction(prompt);
              notify("已将分身指令填入酒馆输入框", "success");
            }));
          } else if (["scroll", "shaman-territory", "shaman-picture", "jurisdiction", "reader-mystic", "reenactment", "savant-material", "savant-enhancement"].includes(feat.id)) {
            // Dedicated forms are rendered below the pathway list.
          } else {
            actionBox.appendChild(button("发动专属途径指令", "crypt-lord-game-shell__small-button", () => {
              const prompt = pathwayPlayState.formatActionPrompt(feat.id, feat.name, "当前场景");
              void fillAction(prompt);
              notify("已将途径指令填入酒馆输入框", "success");
            }));
          }
          if (!["imagination", "grazing", "scroll", "shaman-territory", "shaman-picture", "jurisdiction", "reader-mystic", "reenactment", "savant-material", "savant-enhancement"].includes(feat.id)) item.appendChild(actionBox);
        }
        list.appendChild(item);
      });
    }
    state.modalBody.appendChild(list);
    renderImagination();
    renderGrazing();
    renderReaderMystic();
    renderReenactment();
    renderMysteryAnalysis();
    renderScrollCrafting();
    renderSavantMaterial();
    renderSavantEnhancement();
    renderShamanTerritory();
    renderShamanPicture();
    renderArbiterJurisdiction();
  }

  function renderSavantMaterial() {
    const service = modules['cryptLord.savantMaterial'];
    if (!service || !state.current?.data) return;
    const access = service.gate(state.current.data.stat_data);
    if (!access.unlocked) return;
    const section = element('section', 'crypt-lord-game-shell__pathway-item');
    section.append(
      element('strong', '', '通识者 · 材料加工'),
      element('p', 'crypt-lord-game-shell__muted',
        `当前可认定 ${service.sources(state.current.data).length} 个来源，仓库有 ${service.batches(state.current.data).length} 批材料。`),
      button('打开材料加工', 'crypt-lord-game-shell__small-button', () => {
        void contract.waitGlobalInitialized(SAVANT_MATERIAL_UI_KEY, { timeoutMs: 10000 })
          .then(api => api.open()).catch(error => notify(`打开材料加工失败：${error?.message || error}`, 'error'));
      }),
    );
    state.modalBody.append(section);
  }

  function renderSavantEnhancement() {
    const service = modules['cryptLord.savantEnhancement'];
    const data = state.current?.data;
    if (!service || !data || !modules['cryptLord.savantMaterial']?.gate(data.stat_data).unlocked) return;
    const section = element('section', 'crypt-lord-game-shell__pathway-item');
    section.append(
      element('strong', '', '通识者 · 装备强化'),
      element('p', 'crypt-lord-game-shell__muted',
        `模块仓库 ${service.modulesOf(data).length} 个 · 已安装 ${service.modulesOf(data).filter(row => row.安装位置).length} 个。`),
      button('打开装备强化', 'crypt-lord-game-shell__small-button', () => {
        void contract.waitGlobalInitialized(SAVANT_ENHANCEMENT_UI_KEY, { timeoutMs: 10000 })
          .then(api => api.open()).catch(error => notify(`打开装备强化失败：${error?.message || error}`, 'error'));
      }),
    );
    state.modalBody.append(section);
  }

  function renderImagination() {
    const imagination = modules[IMAGINATION_KEY];
    const data = state.current?.data;
    const pool = state.pathwayPool;
    if (!imagination || !data?.stat_data) return;
    if (!pool) {
      loadPathways();
      state.modalBody.appendChild(element('p', 'crypt-lord-game-shell__muted', '正在读取空想途径库…'));
      return;
    }
    const snapshot = imagination.resolve(pool, data);
    const owner = snapshot.imaginationGate;
    if (!owner.unlocked) return;
    const section = element('section', 'crypt-lord-game-shell__scroll crypt-lord-game-shell__imagination');
    section.appendChild(element('h3', '', '观众 · 空想'));
    section.appendChild(element('p', 'crypt-lord-game-shell__muted',
      `真实序列：${snapshot.real} · 空想等效：序列${owner.rank} · 有效栏位：${owner.slots}`));
    const saved = imagination.stored(data);
    const values = [...saved.slots];
    const preview = element('p', 'crypt-lord-game-shell__muted');
    const fragments = [];
    const updatePreview = () => {
      preview.textContent = `运行期有效序列：${imagination.resolve(pool, data, values).effectiveSequence}`;
      fragments.forEach((label, index) => {
        const canonical = imagination.canonical(pool, values[index], owner.rank);
        label.textContent = `等效片段：${canonical || '未选择或目标档位无世界书条目'}`;
      });
    };
    [1, 2].forEach(index => {
      const select = scrollSelect([
        ['', '清空'],
        ...Object.keys(pool.pathways).filter(pathway => Array.isArray(pool.pathways[pathway]))
          .map(pathway => [pathway, pathway]),
      ], values[index - 1], `空想栏位${index}`);
      select.disabled = index > owner.slots || state.imaginationBusy;
      select.addEventListener('change', () => { values[index - 1] = select.value; updatePreview(); });
      section.appendChild(scrollField(`空想栏位${index}${index > owner.slots ? ' · 序列0解锁，保留旧选择' : ''}`, select));
      const fragment = element('p', 'crypt-lord-game-shell__muted');
      fragments.push(fragment);
      section.appendChild(fragment);
    });
    updatePreview();
    section.appendChild(preview);
    const save = button(state.imaginationBusy ? '保存中…' : '保存空想栏位',
      'crypt-lord-game-shell__dialog-button is-primary', () => { void commitImagination('save', values); });
    save.disabled = state.imaginationBusy || personalBattleState.get(data)?.status === 'active';
    section.appendChild(save);
    if (owner.rank === 0) {
      section.appendChild(element('p', 'crypt-lord-game-shell__muted',
        `分离序列1作家特性 · 永久额度 ${saved.used}/2，删除物品不会返还。`));
      const separate = button('分离作家特性', 'crypt-lord-game-shell__dialog-button', () => {
        if (window.confirm(`永久消耗一次分离额度，获得一份作家特性？剩余 ${2 - saved.used} 次。`)) {
          void commitImagination('separate');
        }
      });
      separate.disabled = state.imaginationBusy || saved.used >= 2 ||
        personalBattleState.get(data)?.status === 'active';
      section.appendChild(separate);
    }
    state.modalBody.appendChild(section);
  }

  async function commitImagination(action, values) {
    if (state.imaginationBusy) return;
    const token = state.chatToken;
    const messageId = state.current?.message_id;
    if (!Number.isInteger(messageId)) return;
    state.imaginationBusy = true;
    try {
      const store = await contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 });
      const original = await store.readMessage(messageId);
      if (original?.role !== 'assistant') throw new Error('目标楼层不是 assistant');
      if (personalBattleState.get(original.data)?.status === 'active') throw new Error('战斗中不能修改空想');
      const pool = await abilityState.loadPool();
      if (token !== state.chatToken || state.current?.message_id !== messageId) throw new Error('聊天或楼层已变化');
      const fresh = await store.readMessage(messageId);
      if (fresh?.role !== 'assistant' || fresh.message !== original.message ||
        JSON.stringify(fresh.data) !== JSON.stringify(original.data)) throw new Error('楼层正文或变量已变化，请重试');
      const imagination = modules[IMAGINATION_KEY];
      const next = action === 'save'
        ? imagination.save(fresh.data, pool, values, abilityLocked())
        : imagination.separate(fresh.data, pool);
      await store.writeAssistantData(messageId, next);
      state.current.data = next;
      state.pathwayPool = pool;
      modules[VARIABLE_WORKBENCH_KEY]?.notifyUpdate?.({
        messageId, beforeData: fresh.data, afterData: next, source: 'audience-imagination',
      });
      renderLeftPanel();
      notify(action === 'save' ? '空想栏位、有效能力已同步。' : '已获得一份作家特性。', 'success');
    } catch (error) {
      notify(`空想操作失败：${error?.message || error}`, 'error');
    } finally {
      state.imaginationBusy = false;
      if (!state.disposed && token === state.chatToken &&
        state.modal?.dataset.open === 'true' && state.modalTitle?.textContent === '途径专属玩法') renderPathwayPlay();
    }
  }

  function renderGrazing() {
    const grazing = modules[GRAZING_KEY];
    const imagination = modules[IMAGINATION_KEY];
    const data = state.current?.data;
    const pool = state.pathwayPool;
    if (!grazing || !imagination || !data?.stat_data) return;
    if (!pool) { loadPathways(); return; }
    const snapshot = imagination.resolve(pool, data);
    const gate = snapshot.grazingGate;
    if (!gate.unlocked) return;
    const souls = grazing.soulsOf(data);
    const names = Object.keys(souls).filter(name => name !== '$meta' && record(souls[name]));
    const active = snapshot.grazed.map(row => row.name);
    const storedActive = grazing.namesOf(data, '激活灵魂');
    const dormant = grazing.namesOf(data, '休眠灵魂');
    const ordered = [...new Set([...storedActive, ...dormant, ...names])];
    if (!state.grazingDraft || state.grazingDraft.messageId !== state.current.message_id) {
      state.grazingDraft = { messageId: state.current.message_id, names: [...active] };
    }
    const draft = state.grazingDraft.names;
    const battle = personalBattleState.get(data);
    const inBattle = battle?.status === 'active';
    const locked = state.grazingBusy || state.imaginationBusy || state.battleBusy;
    const section = element('section', 'crypt-lord-game-shell__scroll crypt-lord-game-shell__grazing');
    section.appendChild(element('h3', '', '秘祈人 · 放牧'));
    section.appendChild(element('p', 'crypt-lord-game-shell__muted',
      `真实序列：${snapshot.real} · 灵魂 ${names.length}/${grazing.capacity(gate.rank)} · 激活 ${active.length}/${grazing.activeCap(gate.rank)} · 休眠 ${dormant.length + storedActive.filter(name => !active.includes(name)).length}`));
    section.appendChild(element('p', 'crypt-lord-game-shell__muted',
      `运行期有效序列：${snapshot.effectiveSequence}`));
    const list = element('div', 'crypt-lord-game-shell__scroll-list');
    ordered.forEach(name => {
      const soul = souls[name];
      const row = element('div', 'crypt-lord-game-shell__scroll-row crypt-lord-game-shell__grazing-row');
      const input = element('input');
      input.type = 'checkbox';
      input.checked = draft.includes(name);
      input.disabled = locked;
      input.addEventListener('change', () => {
        if (input.checked) {
          if (draft.length >= grazing.activeCap(gate.rank)) {
            input.checked = false;
            notify(`当前只能激活 ${grazing.activeCap(gate.rank)} 个灵魂`, 'warning');
            return;
          }
          draft.push(name);
        } else draft.splice(draft.indexOf(name), 1);
      });
      const detail = element('label', 'crypt-lord-game-shell__grazing-detail');
      detail.appendChild(input);
      detail.append(element('strong', '', name),
        element('span', 'crypt-lord-game-shell__muted',
          `${soul.当前序列 || '未知序列'} · ${soul.$放牧来源 || '人物认证'} · ${active.includes(name) ? '已激活' : '休眠 / 未激活'}`));
      const release = button('释放', 'crypt-lord-game-shell__small-button', () => {
        if (window.confirm(`永久释放“${name}”的灵魂及其能力？此操作不可撤销。`)) {
          void commitGrazing('release', name);
        }
      });
      release.disabled = locked || inBattle;
      row.append(detail, release);
      list.appendChild(row);
    });
    section.appendChild(list);
    if (!names.length) section.appendChild(element('p', 'crypt-lord-game-shell__muted', '尚未放牧灵魂。'));
    section.appendChild(element('p', 'crypt-lord-game-shell__muted',
      inBattle ? `战斗中切换组合消耗 ${grazing.switchCost(data)} 点灵性；仅玩家回合可切换。`
        : '未激活灵魂保留在名册；场外更换组合不消耗灵性。'));
    const actions = element('div', 'crypt-lord-game-shell__scroll-actions');
    const save = button(inBattle ? '切换激活组合' : '保存激活组合',
      'crypt-lord-game-shell__dialog-button is-primary', () => {
        void commitGrazing('save', [...state.grazingDraft.names]);
      });
    save.disabled = locked || (inBattle && battle.currentTurn !== 'player');
    actions.appendChild(save);
    section.appendChild(actions);
    if (!inBattle) {
      const candidates = grazing.candidates(data, pool);
      const select = scrollSelect([['', '选择人物'], ...candidates.map(row =>
        [row.name, `${row.name} · ${row.sequence} · ${row.relationship || '未知关系'}`])],
      state.grazingCandidate, '待认证人物');
      select.disabled = locked;
      select.addEventListener('change', () => { state.grazingCandidate = select.value; });
      section.appendChild(scrollField('认证新灵魂', select));
      const certify = button(state.grazingBusy ? '认证中…' : '开始认证',
        'crypt-lord-game-shell__dialog-button', () => { void commitGrazing('certify', select.value); });
      certify.disabled = locked || !candidates.length || names.length >= grazing.capacity(gate.rank);
      section.appendChild(certify);
      if (!candidates.length) section.appendChild(element('p', 'crypt-lord-game-shell__muted',
        '候选须同时存在于人物关系和 NPC 客观记录，且位阶不高于玩家。'));
    }
    if (state.grazingResult) section.appendChild(element('p', 'crypt-lord-game-shell__muted', state.grazingResult));
    state.modalBody.appendChild(section);
  }

  async function commitGrazing(action, payload) {
    if (state.grazingBusy || !Number.isInteger(state.current?.message_id)) return;
    const token = state.chatToken;
    const messageId = state.current.message_id;
    state.grazingBusy = true;
    try {
      const store = await contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 });
      const original = await store.readMessage(messageId);
      if (original?.role !== 'assistant') throw new Error('目标楼层不是 assistant');
      const grazing = modules[GRAZING_KEY];
      const pool = await abilityState.loadPool();
      const inBattle = personalBattleState.get(original.data)?.status === 'active';
      if (inBattle && action !== 'save') throw new Error('战斗中不能认证或释放灵魂');
      let verdict = null;
      if (action === 'certify') {
        const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
        const messages = await host.getChatMessages(`0-${messageId}`);
        const evidence = (Array.isArray(messages) ? messages : [])
          .filter(row => row && Number(row.message_id) <= messageId &&
            ['assistant', 'user'].includes(row.role))
          .slice(-24).map(row => `#${row.message_id} ${row.role}\n${String(row.message || '').slice(-4000)}`)
          .join('\n\n');
        verdict = await grazing.certify(original.data, pool, payload, evidence || original.message);
        if (!verdict.ok) {
          state.grazingResult = `认证不通过：${verdict.reason}`;
          notify(state.grazingResult, 'warning');
          return;
        }
      }
      if (token !== state.chatToken || state.current?.message_id !== messageId) throw new Error('聊天或楼层已变化');
      const fresh = await store.readMessage(messageId);
      if (fresh?.role !== 'assistant' || fresh.message !== original.message ||
        JSON.stringify(fresh.data) !== JSON.stringify(original.data)) throw new Error('楼层正文或变量已变化，请重试');
      const next = action === 'certify'
        ? grazing.capture(fresh.data, pool, payload, verdict, abilityLocked())
        : action === 'release' ? grazing.release(fresh.data, pool, payload, abilityLocked())
          : grazing.save(fresh.data, pool, payload, abilityLocked(), inBattle);
      await store.writeAssistantData(messageId, next);
      state.current.data = next;
      state.pathwayPool = pool;
      state.grazingDraft = null;
      state.grazingCandidate = '';
      state.grazingResult = action === 'certify' ? `认证通过：${verdict.reason}`
        : action === 'release' ? `已永久释放“${payload}”。` : '激活组合已同步。';
      modules[VARIABLE_WORKBENCH_KEY]?.notifyUpdate?.({
        messageId, beforeData: fresh.data, afterData: next, source: 'grazing',
      });
      renderLeftPanel();
      notify(state.grazingResult, 'success');
    } catch (error) {
      state.grazingResult = `放牧操作失败：${error?.message || error}`;
      notify(state.grazingResult, 'error');
    } finally {
      state.grazingBusy = false;
      if (!state.disposed && token === state.chatToken &&
        state.modal?.dataset.open === 'true' && state.modalTitle?.textContent === '途径专属玩法') renderPathwayPlay();
    }
  }

  function renderReaderMystic() {
    const reader = modules[READER_MYSTIC_KEY];
    const data = state.current?.data;
    const pool = state.pathwayPool;
    if (!reader || !data?.stat_data) return;
    if (!pool) { loadPathways(); return; }
    const owner = reader.gate(data, pool);
    if (!owner.unlocked) return;
    const locked = state.readerBusy || state.imaginationBusy ||
      personalBattleState.get(data)?.status === 'active';
    const saved = reader.configs(data);
    const entries = reader.entries(data);
    if (!state.readerDraft || state.readerDraft.messageId !== state.current.message_id) {
      state.readerDraft = { messageId: state.current.message_id, configs: {} };
    }
    const section = element('section', 'crypt-lord-game-shell__scroll crypt-lord-game-shell__reader');
    section.appendChild(element('h3', '', '阅读者 · 秘术强化'));
    section.appendChild(element('p', 'crypt-lord-game-shell__muted',
      `有效序列：${owner.viaTitle ? '上帝' : `序列${owner.rank}`} · 基础${owner.basePoints}点 + 学习${owner.learningPoints}点 · 每个秘术额度${owner.points}点 · 秘术${owner.slots}栏 · 学习${owner.learningSlots}栏`));
    const learningSlot = Math.min(owner.learningSlots, Math.max(1, state.readerLearningSlot));
    state.readerLearningSlot = learningSlot;
    section.appendChild(element('h3', '', '解析和学习'));
    const learningSelect = scrollSelect(Array.from({ length: owner.learningSlots }, (_, index) => {
      const entry = entries[index + 1];
      return [String(index + 1), `学习栏位${index + 1}${entry?.已认定 ? ` · ${entry.已认定.目标} +${entry.已认定.奖励点数}点` : ''}${entry?.进行中 ? ' · 进行中' : ''}`];
    }), String(learningSlot), '学习栏位');
    learningSelect.disabled = locked;
    learningSelect.addEventListener('change', () => {
      state.readerLearningSlot = Number(learningSelect.value);
      state.readerCandidate = '';
      renderPathwayPlay();
    });
    section.appendChild(scrollField('学习目标栏位', learningSelect));
    const entry = entries[learningSlot] || {};
    if (entry.已认定) section.appendChild(element('p', 'crypt-lord-game-shell__muted',
      `已认定：${entry.已认定.目标} · ${entry.已认定.学习序列} · +${entry.已认定.奖励点数}点 · ${entry.已认定.认定理由 || '无说明'}`));
    if (entry.进行中) {
      section.appendChild(element('p', '', `进行中：${entry.进行中.目标} · ${entry.进行中.学习序列}`));
      if (entry.进行中.上次失败原因) section.appendChild(element('p', 'crypt-lord-game-shell__scroll-warning',
        `上次认定：${entry.进行中.上次失败原因}`));
      const pendingActions = element('div', 'crypt-lord-game-shell__scroll-actions');
      const recognize = button(state.readerBusy ? '认定中…' : '认定已完成学习',
        'crypt-lord-game-shell__dialog-button is-primary', () => {
          void commitReaderMystic('certify', learningSlot);
        });
      recognize.disabled = locked;
      const cancel = button('取消进行中任务', 'crypt-lord-game-shell__small-button', () => {
        if (window.confirm(`取消学习栏位${learningSlot}的进行中任务？已认定记录会保留。`)) {
          void commitReaderMystic('cancel', learningSlot);
        }
      });
      cancel.disabled = locked;
      pendingActions.append(recognize, cancel);
      section.appendChild(pendingActions);
    }
    const candidates = reader.candidates(data, pool, learningSlot);
    const candidateSelect = scrollSelect([['', '选择人物与序列'], ...candidates.map((row, index) =>
      [String(index), `${row.目标} · ${row.学习序列} · 好感${row.好感度} · +${row.序列等级 <= 0 ? 4 : row.序列等级 < 2 ? 3 : row.序列等级 <= 3 ? 2 : 1}点`])],
    state.readerCandidate, '学习候选');
    candidateSelect.disabled = locked;
    candidateSelect.addEventListener('change', () => { state.readerCandidate = candidateSelect.value; });
    section.appendChild(scrollField('目标人物及途径', candidateSelect));
    const start = button('开始解析和学习', 'crypt-lord-game-shell__dialog-button', () => {
      const picked = candidates[Number(candidateSelect.value)];
      if (!picked || candidateSelect.value === '') return;
      if (window.confirm(`开始学习“${picked.目标}”的“${picked.学习序列}”？请在后续正文完成学习，再进行认定。`)) {
        void commitReaderMystic('start', { slot: learningSlot, target: picked });
      }
    });
    start.disabled = locked || !candidates.length;
    section.appendChild(start);
    if (!candidates.length) section.appendChild(element('p', 'crypt-lord-game-shell__muted',
      '候选须在关系和 NPC 客观记录中存在，好感高于80、非阅读者途径且不低于你的位阶；已认定栏位只能换更高序列。'));
    if (Object.keys(entries).some(index => Number(index) > owner.learningSlots)) section.appendChild(
      element('p', 'crypt-lord-game-shell__scroll-warning', '高阶学习记录已保留，但当前位阶不计入点数。'));

    section.appendChild(element('h3', '', '秘术栏位'));
    const editSlot = Math.min(owner.slots, Math.max(1, state.readerEditSlot));
    state.readerEditSlot = editSlot;
    const slotSelect = scrollSelect(Array.from({ length: owner.slots }, (_, index) =>
      [String(index + 1), `秘术栏位${index + 1}${saved[index + 1] ? ` · ${saved[index + 1].名称}` : ' · 未保存'}`]),
    String(editSlot), '秘术栏位');
    slotSelect.disabled = locked;
    slotSelect.addEventListener('change', () => {
      state.readerEditSlot = Number(slotSelect.value);
      renderPathwayPlay();
    });
    section.appendChild(scrollField('编辑栏位', slotSelect));
    if (!state.readerDraft.configs[editSlot]) {
      state.readerDraft.configs[editSlot] = reader.normalize(saved[editSlot] || reader.defaultConfig(editSlot), editSlot);
    }
    const draft = state.readerDraft.configs[editSlot];
    const fields = element('div', 'crypt-lord-game-shell__reader-fields');
    const preview = element('p', 'crypt-lord-game-shell__muted');
    const save = button('保存并同步', 'crypt-lord-game-shell__dialog-button is-primary', () => {
      void commitReaderMystic('save', { slot: editSlot, config: structuredClone(draft) });
    });
    save.disabled = locked;
    const refreshPreview = () => {
      const normalized = reader.normalize(draft, editSlot);
      try {
        const check = reader.validate(data, pool, editSlot, normalized);
        const ability = reader.build(check.config, editSlot, owner.rank);
        preview.textContent = `秘术点 ${check.points}/${owner.points} · ${normalized.流派 === 'heal' ? `治疗 ${ability.healAmt} ${normalized.治疗属性}` : `威力 ${ability.power}`} · 消耗 ${ability.cost.amount} ${normalized.消耗属性}`;
        preview.className = 'crypt-lord-game-shell__muted';
        save.disabled = locked;
      } catch (error) {
        preview.textContent = `秘术点 ${reader.points(normalized, editSlot)}/${owner.points} · ${error.message}`;
        preview.className = 'crypt-lord-game-shell__scroll-warning';
        save.disabled = true;
      }
    };
    const field = (label, key, choices, multiline = false) => {
      const control = choices ? scrollSelect(choices, String(draft[key]), label)
        : element(multiline ? 'textarea' : 'input', 'crypt-lord-game-shell__settings-input');
      if (!choices) {
        control.value = draft[key];
        control.maxLength = multiline ? 120 : 30;
        if (multiline) control.rows = 2;
      }
      control.disabled = locked;
      control.addEventListener(choices ? 'change' : 'input', () => {
        draft[key] = ['强度档', '消耗档', '范围半径'].includes(key) ? Number(control.value) : control.value;
        refreshPreview();
        if (key === '流派' || key === '目标模式' || key === '施法中心') {
          const next = reader.normalize(draft, editSlot);
          Object.assign(draft, next);
          updateVisibility();
        }
      });
      const wrapper = scrollField(label, control);
      wrapper.dataset.readerField = key;
      fields.appendChild(wrapper);
      return wrapper;
    };
    field('名称', '名称');
    field('描述', '描述', null, true);
    field('流派', '流派', [['damage', '伤害'], ['heal', '治疗']]);
    field('目标模式', '目标模式', [['single', '单体'], ['group', '群体']]);
    field('施法中心', '施法中心', [['target', '点选目标'], ['self', '自身']]);
    field('伤害类型', '伤害类型', [['physical', '物理'], ['mystical', '神秘'], ['mental', '精神'], ['mixed', '混合']]);
    field('治疗属性', '治疗属性', ['活力', '敏捷', '灵性', '理智', '人性'].map(value => [value, value]));
    field('强度档', '强度档', [0, 1, 2, 3, 4].map(value => [String(value), `第${value + 1}档 · ${value * 2}点`]));
    field('消耗属性', '消耗属性', ['活力', '敏捷', '灵性', '理智', '人性'].map(value => [value, value]));
    field('消耗档', '消耗档', [[0, '15% · 0点'], [1, '10% · 1点'], [2, '5% · 3点'], [3, '无消耗 · 6点']]);
    field('射程', '射程', [['1', '1格'], ['3', '3格'], ['5', '5格'], ['7', '7格'], ['global', '全图']]);
    field('范围半径', '范围半径', [[1, '半径1 · 2点'], [2, '半径2 · 4点'], [3, '半径3 · 6点']]);
    [0, 1].forEach(index => {
      const effect = draft.状态效果[index];
      const effectFields = element('div', 'crypt-lord-game-shell__reader-effect');
      effectFields.appendChild(element('strong', '', `状态效果${index + 1}`));
      const effectField = (label, key, choices) => {
        const control = scrollSelect(choices, String(effect[key]), label);
        control.disabled = locked;
        control.addEventListener('change', () => {
          effect[key] = ['持续', '强度档'].includes(key) ? Number(control.value) : control.value;
          refreshPreview();
          updateVisibility();
        });
        const wrapper = scrollField(label, control);
        wrapper.dataset.readerEffectField = key;
        effectFields.appendChild(wrapper);
      };
      effectField('类型', '类型', [['', '不启用'], ['buff', '增益'], ['debuff', '减益'], ['poison', '中毒'], ['regen', '再生']]);
      effectField('作用参数', '属性', [['attack', '攻击'], ['defense', '防御'], ['speed', '速度']]);
      effectField('资源属性', '资源属性', ['活力', '敏捷', '灵性', '理智', '人性'].map(value => [value, value]));
      effectField('状态目标', '目标', [['hit', '命中者'], ['self', '自身']]);
      effectField('持续', '持续', [[1, '1回合'], [2, '2回合'], [3, '3回合']]);
      effectField('强度', '强度档', [[0, '低 · 0点'], [1, '中 · 2点'], [2, '高 · 4点']]);
      fields.appendChild(effectFields);
    });
    const updateVisibility = () => {
      fields.querySelector('[data-reader-field="施法中心"] select').value = draft.施法中心;
      fields.querySelector('[data-reader-field="伤害类型"]').hidden = draft.流派 !== 'damage';
      fields.querySelector('[data-reader-field="治疗属性"]').hidden = draft.流派 !== 'heal';
      fields.querySelector('[data-reader-field="射程"]').hidden = draft.施法中心 === 'self';
      fields.querySelector('[data-reader-field="范围半径"]').hidden = draft.目标模式 !== 'group';
      fields.querySelectorAll('.crypt-lord-game-shell__reader-effect').forEach((row, index) => {
        const type = draft.状态效果[index].类型;
        row.querySelector('[data-reader-effect-field="属性"]').hidden = !['buff', 'debuff'].includes(type);
        row.querySelector('[data-reader-effect-field="资源属性"]').hidden = !['poison', 'regen'].includes(type);
      });
    };
    section.appendChild(fields);
    updateVisibility();
    refreshPreview();
    section.appendChild(preview);
    const actions = element('div', 'crypt-lord-game-shell__scroll-actions');
    actions.appendChild(save);
    if (saved[editSlot]) {
      const remove = button('删除此秘术', 'crypt-lord-game-shell__small-button', () => {
        if (window.confirm(`删除秘术栏位${editSlot}的“${saved[editSlot].名称}”？`)) {
          void commitReaderMystic('remove', editSlot);
        }
      });
      remove.disabled = locked;
      actions.appendChild(remove);
    }
    section.appendChild(actions);
    if (Object.keys(saved).some(index => Number(index) > owner.slots)) section.appendChild(
      element('p', 'crypt-lord-game-shell__scroll-warning', '高阶秘术配置已保留，但当前位阶不投影。'));
    if (state.readerResult) section.appendChild(element('p', 'crypt-lord-game-shell__muted', state.readerResult));
    state.modalBody.appendChild(section);
  }

  async function commitReaderMystic(action, payload) {
    if (state.readerBusy || !Number.isInteger(state.current?.message_id)) return;
    const token = state.chatToken;
    const messageId = state.current.message_id;
    state.readerBusy = true;
    try {
      const store = await contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 });
      const original = await store.readMessage(messageId);
      if (original?.role !== 'assistant') throw new Error('目标楼层不是 assistant');
      if (personalBattleState.get(original.data)?.status === 'active') throw new Error('战斗中不能编辑秘术或学习任务');
      const reader = modules[READER_MYSTIC_KEY];
      const pool = await abilityState.loadPool();
      let certification = null;
      if (action === 'certify') {
        const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
        const messages = await host.getChatMessages(`0-${messageId}`);
        const evidence = (Array.isArray(messages) ? messages : [])
          .filter(row => row && Number(row.message_id) <= messageId &&
            ['assistant', 'user'].includes(row.role))
          .slice(-24).map(row => `#${row.message_id} ${row.role}\n${String(row.message || '').slice(-4000)}`)
          .join('\n\n');
        certification = await reader.certify(original.data, pool, payload, evidence || original.message);
      }
      if (state.modal?.dataset.open !== 'true' || state.modalTitle?.textContent !== '途径专属玩法') {
        throw new Error('途径窗口已关闭，本次操作已取消');
      }
      if (token !== state.chatToken || state.current?.message_id !== messageId) throw new Error('聊天或楼层已变化');
      const fresh = await store.readMessage(messageId);
      if (fresh?.role !== 'assistant' || fresh.message !== original.message ||
        JSON.stringify(fresh.data) !== JSON.stringify(original.data)) throw new Error('楼层正文或变量已变化，请重试');
      const next = action === 'save'
        ? reader.save(fresh.data, pool, payload.slot, payload.config)
        : action === 'remove' ? reader.remove(fresh.data, pool, payload)
          : action === 'start' ? reader.start(fresh.data, pool, payload.slot, payload.target)
            : action === 'cancel' ? reader.cancel(fresh.data, payload)
              : reader.adjudicate(fresh.data, pool, payload,
                certification.target, certification.verdict);
      await store.writeAssistantData(messageId, next);
      state.current.data = next;
      state.pathwayPool = pool;
      state.readerDraft = null;
      state.readerCandidate = '';
      state.readerResult = action === 'certify'
        ? `学习认定${certification.verdict.ok ? '通过' : '不通过'}：${certification.verdict.reason}`
        : action === 'save' ? '秘术已保存并同步到序列能力。'
          : action === 'remove' ? '秘术已删除。'
            : action === 'start' ? '学习目标已保存，请在正文完成学习后认定。' : '进行中任务已取消。';
      modules[VARIABLE_WORKBENCH_KEY]?.notifyUpdate?.({
        messageId, beforeData: fresh.data, afterData: next, source: 'reader-mystic',
      });
      renderLeftPanel();
      notify(state.readerResult, action === 'certify' && !certification.verdict.ok ? 'warning' : 'success');
    } catch (error) {
      state.readerResult = `秘术操作失败：${error?.message || error}`;
      notify(state.readerResult, 'error');
    } finally {
      state.readerBusy = false;
      if (!state.disposed && token === state.chatToken &&
        state.modal?.dataset.open === 'true' && state.modalTitle?.textContent === '途径专属玩法') renderPathwayPlay();
    }
  }

  function renderReenactment() {
    const reenact = modules[REENACTMENT_KEY];
    const reader = modules[READER_MYSTIC_KEY];
    const data = state.current?.data;
    const pool = state.pathwayPool;
    if (!reenact || !reader || !data?.stat_data) return;
    if (!pool) { loadPathways(); return; }
    const owner = reenact.gate(data, pool);
    if (!owner.unlocked) return;
    const locked = state.reenactBusy || personalBattleState.get(data)?.status === 'active';
    const saved = reenact.configs(data);
    if (!state.reenactDraft || state.reenactDraft.messageId !== state.current.message_id) {
      state.reenactDraft = { messageId: state.current.message_id, configs: {},
        name: '', content: '', replacementId: '' };
    }
    const draftState = state.reenactDraft;
    const section = element('section', 'crypt-lord-game-shell__scroll crypt-lord-game-shell__reenact');
    section.appendChild(element('h3', '', '窥秘人 · 神秘再现'));
    section.appendChild(element('p', 'crypt-lord-game-shell__muted',
      `有效序列：${owner.viaTitle ? '知识之妖' : `序列${owner.rank}`} · 知识点${owner.points} · 法术${owner.slots}栏 · 档案容量${owner.capacity}条`));
    const archive = reenact.knowledge(data);
    const active = new Set(owner.active.map(row => row.ID));
    section.appendChild(element('h3', '', `知识档案 ${archive.length}/${owner.capacity}`));
    const archiveList = element('div', 'crypt-lord-game-shell__scroll-list');
    for (const row of archive) {
      const item = element('div', 'crypt-lord-game-shell__scroll-row');
      const description = element('div');
      description.append(element('strong', '', `${row.名称} · ${row.总点数}点 ${active.has(row.ID) ? '' : '（降档保留）'}`),
        element('span', 'crypt-lord-game-shell__muted', row.内容),
        element('small', 'crypt-lord-game-shell__muted', `${row.涉及位阶档} · ${row.历史年代档}`));
      const remove = button('删除', 'crypt-lord-game-shell__small-button', () => {
        if (window.confirm(`删除知识“${row.名称}”？知识点会重算，但已解锁的原著法术仍保留。`)) {
          void commitReenactment('delete-knowledge', row.ID);
        }
      });
      remove.disabled = locked;
      item.append(description, remove);
      archiveList.appendChild(item);
    }
    section.appendChild(archiveList);
    if (!archive.length) section.appendChild(element('p', 'crypt-lord-game-shell__muted', '尚无认证知识。'));
    const unlocked = reenact.catalog.filter(row => Object.hasOwn(reenact.ledger(data), row.id));
    const entryLabels = { 'battle-skill': '序列能力', auxiliary: '辅助能力',
      'field-effect': '战术场地效果', 'mythic-form': '战术形态',
      'turn-skip': '战术操控', exile: '战术放逐', environment: '战术环境' };
    section.appendChild(element('h3', '', `已解锁原著法术 ${unlocked.length}/${reenact.catalog.length}`));
    const catalog = element('div', 'crypt-lord-game-shell__scroll-list');
    for (const row of unlocked) {
      const item = element('div', 'crypt-lord-game-shell__scroll-row');
      const source = reenact.ledger(data)[row.id]?.来源知识ID;
      item.appendChild(element('span', '', `${row.battleName} · ${row.source} · ${entryLabels[row.kind] || '战术能力'}${source && !archive.some(entry => entry.ID === source) ? ' · 来源知识已删' : ''}`));
      catalog.appendChild(item);
    }
    section.appendChild(catalog);
    section.appendChild(element('h3', '', '提交知识认证'));
    const name = element('input', 'crypt-lord-game-shell__settings-input');
    name.maxLength = 80; name.value = draftState.name; name.disabled = locked;
    const updateCertify = () => {
      certify.disabled = locked || !draftState.name.trim() || !draftState.content.trim() ||
        archive.length >= owner.capacity && !draftState.replacementId;
    };
    name.addEventListener('input', () => { draftState.name = name.value; updateCertify(); });
    section.appendChild(scrollField('知识名称', name));
    const content = element('textarea', 'crypt-lord-game-shell__settings-input');
    content.rows = 4; content.maxLength = 2000; content.value = draftState.content; content.disabled = locked;
    content.addEventListener('input', () => { draftState.content = content.value; updateCertify(); });
    section.appendChild(scrollField('完整、单一的知识内容', content));
    if (archive.length >= owner.capacity) {
      const replace = scrollSelect([['', '选择新增知识要替换的记录'], ...archive.map(row =>
        [row.ID, `${row.名称} · ${row.总点数}点`])], draftState.replacementId, '替换记录');
      replace.disabled = locked;
      replace.addEventListener('change', () => { draftState.replacementId = replace.value; updateCertify(); });
      section.appendChild(scrollField('档案已满时替换', replace));
    }
    const certify = button(state.reenactBusy ? '认证中…' : '提交认证',
      'crypt-lord-game-shell__dialog-button is-primary', () => {
        void commitReenactment('certify', { name: draftState.name, content: draftState.content,
          replacementId: draftState.replacementId });
      });
    updateCertify();
    section.appendChild(certify);
    section.appendChild(element('h3', '', '创造魔法或巫术'));
    const editSlot = Math.min(owner.slots, Math.max(1, state.reenactSlot));
    state.reenactSlot = editSlot;
    const select = scrollSelect(Array.from({ length: owner.slots }, (_, index) =>
      [String(index + 1), `法术栏位${index + 1}${saved[index + 1] ? ` · ${saved[index + 1].名称}` : ' · 未保存'}`]),
    String(editSlot), '法术栏位');
    select.disabled = locked;
    select.addEventListener('change', () => { state.reenactSlot = Number(select.value); renderPathwayPlay(); });
    section.appendChild(scrollField('编辑栏位', select));
    if (!draftState.configs[editSlot]) draftState.configs[editSlot] =
      reader.normalize(saved[editSlot] || reenact.defaultConfig(editSlot), editSlot);
    const draft = draftState.configs[editSlot];
    const fields = element('div', 'crypt-lord-game-shell__reader-fields');
    const preview = element('p', 'crypt-lord-game-shell__muted');
    const save = button('保存并同步', 'crypt-lord-game-shell__dialog-button is-primary', () => {
      void commitReenactment('save', { slot: editSlot, config: structuredClone(draft) });
    });
    const refreshPreview = () => {
      try {
        const cfg = reenact.validate(data, pool, editSlot, draft);
        const built = reader.build(cfg, editSlot, owner.rank);
        preview.textContent = `法术点 ${reader.points(cfg, editSlot)}/${owner.points} · ${cfg.流派 === 'heal' ? `治疗 ${built.healAmt} ${cfg.治疗属性}` : `威力 ${built.power}`} · 消耗 ${built.cost.amount} ${cfg.消耗属性}`;
        preview.className = 'crypt-lord-game-shell__muted';
        save.disabled = locked;
      } catch (error) {
        preview.textContent = `法术点 ${reader.points(draft, editSlot)}/${owner.points} · ${error.message}`;
        preview.className = 'crypt-lord-game-shell__scroll-warning';
        save.disabled = true;
      }
    };
    const field = (label, key, choices, multiline = false) => {
      const control = choices ? scrollSelect(choices, String(draft[key]), label)
        : element(multiline ? 'textarea' : 'input', 'crypt-lord-game-shell__settings-input');
      if (!choices) { control.value = draft[key]; control.maxLength = multiline ? 120 : 30; }
      control.disabled = locked;
      control.addEventListener(choices ? 'change' : 'input', () => {
        draft[key] = ['强度档', '消耗档', '范围半径'].includes(key) ? Number(control.value) : control.value;
        if (key === '流派' || key === '目标模式' || key === '施法中心') {
          Object.assign(draft, reader.normalize(draft, editSlot));
          updateVisibility();
        }
        refreshPreview();
      });
      const wrapper = scrollField(label, control);
      wrapper.dataset.readerField = key;
      fields.appendChild(wrapper);
    };
    field('名称', '名称'); field('描述', '描述', null, true);
    field('流派', '流派', [['damage', '伤害'], ['heal', '治疗']]);
    field('目标模式', '目标模式', [['single', '单体'], ['group', '群体']]);
    field('施法中心', '施法中心', [['target', '点选目标'], ['self', '自身']]);
    field('伤害类型', '伤害类型', [['physical', '物理'], ['mystical', '神秘'], ['mental', '精神'], ['mixed', '混合']]);
    field('治疗属性', '治疗属性', ['活力', '敏捷', '灵性', '理智', '人性'].map(value => [value, value]));
    field('强度档', '强度档', [0, 1, 2, 3, 4].map(value => [String(value), `第${value + 1}档 · ${value * 2}点`]));
    field('消耗属性', '消耗属性', ['活力', '敏捷', '灵性', '理智', '人性'].map(value => [value, value]));
    field('消耗档', '消耗档', [[0, '15% · 0点'], [1, '10% · 1点'], [2, '5% · 3点'], [3, '无消耗 · 6点']]);
    field('射程', '射程', [['1', '1格'], ['3', '3格'], ['5', '5格'], ['7', '7格'], ['global', '全图']]);
    field('范围半径', '范围半径', [[1, '半径1 · 2点'], [2, '半径2 · 4点'], [3, '半径3 · 6点']]);
    for (let index = 0; index < 2; index++) {
      const effect = draft.状态效果[index];
      const box = element('div', 'crypt-lord-game-shell__reader-effect');
      box.appendChild(element('strong', '', `状态效果${index + 1}`));
      const effectField = (label, key, choices) => {
        const control = scrollSelect(choices, String(effect[key]), label);
        control.disabled = locked;
        control.addEventListener('change', () => {
          effect[key] = ['持续', '强度档'].includes(key) ? Number(control.value) : control.value;
          updateVisibility(); refreshPreview();
        });
        const wrapper = scrollField(label, control);
        wrapper.dataset.readerEffectField = key;
        box.appendChild(wrapper);
      };
      effectField('类型', '类型', [['', '不启用'], ['buff', '增益'], ['debuff', '减益'], ['poison', '中毒'], ['regen', '再生']]);
      effectField('作用参数', '属性', [['attack', '攻击'], ['defense', '防御'], ['speed', '速度']]);
      effectField('资源属性', '资源属性', ['活力', '敏捷', '灵性', '理智', '人性'].map(value => [value, value]));
      effectField('状态目标', '目标', [['hit', '命中者'], ['self', '自身']]);
      effectField('持续', '持续', [[1, '1回合'], [2, '2回合'], [3, '3回合']]);
      effectField('强度', '强度档', [[0, '低 · 0点'], [1, '中 · 2点'], [2, '高 · 4点']]);
      fields.appendChild(box);
    }
    const updateVisibility = () => {
      fields.querySelector('[data-reader-field="施法中心"] select').value = draft.施法中心;
      fields.querySelector('[data-reader-field="伤害类型"]').hidden = draft.流派 !== 'damage';
      fields.querySelector('[data-reader-field="治疗属性"]').hidden = draft.流派 !== 'heal';
      fields.querySelector('[data-reader-field="射程"]').hidden = draft.施法中心 === 'self';
      fields.querySelector('[data-reader-field="范围半径"]').hidden = draft.目标模式 !== 'group';
      fields.querySelectorAll('.crypt-lord-game-shell__reader-effect').forEach((box, index) => {
        const type = draft.状态效果[index].类型;
        box.querySelector('[data-reader-effect-field="属性"]').hidden = !['buff', 'debuff'].includes(type);
        box.querySelector('[data-reader-effect-field="资源属性"]').hidden = !['poison', 'regen'].includes(type);
      });
    };
    section.appendChild(fields);
    updateVisibility(); refreshPreview();
    section.appendChild(preview);
    const actions = element('div', 'crypt-lord-game-shell__scroll-actions');
    actions.appendChild(save);
    if (saved[editSlot]) {
      const remove = button('删除此法术', 'crypt-lord-game-shell__small-button', () => {
        if (window.confirm(`删除“${saved[editSlot].名称}”？`)) void commitReenactment('remove', editSlot);
      });
      remove.disabled = locked; actions.appendChild(remove);
    }
    section.appendChild(actions);
    if (Object.keys(saved).some(index => Number(index) > owner.slots)) section.appendChild(
      element('p', 'crypt-lord-game-shell__scroll-warning', '高阶法术配置已保留，但当前位阶不投影。'));
    if (state.reenactResult) section.appendChild(element('p', 'crypt-lord-game-shell__muted', state.reenactResult));
    state.modalBody.appendChild(section);
  }

  async function commitReenactment(action, payload) {
    if (state.reenactBusy || !Number.isInteger(state.current?.message_id)) return;
    const token = state.chatToken;
    const messageId = state.current.message_id;
    state.reenactBusy = true;
    try {
      const store = await contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 });
      const original = await store.readMessage(messageId);
      if (original?.role !== 'assistant') throw new Error('目标楼层不是 assistant');
      if (personalBattleState.get(original.data)?.status === 'active') throw new Error('战斗中不能修改神秘再现');
      const reenact = modules[REENACTMENT_KEY];
      const pool = await abilityState.loadPool();
      let verdict = null;
      if (action === 'certify') {
        const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
        const messages = await host.getChatMessages(`0-${messageId}`);
        const evidence = (Array.isArray(messages) ? messages : [])
          .filter(row => row && Number(row.message_id) <= messageId &&
            ['assistant', 'user'].includes(row.role))
          .slice(-24).map(row => `#${row.message_id} ${row.role}\n${String(row.message || '').slice(-4000)}`).join('\n\n');
        verdict = await reenact.certify(original.data, pool, payload, evidence || original.message);
      }
      if (state.modal?.dataset.open !== 'true' || state.modalTitle?.textContent !== '途径专属玩法') {
        throw new Error('途径窗口已关闭，本次操作已取消');
      }
      if (token !== state.chatToken || state.current?.message_id !== messageId) throw new Error('聊天或楼层已变化');
      const fresh = await store.readMessage(messageId);
      if (fresh?.role !== 'assistant' || fresh.message !== original.message ||
        JSON.stringify(fresh.data) !== JSON.stringify(original.data)) throw new Error('楼层正文或变量已变化，请重试');
      let next;
      if (action === 'certify') {
        const result = reenact.apply(fresh.data, pool, payload, verdict, payload.replacementId);
        if (!result.changed) {
          state.reenactResult = result.message;
          notify(result.message, verdict.ok ? 'info' : 'warning');
          return;
        }
        next = result.data;
        state.reenactResult = result.message;
      } else {
        next = action === 'delete-knowledge' ? reenact.removeKnowledge(fresh.data, pool, payload)
          : action === 'save' ? reenact.save(fresh.data, pool, payload.slot, payload.config)
            : reenact.remove(fresh.data, pool, payload);
        state.reenactResult = action === 'save' ? '法术已保存并同步。'
          : action === 'remove' ? '法术已删除。' : '知识已删除，点数已重算。';
      }
      await store.writeAssistantData(messageId, next);
      state.current.data = next;
      state.pathwayPool = pool;
      if (action === 'certify') { state.reenactDraft.name = ''; state.reenactDraft.content = ''; }
      if (action === 'save' || action === 'remove') state.reenactDraft.configs = {};
      modules[VARIABLE_WORKBENCH_KEY]?.notifyUpdate?.({
        messageId, beforeData: fresh.data, afterData: next, source: 'mystery-reenactment',
      });
      renderLeftPanel();
      notify(state.reenactResult, 'success');
    } catch (error) {
      state.reenactResult = `神秘再现操作失败：${error?.message || error}`;
      notify(state.reenactResult, 'error');
    } finally {
      state.reenactBusy = false;
      if (!state.disposed && token === state.chatToken &&
        state.modal?.dataset.open === 'true' && state.modalTitle?.textContent === '途径专属玩法') renderPathwayPlay();
    }
  }

  function renderShamanPicture() {
    const picture = modules[SHAMAN_PICTURE_KEY];
    const data = state.current?.data;
    if (!picture?.gate(data?.stat_data).unlocked) return;
    const section = element('section', 'crypt-lord-game-shell__scroll crypt-lord-game-shell__picture');
    section.appendChild(element('h3', '', '萨满 · 制造画中人'));
    const rows = picture.records(data);
    const list = element('div', 'crypt-lord-game-shell__scroll-list');
    rows.forEach(row => {
      const item = element('div', 'crypt-lord-game-shell__scroll-row');
      const details = element('div', '');
      details.append(element('strong', '', row.name),
        element('span', 'crypt-lord-game-shell__muted',
          `${row.card.当前序列} · ${row.card.能力体系 || '未知体系'} · 战斗实力100% · 移动力0`),
        element('span', 'crypt-lord-game-shell__muted',
          `活力${row.card.活力} · 敏捷${row.card.敏捷} · 灵性${row.card.灵性} · 理智${row.card.理智} · 人性${row.card.人性} · 运气${row.card.运气}`),
        element('span', 'crypt-lord-game-shell__muted',
          `能力：${row.card.能力清单?.map(ability => ability.名称 || ability.name).join('、') || '无'}`));
      item.appendChild(details);
      list.appendChild(item);
    });
    section.appendChild(list);
    if (!rows.length) section.appendChild(element('p', 'crypt-lord-game-shell__muted', '尚未制造画中人。'));
    const pool = state.pathwayPool;
    if (!pool && !state.pathwayPoolPromise) {
      const token = state.chatToken;
      state.pathwayPoolPromise = abilityState.loadPool().then(value => {
        if (token === state.chatToken) state.pathwayPool = value;
      }).catch(error => notify(`途径库读取失败：${error?.message || error}`, 'error'))
        .finally(() => {
          state.pathwayPoolPromise = null;
          if (token === state.chatToken && state.modal?.dataset.open === 'true' &&
            state.modalTitle?.textContent === '途径专属玩法') renderPathwayPlay();
        });
    }
    const choices = picture.choices(pool, data.stat_data);
    if (choices.length) {
      if (!choices.some(row => row.key === state.picturePathway)) state.picturePathway = choices[0].key;
      const select = scrollSelect(choices.map(row => [row.key, `${row.pathway} · ${row.sequence}`]),
        state.picturePathway, '目标途径');
      select.addEventListener('change', () => { state.picturePathway = select.value; });
      section.appendChild(scrollField('目标途径（位阶固定为当前萨满位阶）', select));
    } else section.appendChild(element('p', 'crypt-lord-game-shell__muted',
      pool ? '当前位阶没有可制造的目标途径。' : '正在读取途径与能力库…'));
    const materials = modules[SCROLL_CRAFTING_KEY]?.materials(data.stat_data) || [];
    const total = materials.reduce((sum, row) => sum +
      Math.min(row.available, Number(state.pictureMaterials[row.key]) || 0) * row.perUnit, 0);
    const locked = state.pictureBusy || personalBattleState.get(data)?.status === 'active';
    materials.forEach(row => {
      const input = element('input', 'crypt-lord-game-shell__settings-input');
      input.type = 'number'; input.min = '0'; input.max = String(row.available); input.step = '1';
      input.value = String(Math.min(row.available, Number(state.pictureMaterials[row.key]) || 0));
      input.disabled = locked;
      input.addEventListener('change', () => {
        state.pictureMaterials[row.key] = Number(input.value);
        renderPathwayPlay();
      });
      section.appendChild(scrollField(`${row.name} · ${row.type} · 库存${row.available} · 每件${row.perUnit}点`, input));
    });
    section.appendChild(element('p', total >= 10 ? 'crypt-lord-game-shell__muted' : 'crypt-lord-game-shell__scroll-warning',
      `已选 ${total} 点；至少需要 10 点。整件消耗，溢出不返还。`));
    const submit = button(state.pictureBusy ? '制造中…' : '确认消耗并制造',
      'crypt-lord-game-shell__button is-primary', () => {
        void commitShamanPicture(state.picturePathway, { ...state.pictureMaterials });
      });
    submit.disabled = locked || total < 10 || !choices.length;
    section.appendChild(submit);
    state.modalBody.appendChild(section);
  }

  async function commitShamanPicture(key, quantities) {
    if (state.pictureBusy) return;
    const token = state.chatToken;
    const messageId = state.current?.message_id;
    if (!Number.isInteger(messageId)) return;
    state.pictureBusy = true;
    try {
      const store = await contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 });
      const original = await store.readMessage(messageId);
      if (original?.role !== 'assistant') throw new Error('目标楼层不是 assistant');
      if (personalBattleState.get(original.data)?.status === 'active') throw new Error('战斗中不能制造画中人');
      const picture = modules[SHAMAN_PICTURE_KEY];
      const pool = await abilityState.loadPool();
      const materials = modules[SCROLL_CRAFTING_KEY].materials(original.data.stat_data);
      const total = materials.reduce((sum, row) => sum + (Number(quantities[row.key]) || 0) * row.perUnit, 0);
      if (total < 10) throw new Error('至少需要 10 点材料');
      if (!window.confirm(`消耗所选材料共 ${total} 点，制造画中人？溢出不返还。`)) return;
      if (token !== state.chatToken || state.current?.message_id !== messageId) throw new Error('聊天或楼层已变化');
      const fresh = await store.readMessage(messageId);
      if (fresh?.role !== 'assistant' || fresh.message !== original.message ||
        JSON.stringify(fresh.data) !== JSON.stringify(original.data)) throw new Error('楼层正文或变量已变化，请重试');
      const result = picture.craft(fresh.data, pool, key, quantities);
      await store.writeAssistantData(messageId, result.data);
      state.current.data = result.data;
      modules[VARIABLE_WORKBENCH_KEY]?.notifyUpdate?.({
        messageId, beforeData: fresh.data, afterData: result.data, source: 'shaman-picture',
      });
      state.pictureMaterials = {};
      renderLeftPanel();
      notify(`制造完成：${result.name}`, 'success');
    } catch (error) {
      notify(`画中人制造失败：${error?.message || error}`, 'error');
    } finally {
      state.pictureBusy = false;
      if (!state.disposed && token === state.chatToken &&
        state.modal?.dataset.open === 'true' && state.modalTitle?.textContent === '途径专属玩法') renderPathwayPlay();
    }
  }

  function arbiterDraft() {
    if (!state.arbiterDraft) state.arbiterDraft = {
      baseName: '', baseBoundary: '', issuer: '', position: '', note: '',
      regions: [{ name: '', boundary: '' }],
    };
    return state.arbiterDraft;
  }

  function renderArbiterJurisdiction() {
    const arbiter = modules[ARBITER_JURISDICTION_KEY];
    const data = state.current?.data;
    if (!arbiter?.gate(data?.stat_data).unlocked) return;
    const value = arbiter.stored(data.stat_data);
    const hasBase = arbiter.hasBase(value);
    const familiar = arbiter.familiarity(data);
    const rankScope = arbiter.scope(arbiter.gate(data.stat_data).rank);
    const draft = arbiterDraft();
    const locked = state.arbiterBusy || personalBattleState.get(data)?.status === 'active';
    const section = element('section', 'crypt-lord-game-shell__scroll crypt-lord-game-shell__arbiter');
    section.appendChild(element('h3', '', '仲裁人 · 设定辖区'));
    section.appendChild(element('p', 'crypt-lord-game-shell__muted', `当前最大基础范围：${rankScope}`));
    if (hasBase) {
      const base = value.基础辖区;
      section.appendChild(element('p', '', `基础辖区：${base.名称} · ${base.范围档} · ${base.边界描述}`));
      section.appendChild(element('p', 'crypt-lord-game-shell__muted',
        `设置于 ${base.设置时间 || '未记录'} · ${base.认证理由 || '无认证说明'}`));
      section.appendChild(element('p', familiar.ready ? 'crypt-lord-game-shell__muted' : 'crypt-lord-game-shell__scroll-warning',
        !arbiter.baseAllowed(value, data.stat_data) ? '基础辖区超过当前位阶容量，战斗加成暂停。'
          : familiar.ready ? '已熟悉，基础辖区内六维 +25%。'
            : familiar.reason || `熟悉期剩余 ${arbiter.remainingText(familiar.remaining)}`));
    } else section.appendChild(element('p', 'crypt-lord-game-shell__muted', '尚未设定基础辖区。'));
    if (value?.官方任命) {
      const appointment = value.官方任命;
      section.appendChild(element('p', '', `正式任命：${appointment.任命机关} · ${appointment.职务}`));
      section.appendChild(element('p', 'crypt-lord-game-shell__muted',
        `${(appointment.行政区列表 || []).map(row => row.名称).join('、')} · ${arbiter.appointmentAllowed(value, data.stat_data) ? '辖区内六维 +50%' : '已超出当前位阶容量'}`));
    }
    const field = (label, key, multiline = false) => {
      const input = element(multiline ? 'textarea' : 'input', 'crypt-lord-game-shell__settings-input');
      if (multiline) input.rows = 2;
      input.value = draft[key];
      input.disabled = locked;
      input.addEventListener('input', () => { draft[key] = input.value; });
      return scrollField(label, input);
    };
    section.appendChild(element('h3', '', '基础辖区'));
    section.append(field('辖区名称', 'baseName'), field('边界描述', 'baseBoundary', true));
    const baseButton = button(hasBase ? '认证并更换辖区' : '认证并设定辖区',
      'crypt-lord-game-shell__button is-primary', () => {
        void commitArbiter('base', { name: draft.baseName, boundary: draft.baseBoundary });
      });
    baseButton.disabled = locked;
    section.appendChild(baseButton);
    section.appendChild(element('p', 'crypt-lord-game-shell__muted',
      '首次设定立即生效；更换后十个游戏日内无加成，旧任命同时清除。'));
    section.appendChild(element('h3', '', '正式任命'));
    section.append(field('任命机关', 'issuer'), field('职务', 'position'),
      field('任命说明', 'note', true));
    const regions = element('div', 'crypt-lord-game-shell__scroll-list');
    draft.regions.forEach((row, index) => {
      const group = element('div', 'crypt-lord-game-shell__arbiter-region');
      const regionField = (label, key) => {
        const input = element(key === 'boundary' ? 'textarea' : 'input',
          'crypt-lord-game-shell__settings-input');
        if (key === 'boundary') input.rows = 2;
        input.value = row[key];
        input.disabled = locked;
        input.addEventListener('input', () => { row[key] = input.value; });
        return scrollField(label, input);
      };
      group.append(regionField(`行政区 ${index + 1} 名称`, 'name'),
        regionField('边界描述', 'boundary'));
      const remove = button('移除此区', 'crypt-lord-game-shell__small-button', () => {
        draft.regions.splice(index, 1);
        renderPathwayPlay();
      });
      remove.disabled = locked || draft.regions.length === 1;
      group.appendChild(remove);
      regions.appendChild(group);
    });
    section.appendChild(regions);
    const actions = element('div', 'crypt-lord-game-shell__scroll-actions');
    const add = button('增加行政区', 'crypt-lord-game-shell__small-button', () => {
      draft.regions.push({ name: '', boundary: '' });
      renderPathwayPlay();
    });
    add.disabled = locked || draft.regions.length >= 5;
    const certify = button('认证正式任命', 'crypt-lord-game-shell__button is-primary', () => {
      void commitArbiter('appointment', { issuer: draft.issuer, position: draft.position,
        note: draft.note, regions: draft.regions.map(row => ({ ...row })) });
    });
    certify.disabled = locked || !hasBase;
    actions.append(add, certify);
    if (value?.官方任命) {
      const clearButton = button('清除任命', 'crypt-lord-game-shell__small-button', () => {
        void commitArbiter('clear');
      });
      clearButton.disabled = locked;
      actions.appendChild(clearButton);
    }
    section.appendChild(actions);
    if (state.arbiterResult) section.appendChild(element('p', 'crypt-lord-game-shell__muted', state.arbiterResult));
    state.modalBody.appendChild(section);
  }

  async function commitArbiter(kind, payload) {
    if (state.arbiterBusy) return;
    const token = state.chatToken;
    const messageId = state.current?.message_id;
    if (!Number.isInteger(messageId)) return;
    state.arbiterBusy = true;
    try {
      const store = await contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 });
      const original = await store.readMessage(messageId);
      if (original?.role !== 'assistant') throw new Error('目标楼层不是 assistant');
      if (personalBattleState.get(original.data)?.status === 'active') throw new Error('战斗中不能变更辖区');
      const arbiter = modules[ARBITER_JURISDICTION_KEY];
      let verdict = null;
      if (kind === 'base') {
        arbiter.validateBase(original.data, payload.name, payload.boundary);
        verdict = await arbiter.certifyBase(original.data, payload.name, payload.boundary, original.message);
        if (!verdict.ok) throw new Error(`基础辖区未通过认证：${verdict.reason}`);
      } else if (kind === 'appointment') {
        arbiter.validateAppointment(original.data, payload);
        verdict = await arbiter.certifyAppointment(original.data, payload, original.message);
      } else if (kind === 'clear') {
        if (!arbiter.stored(original.data?.stat_data)?.官方任命) throw new Error('任命已不存在');
        if (!window.confirm('确定清除当前正式任命？基础辖区仍会保留。')) return;
      } else throw new Error('未知辖区操作');
      if (token !== state.chatToken || state.current?.message_id !== messageId) throw new Error('聊天或楼层已变化');
      const fresh = await store.readMessage(messageId);
      if (fresh?.role !== 'assistant' || fresh.message !== original.message ||
        JSON.stringify(fresh.data) !== JSON.stringify(original.data)) throw new Error('楼层正文或变量已变化，请重试');
      const result = kind === 'base' ? arbiter.applyBase(fresh.data, payload.name, payload.boundary, verdict)
        : kind === 'appointment' ? arbiter.applyAppointment(fresh.data, payload, verdict)
          : { data: arbiter.clearAppointment(fresh.data) };
      await store.writeAssistantData(messageId, result.data);
      state.current.data = result.data;
      modules[VARIABLE_WORKBENCH_KEY]?.notifyUpdate?.({
        messageId, beforeData: fresh.data, afterData: result.data, source: 'arbiter-jurisdiction',
      });
      if (kind === 'base') {
        arbiterDraft().baseName = '';
        arbiterDraft().baseBoundary = '';
      }
      state.arbiterResult = kind === 'clear' ? '正式任命已清除。'
        : kind === 'appointment' && !result.accepted ? `认证未通过，旧任命已清除：${verdict.reason}`
          : kind === 'appointment' ? `任命认证通过：${verdict.reason}`
            : result.changing ? '辖区已更换，进入十日熟悉期。' : '基础辖区设定成功。';
      notify(state.arbiterResult, result.accepted === false ? 'warning' : 'success');
      renderLeftPanel();
    } catch (error) {
      state.arbiterResult = `辖区操作失败：${error?.message || error}`;
      notify(state.arbiterResult, 'error');
    } finally {
      state.arbiterBusy = false;
      if (!state.disposed && token === state.chatToken &&
        state.modal?.dataset.open === 'true' && state.modalTitle?.textContent === '途径专属玩法') renderPathwayPlay();
    }
  }

  function renderShamanTerritory() {
    const shaman = modules[SHAMAN_TERRITORY_KEY];
    const data = state.current?.data;
    if (!shaman?.gate(data?.stat_data).unlocked) return;
    const territory = shaman.stored(data?.stat_data);
    const existing = shaman.hasTerritory(territory);
    const cooldown = shaman.cooldown(data);
    const section = element('section', 'crypt-lord-game-shell__scroll crypt-lord-game-shell__shaman');
    section.appendChild(element('h3', '', '萨满 · 设置领地图腾'));
    section.appendChild(element('p', 'crypt-lord-game-shell__muted', existing
      ? `${territory.图腾位置} · 半径 ${Math.max(Number(territory.领地半径公里), shaman.radius(shaman.gate(data.stat_data).rank))} 公里 · 设置于 ${territory.上次设置时间}`
      : '尚未设置图腾。首次认证不消耗材料。'));
    if (existing && territory.认证理由) section.appendChild(element('p',
      'crypt-lord-game-shell__muted', `认证依据：${territory.认证理由}`));
    if (existing) section.appendChild(element('p',
      cooldown.ready ? 'crypt-lord-game-shell__muted' : 'crypt-lord-game-shell__scroll-warning',
      cooldown.ready ? '可以更换领地，需投入至少 5 点同位阶或更高材料。'
        : cooldown.reason || `冷却剩余 ${shaman.remainingText(cooldown.remaining)}`));
    const place = element('input', 'crypt-lord-game-shell__settings-input');
    place.placeholder = '图腾地点';
    place.value = state.shamanPlace;
    place.disabled = state.shamanBusy;
    place.addEventListener('input', () => { state.shamanPlace = place.value; });
    section.appendChild(scrollField(existing ? '新图腾地点' : '图腾地点', place));
    let totalLabel = null;
    if (existing) {
      const list = element('div', 'crypt-lord-game-shell__scroll-list');
      const rows = shaman.materials(data.stat_data);
      const updateTotal = () => {
        const selected = rows.reduce((sum, item) => sum + Number(state.shamanMaterials[item.key] || 0) * item.perUnit, 0);
        totalLabel.textContent = `当前选择 ${selected} 点${selected > 5 ? `，溢出 ${selected - 5} 点不返还` : ''}`;
      };
      rows.forEach(row => {
        const line = element('label', 'crypt-lord-game-shell__scroll-row');
        const count = element('input', 'crypt-lord-game-shell__settings-input');
        count.type = 'number';
        count.min = '0';
        count.max = String(row.available);
        count.step = '1';
        count.value = String(state.shamanMaterials[row.key] || 0);
        count.disabled = state.shamanBusy || !cooldown.ready;
        count.addEventListener('input', () => {
          state.shamanMaterials[row.key] = count.value;
          updateTotal();
        });
        line.append(element('span', '', `${row.name} · ${row.type} · ${row.item.序列} · 库存 ${row.available} · 每份 ${row.perUnit} 点`), count);
        list.appendChild(line);
      });
      section.appendChild(list);
      if (!rows.length) section.appendChild(element('p', 'crypt-lord-game-shell__scroll-warning',
        '物品栏中没有符合要求的材料。'));
      totalLabel = element('p', 'crypt-lord-game-shell__muted');
      section.appendChild(totalLabel);
      updateTotal();
    }
    const submit = button(existing ? '认证并更换领地' : '认证并设置领地',
      'crypt-lord-game-shell__button is-primary', () => {
        void commitShamanTerritory(place.value, { ...state.shamanMaterials });
      });
    submit.disabled = state.shamanBusy || (existing && !cooldown.ready);
    section.appendChild(submit);
    state.modalBody.appendChild(section);
  }

  async function commitShamanTerritory(place, quantities) {
    if (state.shamanBusy) return;
    const token = state.chatToken;
    const messageId = state.current?.message_id;
    if (!Number.isInteger(messageId)) return;
    state.shamanBusy = true;
    try {
      const store = await contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 });
      const original = await store.readMessage(messageId);
      if (original?.role !== 'assistant') throw new Error('目标楼层不是 assistant');
      const shaman = modules[SHAMAN_TERRITORY_KEY];
      if (personalBattleState.get(original.data)?.status === 'active') throw new Error('战斗中不能更换图腾');
      shaman.validate(original.data, place, quantities);
      if (!window.confirm(`请确认已经在“${place.trim()}”完成图腾仪式。认证通过后将写入本楼层变量${shaman.hasTerritory(shaman.stored(original.data.stat_data)) ? '并消耗所选材料' : ''}。`)) return;
      const verdict = await shaman.certify(original.data, place, original.message);
      if (!verdict.ok) throw new Error(`认证未通过：${verdict.reason}`);
      if (token !== state.chatToken || state.current?.message_id !== messageId) throw new Error('聊天或楼层已变化');
      const fresh = await store.readMessage(messageId);
      if (fresh?.role !== 'assistant' || fresh.message !== original.message ||
        JSON.stringify(fresh.data) !== JSON.stringify(original.data)) throw new Error('楼层正文或变量已变化，请重试');
      const result = shaman.apply(fresh.data, place, quantities, verdict);
      await store.writeAssistantData(messageId, result.data);
      state.current.data = result.data;
      modules[VARIABLE_WORKBENCH_KEY]?.notifyUpdate?.({
        messageId, beforeData: fresh.data, afterData: result.data, source: 'shaman-territory',
      });
      state.shamanPlace = '';
      state.shamanMaterials = {};
      state.arbiterDraft = null;
      state.arbiterResult = '';
      renderLeftPanel();
      notify(result.changing ? '领地已更换，材料已扣除。' : '领地图腾设置成功。', 'success');
    } catch (error) {
      notify(`图腾设置失败：${error?.message || error}`, 'error');
    } finally {
      state.shamanBusy = false;
      if (!state.disposed && token === state.chatToken &&
        state.modal?.dataset.open === 'true' && state.modalTitle?.textContent === '途径专属玩法') renderPathwayPlay();
    }
  }

  function scrollField(label, control) {
    const field = element('label', 'crypt-lord-game-shell__scroll-field');
    field.append(element('span', '', label), control);
    return field;
  }

  function scrollSelect(options, selected, label) {
    const select = element('select', 'crypt-lord-game-shell__settings-input');
    select.setAttribute('aria-label', label);
    options.forEach(([value, text]) => {
      const option = element('option', '', text);
      option.value = String(value);
      option.selected = String(value) === String(selected);
      select.appendChild(option);
    });
    return select;
  }

  function scrollDraftFrom(template, scroll, stat) {
    return template ? {
      name: String(template.名称 || ''), description: String(template.描述 || ''),
      rank: Number(template.$目标位阶 ?? scroll.rankOf(template.序列)),
      baseEffect: String(template.战斗效果?.基础效果 || scroll.BASE[0]),
      extraEffect: String(template.战斗效果?.额外效果 || ''),
      scope: String(template.战斗效果?.范围 || '单体'),
      enhancements: structuredClone(template.增强档位 || {}),
    } : {
      name: '', description: '', rank: scroll.ranksFor(stat)[0] ?? 9,
      baseEffect: scroll.BASE[0], extraEffect: '', scope: '单体', enhancements: {},
    };
  }

  function renderScrollCrafting() {
    const scroll = modules[SCROLL_CRAFTING_KEY];
    const stat = state.current?.data?.stat_data;
    if (!scroll?.gate(stat).unlocked) return;
    const section = element('section', 'crypt-lord-game-shell__scroll');
    section.appendChild(element('h3', '', '窥秘人 · 卷轴制造'));
    const locked = state.scrollBusy || personalBattleState.get(state.current?.data)?.status === 'active';
    const addAction = (label, action, disabled = false) => {
      const control = button(label, 'crypt-lord-game-shell__small-button', action);
      control.disabled = disabled || state.scrollBusy;
      return control;
    };
    const rows = scroll.templates(stat);
    if (state.scrollView === 'form') {
      const draft = state.scrollDraft || scrollDraftFrom(null, scroll, stat);
      state.scrollDraft = draft;
      const form = element('div', 'crypt-lord-game-shell__scroll-form');
      const name = element('input', 'crypt-lord-game-shell__settings-input');
      name.value = draft.name;
      const description = element('textarea', 'crypt-lord-game-shell__settings-input');
      description.rows = 3;
      description.value = draft.description;
      const rank = scrollSelect(scroll.ranksFor(stat).map(value => [value, scroll.rankText(value)]), draft.rank, '目标位阶');
      const base = scrollSelect(scroll.BASE.map(value => [value, value]), draft.baseEffect, '基础效果');
      const scope = scrollSelect([['单体', '单体'], ['全体', '全体']], draft.scope, '范围');
      const extras = scroll.extrasFor(draft.baseEffect, draft.scope);
      if (!extras.includes(draft.extraEffect)) draft.extraEffect = '';
      const extra = scrollSelect([['', '无'], ...extras.map(value => [value, value])], draft.extraEffect, '额外效果');
      form.append(scrollField('唯一名称', name), scrollField('目标位阶', rank),
        scrollField('基础效果', base), scrollField('范围', scope),
        scrollField('额外效果', extra), scrollField('描述', description));
      const tiers = element('div', 'crypt-lord-game-shell__scroll-tiers');
      const enhancements = {
        威力: ['×1.25', '×1.5', '×2'], 恢复量: ['×1.25', '×1.5', '×2'],
        附加效果幅度: ['×1.25', '×1.5', '×2'], 持续回合: ['4回合', '5回合', '6回合'],
        使用灵性消耗: ['75%', '50%', '25%'], 射程: ['4格', '5格', '6格'],
        全体半径: ['3格', '4格', '5格'],
      };
      for (const key of scroll.applicable(draft)) {
        const control = scrollSelect([['0', '不增强'],
          ...enhancements[key].map((value, index) => [index + 1, `${['Ⅰ', 'Ⅱ', 'Ⅲ'][index]} · ${value}`])],
        draft.enhancements[key] || 0, key);
        control.addEventListener('change', () => {
          if (Number(control.value)) draft.enhancements[key] = Number(control.value);
          else delete draft.enhancements[key];
        });
        tiers.appendChild(scrollField(key, control));
      }
      form.appendChild(tiers);
      const capture = () => {
        draft.name = name.value;
        draft.description = description.value;
        draft.rank = Number(rank.value);
        draft.baseEffect = base.value;
        draft.scope = scope.value;
        draft.extraEffect = extra.value;
      };
      [base, scope].forEach(control => control.addEventListener('change', () => {
        capture();
        if (!scroll.extrasFor(draft.baseEffect, draft.scope).includes(draft.extraEffect)) draft.extraEffect = '';
        renderPathwayPlay();
      }));
      const footer = element('div', 'crypt-lord-game-shell__scroll-actions');
      footer.append(addAction('返回样式库', () => { state.scrollView = 'list'; renderPathwayPlay(); }),
        addAction('保存样式', () => { capture(); void commitScroll('save', draft); }, locked));
      section.append(form, footer);
    } else if (state.scrollView === 'craft') {
      const materials = scroll.materials(stat);
      if (!materials.some(row => row.key === state.scrollMaterial)) state.scrollMaterial = materials[0]?.key || '';
      const material = materials.find(row => row.key === state.scrollMaterial);
      const select = scrollSelect(materials.map(row => [row.key,
        `${row.name} · ${row.type} · ${row.item.序列 || '普通'} · ${row.available}${row.item.单位 || '份'}`]),
      state.scrollMaterial, '制造材料');
      const quantity = element('input', 'crypt-lord-game-shell__settings-input');
      quantity.type = 'number';
      quantity.min = '1';
      quantity.max = String(material?.available || 1);
      quantity.step = '1';
      quantity.value = String(Math.min(Number(state.scrollQuantity) || 1, material?.available || 1));
      state.scrollQuantity = Number(quantity.value);
      const capacity = (material?.perUnit || 0) * state.scrollQuantity;
      section.append(scrollField('材料', select), scrollField('消耗数量', quantity));
      section.appendChild(element('p', 'crypt-lord-game-shell__muted',
        material ? `总产量 ${capacity} 张；必须全部分配。材料位阶不得低于卷轴。` : '其他列表没有可用材料。'));
      let allocated = 0;
      const allocation = element('div', 'crypt-lord-game-shell__scroll-list');
      for (const { id, data } of rows) {
        const eligible = scroll.eligible(material, data);
        const row = element('div', 'crypt-lord-game-shell__scroll-row');
        const field = element('input', 'crypt-lord-game-shell__settings-input');
        field.type = 'number'; field.min = '0'; field.step = '1';
        field.value = String(state.scrollAllocation[id] || 0);
        field.disabled = !eligible;
        allocated += Number(state.scrollAllocation[id] || 0);
        field.addEventListener('change', () => {
          state.scrollAllocation[id] = Number(field.value);
          renderPathwayPlay();
        });
        row.append(element('span', '', `${data.名称} · ${data.序列}${eligible ? '' : ' · 材料位阶不足'} · 成功率 ${scroll.chance(stat, data)}%`), field);
        allocation.appendChild(row);
      }
      section.appendChild(allocation);
      section.appendChild(element('p', allocated === capacity && capacity > 0 ?
        'crypt-lord-game-shell__muted' : 'crypt-lord-game-shell__scroll-warning',
      `已分配 ${allocated}/${capacity} 张`));
      select.addEventListener('change', () => {
        state.scrollMaterial = select.value;
        state.scrollQuantity = 1;
        state.scrollAllocation = {};
        renderPathwayPlay();
      });
      quantity.addEventListener('change', () => {
        state.scrollQuantity = Number(quantity.value);
        renderPathwayPlay();
      });
      const footer = element('div', 'crypt-lord-game-shell__scroll-actions');
      footer.append(addAction('返回样式库', () => { state.scrollView = 'list'; renderPathwayPlay(); }),
        addAction('确认制造', () => void commitScroll('craft', {
          materialKey: state.scrollMaterial, quantity: state.scrollQuantity,
          allocation: { ...state.scrollAllocation },
        }), locked || allocated !== capacity || capacity < 1));
      section.appendChild(footer);
    } else {
      const toolbar = element('div', 'crypt-lord-game-shell__scroll-actions');
      toolbar.append(addAction('新建样式', () => {
        state.scrollEditId = '';
        state.scrollDraft = scrollDraftFrom(null, scroll, stat);
        state.scrollView = 'form';
        renderPathwayPlay();
      }, locked), addAction('批量制造', () => {
        state.scrollView = 'craft';
        state.scrollMaterial = '';
        state.scrollQuantity = 1;
        state.scrollAllocation = {};
        renderPathwayPlay();
      }, locked || !rows.length));
      section.appendChild(toolbar);
      if (state.scrollResults?.length) {
        section.appendChild(element('p', 'crypt-lord-game-shell__muted',
          state.scrollResults.map(row => `${row.name} ${row.total}张（强化${row.enhanced}、普通${row.normal}）`).join('；')));
      }
      const list = element('div', 'crypt-lord-game-shell__scroll-list');
      for (const { id, data } of rows) {
        const row = element('div', 'crypt-lord-game-shell__scroll-row');
        const info = element('div', '');
        info.append(element('strong', '', data.名称),
          element('span', 'crypt-lord-game-shell__muted',
            `${data.序列} · ${data.战斗效果?.基础效果 || ''} · ${data.战斗效果?.范围 || '单体'} · v${data.版本}`),
          element('span', 'crypt-lord-game-shell__muted',
            Object.entries(data.增强档位 || {}).map(([key, value]) =>
              `${key}${['', 'Ⅰ', 'Ⅱ', 'Ⅲ'][Number(value)] || ''}`).join(' · ') || '无增强'));
        const tools = element('div', 'crypt-lord-game-shell__scroll-actions');
        tools.append(addAction('编辑', () => {
          state.scrollEditId = id;
          state.scrollDraft = scrollDraftFrom(data, scroll, stat);
          state.scrollView = 'form';
          renderPathwayPlay();
        }, locked), addAction('删除', () => void commitScroll('delete', id), locked));
        row.append(info, tools);
        list.appendChild(row);
      }
      section.appendChild(list);
      if (!rows.length) section.appendChild(element('p', 'crypt-lord-game-shell__muted', '尚无卷轴样式。'));
      if (locked) section.appendChild(element('p', 'crypt-lord-game-shell__muted',
        '战斗进行中只能查看样式。'));
    }
    state.modalBody.appendChild(section);
  }

  async function commitScroll(kind, payload) {
    if (state.scrollBusy) return;
    const token = state.chatToken;
    const messageId = state.current?.message_id;
    if (!Number.isInteger(messageId)) return;
    state.scrollBusy = true;
    try {
      const store = await contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 });
      const original = await store.readMessage(messageId);
      if (original?.role !== 'assistant') throw new Error('目标楼层不是 assistant');
      const scroll = modules[SCROLL_CRAFTING_KEY];
      if (personalBattleState.get(original.data)?.status === 'active') throw new Error('战斗中无法修改卷轴');
      let result;
      if (kind === 'save') result = scroll.save(original.data, payload, state.scrollEditId);
      if (kind === 'delete') {
        const row = scroll.templates(original.data?.stat_data).find(item => item.id === payload);
        if (!row) throw new Error('样式已不存在');
        if (!window.confirm(`删除样式“${row.data.名称}”？已制造的卷轴不会改变。`)) return;
        result = { data: scroll.remove(original.data, payload) };
      }
      if (kind === 'craft') {
        // Confirm a deterministic preview without consuming the actual D100 sequence.
        scroll.craft(original.data, payload.materialKey, payload.quantity, payload.allocation, () => 100);
        const material = scroll.materials(original.data?.stat_data).find(row => row.key === payload.materialKey);
        if (!window.confirm(`消耗 ${payload.quantity}${material.item.单位 || '份'}“${material.name}”，制造 ${payload.quantity * material.perUnit} 张卷轴？强化失败仍会产出普通卷轴。`)) return;
      }
      if (token !== state.chatToken || messageId !== state.current?.message_id) throw new Error('当前聊天或楼层已变化');
      const fresh = await store.readMessage(messageId);
      if (fresh?.role !== 'assistant' || fresh.message !== original.message ||
        JSON.stringify(fresh.data) !== JSON.stringify(original.data)) throw new Error('楼层变量或正文已变化，请重新操作');
      if (kind === 'craft') result = scroll.craft(fresh.data, payload.materialKey, payload.quantity, payload.allocation);
      if (!result) throw new Error('未知卷轴操作');
      if (token !== state.chatToken || messageId !== state.current?.message_id) throw new Error('当前聊天或楼层已变化');
      await store.writeAssistantData(messageId, result.data);
      state.current.data = result.data;
      modules[VARIABLE_WORKBENCH_KEY]?.notifyUpdate?.({
        messageId, beforeData: fresh.data, afterData: result.data, source: 'scroll-crafting',
      });
      renderLeftPanel();
      state.scrollResults = result.results || null;
      state.scrollView = 'list';
      state.scrollEditId = '';
      state.scrollDraft = null;
      notify(kind === 'craft' ? '卷轴制造完成。' : kind === 'delete' ? '样式已删除。' : '样式已保存。', 'success');
    } catch (error) {
      notify(`卷轴操作失败：${error?.message || error}`, 'error');
    } finally {
      state.scrollBusy = false;
      if (!state.disposed && state.chatToken === token &&
        state.modal?.dataset.open === 'true' && state.modalTitle?.textContent === '途径专属玩法') renderPathwayPlay();
    }
  }

  function renderMysteryAnalysis() {
    const mystery = modules[MYSTERY_ANALYSIS_KEY];
    const stat = state.current?.data?.stat_data;
    const access = mystery?.gate(stat);
    if (!mystery || !access?.unlocked) return;
    const section = element('section', 'crypt-lord-game-shell__pathway-item crypt-lord-game-shell__mystery');
    section.appendChild(element('h3', '', '窥秘人 · 神秘解析'));
    if (mystery.completed(stat)) {
      section.appendChild(element('p', '', mystery.stored(stat).描述.replaceAll('<User>', safeText(stat.名称 || stat.姓名 || '玩家'))));
      const values = mystery.bonus(stat);
      section.appendChild(element('p', 'crypt-lord-game-shell__muted',
        Object.entries(values).map(([key, value]) => `${key} ${value}`).join(' · ')));
      section.appendChild(element('p', 'crypt-lord-game-shell__muted',
        access.active ? '位阶已达序列4，解析效果生效。' : '已认证；晋升序列4后生效。'));
    } else if (!access.active) {
      const choices = mystery.items(stat);
      section.appendChild(element('p', 'crypt-lord-game-shell__muted', '从其他物品或消耗品选择已完成解析的神话生物血液。认证不消耗物品。'));
      const select = element('select');
      select.setAttribute('aria-label', '待认证物品');
      choices.forEach((row, index) => {
        const option = element('option', '', `${row.name} · ${row.category} · ${row.item.数量}${row.item.单位 || '件'}`);
        option.value = String(index);
        select.appendChild(option);
      });
      section.appendChild(select);
      const action = button(state.mysteryBusy ? '认证中…' : '认证所选物品', 'crypt-lord-game-shell__small-button', () => {
        void certifyMystery('item', choices[Number(select.value)]);
      });
      action.disabled = state.mysteryBusy || !choices.length;
      section.appendChild(action);
    } else {
      section.appendChild(element('p', 'crypt-lord-game-shell__muted',
        '晋升序列4后，只能通过本周目经历补认证晋升前已完成的解析。'));
      if (state.mysterySummaries === null) {
        const load = button('读取本周目经历', 'crypt-lord-game-shell__small-button', () => { void loadMysterySummaries(); });
        load.disabled = state.mysteryBusy;
        section.appendChild(load);
      } else {
        const select = element('select');
        select.setAttribute('aria-label', '指定本周目经历');
        state.mysterySummaries.forEach((row, index) => {
          const option = element('option', '', row.title);
          option.value = String(index);
          select.appendChild(option);
        });
        section.appendChild(select);
        if (!state.mysterySummaries.length) {
          section.appendChild(element('p', 'crypt-lord-game-shell__muted', '没有可用的本周目经历条目。'));
        }
        const action = button(state.mysteryBusy ? '认证中…' : '补认证所选经历', 'crypt-lord-game-shell__small-button', () => {
          void certifyMystery('summary', state.mysterySummaries[Number(select.value)]);
        });
        action.disabled = state.mysteryBusy || !state.mysterySummaries.length;
        section.appendChild(action);
      }
    }
    if (state.mysteryResult) section.appendChild(element('p', 'crypt-lord-game-shell__muted', state.mysteryResult));
    state.modalBody.appendChild(section);
  }

  async function loadMysterySummaries() {
    const token = state.chatToken;
    const messageId = state.current?.message_id;
    try {
      const rows = await modules[MYSTERY_ANALYSIS_KEY].loadSummaries();
      if (token !== state.chatToken || messageId !== state.current?.message_id) return;
      state.mysterySummaries = rows;
      if (state.modal?.dataset.open === 'true' && state.modalTitle?.textContent === '途径专属玩法') renderPathwayPlay();
    } catch (error) {
      notify(`读取本周目经历失败：${error?.message || error}`, 'error');
    }
  }

  async function certifyMystery(mode, selection) {
    if (state.mysteryBusy || !selection) return;
    const token = state.chatToken;
    const messageId = state.current?.message_id;
    if (!Number.isInteger(messageId)) return;
    const mystery = modules[MYSTERY_ANALYSIS_KEY];
    state.mysteryBusy = true;
    state.mysteryResult = '';
    try {
      const store = await contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 });
      const original = await store.readMessage(messageId);
      if (original?.role !== 'assistant') throw new Error('目标楼层不是 assistant');
      const baseline = JSON.stringify(original.data);
      const rows = await afterNative.listAssistantMessages();
      const evidence = modules['cryptLord.domainFoundation']?.evidence(rows, messageId) || '';
      const verdict = await mystery.verify({
        mode, stat: original.data?.stat_data, item: mode === 'item' ? selection : null,
        summary: mode === 'summary' ? selection : null, evidence,
      });
      if (!verdict.ok) {
        if (state.chatToken === token && state.current?.message_id === messageId) {
          state.mysteryResult = `认证未通过：${verdict.reason}`;
        }
        return;
      }
      if (state.chatToken !== token || state.current?.message_id !== messageId) throw new Error('聊天或楼层已变化');
      const current = await store.readMessage(messageId);
      if (current?.role !== 'assistant' || JSON.stringify(current.data) !== baseline ||
        current.message !== original.message) throw new Error('楼层正文或变量已变化，请重新认证');
      const freshEvidence = modules['cryptLord.domainFoundation']?.evidence(
        await afterNative.listAssistantMessages(), messageId) || '';
      if (freshEvidence !== evidence) throw new Error('认证剧情证据已变化，请重新认证');
      if (mode === 'summary') {
        const currentSummaries = await mystery.loadSummaries();
        if (JSON.stringify(currentSummaries) !== JSON.stringify(state.mysterySummaries) ||
          !currentSummaries.some(row => row.text === selection.text)) throw new Error('本周目经历已变化，请重新选择');
      } else if (!mystery.items(current.data?.stat_data).some(row =>
        row.category === selection.category && row.key === selection.key &&
        JSON.stringify(row.item) === JSON.stringify(selection.item))) {
        throw new Error('物品已变化，请重新选择');
      }
      if (state.chatToken !== token || state.current?.message_id !== messageId) throw new Error('聊天或楼层已变化');
      const next = mystery.apply(current.data, verdict, mode);
      await store.writeAssistantData(messageId, next);
      if (state.chatToken === token && state.current?.message_id === messageId) {
        state.current.data = next;
        renderLeftPanel();
      }
      modules[VARIABLE_WORKBENCH_KEY]?.notifyUpdate?.({
        messageId, beforeData: current.data, afterData: next, source: 'mystery-analysis',
      });
      state.mysteryResult = verdict.equalSplit ? '认证成功；能力体系不明，六维等分。' : '认证成功。';
      notify(state.mysteryResult, 'success');
    } catch (error) {
      if (state.chatToken === token) {
        state.mysteryResult = `认证失败：${error?.message || error}`;
        notify(state.mysteryResult, 'error');
      }
    } finally {
      state.mysteryBusy = false;
      if (!state.disposed && state.chatToken === token &&
        state.modal?.dataset.open === 'true' && state.modalTitle?.textContent === '途径专属玩法') renderPathwayPlay();
    }
  }

  function renderDetectiveCases() {
    if (!openModal("事件真相 · 侦探调查")) return;
    const detectiveState = root.__stage1Modules?.["cryptLord.detectiveState"] || window.cryptLord?.detectiveState;
    if (!detectiveState) {
      state.modalBody.appendChild(element("div", "crypt-lord-game-shell__empty", "侦探系统尚未就绪。"));
      return;
    }
    const cases = detectiveState.getCases(state.current?.data);

    const toolbar = element("div", "crypt-lord-game-shell__detective-toolbar");
    toolbar.appendChild(button("+ 登记新调查委托", "crypt-lord-game-shell__dialog-button", () => {
      const hostWindow = afterNative.getHost()?.window || window;
      const title = hostWindow.prompt?.("请输入新案件委托名称：", "红烟囱房屋调查委托");
      if (!title) return;
      const commissioner = hostWindow.prompt?.("请输入委托人姓名/身份：", "廷根市警察局") || "匿名委托人";
      const location = hostWindow.prompt?.("请输入案发或调查地点：", "铁十字街") || "廷根市";
      const result = detectiveState.createCase(state.current?.data, { title, commissioner, location });
      state.current.data = result.mvuState;
      notify(`已建立案件档案「${title}」`, "success");
      renderDetectiveCases();
    }));
    state.modalBody.appendChild(toolbar);

    if (!cases.length) {
      state.modalBody.appendChild(element("div", "crypt-lord-game-shell__empty", "暂无记录的调查案件，可点击上方按钮登记新委托。"));
      return;
    }

    const list = element("div", "crypt-lord-game-shell__detective-list");
    cases.forEach(c => {
      const card = element("div", "crypt-lord-game-shell__detective-card");
      const head = element("div", "crypt-lord-game-shell__detective-card-head");
      head.append(
        element("strong", "", `【${c.status}】${c.title}`),
        element("span", "crypt-lord-game-shell__muted", `委托人：${c.commissioner} · 地点：${c.location}`)
      );
      card.appendChild(head);

      const cluesDiv = element("div", "crypt-lord-game-shell__detective-clues");
      cluesDiv.appendChild(element("h4", "crypt-lord-game-shell__section-title", `掌握线索 (${(c.clues || []).length})`));
      if (!c.clues || !c.clues.length) {
        cluesDiv.appendChild(element("p", "crypt-lord-game-shell__muted", "尚未发现关键线索"));
      } else {
        const clueGrid = element("div", "crypt-lord-game-shell__detective-clue-grid");
        c.clues.forEach(clue => {
          const row = element("div", "crypt-lord-game-shell__detective-clue-item");
          row.append(
            element("strong", "", `${clue.verified ? "✓ " : "？ "}${clue.name}`),
            element("span", "", clue.detail || "未记录细节")
          );
          clueGrid.appendChild(row);
        });
        cluesDiv.appendChild(clueGrid);
      }
      card.appendChild(cluesDiv);

      const btnRow = element("div", "crypt-lord-game-shell__detective-actions");
      btnRow.appendChild(button("+ 补充线索", "crypt-lord-game-shell__small-button", () => {
        const hostWindow = afterNative.getHost()?.window || window;
        const name = hostWindow.prompt?.("请输入线索名称：", "沾染非凡气息的纸片");
        if (!name) return;
        const detail = hostWindow.prompt?.("请输入线索详情：", "留有少量灵性残留") || "";
        const res = detectiveState.addClue(state.current?.data, c.id, { name, detail, verified: true });
        state.current.data = res.mvuState;
        notify(`已添加线索「${name}」`, "success");
        renderDetectiveCases();
      }));
      btnRow.appendChild(button("+ 添加嫌疑人", "crypt-lord-game-shell__small-button", () => {
        const hostWindow = afterNative.getHost()?.window || window;
        const name = hostWindow.prompt?.("请输入嫌疑人姓名：", "可疑的黑袍人");
        if (!name) return;
        const motive = hostWindow.prompt?.("动机推测：", "企图盗取非凡材料") || "";
        const res = detectiveState.addSuspect(state.current?.data, c.id, { name, motive });
        state.current.data = res.mvuState;
        notify(`已添加嫌疑人「${name}」`, "success");
        renderDetectiveCases();
      }));
      btnRow.appendChild(button("生成调查简报填入输入框", "crypt-lord-game-shell__small-button", () => {
        const report = detectiveState.buildCaseReport(c);
        void fillAction(report);
        notify("已将案件调查报告填入酒馆输入框", "success");
      }));
      card.appendChild(btnRow);
      list.appendChild(card);
    });
    state.modalBody.appendChild(list);
  }

  function renderInventory() {
    if (!openModal('物品栏')) return;
    const groups = inventoryGroups();
    if (!groups.length) {
      state.modalBody.appendChild(element('div', 'crypt-lord-game-shell__empty', '当前真实 assistant 楼层尚未提供物品、背包或装备数据'));
      return;
    }
    const selection = [];
    const toolbar = element('div', 'crypt-lord-game-shell__inventory-toolbar');
    const canDelete = groups.some(group => group.entries.some(item =>
      item.source && inventoryState.lists.includes(item.source.listKey)));
    if (!canDelete) state.inventoryBatch = false;
    const toggle = button(state.inventoryBatch ? '退出批量' : '批量删除', 'crypt-lord-game-shell__inventory-action', () => {
      state.inventoryBatch = !state.inventoryBatch;
      renderInventory();
    });
    toggle.disabled = state.inventoryBusy || !canDelete;
    if (!canDelete) toggle.title = '当前楼层没有可批量删除的物品列表';
    toolbar.appendChild(toggle);
    let updateSelection = () => {};
    if (state.inventoryBatch) {
      const selectAll = element('input');
      selectAll.type = 'checkbox';
      const selectAllLabel = element('label', 'crypt-lord-game-shell__inventory-select-all');
      selectAllLabel.append(selectAll, element('span', '', '全选'));
      const count = element('span', 'crypt-lord-game-shell__inventory-selected-count', '已选 0 项');
      const remove = button('删除选中', 'crypt-lord-game-shell__inventory-action', () => {
        const selected = [];
        for (const { item, checkbox, quantityInput } of selection) {
          if (!checkbox.checked) continue;
          const amount = quantityInput ? Number(quantityInput.value) : null;
          if (quantityInput && (!Number.isFinite(amount) || amount <= 0 || amount > Number(quantityInput.max))) {
            notify(`“${item.name}”的删除数量无效。`, 'warning');
            return;
          }
          selected.push({
            ...item.source,
            name: String(item.details?.名称 ?? item.details?.name ?? item.name),
            id: item.details?.id,
            amount,
            expectedQuantity: quantityInput ? Number(quantityInput.max) : undefined,
          });
        }
        if (selected.length) void batchDeleteInventory(selected);
      });
      remove.disabled = true;
      updateSelection = () => {
        const selected = selection.filter(row => row.checkbox.checked).length;
        count.textContent = `已选 ${selected} 项`;
        remove.disabled = state.inventoryBusy || selected === 0;
        selectAll.checked = selection.length > 0 && selected === selection.length;
        selectAll.indeterminate = selected > 0 && selected < selection.length;
      };
      selectAll.addEventListener('change', () => {
        selection.forEach(row => { row.checkbox.checked = selectAll.checked; });
        updateSelection();
      });
      toolbar.append(selectAllLabel, count, remove);
    }
    state.modalBody.appendChild(toolbar);
    groups.forEach(group => {
      const section = element('section', 'crypt-lord-game-shell__inventory-group');
      const heading = element('h3', 'crypt-lord-game-shell__section-title', group.label);
      heading.appendChild(element('span', 'crypt-lord-game-shell__inventory-count', `${group.entries.length}`));
      const grid = element('div', 'crypt-lord-game-shell__inventory-grid');
      group.entries.slice(0, 120).forEach(item => {
        const card = element('article', 'crypt-lord-game-shell__inventory-card');
        if (state.inventoryBatch && item.source && inventoryState.lists.includes(item.source.listKey)) {
          const controls = element('div', 'crypt-lord-game-shell__inventory-batch-controls');
          const label = element('label', 'crypt-lord-game-shell__inventory-select');
          const checkbox = element('input');
          checkbox.type = 'checkbox';
          label.append(checkbox, element('span', '', '选择'));
          checkbox.addEventListener('change', updateSelection);
          controls.appendChild(label);
          const rawQuantity = item.details?.数量 ?? item.details?.quantity;
          let quantityInput = null;
          if (rawQuantity !== undefined && rawQuantity !== null) {
            quantityInput = element('input', 'crypt-lord-game-shell__inventory-delete-quantity');
            quantityInput.type = 'number';
            quantityInput.min = '0.1';
            quantityInput.max = String(rawQuantity);
            quantityInput.step = '0.1';
            quantityInput.value = String(rawQuantity);
            quantityInput.title = '删除数量';
            quantityInput.setAttribute('aria-label', `删除 ${item.name} 的数量`);
            controls.appendChild(quantityInput);
          }
          selection.push({ item, checkbox, quantityInput });
          card.appendChild(controls);
        }
        const title = element('strong', 'crypt-lord-game-shell__inventory-name', item.name);
        const meta = element('div', 'crypt-lord-game-shell__inventory-meta');
        meta.appendChild(element('span', 'crypt-lord-game-shell__inventory-tag', item.category));
        const tier = item.details?.序列 ?? item.details?.等阶 ?? item.details?.品阶 ?? item.details?.tier;
        if (tier !== undefined && tier !== '') meta.appendChild(element('span', 'crypt-lord-game-shell__inventory-tag', /^\d/.test(String(tier)) ? `序列${tier}` : safeText(tier)));
        const trait = item.details?.特质 ?? item.details?.trait ?? item.details?.特性;
        if (trait && !['空', '无', 'none'].includes(String(trait).trim().toLowerCase())) meta.appendChild(element('span', 'crypt-lord-game-shell__inventory-tag', safeText(trait)));
        const equipped = item.details?.isEquipped === true || item.details?.已装备 === true || item.details?.装备中 === true || item.details?.equipped === true;
        if (equipped) meta.appendChild(element('span', 'crypt-lord-game-shell__inventory-tag', '已装备'));
        if (item.quantity !== null && item.quantity !== undefined && item.quantity !== '') meta.appendChild(element('span', 'crypt-lord-game-shell__inventory-quantity', `x${safeText(item.quantity)}`));
        card.append(title, meta);
        if (item.description) card.appendChild(element('p', 'crypt-lord-game-shell__inventory-description', item.description));
        if (record(item.details)) {
          const detail = element('dl', 'crypt-lord-game-shell__inventory-details');
          const omitted = new Set(['名称', '名字', '物品名', 'name', '数量', '数目', 'count', 'quantity', '描述', '说明', '简介', '效果', 'description', '$meta']);
          const fields = Object.entries(item.details).filter(([key]) => !omitted.has(key));
          const priority = ['活力', '灵性', '理智', '人性', '敏捷', '运气', '类型', '途径', '代价'];
          fields.sort(([a], [b]) => (priority.indexOf(a) < 0 ? 99 : priority.indexOf(a)) - (priority.indexOf(b) < 0 ? 99 : priority.indexOf(b)));
          fields.slice(0, 16)
            .forEach(([key, value]) => detail.append(element('dt', '', key), element('dd', '', displayValue(value))));
          if (detail.childElementCount) card.appendChild(detail);
        }
        if (!state.inventoryBatch && item.source && EQUIPMENT_LISTS.includes(item.source.listKey)) {
          const action = button(equipped ? '卸下' : '装备', 'crypt-lord-game-shell__inventory-action', () => { void setEquipped(item, !equipped); });
          action.disabled = state.inventoryBusy;
          card.appendChild(action);
        }
        if (!state.inventoryBatch && item.source && inventoryState.giftLists.includes(item.source.listKey) &&
          String(item.details?.名称 ?? item.details?.name ?? '').trim()) {
          const action = button('赠予 NPC', 'crypt-lord-game-shell__inventory-action', () => renderGiftPicker(item));
          action.disabled = state.inventoryBusy || Boolean(item.details?.$强化模块安装?.模块ID);
          if (action.disabled && !state.inventoryBusy) action.title = '请先卸下强化模块';
          card.appendChild(action);
        }
        grid.appendChild(card);
      });
      section.append(heading, grid);
      state.modalBody.appendChild(section);
    });
    updateSelection();
  }

  async function changeAbility(operation) {
    if (state.abilitiesBusy || !Number.isInteger(state.current?.message_id)) return;
    if (operation.type === 'remove' && !window.confirm?.(`确定删除能力“${operation.name}”？`)) return;
    state.abilitiesBusy = true;
    try {
      const store = await contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 });
      const messageId = state.current.message_id;
      const message = await store.readMessage(messageId);
      if (message?.role !== 'assistant') throw new Error('目标楼层不再是 assistant。');
      const before = message.data || {};
      const next = abilityState.change(before, operation);
      await store.writeAssistantData(messageId, next);
      if (state.current?.message_id === messageId) state.current.data = next;
      root.__stage1Modules?.[VARIABLE_WORKBENCH_KEY]?.notifyUpdate?.({
        messageId, beforeData: before, afterData: next, source: 'sequence-abilities',
      });
      notify(operation.type === 'add' ? '能力已添加。' : '能力已删除。', 'success');
      if (state.modal?.dataset.open === 'true' && state.modalTitle?.textContent === '序列能力') renderAbilities();
    } catch (error) {
      notify(`修改能力失败：${error?.message || error}`, 'error');
    } finally {
      state.abilitiesBusy = false;
    }
  }

  function abilityLocked() {
    try {
      const saved = (afterNative.getHost()?.window || window).localStorage?.getItem(ABILITY_LOCK_KEY);
      if (saved !== null && saved !== undefined) return saved === 'true';
    } catch { /* Optional local preference. */ }
    return statForCurrent().序列能力锁定 === true;
  }

  async function synchronizeAbilities() {
    if (state.abilitiesBusy || !Number.isInteger(state.current?.message_id)) return;
    state.abilitiesBusy = true;
    try {
      const pool = await abilityState.loadPool();
      const store = await contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 });
      const messageId = state.current.message_id;
      const message = await store.readMessage(messageId);
      if (message?.role !== 'assistant') throw new Error('目标楼层不再是 assistant。');
      const before = message.data || {};
      const result = abilityState.synchronize(before, pool, abilityLocked());
      const preProjection = JSON.stringify(result.data);
      modules[IMAGINATION_KEY]?.sync(result.data, pool, abilityLocked());
      if (result.added || result.patched || JSON.stringify(result.data) !== preProjection) {
        await store.writeAssistantData(messageId, result.data);
        if (state.current?.message_id === messageId) state.current.data = result.data;
        root.__stage1Modules?.[VARIABLE_WORKBENCH_KEY]?.notifyUpdate?.({
          messageId, beforeData: before, afterData: result.data, source: 'sequence-abilities-sync',
        });
      }
      notify(`世界书同步完成：新增 ${result.added} 项，补齐 ${result.patched} 个战斗字段。`, 'success');
      if (state.modal?.dataset.open === 'true' && state.modalTitle?.textContent === '序列能力') renderAbilities();
    } catch (error) {
      notify(`同步序列能力失败：${error?.message || error}`, 'error');
    } finally {
      state.abilitiesBusy = false;
    }
  }

  function renderAbilities() {
    if (!openModal('序列能力')) return;
    const stat = statForCurrent();
    const groupList = abilityState.groups(state.current?.data);
    const sequence = String(stat.当前序列 || '').trim();
    if (sequence && !sequence.includes('普通人')) {
      const settings = element('div', 'crypt-lord-game-shell__ability-settings');
      const lockLabel = element('label', 'crypt-lord-game-shell__ability-lock');
      const lock = element('input');
      lock.type = 'checkbox';
      lock.checked = abilityLocked();
      lock.addEventListener('change', () => {
        try { (afterNative.getHost()?.window || window).localStorage?.setItem(ABILITY_LOCK_KEY, String(lock.checked)); }
        catch { notify('无法保存本地能力锁定设置。', 'error'); lock.checked = !lock.checked; return; }
        notify(lock.checked ? '仅同步当前序列能力。' : '同步当前及低序列能力。', 'info');
      });
      lockLabel.append(lock, element('span', '', '仅同步当前序列能力'));
      const synchronize = button('从世界书同步能力', 'crypt-lord-game-shell__inventory-action', () => { void synchronizeAbilities(); });
      synchronize.title = '读取源堡、历史孔隙及角色绑定世界书的能力，不覆盖已修改能力';
      settings.append(lockLabel, synchronize);
      state.modalBody.appendChild(settings);
      const form = element('form', 'crypt-lord-game-shell__ability-form');
      const name = element('input', 'crypt-lord-game-shell__settings-input');
      name.placeholder = '能力名称';
      name.maxLength = 100;
      name.required = true;
      const description = element('textarea', 'crypt-lord-game-shell__settings-input');
      description.placeholder = '能力描述';
      description.rows = 3;
      const type = element('select', 'crypt-lord-game-shell__settings-input');
      ['非凡能力', '被动特性', '神之权柄', '旧日象征'].forEach(value => {
        const option = element('option', '', value);
        option.value = value;
        type.appendChild(option);
      });
      const save = element('button', 'crypt-lord-game-shell__inventory-action', '添加能力');
      save.type = 'submit';
      form.append(element('strong', '', `手动添加能力（${sequence}）`), name, description, type, save);
      form.addEventListener('submit', event => {
        event.preventDefault();
        void changeAbility({ type: 'add', name: name.value, description: description.value, abilityType: type.value });
      });
      state.modalBody.appendChild(form);
    }
    if (!groupList.length) {
      state.modalBody.appendChild(element('div', 'crypt-lord-game-shell__empty', '尚未获得任何序列能力。'));
      return;
    }
    groupList.forEach(([group, abilities]) => {
      if (!abilities.length) return;
      const section = element('details', 'crypt-lord-game-shell__ability-group');
      section.open = true;
      section.appendChild(element('summary', '', `${group} · ${abilities.length}`));
      abilities.forEach((ability, index) => {
        const row = element('div', 'crypt-lord-game-shell__ability-row');
        const info = element('div', 'crypt-lord-game-shell__ability-info');
        info.append(
          element('strong', '', safeText(ability?.名称, '未命名能力')),
          element('span', '', safeText(ability?.类型, '非凡能力')),
          element('p', '', safeText(ability?.描述, '无详细描述。')),
        );
        row.appendChild(info);
        if (group === '#秘术强化' || group === '#神秘再现') {
          row.appendChild(element('span', 'crypt-lord-game-shell__ability-managed', `请在${group.slice(1)}中修改`));
        } else {
          const remove = button('删除', 'crypt-lord-game-shell__inventory-action', () => {
            void changeAbility({ type: 'remove', group, index, name: String(ability?.名称 || '') });
          });
          remove.title = `删除 ${safeText(ability?.名称, '能力')}`;
          row.appendChild(remove);
        }
        section.appendChild(row);
      });
      state.modalBody.appendChild(section);
    });
  }

  function closeModal() {
    cancelBattleAuto();
    if (state.modal?.dataset.audioActive === 'true') {
      modules[GAME_AUDIO_KEY]?.leave();
      delete state.modal.dataset.audioActive;
    }
    state.modal?.setAttribute('data-open', 'false');
  }

  function openModal(title) {
    if (!state.modal) return false;
    if (state.modal.dataset.audioActive === 'true' && title !== '战斗系统') {
      modules[GAME_AUDIO_KEY]?.leave();
      delete state.modal.dataset.audioActive;
    }
    state.modalTitle.textContent = title;
    clear(state.modalBody);
    state.modal.setAttribute('data-open', 'true');
    return true;
  }

  async function fillAction(action) {
    const input = await contract.waitGlobalInitialized(INPUT_KEY, { timeoutMs: 10000 });
    input.setInputText(action, 'sillytavern-native');
    closeModal();
  }

  function commandLayout() {
    const view = afterNative.getHost()?.window || window;
    const width = Math.min(530, Math.max(320, view.innerWidth - 20));
    let saved;
    try { saved = JSON.parse(view.localStorage?.getItem(COMMAND_POSITION_KEY) || 'null'); } catch { /* Optional storage. */ }
    return {
      panel: {
        x: Number.isFinite(saved?.panel?.x) ? saved.panel.x : Math.max(8, view.innerWidth - width - 76),
        y: Number.isFinite(saved?.panel?.y) ? saved.panel.y : 95,
        width: Number.isFinite(saved?.panel?.width) ? saved.panel.width : width,
        height: Number.isFinite(saved?.panel?.height) ? saved.panel.height : 540,
      },
      ball: {
        x: Number.isFinite(saved?.ball?.x) ? saved.ball.x : Math.max(8, view.innerWidth - 68),
        y: Number.isFinite(saved?.ball?.y) ? saved.ball.y : Math.max(8, view.innerHeight - 207),
      },
    };
  }

  function clampCommandLayout() {
    const view = afterNative.getHost()?.window || window;
    const panel = state.commandPanel;
    const ball = state.commandBall;
    if (!panel || !ball) return;
    const width = Math.min(Math.max(320, parseFloat(panel.style.width) || 530), Math.max(160, view.innerWidth - 16));
    const height = Math.min(Math.max(280, parseFloat(panel.style.height) || 540), Math.max(120, view.innerHeight - 16));
    panel.style.width = `${width}px`;
    panel.style.height = `${height}px`;
    panel.style.left = `${Math.max(8, Math.min(parseFloat(panel.style.left) || 8, view.innerWidth - width - 8))}px`;
    panel.style.top = `${Math.max(8, Math.min(parseFloat(panel.style.top) || 8, view.innerHeight - height - 8))}px`;
    ball.style.left = `${Math.max(8, Math.min(parseFloat(ball.style.left) || 8, view.innerWidth - 56))}px`;
    ball.style.top = `${Math.max(8, Math.min(parseFloat(ball.style.top) || 8, view.innerHeight - 56))}px`;
  }

  function saveCommandLayout() {
    if (!state.commandPanel || !state.commandBall) return;
    const panel = state.commandPanel;
    const ball = state.commandBall;
    try {
      (afterNative.getHost()?.window || window).localStorage?.setItem(COMMAND_POSITION_KEY, JSON.stringify({
        panel: { x: parseFloat(panel.style.left), y: parseFloat(panel.style.top), width: parseFloat(panel.style.width), height: parseFloat(panel.style.height) },
        ball: { x: parseFloat(ball.style.left), y: parseFloat(ball.style.top) },
      }));
    } catch { /* Optional storage. */ }
  }

  function closeCommandPanel() {
    state.commandLoadToken += 1;
    if (state.commandPanel) {
      state.commandPanel.dataset.open = 'false';
      state.commandPanel.removeAttribute('aria-busy');
    }
    saveCommandLayout();
  }

  function bindCommandDrag(header, grip) {
    const view = afterNative.getHost()?.window || window;
    let moving = null;
    let resizing = null;
    let ballDrag = null;
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      moving = { x: event.clientX, y: event.clientY, left: parseFloat(state.commandPanel.style.left), top: parseFloat(state.commandPanel.style.top) };
      header.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    header.addEventListener('pointermove', event => {
      if (!moving) return;
      state.commandPanel.style.left = `${moving.left + event.clientX - moving.x}px`;
      state.commandPanel.style.top = `${moving.top + event.clientY - moving.y}px`;
      clampCommandLayout();
    });
    header.addEventListener('pointerup', () => { moving = null; saveCommandLayout(); });
    header.addEventListener('pointercancel', () => { moving = null; });
    grip.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      resizing = { x: event.clientX, y: event.clientY, width: state.commandPanel.offsetWidth, height: state.commandPanel.offsetHeight };
      grip.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    grip.addEventListener('pointermove', event => {
      if (!resizing) return;
      state.commandPanel.style.width = `${resizing.width + event.clientX - resizing.x}px`;
      state.commandPanel.style.height = `${resizing.height + event.clientY - resizing.y}px`;
      clampCommandLayout();
    });
    grip.addEventListener('pointerup', () => { resizing = null; saveCommandLayout(); });
    grip.addEventListener('pointercancel', () => { resizing = null; });
    state.commandBall.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      ballDrag = { x: event.clientX, y: event.clientY, left: parseFloat(state.commandBall.style.left), top: parseFloat(state.commandBall.style.top), moved: false };
      state.commandBall.setPointerCapture?.(event.pointerId);
    });
    state.commandBall.addEventListener('pointermove', event => {
      if (!ballDrag) return;
      const dx = event.clientX - ballDrag.x;
      const dy = event.clientY - ballDrag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) ballDrag.moved = true;
      if (!ballDrag.moved) return;
      state.commandBall.style.left = `${ballDrag.left + dx}px`;
      state.commandBall.style.top = `${ballDrag.top + dy}px`;
      clampCommandLayout();
    });
    state.commandBall.addEventListener('pointerup', () => {
      saveCommandLayout();
      setTimeout(() => { ballDrag = null; }, 0);
    });
    state.commandBall.addEventListener('click', () => {
      if (ballDrag?.moved) return;
      if (state.commandPanel.dataset.open === 'true') closeCommandPanel();
      else void showQuickShortcuts();
    });
    const onResize = () => { clampCommandLayout(); saveCommandLayout(); };
    view.addEventListener('resize', onResize);
    state.cleanups.push(() => view.removeEventListener('resize', onResize));
  }

  async function showQuickShortcuts() {
    if (!state.commandPanel || !state.commandBody) return;
    state.commandPanel.dataset.open = 'true';
    const token = ++state.commandLoadToken;
    const body = state.commandBody;
    clear(body);
    body.appendChild(element('div', 'crypt-lord-game-shell__empty', '正在读取快捷指令…'));
    try {
      const shortcuts = await contract.waitGlobalInitialized(QUICK_SHORTCUTS_KEY, { timeoutMs: 10000 });
      let { commands, state: shortcutState, revisions } = await shortcuts.load();
      if (token !== state.commandLoadToken || state.commandPanel.dataset.open !== 'true') return;
      let busy = false;
      const persist = async (nextCommands, nextState) => {
        if (busy) return;
        busy = true;
        state.commandPanel.setAttribute('aria-busy', 'true');
        try {
          if (nextCommands) await shortcuts.saveCommands(nextCommands, revisions.commands);
          if (nextState) await shortcuts.saveState(nextState, revisions.state);
          ({ commands, state: shortcutState, revisions } = await shortcuts.load());
          render();
        } catch (error) {
          notify(`快捷指令保存失败：${error?.message || error}`, 'error');
          // A partial write may have succeeded. Read the actual worldbook before allowing another edit.
          try { ({ commands, state: shortcutState, revisions } = await shortcuts.load()); render(); }
          catch { closeCommandPanel(); }
        } finally {
          busy = false;
          if (token === state.commandLoadToken) state.commandPanel?.removeAttribute('aria-busy');
        }
      };
      const render = () => {
        if (token !== state.commandLoadToken || state.commandPanel.dataset.open !== 'true') return;
        clear(body);
        const toolbar = element('div', 'crypt-lord-game-shell__shortcut-toolbar');
        const keep = element('label', 'crypt-lord-game-shell__shortcut-keep');
        const checkbox = element('input');
        checkbox.type = 'checkbox';
        checkbox.checked = shortcutState.isKeepShortcutsEnabled;
        checkbox.addEventListener('change', () => {
          void persist(null, { ...shortcutState, isKeepShortcutsEnabled: checkbox.checked });
        });
        keep.append(checkbox, element('span', '', '保持选中'));
        toolbar.append(keep, button('添加指令', 'crypt-lord-game-shell__dialog-button', () => {
          void persist([...commands, '新增快捷指令'], null);
        }));
        body.appendChild(toolbar);
        if (!commands.length) {
          body.appendChild(element('div', 'crypt-lord-game-shell__empty', '当前没有快捷指令'));
          return;
        }
        const list = element('div', 'crypt-lord-game-shell__shortcut-list');
        commands.forEach((command, index) => {
          const row = element('div', 'crypt-lord-game-shell__shortcut-row');
          row.dataset.selected = String(shortcutState.pendingSupplementary.includes(command));
          const input = element('textarea', 'crypt-lord-game-shell__shortcut-input');
          input.value = command;
          input.rows = 2;
          input.setAttribute('aria-label', `快捷指令 ${index + 1}`);
          input.addEventListener('change', () => {
            const edited = input.value.trim();
            if (!edited || edited === command) { input.value = command; return; }
            const next = [...commands];
            next[index] = edited;
            const selected = shortcutState.pendingSupplementary.map(item => item === command ? edited : item);
            void persist(next, { ...shortcutState, pendingSupplementary: selected });
          });
          const actions = element('div', 'crypt-lord-game-shell__shortcut-actions');
          const immediate = button('✓', 'crypt-lord-game-shell__dialog-button', () => {
            const text = input.value.trim();
            if (!text) return;
            void contract.waitGlobalInitialized(INPUT_KEY, { timeoutMs: 10000 })
              .then(inputAdapter => { inputAdapter.setInputText(text, 'sillytavern-native'); closeCommandPanel(); })
              .catch(error => notify(`无法填入指令：${error?.message || error}`, 'error'));
          });
          immediate.title = '填入原生输入框';
          const supplementary = button(shortcutState.pendingSupplementary.includes(command) ? '●' : '○', 'crypt-lord-game-shell__dialog-button', () => {
            const selected = shortcutState.pendingSupplementary.includes(command)
              ? shortcutState.pendingSupplementary.filter(item => item !== command)
              : [...shortcutState.pendingSupplementary, command];
            void persist(null, { ...shortcutState, pendingSupplementary: selected });
          });
          supplementary.title = '设为补充指令';
          supplementary.setAttribute('aria-pressed', row.dataset.selected);
          const remove = button('×', 'crypt-lord-game-shell__dialog-button', () => {
            void persist(commands.filter((_, position) => position !== index), {
              ...shortcutState, pendingSupplementary: shortcutState.pendingSupplementary.filter(item => item !== command),
            });
          });
          remove.title = '删除此指令';
          actions.append(immediate, supplementary, remove);
          row.append(input, actions);
          list.appendChild(row);
        });
        body.appendChild(list);
      };
      render();
    } catch (error) {
      if (token === state.commandLoadToken && state.commandPanel.dataset.open === 'true') {
        clear(body);
        body.appendChild(element('div', 'crypt-lord-game-shell__empty', `快捷指令读取失败：${error?.message || error}`));
      }
    }
  }

  async function openEditor() {
    if (!Number.isInteger(state.current?.message_id)) return;
    const editor = await contract.waitGlobalInitialized(EDITOR_KEY, { timeoutMs: 10000 });
    await editor.open(state.current.message_id);
  }

  async function openVariableEditor() {
    if (!Number.isInteger(state.current?.message_id)) {
      notify('请先选择或生成一条真实 assistant 楼层。', 'warning');
      return;
    }
    const workbench = await contract.waitGlobalInitialized(VARIABLE_WORKBENCH_KEY, { timeoutMs: 10000 });
    await workbench.open(state.current.message_id);
  }

  async function openOrganizationConsole(kind) {
    if (!Number.isInteger(state.current?.message_id)) {
      notify('请先选择或生成一条真实 assistant 楼层。', 'warning');
      return;
    }
    const consoleUi = await contract.waitGlobalInitialized(ORGANIZATION_CONSOLE_KEY, { timeoutMs: 10000 });
    await consoleUi.open(kind, state.current.message_id);
  }

  async function openDomainConsole() {
    if (!Number.isInteger(state.current?.message_id)) {
      notify('请先选择或生成一条真实 assistant 楼层。', 'warning');
      return;
    }
    const consoleUi = await contract.waitGlobalInitialized(DOMAIN_CONSOLE_KEY, { timeoutMs: 10000 });
    await consoleUi.open(state.current.message_id);
  }

  async function openDlcManager() {
    const dlcManager = await contract.waitGlobalInitialized(DLC_MANAGER_KEY, { timeoutMs: 10000 });
    await dlcManager.open();
  }

  async function openTheaterConsole() {
    if (!Number.isInteger(state.current?.message_id)) {
      notify('请先选择或生成一条真实 assistant 楼层。', 'warning');
      return;
    }
    const theater = await contract.waitGlobalInitialized(THEATER_CONSOLE_KEY, { timeoutMs: 10000 });
    await theater.open(state.current.message_id);
  }

  function settingLabel(text, control) {
    const row = element('label', 'crypt-lord-game-shell__setting');
    row.append(element('span', 'crypt-lord-game-shell__setting-label', text), control);
    return row;
  }

  async function showSettings() {
    if (!openModal('系统设置')) return;
    const appearance = element('section', 'crypt-lord-game-shell__settings-section');
    appearance.appendChild(element('h3', 'crypt-lord-game-shell__section-title', '界面'));
    const themeRow = element('div', 'crypt-lord-game-shell__settings-row');
    themeRow.append(
      button('深色', 'crypt-lord-game-shell__dialog-button', () => setTheme('dark')),
      button('浅色', 'crypt-lord-game-shell__dialog-button', () => setTheme('light')),
    );
    appearance.appendChild(themeRow);
    state.modalBody.appendChild(appearance);

    let settlement;
    try {
      settlement = await contract.waitGlobalInitialized(VARIABLE_SETTLEMENT_API_KEY, { timeoutMs: 10000 });
    } catch (error) {
      state.modalBody.appendChild(element('div', 'crypt-lord-game-shell__empty', `变量结算设置不可用：${error?.message || error}`));
      return;
    }
    const settings = await settlement.readSettings();
    if (!state.modal?.dataset.open || state.modal.dataset.open !== 'true') return;

    const section = element('section', 'crypt-lord-game-shell__settings-section');
    section.appendChild(element('h3', 'crypt-lord-game-shell__section-title', '变量结算副模型'));
    const enabled = element('input');
    enabled.type = 'checkbox';
    enabled.checked = settings.enabled;
    const streaming = element('input');
    streaming.type = 'checkbox';
    streaming.checked = settings.streamingEnabled;
    const gemini = element('input');
    gemini.type = 'checkbox';
    gemini.checked = settings.gemini37fPrefill;
    const custom = element('input');
    custom.type = 'checkbox';
    custom.checked = settings.useCustomApi;
    section.append(
      settingLabel('启用本回合变量结算', enabled),
      settingLabel('静默流式请求', streaming),
      settingLabel('Gemini 3.6+ 预填兼容', gemini),
      settingLabel('使用自定义 API', custom),
    );

    const customFields = element('div', 'crypt-lord-game-shell__settings-fields');
    const url = element('input', 'crypt-lord-game-shell__settings-input');
    url.type = 'url';
    url.placeholder = 'https://api.openai.com/v1';
    url.value = settings.apiUrl;
    const key = element('input', 'crypt-lord-game-shell__settings-input');
    key.type = 'password';
    key.autocomplete = 'new-password';
    key.placeholder = 'API Key';
    key.value = settings.apiKey;
    const model = element('input', 'crypt-lord-game-shell__settings-input');
    model.type = 'text';
    model.placeholder = '模型名';
    model.value = settings.model;
    const models = element('select', 'crypt-lord-game-shell__settings-input');
    const selected = element('option', '', settings.model || '获取列表后选择');
    selected.value = settings.model;
    models.appendChild(selected);
    models.addEventListener('change', () => { model.value = models.value; });
    customFields.append(
      settingLabel('反代 URL', url),
      settingLabel('API Key', key),
      settingLabel('模型', model),
      settingLabel('模型列表', models),
    );
    const customActions = element('div', 'crypt-lord-game-shell__settings-row');
    const listButton = button('获取列表', 'crypt-lord-game-shell__dialog-button', async () => {
      const apiurl = url.value.trim();
      if (!apiurl) { notify('请先填写变量副模型的反代 URL。', 'warning'); return; }
      listButton.disabled = true;
      listButton.textContent = '获取中';
      try {
        const names = await settlement.getModelList({ apiurl, key: key.value.trim() });
        clear(models);
        Array.from(new Set((Array.isArray(names) ? names : []).map(name => String(name).trim()).filter(Boolean))).forEach(name => {
          const option = element('option', '', name);
          option.value = name;
          option.selected = name === model.value.trim();
          models.appendChild(option);
        });
        if (!models.options.length) models.appendChild(element('option', '', '未返回模型'));
      } catch (error) {
        notify(`获取模型列表失败：${error?.message || error}`, 'error');
      } finally {
        listButton.disabled = false;
        listButton.textContent = '获取列表';
      }
    });
    customActions.appendChild(listButton);
    customFields.appendChild(customActions);
    customFields.hidden = !custom.checked;
    custom.addEventListener('change', () => { customFields.hidden = !custom.checked; });
    section.appendChild(customFields);

    const retry = element('input', 'crypt-lord-game-shell__settings-input');
    retry.type = 'number';
    retry.min = '0';
    retry.max = '99';
    retry.step = '1';
    retry.value = String(settings.retryLimit);
    section.appendChild(settingLabel('失败重试次数', retry));
    const actions = element('div', 'crypt-lord-game-shell__settings-row');
    actions.appendChild(button('保存设置', 'crypt-lord-game-shell__dialog-button', async () => {
      try {
        await settlement.saveSettings({
          enabled: enabled.checked,
          streamingEnabled: streaming.checked,
          gemini37fPrefill: gemini.checked,
          useCustomApi: custom.checked,
          apiUrl: url.value,
          apiKey: key.value,
          model: model.value,
          retryLimit: retry.value,
        });
        notify('变量结算副模型设置已保存到此脚本。', 'success');
      } catch (error) {
        notify(`保存变量结算设置失败：${error?.message || error}`, 'error');
      }
    }));
    section.appendChild(actions);
    state.modalBody.appendChild(section);
  }

  function domainTextarea(label, domain, data) {
    const section = element('section', 'crypt-lord-game-shell__variable-domain');
    section.dataset.domain = domain;
    section.appendChild(element('h3', 'crypt-lord-game-shell__section-title', label));
    const textarea = element('textarea', 'crypt-lord-game-shell__variable-json');
    textarea.spellcheck = false;
    textarea.value = JSON.stringify(record(data?.[domain]) ? data[domain] : {}, null, 2);
    section.appendChild(textarea);
    return section;
  }

  function parseVariableDomains(container, originalData) {
    const next = typeof window.structuredClone === 'function'
      ? window.structuredClone(record(originalData) ? originalData : {})
      : JSON.parse(JSON.stringify(record(originalData) ? originalData : {}));
    for (const domain of ['stat_data', 'npc_data', 'world_data']) {
      const textarea = container.querySelector(`[data-domain="${domain}"] textarea`);
      let parsed;
      try { parsed = JSON.parse(textarea?.value || '{}'); } catch (error) {
        throw new Error(`${domain} 不是有效 JSON：${error.message}`);
      }
      if (!record(parsed)) throw new Error(`${domain} 必须是 JSON 对象。`);
      next[domain] = parsed;
    }
    return next;
  }

  function cloneRecord(value) {
    const source = record(value) ? value : {};
    if (typeof window.structuredClone === 'function') return window.structuredClone(source);
    return JSON.parse(JSON.stringify(source));
  }

  function decodePointerSegment(value) {
    return String(value).replace(/~1/g, '/').replace(/~0/g, '~');
  }

  function encodePointerSegment(value) {
    return String(value).replace(/~/g, '~0').replace(/\//g, '~1');
  }

  function variablePath(segments) {
    return `/${segments.map(encodePointerSegment).join('/')}`;
  }

  function getTreeValue(source, segments) {
    return segments.reduce((value, segment) => value == null ? undefined : value[segment], source);
  }

  function setTreeValue(source, segments, value) {
    if (!segments.length) return value;
    const parent = getTreeValue(source, segments.slice(0, -1));
    if (!record(parent) && !Array.isArray(parent)) throw new Error('变量路径的父节点不是对象或列表。');
    parent[segments.at(-1)] = value;
    return source;
  }

  function deleteTreeValue(source, segments) {
    if (!segments.length) throw new Error('不能删除变量域根节点。');
    const parent = getTreeValue(source, segments.slice(0, -1));
    if (Array.isArray(parent)) parent.splice(Number(segments.at(-1)), 1);
    else if (record(parent)) delete parent[segments.at(-1)];
    else throw new Error('变量路径的父节点不是对象或列表。');
    return source;
  }

  async function showVariableWorkbench() {
    if (!openModal('变量修改器')) return;
    let stateStore;
    let target;
    try {
      [stateStore, target] = await Promise.all([
        contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 }),
        contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 }).then(store => store.readMessage(state.current.message_id)),
      ]);
    } catch (error) {
      state.modalBody.appendChild(element('div', 'crypt-lord-game-shell__empty', `无法读取真实楼层变量：${error?.message || error}`));
      return;
    }
    if (target?.role !== 'assistant') {
      state.modalBody.appendChild(element('div', 'crypt-lord-game-shell__empty', '当前目标不是 assistant 楼层，无法修改变量。'));
      return;
    }

    let workingData = cloneRecord(target.data);
    let patchInput = null;
    const expandedPaths = new Set(['stat_data', 'npc_data', 'world_data']);
    const pendingPatches = [];
    const toolbar = element('div', 'crypt-lord-game-shell__variable-toolbar');
    const deepSection = element('section', 'crypt-lord-game-shell__variable-tree');
    const deepTools = element('div', 'crypt-lord-game-shell__variable-tree-tools');
    const search = element('input', 'crypt-lord-game-shell__variable-search');
    search.type = 'search';
    search.placeholder = '搜索变量名或值';
    const tree = element('div', 'crypt-lord-game-shell__variable-tree-body');
    const domains = element('div', 'crypt-lord-game-shell__variable-domains');
    const status = element('div', 'crypt-lord-game-shell__variable-status', `目标楼层 #${target.message_id}。仅会写入该真实 assistant 楼层。`);
    const renderDomains = data => {
      clear(domains);
      domains.append(
        domainTextarea('角色状态 stat_data', 'stat_data', data),
        domainTextarea('人物数据 npc_data', 'npc_data', data),
        domainTextarea('世界数据 world_data', 'world_data', data),
      );
    };
    renderDomains(workingData);

    const syncTreeToJson = () => {
      workingData = parseVariableDomains(domains, workingData);
      return workingData;
    };
    const syncPendingPatches = () => {
      if (!patchInput || !pendingPatches.length) return;
      patchInput.value = JSON.stringify({
        stat_data: pendingPatches.filter(item => item.domain === 'stat_data').map(({ domain, ...item }) => item),
        npc_data: pendingPatches.filter(item => item.domain === 'npc_data').map(({ domain, ...item }) => item),
        world_data: pendingPatches.filter(item => item.domain === 'world_data').map(({ domain, ...item }) => item),
      }, null, 2);
    };
    const recordTreePatch = (domain, op, segments, value) => {
      const command = { domain, op, path: variablePath(segments) };
      if (op !== 'remove') command.value = cloneRecord({ value }).value;
      pendingPatches.push(command);
      syncPendingPatches();
    };
    const defaultValueFor = kind => {
      if (kind === '2') return 0;
      if (kind === '3') return false;
      if (kind === '4') return {};
      if (kind === '5') return [];
      return '新内容';
    };
    const promptNewValue = (parentPath, isArray) => {
      const hostWindow = afterNative.getHost()?.window || window;
      let key = '';
      if (!isArray) {
        key = hostWindow.prompt(`在 ${parentPath || '根节点'} 下新增变量名：`, '新变量');
        if (key === null || !key.trim()) return null;
        key = key.trim();
      }
      const kind = hostWindow.prompt('选择类型：1 文本；2 数字；3 开关；4 对象；5 列表', '1');
      if (!['1', '2', '3', '4', '5'].includes(String(kind).trim())) return null;
      return { key, value: defaultValueFor(String(kind).trim()) };
    };
    const renderTree = () => {
      clear(tree);
      const filter = search.value.trim().toLocaleLowerCase();
      const matches = (key, value) => !filter || String(key).toLocaleLowerCase().includes(filter) || displayValue(value, '').toLocaleLowerCase().includes(filter);
      const renderNode = (domain, key, value, segments, rootNode = false) => {
        const objectNode = record(value) || Array.isArray(value);
        const children = objectNode
          ? Object.entries(value).filter(([childKey]) => childKey !== '$meta').map(([childKey, childValue]) => renderNode(domain, childKey, childValue, [...segments, childKey])).filter(Boolean)
          : [];
        if (!matches(key, value) && !children.length) return null;
        const path = `${domain}:${variablePath(segments)}`;
        const row = element('div', 'crypt-lord-game-shell__variable-tree-row');
        const node = element('div', 'crypt-lord-game-shell__variable-tree-node');
        if (objectNode) {
          const toggle = button(expandedPaths.has(path) || filter ? '−' : '+', 'crypt-lord-game-shell__tree-icon-button', () => {
            if (expandedPaths.has(path)) expandedPaths.delete(path);
            else expandedPaths.add(path);
            renderTree();
          });
          toggle.title = '展开或收起';
          node.appendChild(toggle);
        } else {
          node.appendChild(element('span', 'crypt-lord-game-shell__tree-spacer'));
        }
        node.appendChild(element('strong', 'crypt-lord-game-shell__variable-tree-key', rootNode ? domain : key));
        if (objectNode) {
          node.appendChild(element('span', 'crypt-lord-game-shell__variable-tree-summary', Array.isArray(value) ? `列表 (${value.length})` : `对象 (${Object.keys(value).filter(childKey => childKey !== '$meta').length})`));
          const add = button('+', 'crypt-lord-game-shell__tree-icon-button', () => {
            try {
              syncTreeToJson();
              const parent = getTreeValue(workingData[domain], segments);
              const addition = promptNewValue(variablePath(segments), Array.isArray(parent));
              if (!addition) return;
              const nextSegments = Array.isArray(parent) ? [...segments, String(parent.length)] : [...segments, addition.key];
              if (Array.isArray(parent)) parent.push(addition.value);
              else parent[addition.key] = addition.value;
              recordTreePatch(domain, 'add', nextSegments, addition.value);
              expandedPaths.add(path);
              renderDomains(workingData);
              renderTree();
            } catch (error) { notify(`新增变量失败：${error?.message || error}`, 'error'); }
          });
          add.title = '新增字段';
          node.appendChild(add);
        } else {
          const input = element('input', 'crypt-lord-game-shell__variable-tree-input');
          if (typeof value === 'boolean') {
            input.type = 'checkbox';
            input.checked = value;
          } else {
            input.type = typeof value === 'number' ? 'number' : 'text';
            input.value = value === null ? '' : String(value);
          }
          input.addEventListener('change', () => {
            try {
              syncTreeToJson();
              const nextValue = typeof value === 'boolean' ? input.checked : typeof value === 'number' ? Number(input.value) : input.value;
              setTreeValue(workingData[domain], segments, nextValue);
              recordTreePatch(domain, 'replace', segments, nextValue);
              renderDomains(workingData);
              status.textContent = '已修改变量草稿；点击“保存三个变量域”后才会落盘。';
            } catch (error) { notify(`修改变量失败：${error?.message || error}`, 'error'); }
          });
          node.appendChild(input);
        }
        if (!rootNode) {
          const remove = button('×', 'crypt-lord-game-shell__tree-icon-button crypt-lord-game-shell__tree-delete', () => {
            const hostWindow = afterNative.getHost()?.window || window;
            if (!hostWindow.confirm(`删除变量 ${variablePath(segments)}？`)) return;
            try {
              syncTreeToJson();
              deleteTreeValue(workingData[domain], segments);
              recordTreePatch(domain, 'remove', segments);
              renderDomains(workingData);
              renderTree();
              status.textContent = '已删除变量草稿；点击“保存三个变量域”后才会落盘。';
            } catch (error) { notify(`删除变量失败：${error?.message || error}`, 'error'); }
          });
          remove.title = '删除字段';
          node.appendChild(remove);
        }
        row.appendChild(node);
        if (objectNode && (expandedPaths.has(path) || filter)) {
          const childBox = element('div', 'crypt-lord-game-shell__variable-tree-children');
          children.forEach(child => childBox.appendChild(child));
          row.appendChild(childBox);
        }
        return row;
      };
      ['stat_data', 'npc_data', 'world_data'].forEach(domain => {
        const rootNode = renderNode(domain, domain, record(workingData[domain]) ? workingData[domain] : {}, [], true);
        if (rootNode) tree.appendChild(rootNode);
      });
      if (!tree.childElementCount) tree.appendChild(element('div', 'crypt-lord-game-shell__empty', '没有匹配的变量。'));
    };
    deepSection.appendChild(element('h3', 'crypt-lord-game-shell__section-title', '深度树编辑'));
    deepTools.append(search, button('全部展开', 'crypt-lord-game-shell__dialog-button', () => {
      const collect = (domain, value, segments = []) => {
        if (!record(value) && !Array.isArray(value)) return;
        expandedPaths.add(`${domain}:${variablePath(segments)}`);
        Object.entries(value).filter(([key]) => key !== '$meta').forEach(([key, child]) => collect(domain, child, [...segments, key]));
      };
      ['stat_data', 'npc_data', 'world_data'].forEach(domain => collect(domain, workingData[domain], []));
      renderTree();
    }), button('全部收起', 'crypt-lord-game-shell__dialog-button', () => {
      expandedPaths.clear();
      renderTree();
    }));
    search.addEventListener('input', renderTree);
    deepSection.append(deepTools, tree);
    renderTree();

    const reload = button('重新读取', 'crypt-lord-game-shell__dialog-button', async () => {
      const fresh = await stateStore.readMessage(target.message_id);
      workingData = record(fresh?.data) ? fresh.data : {};
      pendingPatches.length = 0;
      renderDomains(workingData);
      renderTree();
      status.textContent = `已从真实楼层 #${target.message_id} 重新读取。`;
    });
    const save = button('保存三个变量域', 'crypt-lord-game-shell__dialog-button', async () => {
      try {
        const next = syncTreeToJson();
        save.disabled = true;
        await stateStore.writeAssistantData(target.message_id, next);
        workingData = next;
        status.textContent = `已保存到真实 assistant 楼层 #${target.message_id}。`;
        await refresh();
        notify('变量已保存到当前真实 assistant 楼层。', 'success');
      } catch (error) {
        notify(`保存变量失败：${error?.message || error}`, 'error');
      } finally {
        save.disabled = false;
      }
    });
    toolbar.append(reload, save, button('副 API 设置', 'crypt-lord-game-shell__dialog-button', () => { void showSettings(); }));

    const patchSection = element('section', 'crypt-lord-game-shell__variable-patch');
    patchSection.appendChild(element('h3', 'crypt-lord-game-shell__section-title', 'JSON Patch 原始模式'));
    patchInput = element('textarea', 'crypt-lord-game-shell__variable-json');
    patchInput.spellcheck = false;
    patchInput.placeholder = '{\n  "stat_data": [{ "op": "replace", "path": "/当前活力", "value": 18 }],\n  "npc_data": [],\n  "world_data": []\n}';
    const patchActions = element('div', 'crypt-lord-game-shell__settings-row');
    const applyPatch = button('应用补丁到草稿', 'crypt-lord-game-shell__dialog-button', async () => {
      try {
        const patch = await contract.waitGlobalInitialized(VARIABLE_PATCH_KEY, { timeoutMs: 10000 });
        const result = patch.apply(`<UpdateVariable><JSONPatch>${patchInput.value}</JSONPatch></UpdateVariable>`, parseVariableDomains(domains, workingData));
        if (!result.applied) throw new Error('没有识别到可应用的 add、replace 或 remove 指令。');
        workingData = result.data;
        pendingPatches.length = 0;
        renderDomains(workingData);
        renderTree();
        status.textContent = `已将 ${result.applied} 项补丁写入草稿；点击“保存三个变量域”后才会落盘。`;
      } catch (error) {
        notify(`应用补丁失败：${error?.message || error}`, 'error');
      }
    });
    const recoverPatch = button('恢复本回合提取', 'crypt-lord-game-shell__dialog-button', async () => {
      const extracted = workingData?.cryptLord?.lastUpdateVariable;
      if (!extracted) { notify('当前楼层没有可恢复的 UpdateVariable 提取记录。', 'warning'); return; }
      const patch = await contract.waitGlobalInitialized(VARIABLE_PATCH_KEY, { timeoutMs: 10000 });
      const result = patch.apply(extracted, parseVariableDomains(domains, workingData));
      if (!result.applied) { notify('提取记录中没有可应用的变量补丁。', 'warning'); return; }
      workingData = result.data;
      pendingPatches.length = 0;
      renderDomains(workingData);
      renderTree();
      patchInput.value = extracted.replace(/^.*?<JSONPatch>|<\/JSONPatch>[\s\S]*$/gi, '').trim();
      status.textContent = `已恢复 ${result.applied} 项本回合变量补丁到草稿。`;
    });
    patchActions.append(applyPatch, recoverPatch);
    patchSection.append(patchInput, patchActions);

    const aiSection = element('section', 'crypt-lord-game-shell__variable-patch');
    aiSection.appendChild(element('h3', 'crypt-lord-game-shell__section-title', 'AI 变量修复与修改'));
    const instruction = element('textarea', 'crypt-lord-game-shell__variable-instruction');
    instruction.placeholder = '例如：将当前地点改为贝克兰德北区；移除已死亡 NPC 的关系记录。';
    const repair = button('让 AI 生成补丁', 'crypt-lord-game-shell__dialog-button', async () => {
      try {
        const settlement = await contract.waitGlobalInitialized(VARIABLE_SETTLEMENT_API_KEY, { timeoutMs: 10000 });
        repair.disabled = true;
        repair.textContent = '处理中';
        const result = await settlement.repair({ previousData: parseVariableDomains(domains, workingData), instruction: instruction.value });
        workingData = result.data;
        pendingPatches.length = 0;
        renderDomains(workingData);
        renderTree();
        status.textContent = `AI 已生成 ${result.applied} 项变量修改到草稿；检查后点击“保存三个变量域”。`;
      } catch (error) {
        notify(`AI 变量修复失败：${error?.message || error}`, 'error');
      } finally {
        repair.disabled = false;
        repair.textContent = '让 AI 生成补丁';
      }
    });
    aiSection.append(instruction, repair);

    state.modalBody.append(toolbar, status, deepSection, domains, patchSection, aiSection);
  }

  function showFeature(feature) {
    if (feature.id === 'settings') return showSettings();
    if (feature.id === 'variables') return openVariableEditor();
    if (feature.id === 'variable-ai-config') return void contract.waitGlobalInitialized(AI_CONTEXT_CONFIG_UI_KEY, { timeoutMs: 10000 }).then(api => api.open());
    if (feature.id === 'diagnostics') return root.debugManager?.open?.();
    if (feature.id === 'industry') return void openOrganizationConsole('industry');
    if (feature.id === 'faction') return void openOrganizationConsole('faction');
    if (feature.id === 'domain') return void openDomainConsole();
    if (feature.id === 'theater') return void openTheaterConsole();
    if (feature.id === 'dlc') return void openDlcManager();
    if (feature.id === 'worldbook-profiles') return void contract.waitGlobalInitialized(WORLDBOOK_PROFILES_KEY, { timeoutMs: 10000 }).then(api => api.open()).catch(error => notify(`打开世界书开关方案失败：${error?.message || error}`, 'error'));
    if (feature.id === 'dual-worldbook') return void contract.waitGlobalInitialized(DUAL_WORLDBOOK_KEY, { timeoutMs: 10000 }).then(api => api.open()).catch(error => notify(`打开双库世界书管理失败：${error?.message || error}`, 'error'));
    if (feature.id === 'map') {
      void contract.waitGlobalInitialized(MAP_KEY, { timeoutMs: 10000 }).then(map => map.open());
      return;
    }
    if (feature.id === 'divination') return void contract.waitGlobalInitialized(DIVINATION_UI_KEY, { timeoutMs: 10000 }).then(api => api.open()).catch(error => notify(`打开占卜失败：${error?.message || error}`, 'error'));
    if (feature.id === 'original-plot-guide') return void contract.waitGlobalInitialized(ORIGINAL_PLOT_GUIDE_KEY, { timeoutMs: 10000 }).then(api => api.open()).catch(error => notify(`打开原著剧情指引失败：${error?.message || error}`, 'error'));
    if (feature.id === 'battle') return void renderBattleSystem();
    if (feature.id === 'pathway-play') return renderPathwayPlay();
    if (feature.id === 'detective') return void contract.waitGlobalInitialized(DETECTIVE_CASE_KEY, { timeoutMs: 10000 }).then(api => api.open()).catch(error => notify(`打开事件真相失败：${error?.message || error}`, 'error'));
    if (feature.id === 'custom-content') return void contract.waitGlobalInitialized(CUSTOM_CONTENT_KEY, { timeoutMs: 10000 }).then(api => api.open()).catch(error => notify(`打开自建内容生成器失败：${error?.message || error}`, 'error'));
    if (feature.id === 'image-generation') return void contract.waitGlobalInitialized(IMAGE_GENERATION_KEY, { timeoutMs: 10000 }).then(api => api.open()).catch(error => notify(`打开图像生成失败：${error?.message || error}`, 'error'));
    if (feature.id === 'random-events') return void contract.waitGlobalInitialized(RANDOM_EVENTS_KEY, { timeoutMs: 10000 }).then(api => api.open()).catch(error => notify(`打开随机事件失败：${error?.message || error}`, 'error'));
    if (feature.id === 'event-generator') return void contract.waitGlobalInitialized(EVENT_GENERATOR_KEY, { timeoutMs: 10000 }).then(api => api.open()).catch(error => notify(`打开事件词库生成失败：${error?.message || error}`, 'error'));
    if (feature.id === 'inventory') return renderInventory();
    if (feature.id === 'relationships') return showRelationships();
    if (feature.id === 'abilities') return renderAbilities();
    if (feature.id === 'command') return void showQuickShortcuts();
    if (feature.id === 'source-castle') return void contract.waitGlobalInitialized(SOURCE_CASTLE_UI_KEY, { timeoutMs: 10000 }).then(api => api.open()).catch(error => notify(`打开源堡系统失败：${error?.message || error}`, 'error'));
    if (feature.hostButton) {
      afterNative.getHost()?.document?.querySelector?.(feature.hostButton)?.click?.();
      return;
    }
    if (!openModal(feature.label)) return;
    if (feature.id === 'archive') {
      renderArchive();
      return;
    }
    if (feature.id === 'actions') {
      const actions = actionsForCurrent();
      if (!actions.length) {
        state.modalBody.appendChild(element('div', 'crypt-lord-game-shell__empty', '本楼层暂无行动选项'));
      } else {
        const list = element('div', 'crypt-lord-game-shell__action-list');
        actions.slice(0, 8).forEach((action, index) => {
          list.appendChild(button(`${index + 1}. ${safeText(action)}`, 'crypt-lord-game-shell__action-button', () => { void fillAction(safeText(action, '')); }));
        });
        state.modalBody.appendChild(list);
      }
      return;
    }
    if (feature.id === 'journey') {
      const journey = state.current?.compatibility?.journey;
      if (!journey) {
        state.modalBody.appendChild(element('div', 'crypt-lord-game-shell__empty', '当前楼层未包含可识别的本周目经历'));
      } else {
        renderValue(state.modalBody, journey);
      }
      return;
    }
    if (feature.id === 'extracted' && state.current?.compatibility?.journey) {
      renderValue(state.modalBody, state.current.compatibility.journey);
      return;
    }
    const value = valueFor(feature, state.current);
    if (value === undefined) {
      state.modalBody.appendChild(element('div', 'crypt-lord-game-shell__empty', '当前真实 assistant 楼层尚未提供这项数据'));
      return;
    }
    renderValue(state.modalBody, value);
  }

  function pathwayFor(stat) {
    const direct = characterPanelState?.pathway ? characterPanelState.pathway(stat) : (stat.当前途径 || stat.途径);
    if (direct) return direct;
    const sequence = String(stat.当前序列 || stat.序列 || stat.位阶 || '').trim();
    for (const [name, sequences] of Object.entries(state.pathwayPool?.pathways || {})) {
      if (Array.isArray(sequences) && sequences.includes(sequence)) return name.replace(/途径$/, '').trim();
    }
    return state.current?.compatibility?.stat?.当前途径;
  }

  function loadPathways() {
    if (state.pathwayPool || state.pathwayPoolPromise) return;
    const token = state.chatToken;
    state.pathwayPoolPromise = abilityState.loadPool()
      .then(pool => {
        if (token !== state.chatToken || state.disposed) return;
        state.pathwayPool = pool;
        renderLeftPanel();
        if (state.modal?.dataset.open === 'true' && state.modalTitle?.textContent === '途径专属玩法') {
          renderPathwayPlay();
        }
      })
      .catch(error => { console.warn(`[${KEY}] 途径清单读取失败：`, error); })
      .finally(() => { if (token === state.chatToken) state.pathwayPoolPromise = null; });
  }

  function drawArchiveRadar(canvas, axes) {
    const hostWindow = afterNative.getHost()?.window || window;
    const dpr = Math.max(1, Math.min(3, hostWindow.devicePixelRatio || 1));
    canvas.width = Math.round(256 * dpr);
    canvas.height = Math.round(240 * dpr);
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `六维上限相对图：${axes.map(axis => `${axis.label} ${Math.round(axis.value)}%`).join('，')}`);
    const ctx = canvas.getContext?.('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const light = (state.root?.dataset.theme || theme()) === 'light';
    const accent = light ? '#91541f' : '#daa520';
    const muted = light ? '#67513d' : '#e3c69b';
    const radius = 72;
    const cx = 128;
    const cy = 116;
    const point = (index, distance) => {
      const angle = Math.PI * 2 * index / axes.length - Math.PI / 2;
      return [cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance];
    };
    ctx.clearRect(0, 0, 256, 240);
    ctx.lineWidth = 1;
    ctx.strokeStyle = light ? 'rgba(145,84,31,.3)' : 'rgba(218,165,32,.35)';
    for (let level = 1; level <= 5; level++) {
      ctx.beginPath();
      axes.forEach((_, index) => {
        const [x, y] = point(index, radius * level / 5);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
    }
    axes.forEach((axis, index) => {
      const [x, y] = point(index, radius);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();
      const [labelX, labelY] = point(index, radius + 27);
      ctx.fillStyle = muted;
      ctx.font = '12px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(axis.label, labelX, labelY);
    });
    ctx.beginPath();
    axes.forEach((axis, index) => {
      const [x, y] = point(index, radius * axis.value / 100);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = light ? 'rgba(145,84,31,.22)' : 'rgba(218,165,32,.22)';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = accent;
    axes.forEach((axis, index) => {
      const [x, y] = point(index, radius * axis.value / 100);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function renderArchive() {
    if (!state.modalBody) return;
    clear(state.modalBody);
    const stat = state.current?.data?.stat_data;
    if (!record(stat)) {
      state.modalBody.appendChild(element('div', 'crypt-lord-game-shell__empty', '当前真实 assistant 楼层没有角色档案数据'));
      return;
    }
    const view = characterPanelState.archive(stat);
    const layout = element('div', 'crypt-lord-game-shell__archive-layout');
    const profile = element('section', 'crypt-lord-game-shell__archive-section crypt-lord-game-shell__archive-profile');
    profile.appendChild(element('h3', '', '调查员档案'));
    const identity = element('p', 'crypt-lord-game-shell__archive-identity',
      `${safeText(stat.名称 ?? statForCurrent().名称, '<User>')} · ${safeText(stat.当前序列, '普通人')}`);
    profile.appendChild(identity);
    const attributes = element('div', 'crypt-lord-game-shell__archive-attributes');
    view.attributes.forEach(item => {
      const row = element('div', 'crypt-lord-game-shell__archive-attribute');
      const line = element('div', 'crypt-lord-game-shell__archive-line');
      line.append(element('span', '', item.label),
        element('strong', '', item.label === '运气' ? String(item.maximum) : `${item.current} / ${item.maximum}`));
      const track = element('span', 'crypt-lord-game-shell__attribute-track');
      const fill = element('span', 'crypt-lord-game-shell__attribute-fill');
      fill.style.width = `${item.percentage}%`;
      fill.dataset.level = item.percentage < 34 ? 'low' : item.percentage < 67 ? 'medium' : 'high';
      track.appendChild(fill);
      row.append(line, track);
      attributes.appendChild(row);
    });
    profile.appendChild(attributes);
    const ages = element('dl', 'crypt-lord-game-shell__archive-ages');
    ages.append(element('dt', '', '身体年龄'), element('dd', '', safeText(view.bodyAge)),
      element('dt', '', '灵魂年龄'), element('dd', '', safeText(view.soulAge)));
    profile.appendChild(ages);
    const canvas = element('canvas', 'crypt-lord-game-shell__archive-radar');
    profile.appendChild(canvas);
    layout.appendChild(profile);

    const quests = element('section', 'crypt-lord-game-shell__archive-section');
    const questHeading = element('h3', 'crypt-lord-game-shell__quest-title');
    questHeading.append(element('span', '', '<User>接受的任务'),
      element('span', 'crypt-lord-game-shell__quest-count', `${view.quests.length}/10`));
    quests.appendChild(questHeading);
    if (view.quests.length >= 10) quests.appendChild(element('p', 'crypt-lord-game-shell__quest-warning', '任务已满 10 个，新任务将被自动清理'));
    if (!view.quests.length) quests.appendChild(element('p', 'crypt-lord-game-shell__archive-empty', '暂无接受的任务'));
    view.quests.forEach(quest => {
      const row = element('div', 'crypt-lord-game-shell__archive-entry');
      const heading = element('div', 'crypt-lord-game-shell__quest-heading');
      heading.appendChild(element('strong', '', quest.name));
      const remove = button('×', 'crypt-lord-game-shell__quest-delete', () => { void deleteAcceptedQuest(quest); });
      remove.title = `删除任务「${quest.name}」`;
      remove.setAttribute('aria-label', remove.title);
      remove.disabled = state.questBusy;
      heading.appendChild(remove);
      row.appendChild(heading);
      [
        ['委托者', quest.commissioner || '无'],
        ['概述', quest.summary || '无'],
        ['完成条件', quest.condition || '无'],
        ['奖励', quest.reward || '无'],
      ].forEach(([label, value]) => {
        const detail = element('div', 'crypt-lord-game-shell__quest-row');
        detail.append(element('span', '', label), element('span', '', value));
        row.appendChild(detail);
      });
      row.appendChild(element('div', 'crypt-lord-game-shell__quest-flags',
        `${quest.completed ? '已完成' : '未完成'} · ${quest.claimed ? '已领奖' : '未领奖'}`));
      quests.appendChild(row);
    });
    layout.appendChild(quests);

    const traits = element('section', 'crypt-lord-game-shell__archive-section');
    traits.appendChild(element('h3', '', '非凡特性'));
    if (!view.traits.length) traits.appendChild(element('p', 'crypt-lord-game-shell__archive-empty', '暂无非凡特性'));
    view.traits.forEach(trait => {
      const row = element('div', 'crypt-lord-game-shell__archive-entry');
      row.append(element('strong', '', `【${trait.tier}】${trait.name}`),
        element('p', '', trait.description));
      trait.bonuses.forEach(([key, value]) =>
        row.appendChild(element('p', 'crypt-lord-game-shell__archive-subtle', `${key}：${displayValue(value)}`)));
      traits.appendChild(row);
    });
    layout.appendChild(traits);

    const equipment = element('section', 'crypt-lord-game-shell__archive-section');
    equipment.appendChild(element('h3', '', '装备'));
    if (!view.equipment.length) equipment.appendChild(element('p', 'crypt-lord-game-shell__archive-empty', '暂无装备'));
    view.equipment.forEach(item => {
      const row = element('div', 'crypt-lord-game-shell__archive-equipment');
      row.append(element('strong', '', item.name),
        element('span', '', [item.type, item.tier, item.equipped ? '已装备' : ''].filter(Boolean).join(' · ')));
      equipment.appendChild(row);
    });
    layout.appendChild(equipment);

    const acting = element('section', 'crypt-lord-game-shell__archive-section crypt-lord-game-shell__archive-acting');
    acting.appendChild(element('h3', '', '扮演法详情'));
    const digestion = Math.max(0, Math.min(100, view.digestion));
    const line = element('div', 'crypt-lord-game-shell__archive-line');
    line.append(element('span', '', '消化进度'), element('strong', '', `${view.digestion}%`));
    const track = element('span', 'crypt-lord-game-shell__attribute-track');
    const fill = element('span', 'crypt-lord-game-shell__attribute-fill');
    fill.style.width = `${digestion}%`;
    track.appendChild(fill);
    acting.append(line, track);
    const loss = element('div', 'crypt-lord-game-shell__archive-line');
    loss.append(element('span', '', '失控进度'), element('strong', '', String(view.loss)));
    acting.appendChild(loss);
    layout.appendChild(acting);

    state.modalBody.appendChild(layout);
    drawArchiveRadar(canvas, view.radar);
  }

  function relationshipFields(parent, items) {
    if (!items.length) return;
    const list = element('dl', 'crypt-lord-game-shell__relationship-fields');
    items.forEach(([label, value]) => {
      list.append(element('dt', '', label), element('dd', '', displayValue(value)));
    });
    parent.appendChild(list);
  }

  function showRelationships() {
    if (!openModal('人物关系')) return;
    state.relationshipBatch = false;
    state.relationshipSelected.clear();
    renderRelationships();
  }

  function renderRelationships() {
    if (!state.modalBody || state.modalTitle?.textContent !== '人物关系') return;
    const scrollTop = state.modalBody.scrollTop;
    const opened = new Set(Array.from(state.modalBody.querySelectorAll('.crypt-lord-game-shell__relationship-detail[open]'))
      .map(node => node.closest('.crypt-lord-game-shell__relationship')?.dataset.key));
    const data = state.current?.data;
    const entries = relationshipState.list(data);
    const byKey = new Map(entries.map(entry => [entry.key, entry]));
    for (const key of state.relationshipSelected) {
      if (!byKey.has(key)) state.relationshipSelected.delete(key);
    }
    clear(state.modalBody);
    if (!record(data?.stat_data?.人物关系列表)) {
      state.modalBody.appendChild(element('p', 'crypt-lord-game-shell__empty', '当前真实 assistant 楼层没有人物关系列表'));
      return;
    }
    const toolbar = element('div', 'crypt-lord-game-shell__relationship-toolbar');
    toolbar.appendChild(button(state.relationshipBatch ? '取消批量' : '批量删除', 'crypt-lord-game-shell__dialog-button', () => {
      state.relationshipBatch = !state.relationshipBatch;
      state.relationshipSelected.clear();
      renderRelationships();
    }));
    if (state.relationshipBatch) {
      const selectAll = element('label', 'crypt-lord-game-shell__relationship-select');
      const checkbox = element('input');
      checkbox.type = 'checkbox';
      checkbox.checked = entries.length > 0 && state.relationshipSelected.size === entries.length;
      checkbox.addEventListener('change', () => {
        state.relationshipSelected.clear();
        if (checkbox.checked) entries.forEach(entry => state.relationshipSelected.add(entry.key));
        renderRelationships();
      });
      selectAll.append(checkbox, element('span', '', '全选'));
      toolbar.appendChild(selectAll);
      const count = element('span', 'crypt-lord-game-shell__relationship-count', `已选 ${state.relationshipSelected.size} 人`);
      toolbar.appendChild(count);
      const remove = button('删除选中', 'crypt-lord-game-shell__dialog-button', () => {
        const selected = [...state.relationshipSelected].map(key => byKey.get(key)).filter(Boolean);
        void changeRelationships('remove', selected);
      });
      remove.disabled = state.relationshipBusy || !state.relationshipSelected.size;
      toolbar.appendChild(remove);
    }
    state.modalBody.appendChild(toolbar);
    if (!entries.length) {
      state.modalBody.appendChild(element('p', 'crypt-lord-game-shell__empty', '暂无重要人际关系'));
      return;
    }
    const list = element('div', 'crypt-lord-game-shell__relationships');
    entries.forEach(entry => {
      const row = element('article', 'crypt-lord-game-shell__relationship');
      row.dataset.key = entry.key;
      const details = element('details', 'crypt-lord-game-shell__relationship-detail');
      if (opened.has(entry.key)) details.open = true;
      const header = element('div', 'crypt-lord-game-shell__relationship-header');
      if (state.relationshipBatch) {
        const select = element('input');
        select.type = 'checkbox';
        select.checked = state.relationshipSelected.has(entry.key);
        select.title = `选择${entry.name}`;
        select.addEventListener('change', () => {
          if (select.checked) state.relationshipSelected.add(entry.key);
          else state.relationshipSelected.delete(entry.key);
          renderRelationships();
        });
        header.appendChild(select);
      }
      const summary = element('summary', 'crypt-lord-game-shell__relationship-summary');
      summary.append(element('strong', '', entry.name),
        element('span', '', `${entry.relationship} · 好感度 ${entry.favorability}`));
      details.appendChild(summary);
      const content = element('div', 'crypt-lord-game-shell__relationship-content');
      relationshipFields(content, entry.subjective);
      const meter = element('div', 'crypt-lord-game-shell__attribute-track');
      const fill = element('span', 'crypt-lord-game-shell__attribute-fill');
      fill.style.width = `${Math.max(0, Math.min(100, entry.favorability / 2))}%`;
      meter.appendChild(fill);
      content.appendChild(meter);
      if (entry.objective) {
        const truth = element('details', 'crypt-lord-game-shell__relationship-truth');
        truth.appendChild(element('summary', '', '真实信息'));
        const truthBody = element('div', '');
        relationshipFields(truthBody, [['真名', entry.key], ['真实序列', entry.objective.sequence],
          ...entry.objective.stats, ...entry.objective.statuses, ...entry.objective.fields,
          ...(entry.objective.abilities.length ? [['真实能力', entry.objective.abilities.join('、')]] : [])]);
        truth.appendChild(truthBody);
        content.appendChild(truth);
      }
      details.appendChild(content);
      header.appendChild(details);
      const mark = button(entry.important ? '★' : '☆', 'crypt-lord-game-shell__relationship-icon', () => {
        void changeRelationships('important', [entry]);
      });
      mark.title = entry.important ? `取消${entry.name}的重要标记` : `标记${entry.name}为重要人物`;
      mark.setAttribute('aria-label', mark.title);
      mark.disabled = state.relationshipBusy;
      const remove = button('×', 'crypt-lord-game-shell__relationship-icon is-danger', () => {
        void changeRelationships('remove', [entry]);
      });
      remove.title = `删除人物${entry.name}`;
      remove.setAttribute('aria-label', remove.title);
      remove.disabled = state.relationshipBusy;
      header.append(mark, remove);
      row.appendChild(header);
      list.appendChild(row);
    });
    state.modalBody.appendChild(list);
    state.modalBody.scrollTop = scrollTop;
  }

  async function changeRelationships(action, entries) {
    const messageId = state.current?.message_id;
    const chatToken = state.chatToken;
    if (state.relationshipBusy || !Number.isInteger(messageId) || !entries.length) return;
    if (action === 'remove') {
      const prompt = entries.length === 1 ? `确定删除人物「${entries[0].name}」吗？此操作不可恢复。`
        : `确定删除选中的 ${entries.length} 人吗？此操作不可恢复。`;
      if (!afterNative.getHost()?.window?.confirm?.(prompt)) return;
    }
    state.relationshipBusy = true;
    try {
      const store = await contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 });
      if (state.chatToken !== chatToken || state.current?.message_id !== messageId) throw new Error('当前聊天已变化，请重新读取。');
      const message = await store.readMessage(messageId);
      if (message?.role !== 'assistant') throw new Error('目标楼层不再是 assistant。');
      const before = message.data || {};
      const next = action === 'important'
        ? relationshipState.toggleImportant(before, entries[0])
        : relationshipState.removeMany(before, entries);
      if (state.chatToken !== chatToken || state.current?.message_id !== messageId) throw new Error('当前聊天已变化，请重新读取。');
      await store.writeAssistantData(messageId, next);
      if (state.chatToken === chatToken && state.current?.message_id === messageId) state.current.data = next;
      modules[VARIABLE_WORKBENCH_KEY]?.notifyUpdate?.({
        messageId, beforeData: before, afterData: next, source: `relationship-${action}`,
      });
      state.relationshipSelected.clear();
      notify(action === 'important' ? '重要人物标记已更新。' : `已删除 ${entries.length} 条人物关系。`, 'success');
    } catch (error) {
      notify(`人物关系操作失败：${error?.message || error}`, 'error');
    } finally {
      state.relationshipBusy = false;
      if (!state.disposed && state.modal?.dataset.open === 'true' && state.modalTitle?.textContent === '人物关系') renderRelationships();
    }
  }

  async function deleteAcceptedQuest(quest) {
    const messageId = state.current?.message_id;
    const chatToken = state.chatToken;
    if (state.questBusy || !Number.isInteger(messageId)) return;
    const hostWindow = afterNative.getHost()?.window || window;
    if (!hostWindow.confirm?.(`确定删除任务「${quest.name}」吗？此操作不可恢复。`)) return;
    state.questBusy = true;
    try {
      const store = await contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 });
      if (state.chatToken !== chatToken || state.current?.message_id !== messageId) throw new Error('当前聊天已变化，请重新读取。');
      const message = await store.readMessage(messageId);
      if (message?.role !== 'assistant') throw new Error('目标楼层不再是 assistant。');
      const before = message.data || {};
      const next = characterPanelState.removeQuest(before, quest.key, quest.original);
      if (state.chatToken !== chatToken || state.current?.message_id !== messageId) throw new Error('当前聊天已变化，请重新读取。');
      await store.writeAssistantData(messageId, next);
      if (state.chatToken === chatToken && state.current?.message_id === messageId) state.current.data = next;
      modules[VARIABLE_WORKBENCH_KEY]?.notifyUpdate?.({
        messageId, beforeData: before, afterData: next, source: 'accepted-quest-delete',
      });
      notify(`已删除任务「${quest.name}」`, 'success');
    } catch (error) {
      notify(`删除任务失败：${error?.message || error}`, 'error');
    } finally {
      state.questBusy = false;
      if (!state.disposed) {
        renderLeftPanel();
        if (state.modal?.dataset.open === 'true' && state.modalTitle?.textContent === '档案详情') renderArchive();
      }
    }
  }

  function renderLeftPanel() {
    if (!state.leftBody) return;
    clear(state.leftBody);
    const stat = statForCurrent();
    const name = safeText(stat.名称 || stat.姓名 || stat.name || '<User>');
    const sequence = safeText(characterPanelState?.sequence ? characterPanelState.sequence(stat) : (stat.当前序列 || stat.序列 || stat.位阶 || '普通人'));
    state.left.querySelector('.crypt-lord-game-shell__character-name').textContent = name;
    state.left.querySelector('.crypt-lord-game-shell__character-sequence').textContent = sequence;

    const attributes = element('section', 'crypt-lord-game-shell__panel-section');
    attributes.appendChild(element('h3', 'crypt-lord-game-shell__section-title', '基础属性'));
    const grid = element('div', 'crypt-lord-game-shell__attribute-grid');
    ATTRIBUTE_DEFINITIONS.forEach(definition => {
      const values = characterPanelState.attribute(stat, definition.current, definition.maximum, definition.label === '运气');
      const row = element('div', 'crypt-lord-game-shell__attribute-row');
      const line = element('div', 'crypt-lord-game-shell__attribute-line');
      line.append(
        element('span', '', definition.label),
        element('strong', '', definition.label === '运气' ? String(values.maximum) : `${values.current} / ${values.maximum}`),
      );
      const track = element('span', 'crypt-lord-game-shell__attribute-track');
      const fill = element('span', 'crypt-lord-game-shell__attribute-fill');
      fill.style.width = `${values.percentage}%`;
      fill.dataset.level = values.percentage < 34 ? 'low' : values.percentage < 67 ? 'medium' : 'high';
      track.appendChild(fill);
      row.append(line, track);
      grid.appendChild(row);
    });
    attributes.appendChild(grid);

    const traits = element('section', 'crypt-lord-game-shell__panel-section');
    traits.appendChild(element('h3', 'crypt-lord-game-shell__section-title', '非凡特性'));
    const traitEntries = characterPanelState.traits(stat);
    if (!traitEntries.length) traits.appendChild(element('p', 'crypt-lord-game-shell__empty', '暂无非凡特性'));
    traitEntries.forEach(trait => {
      const detail = element('details', 'crypt-lord-game-shell__trait');
      const summary = element('summary', 'crypt-lord-game-shell__trait-summary');
      summary.append(element('span', '', '特性'), element('strong', '', `【${trait.tier}】${trait.name}`));
      const body = element('div', 'crypt-lord-game-shell__trait-body');
      body.appendChild(element('p', '', trait.description));
      trait.bonuses.forEach(([key, value]) =>
        body.appendChild(element('p', '', `${key}：${displayValue(value)}`)));
      detail.append(summary, body);
      traits.appendChild(detail);
    });

    const equipment = element('section', 'crypt-lord-game-shell__panel-section');
    equipment.appendChild(element('h3', 'crypt-lord-game-shell__section-title', '装备/封印物'));
    const slots = element('div', 'crypt-lord-game-shell__equipment-grid');
    characterPanelState.slots(stat).forEach(slot => {
      const control = button(slot.name, 'crypt-lord-game-shell__equipment-slot', renderInventory);
      control.dataset.equipped = slot.item ? 'true' : 'false';
      control.title = slot.item ? `${slot.label} · ${slot.name} · 查看物品栏` : `${slot.label} · 查看物品栏`;
      slots.appendChild(control);
    });
    equipment.appendChild(slots);

    const tasks = element('section', 'crypt-lord-game-shell__panel-section');
    const acceptedQuests = characterPanelState.quests(stat);
    const taskTitle = element('h3', 'crypt-lord-game-shell__section-title crypt-lord-game-shell__quest-title');
    taskTitle.append(element('span', '', '<User>接受的任务'),
      element('span', 'crypt-lord-game-shell__quest-count', `${acceptedQuests.length}/10`));
    tasks.appendChild(taskTitle);
    if (acceptedQuests.length >= 10) tasks.appendChild(element('p', 'crypt-lord-game-shell__quest-warning', '任务已满 10 个，新任务将被自动清理'));
    if (!acceptedQuests.length) tasks.appendChild(element('p', 'crypt-lord-game-shell__empty', '暂无接受的任务'));
    acceptedQuests.forEach(quest => {
      const item = element('article', 'crypt-lord-game-shell__quest');
      const heading = element('div', 'crypt-lord-game-shell__quest-heading');
      heading.appendChild(element('strong', '', quest.name));
      const remove = button('×', 'crypt-lord-game-shell__quest-delete', () => { void deleteAcceptedQuest(quest); });
      remove.title = `删除任务「${quest.name}」`;
      remove.setAttribute('aria-label', remove.title);
      remove.disabled = state.questBusy;
      heading.appendChild(remove);
      item.appendChild(heading);
      [
        ['委托者', quest.commissioner || '无'],
        ['概述', quest.summary || '无'],
        ['完成条件', quest.condition || '无'],
        ['奖励', quest.reward || '无'],
      ].forEach(([label, value]) => {
        const line = element('div', 'crypt-lord-game-shell__quest-row');
        line.append(element('span', '', label), element('span', '', value));
        item.appendChild(line);
      });
      item.appendChild(element('div', 'crypt-lord-game-shell__quest-flags',
        `${quest.completed ? '已完成' : '未完成'} · ${quest.claimed ? '已领奖' : '未领奖'}`));
      tasks.appendChild(item);
    });
    const facts = element('section', 'crypt-lord-game-shell__panel-section');
    facts.appendChild(element('h3', 'crypt-lord-game-shell__section-title', '当前概况'));
    const list = element('dl', 'crypt-lord-game-shell__fact-list');
    [
      ['途径', pathwayFor(stat)],
      ['地点', stat.当前地点 ?? stat.所在地],
      ['状态', stat.当前状态],
      ['任务', stat.当前任务 ?? stat.已接受任务],
    ].forEach(([label, value]) => {
      list.append(element('dt', '', label), element('dd', '', displayValue(value)));
    });
    facts.appendChild(list);
    const tools = element('div', 'crypt-lord-game-shell__left-tools');
    tools.append(
      button('编辑当前 AI', 'crypt-lord-game-shell__small-button', () => { void openEditor(); }),
      button('查看行动', 'crypt-lord-game-shell__small-button', () => showFeature(FEATURES[0])),
      button('变量修改器', 'crypt-lord-game-shell__small-button', () => { void openVariableEditor(); }),
    );
    state.leftBody.append(attributes, traits, equipment, tasks, facts, tools);
  }

  function loadPosition() {
    try {
      const saved = JSON.parse(window.localStorage?.getItem(POSITION_KEY) || 'null');
      if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y)) return saved;
    } catch { /* unavailable storage */ }
    return { x: 18, y: 118 };
  }

  function savePosition(position) {
    try { window.localStorage?.setItem(POSITION_KEY, JSON.stringify(position)); } catch { /* unavailable storage */ }
  }

  function installDrag(header) {
    const hostWindow = afterNative.getHost()?.window;
    let active = null;
    let moved = false;
    const position = loadPosition();
    state.left.style.left = `${position.x}px`;
    state.left.style.top = `${position.y}px`;
    const onMove = event => {
      if (!active) return;
      const x = Math.max(8, Math.min((hostWindow?.innerWidth || 1024) - 280, active.x + event.clientX - active.startX));
      const y = Math.max(8, Math.min((hostWindow?.innerHeight || 768) - 70, active.y + event.clientY - active.startY));
      state.left.style.left = `${x}px`;
      state.left.style.top = `${y}px`;
      active.last = { x, y };
      moved = true;
    };
    const onUp = () => {
      if (active?.last) savePosition(active.last);
      active = null;
      hostWindow?.removeEventListener?.('pointermove', onMove);
      hostWindow?.removeEventListener?.('pointerup', onUp);
      setTimeout(() => { moved = false; }, 0);
    };
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      active = { startX: event.clientX, startY: event.clientY, x: parseFloat(state.left.style.left) || 18, y: parseFloat(state.left.style.top) || 118, last: null };
      hostWindow?.addEventListener?.('pointermove', onMove);
      hostWindow?.addEventListener?.('pointerup', onUp, { once: true });
    });
    header.addEventListener('click', () => {
      if (moved) return;
      state.left.dataset.collapsed = state.left.dataset.collapsed === 'true' ? 'false' : 'true';
    });
    state.cleanups.push(() => {
      hostWindow?.removeEventListener?.('pointermove', onMove);
      hostWindow?.removeEventListener?.('pointerup', onUp);
    });
  }

  function installModalDrag(header, dialog) {
    const hostWindow = afterNative.getHost()?.window;
    let active = null;
    const clamp = (value, min, max) => min > max ? (min + max) / 2 : Math.max(min, Math.min(max, value));
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target?.closest?.('button')) return;
      const origin = { ...state.modalPosition };
      const rect = dialog.getBoundingClientRect();
      active = {
        x: event.clientX,
        y: event.clientY,
        origin,
        rect: { left: rect.left - origin.x, top: rect.top - origin.y, width: rect.width, height: rect.height },
      };
      header.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    header.addEventListener('pointermove', event => {
      if (!active) return;
      const width = hostWindow?.innerWidth || 1024;
      const height = hostWindow?.innerHeight || 768;
      const margin = 8;
      state.modalPosition = {
        x: clamp(active.origin.x + event.clientX - active.x, margin - active.rect.left, width - margin - (active.rect.left + active.rect.width)),
        y: clamp(active.origin.y + event.clientY - active.y, margin - active.rect.top, height - margin - (active.rect.top + active.rect.height)),
      };
      dialog.style.transform = `translate(${state.modalPosition.x}px, ${state.modalPosition.y}px)`;
    });
    header.addEventListener('pointerup', () => { active = null; });
    header.addEventListener('pointercancel', () => { active = null; });
  }

  function createShell() {
    const host = afterNative.getHost();
    if (!host?.document?.body || state.root) return false;
    const shell = element('div', 'crypt-lord-game-shell crypt-lord-original-ui');
    shell.dataset.theme = theme();
    const left = element('section', 'crypt-lord-game-shell__left');
    const header = element('header', 'crypt-lord-game-shell__left-header');
    const identity = element('div', 'crypt-lord-game-shell__identity');
    identity.append(
      element('strong', 'crypt-lord-game-shell__character-name', '<User>'),
      element('span', 'crypt-lord-game-shell__character-sequence', '普通人'),
    );
    header.append(identity, element('span', 'crypt-lord-game-shell__drag-mark', '◆'));
    const body = element('div', 'crypt-lord-game-shell__left-body');
    left.append(header, body);
    // Drag setup reads the panel's saved inline position immediately.
    state.left = left;
    installDrag(header);

    const dock = element('div', 'crypt-lord-game-shell__dock');
    const menu = element('section', 'crypt-lord-game-shell__menu');
    menu.setAttribute('aria-label', '诡秘之主功能菜单');
    FEATURES.forEach(feature => menu.appendChild(button(feature.label, 'crypt-lord-game-shell__menu-button', () => showFeature(feature))));
    const trigger = button('◆', 'crypt-lord-game-shell__trigger', () => {
      dock.dataset.open = dock.dataset.open === 'true' ? 'false' : 'true';
    });
    trigger.title = '打开诡秘之主功能菜单';
    dock.append(menu, trigger);

    const modal = element('section', 'crypt-lord-game-shell__modal');
    modal.setAttribute('data-open', 'false');
    const dialog = element('div', 'crypt-lord-game-shell__dialog');
    const modalHeader = element('header', 'crypt-lord-game-shell__dialog-header');
    const modalTitle = element('strong', 'crypt-lord-game-shell__dialog-title', '诡秘之主');
    modalHeader.append(modalTitle, button('×', 'crypt-lord-game-shell__dialog-close', closeModal));
    const modalBody = element('div', 'crypt-lord-game-shell__dialog-body');
    dialog.append(modalHeader, modalBody);
    installModalDrag(modalHeader, dialog);
    modal.appendChild(dialog);
    modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });

    const commandLayoutValue = commandLayout();
    const commandBall = element('button', 'crypt-lord-game-shell__command-ball', '指令');
    commandBall.type = 'button';
    commandBall.title = '指令中心';
    commandBall.style.left = `${commandLayoutValue.ball.x}px`;
    commandBall.style.top = `${commandLayoutValue.ball.y}px`;
    const commandPanel = element('section', 'crypt-lord-game-shell__command-panel');
    commandPanel.dataset.open = 'false';
    commandPanel.setAttribute('aria-label', '指令中心');
    Object.assign(commandPanel.style, {
      left: `${commandLayoutValue.panel.x}px`,
      top: `${commandLayoutValue.panel.y}px`,
      width: `${commandLayoutValue.panel.width}px`,
      height: `${commandLayoutValue.panel.height}px`,
    });
    const commandHeader = element('header', 'crypt-lord-game-shell__command-header');
    commandHeader.append(
      element('strong', '', '指令中心'),
      button('×', 'crypt-lord-game-shell__dialog-close', closeCommandPanel),
    );
    commandHeader.lastChild.title = '关闭指令中心';
    const commandBody = element('div', 'crypt-lord-game-shell__command-body');
    const commandGrip = element('i', 'crypt-lord-game-shell__command-resize');
    commandGrip.title = '拖动调整窗口大小';
    commandPanel.append(commandHeader, commandBody, commandGrip);
    shell.append(left, dock, commandBall, commandPanel, modal);
    host.document.body.appendChild(shell);
    state.root = shell;
    state.leftBody = body;
    state.menu = menu;
    state.modal = modal;
    state.modalTitle = modalTitle;
    state.modalBody = modalBody;
    state.modalDialog = dialog;
    state.commandBall = commandBall;
    state.commandPanel = commandPanel;
    state.commandBody = commandBody;
    bindCommandDrag(commandHeader, commandGrip);
    clampCommandLayout();
    return true;
  }

  function displayedAssistantFallback() {
    const document = afterNative.getHost()?.document;
    const rows = Array.from(document?.querySelectorAll?.('#chat .mes[mesid], .mes[mesid]') || []);
    const assistants = rows
      .filter(row => row.getAttribute?.('is_user') === 'false' || row.dataset?.isUser === 'false')
      .map(row => ({ row, message_id: Number(row.getAttribute('mesid')) }))
      .filter(entry => Number.isInteger(entry.message_id))
      .sort((left, right) => left.message_id - right.message_id);
    const latest = assistants[assistants.length - 1];
    if (!latest) return null;
    return {
      message_id: latest.message_id,
      role: 'assistant',
      message: displayedText(afterNative.getMessageTextElement?.(latest.row) || latest.row),
      data: {},
      messageElement: afterNative.getMessageTextElement?.(latest.row) || latest.row,
    };
  }

  function displayedMessageElement(messageId) {
    if (!Number.isInteger(Number(messageId))) return null;
    const fromHost = afterNative.getMessageTextElement?.(afterNative.getDisplayedMessageElement?.(messageId));
    if (fromHost) return fromHost;
    const document = afterNative.getHost()?.document;
    const row = Array.from(document?.querySelectorAll?.('#chat .mes[mesid], .mes[mesid]') || [])
      .find(node => node.getAttribute?.('mesid') === String(messageId));
    return afterNative.getMessageTextElement?.(row) || row || null;
  }

  async function refresh() {
    if (state.disposed) return false;
    const token = ++state.refreshToken;
    const previousId = state.current?.message_id;
    const messages = await afterNative.listAssistantMessages();
    if (state.disposed || token !== state.refreshToken) return false;
    const displayed = displayedAssistantFallback();
    const stored = messages.length ? messages[messages.length - 1] : null;
    // Chat-change events can arrive before SillyTavern has hydrated getChatMessages.
    // Keep its structured data, while using the rendered assistant floor as text fallback.
    const current = stored
      ? {
        ...displayed,
        ...stored,
        message: messageText(stored) || displayed?.message || '',
        data: record(stored.data) ? stored.data : displayed?.data || {},
      }
      : displayed;
    const messageElement = displayedMessageElement(current?.message_id) || current?.messageElement || null;
    state.current = current ? { ...current, compatibility: compatibilityFor(current, messageElement) } : null;
    if (previousId !== state.current?.message_id) {
      state.mysterySummaries = null;
      state.mysteryResult = '';
      state.scrollView = 'list';
      state.scrollEditId = '';
      state.scrollDraft = null;
      state.scrollResults = null;
      state.shamanPlace = '';
      state.shamanMaterials = {};
    }
    renderLeftPanel();
    if (state.modal?.dataset.open === 'true' && state.modalTitle?.textContent === '档案详情') renderArchive();
    if (state.modal?.dataset.open === 'true' && state.modalTitle?.textContent === '人物关系') renderRelationships();
    if (state.modal?.dataset.open === 'true' && state.modalTitle?.textContent === '途径专属玩法') renderPathwayPlay();
    if (state.modal?.dataset.open === 'true' && state.modalTitle?.textContent === '战斗系统') void renderBattleSystem();
    if (state.current?.data?.stat_data && !state.pathwayPool) loadPathways();
    return Boolean(state.current);
  }

  function watchDisplayedFloors() {
    const hostDocument = afterNative.getHost()?.document;
    const chat = hostDocument?.querySelector?.('#chat');
    if (!chat || typeof MutationObserver !== 'function') return;
    let scheduled = false;
    const refreshSoon = () => {
      if (scheduled || state.disposed) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        void refresh();
      });
    };
    const observer = new MutationObserver(refreshSoon);
    observer.observe(chat, { childList: true, subtree: true, characterData: true });
    state.cleanups.push(() => observer.disconnect());
  }

  function bind(name, handler) {
    const subscription = afterNative.bindEvent(name, handler);
    if (subscription?.stop) state.subscriptions.push(subscription);
  }

  function mount() {
    if (state.disposed || !createShell()) return Boolean(state.root);
    const hostWindow = afterNative.getHost()?.window;
    if (typeof MutationObserver === 'function') {
      const themeObserver = new MutationObserver(() => {
        if (state.modal?.dataset.open !== 'true' || state.modalTitle?.textContent !== '档案详情') return;
        const canvas = state.modalBody?.querySelector?.('.crypt-lord-game-shell__archive-radar');
        const stat = state.current?.data?.stat_data;
        if (canvas && record(stat)) drawArchiveRadar(canvas, characterPanelState.archive(stat).radar);
      });
      themeObserver.observe(state.root, { attributes: true, attributeFilter: ['data-theme'] });
      state.cleanups.push(() => themeObserver.disconnect());
    }
    const openSettlementSettings = () => { void showSettings(); };
    hostWindow?.addEventListener?.('cryptLord:open-variable-settlement-settings', openSettlementSettings);
    state.cleanups.push(() => hostWindow?.removeEventListener?.('cryptLord:open-variable-settlement-settings', openSettlementSettings));
    const events = afterNative.tavernEvents();
    if (events) {
      bind(events.CHARACTER_MESSAGE_RENDERED, () => { void refresh(); });
      bind(events.MESSAGE_UPDATED, () => { void refresh(); });
      bind(events.MESSAGE_DELETED, () => { void refresh(); });
      bind(events.CHAT_CHANGED, () => {
        cancelBattleAuto();
        state.battleAutoSteps = 0;
        state.battleAutoPaused = false;
        modules[GAME_AUDIO_KEY]?.stop();
        delete state.modal?.dataset.audioActive;
        state.chatToken++;
        state.pathwayPool = null;
        state.pathwayPoolPromise = null;
        state.mysterySummaries = null;
        state.mysteryResult = '';
        state.scrollView = 'list';
        state.scrollEditId = '';
        state.scrollDraft = null;
        state.scrollResults = null;
        state.shamanPlace = '';
        state.shamanMaterials = {};
        state.arbiterDraft = null;
        state.arbiterResult = '';
        state.grazingDraft = null;
        state.grazingCandidate = '';
        state.grazingResult = '';
        state.readerDraft = null;
        state.readerCandidate = '';
        state.readerResult = '';
        state.readerEditSlot = 1;
        state.readerLearningSlot = 1;
        state.reenactDraft = null;
        state.reenactResult = '';
        state.reenactSlot = 1;
        void refresh();
      });
    }
    watchDisplayedFloors();
    void refresh();
    return true;
  }

  const api = Object.freeze({
    status() {
      return Object.freeze({ key: KEY, ready: !state.disposed && Boolean(state.root), messageId: state.current?.message_id ?? null, menuItems: FEATURES.length });
    },
    mount,
    refresh,
    openSettings: showSettings,
    dispose() {
      if (state.disposed) return true;
      cancelBattleAuto();
      modules[GAME_AUDIO_KEY]?.stop();
      state.disposed = true;
      state.subscriptions.forEach(subscription => { try { subscription.stop(); } catch { /* idempotent */ } });
      state.subscriptions = [];
      state.cleanups.forEach(cleanup => { try { cleanup(); } catch { /* idempotent */ } });
      state.cleanups = [];
      state.root?.remove?.();
      state.root = null;
      state.commandBall = null;
      state.commandPanel = null;
      state.commandBody = null;
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  mount();
})();
