(() => {
  "use strict";

  const KEY = "cryptLord.detectiveState";
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const rules = modules["cryptLord.detectiveRules"];
  if (!rules) throw new Error(`[${KEY}] 原版案件规则尚未加载`);
  const STEPS = Object.freeze([
    { key: "gen1", block: "事件真相_基线", store: "基线", label: "核诡骨架" },
    { key: "gen2", block: "事件真相_嫌疑", store: "嫌疑", label: "嫌疑与人设" },
    { key: "gen3", block: "事件真相_时间轴", store: "时间轴", label: "全员时间轴" },
    { key: "gen4", block: "事件真相_线索", store: "线索", label: "线索系统" },
    { key: "gen5", block: "事件真相_成稿", store: "成稿", label: "自检与汇编" },
  ]);
  const FOLD_TAGS = ["reasoning", "danmaku_raw", "thinking", "think", "action"];
  const BOOK = "2历史孔隙";
  const PRESET_ENTRY = "[事件真相方案]";
  const CUSTOM_ENTRY = "[事件真相自定义提示词]";

  function record(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function getCases(mvuState) {
    const list = mvuState?.world_data?.案件列表 || mvuState?.stat_data?.案件列表;
    if (Array.isArray(list)) return list;
    if (record(list)) return Object.values(list).filter(v => record(v) && v.$meta === undefined);
    return [];
  }

  function saveCases(mvuState, cases) {
    const next = structuredClone(mvuState || {});
    if (!next.world_data) next.world_data = {};
    next.world_data.案件列表 = cases;
    return next;
  }

  function caseById(data, id) {
    const item = getCases(data).find(c => c.id === id);
    if (!item) throw new Error("未找到指定案件。");
    return item;
  }
  function changeCase(data, id, edit) {
    const cases = structuredClone(getCases(data));
    const item = cases.find(c => c.id === id);
    if (!item) throw new Error("未找到指定案件。");
    edit(item);
    item.updatedAt = Date.now();
    return { mvuState: saveCases(data, cases), caseItem: item };
  }
  function newInvestigation(data, { mode = "本格", roleCount = 5 } = {}) {
    if (!["本格", "变格"].includes(mode) || ![4, 5, 6].includes(Number(roleCount))) throw new Error("题材或角色数无效");
    const item = {
      id: `case_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: "未命名案件", mode, roleCount: Number(roleCount), status: "生成中",
      draw: null, truth: {}, checkResult: "", clues: [], records: [],
      verdictReport: "", genProgress: 0, createdAt: Date.now(), updatedAt: Date.now(),
    };
    return { mvuState: saveCases(data, [...getCases(data), item]), caseItem: item };
  }
  function removeCase(data, id) {
    if (!getCases(data).some(item => item.id === id)) throw new Error("未找到指定案件。");
    return saveCases(data, getCases(data).filter(item => item.id !== id));
  }
  function drawCase(data, id, draw = rules.draw(caseById(data, id).roleCount)) {
    return changeCase(data, id, item => {
      if (item.status !== "生成中") throw new Error("探案开始后不能重抽");
      Object.assign(item, { draw, truth: {}, clues: [], records: [], genProgress: 0, checkResult: "" });
    });
  }
  function block(raw, tag) {
    const escaped = String(tag).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return String(raw || "").match(new RegExp(`<${escaped}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"))?.[1]?.trim() || "";
  }
  function parseClues(text) {
    return [...String(text || "").matchAll(/<线索\s+([^>]*)>([\s\S]*?)<\/线索>/gi)]
      .map(([, attrs, inner]) => ({
        id: attrs.match(/编号="([^"]+)"/)?.[1] || "",
        threshold: 1, count: 0, unlocked: false, phenom: block(inner, "现象"),
      })).filter(item => item.id);
  }
  function genVars(item, index) {
    const base = { 题材模式: item.mode, 角色数: item.roleCount };
    if (index === 0) return { ...base, 抽取结果: rules.formatDraw(item.draw) };
    if (index === 1) return { ...base, 四轴抽卡结果: rules.formatAxes(item.draw), 基线: item.truth.基线 || "" };
    if (index === 2) return { ...base, 基线: item.truth.基线 || "", 阶段3产出: item.truth.嫌疑 || "" };
    if (index === 3) return { ...base, 基线: item.truth.基线 || "", 时间轴: item.truth.时间轴 || "" };
    return { ...base, 基线: item.truth.基线 || "", 阶段3产出: item.truth.嫌疑 || "",
      时间轴: item.truth.时间轴 || "", 线索表: item.truth.线索 || "" };
  }
  function truthFull(item) {
    return item.truth?.成稿 || ["基线", "嫌疑", "时间轴", "线索"]
      .map(key => item.truth?.[key] || "").filter(Boolean).join("\n\n");
  }
  function recentText(item) {
    return (item.records || []).filter(row => row.role === "world" && row.text &&
      !row.text.includes("本回合演绎失败")).slice(-200).map(row => row.text).join("\n\n") || "（尚无对话）";
  }
  function unlockedText(item) {
    return item.clues?.filter(row => row.unlocked).map(row => `- ${row.id}｜${row.phenom}`).join("\n") || "（暂无已解锁线索）";
  }
  function promptFor(item, stage, action = "", prompts = rules.prompts) {
    const step = STEPS[Number(stage)];
    if (step) {
      if (!item.draw || Number(stage) > item.genProgress) throw new Error("请先抽取并完成上一步");
      return { system: prompts.sys[step.key], user: rules.fillPrompt(prompts.user[step.key], genVars(item, Number(stage))) };
    }
    if (item.genProgress < STEPS.length) throw new Error("请先完成五阶段案情生成");
    const common = { 事件真相: truthFull(item), 题材模式: item.mode };
    if (stage === "intro") {
      if (item.status !== "生成中" || item.records.length) throw new Error("案件已经开始");
      return { system: prompts.sys.intro, user: rules.fillPrompt(prompts.user.intro, common) };
    }
    if (item.status !== "探案中") throw new Error("案件尚未开始或已经结案");
    if (!String(action).trim()) throw new Error("请输入行动或结案结论");
    if (stage === "turn") {
      const turns = item.records.filter(row => row.role === "player").length + 1;
      return { system: prompts.sys.turn, user: rules.fillPrompt(prompts.user.turn, {
        ...common, 世界状态: `第 ${turns} 回合；已解锁线索 ${item.clues.filter(c => c.unlocked).length}/${item.clues.length}`,
        已解锁线索: unlockedText(item), 最近对话: `<探案剧情>\n${recentText(item)}\n</探案剧情>`, 玩家行动: action,
      }) };
    }
    if (stage === "verdict") return { system: prompts.sys.verdict, user: rules.fillPrompt(prompts.user.verdict, {
      ...common, 最近对话: `<侦查经过>\n${recentText(item)}\n</侦查经过>`, 玩家结论: action,
    }) };
    throw new Error("未知案件阶段");
  }
  function validPrompts(value) {
    return record(value) && record(value.sys) && record(value.user) &&
      [...STEPS.map(step => step.key), "intro", "turn", "verdict"]
        .every(key => typeof value.sys[key] === "string" && typeof value.user[key] === "string");
  }
  async function configuration() {
    const host = await contract.waitGlobalInitialized("cryptLord.hostApi", { timeoutMs: 10000 });
    if (typeof host.getWorldbook !== "function") return { prompts: rules.prompts, custom: {}, revisions: {
      [PRESET_ENTRY]: null, [CUSTOM_ENTRY]: null,
    } };
    let entries = [];
    try { entries = await host.getWorldbook(BOOK); }
    catch (error) {
      if (!/未能找到世界书|世界书不存在|worldbook not found|lorebook not found/i.test(String(error?.message || error))) throw error;
    }
    const find = name => (entries || []).find(row => row.name === name || row.comment === name);
    const preset = find(PRESET_ENTRY);
    const custom = find(CUSTOM_ENTRY);
    let prompts = rules.prompts;
    if (preset?.content) {
      let parsed;
      try { parsed = JSON.parse(preset.content); } catch { throw new Error("事件真相方案不是有效 JSON"); }
      if (!validPrompts(parsed)) throw new Error("事件真相方案缺少阶段提示词");
      prompts = parsed.version >= rules.prompts.version ? parsed : rules.prompts;
    }
    let options = {};
    if (custom?.content) {
      try { options = JSON.parse(custom.content); } catch { throw new Error("事件真相自定义提示词不是有效 JSON"); }
      if (!record(options)) throw new Error("事件真相自定义提示词必须是对象");
    }
    return { prompts, custom: options, revisions: {
      [PRESET_ENTRY]: preset ? { uid: preset.uid, content: preset.content } : null,
      [CUSTOM_ENTRY]: custom ? { uid: custom.uid, content: custom.content } : null,
    } };
  }
  async function saveConfiguration(config, expected, isCurrent = () => true) {
    if (!validPrompts(config.prompts)) throw new Error("提示词方案不完整");
    if (!record(config.custom)) throw new Error("自定义提示词格式无效");
    const host = await contract.waitGlobalInitialized("cryptLord.hostApi", { timeoutMs: 10000 });
    if (!host.updateWorldbookWith || !host.createWorldbookEntries) throw new Error("当前宿主不支持世界书编辑");
    for (const [name, content] of [
      [PRESET_ENTRY, JSON.stringify(config.prompts, null, 2)],
      [CUSTOM_ENTRY, JSON.stringify(config.custom, null, 2)],
    ]) {
      if (!isCurrent()) throw new Error("聊天或窗口已变化");
      const current = await configuration();
      const revision = current.revisions[name];
      if (JSON.stringify(revision) !== JSON.stringify(expected[name])) throw new Error(`${name} 已被修改，请重新读取`);
      if (revision) {
        if (revision.uid == null) throw new Error(`${name} 缺少 UID`);
        let changed = false;
        await host.updateWorldbookWith(BOOK, entries => entries.map(row => {
          if (row.uid !== revision.uid) return row;
          if (row.content !== revision.content || !isCurrent()) throw new Error(`${name} 已变化`);
          changed = true;
          return { ...row, content };
        }), { render: "debounced" });
        if (!changed) throw new Error(`${name} 已被移除`);
      } else {
        await host.createWorldbookEntries(BOOK, [{
          name, comment: name, content, enabled: false,
          strategy: { type: "selective", keys: [name] },
          position: { type: "at_depth", role: "system", depth: 0, order: 9000 },
        }]);
      }
      expected[name] = { uid: revision?.uid, content };
    }
    return configuration();
  }
  function customFor(options, stage) {
    const custom = options || {};
    const part = typeof stage === "number" ? "生成" : stage === "intro" ? "引子" : "后续";
    return {
      before: String(custom[part] || "").trim(),
      after: typeof stage === "number" ? "" :
        String(stage === "intro" ? custom.思维链_引子 ?? rules.defaultCotIntro :
          custom.思维链_探案 ?? custom.思维链 ?? rules.defaultCotPlay).trim(),
      folds: Array.isArray(custom.折叠标签) ? custom.折叠标签 : FOLD_TAGS,
    };
  }
  function worldRecord(raw, required = true, foldTags = FOLD_TAGS) {
    let text = block(raw, "世界正文");
    if (!text && required) throw new Error("模型未返回 <世界正文>，请重试");
    const foldBlocks = [];
    for (const tag of foldTags) {
      if (!/^[\w\u4e00-\u9fff-]+$/.test(tag)) continue;
      const re = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, "gi");
      for (const match of String(raw || "").matchAll(re)) foldBlocks.push({ tag, xml: match[0] });
      text = text.replace(re, "");
    }
    return { role: "world", text: text.trim(), foldBlocks };
  }
  function applyStage(data, id, stage, raw, action = "", foldTags = FOLD_TAGS) {
    return changeCase(data, id, item => {
      promptFor(item, stage, action);
      const step = STEPS[Number(stage)];
      if (step) {
        const content = block(raw, step.block);
        if (!content) throw new Error(`模型未返回 <${step.block}>，可重试本步`);
        if (Number(stage) < item.genProgress) {
          for (const later of STEPS.slice(Number(stage) + 1)) delete item.truth[later.store];
          item.genProgress = Number(stage);
        }
        item.truth[step.store] = content;
        if (stage === 3) item.clues = parseClues(content);
        if (stage === 4) item.checkResult = block(raw, "自检");
        item.genProgress = Number(stage) + 1;
        return;
      }
      if (stage === "intro") {
        item.records.push(worldRecord(raw, true, foldTags));
        item.status = "探案中";
      } else if (stage === "turn") {
        const world = worldRecord(raw, true, foldTags);
        const unlock = block(raw, "解锁线索");
        if (!unlock) throw new Error("模型未返回 <解锁线索>，请重试");
        const ids = unlock.split(/[,，、\s]+/).filter(id => id && id !== "无");
        if (ids.some(id => !item.clues.some(clue => clue.id === id))) throw new Error("模型返回了未知线索编号");
        item.records.push({ role: "player", text: action }, world);
        for (const clue of item.clues) {
          if (ids.includes(clue.id) && !clue.unlocked) { clue.count++; clue.unlocked = true; }
        }
      } else if (stage === "verdict") {
        const report = block(raw, "结案报告");
        const world = worldRecord(raw, true, foldTags);
        if (!report) throw new Error("模型未返回 <结案报告>，请重试");
        item.records.push({ role: "player", text: `【结案结论】${action}` }, world, { role: "report", text: report });
        item.verdictReport = report;
        item.status = "已结案";
      }
    });
  }
  async function request(prompt, customization = {}) {
    const settlement = await contract.waitGlobalInitialized("cryptLord.variableSettlementApi", { timeoutMs: 10000 });
    const settings = await settlement.readSettings();
    const config = {
      should_silence: true, should_stream: false, max_chat_history: 0,
      use_mes_examples: false, use_story_string: false, use_authors_note: false, use_persona: false,
      ordered_prompts: ["world_info_before", "world_info_after",
        ...(customization.before ? [{ role: "system", content: customization.before }] : []),
        { role: "system", content: prompt.system }, { role: "user", content: prompt.user },
        ...(customization.after ? [{ role: "system", content: customization.after }] : [])],
    };
    if (settings.useCustomApi) {
      if (!settings.apiUrl || !settings.model) throw new Error("系统副 API 尚未填写 URL 或模型名");
      config.custom_api = { apiurl: settings.apiUrl, key: settings.apiKey, model: settings.model, source: "openai" };
    }
    const host = await contract.waitGlobalInitialized("cryptLord.hostApi", { timeoutMs: 10000 });
    const response = await host.generateRaw(config);
    return typeof response === "string" ? response : response?.content || "";
  }
  function exportChronicle(item) {
    const worlds = (item.records || []).filter(row => row.role === "world" && row.text)
      .map(row => row.text);
    if (!worlds.length) throw new Error("还没有可导出的世界剧情");
    return "[系统指令]:前端已完成一轮「事件真相」探案演绎。下列【探案纪实】为游戏世界内的完整剧情。请据此润色、衔接为连贯正文；本轮严禁进行任何检定，亦不得揭示玩家未在世界内获知的真相。\n\n【探案纪实】\n" + worlds.join("\n\n");
  }

  function createCase(mvuState, info) {
    const cases = getCases(mvuState);
    const newCase = {
      id: info.id || `case_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: String(info.title || "未命名调查委托").trim(),
      commissioner: String(info.commissioner || "匿名委托人").trim(),
      location: String(info.location || "廷根市").trim(),
      status: "调查中",
      summary: String(info.summary || "正在调查相关涉案线索与异常动向。").trim(),
      reward: String(info.reward || "10 金镑").trim(),
      clues: Array.isArray(info.clues) ? info.clues : [],
      suspects: Array.isArray(info.suspects) ? info.suspects : [],
      conclusion: ""
    };
    cases.push(newCase);
    return { mvuState: saveCases(mvuState, cases), caseItem: newCase };
  }

  function addClue(mvuState, caseId, clue) {
    const cases = getCases(mvuState);
    const target = cases.find(c => c.id === caseId);
    if (!target) throw new Error("未找到指定案件。");
    const clueItem = {
      id: clue.id || `clue_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: String(clue.name || "新发现线索").trim(),
      detail: String(clue.detail || "").trim(),
      location: String(clue.location || target.location).trim(),
      verified: Boolean(clue.verified)
    };
    if (!Array.isArray(target.clues)) target.clues = [];
    target.clues.push(clueItem);
    return { mvuState: saveCases(mvuState, cases), clueItem };
  }

  function toggleClueVerified(mvuState, caseId, clueId) {
    const cases = getCases(mvuState);
    const target = cases.find(c => c.id === caseId);
    if (!target || !Array.isArray(target.clues)) throw new Error("未找到指定案件或线索。");
    const clue = target.clues.find(cl => cl.id === clueId);
    if (!clue) throw new Error("未找到指定线索。");
    clue.verified = !clue.verified;
    return { mvuState: saveCases(mvuState, cases), clue };
  }

  function addSuspect(mvuState, caseId, suspect) {
    const cases = getCases(mvuState);
    const target = cases.find(c => c.id === caseId);
    if (!target) throw new Error("未找到指定案件。");
    const item = {
      id: suspect.id || `suspect_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: String(suspect.name || "嫌疑对象").trim(),
      motive: String(suspect.motive || "暂无明确动机").trim(),
      alibi: String(suspect.alibi || "案发时不知去向").trim(),
      suspicion: String(suspect.suspicion || "中度可疑").trim()
    };
    if (!Array.isArray(target.suspects)) target.suspects = [];
    target.suspects.push(item);
    return { mvuState: saveCases(mvuState, cases), suspect: item };
  }

  function solveCase(mvuState, caseId, conclusion) {
    const cases = getCases(mvuState);
    const target = cases.find(c => c.id === caseId);
    if (!target) throw new Error("未找到指定案件。");
    target.status = "已结案";
    target.conclusion = String(conclusion || "经多方侦查取证，案件真相已查明。").trim();
    return { mvuState: saveCases(mvuState, cases), caseItem: target };
  }

  function buildCaseReport(caseItem) {
    if (!caseItem) return "";
    const verifiedClues = (caseItem.clues || []).filter(c => c.verified).map(c => `「${c.name}」(${c.detail})`).join("、") || "无";
    const suspects = (caseItem.suspects || []).map(s => `${s.name} [嫌疑:${s.suspicion}, 动机:${s.motive}]`).join("；") || "无特定嫌疑人";
    return `【侦探调查简报 · ${caseItem.title}】
委托人：${caseItem.commissioner}
案发地点：${caseItem.location}
案件状态：${caseItem.status}
关键已核实验证线索：${verifiedClues}
重点排查嫌疑人：${suspects}
推理结论 / 结案陈词：${caseItem.conclusion || "案件调查仍在推进中，下一步将针对疑点进行重点盘查。"}
委托报酬：${caseItem.reward}`;
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true }); },
    steps: STEPS, rules, caseById, newInvestigation, removeCase, drawCase,
    block, parseClues, promptFor, applyStage, request, exportChronicle,
    configuration, saveConfiguration, customFor,
    getCases,
    createCase,
    addClue,
    toggleClueVerified,
    addSuspect,
    solveCase,
    buildCaseReport,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    }
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
