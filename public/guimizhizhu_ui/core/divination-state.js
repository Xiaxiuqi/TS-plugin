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

  const STORAGE_KEYS = Object.freeze({
    API_URL: 'fast_relay_api_url',
    API_KEY: 'fast_relay_api_key',
    MODEL: 'fast_relay_api_model',
    BTN_POS: 'fast_relay_btn_pos',
    JOURNEY_COUNT: 'fast_relay_journey_count',
  });

  const MAX_PUSHES = 4;
  const MAX_SUCCESSES = 2;
  const CLARITY = Object.freeze({ 0: '无', 1: '精准片段', 2: '精确完整' });

  const TRUTH_POOLS = Object.freeze({
    polar: ['true', 'false', 'partial', 'undetermined'],
    which_set: ['member', 'outside', 'empty'],
    which_person: ['self', 'known', 'unknown', 'plural', 'none'],
    which_thing: ['known', 'unknown', 'plural', 'absent', 'undetermined'],
    which_place: ['here', 'near', 'far', 'beyond', 'nowhere', 'undetermined'],
    which_time: ['now', 'soon', 'later', 'already', 'never', 'undetermined'],
    which_degree: ['zero', 'low', 'mid', 'high', 'undetermined'],
    which_manner: ['force', 'covert', 'procedure', 'ability', 'chance', 'none', 'undetermined'],
    which_reason: ['intended', 'unintended', 'structural', 'compelled', 'none', 'undetermined'],
  });

  const TRUTH_LABELS = Object.freeze({
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
  });

  function normalizeQuestionType(raw) {
    const s = String(raw || '').trim().toLowerCase().replace(/\s+/g, '_');
    const map = {
      polar: 'polar', '单问': 'polar', '是非': 'polar', '是否': 'polar',
      alternative: 'alternative', '二选': 'alternative', '多选': 'alternative',
      which_set: 'which_set', '范围': 'which_set', 'which-set': 'which_set',
      which_person: 'which_person', '人': 'which_person', '谁': 'which_person',
      which_thing: 'which_thing', '物': 'which_thing', '什么': 'which_thing',
      which_place: 'which_place', '地': 'which_place', '方位': 'which_place', '何处': 'which_place',
      which_time: 'which_time', '时': 'which_time', '时间': 'which_time', '何时': 'which_time',
      which_degree: 'which_degree', '程度': 'which_degree', '多大': 'which_degree',
      which_manner: 'which_manner', '方式': 'which_manner', '怎样': 'which_manner',
      which_reason: 'which_reason', '原因': 'which_reason', '为何': 'which_reason',
      other: 'other', '其他': 'other', '其它': 'other',
    };
    if (map[s]) return map[s];
    if (TRUTH_POOLS[s]) return s;
    return null;
  }

  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function normalizePrimaryId(raw, type) {
    const s = String(raw || '').trim().toLowerCase().replace(/\s+/g, '_');
    const pool = TRUTH_POOLS[type] || [];
    if (pool.includes(s)) return s;
    const aliases = {
      '成立': 'true', '是': 'true', '真': 'true', '肯定': 'true',
      '不成立': 'false', '否': 'false', '假': 'false', '否定': 'false',
      '部分': 'partial', '部分成立': 'partial',
      '不可判定': 'undetermined', '未知': 'undetermined',
      '成员': 'member', '不在集合': 'outside', '空': 'empty',
      '自己': 'self', '已知': 'known', '多个': 'plural', '无': 'none',
      '无物': 'absent', '此处': 'here', '近': 'near', '远': 'far',
      '之外': 'beyond', '无处': 'nowhere',
      '此刻': 'now', '近期': 'soon', '远期': 'later', '已过': 'already', '绝不': 'never',
      '零': 'zero', '低': 'low', '中': 'mid', '高': 'high',
      '强力': 'force', '隐秘': 'covert', '规矩': 'procedure', '非凡': 'ability', '偶然': 'chance',
      '蓄意': 'intended', '无意': 'unintended', '环境': 'structural', '胁迫': 'compelled',
    };
    const mapped = aliases[String(raw || '').trim()] || aliases[s];
    if (mapped && pool.includes(mapped)) return mapped;
    return null;
  }

  function calcThreshold(attrSum, dc, luck) {
    if (!dc || dc <= 0) return 1;
    const ratio = attrSum / dc;
    const luckFactor = 1 - 1 / (1 + 0.02 * (luck || 0));
    const raw = 40 + 40 * (ratio - 1) + 20 * luckFactor * ratio;
    return Math.max(1, Math.round(raw));
  }

  function stageCoeff(successCount) {
    if ((Number(successCount) || 0) <= 0) return 1.0;
    return 1.1;
  }

  function antiBonusRatio(antiFailCount) {
    const count = Number(antiFailCount) || 0;
    if (count <= 0) return 0;
    if (count === 1) return 0.1;
    return 0.1 + (count - 1) * 0.2;
  }

  function resolveCheck(options) {
    const { dc, attrSum = 20, luck = 0, spiritCur = 10, roll: forcedRoll } = options || {};
    const threshold = calcThreshold(attrSum, dc, luck);
    const roll = Number.isInteger(forcedRoll) ? forcedRoll : (Math.floor(Math.random() * 100) + 1);
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

  function parseTruthCandidateResponse(text, type) {
    const pool = new Set(TRUTH_POOLS[type] || []);
    const vetoed = new Set();
    const vetoRe = /<否决[^>]*>[\s\S]*?<主轴[^>]*>\s*([^<]+?)\s*<\/主轴>[\s\S]*?<\/否决>/gi;
    let vm;
    while ((vm = vetoRe.exec(text)) !== null) {
      const id = normalizePrimaryId(vm[1], type);
      if (id) vetoed.add(id);
    }
    const candidates = [];
    const seen = new Set();
    const candRe = /<候选[^>]*>([\s\S]*?)<\/候选>/gi;
    let cm;
    while ((cm = candRe.exec(text)) !== null) {
      const block = cm[1];
      const axisM = block.match(/<主轴[^>]*>\s*([^<]+?)\s*<\/主轴>/i);
      const narrM = block.match(/<表述[^>]*>([\s\S]*?)<\/表述>/i) ||
        block.match(/<叙事[^>]*>([\s\S]*?)<\/叙事>/i);
      if (!axisM || !narrM) continue;
      const primary = normalizePrimaryId(axisM[1], type);
      const narrative = (narrM[1] || '').trim();
      if (!primary || !pool.has(primary) || vetoed.has(primary) || seen.has(primary) || !narrative) continue;
      seen.add(primary);
      candidates.push({ primary, narrative });
    }
    return { vetoed: [...vetoed], candidates };
  }

  function pickTruthFromCandidates(candidates, type, proposition) {
    if (!candidates || !candidates.length) return null;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return {
      type,
      primary: pick.primary,
      proposition: proposition || '',
      narrative: pick.narrative || '',
    };
  }

  function formatTruthForModel(pack, clarity, propSummary) {
    if (!pack) return '';
    const label = TRUTH_LABELS[pack.primary] || pack.primary;
    let s = '【本局真实】类型：' + pack.type + '，主轴=' + pack.primary + '（' + label + '）\n';
    if (pack.narrative) s += '真实叙事：' + pack.narrative + '\n';
    s += '【清晰度】' + clarity + '\n';
    s += '【命题摘要】' + (pack.proposition || propSummary || '') + '\n';
    s += '请严格按该真实演绎启示，禁止改判，禁止引入候选列表中未给出的其它主轴可能。';
    return s;
  }

  function stripTruthForDisplay(text) {
    return String(text || '')
      .replace(/【本局真实】[^\n]*\n?/g, '')
      .replace(/真实叙事：[^\n]*\n?/g, '')
      .replace(/【清晰度】[^\n]*\n?/g, '')
      .replace(/请严格按该真实[^\n]*\n?/g, '')
      .trim();
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

  function mergeTag(tagBag, name, value, mode = 'append') {
    if (!value) return;
    if (!tagBag[name]) tagBag[name] = [];
    if (mode === 'replace') tagBag[name] = [value];
    else tagBag[name].push(value);
  }

  function extractTagsFromText(text, tagBag) {
    const tagNames = ['问句类型', '命题摘要', '基础DC', '反占卜', '反占卜DC', '定参说明', '过程', '启示', '风险提示', '状态线索', '占卜语句', '占卜方法'];
    tagNames.forEach(name => {
      const re = new RegExp('<' + name + '[^>]*>([\\s\\S]*?)<\\/' + name + '>', 'gi');
      let m;
      while ((m = re.exec(text)) !== null) {
        const val = (m[1] || '').trim();
        if (val) mergeTag(tagBag, name, val, (name === '过程' || name === '启示' || name === '风险提示') ? 'append' : 'replace');
      }
    });
  }

  function parseAndApplyParams(text, session) {
    const raw = String(text || '');
    const typeM = raw.match(/<问句类型[^>]*>\s*([^<]+)\s*<\/问句类型>/i);
    if (!typeM) return { ok: false, error: '定参失败：未解析到问句类型' };
    const qType = normalizeQuestionType(typeM[1]);
    if (!qType) return { ok: false, error: '定参失败：问句类型无法识别 (' + typeM[1] + ')' };
    session.questionType = qType;

    const sumM = raw.match(/<命题摘要[^>]*>([\s\S]*?)<\/命题摘要>/i);
    session.propositionSummary = (sumM?.[1] || '').trim() || session.statement;

    if (qType === 'alternative') {
      return { ok: true, abort: true, abortReason: '占卜失败：占卜方式不规范（不可预设选项式发问）' };
    }
    if (qType === 'other') {
      return { ok: true, abort: true, abortReason: '你的提问无法分类（被AI分类为其他），请联系卡作者反馈问题' };
    }

    const baseM = raw.match(/<基础DC[^>]*>\s*(\d+)\s*<\/基础DC>/i);
    if (!baseM) return { ok: false, error: '定参失败：未解析到有效基础DC' };
    session.baseDc = parseInt(baseM[1], 10);
    if (!session.baseDc || session.baseDc < 1) return { ok: false, error: '定参失败：基础DC无效' };

    const antiFlag = raw.match(/<反占卜[^>]*>\s*([^<]+)\s*<\/反占卜>/i);
    const flag = (antiFlag?.[1] || '否').trim();
    session.hasAntiDiv = /^(是|有|true|yes)$/i.test(flag);
    if (session.hasAntiDiv) {
      const antiDcM = raw.match(/<反占卜DC[^>]*>\s*(\d+)\s*<\/反占卜DC>/i);
      session.antiDc = antiDcM ? parseInt(antiDcM[1], 10) : null;
      if (!session.antiDc || session.antiDc < 1) {
        session.hasAntiDiv = false;
        session.antiDc = null;
      }
    } else {
      session.antiDc = null;
    }
    return { ok: true, abort: false };
  }

  function getEffectiveDivDc(session) {
    if (!session.baseDc) return null;
    const coeff = stageCoeff(session.successCount);
    const bonus = antiBonusRatio(session.antiFailCount);
    return Math.max(1, Math.round(session.baseDc * coeff * (1 + bonus)));
  }

  function buildPendingRitual(session, playerStats = {}) {
    const nextPush = session.pushCount + 1;
    if (nextPush > MAX_PUSHES) return null;
    const divDc = getEffectiveDivDc(session);
    const divRes = resolveCheck({
      dc: divDc,
      attrSum: (Number(playerStats.spiritCur) || 10) * 2,
      luck: Number(playerStats.luck) || 0,
      spiritCur: Number(playerStats.spiritCur) || 10,
    });
    let antiRes = null;
    let nextAntiFailCount = session.antiFailCount;
    if (session.hasAntiDiv && session.antiDc) {
      antiRes = resolveCheck({
        dc: session.antiDc,
        attrSum: (Number(playerStats.spiritCur) || 10) * 2,
        luck: Number(playerStats.luck) || 0,
        spiritCur: Number(playerStats.spiritCur) || 10,
      });
      if (!antiRes.success) nextAntiFailCount += 1;
    }
    let nextSuccessCount = session.successCount;
    if (divRes.success) nextSuccessCount = Math.min(MAX_SUCCESSES, session.successCount + 1);
    const clarity = CLARITY[nextSuccessCount] || '无';
    const targetClarity = divRes.success ? clarity : '无启示';
    const prop = session.propositionSummary || session.statement;

    let userText = '【仪式推进 第' + nextPush + '次】\n';
    userText += '【占卜检定结论：' + divRes.resultKey + '】\n';
    if (antiRes) {
      userText += antiRes.success
        ? '【反占卜检定结论：成功（未被察觉）】\n'
        : '【反占卜检定结论：失败（难度已加重）】\n';
    } else {
      userText += '【反占卜：本局无】\n';
    }
    userText += '【命题摘要】' + prop + '\n方法：' + session.method + '\n';
    if (divRes.success) {
      userText += formatTruthForModel(session.truthPack, targetClarity, prop) + '\n';
      userText += '请短演并打标签。禁止改判真实与检定。';
    } else {
      userText += '【本环要求：无启示】占卜失败，只写空白/受阻，禁止任何事实。打 <启示>无</启示>。';
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
      displayText: stripTruthForDisplay(userText),
    };
  }

  function commitPendingRitual(session, pending) {
    if (!pending) return;
    session.pushCount = pending.push;
    session.successCount = pending.nextSuccessCount;
    session.antiFailCount = pending.nextAntiFailCount;
    session.roundLogs.push({
      push: pending.push,
      div: pending.div,
      anti: pending.anti,
      antiFailCount: pending.nextAntiFailCount,
      successCount: pending.nextSuccessCount,
      clarity: pending.clarity,
    });
    session.pendingRitual = null;
  }

  function buildExportReport(session, preset) {
    const bag = session.tagBag || {};
    const shell = preset?.exportShell || defaults.defaultPreset().exportShell;
    const statement = (bag['占卜语句'] || [])[0] || session.statement;
    const method = (bag['占卜方法'] || bag['方法'] || [])[0] || session.method;
    const clarity = CLARITY[Math.min(MAX_SUCCESSES, session.successCount)] || '无';
    const incomplete = session.successCount < MAX_SUCCESSES;
    const revelations = (bag['启示'] || []).filter(r => r && r !== '无');
    const process = (bag['过程'] || []).join('\n- ');
    const risks = (bag['风险提示'] || []).join('\n');

    let body = '【占卜简报】\n';
    body += '方法：' + method + '\n';
    body += '语句：' + statement + '\n';
    body += '反占卜：' + (session.hasAntiDiv ? ('是（DC ' + session.antiDc + '，失败次数 ' + session.antiFailCount + '）') : '否') + '\n';
    body += '最高清晰度：' + clarity + (incomplete ? '（未问尽）' : '（已问尽）') + '\n';
    if (process) body += '过程：\n- ' + process + '\n';
    body += '启示：\n';
    if (revelations.length) {
      revelations.forEach((r, i) => { body += '- [' + (i + 1) + '] ' + r + '\n'; });
    } else {
      body += '- 占卜失败，无任何启示。\n';
    }
    if (incomplete) body += '风险提示：信息未问尽，仅基于「' + clarity + '」档导出。\n';
    if (risks) body += '其他风险：' + risks + '\n';
    const state = (bag['状态线索'] || [])[0];
    if (state) body += '状态线索：' + state + '\n';

    return shell + body;
  }

  function generateRuleParam(statement, method) {
    const text = String(statement || '').trim();
    let qType = 'polar';
    if (/谁|哪位|何人|哪个人/.test(text)) qType = 'which_person';
    else if (/哪里|何处|哪儿|什么地方/.test(text)) qType = 'which_place';
    else if (/何时|几点|什么时间|哪天/.test(text)) qType = 'which_time';
    else if (/怎样|如何|何种方式/.test(text)) qType = 'which_manner';
    else if (/为何|为什么|何种原因/.test(text)) qType = 'which_reason';
    else if (/多少|多大|严重程度|多高/.test(text)) qType = 'which_degree';
    else if (/什么|哪件|何物/.test(text)) qType = 'which_thing';
    else if (/还是|或者/.test(text)) qType = 'alternative';

    const baseDc = 15;
    const hasAnti = /非凡|高位|半神|天使|神明|隐秘|序列[0-4]/.test(text);
    let out = '<问句类型>' + qType + '</问句类型>\n'
      + '<命题摘要>' + text + '</命题摘要>\n'
      + '<基础DC>' + baseDc + '</基础DC>\n'
      + '<反占卜>' + (hasAnti ? '是' : '否') + '</反占卜>';
    if (hasAnti) out += '\n<反占卜DC>18</反占卜DC>';
    return out;
  }

  function generateRuleTruth(type, statement) {
    const pool = TRUTH_POOLS[type] || TRUTH_POOLS.polar;
    const primary = pool[0];
    const label = TRUTH_LABELS[primary] || primary;
    return '<命题锁定>' + statement + '</命题锁定>\n'
      + '<否决清单>\n</否决清单>\n'
      + '<真实候选>\n'
      + '  <候选><主轴>' + primary + '</主轴><叙事>' + statement + '在灵界反映：' + label + '。</叙事><边界>灵界指引明确。</边界></候选>\n'
      + '</真实候选>';
  }

  function generateRuleRitual(pending) {
    if (pending.div.success) {
      return '<过程>灵摆顺畅晃动，灵性光芒收束于眼前。</过程>\n'
        + '<启示>' + (pending.clarity === '精确完整' ? '灵性展示了连贯且确切的画面：' : '灵性浮现出破碎的信息碎片：') + (pending.userText.indexOf('主轴') !== -1 ? '灵界确证目标态势。' : '预示清晰。') + '</启示>';
    }
    return '<过程>灵摆沉重下垂，未产生任何有效振幅，灵性受到阻隔。</过程>\n'
      + '<启示>无</启示>';
  }

  async function loadPresets() {
    const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
    if (typeof host.getWorldbook !== 'function') return { presets: [defaults.defaultPreset()], revision: null };
    let entries;
    try { entries = await host.getWorldbook(PRESET_BOOK); }
    catch (error) {
      if (/未能找到世界书|世界书不存在|worldbook not found|lorebook not found/i.test(String(error?.message || error))) {
        return { presets: [defaults.defaultPreset()], revision: null };
      }
      throw error;
    }
    const matching = (entries || []).filter(row => row.comment === PRESET_ENTRY || row.name === PRESET_ENTRY);
    if (matching.length > 1) throw new Error('快窗方案条目重复，请先整理世界书');
    const entry = matching[0];
    if (!entry) return { presets: [defaults.defaultPreset()], revision: null };
    let parsed;
    try { parsed = JSON.parse(entry.content); }
    catch { throw new Error('快窗方案 JSON 损坏'); }
    if (!Array.isArray(parsed) || !parsed.length || parsed.some(row =>
      typeof row.id !== 'string' || typeof row.name !== 'string' ||
      !['promptParam', 'promptTruthCandidates', 'promptRitual'].every(key => typeof row[key] === 'string' && row[key].trim()))) {
      throw new Error('快窗方案缺少占卜阶段提示词');
    }
    const presets = parsed[0].version < 8 ? [defaults.defaultPreset()] : parsed;
    return { presets, revision: { uid: entry.uid, content: entry.content } };
  }

  async function savePresets(presets, expectedRevision, isCurrent = () => true) {
    if (!Array.isArray(presets) || !presets.length || presets.some(row =>
      !row.id || !row.name || !row.promptParam?.trim() ||
      !row.promptTruthCandidates?.trim() || !row.promptRitual?.trim())) throw new Error('占卜方案不完整');
    const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
    const fresh = await loadPresets();
    if (JSON.stringify(fresh.revision) !== JSON.stringify(expectedRevision)) throw new Error('快窗方案已变化，请重新读取');
    if (!isCurrent()) throw new Error('窗口已关闭或聊天已变化');
    const content = JSON.stringify(presets, null, 2);
    if (fresh.revision) {
      if (fresh.revision.uid == null) throw new Error('快窗方案缺少 UID，无法安全修改');
      let updated = false;
      await host.updateWorldbookWith(PRESET_BOOK, entries => entries.map(row => {
        if (row.uid !== fresh.revision.uid) return row;
        if (row.content !== fresh.revision.content || !isCurrent()) throw new Error('快窗方案已变化');
        updated = true;
        return { ...row, content };
      }), { render: 'debounced' });
      if (!updated) throw new Error('快窗方案已移除');
    } else {
      if (typeof host.createWorldbookEntries !== 'function') throw new Error('宿主不支持创建世界书条目');
      await host.createWorldbookEntries(PRESET_BOOK, [{
        name: PRESET_ENTRY, comment: PRESET_ENTRY, content, enabled: false,
        strategy: { type: 'selective', keys: [PRESET_ENTRY] },
        position: { type: 'at_depth', role: 'system', depth: 0, order: 9000 },
      }]);
    }
    return loadPresets();
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

  async function requestPhase(preset, phase, userText, history = [], story = '') {
    const key = phase === 'param' ? 'promptParam' : phase === 'truth_gen' ? 'promptTruthCandidates' : 'promptRitual';
    const system = preset?.[key] || defaults.defaultPreset()[key];
    const settlement = await contract.waitGlobalInitialized('cryptLord.variableSettlementApi', { timeoutMs: 10000 });
    const settings = await settlement.readSettings();
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
    const response = await host.generateRaw(config);
    const text = typeof response === 'string' ? response : response?.content;
    if (!String(text || '').trim()) throw new Error('模型没有返回内容');
    return text;
  }

  function validateRitual(text, pending) {
    const process = String(text).match(/<过程[^>]*>([\s\S]*?)<\/过程>/i)?.[1]?.trim();
    const insight = String(text).match(/<启示[^>]*>([\s\S]*?)<\/启示>/i)?.[1]?.trim();
    if (!process || !insight) throw new Error('仪式回复缺少过程或启示，可重试本环且不重掷');
    if (!pending.div.success && insight !== '无') throw new Error('检定失败却返回事实性启示，已拒绝并保留本环骰点');
    if (pending.div.success && insight === '无') throw new Error('检定成功却无启示，已保留本环骰点');
    return { process, insight };
  }

  const api = Object.freeze({
    status() {
      return Object.freeze({
        key: KEY,
        ready: true,
        handlers: Object.freeze(['fast-relay', 'divination-v5']),
      });
    },
    STORAGE_KEYS,
    MAX_PUSHES,
    MAX_SUCCESSES,
    CLARITY,
    TRUTH_POOLS,
    TRUTH_LABELS,
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
    generateRuleParam,
    generateRuleTruth,
    generateRuleRitual,
    defaultPreset: defaults.defaultPreset,
    loadPresets,
    savePresets,
    candidatePrompt,
    requestPhase,
    validateRitual,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
