(() => {
  const data = {
    stat_data: {
      领地: { 已建立: true, 领地名: '灰雾郡', 地点: '贝克兰德', 线路: '市内', 等级: 1, 人口: 500,
        物资库: { '1级农产品': 50, '1级工业品': 50, '1级服务': 50 },
        $流水: [{ 事项: '医院扩建和边境巡防' }],
        事务: { 上次评定回合: 0, 上次评定时刻: 0, 评定次数: 0, 待办: [
          { id: 'old', 标题: '旧期未办', 类型: '治安', 难度: 5, 状态: '已搁置',
            $后果: { 类别: ['金镑'] }, $后果系数: 1.5 },
        ] } },
      货币: { 鲁恩王国: { 金镑: 100, 银苏勒: 7, 铜便士: 3 }, 其他: { 保留币: 9 } },
      人物关系列表: { 艾琳: { 身份: '管家', 好感度: 150, 当前序列: '普通人' },
        无效成员: { 好感度: '未知' } },
      身体年龄: 20, 灵魂年龄: 20,
    },
    npc_data: { 艾琳: { 当前序列: '序列5-工匠', 所处地点: '贝克兰德', 正在做的事: '整理账册',
      近期打算: '参加领地评定' } },
    world_data: { 当前时间纪元: '第五纪1350年1月1日星期一0:00' },
    otherPlugin: { keep: true },
  };
  const floors = [
    { message_id: 0, role: 'user', message: '开场不可修改', data: { keep: true } },
    { message_id: 2, role: 'assistant', message: '<gametxt>领主在府内，上一条亲办已经办成。</gametxt>',
      data: structuredClone(data), swipe_id: 0, swipes: [
        '<gametxt>领主在府内，上一条亲办已经办成。</gametxt>', '另一个正文页',
      ], swipes_data: [structuredClone(data), { untouched: true }], extra: { keep: true } },
  ];
  const initial = structuredClone(floors), writes = [], updates = [], notices = [], calls = [];
  const binding = { primary: 'bound', additional: ['extra'] };
  const books = {
    extra: [{ name: '[神之途径]通识者', content: '{"通识者途径":["序列5-其他"]}' }],
    bound: [{ name: '[神之途径]通识者', content: '{"通识者途径":["序列5-工匠"]}' }],
  };
  const events = { CHAT_CHANGED: 'chat', GENERATION_STARTED: 'start', GENERATION_ENDED: 'end', GENERATION_STOPPED: 'stop' };
  const handlers = new Map(), modules = {};
  window.preview = { floors, initial, writes, updates, notices, calls, binding, books,
    failSave: false, failNarration: false, waitModel: null, releaseModel: null, bookHook: null,
    failRead: false, noWrite: false, lostReceipt: false, afterWriteFail: false, derivations: 0,
    chat: 'affairs', script: 'affairs', date: new Date('2026-10-28T00:00:00Z'),
    emit(key, ...args) { for (const handler of handlers.get(events[key]) || []) handler(...args); },
    reset() {
      floors.splice(0, floors.length, ...structuredClone(initial));
      this.failSave = false; this.failNarration = false; this.waitModel = null;
      this.failRead = false; this.noWrite = false; this.lostReceipt = false; this.afterWriteFail = false;
    },
  };
  window.confirm = () => preview.confirm !== false;
  window.SillyTavern = { getCurrentChatId: () => preview.chat };
  window.cryptLord = { __stage1Modules: modules, contract: {
    initializeGlobal(key, api) { modules[key] = api; },
    releaseGlobal(key) { delete modules[key]; },
    async waitGlobalInitialized(key) { if (!modules[key]) throw Error(key); return modules[key]; },
  } };
  modules['cryptLord.afterNativeHost'] = {
    getHost: () => ({ window, document: window.document }), tavernEvents: () => events,
    bindEvent(key, handler) {
      const set = handlers.get(key) || new Set(); handlers.set(key, set); set.add(handler);
      return { stop() { set.delete(handler); } };
    },
  };
  modules['cryptLord.hostApi'] = {
    scriptVariableOptions: () => ({ type: 'script', script_id: preview.script }),
    async getCharWorldbookNames() { return structuredClone(binding); },
    async getWorldbook(name) {
      await preview.bookHook?.(name);
      if (!books[name]) throw Error(`worldbook ${name} not found`);
      return structuredClone(books[name]);
    },
    async getChatMessages(range, options) {
      if (preview.failRead) throw Error('模拟读取失败');
      const list = range === '0-{{lastMessageId}}' ? floors : floors.filter(row => row.message_id === Number(range));
      return structuredClone(list.map(row => {
        if (options?.include_swipes) {
          return { message_id: row.message_id, name: row.name, role: row.role, is_hidden: row.is_hidden,
            swipe_id: row.swipe_id ?? 0, swipes: row.swipes || [row.message], swipes_data: row.swipes_data || [row.data],
            swipes_info: row.swipes ? [{ timestamp: preview.date }, {}] : [{}],
            extra: row.extra };
        }
        const { swipes: _swipes, swipes_data: _swipesData, swipe_id: _swipeId, ...current } = row;
        return current;
      }));
    },
    async setChatMessages(rows) {
      if (preview.failSave) throw Error('模拟原生保存失败');
      if (preview.noWrite) return;
      if (rows.length !== 1 || rows[0].message_id !== 2) throw Error('禁止修改开场或 user 楼层');
      writes.push(structuredClone(rows));
      Object.assign(floors[1], structuredClone(rows[0]));
      floors[1].swipes_data[floors[1].swipe_id] = structuredClone(floors[1].data);
      await preview.afterWrite?.();
      if (preview.afterWriteFail) preview.failRead = true;
      if (preview.lostReceipt) throw Error('模拟回执丢失');
    },
    async generateRaw(config) {
      calls.push(structuredClone(config));
      await preview.waitModel?.();
      const system = config.ordered_prompts.find(item => item?.role === 'system').content;
      if (system.includes('到场校验官'))
        return '<玩家><在场>否</在场><理由>稍后入席</理由></玩家><成员><姓名>艾琳</姓名><在场>是</在场><理由>在府内</理由></成员>';
      if (system.includes('拟事官')) {
        const types = [...system.matchAll(/^- ([^：\n]+)：/gm)].map(match => match[1]);
        return types.slice(0, 3).map((type, index) =>
          `<事务><类型>${type}</类型><标题>本期待办${index + 1}</标题><经过>领地${type}需要处理。</经过><来源>领地内情</来源><难度>1</难度><方法><名称>技艺施为</名称><依据>使用专业技术</依据></方法><收益><类别>金镑、物资、人口、好感度</类别><货种>工业品</货种><说明>事务已经办成</说明></收益><后果><系数>0.5</系数><类别>金镑</类别><说明>积压扩大</说明></后果></事务>`
        ).join('');
      }
      if (system.includes('验收官')) return '<裁定>通过</裁定><理由>正文已经明确完成</理由>';
      if (preview.failNarration) return '无正文标签';
      return '<评定正文>众人在书房入席，逐条禀报。领主议定处置，各人领命后散会。</评定正文>';
    },
  };
  modules['cryptLord.variableSettlementApi'] = { async readSettings() { return { useCustomApi: false }; } };
  modules['cryptLord.itemDerivation'] = {
    async prepare(data) { preview.derivations++; return { data }; }, async assertPrepared() {}, settle: data => ({ data }),
  };
  modules['cryptLord.inputAdapter'] = { setInputText(text) { document.querySelector('#send_textarea').value = text; } };
  modules['cryptLord.variableWorkbench'] = { notifyUpdate(update) { updates.push(structuredClone(update)); } };
  modules['cryptLord.domainConsole'] = { close() {} };
  window.toastr = Object.fromEntries(['error', 'warning', 'success'].map(kind => [kind, text => notices.push(text)]));
})();
