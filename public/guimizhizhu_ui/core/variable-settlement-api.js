(() => {
  'use strict';

  const KEY = 'cryptLord.variableSettlementApi';
  const HOST_API_KEY = 'cryptLord.hostApi';
  const VARIABLE_PATCH_KEY = 'cryptLord.variablePatch';
  const CONTEXT_CONFIG_KEY = 'cryptLord.aiContextConfig';
  const STORE_KEY = 'cryptLord.stateStore';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  const SETTINGS_KEY = 'cryptLord.variableSettlement';
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
    const source = { ...DEFAULTS, ...(record(value) ? value : {}) };
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
        ? Math.max(0, Math.min(99, Math.floor(retryLimit)))
        : DEFAULTS.retryLimit,
    });
  }

  async function hostApi() {
    return contract.waitGlobalInitialized(HOST_API_KEY, { timeoutMs: 10000 });
  }

  function scriptOptions(host) {
    return host.scriptVariableOptions?.() || { type: 'script' };
  }

  async function readSettings() {
    const host = await hostApi();
    try {
      const variables = host.getVariables(scriptOptions(host));
      return normalizeSettings(variables?.[SETTINGS_KEY]);
    } catch (error) {
      console.warn(`[${KEY}] 无法读取脚本设置，使用默认值`, error);
      return Object.freeze({ ...DEFAULTS });
    }
  }

  async function saveSettings(value) {
    const host = await hostApi();
    const next = normalizeSettings({ ...DEFAULTS, ...value });
    const options = scriptOptions(host);
    const current = host.getVariables(options);
    const variables = record(current) ? clone(current) : {};
    variables[SETTINGS_KEY] = clone(next);
    host.replaceVariables(variables, options);
    return next;
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

  function originalVariableTemplate() {
    const owners = [window];
    for (const name of ['parent', 'top']) {
      try { if (window[name] && !owners.includes(window[name])) owners.push(window[name]); } catch { /* Cross-origin owners are unusable. */ }
    }
    for (const owner of owners) {
      const template = owner?.GameDBManager?.DB?.templates?.variable_template;
      if (typeof template === 'string' && template.trim()) return template.trim();
    }
    return variablePrompt();
  }

  function makeInput({ previousData, userText, narrativeText }) {
    const state = record(previousData) ? previousData : {};
    return [
      `【本回合前状态】\n${JSON.stringify({ stat_data: state.stat_data || {}, npc_data: state.npc_data || {}, world_data: state.world_data || {} })}`,
      `【玩家行动】\n${String(userText || '继续/顺其自然')}`,
      `【本回合正文】\n${String(narrativeText || '')}`,
    ].join('\n\n');
  }

  function manualInput({ previousData, instruction }) {
    const state = record(previousData) ? previousData : {};
    return [
      `【当前真实楼层变量】\n${JSON.stringify({ stat_data: state.stat_data || {}, npc_data: state.npc_data || {}, world_data: state.world_data || {} })}`,
      `【玩家的变量修改要求】\n${String(instruction || '').trim()}`,
    ].join('\n\n');
  }

  async function requestPatch({ previousData, input, purpose }) {
    const settings = await readSettings();
    if (settings.useCustomApi && (!settings.apiUrl || !settings.model)) {
      throw new Error('变量副 API 已启用自定义 API，但尚未填写 URL 或模型名。');
    }

    const host = await hostApi();
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
        { role: 'system', content: originalVariableTemplate() },
        { role: 'system', content: variablePrompt() },
        'user_input',
        { role: settings.gemini37fPrefill ? 'user' : 'assistant', content: '<思考>\n核对本回合正文与前状态，只输出实际发生的变量变化；接下来按变量更新规则输出 JSONPatch。\n</思考>' },
      ],
    };
    if (settings.useCustomApi) config.custom_api = { apiurl: settings.apiUrl, key: settings.apiKey, model: settings.model, source: 'openai' };

    let lastError = null;
    for (let attempt = 0; attempt <= settings.retryLimit; attempt += 1) {
      try {
        const response = responseText(await host.generateRaw(config));
        if (!response.trim()) throw new Error('变量副 API 返回空内容。');
        const [patch, contextConfig] = await Promise.all([
          contract.waitGlobalInitialized(VARIABLE_PATCH_KEY, { timeoutMs: 10000 }),
          contract.waitGlobalInitialized(CONTEXT_CONFIG_KEY, { timeoutMs: 10000 }),
        ]);
        const policy = await contextConfig.readConfig();
        const result = patch.apply(response, previousData, {
          allowBare: true,
          shouldApply: entry => !contextConfig.isLocked(policy, entry.path),
        });
        if (!patch.commands(response, { allowBare: true }).length) {
          const matched = response.match(/<JSONPatch\b[^>]*>([\s\S]*?)<\/JSONPatch>/i);
          let empty = false;
          try {
            const value = JSON.parse((matched?.[1] || response).trim().replace(/,\s*([}\]])/g, '$1'));
            empty = ['stat_data', 'npc_data', 'world_data'].every(domain => Array.isArray(value?.[domain]) && !value[domain].length);
          } catch { /* A malformed response is not a valid empty settlement. */ }
          if (empty) return Object.freeze({ skipped: true, reason: 'empty-patch', data: previousData, response, applied: 0, attempts: attempt + 1 });
          throw new Error(`${purpose || '变量请求'}未返回可识别的 UpdateVariable JSONPatch。`);
        }
        if (!result.applied) {
          const locked = result.rejected.map(entry => entry.path).filter(Boolean);
          if (locked.length) throw new Error(`${purpose || '变量请求'}尝试修改已锁定字段：${locked.join('、')}`);
          throw new Error(`${purpose || '变量请求'}未返回可应用的 UpdateVariable JSONPatch。`);
        }
        return Object.freeze({ skipped: false, data: result.data, response, applied: result.applied, rejected: result.rejected, attempts: attempt + 1 });
      } catch (error) {
        lastError = error;
        if (attempt < settings.retryLimit) await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 500));
      }
    }
    throw lastError || new Error(`${purpose || '变量请求'}失败。`);
  }

  async function settle({ previousData, userText, narrativeText }) {
    const settings = await readSettings();
    if (!settings.enabled) return Object.freeze({ skipped: true, reason: 'disabled', data: previousData, response: '' });
    const contextConfig = await contract.waitGlobalInitialized(CONTEXT_CONFIG_KEY, { timeoutMs: 10000 });
    const visibleData = contextConfig.filterData(previousData, await contextConfig.readConfig());
    return requestPatch({
      previousData,
      input: makeInput({ previousData: visibleData, userText, narrativeText }),
      purpose: '变量自动结算',
    });
  }

  async function repair({ previousData, instruction }) {
    const text = String(instruction || '').trim();
    if (!text) throw new Error('请先写下要让 AI 修复或修改的变量要求。');
    const contextConfig = await contract.waitGlobalInitialized(CONTEXT_CONFIG_KEY, { timeoutMs: 10000 });
    const visibleData = contextConfig.filterData(previousData, await contextConfig.readConfig());
    return requestPatch({ previousData, input: manualInput({ previousData: visibleData, instruction: text }), purpose: 'AI 变量修复与修改' });
  }

  async function retryTurn({ messageId } = {}) {
    const store = await contract.waitGlobalInitialized(STORE_KEY, { timeoutMs: 10000 });
    await store.ensureOpeningState();
    const host = await hostApi();
    const messages = await host.getChatMessages('0-{{lastMessageId}}');
    const list = Array.isArray(messages) ? messages : [];
    const requestedId = Number(messageId);
    const hasRequestedId = messageId !== null && messageId !== undefined && String(messageId).trim() !== '' && Number.isInteger(requestedId);
    const target = hasRequestedId
      ? list.find(message => Number(message?.message_id) === requestedId && message?.role === 'assistant')
      : [...list].reverse().find(message => message?.role === 'assistant');
    if (!target) throw new Error('没有可重新结算的真实 assistant 楼层。');

    const targetId = Number(target.message_id);
    const previous = [...list].reverse().find(message =>
      message?.role === 'assistant' && Number(message.message_id) < targetId);
    const user = [...list].reverse().find(message =>
      message?.role === 'user' && Number(message.message_id) < targetId);
    const previousData = record(previous?.data) ? clone(previous.data) : {};
    const contextConfig = await contract.waitGlobalInitialized(CONTEXT_CONFIG_KEY, { timeoutMs: 10000 });
    const visibleData = contextConfig.filterData(previousData, await contextConfig.readConfig());
    const result = await requestPatch({
      previousData,
      input: makeInput({
        previousData: visibleData,
        userText: String(user?.message || '继续/顺其自然'),
        narrativeText: String(target.message || ''),
      }),
      purpose: '变量重新结算',
    });
    return Object.freeze({
      ...result,
      messageId: targetId,
      previousData,
      userText: String(user?.message || ''),
      narrativeText: String(target.message || ''),
    });
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true, settingsStorage: 'script-variables', dataTarget: 'native-assistant-floor', defaultApi: 'main' }); },
    defaults: () => Object.freeze({ ...DEFAULTS }),
    readSettings,
    saveSettings,
    getModelList: async customApi => (await hostApi()).getModelList(customApi),
    settle,
    repair,
    retryTurn,
    dispose() { try { contract.releaseGlobal(KEY, api); } catch {} if (modules[KEY] === api) delete modules[KEY]; return true; },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
