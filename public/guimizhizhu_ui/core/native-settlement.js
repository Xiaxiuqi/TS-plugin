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

  function parseCashflowAmount(value) {
    const raw = String(value ?? '').trim();
    const cleaned = raw.replace(/[\s,_：:]/g, '');
    const match = cleaned.match(/(-?\d+(?:\.\d+)?)/);
    if (!match) return { value: 0, currency: '' };
    return { value: Math.round(Number(match[1])), currency: cleaned.replace(match[0], '') };
  }

  function walletDelta(wallet, currency, amount) {
    if (!wallet || typeof wallet !== 'object' || !Number.isFinite(amount)) return false;
    const aliases = { 镑: '金镑', 磅: '金镑', 苏勒: '银苏勒', 便士: '铜便士', 霍恩: '金霍恩', 里索: '金里索', 萨森: '萨森金', 波特: '波特金' };
    const normalized = aliases[String(currency || '').trim()] || String(currency || '').trim();
    const paths = {
      金镑: ['鲁恩王国', '金镑'], 银苏勒: ['鲁恩王国', '银苏勒'], 铜便士: ['鲁恩王国', '铜便士'],
      金霍恩: ['弗萨克帝国', '金霍恩'], 弗银: ['弗萨克帝国', '弗银'], 戈比: ['弗萨克帝国', '戈比'],
      费尔金: ['因蒂斯共和国', '费尔金'], 里克: ['因蒂斯共和国', '里克'], 科佩: ['因蒂斯共和国', '科佩'],
      金里索: ['费内波特王国', '金里索'], 塞塔: ['费内波特王国', '塞塔'], 德根: ['费内波特王国', '德根'],
    };
    const path = paths[normalized] || ['其他', normalized || '金镑'];
    if (!wallet[path[0]] || typeof wallet[path[0]] !== 'object') return false;
    wallet[path[0]][path[1]] = (Number(wallet[path[0]][path[1]]) || 0) + amount;
    return true;
  }

  function settleCashflows(data, nowMinutes, settledTime) {
    const stat = data?.stat_data;
    const wallet = stat?.货币;
    if (!stat || !wallet || typeof wallet !== 'object') return false;
    const periodDays = { 天: 1, 周: 7, 月: 30, 年: 365 };
    let changed = false;
    for (const [groupKey, sign] of [['稳定长期收入', 1], ['稳定长期支出', -1]]) {
      const group = stat[groupKey];
      if (!group || typeof group !== 'object') continue;
      for (const [name, entry] of Object.entries(group)) {
        if (name === '$meta' || !entry || typeof entry !== 'object') continue;
        const amount = parseCashflowAmount(entry.金额);
        const days = periodDays[String(entry.周期 || '月')];
        if (amount.value <= 0 || !days) continue;
        if (!entry.上次结算时间) {
          entry.上次结算时间 = settledTime;
          changed = true;
          continue;
        }
        const baseline = gameMinutes(entry.上次结算时间);
        if (baseline === null) {
          entry.上次结算时间 = settledTime;
          changed = true;
          continue;
        }
        const cycles = Math.floor((nowMinutes - baseline) / (days * DAY_MINUTES));
        if (cycles <= 0 || !walletDelta(wallet, amount.currency, amount.value * cycles * sign)) continue;
        entry.上次结算时间 = settledTime;
        changed = true;
      }
    }
    return changed;
  }

  function rerollD100(data, windowInfo) {
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
        pool[`D100-${index}`] = Math.floor(Math.random() * 100) + 1;
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
    if (!Number.isSafeInteger(cycles)) return false;
    if (cycles > 0) handler(cycles);
    states[id] = { _remainder: windowInfo.diff > 0 ? total % interval : total };
    return cycles > 0;
  }

  function applyTime(data, previousData, applied) {
    const info = timeWindow(previousData, data);
    if (!info) return;
    const world = data.world_data;
    if (info.first) {
      world._lastTimeEra = info.newEra;
      if (rerollD100(data, info)) applied.push('random-d100');
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
    if (rerollD100(data, info)) applied.push('random-d100');
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
  function applyIndustryTime(data, previousData, pathways, industryState) {
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
    if (!Number.isSafeInteger(cycles)) return false;
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
        industryState.applyIndustryProduce?.(staged, cycles);
        modules[DOMAIN_KEY]?.weeklySettle?.(staged, cycles, pathways || {});
        data.stat_data = staged.stat_data;
      } catch (error) {
        triggerState.industry_weekly_settle = { _lastEra: oldEra, _remainder: remainder };
        throw error;
      }
    }
    triggerState.industry_weekly_settle = {
      _lastEra: world.当前时间纪元,
      _remainder: diff > 0 ? total % WEEK_MINUTES : total,
    };
    return cycles > 0;
  }

  function apply(data, previousData, context = {}) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return Object.freeze({ data, changed: false, applied: Object.freeze([]), rewards: Object.freeze({ theaterPoints: 0 }) });
    }
    const changed = !equal(previousData || {}, data);
    const applied = [];
    if (changed) {
      try {
        if (modules['cryptLord.shamanTerritory']?.syncRadius?.(data)) applied.push('shaman-territory-radius');
      } catch (error) {
        console.warn(`[${KEY}] 萨满领地半径同步失败`, error);
      }
      try {
        applyTime(data, previousData, applied);
      } catch (error) {
        console.warn(`[${KEY}] 时间流逝结算失败，已保留本回合状态`, error);
      }
      try {
        if (applyConstructionTime(data, previousData, modules[DOMAIN_KEY])) {
          applied.push('domain-construction-tick');
        }
      } catch (error) {
        console.warn(`[${KEY}] 领地施工与训练扫尾失败，已保留本回合状态`, error);
      }
      try {
        if (applyIndustryTime(data, previousData, context.industryPathways,
          modules[INDUSTRY_KEY])) applied.push('industry-weekly-settle');
      } catch (error) {
        console.warn(`[${KEY}] 产业周结算失败，本回合不推进产业时间基线`, error);
      }
      try {
        const mystery = modules['cryptLord.mysteryAnalysis'];
        if (mystery?.syncDisplay?.(data.stat_data)) applied.push('mystery-analysis-display');
        if (mystery?.reconcile?.(data.stat_data)) applied.push('mystery-analysis-bonus');
      } catch (error) {
        console.warn(`[${KEY}] 神秘解析同步失败，已保留本回合状态`, error);
      }
      try {
        if (typeof window.checkCollectionGrowth === 'function') {
          window.checkCollectionGrowth(data);
          applied.push('collection-growth');
        }
      } catch (error) {
        console.warn(`[${KEY}] 变量增殖提醒失败，已保留本回合状态`, error);
      }
    }
    const rewards = applyTurnRewards(data, context);
    if (rewards.theaterPoints) applied.push('turn-rewards');
    return Object.freeze({ data, changed: changed || Boolean(rewards.theaterPoints), applied: Object.freeze(applied), rewards });
  }

  const api = Object.freeze({
    status() {
      return Object.freeze({
        key: KEY,
        ready: true,
        handlers: Object.freeze([
          'age-growth', 'attribute-regen', 'industry-weekly-settle',
          'domain-construction-tick',
          'domain-building-production', 'domain-garrison-upkeep', 'domain-zeroed-elites',
          'domain-housing-affinity', 'domain-steward-affinity', 'domain-faction-projection',
          'domain-industry-inject', 'stable-cashflow', 'random-d100', 'collection-growth',
        ]),
      });
    },
    apply,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
