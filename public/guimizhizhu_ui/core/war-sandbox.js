(() => {
  'use strict';
  const KEY = 'cryptLord.warSandbox';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw Error(`[${KEY}] contract missing`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const domain = modules['cryptLord.domainState'], engine = modules['cryptLord.warSim'];
  if (!domain || !engine) throw Error(`[${KEY}] dependencies missing`);
  const clone = value => JSON.parse(JSON.stringify(value));
  const keys = { A: '我方布阵', B: '敌方布阵' };
  let disposed = false, epoch = 0, generating = false;
  const nativeTickets = new WeakMap(), subscriptions = [];
  function check(guard, token = epoch) {
    if (disposed || generating || token !== epoch || modules[KEY] !== api || guard?.() === false)
      throw Error('沙盘来源已变化，操作已取消');
  }
  function scoped(rules, run) {
    if (disposed || modules[KEY] !== api || modules['cryptLord.domainState'] !== domain || modules['cryptLord.warSim'] !== engine)
      throw Error('沙盘服务已变化，请重新打开');
    if (!rules?.config || !rules?.warConfig || !rules?.roster) throw Error('请先读取实际战争规则');
    return domain.withWarRules(rules, run);
  }
  function warOf(data) { return data?.stat_data?.领地?.战争; }
  function create(value) {
    const data = clone(value || {});
    data.stat_data ||= {};
    data.stat_data.领地 ||= {};
    const d = data.stat_data.领地;
    d.战争 ||= {};
    for (const key of Object.values(keys)) {
      if (d.战争[key] === undefined) d.战争[key] = [];
      if (!Array.isArray(d.战争[key])) throw Error(`${key}必须是数组，请修复原生变量`);
    }
    d.战争.敌方来源 ||= '';
    d.战争.最近战报 ||= { 时间: '', 结果: '', 摘要: '' };
    return data;
  }
  function roster(data, side) {
    if (!keys[side]) throw Error('沙盘阵营无效');
    return warOf(data)?.[keys[side]] || [];
  }
  function board(rules) { return scoped(rules, () => ({ ...domain.warBoard(), limit: domain.maxDeploy() })); }
  function validCell(cell, side, rules) {
    const { cols, rows, half } = board(rules);
    return Number.isSafeInteger(cell.x) && Number.isSafeInteger(cell.y) && cell.x >= 0 && cell.x < cols &&
      cell.y >= (side === 'A' ? half : 0) && cell.y < (side === 'A' ? rows : half);
  }
  function freeCell(list, side, rules) {
    const { cols, rows, half } = board(rules);
    for (let y = side === 'A' ? half : 0; y < (side === 'A' ? rows : half); y++)
      for (let x = 0; x < cols; x++)
        if (!list.some(row => row.x === x && row.y === y)) return { x, y };
    throw Error('本方半区已无空格');
  }
  function canonical(data, rules) {
    return scoped(rules, () => domain.ensureDomain(clone(data.stat_data?.领地 || {})));
  }
  function sourcePiece(data, side, row, rules, field) {
    const d = canonical(data, rules);
    return scoped(rules, () => {
      if (side === 'A') {
        const army = domain.findArmy(d, row.id);
        if (army && row.来源 !== '手填' && row.来源 !== '预设') {
          const valid = domain.canDeploy(d, army, field);
          if (!valid.ok) throw Error(`${army.名称 || army.id}：${valid.reason}`);
          return domain.armyToPiece(army, 0);
        }
        if (row.来源 === '领地') throw Error('原出战部队已不存在，请重新同步名单');
      } else if (warOf(data).敌方来源) {
        const source = warOf(data).敌方来源;
        const piece = domain.peerPieces(d, source).find(item => item.id === row.id);
        if (piece) return piece;
        if (row.来源 === '邻境' || String(row.id).startsWith(`peer-${source}-`))
          throw Error('原邻境部队已不存在，请重新导入对手');
      } else if (row.来源 === '邻境') throw Error('邻境来源已丢失，请重新导入对手');
      return null;
    });
  }
  function preset(row, rules) {
    return scoped(rules, () => {
      const troop = domain.findTroop(row.兵种);
      if (!troop) throw Error('预设兵种已不存在，请重新选择');
      return domain.armyToPiece({
        id: row.id, 名称: row.名称 || troop.名称, 军种: troop.军种, 主兵种: troop.id,
        编成: [{ 军种: troop.军种, 兵种: troop.id, 精锐等级: troop.精锐 || 1,
          数量: Math.max(1, row.数量 || 1) }],
      }, 0);
    });
  }
  function piece(data, side, row, rules, field = '陆战') {
    const source = sourcePiece(data, side, row, rules, field);
    const p = source || (row.兵种 ? preset(row, rules) : {
      id: row.id, name: row.名称 || row.id, icon: 'infantry', hp: row.生命,
      atk: row.攻击, range: row.射程, eliteLevel: row.精锐等级, count: row.数量,
    });
    return { ...p, x: row.x, y: row.y };
  }
  function rowOf(p, source) {
    return { id: p.id, 名称: p.name, 图标: p.icon, 兵种: '', 来源: source,
      x: p.x, y: p.y, 生命: p.hp, 攻击: p.atk, 射程: p.range,
      精锐等级: p.eliteLevel, 数量: p.count };
  }
  function place(data, side, id, x, y, rules) {
    const next = create(data), list = roster(next, side), row = list.find(item => item.id === id);
    if (!row) throw Error('请选择已有部队');
    if (!validCell({ x, y }, side, rules)) throw Error('只能在本方半区内摆位');
    if (list.some(item => item.id !== id && item.x === x && item.y === y)) throw Error('这个格子已有部队');
    Object.assign(row, { x, y });
    return next;
  }
  function add(data, side, rules) {
    const next = create(data), list = roster(next, side);
    if (list.length >= board(rules).limit) throw Error('已达到本方出战上限');
    const used = new Set([...roster(next, 'A'), ...roster(next, 'B'),
      ...(next.stat_data.领地.驻军?.军队 || [])].map(row => row.id));
    let n = 1;
    while (used.has(`${side.toLowerCase()}${n}`)) n++;
    list.push({ id: `${side.toLowerCase()}${n}`, 名称: side === 'A' ? '常备步兵' : '民兵',
      来源: '手填', 图标: 'infantry', 兵种: '', ...freeCell(list, side, rules),
      生命: 1700, 攻击: 170, 射程: 1, 精锐等级: 1, 数量: 0 });
    return next;
  }
  function remove(data, side, id) {
    const next = create(data);
    warOf(next)[keys[side]] = roster(next, side).filter(row => row.id !== id);
    if (side === 'B' && !roster(next, side).length) warOf(next).敌方来源 = '';
    return next;
  }
  function clear(data, side) {
    roster(data, side);
    const next = create(data);
    warOf(next)[keys[side]] = [];
    if (side === 'B') warOf(next).敌方来源 = '';
    return next;
  }
  function setField(data, side, id, field, value, rules, battleField) {
    const next = create(data), row = roster(next, side).find(item => item.id === id);
    if (!row) throw Error('部队不存在');
    if (sourcePiece(next, side, row, rules, battleField)) throw Error('来源部队属性由实际编成决定，只能摆位或移除');
    if (['名称', '兵种'].includes(field)) row[field] = String(value || '');
    else {
      const minimum = ['生命', '射程', '精锐等级'].includes(field) ? 1 : 0;
      if (!['生命', '攻击', '射程', '精锐等级', '数量'].includes(field) ||
        value === '' || !Number.isSafeInteger(Number(value)) || Number(value) < minimum ||
        field === '精锐等级' && Number(value) > 5) throw Error('属性须为有效范围内的整数');
      row[field] = Number(value);
    }
    row.来源 = row.兵种 ? '预设' : '手填';
    if (row.兵种) {
      const p = preset(row, rules);
      Object.assign(row, { 图标: p.icon, 生命: p.hp, 攻击: p.atk, 射程: p.range, 精锐等级: p.eliteLevel });
    } else row.图标 = 'infantry';
    return next;
  }
  function importPieces(data, side, pieces, source, rules) {
    if (!pieces.length) throw Error('来源没有可用部队');
    if (pieces.length > board(rules).limit || new Set(pieces.map(p => p.id)).size !== pieces.length)
      throw Error('来源部队重复或超过出战上限');
    const next = create(data), old = roster(next, side), list = [];
    // Reserve valid old placements first, then fill genuinely free cells for new troops.
    for (const p of pieces) {
      const previous = old.find(row => row.id === p.id);
      if (previous && validCell(previous, side, rules) &&
        !list.some(row => row.x === previous.x && row.y === previous.y))
        list.push({ ...rowOf(p, source), x: previous.x, y: previous.y });
    }
    for (const p of pieces)
      if (!list.some(row => row.id === p.id)) list.push({ ...rowOf(p, source), ...freeCell(list, side, rules) });
    warOf(next)[keys[side]] = pieces.map(p => list.find(row => row.id === p.id));
    return next;
  }
  function sync(data, rules, field = '陆战') {
    const d = canonical(data, rules);
    const pieces = scoped(rules, () => domain.deployListOf(d).map(id => {
      const army = domain.findArmy(d, id), valid = domain.canDeploy(d, army, field);
      if (!valid.ok) throw Error(`出战名单无效：${valid.reason}`);
      return domain.armyToPiece(army, 0);
    }));
    return importPieces(data, 'A', pieces, '领地', rules);
  }
  function importPeer(data, id, rules) {
    const d = canonical(data, rules);
    if (!scoped(rules, () => domain.findPeer(d, id))) throw Error('邻境不存在');
    const next = importPieces(data, 'B', scoped(rules, () => domain.peerPieces(d, id)), '邻境', rules);
    warOf(next).敌方来源 = id;
    return next;
  }
  function validate(data, rules, field = '陆战', requireBoth = false) {
    const teams = {}, ids = new Set();
    for (const side of ['A', 'B']) {
      const list = roster(data, side), cells = new Set();
      if (list.length > board(rules).limit || requireBoth && !list.length) throw Error('双方须有部队且不能超过出战上限');
      teams[side] = list.map(row => {
        if (!row || typeof row.id !== 'string' || !row.id || ids.has(row.id)) throw Error('部队编号无效或重复');
        ids.add(row.id);
        const cell = `${row.x},${row.y}`;
        if (!validCell(row, side, rules) || cells.has(cell)) throw Error('布阵越界或重叠，请重新摆位');
        cells.add(cell);
        const p = piece(data, side, row, rules, field);
        for (const [key, min] of [['hp', 1], ['atk', 0], ['range', 1], ['count', 0], ['eliteLevel', 1]])
          if (!Number.isFinite(p[key]) || p[key] < min) throw Error('部队战斗属性无效');
        return p;
      });
    }
    return teams;
  }
  function simulate(data, rules, seed, field = '陆战') {
    if (!Number.isSafeInteger(seed) || seed < 0 || seed >= 2147483647) throw Error('种子须为0到2147483646之间的整数');
    const next = create(data), teams = validate(next, rules, field, true);
    const result = scoped(rules, () => engine.simulate({ seed, config: clone(rules.warConfig), teams }));
    const report = engine.buildReport(result);
    warOf(next).沙盘种子 = seed;
    warOf(next).最近战报 = { ...warOf(next).最近战报, 时间: new Date().toISOString(),
      结果: result.winner === 'A' ? '我方获胜' : result.winner === 'B' ? '敌方获胜' : '平局',
      摘要: report.text, 种子: seed };
    return { data: next, result, report };
  }
  function exportText(data) {
    const last = warOf(data)?.最近战报;
    if (!last?.摘要) throw Error('还没有已保存战报');
    return `【沙盘军演 · ${last.结果 || ''}】\n${last.时间 || ''}\n种子：${last.种子 ?? '未记录'}\n${last.摘要}`;
  }
  async function loadNative(messageId = null, guard, token = epoch) {
    check(guard, token);
    if (messageId !== null && (!Number.isInteger(messageId) || messageId < 0)) throw Error('楼层编号无效');
    const native = modules['cryptLord.nativeFloorSource'];
    if (!native) throw Error('原生楼层来源服务尚未加载');
    const dependencies = native.writeDependencies([KEY, 'cryptLord.domainState', 'cryptLord.warSim',
      'cryptLord.warReplay', 'cryptLord.industryState', 'cryptLord.cashflow']);
    const valid = () => { check(guard, token); return true; };
    const source = await native.read(valid), latest = source.rows.at(-1);
    const floor = source.rows.find(row => row.message_id === (messageId ?? latest?.message_id) && row.role === 'assistant');
    if (!floor?.data?.stat_data) throw Error('当前楼层没有真实 assistant 角色状态');
    const rules = await domain.loadRules(valid, true);
    await native.assert(source, valid);
    if (Object.entries(dependencies).some(([key, value]) => modules[key] !== value))
      throw Error('沙盘保存或战争服务已变化，请重新读取');
    const battle = dependencies['cryptLord.attributeRecalculation']?.busyBattle(floor.data) ??
      ['teamBattle', 'personalBattle'].some(key => {
        const item = floor.data.cryptLord?.[key];
        return item?.status === 'active' || key === 'teamBattle' && ['finished', 'ended'].includes(item?.status) && !item.settled ||
          key === 'personalBattle' && item?.status === 'finished' && item.result === 'victory' && item.enemy?.npcKey && !item.experienceClaimed;
      });
    const reason = floor.is_hidden ? '隐藏楼层只读' : floor.message_id === 0 || latest?.message_id !== floor.message_id ?
      '开场与历史楼层只读，请在最新真实 assistant 楼层打开沙盘' : battle ? '请先结束并结算战斗' : '';
    const loaded = { floor: structuredClone(floor), rules, editable: !reason, reason };
    nativeTickets.set(loaded, { native, dependencies, source, token, signature: native.signature(loaded),
      abilityLock: dependencies['cryptLord.abilityState']?.locked?.(floor.data) });
    return loaded;
  }
  function nativeTicket(loaded, guard) {
    const ticket = nativeTickets.get(loaded);
    if (!ticket || ticket.signature !== ticket.native.signature(loaded)) throw Error('沙盘来源无效或已修改，请重新读取');
    check(guard, ticket.token);
    if (!loaded.editable) throw Error(loaded.reason);
    if (Object.entries(ticket.dependencies).some(([key, value]) => modules[key] !== value) ||
      ticket.dependencies['cryptLord.abilityState']?.locked?.(loaded.floor.data) !== ticket.abilityLock)
      throw Error('沙盘保存、规则或能力锁定已变化，请重新读取');
    ticket.native.assertIdentity(ticket.source, guard);
    return ticket;
  }
  async function assertNative(loaded, guard) {
    const ticket = nativeTicket(loaded, guard), valid = () => { nativeTicket(loaded, guard); return true; };
    await domain.assertWarRules(loaded.rules, valid);
    await ticket.native.assert(ticket.source, valid);
  }
  function beginNative(loaded, next, { field = '陆战', simulate: simulateBattle = false, seed } = {}, guard) {
    const ticket = nativeTicket(loaded, guard), draft = structuredClone(next);
    if (!['陆战', '海战'].includes(field)) throw Error('沙盘战场无效');
    return ticket.native.transaction(ticket.source, loaded.floor.message_id, {
      dependencies: ticket.dependencies,
      guard: () => { nativeTicket(loaded, guard); return true; },
      beforeWrite: () => domain.assertWarRules(loaded.rules, guard),
      compute() {
        validate(draft, loaded.rules, field);
        const result = simulateBattle ? simulate(draft, loaded.rules, seed, field) : { data: draft };
        return { ...result, writeOptions: { warfareRules: loaded.rules } };
      },
      async onSaved(result) {
        nativeTickets.delete(loaded);
        return { ...result, loaded: await loadNative(loaded.floor.message_id, guard, ticket.token) };
      },
    });
  }
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, disposed }),
    create, warOf, roster, board, piece, add, remove, clear, place, setField, sync, importPeer, validate, simulate, exportText,
    loadNative, assertNative, beginNative,
    dispose() {
      disposed = true; epoch++; subscriptions.forEach(item => item?.stop?.());
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  const host = modules['cryptLord.afterNativeHost'], events = host?.tavernEvents?.();
  if (events?.CHAT_CHANGED) subscriptions.push(host.bindEvent(events.CHAT_CHANGED, () => { epoch++; generating = false; }));
  if (events?.GENERATION_STARTED) subscriptions.push(host.bindEvent(events.GENERATION_STARTED, (_id, info, dryRun) => {
    const type = typeof _id === 'string' ? _id : info?.type ?? _id?.type;
    if (['quiet', 'quiet_prompt', 'dryRun'].includes(type) || dryRun || info?.dryRun || _id?.dryRun ||
      info?.quiet_prompt || _id?.quiet_prompt || info?.options?.quiet_prompt || _id?.options?.quiet_prompt ||
      info?.options?.dryRun || _id?.options?.dryRun) return;
    generating = true; epoch++;
  }));
  for (const event of new Set([events?.GENERATION_ENDED, events?.GENERATION_STOPPED].filter(Boolean))) {
    subscriptions.push(host.bindEvent(event, () => { generating = false; }));
  }
})();
