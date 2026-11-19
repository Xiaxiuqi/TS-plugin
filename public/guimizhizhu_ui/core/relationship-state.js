(() => {
  'use strict';

  const KEY = 'cryptLord.relationshipState';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const SUBJECTIVE_FIELDS = Object.freeze([
    ['对你的称呼', '对<User>的称呼'], ['对你的态度', '对<User>的态度'], ['认知身份', '身份'], ['认知性格', '性格'],
    ['认知外貌', '外貌'], ['推测序列', '当前序列'], ['推测体系', '能力体系'],
    ['推测所持物品', '持有物品'], ['推测所处地点', '所处地点'],
  ]);
  const OBJECTIVE_FIELDS = Object.freeze([
    ['真实身份', '身份'], ['真实性格', '性格'], ['真实体系', '能力体系'],
    ['此刻外貌', '外貌'], ['此刻所持物品', '持有物品'], ['此刻所处地点', '所处地点'],
    ['此刻动作', '正在做的事'], ['近期打算', '近期打算'], ['长期目标', '长期目标'],
  ]);
  const ATTRIBUTES = Object.freeze([
    ['活力', '当前活力'], ['灵性', '当前灵性'], ['理智', '当前理智'],
    ['人性', '当前人性'], ['敏捷', '当前敏捷'], ['运气', null],
  ]);
  const RESERVED_KEYS = new Set(['$meta', '__proto__', 'constructor', 'prototype']);
  const KNOWN_KEYS = new Set([
    ...SUBJECTIVE_FIELDS.map(([, key]) => key), ...OBJECTIVE_FIELDS.map(([, key]) => key),
    ...ATTRIBUTES.flatMap(([maximum, current]) => [maximum, current, `基础${maximum}`]),
    '名称', '当前序列', '神性', '模板', '当前状态', 'initialized', '能力清单', '好感度', '关系',
    '事件历史', '关键记忆', 'isImportant', 'image', ...RESERVED_KEYS,
  ]);
  let epoch = 0, disposed = false, generating = false, queue = Promise.resolve();
  const subscriptions = [], tickets = new WeakMap();
  function record(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
  function own(source, key) { return record(source) && Object.hasOwn(source, key) ? source[key] : undefined; }
  function fields(source, definitions) {
    return definitions.flatMap(([label, key]) => {
      const value = source?.[key];
      if (value === undefined || value === null || value === '' || value === '未知' ||
        key === '对<User>的称呼' && value === '<User>') return [];
      return [[label, value]];
    });
  }
  function snapshot(data, key) {
    const subjective = own(data?.stat_data?.人物关系列表, key);
    const objective = own(data?.npc_data, key);
    if (RESERVED_KEYS.has(key) || !record(subjective) && !record(objective)) return null;
    return JSON.stringify({
      subjective,
      objective,
    });
  }
  function list(data, batch = false) {
    const relationships = data?.stat_data?.人物关系列表;
    const keys = Object.keys(record(relationships) ? relationships : {})
      .filter(key => !RESERVED_KEYS.has(key) && record(relationships[key]));
    if (batch) for (const key of Object.keys(record(data?.npc_data) ? data.npc_data : {})) {
      if (!RESERVED_KEYS.has(key) && record(data.npc_data[key]) && !keys.includes(key)) keys.push(key);
    }
    return keys.map(key => {
        const rawSubjective = own(relationships, key), rawObjective = own(data?.npc_data, key);
        const orphan = !record(rawSubjective);
        const subjective = orphan ? {} : rawSubjective;
        const legacy = !record(rawObjective);
        const objective = legacy ? subjective : rawObjective;
        const knownName = orphan ? objective.名称 || key :
          subjective.名称 && subjective.名称 !== '未知' ? subjective.名称 : key;
        const favorability = Number.parseInt(subjective.好感度, 10);
        const abilities = Array.isArray(objective?.能力清单) ? objective.能力清单
          .filter(record).map(item => [item.名称, item.描述].filter(Boolean).join('：')).filter(Boolean) : [];
        const stats = objective ? ATTRIBUTES.flatMap(([maximum, current]) => {
          if (objective[maximum] == null || objective[maximum] === 'N/A') return [];
          return [[maximum, current && objective[current] != null
            ? `${objective[current]} / ${objective[maximum]}` : String(objective[maximum])]];
        }) : [];
        const statuses = record(objective?.当前状态)
          ? Object.entries(objective.当前状态).filter(([name]) => !RESERVED_KEYS.has(name))
          : typeof objective?.当前状态 === 'string' && objective.当前状态.trim()
            ? [['状态', objective.当前状态]] : [];
        return {
          key,
          name: String(knownName),
          orphan,
          relationship: orphan ? '' : String(subjective.关系 ?? '未知'),
          favorability: orphan ? null : Number.isFinite(favorability) ? favorability : 0,
          important: objective?.isImportant === true || subjective.isImportant === true,
          subjective: fields(subjective, SUBJECTIVE_FIELDS),
          objective: objective ? {
            legacy,
            sequence: String(objective.当前序列 ?? '普通人'),
            fields: [...fields(objective, OBJECTIVE_FIELDS), ...Object.entries(objective).flatMap(([name, value]) =>
              KNOWN_KEYS.has(name) || name.startsWith('$') || !['string', 'number', 'boolean'].includes(typeof value) ||
              typeof value === 'string' && !value.trim() ? [] : [[name, typeof value === 'boolean' ? value ? '是' : '否' : value]])],
            stats, statuses, abilities,
          } : null,
          original: snapshot(data, key),
        };
      })
      .sort((left, right) => Number(right.important) - Number(left.important) || Number(left.orphan) - Number(right.orphan));
  }
  function checked(data, entries) {
    if (!record(data?.stat_data) || !Array.isArray(entries) || !entries.length) {
      throw new Error('人物关系已不存在，请重新读取。');
    }
    for (const dictionary of [data.stat_data.人物关系列表, data.npc_data])
      if (dictionary !== undefined && !record(dictionary)) throw Error('人物字典格式异常，请在变量面板修复。');
    const seen = new Set();
    entries.forEach(({ key, original }) => {
      if (typeof key !== 'string' || !key || RESERVED_KEYS.has(key) || seen.has(key)) {
        throw new Error('无效的人物关系目标。');
      }
      seen.add(key);
      const current = snapshot(data, key);
      if (current === null) throw new Error('人物关系已不存在，请重新读取。');
      if (current !== original) throw new Error('人物关系已变化，请重新读取。');
    });
    return structuredClone(data);
  }
  function toggleImportant(data, entry) {
    const next = checked(data, [entry]);
    const subjective = own(next.stat_data.人物关系列表, entry.key);
    const objective = own(next.npc_data, entry.key);
    const target = record(objective) ? objective : subjective;
    const important = !target.isImportant;
    target.isImportant = important;
    if (record(subjective)) subjective.isImportant = important;
    return next;
  }
  function removeMany(data, entries) {
    const next = checked(data, entries);
    const constructs = entries.filter(({ key }) => own(next.npc_data, key)?.$完全自主造物 === true);
    entries.forEach(({ key }) => {
      if (record(next.stat_data.人物关系列表)) delete next.stat_data.人物关系列表[key];
      if (record(next.npc_data)) delete next.npc_data[key];
    });
    // Native teams distinguish sources; deleting an NPC must not delete a same-name bag member.
    const team = next.cryptLord?.teamComposition;
    if (team !== undefined) {
      const builder = modules['cryptLord.battleTeamBuilder'];
      if (!builder) throw Error('编队服务尚未加载，未执行人物删除。');
      builder.normalize(team);
      const removed = new Set(entries.map(entry => entry.key));
      for (const side of ['allyTeam', 'enemyTeam'])
        team[side] = team[side].filter(row => !(row.dataSource === 'npc' && removed.has(row.name)));
    }
    if (constructs.length) {
      const play = modules['cryptLord.battlePlayUnits']?.sources(next).find(row => row.play.BAG_SOURCE === 'savant-construct')?.play;
      if (!play?.syncConstructDisplay) throw Error('造物服务尚未加载，未执行人物删除。');
      if (next.stat_data.辅助能力列表 !== undefined && !record(next.stat_data.辅助能力列表))
        throw Error('造物显示字典格式异常，请在变量面板修复。');
      play.syncConstructDisplay(next);
    }
    return next;
  }
  function check(guard, token) {
    if (disposed || generating || token !== epoch || modules[KEY] !== api || guard && !guard())
      throw new DOMException('人物关系操作已取消，请重新读取', 'AbortError');
  }
  async function load(messageId = null, guard, token = epoch) {
    check(guard, token);
    if (messageId !== null && (!Number.isInteger(messageId) || messageId < 0)) throw Error('楼层编号无效');
    const service = modules['cryptLord.nativeFloorSource'];
    const dependencies = service.writeDependencies([KEY, 'cryptLord.battleTeamBuilder', 'cryptLord.battlePlayUnits',
      'cryptLord.industryState', 'cryptLord.domainState', 'cryptLord.factionState', 'cryptLord.cashflow']);
    const source = await service.read(() => { check(guard, token); return true; }), latest = source.rows.at(-1);
    const id = messageId ?? latest?.message_id;
    const floor = source.rows.find(row => row.message_id === id && row.role === 'assistant');
    if (!floor || !Number.isInteger(id) || !record(floor.data?.stat_data)) throw Error('所选 assistant 楼层没有角色状态');
    const malformed = [floor.data.stat_data.人物关系列表, floor.data.npc_data]
      .some(value => value !== undefined && !record(value));
    const battle = ['teamBattle', 'personalBattle'].some(key => {
      const current = floor.data.cryptLord?.[key];
      return current?.status === 'active' ||
        key === 'teamBattle' && ['finished', 'ended'].includes(current?.status) && !current.settled ||
        key === 'personalBattle' && current?.status === 'finished' && current.result === 'victory' &&
          current.enemy?.npcKey && !current.experienceClaimed;
    });
    const reason = floor.is_hidden ? '隐藏楼层只读' : id === 0 || latest?.message_id !== id ? '历史楼层只读' : battle ? '请先结束并结算战斗' :
      malformed ? '人物字典格式异常，请在变量面板修复' : '';
    await service.assert(source, () => { check(guard, token); return true; });
    const loaded = { floor: structuredClone(floor), latest: structuredClone(latest), editable: !reason, reason,
      revision: service.signature(source),
      entries: list(floor.data), allEntries: list(floor.data, true) };
    tickets.set(loaded, { token, source, dependencies, signature: service.signature(loaded),
      locked: dependencies['cryptLord.abilityState']?.locked?.(floor.data) });
    return loaded;
  }
  function begin(baseline, operation, guard) {
    const ticket = tickets.get(baseline), service = modules['cryptLord.nativeFloorSource'];
    if (!ticket || ticket.signature !== service.signature(baseline)) throw Error('人物关系来源无效或已修改，请重新读取');
    const { token, source, dependencies, locked } = ticket, action = structuredClone(operation), expected = structuredClone(baseline);
    check(guard, token);
    if (!expected.editable) throw Error(expected.reason);
    return service.transaction(source, expected.floor.message_id, {
      dependencies, guard: () => {
        check(guard, token);
        if (dependencies['cryptLord.abilityState']?.locked?.(expected.floor.data) !== locked)
          throw Error('能力锁定已变化，请重新读取');
        return true;
      },
      compute(data) {
        if (action.type === 'important') return { data: toggleImportant(data, action.entry) };
        if (action.type === 'remove') return { data: removeMany(data, action.entries) };
        throw Error('未知人物关系操作');
      },
      async onSaved(result) { return { ...result, loaded: await load(expected.floor.message_id, guard, token) }; },
    });
  }
  function commit(baseline, operation, guard) {
    const action = structuredClone(operation);
    const task = queue.then(() => begin(baseline, action, guard).run());
    queue = task.catch(() => {});
    return task;
  }
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents() || {};
  const bind = (event, fn) => { if (event) subscriptions.push(after.bindEvent(event, fn)); };
  bind(events.CHAT_CHANGED, () => { epoch++; generating = false; });
  bind(events.GENERATION_STARTED, (type, options, dryRun) => {
    if (!['quiet', 'quiet_prompt', 'dryRun'].includes(type) && !options?.quiet_prompt && !options?.dryRun && !dryRun) { epoch++; generating = true; }
  });
  for (const event of new Set([events.GENERATION_ENDED, events.GENERATION_STOPPED].filter(Boolean)))
    bind(event, () => { generating = false; });

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: !disposed }); },
    list, toggleImportant, removeMany, load, commit, begin,
    dispose() {
      disposed = true; epoch++; subscriptions.forEach(item => item?.stop());
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
