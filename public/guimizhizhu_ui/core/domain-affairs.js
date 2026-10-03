(() => {
  'use strict';
  const KEY = 'cryptLord.domainAffairs';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const affairs = modules['cryptLord.affairState'];
  if (!affairs) throw new Error(`[${KEY}] 事务规则尚未加载`);
  const core = affairs.AffairCore;
  const stages = Object.freeze(['convene', 'present', 'assign', 'closing']);
  const clone = value => JSON.parse(JSON.stringify(value));
  function domainOf(data) {
    const domain = data?.stat_data?.领地;
    if (!domain?.已建立) throw new Error('当前楼层尚未建立领地');
    return domain;
  }
  function sessionOf(data) { return data?.cryptLord?.domainAffairs || null; }
  function start(data, turn, names = [], spot = '') {
    const next = clone(data);
    const domain = domainOf(next);
    if (sessionOf(next)) return next;
    const gate = affairs.canStart(domain, turn);
    if (!gate.ok) throw new Error(gate.reason);
    const relations = next.stat_data?.人物关系列表 || {};
    const selected = [...new Set(names)].filter(name => name && relations[name] && Number(relations[name].好感度) > 100);
    if (names.length && selected.length !== new Set(names).size) throw new Error('与会属僚须存在且好感度严格大于 100');
    const roster = selected.length
      ? selected.map(name => ({ 姓名: name, 身份: relations[name]?.身份 || '' }))
      : affairs.rollPasserby(domain.等级, domain.线路);
    next.cryptLord = next.cryptLord || {};
    next.cryptLord.domainAffairs = {
      stage: 'convene', turn, spot: String(spot || domain.地点 || ''),
      roster, passerby: selected.length === 0, attendance: null,
      recap: '（无）', records: [], opened: false, settled: false,
    };
    return next;
  }
  function attendance(data, raw) {
    const next = clone(data);
    const session = sessionOf(next);
    if (session?.stage !== 'convene') throw new Error('当前不在召集阶段');
    const names = session.roster.filter(item => !item.路人).map(item => item.姓名);
    const parsed = core.parseAttendance(raw, names);
    if (parsed.玩家.理由 === '模型回复格式无法解析，可重试检测') throw new Error('到场回复无法解析，请重试');
    session.attendance = parsed;
    return next;
  }
  function membersPresent(session) {
    if (!session?.attendance) return false;
    return session.roster.every(item => item.路人 || session.attendance.成员[item.姓名]?.在场);
  }
  function dropMember(data, name) {
    const next = clone(data);
    const session = sessionOf(next);
    if (!session || session.stage !== 'convene' || session.passerby) throw new Error('不能移除此成员');
    const rest = session.roster.filter(item => item.姓名 !== name);
    if (!rest.length || rest.length === session.roster.length) throw new Error('至少保留一位与会成员');
    session.roster = rest;
    if (session.attendance) delete session.attendance.成员[name];
    return next;
  }
  function assign(data, id, handler) {
    const next = clone(data);
    const session = sessionOf(next);
    if (session?.stage !== 'assign') throw new Error('尚未进入议处阶段');
    const todo = affairs.findTodo(domainOf(next), id);
    if (!todo || todo.状态 !== '待指派') throw new Error('此事务不可指派');
    const choices = [...session.roster.filter(item => item.路人 || session.attendance?.成员[item.姓名]?.在场)
      .map(item => item.姓名), '<User>', '暂且搁下', ''];
    if (!choices.includes(handler)) throw new Error('承办人未到场');
    todo.处理者 = handler;
    return next;
  }
  function addRecord(data, action, text) {
    const next = clone(data);
    const session = sessionOf(next);
    if (!session) throw new Error('没有进行中的评定');
    const body = String(text || '').trim();
    if (!body) throw new Error('模型未返回评定正文');
    session.records.push({ stage: session.stage, action: String(action || ''), text: body });
    session.records = session.records.slice(-20);
    return next;
  }
  function advance(data, options = {}) {
    const next = clone(data);
    const domain = domainOf(next);
    const session = sessionOf(next);
    if (!session) throw new Error('没有进行中的评定');
    if (session.stage === 'convene') {
      if (!membersPresent(session)) throw new Error('属僚尚未到齐');
      if (!session.opened) {
        const candidates = options.candidates;
        if (!Array.isArray(candidates) || !candidates.length) throw new Error('拟事官尚未生成有效事务');
        session.recap = core.openAssembly(domain, next, session.turn);
        core.affairsOf(domain).待办 = clone(candidates);
        session.opened = true;
      }
      session.stage = 'present';
      if (session.attendance?.玩家) session.attendance.玩家.在场 = true;
    } else if (session.stage === 'present') {
      session.stage = 'assign';
    } else if (session.stage === 'assign') {
      const todos = affairs.todosOf(domain);
      if (!todos.length || todos.some(todo => todo.状态 === '待指派' && !todo.处理者)) {
        throw new Error('请为每条事务指定承办人或搁置');
      }
      if (!session.settled) core.settleBatch(domain, next, session.roster);
      session.settled = true;
      session.stage = 'closing';
    } else if (session.stage === 'closing') {
      core.closeAssembly(domain);
      delete next.cryptLord.domainAffairs;
    } else throw new Error('未知的评定阶段');
    return next;
  }
  function claim(data, todoId) {
    const next = clone(data);
    const got = core.settleOwn(domainOf(next), next, todoId);
    if (!got) throw new Error('这条事务已经结算或并非玩家亲办');
    return { data: next, got };
  }
  function abort(data) {
    const next = clone(data);
    if (sessionOf(next)?.opened) throw new Error('评定已开始，不能抹除既有结算');
    if (next.cryptLord) delete next.cryptLord.domainAffairs;
    return next;
  }
  function exportText(data) {
    const session = sessionOf(data);
    if (session?.stage !== 'closing') throw new Error('评定尚未散会');
    return [
      '[系统指令] 下列评定纪实为已经确定的世界内经过。请衔接为正文，不得改派承办人；属僚事务只写领命，玩家亲办只写决定，不提前写成败。',
      '【评定纪实】',
      ...session.records.map(item => item.text),
      '【处置清单】', core.assignListText(affairs.todosOf(domainOf(data))),
    ].join('\n\n');
  }
  async function request(system, user) {
    const settlement = await contract.waitGlobalInitialized('cryptLord.variableSettlementApi', { timeoutMs: 10000 });
    const settings = await settlement.readSettings();
    const config = {
      should_silence: true, should_stream: false, max_chat_history: 0,
      use_mes_examples: false, use_story_string: false, use_authors_note: false, use_persona: false,
      ordered_prompts: ['world_info_before', 'world_info_after',
        { role: 'system', content: system }, { role: 'user', content: user }],
    };
    if (settings.useCustomApi) {
      if (!settings.apiUrl || !settings.model) throw new Error('系统副 API 尚未填写 URL 或模型名');
      config.custom_api = { apiurl: settings.apiUrl, key: settings.apiKey, model: settings.model, source: 'openai' };
    }
    const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
    const response = await host.generateRaw(config);
    const text = String(typeof response === 'string' ? response : response?.content || '').trim();
    if (!text) throw new Error('事务模型返回空内容');
    return text;
  }
  function context(data, story) {
    const domain = domainOf(data);
    const ledger = Array.isArray(domain.$流水) ? domain.$流水.slice(-20).map(item => item.事项 || '').filter(Boolean).join('\n') : '';
    const raw = String(story || '');
    const narrative = raw.match(/<gametxt\b[^>]*>([\s\S]*?)<\/gametxt>/i)?.[1] ||
      raw.replace(/<(?:UpdateVariable|thinking|reasoning|analysis)\b[^>]*>[\s\S]*?<\/(?:UpdateVariable|thinking|reasoning|analysis)>/gi, '');
    return `【领地】${domain.领地名 || '未命名'} · ${domain.地点 || '未知'} · ${domain.等级}级\n【领地近况】\n${ledger || '（无）'}\n【近期原生楼层正文】\n${narrative.slice(-16000)}`;
  }
  async function checkAttendance(data, story) {
    const session = sessionOf(data);
    if (session?.stage !== 'convene') throw new Error('当前不在召集阶段');
    const names = session.roster.filter(item => !item.路人).map(item => item.姓名);
    const raw = await request(
      '你是领地事务的到场校验官。只依据所给变量和当前正文，材料不足一律判不在场。仅输出 <玩家><在场>是或否</在场><理由>一句话</理由></玩家> 与每位 <成员><姓名>原名</姓名><在场>是或否</在场><理由>一句话</理由></成员>。',
      `${context(data, story)}\n【评定地点】${session.spot}\n【成员变量】\n${core.memberFacts(names, data)}\n【先前召集】\n${session.records.filter(item => item.stage === 'convene').map(item => item.text).join('\n')}`,
    );
    return attendance(data, raw);
  }
  async function generateCandidates(data, story) {
    const domain = domainOf(data);
    const types = core.rollTypes(domain.等级);
    const count = core.yPerType();
    const system = `你是独立领地事务拟事官。按下列 ${types.length} 种类型各拟 ${count} 条彼此独立的候选，基于近期材料，不补造旧事。\n${core.typeBrief(types)}\n每条严格输出：<事务><类型>上述类型</类型><标题>标题</标题><经过>具体缘由</经过><来源>领地内情</来源><难度>1到5</难度><利益关系人>当事人</利益关系人><方法><名称>谈判交涉</名称><依据>理由</依据></方法><收益><类别>金镑</类别><货种></货种><说明>可验证结果</说明></收益><后果><系数>0.5</系数><类别>金镑</类别><货种></货种><说明>搁置后果</说明></后果></事务>\n处理方法只从下列十三种选择：\n${core.methodBrief()}。不要写数额或格式外内容。`;
    const raw = await request(system, `${context(data, story)}\n【关系名册】\n${core.relationRosterText(data)}\n请生成候选。`);
    const parsed = core.parseCandidates(raw, types);
    if (!parsed.length) throw new Error('拟事官未返回有效事务，未开始评定');
    return core.pickReal(parsed, domain.等级);
  }
  async function narrate(data, story, stage, action = '') {
    const session = sessionOf(data);
    const domain = domainOf(data);
    const list = affairs.todosOf(domain);
    const boundaries = {
      convene: '只演绎召集与奔走，不开会、不陈事。',
      present: '与会者入席并逐条禀报待办，不议定承办人，不写办成。',
      assign: '只演绎商议，不写最终指派与结果。',
      closing: '按既定处置清单宣布领命并散会，属僚只写领命，玩家亲办只写决定，不写成败。',
    };
    const raw = await request(
      `你是独立领地事务评定的叙事者。本阶段：${boundaries[stage]} 只输出 <评定正文>不含变量更新的中文叙事</评定正文>。`,
      `${context(data, story)}\n【地点】${session.spot}\n【与会】${core.rosterText(session.roster)}\n【上期回顾】${session.recap}\n【待办】\n${core.todoListText(list)}\n【处置】\n${core.assignListText(list)}\n【此前评定】\n${session.records.slice(-8).map(item => item.text).join('\n')}\n【本次行动】${action || '推进阶段'}`,
    );
    const body = core.pickTag(raw, '评定正文').trim();
    if (!body) throw new Error('模型未返回评定正文标签，阶段未推进');
    return body.replace(/<(?:thinking|reasoning|analysis)>[\s\S]*?<\/(?:thinking|reasoning|analysis)>/gi, '').trim();
  }
  async function verifyClaim(data, story, id) {
    const todo = affairs.findTodo(domainOf(data), id);
    if (todo?.状态 !== '玩家进行中') throw new Error('这条事务不在玩家亲办清单');
    const raw = await request(
      '你是事务验收官。仅依据当前原生正文和事务标准裁定；仅有计划、委派或进行中判未通过。只输出 <裁定>通过或未通过</裁定><理由>一句话</理由>。',
      `${context(data, story)}\n【事务】${todo.标题}\n【经过】${todo.经过}\n【办成标准】${todo.$收益?.说明 || '以经过为准'}`,
    );
    const accepted = core.pickTag(raw, '裁定') === '通过';
    const reason = core.pickTag(raw, '理由');
    if (!reason) throw new Error('验收回复无法解析，未结算');
    return { accepted, reason };
  }
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, ready: true }),
    stages, sessionOf, start, attendance, membersPresent, dropMember, assign, addRecord,
    advance, claim, abort, exportText, checkAttendance, generateCandidates, narrate, verifyClaim,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader may have released it. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
