(() => {
  'use strict';

  const KEY = 'cryptLord.variableSettlementApi';
  const HOST_API_KEY = 'cryptLord.hostApi';
  const VARIABLE_PATCH_KEY = 'cryptLord.variablePatch';
  const CONTEXT_CONFIG_KEY = 'cryptLord.aiContextConfig';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const SETTINGS_KEY = 'cryptLord.variableSettlement';
  let queue = Promise.resolve(), disposed = false, epoch = 0;
  const results = new WeakMap(), settingsProofs = new WeakMap(), floorProofs = new WeakMap(), subscriptions = [];
  const after = modules['cryptLord.afterNativeHost'];
  const DEFAULTS = Object.freeze({
    enabled: true,
    streamingEnabled: false,
    gemini37fPrefill: false,
    useCustomApi: false,
    apiUrl: '',
    apiKey: '',
    model: '',
    retryLimit: 3,
  });

  function clone(value) {
    if (value === undefined) return undefined;
    return typeof window.structuredClone === 'function' ? window.structuredClone(value) : JSON.parse(JSON.stringify(value));
  }

  function record(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  function normalizeSettings(value) {
    if (value !== undefined && !record(value)) throw new Error('独立 API 配置格式无效，请检查脚本设置。');
    const source = { ...DEFAULTS, ...(record(value) ? value : {}) };
    for (const key of ['enabled', 'streamingEnabled', 'gemini37fPrefill', 'useCustomApi']) {
      if (typeof source[key] !== 'boolean') throw new Error(`独立 API 配置 ${key} 必须是开关值。`);
    }
    for (const key of ['apiUrl', 'apiKey', 'model']) {
      if (typeof source[key] !== 'string') throw new Error(`独立 API 配置 ${key} 必须是文本。`);
    }
    const retryLimit = Number(source.retryLimit);
    return Object.freeze({
      enabled: Boolean(source.enabled),
      streamingEnabled: Boolean(source.streamingEnabled),
      gemini37fPrefill: Boolean(source.gemini37fPrefill),
      useCustomApi: Boolean(source.useCustomApi),
      apiUrl: String(source.apiUrl || '').trim(),
      apiKey: String(source.apiKey || '').trim(),
      model: String(source.model || '').trim(),
      retryLimit: Number.isFinite(retryLimit)
        ? Math.max(0, Math.min(999, Math.floor(retryLimit)))
        : DEFAULTS.retryLimit,
    });
  }

  async function hostApi() {
    return contract.waitGlobalInitialized(HOST_API_KEY, { timeoutMs: 10000 });
  }

  function scriptOptions(host) {
    const options = host.scriptVariableOptions?.() || { type: 'script', script_id: host.getScriptId?.() };
    if (options.type !== 'script' || !options.script_id) throw new Error('独立 API 配置未能确定 script_id，已停止读写。');
    return options;
  }

  const canonical = value => Object.prototype.toString.call(value) === '[object RegExp]'
    ? { regexp: value.source, flags: value.flags } : Array.isArray(value) ? value.map(canonical) : record(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  const same = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
  function check(guard) {
    if (disposed || modules[KEY] !== api || guard && !guard()) throw new Error('独立 API 操作已取消。');
  }
  const scopedGuard = (guard, token = epoch) => () => !disposed && token === epoch && (!guard || guard());
  function sourceFor(host) {
    return { host, after, document: after?.getHost?.()?.document, token: epoch, options: clone(scriptOptions(host)) };
  }
  function checkSource(source, guard) {
    check(guard);
    if (source.token !== epoch || modules[HOST_API_KEY] !== source.host ||
      modules['cryptLord.afterNativeHost'] !== source.after || after?.getHost?.()?.document !== source.document)
      throw Error('变量操作来源已变化，请重新读取');
    if (!same(scriptOptions(source.host), source.options)) throw Error('独立 API 脚本身份已改变，请重新读取。');
  }
  async function snapshot(host, guard) {
    check(guard);
    const source = sourceFor(host);
    const options = scriptOptions(host);
    const variables = await host.getVariables(options);
    check(guard);
    checkSource(source, guard);
    if (!record(variables)) throw new Error('读取独立 API 脚本设置失败。');
    if (!same(options, scriptOptions(host))) throw new Error('独立 API 脚本身份已改变，请重新读取。');
    const revision = { options: clone(options), exists: Object.hasOwn(variables, SETTINGS_KEY), raw: clone(variables[SETTINGS_KEY]) };
    settingsProofs.set(revision, { source, public: clone(revision) });
    return { settings: normalizeSettings(variables[SETTINGS_KEY]), revision };
  }
  async function readSnapshot(guard) {
    guard = scopedGuard(guard);
    await queue;
    check(guard);
    return snapshot(await hostApi(), guard);
  }
  async function readSettings() { return (await readSnapshot()).settings; }
  function validateCustom(settings) {
    if (!settings.useCustomApi) return;
    let url;
    try { url = new URL(settings.apiUrl); } catch { /* Report a configuration error without leaking credentials. */ }
    if (!url || !['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new Error('独立 API URL 必须是无内嵌账号密码的 HTTP(S) 地址。');
    }
    if (!settings.model) throw new Error('请填写独立 API 模型名。');
  }
  function saveSettings(value, revision, guard) {
    const next = normalizeSettings(value), expected = clone(revision);
    validateCustom(next);
    guard = scopedGuard(guard);
    const proof = revision ? settingsProofs.get(revision) : null;
    const execute = async () => {
      check(guard);
      if (revision && (!proof || proof.revoked || !same(proof.public, expected)))
        throw Error('独立 API 来源凭据无效或配置已被别处更改，请重新读取。');
      if (proof) checkSource(proof.source, guard);
      const host = await hostApi();
      const current = await snapshot(host, guard);
      const baseline = expected || current.revision;
      const source = proof?.source || settingsProofs.get(current.revision).source;
      if (!same(current.revision, baseline)) throw new Error('独立 API 配置已被别处更改，请重新读取。');
      const stored = { ...(record(baseline.raw) ? clone(baseline.raw) : {}), ...clone(next) };
      let transformed = false, writeError = null;
      try {
        await host.updateVariablesWith(variables => {
          checkSource(source, guard);
          if (!record(variables) || Object.hasOwn(variables, SETTINGS_KEY) !== baseline.exists || !same(variables[SETTINGS_KEY], baseline.raw))
            throw new Error('独立 API 配置已被别处更改，请重新读取。');
          transformed = true;
          return { ...variables, [SETTINGS_KEY]: clone(stored) };
        }, baseline.options);
      } catch (error) { writeError = error; }
      if (writeError && !transformed) { writeError.requiresReload = false; throw writeError; }
      try {
        checkSource(source, guard);
        const result = await snapshot(host, guard);
        checkSource(source, guard);
        if (!transformed || !same(result.revision.raw, stored) || writeError && same(result.revision, baseline)) {
          if (writeError && same(result.revision, baseline)) writeError.requiresReload = false;
          throw writeError || Error('提交后配置与保存值不一致。');
        }
        if (proof) proof.revoked = true;
        return { ...next, revision: result.revision, warning: writeError ? '独立 API 配置已保存，但宿主未返回成功响应。' : '' };
      } catch (error) {
        if (writeError) { writeError.requiresReload ??= true; if (writeError.requiresReload && proof) proof.revoked = true; throw writeError; }
        if (proof) proof.revoked = true;
        return { ...next, warning: '独立 API 配置已提交，但复核失败，请重新读取。', revision: null };
      }
    };
    const task = queue.then(execute);
    queue = task.catch(() => {});
    return task;
  }
  async function getModelList(customApi, guard) {
    const config = { apiurl: String(customApi?.apiurl || '').trim(), key: String(customApi?.key || '').trim() };
    validateCustom({ useCustomApi: true, apiUrl: config.apiurl, model: 'model-list' });
    guard = scopedGuard(guard);
    check(guard);
    const host = await hostApi(), source = sourceFor(host);
    checkSource(source, guard);
    const names = await host.getModelList(config);
    check(guard);
    checkSource(source, guard);
    if (!Array.isArray(names) || names.some(name => typeof name !== 'string')) throw new Error('模型列表格式无效。');
    return [...new Set(names.map(name => name.trim()).filter(Boolean))];
  }

  function responseText(response) {
    return typeof response === 'string' ? response : String(response?.content || '');
  }

  function variablePrompt() {
    return [
      '你是诡秘之主跑团的变量结算副模型。只根据本轮给出的真实状态、玩家行动和正文，生成最小必要的变量更新。',
      '不得编造未发生的事件；不要重述正文、不要输出解释、不要引用记忆或历史摘要。',
      '输出必须且只能是 <UpdateVariable><JSONPatch>...</JSONPatch></UpdateVariable>。',
      'JSONPatch 内可以是 {"stat_data":[],"npc_data":[],"world_data":[]}；每项仅允许 add、replace、remove，path 使用 JSON Pointer。',
      '没有需要更新的变量时输出三个空数组。',
    ].join('\n');
  }

  async function originalVariableTemplate(host, name, guard) {
    const binding = clone(await host.getCharWorldbookNames('current'));
    check(guard);
    const primary = binding?.primary || '1源堡';
    const books = [...new Set([...(binding?.additional || []), '2历史孔隙']
      .filter(book => book && book !== primary)), primary];
    const selected = new Map(), revision = { binding, books: [] };
    for (const book of books) {
      check(guard);
      let rows;
      try { rows = await host.getWorldbook(book); }
      catch (error) {
        if (book !== primary && /世界书.*(?:不存在|未找到)|未能找到世界书|(?:worldbook|lorebook).*?(?:not found|does not exist)/i.test(String(error?.message || error))) {
          revision.books.push({ book, missing: true }); continue;
        }
        else throw error;
      }
      check(guard);
      if (!Array.isArray(rows)) throw Error('变量提示词世界书读取失败');
      const relevant = rows.filter(entry => {
        const title = String(entry?.name ?? entry?.comment ?? '');
        return title.includes('【模板】') && title.includes('提示词模板');
      });
      revision.books.push({ book, entries: clone(relevant) });
      for (const entry of relevant) {
        const title = String(entry.name ?? entry.comment ?? '');
        selected.set(title, { book, entry: clone(entry) });
      }
    }
    if (!same(binding, await host.getCharWorldbookNames('current'))) throw Error('变量模板世界书绑定已变化，未请求模型');
    let templates = {};
    for (const { book, entry } of selected.values()) {
      let parsed;
      try {
        const parser = modules['cryptLord.industryState']?.parseWorldbookJson || modules['cryptLord.abilityState']?.parseWorldbookJson;
        parsed = parser ? parser(entry.content) :
          JSON.parse(String(entry.content || '').replace(/^\s*```(?:jsonc|json)?\s*/i, '').replace(/\s*```\s*$/, '').trim());
        if (!record(parsed)) throw Error('模板集合必须是对象');
      } catch { throw Error(`世界书「${book}」的变量提示词模板 JSON 损坏，未请求模型`); }
      templates = { ...templates, ...parsed };
    }
    if (!record(templates) || typeof templates[name] !== 'string' || !templates[name].trim())
      throw Error(`缺少世界书提示词模板 ${name}，未请求模型`);
    check(guard);
    return { content: templates[name].trim(), revision };
  }
  function receipt(result, source) {
    const value = Object.freeze(result);
    results.set(value, { ...source, public: clone(result) });
    return value;
  }
  async function assertResult(result, guard) {
    const saved = results.get(result);
    if (!saved || !same(saved.public, result)) throw Error('变量结算来源凭据无效或结果已被修改');
    const valid = () => { check(guard); return saved.epoch === epoch && modules[KEY] === api; };
    check(valid);
    if (saved.source) checkSource(saved.source, valid);
    if (saved.patchService && modules[VARIABLE_PATCH_KEY] !== saved.patchService) throw Error('变量指令解析服务已变化，未保存旧结果');
    if (saved.normalizer && modules['cryptLord.responseNormalizer'] !== saved.normalizer) throw Error('变量正文归一化服务已变化，未保存旧结果');
    const host = await hostApi(), current = await snapshot(host, valid);
    if (!same(saved.settingsRevision, current.revision)) throw Error('变量结算设置已变化，未保存旧结果');
    if (saved.policy) {
      if (modules[CONTEXT_CONFIG_KEY] !== saved.policyService) throw Error('变量可见性服务已替换或卸载');
      const policy = await saved.policyService.readConfig();
      check(valid);
      if (!same(saved.policy, policy)) throw Error('变量可见性或锁定设置已变化，未保存旧结果');
    }
    if (saved.template) {
      const currentTemplate = await originalVariableTemplate(host, saved.templateName, valid);
      if (!same(saved.template.revision, currentTemplate.revision)) throw Error('变量模板来源已变化，未保存旧结果');
    }
    if (saved.floorSource) await assertFloorSource(saved.floorSource, valid);
    if (saved.source) checkSource(saved.source, valid);
    check(valid);
  }

  function selectedPages(rows) {
    if (!Array.isArray(rows) || rows.some((row, index) => !record(row) || !Number.isInteger(row.message_id) ||
      row.message_id < 0 || index && row.message_id <= rows[index - 1].message_id ||
      !['assistant', 'user', 'system'].includes(row.role) || !Number.isInteger(row.swipe_id) ||
      row.swipe_id < 0 || !Array.isArray(row.swipes) || !Array.isArray(row.swipes_data) ||
      !Array.isArray(row.swipes_info) || typeof row.swipes[row.swipe_id] !== 'string' ||
      !record(row.swipes_data[row.swipe_id]) || !record(row.swipes_info[row.swipe_id])))
      throw Error('原生消息页格式无效，请重新读取');
    return rows.map(row => ({ message_id: row.message_id, name: row.name, role: row.role, is_hidden: Boolean(row.is_hidden),
      message: row.swipes[row.swipe_id], data: clone(row.swipes_data[row.swipe_id]), extra: clone(row.swipes_info[row.swipe_id]) }));
  }
  function visibleRows(rows) {
    if (!Array.isArray(rows) || rows.some(row => !record(row) || typeof row.message !== 'string' || !record(row.data)))
      throw Error('原生楼层格式无效，请重新读取');
    return rows.map(row => ({ message_id: row.message_id, name: row.name, role: row.role, is_hidden: Boolean(row.is_hidden),
      message: row.message, data: row.data }));
  }
  async function readFloorSource({ messageId = null, guard } = {}) {
    guard = scopedGuard(guard);
    check(guard);
    if (messageId !== null && (!Number.isInteger(messageId) || messageId < 0)) throw Error('楼层编号无效');
    const host = await hostApi(), source = sourceFor(host);
    checkSource(source, guard);
    const messages = clone(await host.getChatMessages('0-{{lastMessageId}}'));
    checkSource(source, guard);
    const pages = clone(await host.getChatMessages('0-{{lastMessageId}}', { include_swipes: true }));
    checkSource(source, guard);
    const selected = selectedPages(pages).map(({ extra, ...row }) => row);
    if (!same(selected, visibleRows(messages))) throw Error('原生当前页与正文或变量不一致，请重新读取');
    const latest = messages.at(-1);
    const floor = messageId === null ? [...messages].reverse().find(row => row.role === 'assistant')
      : messages.find(row => row.message_id === messageId && row.role === 'assistant');
    if (!floor || !record(floor.data)) throw Error('所选 assistant 楼层没有有效变量对象');
    if (!same(pages, await host.getChatMessages('0-{{lastMessageId}}', { include_swipes: true })) ||
      !same(messages, await host.getChatMessages('0-{{lastMessageId}}')))
      throw Error('读取期间原生正文、变量或消息页已变化，请重新读取');
    checkSource(source, guard);
    const loaded = { floor: clone(floor), latest: clone(latest), messages: clone(messages) };
    floorProofs.set(loaded, { source, pages, messages, public: clone(loaded) });
    return loaded;
  }
  async function assertFloorSource(loaded, guard) {
    const proof = floorProofs.get(loaded);
    if (!proof || !same(loaded, proof.public)) throw Error('原生楼层来源凭据无效或已被修改');
    checkSource(proof.source, guard);
    const fresh = await proof.source.host.getChatMessages('0-{{lastMessageId}}', { include_swipes: true });
    checkSource(proof.source, guard);
    if (!same(proof.pages, fresh) || !same(proof.messages, await proof.source.host.getChatMessages('0-{{lastMessageId}}')))
      throw Error('原生正文、行动、消息页或前状态已变化，请重新读取');
    checkSource(proof.source, guard);
  }

  function makeInput({ previousData, userText, narrativeText }) {
    const state = record(previousData) ? previousData : {};
    return [
      `【本回合前状态】\n${JSON.stringify({ stat_data: state.stat_data || {}, npc_data: state.npc_data || {}, world_data: state.world_data || {} })}`,
      `【玩家行动】\n${String(userText || '继续/顺其自然')}`,
      `【本回合正文】\n${String(narrativeText || '')}`,
    ].join('\n\n');
  }

  function manualInput({ previousData, instruction, rawCommands }) {
    const state = record(previousData) ? previousData : {};
    return [
      `【当前真实楼层变量】\n${JSON.stringify({ stat_data: state.stat_data || {}, npc_data: state.npc_data || {}, world_data: state.world_data || {} })}`,
      `【玩家的变量修改要求】\n${String(instruction || '').trim()}`,
      `【当前原始指令】\n${String(rawCommands || '').trim() || '无待修复指令'}`,
    ].join('\n\n');
  }

  async function requestPatch({ previousData, input, purpose, policy: requestPolicy, policyService: requestedPolicyService,
    settings: capturedSettings, guard, assertInput, templateName = 'variable_template' }) {
    guard = scopedGuard(guard);
    const captured = await readSnapshot(guard);
    const settings = capturedSettings || captured.settings;
    if (!same(settings, captured.settings)) throw Error('变量结算设置已变化，请重新请求');
    validateCustom(settings);

    const host = await hostApi(), capturedSource = settingsProofs.get(captured.revision).source;
    const options = scriptOptions(host), token = epoch;
    const current = () => { check(guard); if (token !== epoch || modules[KEY] !== api) throw Error('变量结算请求已取消');
      checkSource(capturedSource, guard);
      if (!same(options, scriptOptions(host))) throw new Error('独立 API 脚本身份已改变，请重新请求。'); };
    current();
    const template = await originalVariableTemplate(host, templateName, guard);
    current();
    const policyService = await contract.waitGlobalInitialized(CONTEXT_CONFIG_KEY, { timeoutMs: 10000 });
    if (requestedPolicyService && requestedPolicyService !== policyService) throw Error('变量可见性来源服务已变化，未请求模型');
    const policySnapshot = await policyService.readConfig();
    const patchService = await contract.waitGlobalInitialized(VARIABLE_PATCH_KEY, { timeoutMs: 10000 });
    current();
    if (requestPolicy && !same(requestPolicy, policySnapshot)) throw Error('变量可见性或锁定设置已变化，未请求模型');
    const provenance = { settingsRevision: captured.revision, template, templateName, epoch: token, source: capturedSource,
      policy: clone(policySnapshot), policyService, patchService };
    async function beforeRequest() {
      current();
      checkSource(provenance.source, guard);
      if (modules[VARIABLE_PATCH_KEY] !== patchService) throw Error('变量指令解析服务已变化，未请求模型');
      const latest = await snapshot(host, guard);
      if (!same(latest.revision, captured.revision)) throw Error('变量结算设置已变化，未请求模型');
      const latestTemplate = await originalVariableTemplate(host, templateName, guard);
      if (!same(latestTemplate.revision, template.revision)) throw Error('变量模板来源已变化，未请求模型');
      if (modules[CONTEXT_CONFIG_KEY] !== policyService || !same(policySnapshot, await policyService.readConfig()))
        throw Error('变量可见性或锁定设置已变化，未请求模型');
      await assertInput?.();
      current(); checkSource(provenance.source, guard);
      if (modules[VARIABLE_PATCH_KEY] !== patchService) throw Error('变量指令解析服务已变化，未请求模型');
    }
    const config = {
      should_stream: settings.streamingEnabled,
      should_silence: true,
      max_chat_history: 0,
      use_mes_examples: false,
      use_story_string: false,
      use_authors_note: false,
      use_persona: false,
      user_input: input,
      ordered_prompts: [
        { role: 'system', content: template.content },
        { role: 'system', content: variablePrompt() },
        'user_input',
        { role: settings.gemini37fPrefill ? 'user' : 'assistant', content: '<思考>\n核对本回合正文与前状态，只输出实际发生的变量变化；接下来按变量更新规则输出 JSONPatch。\n</思考>' },
      ],
    };
    if (settings.useCustomApi) config.custom_api = { apiurl: settings.apiUrl, key: settings.apiKey, model: settings.model, source: 'openai' };

    let lastError = null;
    for (let attempt = 0; attempt <= settings.retryLimit; attempt += 1) {
      try {
        await beforeRequest();
        const response = responseText(await host.generateRaw(config));
        current();
        if (!response.trim()) throw new Error('变量副 API 返回空内容。');
        const [patch, contextConfig] = await Promise.all([
          contract.waitGlobalInitialized(VARIABLE_PATCH_KEY, { timeoutMs: 10000 }),
          contract.waitGlobalInitialized(CONTEXT_CONFIG_KEY, { timeoutMs: 10000 }),
        ]);
        const latestPolicy = await contextConfig.readConfig();
        current();
        const controls = patch.controlText(response);
        const policy = { ...latestPolicy, lockedFields: [...new Set([
          ...(requestPolicy?.lockedFields || []), ...(latestPolicy.lockedFields || []),
        ])] };
        const result = patch.apply(controls, previousData, {
          allowBare: true,
          shouldApply: entry => !contextConfig.affectsLocked(policy, entry.path, previousData, entry.command),
        });
        if (!patch.commands(controls, { allowBare: true }).length) {
          const matched = [...controls.matchAll(/<JSONPatch\b[^>]*>([\s\S]*?)<\/JSONPatch>/gi)].at(-1);
          let empty = false;
          try {
            const value = JSON.parse((matched?.[1] || controls).trim().replace(/,\s*([}\]])/g, '$1'));
            empty = ['stat_data', 'npc_data', 'world_data'].every(domain => Array.isArray(value?.[domain]) && !value[domain].length);
          } catch { /* A malformed response is not a valid empty settlement. */ }
          if (empty) {
            const output = receipt({ skipped: true, reason: 'empty-patch', data: clone(previousData), response, applied: 0, attempts: attempt + 1 },
              provenance);
            await assertResult(output, guard); return output;
          }
          throw new Error(`${purpose || '变量请求'}未返回可识别的 UpdateVariable JSONPatch。`);
        }
        if (!result.applied) {
          const locked = result.rejected.map(entry => entry.path).filter(Boolean);
          if (locked.length) throw new Error(`${purpose || '变量请求'}尝试修改已锁定字段：${locked.join('、')}`);
          throw new Error(`${purpose || '变量请求'}未返回可应用的 UpdateVariable JSONPatch。`);
        }
        const output = receipt({ skipped: false, data: result.data, response, applied: result.applied, rejected: result.rejected, attempts: attempt + 1 },
          provenance);
        await assertResult(output, guard); return output;
      } catch (error) {
        current();
        const latest = await snapshot(host, guard);
        if (!same(latest.revision, captured.revision)) throw Error('变量结算设置已变化，未重试旧请求');
        const latestTemplate = await originalVariableTemplate(host, templateName, guard);
        current();
        if (!same(latestTemplate.revision, template.revision)) throw Error('变量模板来源已变化，未重试旧请求');
        if (modules[CONTEXT_CONFIG_KEY] !== policyService || !same(policySnapshot, await policyService.readConfig()))
          throw Error('变量可见性或锁定设置已变化，未重试旧请求');
        current();
        let text = String(error?.message || error);
        for (const secret of [settings.apiKey, settings.apiUrl].filter(Boolean)) text = text.split(secret).join('[已隐藏]');
        lastError = new Error(text);
        if (attempt < settings.retryLimit) await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 500));
      }
    }
    throw lastError || new Error(`${purpose || '变量请求'}失败。`);
  }

  async function settle({ previousData, userText, narrativeText, guard }) {
    previousData = clone(previousData);
    userText = String(userText || '');
    narrativeText = String(narrativeText || '');
    guard = scopedGuard(guard);
    const captured = await readSnapshot(guard), settings = captured.settings;
    check(guard);
    if (!settings.enabled) return receipt({ skipped: true, reason: 'disabled', data: clone(previousData), response: '' },
      { settingsRevision: captured.revision, epoch, source: settingsProofs.get(captured.revision).source });
    const contextConfig = await contract.waitGlobalInitialized(CONTEXT_CONFIG_KEY, { timeoutMs: 10000 });
    const policy = await contextConfig.readConfig();
    const visibleData = contextConfig.filterData(previousData, policy);
    return requestPatch({
      previousData,
      policy, policyService: contextConfig,
      settings,
      guard,
      input: makeInput({ previousData: visibleData, userText, narrativeText }),
      purpose: '变量自动结算',
    });
  }

  async function repair({ previousData, instruction, rawCommands, guard, assertInput }) {
    previousData = clone(previousData);
    rawCommands = String(rawCommands || '');
    guard = scopedGuard(guard);
    check(guard);
    const text = String(instruction || '').trim();
    if (!text) throw new Error('请先写下要让 AI 修复或修改的变量要求。');
    const contextConfig = await contract.waitGlobalInitialized(CONTEXT_CONFIG_KEY, { timeoutMs: 10000 });
    const policy = await contextConfig.readConfig();
    const visibleData = contextConfig.filterData(previousData, policy);
    const patch = await contract.waitGlobalInitialized(VARIABLE_PATCH_KEY, { timeoutMs: 10000 });
    const visibleCommands = { stat_data: [], npc_data: [], world_data: [] };
    const hiddenPolicy = { ...policy, lockedFields: [...policy.hiddenFields, ...policy.lockedFields] };
    for (const entry of patch.commands(rawCommands, { allowBare: true })) {
      const path = patch.commandPath(entry);
      if (contextConfig.isHidden(policy, path) || contextConfig.affectsLocked(hiddenPolicy, path, previousData, entry.command)) continue;
      visibleCommands[entry.domain].push(entry.command);
    }
    return requestPatch({ previousData, policy, policyService: contextConfig, guard, assertInput, templateName: 'fix_variable_template',
      input: manualInput({ previousData: visibleData, instruction: text, rawCommands: JSON.stringify(visibleCommands) }), purpose: 'AI 变量修复与修改' });
  }

  async function retryTurn({ messageId, guard } = {}) {
    guard = scopedGuard(guard);
    check(guard);
    const floorSource = await readFloorSource({ messageId: messageId ?? null, guard });
    const { floor: target, latest, messages: list } = floorSource;
    if (target.is_hidden || latest?.role !== 'assistant' || latest.message_id !== target.message_id)
      throw Error('隐藏、历史楼层或新回合不能重新结算，请重新读取');

    const targetId = Number(target.message_id);
    if (targetId === 0) throw Error('开场没有前一回合，不能重新结算；可手动编辑变量');
    const previous = [...list].reverse().find(message =>
      message?.role === 'assistant' && Number(message.message_id) < targetId);
    const user = [...list].reverse().find(message =>
      message?.role === 'user' && Number(message.message_id) < targetId &&
      Number(message.message_id) > Number(previous?.message_id));
    if (!previous || !record(previous.data)) throw Error('前一 assistant 楼层没有有效变量，不能重新结算');
    if (previous.is_hidden || user?.is_hidden) throw Error('前状态或本回合行动已隐藏，不能重新结算');
    const previousData = clone(previous.data);
    const contextConfig = await contract.waitGlobalInitialized(CONTEXT_CONFIG_KEY, { timeoutMs: 10000 });
    const policy = await contextConfig.readConfig();
    const visibleData = contextConfig.filterData(previousData, policy);
    await assertFloorSource(floorSource, guard);
    const patchService = await contract.waitGlobalInitialized(VARIABLE_PATCH_KEY, { timeoutMs: 10000 });
    const normalizer = await contract.waitGlobalInitialized('cryptLord.responseNormalizer', { timeoutMs: 10000 });
    const narrativeText = normalizer.normalize(patchService.controlText(target.message)).message;
    if (!narrativeText.trim()) throw Error('本回合没有公开正文，不能重新结算');
    await assertFloorSource(floorSource, guard);
    const result = await requestPatch({
      previousData,
      policy, policyService: contextConfig,
      guard,
      assertInput: async () => {
        await assertFloorSource(floorSource, guard);
        if (modules['cryptLord.responseNormalizer'] !== normalizer || modules[VARIABLE_PATCH_KEY] !== patchService)
          throw Error('变量正文或指令解析服务已变化，未请求模型');
      },
      input: makeInput({
        previousData: visibleData,
        userText: String(user?.message || '继续/顺其自然'),
        narrativeText,
      }),
      purpose: '变量重新结算',
    });
    check(guard);
    await assertFloorSource(floorSource, guard);
    await assertResult(result, guard);
    return receipt({
      ...result,
      messageId: targetId,
      previousData,
      userText: String(user?.message || ''),
      narrativeText: String(target.message || ''),
    }, { ...results.get(result), floorSource, normalizer });
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: !disposed, settingsStorage: 'script-variables', dataTarget: 'native-assistant-floor', defaultApi: 'main' }); },
    defaults: () => Object.freeze({ ...DEFAULTS }),
    readSettings,
    readSnapshot,
    saveSettings,
    getModelList,
    settle,
    repair,
    retryTurn,
    readFloorSource,
    assertFloorSource,
    assertResult,
    dispose() { disposed = true; epoch++; subscriptions.splice(0).forEach(item => item.stop());
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ } if (modules[KEY] === api) delete modules[KEY]; return true; },
  });
  modules[KEY] = api;
  const chat = after?.tavernEvents()?.CHAT_CHANGED;
  if (chat) subscriptions.push(after.bindEvent(chat, () => { epoch++; }));
  contract.initializeGlobal(KEY, api);
})();
