(() => {
  const time = '第五纪1350年1月1日星期一0:00';
  const resource = { 活力: 100, 敏捷: 100, 灵性: 100, 理智: 100, 人性: 100,
    当前活力: 20, 当前敏捷: 20, 当前灵性: 20, 当前理智: 20, 当前人性: 20 };
  const data = {
    stat_data: { ...resource, 身体年龄: 20, 灵魂年龄: '100', 剧场点数: 0,
      货币: { 鲁恩王国: { 金镑: 20, 银苏勒: 0, 铜便士: 0 }, 其他: {}, 未知钱袋: { 保留: 7 } },
      稳定长期收入: { 工资: { 金额: '3 金镑', 周期: '天', 上次结算时间: time } },
      稳定长期支出: { 房租: { 金额: '2 金镑', 周期: '周', 上次结算时间: time } },
      人物关系列表: { 诺兰: { 好感度: 80, 未知: '保留' }, $meta: { keep: true } },
      产业: { 工坊: { 名称: '银湾工坊', 类型: '第二产业', 当前投入资本总额: '50000 金镑',
        利润倍率: 1, 月均资本回报率: 20, 固定成本率: 0, 技术先进指数: 50,
        运营效率: 50, 市场饱和度: 50, 负责人: '诺兰', 生产分配_1级: 100 },
        $meta: { keep: true } },
      领地: { 已建立: true, 领地名: '银湾领地', 地点: '银湾', 等级: 1, 人口: 288,
        格子: { 格1: { 建筑: 'field', 等级: 1, 开工: true, 总管: '诺兰' } },
        核心: { 等级: 1, 房间: { 房1: { 住客: '诺兰', 常住: true } } },
        物资库: { '1级农产品': 100, '1级工业品': 100, '1级服务': 100 },
        驻军: { 散兵: [{ 军种: '陆军', 兵种: 'militia', 精锐等级: 1, 数量: 3 }], 军队: [] } },
      未知字段: '<img src=x onerror=alert(1)>',
    },
    npc_data: { 诺兰: { ...resource, 当前序列: '序列5-工匠' }, 亡者: { ...resource, 当前活力: 0 }, $meta: { keep: true } },
    world_data: { 当前时间纪元: time, _lastTimeEra: time, _timeTriggerState: { 自定义: { 保留: 7 } }, 未知: '保留' },
    otherPlugin: { keep: true }, cryptLord: { keep: true },
  };
  const floors = [
    { message_id: 0, role: 'assistant', message: '开场不初始化', data: structuredClone(data) },
    { message_id: 1, role: 'user', message: '经营领地', data: { keep: true } },
    { message_id: 2, role: 'assistant', message: '<gametxt>原生正文</gametxt>', data: structuredClone(data) },
  ];
  const initial = structuredClone(floors), flags = { writes: [], page: 0, failWrite: false, failRead: false,
    failBook: false, afterWriteFail: false, hold: false, waiting: false, hook: null };
  const binding = { primary: '角色规则', additional: ['角色规则', '附加规则'] };
  const books = {
    '【源堡】玩家自建内容': [{ name: '【配置】产业配置', content: '{"industryInjectRetention":0.1}' }],
    附加规则: [{ name: '【配置】产业配置', content: '{"industryInjectRetention":0.2}' }],
    '2历史孔隙': [{ name: '【配置】产业配置', content: '{"industryInjectRetention":0.3}' }],
    角色规则: [
      { name: '【配置】产业配置', content: '{"industryInjectRetention":0.5}' },
      { name: '[神之途径]通识者', content: '{"通识者途径":["序列5-工匠"]}' },
    ],
  };
  const events = { CHAT_CHANGED: 'chat', GENERATION_STARTED: 'start', GENERATION_ENDED: 'end',
    GENERATION_STOPPED: 'stop', MESSAGE_UPDATED: 'update' }, handlers = new Map();
  let release;
  const modules = {
    'cryptLord.hostApi': {
      scriptVariableOptions: () => ({ type: 'script', script_id: 'isolated-world-settlement' }),
      getVariables: () => ({ 'cryptLord.variableSettlement': { enabled: false } }),
      async getCharWorldbookNames() { return structuredClone(binding); },
      async getWorldbook(name) {
        await flags.hook?.(name);
        if (flags.failBook) throw Error('模拟世界书读取失败');
        if (!books[name]) throw Error(`世界书「${name}」不存在`);
        return structuredClone(books[name]);
      },
      async getChatMessages(range, options) {
        if (flags.failRead) throw Error('模拟楼层读取失败');
        const selected = range === '0-{{lastMessageId}}' ? floors : range === '{{lastMessageId}}' ? floors.slice(-1) :
          floors.filter(row => row.message_id === Number(range));
        return structuredClone(options?.include_swipes ? selected.map(row => ({
          message_id: row.message_id, name: row.name, role: row.role, is_hidden: row.is_hidden, swipe_id: flags.page,
          swipes: [row.message, row.message], swipes_data: [row.data, row.data], swipes_info: [{}, {}],
        })) : selected);
      },
      async setChatMessages(rows) {
        if (flags.failWrite) throw Error('模拟保存失败');
        if (rows.length !== 1 || rows[0].message_id !== 2) throw Error('禁止写入开场或user');
        flags.writes.push(structuredClone(rows));
        Object.assign(floors[2], structuredClone(rows[0]));
        if (flags.afterWriteFail) flags.failRead = true;
      },
      generateRaw() { throw Error('禁止模型请求'); }, updateWorldbookWith() { throw Error('禁止世界书写入'); },
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
      async assertLoaded() {},
      async load() {
        if (flags.hold) { flags.waiting = true; await new Promise(resolve => { release = resolve; }); flags.waiting = false; }
        return { rules: [] };
      }, apply() {},
    },
    'cryptLord.contextBuilder': {},
  };
  window.cryptLord = { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; }, releaseGlobal(key) { delete modules[key]; },
    async waitGlobalInitialized(key) { if (!modules[key]) throw Error(key); return modules[key]; },
  } };
  window.preview = { modules, floors, initial, flags, binding, books, time,
    get service() { return modules['cryptLord.variableWorkbenchState']; },
    get ui() { return modules['cryptLord.variableWorkbench']; },
    emit(key, ...args) { for (const fn of handlers.get(events[key]) || []) fn(...args); },
    release() { flags.hold = false; release?.(); },
  };
})();
