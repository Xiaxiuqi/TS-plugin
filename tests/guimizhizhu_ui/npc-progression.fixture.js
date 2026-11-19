(() => {
  const stats = ['活力', '敏捷', '灵性', '理智', '人性', '运气'];
  const profile = Object.fromEntries(stats.map(key => [key, 1 / 6]));
  const baseStats = Object.fromEntries(stats.flatMap(key => [[key, 120], ...(key === '运气' ? [] : [[`当前${key}`, 30]])]));
  const baseline = { 当前序列: '序列9-占卜家', 模板: '工程成品', 能力体系: '机械',
    神性: 1.2, 能力清单: [{ 名称: '冲击钻', power: 30, range: 0, effects: [{ value: 10 }] }],
    ...Object.fromEntries(stats.map(key => [key, 120])), $id: 'construct-one', $结构配置: { 左臂: '冲击钻' },
    $能力配置: { 模块: ['冲击钻'] }, $能力点数: 5 };
  const data = { npc_data: {
    克莱恩: { 当前序列: '序列9-占卜家', 模板: '未知模板', initialized: false, 能力体系: '',
      能力清单: [{ 名称: 'AI能力' }], ...baseStats, 当前活力: null, $战斗经验: 150, 事件历史: { 保留: '保留' }, legacy: { keep: true } },
    伦纳德: { 当前序列: '普通人', 模板: '普通', 能力体系: '均衡', initialized: true, _lastSequence: '普通人',
      能力清单: '拳击、射击', ...baseStats, $战斗经验: 0 },
    自主造物: { ...structuredClone(baseline), initialized: true, _lastSequence: baseline.当前序列,
      $完全自主造物: true, $造物机械基准: structuredClone(baseline), ...baseStats, $战斗经验: 150, $战斗经验等级: 0 },
    $meta: { extensible: true },
  }, stat_data: { 备注: '本轮不修改玩家' }, world_data: { 保留: true }, otherPlugin: { keep: true }, cryptLord: { keep: true } };
  const floors = [{ message_id: 0, role: 'assistant', name: '开场', message: '<UpdateVariable>开场只读</UpdateVariable>', data: structuredClone(data) },
    { message_id: 1, role: 'user', message: '调查', data: { protected: true } },
    { message_id: 2, role: 'assistant', name: '当前回合', message: '<gametxt>调查：街灯下有三个人。</gametxt>', data: structuredClone(data) }];
  const flags = { writes: [], page: 0, failBook: false, failWrite: false, failRead: false, afterWriteFail: false,
    hook: null, writeHook: null, hold: '', waiting: 0 };
  const binding = { primary: '1源堡', additional: [] };
  const books = { '1源堡': [
    { uid: 1, name: '序列基准', content: '{"10":600,"9":1000,"8":2000,"7":4000}' },
    { uid: 2, name: '能力体系配置', content: JSON.stringify({ systems: { 均衡: profile }, aliases: {}, defaultSystem: '均衡' }) },
    { uid: 3, name: '能力体系映射', content: '{"普通人":"均衡","占卜家":"均衡","小丑":"均衡"}' },
    { uid: 4, name: '[神之途径]占卜家', content: '{"占卜家":["序列9-占卜家","序列8-小丑"]}' },
    { uid: 5, name: '[序列能力]占卜家', content: JSON.stringify({ '占卜家-序列9': Array.from({ length: 10 }, (_, i) => ({
      name: `灵视${i}`, description: '看见灵体', power: 12 + i, range: 0, targetType: 'single', cost: { type: 'currentSpirituality', amount: 3 },
      effects: [{ stat: '敏捷', value: 10, valueType: 'percentage' }], conditionalParams: { isNight: true } })),
    '占卜家-序列8': [{ name: '身体控制', power: 24, range: 3 }] }) },
  ] };
  const handlers = new Map(), releases = [], events = { CHAT_CHANGED: 'chat', MESSAGE_UPDATED: 'updated', MESSAGE_SWIPED: 'swipe',
    MESSAGE_DELETED: 'deleted', GENERATION_STARTED: 'start', GENERATION_ENDED: 'end', GENERATION_STOPPED: 'stop' };
  const emit = (key, ...args) => { for (const fn of handlers.get(events[key]) || []) fn(...args); };
  const bind = (name, fn) => {
    const set = handlers.get(name) || new Set(); handlers.set(name, set); set.add(fn); return { stop: () => set.delete(fn) };
  };
  const pause = async kind => {
    if (flags.hold === kind) { flags.waiting++; await new Promise(resolve => releases.push(resolve)); flags.waiting--; }
  };
  const modules = {
    'cryptLord.hostApi': {
      async getCharWorldbookNames() { return structuredClone(binding); },
      async getWorldbook(name) {
        await pause('book'); await flags.hook?.(name);
        if (flags.failBook) throw Error('模拟数据库读取失败');
        if (!books[name]) throw Error(`世界书「${name}」不存在`); return structuredClone(books[name]);
      },
      async getChatMessages(range, options) {
        await pause('floor');
        if (flags.failRead) throw Error('模拟楼层读取失败');
        const selected = range === '0-{{lastMessageId}}' ? floors : floors.filter(row => row.message_id === Number(range));
        return structuredClone(options?.include_swipes ? selected.map(row => ({ ...row, swipe_id: flags.page,
          swipes: [row.message, row.message], swipes_data: [row.data, row.data] })) : selected);
      },
      async setChatMessages(rows, options) {
        if (flags.failWrite) throw Error('模拟楼层保存失败');
        if (rows.length !== 1 || rows[0].message_id !== 2 || options.refresh !== 'affected') throw Error('禁止写入其他楼层');
        Object.assign(floors[2], structuredClone(rows[0])); flags.writes.push(2);
        await flags.writeHook?.();
        if (flags.afterWriteFail) flags.failRead = true;
      },
      getScriptId: () => 'npc-fixture',
      async getVariables() { return {}; },
      generateRaw() { throw Error('禁止模型请求'); }, updateWorldbookWith() { throw Error('禁止世界书写入'); },
    },
    'cryptLord.afterNativeHost': { getHost: () => ({ window, document: window.document }), tavernEvents: () => events, bindEvent: bind },
    'cryptLord.contextBuilder': {},
    'cryptLord.variableSettlementApi': { async settle({ previousData }) { return { skipped: true, data: structuredClone(previousData), response: '' }; } },
  };
  window.cryptLord = { __stage1Modules: modules, contract: {
    initializeGlobal() {}, releaseGlobal() {}, async waitGlobalInitialized(key) { if (!modules[key]) throw Error(key); return modules[key]; },
  } };
  const initial = JSON.stringify(floors), protectedValue = JSON.stringify(floors.slice(0, 2));
  window.preview = { floors, flags, binding, books, modules, emit, baseline,
    get api() { return modules['cryptLord.npcProgressionUi']; },
    get service() { return modules['cryptLord.npcProgression']; },
    get untouched() { return JSON.stringify(floors) === initial && !flags.writes.length; },
    get protected() { return JSON.stringify(floors.slice(0, 2)) === protectedValue && floors[2].data.otherPlugin.keep &&
      (!window.document || document.getElementById('draft').value === '原生草稿保留'); },
    release() { flags.hold = ''; releases.splice(0).forEach(resolve => resolve()); },
    async advance(npcName, values) {
      const patches = Object.entries(values).map(([key, value]) => ({ op: 'replace', path: `/${npcName}/${key}`, value }));
      const raw = '<gametxt>调查：人物迈入新的序列。</gametxt><UpdateVariable><JSONPatch>' +
        JSON.stringify({ npc_data: patches }) + '</JSONPatch></UpdateVariable>';
      return modules['cryptLord.nativeFloorBridge'].completeNarrative(raw, { userMessageId: 1, assistantMessageId: 2,
        userText: '调查', narrativeText: '正文', floorText: raw, guard: () => true });
    },
  };
})();
