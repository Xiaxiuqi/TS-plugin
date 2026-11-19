import { readFile, writeFile } from 'node:fs/promises';

const base = new URL('../../数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/', import.meta.url);
const read = name => readFile(new URL(name, base), 'utf8');
const cut = (source, start, end) => {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  if (from < 0 || to <= from) throw Error(`Missing source boundary: ${start}`);
  return source.slice(from, to).trim();
};
const field = await read('31b1-js-mystery-sleep-and-effect.txt');
const advantages = await read('31a-js-pathway-contest-advantages.txt');
const basics = await read('30a1a-js-basics-and-attribute.txt');
const database = await read('34a-js-worldbook-database-tools.txt');
const effects = await read('30b-js-battle-team-effects-config.txt');
const cpu = await read('32a-js-battle-tags-movers-cpu.txt');
const units = await read('30a2-js-battle-board-and-units.txt');
const damageSource = await read('30a1b1-js-damage-and-skill-cost.txt');
const statusBody = cut(effects, 'class StatusEffectManager {',
  "console.log('[战斗系统] StatusEffectManager 已加载');");
const reporterBody = cut(effects, 'class BattleReporter {',
  "console.log('[战斗系统] BattleReporter 已加载');");
const autoPilotBody = cut(cpu, 'const AutoPilotManager = {',
  "console.log('[战斗系统] AutoPilotManager 已加载');");
const borrowConfig = cut(effects, 'ABILITY_BORROW_ACTION:', '\n    _unknownActionWarnings:');
const skillControlBody = cut(units, 'const SKILL_CONTROL_TABLE =',
  "console.log('[战斗系统] SkillControlManager");
const skillContest = cut(cpu, 'skillControlContest(caster, target, mode, isLast) {',
  '    // ---------- 施加 ----------');
const skillApply = cut(cpu, 'applySkillControl(bm, caster, target, mode, skillName) {',
  '\n    /**');
const projections = await read('31b2-js-aura-and-grazing-projection.txt');
const exileConfig = cut(effects, "EXILE_ACTION:", '\n    // ---------- 主动离场');
const activeLeaveConfig = cut(effects, 'ACTIVE_LEAVE_ACTION:', '\n    // ---------- 额外行动');
const rewindConfig = cut(effects, 'REWIND_ACTION:', '\n    // ---------- 放逐');
const extraConfig = cut(effects, 'EXTRA_ACTION_ACTION:', '\n    // ---------- 施加效果');
const hardConfig = cut(effects, 'STEAL_THOUGHT:', '\n    // ---------- 规则修改');
const mindConfig = cut(effects, 'MIND_DEPRIVE:', '\n    // ---------- 偷窃想法');
const tempConfig = cut(effects, 'TEMP_HIERARCHY:', '\n    // ---------- 心智剥夺');
const controlConfig = cut(effects, 'CONTROL_SPIRIT_RATIO:', '\n    // ---------- 附身');
const controlBody = cut(advantages, 'const EnemyControlManager =', '\n    // ---------- 纯前端管线')
  .replace('const EnemyControlManager =', 'const OriginalEnemyControlManager =');
const controlArbitration = cut(advantages, '// 5. 秘偶仲裁', '// 9. 🆕 附身仲裁');
const tacticPipeline = cut(advantages, 'runFrontendNpcTactics(bm, opts = {}) {',
  "console.log('[战斗系统] EnemyControlManager").replace(/\r?\n};\s*$/, '');
const skillControlConfig = cut(effects, 'SKILL_CONTROL_NPC_CHANCE:', '\n    /**');
const possessionConfig = cut(effects, 'POSSESS_PRISONER:', '\n    // ---------- 短控');
const ruleConfig = cut(effects, 'RULE_CHANGE_ACTION:', '\n    // ---------- 改变环境');
const environmentConfig = cut(effects, 'ENV_ACTION:', '\n    // ---------- 召唤');
const summonConfig = cut(effects, 'SUMMON_ACTION:', '\n    // ---------- 回溯');
const fallbackDatabase = database.slice(database.indexOf('_fallback: {'));
const summonDefaults = [
  cut(fallbackDatabase, 'sequenceBase: {', '\n    itemConfig:'),
  cut(fallbackDatabase, 'npcTemplateConfig: {', '\n    // 3. 最大'),
  cut(fallbackDatabase, 'abilitySystemConfig: {', '\n    // 5. 具体'),
].join('\n');
const summonHelpers = [
  cut(database, 'const containsOldDayAttendant =', 'const resolveOldDayAttendantRank ='),
  cut(database, 'const allocateAttributes =', '// 处理当前属性'),
  cut(database, 'const getSequenceDivinity =', '// 根据序列获取百分比'),
  cut(database, 'const parseAbilitySystem =', '//=======序列能力'),
  cut(database, 'const getPureName =', '//---------属性上限计算'),
  cut(database, 'const getAndFixAbilitySystem =', '//---------装备'),
].join('\n');
const fundamentalBody = cut(advantages, 'const FundamentalRuleManager =', 'window.FundamentalRuleManager =');
const formulaBody = cut(basics, 'const BattleFormulaEngine =', 'window.BattleFormulaEngine =');
const mythic = cut(advantages, 'const MythicFormDescriptionCatalog =',
  "console.log('[战斗系统] MythicFormManager");
