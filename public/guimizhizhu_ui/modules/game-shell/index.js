(() => {
  'use strict';

  const KEY = 'cryptLord.gameShell';
  const HOST_KEY = 'cryptLord.afterNativeHost';
  const EDITOR_KEY = 'cryptLord.nativeFloorEditorUi';
  const INPUT_KEY = 'cryptLord.inputAdapter';
  const MAP_KEY = 'cryptLord.worldMap';
  const STATE_STORE_KEY = 'cryptLord.stateStore';
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
  const INVENTORY_STATE_KEY = 'cryptLord.inventoryState';
  const ABILITY_STATE_KEY = 'cryptLord.abilityState';
  const PERSONAL_BATTLE_STATE_KEY = 'cryptLord.personalBattleState';
  const TEAM_BATTLE_STATE_KEY = 'cryptLord.teamBattleState';
  const BATTLE_LIFE_SAVE_KEY = 'cryptLord.battleLifeSave';
  const GAME_AUDIO_KEY = 'cryptLord.gameAudio';
  const GAME_AUDIO_CONTROL_KEY = 'cryptLord.gameAudioControl';
  const NORMALIZER_KEY = 'cryptLord.responseNormalizer';
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
  const JOURNEY_READER_KEY = 'cryptLord.journeyReaderUi';
  const CURRENT_CLUES_KEY = 'cryptLord.currentCluesUi';
  const SAVANT_MATERIAL_UI_KEY = 'cryptLord.materialProcessingUi';
  const SAVANT_ENHANCEMENT_UI_KEY = 'cryptLord.enhancementNativeUi';
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
    Object.freeze({ id: 'journey-sequence', label: '经历序号修正', keys: [] }),
    Object.freeze({ id: 'current-clues', label: '当前线索', keys: [] }),
    Object.freeze({ id: 'world-report', label: '世界线同步报告', keys: [] }),
    Object.freeze({ id: 'cashflow', label: '钱包与稳定收支', keys: [] }),
    Object.freeze({ id: 'attribute-recalculation', label: '属性上限与重算', keys: [] }),
    Object.freeze({ id: 'npc-progression', label: 'NPC成长与初始化', keys: [] }),
    Object.freeze({ id: 'danmaku', label: '楼层弹幕', keys: [] }),
    Object.freeze({ id: 'inventory', label: '物品栏', keys: ['物品栏', '物品', '背包'] }),
    Object.freeze({ id: 'relationships', label: '人物关系', keys: ['人物关系', 'npc_data', 'NPC数据'] }),
    Object.freeze({ id: 'abilities', label: '序列能力', keys: ['序列能力列表', '能力清单'] }),
    Object.freeze({ id: 'battle', label: '战斗系统', keys: ['战斗', '战斗数据'] }),
    Object.freeze({ id: 'battle-prompt-mode', label: '战斗提示模式', keys: [] }),
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
    Object.freeze({ id: 'collection-growth', label: '变量增殖提醒', keys: [] }),
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
    commandDraft: null,
    commandCapture: null,
    current: null,
    subscriptions: [],
    cleanups: [],
    inventoryBusy: false,
    inventoryBatch: false,
    battleBusy: false,
    battleEpoch: 0,
    battleAudio: null,
    battleVolume: null,
    battleGenerating: false,
    battlePending: null,
    battleInvalid: false,
    battleWriting: false,
    teamSetupDraft: null,
    battleReportDraft: null,
    battleReportBusy: false,
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

  function updateBattleControls() {
    if (state.modalTitle?.textContent !== '战斗系统') return;
    const locked = state.battleBusy || state.battlePending || state.battleInvalid || state.battleGenerating;
    state.modal.setAttribute('aria-busy', String(state.battleBusy));
    if (locked) for (const node of state.modalBody.querySelectorAll('button, input, select, textarea'))
      if (!node.closest('[data-battle-recovery]')) node.disabled = true;
    const tools = state.modalBody.querySelector('[data-battle-recovery]');
    if (!tools) return;
    const phase = state.battlePending?.transaction.status();
    tools.querySelector('[role=status]').textContent = state.battleGenerating ? '剧情正在生成'
      : state.battleInvalid || phase === 'invalid' ? '战斗来源已变化，请重新读取'
        : phase === 'uncertain' ? '保存状态待核对'
          : state.battlePending ? '本次战斗结果待保存' : state.battleBusy ? '正在处理' : '';
    for (const node of tools.querySelectorAll('button')) {
      node.disabled = state.battleBusy || state.battleGenerating;
      if (node.dataset.recovery === 'retry') {
        node.hidden = !['pending', 'uncertain'].includes(phase) || state.battleInvalid;
        node.textContent = phase === 'uncertain' ? '核对保存' : '重试保存';
      }
      if (node.dataset.recovery === 'cancel') {
        node.hidden = !state.battleBusy || Boolean(state.battlePending);
        node.disabled = state.battleWriting;
      }
    }
  }

  async function resumeBattleSave() {
    const pending = state.battlePending;
    if (!pending || state.battleBusy || state.battleGenerating || state.battleInvalid) return;
    state.battleBusy = true; state.battleWriting = true; updateBattleControls();
    try {
      const result = await (pending.transaction.status() === 'uncertain'
        ? pending.transaction.inspect() : pending.transaction.save());
      if (pending.guard()) pending.finish(result);
    } catch (error) {
      if (pending.guard()) {
        state.battleInvalid = pending.transaction.status() === 'invalid';
        notify(error.message, 'error');
      }
    } finally {
      if (pending.guard()) {
        state.battleBusy = false; state.battleWriting = false;
        void renderBattleSystem();
      }
    }
  }

  function renderBattleRecovery() {
    const tools = element('div', 'crypt-lord-game-shell__battle-recovery');
    tools.dataset.battleRecovery = '';
    const status = element('span'); status.setAttribute('role', 'status');
    const retry = button('重试保存', 'crypt-lord-game-shell__dialog-button', () => void resumeBattleSave());
    retry.dataset.recovery = 'retry';
    const reload = button('重新读取', 'crypt-lord-game-shell__dialog-button', async () => {
      if (state.battleBusy || state.battleGenerating) return;
      const view = afterNative.getHost()?.window || window;
      if (state.battlePending && !view.confirm('放弃当前保留的战斗结果并重新读取原生楼层？')) return;
      state.battleEpoch++; state.battlePending = null; state.battleInvalid = false;
      state.battleAutoPaused = true; cancelBattleAuto();
      await refresh();
    });
    const cancel = button('取消', 'crypt-lord-game-shell__dialog-button', () => {
      if (!state.battleBusy || state.battleWriting) return;
      state.battleEpoch++; state.battleBusy = false; state.battlePending = null;
      state.battleAutoPaused = true; cancelBattleAuto();
      notify('战斗操作已取消。');
      void renderBattleSystem();
    });
    cancel.dataset.recovery = 'cancel';
    tools.append(status, retry, reload, cancel);
    state.modalBody.prepend(tools);
    updateBattleControls();
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

  function battleLocked(data) {
    const team = data?.cryptLord?.teamBattle, personal = data?.cryptLord?.personalBattle;
    return team?.status === 'active' || ['finished', 'ended'].includes(team?.status) && !team.settled ||
      personal?.status === 'active' || personal?.status === 'finished' &&
      personal.result === 'victory' && Boolean(personal.enemy?.npcKey) && !personal.experienceClaimed;
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
    const normalizer = modules[NORMALIZER_KEY];
    const raw = messageText(message), rendered = displayedText(messageElement);
    const storedText = normalizer?.maskHidden?.(raw) ?? raw;
    const renderedText = raw.trim() ? '' : normalizer?.maskHidden?.(rendered) ?? rendered;
    const journey = journeyFromText(storedText) || journeyFromText(renderedText);
    const actions = normalizer?.extractLegacyActions?.(raw.trim() ? raw : renderedText, raw.trim() ? null : messageElement) || [];
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
    if (messageText(current).trim()) return modules[NORMALIZER_KEY]?.actionsForFloor?.(current) || [];
    return current?.compatibility?.actions || [];
  }

  function theme() {
    const appearance = modules['cryptLord.appearanceUi'];
    if (appearance) return appearance.current().theme;
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
    if (modules['cryptLord.battlePlayUnits'] && !state.pathwayPool) {
      const token = state.chatToken, messageId = state.current?.message_id;
      loadPathways();
      await state.pathwayPoolPromise;
      if (state.disposed || token !== state.chatToken || messageId !== state.current?.message_id ||
        state.modal?.dataset.open !== 'true' || state.modalTitle?.textContent !== '战斗系统') return;
    }
    const hostWindow = afterNative.getHost()?.window || window;
    const gameAudio = modules[GAME_AUDIO_KEY];
    const gameAudioControl = modules[GAME_AUDIO_CONTROL_KEY];
    if (gameAudioControl && !state.battleVolume) {
      state.battleVolume = gameAudioControl.create(afterNative.getHost()?.document || document, 'duel');
      state.modalTitle.parentNode.insertBefore(state.battleVolume, state.modalTitle.nextSibling);
    }
    if (state.battleVolume) state.battleVolume.hidden = false;
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
      state.battleAudio ||= gameAudio.createScene(() => state.modal);
      const inBattle = battle?.status === 'active' || activeTeam?.status === 'active';
      state.battleAudio.enter(inBattle ? 'battle' : 'prep', 'duel');
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
    const activeAutoKind = data => data?.cryptLord?.teamBattle?.status === 'active'
      ? 'teamBattle' : 'personalBattle';
    const scheduleAuto = () => {
      cancelBattleAuto();
      const kind = activeAutoKind(state.current?.data);
      const current = kind === 'teamBattle' ? teamBattleState?.get(state.current?.data)
        : personalBattleState.get(state.current?.data);
      if (state.disposed || state.battlePending || state.battleInvalid || state.battleGenerating ||
        state.modal?.dataset.open !== 'true' ||
        state.modalTitle?.textContent !== '战斗系统' || current?.status !== 'active' ||
        !current.autoPilot?.on || state.battleAutoPaused || state.battleAutoSteps >= 40) return;
      const token = state.chatToken;
      const messageId = state.current.message_id;
      const battleId = current.id;
      state.battleAutoTimer = setTimeout(() => {
        state.battleAutoTimer = null;
        if (state.disposed || token !== state.chatToken ||
          messageId !== state.current?.message_id ||
          battleId !== state.current?.data?.cryptLord?.[kind]?.id ||
          !state.current.data.cryptLord[kind].autoPilot?.on ||
          state.modal?.dataset.open !== 'true' ||
          state.modalTitle?.textContent !== '战斗系统') return;
        state.battleAutoSteps += 1;
        void commitBattle(data => {
          if (data.cryptLord?.[kind]?.id !== battleId ||
            !data.cryptLord[kind].autoPilot?.on)
            return { ok: false, error: '战斗或托管状态已变化。' };
          if (kind === 'teamBattle')
            return modules['cryptLord.battleAutoPilot']?.step(data) ||
              { ok: false, error: '多人托管模块不可用。' };
          const action = personalBattleState.autoPilotAction(data);
          if (!action) return { ok: false, error: '当前没有可托管的行动。' };
          return action.type === 'move'
            ? personalBattleState.move(data, action.x, action.y)
            : personalBattleState.act(data, action);
        }, true, true);
      }, 450);
    };
    const commitBattle = async (operation, sound = false, automatic = false) => {
      if (state.battleBusy || state.battlePending || state.battleInvalid ||
        !Number.isInteger(state.current?.message_id)) return;
      if (state.battleGenerating) { notify('剧情正在生成，请结束后再操作战斗。', 'warning'); return; }
      cancelBattleAuto();
      state.battleBusy = true;
      updateBattleControls();
      let succeeded = false;
      const token = state.chatToken;
      const epoch = state.battleEpoch;
      const messageId = state.current.message_id;
      const guard = () => !state.disposed && token === state.chatToken &&
        epoch === state.battleEpoch && !state.battleGenerating &&
        state.current?.message_id === messageId && state.modal?.dataset.open === 'true' &&
        state.modalTitle?.textContent === '战斗系统';
      try {
        if (!guard()) throw new DOMException('战斗操作已取消。', 'AbortError');
        const before = structuredClone(state.current.data);
        const autoKind = activeAutoKind(before);
        const session = modules['cryptLord.battleSession'];
        const transaction = await session.transaction(state.current, guard);
        const finish = result => {
          if (!guard()) return;
          state.current.data = result.data;
          if (result.pathwayPool) state.pathwayPool = result.pathwayPool;
          if (result.teamConfiguration && state.teamSetupDraft?.token === token &&
            state.teamSetupDraft.messageId === messageId) {
            state.teamSetupDraft.configuration = structuredClone(result.teamConfiguration);
            state.teamSetupDraft.expected = structuredClone(result.teamConfiguration);
            state.teamSetupDraft.error = '';
          }
          state.battlePending = null;
          state.battleInvalid = false;
          if (sound || result.data?.cryptLord?.[autoKind]?.units)
            state.battleAudio?.playHits(before?.cryptLord?.[autoKind],
            result.data?.cryptLord?.[autoKind]);
          root.__stage1Modules?.[VARIABLE_WORKBENCH_KEY]?.notifyUpdate?.({
            messageId, beforeData: before, afterData: result.data,
            source: result.data?.cryptLord?.teamBattle
              ? 'team-battle' : 'personal-battle',
          });
          renderLeftPanel();
          if (result.warning) notify(result.warning, 'warning');
        };
        const recovery = { transaction, guard, finish };
        try {
          const result = await transaction.run(async (data, evidence, valid, assertCurrent) => {
            const result = await operation(data, evidence, valid, assertCurrent);
            if (!guard()) throw new DOMException('战斗操作已取消。', 'AbortError');
            if (automatic && !state.current?.data?.cryptLord?.[autoKind]?.autoPilot?.on)
              throw Error('托管已停止。');
            state.battleWriting = result?.ok && result.changed !== false;
            updateBattleControls();
            return result;
          });
          finish(result);
        } catch (error) {
          if (guard()) {
            const phase = transaction.status();
            state.battleInvalid = phase === 'invalid';
            if (['pending', 'uncertain', 'invalid'].includes(phase)) state.battlePending = recovery;
          }
          throw error;
        }
        succeeded = true;
      } catch (error) {
        if (automatic && guard()) state.battleAutoPaused = true;
        if (guard()) notify(`战斗操作失败：${error?.message || error}`, 'error');
      } finally {
        if (guard()) {
          state.battleBusy = false;
          state.battleWriting = false;
          renderPersonalBattle();
          if (automatic && state.battleAutoSteps >= 40) {
            state.battleAutoPaused = true;
            notify('托管已暂停：连续执行达到 40 步，请手动关闭后重新开启。', 'warning');
          } else if (succeeded && (automatic ||
            state.current?.data?.cryptLord?.[activeAutoKind(state.current?.data)]?.autoPilot?.on)) {
            scheduleAuto();
          }
        }
      }
    };
    const prepareBattle = (data, options, evidence, guard, assertCurrent) => {
      const session = modules['cryptLord.battleSession'];
      if (!session) throw Error('原版战斗准备模块未加载。');
      return session.prepare(data, options, { evidence, guard, notify, assertCurrent });
    };
    const team = teamBattleState?.get(state.current?.data);
    if (lifeSave) {
      const activePlayer = team?.status === 'active'
        ? team.units.find(unit => unit.source === 'player')
        : battle?.status === 'active' ? battle.player : null;
      const current = activePlayer?.lifeSave;
      const eligibility = current || lifeSave.eligibility(stat.当前序列,
        stat.当前途径 ?? stat.途径 ?? stat.pathway ?? stat.所属途径, battle?.lifeSaveTable,
        state.pathwayPool?.pathways);
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
    teamSession.appendChild(element('div', 'crypt-lord-game-shell__battle-heading',
      team?.mode === 'duel' ? '个人对局' : team?.mode === 'practice' ? '训练对局' : '原版战斗'));
    if (!team || team.status === 'finished') {
      const builder = modules['cryptLord.battleTeamBuilder'];
      const pool = state.pathwayPool || {};
      const messageId = state.current?.message_id, token = state.chatToken;
      if (!builder) {
        teamSession.appendChild(element('p', 'crypt-lord-game-shell__empty', '组队模块未加载，不能开始多人战斗。'));
        body.appendChild(teamSession);
        return;
      }
      if (!state.teamSetupDraft || state.teamSetupDraft.token !== token ||
        state.teamSetupDraft.messageId !== messageId) {
        let configuration, error = '';
        try { configuration = builder.load(state.current?.data); }
        catch (failure) { configuration = builder.defaults(); error = failure.message; }
        state.teamSetupDraft = { token, messageId, configuration, error, query: '',
          expected: structuredClone(state.current?.data?.cryptLord?.teamComposition) };
      }
      const draft = state.teamSetupDraft;
      if (JSON.stringify(state.current?.data?.cryptLord?.teamComposition) ===
        JSON.stringify(draft.configuration)) {
        draft.expected = structuredClone(state.current.data.cryptLord.teamComposition);
        draft.error = '';
      }
      const setup = element('section', 'crypt-lord-game-shell__team-builder');
      const toolbar = element('div', 'crypt-lord-game-shell__team-toolbar');
      const search = element('input', 'crypt-lord-game-shell__settings-input');
      search.type = 'search'; search.placeholder = '搜索角色';
      search.setAttribute('aria-label', '搜索组队角色'); search.value = draft.query;
      toolbar.appendChild(search);
      const status = element('p', 'crypt-lord-game-shell__team-status');
      status.setAttribute('role', 'status');
      const layout = element('div', 'crypt-lord-game-shell__team-builder-layout');
      const candidates = element('div', 'crypt-lord-game-shell__team-pool');
      const selected = element('div', 'crypt-lord-game-shell__team-selected');
      layout.append(candidates, selected);
      const assign = (member, side) => {
        if (state.battleBusy) return;
        try { draft.configuration = builder.edit(draft.configuration, member, side); renderSetup(); }
        catch (error) { notify(error.message, 'warning'); }
      };
      const smallIcon = (symbol, title, command) => {
        const control = button(symbol, 'crypt-lord-game-shell__team-icon', command);
        control.title = title; control.setAttribute('aria-label', title);
        return control;
      };
      const renderSetup = () => {
        clear(candidates); clear(selected);
        const resolved = builder.resolve(state.current?.data, pool, draft.configuration);
        const changedOutside = JSON.stringify(state.current?.data?.cryptLord?.teamComposition) !==
          JSON.stringify(draft.expected);
        status.textContent = draft.error || (changedOutside ? '楼层编队已变化，请重新读取编队。' :
          resolved.missing.length ? `不可用成员 ${resolved.missing.length} 名，请移除或恢复其来源。` :
          JSON.stringify(draft.configuration) === JSON.stringify(draft.expected || builder.defaults())
            ? '编队已保存' : '编队未保存');
        status.dataset.warning = String(Boolean(draft.error || changedOutside || resolved.missing.length));
        const filtered = builder.filter(resolved.rows, draft.query);
        if (!filtered.length) candidates.appendChild(element('p', 'crypt-lord-game-shell__empty', '没有匹配角色'));
        for (const row of filtered) {
          const member = row.descriptor;
          const card = element('article', 'crypt-lord-game-shell__team-candidate');
          card.dataset.source = member.dataSource; card.dataset.name = member.name;
          const heading = element('div', 'crypt-lord-game-shell__team-candidate-heading');
          heading.append(element('strong', '', row.name), element('span', '', row.label));
          if (member.dataSource === 'npc') {
            const pin = smallIcon(row.important ? '★' : '☆', `标记重要 ${row.name}`, () => {
              void commitBattle(data => builder.important(data, member.name));
            });
            pin.setAttribute('aria-pressed', String(row.important));
            pin.disabled = state.battleBusy;
            heading.appendChild(pin);
          }
          card.append(heading, element('p', 'crypt-lord-game-shell__muted', row.sequence));
          const stats = element('dl', 'crypt-lord-game-shell__team-stats');
          row.stats.forEach(value => stats.append(element('dt', '', value.stat),
            element('dd', '', value.stat === '运气' ? String(value.maximum ?? '-')
              : `${value.current ?? '-'}/${value.maximum ?? '-'}${value.percent == null ? '' : ` (${value.percent}%)`}`)));
          card.appendChild(stats);
          if (member.dataSource === 'player') card.appendChild(element('span', 'crypt-lord-game-shell__muted', '我方本体'));
          else {
            const sides = element('div', 'crypt-lord-game-shell__team-sides');
            for (const [side, text, sideKey] of [['ally', '我方', 'allyTeam'], ['enemy', '敌方', 'enemyTeam']]) {
              const label = element('label', 'crypt-lord-game-shell__team-option');
              const checkbox = element('input');
              checkbox.type = 'checkbox'; checkbox.value = row.key; checkbox.dataset.side = side;
              checkbox.checked = draft.configuration[sideKey].some(item =>
                builder.identity(item) === builder.identity(member));
              checkbox.disabled = !row.available || state.battleBusy;
              checkbox.setAttribute('aria-label', `${text} ${row.label} ${row.name}`);
              checkbox.addEventListener('change', () => assign(member, checkbox.checked ? sideKey : null));
              label.append(checkbox, element('span', '', text)); sides.appendChild(label);
            }
            card.appendChild(sides);
          }
          if (!row.available) card.appendChild(element('p', 'crypt-lord-game-shell__muted', row.reason));
          candidates.appendChild(card);
        }
        for (const [key, text] of [['allyTeam', '我方'], ['enemyTeam', '敌方']]) {
          const section = element('section', 'crypt-lord-game-shell__team-members');
          section.dataset.side = key;
          section.appendChild(element('h4', '', `${text} · ${draft.configuration[key].length}/60`));
          if (!draft.configuration[key].length)
            section.appendChild(element('p', 'crypt-lord-game-shell__muted', '暂无成员'));
          for (const member of draft.configuration[key]) {
            const row = resolved.rows.find(item => builder.identity(item.descriptor) === builder.identity(member));
            const line = element('div', 'crypt-lord-game-shell__team-member');
            const description = element('div');
            description.append(element('strong', '', row?.name || member.name),
              element('span', 'crypt-lord-game-shell__muted',
                `${row?.label || member.dataSource} · ${row?.sequence || '来源不可用'}`));
            if (!row?.available) description.appendChild(element('span', 'crypt-lord-game-shell__team-unavailable',
              row?.reason || '记录已删除或途径资格未开启'));
            line.appendChild(description);
            if (member.dataSource !== 'player') {
              const remove = smallIcon('×', `移除${text} ${row?.name || member.name}`, () => assign(member, null));
              remove.disabled = state.battleBusy; line.appendChild(remove);
            }
            section.appendChild(line);
          }
          selected.appendChild(section);
        }
        launch.disabled = state.battleBusy || Boolean(draft.error) || changedOutside ||
          resolved.missing.length > 0 || resolved.enemies.length === 0 ||
          personalBattleState.get(state.current?.data)?.status === 'active' ||
          Boolean(personalBattleState.experiencePreview(state.current?.data)) ||
          team?.status === 'finished' && !team.settled;
      };
      search.addEventListener('input', () => { draft.query = search.value; renderSetup(); });
      toolbar.append(
        button('保存编队', 'crypt-lord-game-shell__button', () => {
          if (draft.error) { notify(draft.error, 'warning'); return; }
          void commitBattle(data => builder.save(data, pool, draft.configuration, draft.expected));
        }),
        button('重新读取编队', 'crypt-lord-game-shell__button', () => {
          if (state.battleBusy) return;
          state.teamSetupDraft = null;
          void contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 }).then(async store => {
            const fresh = await store.readMessage(messageId);
            if (state.disposed || state.chatToken !== token || state.current?.message_id !== messageId ||
              state.modal?.dataset.open !== 'true' || state.modalTitle?.textContent !== '战斗系统') return;
            if (fresh?.role !== 'assistant') throw Error('目标楼层不再是assistant。');
            state.current = fresh; void renderBattleSystem();
          }).catch(error => notify(error.message, 'error'));
        }),
        button('清空编队', 'crypt-lord-game-shell__button', () => {
          if (state.battleBusy || !hostWindow.confirm('清空已保存编队？本体仍保留在我方。')) return;
          void commitBattle(data => builder.save(data, pool, builder.defaults(), draft.expected));
        }),
        button('导入原版旧编队', 'crypt-lord-game-shell__button', () => {
          if (state.battleBusy) return;
          try {
            const raw = hostWindow.localStorage.getItem('battle-team-composition');
            if (!raw) throw Error('此浏览器没有原版旧编队。');
            draft.configuration = builder.importLegacy(raw);
            draft.error = ''; renderSetup();
          } catch (error) { notify(error.message, 'warning'); }
        }),
        button('刷新序列能力', 'crypt-lord-game-shell__button', () => {
          void commitBattle(async (data, _evidence, guard) => {
            const refreshedPool = await abilityState.loadPool(guard);
            const result = abilityState.synchronize(data, refreshedPool, abilityLocked());
            modules[IMAGINATION_KEY]?.sync(result.data, refreshedPool, abilityLocked());
            modules[READER_MYSTIC_KEY]?.sync(result.data, refreshedPool, abilityLocked());
            modules[REENACTMENT_KEY]?.sync(result.data, refreshedPool, abilityLocked());
            return { ok: true, data: result.data,
              pathwayPool: refreshedPool,
              rulePool: abilityState.assertPool ? refreshedPool : undefined,
              changed: JSON.stringify(data) !== JSON.stringify(result.data) };
          });
        }),
      );
      setup.append(toolbar, status, layout);
      teamSession.appendChild(setup);
      const launch = button('开始多人战斗', 'crypt-lord-game-shell__button is-primary', () => {
        if (draft.error) { notify(draft.error, 'warning'); return; }
        const requested = structuredClone(draft.configuration);
        void commitBattle(async (data, evidence, guard, assertCurrent) => {
          const saved = builder.save(data, pool, requested, draft.expected);
          const resolved = builder.resolve(saved.data, pool, requested);
          const allyKeys = resolved.allies, enemyKeys = resolved.enemies;
          data = saved.data;
          return prepareBattle(data, { allies: allyKeys, enemies: enemyKeys,
            summonPool: state.pathwayPool }, evidence, guard, assertCurrent);
        });
      });
      renderSetup();
      teamSession.appendChild(launch);
      if (team?.status === 'finished') {
        teamSession.appendChild(element('p', 'crypt-lord-game-shell__battle-result',
          `上一场：${({ victory: '胜利', defeat: '失败', draw: '平局' })[team.result] || team.result}`));
        const summary = teamBattleState.report(state.current?.data);
        const report = element('div', 'crypt-lord-game-shell__battle-log');
        for (const unit of team.units.filter(row => !row.isSummon)) report.appendChild(element('p', '',
          `${unit.name} · ${unit.side === 'ally' ? '我方' : '敌方'} · 活力 ${unit.hp}/${unit.maxHp} · 输出 ${unit.damage} · 治疗 ${unit.healing} · 击倒 ${unit.kills}${unit.lifeSave?.hasStrong || unit.lifeSave?.hasWeak ? ` · 保命已用 强 ${unit.lifeSave.strongUsed}/1 · 弱 ${unit.lifeSave.weakUsed}/3` : ''}`));
        report.appendChild(element('p', '', `经验池 ${summary?.experience?.pool || 0}`));
        teamSession.appendChild(report);
        const playOutcomes = modules['cryptLord.battlePlayUnits']?.preview(team) || [];
        if (playOutcomes.length) {
          const losses = element('div', 'crypt-lord-game-shell__play-settlement');
          losses.appendChild(element('h4', '', '专属单位结算'));
          if (team.settled && !team.accepted) losses.appendChild(element('p', '', '已放弃，袋内记录保持不变。'));
          else if (team.settled) {
            for (const text of team.playSettlement || [])
              losses.appendChild(element('p', '', text));
            if (!team.playSettlement?.length) losses.appendChild(element('p', '', '袋内记录无变更。'));
          } else {
            for (const row of playOutcomes) losses.appendChild(element('p', '',
              `${row.name} · 活力 ${row.hp}/${row.maxHp} · ${row.outcome}`));
          }
          teamSession.appendChild(losses);
        }
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
        const battleReporter = modules['cryptLord.battleReport'];
        if (battleReporter) {
          const draftKey = `${state.chatToken}:${state.current.message_id}:${team.id}`;
          if (state.battleReportDraft?.key !== draftKey)
            state.battleReportDraft = { key: draftKey, spared: [], detailed: false };
          const draft = state.battleReportDraft;
          const section = element('section', 'crypt-lord-game-shell__battle-report');
          section.appendChild(element('h4', '', '战斗报告'));
          const modes = element('div', 'crypt-lord-game-shell__battle-report-tabs');
          modes.setAttribute('role', 'tablist');
          const preview = element('textarea', 'crypt-lord-game-shell__battle-report-text');
          preview.readOnly = true;
          preview.setAttribute('aria-label', '战斗报告正文');
          const refreshReport = () => {
            const result = battleReporter.build(state.current.data, draft.spared, draft.detailed);
            preview.value = result.ok ? result.text : result.error;
            preview.dataset.legacy = String(Boolean(result.legacy));
            for (const tab of modes.children)
              tab.setAttribute('aria-selected', String(tab.dataset.detailed === String(draft.detailed)));
          };
          for (const [label, detailed] of [['简报', false], ['详细记录', true]]) {
            const tab = button(label, '', () => { draft.detailed = detailed; refreshReport(); });
            tab.dataset.detailed = String(detailed);
            tab.setAttribute('role', 'tab');
            modes.appendChild(tab);
          }
          section.appendChild(modes);
          const choices = battleReporter.mercyChoices(team);
          if (choices.length) {
            const mercy = element('fieldset', 'crypt-lord-game-shell__battle-report-mercy');
            mercy.appendChild(element('legend', '', '手下留情'));
            for (const choice of choices) {
              const label = element('label');
              const check = element('input');
              check.type = 'checkbox';
              check.checked = draft.spared.includes(choice.id);
              check.addEventListener('change', () => {
                draft.spared = check.checked ? [...draft.spared, choice.id]
                  : draft.spared.filter(id => id !== choice.id);
                refreshReport();
              });
              label.append(check, element('span', '', choice.name));
              mercy.appendChild(label);
            }
            section.appendChild(mercy);
          }
          if (!team.reportState || team.reportState.legacy) section.appendChild(element('p',
            'crypt-lord-game-shell__battle-hint', '旧战斗仅保留现有日志，早期记录无法补回。'));
          const exportReport = button('填入原生输入框',
            'crypt-lord-game-shell__button is-primary', async () => {
              if (state.battleReportBusy || state.battleBusy) return;
              state.battleReportBusy = true;
              exportReport.disabled = true;
              const token = state.chatToken, messageId = state.current.message_id;
              try {
                const [store, adapter] = await Promise.all([
                  contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 }),
                  contract.waitGlobalInitialized(INPUT_KEY, { timeoutMs: 10000 }),
                ]);
                const sameView = () => !state.disposed && token === state.chatToken &&
                  messageId === state.current?.message_id &&
                  state.current?.data?.cryptLord?.teamBattle?.id === team.id &&
                  state.modal?.dataset.open === 'true' &&
                  state.modalTitle?.textContent === '战斗系统';
                const message = await store.readMessage(messageId);
                const freshBattle = message?.data?.cryptLord?.teamBattle;
                if (!sameView() || message?.role !== 'assistant' ||
                  freshBattle?.id !== team.id || !freshBattle.settled || !freshBattle.accepted)
                  throw Error('楼层或结算状态已变化，请重新打开战斗系统。');
                const built = battleReporter.build(message.data, draft.spared, false);
                if (!built.ok) throw Error(built.error);
                const composer = afterNative.getHost()?.document?.querySelector('#send_textarea');
                if (!composer || !adapter?.setInputText) throw Error('未找到酒馆原生输入框。');
                const previous = composer.value;
                if (previous.trim() && previous !== built.text &&
                  !window.confirm('原生输入框已有内容，是否替换为本场战报？')) return;
                const reread = await store.readMessage(messageId);
                if (!sameView() || JSON.stringify(reread) !== JSON.stringify(message) ||
                  composer !== afterNative.getHost()?.document?.querySelector('#send_textarea') ||
                  composer.value !== previous)
                  throw Error('楼层或输入框已变化，未覆盖内容，请重试。');
                if (adapter.setInputText(built.text, 'sillytavern-native') === false)
                  throw Error('原生输入框写入失败。');
                notify('战报已填入原生输入框。', 'success');
              } catch (error) {
                notify(`战报输出失败：${error?.message || error}`, 'error');
              } finally {
                state.battleReportBusy = false;
                exportReport.disabled = !team.settled || !team.accepted;
              }
            });
          exportReport.disabled = state.battleBusy || state.battleReportBusy ||
            !team.settled || !team.accepted;
          section.append(preview, exportReport);
          refreshReport();
          teamSession.appendChild(section);
        }
      }
    } else {
      const actor = team.units.find(unit => unit.id === team.queue[team.index]);
      const teamAuto = modules['cryptLord.battleAutoPilot'];
      const teamAutoOn = Boolean(teamAuto?.isOn(team));
      const autoDrives = teamAuto?.drives(team, actor);
      if (teamAuto) {
        const autoControl = element('label', 'crypt-lord-game-shell__battle-auto');
        const autoToggle = element('input');
        autoToggle.type = 'checkbox';
        autoToggle.setAttribute('aria-label', team.mode === 'duel' || team.mode === 'practice'
          ? '托管个人对局' : '托管多人战斗');
        autoToggle.checked = teamAutoOn;
        autoToggle.disabled = state.battleBusy;
        autoToggle.addEventListener('change', () => {
          cancelBattleAuto();
          state.battleAutoSteps = 0;
          state.battleAutoPaused = false;
          void commitBattle(data => teamAuto.set(data, autoToggle.checked));
        });
        autoControl.append(autoToggle, element('span', '', '托管本场战斗'));
        teamSession.appendChild(autoControl);
        if (teamAutoOn && state.battleAutoPaused) teamSession.appendChild(element('span',
          'crypt-lord-game-shell__battle-hint', '托管已暂停，请关闭后重新开启'));
      }
      const extraSlot = modules['cryptLord.battleExtraAction']?.currentSlot(team);
      const hardOccupied = modules['cryptLord.battleHardControl']?.occupied(team,
        team.units.find(unit => unit.source === 'player'));
      teamSession.appendChild(element('p', 'crypt-lord-game-shell__battle-turn',
        `第 ${team.round} 回合 · ${team.phase === 'tactic' ? '战术阶段' : `行动：${extraSlot?.extra ? extraSlot.alias : actor?.name || '未知'}`}`));
      if (team.turnSlots?.some(slot => slot.extra)) {
        const order = element('p', 'crypt-lord-game-shell__battle-slot-order');
        order.textContent = team.turnSlots.map((slot, index) => {
          const label = slot.extra ? slot.alias : team.units.find(unit => unit.id === slot.heroId)?.name;
          return `${index === team.index ? '当前 · ' : ''}${label}${slot.voided ? '（作废）' : index < team.index ? '（已行动）' : ''}`;
        }).join(' → ');
        teamSession.appendChild(order);
      }
      const overview = element('div', 'crypt-lord-game-shell__battle-overview');
      const formulas = team.formulas?.version === 1 && modules['cryptLord.battleFormulas'];
      for (const unit of team.units) {
        if (unit.dismissed) continue;
        const card = element('article', 'crypt-lord-game-shell__battle-unit');
        if (unit.playRecord) card.appendChild(element('span',
          'crypt-lord-game-shell__battle-field-status',
          `${({ clone: '袋内分身', puppet: '袋内秘偶', 'savant-construct': '长期造物' })[unit.playRecord.source]} · ${(unit.controller || unit.source) === 'player' ? '玩家操控' : '非玩家操控'}`));
        card.append(element('strong', '', `${unit.side === 'ally' ? '我方' : '敌方'} · ${unit.name}`),
          element('span', '', `活力 ${unit.hp}/${unit.maxHp} · 灵性 ${unit.spirit}/${unit.maxSpirit} · 理智 ${unit.sanity}/${unit.maxSanity} · (${unit.x}, ${unit.y})`));
        if (unit.isSummon) card.appendChild(element('span', '',
          `${unit.summonSubtype} · ${unit.picturePersonImmobile ? '固定位置 · ' : ''}${Number.isFinite(unit.summonUntil) ? `第 ${unit.summonUntil} 回合消散` : '随召唤者存续'}`));
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
        const effects = (unit.effects || []).filter(effect => !effect.auraEffect && !effect.fieldEffect &&
          !effect.resourceStatus &&
          !effect.mythicForm && !effect.canonMythicForm && !(team.environmentMeta && effect.environment));
        if (effects.length) {
          const state = element('span', 'crypt-lord-game-shell__battle-effect-lifecycle',
            effects.map(effect => `${effect.passive ? '被动 · ' : ''}${effect.name} ${effect.power}${effect.valueType === 'fixed' ? ' 点' : '%'} · ${effect.battlePersistent ? '整场' : effect.terrainEffect ? `${effect.type === 'regen' ? '恢复' : effect.type === 'poison' ? '损伤' : effect.type === 'buff' ? '增益' : '减益'} / ${effect.duration} 次结算` : `${effect.duration} 回合`}`).join('、'));
          state.title = modules['cryptLord.battleEffects']?.describe(unit).join('\n') || '';
          card.appendChild(state);
        }
        for (const line of modules['cryptLord.battleTerrainEffects']?.describe(team, unit) || [])
          card.appendChild(element('span', 'crypt-lord-game-shell__battle-terrain-status', line));
        for (const line of modules['cryptLord.battleResourceStatus']?.statusLines(team, unit) || [])
          card.appendChild(element('span', 'crypt-lord-game-shell__battle-resource-status', line));
        for (const line of modules['cryptLord.battleSkillControl']?.statusLines(team, unit) || [])
          card.appendChild(element('span', 'crypt-lord-game-shell__battle-field-status', line));
        for (const line of modules['cryptLord.battleAuras']?.statusLines(team, unit) || [])
          card.appendChild(element('span', 'crypt-lord-game-shell__battle-aura-status', line));
        for (const line of modules['cryptLord.battleFieldEffects']?.statusLines(team, unit) || [])
          card.appendChild(element('span', 'crypt-lord-game-shell__battle-field-status', line));
        for (const line of modules['cryptLord.battleEffectTransfer']?.statusLines(team, unit) || [])
          card.appendChild(element('span', 'crypt-lord-game-shell__battle-field-status', line));
        for (const line of modules['cryptLord.battleBribery']?.statusLines(team, unit) || [])
          card.appendChild(element('span', 'crypt-lord-game-shell__battle-field-status', line));
        for (const line of modules['cryptLord.battleBalance']?.statusLines(team, unit) || [])
          card.appendChild(element('span', 'crypt-lord-game-shell__battle-field-status', line));
        for (const line of modules['cryptLord.battlePunishment']?.statusLines(team, unit) || [])
          card.appendChild(element('span', 'crypt-lord-game-shell__battle-field-status', line));
        for (const line of modules['cryptLord.battleMythicForm']?.statusLines(team, unit) || [])
          card.appendChild(element('span', 'crypt-lord-game-shell__battle-field-status', line));
        for (const line of modules['cryptLord.battleExile']?.statusLines(team, unit) || [])
          card.appendChild(element('span', 'crypt-lord-game-shell__battle-field-status', line));
        for (const line of modules['cryptLord.battleActiveLeave']?.statusLines(team, unit) || [])
          card.appendChild(element('span', 'crypt-lord-game-shell__battle-field-status', line));
        for (const line of modules['cryptLord.battleRewind']?.statusLines(team, unit) || [])
          card.appendChild(element('span', 'crypt-lord-game-shell__battle-field-status', line));
        for (const line of modules['cryptLord.battleExtraAction']?.statusLines(team, unit) || [])
          card.appendChild(element('span', 'crypt-lord-game-shell__battle-field-status', line));
        for (const line of modules['cryptLord.battleHardControl']?.statusLines(team, unit) || [])
          card.appendChild(element('span', 'crypt-lord-game-shell__battle-field-status', line));
        for (const line of modules['cryptLord.battleMindDeprive']?.statusLines(team, unit) || [])
          card.appendChild(element('span', 'crypt-lord-game-shell__battle-field-status', line));
        for (const line of modules['cryptLord.battleTempControl']?.statusLines(team, unit) || [])
          card.appendChild(element('span', 'crypt-lord-game-shell__battle-field-status', line));
        for (const line of modules['cryptLord.battlePermanentControl']?.statusLines(team, unit) || [])
          card.appendChild(element('span', 'crypt-lord-game-shell__battle-field-status', line));
        for (const line of modules['cryptLord.battlePossession']?.statusLines(team, unit) || [])
          card.appendChild(element('span', 'crypt-lord-game-shell__battle-field-status', line));
        for (const line of modules['cryptLord.battleRuleChange']?.statusLines(team, unit) || [])
          card.appendChild(element('span', 'crypt-lord-game-shell__battle-field-status', line));
        for (const line of modules['cryptLord.battleEnvironment']?.statusLines(team, unit) || [])
          card.appendChild(element('span', 'crypt-lord-game-shell__battle-field-status', line));
        if (unit.tags?.length) {
          const tagService = modules['cryptLord.battleTags'];
          const tags = element('span', 'crypt-lord-game-shell__battle-tags',
            (tagService?.describe(unit) || unit.tags.map(tag =>
              `${tag.name} ×${tag.stacks} · ${tag.duration} 回合`)).join('、'));
          tags.title = tagService?.describeSources(unit) || '';
          card.appendChild(tags);
        }
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
          toggle.disabled = state.battleBusy || hardOccupied || team.phase !== 'tactic' ||
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
      const reachable = new Set((autoDrives ? [] : teamBattleState.reachable(state.current?.data))
        .map(cell => `${cell.x},${cell.y}`));
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
        cell.dataset.x = String(x);
        cell.dataset.y = String(y);
        cell.title = occupied ? `${occupied.name} · ${occupied.hp}/${occupied.maxHp}` :
          tile ? `${tile.name}${tile.duration == null ? '' : Number(tile.duration) === 0 ? ' · 永久' : ` · ${tile.duration} 回合`}` :
            `${team.board.base?.name || '平地'} (${x}, ${y})`;
        const terrainDetails = modules['cryptLord.battleTerrainEffects']
          ?.describe(team, actor, x, y) || [];
        if (terrainDetails.length) cell.title += `\n${terrainDetails.join('\n')}`;
        cell.textContent = occupied ? occupied.name.slice(0, 1) : tile ? tile.id ? '◆' : '△' : '';
        cell.disabled = team.phase === 'tactic'
          ? state.battleBusy || teamAutoOn : Boolean(occupied) || !reachable.has(`${x},${y}`) ||
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
      const ruleSlots = modules['cryptLord.battleRuleChange']?.slots(team);
      if (ruleSlots?.cap) {
        const band = element('section', 'crypt-lord-game-shell__battle-rule-slots');
        band.appendChild(element('h3', '', `共享规则栏 · ${ruleSlots.entries.length}/${ruleSlots.cap}`));
        for (const entry of ruleSlots.entries) band.appendChild(element('p',
          entry.side === 'ally' ? 'is-friendly' : 'is-hostile',
          `${entry.side === 'ally' ? '我方受益' : '敌方受益'} · ${entry.description}`));
        if (!ruleSlots.entries.length) band.appendChild(element('p', '', '暂无生效规则'));
        teamSession.appendChild(band);
      }
      const environmentSlots = modules['cryptLord.battleEnvironment']?.slots(team) || [];
      if (environmentSlots.length) {
        const band = element('section', 'crypt-lord-game-shell__battle-environment-slots');
        band.appendChild(element('h3', '', '战场环境'));
        const rows = element('div', 'crypt-lord-game-shell__battle-environment-grid');
        for (const slot of environmentSlots) {
          const row = element('div', 'crypt-lord-game-shell__battle-environment-row');
          row.append(
            element('strong', '', slot.kind),
            element('span', '', slot.name || '空'),
            element('small', '', slot.state === 'artificial'
              ? `${slot.side === 'ally' ? '我方' : '敌方'} · ${slot.actor} · 回落：${slot.natural || '空'}`
              : slot.state === 'natural' ? '自然环境' : '暂无环境'));
          rows.appendChild(row);
        }
        band.appendChild(rows);
        teamSession.appendChild(band);
      }
      if (team.fundamentalMeta) {
        const band = element('section', 'crypt-lord-game-shell__battle-fundamental-laws');
        band.appendChild(element('h3', '', '当前底层规则'));
        const rows = modules['cryptLord.battleFundamental']?.rows(team) || [];
        for (const row of rows) {
          const line = element('div', 'crypt-lord-game-shell__battle-fundamental-law');
          line.append(element('strong', '', `${row.family} · ${row.label} → ${row.value}`),
            element('small', '', `${row.source} · ${row.name} · 剩余 ${row.remaining} 回合 · ${
              row.pending ? '下回合生效' : row.suppressed ? '上下限冲突，暂不生效' : row.effective ? '生效中' : '被较新规则覆盖'}`));
          if (!row.effective) line.classList.add('is-muted');
          band.appendChild(line);
        }
        if (!rows.length) band.appendChild(element('p', '', '当前没有底层规则修改。'));
        teamSession.appendChild(band);
      }
      const leaveChoice = teamBattleState.activeLeaveOptions?.(state.current?.data);
      const possessionChoice = teamBattleState.possessionOptions?.(state.current?.data);
      if (teamAutoOn) {
        teamSession.appendChild(element('p', 'crypt-lord-game-shell__battle-hint',
          team.phase === 'tactic' ? '托管中 · 战术结算'
            : autoDrives ? '托管中 · AI 代打' : '托管中 · 非玩家行动'));
      } else if (team.phase === 'tactic' && possessionChoice?.active) {
        const maintenance = element('section', 'crypt-lord-game-shell__battle-leave-maintenance');
        maintenance.append(
          element('h3', '', `${possessionChoice.subtype} · ${possessionChoice.name}`),
          element('p', '', `${possessionChoice.stat}消耗 ${possessionChoice.cost} · 当前 ${
            possessionChoice.balance} · 扣后 ${possessionChoice.after}`),
          element('p', '', `抵抗值 ${possessionChoice.defense} · 本体离场 · 每轮维持重新拼点`));
        if (possessionChoice.reason)
          maintenance.appendChild(element('p', 'is-blocked', possessionChoice.reason));
        const commands = element('div', 'crypt-lord-game-shell__row');
        for (const [mode, label] of [['continue', '继续附身'], ['release', '解除附身']]) {
          const command = button(label, 'crypt-lord-game-shell__button', () => {
            void commitBattle(data => {
              const result = teamBattleState.possession(data, { mode });
              return result.ok ? teamBattleState.advanceAuto(result.data) : result;
            });
          });
          command.disabled = mode === 'continue' && !possessionChoice.canContinue;
          commands.appendChild(command);
        }
        maintenance.appendChild(commands);
        teamSession.appendChild(maintenance);
      } else if (team.phase === 'tactic' && hardOccupied) {
        teamSession.append(
          element('p', 'crypt-lord-game-shell__battle-hint', '本轮受到硬控，无法参与战术。'),
          button('跳过战术阶段', 'crypt-lord-game-shell__button', () => {
            void commitBattle(data => {
              const result = teamBattleState.tactic(data);
              return result.ok ? teamBattleState.advanceAuto(result.data) : result;
            });
          }));
      } else if (team.phase === 'tactic' && leaveChoice?.away) {
        const maintenance = element('section', 'crypt-lord-game-shell__battle-leave-maintenance');
        maintenance.appendChild(element('h3', '', leaveChoice.subtype));
        maintenance.appendChild(element('p', '',
          `当前灵性 ${leaveChoice.spirit} · 本轮维持 ${leaveChoice.cost} 点灵性`));
        if (!leaveChoice.canStay) maintenance.appendChild(element('p', 'is-blocked', '灵性不足，需返场。'));
        const commands = element('div', 'crypt-lord-game-shell__row');
        for (const [mode, label] of [['stay', '继续离场'], ['return', '返场']]) {
          const command = button(label, 'crypt-lord-game-shell__button', () => {
            void commitBattle(data => {
              const result = teamBattleState.activeLeave(data, { mode });
              return result.ok ? teamBattleState.advanceAuto(result.data) : result;
            });
          });
          command.disabled = mode === 'stay' && !leaveChoice.canStay;
          commands.appendChild(command);
        }
        maintenance.appendChild(commands);
        teamSession.appendChild(maintenance);
      } else if (team.phase === 'tactic') {
        const soulChoice = teamBattleState.grazingSwitchOptions(state.current?.data);
        const soulToken = `${state.chatToken}:${state.current?.message_id}:${team.id}:${team.round}`;
        if (state.battleSoulDraft?.token !== soulToken) state.battleSoulDraft = null;
        if (soulChoice) {
          const bar = element('div', 'crypt-lord-game-shell__soul-toolbar');
          bar.appendChild(element('span', '', `激活灵魂：${soulChoice.active.join('、') || '无'}`));
          const open = button('切换激活灵魂', 'crypt-lord-game-shell__button', () => {
            state.battleSoulDraft = { token: soulToken, names: [...soulChoice.active] };
            state.battleBorrow = null;
            renderBattleSystem();
          });
          open.disabled = state.battleBusy || Boolean(soulChoice.reason) || Boolean(state.battleSoulDraft);
          bar.appendChild(open);
          teamSession.appendChild(bar);
        }
        if (state.battleSoulDraft && soulChoice && !soulChoice.reason) {
          const draft = state.battleSoulDraft;
          const editor = element('div', 'crypt-lord-game-shell__soul-editor');
          editor.appendChild(element('h3', '', '激活组合'));
          const count = element('p', 'crypt-lord-game-shell__muted');
          const updateCount = () => { count.textContent =
            `已选 ${draft.names.length}/${soulChoice.capacity} · 切换消耗 ${soulChoice.cost} 灵性`; };
          updateCount();
          editor.appendChild(count);
          for (const row of soulChoice.rows) {
            const label = element('label', 'crypt-lord-game-shell__soul-option');
            const input = element('input'); input.type = 'checkbox';
            input.checked = draft.names.includes(row.name);
            const released = soulChoice.locked.includes(row.name);
            input.disabled = state.battleBusy || released;
            input.setAttribute('aria-label', `激活灵魂 ${row.name}`);
            input.addEventListener('change', () => {
              if (input.checked && draft.names.length >= soulChoice.capacity) {
                input.checked = false; notify('激活数量已达上限', 'warning'); return;
              }
              draft.names = input.checked ? [...draft.names, row.name]
                : draft.names.filter(name => name !== row.name);
              updateCount();
            });
            const detail = element('span');
            detail.append(element('strong', '', row.name),
              element('small', 'crypt-lord-game-shell__muted',
                `${row.sequence}${released ? ' · 外放中，已锁定' : ''}`));
            label.append(input, detail); editor.appendChild(label);
          }
          const commands = element('div', 'crypt-lord-game-shell__scroll-actions');
          const cancel = button('取消切换', 'crypt-lord-game-shell__button', () => {
            state.battleSoulDraft = null; renderBattleSystem();
          });
          const confirm = button('确认激活组合', 'crypt-lord-game-shell__button', () => {
            const names = [...new Set([...draft.names, ...soulChoice.locked])];
            void commitBattle(data => {
              const result = teamBattleState.switchGrazing(data, names, { locked: abilityLocked() });
              if (result.ok) state.battleSoulDraft = null;
              return result;
            });
          });
          cancel.disabled = confirm.disabled = state.battleBusy;
          commands.append(cancel, confirm); editor.appendChild(commands);
          teamSession.appendChild(editor);
        } else {
        state.battleSoulDraft = null;
        const borrowManager = modules['cryptLord.battleAbilityBorrow'];
        const borrowChoices = teamBattleState.abilityBorrowOptions?.(state.current?.data) || [];
        const borrowToken = `${state.current?.message_id}:${team.round}:${team.log[0]?.at}`;
        if (state.battleBorrow?.token !== borrowToken) state.battleBorrow = { token: borrowToken };
        const draft = state.battleBorrow;
        const borrowControls = element('div', 'crypt-lord-game-shell__battle-borrow-controls');
        const borrowAuthority = element('select', 'crypt-lord-game-shell__settings-input');
        borrowAuthority.setAttribute('aria-label', '战术身份');
        for (const row of [{ authority: '', name: '本体战术' }, ...borrowChoices]) {
          const option = element('option', '', row.name);
          option.value = row.authority; borrowAuthority.appendChild(option);
        }
        const authority = borrowChoices.find(row => row.authority === draft.authority);
        if (!authority) { delete draft.authority; delete draft.source; delete draft.ability; }
        borrowAuthority.value = draft.authority || '';
        const borrowSource = element('select', 'crypt-lord-game-shell__settings-input');
        borrowSource.setAttribute('aria-label', '借用能力来源');
        for (const row of authority?.sources || []) {
          const option = element('option', '', row.name); option.value = row.id; borrowSource.appendChild(option);
        }
        if (!authority?.sources.some(row => row.id === draft.source)) draft.source = borrowSource.value;
        borrowSource.value = draft.source || '';
        const source = authority?.sources.find(row => row.id === draft.source);
        const borrowAbility = element('select', 'crypt-lord-game-shell__settings-input');
        borrowAbility.setAttribute('aria-label', '借用能力');
        for (const row of source?.abilities || []) {
          const option = element('option', '', `${row.group} · ${row.label}`);
          option.value = row.id; borrowAbility.appendChild(option);
        }
        if (!source?.abilities.some(row => row.id === draft.ability)) draft.ability = borrowAbility.value;
        borrowAbility.value = draft.ability || '';
        const borrowed = source?.abilities.find(row => row.id === draft.ability);
        const tacticEngine = borrowed ? borrowManager.facade(teamBattleState,
          () => state.current.data, draft) : teamBattleState;
        for (const [select, key] of [[borrowAuthority, 'authority'], [borrowSource, 'source'], [borrowAbility, 'ability']])
          select.addEventListener('change', () => { draft[key] = select.value; void renderBattleSystem(); });
        borrowSource.hidden = borrowAbility.hidden = !authority;
        borrowControls.append(borrowAuthority, borrowSource, borrowAbility);
        if (authority) borrowControls.append(element('p', '',
          `权柄灵性 ${authority.cost} · 扣后 ${Math.max(0, authority.balance - authority.cost)} · 原能力另外扣费 · 次数扣在来源，资源与效果归施法者`));
        if (authority && !borrowed) borrowControls.append(element('p', 'is-blocked', '没有理论上可借用的敌方能力。'));
        if (borrowChoices.length) teamSession.appendChild(borrowControls);
        const controls = element('div', 'crypt-lord-game-shell__battle-actions');
        const action = element('select', 'crypt-lord-game-shell__settings-input');
        tacticAction = action;
        const skillControl = tacticEngine.skillControlOptions(state.current?.data);
        const fieldChoices = tacticEngine.fieldEffectOptions(state.current?.data);
        const transferChoices = tacticEngine.effectTransferOptions(state.current?.data);
        const briberyChoices = tacticEngine.briberyOptions(state.current?.data);
        const balanceChoice = tacticEngine.balanceOptions?.(state.current?.data);
        const punishmentChoice = tacticEngine.punishmentOptions?.(state.current?.data);
        const mythicChoices = tacticEngine.mythicOptions?.(state.current?.data) || [];
        const exileChoices = tacticEngine.exileOptions?.(state.current?.data) || [];
        const eventChoices = tacticEngine.battleEventOptions?.(state.current?.data) || [];
        const rewindChoice = tacticEngine.rewindOptions?.(state.current?.data);
        const extraChoices = tacticEngine.extraActionOptions?.(state.current?.data) || [];
        const hardChoices = tacticEngine.hardControlOptions?.(state.current?.data) || [];
        const mindChoice = tacticEngine.mindDepriveOptions?.(state.current?.data);
        const tempChoices = tacticEngine.tempControlOptions?.(state.current?.data) || [];
        const permanentChoices = tacticEngine.permanentControlOptions?.(state.current?.data) || [];
        const possessionChoices = possessionChoice?.choices || [];
        const ruleChoices = tacticEngine.ruleChangeOptions?.(state.current?.data) || [];
        const environmentChoices = tacticEngine.environmentOptions?.(state.current?.data) || [];
        const fundamentalChoices = tacticEngine.fundamentalOptions?.(state.current?.data) || [];
        const summonChoices = tacticEngine.summonOptions?.(state.current?.data) || [];
        for (const label of ['待命', '对角色使用战术', '改变地形',
          ...fieldChoices.length ? ['施加效果'] : [],
          ...transferChoices.length ? ['效果传递'] : [],
          ...briberyChoices.length ? ['贿赂'] : [],
          ...balanceChoice ? ['平衡'] : [],
          ...punishmentChoice ? ['惩戒'] : [],
          ...mythicChoices.length ? ['形态'] : [],
          ...exileChoices.length ? ['放逐'] : [],
          ...eventChoices.length ? ['制造战场事件'] : [],
          ...rewindChoice ? ['回溯'] : [],
          ...extraChoices.length ? ['额外行动'] : [],
          ...hardChoices.length ? ['硬控'] : [],
          ...mindChoice ? ['心智剥夺'] : [],
          ...tempChoices.length ? ['阵营短控'] : [],
          ...permanentChoices.length ? ['永久控制'] : [],
          ...possessionChoices.length ? ['附身'] : [],
          ...ruleChoices.length ? ['规则修改'] : [],
          ...environmentChoices.length ? ['改变环境'] : [],
          ...fundamentalChoices.length ? ['底层规则修改'] : [],
          ...summonChoices.length ? ['召唤'] : [],
          ...leaveChoice?.choices.length ? ['主动离场'] : [],
          ...Object.keys(skillControl?.modes || {}).length ? ['技能干涉'] : []]) {
          const option = element('option', '', label); option.value = label; action.appendChild(option);
        }
        const target = element('select', 'crypt-lord-game-shell__settings-input');
        for (const unit of team.units.filter(row => row.hp > 0 && !row.exiled && !row.offField && !row.activeLeaving && !row.possessedHidden)) {
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
        controlTarget.setAttribute('aria-label', '技能干涉目标');
        controlMode.setAttribute('aria-label', '技能干涉模式');
        controlSkill.setAttribute('aria-label', '技能干涉技能');
        const controlInfo = element('p', 'crypt-lord-game-shell__battle-field-info');
        const syncControlInfo = () => {
          const target = skillControl?.targets.find(row => row.id === controlTarget.value);
          const skill = target?.skills.find(row => row.name === controlSkill.value);
          controlInfo.textContent = `消耗 ${skillControl?.cost ?? 0} 点灵性（成败均扣） · 持续 2 个完整行动回合${
            skill?.last && controlMode.value !== '复制' ? ' · 最后一技：目标拼点 ×3' : ''}${
            skill?.banned ? ' · 已封锁：成功后刷新期限' : ''}${
            skillControl?.spirit < skillControl?.cost ? ' · 当前灵性不足' : ''}`;
        };
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
          syncControlInfo();
        };
        controlTarget.addEventListener('change', syncControlSkills);
        controlMode.addEventListener('change', syncControlInfo);
        controlSkill.addEventListener('change', syncControlInfo);
        syncControlSkills();
        controlFields.append(controlTarget, controlMode, controlSkill, controlInfo);
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
          for (const row of tacticEngine.fieldEffectPreview(state.current?.data,
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
          const value = tacticEngine.effectTransferPreview(state.current?.data,
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
          const value = tacticEngine.briberyPreview(state.current?.data,
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
        const balanceControls = element('div', 'crypt-lord-game-shell__battle-balance-controls');
        const balanceTarget = element('select', 'crypt-lord-game-shell__settings-input');
        balanceTarget.setAttribute('aria-label', '平衡目标');
        for (const unit of balanceChoice?.targets || []) {
          const option = element('option', '', `${unit.name} · ${unit.cost} 点 · ${unit.duration} 回合`);
          option.value = unit.id;
          balanceTarget.appendChild(option);
        }
        const balanceInfo = element('div', 'crypt-lord-game-shell__battle-balance-preview');
        const syncBalancePreview = () => {
          balanceInfo.replaceChildren();
          const value = tacticEngine.balancePreview?.(state.current?.data, balanceTarget.value);
          if (!value) return;
          balanceInfo.appendChild(element('strong', '', `${value.name} · 平衡点数 ${value.pointsLeft}/${value.maxPoints}`));
          if (value.target) {
            balanceInfo.appendChild(element('p', '',
              `消耗 ${value.target.cost} 点 · 维持 ${value.target.duration} 回合 · 第 ${value.activeFromRound} 回合起生效`));
            balanceInfo.appendChild(element('p', '',
              `第 ${value.expireAfterRound} 回合末结束 · ${value.mode === 'refresh' ? '刷新关系'
                : value.mode === 'switch' ? '切换对象' : '建立关系'}`));
          }
          if (value.current) {
            const unit = team.units.find(row => row.id === value.current.targetId);
            balanceInfo.appendChild(element('p', '',
              `现有平衡 · ${unit?.name || value.current.targetId} · 第 ${value.current.expireAfterRound} 回合末结束`));
          }
          if (value.reason) balanceInfo.appendChild(element('p', 'is-blocked', value.reason));
        };
        balanceTarget.addEventListener('change', syncBalancePreview);
        balanceControls.append(balanceTarget, balanceInfo);
        syncBalancePreview();
        const punishmentControls = element('div', 'crypt-lord-game-shell__battle-punishment-controls');
        const punishmentTarget = element('select', 'crypt-lord-game-shell__settings-input');
        punishmentTarget.setAttribute('aria-label', '惩戒目标');
        for (const unit of punishmentChoice?.targets || []) {
          const option = element('option', '', unit.name);
          option.value = unit.id;
          punishmentTarget.appendChild(option);
        }
        const punishmentInfo = element('div', 'crypt-lord-game-shell__battle-punishment-preview');
        const syncPunishmentPreview = () => {
          punishmentInfo.replaceChildren();
          const value = tacticEngine.punishmentPreview?.(state.current?.data, punishmentTarget.value);
          if (!value) return;
          punishmentInfo.appendChild(element('strong', '', `${value.name} · 定向伤害 ×${value.multiplier}`));
          punishmentInfo.appendChild(element('p', '',
            `灵性 ${value.spirit} → ${value.afterSpirit} · 消耗 ${value.cost}`));
          punishmentInfo.appendChild(element('p', '', value.current
            ? `当前对象：${value.current.name} · 切换对象` : '当前对象：无'));
          if (value.reason) punishmentInfo.appendChild(element('p', 'is-blocked', value.reason));
        };
        punishmentTarget.addEventListener('change', syncPunishmentPreview);
        punishmentControls.append(punishmentTarget, punishmentInfo);
        syncPunishmentPreview();
        const mythicControls = element('div', 'crypt-lord-game-shell__battle-mythic-controls');
        const mythicKind = element('select', 'crypt-lord-game-shell__settings-input');
        mythicKind.setAttribute('aria-label', '形态种类');
        for (const choice of mythicChoices) {
          const option = element('option', '', choice.name);
          option.value = choice.id;
          mythicKind.appendChild(option);
        }
        const mythicInfo = element('div', 'crypt-lord-game-shell__battle-mythic-preview');
        const syncMythicPreview = () => {
          mythicInfo.replaceChildren();
          const choice = mythicChoices.find(row => row.id === mythicKind.value);
          if (!choice) return;
          mythicInfo.appendChild(element('strong', '',
            `${choice.name} · 增伤/减伤 ${choice.pct}% · ${choice.rounds} 回合`));
          mythicInfo.appendChild(element('p', '',
            `失控代价 +${choice.corruption}% · 冷却 ${choice.cooldownDays} 个游戏日`));
          if (choice.description) mythicInfo.appendChild(element('p', '', choice.description));
          if (choice.reason) mythicInfo.appendChild(element('p', 'is-blocked', choice.reason));
        };
        mythicKind.addEventListener('change', syncMythicPreview);
        mythicControls.append(mythicKind, mythicInfo);
        syncMythicPreview();
        const exileControls = element('div', 'crypt-lord-game-shell__battle-exile-controls');
        const exileKind = element('select', 'crypt-lord-game-shell__settings-input');
        exileKind.setAttribute('aria-label', '放逐种类');
        const exileTarget = element('select', 'crypt-lord-game-shell__settings-input');
        exileTarget.setAttribute('aria-label', '放逐目标');
        const exileInfo = element('p', 'crypt-lord-game-shell__battle-exile-preview');
        for (const choice of exileChoices) {
          const option = element('option', '', choice.subtype);
          option.value = choice.subtype; exileKind.appendChild(option);
        }
        const syncExile = () => {
          const choice = exileChoices.find(row => row.subtype === exileKind.value);
          exileTarget.replaceChildren();
          for (const target of choice?.targets || []) {
            const option = element('option', '', target.name);
            option.value = target.id; exileTarget.appendChild(option);
          }
          exileInfo.textContent = choice
            ? `消耗 ${choice.cost} 灵性 · 离场 ${choice.rounds} 回合 · ${choice.returnAt === 'caster' ? '放逐者身边回场' : '原格回场'}${choice.poison ? ` · 每回合 ${choice.poison} 点活力伤害` : ' · 无附带伤害'}${choice.reason ? ` · ${choice.reason}` : ''}`
            : '';
        };
        exileKind.addEventListener('change', syncExile);
        exileControls.append(exileKind, exileTarget, exileInfo);
        syncExile();
        const eventControls = element('div', 'crypt-lord-game-shell__battle-event-controls');
        const eventKind = element('select', 'crypt-lord-game-shell__settings-input');
        eventKind.setAttribute('aria-label', '战场事件种类');
        const eventInfo = element('div', 'crypt-lord-game-shell__battle-event-preview');
        for (const choice of eventChoices) {
          const option = element('option', '', `${choice.name} · 剩余 ${choice.remaining} 次`);
          option.value = choice.subtype; eventKind.appendChild(option);
        }
        const syncEvent = () => {
          eventInfo.replaceChildren();
          const choice = eventChoices.find(row => row.subtype === eventKind.value);
          if (!choice) return;
          eventInfo.appendChild(element('p', '', choice.intro));
          eventInfo.appendChild(element('strong', '',
            `消耗 ${choice.cost} 灵性 · 每次 ${choice.power} 点活力 · 持续 ${choice.rounds} 回合`));
          for (const line of [...choice.rules, choice.tail])
            eventInfo.appendChild(element('p', '', line));
          if (choice.reason) eventInfo.appendChild(element('p', 'is-blocked', choice.reason));
        };
        eventKind.addEventListener('change', syncEvent);
        eventControls.append(eventKind, eventInfo);
        syncEvent();
        const rewindControls = element('div', 'crypt-lord-game-shell__battle-rewind-controls');
        const rewindKind = element('select', 'crypt-lord-game-shell__settings-input');
        rewindKind.setAttribute('aria-label', '回溯方式');
        let rewindRound = rewindChoice?.rounds.find(row => row.differs)?.round;
        for (const choice of rewindChoice?.choices || []) {
          const option = element('option', '', `${choice.subtype} · 剩余 ${choice.remaining} 次`);
          option.value = choice.subtype; rewindKind.appendChild(option);
        }
        const rewindInfo = element('div', 'crypt-lord-game-shell__battle-rewind-preview');
        const syncRewind = () => {
          rewindInfo.replaceChildren();
          if (!rewindChoice) return;
          rewindInfo.appendChild(element('strong', '', '必定成功 · 无属性消耗'));
          rewindInfo.appendChild(element('p', '',
            '恢复自身六维当前值与上限；位置、效果、标签、被禁技能与阵营保持现状。保命、召唤与化形等已付出的次数及冷却不退还。'));
          const choice = rewindChoice.choices.find(row => row.subtype === rewindKind.value);
          if (choice?.remaining === 0 || rewindChoice.reason)
            rewindInfo.appendChild(element('p', 'is-blocked', choice?.remaining === 0
              ? '本场已经用完这种回溯方式。' : rewindChoice.reason));
          for (const row of rewindChoice.rounds) {
            const label = element('label', 'crypt-lord-game-shell__battle-rewind-round');
            const radio = element('input');
            radio.type = 'radio'; radio.name = 'crypt-lord-rewind-round';
            radio.value = String(row.round);
            radio.setAttribute('aria-label', `回溯至第 ${row.round} 回合`);
            radio.checked = row.round === rewindRound;
            radio.disabled = !row.differs;
            const details = element('div', 'crypt-lord-game-shell__battle-rewind-values');
            details.appendChild(element('strong', '', `第 ${row.round} 回合开始${row.differs ? '' : ' · 与现在相同'}`));
            for (const [key, was] of Object.entries(row.stats)) {
              const diff = was - rewindChoice.current[key];
              const value = element('span', diff > 0 ? 'is-gain' : diff < 0 ? 'is-loss' : '',
                `${key.replace('当前', '')} ${was}/${row.maxStats[key]}${diff ? `（${diff > 0 ? '+' : ''}${diff}）` : ''}`);
              details.appendChild(value);
            }
            radio.addEventListener('change', () => {
              rewindRound = row.round;
              action.dispatchEvent(new Event('change'));
            });
            label.append(radio, details); rewindInfo.appendChild(label);
          }
        };
        rewindKind.addEventListener('change', () => {
          syncRewind(); action.dispatchEvent(new Event('change'));
        });
        rewindControls.append(rewindKind, rewindInfo);
        syncRewind();
        const leaveControls = element('div', 'crypt-lord-game-shell__battle-leave-controls');
        const leaveKind = element('select', 'crypt-lord-game-shell__settings-input');
        leaveKind.setAttribute('aria-label', '主动离场方式');
        const leaveInfo = element('div', 'crypt-lord-game-shell__battle-leave-preview');
        for (const choice of leaveChoice?.choices || []) {
          const option = element('option', '', choice.subtype);
          option.value = choice.subtype; leaveKind.appendChild(option);
        }
        const syncLeave = () => {
          leaveInfo.replaceChildren();
          const choice = leaveChoice?.choices.find(row => row.subtype === leaveKind.value);
          if (!choice) return;
          leaveInfo.appendChild(element('p', '', `${choice.description} 进入无消耗 · 每轮维持 ${leaveChoice.cost} 灵性`));
          leaveInfo.appendChild(element('p', '', choice.rivals.length
            ? `阻止者：${choice.rivals.map(row => `${row.name}（灵性 ${row.spirit}）`).join('、')}`
            : '当前没有合格阻止者'));
          if (!choice.possible) leaveInfo.appendChild(element('p', 'is-blocked', '当前灵性无法赢过所有阻止者。'));
        };
        leaveKind.addEventListener('change', syncLeave);
        leaveControls.append(leaveKind, leaveInfo);
        syncLeave();
        const extraControls = element('div', 'crypt-lord-game-shell__battle-extra-controls');
        const extraKind = element('select', 'crypt-lord-game-shell__settings-input');
        extraKind.setAttribute('aria-label', '额外行动方式');
        for (const choice of extraChoices) {
          const option = element('option', '', choice.name);
          option.value = choice.subtype; extraKind.appendChild(option);
        }
        const extraInfo = element('div', 'crypt-lord-game-shell__battle-extra-preview');
        const syncExtra = () => {
          const choice = extraChoices.find(row => row.subtype === extraKind.value);
          extraInfo.replaceChildren();
          if (!choice) return;
          extraInfo.append(
            element('strong', '', `虚影 ${choice.count} 次行动 · 剩余 ${choice.remaining}/${choice.uses} 次`),
            element('p', '', `灵性消耗 ${choice.cost} · 当前 ${team.units.find(unit => unit.source === 'player')?.spirit}`),
            element('p', '', '必定成功 · 本体行动后连续行动 · 共用本体技能、位置与资源'),
            element('p', '', '每次刷新移动力；持续效果不重复结算；本体无法行动时剩余虚影作废。'));
          if (choice.reason || !choice.remaining)
            extraInfo.appendChild(element('p', 'is-blocked', choice.reason || '本场额外行动次数已用完。'));
        };
        extraKind.addEventListener('change', () => {
          syncExtra(); action.dispatchEvent(new Event('change'));
        });
        extraControls.append(extraKind, extraInfo);
        syncExtra();
        const hardControls = element('div', 'crypt-lord-game-shell__battle-hard-controls');
        const hardKind = element('select', 'crypt-lord-game-shell__settings-input');
        hardKind.setAttribute('aria-label', '硬控方式');
        for (const choice of hardChoices) {
          const option = element('option', '', choice.name);
          option.value = choice.subtype; hardKind.appendChild(option);
        }
        const hardTarget = element('select', 'crypt-lord-game-shell__settings-input');
        hardTarget.setAttribute('aria-label', '硬控目标');
        const hardInfo = element('div', 'crypt-lord-game-shell__battle-hard-preview');
        const syncHardInfo = () => {
          const choice = hardChoices.find(row => row.subtype === hardKind.value);
          const picked = choice?.targets.find(row => row.id === hardTarget.value);
          hardInfo.replaceChildren();
          if (!choice) return;
          hardInfo.append(
            element('strong', '', `灵性消耗 ${choice.cost} · 当前 ${choice.spirit}`),
            element('p', '', `扣费后出手值 ${choice.after} · 目标抵抗值 ${picked?.defense ?? '无可选目标'}`),
            element('p', '', `${choice.range == null ? '不限距离' : `切比雪夫距离 ${choice.range} 格`} · 成败都扣费 · 无次数限制`),
            element('p', '', '成功后跳过下一回合行动并占用战术位；持续效果照常结算，已有硬控不叠加、不刷新。'));
          if (choice.reason) hardInfo.appendChild(element('p', 'is-blocked', choice.reason));
        };
        const syncHard = () => {
          const choice = hardChoices.find(row => row.subtype === hardKind.value);
          hardTarget.replaceChildren();
          for (const row of choice?.targets || []) {
            const option = element('option', '', row.name);
            option.value = row.id; hardTarget.appendChild(option);
          }
          syncHardInfo();
        };
        hardKind.addEventListener('change', () => { syncHard(); action.dispatchEvent(new Event('change')); });
        hardTarget.addEventListener('change', () => { syncHardInfo(); action.dispatchEvent(new Event('change')); });
        hardControls.append(hardKind, hardTarget, hardInfo);
        syncHard();
        const permanentControls = element('div', 'crypt-lord-game-shell__battle-permanent-controls');
        const permanentKind = element('select', 'crypt-lord-game-shell__settings-input');
        permanentKind.setAttribute('aria-label', '永久控制方式');
        for (const row of permanentChoices) {
          const option = element('option', '', row.subtype);
          option.value = row.subtype; permanentKind.appendChild(option);
        }
        const permanentTarget = element('select', 'crypt-lord-game-shell__settings-input');
        permanentTarget.setAttribute('aria-label', '永久控制目标');
        const permanentInfo = element('div', 'crypt-lord-game-shell__battle-permanent-preview');
        const syncPermanentInfo = () => {
          const choice = permanentChoices.find(row => row.subtype === permanentKind.value);
          const picked = choice?.targets.find(row => row.id === permanentTarget.value);
          permanentInfo.replaceChildren();
          if (!choice) return;
          permanentInfo.append(
            element('strong', '', `${choice.stat}消耗 ${choice.cost} · 当前 ${choice.balance} · 扣后 ${choice.after}`),
            element('p', '', `抵抗值 ${picked?.defense ?? '无可选对象'} · 出手倍率 ${picked?.penalty ?? '—'} · ${choice.range == null ? '不限距离' : `距离 ${choice.range} 格`}`),
            element('p', '', choice.subtype === '秘偶化'
              ? `${choice.current ? `当前 ${choice.current.stacks}/3 层` : '尚未建立过程'} · 成功三次永久转化 · 失败掉一层 · 每场完成一人`
              : `本场剩余 ${choice.remaining} 次 · 成败都扣费并消耗名额 · 成功永久转为友军`));
          if (choice.subtype === '秘偶化') permanentInfo.appendChild(element('p', '',
            '一、二层攻防速与移动削减40%、80%；施法者防速降低20%。未续同一目标即中断。'));
          if (choice.reason) permanentInfo.appendChild(element('p', 'is-blocked', choice.reason));
        };
        const syncPermanent = () => {
          const choice = permanentChoices.find(row => row.subtype === permanentKind.value);
          permanentTarget.replaceChildren();
          for (const row of choice?.targets || []) {
            const option = element('option', '', row.name);
            option.value = row.id; permanentTarget.appendChild(option);
          }
          if (choice?.current && choice.targets.some(row => row.id === choice.current.targetId))
            permanentTarget.value = choice.current.targetId;
          syncPermanentInfo();
        };
        permanentKind.addEventListener('change', () => { syncPermanent(); action.dispatchEvent(new Event('change')); });
        permanentTarget.addEventListener('change', () => { syncPermanentInfo(); action.dispatchEvent(new Event('change')); });
        permanentControls.append(permanentKind, permanentTarget, permanentInfo);
        syncPermanent();
        const ruleControls = element('div', 'crypt-lord-game-shell__battle-rule-controls');
        const ruleSelect = (label, rows) => {
          const select = element('select', 'crypt-lord-game-shell__settings-input');
          select.setAttribute('aria-label', label);
          for (const row of rows) {
            const option = element('option', '', row.label);
            option.value = row.key; select.appendChild(option);
          }
          return select;
        };
        const ruleKind = ruleSelect('规则能力', ruleChoices.map(row => ({ key: row.subtype, label: row.name })));
        const ruleScope = ruleSelect('规则范围', []);
        const ruleParam = ruleSelect('规则参数', []);
        const rulePreset = ruleSelect('规则预设', []);
        const ruleTarget = ruleSelect('规则目标', []);
        const ruleInfo = element('div', 'crypt-lord-game-shell__battle-rule-preview');
        const ruleRequest = () => ({ subtype: ruleKind.value, scope: ruleScope.value,
          param: ruleParam.value, presetKey: rulePreset.value, target: ruleTarget.value });
        const fillRule = (select, rows) => {
          const previous = select.value; select.replaceChildren();
          for (const row of rows) {
            const option = element('option', '', row.label);
            option.value = row.key; select.appendChild(option);
          }
          if (rows.some(row => row.key === previous)) select.value = previous;
        };
        const syncRuleInfo = () => {
          const choice = ruleChoices.find(row => row.subtype === ruleKind.value);
          ruleInfo.replaceChildren();
          if (!choice) return;
          const preview = tacticEngine.ruleChangePreview(state.current?.data, ruleRequest());
          ruleInfo.append(
            element('p', '', choice.description),
            element('p', '', `灵性消耗 ${choice.cost} · 当前 ${choice.balance} · 扣后 ${choice.after} · 成败都扣费`),
            element('p', '', `扣后出手值 ${choice.casterScore} · ${choice.rivals.length
              ? `对抗者：${choice.rivals.map(row => `${row.name} ${row.score}`).join('、')}`
              : '场上没有对抗者'}`));
          for (const part of preview.parts) ruleInfo.appendChild(element('p', '',
            `${part.targets.map(row => row.name).join('、')} · ${part.label} ${part.sign}${part.power}%`));
          ruleInfo.appendChild(element('p', '', '占用一个共享规则栏位 · 持续至替换、施加者或全部目标阵亡、战斗结束'));
          if (!preview.ok) ruleInfo.appendChild(element('p', 'is-blocked', preview.reason));
        };
        const syncRuleScope = () => {
          const choice = ruleChoices.find(row => row.subtype === ruleKind.value);
          const dir = ['敌军单体', '敌军全体'].includes(ruleScope.value) ? 'bad' : 'good';
          fillRule(ruleParam, (choice?.params || []).filter(row => row.dir === dir)
            .map(row => ({ key: row.key, label: row.label })));
          ruleTarget.hidden = Boolean(choice?.presets.length) || ruleScope.value !== '敌军单体';
          syncRuleInfo();
        };
        const syncRuleKind = () => {
          const choice = ruleChoices.find(row => row.subtype === ruleKind.value);
          fillRule(ruleScope, (choice?.scopes || []).map(key => ({ key, label: key })));
          fillRule(rulePreset, choice?.presets || []);
          fillRule(ruleTarget, (choice?.targets || []).map(row => ({ key: row.id, label: row.name })));
          ruleScope.hidden = ruleParam.hidden = Boolean(choice?.presets.length);
          rulePreset.hidden = !choice?.presets.length;
          syncRuleScope();
        };
        ruleKind.addEventListener('change', () => { syncRuleKind(); action.dispatchEvent(new Event('change')); });
        ruleScope.addEventListener('change', () => { syncRuleScope(); action.dispatchEvent(new Event('change')); });
        for (const select of [ruleParam, rulePreset, ruleTarget])
          select.addEventListener('change', () => { syncRuleInfo(); action.dispatchEvent(new Event('change')); });
        ruleControls.append(ruleKind, ruleScope, ruleParam, rulePreset, ruleTarget, ruleInfo);
        syncRuleKind();
        const environmentControls = element('div', 'crypt-lord-game-shell__battle-environment-controls');
        const environmentKind = ruleSelect('环境能力', environmentChoices.map(row =>
          ({ key: row.subtype, label: row.name })));
        const environmentInfo = element('div', 'crypt-lord-game-shell__battle-environment-preview');
        const syncEnvironmentInfo = () => {
          environmentInfo.replaceChildren();
          const choice = environmentChoices.find(row => row.subtype === environmentKind.value);
          if (!choice) return;
          environmentInfo.append(
            element('p', '', choice.description),
            element('p', '', `${choice.stat}消耗 ${choice.cost} · 当前 ${choice.balance} · 扣后 ${choice.after} · 成败都扣费`),
            element('p', '', `扣后出手值 ${choice.casterScore} · ${choice.rivals.length
              ? `对抗者：${choice.rivals.map(row => `${row.name} ${row.score}`).join('、')}`
              : '场上没有对抗者'}`));
          for (const slot of choice.slots) environmentInfo.appendChild(element('p', '',
            `${slot.kind}：${slot.name || '空'} → ${slot.next}`));
          if (choice.note) environmentInfo.appendChild(element('p', '', choice.note));
          const preview = tacticEngine.environmentPreview(state.current?.data, choice.subtype);
          for (const row of preview.rows) {
            const effects = row.effects.map(effect => `${effect.name} ${
              effect.stat === 'damageTakenDecrease' || effect.type === 'debuff' ? '-' : '+'}${effect.power}%`);
            if (row.move) effects.push(`移动力 +${row.move} 格`);
            environmentInfo.appendChild(element('p', '', `${row.name} · ${effects.join('；') || '无效果'}`));
          }
          if (!preview.ok) environmentInfo.appendChild(element('p', 'is-blocked', preview.reason));
        };
        environmentKind.addEventListener('change', () => {
          syncEnvironmentInfo(); action.dispatchEvent(new Event('change'));
        });
        environmentControls.append(environmentKind, environmentInfo);
        const fundamentalControls = element('div', 'crypt-lord-game-shell__battle-fundamental-controls');
        const summonControls = element('div', 'crypt-lord-game-shell__battle-summon-controls');
        const summonKind = ruleSelect('召唤类型', summonChoices.map(row =>
          ({ key: row.subtype, label: row.subtype })));
        const summonTarget = ruleSelect('召唤原型', []);
        const summonInfo = element('div', 'crypt-lord-game-shell__battle-summon-preview');
        const summonRequest = () => ({ subtype: summonKind.value, target: summonTarget.value });
        const renderSummon = () => {
          const check = tacticEngine.summonPreview(state.current?.data, summonRequest());
          summonInfo.replaceChildren();
          if (check.subtype) {
            summonInfo.append(element('p', '', `${check.stat} ${check.cost} · 剩余名额 ${check.quota}/${check.max} · ${check.cumulative ? '累计成功计数，消散不返还' : '按在场数量计数'}`));
            if (check.target) summonInfo.append(element('p', '',
              `${check.target.sequence} · 实力 ${Math.round(check.target.ratio * 100)}% · ${check.target.rounds == null ? '无固定期限' : `维持 ${check.target.rounds} 回合`}${check.target.immobile ? ' · 移动力 0' : ''}`));
            if (check.foes) summonInfo.append(element('p', '', `逐一对抗 ${check.foes} 名在场敌人的当前人性，每败一次实力降低 10%。`));
          }
          if (!check.ok) summonInfo.append(element('p', 'is-blocked', check.reason));
          if (action.value === '召唤') submit.disabled = !check.ok;
        };
        const updateSummonKind = () => {
          const choice = summonChoices.find(row => row.subtype === summonKind.value);
          summonTarget.replaceChildren();
          for (const row of choice?.rows || []) {
            const option = element('option', '', row.label);
            option.value = row.name; summonTarget.appendChild(option);
          }
          renderSummon();
        };
        summonKind.addEventListener('change', updateSummonKind);
        summonTarget.addEventListener('change', renderSummon);
        summonControls.append(summonKind, summonTarget, summonInfo);
        const fundamentalKind = ruleSelect('底层规则能力', fundamentalChoices.map(row =>
          ({ key: row.subtype, label: row.name })));
        const fundamentalAtom = ruleSelect('公式项目', []);
        const fundamentalValueHost = element('div', 'crypt-lord-game-shell__battle-fundamental-value');
        const fundamentalSelected = element('div', 'crypt-lord-game-shell__battle-fundamental-selected');
        const fundamentalInfo = element('div', 'crypt-lord-game-shell__battle-fundamental-preview');
        const fundamentalReport = element('input', 'crypt-lord-game-shell__settings-input');
        fundamentalReport.setAttribute('aria-label', '底层规则战报补充');
        fundamentalReport.placeholder = '战报补充';
        fundamentalReport.maxLength = 50;
        let fundamentalMutations = [], fundamentalValue;
        const fundamentalRequest = () => ({ subtype: fundamentalKind.value,
          mutations: fundamentalMutations.map(row => ({ ...row })), reportText: fundamentalReport.value });
        const renderFundamental = () => {
          fundamentalSelected.replaceChildren();
          fundamentalInfo.replaceChildren();
          const choice = fundamentalChoices.find(row => row.subtype === fundamentalKind.value);
          if (!choice) return;
          fundamentalInfo.append(element('p', '', choice.description),
            element('p', '', `已选 ${fundamentalMutations.length}/${choice.maxAtoms} 项 · 全场生效`));
          const preview = tacticEngine.fundamentalPreview(state.current?.data, fundamentalRequest());
          if (preview.cost != null) {
            fundamentalInfo.append(element('p', '',
              `${preview.stat}消耗 ${preview.cost} · 当前 ${preview.balance} · 扣后 ${preview.after} · 持续 ${preview.duration} 回合 · 成败都扣费`),
            element('p', '', `扣后出手值 ${preview.casterScore} · ${
              preview.rivals.length ? preview.rivals.map(row => `${row.name} ${row.score}`).join('；') : '场上没有对抗者'}`));
            if (preview.old) fundamentalInfo.appendChild(element('p', '',
              `成功将替换自身旧规则：${preview.old.name} · 到第 ${preview.old.endRound} 回合`));
          }
          for (const [index, mutation] of fundamentalMutations.entries()) {
            const def = choice.atoms.find(row => row.id === mutation.atomId);
            const text = def.type === 'number' ? String(mutation.value) : def.options[mutation.value];
            const line = element('div', 'crypt-lord-game-shell__battle-fundamental-selection');
            line.appendChild(element('span', '', `${def.familyLabel} · ${def.label} → ${text}`));
            const remove = button('×', 'crypt-lord-game-shell__button', () => {
              fundamentalMutations.splice(index, 1); renderFundamental();
            });
            remove.title = '移除公式项目';
            remove.setAttribute('aria-label', `移除 ${def.label}`);
            line.appendChild(remove); fundamentalSelected.appendChild(line);
          }
          if (!preview.ok) fundamentalInfo.appendChild(element('p', 'is-blocked', preview.reason));
          fundamentalAdd.disabled = fundamentalMutations.length >= choice.maxAtoms ||
            fundamentalMutations.some(row => row.atomId === fundamentalAtom.value);
          if (action.value === '底层规则修改') submit.disabled = !preview.ok;
        };
        const updateFundamentalValue = () => {
          const def = fundamentalChoices.find(row => row.subtype === fundamentalKind.value)?.atoms
            .find(row => row.id === fundamentalAtom.value);
          fundamentalValueHost.replaceChildren();
          if (!def) return;
          if (def.type === 'number') {
            fundamentalValue = element('input', 'crypt-lord-game-shell__settings-input');
            fundamentalValue.type = 'number';
            fundamentalValue.required = true;
            fundamentalValue.min = def.min; fundamentalValue.max = def.max;
            fundamentalValue.step = def.step; fundamentalValue.value = def.current;
          } else {
            fundamentalValue = ruleSelect('公式值', Object.entries(def.options).map(([value, label]) =>
              ({ key: value, label })));
            fundamentalValue.value = String(def.current);
          }
          fundamentalValue.setAttribute('aria-label', '公式值');
          fundamentalValueHost.appendChild(fundamentalValue);
        };
        const updateFundamentalKind = () => {
          const choice = fundamentalChoices.find(row => row.subtype === fundamentalKind.value);
          fundamentalAtom.replaceChildren();
          if (!choice) return;
          for (const family of [...new Set(choice.atoms.map(row => row.familyLabel))]) {
            const group = element('optgroup', ''); group.label = family;
            for (const def of choice.atoms.filter(row => row.familyLabel === family)) {
              const opt = element('option', '', def.label); opt.value = def.id; group.appendChild(opt);
            }
            fundamentalAtom.appendChild(group);
          }
          fundamentalMutations = fundamentalMutations.filter(row => choice.atoms.some(def => def.id === row.atomId))
            .slice(0, choice.maxAtoms);
          updateFundamentalValue(); renderFundamental();
        };
        const fundamentalAdd = button('加入规则', 'crypt-lord-game-shell__button', () => {
          const def = fundamentalChoices.find(row => row.subtype === fundamentalKind.value)?.atoms
            .find(row => row.id === fundamentalAtom.value);
          if (!def) return;
          const candidate = { atomId: def.id,
            value: def.type === 'number' ? Number(fundamentalValue.value) : fundamentalValue.value };
          if (def.type === 'number' && !fundamentalValue.checkValidity()) {
            fundamentalValue.reportValidity(); return;
          }
          const next = [...fundamentalMutations, candidate];
          const check = tacticEngine.fundamentalPreview(state.current?.data,
            { ...fundamentalRequest(), mutations: next });
          // Only range/constraint-valid drafts are admitted; affordability is checked again at commit.
          if (!check.valid) {
            fundamentalInfo.appendChild(element('p', 'is-blocked', check.reason)); return;
          }
          fundamentalMutations = next; renderFundamental();
        });
        fundamentalAtom.addEventListener('change', () => { updateFundamentalValue(); renderFundamental(); });
        fundamentalKind.addEventListener('change', updateFundamentalKind);
        fundamentalControls.append(fundamentalKind, fundamentalAtom, fundamentalValueHost,
          fundamentalAdd, fundamentalSelected, fundamentalReport, fundamentalInfo);
        syncEnvironmentInfo();
        const possessionControls = element('div', 'crypt-lord-game-shell__battle-possession-controls');
        const possessionKind = element('select', 'crypt-lord-game-shell__settings-input');
        possessionKind.setAttribute('aria-label', '附身方式');
        for (const row of possessionChoices) {
          const option = element('option', '', row.subtype);
          option.value = row.subtype; possessionKind.appendChild(option);
        }
        const possessionTarget = element('select', 'crypt-lord-game-shell__settings-input');
        possessionTarget.setAttribute('aria-label', '附身目标');
        const possessionInfo = element('div', 'crypt-lord-game-shell__battle-possession-preview');
        const syncPossessionInfo = () => {
          const choice = possessionChoices.find(row => row.subtype === possessionKind.value);
          const picked = choice?.targets.find(row => row.id === possessionTarget.value);
          possessionInfo.replaceChildren();
          if (!choice) return;
          possessionInfo.append(
            element('strong', '', `${choice.stat}消耗 ${choice.cost} · 当前 ${choice.balance} · 扣后 ${choice.after}`),
            element('p', '', `目标抵抗值 ${picked?.defense ?? '无可选对象'} · 不限距离 · 无劣势 · 成败都扣费`),
            element('p', '', choice.subtype === '怨魂附身' ? '固定灵性出手，目标取当前六项最高值。' :
              '出手和维持取当前灵性、人性、理智最高项；目标只取这三项最高值。'),
            element('p', '', '本体离场，取得目标操控权；每轮重新扣费拼点，失败或主动解除后回场，目标恢复原阵营。'));
          if (choice.reason) possessionInfo.appendChild(element('p', 'is-blocked', choice.reason));
        };
        const syncPossession = () => {
          const choice = possessionChoices.find(row => row.subtype === possessionKind.value);
          possessionTarget.replaceChildren();
          for (const row of choice?.targets || []) {
            const option = element('option', '', row.name);
            option.value = row.id; possessionTarget.appendChild(option);
          }
          syncPossessionInfo();
        };
        possessionKind.addEventListener('change', () => { syncPossession(); action.dispatchEvent(new Event('change')); });
        possessionTarget.addEventListener('change', () => { syncPossessionInfo(); action.dispatchEvent(new Event('change')); });
        possessionControls.append(possessionKind, possessionTarget, possessionInfo);
        syncPossession();
        const tempControls = element('div', 'crypt-lord-game-shell__battle-temp-controls');
        const tempKind = element('select', 'crypt-lord-game-shell__settings-input');
        tempKind.setAttribute('aria-label', '短控方式');
        for (const row of tempChoices) {
          const option = element('option', '', row.subtype);
          option.value = row.subtype; tempKind.appendChild(option);
        }
        const tempTarget = element('select', 'crypt-lord-game-shell__settings-input');
        tempTarget.setAttribute('aria-label', '短控目标');
        const tempInfo = element('div', 'crypt-lord-game-shell__battle-temp-preview');
        const syncTempInfo = () => {
          const choice = tempChoices.find(row => row.subtype === tempKind.value);
          const picked = choice?.targets.find(row => row.id === tempTarget.value);
          tempInfo.replaceChildren();
          if (!choice) return;
          tempInfo.append(
            element('strong', '', `${choice.stat}消耗 ${choice.cost} · 当前 ${choice.balance}`),
            element('p', '', `扣费后出手值 ${choice.after} · 目标抵抗值 ${picked?.defense ?? '无可选目标'}`),
            element('p', '', '不限距离 · 成败都扣费 · 每名施法者最多维持一名临时友军'),
            element('p', '', '持续下一战斗回合，在该回合结束时恢复原阵营与操纵者；临时倒戈不提前判胜。'));
          if (choice.reason) tempInfo.appendChild(element('p', 'is-blocked', choice.reason));
        };
        const syncTemp = () => {
          const choice = tempChoices.find(row => row.subtype === tempKind.value);
          tempTarget.replaceChildren();
          for (const row of choice?.targets || []) {
            const option = element('option', '', row.name);
            option.value = row.id; tempTarget.appendChild(option);
          }
          syncTempInfo();
        };
        tempKind.addEventListener('change', () => { syncTemp(); action.dispatchEvent(new Event('change')); });
        tempTarget.addEventListener('change', () => { syncTempInfo(); action.dispatchEvent(new Event('change')); });
        tempControls.append(tempKind, tempTarget, tempInfo);
        syncTemp();
        const mindControls = element('div', 'crypt-lord-game-shell__battle-mind-controls');
        if (mindChoice) {
          mindControls.append(
            element('strong', '', `当前人性 ${mindChoice.humanity} · 消耗 ${mindChoice.cost} · 扣费后 ${mindChoice.after}`),
            element('p', '', `自身周围 ${mindChoice.radius} 格 · 将卷入 ${mindChoice.targets.length} 人：${mindChoice.targets.map(row => row.name).join('、') || '无'}`),
            element('p', '', '范围命中只扣一次人性，各目标独立拼点；成败都扣，无次数限制。'));
          const odds = element('div', 'crypt-lord-game-shell__battle-mind-odds');
          const details = {
            颤栗: `攻防降低${mindChoice.tremblePct}%，持续下一战斗回合。`,
            奔逃: '最多推离两格，踏入危险地形照常结算。',
            瘫软: '下一战斗回合不能移动，但仍能出手。',
            昏迷: '跳过下一回合行动，战术位也被占用。',
            狂热追随: '临时友军至下一回合结束；最多一名，其余退为瘫软。',
          };
          for (const row of mindChoice.odds) {
            const line = element('div', '');
            line.append(element('strong', '', `${row.key} ${row.weight}%`),
              element('span', '', details[row.key] || ''));
            odds.appendChild(line);
          }
          mindControls.appendChild(odds);
          if (mindChoice.reason) mindControls.appendChild(element('p', 'is-blocked', mindChoice.reason));
        }
        updateTerrainChoices = () => {
          terrainControls.hidden = action.value !== '改变地形';
          target.hidden = action.value !== '对角色使用战术';
          controlFields.hidden = action.value !== '技能干涉';
          fieldControls.hidden = action.value !== '施加效果';
          transferControls.hidden = action.value !== '效果传递';
          briberyControls.hidden = action.value !== '贿赂';
          balanceControls.hidden = action.value !== '平衡';
          punishmentControls.hidden = action.value !== '惩戒';
          mythicControls.hidden = action.value !== '形态';
          exileControls.hidden = action.value !== '放逐';
          eventControls.hidden = action.value !== '制造战场事件';
          rewindControls.hidden = action.value !== '回溯';
          extraControls.hidden = action.value !== '额外行动';
          hardControls.hidden = action.value !== '硬控';
          mindControls.hidden = action.value !== '心智剥夺';
          tempControls.hidden = action.value !== '阵营短控';
          permanentControls.hidden = action.value !== '永久控制';
          possessionControls.hidden = action.value !== '附身';
          ruleControls.hidden = action.value !== '规则修改';
          environmentControls.hidden = action.value !== '改变环境';
          fundamentalControls.hidden = action.value !== '底层规则修改';
          summonControls.hidden = action.value !== '召唤';
          leaveControls.hidden = action.value !== '主动离场';
          description.hidden = ['技能干涉', '施加效果', '效果传递', '贿赂', '平衡', '惩戒', '形态', '放逐', '主动离场', '制造战场事件', '回溯', '额外行动', '硬控', '心智剥夺', '阵营短控', '永久控制', '附身', '规则修改', '改变环境', '底层规则修改', '召唤', '待命'].includes(action.value);
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
          if (action.value === '召唤') {
            void commitBattle(data => {
              const result = tacticEngine.summon(data, summonRequest());
              return result.ok ? tacticEngine.advanceAuto(result.data) : result;
            });
            return;
          }
          if (action.value === '底层规则修改') {
            void commitBattle(data => {
              const result = tacticEngine.fundamentalRule(data, fundamentalRequest());
              return result.ok ? tacticEngine.advanceAuto(result.data) : result;
            });
            return;
          }
          if (action.value === '改变环境') {
            void commitBattle(data => {
              const result = tacticEngine.changeEnvironment(data, { subtype: environmentKind.value });
              return result.ok ? tacticEngine.advanceAuto(result.data) : result;
            });
            return;
          }
          if (action.value === '规则修改') {
            void commitBattle(data => {
              const result = tacticEngine.ruleChange(data, ruleRequest());
              return result.ok ? tacticEngine.advanceAuto(result.data) : result;
            });
            return;
          }
          if (action.value === '附身') {
            void commitBattle(data => {
              const result = tacticEngine.possession(data,
                { subtype: possessionKind.value, target: possessionTarget.value });
              return result.ok ? tacticEngine.advanceAuto(result.data) : result;
            });
            return;
          }
          if (action.value === '永久控制') {
            void commitBattle(data => {
              const result = tacticEngine.permanentControl(data,
                { subtype: permanentKind.value, target: permanentTarget.value });
              return result.ok ? tacticEngine.advanceAuto(result.data) : result;
            });
            return;
          }
          if (action.value === '阵营短控') {
            void commitBattle(data => {
              const result = tacticEngine.tempControl(data,
                { subtype: tempKind.value, target: tempTarget.value });
              return result.ok ? tacticEngine.advanceAuto(result.data) : result;
            });
            return;
          }
          if (action.value === '心智剥夺') {
            void commitBattle(data => {
              const result = tacticEngine.mindDeprive(data);
              return result.ok ? tacticEngine.advanceAuto(result.data) : result;
            });
            return;
          }
          if (action.value === '硬控') {
            void commitBattle(data => {
              const result = tacticEngine.hardControl(data,
                { subtype: hardKind.value, target: hardTarget.value });
              return result.ok ? tacticEngine.advanceAuto(result.data) : result;
            });
            return;
          }
          if (action.value === '额外行动') {
            void commitBattle(data => {
              const result = tacticEngine.extraAction(data, extraKind.value);
              return result.ok ? tacticEngine.advanceAuto(result.data) : result;
            });
            return;
          }
          if (action.value === '回溯') {
            void commitBattle(data => {
              const result = tacticEngine.rewind(data,
                { subtype: rewindKind.value, round: rewindRound });
              return result.ok ? tacticEngine.advanceAuto(result.data) : result;
            });
            return;
          }
          if (action.value === '制造战场事件') {
            const choice = eventChoices.find(row => row.subtype === eventKind.value);
            if (!choice || choice.reason) {
              notify(choice?.reason || '请选择战场事件。', 'warning'); return;
            }
            void commitBattle(data => {
              const result = tacticEngine.battleEvent(data, eventKind.value);
              return result.ok ? tacticEngine.advanceAuto(result.data) : result;
            });
            return;
          }
          if (action.value === '主动离场') {
            if (!leaveKind.value) { notify('请选择离场方式。', 'warning'); return; }
            void commitBattle(data => {
              const result = tacticEngine.activeLeave(data, { subtype: leaveKind.value });
              return result.ok ? tacticEngine.advanceAuto(result.data) : result;
            });
            return;
          }
          if (action.value === '放逐') {
            const choice = exileChoices.find(row => row.subtype === exileKind.value);
            if (!choice || choice.reason || !exileTarget.value) {
              notify(choice?.reason || '请选择放逐目标。', 'warning'); return;
            }
            void commitBattle(data => {
              const result = tacticEngine.exile(data, { subtype: exileKind.value, target: exileTarget.value });
              return result.ok ? tacticEngine.advanceAuto(result.data) : result;
            });
            return;
          }
          if (action.value === '形态') {
            const choice = tacticEngine.mythicOptions(state.current?.data)
              .find(row => row.id === mythicKind.value);
            if (!choice || choice.reason) {
              notify(choice?.reason || '请选择已解锁的形态。', 'warning'); return;
            }
            void commitBattle(data => {
              const result = tacticEngine.mythicForm(data, mythicKind.value);
              return result.ok ? tacticEngine.advanceAuto(result.data) : result;
            });
            return;
          }
          if (action.value === '惩戒') {
            const value = tacticEngine.punishmentPreview(state.current?.data, punishmentTarget.value);
            if (!value || value.reason) {
              notify(value?.reason || '请选择惩戒目标。', 'warning'); return;
            }
            void commitBattle(data => {
              const result = tacticEngine.punishment(data, { target: punishmentTarget.value });
              return result.ok ? tacticEngine.advanceAuto(result.data) : result;
            });
            return;
          }
          if (action.value === '平衡') {
            const value = tacticEngine.balancePreview(state.current?.data, balanceTarget.value);
            if (!value || value.reason) {
              notify(value?.reason || '请选择平衡目标。', 'warning'); return;
            }
            void commitBattle(data => {
              const result = tacticEngine.balance(data, { target: balanceTarget.value });
              return result.ok ? tacticEngine.advanceAuto(result.data) : result;
            });
            return;
          }
          if (action.value === '贿赂') {
            const value = tacticEngine.briberyPreview(state.current?.data,
              briberySubtype.value, briberyTarget.value);
            if (!value || value.reason) {
              notify(value?.reason || '请选择贿赂能力与目标。', 'warning'); return;
            }
            void commitBattle(data => {
              const result = tacticEngine.bribery(data, {
                subtype: briberySubtype.value, target: briberyTarget.value,
              });
              return result.ok ? tacticEngine.advanceAuto(result.data) : result;
            });
            return;
          }
          if (action.value === '效果传递') {
            const value = tacticEngine.effectTransferPreview(state.current?.data,
              transferSubtype.value, transferTarget.value);
            if (!value || value.reason) {
              notify(value?.reason || '请选择效果传递能力与目标。', 'warning'); return;
            }
            void commitBattle(data => {
              const result = tacticEngine.effectTransfer(data, {
                subtype: transferSubtype.value, target: transferTarget.value,
              });
              return result.ok ? tacticEngine.advanceAuto(result.data) : result;
            });
            return;
          }
          if (action.value === '施加效果') {
            const choice = fieldChoices.find(row => row.subtype === fieldSubtype.value);
            if (!choice || choice.reason) {
              notify(choice?.reason || '请选择施加效果能力。', 'warning'); return;
            }
            void commitBattle(data => {
              const result = tacticEngine.fieldEffect(data, {
                subtype: fieldSubtype.value, target: fieldTarget.value || null,
              });
              return result.ok ? tacticEngine.advanceAuto(result.data) : result;
            });
            return;
          }
          if (action.value === '技能干涉') {
            if (!controlTarget.value || !controlMode.value || !controlSkill.value) {
              notify('请选择目标、干涉模式和技能。', 'warning'); return;
            }
            void commitBattle(data => {
              const result = tacticEngine.skillControl(data, {
                target: controlTarget.value, mode: controlMode.value, skill: controlSkill.value,
              });
              return result.ok ? tacticEngine.advanceAuto(result.data) : result;
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
          void commitBattle(async (data, _evidence, guard, assertCurrent) => {
            const prompt = tacticEngine.tacticPrompt(data, declaration);
            const response = await modules['cryptLord.battleSession'].request([
                { role: 'system', content: prompt.rules },
                { role: 'system', content: prompt.situation },
                { role: 'user', content: '审计申报并安排所有 NPC 的战术行动，只输出 JSON。' },
              ], guard, assertCurrent);
            const plan = tacticEngine.parsePlan(response);
            if (!plan) return { ok: false, error: '战术模型未返回可识别的完整 JSON，可直接重试。' };
            const progressed = tacticEngine.tactic(data, { declaration, plan });
            return progressed.ok ? tacticEngine.advanceAuto(progressed.data) : progressed;
          });
        });
        action.addEventListener('change', () => {
          submit.textContent = action.value === '技能干涉' ? '执行技能干涉'
            : action.value === '施加效果' ? '发动效果'
            : action.value === '效果传递' ? '发动效果传递' : '请求战术裁决';
          if (action.value === '贿赂') submit.textContent = '发动贿赂';
          if (action.value === '平衡') submit.textContent = '发动平衡';
          if (action.value === '惩戒') submit.textContent = '发动惩戒';
          if (action.value === '形态') submit.textContent = '开启形态';
          if (action.value === '放逐') submit.textContent = '发动放逐';
          if (action.value === '主动离场') submit.textContent = '主动离场';
          if (action.value === '制造战场事件') submit.textContent = '发动战场事件';
          if (action.value === '回溯') submit.textContent = '确认回溯';
          if (action.value === '额外行动') submit.textContent = '创造虚影';
          if (action.value === '硬控') submit.textContent = '发动硬控';
          if (action.value === '心智剥夺') submit.textContent = '发动心智剥夺';
          if (action.value === '阵营短控') submit.textContent = '发动阵营短控';
          if (action.value === '附身') submit.textContent = '发动附身';
          if (action.value === '规则修改') submit.textContent = '改写规则';
          if (action.value === '改变环境') submit.textContent = '改变环境';
          if (action.value === '底层规则修改') submit.textContent = '制定底层规则';
          if (action.value === '召唤') submit.textContent = '发动召唤';
          if (action.value === '永久控制') submit.textContent = permanentKind.value === '秘偶化' &&
            permanentChoices.find(row => row.subtype === permanentKind.value)?.current?.targetId === permanentTarget.value
            ? '继续秘偶化' : '发动永久控制';
          const extraChoice = extraChoices.find(row => row.subtype === extraKind.value);
          const hardChoice = hardChoices.find(row => row.subtype === hardKind.value);
          const tempChoice = tempChoices.find(row => row.subtype === tempKind.value);
          const permanentChoice = permanentChoices.find(row => row.subtype === permanentKind.value);
          const possessionOption = possessionChoices.find(row => row.subtype === possessionKind.value);
          submit.disabled = action.value === '召唤'
            ? !tacticEngine.summonPreview(state.current?.data, summonRequest()).ok
            : action.value === '底层规则修改'
            ? !tacticEngine.fundamentalPreview(state.current?.data, fundamentalRequest()).ok
            : action.value === '改变环境'
            ? !tacticEngine.environmentPreview(state.current?.data, environmentKind.value).ok
            : action.value === '规则修改'
            ? !tacticEngine.ruleChangePreview(state.current?.data, ruleRequest()).ok
            : action.value === '附身' ? !possessionOption || Boolean(possessionOption.reason) ||
            !possessionOption.targets.some(row => row.id === possessionTarget.value)
            : action.value === '永久控制' ? !permanentChoice || Boolean(permanentChoice.reason) ||
            !permanentChoice.targets.some(row => row.id === permanentTarget.value)
            : action.value === '阵营短控' ? !tempChoice || Boolean(tempChoice.reason) ||
            !tempChoice.targets.some(row => row.id === tempTarget.value)
            : action.value === '心智剥夺' ? !mindChoice || Boolean(mindChoice.reason)
            : action.value === '硬控' ? !hardChoice || Boolean(hardChoice.reason) ||
            !hardChoice.targets.some(row => row.id === hardTarget.value)
            : action.value === '额外行动'
            ? !extraChoice || Boolean(extraChoice.reason) || extraChoice.remaining <= 0
            : action.value === '制造战场事件'
            ? Boolean(eventChoices.find(row => row.subtype === eventKind.value)?.reason)
            : action.value === '回溯' ? Boolean(rewindChoice?.reason) ||
              !rewindChoice?.choices.some(row => row.subtype === rewindKind.value && row.remaining > 0) ||
              !rewindChoice?.rounds.some(row => row.round === rewindRound && row.differs) : false;
        });
        eventKind.addEventListener('change', () => {
          if (action.value === '制造战场事件')
            submit.disabled = Boolean(eventChoices.find(row => row.subtype === eventKind.value)?.reason);
        });
        controls.append(action, target, terrainControls, controlFields, fieldControls,
          transferControls, briberyControls, balanceControls, punishmentControls, mythicControls, exileControls, leaveControls, eventControls, rewindControls, extraControls, hardControls, mindControls, tempControls, permanentControls, possessionControls, ruleControls, environmentControls, fundamentalControls, summonControls, description, submit);
        updateFundamentalKind();
        updateSummonKind();
        if (borrowed) {
          action.value = borrowed.actionLabel;
          action.disabled = true;
          action.dispatchEvent(new Event('change'));
          if (!action.value) {
            submit.disabled = true;
            borrowControls.append(element('p', 'is-blocked', '当前资源、额度或目标不满足原能力发动条件。'));
          }
        } else if (authority) submit.disabled = true;
        teamSession.appendChild(controls);
        teamSession.appendChild(button('跳过战术阶段', 'crypt-lord-game-shell__button', () => {
          void commitBattle(data => {
            const progressed = tacticEngine.tactic(data);
            return progressed.ok ? tacticEngine.advanceAuto(progressed.data) : progressed;
          });
        }));
        }
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
      const eventLines = modules['cryptLord.battleEvents']?.statusLines(team) || [];
      if (eventLines.length) {
        const ongoing = element('div', 'crypt-lord-game-shell__battle-event-status');
        ongoing.appendChild(element('strong', '', '持续战场事件'));
        for (const line of eventLines) ongoing.appendChild(element('p', '', line));
        teamSession.appendChild(ongoing);
      }
      if (team.lastTactic) {
        const result = element('div', 'crypt-lord-game-shell__battle-log');
        result.appendChild(element('strong', '', `第 ${team.lastTactic.round} 回合战术裁决`));
        if (team.lastTactic.audit) result.appendChild(element('p', '',
          `申报${team.lastTactic.audit.可行 ? '可行' : '不可行'} · ${team.lastTactic.audit.依据能力 || '无依据'} · ${team.lastTactic.audit.理由 || ''}`));
        for (const row of team.lastTactic.outcomes || []) {
          const actorName = team.units.find(unit => unit.id === row.actor)?.name || row.actor;
          const targetName = team.units.find(unit => unit.id === row.target)?.name || row.target;
          if (row.summary?.length) {
            for (const line of row.summary) result.appendChild(element('p', '', line));
            continue;
          }
          if (row.kind === 'active-leave') {
            const status = { enter: '离场成功', fail: '离场被阻止',
              upkeep: '维持离场', return: '已返场' }[row.stage] || '已处理';
            const reason = { summons: '自有召唤物已全部离场', spirit: '灵性不足',
              voluntary: '主动返场', 'battle-end': '战斗结束' }[row.reason];
            result.appendChild(element('p', '',
              `${actorName} · ${row.subtype} · ${status}${row.cost ? ` · 消耗 ${row.cost} 灵性` : ''}${reason ? ` · ${reason}` : ''}`));
            continue;
          }
          const status = { applied: '生效', resisted: '拼点失败',
            skipped: '硬控占位', superseded: '被抢先控制',
            weaker: '同类效果较强', infeasible: '不可行' }[row.outcome] || row.outcome ||
            (row.applied === false ? '未生效' : row.applied === true ? '生效' : row.stage || '已处理');
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
      if (team.phase === 'tactic') {
        const end = button('结束战斗', 'crypt-lord-game-shell__button', () => {
          if (!hostWindow.confirm?.('确定结束本场战斗并进入战报结算？')) return;
          void commitBattle(data => teamBattleState.end(data, team.id));
        });
        end.disabled = state.battleBusy;
        teamSession.appendChild(end);
      }
    }
    body.appendChild(teamSession);
    if (team?.status === 'active' && team.autoPilot?.on && !state.battleBusy &&
      !state.battleAutoPaused && state.battleAutoSteps < 40) scheduleAuto();
    if (team?.status === 'active') { renderBattleRecovery(); return; }
    }
    const heading = element('div', 'crypt-lord-game-shell__battle-heading');
    heading.appendChild(element('div', '', battle?.status === 'active' ? '旧版个人战斗' : '个人对局'));
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
      const enemyAgility = element('input', 'crypt-lord-game-shell__settings-input');
      enemyAgility.type = 'number';
      enemyAgility.min = '0';
      enemyAgility.value = '8';
      const setupField = (label, input) => {
        const field = element('label', 'crypt-lord-game-shell__battle-setup-field');
        field.append(element('span', '', label), input);
        return field;
      };
      const customFields = [setupField('训练目标', enemyName), setupField('活力', enemyHp), setupField('敏捷', enemyAgility)];
      opponent.addEventListener('change', () => {
        customFields.forEach(field => { field.hidden = Boolean(opponent.value); });
      });
      form.append(setupField('对手', opponent), ...customFields);
      personal.appendChild(form);
      const startPersonalBattle = button('开始个人战斗', 'crypt-lord-game-shell__button is-primary', () => {
        if (opponent.value && !hostWindow.confirm?.(`与 ${opponent.value} 进行真实 NPC 对局？确认战报时会结算 NPC 的战后资源与经验。`)) return;
        void commitBattle((data, evidence, guard, assertCurrent) => prepareBattle(data, {
          personal: true, npcKey: opponent.value, enemyName: enemyName.value,
          enemyHp: enemyHp.value, enemyAgility: enemyAgility.value,
          summonPool: state.pathwayPool,
        }, evidence, guard, assertCurrent));
      });
      startPersonalBattle.disabled = !teamBattleState ||
        Boolean(personalBattleState.experiencePreview(state.current?.data)) ||
        team?.status === 'finished' && !team.settled;
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
      if (picture?.gate(state.current?.data?.stat_data,
        battle.player.picturePool || state.pathwayPool, state.current?.data).unlocked && !battle.picture) {
        const rows = picture.records(state.current?.data).filter(row =>
          !battle.pictureLosses?.some(loss => loss.id === row.id));
        if (rows.length) {
          const select = scrollSelect(rows.map(row => [row.id, `${row.name} · ${row.card.当前序列}`]),
            rows[0].id, '画中人成品');
          const control = button(`召唤画中人 · 灵${picture.summonCost(
            (modules['cryptLord.marionetteReference']?.rank || modules[SCROLL_CRAFTING_KEY]?.rankOf ||
              modules['cryptLord.battleExperience'].rank)(
              battle.player.sequenceString || state.current?.data?.stat_data?.当前序列))}`,
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

    if (domainState) {
      actionRow.appendChild(button('沙盘布阵', 'crypt-lord-game-shell__button', () => {
        const id = state.current?.message_id;
        closeModal();
        void root.__stage1Modules?.['cryptLord.warSandboxUi']?.open(id);
      }));
    }
    if (domainState && domain) {
      actionRow.appendChild(button('沙盘军演', 'crypt-lord-game-shell__button is-primary', async () => {
        const token = state.chatToken, id = state.current?.message_id, epoch = state.battleEpoch;
        const valid = () => !state.disposed && token === state.chatToken && epoch === state.battleEpoch &&
          !state.battleGenerating && state.current?.message_id === id && state.modal?.dataset.open === 'true';
        const control = actionRow.querySelector('button');
        control.disabled = true;
        try {
          const store = await contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 });
          const latest = await store.findLatestAssistant(), source = await store.readMessage(id);
          if (!valid() || latest?.message_id !== id || source?.role !== 'assistant') throw Error('请在最新原生 assistant 楼层军演');
          const baseline = JSON.stringify(source);
          const rules = await domainState.loadRules(valid, true);
          const next = structuredClone(source.data), currentDomain = next.stat_data?.领地;
          const drill = domainState.withWarRules(rules, () => domainState.runDrill(currentDomain));
          const assertCurrent = async () => {
            const latest = await store.findLatestAssistant(), current = await store.readMessage(id);
            if (!valid() || latest?.message_id !== id || JSON.stringify(current) !== baseline)
              throw Error('军演来源楼层已变化，请重新打开');
          };
          const saved = await store.writeAssistantData(id, next, 'affected', assertCurrent, valid, { warfareRules: rules });
          if (!valid()) return;
          state.current.data = saved;
          notify(drill.summary || '沙盘军演演练完毕', 'info');
          void renderBattleSystem();
          root.__stage1Modules?.['cryptLord.warReplayUi']?.open(drill.result, { title: '沙盘军演' });
        } catch (error) { if (valid()) notify(error?.message || String(error), 'error'); }
        finally { if (valid()) control.disabled = false; }
      }));
    }
    actionRow.appendChild(button('前往独立领地作战中心', 'crypt-lord-game-shell__button', () => {
      closeModal();
      void openDomainConsole();
    }));
    body.appendChild(actionRow);
    renderBattleRecovery();
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
            actionBox.appendChild(button("秘偶管理", "crypt-lord-game-shell__small-button", () => {
              closeModal();
              void modules["cryptLord.marionetteUi"]?.open();
            }));
          } else if (feat.id === "grazing") {
            // The native-floor grazing roster is rendered below.
          } else if (feat.id === "imagination") {
            // The original spectator mechanism is an effective-pathway projection, rendered below.
          } else if (feat.id === "clone") {
            actionBox.appendChild(button("分身管理", "crypt-lord-game-shell__small-button", () => {
              closeModal();
              void modules["cryptLord.cloneUi"]?.open();
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
    if (!resolved.features.some(feat => feat.id === "marionette" && feat.unlocked) &&
      state.pathwayPool && modules["cryptLord.marionetteState"]?.gate(state.current?.data, state.pathwayPool).unlocked) {
      state.modalBody.appendChild(button("秘偶管理", "crypt-lord-game-shell__button", () => {
        closeModal();
        void modules["cryptLord.marionetteUi"]?.open();
      }));
    }
    if (!resolved.features.some(feat => feat.id === "clone" && feat.unlocked) &&
      state.pathwayPool && modules["cryptLord.cloneState"]?.gate(state.current?.data, state.pathwayPool).unlocked) {
      state.modalBody.appendChild(button("分身管理", "crypt-lord-game-shell__button", () => {
        closeModal();
        void modules["cryptLord.cloneUi"]?.open();
      }));
    }
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
    const service = modules['cryptLord.materialProcessingState'];
    if (!service || !state.current?.data) return;
    if (!state.pathwayPool) { loadPathways(); return; }
    const access = service.gate(state.current.data, state.pathwayPool);
    if (!access.unlocked) return;
    const session = service.create(state.current.data, state.pathwayPool);
    const section = element('section', 'crypt-lord-game-shell__pathway-item');
    section.append(
      element('strong', '', '通识者 · 材料与制造工坊'),
      element('p', 'crypt-lord-game-shell__muted',
        `当前可认定 ${session.mode.sources(session.win).length} 个来源，仓库有 ${session.mode.batches(session.data).length} 批材料。`),
      button('打开材料加工', 'crypt-lord-game-shell__small-button', () => {
        void contract.waitGlobalInitialized(SAVANT_MATERIAL_UI_KEY, { timeoutMs: 10000 })
          .then(api => api.open()).catch(error => notify(`打开材料加工失败：${error?.message || error}`, 'error'));
      }),
      button('打开制造工坊', 'crypt-lord-game-shell__small-button', () => {
        closeModal();
        void modules['cryptLord.workshopUi']?.open();
      }),
    );
    state.modalBody.append(section);
  }

  function renderSavantEnhancement() {
    const service = modules['cryptLord.savantEnhancement'];
    const data = state.current?.data;
    if (!service || !data) return;
    if (!state.pathwayPool) { loadPathways(); return; }
    if (!modules['cryptLord.enhancementState']?.gate(data, state.pathwayPool).unlocked) return;
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
    if (modules['cryptLord.audienceImaginationUi'] && state.current?.data?.stat_data && state.pathwayPool) {
      if (!modules['cryptLord.audienceImaginationState'].gate(state.current.data, state.pathwayPool).unlocked) return;
      const section = element('section', 'crypt-lord-game-shell__scroll');
      section.appendChild(button('空想', 'crypt-lord-game-shell__small-button', () => {
        closeModal();
        void modules['cryptLord.audienceImaginationUi'].open();
      }));
      state.modalBody.appendChild(section);
      return;
    }
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
    save.disabled = state.imaginationBusy || battleLocked(data);
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
        battleLocked(data);
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
      if (battleLocked(original.data)) throw new Error('请先结束并结算战斗，再修改空想。');
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
    const rosterUi = modules['cryptLord.grazingUi'];
    if (rosterUi && !battleLocked(data)) {
      const section = element('section', 'crypt-lord-game-shell__scroll');
      section.append(element('h3', '', '秘祈人 · 放牧名册'),
        element('p', 'crypt-lord-game-shell__muted',
          `灵魂 ${names.length}/${grazing.capacity(gate.rank)} · 激活 ${active.length}/${grazing.activeCap(gate.rank)}`),
        button('打开放牧名册', 'crypt-lord-game-shell__dialog-button', () => {
          closeModal();
          void rosterUi.open();
        }));
      state.modalBody.appendChild(section);
      return;
    }
    const storedActive = grazing.namesOf(data, '激活灵魂');
    const dormant = grazing.namesOf(data, '休眠灵魂');
    const ordered = [...new Set([...storedActive, ...dormant, ...names])];
    if (!state.grazingDraft || state.grazingDraft.messageId !== state.current.message_id) {
      state.grazingDraft = { messageId: state.current.message_id, names: [...active] };
    }
    const draft = state.grazingDraft.names;
    const battle = personalBattleState.get(data);
    const teamActive = teamBattleState.get(data)?.status === 'active';
    const inBattle = battleLocked(data);
    const locked = state.grazingBusy || state.imaginationBusy || state.battleBusy ||
      inBattle && battle?.status !== 'active';
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
      teamActive ? '多人战斗中，请在战术阶段切换激活组合。'
        : inBattle ? `战斗中切换组合消耗 ${grazing.switchCost(data, state.pathwayPool)} 点灵性；仅玩家回合可切换。`
        : '未激活灵魂保留在名册；场外更换组合不消耗灵性。'));
    const actions = element('div', 'crypt-lord-game-shell__scroll-actions');
    const save = button(inBattle ? '切换激活组合' : '保存激活组合',
      'crypt-lord-game-shell__dialog-button is-primary', () => {
        void commitGrazing('save', [...state.grazingDraft.names]);
      });
    save.disabled = locked || (inBattle && battle?.currentTurn !== 'player');
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
      if (battleLocked(original.data) && original.data.cryptLord?.personalBattle?.status !== 'active')
        throw new Error('请在战术阶段切换组合，结束并结算战斗后才能认证或释放灵魂。');
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
      const guard = () => !state.disposed && token === state.chatToken && state.current?.message_id === messageId;
      const saved = await store.writeAssistantData(messageId, next, 'affected', async () => {
        const current = await store.readMessage(messageId);
        if (!guard() || JSON.stringify(current) !== JSON.stringify(original))
          throw Error('楼层正文、变量或聊天已变化，未写入');
      }, guard, { rulePool: abilityState.assertPool ? pool : undefined });
      if (!guard()) return;
      state.current.data = saved;
      state.pathwayPool = pool;
      state.grazingDraft = null;
      state.grazingCandidate = '';
      state.grazingResult = action === 'certify' ? `认证通过：${verdict.reason}`
        : action === 'release' ? `已永久释放“${payload}”。` : '激活组合已同步。';
      modules[VARIABLE_WORKBENCH_KEY]?.notifyUpdate?.({
        messageId, beforeData: fresh.data, afterData: saved, source: 'grazing',
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
    if (modules['cryptLord.readerMysticUi'] && state.current?.data?.stat_data && state.pathwayPool) {
      if (!modules['cryptLord.readerRosterState'].gate(state.current.data, state.pathwayPool).unlocked) return;
      const section = element('section', 'crypt-lord-game-shell__scroll');
      section.appendChild(button('秘术强化与解析学习', 'crypt-lord-game-shell__small-button', () => {
        closeModal();
        void modules['cryptLord.readerMysticUi'].open();
      }));
      state.modalBody.appendChild(section);
      return;
    }
    const reader = modules[READER_MYSTIC_KEY];
    const data = state.current?.data;
    const pool = state.pathwayPool;
    if (!reader || !data?.stat_data) return;
    if (!pool) { loadPathways(); return; }
    const owner = reader.gate(data, pool);
    if (!owner.unlocked) return;
    const locked = state.readerBusy || state.imaginationBusy ||
      battleLocked(data);
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
      if (battleLocked(original.data)) throw new Error('请先结束并结算战斗，再编辑秘术或学习任务。');
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
    if (modules['cryptLord.mysteryRosterUi'] && state.current?.data?.stat_data && state.pathwayPool) {
      if (!modules['cryptLord.mysteryRosterState'].gate(state.current.data, state.pathwayPool).unlocked) return;
      const section = element('section', 'crypt-lord-game-shell__scroll');
      section.appendChild(button('神秘再现知识与法术', 'crypt-lord-game-shell__small-button', () => {
        closeModal();
        void modules['cryptLord.mysteryRosterUi'].open();
      }));
      state.modalBody.appendChild(section);
      return;
    }
    const reenact = modules[REENACTMENT_KEY];
    const reader = modules[READER_MYSTIC_KEY];
    const data = state.current?.data;
    const pool = state.pathwayPool;
    if (!reenact || !reader || !data?.stat_data) return;
    if (!pool) { loadPathways(); return; }
    const owner = reenact.gate(data, pool);
    if (!owner.unlocked) return;
    const locked = state.reenactBusy || battleLocked(data);
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
      if (battleLocked(original.data)) throw new Error('请先结束并结算战斗，再修改神秘再现。');
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
    if (modules['cryptLord.shamanPictureUi'] && state.current?.data?.stat_data && state.pathwayPool) {
      if (!modules['cryptLord.shamanPictureState'].gate(state.current.data, state.pathwayPool).unlocked) return;
      const section = element('section', 'crypt-lord-game-shell__scroll');
      section.appendChild(button('制造画中人', 'crypt-lord-game-shell__small-button', () => {
        closeModal();
        void modules['cryptLord.shamanPictureUi'].open();
      }));
      state.modalBody.appendChild(section);
      return;
    }
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
    const locked = state.pictureBusy || battleLocked(data);
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
      if (battleLocked(original.data)) throw new Error('请先结束并结算战斗，再制造画中人。');
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
    if (modules['cryptLord.arbiterJurisdictionUi'] && state.current?.data?.stat_data && state.pathwayPool) {
      if (!modules['cryptLord.arbiterJurisdictionState'].gate(state.current.data, state.pathwayPool).unlocked) return;
      const section = element('section', 'crypt-lord-game-shell__scroll');
      section.appendChild(button('设定辖区', 'crypt-lord-game-shell__small-button', () => {
        closeModal();
        void modules['cryptLord.arbiterJurisdictionUi'].open();
      }));
      state.modalBody.appendChild(section);
      return;
    }
    const arbiter = modules[ARBITER_JURISDICTION_KEY];
    const data = state.current?.data;
    if (!arbiter?.gate(data?.stat_data).unlocked) return;
    const value = arbiter.stored(data.stat_data);
    const hasBase = arbiter.hasBase(value);
    const familiar = arbiter.familiarity(data);
    const rankScope = arbiter.scope(arbiter.gate(data.stat_data).rank);
    const draft = arbiterDraft();
    const locked = state.arbiterBusy || battleLocked(data);
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
      if (battleLocked(original.data)) throw new Error('请先结束并结算战斗，再变更辖区。');
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
    if (modules['cryptLord.shamanTerritoryUi'] && state.current?.data?.stat_data && state.pathwayPool) {
      if (!modules['cryptLord.shamanTerritoryState'].gate(state.current.data, state.pathwayPool).unlocked) return;
      const section = element('section', 'crypt-lord-game-shell__scroll');
      section.appendChild(button('领地图腾', 'crypt-lord-game-shell__small-button', () => {
        closeModal();
        void modules['cryptLord.shamanTerritoryUi'].open();
      }));
      state.modalBody.appendChild(section);
      return;
    }
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
      if (battleLocked(original.data)) throw new Error('请先结束并结算战斗，再更换图腾。');
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
    if (modules['cryptLord.scrollWorkshopUi'] && state.current?.data?.stat_data && state.pathwayPool) {
      if (!modules['cryptLord.scrollWorkshopState'].gate(state.current.data, state.pathwayPool).unlocked) return;
      const section = element('section', 'crypt-lord-game-shell__pathway-item');
      section.append(element('h3', '', '窥秘人 · 卷轴制造'),
        button('打开卷轴制造', 'crypt-lord-game-shell__small-button', () => {
          closeModal();
          void modules['cryptLord.scrollWorkshopUi'].open();
        }));
      state.modalBody.appendChild(section);
      return;
    }
    const scroll = modules[SCROLL_CRAFTING_KEY];
    const stat = state.current?.data?.stat_data;
    if (!scroll?.gate(stat).unlocked) return;
    const section = element('section', 'crypt-lord-game-shell__scroll');
    section.appendChild(element('h3', '', '窥秘人 · 卷轴制造'));
    const locked = state.scrollBusy || battleLocked(state.current?.data);
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
      if (battleLocked(original.data)) throw new Error('请先结束并结算战斗，再修改卷轴。');
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
    if (modules['cryptLord.mysteryAnalysisUi'] && state.current?.data?.stat_data && state.pathwayPool) {
      if (!modules['cryptLord.mysteryAnalysisState'].gate(state.current.data, state.pathwayPool).unlocked) return;
      const section = element('section', 'crypt-lord-game-shell__pathway-item');
      section.append(element('h3', '', '窥秘人 · 神秘解析'),
        button('打开神秘解析', 'crypt-lord-game-shell__small-button', () => {
          closeModal();
          void modules['cryptLord.mysteryAnalysisUi'].open();
        }));
      state.modalBody.appendChild(section);
      return;
    }
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
    if (modules['cryptLord.inventoryUi']) {
      closeModal();
      return modules['cryptLord.inventoryUi'].open(state.current?.message_id ?? null);
    }
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

  function abilityLocked() {
    return abilityState.locked(state.current?.data);
  }

  function renderAbilities() {
    if (modules['cryptLord.abilitiesUi']) {
      closeModal();
      return modules['cryptLord.abilitiesUi'].open(state.current?.message_id ?? null);
    }
    notify('序列能力模块尚未加载。', 'error');
    return false;
  }

  function closeModal(force = false) {
    if (state.modalTitle?.textContent === '战斗系统' && state.battlePending && force !== true &&
      !(afterNative.getHost()?.window || window).confirm('放弃当前保留的战斗结果并关闭窗口？')) return false;
    state.battleEpoch++;
    state.battlePending = null; state.battleBusy = false; state.battleWriting = false;
    state.battleInvalid = false;
    cancelBattleAuto();
    if (state.modal?.dataset.audioActive === 'true') {
      state.battleAudio?.leave();
      delete state.modal.dataset.audioActive;
    }
    state.modal?.setAttribute('data-open', 'false');
    state.modal?.setAttribute('aria-busy', 'false');
    if (state.battleReturnFocus?.isConnected) state.battleReturnFocus.focus();
    state.battleReturnFocus = null;
  }

  function openModal(title) {
    if (!state.modal) return false;
    if (title !== '战斗系统' && state.modalTitle?.textContent === '战斗系统' && closeModal() === false) return false;
    const openingBattle = title === '战斗系统' &&
      (state.modal.dataset.open !== 'true' || state.modalTitle.textContent !== title);
    if (openingBattle) state.battleReturnFocus = (afterNative.getHost()?.document || document).activeElement;
    if (state.battleVolume) state.battleVolume.hidden = title !== '战斗系统';
    if (state.modal.dataset.audioActive === 'true' && title !== '战斗系统') {
      state.battleAudio?.leave();
      delete state.modal.dataset.audioActive;
    }
    state.modalTitle.textContent = title;
    state.modalDialog.setAttribute('aria-label', title);
    clear(state.modalBody);
    state.modal.setAttribute('data-open', 'true');
    if (openingBattle) state.modalDialog.focus();
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
    state.commandCapture?.();
    state.commandCapture = null;
    state.commandLoadToken += 1;
    if (state.commandPanel) {
      state.commandPanel.dataset.open = 'false';
      state.commandPanel.removeAttribute('aria-busy');
    }
    if (state.commandBall) state.commandBall.style.visibility = '';
    if (state.commandPanel?.contains((afterNative.getHost()?.document || document).activeElement)) state.commandBall?.focus();
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

  async function showQuickShortcuts(options = {}) {
    if (state.disposed || !state.commandPanel || !state.commandBody) return;
    state.commandCapture?.();
    state.commandCapture = null;
    if (options.discardDraft) state.commandDraft = null;
    state.commandPanel.dataset.open = 'true';
    state.commandPanel.focus();
    state.commandBall.style.visibility = 'hidden';
    const token = ++state.commandLoadToken;
    const chat = state.chatToken;
    const active = () => !state.disposed && token === state.commandLoadToken &&
      chat === state.chatToken && state.commandPanel?.dataset.open === 'true';
    let shortcutsService, generationEpoch;
    const guard = () => {
      if (!active()) throw Error('窗口或聊天已变化，保存已取消');
      if (shortcutsService?.status().generating || generationEpoch !== shortcutsService?.status().adminEpoch)
        throw Error('生成或聊天已变化，草稿已保留，请重新读取后再保存');
    };
    const body = state.commandBody;
    clear(body);
    body.appendChild(element('div', 'crypt-lord-game-shell__empty', '正在读取快捷指令…'));
    try {
      const shortcuts = await contract.waitGlobalInitialized(QUICK_SHORTCUTS_KEY, { timeoutMs: 10000 });
      shortcutsService = shortcuts;
      generationEpoch = shortcuts.status().adminEpoch;
      const loaded = await shortcuts.load({ ...options, guard: () => active() });
      if (!active()) return;
      const remembered = state.commandDraft?.chat === chat ? state.commandDraft : null;
      if (remembered) generationEpoch = remembered.adminEpoch ?? generationEpoch;
      let { commands, state: shortcutState, revisions } = remembered || loaded;
      let dirty = Boolean(remembered);
      let busy = false;
      let form;
      let notice;
      const message = (text, error = false) => {
        if (!active() || !notice) return;
        notice.textContent = text;
        notice.dataset.error = String(error);
      };
      const remember = () => {
        if (!active() || !form) return;
        const rows = [...form.querySelectorAll('[data-shortcut-row]')];
        const next = rows.map(row => row.querySelector('textarea').value);
        const selected = rows.filter(row => row.querySelector('[data-supplementary]').checked)
          .map(row => row.querySelector('textarea').value.trim()).filter(Boolean);
        const keep = form.querySelector('[data-keep]').checked;
        const nextState = { version: 1, isKeepShortcutsEnabled: keep, pendingSupplementary: selected };
        dirty = dirty || JSON.stringify(commands) !== JSON.stringify(next) || JSON.stringify(shortcutState) !== JSON.stringify(nextState);
        commands = next;
        shortcutState = nextState;
        state.commandDraft = dirty ? { commands: [...commands], state: structuredClone(shortcutState), revisions: structuredClone(revisions), chat, adminEpoch: generationEpoch } : null;
      };
      state.commandCapture = remember;
      const reload = () => {
        remember();
        const view = afterNative.getHost()?.window || window;
        if (dirty && !view.confirm('放弃未保存的快捷指令修改并重新读取？')) return;
        void showQuickShortcuts({ discardDraft: true });
      };
      const persist = async (nextCommands, nextState) => {
        if (busy || !active()) return;
        remember();
        if (nextCommands != null) commands = nextCommands;
        if (nextState != null) shortcutState = nextState;
        dirty = true;
        state.commandDraft = { commands: [...commands], state: structuredClone(shortcutState), revisions: structuredClone(revisions), chat, adminEpoch: generationEpoch };
        busy = true;
        state.commandPanel.setAttribute('aria-busy', 'true');
        form.disabled = true;
        try {
          if (!revisions) throw Error('请先重新读取已提交的快捷指令');
          if (commands.some(command => !command.trim())) throw Error('指令不能为空；删除请使用删除按钮');
          const saved = await shortcuts.save(commands, shortcutState, revisions, guard, options);
          if (!active()) return;
          ({ commands, state: shortcutState, revisions } = saved);
          dirty = false;
          state.commandDraft = null;
          render();
          message(saved.warning || '快捷指令已保存', Boolean(saved.warning));
        } catch (error) {
          if (!active()) return;
          render();
          message(`保存失败：${error?.message || error}`, true);
        } finally {
          busy = false;
          if (active()) { form.disabled = false; state.commandPanel.removeAttribute('aria-busy'); }
        }
      };
      const render = () => {
        if (!active()) return;
        clear(body);
        form = element('fieldset', 'crypt-lord-game-shell__shortcut-form');
        form.disabled = busy;
        const toolbar = element('div', 'crypt-lord-game-shell__shortcut-toolbar');
        const keep = element('label', 'crypt-lord-game-shell__shortcut-keep');
        const checkbox = element('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.keep = '';
        checkbox.checked = shortcutState.isKeepShortcutsEnabled;
        checkbox.addEventListener('change', () => void persist());
        keep.append(checkbox, element('span', '', '保持选中'));
        toolbar.append(keep, button('添加指令', 'crypt-lord-game-shell__dialog-button', () => {
          remember();
          let name = '新增快捷指令';
          let suffix = 2;
          while (commands.includes(name)) name = `新增快捷指令 ${suffix++}`;
          void persist([...commands, name]);
        }), button('保存修改', 'crypt-lord-game-shell__dialog-button', () => void persist()),
        button('↻', 'crypt-lord-game-shell__dialog-button', reload));
        toolbar.lastChild.title = '重新读取快捷指令';
        toolbar.lastChild.setAttribute('aria-label', '重新读取快捷指令');
        form.appendChild(toolbar);
        if (!commands.length) {
          form.appendChild(element('div', 'crypt-lord-game-shell__empty', '当前没有快捷指令'));
        }
        const list = element('div', 'crypt-lord-game-shell__shortcut-list');
        commands.forEach((command, index) => {
          const row = element('div', 'crypt-lord-game-shell__shortcut-row');
          row.dataset.shortcutRow = '';
          row.dataset.selected = String(shortcutState.pendingSupplementary.includes(command.trim()));
          const input = element('textarea', 'crypt-lord-game-shell__shortcut-input');
          input.value = command;
          input.rows = 2;
          input.setAttribute('aria-label', `快捷指令 ${index + 1}`);
          input.addEventListener('input', remember);
          const actions = element('div', 'crypt-lord-game-shell__shortcut-actions');
          const immediate = button('✓', 'crypt-lord-game-shell__dialog-button', () => {
            const text = input.value.trim();
            if (!text) return;
            const source = afterNative.getHost(), nativeInput = source?.document.querySelector('#send_textarea');
            const draft = nativeInput?.value;
            if (!nativeInput || nativeInput.disabled || nativeInput.readOnly) return message('原生输入框不可编辑', true);
            void contract.waitGlobalInitialized(INPUT_KEY, { timeoutMs: 10000 })
              .then(inputAdapter => {
                guard();
                const check = () => {
                  guard();
                  if (modules[INPUT_KEY] !== inputAdapter || !inputAdapter.status().ready || !input.isConnected ||
                    input.value.trim() !== text || afterNative.getHost()?.document !== source.document ||
                    source.document.querySelector('#send_textarea') !== nativeInput || !nativeInput.isConnected ||
                    nativeInput.disabled || nativeInput.readOnly || nativeInput.value !== draft)
                    throw Error('输入框、指令或草稿已变化，请重新选择');
                };
                check();
                if (draft?.trim() && draft !== text && !source.window.confirm('原生输入框已有草稿，替换为此快捷指令？')) return;
                check();
                inputAdapter.setInputText(text, 'sillytavern-native');
                closeCommandPanel();
              })
              .catch(error => { if (active()) message(`无法填入指令：${error?.message || error}`, true); });
          });
          immediate.title = '填入原生输入框';
          immediate.setAttribute('aria-label', '填入原生输入框');
          const supplementary = element('label', 'crypt-lord-game-shell__shortcut-keep');
          const toggle = element('input');
          toggle.type = 'checkbox';
          toggle.dataset.supplementary = '';
          toggle.setAttribute('aria-label', `补充指令 ${index + 1}`);
          toggle.checked = row.dataset.selected === 'true';
          toggle.addEventListener('change', () => void persist());
          supplementary.append(toggle, element('span', '', '补充'));
          const remove = button('×', 'crypt-lord-game-shell__dialog-button', () => {
            remember();
            if (!(afterNative.getHost()?.window || window).confirm('删除此快捷指令？')) return;
            const deleted = commands[index].trim();
            void persist(commands.filter((_, position) => position !== index), { ...shortcutState,
              pendingSupplementary: shortcutState.pendingSupplementary.filter(item => item !== deleted) });
          });
          remove.title = '删除此指令';
          remove.setAttribute('aria-label', `删除指令 ${index + 1}`);
          actions.append(immediate, supplementary, remove);
          row.append(input, actions);
          list.appendChild(row);
        });
        form.appendChild(list);
        notice = element('div', 'crypt-lord-game-shell__shortcut-notice');
        notice.setAttribute('role', 'status');
        body.append(form, notice);
      };
      render();
      if (dirty) message('未保存的修改已保留');
      else if (options.repairState) message('默认状态已载入，尚未保存');
    } catch (error) {
      if (active()) {
        clear(body);
        body.appendChild(element('div', 'crypt-lord-game-shell__empty', `快捷指令读取失败：${error?.message || error}`));
        body.appendChild(button('重新读取', 'crypt-lord-game-shell__dialog-button', () => void showQuickShortcuts()));
        if (/JSON 损坏|格式或版本/.test(String(error?.message || error))) {
          body.appendChild(button('载入默认状态', 'crypt-lord-game-shell__dialog-button', () => {
            if ((afterNative.getHost()?.window || window).confirm('载入默认勾选状态？只有点击保存后才会写入世界书。')) {
              void showQuickShortcuts({ discardDraft: true, repairState: true });
            }
          }));
        }
      }
    }
  }

  async function openEditor() {
    if (!Number.isInteger(state.current?.message_id)) return;
    const messageId = state.current.message_id, token = state.chatToken;
    const editor = await contract.waitGlobalInitialized(EDITOR_KEY, { timeoutMs: 10000 });
    if (state.disposed || token !== state.chatToken || state.current?.message_id !== messageId) return;
    await editor.open(messageId);
  }

  async function openVariableEditor() {
    if (!Number.isInteger(state.current?.message_id)) {
      notify('请先选择或生成一条真实 assistant 楼层。', 'warning');
      return;
    }
    const token = state.chatToken, messageId = state.current.message_id;
    const workbench = await contract.waitGlobalInitialized(VARIABLE_WORKBENCH_KEY, { timeoutMs: 10000 });
    if (state.disposed || token !== state.chatToken || messageId !== state.current?.message_id) return;
    await workbench.open(messageId);
  }

  async function openOrganizationConsole(kind) {
    if (!Number.isInteger(state.current?.message_id)) {
      notify('请先选择或生成一条真实 assistant 楼层。', 'warning');
      return;
    }
    const token = state.chatToken, messageId = state.current.message_id;
    const consoleUi = await contract.waitGlobalInitialized(ORGANIZATION_CONSOLE_KEY, { timeoutMs: 10000 });
    if (state.disposed || token !== state.chatToken || messageId !== state.current?.message_id) return;
    await consoleUi.open(kind, messageId);
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

  async function showSettings() {
    const token = state.chatToken;
    try {
      const settings = await contract.waitGlobalInitialized('cryptLord.systemSettingsUi', { timeoutMs: 10000 });
      if (state.disposed || token !== state.chatToken) return;
      await settings.open({ get: theme, set: setTheme });
    } catch (error) {
      if (!state.disposed && token === state.chatToken) notify(`系统设置不可用：${error?.message || error}`, 'error');
    }
  }

  function showFeature(feature) {
    if (feature.id === 'npc-progression') {
      const token = state.chatToken, messageId = state.current?.message_id ?? null;
      return void contract.waitGlobalInitialized('cryptLord.npcProgressionUi', { timeoutMs: 10000 })
        .then(api => token === state.chatToken && !state.disposed && api.open(messageId))
        .catch(error => {
          if (token === state.chatToken && !state.disposed) notify(`打开NPC成长失败：${error?.message || error}`, 'error');
        });
    }
    if (feature.id === 'attribute-recalculation') {
      const token = state.chatToken, messageId = state.current?.message_id ?? null;
      return void contract.waitGlobalInitialized('cryptLord.attributeRecalculationUi', { timeoutMs: 10000 })
        .then(api => token === state.chatToken && !state.disposed && api.open(messageId))
        .catch(error => {
          if (token === state.chatToken && !state.disposed) notify(`打开属性重算失败：${error?.message || error}`, 'error');
        });
    }
    if (feature.id === 'cashflow') {
      const token = state.chatToken, messageId = state.current?.message_id ?? null;
      return void contract.waitGlobalInitialized('cryptLord.cashflowUi', { timeoutMs: 10000 })
        .then(api => token === state.chatToken && !state.disposed && api.open(messageId))
        .catch(error => {
          if (token === state.chatToken && !state.disposed) notify(`打开钱包与稳定收支失败：${error?.message || error}`, 'error');
        });
    }
    if (feature.id === 'world-report') {
      const token = state.chatToken, messageId = state.current?.message_id ?? null;
      return void contract.waitGlobalInitialized('cryptLord.worldReportUi', { timeoutMs: 10000 })
        .then(api => token === state.chatToken && !state.disposed && api.open(messageId))
        .catch(error => {
          if (token === state.chatToken && !state.disposed) notify(`打开世界线同步报告失败：${error?.message || error}`, 'error');
        });
    }
    if (feature.id === 'extracted') {
      const token = state.chatToken;
      return void contract.waitGlobalInitialized('cryptLord.responseInspectorUi', { timeoutMs: 10000 })
        .then(api => token === state.chatToken && !state.disposed &&
          api.open(Number.isInteger(state.current?.message_id) ? state.current.message_id : null, 'variables'))
        .catch(error => {
          if (token === state.chatToken && !state.disposed) notify(`打开提取内容失败：${error?.message || error}`, 'error');
        });
    }
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
    if (feature.id === 'journey') return void contract.waitGlobalInitialized(JOURNEY_READER_KEY, { timeoutMs: 10000 })
      .then(api => api.open(Number.isInteger(state.current?.message_id) ? state.current.message_id : null))
      .catch(error => notify(`打开本周目经历失败：${error?.message || error}`, 'error'));
    if (feature.id === 'battle-prompt-mode') {
      const token = state.chatToken;
      return void contract.waitGlobalInitialized('cryptLord.battlePromptModeUi', { timeoutMs: 10000 })
        .then(api => token === state.chatToken && !state.disposed && api.open())
        .catch(error => notify(`打开战斗提示模式失败：${error?.message || error}`, 'error'));
    }
    if (feature.id === 'collection-growth') {
      const token = state.chatToken;
      return void contract.waitGlobalInitialized('cryptLord.collectionGrowthUi', { timeoutMs: 10000 })
        .then(api => token === state.chatToken && !state.disposed && api.open())
        .catch(error => notify(`打开变量增殖提醒失败：${error?.message || error}`, 'error'));
    }
    if (feature.id === 'journey-sequence') {
      const token = state.chatToken;
      return void contract.waitGlobalInitialized('cryptLord.journeySequenceUi', { timeoutMs: 10000 })
        .then(api => token === state.chatToken && !state.disposed && api.open())
        .catch(error => notify(`打开经历序号修正失败：${error?.message || error}`, 'error'));
    }
    if (feature.id === 'danmaku') {
      const token = state.chatToken;
      return void contract.waitGlobalInitialized('cryptLord.danmakuUi', { timeoutMs: 10000 })
        .then(api => token === state.chatToken && !state.disposed &&
          api.open(Number.isInteger(state.current?.message_id) ? state.current.message_id : null))
        .catch(error => notify(`打开楼层弹幕失败：${error?.message || error}`, 'error'));
    }
    if (feature.id === 'current-clues') return void contract.waitGlobalInitialized(CURRENT_CLUES_KEY, { timeoutMs: 10000 })
      .then(api => api.open(Number.isInteger(state.current?.message_id) ? state.current.message_id : null))
      .catch(error => notify(`打开当前线索失败：${error?.message || error}`, 'error'));
    if (feature.id === 'relationships') return showRelationships();
    if (feature.id === 'archive') return showArchive();
    if (feature.id === 'abilities') return renderAbilities();
    if (feature.id === 'command') return void showQuickShortcuts();
    if (feature.id === 'source-castle') return void contract.waitGlobalInitialized(SOURCE_CASTLE_UI_KEY, { timeoutMs: 10000 }).then(api => api.open()).catch(error => notify(`打开源堡系统失败：${error?.message || error}`, 'error'));
    if (feature.hostButton) {
      afterNative.getHost()?.document?.querySelector?.(feature.hostButton)?.click?.();
      return;
    }
    if (!openModal(feature.label)) return;
    if (feature.id === 'actions') {
      const body = state.modalBody, id = state.current?.message_id, token = state.chatToken;
      const active = () => !state.disposed && state.chatToken === token && state.current?.message_id === id &&
        state.modal?.dataset.open === 'true' && state.modalTitle?.textContent === feature.label;
      body.appendChild(element('div', 'crypt-lord-game-shell__empty', '正在读取行动选项...'));
      void contract.waitGlobalInitialized('cryptLord.actionOptions', { timeoutMs: 10000 })
        .then(service => service.createList(id, active))
        .then(list => { if (active()) body.replaceChildren(list); })
        .catch(error => { if (active()) body.replaceChildren(element('div', 'crypt-lord-game-shell__empty', `行动读取失败：${error.message}`)); });
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

  function showArchive() {
    if (modules['cryptLord.characterArchiveUi']) {
      closeModal();
      return modules['cryptLord.characterArchiveUi'].open(state.current?.message_id ?? null);
    }
    notify('角色档案模块尚未加载。', 'error');
    return false;
  }

  function showRelationships() {
    if (modules['cryptLord.relationshipsUi']) {
      closeModal();
      return modules['cryptLord.relationshipsUi'].open(state.current?.message_id ?? null);
    }
    notify('人物关系模块尚未加载。', 'error');
    return false;
  }

  async function deleteAcceptedQuest(quest) {
    const messageId = state.current?.message_id;
    const archive = modules['cryptLord.characterArchiveUi'];
    if (!archive || !Number.isInteger(messageId)) { notify('角色档案模块尚未加载。', 'error'); return; }
    const expected = Object.fromEntries(['message_id', 'role', 'message', 'data', 'swipe_id']
      .map(key => [key, state.current[key]]));
    await archive.deleteQuest(messageId, quest, expected);
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
      const remove = button('', 'crypt-lord-game-shell__quest-delete', () => { void deleteAcceptedQuest(quest); });
      const trash = element('i', 'fa-solid fa-trash-can'); trash.setAttribute('aria-hidden', 'true'); remove.append(trash);
      remove.title = `删除任务「${quest.name}」`;
      remove.setAttribute('aria-label', remove.title);
      remove.disabled = modules['cryptLord.characterArchiveUi']?.status().busy === true;
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
    dialog.tabIndex = -1;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.addEventListener('keydown', event => {
      if (state.modalTitle?.textContent !== '战斗系统') return;
      if (event.key === 'Escape') { event.preventDefault(); closeModal(); }
      if (event.key !== 'Tab') return;
      const nodes = [...dialog.querySelectorAll('button, input, textarea, select, summary')]
        .filter(node => !node.disabled && node.getClientRects().length);
      const first = nodes[0], last = nodes.at(-1), focus = dialog.ownerDocument.activeElement;
      if (!first) { event.preventDefault(); dialog.focus(); }
      else if (event.shiftKey && (focus === first || focus === dialog)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (focus === last || focus === dialog)) { event.preventDefault(); first.focus(); }
    });
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
    commandPanel.setAttribute('role', 'dialog');
    commandPanel.setAttribute('aria-modal', 'true');
    commandPanel.tabIndex = -1;
    commandPanel.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const nodes = [...commandPanel.querySelectorAll('button, input, textarea')].filter(node => !node.disabled && node.getClientRects().length);
      const first = nodes[0], last = nodes.at(-1), focus = (afterNative.getHost()?.document || document).activeElement;
      if (!first) { event.preventDefault(); commandPanel.focus(); }
      else if (event.shiftKey && (focus === first || focus === commandPanel)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (focus === last || focus === commandPanel)) { event.preventDefault(); first.focus(); }
    });
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
      if (Number.isInteger(previousId)) {
        state.battleEpoch++; state.battleBusy = false; state.battleWriting = false;
        state.battleInvalid = true; state.battlePending = null; state.battleAutoPaused = true;
        cancelBattleAuto();
      }
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
    const openSettlementSettings = () => { void showSettings(); };
    hostWindow?.addEventListener?.('cryptLord:open-variable-settlement-settings', openSettlementSettings);
    state.cleanups.push(() => hostWindow?.removeEventListener?.('cryptLord:open-variable-settlement-settings', openSettlementSettings));
    const updateConsumedShortcuts = () => {
      if (!state.disposed && state.commandPanel?.dataset.open === 'true' &&
        !state.commandPanel.hasAttribute('aria-busy') && !state.commandDraft) void showQuickShortcuts();
    };
    const commandEscape = event => {
      if (event.key === 'Escape' && state.commandPanel?.dataset.open === 'true' &&
        state.commandPanel.contains(hostWindow.document.activeElement)) {
        event.preventDefault();
        closeCommandPanel();
        state.commandBall?.focus();
      }
    };
    hostWindow?.addEventListener?.('cryptLord:quick-shortcuts-consumed', updateConsumedShortcuts);
    hostWindow?.addEventListener?.('keydown', commandEscape);
    state.cleanups.push(() => {
      hostWindow?.removeEventListener?.('cryptLord:quick-shortcuts-consumed', updateConsumedShortcuts);
      hostWindow?.removeEventListener?.('keydown', commandEscape);
    });
    const events = afterNative.tavernEvents();
    if (events) {
      bind(events.GENERATION_STARTED, (type, options, dryRun) => {
        if (['quiet', 'quiet_prompt', 'dryRun'].includes(type) || dryRun || options?.dryRun || options?.quiet_prompt) return;
        if (state.commandPanel?.dataset.open === 'true') closeCommandPanel();
        state.battleEpoch++;
        state.battleGenerating = true;
        state.battleBusy = false; state.battleWriting = false; state.battleInvalid = true;
        cancelBattleAuto();
        updateBattleControls();
      });
      const endBattleGeneration = () => {
        state.battleGenerating = false;
        if (state.modal?.dataset.open === 'true' && state.modalTitle?.textContent === '战斗系统')
          void renderBattleSystem();
      };
      bind(events.GENERATION_ENDED, endBattleGeneration);
      bind(events.GENERATION_STOPPED, endBattleGeneration);
      bind(events.CHARACTER_MESSAGE_RENDERED, () => { void refresh(); });
      bind(events.MESSAGE_UPDATED, () => { void refresh(); });
      bind(events.MESSAGE_DELETED, () => { void refresh(); });
      bind(events.CHAT_CHANGED, () => {
        if (state.modalTitle?.textContent === '战斗系统') closeModal(true);
        closeCommandPanel();
        state.commandDraft = null;
        cancelBattleAuto();
        state.battleAutoSteps = 0;
        state.battleAutoPaused = false;
        modules[GAME_AUDIO_KEY]?.stop();
        delete state.modal?.dataset.audioActive;
        state.chatToken++;
        state.battleGenerating = false;
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
      state.battleAudio?.dispose();
      state.disposed = true;
      state.battlePending = null;
      state.commandLoadToken++;
      state.commandCapture = null;
      state.commandDraft = null;
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
