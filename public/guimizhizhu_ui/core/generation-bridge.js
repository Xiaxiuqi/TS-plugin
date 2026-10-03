(() => {
  'use strict';

  const KEY = 'cryptLord.nativeFloorBridge';
  const STATE_STORE_KEY = 'cryptLord.stateStore';
  const CONTEXT_BUILDER_KEY = 'cryptLord.contextBuilder';
  const RESPONSE_NORMALIZER_KEY = 'cryptLord.responseNormalizer';
  const SETTLEMENT_KEY = 'cryptLord.nativeSettlement';
  const VARIABLE_PATCH_KEY = 'cryptLord.variablePatch';
  const VARIABLE_SETTLEMENT_API_KEY = 'cryptLord.variableSettlementApi';
  const ABILITY_STATE_KEY = 'cryptLord.abilityState';
  const INDUSTRY_KEY = 'cryptLord.industryState';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const existing = modules[KEY];
  if (existing) {
    contract.initializeGlobal(KEY, existing);
    return;
  }
  let turnSupplementary = [];
  let turnSupplementaryRevision;
  let turnRandomManual = { id: '', events: [] };

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
    const [contextBuilder, stateStore, responseNormalizer, settlement, variablePatch, variableSettlementApi] = await Promise.all([
      contract.waitGlobalInitialized(CONTEXT_BUILDER_KEY, { timeoutMs: 10000 }),
      contract.waitGlobalInitialized(STATE_STORE_KEY, { timeoutMs: 10000 }),
      contract.waitGlobalInitialized(RESPONSE_NORMALIZER_KEY, { timeoutMs: 10000 }),
      contract.waitGlobalInitialized(SETTLEMENT_KEY, { timeoutMs: 10000 }),
      contract.waitGlobalInitialized(VARIABLE_PATCH_KEY, { timeoutMs: 10000 }),
      contract.waitGlobalInitialized(VARIABLE_SETTLEMENT_API_KEY, { timeoutMs: 10000 }),
    ]);
    return { contextBuilder, stateStore, responseNormalizer, settlement, variablePatch, variableSettlementApi };
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
    const text = String(rawText ?? '').trim();
    let supplementary = [];
    turnSupplementaryRevision = undefined;
    const shortcuts = modules['cryptLord.quickShortcuts'];
    if (shortcuts) {
      try {
        const loaded = await shortcuts.load();
        supplementary = loaded.state.pendingSupplementary;
        turnSupplementaryRevision = loaded.revisions?.state;
      } catch (error) {
        console.warn(`[${KEY}] 补充指令读取失败，本轮只使用原生输入`, error);
      }
    }
    turnSupplementary = [...supplementary];
    let randomText = '';
    try {
      const random = modules['cryptLord.randomEvents'];
      if (random) {
        const [loaded, queued] = await Promise.all([random.load(), random.pending()]);
        turnRandomManual = queued;
        randomText = random.format([...queued.events, ...random.passive(loaded.entries)]);
      }
    } catch (error) {
      turnRandomManual = { id: '', events: [] };
      console.warn(`[${KEY}] 随机事件不可用，本轮不注入`, error);
    }
    const extra = [
      randomText,
      supplementary.length ? `[补充指令]\n${supplementary.map((item, index) => `${index + 1}. ${item}`).join('\n')}` : '',
    ].filter(Boolean).join('\n\n');
    return {
      config: {
        user_input: extra ? `${extra}\n\n${text}` : text,
        injects: await contextBuilder.build({ rawText: text, source: 'narrative', state: await stateStore.readAssistantData() }),
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
    const { responseNormalizer, settlement, stateStore, variablePatch, variableSettlementApi } = await dependencies();
    const previousData = await stateStore.readAssistantData(transaction.userMessageId);
    // Native floors are the only variable source of truth. Apply the original
    // UpdateVariable JSONPatch directly instead of depending on an external MVU parser.
    const parsed = variablePatch.apply(finalText, previousData);
    let assistantData = clone(parsed.applied ? parsed.data : previousData);
    let settlementUpdate = '';

    try {
      const result = await variableSettlementApi.settle({
        previousData: assistantData,
        userText: transaction.userText,
        narrativeText: transaction.narrativeText,
      });
      if (!result.skipped && result.data) assistantData = result.data;
      settlementUpdate = String(result.response || '');
    } catch (error) {
      // A secondary settlement must never discard a successfully committed narrative floor.
      notify(`变量结算副模型失败，已保留本回合既有变量：${error?.message || error}`, 'warning');
      console.warn(`[${KEY}] 变量结算副模型失败`, error);
    }

    if (!assistantData || typeof assistantData !== 'object' || Array.isArray(assistantData)) assistantData = {};
    let industryPathways = {};
    const industries = assistantData.stat_data?.产业;
    if (industries && typeof industries === 'object' &&
      Object.values(industries).some(item => item && typeof item === 'object' && String(item.负责人 || '').trim())) {
      try {
        const industry = await contract.waitGlobalInitialized(INDUSTRY_KEY, { timeoutMs: 10000 });
        industryPathways = await industry.loadPathways();
      } catch (error) {
        industryPathways = null;
        console.warn(`[${KEY}] 产业途径读取失败，本回合暂不结算产业`, error);
      }
    }
    settlement.apply(assistantData, previousData, {
      userText: transaction.userText,
      narrativeText: transaction.narrativeText,
      industryPathways,
    });
    const sequence = String(assistantData.stat_data?.当前序列 || '').trim();
    if (sequence && !sequence.includes('普通人')) {
      try {
        const abilities = await contract.waitGlobalInitialized(ABILITY_STATE_KEY, { timeoutMs: 10000 });
        const pool = await abilities.loadPool();
        const hostWindow = modules['cryptLord.afterNativeHost']?.getHost()?.window || window;
        const locked = hostWindow.localStorage?.getItem('ST_LoM_AbilityLock');
        const abilityLocked = locked === null || locked === undefined
          ? assistantData.stat_data?.序列能力锁定 === true : locked === 'true';
        try {
          const result = abilities.synchronize(assistantData, pool, abilityLocked);
          if (result.added || result.patched) assistantData = result.data;
        } catch (error) {
          console.warn(`[${KEY}] 真实序列能力补全失败，仍尝试专属投影`, error);
        }
        modules['cryptLord.audienceImagination']?.sync(
          assistantData, pool, abilityLocked,
        );
        modules['cryptLord.readerMystic']?.sync(assistantData, pool);
        modules['cryptLord.mysteryReenactment']?.sync(assistantData, pool);
      } catch (error) {
        console.warn(`[${KEY}] 序列能力同步失败，保留本回合既有变量`, error);
      }
    }
    assistantData.cryptLord = {
      ...(assistantData.cryptLord && typeof assistantData.cryptLord === 'object' ? assistantData.cryptLord : {}),
      actions: Array.from(responseNormalizer.extractActions(finalText)),
      lastUpdateVariable: variablePatch.updateTag(settlementUpdate) ||
        String(finalText || '').match(/<UpdateVariable\b[^>]*>[\s\S]*?<\/UpdateVariable>/i)?.[0] || '',
    };

    const target = await stateStore.readMessage(transaction.assistantMessageId);
    await stateStore.writeAssistantMessage(
      transaction.assistantMessageId,
      variablePatch.embedUpdate(target.message, settlementUpdate || finalText),
      assistantData,
    );
    if (turnSupplementary.length) {
      try {
        await modules['cryptLord.quickShortcuts']?.consumeSupplementary(turnSupplementary, turnSupplementaryRevision);
      } catch (error) {
        console.warn(`[${KEY}] 本轮补充指令清理失败，保留原有勾选`, error);
      }
    }
    turnSupplementary = [];
    turnSupplementaryRevision = undefined;
    if (turnRandomManual.events.length) {
      try {
        await modules['cryptLord.randomEvents']?.consume(turnRandomManual.events, turnRandomManual.id);
      } catch (error) {
        console.warn(`[${KEY}] 手动随机事件清理失败，将保留排队记录`, error);
      }
    }
    turnRandomManual = { id: '', events: [] };
    const updateDetail = {
      messageId: transaction.assistantMessageId,
      beforeData: previousData,
      afterData: assistantData,
      source: 'generation',
    };
    // The workbench is optional, so a visual notification can never block the
    // native assistant floor from committing its authoritative variables.
    root.__stage1Modules?.['cryptLord.variableWorkbench']?.notifyUpdate?.(updateDetail);
    try { window.dispatchEvent(new CustomEvent('cryptLord:variables-updated', { detail: updateDetail })); } catch { /* Cross-window event dispatch is best effort. */ }
  }

  const api = Object.freeze({
    status() {
      return Object.freeze({
        key: KEY,
        ready: true,
        mode: 'native-assistant-floor-jsonpatch',
        pendingGameRuleMigration: true,
      });
    },
    prepareTurn,
    buildGenerationConfig,
    inspectNarrative,
    completeNarrative,
    getRetryDelayMs(attempt) { return Math.max(0, Number(attempt) || 0) * 500; },
    onRetry(reason) { notify(`正在重试：${reason}`, 'warning'); },
    onTurnAborted(reason) { turnSupplementary = []; turnSupplementaryRevision = undefined; turnRandomManual = { id: '', events: [] }; notify(`本次行动已取消：${reason}`, 'warning'); },
    onTurnFailed(error) { turnSupplementary = []; turnSupplementaryRevision = undefined; turnRandomManual = { id: '', events: [] }; notify(`生成失败：${error?.message || error}`, 'error'); },
    onNarrativeCancelled() { turnSupplementary = []; turnSupplementaryRevision = undefined; turnRandomManual = { id: '', events: [] }; notify('剧情生成未通过校验，已取消本回合。', 'warning'); },
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
