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
  const parse = modules['cryptLord.randomEvents']?.parseEntry;
  if (!contract || !parse) throw new Error(`[${KEY}] 随机事件解析器尚未加载`);
  const host = () => contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
  const nameOf = entry => String(entry?.comment || entry?.name || '').trim();
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));

  async function books(api) {
    return Promise.all([SECONDARY, PRIMARY].map(async book => {
      try {
        const entries = await api.getWorldbook(book);
        if (!Array.isArray(entries)) throw new Error(`${book} 未返回条目列表`);
        return { book, entries };
      } catch (error) {
        if (/未能找到世界书|世界书不存在|worldbook not found|lorebook not found/i.test(String(error?.message || error))) return { book, entries: [] };
        throw error;
      }
    }));
  }
  function configFrom(all, kind) {
    const pattern = kind === 'template' ? /提示词模板/ : /事件词库/;
    const bucket = kind === 'template' ? /【模板】|【配置】/ : /【配置】/;
    let found = null;
    for (const { book, entries } of all) {
      const matches = entries.filter(entry => pattern.test(nameOf(entry)) && bucket.test(nameOf(entry)));
      if (matches.length > 1) throw new Error(`${book} 中${kind === 'template' ? '提示词模板' : '事件词库'}条目重复`);
      if (!matches.length) continue;
      let value;
      try { value = parse(matches[0].content); }
      catch { throw new Error(`${book}「${nameOf(matches[0])}」不是有效 JSON`); }
      if (!record(value)) throw new Error(`${book}「${nameOf(matches[0])}」必须是 JSON 对象`);
      found = value;
    }
    return found;
  }
  async function loadConfig() {
    const all = await books(await host());
    const templates = configFrom(all, 'template');
    const wordbank = configFrom(all, 'wordbank');
    const template = templates?.event_template;
    if (typeof template !== 'string' || !template.trim()) throw new Error('世界书没有可用的 event_template 事件生成模板');
    if (!record(wordbank) || !Object.keys(wordbank).length) throw new Error('世界书没有可用的事件词库');
    return { template, wordbank };
  }
  function compose(template, wordbank, random = Math.random) {
    const source = String(template || '');
    const slots = [...new Set([...source.matchAll(/\[(词库\d+)\]/g)].map(match => match[1]))]
      .sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)));
    if (!slots.length) throw new Error('事件模板没有 [词库N] 占位符');
    if (!record(wordbank)) throw new Error('事件词库格式无效');
    let poolName = slots[0];
    const tags = new Set();
    const choices = [];
    let result = source;
    for (const [index, slot] of slots.entries()) {
      const pool = Array.isArray(wordbank[poolName]) && wordbank[poolName].length
        ? wordbank[poolName] : wordbank[slot];
      if (!Array.isArray(pool) || !pool.length) throw new Error(`「${poolName}」与「${slot}」都没有可用词条`);
      const valid = pool.filter(item => record(item) && typeof item.text === 'string' && item.text.trim());
      if (valid.length !== pool.length) throw new Error(`「${poolName}」包含无效词条`);
      const eligible = valid.filter(item =>
        (Array.isArray(item.reqTags) ? item.reqTags : []).every(tag => tags.has(tag)) &&
        (Array.isArray(item.forbidTags) ? item.forbidTags : []).every(tag => !tags.has(tag)));
      const candidates = eligible.length ? eligible : valid;
      const roll = Number(random());
      if (!Number.isFinite(roll) || roll < 0 || roll > 1) throw new Error('随机源返回了无效值');
      const chosen = candidates[Math.min(candidates.length - 1, Math.floor(roll * candidates.length))];
      for (const tag of Array.isArray(chosen.addTags) ? chosen.addTags : []) tags.add(tag);
      result = result.split(`[${slot}]`).join(chosen.text);
      choices.push({ slot, pool: poolName, text: chosen.text });
      poolName = typeof chosen.nextPool === 'string' && chosen.nextPool.trim()
        ? chosen.nextPool.trim() : slots[index + 1];
    }
    return { text: result, choices, tags: [...tags] };
  }
  function extractCard(message) {
    const matches = [...String(message || '').matchAll(/<\s*(?:EventCard|事件卡片)(?:\s+[^>]*)?>([\s\S]*?)<\s*\/\s*(?:EventCard|事件卡片)\s*>/gi)];
    return matches.at(-1)?.[1]?.trim() || '';
  }
  async function generateCard(prompt) {
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
    const settings = await settlement.readSettings();
    if (settings.useCustomApi) {
      if (!settings.apiUrl || !settings.model) throw new Error('系统副 API 需要填写 URL 和模型名');
      config.custom_api = { apiurl: settings.apiUrl, key: settings.apiKey, model: settings.model, source: 'openai' };
    }
    const response = await (await host()).generateRaw(config);
    const card = extractCard(typeof response === 'string' ? response : response?.content);
    if (!card) throw new Error('模型未返回 EventCard 或事件卡片标签，未写入世界书');
    return card;
  }
  async function readCardTarget() {
    const api = await host();
    const entries = await api.getWorldbook(PRIMARY);
    if (!Array.isArray(entries)) throw new Error('源堡世界书未返回条目列表');
    const matches = entries.filter(item =>
      String(item?.name || '').trim() === CARD_NAME || String(item?.comment || '').trim() === CARD_NAME);
    if (matches.length > 1) throw new Error('生成的事件条目重名，请先整理世界书');
    const entry = matches[0] || null;
    return { entry, revision: entry ? String(entry.content || '') : null };
  }
  let queue = Promise.resolve();
  function saveCard(content, expectedRevision, isCurrent = () => true) {
    const task = queue.then(async () => {
      const text = String(content || '').trim();
      if (!text) throw new Error('事件卡片内容不能为空');
      if (!isCurrent()) throw new Error('窗口或聊天已变化，已取消归档');
      const api = await host();
      const target = await readCardTarget();
      if (target.revision !== expectedRevision) throw new Error('生成的事件条目已被修改，请重新读取后再保存');
      const nextContent = target.revision ? `${target.revision}\n\n---\n\n${text}` : text;
      if (target.entry) {
        if (target.entry.uid == null) throw new Error('生成的事件条目缺少 UID');
        if (!isCurrent()) throw new Error('窗口或聊天已变化，已取消归档');
        let updated = false;
        await api.updateWorldbookWith(PRIMARY, entries => entries.map(entry => {
          if (entry.uid !== target.entry.uid) return entry;
          if (String(entry.content || '') !== target.revision) throw new Error('生成的事件条目已变化');
          if (!isCurrent()) throw new Error('窗口或聊天已变化，已取消归档');
          updated = true;
          return { ...entry, content: nextContent };
        }), { render: 'debounced' });
        if (!updated) throw new Error('生成的事件条目已被移除');
      } else {
        if ((await readCardTarget()).entry) throw new Error('生成的事件条目已由其他操作创建');
        if (!isCurrent()) throw new Error('窗口或聊天已变化，已取消归档');
        await api.createWorldbookEntries(PRIMARY, [{
          name: CARD_NAME, comment: CARD_NAME, content: nextContent, enabled: true,
          strategy: { type: 'selective', keys: [CARD_NAME] },
          position: { type: 'at_depth', role: 'system', depth: 0, order: 100 },
        }]);
      }
      return { revision: nextContent };
    });
    queue = task.catch(() => { /* A failed write does not block later attempts. */ });
    return task;
  }
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, ready: true }),
    loadConfig, compose, extractCard, generateCard, readCardTarget, saveCard,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
