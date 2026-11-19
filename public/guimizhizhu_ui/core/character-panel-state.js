(() => {
  'use strict';

  const KEY = 'cryptLord.characterPanelState';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const SLOT_DEFINITIONS = Object.freeze([
    { label: '武器', key: '武器列表' },
    { label: '衣物', key: '衣物列表' },
    { label: '饰品', key: '饰品列表' },
    { label: '封印物', key: '封印物列表' },
    { label: '扮演法', key: '扮演法列表' },
    { label: '辅助能力', key: '辅助能力列表' },
  ]);
  const ARCHIVE_ATTRIBUTES = Object.freeze([
    { label: '活力', current: '当前活力', maximum: '活力' },
    { label: '灵性', current: '当前灵性', maximum: '灵性' },
    { label: '理智', current: '当前理智', maximum: '理智' },
    { label: '人性', current: '当前人性', maximum: '人性' },
    { label: '敏捷', current: '当前敏捷', maximum: '敏捷' },
    { label: '运气', current: '运气', maximum: '运气' },
  ]);
  const QUEST_KEY = '<User>接受的任务';
  const RESERVED = new Set(['$meta', '__proto__', 'constructor', 'prototype']);
  let epoch = 0, disposed = false, queue = Promise.resolve(), generating = false, manualEpoch = 0;
  const baselines = new WeakMap(), subscriptions = [];
  function record(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
  function number(value) {
    if (value === undefined || value === null || value === '') return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  function attribute(stat, currentKey, maximumKey, luck = false) {
    const maximum = number(
      stat?.[maximumKey] ??
      stat?.基础属性?.[maximumKey] ??
      stat?.属性?.[maximumKey] ??
      stat?.[currentKey]
    );
    const current = luck ? maximum : number(
      stat?.[currentKey] ??
      stat?.基础属性?.[currentKey] ??
      stat?.属性?.[currentKey] ??
      stat?.[maximumKey] ??
      maximum
    );
    const percentage = maximum > 0 && current > 0 ? Math.min(100, current / maximum * 100) : 0;
    return { current, maximum, percentage };
  }
  function tierOrder(value) {
    const text = String(value || '');
    if (text.includes('支柱')) return 12;
    if (text.includes('旧日') && !text.includes('旧日侍者')) return 11;
    const rank = Number(text.match(/序列\s*(\d+(?:\.\d+)?)/)?.[1]);
    return Number.isFinite(rank) ? 10 - rank : 0;
  }
  function traits(stat) {
    const source = stat?.非凡特性列表 || stat?.非凡特性 || stat?.特性列表 || stat?.特性;
    if (!source) return [];
    if (Array.isArray(source)) {
      return source.map((item, index) => {
        if (typeof item === 'string') {
          return { name: item, tier: '普通', description: '无描述', bonuses: [] };
        }
        if (record(item)) {
          const name = String(item.名称 ?? item.name ?? ("特性 #" + (index + 1)));
          const tier = String(item.等阶 ?? item.tier ?? item.序列 ?? '普通');
          const description = String(item.描述 ?? item.description ?? '无描述');
          const bonuses = Object.entries(item).filter(([k]) =>
            !['$meta', '等阶', 'tier', '描述', 'description', '名称', 'name', '序列'].includes(k));
          return { name, tier, description, bonuses };
        }
        return null;
      })
      .filter(Boolean)
      .sort((left, right) => tierOrder(right.tier) - tierOrder(left.tier));
    }
    if (record(source)) {
      return Object.entries(source)
        .filter(([key, value]) => !RESERVED.has(key) && (record(value) || typeof value === 'string'))
        .map(([key, value]) => {
          if (typeof value === 'string') {
            return { name: key, tier: '普通', description: value, bonuses: [] };
          }
          const name = String(value.名称 ?? value.name ?? key);
          const tier = String(value.等阶 ?? value.tier ?? value.序列 ?? '普通');
          const description = String(value.描述 ?? value.description ?? '无描述');
          const bonuses = Object.entries(value).filter(([k]) =>
            !['$meta', '等阶', 'tier', '描述', 'description', '名称', 'name', '序列'].includes(k));
          return { name, tier, description, bonuses };
        })
        .sort((left, right) => tierOrder(right.tier) - tierOrder(left.tier));
    }
    return [];
  }
  function slots(stat) {
    return SLOT_DEFINITIONS.map(({ label, key }) => {
      const source = stat?.[key];
      const equipped = (record(source) || Array.isArray(source) ? Object.entries(source) : [])
        .find(([itemKey, item]) => !RESERVED.has(itemKey) && record(item) && item.isEquipped === true);
      const item = equipped?.[1] || null;
      return { label, key, item, name: item ? String(item.名称 ?? item.name ?? '未知装备') : label };
    });
  }
  function questFlag(value) {
    return value === true || value === 1 || value === '1' ||
      value === 'true' || value === 'True' || value === 'TRUE' || value === '是';
  }
  function quests(stat) {
    const source = stat?.[QUEST_KEY];
    if (!record(source)) return [];
    return Object.entries(source)
      .filter(([key, value]) => !RESERVED.has(key) && record(value))
      .map(([key, value]) => ({
        key,
        name: String(value.任务名 || key),
        commissioner: String(value.任务委托者 || ''),
        summary: String(value.任务概述 || ''),
        condition: String(value.完成条件 || ''),
        reward: String(value.任务奖励 || ''),
        completed: questFlag(value.是否已完成),
        claimed: questFlag(value.是否已领取奖励),
        original: JSON.stringify(value),
      }));
  }
  function removeQuest(data, key, expected) {
    const source = data?.stat_data?.[QUEST_KEY];
    if (!record(source) || typeof key !== 'string' || !key || RESERVED.has(key) ||
      !Object.hasOwn(source, key) || !record(source[key])) throw new Error('任务已不存在，请重新读取。');
    if (JSON.stringify(source[key]) !== expected) throw new Error('任务已变化，请重新读取。');
    const next = structuredClone(data);
    delete next.stat_data[QUEST_KEY][key];
    return next;
  }
  function normalizeQuests(data) {
    const source = data?.stat_data?.[QUEST_KEY];
    // A broken dictionary needs explicit repair, not replacement during an unrelated save.
    if (!record(source)) return data;
    let kept = 0;
    for (const [key, item] of Object.entries(source)) {
      if (RESERVED.has(key)) continue;
      if (!record(item) || questFlag(item.是否已领取奖励) || kept >= 10) delete source[key];
      else kept++;
    }
    if (!record(source.$meta)) source.$meta = { extensible: true };
    return data;
  }
  function archive(stat) {
    const source = record(stat) ? stat : {};
    const attributes = ARCHIVE_ATTRIBUTES.map(({ label, current, maximum }) => ({
      label,
      ...attribute(source, current, maximum, label === '运气'),
    }));
    const highest = Math.max(0, ...attributes.map(item => item.maximum));
    const radar = attributes.map(item => ({
      label: item.label,
      value: highest > 0 ? Math.max(0, Math.min(100, item.maximum / highest * 100)) : 0,
    }));
    const equipment = SLOT_DEFINITIONS.slice(0, 4).flatMap(({ label, key }) => {
      const list = source[key];
      return (record(list) || Array.isArray(list) ? Object.entries(list) : [])
        .filter(([itemKey, item]) => !RESERVED.has(itemKey) && record(item))
        .map(([itemKey, item]) => ({
          name: String(item.名称 ?? item.name ?? itemKey),
          type: label,
          tier: item.品阶 ?? item.序列 ?? item.tier ?? '',
          equipped: item.isEquipped === true,
        }));
    });
    return {
      attributes,
      radar,
      bodyAge: source.身体年龄 ?? 'N/A',
      soulAge: source.灵魂年龄 ?? 'N/A',
      digestion: number(source.消化进度),
      loss: number(source.失控进度),
      quests: quests(source),
      traits: traits(source),
      equipment,
    };
  }
  function check(guard, token) {
    if (disposed || modules[KEY] !== api || token !== epoch || guard && !guard())
      throw new DOMException('档案操作已取消', 'AbortError');
  }
  function readOnly(floor, latest) {
    if (floor.message_id === 0 || latest?.role !== 'assistant' || latest.message_id !== floor.message_id) return '历史楼层只读';
    const malformed = floor.data.stat_data[QUEST_KEY];
    if (malformed !== undefined && !record(malformed)) return '任务字典格式异常，请在变量面板修复';
    for (const key of ['teamBattle', 'personalBattle']) {
      const battle = floor.data.cryptLord?.[key];
      if (battle?.status === 'active' ||
        key === 'teamBattle' && ['finished', 'ended'].includes(battle?.status) && !battle.settled ||
        key === 'personalBattle' && battle?.status === 'finished' && battle.result === 'victory' &&
        battle.enemy?.npcKey && !battle.experienceClaimed) return '请先结束并结算战斗';
    }
    return '';
  }
  async function load(messageId = null, guard, token = epoch) {
    check(guard, token);
    if (messageId !== null && (!Number.isInteger(messageId) || messageId < 0)) throw Error('楼层编号无效');
    const reader = modules['cryptLord.nativeFloorSource'];
    const dependencies = reader.writeDependencies([KEY, 'cryptLord.cashflow', 'cryptLord.industryState',
      'cryptLord.domainState', 'cryptLord.factionState']);
    const valid = () => { check(guard, token); return true; };
    const source = await reader.read(valid), rows = source.rows;
    check(guard, token);
    const latest = rows.at(-1);
    if (!Number.isInteger(latest?.message_id)) throw Error('当前聊天没有可读取的楼层');
    const floor = rows.find(row => row.message_id === (messageId ?? latest.message_id) && row.role === 'assistant');
    if (floor?.is_hidden) throw Error('所选assistant楼层已隐藏，不能读取角色档案');
    if (!floor || !record(floor.data?.stat_data)) throw Error('所选 assistant 楼层没有角色档案');
    await reader.assert(source, valid);
    check(guard, token);
    if (Object.entries(dependencies).some(([key, service]) => modules[key] !== service))
      throw Error('档案保存或派生服务已变化，请重新读取');
    const reason = generating ? '正文生成中，请结束后重新读取' : readOnly(floor, latest);
    const result = { floor: structuredClone(floor), latest: structuredClone(latest), editable: !reason, reason,
      view: archive(floor.data.stat_data) };
    baselines.set(result, { value: structuredClone(result), source, reader, token, manual: manualEpoch, dependencies,
      locked: dependencies['cryptLord.abilityState']?.locked?.(floor.data) });
    return result;
  }
  function begin(baseline, entry, guard) {
    const issued = baselines.get(baseline), expected = structuredClone(baseline), target = structuredClone(entry);
    check(guard, epoch);
    if (!issued || issued.reader !== modules['cryptLord.nativeFloorSource'] ||
      issued.reader.signature(issued.value) !== issued.reader.signature(expected))
      throw Error('档案来源凭据无效或已变化，请重新读取');
    const valid = () => {
      check(guard, issued.token);
      if (generating || issued.manual !== manualEpoch) throw Error('档案操作已取消，请重新读取');
      if (issued.dependencies['cryptLord.abilityState']?.locked?.(expected.floor.data) !== issued.locked)
        throw Error('能力锁定已变化，请重新读取');
      return true;
    };
    valid();
    if (!expected.editable) throw Error(expected.reason || '当前楼层不可修改');
    return issued.reader.transaction(issued.source, expected.floor.message_id, {
      dependencies: issued.dependencies, guard: valid,
      compute: data => ({ data: removeQuest(data, target?.key, target?.original) }),
      async onSaved(result) {
        baselines.delete(baseline);
        return { ...result, loaded: await load(expected.floor.message_id, guard, issued.token) };
      },
    });
  }
  function commit(baseline, entry, guard) {
    let transaction;
    try { transaction = begin(baseline, entry, guard); }
    catch (error) { return Promise.reject(error); }
    const task = queue.then(() => transaction.run());
    queue = task.catch(() => {});
    return task;
  }
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents() || {};
  for (const [name, handler] of [
    ['CHAT_CHANGED', () => { epoch++; manualEpoch++; generating = false; }],
    ['GENERATION_STARTED', (type, options, dryRun) => {
      const info = typeof type === 'object' ? type : options, kind = typeof type === 'string' ? type : info?.type;
      if (dryRun || ['quiet', 'quiet_prompt', 'dryRun'].includes(kind) ||
        info?.dryRun || info?.quiet_prompt || info?.options?.dryRun || info?.options?.quiet_prompt) return;
      generating = true; manualEpoch++;
    }],
    ['GENERATION_ENDED', () => { generating = false; }],
    ['GENERATION_STOPPED', () => { generating = false; }],
  ]) if (events[name]) subscriptions.push(after.bindEvent(events[name], handler));

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: !disposed }); },
    attribute, traits, slots, quests, removeQuest, normalizeQuests, archive, load, begin, commit,
    pathway(stat) {
      return String(stat?.当前途径 || stat?.途径 || stat?.pathway || stat?.所属途径 || "").trim();
    },
    sequence(stat) {
      return String(stat?.当前序列 || stat?.序列 || stat?.位阶 || stat?.sequence || "普通人").trim();
    },
    dispose() {
      disposed = true; epoch++; subscriptions.forEach(item => item?.stop());
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
