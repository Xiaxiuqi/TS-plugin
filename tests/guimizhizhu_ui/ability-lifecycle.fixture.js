(() => {
  'use strict';
  window.installAbilityLifecycleFixture = () => {
    const modules = {}, handlers = new Map(), writes = [], calls = [];
    const stats = ['活力', '敏捷', '灵性', '理智', '人性', '运气'];
    const card = sequence => ({
      当前序列: sequence, initialized: true, _lastSequence: sequence, _lastDigestion: 0,
      消化进度: 0, 失控进度: 0, 能力体系: '均衡', 序列能力列表: {}, 非凡特性列表: {},
      ...Object.fromEntries(stats.flatMap(key => [[`基础${key}`, 100], [key, 100],
        ...(key === '运气' ? [] : [[`当前${key}`, 80]])])),
    });
    const pool = {
      pathways: {
        占卜家途径: ['序列9-占卜家', '序列8-小丑'],
        观众途径: ['序列9-观众', '序列1-作家', '序列0-空想家'],
        秘祈人途径: ['序列9-秘祈人', '序列5-牧羊人', '序列0-倒吊人'],
        阅读者途径: ['序列9-阅读者', '序列5-秘术导师', '序列1-全知之眼', '序列0-白塔'],
        窥秘人途径: ['序列9-窥秘人', '序列4-神秘学家', '序列1-知识皇帝'],
      },
      abilities: {
        '占卜家途径-序列9': [{ name: '灵视', description: '世界书完整描述', range: 0, aoeRadius: 0 }],
        '占卜家途径-序列8': [{ name: '身体控制', power: 1000000, range: 'global',
          cost: { type: 'currentSpirit', amount: 1 }, priority: 0, skillTags: [] }],
        '观众途径-序列9': [{ name: '观察' }], '观众途径-序列1': [{ name: '书写' }],
        '观众途径-序列0': [{ name: '空想权柄' }],
        '秘祈人途径-序列9': [{ name: '祈祷' }], '秘祈人途径-序列5': [{ name: '驱策' }],
        '秘祈人途径-序列0': [{ name: '阴影权柄' }],
        '阅读者途径-序列9': [{ name: '阅读' }], '阅读者途径-序列5': [{ name: '分析' }],
        '阅读者途径-序列1': [{ name: '全知之眼' }],
        '阅读者途径-序列0': [{ name: '全知' }],
        '窥秘人途径-序列9': [{ name: '窥秘' }], '窥秘人途径-序列4': [{ name: '神秘学' }],
        '窥秘人途径-序列1': [{ name: '知识' }],
      },
    };
    const books = {
      主书: [
        { name: '序列基准', content: JSON.stringify({ 10: 600, 9: 600, 8: 1200 }) },
        { name: '能力体系配置', content: JSON.stringify({
          systems: { 均衡: Object.fromEntries(stats.map(key => [key, 1 / 6])) },
          defaultSystem: '均衡', aliases: {},
        }) },
        { name: '能力体系映射', content: '{"占卜家":"均衡","小丑":"均衡"}' },
        { name: '[神之途径]测试', content: JSON.stringify(pool.pathways) },
        { name: '[序列能力]测试', content: JSON.stringify(pool.abilities) },
      ],
      '2历史孔隙': [{ name: '[序列能力]测试', content: '{"占卜家途径-序列8":[{"name":"低优先级"}]}' }],
    };
    const floors = [
      { message_id: 0, role: 'assistant', message: '开场不初始化', data: { stat_data: card('序列9-占卜家'), untouched: true } },
      { message_id: 1, role: 'user', message: '晋升', data: { untouched: true } },
      { message_id: 2, role: 'assistant', message: '<gametxt>原生正文完整保留</gametxt>',
        data: { stat_data: card('序列9-占卜家'), npc_data: {
          对手: { ...card('序列9-占卜家'), 敏捷: 1, 当前敏捷: 1 },
        }, world_data: { 原生: true }, otherPlugin: { keep: true } } },
    ];
    floors[0].data = { ...structuredClone(floors[2].data), untouched: true };
    const events = { CHAT_CHANGED: 'chat', GENERATION_STARTED: 'start', GENERATION_ENDED: 'end',
      GENERATION_STOPPED: 'stop', MESSAGE_UPDATED: 'update', MESSAGE_DELETED: 'delete',
      MESSAGE_SWIPED: 'swipe', CHARACTER_MESSAGE_RENDERED: 'render' };
    const state = { pool, books, floors, writes, calls, binding: { primary: '主书', additional: ['主书'] },
      page: 0, legacyLock: 'false', failBook: false, failWrite: false, bookHook: null, dynamicHook: null,
      battlefieldHook: null, readFail: false };
    const host = {
      getScriptId: () => 'ability-lifecycle-isolated',
      getVariables: async () => ({ otherPlugin: { keep: true } }),
      getCharWorldbookNames: async () => structuredClone(state.binding),
      async getWorldbook(name) {
        await state.bookHook?.(name);
        if (state.failBook) throw Error('能力库读取失败');
        if (!books[name]) throw Error('世界书不存在');
        return structuredClone(books[name]);
      },
      async getChatMessages(range, options) {
        if (state.readFail) throw Error('读取失败');
        const rows = range === '0-{{lastMessageId}}' ? floors :
          range === '{{lastMessageId}}' ? floors.slice(-1) : floors.filter(row => row.message_id === Number(range));
        return structuredClone(options?.include_swipes ? rows.map(row => ({
          message_id: row.message_id, role: row.role, name: row.name, is_hidden: row.is_hidden, swipe_id: 1,
          swipes: ['另一个原生分支', row.message], swipes_data: [{ alternate: true }, row.data],
          swipes_info: [{ keep: true }, { timestamp: new Date('2026-10-16T00:00:00Z'), revision: state.page }],
        })) : rows);
      },
      async setChatMessages(rows) {
        if (state.failWrite) throw Error('楼层保存失败');
        writes.push(structuredClone(rows));
        for (const row of rows) Object.assign(floors.find(floor => floor.message_id === row.message_id), structuredClone(row));
      },
      async generateRaw(config) {
        calls.push(structuredClone(config)); await state.battlefieldHook?.(); return '{}';
      },
      updateWorldbookWith() { throw Error('禁止世界书写入'); },
    };
    window.cryptLord = { __stage1Modules: modules, contract: {
      initializeGlobal() {}, releaseGlobal() {},
      async waitGlobalInitialized(key) { if (!modules[key]) throw Error(key); return modules[key]; },
    } };
    modules['cryptLord.hostApi'] = host;
    const hostWindow = { document: window.document, localStorage: { getItem: () => state.legacyLock } };
    modules['cryptLord.afterNativeHost'] = {
      getHost: () => ({ window: hostWindow, document: window.document }),
      tavernEvents: () => events,
      async listAssistantMessages() { return structuredClone(floors.filter(row => row.role === 'assistant')); },
      bindEvent(name, fn) {
        const set = handlers.get(name) || new Set(); handlers.set(name, set); set.add(fn);
        return { stop: () => set.delete(fn) };
      },
    };
    modules['cryptLord.dynamicStatus'] = {
      status: () => ({ epoch: 0 }), async load() { await state.dynamicHook?.(); return { rules: [] }; },
      async assertLoaded() {}, apply() {},
    };
    modules['cryptLord.contextBuilder'] = {};
    modules['cryptLord.variableSettlementApi'] = { settle: async () => ({ skipped: true }),
      readSettings: async () => ({ useCustomApi: false }) };
    state.modules = modules; state.card = card;
    state.emit = (name, ...args) => { for (const fn of handlers.get(events[name] || name) || []) fn(...args); };
    window.abilityFixture = state;
    return state;
  };
})();
