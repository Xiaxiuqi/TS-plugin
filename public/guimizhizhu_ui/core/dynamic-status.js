(() => {
  'use strict';
  const KEY = 'cryptLord.dynamicStatus';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (!contract) throw Error('动态状态依赖尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  let disposed = false, epoch = 0, injection = null, nativeReady = false;
  const subscriptions = [];
  const loadedSources = new WeakMap();
  const canonical = value => Object.prototype.toString.call(value) === '[object RegExp]'
    ? { regexp: value.source, flags: value.flags } : Object.prototype.toString.call(value) === '[object Date]'
      ? { date: value.toISOString() } : Array.isArray(value) ? value.map(canonical) :
      value && typeof value === 'object'
        ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
  // BEGIN ORIGINAL DYNAMIC RULES
  function originalRules(GameDBManager, _) {
    const toastr = { error() {} };
    const parser = {cleanAndParseJSON(rawContent, entryName = "未知条目", fallbackData = null) {
    if (!rawContent || !rawContent.trim()) {
      console.warn(`[DB警告] ${entryName} 内容为空，已启用兜底。`);
      return fallbackData;
    }

    try {
      // 1. 第一步：移除注释 (保持字符串内的内容不动)
      // 修正了对多行注释和单行注释的匹配，确保不会误删 URL 等
      let processed = rawContent.replace(/(".*?"|'.*?')|(\/\*[\s\S]*?\*\/|\/\/.*$)/gm, (match, group1) => {
        return group1 ? group1 : "";
      });

      // 2. 第二步：强力移除“尾随逗号”
      // 匹配：逗号 + 任意空白/换行 + 结束括号 (] 或 })
      // 使用 g 标识符全局替换所有层级的尾随逗号
      processed = processed.replace(/,([\s\r\n]*[\]}])/g, '$1');

      // 3. 第三步：处理 JSON 字符串中非法的“真换行”
      // 只有在双引号内部的换行符才会被替换为 \n 符号
      processed = processed.replace(/"([^"\\]*(\\.[^"\\]*)*)"/gs, (match) =>
        match.replace(/\n/g, "\\n").replace(/\r/g, "\\r")
      );

      // 4. 第四步：最终修剪
      processed = processed.trim();

      return JSON.parse(processed);
    } catch (err) {
      // 如果解析失败，尝试最后一种方案：暴力清理掉所有非标准的控制字符
      try {
        // 这里的逻辑处理极其隐蔽的编码错误（如 BOM 头或不可见字符）
        const extremeClean = rawContent
          .replace(/\/\/.*/g, '') // 简单暴力去单行注释
          .replace(/,[\s\r\n]*([\]}])/g, '$1')
          .trim();
        return JSON.parse(extremeClean);
      } catch (finalErr) {
        console.error(`[DB解析失败] ❌ ${entryName} 格式彻底损坏。报错: ${err.message}`);
        toastr.error(`警告：数据库${entryName}解析失败，请检查你的JSON格式是否正确！`);
        return fallbackData;
      }
    }
  }};
    GameDBManager.getDirectiveByNameAndScope = function(ruleName, isNPC) {
      return ({getDirectiveByNameAndScope(ruleName, isNPC) {
    const expectedScope = isNPC ? "npc" : "player";
    const rule = this.DB.ruleMap.get(`${ruleName}_${expectedScope}`)
              || this.DB.ruleMap.get(`${ruleName}_all`);
    return rule?.output?.directive || null;
  }}).getDirectiveByNameAndScope.call(GameDBManager, ruleName, isNPC);
    };
    const evaluateCondition = (statsPool, condition) => {
    if (!statsPool || typeof statsPool !== 'object') return false;
    if (!condition || !condition.target || typeof condition.operator === 'undefined') return false;

    const resolveRawValue = (path) => {
        if (!path) return undefined;
        let val = _.get(statsPool, path);
        if (val !== undefined) return val;

        if (!path.includes('.')) {
            if (!path.startsWith("基础")) {
                val = statsPool[`基础${path}`];
                if (val !== undefined) return val;
            }
            if (path.startsWith("当前")) {
                val = statsPool[path.replace("当前", "")];
                if (val !== undefined) return val;
            }
        }
        return undefined;
    };

    let targetVal = resolveRawValue(condition.target);
    const op = condition.operator;
    const condVal = condition.value;

    // ==========================================
    // 分流 1：单目运算符 (存在性与布尔判定，无需 condVal)
    // ==========================================
    if (["exists", "not_exists", "is_true", "is_false", "empty", "not_empty"].includes(op)) {
        switch (op) {
            case "exists":     return targetVal !== undefined && targetVal !== null;
            case "not_exists": return targetVal === undefined || targetVal === null;
            case "is_true":    return !!targetVal === true;
            case "is_false":   return !!targetVal === false;
            case "empty":      return _.isEmpty(targetVal);
            case "not_empty":  return !_.isEmpty(targetVal);
        }
    }

    // ==========================================
    // 分流 2：通用等值判定 (支持字符串、数字、布尔值的宽松或严格对比)
    // ==========================================
    if (op === "==") return targetVal == condVal;
    if (op === "===") return targetVal === condVal;
    if (op === "!=") return targetVal != condVal;
    if (op === "!==") return targetVal !== condVal;

    // ==========================================
    // 分流 3：字符串与对象特异性判定
    // ==========================================
    if (["includes", "not_includes", "startsWith", "endsWith", "match", "has_key"].includes(op)) {
        const strTarget = String(targetVal ?? "");
        const strCond = String(condVal ?? "");

        switch (op) {
            case "includes":     return strTarget.includes(strCond);
            case "not_includes": return !strTarget.includes(strCond);
            case "startsWith":   return strTarget.startsWith(strCond);
            case "endsWith":     return strTarget.endsWith(strCond);
            case "has_key":      return _.has(targetVal, condVal);
            case "match":
                try {
                    // 增加安全防线：限制正则长度或包裹 try-catch
                    return new RegExp(strCond).test(strTarget);
                } catch (e) {
                    console.warn(`[动态规则] ⚠️ 无效的正则: ${strCond}`);
                    return false;
                }
        }
    }

    // ==========================================
    // 分流 4：纯数值大小与百分比判定 (>, >=, <, <=)
    // ==========================================

    // 过滤脏数据，确保只对数字进行比较
    if (targetVal === null || targetVal === "" || typeof targetVal === 'boolean' || Array.isArray(targetVal)) {
        targetVal = NaN;
    } else {
        targetVal = Number(targetVal);
    }

    if (isNaN(targetVal)) return false;

    let checkValue = targetVal;

    if (condition.calcType === "percentage") {
        if (!condition.reference) return false;

        const rawRef = resolveRawValue(condition.reference);
        const refVal = Number(rawRef);

        if (isNaN(refVal) || refVal === 0) return false;
        checkValue = (targetVal / refVal) * 100;
    }

    const threshold = Number(condVal);
    if (isNaN(threshold)) return false;

    switch (op) {
        case ">":  return checkValue > threshold;
        case ">=": return checkValue >= threshold;
        case "<":  return checkValue < threshold;
        case "<=": return checkValue <= threshold;
        default:   return false; // 等值判定已经在上面处理过了
    }
};
    const applyDynamicStatus = (entityStats, isNPC) => {
    const rulesDb = GameDBManager.DB.dynamicRules;
    // 🚨 这里的规则库必须在 Zod 解析前就已经有数据了！
    if (!rulesDb || rulesDb.length === 0) return entityStats;

    if (!entityStats.当前状态 || typeof entityStats.当前状态 !== 'object') {
        entityStats.当前状态 = {};
    }

    // 1. 清洗旧的系统状态 (通过正则检测带方括号的键)
    Object.keys(entityStats.当前状态).forEach(key => {
        if (/^\[.*?\]/.test(key)) delete entityStats.当前状态[key];
    });

    // 2. 筛选适用当前实体的规则
    const applicableRules = rulesDb.filter(rule => {
        if (rule.isEnabled === false) return false;
        if (isNPC && rule.targetScope === "player") return false;
        if (!isNPC && rule.targetScope === "npc") return false;
        return true;
    });

    const triggeredGroups = new Set();

    // 3. 判定并写入
    for (const rule of applicableRules) {
        if (rule.group && triggeredGroups.has(rule.group)) continue;

        const isMatch = rule.matchType === "OR"
            ? rule.conditions.some(c => evaluateCondition(entityStats, c))
            : rule.conditions.every(c => evaluateCondition(entityStats, c));

        if (isMatch) {
                // 只写状态，不留任何临时变量！绝对干净。
                const stateKey = `[${rule.output.type|| '系统规则'}]${rule.name}`;
                entityStats.当前状态[stateKey] = rule.output.description;

                if (rule.isExclusive && rule.group) triggeredGroups.add(rule.group);
            }
    }

    return entityStats;
};
    const manager = {_assembleSystemDirectives(data) {
    if (!data) return "";
    const directives = [];

    // 新增 isNPC 参数，用于区分同名规则的作用域
    const extractDirectivesFromStates = (statesObj, entityName, isNPC) => {
        if (!statesObj) return;

        for (const key of Object.keys(statesObj)) {
            // 正则分离出名称，例如 "[系统状态]崩溃逃窜" -> "崩溃逃窜"
            const match = key.match(/^\[.*?\](.*)$/);
            if (match) {
                const pureName = match[1].trim();

                // 传入 pureName 和 isNPC 进行精准反查
                const directive = GameDBManager.getDirectiveByNameAndScope(pureName, isNPC);

                if (directive) {
                    // 仿照 actionPrompt 格式：[对象标签] 指令内容
                    const scopeLabel = entityName === "Player" ? "<User>" : entityName;
                    directives.push(`- [${scopeLabel}] ${directive}`);
                }
            }
        }
    };

    // 1. 查玩家的状态字典 (isNPC = false)
    extractDirectivesFromStates(data.stat_data.当前状态, "Player", false);

    // 2. 查 NPC 的状态字典 (isNPC = true)
    if (data.npc_data) {
        for (const [npcName, npcData] of Object.entries(data.npc_data)) {
            extractDirectivesFromStates(npcData.当前状态, npcName, true);
        }
    }

    if (directives.length > 0) {
        // 修改为 ActionPrompt 风格的包裹方式
        return `[系统指令]\n${directives.join("\n")}\n\n`;
    }

    return "";
}};
    return { parse: (...args) => parser.cleanAndParseJSON(...args), evaluate: evaluateCondition,
      apply: applyDynamicStatus, assemble: data => manager._assembleSystemDirectives(data) };
  }
  // END ORIGINAL DYNAMIC RULES
  function check(guard, token = epoch) {
    if (disposed || modules[KEY] !== api || epoch !== token || guard && !guard())
      throw Object.assign(Error('动态状态操作已取消'), { code: 'DYNAMIC_STATUS_CANCELLED' });
  }
  function lodash() {
    const value = modules['cryptLord.afterNativeHost']?.getHost()?.window?._ || window._;
    if (!value || !['get', 'has', 'isEmpty'].every(key => typeof value[key] === 'function'))
      throw Error('动态状态需要宿主Lodash接口');
    return value;
  }
  function identity() {
    const host = modules['cryptLord.hostApi'], after = modules['cryptLord.afterNativeHost'], surface = after?.getHost();
    const library = lodash();
    return { host, after, document: surface?.document, window: surface?.window, library,
      get: library.get, has: library.has, isEmpty: library.isEmpty,
      script: JSON.stringify(canonical(host?.scriptVariableOptions?.() ?? host?.getScriptId?.())),
      chat: surface?.window?.SillyTavern?.getCurrentChatId?.() };
  }
  function assertScope(scope, guard, token) {
    check(guard, token);
    const current = identity();
    if (Object.keys(scope).some(key => scope[key] !== current[key]))
      throw Object.assign(Error('动态规则宿主、聊天、脚本或Lodash已变化，请重新读取'), { code: 'DYNAMIC_STATUS_CANCELLED' });
    return true;
  }
  function createGuard(guard) {
    check(guard);
    const scope = identity(), token = epoch;
    return () => assertScope(scope, guard, token);
  }
  function validate(value) {
    if (!Array.isArray(value)) throw Error('动态规则必须为规则数组');
    for (const rule of value) {
      if (!rule || typeof rule !== 'object' || Array.isArray(rule) || typeof rule.name !== 'string' || !rule.name.trim() ||
        ![undefined, 'all', 'player', 'npc'].includes(rule.targetScope) ||
        rule.priority !== undefined && !Number.isFinite(Number(rule.priority)) ||
        !Array.isArray(rule.conditions) || rule.conditions.some(condition => !condition || typeof condition.target !== 'string' ||
          !condition.target || typeof condition.operator !== 'string' || condition.reference !== undefined && typeof condition.reference !== 'string') ||
        !rule.output || typeof rule.output !== 'object' || Array.isArray(rule.output) ||
        typeof rule.output.description !== 'string' ||
        rule.output.directive !== undefined && typeof rule.output.directive !== 'string' ||
        rule.output.type !== undefined && typeof rule.output.type !== 'string') throw Error('动态规则的名称、条件、作用域或输出格式无效');
    }
    return structuredClone(value);
  }
  function engine(rules) {
    const rulesDb = validate(rules).sort((a, b) => (b.priority || 0) - (a.priority || 0));
    const ruleMap = new Map();
    for (const rule of rulesDb) ruleMap.set(`${rule.name}_${rule.targetScope || 'all'}`, rule);
    return originalRules({ DB: { dynamicRules: rulesDb, ruleMap } }, lodash());
  }
  async function readRules(scope, guard, token) {
    const { host } = scope;
    const owned = () => assertScope(scope, guard, token);
    owned();
    const binding = structuredClone(await host.getCharWorldbookNames('current'));
    owned();
    if (!binding || typeof binding !== 'object' || Array.isArray(binding) ||
      binding.primary != null && (typeof binding.primary !== 'string' || !binding.primary.trim()) ||
      !Array.isArray(binding.additional) || binding.additional.some(name => typeof name !== 'string' || !name.trim()))
      throw Error('动态规则世界书绑定格式无效');
    const primary = binding?.primary || '1源堡';
    const names = [...new Set([...(binding?.additional || []), '2历史孔隙']
      .filter(name => name && name !== primary)), primary];
    const selected = new Map(), revision = { binding, books: [] };
    for (const book of names) {
      let entries;
      try { entries = await host.getWorldbook(book); }
      catch (error) {
        owned();
        if (book !== primary && /未能找到世界书|世界书.*(?:不存在|未找到)|(?:worldbook|lorebook).*?(?:not found|does not exist)/i.test(String(error.message || error))) {
          revision.books.push({ book, missing: true }); continue;
        }
        throw error;
      }
      owned();
      if (!Array.isArray(entries)) throw Error(`动态规则世界书「${book}」不可读取`);
      const relevant = entries.filter(entry => String(entry?.name ?? entry?.comment ?? '').startsWith('【动态规则】'));
      const entryNames = relevant.map(entry => String(entry.name ?? entry.comment));
      if (new Set(entryNames).size !== entryNames.length) throw Error(`动态规则世界书「${book}」存在重名条目`);
      if (relevant.some(entry => typeof entry.content !== 'string')) throw Error(`动态规则世界书「${book}」正文无效`);
      revision.books.push({ book, entries: structuredClone(relevant) });
      for (const entry of relevant) {
        const name = String(entry?.name ?? entry?.comment ?? '');
        selected.set(name, { book, name, content: entry.content });
      }
    }
    if (!same(binding, await host.getCharWorldbookNames('current'))) throw Error('动态规则世界书绑定已变化，请重新读取');
    owned();
    return { selected, revision };
  }
  async function load(guard) {
    const token = epoch; check(guard, token);
    const scope = identity();
    const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
    assertScope(scope, guard, token);
    if (host !== scope.host) throw Error('动态规则来源服务已变化');
    const { selected, revision } = await readRules(scope, guard, token);
    const final = await readRules(scope, guard, token);
    if (!same(revision, final.revision)) throw Error('动态规则来源在读取期间已变化，请重新读取');
    const rules = [];
    for (const entry of selected.values()) {
      try {
        const text = entry.content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        let parsed;
        try { parsed = JSON.parse(text); }
        catch { parsed = originalRules({ DB: {} }, scope.library).parse(text, entry.name, null); }
        rules.push(...validate(Array.isArray(parsed) ? parsed : [parsed]));
      } catch (error) { throw Error(`世界书「${entry.book}」的「${entry.name}」动态规则损坏：${error.message || error}`); }
    }
    assertScope(scope, guard, token);
    const result = { rules: rules.sort((a, b) => (b.priority || 0) - (a.priority || 0)), epoch: token,
      sources: [...selected.values()].map(({book,name}) => ({book,name})) };
    loadedSources.set(result, { revision, public: structuredClone(result), token, scope });
    return result;
  }
  function assertIdentity(loaded, guard) {
    const saved = loadedSources.get(loaded);
    if (!saved || !same(saved.public, loaded)) throw Error('动态规则凭据无效或已被修改');
    assertScope(saved.scope, guard, saved.token);
    return saved;
  }
  async function assertLoaded(loaded, guard) {
    const saved = assertIdentity(loaded, guard);
    const current = await readRules(saved.scope, guard, saved.token);
    assertIdentity(loaded, guard);
    if (!same(saved.revision, current.revision)) throw Error('动态规则来源已变化，未写入旧结果');
  }
  function entities(data) {
    if (!data?.stat_data || typeof data.stat_data !== 'object' || Array.isArray(data.stat_data)) throw Error('动态状态需要玩家stat_data');
    const copy = structuredClone(data);
    if (copy.npc_data) copy.npc_data = Object.fromEntries(Object.entries(copy.npc_data)
      .filter(([name, item]) => name !== '$meta' && item && typeof item === 'object' && !Array.isArray(item)));
    return copy;
  }
  function apply(data, rules) {
    check();
    const work = entities(data), original = engine(rules);
    original.apply(work.stat_data, false);
    for (const npc of Object.values(work.npc_data || {})) original.apply(npc, true);
    const changed = JSON.stringify(data.stat_data.当前状态) !== JSON.stringify(work.stat_data.当前状态) ||
      Object.entries(work.npc_data || {}).some(([name, npc]) =>
        JSON.stringify(data.npc_data[name].当前状态) !== JSON.stringify(npc.当前状态));
    if (work.stat_data.当前状态 !== undefined) data.stat_data.当前状态 = work.stat_data.当前状态;
    for (const [name, npc] of Object.entries(work.npc_data || {}))
      if (npc.当前状态 !== undefined) data.npc_data[name].当前状态 = npc.当前状态;
    return changed;
  }
  function assemble(data, rules) {
    check();
    const copy = entities(data);
    apply(copy, rules);
    const original = engine(rules);
    return original.assemble(copy);
  }
  async function provide({ state, guard, native, reader, target } = {}) {
    if (!state?.stat_data) return null;
    guard = createGuard(guard);
    const token = epoch; check(guard, token);
    const copy = structuredClone(state);
    reader ||= modules['cryptLord.nativeFloorSource'];
    if (!reader) throw Error('动态状态原生楼层来源服务尚未加载');
    native ||= await reader.read(guard);
    const latest = source(native.rows).target;
    target ||= latest;
    const owned = () => {
      check(guard, token);
      if (modules['cryptLord.nativeFloorSource'] !== reader) throw Error('动态状态原生来源服务已变化');
      return reader.assertIdentity(native, guard);
    };
    owned();
    if (!target || target.is_hidden || !native.rows.includes(target) ||
      !same(target.data?.stat_data, copy.stat_data) || !same(target.data?.npc_data, copy.npc_data))
      throw Error('动态状态来源楼层已变化，本次不使用旧状态');
    const loaded = await load(owned);
    owned();
    const content = assemble(copy, loaded.rules);
    await assertLoaded(loaded, owned);
    await reader.assert(native, owned);
    assertIdentity(loaded, owned);
    owned();
    return content ? { role: 'system', position: 'in_chat', depth: 4, should_scan: true, content } : null;
  }
  function reset() {
    epoch++;
    const current = injection; injection = null; current?.uninject();
  }
  function source(messages, type) {
    if (!Array.isArray(messages)) throw Error('动态状态来源楼层不可读取');
    const rows = messages.filter(row => Number.isInteger(row?.message_id)).sort((a, b) => a.message_id - b.message_id);
    const last = rows.at(-1);
    const rewrite = ['regenerate', 'swipe'].includes(type) && last?.role === 'assistant';
    if (rows.filter(row => row.role === 'assistant').at(-1)?.is_hidden) throw Error('最新动态状态来源楼层已隐藏');
    const target = rows.filter(row => row.role === 'assistant' && (!rewrite || row.message_id < last.message_id)).at(-1);
    if (target?.is_hidden) throw Error('动态状态来源楼层已隐藏');
    return { target };
  }
  async function beforeGeneration(type, options, dryRun) {
    if (disposed || dryRun || options?.dryRun || ['quiet', 'quiet_prompt'].includes(type) || options?.quiet_prompt) return;
    reset();
    if (!['normal', 'regenerate', 'swipe', 'continue', 'append', '', undefined, null].includes(type)) return;
    if (modules['cryptLord.nativeFloor']?.hasActiveTurn()) return;
    const token = epoch, guard = () => !disposed && token === epoch;
    try {
      const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
      check(guard, token);
      const scope = identity();
      const reader = modules['cryptLord.nativeFloorSource'];
      if (!reader) throw Error('动态状态原生楼层来源服务尚未加载');
      const native = await reader.read(guard), start = source(native.rows, type);
      check(guard, token);
      if (!start.target?.data?.stat_data) return;
      const prompt = await provide({ state: start.target.data, guard, native, reader, target: start.target });
      await reader.assert(native, guard);
      check(guard, token);
      reader.assertIdentity(native, guard);
      assertScope(scope, guard, token);
      if (modules['cryptLord.hostApi'] !== host || modules['cryptLord.nativeFloorSource'] !== reader)
        throw Error('动态状态来源服务已变化');
      if (prompt) injection = host.injectPrompts([{ ...prompt, id: 'cryptLord.dynamicStatus.native' }], { once: true });
    } catch (error) {
      if (guard()) console.warn(`[${KEY}] 本次未注入动态指令，保留原生生成`, error);
    }
  }
  function install() {
    const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents();
    if (!events?.GENERATION_AFTER_COMMANDS || !events.CHAT_CHANGED || !events.GENERATION_STOPPED || !events.GENERATION_ENDED) return;
    try {
      for (const [name, handler] of [[events.GENERATION_AFTER_COMMANDS, beforeGeneration],
        [events.CHAT_CHANGED, reset], [events.GENERATION_STOPPED, reset], [events.GENERATION_ENDED, reset]]) {
        const subscription = after.bindEvent(name, handler);
        if (!subscription?.stop) throw Error('动态状态原生事件绑定失败');
        subscriptions.push(subscription);
      }
      nativeReady = true;
    } catch (error) {
      subscriptions.splice(0).forEach(item => item.stop());
      console.warn(`[${KEY}] 原生事件未完整绑定，本次仅提供脚本上下文`, error);
    }
  }
  const api = Object.freeze({
    status: () => ({ key: KEY, ready: !disposed, nativeReady, epoch }), load, assertLoaded, createGuard, apply, assemble, provide,
    assertIdentity(loaded, guard) { assertIdentity(loaded, guard); return true; },
    evaluate(stats, condition) { check(); return engine([]).evaluate(stats, condition); },
    dispose() {
      disposed = true; reset(); subscriptions.splice(0).forEach(item => item.stop()); nativeReady = false;
      contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api; install(); contract.initializeGlobal(KEY, api);
})();