// Current-floor transactions replace the original opening-floor persistence side effect.
const mythicBody = mythic.slice(0, mythic.indexOf('    /** 与消耗品结算同一条静默存盘路径')) +
  '    persist() {},\n};';
const mythicConfig = cut(effects, 'MYTHIC_RANK_GATE:', '\n    // ---------- 操控敌人');
const averages = cut(database, 'avgAttrByRank: {', '\n    },').replace(/^avgAttrByRank:\s*/, '');
const body = [
  cut(advantages, 'const ReaderContestAdvantage =', "console.log('[战斗系统] AbilityAlias"),
  cut(advantages, 'const SequenceTiers =', "console.log('[战斗系统] SequenceTiers"),
  cut(advantages, 'const PunishmentManager =', "console.log('[战斗系统] PunishmentManager"),
  mythicBody,
  cut(projections, 'const BattleEventManager =', "console.log('[战斗系统] BattleEventManager"),
  cut(projections, 'const RewindManager =', "console.log('[战斗系统] RewindManager"),
  cut(projections, 'const ExtraActionManager =', "console.log('[战斗系统] ExtraActionManager"),
  summonHelpers,
  cut(projections, 'const GrazingProjectionManager =', 'window.GrazingProjectionManager =')
    .replace('const GrazingProjectionManager =', 'const OriginalGrazingProjectionManager ='),
  cut(projections, 'const GrazingBattleManager =', 'window.GrazingBattleManager =')
    .replace(/\bGrazingProjectionManager\b/g, 'OriginalGrazingProjectionManager'),
  cut(projections, 'const SummonManager =', "console.log('[战斗系统] SummonManager"),
  cut(projections, 'const ExileManager =', "console.log('[战斗系统] ExileManager"),
  cut(projections, 'const ActiveLeaveManager =', "console.log('[战斗系统] ActiveLeaveManager"),
  cut(field, 'const TurnSkipManager =', "console.log('[战斗系统] TurnSkipManager")
    .replace('const TurnSkipManager =', 'const OriginalTurnSkipManager ='),
  'const TurnSkipManager = suppliedTurnSkip || OriginalTurnSkipManager;',
  `${controlBody}
    ${tacticPipeline}
    arbitrate(bm, groups, summary, results) {
      const { marionetteTries, conquestTries, mindTries, enslaveTries, tameTries } = groups;
      ${controlArbitration}
    },
  };
  const EnemyControlManager = deps.useOriginalControl ? OriginalEnemyControlManager : suppliedEnemyControl;`,
  cut(advantages, 'const PossessionManager =', "console.log('[战斗系统] PossessionManager")
    .replace('const PossessionManager =', 'const OriginalPossessionManager ='),
  'const PossessionManager = deps.useOriginalPossession ? OriginalPossessionManager : suppliedPossession;',
  formulaBody,
  fundamentalBody,
  cut(advantages, 'const RuleSystemRivalPool =', 'window.RuleSystemRivalPool ='),
  cut(field, 'const RuleChangeManager =', "console.log('[战斗系统] RuleChangeManager"),
  cut(field, 'const ENV_SAILOR =', "console.log('[战斗系统] EnvironmentCatalog"),
  cut(field, 'const EnvironmentManager =', "console.log('[战斗系统] EnvironmentManager"),
  cut(field, 'const ForcedMoveManager =', "console.log('[战斗系统] ForcedMoveManager"),
  cut(field, 'const MindDepriveManager =', "console.log('[战斗系统] MindDepriveManager"),
  cut(field, 'const HardControlManager =', "console.log('[战斗系统] HardControlManager"),
  `class CpuBoardSearch {
    ${cut(units, 'getReachableCells(hero, move) {', '\n    // 原先这里还有一个 approachCell')}
  }`,
  cut(damageSource.replace(/\r\n/g, '\n'), 'const TERRAIN_NORM_DIVISOR =', '\n/**\n * 战报要不要记这块地形'),
  cut(cpu, 'class CPUManager {', "console.log('[战斗系统] CPUManager 已加载');"),
  `class TerrainTurnManager {
    constructor(battleManager, slot = {}) { this.battleManager = battleManager; this.slot = slot; }
    isExtraSlot() { return this.slot.extra === true; }
    currentSlotCfg() { return this.slot.cfg || {}; }
    ${cut(cpu, 'processTerrainEffects(hero) {', 'processEnvironmentEffects(hero, timing')}
  }`,
  cut(damageSource, 'function shouldReportTerrain(hero, terrain) {', '\n/**'),
  cut(advantages, 'const BalanceManager =', "console.log('[战斗系统] BalanceManager"),
  advantages.slice(advantages.indexOf('const BriberyManager =')).trim(),
  cut(field, 'const EffectTransferManager =', 'const TempAllegianceManager ='),
  cut(field, 'const TempAllegianceManager =', "console.log('[战斗系统] TempAllegianceManager"),
  cut(field, 'const TargetInterferenceManager =', "console.log('[战斗系统] FieldEffectManager"),
  skillControlBody.replace('class SkillControlManager {', 'class OriginalSkillControlManager {')
    .replace(/\bSkillControlManager\./g, 'OriginalSkillControlManager.'),
  'const SkillControlManager = deps.borrowEnabled || deps.skillControlEnabled ? OriginalSkillControlManager : suppliedSkillControl;',
  cut(cpu, 'const TacticBorrowReport =', 'BorrowableTacticRegistry.coverage ='),
].join('\n\n').replace(/^window\.\w+\s*=\s*\w+;\r?$/gm, '');
const output = `// Generated from the original regex managers. Run extract-field-effect-reference.mjs to regenerate.
(() => {
  'use strict';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const KEY = 'cryptLord.battleFieldEffectReference';
  if (modules[KEY]) { root.contract.initializeGlobal(KEY, modules[KEY]); return; }
  const averages = ${averages};
const mythicConfig = { ${mythicConfig} };
  const exileConfig = { ${exileConfig} };
  const activeLeaveConfig = { ${activeLeaveConfig} };
  const rewindConfig = {
${rewindConfig}
  };
  const extraConfig = {
${extraConfig}
  };
  const hardConfig = {
${hardConfig}
  };
  const mindConfig = {
${mindConfig}
  };
  const tempConfig = {
${tempConfig}
  };
  const controlConfig = {
    MARIONETTE: '秘偶化', CONQUEST: '征服', MIND: '「心灵」权柄', ENSLAVE: '奴役', TAME: '驯化',
    CONTEST_ROLL_MIN: 0.8, CONTEST_ROLL_MAX: 1.2,
${controlConfig}
  };
  const possessionConfig = { ${possessionConfig} };
  const ruleConfig = { ${ruleConfig} };
  const environmentConfig = { ${environmentConfig} };
  const summonConfig = { ${summonConfig} };
  const summonDefaults = { ${summonDefaults} };
  const borrowConfig = { ${borrowConfig} };
  const skillControlConfig = { ${skillControlConfig} };
  function createAutoPilot(SkillLoader) {
${autoPilotBody}
    return AutoPilotManager;
  }
  function createStatus() {
    const console = { log() {}, warn() {}, error() {} };
${statusBody}
    return new StatusEffectManager();
  }
  function createReporter() {
    const console = { log() {}, warn() {}, error() {} };
    const LifeSaveManager = {
${cut(units, 'static finalEffectVerdict(finalDamage, maxHp) {', '\n    /**').replace('static ', '')}
    };
${reporterBody}
    return new BattleReporter();
  }
  function createSkillControlResolver({ Math, SkillControlManager, TacticCatalog, ContestAdvantage }) {
    return {
${skillContest}
${skillApply}
    };
  }
  function create(deps) {
    const console = deps.console || globalThis.console;
    const { Math, Hero, LifeSaveManager, TacticCatalog = { ...exileConfig, ...activeLeaveConfig, ...rewindConfig, ...extraConfig, ...hardConfig, ...mindConfig, ...tempConfig, ...controlConfig, ...possessionConfig, ...ruleConfig, ...environmentConfig, ...summonConfig, ...borrowConfig }, EnemyControlManager: suppliedEnemyControl,
      ConsumableMoveBuilder, TacticResolver, OffFieldManager, BattleBoard,
      AttributeCalculator, TurnSkipManager: suppliedTurnSkip, MysteryReenactmentCanonAccess, SkillRange,
      TargetSelector, PossessionManager: suppliedPossession, SkillCostManager, Move,
      SkillControlManager: suppliedSkillControl, parseSequenceRank, terrainEffectsFor,
      DamageCalculator, WeaponAccuracy, TERRAIN_MAX_COST = 10,
      GameDBManager, resolvePathwayFromSequence, AttributeMapper, SkillLoader,
      GrazingProjectionManager, TacticSessionManager } = deps;
    const _ = { cloneDeep: value => structuredClone(value) };
    const battleExpMultiplier = level => 1 + Math.max(0, Math.floor(Number(level) || 0)) * .02;
    const window = { TimePassageEngine: deps.TimePassageEngine,
      GrazingCore: deps.GrazingCore, ShamanPictureMode: deps.ShamanPictureMode,
      PlayerProjectionResolver: deps.PlayerProjectionResolver,
      PlayerBattleProjectionRefresher: deps.PlayerBattleProjectionRefresher };
${body}
    const resolvedEffects = {
      isSixDimStat: stat => ['活力', '敏捷', '灵性', '理智', '人性', '运气'].includes(stat),
      ${cut(effects, 'storeResolvedEffect(hero, effectInstance) {', '    applyEffect(hero, effect, caster')}
    };
    return { field: FieldEffectManager, interference: TargetInterferenceManager,
      transfer: EffectTransferManager, bribery: BriberyManager, balance: BalanceManager,
      punishment: PunishmentManager, punishmentCpu: CPUManager,
      cpuBoardSearch: CpuBoardSearch, terrainHazardScore, terrainVitalityCost,
      terrainTurn: TerrainTurnManager,
      mythic: MythicFormManager, mythicDescriptions: MythicFormDescriptionCatalog,
      exile: ExileManager,
      activeLeave: ActiveLeaveManager,
      battleEvent: BattleEventManager,
      rewind: RewindManager,
      extraAction: ExtraActionManager,
      summon: SummonManager,
      grazingProjection: OriginalGrazingProjectionManager,
      grazingBattle: GrazingBattleManager,
      tacticCatalog: TacticCatalog,
      borrow: AbilityBorrowManager, borrowRegistry: BorrowableTacticRegistry,
      borrowContext: TacticExecutionContext, borrowReport: TacticBorrowReport,
      skillControl: SkillControlManager,
      hardControl: HardControlManager, turnSkip: OriginalTurnSkipManager,
      mindDeprive: MindDepriveManager, forcedMove: ForcedMoveManager,
      enemyControl: EnemyControlManager,
      possession: PossessionManager,
      ruleChange: RuleChangeManager,
      fundamental: FundamentalRuleManager, formulaEngine: BattleFormulaEngine,
      environment: EnvironmentManager, environmentCatalog: EnvironmentCatalog,
      canonAccess: MysteryReenactmentCanonAccess,
      tempAllegiance: TempAllegianceManager, resolvedEffects,
      advantage: ContestAdvantage, reader: ReaderContestAdvantage };
  }
  const api = { create, createStatus, createReporter, createAutoPilot, createSkillControlResolver, averages: () => structuredClone(averages),
    mythicConfig: () => structuredClone(mythicConfig),
    exileConfig: () => structuredClone(exileConfig),
    activeLeaveConfig: () => structuredClone(activeLeaveConfig),
    rewindConfig: () => structuredClone(rewindConfig),
    extraConfig: () => structuredClone(extraConfig),
    hardConfig: () => structuredClone(hardConfig),
    mindConfig: () => structuredClone(mindConfig),
    tempConfig: () => structuredClone(tempConfig),
    controlConfig: () => structuredClone(controlConfig),
    possessionConfig: () => structuredClone(possessionConfig),
    ruleConfig: () => ({ ...ruleConfig }),
    environmentConfig: () => structuredClone(environmentConfig),
    summonConfig: () => structuredClone(summonConfig),
    summonDefaults: () => structuredClone(summonDefaults),
    borrowConfig: () => structuredClone(borrowConfig),
    skillControlConfig: () => structuredClone(skillControlConfig),
    status: () => ({ mounted: true }), dispose() { root.contract.releaseGlobal(KEY); } };
  modules[KEY] = api;
  root.contract.initializeGlobal(KEY, api);
})();
`;
await writeFile(new URL('../../public/guimizhizhu_ui/core/battle-field-effect-reference.js',
  import.meta.url), output.replace(/[ \t]+$/gm, ''));
console.log('Extracted original battle managers, including fundamental rules and environments.');
