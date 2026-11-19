(() => {
  'use strict';

  const KEY = 'cryptLord.nativeSettlement';
  const INDUSTRY_KEY = 'cryptLord.industryState';
  const DOMAIN_KEY = 'cryptLord.domainState';
  const WEEK_MINUTES = 7 * 24 * 60;
  const DAY_MINUTES = 24 * 60;
  const YEAR_MINUTES = 365 * DAY_MINUTES;
  const D100_SLOT_COUNT = 20;
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const clone = value => value === undefined ? undefined : structuredClone(value);
  const canonical = value => Array.isArray(value) ? value.map(canonical) : record(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  const signature = value => JSON.stringify(canonical(value));
  const issued = new WeakMap(), subscriptions = [];
  let disposed = false, epoch = 0;
  function check(guard, token = epoch) {
    if (disposed || token !== epoch || guard && !guard()) throw new DOMException('世界联动结算已取消', 'AbortError');
  }
  function failure(context, message, error) {
    if (context.strict) throw error;
    console.warn(`[${KEY}] ${message}`, error);
  }

  function equal(left, right) {
    if (Object.is(left, right)) return true;
    if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
    if (Array.isArray(left) !== Array.isArray(right)) return false;
    const leftKeys = Object.keys(left).filter(key => key !== 'cryptLord').sort();
    const rightKeys = Object.keys(right).filter(key => key !== 'cryptLord').sort();
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every((key, index) => key === rightKeys[index] && equal(left[key], right[key]));
  }

  function toNonNegativeInteger(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
  }

  function applyTurnRewards(data, context) {
    const userLength = String(context?.userText ?? '').length;
    const narrativeLength = String(context?.narrativeText ?? '').length;
    const totalLength = userLength + narrativeLength;
    const theaterPoints = Math.floor(totalLength / 2000);
    if (!theaterPoints) return Object.freeze({ theaterPoints: 0 });
    if (data.stat_data && typeof data.stat_data === 'object' && !Array.isArray(data.stat_data)) {
      data.stat_data['剧场点数'] = toNonNegativeInteger(data.stat_data['剧场点数']) + theaterPoints;
    }
    return Object.freeze({ theaterPoints });
  }
  function parseEra(value) {
    const match = String(value || '').replace(/\s+/g, '')
      .match(/第([一二三四五六七八九十\d]+)纪(\d+)年(\d+)月(\d+)日星期(.)(\d+):(\d+)/);
    if (!match) return null;
    const era = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }[match[1]] ?? Number(match[1]);
    const [year, month, day, hour, minute] = [...match.slice(2, 5), ...match.slice(6)].map(Number);
    if (![era, year, month, day, hour, minute].every(Number.isFinite)) return null;
    return { era, year, month, day, weekday: match[5], hour, minute };
  }

  function gameMinutes(value) {
    const time = parseEra(value);
    return time ? (((time.era * 10000 + time.year) * 365 + time.month * 30 + time.day) * 24 + time.hour) * 60 + time.minute : null;
  }

  function timeWindow(previousData, data) {
    const oldEra = previousData?.world_data?._lastTimeEra ||
      previousData?.world_data?.当前时间纪元 || data?.world_data?._lastTimeEra;
    const newEra = data?.world_data?.当前时间纪元;
    const oldMinutes = gameMinutes(oldEra);
    const newMinutes = gameMinutes(newEra);
    if (newMinutes === null || (oldEra && oldMinutes === null)) return null;
    return { oldEra, newEra, oldMinutes, newMinutes, diff: oldMinutes === null ? 0 : newMinutes - oldMinutes,
      first: oldMinutes === null };
  }

  function addAge(data, cycles) {
    const stat = data?.stat_data;
    if (!stat || typeof stat !== 'object') return false;
    let changed = false;
    for (const key of ['身体年龄', '灵魂年龄']) {
      const current = Number(stat[key]);
      if (!Number.isFinite(current)) continue;
      stat[key] = current + cycles;
      changed = true;
    }
    return changed;
  }

  function regenerateEntity(entity, cycles) {
    if (!entity || typeof entity !== 'object' || Array.isArray(entity)) return false;
    const vitality = Number(entity.当前活力);
    if (Number.isFinite(vitality) && vitality <= 0) return false;
    let changed = false;
    for (const [currentKey, maximumKey] of [
      ['当前活力', '活力'], ['当前敏捷', '敏捷'], ['当前灵性', '灵性'],
      ['当前理智', '理智'], ['当前人性', '人性'],
    ]) {
      const maximum = Number(entity[maximumKey]);
      const current = Number(entity[currentKey]);
      if (!Number.isFinite(maximum) || maximum <= 0 || !Number.isFinite(current) || current >= maximum) continue;
      const next = Math.min(maximum, current + Math.floor(maximum * 0.1) * cycles);
      if (next !== current) {
        entity[currentKey] = next;
        changed = true;
      }
    }
    return changed;
  }

  function regenerateAttributes(data, cycles) {
    let changed = regenerateEntity(data?.stat_data, cycles);
    const npcData = data?.npc_data;
    if (npcData && typeof npcData === 'object' && !Array.isArray(npcData)) {
      for (const [name, npc] of Object.entries(npcData)) {
        if (name !== '$meta') changed = regenerateEntity(npc, cycles) || changed;
      }
    }
    return changed;
  }

  function settleCashflows(data, nowMinutes, settledTime) {
    const cashflow = modules['cryptLord.cashflow'];
    if (!cashflow) throw Error('钱包与稳定收支服务尚未加载');
    return cashflow.settle(data, nowMinutes, settledTime, value => gameMinutes(value) ?? NaN);
  }

  function rerollD100(data, windowInfo, random = Math.random) {
    const world = data?.world_data;
    if (!world || typeof world !== 'object') return false;
    if (!world.随机D100 || typeof world.随机D100 !== 'object') world.随机D100 = {};
    const current = parseEra(windowInfo.newEra);
    const previous = parseEra(windowInfo.oldEra);
    if (!current) return false;
    const weekdayOffset = { 一: 0, 二: 1, 三: 2, 四: 3, 五: 4, 六: 5, 日: 6 };
    const keys = {
      每日: value => value && `${value.era}-${value.year}-${value.month}-${value.day}`,
      每周: value => value && weekdayOffset[value.weekday] !== undefined
        ? String((((value.era * 10000 + value.year) * 365 + value.month * 30 + value.day) - weekdayOffset[value.weekday]))
        : null,
      每月: value => value && `${value.era}-${value.year}-${value.month}`,
      每年: value => value && `${value.era}-${value.year}`,
    };
    let changed = false;
    for (const [period, keyOf] of Object.entries(keys)) {
      const pool = world.随机D100[period] && typeof world.随机D100[period] === 'object'
        ? world.随机D100[period] : (world.随机D100[period] = {});
      const nextKey = keyOf(current);
      const oldKey = keyOf(previous);
      if (nextKey === null) continue;
      const invalid = Array.from({ length: D100_SLOT_COUNT }, (_, index) => Number(pool[`D100-${index + 1}`]))
        .some(value => !Number.isFinite(value) || value < 1 || value > 100);
      if (!invalid && nextKey === oldKey) continue;
      for (let index = 1; index <= D100_SLOT_COUNT; index += 1) {
        pool[`D100-${index}`] = Math.floor(random() * 100) + 1;
      }
      pool._lastRollKey = nextKey;
      changed = true;
    }
    return changed;
  }
  function advanceTrigger(data, previousData, windowInfo, id, interval, handler) {
    const world = data.world_data;
    const states = world._timeTriggerState && typeof world._timeTriggerState === 'object' &&
      !Array.isArray(world._timeTriggerState) ? world._timeTriggerState : (world._timeTriggerState = {});
    const prior = previousData?.world_data?._timeTriggerState?.[id] || states[id];
    const remainder = Number(prior?._remainder);
    const before = Number.isFinite(remainder) && remainder > 0 ? remainder % interval : 0;
    const total = Math.max(0, before + windowInfo.diff);
    const cycles = windowInfo.diff > 0 ? Math.floor(total / interval) : 0;
    if (!Number.isSafeInteger(cycles)) throw Error('时间触发次数超出安全数值范围');
    if (cycles > 0) handler(cycles);
    states[id] = { ...prior, _remainder: windowInfo.diff > 0 ? total % interval : total };
    return cycles > 0;
  }

  function applyTime(data, previousData, applied, context) {
    const info = timeWindow(previousData, data);
    if (!info) return;
    const world = data.world_data;
    if (info.first) {
      world._lastTimeEra = info.newEra;
      if (rerollD100(data, info, context.random)) applied.push('random-d100');
      return;
    }
    if (info.diff !== 0) {
      if (advanceTrigger(data, previousData, info, 'auto_age_growth', YEAR_MINUTES,
        cycles => addAge(data, cycles))) applied.push('age-growth');
      if (advanceTrigger(data, previousData, info, 'auto_attribute_regen', DAY_MINUTES,
        cycles => regenerateAttributes(data, cycles))) applied.push('attribute-regen');
      if (advanceTrigger(data, previousData, info, 'stable_cashflow_settle', DAY_MINUTES,
        () => settleCashflows(data, info.newMinutes, info.newEra))) applied.push('stable-cashflow');
    }
    if (rerollD100(data, info, context.random)) applied.push('random-d100');
    world._lastTimeEra = info.newEra;
  }
  function applyConstructionTime(data, previousData, domainState) {
    const info = timeWindow(previousData, data);
    if (!info || info.diff <= 0 || !domainState || !data?.stat_data?.领地?.已建立) return false;
    const staged = structuredClone(data);
    const domain = domainState.ensureDomain(staged.stat_data.领地);
    const now = domainState.nowMinutes(staged);
    const built = domainState.sweepConstruction(domain, now);
    const core = domainState.sweepCoreConstruction(domain, now);
    const trained = domainState.sweepTraining(domain, now);
    if (core) domainState.syncProjection(staged);
    if (!built && !core && !trained) return false;
    data.stat_data = staged.stat_data;
    return true;
  }
  function applyIndustryTime(data, previousData, pathways, industryState, config, independentDomain = false) {
    if (!industryState || !data?.world_data?.当前时间纪元) return false;
    const world = data.world_data;
    const previousWorld = previousData?.world_data;
    const prior = previousWorld?._timeTriggerState?.industry_weekly_settle;
    const current = world?._timeTriggerState?.industry_weekly_settle;
    const oldEra = prior?._lastEra || current?._lastEra ||
      previousWorld?._lastTimeEra || previousWorld?.当前时间纪元 || world._lastTimeEra || world.当前时间纪元;
    const oldMinutes = gameMinutes(oldEra);
    const newMinutes = gameMinutes(world.当前时间纪元);
    if (oldMinutes === null || newMinutes === null) return false;
    const remainder = Math.max(0, Number(prior?._remainder ?? current?._remainder) || 0);
    const diff = newMinutes - oldMinutes;
    const total = diff < 0 ? Math.max(0, remainder + diff) : remainder + diff;
    const cycles = diff > 0 ? Math.floor(total / WEEK_MINUTES) : 0;
    if (!Number.isSafeInteger(cycles)) throw Error('产业结算次数超出安全数值范围');
    const triggerState = world._timeTriggerState && typeof world._timeTriggerState === 'object' &&
      !Array.isArray(world._timeTriggerState) ? world._timeTriggerState : (world._timeTriggerState = {});
    if (cycles > 0 && pathways === null) {
      triggerState.industry_weekly_settle = { _lastEra: oldEra, _remainder: remainder };
      return false;
    }
    if (cycles > 0) {
      try {
        const staged = structuredClone(data);
        industryState.settleWeekly(staged, cycles, pathways || {});
        if (!independentDomain) {
          industryState.applyIndustryProduce?.(staged, cycles, config);
          modules[DOMAIN_KEY]?.weeklySettle?.(staged, cycles, pathways || {});
        }
        data.stat_data = staged.stat_data;
      } catch (error) {
        triggerState.industry_weekly_settle = { _lastEra: oldEra, _remainder: remainder };
        throw error;
      }
    }
    triggerState.industry_weekly_settle = {
      ...prior,
      _lastEra: world.当前时间纪元,
      _remainder: diff > 0 ? total % WEEK_MINUTES : total,
    };
    return cycles > 0;
  }

  function applyDomainTime(data, previousData, context) {
    if (!record(data?.world_data) || !data?.stat_data?.领地?.已建立) return false;
    const world = data.world_data, priorWorld = previousData?.world_data;
    // Older migrated floors used the industry marker for both weekly handlers.
    const prior = priorWorld?._timeTriggerState?.domain_weekly_settle ||
      priorWorld?._timeTriggerState?.industry_weekly_settle;
    const oldEra = prior?._lastEra || priorWorld?._lastTimeEra || world.当前时间纪元;
    const oldMinutes = gameMinutes(oldEra), now = gameMinutes(world.当前时间纪元);
    if (oldMinutes === null || now === null) return false;
    const diff = now - oldMinutes, remainder = Math.max(0, Number(prior?._remainder) || 0);
    const total = Math.max(0, remainder + diff), cycles = diff > 0 ? Math.floor(total / WEEK_MINUTES) : 0;
    if (!Number.isSafeInteger(cycles)) throw Error('领地结算次数超出安全数值范围');
    if (cycles) {
      const domain = modules[DOMAIN_KEY], industry = modules[INDUSTRY_KEY];
      if (!domain || !industry) throw Error('领地周结算服务尚未加载');
      const staged = clone(data);
      domain.weeklySettle(staged, cycles, context.industryPathways || {}, context.industryRules?.config);
      data.stat_data = staged.stat_data;
    }
    (world._timeTriggerState ||= {}).domain_weekly_settle = {
      ...prior, _lastEra: world.当前时间纪元, _remainder: diff > 0 ? total % WEEK_MINUTES : total,
    };
    return cycles > 0;
  }

  function apply(data, previousData, context = {}) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return Object.freeze({ data, changed: false, applied: Object.freeze([]), rewards: Object.freeze({ theaterPoints: 0 }) });
    }
    const changed = !equal(previousData || {}, data);
    const applied = [];
    if (changed || context.strict) {
      try {
        if (context.mapData && modules['cryptLord.worldMapState']?.correct(data.stat_data, context.mapData))
          applied.push('map-location-correction');
      } catch (error) {
        failure(context, '地理坐标校验失败，已保留本回合状态', error);
      }
      try {
        const territory = modules['cryptLord.shamanTerritoryState'];
        if (territory && context.mysteryPool?.pathways) {
          if (territory.sync(data, context.mysteryPool)) applied.push('shaman-territory-radius');
        } else if (!territory && modules['cryptLord.shamanTerritory']?.syncRadius?.(data))
          applied.push('shaman-territory-radius');
      } catch (error) {
        failure(context, '萨满领地半径同步失败', error);
      }
      try {
        applyTime(data, previousData, applied, context);
      } catch (error) {
        failure(context, '时间流逝结算失败，已保留本回合状态', error);
      }
      try {
        if (applyConstructionTime(data, previousData, modules[DOMAIN_KEY])) {
          applied.push('domain-construction-tick');
        }
      } catch (error) {
        failure(context, '领地施工与训练扫尾失败，已保留本回合状态', error);
      }
      try {
        if (context.industryRules) {
          const staged = structuredClone(data);
          modules[INDUSTRY_KEY]?.project?.(staged, context.industryRules.pathways, context.industryRules.config);
          data.stat_data = staged.stat_data;
        }
        if (applyIndustryTime(data, previousData, context.industryPathways,
          modules[INDUSTRY_KEY], context.industryRules?.config, context.independentDomain)) applied.push('industry-weekly-settle');
        if (context.independentDomain && applyDomainTime(data, previousData, context))
          applied.push('domain-weekly-settle');
      } catch (error) {
        failure(context, '产业或领地周结算失败，本回合不推进时间基线', error);
      }
      try {
        const mystery = modules['cryptLord.mysteryAnalysis'];
        // Native analysis needs the real sequence database, loaded by the bridge before persistence.
        if (!modules['cryptLord.mysteryAnalysisState'] || context.mysteryPool?.pathways) {
          if (mystery?.syncDisplay?.(data.stat_data, context.mysteryPool)) applied.push('mystery-analysis-display');
          if (!modules['cryptLord.attributeRecalculation'] &&
            mystery?.reconcile?.(data.stat_data, context.mysteryPool)) applied.push('mystery-analysis-bonus');
        }
      } catch (error) {
        failure(context, '神秘解析同步失败，已保留本回合状态', error);
      }
      try {
        if (!context.strict && typeof window.checkCollectionGrowth === 'function') {
          window.checkCollectionGrowth(data);
          applied.push('collection-growth');
        }
      } catch (error) {
        console.warn(`[${KEY}] 变量增殖提醒失败，已保留本回合状态`, error);
      }
    }
    try {
      if (context.factionConfig && modules['cryptLord.factionState']?.apply(data, context.factionConfig))
        applied.push('faction-derived-state');
    } catch (error) {
      failure(context, '势力派生结算失败，保留本回合状态', error);
    }
    const relationships = data.stat_data?.人物关系列表, items = modules['cryptLord.itemDerivation'];
    if (context.strict && relationships && items) {
      const normalized = items.settle({ stat_data: { 人物关系列表: relationships } }).data.stat_data.人物关系列表;
      data.stat_data.人物关系列表 = normalized;
    }
    if (modules['cryptLord.cashflow']?.normalize(data)) applied.push('wallet-normalization');
    const rewards = applyTurnRewards(data, context);
    if (rewards.theaterPoints) applied.push('turn-rewards');
    return Object.freeze({ data, changed: changed || applied.length > 0, applied: Object.freeze(applied), rewards });
  }

  function requirements(data) {
    const stat = data?.stat_data || {}, domain = stat.领地?.已建立 === true;
    return {
      industry: domain || stat.产业 !== undefined,
      domain,
      faction: domain || stat.势力 !== undefined,
      map: ['当前坐标', '当前区域', '当前地标'].some(key => Object.hasOwn(stat, key)),
    };
  }
  async function loadRules(needs, guard, token, warfareRules, industryRules) {
    const result = {};
    for (const [name, key, method] of [
      ['industry', INDUSTRY_KEY, 'loadRules'], ['faction', 'cryptLord.factionState', 'load'],
      ['map', 'cryptLord.worldMapState', 'load'], ['domain', DOMAIN_KEY, 'loadRules'],
    ]) {
      if (!needs[name]) continue;
      check(guard, token);
      const service = modules[key];
      if (!service) throw Error(`世界结算所需服务尚未加载：${name}`);
      const valid = () => { check(guard, token); return true; };
      let loaded;
      if (name === 'domain' && warfareRules) {
        if (!service.assertWarRules) throw Error('战争规则服务已卸载');
        await service.assertWarRules(warfareRules, valid);
        loaded = warfareRules;
      } else if (name === 'industry' && industryRules) {
        if (!service.assertRules) throw Error('产业规则服务已卸载');
        await service.assertRules(industryRules, valid);
        loaded = industryRules;
      } else loaded = await service[method](valid);
      check(guard, token);
      if (loaded.warnings?.length) throw Error(`世界联动规则损坏：${loaded.warnings.join('；')}`);
      result[name] = name === 'faction' ? loaded : clone(loaded);
    }
    return result;
  }
  const timers = ['auto_age_growth', 'auto_attribute_regen', 'stable_cashflow_settle',
    'industry_weekly_settle', 'domain_weekly_settle'];
  function restoreTimers(data, previous) {
    if (!record(data.world_data)) return;
    const world = data.world_data, old = previous?.world_data || {};
    if (Object.hasOwn(old, '_lastTimeEra')) world._lastTimeEra = old._lastTimeEra;
    else delete world._lastTimeEra;
    const states = { ...(record(old._timeTriggerState) ? clone(old._timeTriggerState) : {}),
      ...(record(world._timeTriggerState) ? world._timeTriggerState : {}) };
    for (const id of timers) {
      if (Object.hasOwn(old._timeTriggerState || {}, id)) states[id] = clone(old._timeTriggerState[id]);
      else delete states[id];
    }
    if (Object.keys(states).length) world._timeTriggerState = states;
    else delete world._timeTriggerState;
    // Existing entry clocks are settlement records, not user/model-authored payment claims.
    for (const key of ['稳定长期收入', '稳定长期支出']) {
      const current = data.stat_data?.[key], prior = previous?.stat_data?.[key];
      if (!record(current) || !record(prior)) continue;
      for (const [name, entry] of Object.entries(current)) {
        if (name === '$meta' || !record(entry) || !record(prior[name])) continue;
        if (Object.hasOwn(prior[name], '上次结算时间')) entry.上次结算时间 = prior[name].上次结算时间;
        else delete entry.上次结算时间;
      }
    }
  }
  function stableRandom(previous, data) {
    let seed = 2166136261;
    const source = signature([previous?.world_data, data?.world_data?.当前时间纪元]);
    for (let index = 0; index < source.length; index++) seed = Math.imul(seed ^ source.charCodeAt(index), 16777619);
    return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  }
  function busy(data) {
    return ['personalBattle', 'teamBattle'].some(key => {
      const value = data?.cryptLord?.[key];
      return value?.status === 'active' ||
        key === 'teamBattle' && ['finished', 'ended'].includes(value?.status) && !value.settled ||
        key === 'personalBattle' && value?.status === 'finished' && value.result === 'victory' &&
          value.enemy?.npcKey && !value.experienceClaimed;
    });
  }
  function describe(before, after, applied) {
    const lines = [];
    for (const key of ['身体年龄', '灵魂年龄', '当前活力', '当前敏捷', '当前灵性', '当前理智', '当前人性'])
      if (!Object.is(before?.stat_data?.[key], after?.stat_data?.[key]))
        lines.push(`${key}：${before?.stat_data?.[key] ?? '未记录'} → ${after?.stat_data?.[key] ?? '未记录'}`);
    for (const [key, label] of [['货币', '钱包'], ['稳定长期收入', '稳定收入结算记录'],
      ['稳定长期支出', '稳定支出结算记录'], ['产业', '产业估值与负责人'], ['生产力', '生产力'],
      ['领地', '领地施工、物资与驻军'], ['势力', '势力派生'], ['人物关系列表', '人物好感']])
      if (signature(before?.stat_data?.[key]) !== signature(after?.stat_data?.[key])) lines.push(`${label}将同步更新`);
    const oldWallet = before?.stat_data?.货币, wallet = after?.stat_data?.货币;
    if (record(wallet)) for (const [country, coins] of Object.entries(wallet)) {
      if (!record(coins) || !record(oldWallet?.[country])) continue;
      for (const [coin, amount] of Object.entries(coins)) {
        if (typeof amount !== 'number' || !Number.isFinite(amount) || Object.is(amount, oldWallet[country][coin])) continue;
        lines.push(`${country}·${coin}：${oldWallet[country][coin] ?? 0} → ${amount}`);
      }
    }
    if (signature(before?.npc_data) !== signature(after?.npc_data)) lines.push('NPC当前资源将恢复');
    if (applied.includes('map-location-correction')) lines.push('地点与坐标将纠偏');
    const pools = ['每日', '每周', '每月', '每年'].filter(period =>
      signature(before?.world_data?.随机D100?.[period]) !== signature(after?.world_data?.随机D100?.[period]));
    if (pools.length) lines.push(`D100更新：${pools.join('、')}`);
    if (signature(before?.world_data?._lastTimeEra) !== signature(after?.world_data?._lastTimeEra))
      lines.push(`时间基线：${after?.world_data?._lastTimeEra || '未记录'}`);
    return lines;
  }
  async function prepare(value, previous, guard, context = {}) {
    const token = epoch;
    check(guard, token);
    const input = clone(value || {}), before = clone(previous || {}), data = clone(input);
    const skipped = busy(data), needs = skipped ? {} : requirements(data);
    const rules = await loadRules(needs, guard, token, context.warfareRules, context.industryRules);
    const timePrevious = clone(before);
    restoreTimers(data, before);
    if (!skipped) {
      // A legacy floor without a successful timer baseline must bootstrap, not retroactively charge.
      if (record(timePrevious.world_data) && !timePrevious.world_data._lastTimeEra)
        delete timePrevious.world_data.当前时间纪元;
    }
    const run = () => apply(data, timePrevious, { ...context, strict: true, independentDomain: true,
        random: stableRandom(before, data), industryRules: rules.industry,
        industryPathways: rules.industry?.pathways || {}, factionConfig: rules.faction?.config,
        mapData: rules.map?.data });
    const result = skipped ? { applied: [], rewards: applyTurnRewards(data, context) } : rules.domain
      ? modules[DOMAIN_KEY].withRules({ domainConfig: rules.domain.config, factionConfig: rules.faction?.config,
        ...(rules.domain.warConfig ? { warConfig: rules.domain.warConfig, domainRoster: rules.domain.roster } : {}) }, run) : run();
    check(guard, token);
    const prepared = { data, applied: [...result.applied], rewards: result.rewards, skipped,
      summary: describe(input, data, result.applied) };
    issued.set(prepared, { token, input: signature(input), previous: signature(before), needs, rules,
      result: signature(prepared), data: clone(data), warfareRules: context.warfareRules, industryRules: context.industryRules,
      factionService: modules['cryptLord.factionState'] });
    return prepared;
  }
  async function assertPrepared(prepared, guard) {
    const source = issued.get(prepared);
    if (!source || source.result !== signature(prepared)) throw Error('世界结算预览无效或已修改，请重新准备');
    check(guard, source.token);
    if (source.rules.faction) {
      if (source.factionService !== modules['cryptLord.factionState']) throw Error('势力派生服务已变化，请重新准备');
      await source.factionService.assertRules?.(source.rules.faction, guard);
    }
    const rules = await loadRules(source.needs, guard, source.token, source.warfareRules, source.industryRules);
    if (signature(rules) !== signature(source.rules)) throw Error('世界书绑定或联动规则已变化，未写入旧结算');
    check(guard, source.token);
  }
  async function adopt(value, previous, prepared, guard) {
    const source = issued.get(prepared);
    if (!source || signature(value || {}) !== source.input || signature(previous || {}) !== source.previous)
      throw Error('世界结算草稿或前状态已变化，请重新准备');
    await assertPrepared(prepared, guard);
    return clone(source.data);
  }
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents() || {};
  if (events.CHAT_CHANGED) subscriptions.push(after.bindEvent(events.CHAT_CHANGED, () => { epoch++; }));
  if (events.GENERATION_STARTED) subscriptions.push(after.bindEvent(events.GENERATION_STARTED, (type, options, dryRun) => {
    if (!['quiet', 'quiet_prompt', 'dryRun'].includes(type) && !dryRun && !options?.quiet_prompt && !options?.dryRun) epoch++;
  }));

  const api = Object.freeze({
    status() {
      return Object.freeze({
        key: KEY,
        ready: true,
        handlers: Object.freeze([
          'age-growth', 'attribute-regen', 'industry-weekly-settle', 'domain-weekly-settle',
          'map-location-correction',
          'domain-construction-tick',
          'domain-building-production', 'domain-garrison-upkeep', 'domain-zeroed-elites',
          'domain-housing-affinity', 'domain-steward-affinity', 'domain-faction-projection',
          'domain-industry-inject', 'stable-cashflow', 'wallet-normalization', 'random-d100', 'collection-growth',
        ]),
      });
    },
    apply,
    prepare,
    adopt,
    assertPrepared,
    describe,
    gameMinutes,
    dispose() {
      disposed = true; epoch++; subscriptions.forEach(subscription => subscription.stop());
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
