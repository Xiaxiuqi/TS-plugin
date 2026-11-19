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
  const STEPS = Object.freeze(rules.steps.map(step => Object.freeze({
    ...step, label: step.label.replace(/^[①②③④⑤]\s*/, "").replace("（基线）", ""),
  })));
  const FOLD_TAGS = Object.freeze(rules.createRules().customFoldTags);
  const BOOK = "2历史孔隙";
  const PRESET_ENTRY = "[事件真相方案]";
  const CUSTOM_ENTRY = "[事件真相自定义提示词]";
  const sources = new WeakMap(), operations = new WeakMap(), configs = new WeakMap(), subscriptions = [];
  let disposed = false, epoch = 0, generating = false, queue = Promise.resolve();
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function check(guard, token = epoch) {
    if (disposed || generating || token !== epoch || modules[KEY] !== api || guard && !guard())
      throw new DOMException("探案操作已取消，请重新读取", "AbortError");
  }
  async function readPages(host, guard, token) {
    const rows = structuredClone(await host.getChatMessages("0-{{lastMessageId}}"));
    check(guard, token);
    const pages = structuredClone(await host.getChatMessages("0-{{lastMessageId}}", { include_swipes: true }));
    check(guard, token);
    if (!Array.isArray(rows) || !Array.isArray(pages) ||
      rows.some(row => !Number.isInteger(row.message_id) || row.message_id < 0) ||
      new Set(rows.map(row => row.message_id)).size !== rows.length)
      throw Error("原生消息页不可读取");
    return { rows: rows.sort((a, b) => a.message_id - b.message_id), pages };
  }
  async function load(guard) {
    const token = epoch;
    check(guard, token);
    const host = await contract.waitGlobalInitialized("cryptLord.hostApi", { timeoutMs: 10000 });
    check(guard, token);
    const source = await readPages(host, guard, token);
    const floor = source.rows.filter(row => row.role === "assistant" && !row.is_hidden).at(-1);
    if (!floor || !record(floor.data?.stat_data)) throw Error("没有可读取的真实 assistant 角色状态");
    const malformed = [floor.data.world_data?.案件列表, floor.data.stat_data?.案件列表]
      .some(value => value != null && (!Array.isArray(value) && !record(value) ||
        Array.isArray(value) && value.some(item => !record(item))));
    const battle = modules["cryptLord.attributeRecalculation"]?.busyBattle(floor.data) ??
      ["teamBattle", "personalBattle"].some(key => {
        const item = floor.data.cryptLord?.[key];
        return item?.status === "active" ||
          key === "teamBattle" && ["finished", "ended"].includes(item?.status) && !item.settled ||
          key === "personalBattle" && item?.status === "finished" && item.result === "victory" &&
            item.enemy?.npcKey && !item.experienceClaimed;
      });
    const reason = floor.message_id === 0 || source.rows.at(-1)?.message_id !== floor.message_id
      ? "历史楼层只读，请等待最新 assistant 正文完成"
      : malformed ? "案件列表格式异常，请先修复原生变量"
      : battle ? "请先结束并结算战斗" : "";
    if (!same(source, await readPages(host, guard, token))) throw Error("聊天、正文或变量已变化，请重新读取案件");
    const store = modules["cryptLord.stateStore"], normalizer = modules["cryptLord.responseNormalizer"];
    if (modules["cryptLord.hostApi"] !== host || !store?.writeAssistantData || !normalizer?.normalize)
      throw Error("探案原生来源或保存服务已变化，请重新读取");
    const loaded = { data: structuredClone(floor.data), message: floor.message, messageId: floor.message_id,
      story: normalizer.normalize(floor.message).message.slice(-20000), editable: !reason, reason };
    sources.set(loaded, { token, host, store, normalizer, source, floor: structuredClone(floor), reason });
    return loaded;
  }
  async function assertSource(loaded, guard, writable = true) {
    const ticket = sources.get(loaded);
    try {
      if (!ticket) throw Error("案件来源无效，请重新读取");
      check(guard, ticket.token);
      if (writable && ticket.reason) throw Error(ticket.reason);
      if (modules["cryptLord.hostApi"] !== ticket.host || modules["cryptLord.stateStore"] !== ticket.store ||
        modules["cryptLord.responseNormalizer"] !== ticket.normalizer ||
        !same(ticket.source, await readPages(ticket.host, guard, ticket.token)))
        throw Error("聊天、正文或变量已变化，请重新读取案件");
      check(guard, ticket.token);
      return structuredClone(ticket.floor);
    } catch (error) {
      if (error.name !== "AbortError") error.code = "DETECTIVE_SOURCE_CHANGED";
      throw error;
    }
  }
  async function prepareOperation(loaded, action, guard) {
    const floor = await assertSource(loaded, guard);
    if (action.config) await assertConfig(action.config, guard);
    let result;
    if (action.type === "create") result = newInvestigation(floor.data, action.options);
    else if (action.type === "draw") {
      let data = floor.data;
      if (action.options) data = changeCase(data, action.id, item => {
        if (item.status !== "生成中") throw Error("探案开始后不能重抽");
        const { mode, roleCount } = action.options;
        if (!["本格", "变格"].includes(mode) || ![4, 5, 6].includes(Number(roleCount)))
          throw Error("题材或角色数无效");
        Object.assign(item, { mode, roleCount: Number(roleCount) });
      }).mvuState;
      result = drawCase(data, action.id);
    } else if (action.type === "remove") result = { mvuState: removeCase(floor.data, action.id) };
    else if (action.type === "stage") result = applyStage(floor.data, action.id, action.stage,
      action.raw, action.action, action.folds);
    else throw Error("未知探案操作");
    const prepared = { caseId: result.caseItem?.id || action.id, type: action.type };
    operations.set(prepared, { loaded, ticket: sources.get(loaded), data: result.mvuState, config: action.config, used: false });
    return prepared;
  }
  function commitOperation(prepared, guard) {
    const task = queue.then(async () => {
      const pending = operations.get(prepared);
      if (!pending || pending.used) throw Error("探案结果已保存或不可确认，请重新读取");
      const { loaded, ticket } = pending;
      const verify = async () => {
        await assertSource(loaded, guard);
        if (pending.config) await assertConfig(pending.config, guard);
      };
      await verify();
      const valid = () => {
        check(guard, ticket.token);
        return modules["cryptLord.hostApi"] === ticket.host && modules["cryptLord.stateStore"] === ticket.store &&
          modules["cryptLord.responseNormalizer"] === ticket.normalizer;
      };
      let data;
      try {
        data = await ticket.store.writeAssistantData(ticket.floor.message_id,
          structuredClone(pending.data), "affected", verify, valid,
          { detectiveSource: loaded, detectiveConfig: pending.config });
      } catch (error) {
        // A lost response must not repeat generation or replay a possibly committed case mutation.
        try { await verify(); }
        catch (conflict) {
          pending.used = true; conflict.requiresReload = true;
          conflict.message = `保存响应未确认，请重新读取，不要重复提交：${conflict.message}`;
          throw conflict;
        }
        throw error;
      }
      pending.used = true;
      sources.delete(loaded);
      try {
        if (!valid()) throw Error("保存服务已变化");
        const actual = await load(guard), receipt = sources.get(actual);
        const expected = structuredClone(ticket.source);
        for (const row of expected.rows) if (row.message_id === ticket.floor.message_id) row.data = structuredClone(data);
        for (const row of expected.pages) if (row.message_id === ticket.floor.message_id) {
          if (Object.hasOwn(row, "data")) row.data = structuredClone(data);
          if (Array.isArray(row.swipes_data)) row.swipes_data[row.swipe_id].data = structuredClone(data);
        }
        if (!same(expected, receipt.source)) throw Error("保存后的消息页已变化");
        return { data, loaded: actual };
      } catch (error) {
        return { data, loaded: null, warning: `已保存，但复核失败：${error.message || error}` };
      }
    });
    queue = task.catch(() => {});
    return task;
  }

  function record(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function getCases(mvuState) {
    const list = mvuState?.world_data?.案件列表 || mvuState?.stat_data?.案件列表;
    if (Array.isArray(list)) return list.filter(record);
    if (record(list)) return Object.entries(list).filter(([key, value]) =>
      !key.startsWith("$") && record(value) && value.$meta === undefined).map(([, value]) => value);
    return [];
  }

  function saveCases(mvuState, cases) {
    const next = structuredClone(mvuState || {});
    const owner = next.world_data?.案件列表 != null || next.stat_data?.案件列表 == null
      ? (next.world_data ||= {}) : next.stat_data;
    if (record(owner.案件列表)) {
      const original = owner.案件列表;
      const mapped = Object.fromEntries(Object.entries(original).filter(([key, value]) =>
        key.startsWith("$") || record(value) && value.$meta !== undefined));
      for (const item of cases) {
        const existing = Object.keys(original).find(key => original[key]?.id === item.id);
        mapped[existing || item.id] = structuredClone(item);
      }
      owner.案件列表 = mapped;
    } else owner.案件列表 = structuredClone(cases);
    return next;
  }

  function caseById(data, id) {
    const matches = getCases(data).filter(c => c.id === id);
    if (matches.length > 1) throw Error("案件编号重复，请先整理案件列表");
    const item = matches[0];
    if (!item) throw new Error("未找到指定案件。");
    return item;
  }
  function validateCase(item) {
    if (typeof item.id !== "string" || !item.id ||
      ["__proto__", "constructor", "prototype"].includes(item.id)) throw Error("案件编号无效");
    if (item.version != null && item.version !== 1) throw Error("不支持此案件版本");
    if (item.status === "调查中") throw Error("旧手工调查委托不是原版侦探本，请保留或删除后新建");
    if (!["生成中", "探案中", "已结案"].includes(item.status) ||
      !Number.isInteger(item.genProgress) || item.genProgress < 0 || item.genProgress > STEPS.length ||
      !record(item.truth) || !Array.isArray(item.clues) || !Array.isArray(item.records))
      throw Error("案件结构无效");
    return item;
  }
  function changeCase(data, id, edit) {
    caseById(data, id);
    const cases = structuredClone(getCases(data));
    const item = cases.find(c => c.id === id);
    if (!item) throw new Error("未找到指定案件。");
    validateCase(item);
    edit(item);
    item.updatedAt = Date.now();
    return { mvuState: saveCases(data, cases), caseItem: item };
  }
  function newInvestigation(data, { mode = "本格", roleCount = 5 } = {}) {
    if (!["本格", "变格"].includes(mode) || ![4, 5, 6].includes(Number(roleCount))) throw new Error("题材或角色数无效");
    const item = {
      id: `case_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, version: 1,
      title: "未命名案件", mode, roleCount: Number(roleCount), status: "生成中",
      draw: null, truth: {}, checkResult: "", clues: [], records: [],
      verdictReport: "", genProgress: 0, createdAt: Date.now(), updatedAt: Date.now(),
    };
    if (getCases(data).some(row => row.id === item.id)) throw Error("案件编号冲突，请重试新建");
    return { mvuState: saveCases(data, [...getCases(data), item]), caseItem: item };
  }
  function removeCase(data, id) {
    caseById(data, id);
    return saveCases(data, getCases(data).filter(item => item.id !== id));
  }
  function drawCase(data, id, draw = rules.draw(caseById(data, id).roleCount)) {
    return changeCase(data, id, item => {
      if (item.status !== "生成中") throw new Error("探案开始后不能重抽");
      if (!draw || !Array.isArray(draw.axes) || draw.axes.length !== item.roleCount) throw Error("核诡抽取结果无效");
      Object.assign(item, { title: "案件（已抽取）", draw: structuredClone(draw), truth: {},
        clues: [], records: [], genProgress: 0, checkResult: "", verdictReport: "" });
    });
  }
  function block(raw, tag) {
    return rules.createRules().parseBlock(raw, tag);
  }
  function parseClues(text) {
    const clues = rules.createRules().parseClues(text);
    if (new Set(clues.map(row => row.id)).size !== clues.length) throw Error("线索编号重复");
    return clues;
  }
  function genVars(item, index) {
    return rules.createRules(item).buildGenVars(index);
  }
  function truthFull(item) {
    return rules.createRules(item).truthFull();
  }
  function unlockedText(item) {
    return rules.createRules(item).unlockedText();
  }
  function promptFor(item, stage, action = "", prompts = rules.prompts, options = {}) {
    validateCase(item);
    if (typeof stage !== "number" && !["intro", "turn", "verdict"].includes(stage)) throw Error("未知案件阶段");
    if (typeof stage === "number" && (!Number.isInteger(stage) || !STEPS[stage])) throw Error("未知案件阶段");
    const step = typeof stage === "number" ? STEPS[stage] : null;
    if (step) {
      if (item.status !== "生成中") throw Error("探案开始后不能重新生成案情");
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
        已解锁线索: unlockedText(item), 最近对话: rules.createRules(item, options).wrapRecent("探案剧情"), 玩家行动: action,
      }) };
    }
    if (stage === "verdict") return { system: prompts.sys.verdict, user: rules.fillPrompt(prompts.user.verdict, {
      ...common, 最近对话: rules.createRules(item, options).wrapRecent("侦查经过"), 玩家结论: action,
    }) };
    throw new Error("未知案件阶段");
  }
  function validPrompts(value) {
    return record(value) && record(value.sys) && record(value.user) &&
      [...STEPS.map(step => step.key), "intro", "turn", "verdict"]
        .every(key => typeof value.sys[key] === "string" && value.sys[key].trim() &&
          typeof value.user[key] === "string" && value.user[key].trim());
  }
  function normalizeConfig(config) {
    if (!validPrompts(config?.prompts)) throw Error("提示词方案不完整");
    if (!Number.isInteger(config.prompts.version) || config.prompts.version > rules.prompts.version)
      throw Error("不支持此事件真相方案版本");
    if (!record(config.custom)) throw Error("自定义提示词格式无效");
    const custom = structuredClone(config.custom);
    for (const key of ["生成", "引子", "后续", "思维链_引子", "思维链_探案", "思维链"])
      if (custom[key] != null && typeof custom[key] !== "string") throw Error("自定义提示词必须是文本");
    if (custom.折叠标签 != null && !Array.isArray(custom.折叠标签)) throw Error("折叠标签必须是列表");
    custom.折叠标签 = rules.createRules(undefined, { folds: custom.折叠标签 ?? FOLD_TAGS }).customFoldTags;
    const dialogCount = Number(custom.对话条数 ?? 200);
    if (!Number.isInteger(dialogCount) || dialogCount < 10 || dialogCount > 2000) throw Error("对话条数须为10至2000");
    if (custom.默认题材 != null && !["本格", "变格"].includes(custom.默认题材)) throw Error("默认题材无效");
    custom.对话条数 = dialogCount;
    return { prompts: structuredClone(config.prompts), custom };
  }
  async function configuration(useDefaults = false, guard) {
    const token = epoch;
    check(guard, token);
    const host = await contract.waitGlobalInitialized("cryptLord.hostApi", { timeoutMs: 10000 });
    check(guard, token);
    if (typeof host.getWorldbook !== "function") throw Error("探案配置世界书不可读取");
    let entries = [];
    try { entries = await host.getWorldbook(BOOK); }
    catch (error) {
      if (!/未能找到世界书|世界书不存在|worldbook not found|lorebook not found/i.test(String(error?.message || error))) throw error;
    }
    check(guard, token);
    if (modules["cryptLord.hostApi"] !== host || !Array.isArray(entries)) throw Error("探案配置来源已变化");
    const find = name => {
      const matches = (entries || []).filter(row => row.name === name || row.comment === name);
      if (matches.length > 1) throw Error(`${name} 条目重复`);
      if (matches[0] && (matches[0].uid == null || entries.filter(row => row.uid === matches[0].uid).length !== 1))
        throw Error(`${name} UID 缺失或重复`);
      return matches[0];
    };
    const preset = find(PRESET_ENTRY);
    const custom = find(CUSTOM_ENTRY);
    if (preset && custom && preset.uid === custom.uid) throw Error("两个探案配置条目不能共用 UID");
    let prompts = rules.prompts;
    if (preset?.content && !useDefaults) {
      let parsed;
      try { parsed = JSON.parse(preset.content); } catch { throw new Error("事件真相方案不是有效 JSON"); }
      if (!validPrompts(parsed)) throw new Error("事件真相方案缺少阶段提示词");
      normalizeConfig({ prompts: parsed, custom: {} });
      prompts = parsed.version === rules.prompts.version ? parsed : rules.prompts;
    }
    let options = {};
    if (custom?.content && !useDefaults) {
      try { options = JSON.parse(custom.content); } catch { throw new Error("事件真相自定义提示词不是有效 JSON"); }
      if (!record(options)) throw new Error("事件真相自定义提示词必须是对象");
    }
    const normalized = normalizeConfig({ prompts, custom: options });
    const result = { ...normalized, revisions: {
      [PRESET_ENTRY]: preset ? { uid: preset.uid, content: preset.content, entry: structuredClone(preset) } : null,
      [CUSTOM_ENTRY]: custom ? { uid: custom.uid, content: custom.content, entry: structuredClone(custom) } : null,
    } };
    configs.set(result, { token, host, revisions: structuredClone(result.revisions), normalized: structuredClone(normalized) });
    return result;
  }
  async function assertConfig(config, guard) {
    const ticket = configs.get(config);
    if (!ticket || !same(ticket.normalized, normalizeConfig(config))) throw Error("探案配置来源无效，请重新读取");
    check(guard, ticket.token);
    const fresh = await configuration(true, guard);
    if (modules["cryptLord.hostApi"] !== ticket.host || !same(fresh.revisions, ticket.revisions))
      throw Error("探案提示词已被修改，请重新读取");
    check(guard, ticket.token);
  }
  function saveConfiguration(config, expected, isCurrent = () => true) {
    const token = epoch, values = structuredClone(config), revisions = structuredClone(expected);
    const task = queue.then(() => commitConfiguration(values, revisions, isCurrent, token));
    queue = task.catch(() => {});
    return task;
  }
  async function commitConfiguration(config, expected, isCurrent, token) {
    check(isCurrent, token);
    const normalized = normalizeConfig(config);
    const host = await contract.waitGlobalInitialized("cryptLord.hostApi", { timeoutMs: 10000 });
    check(isCurrent, token);
    if (!host.updateWorldbookWith) throw new Error("当前宿主不支持世界书编辑");
    const contents = {
      [PRESET_ENTRY]: JSON.stringify(normalized.prompts, null, 2),
      [CUSTOM_ENTRY]: JSON.stringify(normalized.custom, null, 2),
    };
    // One updater validates both revisions before changing either configuration entry.
    const fresh = await configuration(true, isCurrent);
    if (!same(fresh.revisions, expected)) throw Error("探案提示词已被修改，请重新读取");
    try {
      await host.updateWorldbookWith(BOOK, entries => {
      check(isCurrent, token);
      if (modules["cryptLord.hostApi"] !== host) throw Error("探案配置来源已变化");
      const next = entries.slice();
      for (const [name, content] of Object.entries(contents)) {
        const matches = entries.filter(row => row.name === name || row.comment === name);
        const prior = matches[0];
        const revision = prior ? { uid: prior.uid, content: prior.content, entry: structuredClone(prior) } : null;
        if (matches.length > 1 || !same(revision, expected?.[name]) ||
          prior && entries.filter(row => row.uid === prior.uid).length !== 1)
          throw Error(`${name} 已被修改，请重新读取`);
        if (prior) {
          if (prior.uid == null) throw Error(`${name} 缺少 UID`);
          next[next.indexOf(prior)] = { ...prior, content };
        } else next.push({
          name, comment: name, content, enabled: false,
          strategy: { type: "selective", keys: [name] },
          position: { type: "at_depth", role: "system", depth: 0, order: 9000 },
        });
      }
      return next;
    }, { render: "debounced" });
    } catch (error) {
      try {
        check(isCurrent, token);
        const actual = await configuration(false, isCurrent);
        if (Object.entries(contents).every(([name, content]) => actual.revisions[name]?.content === content)) {
          actual.warning = "提示词已保存，但宿主未返回成功响应";
          return actual;
        }
        if (!same(actual.revisions, fresh.revisions)) error.requiresReload = true;
      } catch { error.requiresReload = true; }
      throw error;
    }
    try {
      check(isCurrent, token);
      const actual = await configuration(false, isCurrent);
      if (!Object.entries(contents).every(([name, content]) => actual.revisions[name]?.content === content))
        throw Error("未读到本次保存的提示词");
      return actual;
    } catch (error) {
      return { ...normalized, revisions: null, warning: `提示词已保存，但复核失败：${error.message}` };
    }
  }
  function customFor(options, stage) {
    const custom = options || {};
    const original = rules.createRules(undefined, {
      gen: custom.生成, intro: custom.引子, play: custom.后续,
      folds: custom.折叠标签 ?? FOLD_TAGS,
    });
    return {
      before: original.getCustomPromptForStage(typeof stage === "number" ? "gen" : stage === "intro" ? "intro" : "play"),
      after: typeof stage === "number" ? "" :
        String(stage === "intro" ? custom.思维链_引子 ?? rules.defaultCotIntro :
          custom.思维链_探案 ?? custom.思维链 ?? rules.defaultCotPlay).trim(),
      folds: original.customFoldTags,
      dialogCount: Number(custom.对话条数 ?? 200),
    };
  }
  function worldRecord(raw, required = true, foldTags = FOLD_TAGS) {
    if (!block(raw, "世界正文") && required) throw new Error("模型未返回 <世界正文>，请重试");
    return rules.createRules(undefined, { folds: foldTags }).packWorldRecord(raw, false);
  }
  function applyStage(data, id, stage, raw, action = "", foldTags = FOLD_TAGS) {
    return changeCase(data, id, item => {
      promptFor(item, stage, action);
      const tags = rules.createRules(undefined, { folds: [...foldTags, "reasoning", "thinking", "think", "safe"] }).customFoldTags;
      let controls = String(raw);
      for (const tag of tags) {
        const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        controls = controls.replace(new RegExp(`<${escaped}(?:\\s+[^>]*)?>[\\s\\S]*?<\\/${escaped}\\s*>`, "gi"), "");
        const unclosed = controls.search(new RegExp(`<${escaped}(?:\\s|>)`, "i"));
        if (unclosed >= 0) controls = controls.slice(0, unclosed);
      }
      const once = tag => {
        const count = [...controls.matchAll(new RegExp(`<${tag}(?:\\s+[^>]*)?>`, "gi"))].length;
        if (count > 1) throw Error(`模型返回了重复的 <${tag}>，请重试`);
        return block(controls, tag);
      };
      const packedWorld = required => {
        const world = worldRecord(controls, required, foldTags);
        world.foldBlocks = worldRecord(raw, false, foldTags).foldBlocks;
        return world;
      };
      const step = typeof stage === "number" ? STEPS[stage] : null;
      if (step) {
        const content = once(step.block);
        if (!content) throw new Error(`模型未返回 <${step.block}>，可重试本步`);
        if (Number(stage) < item.genProgress) {
          for (const later of STEPS.slice(Number(stage) + 1)) delete item.truth[later.store];
          item.genProgress = Number(stage);
          item.checkResult = "";
          if (stage < 3) item.clues = [];
        }
        item.truth[step.store] = content;
        if (stage === 3) item.clues = parseClues(content);
        if (stage === 4) item.checkResult = once("自检") || "（无自检块）";
        item.genProgress = Number(stage) + 1;
        return;
      }
      if (stage === "intro") {
        if (!once("世界正文")) throw Error("模型未返回 <世界正文>，请重试");
        item.records.push(packedWorld(true));
        item.status = "探案中";
      } else if (stage === "turn") {
        if (!once("世界正文")) throw Error("模型未返回 <世界正文>，请重试");
        const world = packedWorld(true);
        const unlock = once("解锁线索");
        if (!unlock) throw new Error("模型未返回 <解锁线索>，请重试");
        const ids = unlock.split(/[,，、\s]+/).filter(id => id && id !== "无");
        if (ids.some(id => !item.clues.some(clue => clue.id === id))) throw new Error("模型返回了未知线索编号");
        item.records.push({ role: "player", text: action }, world);
        rules.createRules(item).applyUnlock(controls);
      } else if (stage === "verdict") {
        const report = once("结案报告");
        once("世界正文");
        const world = packedWorld(false);
        if (!report) throw new Error("模型未返回 <结案报告>，请重试");
        item.records.push({ role: "player", text: `【结案结论】${action}` });
        if (world.text) item.records.push(world);
        item.records.push({ role: "report", text: report });
        item.verdictReport = report;
        item.status = "已结案";
      }
    });
  }
  async function request(prompt, customization = {}, story = "", guard, loaded, configurationSource) {
    const token = epoch;
    const valid = async () => {
      check(guard, token);
      if (loaded) await assertSource(loaded, guard);
      if (configurationSource) await assertConfig(configurationSource, guard);
      check(guard, token);
    };
    await valid();
    const settlement = await contract.waitGlobalInitialized("cryptLord.variableSettlementApi", { timeoutMs: 10000 });
    await valid();
    const settings = await settlement.readSettings();
    await valid();
    const config = {
      should_silence: true, should_stream: false, max_chat_history: 0,
      use_mes_examples: false, use_story_string: false, use_authors_note: false,
      ordered_prompts: ["world_info_before", "world_info_after",
        ...(story ? [{ role: "system", content: `【最新原生剧情】\n${story}` }] : []),
        "persona_description",
        ...(customization.before ? [{ role: "system", content: customization.before }] : []),
        { role: "system", content: prompt.system }, { role: "user", content: prompt.user },
        ...(customization.after ? [{ role: "system", content: customization.after }] : [])],
    };
    if (settings.useCustomApi) {
      if (!settings.apiUrl || !settings.model) throw new Error("系统副 API 尚未填写 URL 或模型名");
      config.custom_api = { apiurl: settings.apiUrl, key: settings.apiKey, model: settings.model, source: "openai" };
    }
    const host = await contract.waitGlobalInitialized("cryptLord.hostApi", { timeoutMs: 10000 });
    await valid();
    if (modules["cryptLord.hostApi"] !== host || modules["cryptLord.variableSettlementApi"] !== settlement)
      throw Error("探案模型服务已变化，请重新读取");
    const response = await host.generateRaw(config);
    await valid();
    if (modules["cryptLord.hostApi"] !== host || modules["cryptLord.variableSettlementApi"] !== settlement)
      throw Error("探案模型服务已变化，请重新读取");
    const text = typeof response === "string" ? response : response?.content || "";
    if (!text.trim()) throw Error("模型没有返回内容，请重试");
    return text;
  }
  function exportChronicle(item) {
    const worlds = (item.records || []).filter(row => row.role === "world" && row.text &&
      !row.text.includes("本回合演绎失败"))
      .map(row => worldRecord(`<世界正文>${row.text}</世界正文>`, false).text).filter(Boolean);
    if (!worlds.length) throw new Error("还没有可导出的世界剧情");
    return "[系统指令]:前端已完成一轮「事件真相」探案演绎。下列【探案纪实】为游戏世界内的完整剧情。请据此润色、衔接为连贯正文；本轮严禁进行任何检定，亦不得揭示玩家未在世界内获知的真相。\n\n【探案纪实】\n" + worlds.join("\n\n");
  }

  function createCase(mvuState, info) {
    const cases = structuredClone(getCases(mvuState));
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
    const cases = structuredClone(getCases(mvuState));
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
    const cases = structuredClone(getCases(mvuState));
    const target = cases.find(c => c.id === caseId);
    if (!target || !Array.isArray(target.clues)) throw new Error("未找到指定案件或线索。");
    const clue = target.clues.find(cl => cl.id === clueId);
    if (!clue) throw new Error("未找到指定线索。");
    clue.verified = !clue.verified;
    return { mvuState: saveCases(mvuState, cases), clue };
  }

  function addSuspect(mvuState, caseId, suspect) {
    const cases = structuredClone(getCases(mvuState));
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
    const cases = structuredClone(getCases(mvuState));
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

  const after = modules["cryptLord.afterNativeHost"], events = after?.tavernEvents() || {};
  const bind = (event, callback) => { if (event) subscriptions.push(after.bindEvent(event, callback)); };
  bind(events.CHAT_CHANGED, () => { epoch++; generating = false; });
  bind(events.GENERATION_STARTED, (type, options, dryRun) => {
    if (!["quiet", "dryRun"].includes(type) && !options?.dryRun && !dryRun) { epoch++; generating = true; }
  });
  for (const event of new Set([events.GENERATION_ENDED, events.GENERATION_STOPPED].filter(Boolean)))
    bind(event, () => { generating = false; });
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: !disposed }); },
    load, assertSource, prepareOperation, commitOperation, assertConfig,
    steps: STEPS, rules, caseById, newInvestigation, removeCase, drawCase,
    block, parseClues, promptFor, applyStage, request, exportChronicle,
    configuration, saveConfiguration, customFor, normalizeConfig, validateCase, saveCases,
    getCases,
    createCase,
    addClue,
    toggleClueVerified,
    addSuspect,
    solveCase,
    buildCaseReport,
    dispose() {
      disposed = true; epoch++;
      subscriptions.forEach(item => item?.stop());
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    }
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
