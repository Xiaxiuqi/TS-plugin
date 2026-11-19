(() => {
  'use strict';
  const KEY = 'cryptLord.eventGenerator';
  const PRIMARY = '1源堡';
  const SECONDARY = '2历史孔隙';
  const CARD_NAME = '【存入】生成的事件';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const parser = modules['cryptLord.randomEvents'], parse = parser?.parseEntry;
  const normalizer = modules['cryptLord.responseNormalizer'];
  if (!contract || !parse || !normalizer?.maskHidden || !normalizer?.tagSpans)
    throw new Error(`[${KEY}] 随机事件解析器或正文归一化服务尚未加载`);
  const host = () => contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
  const nameOf = entry => String(entry?.name || entry?.comment || '').trim();
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  let disposed = false, epoch = 0, generating = false;
  const configs = new WeakMap(), targets = new WeakMap(), subscriptions = [];
  function canonical(value) {
    if (Object.prototype.toString.call(value) === '[object Date]') return { date: value.toISOString() };
    if (Object.prototype.toString.call(value) === '[object RegExp]') return { source: value.source, flags: value.flags };
    if (Array.isArray(value)) return value.map(canonical);
    if (record(value)) return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    return value;
  }
  const signature = value => JSON.stringify(canonical(value));
  function usable(guard, token = epoch) {
    if (disposed || modules[KEY] !== api) throw Error('事件生成服务已卸载');
    if (generating || token !== epoch || guard && !guard()) throw Error('窗口、聊天或正文生成已变化，操作已取消');
  }
  function scope() {
    const api = modules['cryptLord.hostApi'], after = modules['cryptLord.afterNativeHost'], surface = after?.getHost?.();
    return { api, after, document: surface?.document, window: surface?.window, epoch,
      script: signature(api?.scriptVariableOptions?.()), chat: surface?.window?.SillyTavern?.getCurrentChatId?.(),
      parser: modules['cryptLord.randomEvents'], parse: modules['cryptLord.randomEvents']?.parseEntry,
      normalizer: modules['cryptLord.responseNormalizer'] };
  }
  function scopedGuard(guard) {
    const expected = scope();
    return () => {
      usable(guard);
      const now = scope();
      if (Object.keys(expected).some(key => expected[key] !== now[key]) ||
        now.parser !== parser || now.parse !== parse || now.normalizer !== normalizer)
        throw Error('事件宿主、聊天、脚本或解析服务已变化，操作已取消，请重新读取');
      return true;
    };
  }
  async function binding(api) {
    const bound = await api.getCharWorldbookNames('current');
    if (!record(bound) || bound.primary != null && typeof bound.primary !== 'string' ||
      bound.additional != null && (!Array.isArray(bound.additional) ||
        bound.additional.some(name => typeof name !== 'string' || !name.trim())))
      throw Error('角色世界书绑定不可读取');
    const primary = bound.primary?.trim() || PRIMARY;
    return { bound: structuredClone(bound), primary,
      names: [...new Set(['【源堡】玩家自建内容', ...(bound.additional || []), SECONDARY]
        .filter(name => name && name !== primary)), primary] };
  }
  async function assertBinding(api, source, guard, token) {
    usable(guard, token);
    if (modules['cryptLord.hostApi'] !== api ||
      signature(await binding(api)) !== signature(source)) throw Error('事件世界书绑定已变化，请重新读取');
    usable(guard, token);
  }
// BEGIN ORIGINAL EVENT
function originalRules(bridge = {}) {
  const Math = Object.create(globalThis.Math);
  Math.random = bridge.random || globalThis.Math.random;
  const console = bridge.console || globalThis.console;
  const WorldbookManager = bridge.worldbook;
  let GameDBManager;
  class EventRules {
renderTemplate(templateKey, params = {}) {
    // 1. 获取模板字符串（优先从DB拿，没有就走兜底）
    const templateStr = this.DB.templates[templateKey] || this._fallback.templates[templateKey];

    if (!templateStr) {
      console.warn(`[模板渲染警告] 找不到对应的提示词模板: ${templateKey}`);
      return "";
    }

    // 2. 正则查找并替换所有的 ${xxx}
    // 匹配 ${...} 并在 params 中寻找对应的值。如果找不到，保留原样以防误伤。
    return templateStr.replace(/\$\{([^}]+)\}/g, (match, key) => {
      // 去除空格，防止写成 ${ coreMemoryContent } 导致匹配失败
      const cleanKey = key.trim();
      return params[cleanKey] !== undefined ? params[cleanKey] : match;
    });
  }
_extractLastTagContent(tagName, text, ignoreCase = false) {
  if (!text || typeof text !== "string") return null;

  // 【超强容错改造】
  // 正则解析：允许 <tag> 内部带有属性 (如 <tag lang="zh">) 或空格
  // (?:\\s+[^>]*)? 代表非捕获组，匹配空格+任意非'>'字符
  const flags = ignoreCase ? "gi" : "g";
  const regex = new RegExp("<" + tagName + "(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/" + tagName + ">", flags);

  const matches = [...text.matchAll(regex)];

  if (matches.length > 0) {
    // 取最后一个匹配项的第1个捕获组（即标签内部的文本）
    return matches[matches.length - 1][1].trim();
  }

  return null;
}
async triggerEventGeneration() {
  this.showTemporaryMessage("正在连接源堡，生成事件...");
  try {
    // 1. 读取模板 (通过 DB 管家同步获取)
    let templateText = GameDBManager.renderTemplate("event_template");
    if (!templateText || !templateText.trim()) {
      this.showTemporaryMessage("未找到事件生成模板(event_template)，请检查提示词模板池！");
      return;
    }

    // 2. 读取结构化的词库 JSON 字典
    const pools = GameDBManager.DB.eventWordbank;
    if (!pools || Object.keys(pools).length === 0) {
      this.showTemporaryMessage("未找到事件词库数据，请确保【配置】事件词库已在世界书中正确装载！");
      return;
    }

    // 3. 提取模板中的占位符顺序 (例如 ["词库1", "词库2", ...])
    const matches = [...templateText.matchAll(/\[(词库\d+)\]/g)];
    const slotNames = [...new Set(matches.map(m => m[1]))].sort((a, b) => {
      return parseInt(a.replace('词库', '')) - parseInt(b.replace('词库', ''));
    });

    let targetPoolName = slotNames.length > 0 ? slotNames[0] : null;
    const memoryTags = new Set(); // 状态机的记忆标签

    slotNames.forEach((slot, index) => {
      // 决定当前从哪个池子抽卡
      let poolToUse = (pools[targetPoolName] && pools[targetPoolName].length > 0)
                      ? pools[targetPoolName]
                      : (pools[slot] || []);

      if (poolToUse.length > 0) {
        // 4.1 对象级别条件过滤 (reqTags 和 forbidTags)
        let validOptions = poolToUse.filter(opt => {
          const req = opt.reqTags || [];
          const forbid = opt.forbidTags || [];
          for (let t of req) if (!memoryTags.has(t)) return false;
          for (let t of forbid) if (memoryTags.has(t)) return false;
          return true;
        });

        // 兜底：如果全部不符合，退回全池防报错
        if (validOptions.length === 0) validOptions = poolToUse;

        // 4.2 随机抽取 JSON 对象
        const chosenObj = validOptions[Math.floor(Math.random() * validOptions.length)];

        // 4.3 写入新标签
        if (chosenObj.addTags) {
          chosenObj.addTags.forEach(t => memoryTags.add(t));
        }

        // 替换模板中的占位符
        templateText = templateText.split(`[${slot}]`).join(chosenObj.text);

        // 4.4 状态机转移：如果有指定的 nextPool 就跳跃，否则顺序下一个
        if (chosenObj.nextPool) {
          targetPoolName = chosenObj.nextPool;
        } else {
          targetPoolName = slotNames[index + 1] || null;
        }
      }
    });

    this.pendingEventGeneration = true;
    this.handleAction(templateText);
    this.closeAllModals();

  } catch (error) {
    console.error("事件生成失败:", error);
    this.showTemporaryMessage("事件生成出错: " + error.message);
  }
}
async _handleEventCardGeneration(eventCardContent) {
  try {
    const entryName = "【存入】生成的事件";

    // 1. 先读取一下，看看该条目是否已经存在（为了判断是追加还是全新创建）
    const existingEntries = await WorldbookManager.fetchEntries(entryName, { exactMatch: true, scope: 'primary' });
    const targetEntry = existingEntries[0];

    // 2. 拼接最终内容
    const finalContent = (targetEntry && targetEntry.content)
      ? targetEntry.content + "\n\n---\n\n" + eventCardContent
      : eventCardContent;

    // 3. 统一调用原子化写入接口
    // 管家底层会自动识别现有名字，如果有了就深度 update，没有就自动执行 create
    await WorldbookManager.saveEntries([{
      comment: entryName,
      keys: [entryName],
      content: finalContent,
      enabled: true
    }]);

    // 4. 根据之前的读取状态提示不同的信息
    const actionText = targetEntry ? "追加" : "创建并";
    this.showTemporaryMessage(`事件已成功${actionText}保存至世界书条目“${entryName}”！`, 3000);

  } catch (error) {
    console.error("保存事件卡片失败:", error);
    this.showTemporaryMessage(`错误：保存事件卡片失败！`, 4000);
  }
}
  }
  const rules = new EventRules();
  rules.DB = { templates: { event_template: bridge.template }, eventWordbank: bridge.wordbank };
  rules._fallback = { templates: {} };
  rules.showTemporaryMessage = bridge.message || (() => {});
  rules.handleAction = bridge.handleAction || (() => {});
  rules.closeAllModals = () => {};
  GameDBManager = rules;
  return rules;
}
// END ORIGINAL EVENT

  async function books(api, source, guard, token) {
    return Promise.all(source.names.map(async book => {
      usable(guard, token);
      try {
        const entries = await api.getWorldbook(book);
        usable(guard, token);
        if (!Array.isArray(entries)) throw new Error(`${book} 未返回条目列表`);
        return { book, entries };
      } catch (error) {
        if (book !== source.primary && /未能找到世界书|世界书不存在|worldbook not found|lorebook not found/i.test(String(error?.message || error))) {
          usable(guard, token); return { book, entries: [] };
        }
        throw error;
      }
    }));
  }
  function configFrom(all, kind) {
    const pattern = kind === 'template' ? /提示词模板/ : /事件词库/;
    const bucket = kind === 'template' ? /【模板】|【配置】/ : /【配置】/;
    let selected = null;
    for (const { book, entries } of all) {
      const matches = entries.filter(entry => pattern.test(nameOf(entry)) && bucket.test(nameOf(entry)));
      if (!matches.length) continue;
      selected = { book, entry: matches.at(-1) };
    }
    if (!selected) return null;
    const { book, entry } = selected;
    let value;
    try { value = parse(entry.content); }
    catch { throw new Error(`${book}「${nameOf(entry)}」不是有效 JSON`); }
    if (!record(value)) throw new Error(`${book}「${nameOf(entry)}」必须是 JSON 对象`);
    return { value, source: { book, uid: entry.uid, name: nameOf(entry) } };
  }
  const ruleRevision = all => signature(all.map(({ book, entries }) => ({ book,
    entries: entries.filter(entry => /提示词模板|事件词库/.test(nameOf(entry)) && /【模板】|【配置】/.test(nameOf(entry))) })));
  async function loadConfig(guard) {
    const sourceGuard = scopedGuard();
    guard = scopedGuard(guard);
    const token = epoch;
    usable(guard, token);
    const api = await host();
    usable(guard, token);
    const source = await binding(api);
    const all = await books(api, source, guard, token);
    await assertBinding(api, source, guard, token);
    if (ruleRevision(all) !== ruleRevision(await books(api, source, guard, token)))
      throw Error('事件模板或词库已变化，请重新读取');
    await assertBinding(api, source, guard, token);
    const templates = configFrom(all, 'template');
    const wordbank = configFrom(all, 'wordbank');
    const template = templates?.value.event_template;
    if (typeof template !== 'string' || !template.trim()) throw new Error('世界书没有可用的 event_template 事件生成模板');
    if (!record(wordbank?.value) || !Object.keys(wordbank.value).length) throw new Error('世界书没有可用的事件词库');
    const result = { template, wordbank: wordbank.value, sources: { template: templates.source, wordbank: wordbank.source } };
    configs.set(result, { api, source, token, guard: sourceGuard, public: signature(result), revision: ruleRevision(all),
      primaryRules: ruleRevision(all.filter(row => row.book === source.primary)) });
    return result;
  }
  async function assertConfig(config, guard) {
    const ticket = configs.get(config);
    if (!ticket || ticket.public !== signature(config)) throw Error('事件模板来源无效或已被修改，请重新读取');
    ticket.guard();
    const { api, source, token, revision } = ticket;
    await assertBinding(api, source, guard, token);
    if (revision !== ruleRevision(await books(api, source, guard, token))) throw Error('事件模板或词库已变化，请重新读取');
    await assertBinding(api, source, guard, token);
    ticket.guard();
    if (ticket.public !== signature(config)) throw Error('事件模板来源无效或已被修改，请重新读取');
  }
  function compose(template, wordbank, random = Math.random) {
    usable();
    const source = String(template || '');
    const slots = [...new Set([...source.matchAll(/\[(词库\d+)\]/g)].map(match => match[1]))]
      .sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)));
    if (!record(wordbank)) throw new Error('事件词库格式无效');
    if (!source.trim()) throw Error('事件生成模板不能为空');
    const tags = new Set();
    const choices = [];
    const pools = Object.create(null);
    for (const [pool, rows] of Object.entries(wordbank)) {
      if (!Array.isArray(rows)) throw Error(`「${pool}」必须是词条数组`);
      pools[pool] = rows.map(item => {
        if (!record(item) || typeof item.text !== 'string' || !item.text.trim()) throw Error(`「${pool}」包含无效词条`);
        for (const key of ['reqTags', 'forbidTags', 'addTags']) {
          if (item[key] != null && (!Array.isArray(item[key]) || !item[key].every(tag => typeof tag === 'string')))
            throw Error(`「${pool}」的 ${key} 必须是标签数组`);
        }
        if (item.nextPool != null && typeof item.nextPool !== 'string') throw Error(`「${pool}」的 nextPool 必须为字符串`);
        // Observe the original rule's selection without implementing a second draw loop.
        return new Proxy(item, { get(target, key) {
          if (key === 'text') {
            choices.push({ slot: slots[choices.length], pool, text: target.text });
            for (const tag of target.addTags || []) tags.add(tag);
          }
          return Reflect.get(target, key);
        } });
      });
    }
    let text, failure;
    const rules = originalRules({
      template: source, wordbank: pools, handleAction(value) { text = value; },
      random() {
        const roll = Number(random());
        if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw Error('随机源必须返回 0 至 1（不含 1）的数');
        return roll;
      },
      console: { error(_label, error) { failure = error; } },
    });
    void rules.triggerEventGeneration();
    if (failure) throw failure;
    if (!text || choices.length !== slots.length) throw Error('事件词库缺少可用词条或槽位，未请求模型');
    return { text, choices, tags: [...tags] };
  }
  function extractCard(message) {
    usable();
    if (modules['cryptLord.responseNormalizer'] !== normalizer) throw Error('事件解析服务已变化，请重新读取');
    const raw = String(message || ''), source = normalizer.maskHidden(raw);
    const spans = ['EventCard', '事件卡片'].flatMap(tag =>
      normalizer.tagSpans(source, tag).filter(span => span.closed));
    const span = spans.sort((a, b) => a.start - b.start).at(-1);
    return span ? raw.slice(span.innerStart, span.innerEnd).trim() : '';
  }
  async function generateCard(prompt, isCurrent = () => true, rules) {
    isCurrent = scopedGuard(isCurrent);
    const token = epoch;
    const valid = async () => {
      usable(isCurrent, token);
      if (rules) await assertConfig(rules, isCurrent);
      usable(isCurrent, token);
    };
    await valid();
    if (!isCurrent()) throw Error('窗口或聊天已变化，已取消生成');
    const text = String(prompt || '').trim();
    if (!text) throw new Error('事件生成指令不能为空');
    const config = {
      should_silence: true, should_stream: false, max_chat_history: 0,
      use_mes_examples: false, use_story_string: false, use_authors_note: false, use_persona: false,
      ordered_prompts: [
        { role: 'system', content: '根据提供的事件模板生成一张事件卡。只输出 <EventCard>事件卡内容</EventCard>，不要续写正文，不要输出变量更新。' },
        { role: 'user', content: text },
      ],
    };
    const settlement = await contract.waitGlobalInitialized('cryptLord.variableSettlementApi', { timeoutMs: 10000 });
    await valid();
    const settings = structuredClone(await settlement.readSettings());
    await valid();
    if (settings.useCustomApi) {
      if (!settings.apiUrl || !settings.model) throw new Error('系统副 API 需要填写 URL 和模型名');
      config.custom_api = { apiurl: settings.apiUrl, key: settings.apiKey, model: settings.model, source: 'openai' };
    }
    const api = await host();
    await valid();
    if (modules['cryptLord.variableSettlementApi'] !== settlement || modules['cryptLord.hostApi'] !== api)
      throw Error('事件模型服务已变化，请重新读取');
    const settingsRevision = signature(settings);
    const assertSettings = async () => {
      if (modules['cryptLord.variableSettlementApi'] !== settlement ||
        signature(await settlement.readSettings()) !== settingsRevision) throw Error('事件模型设置已变化，请重新生成');
      await valid();
      if (modules['cryptLord.variableSettlementApi'] !== settlement) throw Error('事件模型服务已变化，请重新读取');
    };
    await assertSettings();
    const response = await api.generateRaw(config);
    await valid();
    if (modules['cryptLord.variableSettlementApi'] !== settlement || modules['cryptLord.hostApi'] !== api)
      throw Error('事件模型服务已变化，请重新读取');
    await assertSettings();
    const card = extractCard(typeof response === 'string' ? response : response?.content);
    if (!card) throw new Error('模型未返回 EventCard 或事件卡片标签，未写入世界书');
    if (normalizer.maskHidden(card) !== card) throw Error('事件卡包含变量更新或分析标签，未归档');
    return card;
  }
  async function readCardTarget(guard) {
    const sourceGuard = scopedGuard();
    guard = scopedGuard(guard);
    const token = epoch;
    usable(guard, token);
    const api = await host();
    usable(guard, token);
    const source = await binding(api);
    const entries = await api.getWorldbook(source.primary);
    if (!Array.isArray(entries)) throw new Error('源堡世界书未返回条目列表');
    await assertBinding(api, source, guard, token);
    const target = targetFrom(entries);
    target.book = source.primary;
    targets.set(target.revision, { api, source, token, guard: sourceGuard, public: signature(target.revision), entry: structuredClone(target.entry) });
    return target;
  }
  function targetFrom(entries) {
    if (!Array.isArray(entries)) throw Error('归档世界书未返回条目列表');
    const matches = entries.filter(item =>
      String(item?.name || '').trim() === CARD_NAME || String(item?.comment || '').trim() === CARD_NAME);
    if (matches.length > 1) throw new Error('生成的事件条目重名，请先整理世界书');
    const entry = matches[0] || null;
    if (entry && entry.uid == null) throw Error('生成的事件条目缺少 UID');
    if (entry && (!Number.isInteger(entry.uid) || entry.uid < 0)) throw Error('生成的事件条目 UID 无效');
    if (entry && entries.filter(item => item.uid === entry.uid).length !== 1) throw Error('生成的事件条目 UID 重复，请先整理世界书');
    return { entry, revision: { uid: entry?.uid ?? null, content: entry ? String(entry.content || '') : null } };
  }
  function sameRevision(left, right) {
    return record(left) && record(right) && left.uid === right.uid && left.content === right.content;
  }
  let queue = Promise.resolve();
  function saveCard(content, expectedRevision, isCurrent = () => true, config) {
    const ticket = targets.get(expectedRevision), text = String(content || '').trim();
    isCurrent = scopedGuard(isCurrent);
    const task = queue.then(async () => {
      if (!ticket || targets.get(expectedRevision) !== ticket || ticket.public !== signature(expectedRevision))
        throw Error('生成的事件来源已被修改或无效，请重新读取');
      ticket.guard();
      const { api, source, token } = ticket;
      usable(isCurrent, token);
      if (!text) throw new Error('事件卡片内容不能为空');
      if (!isCurrent()) throw new Error('窗口或聊天已变化，已取消归档');
      const valid = async () => {
        ticket.guard();
        if (ticket.public !== signature(expectedRevision)) throw Error('生成的事件来源已被修改或无效，请重新读取');
        await assertBinding(api, source, isCurrent, token);
        if (config) await assertConfig(config, isCurrent);
        await assertBinding(api, source, isCurrent, token);
      };
      await valid();
      const target = await readCardTarget(isCurrent);
      if (!sameRevision(target.revision, expectedRevision)) throw new Error('生成的事件条目已被修改，请重新读取后再保存');
      if (signature(target.entry) !== signature(ticket.entry)) throw Error('生成的事件条目已变化，请重新读取');
      await valid();
      let failure, expectedEntry, acknowledged = false;
      function contains(actual, expected) {
        return record(expected) ? record(actual) && Object.keys(expected).every(key => contains(actual[key], expected[key])) :
          signature(actual) === signature(expected);
      }
      const confirmed = actual => expectedEntry && actual.entry && (target.entry
        ? signature(actual.entry) === signature(expectedEntry) : contains(actual.entry, expectedEntry));
      const rules = originalRules({
        console: { error(_label, error) { failure = error; } },
        worldbook: {
          async fetchEntries() { return target.entry ? [target.entry] : []; },
          async saveEntries(tasks) {
            usable(isCurrent, token);
            if (!isCurrent()) throw Error('窗口或聊天已变化，已取消归档');
            const payload = tasks[0];
            await api.updateWorldbookWith(source.primary, async () => {
              await valid();
              const entries = await api.getWorldbook(source.primary);
              await valid();
              usable(isCurrent, token);
              if (modules['cryptLord.hostApi'] !== api) throw Error('事件宿主已变化，请重新读取');
              if (config && configs.get(config)?.primaryRules !== ruleRevision([{ book: source.primary, entries }]))
                throw Error('事件模板或词库已变化，请重新读取');
              if (!isCurrent()) throw Error('窗口或聊天已变化，已取消归档');
              const current = targetFrom(entries);
              if (!sameRevision(current.revision, target.revision) ||
                signature(current.entry) !== signature(ticket.entry)) throw Error('生成的事件条目已变化，请重新读取');
              const fields = {
                content: payload.content, enabled: payload.enabled,
                strategy: { ...(current.entry?.strategy || {}), type: 'selective', keys: payload.keys },
                recursion: { ...(current.entry?.recursion || {}), prevent_incoming: true, prevent_outgoing: true, delay_until: null },
              };
              const nextEntry = current.entry ? { ...current.entry, ...fields } : { name: payload.comment, ...fields };
              expectedEntry = structuredClone(nextEntry);
              return current.entry
                ? entries.map(item => item.uid === current.entry.uid ? nextEntry : item)
                : [...entries, nextEntry];
            }, { render: 'debounced' });
            acknowledged = true;
            await valid();
          },
        },
      });
      await rules._handleEventCardGeneration(text);
      let actual;
      try {
        await valid();
        actual = await readCardTarget(isCurrent);
        await valid();
      } catch (error) {
        targets.delete(expectedRevision);
        const unconfirmed = Error(`归档结果未确认，请重新读取；事件卡草稿保留：${error.message}`);
        unconfirmed.requiresReload = true;
        throw unconfirmed;
      }
      if (confirmed(actual)) {
        targets.delete(expectedRevision);
        return failure ? { ...actual, warning: '事件卡片已追加，但宿主保存响应丢失；实际归档已核对' } : actual;
      }
      if (acknowledged || signature(actual.entry) !== signature(ticket.entry)) {
        targets.delete(expectedRevision);
        const unconfirmed = Error('归档结果未确认或条目已变化，请重新读取；事件卡草稿保留');
        unconfirmed.requiresReload = true;
        throw unconfirmed;
      }
      throw failure || Error('归档未返回结果，请重新读取');
    });
    queue = task.catch(() => { /* A failed write does not block later attempts. */ });
    return task;
  }
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents() || {};
  const bind = (event, fn) => { if (event) subscriptions.push(after.bindEvent(event, fn)); };
  bind(events.CHAT_CHANGED, () => { epoch++; generating = false; });
  bind(events.GENERATION_STARTED, (type, options, dryRun) => {
    if (!['quiet', 'quiet_prompt', 'dryRun'].includes(type) && !options?.quiet_prompt && !options?.dryRun && !dryRun) {
      epoch++; generating = true;
    }
  });
  for (const event of new Set([events.GENERATION_ENDED, events.GENERATION_STOPPED].filter(Boolean)))
    bind(event, () => { generating = false; });
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, ready: !disposed }),
    loadConfig, assertConfig, compose, extractCard, generateCard, readCardTarget, saveCard, originalRules,
    dispose() {
      disposed = true; epoch++; subscriptions.forEach(item => item?.stop());
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
