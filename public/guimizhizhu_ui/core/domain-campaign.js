(() => {
  'use strict';
  const KEY = 'cryptLord.domainCampaign';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] contract missing`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const domainState = modules['cryptLord.domainState'];
  const replay = modules['cryptLord.warReplay'];
  if (!domainState || !replay) throw new Error(`[${KEY}] dependencies missing`);
  const stages = Object.freeze(['return', 'muster', 'march', 'parley', 'battle', 'aftermath']);
  const labels = Object.freeze({ return: '归返', muster: '集结', march: '行军', parley: '阵前', battle: '战况', aftermath: '战后' });
  const clone = value => JSON.parse(JSON.stringify(value));
  const sessionOf = data => data?.cryptLord?.domainCampaign || null;
  const domainOf = data => {
    const domain = data?.stat_data?.领地;
    if (!domain?.已建立) throw new Error('当前楼层尚未建立领地');
    return domain;
  };
  function start(data, peerId) {
    const next = clone(data);
    const domain = domainOf(next);
    const active = sessionOf(next);
    if (active) {
      if (active.peerId !== peerId) throw new Error(`与「${active.peerName}」的战役尚未结束`);
      return next;
    }
    const peer = domainState.peersOf(domain).find(item => item.id === peerId);
    if (!peer || peer.状态 === '已吞并') throw new Error('邻境不存在或已吞并');
    next.cryptLord = next.cryptLord || {};
    const field = peer.战场 === '海战' ? '海战' : '陆战';
    const prepared = domainState.deployListOf(domain)
      .filter(id => domainState.canDeploy(domain, domainState.findArmy(domain, id), field).ok);
    next.cryptLord.domainCampaign = {
      peerId, peerName: peer.名称 || peerId, field: peer.战场 === '海战' ? '海战' : '陆战',
      stage: 'muster', checked: false, absenceReason: '', hadReturn: false,
      records: [], battle: null, formation: {},
      armyIds: prepared.length ? prepared.slice(0, domainState.maxDeploy()) :
        domainState.deployableArmies(domain, field).slice(0, domainState.maxDeploy()).map(item => item.id),
    };
    return next;
  }
  function verdict(data, raw) {
    const next = clone(data);
    const session = sessionOf(next);
    if (!session || session.battle) throw new Error('当前不能重新核验在场');
    const decision = String(raw).match(/<裁定>\s*(通过|未通过)\s*<\/裁定>/);
    const reason = String(raw).match(/<理由>([\s\S]*?)<\/理由>/)?.[1]?.trim();
    if (!decision || !reason) throw new Error('在场裁定格式不正确，可重新检测');
    session.checked = true;
    session.stage = decision[1] === '通过' ? 'muster' : 'return';
    session.absenceReason = decision[1] === '通过' ? '' : reason;
    session.hadReturn ||= session.stage === 'return';
    return next;
  }
  function record(data, stage, action, text, nextStage = stage) {
    const next = clone(data);
    const session = sessionOf(next);
    if (!session?.checked || session.stage !== stage) throw new Error('战役阶段已变化');
    if (stage === 'battle') throw new Error('战况只能根据沙盘战报生成');
    const body = String(text || '').trim();
    if (!body) throw new Error('模型未返回战役正文');
    session.records.push({ stage, action: String(action || ''), text: body });
    session.stage = nextStage;
    return next;
  }
  function position(data, armyId, x, y) {
    const next = clone(data);
    const session = sessionOf(next);
    if (session?.stage !== 'parley' || session.battle) throw new Error('仅阵前可以调整布阵');
    const domain = domainOf(next);
    const army = domainState.findArmy(domain, armyId);
    if (!domainState.canDeploy(domain, army, session.field).ok) throw new Error('该部队不可出战');
    if (!Number.isInteger(x) || x < 0 || x >= 8 || !Number.isInteger(y) || y < 3 || y >= 6)
      throw new Error('只能在我方半区布阵');
    if ((session.armyIds || []).some((id, index) => {
      if (id === armyId) return false;
      const cell = session.formation?.[id] || { x: index % 8, y: 4 + Math.floor(index / 8) };
      return cell.x === x && cell.y === y;
    }))
      throw new Error('此格已有其他部队');
    session.formation = session.formation || {};
    session.formation[armyId] = { x, y };
    return next;
  }
  function selectArmy(data, armyId, selected) {
    const next = clone(data);
    const session = sessionOf(next);
    if (session?.stage !== 'parley' || session.battle) throw new Error('仅阵前可以更换出战部队');
    const domain = domainOf(next);
    if (!domainState.canDeploy(domain, domainState.findArmy(domain, armyId), session.field).ok)
      throw new Error('该部队不可出战');
    const ids = new Set(session.armyIds || []);
    if (selected) ids.add(armyId);
    else ids.delete(armyId);
    if (ids.size > domainState.maxDeploy()) throw new Error(`出战名单最多 ${domainState.maxDeploy()} 支`);
    session.armyIds = [...ids];
    return next;
  }
  function settle(data, armyIds) {
    const next = clone(data);
    const session = sessionOf(next);
    if (session?.stage !== 'parley' || !session.checked || session.battle) throw new Error('当前不能重复开战');
    if (!Array.isArray(armyIds) || !armyIds.length ||
      armyIds.length > domainState.maxDeploy() || new Set(armyIds).size !== armyIds.length ||
      armyIds.some(id => !domainState.canDeploy(domainOf(next), domainState.findArmy(domainOf(next), id), session.field).ok))
      throw new Error('出战名单包含无效或重复部队');
    const occupied = new Set();
    for (const [index, id] of armyIds.entries()) {
      const cell = session.formation?.[id] || { x: index % 8, y: 4 + Math.floor(index / 8) };
      if (!Number.isInteger(cell.x) || cell.x < 0 || cell.x >= 8 ||
        !Number.isInteger(cell.y) || cell.y < 3 || cell.y >= 6 || occupied.has(`${cell.x},${cell.y}`))
        throw new Error('出战部队布阵位置无效或重叠');
      occupied.add(`${cell.x},${cell.y}`);
    }
    domainOf(next).出战名单 = [...armyIds];
    const result = domainState.runPeerBattle(domainOf(next), session.peerId, armyIds, next, session.formation || {});
    if (!result.ok) throw new Error(result.reason);
    const model = replay.create(result.result, result.settlement);
    session.battle = {
      result: result.result, report: result.settlement, settlement: result.battleSettlement,
      digest: model.digest, narrated: false,
    };
    session.stage = 'battle';
    return next;
  }
  function battleProse(data, text) {
    const next = clone(data);
    const session = sessionOf(next);
    if (session?.stage !== 'battle' || !session.battle || session.battle.narrated) throw new Error('战况已经生成或尚未开战');
    if (!String(text || '').trim()) throw new Error('模型未返回战况正文');
    session.records.push({ stage: 'battle', action: '', text: String(text).trim() });
    session.battle.narrated = true;
    return next;
  }
  function aftermath(data, text) {
    const next = clone(data);
    const session = sessionOf(next);
    if (session?.stage !== 'battle' || !session.battle?.narrated) throw new Error('请先生成战况叙述');
    if (!String(text || '').trim()) throw new Error('模型未返回战后正文');
    session.records.push({ stage: 'aftermath', action: '', text: String(text).trim() });
    session.stage = 'aftermath';
    return next;
  }
  function abort(data) {
    const next = clone(data);
    if (sessionOf(next)?.battle) throw new Error('战斗已经结算，不可放弃；请完成战后纪实');
    if (next.cryptLord) delete next.cryptLord.domainCampaign;
    return next;
  }
  function finish(data) {
    if (sessionOf(data)?.stage !== 'aftermath') throw new Error('战后尚未完成');
    const next = clone(data);
    delete next.cryptLord.domainCampaign;
    return next;
  }
  function exportText(data) {
    const session = sessionOf(data);
    if (session?.stage !== 'aftermath') throw new Error('战役尚未结束');
    const spoils = session.battle?.settlement?.spoils;
    return [
      '[系统指令] 前端已完成领地战役。请将下列纪实衔接为连贯正文，不得改变既定胜负、战损与战利品；本轮不要重新检定。',
      spoils?.名称 ? `特殊战利品【${spoils.名称}】：${spoils.设定}。如何处置仅由 <User> 决定。` : '',
      '【战役纪实】', ...session.records.map(item => item.text),
    ].filter(Boolean).join('\n\n');
  }
  function context(data, story, action = '') {
    const domain = domainOf(data);
    const session = sessionOf(data);
    const peer = domainState.peersOf(domain).find(item => item.id === session.peerId);
    const armies = domainState.deployListOf(domain).map(id => domainState.findArmy(domain, id))
      .filter(Boolean).map(item => `${item.名称 || item.id}：${(item.编成 || []).map(stack => `${stack.兵种}×${stack.数量}`).join('、')}`);
    const enemy = (peer?.军队 || []).map(item => `${item.名称 || item.id}：${(item.编成 || []).map(stack => `${stack.兵种}×${stack.数量}`).join('、')}`);
    const outcome = session.battle?.settlement;
    const raw = String(story || '');
    const narrative = raw.match(/<gametxt\b[^>]*>([\s\S]*?)<\/gametxt>/i)?.[1] ||
      raw.replace(/<(?:UpdateVariable|thinking|reasoning|analysis)\b[^>]*>[\s\S]*?<\/(?:UpdateVariable|thinking|reasoning|analysis)>/gi, '');
    return [
      `【领地】${domain.领地名 || '未命名'}（${domain.地点 || '未知'}，${domain.线路 || ''}线 ${domain.等级} 级，人口 ${domain.人口}）`,
      `【对阵】${session.peerName} · ${session.field}`,
      `【我方编成】\n${armies.join('\n') || '（尚未编成）'}`,
      `【敌方编成】\n${enemy.join('\n') || '（未知）'}`,
      `【当前处境】${session.absenceReason || '（未核验）'}`,
      `【近期原生正文】\n${narrative.slice(-12000)}`,
      `【战役剧情】\n${session.records.map(item => item.text).join('\n\n') || '（无）'}`,
      session.battle ? `【战报要点】\n${session.battle.digest}\n【结算结果】${outcome.winner === 'A' ? '我方获胜' : outcome.winner === 'B' ? '我方战败' : '平局'}；减员：${outcome.casualties.join('、') || '无'}；${outcome.canPromote ? '可晋升' : '尚不可晋升'}\n【特殊战利品】${outcome.spoils ? `${outcome.spoils.名称}：${outcome.spoils.设定}` : '（无）'}` : '',
      action ? `【玩家行动】${action}` : '',
    ].filter(Boolean).join('\n');
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
    const raw = String(typeof response === 'string' ? response : response?.content || '').trim();
    if (!raw) throw new Error('战役模型返回空内容');
    return raw;
  }
  async function checkAbsence(data, story) {
    const domain = domainOf(data);
    const session = sessionOf(data);
    if (!session || session.battle || (session.checked && !['return', 'muster'].includes(session.stage))) throw new Error('不能在此阶段重新核验');
    const raw = await request(
      `你是领地出征校验官。玩家领地在【${domain.地点}】。只依据材料判断玩家此刻是否在领地且能亲自统兵。材料不足一律未通过。只输出 <裁定>通过或未通过</裁定><理由>一句话</理由>。`,
      context(data, story),
    );
    return verdict(data, raw);
  }
  const boundaries = {
    return: '归返：只写脱身和路途，不抵达领地，不集结、不交战。',
    muster: '集结：只写点兵备战，不开拔、不交战。',
    march: '行军：只写沿途与补给，不抵达战场，不写伤亡。',
    parley: '阵前：只写对峙、叫阵和劝降，不接战、不写胜负伤亡。',
    aftermath: '战后：只写既定胜负后的救治、清点与班师；不改战损，不替 <User> 处置战利品。',
    advance_return: '玩家已点击集结军队：写从当前处境归返并抵达领地，不点兵、不开拔。',
    advance_depart: '玩家已点击率军出发：写点齐兵马正式开拔，不抵达战场，不交战。',
    advance_arrive: '玩家已点击列阵对峙：写抵达战场并列阵，不交战、不写伤亡。',
    advance_battle: '沙盘已结算：严格按战报要点先后写战况，不改胜负、部队存亡或损失。只写到胜负已分，不清点。',
    advance_aftermath: '胜负已定：清点伤亡俘降，收束战场。不改变结算，不擅自接管产业。',
    advance_aftermath_spoils: '胜负已定：清点伤亡俘降，然后将特殊战利品呈至 <User> 面前听凭处置。不得替 <User> 决定、令其逃脱或改变结算。',
  };
  async function narrate(data, story, key, action = '') {
    const session = sessionOf(data);
    if (!session?.checked) throw new Error('先核验是否在场');
    const system = `你是「独立领地」战役叙事者。${boundaries[key]} 只依据提供的事实，以原生正文的人称输出 600–900 字中文叙事，只能包在 <战役正文></战役正文> 中。不得掷骰、重新结算、虚构胜负；严禁跨阶段演绎。`;
    if (!boundaries[key]) throw new Error('未知战役阶段');
    const raw = await request(system, context(data, story, action));
    const body = raw.match(/<战役正文(?:\s[^>]*)?>([\s\S]*?)<\/战役正文>/i)?.[1]?.trim();
    if (!body) throw new Error('模型未返回战役正文标签，阶段未推进');
    return body.replace(/<(?:thinking|reasoning|analysis)\b[^>]*>[\s\S]*?<\/(?:thinking|reasoning|analysis)>/gi, '').trim();
  }
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, ready: true }),
    stages, labels, sessionOf, start, verdict, record, position, selectArmy, settle, battleProse, aftermath,
    abort, finish, exportText, context, checkAbsence, narrate,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* already released */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
