(() => {
  'use strict';

  const KEY = 'cryptLord.divinationState';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error('[' + KEY + '] shared/contract.js 尚未加载');
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const defaults = modules['cryptLord.divinationPresets'];
  if (!defaults) throw new Error(`[${KEY}] 原版占卜方案尚未加载`);
  const PRESET_BOOK = '2历史孔隙';
  const PRESET_ENTRY = '[快窗方案]';
  const contexts = new WeakMap();
  const subscriptions = [];
  let disposed = false, epoch = 0, generating = false, queue = Promise.resolve();
  const check = (guard, token = epoch) => {
    if (disposed || generating || token !== epoch || modules[KEY] !== api || guard && !guard())
      throw new DOMException('占卜已取消或正文正在生成，请重新读取', 'AbortError');
  };
  async function readPages(host, guard, token) {
    const rows = structuredClone(await host.getChatMessages('0-{{lastMessageId}}'));
    check(guard, token);
    const pages = structuredClone(await host.getChatMessages('0-{{lastMessageId}}', { include_swipes: true }));
    check(guard, token);
    if (!Array.isArray(rows) || !Array.isArray(pages) ||
      rows.some(row => !Number.isInteger(row.message_id) || row.message_id < 0) ||
      new Set(rows.map(row => row.message_id)).size !== rows.length) throw Error('原生消息页不可读取');
    return { rows: rows.sort((a, b) => a.message_id - b.message_id), pages };
  }
  async function loadContext(guard) {
    const token = epoch;
    check(guard, token);
    const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
    check(guard, token);
    const source = await readPages(host, guard, token), floor = source.rows.at(-1);
    if (floor?.role !== 'assistant' || floor.is_hidden || !floor.data?.stat_data ||
      typeof floor.data.stat_data !== 'object' || Array.isArray(floor.data.stat_data))
      throw Error('当前末楼没有可用的 assistant 角色状态，请等待正文完成');
    if (JSON.stringify(source) !== JSON.stringify(await readPages(host, guard, token)))
      throw Error('聊天、楼层正文或变量已变化，请重新开始占卜');
    const normalizer = modules['cryptLord.responseNormalizer'];
    if (!normalizer?.normalize || modules['cryptLord.hostApi'] !== host) throw Error('占卜原生来源服务已变化');
    const result = { id: floor.message_id, stat: structuredClone(floor.data.stat_data),
      story: normalizer.normalize(floor.message).message.slice(-20000) };
    contexts.set(result, { token, source, host, normalizer });
    return result;
  }
  async function assertContext(context, guard) {
    const ticket = contexts.get(context);
    if (!ticket) throw Error('占卜来源无效，请重新开始');
    check(guard, ticket.token);
    if (modules['cryptLord.hostApi'] !== ticket.host ||
      modules['cryptLord.responseNormalizer'] !== ticket.normalizer ||
      JSON.stringify(ticket.source) !== JSON.stringify(await readPages(ticket.host, guard, ticket.token)))
      throw Error('聊天、楼层正文或变量已变化，请重新开始占卜');
    check(guard, ticket.token);
    return true;
  }

  const STORAGE_KEYS = Object.freeze({
    API_URL: 'fast_relay_api_url',
    API_KEY: 'fast_relay_api_key',
    MODEL: 'fast_relay_api_model',
    BTN_POS: 'fast_relay_btn_pos',
    JOURNEY_COUNT: 'fast_relay_journey_count',
  });

// BEGIN ORIGINAL DIVINATION
function originalRules(random = Math.random) {
  const Math = Object.create(globalThis.Math);
  Math.random = random;
  class FastRelayWindow {
static PRESET_VERSION = 8;
static MAX_PUSHES = 4;
static MAX_SUCCESSES = 2;
static CLARITY = { 0: '无', 1: '精准片段', 2: '精确完整' };
static TRUTH_POOLS = {
    polar: ['true', 'false', 'partial', 'undetermined'],
    which_set: ['member', 'outside', 'empty'],
    which_person: ['self', 'known', 'unknown', 'plural', 'none'],
    which_thing: ['known', 'unknown', 'plural', 'absent', 'undetermined'],
    which_place: ['here', 'near', 'far', 'beyond', 'nowhere', 'undetermined'],
    which_time: ['now', 'soon', 'later', 'already', 'never', 'undetermined'],
    which_degree: ['zero', 'low', 'mid', 'high', 'undetermined'],
    which_manner: ['force', 'covert', 'procedure', 'ability', 'chance', 'none', 'undetermined'],
    which_reason: ['intended', 'unintended', 'structural', 'compelled', 'none', 'undetermined'],
  };
static TRUTH_LABELS = {
    true: '命题成立', false: '命题不成立', partial: '部分成立', undetermined: '不可判定',
    member: '是集合内某一成员', outside: '不在给定集合内', empty: '无（预设失败）',
    self: '问卜者自身', known: '某一已知具体对象', unknown: '存在但未识别/不在已知清单',
    plural: '多个，非单一', none: '无（预设失败）', absent: '无物',
    here: '就在参照处', near: '近但不在参照处', far: '远（可定位世界内）',
    beyond: '超出可定位范围', nowhere: '无位置',
    now: '落在此刻（正在/该立刻）', soon: '落在近际（即将/稍候）', later: '落在远期（尚早/长期后再）',
    already: '已落在过去（已发生/时机已过）', never: '不落在有效线上（不会发生/无合适时机）',
    zero: '无/零', low: '低', mid: '中', high: '高',
    force: '直接强制/暴力', covert: '隐匿/欺骗/绕开', procedure: '规则内途径（交涉/程序/交易）',
    ability: '能力/仪式/非凡手段', chance: '偶然/无蓄意方法',
    intended: '主体有意', unintended: '有主体但非本意', structural: '结构/环境/制度使然',
    compelled: '被强制（胁迫/污染/失控）',
  };
getPromptParam() {
    return `你是诡秘之主世界观下的「占卜定参」助手。本回合只做：问句分类 + 标定 DC，不写真实结论、不走完整检定。

【绝对禁止】
- 禁止计算成功率阈值、掷骰、判定请求块、启示内容、真实答案
- 禁止为玩家预设「A或B或C」式答案菜单并当作可选真实

【问句类型】必须从下列中选一，写入 <问句类型>：
polar | alternative | which_set | which_person | which_thing | which_place | which_time | which_degree | which_manner | which_reason | other

口诀：
1. 答案只需是/否（对一命题）→ polar
2. 从已知名单指认且允许「都不在」→ which_set
3. 谁/物/处/时/量级/方式/原因 → 对应 which_*
4. 玩家在用预设选项菜单发问（A还是B还是C）→ alternative
5. 无法归入以上 → other（禁止硬塞 polar 凑数）

另写 <命题摘要>：中性改写议题，去掉诱导措辞。

【基础DC】正整数。综合具体度、对象序列差、敏感度等。
【反占卜】是/否；为是时再给 <反占卜DC>。

必须输出：
<问句类型>...</问句类型>
<命题摘要>...</命题摘要>
<基础DC>正整数</基础DC>
<反占卜>是或否</反占卜>
（反占卜为是时）<反占卜DC>正整数</反占卜DC>

极短回复。`;
  }
getPromptRitual() {
    return `你是诡秘之主世界观下的「占卜仪式」助手。难度与检定、本局真实均已由前端完成。禁止讨论或修改 DC、阈值、骰点、真实主轴。

【成功时】
用户消息含【本局真实】。你必须严格按该真实演绎，按【清晰度】展开，禁止改判真实。
- 精准片段：具体但断裂、不连续的信息碎片
- 精确完整：清晰、连贯、可执行的完整结论

【失败/大失败时】
用户消息会要求无启示。只写空白/受阻/摆针不动/梦境无像；禁止任何事实性内容，禁止编造「不准的情报」或误导。

反占卜失败：可短写被察觉/压力感（不要算数）。反占卜成功：仅未被察觉。

打标签：<过程>...</过程>；成功时再打 <启示>...</启示>；失败时 <启示>无</启示>。
可选：<风险提示> <状态线索>
2～8 句。禁止现代算命口吻与长篇正文。`;
  }
getPromptTruthCandidates() {
    return `你是诡秘之主世界观下的「真实候选」生成器。本回合只生成互斥候选，不定最终答案、不占卜、不检定。

【工作顺序——必须遵守】
1) 先写 <命题锁定>：一句话复述你在裁决的精确命题（不得扩写对象或主张）。
2) 再写 <否决清单>：对前端给出的每个主轴判定可否成立；不可成立则否决并写理由。
3) 最后写 <真实候选>：仅为未否决主轴各写恰好一条候选（一主轴一条）。

【否决 ≠ 改写】
不合理就整格否决，禁止用更「好玩」的邻近事实顶替。
反例（禁止）：把「是不是真神本源」改写成「有神性污染/碎片/关联」来凑 true 或 partial。
否决是正确输出，不是失败。宁可少候选，不可续写凑数。

【禁止续写/引导】
- 禁止被玩家原句的期望、恐惧、修辞带着写「更可能成立」。
- 成立与不成立的表述须同样认真、篇幅接近（约 1～3 句）。
- 禁止在 false 里塞「但是另有惊天真相」类新钩子。
- 禁止把 undetermined 写成「其实是，只是看不清」。
- 禁止引入与命题无关的新实体、新阴谋；<边界>写「无」。

【输出格式】
<命题锁定>...</命题锁定>
<否决清单>
  <否决><主轴>轴id</主轴><理由>...</理由></否决>
  ...
</否决清单>
<真实候选>
  <候选><主轴>轴id</主轴><表述>...</表述><边界>无</边界></候选>
  ...
</真实候选>

主轴 id 必须使用前端给出的列表中的英文 id，不要翻译。`;
  }
buildDefaultPresets() {
    return [{
      id: 'divination-pendulum',
      name: '占卜',
      version: FastRelayWindow.PRESET_VERSION,
      promptParam: this.getPromptParam(),
      promptRitual: this.getPromptRitual(),
      promptTruthCandidates: this.getPromptTruthCandidates(),
      tags: [
        { name: '问句类型', mode: 'replace' },
        { name: '命题摘要', mode: 'replace' },
        { name: '基础DC', mode: 'replace' },
        { name: '反占卜', mode: 'replace' },
        { name: '反占卜DC', mode: 'replace' },
        { name: '定参说明', mode: 'replace' },
        { name: '过程', mode: 'append' },
        { name: '启示', mode: 'append' },
        { name: '风险提示', mode: 'append' },
        { name: '状态线索', mode: 'replace' },
        { name: '占卜语句', mode: 'replace' },
        { name: '占卜方法', mode: 'replace' },
      ],
      exportShell: '[系统指令]:前端已完成一轮「占卜」互动演算。请根据下列【占卜简报】演绎完整占卜场景与结果。注意：前端已预先完成占卜结果演算，占卜结果已成事实，本轮无需且严禁进行任何检定。\n\n',
      integrateTemplate: 'divination_v7',
    }];
  }
phaseSystemPrompt() {
    const p = this.currentPreset || {};
    if (this.phase === 'param') return p.promptParam || this.getPromptParam();
    if (this.phase === 'truth_gen') return p.promptTruthCandidates || this.getPromptTruthCandidates();
    return p.promptRitual || this.getPromptRitual();
  }
normalizeQuestionType(raw) {
    const s = String(raw || '').trim().toLowerCase().replace(/\s+/g, '_');
    const map = {
      polar: 'polar', '极性': 'polar', '是否': 'polar', '是非': 'polar',
      alternative: 'alternative', '选择': 'alternative', '选项': 'alternative',
      which_set: 'which_set', '集合': 'which_set', 'which-set': 'which_set',
      which_person: 'which_person', '人': 'which_person', '谁': 'which_person',
      which_thing: 'which_thing', '物': 'which_thing', '什么': 'which_thing',
      which_place: 'which_place', '处': 'which_place', '方位': 'which_place', '哪里': 'which_place',
      which_time: 'which_time', '时': 'which_time', '时机': 'which_time', '何时': 'which_time',
      which_degree: 'which_degree', '程度': 'which_degree', '量级': 'which_degree',
      which_manner: 'which_manner', '方式': 'which_manner', '如何': 'which_manner',
      which_reason: 'which_reason', '原因': 'which_reason', '为何': 'which_reason',
      other: 'other', '其他': 'other', '其它': 'other',
    };
    if (map[s]) return map[s];
    if (FastRelayWindow.TRUTH_POOLS[s]) return s;
    return null;
  }
shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
normalizePrimaryId(raw, type) {
    const s = String(raw || '').trim().toLowerCase().replace(/\s+/g, '_');
    const pool = FastRelayWindow.TRUTH_POOLS[type] || [];
    if (pool.includes(s)) return s;
    const aliases = {
      '成立': 'true', '是': 'true', '真': 'true', '肯定': 'true',
      '不成立': 'false', '否': 'false', '假': 'false', '否定': 'false',
      '部分': 'partial', '部分成立': 'partial',
      '不可判定': 'undetermined', '不明': 'undetermined', '未知': 'unknown',
      '成员': 'member', '集合外': 'outside', '空': 'empty',
      '自己': 'self', '已知': 'known', '多人': 'plural', '无': 'none',
      '无物': 'absent', '此处': 'here', '近': 'near', '远': 'far',
      '之外': 'beyond', '无处': 'nowhere',
      '此刻': 'now', '不久': 'soon', '较晚': 'later', '已过': 'already', '永不': 'never',
      '零': 'zero', '低': 'low', '中': 'mid', '高': 'high',
      '强制': 'force', '隐匿': 'covert', '程序': 'procedure', '能力': 'ability', '偶然': 'chance',
      '有意': 'intended', '无意': 'unintended', '结构': 'structural', '强制驱使': 'compelled',
    };
    const mapped = aliases[String(raw || '').trim()] || aliases[s];
    if (mapped && pool.includes(mapped)) return mapped;
    return null;
  }
parseTruthCandidateResponse(text, type) {
    const pool = new Set(FastRelayWindow.TRUTH_POOLS[type] || []);
    const vetoed = new Set();
    const vetoRe = /<否决[^>]*>[\s\S]*?<主轴[^>]*>\s*([^<]+?)\s*<\/主轴>[\s\S]*?<\/否决>/gi;
    let vm;
    while ((vm = vetoRe.exec(text)) !== null) {
      const id = this.normalizePrimaryId(vm[1], type);
      if (id) vetoed.add(id);
    }
    const candidates = [];
    const seen = new Set();
    const candRe = /<候选[^>]*>([\s\S]*?)<\/候选>/gi;
    let cm;
    while ((cm = candRe.exec(text)) !== null) {
      const block = cm[1];
      const axisM = block.match(/<主轴[^>]*>\s*([^<]+?)\s*<\/主轴>/i);
      const narrM = block.match(/<表述[^>]*>([\s\S]*?)<\/表述>/i);
      if (!axisM || !narrM) continue;
      const primary = this.normalizePrimaryId(axisM[1], type);
      const narrative = (narrM[1] || '').trim();
      if (!primary || !pool.has(primary) || vetoed.has(primary) || seen.has(primary) || !narrative) continue;
      seen.add(primary);
      candidates.push({ primary, narrative });
    }
    return { vetoed: [...vetoed], candidates };
  }
pickTruthFromCandidates(candidates, type, proposition) {
    if (!candidates || !candidates.length) return null;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return {
      type,
      primary: pick.primary,
      proposition: proposition || '',
      narrative: pick.narrative || '',
    };
  }
formatTruthForModel(pack, clarity) {
    if (!pack) return '';
    const label = FastRelayWindow.TRUTH_LABELS[pack.primary] || pack.primary;
    let s = `【本局真实·类型 ${pack.type}】主轴=${pack.primary}（${label}）\n`;
    if (pack.narrative) s += `【真实表述】${pack.narrative}\n`;
    s += `【清晰度】${clarity}\n`;
    s += `【命题摘要】${pack.proposition || this.propositionSummary || ''}\n`;
    s += `必须严格按上述真实与表述演绎，禁止改判，禁止发明候选列表中未给出的其它可能。`;
    return s;
  }
stripTruthForDisplay(text) {
    return String(text || '')
      .replace(/【本局真实[^\n]*】[^\n]*\n?/g, '')
      .replace(/【真实表述】[^\n]*\n?/g, '')
      .replace(/【清晰度】[^\n]*\n?/g, '')
      .replace(/必须严格按上述真实[^\n]*\n?/g, '')
      .trim();
  }
getPlayerStats() {
    const sd = this.game?.currentMvuState?.stat_data || {};
    const spiritCur = Number(sd.当前灵性 ?? sd.灵性 ?? 0) || 0;
    const luck = Number(sd.运气 ?? 0) || 0;
    return { spiritCur, luck, attrSum: spiritCur + spiritCur };
  }
calcThreshold(attrSum, dc, luck) {
    if (!dc || dc <= 0) return 1;
    const ratio = attrSum / dc;
    const luckFactor = 1 - 1 / (1 + 0.02 * luck);
    const raw = 40 + 40 * (ratio - 1) + 20 * luckFactor * ratio;
    return Math.max(1, Math.round(raw));
  }
stageCoeff() {
    if (this.successCount <= 0) return 1.0;
    return 1.1;
  }
antiBonusRatio() {
    if (this.antiFailCount <= 0) return 0;
    if (this.antiFailCount === 1) return 0.1;
    return 0.1 + (this.antiFailCount - 1) * 0.2;
  }
getEffectiveDivDc() {
    if (!this.baseDc) return null;
    return Math.max(1, Math.round(this.baseDc * this.stageCoeff() * (1 + this.antiBonusRatio())));
  }
resolveCheck(dc) {
    const { attrSum, luck, spiritCur } = this.getPlayerStats();
    const threshold = this.calcThreshold(attrSum, dc, luck);
    const roll = Math.floor(Math.random() * 100) + 1;
    let resultKey;
    let success;
    if (roll <= 5) {
      resultKey = '命运的眷顾（大成功）';
      success = true;
    } else if (roll >= 95) {
      resultKey = '失控预兆（大失败）';
      success = false;
    } else if (threshold > 100) {
      resultKey = '完美掌控（完胜）';
      success = true;
    } else if (roll <= threshold) {
      resultKey = threshold >= 80 ? '完美掌控（完胜）' : '勉力成功（险胜）';
      success = true;
    } else {
      resultKey = '尝试失败（失败）';
      success = false;
    }
    return { dc, attrSum, luck, spiritCur, threshold, roll, resultKey, success };
  }
previewRates() {
    const { attrSum, luck, spiritCur } = this.getPlayerStats();
    const divDc = this.getEffectiveDivDc();
    const divTh = divDc ? this.calcThreshold(attrSum, divDc, luck) : null;
    let antiTh = null;
    if (this.hasAntiDiv && this.antiDc) {
      antiTh = this.calcThreshold(attrSum, this.antiDc, luck);
    }
    return { spiritCur, luck, divDc, divTh, antiTh, stage: this.stageCoeff(), antiBonus: this.antiBonusRatio() };
  }
parseAndApplyParams() {
    const last = [...this.chatMessages].reverse().find(m => m.role === 'assistant');
    const text = last?.content || '';
    const typeM = text.match(/<问句类型[^>]*>\s*([^<]+)\s*<\/问句类型>/i);
    if (!typeM) return { ok: false, error: '定参失败：未解析到问句类型' };
    const qType = this.normalizeQuestionType(typeM[1]);
    if (!qType) return { ok: false, error: '定参失败：问句类型无法识别，请重试' };
    this.questionType = qType;

    const sumM = text.match(/<命题摘要[^>]*>([\s\S]*?)<\/命题摘要>/i);
    this.propositionSummary = (sumM?.[1] || '').trim() || this.statement;

    if (qType === 'alternative') {
      return {
        ok: true,
        abort: true,
        abortReason: '占卜失败：占卜方式不规范（不可预设选项式发问）',
      };
    }
    if (qType === 'other') {
      return {
        ok: true,
        abort: true,
        abortReason: '你的提问无法分类（被AI分类为其他），请联系诡秘卡作者，反馈问题',
      };
    }

    const baseM = text.match(/<基础DC[^>]*>\s*(\d+)\s*<\/基础DC>/i);
    if (!baseM) return { ok: false, error: '定参失败：未解析到有效基础DC' };
    this.baseDc = parseInt(baseM[1], 10);
    if (!this.baseDc || this.baseDc < 1) return { ok: false, error: '定参失败：基础DC无效' };

    const antiFlag = text.match(/<反占卜[^>]*>\s*([^<]+)\s*<\/反占卜>/i);
    const flag = (antiFlag?.[1] || '否').trim();
    this.hasAntiDiv = /^(是|有|true|yes)$/i.test(flag);
    if (this.hasAntiDiv) {
      const antiDcM = text.match(/<反占卜DC[^>]*>\s*(\d+)\s*<\/反占卜DC>/i);
      this.antiDc = antiDcM ? parseInt(antiDcM[1], 10) : null;
      if (!this.antiDc || this.antiDc < 1) {
        this.hasAntiDiv = false;
        this.antiDc = null;
      }
    } else {
      this.antiDc = null;
    }
    return { ok: true, abort: false };
  }
buildPendingRitual() {
    const nextPush = this.pushCount + 1;
    if (nextPush > FastRelayWindow.MAX_PUSHES) return null;
    const divDc = this.getEffectiveDivDc();
    const divRes = this.resolveCheck(divDc);
    let antiRes = null;
    let nextAntiFailCount = this.antiFailCount;
    if (this.hasAntiDiv && this.antiDc) {
      antiRes = this.resolveCheck(this.antiDc);
      if (!antiRes.success) nextAntiFailCount += 1;
    }
    let nextSuccessCount = this.successCount;
    if (divRes.success) nextSuccessCount = Math.min(FastRelayWindow.MAX_SUCCESSES, this.successCount + 1);
    const clarity = FastRelayWindow.CLARITY[nextSuccessCount] || '无';
    const targetClarity = divRes.success ? clarity : '无启示';
    const prop = this.propositionSummary || this.statement;
    let userText = `【仪式推进 第${nextPush}次】\n`;
    userText += `【占卜检定结论：${divRes.resultKey}】\n`;
    if (antiRes) {
      userText += antiRes.success
        ? `【反占卜检定结论：成功（未被察觉）】\n`
        : `【反占卜检定结论：失败（难度已加重）】\n`;
    } else {
      userText += `【反占卜：本局无】\n`;
    }
    userText += `【命题摘要】${prop}\n方法：${this.method}\n`;
    if (divRes.success) {
      userText += this.formatTruthForModel(this.truthPack, targetClarity) + '\n';
      userText += `请短演并打标签。禁止改判真实与检定。`;
    } else {
      userText += `【本环要求：无启示】占卜失败，只写空白/受阻，禁止任何事实。打 <启示>无</启示>。`;
    }
    return {
      push: nextPush,
      div: divRes,
      anti: antiRes,
      nextSuccessCount,
      nextAntiFailCount,
      clarity: targetClarity,
      statusClarity: clarity,
      userText,
      displayText: this.stripTruthForDisplay(userText),
    };
  }
commitPendingRitual(pending) {
    this.pushCount = pending.push;
    this.successCount = pending.nextSuccessCount;
    this.antiFailCount = pending.nextAntiFailCount;
    this.roundLogs.push({
      push: pending.push,
      div: pending.div,
      anti: pending.anti,
      antiFailCount: pending.nextAntiFailCount,
      successCount: pending.nextSuccessCount,
      clarity: pending.clarity,
    });
    this.pendingRitual = null;
  }
buildExportReport() {
    const bag = this.tagBag;
    const shell = this.currentPreset?.exportShell
      || '[系统指令]:前端已完成一轮「占卜」互动演算。请根据下列【占卜简报】演绎完整占卜场景与结果。注意：前端已预先完成占卜结果演算，占卜结果已成事实，本轮无需且严禁进行任何检定。\n\n';
    const statement = (bag['占卜语句'] || [])[0] || this.statement;
    const method = (bag['占卜方法'] || [])[0] || this.method;
    const clarity = FastRelayWindow.CLARITY[Math.min(FastRelayWindow.MAX_SUCCESSES, this.successCount)] || '无';
    const incomplete = this.successCount < FastRelayWindow.MAX_SUCCESSES;
    const revelations = (bag['启示'] || []).filter(r => r && r !== '无');
    const process = (bag['过程'] || []).join('\n- ');
    const risks = (bag['风险提示'] || []).join('\n');

    let body = '【占卜简报】\n';
    body += `方法：${method}\n`;
    body += `语句：${statement}\n`;
    body += `反占卜：${this.hasAntiDiv ? `是（DC ${this.antiDc}，失败次数 ${this.antiFailCount}）` : '否'}\n`;
    body += `最高清晰度：${clarity}${incomplete ? '（未问尽）' : '（已问尽）'}\n`;
    if (process) body += `过程：\n- ${process}\n`;
    body += `启示：\n`;
    if (revelations.length) {
      revelations.forEach((r, i) => { body += `- [${i + 1}] ${r}\n`; });
    } else {
      body += `- 占卜失败，无任何启示。\n`;
    }
    if (incomplete) body += `风险提示：信息未问尽，仅基于「${clarity}」档导出。\n`;
    if (risks) body += `其他风险：${risks}\n`;
    const state = (bag['状态线索'] || [])[0];
    if (state) body += `状态线索：${state}\n`;
    return shell + body;
  }
mergeTag(name, value, mode) {
    if (!value) return;
    if (!this.tagBag[name]) this.tagBag[name] = [];
    if (mode === 'replace') this.tagBag[name] = [value];
    else this.tagBag[name].push(value);
  }
extractTagsFromText(text) {
    const tags = this.currentPreset?.tags || this.buildDefaultPresets()[0].tags;
    tags.forEach(tag => {
      const re = new RegExp(`<${tag.name}[^>]*>([\\s\\S]*?)<\\/${tag.name}>`, 'gi');
      let m;
      while ((m = re.exec(text)) !== null) {
        const val = (m[1] || '').trim();
        if (val) this.mergeTag(tag.name, val, tag.mode || 'append');
      }
    });
  }
  }
  return FastRelayWindow;
}
const Original = originalRules();
const MAX_PUSHES = Original.MAX_PUSHES, MAX_SUCCESSES = Original.MAX_SUCCESSES;
const CLARITY = Object.freeze(Original.CLARITY);
const TRUTH_POOLS = Object.freeze(Original.TRUTH_POOLS);
const TRUTH_LABELS = Object.freeze(Original.TRUTH_LABELS);
// END ORIGINAL DIVINATION

  function instance(session = {}, stats = {}, preset, random) {
    const Rules = random ? originalRules(random) : Original;
    return Object.assign(Object.create(Rules.prototype), session, {
      game: { currentMvuState: { stat_data: {
        当前灵性: Number(stats.spiritCur ?? 0), 运气: Number(stats.luck ?? 0),
      } } },
      currentPreset: preset || defaultPreset(),
    });
  }
  function visibleReply(text) {
    const clean = String(text || '').replace(/<(thinking|reasoning|think|safe)(?:\s+[^>]*)?>[\s\S]*?<\/\1\s*>/gi, '');
    const unclosed = clean.search(/<(?:thinking|reasoning|think|safe)(?:\s|>)/i);
    return unclosed < 0 ? clean : clean.slice(0, unclosed);
  }
  function defaultPreset() { return Object.create(Original.prototype).buildDefaultPresets()[0]; }
  const normalizeQuestionType = raw => instance().normalizeQuestionType(raw);
  const normalizePrimaryId = (raw, type) => instance().normalizePrimaryId(raw, type);
  const shuffleArray = rows => instance().shuffleArray(rows);
  const calcThreshold = (sum, dc, luck = 0) => instance().calcThreshold(sum, dc, luck);
  const stageCoeff = successCount => instance({ successCount }).stageCoeff();
  const antiBonusRatio = antiFailCount => instance({ antiFailCount }).antiBonusRatio();
  const getEffectiveDivDc = session => instance(session).getEffectiveDivDc();
  const parseTruthCandidateResponse = (text, type) => instance().parseTruthCandidateResponse(visibleReply(text), type);
  const pickTruthFromCandidates = (rows, type, proposition) =>
    instance().pickTruthFromCandidates(rows, type, proposition);
  const formatTruthForModel = (pack, clarity, propositionSummary) =>
    instance({ propositionSummary }).formatTruthForModel(pack, clarity);
  const stripTruthForDisplay = text => instance().stripTruthForDisplay(text);
  const previewRates = (session, stats) => instance(session, stats).previewRates();
  function resolveCheck(options = {}) {
    const { dc, attrSum, luck = 0, spiritCur = 0, roll } = options;
    if (roll != null && (!Number.isInteger(roll) || roll < 1 || roll > 100))
      throw Error('占卜骰点必须为1至100的整数');
    const rules = instance({}, { spiritCur, luck }, null, roll == null ? null : () => (roll - 1) / 100);
    if (attrSum !== undefined) rules.getPlayerStats = () => ({ attrSum, luck, spiritCur });
    return rules.resolveCheck(dc);
  }
  function mergeTag(tagBag, name, value, mode = 'append') {
    if (['__proto__', 'constructor', 'prototype'].includes(name)) throw Error('占卜标签名称无效');
    instance({ tagBag }).mergeTag(name, value, mode);
  }
  function extractTagsFromText(text, tagBag, preset) {
    instance({ tagBag }, {}, normalizePreset(preset || defaultPreset())).extractTagsFromText(visibleReply(text));
  }
  function parseAndApplyParams(text, session) {
    const rules = instance({ ...session, chatMessages: [{ role: 'assistant', content: visibleReply(text) }] });
    const result = rules.parseAndApplyParams();
    if (result.ok) {
      for (const key of ['questionType', 'propositionSummary', 'baseDc', 'hasAntiDiv', 'antiDc'])
        session[key] = rules[key];
      if (result.abort) session.sessionAbortReason = result.abortReason;
    }
    return result;
  }
  function buildPendingRitual(session, stats = {}, random) {
    if (session.pendingRitual) return session.pendingRitual;
    if (session.successCount >= MAX_SUCCESSES || session.pushCount >= MAX_PUSHES) return null;
    if (!session.baseDc || !session.truthPack) throw Error('本局尚未定参或锁定真实');
    return instance(session, stats, null, random).buildPendingRitual();
  }
  function commitPendingRitual(session, pending) {
    if (!pending || pending.push !== session.pushCount + 1 ||
      session.pendingRitual && session.pendingRitual !== pending) throw Error('本环结算已失效');
    const rules = instance(session);
    rules.commitPendingRitual(pending);
    for (const key of ['pushCount', 'successCount', 'antiFailCount', 'pendingRitual'])
      session[key] = rules[key];
  }
  const buildExportReport = (session, preset) => instance(session, {}, preset).buildExportReport();

  function normalizePreset(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
      typeof value.id !== 'string' || !value.id.trim() ||
      typeof value.name !== 'string' || !value.name.trim() ||
      !['promptParam', 'promptTruthCandidates', 'promptRitual'].every(key =>
        typeof value[key] === 'string' && value[key].trim())) throw Error('快窗方案缺少占卜阶段提示词');
    if (value.version != null && (!Number.isInteger(value.version) || value.version > Original.PRESET_VERSION))
      throw Error('不支持此快窗方案版本');
    const tags = value.tags ?? defaultPreset().tags;
    if (!Array.isArray(tags) || tags.length > 40 ||
      tags.some(tag => !tag || typeof tag.name !== 'string' ||
        !/^[a-zA-Z\u4e00-\u9fff][a-zA-Z0-9_\u4e00-\u9fff]{0,39}$/.test(tag.name) ||
        ['constructor', 'prototype'].includes(tag.name) ||
        tag.mode != null && !['append', 'replace'].includes(tag.mode)) ||
      new Set(tags.map(tag => tag.name)).size !== tags.length) throw Error('快窗方案标签格式无效');
    return { ...structuredClone(value), tags: structuredClone(tags) };
  }

  function createSession(options = {}) {
    return {
      phase: 'fill',
      statement: String(options.statement || '').trim(),
      method: String(options.method || '灵摆').trim(),
      questionType: null,
      propositionSummary: '',
      baseDc: null,
      hasAntiDiv: false,
      antiDc: null,
      antiFailCount: 0,
      successCount: 0,
      pushCount: 0,
      truthPack: null,
      truthCandidates: [],
      pendingRitual: null,
      chatMessages: [],
      tagBag: Object.create(null),
      roundLogs: [],
      isBusy: false,
      sessionAbortReason: null,
    };
  }

  async function loadPresets(guard) {
    const token = epoch;
    check(guard, token);
    const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
    check(guard, token);
    const ensureHost = () => {
      check(guard, token);
      if (modules['cryptLord.hostApi'] !== host) throw Error('占卜原生来源服务已变化，请重新读取');
    };
    if (typeof host.getWorldbook !== 'function') return { presets: [defaultPreset()], revision: null };
    let entries;
    try { entries = await host.getWorldbook(PRESET_BOOK); }
    catch (error) {
      if (/未能找到世界书|世界书不存在|worldbook not found|lorebook not found/i.test(String(error?.message || error))) {
        ensureHost();
        return { presets: [defaultPreset()], revision: null };
      }
      throw error;
    }
    ensureHost();
    if (!Array.isArray(entries)) throw Error('快窗方案世界书不可读取');
    const matching = entries.filter(row => row.comment === PRESET_ENTRY || row.name === PRESET_ENTRY);
    if (matching.length > 1) throw new Error('快窗方案条目重复，请先整理世界书');
    const entry = matching[0];
    if (!entry) return { presets: [defaultPreset()], revision: null };
    let parsed;
    try { parsed = JSON.parse(entry.content); }
    catch { throw new Error('快窗方案 JSON 损坏'); }
    if (!Array.isArray(parsed) || !parsed.length) throw Error('快窗方案缺少占卜阶段提示词');
    const normalized = parsed.map(normalizePreset);
    if (new Set(normalized.map(row => row.id)).size !== normalized.length) throw Error('快窗方案ID重复');
    const presets = normalized.some(row => row.version < 8) ? [defaultPreset()] : normalized;
    return { presets, revision: { uid: entry.uid, content: entry.content, entry: structuredClone(entry) } };
  }

  function savePresets(presets, expectedRevision, isCurrent = () => true) {
    const token = epoch, values = structuredClone(presets), revision = structuredClone(expectedRevision);
    const task = queue.then(() => commitPresets(values, revision, isCurrent, token));
    queue = task.catch(() => {});
    return task;
  }
  async function commitPresets(presets, expectedRevision, isCurrent, token) {
    check(isCurrent, token);
    if (!Array.isArray(presets) || !presets.length) throw new Error('占卜方案不完整');
    const normalized = presets.map(normalizePreset);
    if (new Set(normalized.map(row => row.id)).size !== normalized.length) throw Error('快窗方案ID重复');
    const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
    check(isCurrent, token);
    const fresh = await loadPresets(isCurrent);
    if (JSON.stringify(fresh.revision) !== JSON.stringify(expectedRevision)) throw new Error('快窗方案已变化，请重新读取');
    check(isCurrent, token);
    const content = JSON.stringify(normalized, null, 2);
    if (fresh.revision && fresh.revision.uid == null) throw Error('快窗方案缺少 UID，无法安全修改');
    try {
      await host.updateWorldbookWith(PRESET_BOOK, entries => {
        check(isCurrent, token);
        if (modules['cryptLord.hostApi'] !== host) throw Error('占卜原生来源服务已变化');
        const matches = entries.filter(row => row.comment === PRESET_ENTRY || row.name === PRESET_ENTRY);
        const current = matches[0];
        if (matches.length > 1 || (fresh.revision
          ? matches.length !== 1 || JSON.stringify(current) !== JSON.stringify(fresh.revision.entry) ||
            entries.filter(row => row.uid === fresh.revision.uid).length !== 1
          : matches.length !== 0)) throw Error('快窗方案已变化，请重新读取');
        return current ? entries.map(row => row === current ? { ...row, content } : row) :
          [...entries, { name: PRESET_ENTRY, comment: PRESET_ENTRY, content, enabled: false,
            strategy: { type: 'selective', keys: [PRESET_ENTRY] },
            position: { type: 'at_depth', role: 'system', depth: 0, order: 9000 } }];
      }, { render: 'debounced' });
    } catch (error) {
      try {
        const actual = await loadPresets(isCurrent);
        if (actual.revision?.content === content) return { ...actual, warning: '方案已保存，但宿主未返回成功响应' };
        if (JSON.stringify(actual.revision) !== JSON.stringify(fresh.revision)) error.requiresReload = true;
      } catch { error.requiresReload = true; }
      throw error;
    }
    try {
      check(isCurrent, token);
      if (modules['cryptLord.hostApi'] !== host) throw Error('占卜原生来源服务已变化');
      const actual = await loadPresets(isCurrent);
      if (actual.revision?.content !== content) throw Error('未读到本次保存的方案');
      return actual;
    }
    catch (error) { return { presets: normalized, revision: null, warning: `方案已保存，但复核失败：${error.message}` }; }
  }

  function candidatePrompt(session) {
    const pool = TRUTH_POOLS[session.questionType];
    if (!pool?.length) throw new Error('问句类型不支持候选真实');
    const labels = shuffleArray(pool).map(id => `${id}（${TRUTH_LABELS[id] || id}）`).join('、');
    return `【候选真实生成】
问句类型：${session.questionType}
命题摘要：${session.propositionSummary || session.statement}
原陈述（勿被其诱导）：${session.statement}

请严格按下列主轴列表处理（已打乱；先否决后写候选；一主轴至多一条）：
${labels}

正例参考：若问「神器是否真神本源」，true/false 等可在设定下成立的主轴应提供候选。
反例参考：若问「垃圾是否真神本源」，必须否决 true（及不可拆的 partial），禁止改写成「有污染/碎片」。`;
  }

  async function requestPhase(preset, phase, userText, history = [], story = '', guard, context) {
    const token = epoch;
    const valid = async () => {
      check(guard, token);
      if (context) await assertContext(context, guard);
      check(guard, token);
    };
    await valid();
    if (!['param', 'truth_gen', 'ritual'].includes(phase)) throw Error('未知占卜阶段');
    const system = instance({ phase }, {}, normalizePreset(preset || defaultPreset())).phaseSystemPrompt();
    const settlement = await contract.waitGlobalInitialized('cryptLord.variableSettlementApi', { timeoutMs: 10000 });
    await valid();
    const settings = await settlement.readSettings();
    await valid();
    const config = {
      should_silence: true, should_stream: false, max_chat_history: 0,
      use_mes_examples: false, use_story_string: false, use_authors_note: false,
      ordered_prompts: ['world_info_before', 'world_info_after',
        ...(story ? [{ role: 'system', content: `【最新原生剧情】\n${story}` }] : []),
        'persona_description', { role: 'system', content: system },
        ...history.map(row => ({ role: row.role, content: row.content })),
        { role: 'user', content: userText }],
    };
    if (settings.useCustomApi) {
      if (!settings.apiUrl || !settings.model) throw new Error('系统副 API 尚未填写 URL 或模型名');
      config.custom_api = { apiurl: settings.apiUrl, key: settings.apiKey, model: settings.model, source: 'openai' };
    }
    const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
    await valid();
    if (modules['cryptLord.variableSettlementApi'] !== settlement || modules['cryptLord.hostApi'] !== host)
      throw Error('占卜模型服务已变化，请重新读取');
    const response = await host.generateRaw(config);
    await valid();
    if (modules['cryptLord.variableSettlementApi'] !== settlement || modules['cryptLord.hostApi'] !== host)
      throw Error('占卜模型服务已变化，请重新读取');
    const text = typeof response === 'string' ? response : response?.content;
    if (!String(text || '').trim()) throw new Error('模型没有返回内容');
    return visibleReply(text);
  }

  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents() || {};
  const bind = (event, callback) => { if (event) subscriptions.push(after.bindEvent(event, callback)); };
  bind(events.CHAT_CHANGED, () => { epoch++; generating = false; });
  bind(events.GENERATION_STARTED, (type, options, dryRun) => {
    if (!['quiet', 'dryRun'].includes(type) && !options?.dryRun && !dryRun) { epoch++; generating = true; }
  });
  for (const event of new Set([events.GENERATION_ENDED, events.GENERATION_STOPPED].filter(Boolean)))
    bind(event, () => { generating = false; });

  function validateRitual(text, pending) {
    text = visibleReply(text);
    const processes = [...String(text).matchAll(/<过程[^>]*>([\s\S]*?)<\/过程>/gi)];
    const insights = [...String(text).matchAll(/<启示[^>]*>([\s\S]*?)<\/启示>/gi)];
    if (processes.length > 1 || insights.length > 1) throw Error('仪式回复有重复过程或启示，已保留本环骰点');
    const process = processes[0]?.[1]?.trim();
    const insight = insights[0]?.[1]?.trim();
    if (!process || !insight) throw new Error('仪式回复缺少过程或启示，可重试本环且不重掷');
    if (!pending.div.success && insight !== '无') throw new Error('检定失败却返回事实性启示，已拒绝并保留本环骰点');
    if (pending.div.success && insight === '无') throw new Error('检定成功却无启示，已保留本环骰点');
    return { process, insight };
  }

  const api = Object.freeze({
    status() {
      return Object.freeze({
        key: KEY,
        ready: !disposed,
        handlers: Object.freeze(['fast-relay', 'divination-v5']),
      });
    },
    STORAGE_KEYS,
    MAX_PUSHES,
    MAX_SUCCESSES,
    CLARITY,
    TRUTH_POOLS,
    TRUTH_LABELS,
    originalRules,
    normalizePreset,
    previewRates,
    normalizeQuestionType,
    normalizePrimaryId,
    shuffleArray,
    calcThreshold,
    stageCoeff,
    antiBonusRatio,
    getEffectiveDivDc,
    resolveCheck,
    parseTruthCandidateResponse,
    pickTruthFromCandidates,
    formatTruthForModel,
    stripTruthForDisplay,
    createSession,
    mergeTag,
    extractTagsFromText,
    parseAndApplyParams,
    buildPendingRitual,
    commitPendingRitual,
    buildExportReport,
    defaultPreset,
    loadPresets,
    loadContext,
    assertContext,
    savePresets,
    candidatePrompt,
    requestPhase,
    validateRitual,
    dispose() {
      disposed = true; epoch++;
      subscriptions.forEach(item => item?.stop());
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
