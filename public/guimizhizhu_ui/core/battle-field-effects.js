(() => {
  'use strict';
  const KEY = 'cryptLord.battleFieldEffects';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const reference = modules['cryptLord.battleFieldEffectReference'];
  if (!reference) throw new Error(`[${KEY}] original field-effect rules unavailable`);
  const original = reference.create({});
  const defaults = original.field.SUBTYPES;
  const pathwayNames = new Set([...Object.values(defaults).map(row => row.pathway),
    ...Object.keys(modules['cryptLord.battleLifeSave']?.defaults || {}),
    '阅读者', '观众', '战士', '收尸人', '药师', '恶棍', '囚犯', '罪犯', '学徒', '入门者', '仲裁人', '萨满', '占卜家', '窥秘人',
    '通识者', '偷盗者', '律师', '歌颂者', '水手', '秘祈人', '不眠者']);
  const clone = value => structuredClone(value);
  const own = (map, key) => map && Object.hasOwn(map, key) ? map[key] : undefined;
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const currentKeys = { 当前活力: 'hp', 当前敏捷: 'agility', 当前灵性: 'spirit',
    当前理智: 'sanity', 当前人性: 'humanity', 运气: 'luck' };
  const maxKeys = { 当前活力: 'maxHp', 当前敏捷: 'maxAgility', 当前灵性: 'maxSpirit',
    当前理智: 'maxSanity', 当前人性: 'maxHumanity' };
  const alive = unit => Boolean(unit && unit.hp > 0);
  const off = unit => unit.offField === true || Boolean(unit.activeLeaving || unit.exiled || unit.possessedHidden);
  const distance = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  const log = (battle, message) => {
    battle.log.push({ round: battle.round, message, at: Date.now(), fieldEffect: true });
    if (battle.log.length > 160) battle.log.shift();
  };
  // Original managers index by hero id; restore own-property maps after JSON round trips.
  const safeMap = source => Object.assign(Object.create(null), source || {});
  function initialize(battle, pathways, averages) {
    if (!battle.fieldEffect) battle.fieldEffect = { seq: 0, used: {}, nextAttack: {} };
    if (!battle.fieldEffectMeta) battle.fieldEffectMeta = {
      version: 1, rules: JSON.parse(JSON.stringify(defaults)),
      pathways: clone(pathways || battle.formulas?.pathways || window.GameDBManager?.DB?.godPathways || {}),
      averages: clone(averages || window.GameDBManager?.DB?.consumableConfig?.avgAttrByRank ||
        reference.averages()), seed: 0x6d2b79f5,
    };
    battle.fieldEffect.used = safeMap(battle.fieldEffect.used);
    for (const id of Object.keys(battle.fieldEffect.used))
      battle.fieldEffect.used[id] = safeMap(battle.fieldEffect.used[id]);
    battle.fieldEffect.nextAttack = safeMap(battle.fieldEffect.nextAttack);
    battle.targetInterference ||= {};
    for (const key of ['misrecognition', 'chaos'])
      battle.targetInterference[key] = safeMap(battle.targetInterference[key]);
  }
  function draw(battle) {
    const formulas = modules['cryptLord.battleFormulas'];
    if (battle.formulas && formulas) return formulas.draw(battle);
    let x = battle.fieldEffectMeta.seed >>> 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    battle.fieldEffectMeta.seed = x >>> 0;
    return (x >>> 0) / 4294967296;
  }
  function runtime(battle, data = {}, random) {
    initialize(battle);
    const dice = () => Math.max(0, Math.min(.999999999, number(random ? random() : draw(battle))));
    const math = Object.create(Math);
    math.random = dice;
    const pure = text => String(text || '').replace(/^序列\s*[：:]?\s*\d+(?:\.\d+)?[-—\s]*/u, '').trim();
    const fragments = text => String(text || '').split(/[/|，,;；与和及以及\s+&、]/u).filter(Boolean);
    const explicit = new Map();
    for (const actor of battle.units) {
      const parts = fragments(actor.sequence);
      if (parts.length !== 1 || !pure(parts[0]) || !actor.pathway) continue;
      const key = pure(parts[0]), value = actor.pathway.replace(/途径$/u, '');
      explicit.set(key, explicit.has(key) && explicit.get(key) !== value ? null : value);
    }
    const resolve = text => {
      const match = String(text).match(/序列\s*[：:]?\s*(\d+(?:\.\d+)?)/u);
      if (!match || /普通人/u.test(text)) return null;
      const found = Object.entries(battle.fieldEffectMeta.pathways)
        .find(([, rows]) => Array.isArray(rows) && rows.some(row => pure(row) === pure(text)));
      // Explicit pathway names remain useful when the optional original name library is absent.
      const pathway = found?.[0] || explicit.get(pure(text)) ||
        (pathwayNames.has(pure(text))
        ? pure(text) : '');
      return pathway ? { pathwayShort: pathway.replace(/途径$/u, ''), rank: Number(match[1]) } : null;
    };
    class Hero {
      constructor(unit) {
        if (unit.summonRecord) {
          unit = modules['cryptLord.teamBattleState'].createSummonUnit(
            battle, unit.summonRecord, unit.summonName, unit.teamType);
        }
        this.unit = unit;
        this.heroId = unit.id;
        this.name = unit.name;
        this.sequenceString = unit.sequence;
        const ranks = fragments(unit.sequence).flatMap(text => {
          const match = text.match(/序列\s*[：:]?\s*(\d+(?:\.\d+)?)/u);
          return match ? [Number(match[1])] : [];
        });
        for (const cfg of [...Object.values(defaults), ...Object.values(original.transfer.SUBTYPES),
          ...Object.values(original.bribery.SUBTYPES), ...Object.values(original.ruleChange.SUBTYPES),
          ...Object.values(original.environment.SUBTYPES),
          ...Object.values(original.summon.SUBTYPES),
          ...Object.values(original.borrow.SUBTYPES),
          ...Object.values(original.fundamental.SUBTYPES),
          original.balance.CONFIG, original.punishment.CONFIG])
          if (cfg.title && Number.isFinite(cfg.titleRank) &&
            String(unit.sequence).includes(cfg.title)) ranks.push(cfg.titleRank);
        this.sequenceRank = ranks.length ? Math.min(...ranks) : unit.rank;
        this.dataSource = unit.source;
        this.originalData = unit.summonCard || unit.playCard || (unit.source === 'player'
          ? data.stat_data || battle.summonMeta?.playerCard
          : modules['cryptLord.audienceImaginationState']?.cardFor(data, unit) || own(data.npc_data, unit.id));
        this.baseSequenceString = String(this.originalData?.当前序列 || '');
        this.grazingGrantSequenceString = battle.summonMeta?.grazingSequence;
        this.setMoveSet = moves => {
          if (unit.summonCard && !modules['cryptLord.teamBattleState'].cardAbilities(unit.summonCard)
            .some(row => row.power != null || row.isHeal || row.effects?.length))
            unit.summonCard.能力清单 = clone(moves);
        };
        this.playSource = unit.playSource;
        const stats = {};
        for (const [key, field] of Object.entries(currentKeys))
          Object.defineProperty(stats, key, {
            enumerable: Boolean(battle.rewindMeta),
            get: () => number(unit[field]), set: value => { unit[field] = Math.max(0, number(value)); },
          });
        const maxima = { 活力: 'maxHp', 敏捷: 'maxAgility', 灵性: 'maxSpirit',
          理智: 'maxSanity', 人性: 'maxHumanity', 神性: 'divinity' };
        for (const [key, field] of Object.entries(maxima))
          Object.defineProperty(stats, key, { enumerable: Boolean(battle.rewindMeta),
            get: () => number(unit[field]) });
        // Rewind replaces the original Hero's stat object. Keep our live unit bindings intact.
        Object.defineProperty(this, 'additionalStats', { get: () => stats, set: values => {
          for (const [key, field] of Object.entries({ ...currentKeys, ...maxima }))
            if (Object.hasOwn(values || {}, key)) unit[field] = Math.max(0, number(values[key]));
        } });
        Object.defineProperty(this, 'baseStats', {
          get: () => unit.baseAttributes || Object.fromEntries(Object.entries(maxima)
            .filter(([key]) => key !== '神性').map(([key, field]) => [key, number(unit[field])])
            .concat([['运气', number(unit.maxLuck ?? unit.luck)]])),
          set: value => { unit.baseAttributes = { ...value }; },
        });
        for (const [key, field] of [['health', 'hp'], ['currentHealth', 'hp'],
          ['maxHealth', 'maxHp'], ['speed', 'agility'], ['level', 'divinity'],
          ['attack', 'attack'], ['defense', 'defense']])
          Object.defineProperty(this, key, {
            get: () => unit[field], set: value => { unit[field] = value; },
          });
        Object.defineProperty(this, 'moveSet', { get: () => {
          const engine = modules['cryptLord.teamBattleState'];
          if (!engine || !this.originalData) return [];
          if (battle.skillControlMeta)
            return modules['cryptLord.battleSkillControl'].moves(
              { ...data, cryptLord: { ...data.cryptLord, teamBattle: battle } }, unit);
          const probe = clone(battle);
          Object.assign(probe, { phase: 'action', status: 'active', queue: [unit.id], index: 0 });
          return engine.options({ ...data, cryptLord: { ...data.cryptLord, teamBattle: probe } }, true)
            .filter(choice => !battle.borrowMeta || choice.id !== 'basic' && !choice.consumable)
            .map(choice => ({ name: choice.name, isHeal: choice.skill?.isHeal ?? (choice.heal > 0),
              targetType: choice.targetType || 'single', range: choice.range,
              minRange: choice.minRange ?? (choice.range === 0 ? 0 : 1),
              selfCentered: choice.range === 0, aoeRadius: choice.radius,
              isConsumable: Boolean(choice.consumable), remainingUses: choice.quantity,
              canUse: () => ({ canAfford: unit[choice.costKey || 'spirit'] >= choice.cost }) }));
        } });
        for (const key of ['isSummon', 'summonSubtype', 'summonOwnerId', 'summonOrigin',
          'grazingPersistent', 'picturePersonId', 'picturePersonPersistent',
          'picturePersonImmobile', 'summonUntil', 'cardSource', 'dismissed'])
          Object.defineProperty(this, key, { get: () => unit[key], set: value => { unit[key] = value; } });
        for (const [key, field] of [['effects', 'effects'], ['teamType', 'side'], ['x', 'x'], ['y', 'y'],
          ['bribery', 'bribery'], ['punishment', 'punishment'], ['skillControl', 'skillControl'],
          ['mythicFormUsed', 'mythicFormUsed'], ['controller', 'controller'],
          ['exiled', 'exiled'], ['turnSkip', 'turnSkip'],
          ['mindDepriveMovePct', 'mindDepriveMovePct'], ['mindDepriveMoveUntil', 'mindDepriveMoveUntil'],
          ['enemyControlMovePct', 'enemyControlMovePct'],
          ['envMoveBonus', 'envMoveBonus'],
          ['_terrainStandingOn', 'terrainStandingOn'],
          ['possessedHidden', 'possessedHidden'], ['possessing', 'possessing'], ['possessedBy', 'possessedBy'],
          ['move', 'moveRemaining'], ['movedThisTurn', 'movedThisTurn']])
          Object.defineProperty(this, key, {
            get: () => key === 'controller' ? unit[field] || unit.source : unit[field],
            set: value => { unit[field] = value; },
          });
        Object.defineProperty(this, 'activeLeaving', {
          get: () => unit.activeLeaving, set: value => { unit.activeLeaving = value; },
        });
      }
    }
    const heroes = battle.units.map(unit => new Hero(unit));
    for (const hero of heroes) {
      if (battle.briberyMeta) hero.unit.bribery ||= {};
      if (hero.unit.bribery) {
        for (const subtype of Object.keys(original.bribery.SUBTYPES))
          hero.unit.bribery[subtype] = safeMap(hero.unit.bribery[subtype]);
      }
    }
    const bm = { currentMvuState: data.stat_data ? data : {
        stat_data: battle.summonMeta?.playerCard || {}, npc_data: {} },
      validateCharacterData: card => ({ valid: ['活力', '敏捷', '灵性', '理智', '人性', '运气']
        .every(key => Number.isFinite(Number(card?.[key]))) }),
      teamManager: { getAllHeroes: () => heroes.filter(hero => !hero.dismissed) },
      allyTeam: heroes.filter(hero => hero.teamType === 'ally'),
      enemyTeam: heroes.filter(hero => hero.teamType === 'enemy'),
      getEnemyTeam: hero => heroes.filter(row => row.teamType !== hero.teamType),
      battleLogger: { log: message => log(battle, message), getLogs: () => battle.log },
      checkBattleEnd: () => false };
    if (battle.resourceStatusMeta)
      bm.statusEffectManager = modules['cryptLord.battleResourceStatus']?.manager(battle);
    Object.defineProperty(bm, 'battleState', { get: () =>
      battle.status === 'active' ? 'ongoing' : 'finished' });
    for (const [key, field] of [['currentRound', 'round'], ['fieldEffect', 'fieldEffect'],
      ['effectTransfer', 'effectTransfer'],
      ['possession', 'possession'],
      ['ruleChange', 'ruleChange'],
      ['environment', 'environment'],
      ['fundamentalRules', 'fundamentalRules'],
      ['picturePersonLosses', 'picturePersonLosses'], ['grazingPermanentLosses', 'grazingPermanentLosses'],
      ['balanceAuthority', 'balanceAuthority'],
      ['exile', 'exile'],
      ['activeLeave', 'activeLeave'], ['summon', 'summon'],
      ['borrowSerial', 'borrowSerial'],
      ['grazingSwitchFinal', 'grazingSwitchFinal'],
      ['grazingPersistentNotice', 'grazingPersistentNotice'],
      ['battleEvent', 'battleEvent'],
      ['rewind', 'rewind'],
      ['extraAction', 'extraAction'],
      ['tempAllegiance', 'tempAllegiance'], ['briberyFinishedRound', 'briberyFinishedRound'],
      ['targetInterference', 'targetInterference']])
      Object.defineProperty(bm, key, {
        get: () => battle[field], set: value => { battle[field] = value; },
      });
    let managers;
    if (battle.permanentControlMeta) {
      // Original managers require Sets; the native floor stores only JSON-compatible arrays.
      const state = {};
      Object.defineProperty(state, 'processes', {
        get: () => battle.enemyControl.processes,
        set: value => { battle.enemyControl.processes = value; },
      });
      for (const key of ['marionetteDone', 'conquestUsed', 'mindUsed', 'enslaveUsed', 'tameUsed', 'damaged']) {
        const set = new Set(battle.enemyControl[key] || []);
        const sync = () => {
          Set.prototype.clear.call(set);
          for (const value of battle.enemyControl[key] || []) Set.prototype.add.call(set, value);
        };
        set.has = value => { sync(); return Set.prototype.has.call(set, value); };
        for (const method of ['add', 'delete', 'clear']) {
          const native = set[method].bind(set);
          set[method] = value => {
            sync();
            const result = native(value);
            battle.enemyControl[key] = [...set];
            return result;
          };
        }
        state[key] = set;
      }
      Object.defineProperty(bm, 'enemyControl', { get: () => state });
      bm.controlConfig = battle.permanentControlMeta.config;
      bm.controlCost = (rank, stat) => Math.max(1, Math.round(
        (own(battle.fieldEffectMeta.averages, String(rank)) ||
          own(battle.fieldEffectMeta.averages, '10') ||
          reference.averages()['10'])[stat] * bm.controlConfig.CONTROL_SPIRIT_RATIO));
    }
    // Contests use current six-resource values only, never maximum or engine-mirror fields.
    const bestStat = hero => Math.max(...Object.keys(currentKeys).map(key => number(hero.additionalStats[key])));
    const score = (hero, foe, base, factor) => base * factor * managers.advantage.tacticMultiplier(hero, foe);
    const blocked = unit => Boolean(unit.stunned || unit.skipTurn ||
      (battle.hardControlMeta ? unit.turnSkip?.skipRound === battle.round : unit.turnSkip));
    const mythicConfig = battle.mythicMeta?.config || reference.mythicConfig();
    const deps = {
      console: { log() {}, warn: (...args) => console.warn(...args),
        error: (...args) => console.error(...args) },
      Math: math, Hero,
      borrowEnabled: Boolean(battle.borrowMeta),
      useOriginalControl: Boolean(battle.permanentControlMeta),
      useOriginalPossession: Boolean(battle.possessionMeta),
      LifeSaveManager: { splitSequenceFragments: fragments, resolveFragment: resolve,
        initOnHero: hero => modules['cryptLord.teamBattleState']?.prepareSummon(battle,
          hero.unit, bm.currentMvuState),
        tryAbsorb: (hero, amount) => modules['cryptLord.battleLifeSave']?.absorb(hero.unit, amount) ||
          { damage: amount, triggered: false } },
      AttributeCalculator: {
        applyBuffDebuff(hero, stat, base) {
          if (battle.fundamentalMeta && battle.formulas)
            return modules['cryptLord.battleFormulas'].modified(battle, hero.unit, stat, base);
          let percent = 0, fixed = 0;
          for (const effect of hero.effects || []) {
            if (effect.stat !== stat || !['buff', 'debuff'].includes(effect.type)) continue;
            const sign = effect.type === 'debuff' ? -1 : 1;
            if (effect.valueType === 'fixed') fixed += sign * effect.power;
            if (effect.valueType === 'percentage') percent += sign * effect.power / 100;
          }
          return Math.max(0, Math.floor(base * (1 + percent) + fixed));
        },
        recalculateAllSixDimStats: hero => {
          const recalculate = modules['cryptLord.teamBattleState']?.recalculateAttributes;
          if (!recalculate) throw new Error('六维重算模块不可用。');
          recalculate(hero.unit);
        },
      },
      PossessionManager: { processOnTarget: () => null, processOf: () => null,
        releaseOnTarget() {}, releaseByCaster() {} },
      TacticCatalog: { FIELD_EFFECT_ACTION: '施加效果', FIELD_EFFECT_TIMING: 'field_effect',
        LAST_SKILL_MULT: 3,
        SKILL_CONTROL_ACTION: '技能干涉', TARGET_INTERFERENCE_ACTION: '目标干涉',
        EFFECT_TRANSFER_ACTION: '效果传递', BRIBERY_ACTION: '贿赂',
        AURA_ACTION: '光环效果', CANON_SLEEP: '神秘再现·睡美人',
        MYTHIC_ACTION: '神话生物形态', CANON_MYTHIC_ACTION: '神秘再现·丑小鸭',
        CONTROL_ACTION: '操控敌人', FUNDAMENTAL_RULE_ACTION: '底层规则修改',
        ...reference.borrowConfig(),
        ...reference.skillControlConfig(),
        spiritCost(rank) {
          return Math.max(1, Math.round(deps.ConsumableMoveBuilder.getAvgAttrs(rank).灵性 * .05));
        },
        ...mythicConfig,
        ...(battle.exileMeta?.config || reference.exileConfig()),
        ...(battle.activeLeaveMeta?.config || reference.activeLeaveConfig()),
        ...(battle.rewindMeta?.config || reference.rewindConfig()),
        ...(battle.extraActionMeta?.config || reference.extraConfig()),
        ...(battle.hardControlMeta?.config || reference.hardConfig()),
        ...(battle.mindDepriveMeta?.config || reference.mindConfig()),
        ...(battle.tempControlMeta?.config || reference.tempConfig()),
        ...(battle.permanentControlMeta?.config || reference.controlConfig()),
        ...(battle.possessionMeta?.config || reference.possessionConfig()),
        ...reference.ruleConfig(),
        ...(battle.ruleChangeMeta?.config || {}),
        ...(battle.environmentMeta?.config || reference.environmentConfig()),
        ...reference.summonConfig(),
        envChangeCost(rank) {
          const attrs = deps.ConsumableMoveBuilder.getAvgAttrs(rank);
          return Math.max(1, Math.round((attrs[this.ENV_CASTER_STAT] ?? 0) * this.ENV_RATIO));
        },
        ruleChangeCost(rank) {
          const attrs = deps.ConsumableMoveBuilder.getAvgAttrs(rank);
          return Math.max(1, Math.round((attrs[this.RULE_CHANGE_CASTER_STAT] ?? 0) * this.RULE_CHANGE_RATIO));
        },
        controlSpiritCost(rank) {
          return this.controlStatCost(rank, '灵性');
        },
        controlStatCost(rank, stat) {
          const attrs = deps.ConsumableMoveBuilder.getAvgAttrs(rank);
          return Math.max(1, Math.round((attrs[stat] ?? 0) * this.CONTROL_SPIRIT_RATIO));
        },
        tempAllegianceCost(rank, stat) {
          const attrs = deps.ConsumableMoveBuilder.getAvgAttrs(rank);
          const key = this.TEMP_CASTER_STATS.includes(stat) ? stat : '灵性';
          return Math.max(1, Math.round((attrs[key] ?? 0) * this.TEMP_ALLEGIANCE_RATIO));
        },
        mindDepriveCost(rank) {
          const key = this.MIND_DEPRIVE_CASTER_STAT;
          return Math.max(1, Math.round(deps.ConsumableMoveBuilder.getAvgAttrs(rank)[key] * this.MIND_DEPRIVE_RATIO));
        },
        extraActionCost(rank) {
          return Math.max(1, Math.round(deps.ConsumableMoveBuilder.getAvgAttrs(rank).灵性 * this.EXTRA_ACTION_RATIO));
        },
        exileCost(rank) {
          return Math.max(1, Math.round(deps.ConsumableMoveBuilder.getAvgAttrs(rank).灵性 * this.EXILE_RATIO));
        },
        exilePoisonPower(rank) {
          return Math.max(1, Math.round(deps.ConsumableMoveBuilder.getAvgAttrs(rank).活力 * this.EXILE_POISON_RATIO));
        },
        mythicTier(rank) {
          const value = Number(rank);
          if (!Number.isFinite(value) || value > this.MYTHIC_RANK_GATE) return null;
          return value <= this.MYTHIC_HIGH_RANK ? this.MYTHIC_TIERS.high : this.MYTHIC_TIERS.low;
        },
        BALANCE_ACTION: '「平衡」权柄', PUNISHMENT_ACTION: '惩戒', BATTLE_EVENT_ACTION: '制造战场事件' },
      EnemyControlManager: {
        processOf: () => null,
        processOnTarget: () => null, endProcess() {},
        findHero: (_, id) => heroes.find(hero => hero.heroId === id),
        isEnemyOf: (caster, target) => alive(target?.unit) && caster.teamType !== target.teamType,
        selectable: (caster, target) => alive(target?.unit) && !off(target.unit) &&
          caster.teamType !== target.teamType,
        interruptCaster() {},
        groupByTarget(attempts) {
          const groups = new Map();
          for (const row of attempts) {
            if (!groups.has(row.target.heroId)) groups.set(row.target.heroId, []);
            groups.get(row.target.heroId).push(row);
          }
          return [...groups.values()];
        },
        pickWinner(list) {
          const player = list.find(row => row.caster.dataSource === 'player');
          if (player) return player;
          const speed = hero => {
            let percent = 0, fixed = 0;
            for (const effect of hero.unit.effects || []) {
              if (effect.stat !== 'speed' || !['buff', 'debuff'].includes(effect.type)) continue;
              const sign = effect.type === 'debuff' ? -1 : 1;
              if (effect.valueType === 'fixed') fixed += sign * effect.power;
              if (effect.valueType === 'percentage') percent += sign * effect.power / 100;
            }
            return Math.max(0, Math.floor(hero.unit.agility * (1 + percent) + fixed));
          };
          const top = Math.max(...list.map(row => speed(row.caster)));
          const tied = list.filter(row => speed(row.caster) === top);
          return tied[Math.floor(dice() * tied.length)];
        },
        bestStat,
        speedOf: hero => deps.AttributeCalculator.applyBuffDebuff(hero, 'speed', hero.speed),
        contest(caster, target, penalty, a, b) {
          const left = score(caster, target, a ?? caster.additionalStats.当前灵性, penalty);
          const right = score(target, caster, b ?? bestStat(target), 1);
          const casterScore = left * (.8 + dice() * .4), targetScore = right * (.8 + dice() * .4);
          return { win: casterScore > targetScore, casterScore: Math.round(casterScore),
            targetScore: Math.round(targetScore) };
        },
        canPossiblyWin: (caster, target, penalty, a, b) =>
          score(caster, target, a, penalty) * 1.2 > score(target, caster, b ?? bestStat(target), 1) * .8,
        contestTail: row => `（拼点 ${row.casterScore} : ${row.targetScore}）`,
        markDamaged: (_, hero) => { hero.unit.lastDamagedRound = battle.round; },
        convertTeam(_, target, caster) {
          managers.tempAllegiance.releaseOnTarget(bm, target);
          const from = target.teamType === 'ally' ? bm.allyTeam : bm.enemyTeam;
          const to = caster.teamType === 'ally' ? bm.allyTeam : bm.enemyTeam;
          const index = from.indexOf(target);
          if (index >= 0) from.splice(index, 1);
          if (!to.includes(target)) to.push(target);
          target.teamType = caster.teamType;
          target.controller = caster.controller;
        },
      },
      parseSequenceRank: text => {
        const ranks = fragments(text).flatMap(part => {
          const match = part.match(/序列\s*[：:]?\s*(\d+(?:\.\d+)?)/u);
          return match ? [Number(match[1])] : [];
        });
        return ranks.length ? Math.min(...ranks) : 10;
      },
      SkillControlManager: { isBanned: (hero, skill) =>
        (hero.unit.skillControl?.banned || []).some(row => row.name === skill) },
      skillControlEnabled: Boolean(battle.skillControlMeta),
      ConsumableMoveBuilder: { getAvgAttrs: rank => own(battle.fieldEffectMeta.averages, String(rank)) ||
        own(battle.fieldEffectMeta.averages, '10') || reference.averages()['10'] },
      TacticResolver: { alive: hero => alive(hero?.unit),
        skillControlContest(caster, target, mode, last) {
          if (battle.skillControlMeta)
            return modules['cryptLord.battleSkillControl'].contest(
              caster, target, mode, last, dice, managers.advantage);
          const casterScore = number(caster.additionalStats.当前灵性) *
            managers.advantage.tacticMultiplier(caster, target) * (.8 + dice() * .4);
          const targetScore = bestStat(target) * (last && mode !== '复制' ? 3 : 1) *
            managers.advantage.tacticMultiplier(target, caster) * (.8 + dice() * .4);
          return { win: casterScore > targetScore, casterScore: Math.round(casterScore),
            targetScore: Math.round(targetScore) };
        },
        applySkillControl: (_host, caster, target, mode, skill) =>
          modules['cryptLord.teamBattleState'].applyBorrowedSkill(data, battle,
            caster.unit, target.unit, mode, skill),
        shuffle: list => {
          const out = list.slice();
          for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(dice() * (i + 1)); [out[i], out[j]] = [out[j], out[i]];
          }
          return out;
        },
        writeReport: (_, results) => results.forEach(row => {
          if (row.kind === 'battle-event') {
            const manager = managers.battleEvent, cfg = manager.cfgOf(row.subtype);
            const args = row.stage === 'start' ? [row.actor, row.shownAs || row.subtype]
              : row.stage === 'strike' ? [(row.names || []).join('、')] : [];
            log(battle, manager.line(cfg, row.stage, ...args));
          } else log(battle,
            `${row.actor} 的「${row.shownAs}」与 ${row.target} 的关系结束（${row.stage}）。`);
        }),
      },
      OffFieldManager: { isOff: hero => off(hero.unit), meta: hero =>
        off(hero.unit) ? { pickHint: '目标当前不在场。' } : null },
      BattleBoard: { distanceBetween: distance,
        DEFAULT_COLS: 12,
        distance: (ax, ay, bx, by) => distance({ x: ax, y: ay }, { x: bx, y: by }) },
      TurnSkipManager: battle.hardControlMeta ? undefined : { pending: hero => blocked(hero.unit),
        occupiesTactic: (_bm, hero) => blocked(hero.unit) },
      MysteryReenactmentCanonAccess: { canUseTactic(hero, id) {
        const ledger = hero.originalData?.$专属玩法?.窥秘人途径?.神秘再现玩法?.法术解锁账本;
        const gate = hero.sequenceString.includes('知识之妖') || fragments(hero.sequenceString)
          .some(text => { const row = resolve(text); return row?.pathwayShort === '窥秘人' && row.rank <= 4; });
        return hero.dataSource === 'player' && !hero.isSummon && !hero.playSource &&
          Boolean(ledger && Object.hasOwn(ledger, id)) && gate;
      }, runtimeState(hero, id, create) {
        const play = hero.originalData?.$专属玩法?.窥秘人途径?.神秘再现玩法;
        if (!play || !Object.hasOwn(play.法术解锁账本 || {}, id)) return null;
        if (create) {
          play.法术运行状态 ||= {};
          if (!Object.hasOwn(play.法术运行状态, id))
            play.法术运行状态[id] = {};
        }
        return Object.hasOwn(play.法术运行状态 || {}, id) ? play.法术运行状态[id] : null;
      } },
      GameDBManager: { DB: { ...reference.summonDefaults(),
        abilitySystemDB: {},
        ...battle.summonMeta?.pool?.pictureConfig,
        godPathways: battle.summonMeta?.pool?.pathways || battle.fieldEffectMeta.pathways,
        sequenceAbilities: battle.summonMeta?.pool?.abilities || {} } },
      AttributeMapper: { mapToHero: (card, name) => ({ summonRecord: card, summonName: name }) },
      SkillLoader: { loadSkillsFromCharacter(card) {
        const rows = modules['cryptLord.teamBattleState']?.cardAbilities(card) || [];
        return rows.filter(row => row.power != null || row.isHeal || row.isPassive || row.effects?.length);
      } },
      GrazingCore: modules['cryptLord.battleSummon']?.grazingCore(battle),
      TacticSessionManager: { soulBlock: () =>
        modules['cryptLord.battleSummon']?.switchGate(battle, bm.currentMvuState) || '' },
      PlayerProjectionResolver: { resolve(state, overrides) {
        const probe = clone(state);
        if (overrides?.grazingActiveNames)
          modules['cryptLord.grazingState'].playOf(probe).激活灵魂 = overrides.grazingActiveNames;
        return modules['cryptLord.audienceImagination'].resolve(battle.summonMeta.pool, probe);
      } },
      PlayerBattleProjectionRefresher: { refresh(_host, hero) {
        modules['cryptLord.battleSummon'].syncProjection(battle, bm.currentMvuState,
          hero.unit, Boolean(battle.grazingSwitchLocked));
        hero.grazingActiveSouls = modules['cryptLord.battleSummon'].grazingCore(battle)
          .activeSelections(bm.currentMvuState);
        return { ok: true };
      } },
      ShamanPictureMode: { recordsOfState: state =>
        (modules['cryptLord.shamanPicture']?.records(state) || []).map(row => ({ ...row, data: row.card })) },
      GrazingProjectionManager: { syncSystem: (_host, hero) =>
        modules['cryptLord.battleSummon']?.syncProjection(battle, bm.currentMvuState, hero.unit) },
      resolvePathwayFromSequence: text => resolve(text)?.pathwayShort || '',
      TimePassageEngine: {
        _parseEra: text => modules['cryptLord.shamanTerritory']?.minutes(text),
        _toMinutes: parsed => parsed == null ? NaN : parsed,
      },
      SkillRange: {
        normalize: skill => ({ min: skill.minRange ?? 1, max: skill.range ?? 3 }),
        isSelfType: type => type === 'self',
        isAllyType: type => ['ally', 'allAlly', 'allAllies'].includes(type),
        isAllType: type => ['all', 'allEnemies', 'allAlly', 'allAllies'].includes(type),
        isSelfCentered: skill => skill.selfCentered === true,
        resolveAoeRadius: skill => skill.aoeRadius ?? 2,
        unitsInCircle: (x, y, radius, pool) => pool.filter(hero => distance({ x, y }, hero) <= radius),
        inRange: (actor, target, skill) => {
          const d = distance(actor, target);
          return d >= (skill.minRange ?? 1) && d <= skill.range;
        },
      },
      TargetSelector: {
        requiresManualPick: skill => skill.targetType !== 'self' && !skill.selfCentered,
        getFactionPool: (_skill, caster) => heroes.filter(target =>
          target !== caster && alive(target.unit) && !off(target.unit) &&
          target.teamType !== caster.teamType),
      },
      DamageCalculator: { calculateDamageWithDivinity: (actor, target, skill) =>
        modules['cryptLord.battleFormulas'].damage(battle, actor.unit, target.unit,
          skill.calculation || skill, () => .5).amount },
      WeaponAccuracy: { chance: (actor, target, skill) =>
        modules['cryptLord.battleFormulas'].accuracy(battle, actor.unit, target.unit,
          skill.calculation || skill) },
      terrainEffectsFor: (hero, terrain) => {
        const presets = modules['cryptLord.battleTerrainPresets'];
        return (presets?.hits(terrain.id, {
          rank: hero.sequenceRank,
          tags: (hero.unit.tags || []).map(tag => typeof tag === 'string' ? tag : tag.name),
        }, terrain.rank) || []).map(hit => ({ 风味: hit.kind, 通道: hit.channel,
          属性: hit.stat, 值: hit.value, 沾染回合: hit.rounds, 档位: hit.tier }));
      },
    };
    bm.ruleConfig = deps.TacticCatalog;
    managers = reference.create(deps);
    if (battle.tacticCpuMeta) {
      const upkeep = managers.grazingBattle.upkeep;
      managers.grazingBattle.upkeep = function (host, summary, results) {
        const hero = heroes.find(row => row.dataSource === 'player' && !row.isSummon);
        const projectedRank = hero?.sequenceRank;
        if (hero) hero.sequenceRank = hero.unit.rank;
        try { return upkeep.call(this, host, summary, results); }
        finally { if (hero) hero.sequenceRank = projectedRank; }
      };
    }
    if (battle.borrowMeta) {
      const coverage = managers.borrowRegistry.validateCoverage();
      if (!coverage.ok) throw new Error('能力借用目录缺少显式策略，已拒绝结算。');
    }
    if (battle.summonMeta) {
      const state = managers.summon.ensure(bm);
      state.counts = safeMap(state.counts);
      state.npcCandidates = safeMap(state.npcCandidates);
      for (const id of Object.keys(state.counts)) state.counts[id] = safeMap(state.counts[id]);
    }
    if (battle.fundamentalMeta) {
      // Native fixture/base overrides are the fallback beneath the original law stack.
      const candidates = managers.formulaEngine.candidates;
      managers.formulaEngine.candidates = function (host, id, opts) {
        const rows = candidates.call(this, host, id, opts);
        const saved = battle.formulas?.values?.[id];
        if (saved != null && this.validateValue(id, saved).ok) rows.at(-1).value = saved;
        return rows;
      };
    }
    if (battle.punishmentMeta) {
      managers.punishment.CONFIG = clone(battle.punishmentMeta.config);
      managers.punishment.DAMAGE_MULTIPLIER = battle.punishmentMeta.multiplier;
      bm.board = { hazardAt: (x, y) => {
        const tile = battle.terrain?.find(tile => tile.x === x && tile.y === y && tile.id);
        return tile ? { ...tile, 种类: 'hazard' } : null;
      } };
      bm.cpuManager = new managers.punishmentCpu('easy', bm);
    }
    if (battle.exileMeta || battle.activeLeaveMeta || battle.battleEventMeta || battle.mindDepriveMeta || battle.possessionMeta || battle.environmentMeta || battle.summonMeta) {
      const valid = (x, y) => Number.isInteger(x) && Number.isInteger(y) &&
        x >= 0 && y >= 0 && x < battle.board.cols && y < battle.board.rows;
      bm.board = { ...bm.board, ...battle.board, naturalEnv: battle.naturalEnv, remove() {},
        isFree: (x, y) => valid(x, y) && !battle.terrain?.some(tile =>
          tile.x === x && tile.y === y && tile.blocked) &&
          !heroes.some(hero => alive(hero.unit) && !off(hero.unit) && hero.x === x && hero.y === y),
        getOuterRangeCells(x, y, radius) {
          const cells = [];
          for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++)
            if (Math.max(Math.abs(dx), Math.abs(dy)) === radius && valid(x + dx, y + dy))
              cells.push({ x: x + dx, y: y + dy });
          return cells;
        },
        place(hero, x, y) {
          if (!alive(hero.unit) || !this.isFree(x, y)) return false;
          hero.x = x; hero.y = y;
          if (hero.isSummon && !heroes.includes(hero)) {
            heroes.push(hero);
            battle.units.push(hero.unit);
          }
          modules['cryptLord.teamBattleState']?.terrainEntry(battle, hero.unit);
          return true;
        },
      };
    }
    if (battle.balanceMeta) {
      managers.balance.CONFIG = clone(battle.balanceMeta.config);
      managers.balance.MAX_POINTS = battle.balanceMeta.maxPoints;
      battle.balanceAuthority = managers.balance.ensure(bm);
      for (const key of ['spent', 'relations'])
        battle.balanceAuthority[key] = safeMap(battle.balanceAuthority[key]);
    }
    if (battle.briberyMeta?.rules) managers.bribery.SUBTYPES =
      Object.fromEntries(Object.entries(battle.briberyMeta.rules)
        .filter(([key]) => Object.hasOwn(original.bribery.SUBTYPES, key)));
    if (battle.effectTransfer) {
      battle.effectTransfer.relations = safeMap(battle.effectTransfer.relations);
      if (battle.effectTransferMeta?.rules)
        managers.transfer.SUBTYPES = Object.fromEntries(Object.entries(battle.effectTransferMeta.rules)
          .filter(([key]) => Object.hasOwn(original.transfer.SUBTYPES, key)));
    }
    bm.effectManager = managers.resolvedEffects;
    bm.battleLogger.logTransferredDamage = (caster, recipient, amount, message) => {
      if (caster) caster.unit.damage = number(caster.unit.damage) + amount;
      log(battle, message);
      Object.assign(battle.log.at(-1), { actor: caster?.heroId, target: recipient.heroId,
        damage: amount, transferred: true });
    };
    managers.field.SUBTYPES = Object.fromEntries(Object.entries(battle.fieldEffectMeta.rules)
      .filter(([key]) => Object.hasOwn(defaults, key))
      .map(([key, cfg]) => [key, { ...cfg, report: defaults[key].report }]));
    return { ...managers, bm, heroes, dice };
  }
  const withRuntime = (battle, data, random, operation) => {
    const rt = runtime(battle, data, random), scope = battle.borrowScope;
    if (!scope) return operation(rt);
    const caster = rt.heroes.find(row => row.heroId === scope.actor);
    const owner = rt.heroes.find(row => row.heroId === scope.source);
    const ctx = rt.borrowRegistry.context(caster, owner, scope.authority, scope.descriptor);
    ctx.borrowId = scope.borrowId;
    ctx.rolls = scope.rolls || (scope.rolls = []);
    const view = rt.borrowContext.casterView(ctx);
    rt.heroes.splice(rt.heroes.indexOf(caster), 1, view);
    for (const key of ['allyTeam', 'enemyTeam'])
      rt.bm[key] = rt.bm[key].map(row => row === caster ? view : row);
    return rt.borrowContext.withUsageOwner(rt.bm, ctx, () => operation(rt));
  };
  function options(battle, actor, data) {
    if (!actor || !alive(actor) || off(actor)) return [];
    const copy = clone(battle), rt = runtime(copy, data);
    const hero = rt.heroes.find(row => row.heroId === actor.id);
    return rt.field.availableSubtypes(rt.bm, hero).map(subtype => {
      const cfg = rt.field.cfgOf(subtype);
      return { subtype, name: rt.field.displayName(hero, subtype),
        action: cfg.action || '施加效果', description: cfg.desc,
        hint: cfg.contestHint || '', cost: rt.field.costOf(hero, subtype),
        resource: rt.field.statKeyOf(subtype), remaining: rt.field.quotaLeft(rt.bm, hero, subtype),
        reason: rt.field.blockedReason(rt.bm, hero, subtype),
        needsPick: rt.field.needsPick(subtype),
        targets: rt.field.pickPool(rt.bm, hero, subtype).map(target =>
          ({ id: target.heroId, name: target.name, side: target.teamType })) };
    });
  }
  function preview(battle, actor, subtype, targetId, data) {
    if (!Object.hasOwn(defaults, subtype)) return [];
    const rt = runtime(clone(battle), data);
    const hero = rt.heroes.find(row => row.heroId === actor.id);
    const target = rt.heroes.find(row => row.heroId === targetId);
    if (!hero || !rt.field.eligibility(hero)[subtype]?.ok) return [];
    return rt.field.previewFor(rt.bm, hero, subtype, target).map(row => ({
      target: row.hero.heroId, name: row.hero.name, power: row.power,
      blocked: row.blocked, detail: rt.field.detailOf(row.spec, row.power, hero),
    }));
  }
  function tacticMultiplier(battle, actor, target) {
    if (!battle.fieldEffectMeta) return 1;
    const rt = runtime(battle);
    const source = rt.heroes.find(row => row.heroId === actor.id);
    const foe = rt.heroes.find(row => row.heroId === target.id);
    return rt.advantage.tacticMultiplier(source, foe);
  }
  function attempt(battle, actor, subtype, targetId, data, random) {
    if (!Object.hasOwn(defaults, subtype)) return { ok: false, error: '未知的施加效果能力。' };
    const rt = runtime(battle, data, random), hero = rt.heroes.find(row => row.heroId === actor?.id);
    if (!hero || !alive(actor) || off(actor) || !rt.field.eligibility(hero)[subtype]?.ok)
      return { ok: false, error: '施加效果资格或在场状态已变化。' };
    const reason = rt.field.blockedReason(rt.bm, hero, subtype);
    if (reason) return { ok: false, error: reason };
    const picked = rt.heroes.find(row => row.heroId === targetId) || null;
    if (rt.field.needsPick(subtype) && !rt.field.pickPool(rt.bm, hero, subtype).includes(picked))
      return { ok: false, error: '目标已不在可选范围内。' };
    const summary = [], results = [];
    rt.field.attempt(rt.bm, hero, subtype, picked, summary, results);
    summary.forEach(message => log(battle, message));
    return { ok: true, actor: actor.id, subtype, results, summary };
  }
  function npc(battle, data, excluded = [], random) {
    const rt = runtime(battle, data, random), outcomes = [];
      for (const hero of rt.heroes.filter(row => row.controller !== 'player' &&
      alive(row.unit) && !off(row.unit) && !excluded.includes(row.heroId))) {
      if (!rt.field.npcShouldTry(rt.bm, hero) || rt.dice() >= .3) continue;
      const plan = rt.field.npcPlan(rt.bm, hero);
      if (!plan) continue;
      const summary = [], results = [];
      rt.field.attempt(rt.bm, hero, plan.subtype, plan.target, summary, results);
      summary.forEach(message => log(battle, message));
      outcomes.push({ actor: hero.heroId, subtype: plan.subtype, results, summary });
    }
    return outcomes;
  }
  function sweep(battle) {
    if (!battle.fieldEffectMeta) return;
    const rt = runtime(battle);
    rt.field.sweep(rt.bm);
    for (const hero of rt.heroes) if (!alive(hero.unit)) rt.interference.clear(rt.bm, hero);
  }
  function endRound(battle) {
    if (!battle.fieldEffectMeta) return;
    const rt = runtime(battle);
    rt.interference.expireRound(rt.bm);
  }
  function finish(battle) {
    if (!battle.fieldEffectMeta) return;
    battle.fieldEffect.nextAttack = {};
    battle.targetInterference = { misrecognition: {}, chaos: {} };
  }
  function turnStart(battle, actor) {
    if (modules['cryptLord.battleEffects'])
      return modules['cryptLord.battleEffects'].process(battle, actor, 'turn_start');
    if (!battle.fieldEffectMeta || !alive(actor)) return;
    for (const effect of actor.effects || []) {
      if (!alive(actor)) break;
      if (!effect.fieldEffect || effect.triggerTiming !== 'turn_start' ||
        !['poison', 'regen'].includes(effect.type) || effect.duration <= 0) continue;
      const key = currentKeys[effect.stat], max = maxKeys[effect.stat];
      if (!key || !max) continue;
      const amount = Math.max(0, effect.valueType === 'fixed' ? effect.power :
        Math.floor(actor[max] * effect.power / 100));
      const loss = effect.type === 'poison'
        ? modules['cryptLord.battleEffectTransfer']?.loss(battle, actor, effect.stat, amount, {
          derived: effect.effectTransferResolved === true, sourceLabel: effect.name,
          sourceKind: '持续伤害',
        }) : null;
      const delta = effect.type === 'poison' ? -(loss?.actualDamage ?? Math.min(actor[key], amount)) :
        Math.min(actor[max] - actor[key], amount);
      if (!loss) {
        actor[key] += delta;
        modules['cryptLord.battlePermanentControl']?.markDamaged(battle, actor, -delta);
      }
      effect.duration--;
      log(battle, `${actor.name} 的「${effect.name}」${delta < 0 ? '损失' : '恢复'} ${Math.abs(delta)} 点${effect.stat.slice(2)}，剩余 ${effect.duration} 次行动。`);
    }
    actor.effects = (actor.effects || []).filter(effect => !effect.fieldEffect ||
      effect.triggerTiming !== 'turn_start' || effect.duration > 0);
    if (!alive(actor)) sweep(battle);
  }
  function redirect(battle, actor, target, choice, data, random) {
    if (!battle.fieldEffectMeta) return null;
    const rt = runtime(battle, data, random);
    const skill = { name: choice.name, power: choice.power, isHeal: choice.heal > 0,
      isPassive: false, targetType: choice.targetType, range: choice.range,
      minRange: choice.range === 0 ? 0 : 1,
      selfCentered: choice.targetType !== 'self' && choice.range === 0 };
    const result = rt.interference.resolve(rt.bm, rt.heroes.find(row => row.heroId === actor.id),
      [rt.heroes.find(row => row.heroId === target.id)], skill);
    return result ? { targets: result.targets.map(hero => hero.unit),
      forceSide: result.forceSide, excludeSelf: result.excludeSelf, mode: result.mode } : null;
  }
  const pending = (battle, actor) => own(battle.fieldEffect?.nextAttack, actor.id);
  function consume(battle, actor) {
    const value = pending(battle, actor);
    if (value) {
      delete battle.fieldEffect.nextAttack[actor.id];
      log(battle, `${actor.name} 的「${value.subtype}」已由本次攻击消费。`);
    }
    return value;
  }
  function statusLines(battle, actor) {
    const out = [];
    const state = battle.targetInterference;
    if (own(state?.misrecognition, actor.id)) out.push('扭曲：目标错认 · 下一次攻击或治疗将认错目标');
    if (own(state?.chaos, actor.id)) out.push('混乱：目标失序 · 本回合攻击或治疗将认错目标');
    if (pending(battle, actor)) out.push('灵肉之刃 · 下一次伤害攻击忽略防御增益');
    for (const effect of (actor.effects || []).filter(row => row.fieldEffect))
      out.push(`${effect.name} · ${effect.power}${effect.valueType === 'fixed' ? '点' : '%'} · ${
        effect.fieldEffectUntil == null ? `剩余 ${effect.duration} 次行动`
          : `剩余 ${Math.max(0, effect.fieldEffectUntil - battle.round + 1)} 回合`}`);
    return out;
  }
  const api = { initialize, draw, withRuntime, options, preview, tacticMultiplier, attempt, npc,
    sweep, endRound, finish, turnStart,
    redirect, pending, consume, statusLines,
    defaults: () => JSON.parse(JSON.stringify(defaults)),
    status: () => ({ mounted: true }), dispose() { contract.releaseGlobal(KEY); } };
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
