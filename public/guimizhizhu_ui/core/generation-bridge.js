(() => {
  'use strict';

  const KEY = 'cryptLord.nativeFloorBridge';
  const HOST_API_KEY = 'cryptLord.hostApi';
  const STATE_STORE_KEY = 'cryptLord.stateStore';
  const CONTEXT_BUILDER_KEY = 'cryptLord.contextBuilder';
  const RESPONSE_NORMALIZER_KEY = 'cryptLord.responseNormalizer';
  const SETTLEMENT_KEY = 'cryptLord.nativeSettlement';
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
    const [hostApi, contextBuilder, stateStore, responseNormalizer, settlement] = await Promise.all([
      contract.waitGlobalInitialized(HOST_API_KEY, { timeoutMs: 10000 }),
      contract.waitGlobalInitialized(CONTEXT_BUILDER_KEY, { timeoutMs: 10000 }),
      contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 }),
      contract.waitGlobalInitialized(RESPONSE_NORMALIZER_KEY, { timeoutMs: 10000 }),
      contract.waitGlobalInitialized(SETTLEMENT_KEY, { timeoutMs: 10000 }),
    ]);
    return { hostApi, contextBuilder, stateStore, responseNormalizer, settlement };
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
    const { contextBuilder, stateStore } = await dependencies();
    return {
      config: {
        user_input: String(rawText ?? '').trim(),
        injects: await contextBuilder.build({ rawText: String(rawText ?? '').trim(), source: 'narrative', state: await stateStore.readAssistantData() }),
        max_chat_history: 'all',
        should_stream: Boolean(root.settings?.narrativeStreamingEnabled),
      },
      retryLimit: 0,
      watchdogSeconds: 0,
    };
  }

  async function inspectNarrative(finalText) {
    const { responseNormalizer } = await dependencies();
    const normalized = responseNormalizer.normalize(finalText);
    if (!normalized.raw || !normalized.message) return { passed: false, autoRetryable: false };
    return { passed: true, text: normalized.message, parseText: normalized.raw };
  }

  async function completeNarrative(finalText, transaction) {
    const { hostApi, responseNormalizer, settlement, stateStore } = await dependencies();
    const previousData = await stateStore.readAssistantData(transaction.userMessageId);
    let assistantData = previousData;

    try {
      const mvu = await hostApi.waitForMvu();
      const parsed = await mvu.parseMessage(finalText, clone(previousData));
      if (parsed) assistantData = parsed;
    } catch (error) {
      console.warn(`[${KEY}] MVU 变量解析未完成，将保留上一 assistant 楼层的数据`, error);
    }

    if (!assistantData || typeof assistantData !== 'object' || Array.isArray(assistantData)) assistantData = {};
    settlement.apply(assistantData, previousData, {
      userText: transaction.userText,
      narrativeText: transaction.narrativeText,
    });
    assistantData.cryptLord = {
      ...(assistantData.cryptLord && typeof assistantData.cryptLord === 'object' ? assistantData.cryptLord : {}),
      actions: Array.from(responseNormalizer.extractActions(finalText)),
    };

    await stateStore.writeAssistantData(transaction.assistantMessageId, assistantData);
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
