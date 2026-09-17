(() => {
  'use strict';

  const KEY = 'cryptLord.nativeFloorBridge';
  const HOST_API_KEY = 'cryptLord.hostApi';
  const POLICY_KEY = 'cryptLord.nativeHistoryPolicy';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const existing = modules[KEY];
  if (existing) {
    contract.initializeGlobal(KEY, existing);
    return;
  }

  function clone(value) {
    if (value === undefined) return undefined;
    if (typeof window.structuredClone === 'function') return window.structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function notify(message, level = 'info') {
    const toast = window.toastr?.[level];
    if (typeof toast === 'function') toast(message);
    else console[level === 'error' ? 'error' : 'info'](`[${KEY}] ${message}`);
  }

  async function dependencies() {
    const [hostApi, policy] = await Promise.all([
      contract.waitGlobalInitialized(HOST_API_KEY, { timeoutMs: 10000 }),
      contract.waitGlobalInitialized(POLICY_KEY, { timeoutMs: 10000 }),
    ]);
    return { hostApi, policy };
  }

  async function findPreviousAssistantData(hostApi, userMessageId) {
    const messages = await hostApi.getChatMessages('0-{{lastMessageId}}');
    if (!Array.isArray(messages)) return {};
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message?.role === 'assistant' && message.message_id < userMessageId) return clone(message.data || {});
    }
    return {};
  }

  async function prepareTurn(rawText) {
    const text = String(rawText ?? '').trim();
    if (!text) {
      notify('请输入行动后再发送。', 'warning');
      return { accepted: false, result: false };
    }
    return { accepted: true, assistantData: {} };
  }

  async function buildGenerationConfig(rawText) {
    const { policy } = await dependencies();
    return {
      config: {
        user_input: String(rawText ?? '').trim(),
        injects: [policy.createInjection()],
        max_chat_history: 'all',
        should_stream: Boolean(root.settings?.narrativeStreamingEnabled),
      },
      retryLimit: 0,
      watchdogSeconds: 0,
    };
  }

  async function inspectNarrative(finalText) {
    const text = String(finalText ?? '').trim();
    if (!text) return { passed: false, autoRetryable: false };
    return { passed: true, text };
  }

  async function completeNarrative(finalText, transaction) {
    const { hostApi } = await dependencies();
    const previousData = await findPreviousAssistantData(hostApi, transaction.userMessageId);
    let assistantData = previousData;

    try {
      const mvu = await hostApi.waitForMvu();
      const parsed = await mvu.parseMessage(finalText, clone(previousData));
      if (parsed) assistantData = parsed;
    } catch (error) {
      console.warn(`[${KEY}] MVU 变量解析未完成，将保留上一 assistant 楼层的数据`, error);
    }

    await hostApi.setChatMessages(
      [{ message_id: transaction.assistantMessageId, data: assistantData }],
      { refresh: 'affected' },
    );
  }

  const api = Object.freeze({
    status() {
      return Object.freeze({
        key: KEY,
        ready: true,
        mode: 'native-history-baseline',
        pendingGameRuleMigration: true,
      });
    },
    prepareTurn,
    buildGenerationConfig,
    inspectNarrative,
    completeNarrative,
    getRetryDelayMs(attempt) { return Math.max(0, Number(attempt) || 0) * 500; },
    onRetry(reason) { notify(`正在重试：${reason}`, 'warning'); },
    onTurnAborted(reason) { notify(`本次行动已取消：${reason}`, 'warning'); },
    onTurnFailed(error) { notify(`生成失败：${error?.message || error}`, 'error'); },
    onNarrativeCancelled() { notify('剧情生成未通过校验，已取消本回合。', 'warning'); },
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
