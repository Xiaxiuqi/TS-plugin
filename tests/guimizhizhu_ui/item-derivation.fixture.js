(() => {
  const attrs = ['活力', '灵性', '理智', '人性', '敏捷', '运气'];
  const exact = Object.fromEntries(attrs.map(key => [key, 10]));
  const stat = {
    ...Object.fromEntries(attrs.flatMap(key => [[`基础${key}`, 100], [key, 100], ...(key === '运气' ? [] : [[`当前${key}`, 30]])])),
    武器列表: { $meta: { keep: true }, first: { 名称: '第一把剑', 序列: '普通', 类型: '武器', isEquipped: true },
      last: { 名称: '最后一把剑', 序列: '序列9', 类型: '武器', isEquipped: true },
      installed: { 名称: '模块枪', 序列: '序列9', isEquipped: false, 活力: 0, $强化模块安装: { 模块ID: 'module', 属性增量: { 活力: 9 } } } },
    衣物列表: [{ name: '长袍', tier: '普通', 类型: '衣物' }],
    饰品列表: { ring: { 名称: '银环', 序列: '普通', 类型: '饰品' } },
    封印物列表: { sealed: { 名称: '封印物', 序列: '序列3', 级别: '3级封印物', 编号: '3-12', ...exact } },
    消耗品列表: { charm: { 名称: '符咒', 序列: '序列9', 类型: '符咒', 效果: '攻击', 数量: 2 },
      scroll: { 名称: '卷轴', $卷轴制造: true, 数量: 1, 描述: '强化说明必须在末尾', 战斗效果: { 范围: '全体' } },
      empty: { 名称: '空瓶', 数量: .05 }, $meta: { keep: true } },
    其他列表: [{ 名称: '空材料', 数量: 0 }, { 名称: '矿石', 数量: '2' }],
    扮演法列表: { first: { 名称: '扮演', 序列: '序列9', 百分比加成: { 全部属性: '100%', 理智: '-4%', $meta: { keep: true } }, isEquipped: true } },
    辅助能力列表: { first: { 名称: '感知', 序列: '序列8', 百分比加成: { 活力: '100%' } },
      '#空想': { 名称: '空想投影', 百分比加成: { 灵性: '900%' }, isEquipped: false } },
    非凡特性列表: { empty: { 名称: '空加成特性', 等阶: '史诗', 百分比加成: { $meta: { keep: true } } },
      custom: { 名称: '自定义特性', 百分比加成: '20%' } },
    序列能力列表: [{ name: '灵视', description: '看见灵体', fromSequence: '序列9', power: 7,
      射程: 3, 效果扩展: { keep: true } }, { name: '   ' }],
    人物关系列表: { 伙伴: { 名称: '伙伴', 好感度: 300, '对<User>的态度': 'AI伪造', 未知字段: '保留' }, $meta: { keep: true } },
    未知字段: { keep: true },
  };
  const data = { stat_data: stat, npc_data: { 伙伴: { 当前活力: 12, 未知字段: '保留' } },
    world_data: { 当前时间: '1350/1/1', 保留: true }, otherPlugin: { keep: true }, cryptLord: { keep: true } };
  const floors = [
    { message_id: 0, role: 'assistant', message: '开场不写', data: structuredClone(data) },
    { message_id: 1, role: 'user', message: '行动', data: { keep: true } },
    { message_id: 2, role: 'assistant', message: '<gametxt>本轮正文</gametxt>', data: structuredClone(data) },
  ];
  const initial = structuredClone(floors), flags = { writes: [], page: 0, failWrite: false, failBook: false, failRead: false,
    afterWriteFail: false, hook: null, hold: false, waiting: false, branch: '备用原生分支', metadata: 0,
    lostReceipt: false, noWrite: false, conflictWrite: false, chat: 'item', script: 'item' };
  window.SillyTavern = { getCurrentChatId: () => flags.chat };
  const binding = { primary: '1源堡', additional: [] };
  const books = { '1源堡': [
    { name: '【配置】消耗品配置', content: '{"符咒":{"powerRatio":1,"costRatio":0.5,"defaultCost":"灵性"}}' },
    { name: '【配置】天赋加成', content: '{"9":3,"8":6}' },
    { name: '[神之途径]隔离规则', content: '{"占卜家":["序列9"]}' },
    { name: '[序列能力]隔离规则', content: '{"占卜家-序列9":[{"名称":"灵视","描述":"看见灵体"}]}' },
  ] };
  const handlers = new Map(), events = { CHAT_CHANGED: 'chat', GENERATION_STARTED: 'start',
    GENERATION_ENDED: 'end', GENERATION_STOPPED: 'stop', MESSAGE_UPDATED: 'update' };
  let release, releaseBook;
  const modules = {
    'cryptLord.hostApi': {
      scriptVariableOptions: () => ({ type: 'script', script_id: flags.script }),
      async getCharWorldbookNames() { return structuredClone(binding); },
      async getWorldbook(name) {
        if (flags.holdBook) { flags.waitingBook = true; await new Promise(resolve => { releaseBook = resolve; }); flags.waitingBook = false; }
        await flags.hook?.(name);
        if (flags.failBook) throw Error('模拟规则读取失败');
        if (!books[name]) throw Error(`世界书「${name}」不存在`);
        return structuredClone(books[name]);
      },
      async getChatMessages(range, options) {
        if (flags.failRead) throw Error('模拟楼层读取失败');
        const selected = range === '0-{{lastMessageId}}' ? floors : range === '{{lastMessageId}}' ? floors.slice(-1) :
          floors.filter(row => row.message_id === Number(range));
        return structuredClone(options?.include_swipes ? selected.map(row => ({
          message_id: row.message_id, role: row.role, name: row.name, is_hidden: row.is_hidden, swipe_id: 1,
          swipes: [flags.branch, row.message], swipes_data: [{ alternate: true }, row.data],
          swipes_info: [{ keep: true }, { timestamp: new Date('2026-10-16T00:00:00Z'), revision: flags.page + flags.metadata }],
        })) : selected);
      },
      async setChatMessages(rows) {
        if (flags.failWrite) throw Error('模拟保存失败');
        if (flags.noWrite) return;
        if (rows.length !== 1 || rows[0].message_id !== 2) throw Error('禁止写开场和user');
        flags.writes.push(structuredClone(rows));
        Object.assign(floors[2], structuredClone(rows[0]));
        if (flags.afterWriteFail) flags.failRead = true;
        if (flags.conflictWrite) floors[2].data.otherPlugin.conflict = true;
        if (flags.lostReceipt) throw Error('模拟回执丢失');
      },
      generateRaw() { throw Error('禁止模型请求'); }, updateWorldbookWith() { throw Error('禁止世界书写入'); },
      getScriptId: () => 'item-fixture', async getVariables() { return {}; },
    },
    'cryptLord.afterNativeHost': {
      getHost: () => ({ window, document: window.document }), tavernEvents: () => events,
      bindEvent(name, fn) {
        const set = handlers.get(name) || new Set(); handlers.set(name, set); set.add(fn);
        return { stop: () => set.delete(fn) };
      },
    },
    'cryptLord.dynamicStatus': {
      status: () => ({ epoch: 0 }),
      async load() {
        if (flags.hold) { flags.waiting = true; await new Promise(resolve => { release = resolve; }); flags.waiting = false; }
        return { rules: [] };
      }, assertLoaded() {}, apply() {},
    },
    'cryptLord.contextBuilder': {},
    'cryptLord.variableSettlementApi': { async settle({ previousData }) { return { skipped: true, data: structuredClone(previousData), response: '' }; } },
  };
  window.cryptLord = { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal(key) { delete modules[key]; },
    async waitGlobalInitialized(key) { if (!modules[key]) throw Error(key); return modules[key]; },
  } };
  window.preview = { modules, floors, initial, flags, binding, books,
    get service() { return modules['cryptLord.itemDerivation']; },
    emit(key, ...args) { for (const fn of handlers.get(events[key]) || []) fn(...args); },
    release() { flags.hold = false; flags.holdBook = false; release?.(); releaseBook?.(); },
  };
})();
