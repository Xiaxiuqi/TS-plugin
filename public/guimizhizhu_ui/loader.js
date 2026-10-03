(() => {
  'use strict';

  const VERSION = 'stage1-1.1.0';
  const PUBLIC_BASE_URL = 'https://ts-plugin.pages.dev/guimizhizhu_ui/';
  const RESOURCE_TIMEOUT_MS = 15000;
  const LOG_PREFIX = `[CryptLordLoader:${VERSION}]`;
  const root = (window.cryptLord = window.cryptLord || {});

  // 同一轮加载只允许一个执行者；失败后重新执行 loader.js 会创建全新批次与 ready Promise。
  if (root.loader?.status === 'loading' || root.loader?.status === 'ready') return;
  const instanceId = root.__stage1Index?.instanceId || `loader_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  function getDebug() {
    const debug = root.debug;
    return debug && typeof debug.event === 'function' ? debug : null;
  }

  function debugEvent(category, action, details, level = 'info') {
    try {
      getDebug()?.event(category, 'cryptLord.loader', action, details, level);
    } catch {
      // Diagnostics must never affect resource loading.
    }
  }

  function detectBaseUrl() {
    const current = document.currentScript?.src;
    const discovered = Array.from(document.scripts)
      .map(script => script.src)
      .find(src => /\/guimizhizhu_ui\/loader\.js(?:[?#]|$)/.test(src));
    try {
      return new URL('./', current || discovered || PUBLIC_BASE_URL).href;
    } catch {
      return PUBLIC_BASE_URL;
    }
  }

  function validateMethods(label, api, methods) {
    if (!api || !methods.every(method => typeof api[method] === 'function')) {
      throw new Error(`${label} 未注册预期API形状(${methods.join(', ')})`);
    }
    return api;
  }

  const baseUrl = detectBaseUrl();
  const scriptId = String(document.currentScript?.dataset?.cryptLordScriptId || root.__stage1Index?.scriptId || root.__stage1ScriptId || '').trim();
  const cacheVersion = (() => {
    try { return new URL(document.currentScript?.src || location.href).searchParams.get('v'); } catch { return null; }
  })();
  const cssResources = [
    'shared/styles.css',
    'shared/game-audio.css',
    'modules/native-floor-editor/style.css',
    'modules/action-options/style.css',
    'modules/native-floor-status-bar/style.css',
    'modules/world-map/style.css',
    'modules/theater-console/style.css',
    'modules/floating-variable-workbench/style.css',
    'modules/ai-context-config/style.css',
    'modules/organization-console/style.css',
    'modules/domain-console/style.css',
    'modules/domain-affairs/style.css',
    'modules/domain-campaign/style.css',
    'modules/war-replay/style.css',
    'modules/dlc-manager/style.css',
    'modules/worldbook-toggle-profiles/style.css',
    'modules/dual-worldbook/style.css',
    'modules/custom-content/style.css',
    'modules/image-generation/style.css',
    'modules/random-events/style.css',
    'modules/event-generator/style.css',
    'modules/detective-case/style.css',
    'modules/divination/style.css',
    'modules/original-plot-guide/style.css',
    'modules/savant-material/style.css',
    'modules/savant-enhancement/style.css',
    'modules/source-castle/style.css',
    'modules/game-shell/style.css',
    'modules/judgment/style.css',
  ];
  const managerStyleResource = {
    type: 'css',
    path: 'modules/manager-ui/style.css',
  };
  const scriptResources = [
    {
      path: 'shared/contract.js',
      key: 'contract',
      validate: api =>
        validateMethods('window.cryptLord.contract', api, [
          'initializeGlobal',
          'waitGlobalInitialized',
          'releaseGlobal',
          'cancelWaiters',
          'reset',
        ]),
    },
    {
      path: 'shared/debug.js',
      key: 'cryptLord.debug',
      validate: api => {
        validateMethods('cryptLord.debug', api, ['isEnabled', 'setEnabled', 'event', 'status', 'snapshot', 'dispose']);
        return validateMethods('cryptLord.debug.panel', api.panel, ['mount', 'unmount', 'toggle', 'copy', 'clear']);
      },
    },
    {
      path: 'shared/host-api.js',
      key: 'cryptLord.hostApi',
      validate: api => validateMethods('cryptLord.hostApi', api, [
        'status',
        'getChatMessages',
        'getLatestAssistantMessage',
        'createChatMessages',
        'setChatMessages',
        'deleteChatMessages',
        'generate',
        'generateRaw',
        'getModelList',
        'getVariables',
        'replaceVariables',
        'getCharWorldbookNames',
        'getWorldbook',
        'waitForMvu',
        'dispose',
      ]),
    },
    {
      path: 'shared/lifecycle.js',
      key: 'cryptLord.lifecycle',
      validate: api => validateMethods('cryptLord.lifecycle', api, ['status', 'createScope', 'dispose']),
    },
    {
      path: 'shared/after-native-host.js',
      key: 'cryptLord.afterNativeHost',
      validate: api => validateMethods('cryptLord.afterNativeHost', api, [
        'status',
        'resolveHost',
        'getHost',
        'getDisplayedMessageElement',
        'createElement',
        'mount',
        'unmount',
        'clearMessage',
        'clearAll',
        'readChatMessages',
        'listAssistantMessages',
        'tavernEvents',
        'bindEvent',
        'dispose',
      ]),
    },
    {
      path: 'prompts/native-history-policy.js',
      key: 'cryptLord.nativeHistoryPolicy',
      validate: api => validateMethods('cryptLord.nativeHistoryPolicy', api, ['status', 'createInjection', 'dispose']),
    },
    {
      path: 'prompts/context-builder.js',
      key: 'cryptLord.contextBuilder',
      validate: api => validateMethods('cryptLord.contextBuilder', api, ['status', 'register', 'build', 'dispose']),
    },
    {
      path: 'core/state-store.js',
      key: 'cryptLord.stateStore',
      validate: api => validateMethods('cryptLord.stateStore', api, ['status', 'findLatestAssistant', 'readAssistantData', 'readMessageData', 'readMessage', 'writeAssistantData', 'writeAssistantMessage', 'dispose']),
    },
    {
      path: 'core/response-normalizer.js',
      key: 'cryptLord.responseNormalizer',
      validate: api => validateMethods('cryptLord.responseNormalizer', api, ['status', 'normalize', 'extractActions', 'extractLegacyActions', 'dispose']),
    },
    {
      path: 'core/native-settlement.js',
      key: 'cryptLord.nativeSettlement',
      validate: api => validateMethods('cryptLord.nativeSettlement', api, ['status', 'apply', 'dispose']),
    },
    {
      path: 'core/variable-patch.js',
      key: 'cryptLord.variablePatch',
      validate: api => validateMethods('cryptLord.variablePatch', api, ['status', 'commands', 'commandPath', 'apply', 'dispose']),
    },
    {
      path: 'core/ai-context-config.js',
      key: 'cryptLord.aiContextConfig',
      validate: api => validateMethods('cryptLord.aiContextConfig', api, ['status', 'normalize', 'allPaths', 'patternMatches', 'isHidden', 'isLocked', 'filterData', 'readConfig', 'saveConfig', 'dispose']),
    },
    {
      path: 'core/variable-settlement-api.js',
      key: 'cryptLord.variableSettlementApi',
      validate: api => validateMethods('cryptLord.variableSettlementApi', api, ['status', 'readSettings', 'saveSettings', 'getModelList', 'settle', 'repair', 'retryTurn', 'dispose']),
    },
    {
      path: 'core/item-forge.js',
      key: 'cryptLord.itemForge',
      validate: api => validateMethods('cryptLord.itemForge', api, ['status', 'loadConfigs', 'parseRank', 'baseValue', 'cost', 'roll', 'traits', 'dispose']),
    },
    {
      path: 'core/equipment-state.js',
      key: 'cryptLord.equipmentState',
      validate: api => validateMethods('cryptLord.equipmentState', api, ['status', 'apply', 'dispose']),
    },
    {
      path: 'core/character-panel-state.js',
      key: 'cryptLord.characterPanelState',
      validate: api => validateMethods('cryptLord.characterPanelState', api, ['status', 'attribute', 'traits', 'slots', 'quests', 'removeQuest', 'archive', 'dispose']),
    },
    {
      path: 'core/pathway-play-state.js',
      key: 'cryptLord.pathwayPlayState',
      validate: api => validateMethods('cryptLord.pathwayPlayState', api, [
        'status', 'resolvePathway', 'getPlayData', 'addMarionette', 'toggleMarionetteActive',
        'addGrazedSoul', 'toggleGrazedSoulActive', 'addConstruct', 'addMarauderClone', 'formatActionPrompt', 'dispose',
      ]),
    },
    {
      path: 'core/audience-imagination.js',
      key: 'cryptLord.audienceImagination',
      validate: api => validateMethods('cryptLord.audienceImagination', api, [
        'status', 'gate', 'canonical', 'stored', 'resolve', 'validate',
        'save', 'separate', 'sync', 'npcProjection', 'dispose',
      ]),
    },
    {
      path: 'core/grazing-state.js',
      key: 'cryptLord.grazingState',
      validate: api => validateMethods('cryptLord.grazingState', api, [
        'status', 'rank', 'capacity', 'activeCap', 'switchCost', 'playOf', 'soulsOf', 'namesOf',
        'candidates', 'parseVerdict', 'certify', 'capture', 'save', 'release', 'dispose',
      ]),
    },
    {
      path: 'core/reader-mystic.js',
      key: 'cryptLord.readerMystic',
      validate: api => validateMethods('cryptLord.readerMystic', api, [
        'status', 'gate', 'entries', 'candidates', 'validateTarget', 'start', 'cancel',
        'refreshTarget', 'parseVerdict', 'certify', 'adjudicate', 'defaultConfig',
        'normalize', 'configs', 'points', 'validate', 'average', 'build', 'sync',
        'save', 'remove', 'dispose',
      ]),
    },
    {
      path: 'core/mystery-reenactment-reference.js',
      key: 'cryptLord.reenactmentReference',
      validate: api => validateMethods('cryptLord.reenactmentReference', api, [
        'status', 'dispose',
      ]),
    },
    {
      path: 'core/mystery-reenactment.js',
      key: 'cryptLord.mysteryReenactment',
      validate: api => validateMethods('cryptLord.mysteryReenactment', api, [
        'status', 'gate', 'knowledge', 'ledger', 'configs', 'defaultConfig', 'validate',
        'buildCanon', 'sync', 'prompt', 'parseVerdict', 'certify', 'apply',
        'removeKnowledge', 'save', 'remove', 'dispose',
      ]),
    },
    {
      path: 'core/mystery-analysis.js',
      key: 'cryptLord.mysteryAnalysis',
      validate: api => validateMethods('cryptLord.mysteryAnalysis', api, [
        'status', 'gate', 'stored', 'bonus', 'completed', 'activeBonus', 'syncDisplay', 'reconcile',
        'items', 'summaries', 'loadSummaries', 'parseVerdict', 'outcome', 'apply', 'verify', 'dispose',
      ]),
    },
    {
      path: 'core/scroll-crafting.js',
      key: 'cryptLord.scrollCrafting',
      validate: api => validateMethods('cryptLord.scrollCrafting', api, [
        'status', 'gate', 'ranksFor', 'templates', 'materials', 'eligible', 'chance',
        'validate', 'save', 'remove', 'craft', 'dispose',
      ]),
    },
    {
      path: 'core/savant-material.js',
      key: 'cryptLord.savantMaterial',
      validate: api => validateMethods('cryptLord.savantMaterial', api, [
        'status', 'gate', 'sources', 'batches', 'parseRecognition', 'request',
        'chance', 'process', 'syncDisplay', 'dispose',
      ]),
    },
    {
      path: 'core/savant-enhancement.js',
      key: 'cryptLord.savantEnhancement',
      validate: api => validateMethods('cryptLord.savantEnhancement', api, [
        'status', 'store', 'modulesOf', 'equipment', 'draw', 'install', 'detach',
        'detachRisk', 'reconcile', 'productionBonuses', 'resolveWeapon', 'dispose',
      ]),
    },
    {
      path: 'core/weapon-classifier.js',
      key: 'cryptLord.weaponClassifier',
      validate: api => validateMethods('cryptLord.weaponClassifier', api, [
        'status', 'rankOf', 'valid', 'collect', 'section', 'parse', 'apply', 'dispose',
      ]),
    },
    {
      path: 'core/npc-weapon-assigner.js',
      key: 'cryptLord.npcWeaponAssigner',
      validate: api => validateMethods('cryptLord.npcWeaponAssigner', api, [
        'status', 'eligible', 'fallback', 'collect', 'section', 'parse', 'apply',
        'collectTeam', 'applyTeam', 'dispose',
      ]),
    },
    {
      path: 'core/initial-placement.js',
      key: 'cryptLord.initialPlacement',
      validate: api => validateMethods('cryptLord.initialPlacement', api, [
        'status', 'collect', 'section', 'safe', 'parse', 'deploy', 'dispose',
      ]),
    },
    {
      path: 'core/battle-tags.js',
      key: 'cryptLord.battleTags',
      validate: api => validateMethods('cryptLord.battleTags', api, [
        'status', 'load', 'add', 'remove', 'sync', 'tick', 'modifier', 'applySkill', 'dispose',
      ]),
    },
    {
      path: 'core/shaman-picture.js',
      key: 'cryptLord.shamanPicture',
      validate: api => validateMethods('cryptLord.shamanPicture', api, [
        'status', 'gate', 'records', 'choices', 'craft', 'removeLoss', 'dispose',
      ]),
    },
    {
      path: 'core/shaman-territory.js',
      key: 'cryptLord.shamanTerritory',
      validate: api => validateMethods('cryptLord.shamanTerritory', api, [
        'status', 'gate', 'radius', 'stored', 'syncRadius', 'cooldown', 'materials',
        'validate', 'certify', 'apply', 'judgeBattle', 'applyBattle', 'dispose',
      ]),
    },
    {
      path: 'core/arbiter-jurisdiction.js',
      key: 'cryptLord.arbiterJurisdiction',
      validate: api => validateMethods('cryptLord.arbiterJurisdiction', api, [
        'status', 'gate', 'scope', 'stored', 'hasBase', 'baseAllowed', 'appointmentAllowed',
        'familiarity', 'validateBase', 'certifyBase', 'applyBase',
        'validateAppointment', 'certifyAppointment', 'applyAppointment',
        'clearAppointment', 'judgeBattle', 'applyBattle', 'dispose',
      ]),
    },
    {
      path: 'core/detective-rules.js',
      key: 'cryptLord.detectiveRules',
      validate: api => validateMethods('cryptLord.detectiveRules', api, ['status', 'draw', 'formatDraw', 'formatAxes', 'fillPrompt', 'dispose']),
    },
    {
      path: 'core/detective-state.js',
      key: 'cryptLord.detectiveState',
      validate: api => validateMethods('cryptLord.detectiveState', api, [
        'status', 'getCases', 'createCase', 'addClue', 'toggleClueVerified', 'addSuspect', 'solveCase', 'buildCaseReport',
        'newInvestigation', 'removeCase', 'drawCase', 'promptFor', 'applyStage', 'request', 'exportChronicle',
        'configuration', 'saveConfiguration', 'customFor', 'dispose',
      ]),
    },
    {
      path: 'core/judgment-state.js',
      key: 'cryptLord.judgmentState',
      validate: api => validateMethods('cryptLord.judgmentState', api, [
        'status', 'JudgmentParser', 'JudgmentRenderer', 'JudgmentInteractor', 'JudgmentBeautifier', 'createBeautifier', 'dispose',
      ]),
    },
    {
      path: 'core/relationship-state.js',
      key: 'cryptLord.relationshipState',
      validate: api => validateMethods('cryptLord.relationshipState', api, ['status', 'list', 'toggleImportant', 'removeMany', 'dispose']),
    },
    {
      path: 'core/industry-state.js',
      key: 'cryptLord.industryState',
      validate: api => validateMethods('cryptLord.industryState', api, ['status', 'loadConfigs', 'loadPathways', 'principal', 'parseCurrency', 'evaluate', 'dashboard', 'allocation', 'create', 'settleWeekly', 'industryWeeklyGoods', 'applyIndustryProduce', 'dispose']),
    },
    {
      path: 'core/domain-defaults.js',
      key: 'cryptLord.domainDefaults',
      validate: api => validateMethods('cryptLord.domainDefaults', api, ['status', 'dispose']),
    },
    {
      path: 'core/domain-state.js',
      key: 'cryptLord.domainState',
      validate: api => validateMethods('cryptLord.domainState', api, [
        'status', 'ensureDomain', 'buildingDefs', 'startConstruction', 'beginConstruction',
        'demolishBuilding', 'toggleBuilding', 'sweepConstruction',
        'ensureRooms', 'assignRoom', 'startCoreUpgrade', 'beginCoreUpgrade', 'sweepCoreConstruction',
        'enqueueTraining', 'sweepTraining', 'recruitGold', 'recruit', 'dischargeLoose',
        'formArmy', 'disbandArmy', 'deployPieces',
        'foundationLevels', 'missedFoundationSpoils', 'setFoundationTarget', 'foundDomain',
        'promote', 'settlePeerRecognition', 'settlePeerBattle',
        'runDrill', 'runPeerBattle', 'nowMinutes', 'clearLedger',
        'weeklySettle', 'refreshZeroed', 'syncProjection', 'dispose',
      ]),
    },
    {
      path: 'core/domain-foundation.js',
      key: 'cryptLord.domainFoundation',
      validate: api => validateMethods('cryptLord.domainFoundation', api, ['status', 'evidence', 'parseVerdict', 'verify', 'dispose']),
    },
    {
      path: 'core/domain-recognition.js',
      key: 'cryptLord.domainRecognition',
      validate: api => validateMethods('cryptLord.domainRecognition', api, ['status', 'prompt', 'verify', 'dispose']),
    },
    {
      path: 'core/war-sim.js',
      key: 'cryptLord.warSim',
      validate: api => validateMethods('cryptLord.warSim', api, ['status', 'simulate', 'demo', 'buildReport', 'settlement', 'dispose']),
    },
    {
      path: 'core/war-replay.js',
      key: 'cryptLord.warReplay',
      validate: api => validateMethods('cryptLord.warReplay', api, ['status', 'create', 'dispose']),
    },
    {
      path: 'core/affair-state.js',
      key: 'cryptLord.affairState',
      validate: api => validateMethods('cryptLord.affairState', api, ['status', 'affairsOf', 'todosOf', 'findTodo', 'openAssembly', 'closeAssembly', 'generateAffairs', 'settleBatch', 'settleOwn', 'settleNeglect', 'dispose']),
    },
    {
      path: 'core/domain-affairs.js',
      key: 'cryptLord.domainAffairs',
      validate: api => validateMethods('cryptLord.domainAffairs', api, ['status', 'start', 'attendance', 'advance', 'assign', 'claim', 'dispose']),
    },
    {
      path: 'core/domain-campaign.js',
      key: 'cryptLord.domainCampaign',
      validate: api => validateMethods('cryptLord.domainCampaign', api, ['status', 'start', 'verdict', 'settle', 'battleProse', 'aftermath', 'exportText', 'dispose']),
    },
    {
      path: 'core/divination-presets.js',
      key: 'cryptLord.divinationPresets',
      validate: api => validateMethods('cryptLord.divinationPresets', api, ['status', 'defaultPreset', 'dispose']),
    },
    {
      path: 'core/divination-state.js',
      key: 'cryptLord.divinationState',
      validate: api => validateMethods('cryptLord.divinationState', api, ['status', 'calcThreshold', 'resolveCheck', 'createSession', 'parseAndApplyParams', 'buildPendingRitual', 'commitPendingRitual', 'buildExportReport', 'defaultPreset', 'loadPresets', 'savePresets', 'candidatePrompt', 'requestPhase', 'validateRitual', 'dispose']),
    },
    {
      path: 'core/original-plot-guide.js',
      key: 'cryptLord.originalPlotGuide',
      validate: api => validateMethods('cryptLord.originalPlotGuide', api, ['status', 'parseCurrentDate', 'parseEntryDateRange', 'currentEra', 'search', 'dispose']),
    },
    {
      path: 'core/source-castle-state.js',
      key: 'cryptLord.sourceCastleState',
      validate: api => validateMethods('cryptLord.sourceCastleState', api, ['status', 'collect', 'formatLogs', 'dispose']),
    },
    {
      path: 'core/battle-experience.js',
      key: 'cryptLord.battleExperience',
      validate: api => validateMethods('cryptLord.battleExperience', api, ['status', 'rank', 'deathXp', 'settle', 'preview', 'award', 'giftGain', 'compute', 'commit', 'dispose']),
    },
    {
      path: 'core/inventory-state.js',
      key: 'cryptLord.inventoryState',
      validate: api => validateMethods('cryptLord.inventoryState', api, ['status', 'remove', 'giftGain', 'gift', 'dispose']),
    },
    {
      path: 'core/ability-state.js',
      key: 'cryptLord.abilityState',
      validate: api => validateMethods('cryptLord.abilityState', api, ['groups', 'change', 'loadPool', 'synchronize', 'dispose']),
    },
      {
        path: 'core/battle-terrain-presets.js',
        key: 'cryptLord.battleTerrainPresets',
        validate: api => validateMethods('cryptLord.battleTerrainPresets', api, ['status', 'get', 'option', 'hits', 'tierOf', 'options', 'dispose']),
      },
      {
        path: 'core/natural-environment.js',
        key: 'cryptLord.naturalEnvironment',
        validate: api => validateMethods('cryptLord.naturalEnvironment', api, ['status', 'vocab', 'parse', 'sequenceRank', 'resolve', 'sync', 'dispose']),
      },
      {
        path: 'core/battlefield-painter.js',
        key: 'cryptLord.battlefieldPainter',
        validate: api => validateMethods('cryptLord.battlefieldPainter', api, ['status', 'prompt', 'parse', 'rasterize', 'props', 'apply', 'generate', 'dispose']),
      },
      {
        path: 'core/battle-life-save.js',
        key: 'cryptLord.battleLifeSave',
        validate: api => validateMethods('cryptLord.battleLifeSave', api, ['status', 'load', 'eligibility', 'initialize', 'absorb', 'saveStrategy', 'dispose']),
      },
      {
        path: 'core/battle-conditional-params.js',
        key: 'cryptLord.battleConditionalParams',
        validate: api => validateMethods('cryptLord.battleConditionalParams', api, ['status', 'evaluate', 'select', 'dispose']),
      },
      {
        path: 'core/personal-battle-state.js',
        key: 'cryptLord.personalBattleState',
        validate: api => validateMethods('cryptLord.personalBattleState', api, ['status', 'get', 'start', 'experiencePreview', 'settleExperience', 'act', 'canonOptions', 'useCanon', 'move', 'reachable', 'terrainAt', 'terrainOptions', 'paintTerrain', 'abilities', 'weaponMoves', 'weaponHitChance', 'auxiliaryMoves', 'consumableMoves', 'dispose']),
      },
      {
        path: 'core/battle-formulas.js',
        key: 'cryptLord.battleFormulas',
        validate: api => validateMethods('cryptLord.battleFormulas', api, ['status', 'initialize', 'validate', 'value', 'draw', 'attribute', 'damage', 'healing', 'accuracy', 'initiative', 'movement', 'dispose']),
      },
      {
        path: 'core/battle-auras.js',
        key: 'cryptLord.battleAuras',
        validate: api => validateMethods('cryptLord.battleAuras', api, ['status', 'initialize', 'eligibility', 'activate', 'deactivate', 'sweepDead', 'tick', 'options', 'statusLines', 'dispose']),
      },
      {
        path: 'core/battle-field-effect-reference.js',
        key: 'cryptLord.battleFieldEffectReference',
        validate: api => validateMethods('cryptLord.battleFieldEffectReference', api, ['create', 'averages', 'dispose']),
      },
      {
        path: 'core/battle-field-effects.js',
        key: 'cryptLord.battleFieldEffects',
        validate: api => validateMethods('cryptLord.battleFieldEffects', api, ['initialize', 'options', 'preview', 'attempt', 'npc', 'sweep', 'endRound', 'turnStart', 'redirect', 'pending', 'consume', 'statusLines', 'dispose']),
      },
      {
        path: 'core/battle-effect-transfer.js',
        key: 'cryptLord.battleEffectTransfer',
        validate: api => validateMethods('cryptLord.battleEffectTransfer', api, ['initialize', 'options', 'preview', 'attempt', 'npc', 'loss', 'routeEffect', 'sweep', 'finish', 'statusLines', 'dispose']),
      },
      {
        path: 'core/battle-bribery.js',
        key: 'cryptLord.battleBribery',
        validate: api => validateMethods('cryptLord.battleBribery', api, ['initialize', 'options', 'preview', 'attempt', 'npc', 'blockReason', 'weakenPercent', 'originSide', 'sweep', 'finish', 'statusLines', 'dispose']),
      },
      {
        path: 'core/battle-team-conditions.js',
        key: 'cryptLord.battleTeamConditions',
        validate: api => validateMethods('cryptLord.battleTeamConditions', api, ['has', 'session', 'recipients', 'blockReason', 'effective', 'dispose']),
      },
      {
        path: 'core/team-battle-state.js',
        key: 'cryptLord.teamBattleState',
        validate: api => validateMethods('cryptLord.teamBattleState', api, ['status', 'roster', 'get', 'start', 'options', 'actionPreview', 'reachable', 'action', 'tactic', 'tacticPrompt', 'parsePlan', 'parseProps', 'skillControlEligibility', 'skillControlOptions', 'skillControl', 'auraOptions', 'aura', 'fieldEffectOptions', 'fieldEffectPreview', 'fieldEffect', 'effectTransferOptions', 'effectTransferPreview', 'effectTransfer', 'briberyOptions', 'briberyPreview', 'bribery', 'advanceAuto', 'report', 'settle', 'dispose']),
      },
    {
      path: 'core/game-audio.js',
      key: 'cryptLord.gameAudio',
      validate: api => validateMethods('cryptLord.gameAudio', api, ['status', 'get', 'set', 'enter', 'leave', 'stop', 'preload', 'fireVolley', 'playWarReplay', 'dispose']),
    },
    {
      path: 'core/worldbook-toggle-profiles.js',
      key: 'cryptLord.worldbookToggleProfiles',
      validate: api => validateMethods('cryptLord.worldbookToggleProfiles', api, [
        'status', 'normalize', 'load', 'save', 'boundBooks', 'entriesFor', 'validate', 'apply', 'dispose',
      ]),
    },
    {
      path: 'core/dual-worldbook.js',
      key: 'cryptLord.dualWorldbook',
      validate: api => validateMethods('cryptLord.dualWorldbook', api, ['status', 'compare', 'act', 'dispose']),
    },
    {
      path: 'core/custom-content.js',
      key: 'cryptLord.customContent',
      validate: api => validateMethods('cryptLord.customContent', api, [
        'status', 'normalize', 'loadPresets', 'savePresets', 'books', 'entriesFor', 'generate', 'configOf', 'write', 'dispose',
      ]),
    },
    {
      path: 'core/image-generation.js',
      key: 'cryptLord.imageGeneration',
      validate: api => validateMethods('cryptLord.imageGeneration', api, [
        'status', 'loadPresets', 'savePresets', 'readSettings', 'saveSettings', 'story', 'generatePrompt', 'requestImage', 'dispose',
      ]),
    },
    {
      path: 'core/random-events.js',
      key: 'cryptLord.randomEvents',
      validate: api => validateMethods('cryptLord.randomEvents', api, [
        'status', 'normalize', 'parseEntry', 'load', 'save', 'remove', 'restore', 'draw', 'passive', 'format', 'pending', 'queueManual', 'consume', 'dispose',
      ]),
    },
    {
      path: 'core/event-generator.js',
      key: 'cryptLord.eventGenerator',
      validate: api => validateMethods('cryptLord.eventGenerator', api, [
        'status', 'loadConfig', 'compose', 'extractCard', 'readCardTarget', 'saveCard', 'dispose',
      ]),
    },
    {
      path: 'shared/game-audio-control.js',
      key: 'cryptLord.gameAudioControl',
      validate: api => validateMethods('cryptLord.gameAudioControl', api, ['status', 'create', 'dispose']),
    },
    {
      path: 'core/quick-shortcuts.js',
      key: 'cryptLord.quickShortcuts',
      validate: api => validateMethods('cryptLord.quickShortcuts', api, ['status', 'parse', 'load', 'saveCommands', 'saveState', 'consumeSupplementary', 'dispose']),
    },
    {
      path: 'prompts/game-context-providers.js',
      key: 'cryptLord.gameContextProviders',
      validate: api => validateMethods('cryptLord.gameContextProviders', api, ['status', 'dispose']),
    },
    {
      path: 'core/native-editor.js',
      key: 'cryptLord.nativeEditor',
      validate: api => validateMethods('cryptLord.nativeEditor', api, ['status', 'open', 'save', 'dispose']),
    },
    {
      path: 'core/generation-bridge.js',
      key: 'cryptLord.nativeFloorBridge',
      validate: api => validateMethods('cryptLord.nativeFloorBridge', api, [
        'status',
        'prepareTurn',
        'buildGenerationConfig',
        'inspectNarrative',
        'completeNarrative',
        'dispose',
      ]),
    },
    managerStyleResource,
    {
      path: 'modules/manager-ui/index.js',
      key: 'cryptLord.debugManager',
      validate: api => validateMethods('cryptLord.debugManager', api, ['status', 'open', 'close', 'refresh', 'dispose']),
    },
    {
      path: 'shared/toolbar-button.js',
      key: 'cryptLord.debugToolbar',
      validate: api => validateMethods('cryptLord.debugToolbar', api, ['status', 'reconnect', 'dispose']),
    },
    {
      path: 'modules/native-floor/index.js',
      key: 'cryptLord.nativeFloor',
      validate: api => validateMethods('cryptLord.nativeFloor', api, ['status', 'submitNativeTurn', 'dispose']),
    },
    {
      path: 'modules/action-options/index.js',
      key: 'cryptLord.actionOptions',
      validate: api => validateMethods('cryptLord.actionOptions', api, ['status', 'mount', 'refresh', 'dispose']),
    },
    {
      path: 'modules/input-adapter/index.js',
      key: 'cryptLord.inputAdapter',
      validate: api => validateMethods('cryptLord.inputAdapter', api, ['status', 'submit', 'setInputText', 'dispose']),
    },
    {
      path: 'modules/native-floor-editor/index.js',
      key: 'cryptLord.nativeFloorEditorUi',
      validate: api => validateMethods('cryptLord.nativeFloorEditorUi', api, ['status', 'mount', 'open', 'openData', 'close', 'unmount', 'dispose']),
    },
    {
      path: 'modules/native-floor-status-bar/index.js',
      key: 'cryptLord.nativeFloorStatusBar',
      validate: api => validateMethods('cryptLord.nativeFloorStatusBar', api, ['status', 'mount', 'refresh', 'setImage', 'dispose']),
    },
    {
      path: 'modules/world-map/index.js',
      key: 'cryptLord.worldMap',
      validate: api => validateMethods('cryptLord.worldMap', api, ['status', 'mount', 'open', 'close', 'refresh', 'dispose']),
    },
    {
      path: 'modules/theater-console/index.js',
      key: 'cryptLord.theaterConsole',
      validate: api => validateMethods('cryptLord.theaterConsole', api, ['status', 'mount', 'open', 'close', 'refresh', 'dispose']),
    },
    {
      path: 'modules/floating-variable-workbench/index.js',
      key: 'cryptLord.variableWorkbench',
      validate: api => validateMethods('cryptLord.variableWorkbench', api, ['status', 'mount', 'open', 'close', 'notifyUpdate', 'dispose']),
    },
    {
      path: 'modules/ai-context-config/index.js',
      key: 'cryptLord.aiContextConfigUi',
      validate: api => validateMethods('cryptLord.aiContextConfigUi', api, ['status', 'mount', 'open', 'close', 'reload', 'dispose']),
    },
    {
      path: 'modules/organization-console/index.js',
      key: 'cryptLord.organizationConsole',
      validate: api => validateMethods('cryptLord.organizationConsole', api, ['status', 'mount', 'open', 'close', 'dispose']),
    },
    {
      path: 'modules/domain-console/index.js',
      key: 'cryptLord.domainConsole',
      validate: api => validateMethods('cryptLord.domainConsole', api, ['status', 'mount', 'open', 'close', 'dispose']),
    },
    {
      path: 'modules/domain-affairs/index.js',
      key: 'cryptLord.domainAffairsUi',
      validate: api => validateMethods('cryptLord.domainAffairsUi', api, ['status', 'mount', 'open', 'close', 'reload', 'dispose']),
    },
    {
      path: 'modules/domain-campaign/index.js',
      key: 'cryptLord.domainCampaignUi',
      validate: api => validateMethods('cryptLord.domainCampaignUi', api, ['status', 'mount', 'open', 'close', 'reload', 'dispose']),
    },
    {
      path: 'modules/war-replay/index.js',
      key: 'cryptLord.warReplayUi',
      validate: api => validateMethods('cryptLord.warReplayUi', api, ['status', 'mount', 'open', 'close', 'dispose']),
    },
    {
      path: 'modules/dlc-manager/index.js',
      key: 'cryptLord.dlcManager',
      validate: api => validateMethods('cryptLord.dlcManager', api, ['status', 'mount', 'open', 'close', 'dispose']),
    },
    {
      path: 'modules/worldbook-toggle-profiles/index.js',
      key: 'cryptLord.worldbookToggleProfilesUi',
      validate: api => validateMethods('cryptLord.worldbookToggleProfilesUi', api, ['status', 'mount', 'open', 'close', 'reload', 'dispose']),
    },
    {
      path: 'modules/dual-worldbook/index.js',
      key: 'cryptLord.dualWorldbookUi',
      validate: api => validateMethods('cryptLord.dualWorldbookUi', api, ['status', 'mount', 'open', 'close', 'reload', 'dispose']),
    },
    {
      path: 'modules/custom-content/index.js',
      key: 'cryptLord.customContentUi',
      validate: api => validateMethods('cryptLord.customContentUi', api, ['status', 'mount', 'open', 'close', 'dispose']),
    },
    {
      path: 'modules/image-generation/index.js',
      key: 'cryptLord.imageGenerationUi',
      validate: api => validateMethods('cryptLord.imageGenerationUi', api, ['status', 'mount', 'open', 'oneClickForFloor', 'close', 'dispose']),
    },
    {
      path: 'modules/random-events/index.js',
      key: 'cryptLord.randomEventsUi',
      validate: api => validateMethods('cryptLord.randomEventsUi', api, ['status', 'mount', 'open', 'close', 'dispose']),
    },
    {
      path: 'modules/event-generator/index.js',
      key: 'cryptLord.eventGeneratorUi',
      validate: api => validateMethods('cryptLord.eventGeneratorUi', api, ['status', 'mount', 'open', 'close', 'dispose']),
    },
    {
      path: 'modules/detective-case/index.js',
      key: 'cryptLord.detectiveCaseUi',
      validate: api => validateMethods('cryptLord.detectiveCaseUi', api, ['status', 'mount', 'open', 'close', 'dispose']),
    },
    {
      path: 'modules/divination/index.js',
      key: 'cryptLord.divinationUi',
      validate: api => validateMethods('cryptLord.divinationUi', api, ['status', 'mount', 'open', 'close', 'dispose']),
    },
    {
      path: 'modules/original-plot-guide/index.js',
      key: 'cryptLord.originalPlotGuideUi',
      validate: api => validateMethods('cryptLord.originalPlotGuideUi', api, ['status', 'mount', 'open', 'close', 'dispose']),
    },
    {
      path: 'modules/savant-material/index.js',
      key: 'cryptLord.savantMaterialUi',
      validate: api => validateMethods('cryptLord.savantMaterialUi', api, ['status', 'mount', 'open', 'close', 'dispose']),
    },
    {
      path: 'modules/savant-enhancement/index.js',
      key: 'cryptLord.savantEnhancementUi',
      validate: api => validateMethods('cryptLord.savantEnhancementUi', api,
        ['status', 'mount', 'open', 'close', 'dispose']),
    },
    {
      path: 'modules/source-castle/index.js',
      key: 'cryptLord.sourceCastleUi',
      validate: api => validateMethods('cryptLord.sourceCastleUi', api, ['status', 'mount', 'open', 'close', 'dispose']),
    },
    {
      path: 'modules/judgment/index.js',
      key: 'cryptLord.judgmentUi',
      validate: api => validateMethods('cryptLord.judgmentUi', api, ['status', 'mount', 'scanAll', 'beautifyElement', 'dispose']),
    },
    {
      path: 'modules/game-shell/index.js',
      key: 'cryptLord.gameShell',
      validate: api => validateMethods('cryptLord.gameShell', api, ['status', 'mount', 'refresh', 'dispose']),
    },
  ];
  const cssPromises = new Map();
  const scriptPromises = new Map();
  const batch = {
    cssMapEntries: new Set(),
    scriptMapEntries: new Set(),
    styles: [],
    scripts: [],
    controllers: new Set(),
    pendingCleanups: new Set(),
    registeredApis: [],
    contractAdded: null,
    disposed: false,
  };

  function resourceUrl(path) {
    const url = new URL(path, baseUrl);
    if (cacheVersion) url.searchParams.set('v', cacheVersion);
    return url.href;
  }

  function resourceError(stage, url, error) {
    const detail = error instanceof Error ? error.message : String(error);
    return new Error(`[${stage}] ${url}; ${detail}`);
  }

  function disposalError() {
    return new DOMException('loader已释放', 'AbortError');
  }

  function getResourceApi(resource) {
    if (resource.key === 'contract') return root.contract;
    if (resource.key === 'cryptLord.debug') return root.debug;
    if (resource.key === 'cryptLord.debugManager') return root.debugManager;
    return root.__stage1Modules?.[resource.key];
  }

  function validateResource(resource) {
    return resource.validate(getResourceApi(resource));
  }

  function styleTargetDocuments() {
    const candidates = [window];
    for (const name of ['parent', 'top']) {
      try {
        if (window[name] && !candidates.includes(window[name])) candidates.push(window[name]);
      } catch {
        // Cross-origin frames cannot receive host styles.
      }
    }
    const host = candidates.reduce((best, candidate) => {
      try {
        const doc = candidate?.document;
        if (!doc?.documentElement || !doc?.createElement) return best;
        const score = (candidate.TavernHelper ? 6 : 0) + (candidate.SillyTavern ? 8 : 0) + (doc.querySelector?.('#send_textarea') ? 12 : 0);
        return !best || score > best.score ? { document: doc, score } : best;
      } catch {
        return best;
      }
    }, null);
    return [document, host?.document].filter((doc, index, list) => doc && list.indexOf(doc) === index);
  }

  function injectLinkedStylesheet(url, path) {
    const documents = styleTargetDocuments();
    return Promise.all(documents.map(targetDocument => new Promise((resolve, reject) => {
      const existing = Array.from(targetDocument.querySelectorAll('[data-crypt-lord-css]')).find(node =>
        node.dataset.cryptLordCss === url &&
        node.dataset.cryptLordInstance === instanceId &&
        node.dataset.cryptLordLoadState === 'loaded',
      );
      if (existing) {
        resolve(existing);
        return;
      }

      const link = targetDocument.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.dataset.cryptLordCss = url;
      link.dataset.cryptLordInstance = instanceId;
      link.dataset.cryptLordLoadState = 'loading';
      link.onload = () => {
        link.dataset.cryptLordLoadState = 'loaded';
        batch.styles.push(link);
        resolve(link);
      };
      link.onerror = () => reject(new Error(`${path} link 加载失败`));
      (targetDocument.head || targetDocument.documentElement).appendChild(link);
    }))).then(nodes => nodes[0]);
  }

  function loadCss(path) {
    if (batch.disposed) return Promise.reject(disposalError());
    const url = resourceUrl(path);
    debugEvent('resource', 'css-load-start', path);
    if (cssPromises.has(url)) return cssPromises.get(url);

    const existing = Array.from(document.querySelectorAll('style[data-crypt-lord-css]')).find(
      style => style.dataset.cryptLordCss === url &&
        style.dataset.cryptLordInstance === instanceId &&
        style.dataset.cryptLordLoadState === 'loaded',
    );
    if (existing) return Promise.resolve(existing);

    const controller = new AbortController();
    batch.controllers.add(controller);
    batch.cssMapEntries.add(url);
    let timer = null;
    let timedOut = false;
    let injectedNodes = [];
    let settled = false;
    let cancel = () => {};

    const cleanupPending = () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      batch.pendingCleanups.delete(cancel);
      batch.controllers.delete(controller);
    };
    const promise = new Promise((resolve, reject) => {
      const finish = (operation, value) => {
        if (settled) return;
        settled = true;
        cleanupPending();
        operation(value);
      };
      cancel = () => {
        if (settled) return;
        controller.abort();
        injectedNodes.forEach(node => node.remove?.());
        finish(reject, disposalError());
      };
      batch.pendingCleanups.add(cancel);
      timer = setTimeout(() => {
        if (settled) return;
        timedOut = true;
        controller.abort();
        finish(reject, new Error(`加载超时(${RESOURCE_TIMEOUT_MS}ms)`));
      }, RESOURCE_TIMEOUT_MS);

      Promise.resolve()
        .then(() => fetch(url, { signal: controller.signal }))
        .then(response => {
          if (batch.disposed) throw disposalError();
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.text();
        })
        .then(cssText => {
          if (batch.disposed) throw disposalError();
          // Script modules mount UI into the SillyTavern host document while the
          // loader itself runs inside an iframe. Keep one owned stylesheet in each
          // document so host-mounted controls are actually visible and positioned.
          const documents = styleTargetDocuments();
          injectedNodes = documents.map(targetDocument => {
            const style = targetDocument.createElement('style');
            style.dataset.cryptLordCss = url;
            style.dataset.cryptLordInstance = instanceId;
            style.dataset.cryptLordLoadState = 'loaded';
            style.textContent = `${cssText}\n/*# sourceURL=${url} */`;
            (targetDocument.head || targetDocument.documentElement).appendChild(style);
            batch.styles.push(style);
            return style;
          });
          debugEvent('resource', 'css-load-success', path);
          finish(resolve, injectedNodes[0]);
        })
        .catch(error => {
          if (settled) return;
          if (controller.signal.aborted || batch.disposed) {
            finish(reject, error);
            return;
          }
          if (injectedNodes.length) {
            for (let index = batch.styles.length - 1; index >= 0; index -= 1) {
              const style = batch.styles[index];
              if (style.dataset.cryptLordCss === url && style.dataset.cryptLordInstance === instanceId) {
                style.remove(); batch.styles.splice(index, 1);
              }
            }
          }
          injectedNodes = [];
          debugEvent('resource', 'css-fetch-fallback', `${path}: ${error?.message || error}`, 'warn');
          injectLinkedStylesheet(url, path)
            .then(link => {
              if (batch.disposed) throw disposalError();
              injectedNodes = batch.styles.filter(node => node.dataset.cryptLordCss === url && node.dataset.cryptLordInstance === instanceId);
              debugEvent('resource', 'css-link-success', path);
              finish(resolve, link);
            })
            .catch(linkError => {
              const stage = timedOut ? 'CSS fetch timeout' : 'CSS fetch/link';
              debugEvent('failure', 'css-load-failure', `${path}: ${linkError?.message || linkError}`, 'error');
              finish(reject, resourceError(stage, url, linkError));
            });
        });
    }).catch(error => {
      cssPromises.delete(url);
      throw error;
    });

    cssPromises.set(url, promise);
    return promise;
  }

  function loadScript(resource) {
    if (batch.disposed) return Promise.reject(disposalError());
    const url = resourceUrl(resource.path);
    debugEvent('resource', 'script-load-start', resource.path);
    if (scriptPromises.has(url)) return scriptPromises.get(url);

    const found = Array.from(document.querySelectorAll('script[data-crypt-lord-script]')).find(
      script => script.dataset.cryptLordScript === url &&
        script.dataset.cryptLordInstance === instanceId,
    );
    if (found?.dataset.cryptLordLoadState === 'failed') found.remove();

    if (found?.isConnected && found.dataset.cryptLordLoadState === 'loaded') {
      try {
        validateResource(resource);
        return Promise.resolve(found);
      } catch (error) {
        return Promise.reject(resourceError('模块注册验证', url, error));
      }
    }

    const beforeApi = getResourceApi(resource);
    batch.scriptMapEntries.add(url);
    const promise = new Promise((resolve, reject) => {
      const script = found?.isConnected ? found : document.createElement('script');
      const createdByBatch = !found?.isConnected;
      let recordedApi = null;
      let settled = false;
      let timer = null;
      if (createdByBatch) {
        batch.scripts.push(script);
      }

      const recordNewApi = () => {
        const api = getResourceApi(resource);
        if (beforeApi !== undefined || api === undefined || recordedApi === api) return api;
        recordedApi = api;
        if (resource.key === 'contract') {
          batch.contractAdded = api;
        } else {
          batch.registeredApis.push({ key: resource.key, api });
        }
        return api;
      };
      const cleanupHandlers = () => {
        if (timer !== null) clearTimeout(timer);
        script.onload = null;
        script.onerror = null;
        window.removeEventListener('error', onWindowError);
        batch.pendingCleanups.delete(cancel);
      };
      const cancel = () => {
        if (settled) return;
        settled = true;
        cleanupHandlers();
        reject(disposalError());
      };
      const fail = (stage, error) => {
        if (settled) return;
        recordNewApi();
        settled = true;
        cleanupHandlers();
        if (createdByBatch) script.dataset.cryptLordLoadState = 'failed';
        debugEvent('failure', 'script-load-failure', `${resource.path}: ${error?.message || error}`, 'error');
        reject(resourceError(stage, url, error));
      };
      const onWindowError = event => {
        if (event?.filename !== url) return;
        fail('动态模块script执行', event.error || new Error(event.message || '脚本执行时抛出异常'));
      };
      const succeed = () => {
        if (settled) return;
        if (batch.disposed) {
          cancel();
          return;
        }
        try {
          validateResource(resource);
        } catch (error) {
          fail('模块注册验证', error);
          return;
        }
        recordNewApi();
        settled = true;
        cleanupHandlers();
        script.dataset.cryptLordLoadState = 'loaded';
        debugEvent('resource', 'script-load-success', `${resource.path}: 资源已注册`);
        resolve(script);
      };

      batch.pendingCleanups.add(cancel);
      timer = setTimeout(
        () => fail('动态模块script超时', new Error(`加载超时(${RESOURCE_TIMEOUT_MS}ms)`)),
        RESOURCE_TIMEOUT_MS,
      );
      script.onload = succeed;
      script.onerror = () => fail('动态模块script加载', new Error('网络或脚本执行失败'));
      window.addEventListener('error', onWindowError);
      script.src = url;
      script.async = false;
      script.dataset.cryptLordScript = url;
      script.dataset.cryptLordInstance = instanceId;
      if (scriptId) script.dataset.cryptLordScriptId = scriptId;
      script.dataset.cryptLordLoadState = 'loading';
      if (!script.isConnected) (document.head || document.documentElement).appendChild(script);
    }).catch(error => {
      scriptPromises.delete(url);
      throw error;
    });

    scriptPromises.set(url, promise);
    return promise;
  }

  async function cleanup(reason) {
    if (batch.disposed) return true;
    batch.disposed = true;
    state.status = 'disposing';
    const cleanupErrors = [];
    const capture = operation => {
      try {
        operation();
      } catch (error) {
        cleanupErrors.push(error instanceof Error ? error.message : String(error));
      }
    };

    Array.from(batch.pendingCleanups).forEach(cancel => capture(cancel));
    batch.pendingCleanups.clear();
    batch.controllers.forEach(controller => capture(() => controller.abort()));
    batch.controllers.clear();

    try { batch.contractAdded?.cancelWaiters?.(reason); } catch (error) { cleanupErrors.push(String(error)); }
    for (let index = batch.registeredApis.length - 1; index >= 0; index -= 1) {
      const { key, api } = batch.registeredApis[index];
      capture(() => { if (typeof api.dispose === 'function') api.dispose(reason); });
      capture(() => {
        const contract = root.contract;
        if (contract?.releaseGlobal) contract.releaseGlobal(key, api);
      });
      capture(() => { if (key === 'cryptLord.debug' && root.debug === api) delete root.debug; });
      capture(() => { if (key === 'cryptLord.debugManager' && root.debugManager === api) delete root.debugManager; });
      capture(() => {
        if (root.__stage1Modules?.[key] === api) delete root.__stage1Modules[key];
      });
    }

    capture(() => { batch.contractAdded?.reset?.(reason); });
    capture(() => { if (batch.contractAdded && root.contract === batch.contractAdded) delete root.contract; });
    const ownedSelector = [
      `[data-crypt-lord-loader][data-crypt-lord-instance="${instanceId}"]`,
      `[data-crypt-lord-script][data-crypt-lord-instance="${instanceId}"]`,
      `[data-crypt-lord-css][data-crypt-lord-instance="${instanceId}"]`,
    ].join(',');
    const documents = styleTargetDocuments();
    documents.forEach(targetDocument => capture(() => {
      Array.from(targetDocument.querySelectorAll?.(ownedSelector) || []).forEach(node => node.remove?.());
    }));
    for (let index = batch.scripts.length - 1; index >= 0; index -= 1) {
      capture(() => batch.scripts[index].remove());
    }
    for (let index = batch.styles.length - 1; index >= 0; index -= 1) {
      capture(() => batch.styles[index].remove());
    }
    batch.scriptMapEntries.forEach(url => scriptPromises.delete(url));
    batch.cssMapEntries.forEach(url => cssPromises.delete(url));
    scriptPromises.clear();
    cssPromises.clear();
    batch.registeredApis.length = 0;
    batch.scripts.length = 0;
    batch.styles.length = 0;
    if (root.__stage1Modules && Object.keys(root.__stage1Modules).length === 0) delete root.__stage1Modules;
    state.status = 'disposed';
    if (root.loader === state) delete root.loader;
    if (cleanupErrors.length) console.error(LOG_PREFIX, `[dispose] ${cleanupErrors.join(' | ')}`);
    return cleanupErrors.length === 0;
  }

  async function rollback(originalError) {
    debugEvent('failure', 'rollback-start', originalError?.message || originalError, 'error');
    await cleanup('rollback');
    const error = originalError instanceof Error ? originalError : new Error(String(originalError));
    debugEvent('failure', 'rollback-complete', error.message, 'error');
    return error;
  }

  const state = {
    version: VERSION,
    publicBaseUrl: PUBLIC_BASE_URL,
    baseUrl,
    instanceId,
    status: 'loading',
    error: '',
    ready: null,
    dispose: cleanup,
  };
  root.loader = state;

  state.ready = (async () => {
    debugEvent('lifecycle', 'loading', '阶段1资源加载开始');
    try {
      // 顺序加载，确保失败后没有仍在后台完成并晚到注入的同批资源。
      for (const path of cssResources) await loadCss(path);
      for (const resource of scriptResources) {
        if (resource.type === 'css') await loadCss(resource.path);
        else await loadScript(resource);
      }
      if (batch.disposed) return state;
      state.status = 'ready';
      debugEvent(
        'lifecycle',
        'resources-ready',
        '原生楼层核心、输入适配、状态编辑、行动选项与诊断资源已注册；仍需在真实 SillyTavern 页面完成端到端验证。',
        'warn',
      );
      console.info(LOG_PREFIX, '契约、诊断设施与原生楼层模块已按顺序加载并通过注册验证；注册不代表真实酒馆会话中的端到端验证已完成。');
      return state;
    } catch (error) {
      if (batch.disposed) return state;
      const diagnosed = await rollback(error);
      state.status = 'failed';
      state.error = diagnosed.message;
      debugEvent('failure', 'loader-failed', diagnosed.message, 'error');
      console.error(LOG_PREFIX, diagnosed);
      throw diagnosed;
    }
  })();
})();
