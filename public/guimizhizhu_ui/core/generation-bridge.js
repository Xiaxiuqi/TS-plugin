(() => {
  'use strict';

  const KEY = 'cryptLord.nativeFloorBridge';
  const STATE_STORE_KEY = 'cryptLord.stateStore';
  const CONTEXT_BUILDER_KEY = 'cryptLord.contextBuilder';
  const RESPONSE_NORMALIZER_KEY = 'cryptLord.responseNormalizer';
  const SETTLEMENT_KEY = 'cryptLord.nativeSettlement';
  const VARIABLE_PATCH_KEY = 'cryptLord.variablePatch';
  const VARIABLE_SETTLEMENT_API_KEY = 'cryptLord.variableSettlementApi';
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
    const state = await stateStore.readAssistantData();
    let supplementary = [];
    let shortcutTurn = null;
    let clueTurn = null;
    try { clueTurn = await modules['cryptLord.currentClues']?.prepareTurn() || null; }
    catch (error) { console.warn(`[${KEY}] 当前线索读取失败，本轮不自动归档`, error); }
    let characterTurn = null;
    try { characterTurn = await modules['cryptLord.characterExtraction']?.prepareTurn() || null; }
    catch (error) { console.warn(`[${KEY}] 角色入库设置读取失败，本轮不自动入库`, error); }
    let battlePromptTurn = null;
    try { battlePromptTurn = await modules['cryptLord.battlePromptMode']?.prepareTurn() || null; }
    catch (error) { console.warn(`[${KEY}] 战斗提示模式未准备，本轮不自动切换`, error); }
    const shortcuts = modules['cryptLord.quickShortcuts'];
    if (shortcuts) {
      try {
        shortcutTurn = await shortcuts.prepareTurn();
        supplementary = shortcutTurn.commands;
      } catch (error) {
        console.warn(`[${KEY}] 补充指令读取失败，本轮只使用原生输入`, error);
      }
    }
    let randomText = '';
    let randomTurn = null;
    const random = modules['cryptLord.randomEvents'];
    try {
      if (random) {
        randomTurn = await random.prepareTurn();
        randomText = randomTurn.text;
      }
    } catch (error) {
      console.warn(`[${KEY}] 随机事件不可用，本轮不注入`, error);
    }
    const extra = [
      randomText,
      supplementary.length ? `[补充指令]\n${supplementary.map((item, index) => `${index + 1}. ${item}`).join('\n')}` : '',
    ].filter(Boolean).join('\n\n');
    const quality = await contract.waitGlobalInitialized('cryptLord.generationQuality', { timeoutMs: 10000 });
    const qualitySettings = (await quality.readSnapshot()).settings;
    const shouldStream = Boolean(root.settings?.narrativeStreamingEnabled);
    const injects = await contextBuilder.build({ rawText: text, source: 'narrative', state });
    let archiveTurn = null;
    try { archiveTurn = await modules['cryptLord.storyArchive']?.prepareTurn() || null; }
    catch (error) { console.warn(`[${KEY}] 剧情归档来源读取失败，本轮不自动归档`, error); }
    // Reuse these exact draws on retries, but never dispatch them against changed sources.
    const assertQueues = async (transaction = {}) => {
      const checks = [];
      for (const [key, service, ticket] of [
        ['cryptLord.quickShortcuts', shortcuts, shortcutTurn],
        ['cryptLord.randomEvents', random, randomTurn],
      ]) {
        if (!ticket || !service?.assertTurn) continue;
        if (modules[key] !== service) throw new DOMException('生成队列服务已变化，请重新准备回合', 'AbortError');
        try { checks.push(await service.assertTurn(ticket, transaction)); }
        catch (error) { throw new DOMException(`生成队列来源已变化：${error.message}`, 'AbortError'); }
      }
      checks.forEach(check => check());
    };
    await assertQueues();
    return {
      config: {
        user_input: extra ? `${extra}\n\n${text}` : text,
        injects,
        max_chat_history: 'all',
        should_stream: shouldStream,
      },
      retryLimit: qualitySettings.retryLimit,
      watchdogSeconds: shouldStream ? qualitySettings.streamTimeoutSeconds : qualitySettings.noStreamTimeoutSeconds,
      shortcutTurn,
      clueTurn,
      characterTurn,
      archiveTurn,
      battlePromptTurn,
      randomTurn,
      assertQueues,
    };
  }

  async function inspectNarrative(finalText, options = {}) {
    const { responseNormalizer } = await dependencies();
    const quality = await contract.waitGlobalInitialized('cryptLord.generationQuality', { timeoutMs: 10000, signal: options.signal });
    const inspected = await quality.inspect(finalText, {
      ...options,
      allowModal: options.source === 'sillytavern-native' || (options.retryCount || 0) >= (options.retryLimit || 0),
    });
    if (!inspected.passed) return inspected;
    const normalized = responseNormalizer.normalize(inspected.text);
    if (!normalized.raw || !normalized.message) return { passed: false, autoRetryable: false };
    return { ...inspected, text: normalized.message, parseText: normalized.raw, floorText: normalized.raw };
  }

  async function completeNarrative(finalText, transaction) {
    const check = () => {
      if (transaction.guard && !transaction.guard()) throw new DOMException('生成事务已失效', 'AbortError');
    };
    check();
    const { responseNormalizer, stateStore, variablePatch, variableSettlementApi } = await dependencies();
    check();
    const clues = modules['cryptLord.currentClues'];
    const clueTurn = Object.hasOwn(transaction, 'clueTurn') ? transaction.clueTurn : clues?.nativeTicket();
    const clueGuard = clueTurn || (clues ? { epoch: clues.status().epoch } : null);
    const previousData = await stateStore.readAssistantData(transaction.userMessageId);
    check();
    // Native floors are the only variable source of truth. Apply the original
    // UpdateVariable JSONPatch directly instead of depending on an external MVU parser.
    const parsed = variablePatch.apply(finalText, previousData);
    let assistantData = clone(parsed.applied ? parsed.data : previousData);
    let settlementUpdate = '';
    let variablePrepared = null;

    try {
      const result = await variableSettlementApi.settle({
        previousData: assistantData,
        userText: transaction.userText,
        narrativeText: transaction.narrativeText,
        guard: transaction.guard,
      });
      check();
      if (!result.skipped && result.data) assistantData = clone(result.data);
      settlementUpdate = String(result.response || '');
      if (variableSettlementApi.assertResult) variablePrepared = result;
    } catch (error) {
      check();
      // A secondary settlement must never discard a successfully committed narrative floor.
      notify(`变量结算副模型失败，已保留本回合既有变量：${error?.message || error}`, 'warning');
      console.warn(`[${KEY}] 变量结算副模型失败`, error);
    }

    check();
    if (!assistantData || typeof assistantData !== 'object' || Array.isArray(assistantData)) assistantData = {};
    let theaterResult = null;
    const theaterService = modules['cryptLord.theaterActions'];
    const theaterPending = theaterService?.status().pending;
    const recoveringTheaterTurn = theaterService?.status().settlementMessageId === transaction.assistantMessageId &&
      String(transaction.generationId || '').startsWith('native-host-');
    const paidTheaterTurn = theaterPending?.cost > 0 &&
      theaterPending.label === String(transaction.userText || '').trim() &&
      String(transaction.generationId || '').startsWith('native-host-');
    try {
      theaterResult = await theaterService?.settle(assistantData, transaction);
      check();
      if ((paidTheaterTurn && theaterResult?.warning || recoveringTheaterTurn) && !theaterResult?.applied)
        throw Error(theaterResult?.warning || '已保存的剧场结算来源不可确认，请重新读取');
      if (theaterResult?.warning) notify(theaterResult.warning, 'warning');
    } catch (error) {
      if (paidTheaterTurn || recoveringTheaterTurn) throw error;
      notify(`剧场费用未结算，已保留正文：${error?.message || error}`, 'warning');
      console.warn(`[${KEY}] 剧场结算失败`, error);
    }
    assistantData.cryptLord = {
      ...(assistantData.cryptLord && typeof assistantData.cryptLord === 'object' ? assistantData.cryptLord : {}),
      actions: Array.from(responseNormalizer.extractActions(finalText)),
      lastUpdateVariable: variablePatch.updateTag(settlementUpdate) ||
        String(finalText || '').match(/<UpdateVariable\b[^>]*>[\s\S]*?<\/UpdateVariable>/i)?.[0] || '',
    };
    check();

    const dynamicOptions = { abilityMode: 'turn' };
    if (clues) dynamicOptions.beforeWrite = () => clues.assertTurn(clueGuard);
    try {
      const dynamic = modules['cryptLord.dynamicStatus'];
      if (dynamic) {
        dynamicOptions.dynamicEpoch = dynamic.status().epoch;
        dynamicOptions.dynamicPrepared = await dynamic.load(transaction.guard);
      }
    } catch (error) {
      if (error?.code === 'DYNAMIC_STATUS_CANCELLED') throw error;
      dynamicOptions.skipDynamicStatus = true;
      notify(`动态状态规则读取失败，已跳过本次派生并保留正文：${error?.message || error}`, 'warning');
      console.warn(`[${KEY}] 动态状态规则不可用`, error);
    }
    const target = await stateStore.readMessage(transaction.assistantMessageId);
    check();
    await transaction.beforeWrite?.();
    const messageWithUpdate = variablePatch.embedUpdate(transaction.floorText ?? target.message, settlementUpdate || finalText);
    const messageToSave = clues ? clues.embed(messageWithUpdate, finalText) : messageWithUpdate;
    const inspector = modules['cryptLord.responseInspector'];
    if (inspector) {
      // Keep only the secondary model's displayed reasoning on its own native floor.
      try {
        assistantData.cryptLord.responseInspection = await inspector.captureVariable({
          messageId: transaction.assistantMessageId, message: messageToSave,
          response: settlementUpdate, guard: transaction.guard,
        });
      } catch (error) {
        check(); delete assistantData.cryptLord.responseInspection;
        console.warn(`[${KEY}] 变量思维链显示记录未保存，不影响正文结算`, error);
      }
    } else delete assistantData.cryptLord.responseInspection;
    check();
    const savedData = await stateStore.writeAssistantMessage(
      transaction.assistantMessageId,
      messageToSave,
      assistantData,
      { ...dynamicOptions, variablePrepared, guard: () => {
        check();
        if (theaterResult?.applied) {
          if (modules['cryptLord.theaterActions'] !== theaterService) throw Error('剧场结算服务已卸载，未写入旧费用');
          theaterService.guardSettlement(theaterResult, transaction.guard);
        }
        return true;
      }, progressionPrevious: previousData?.stat_data,
        npcPrevious: previousData?.npc_data, settlementPrevious: previousData,
        settlementContext: { userText: transaction.userText, narrativeText: transaction.narrativeText },
        beforeWrite: async () => {
        check(); await dynamicOptions.beforeWrite?.(); await transaction.beforeWrite?.();
        if (theaterResult?.applied) {
          if (modules['cryptLord.theaterActions'] !== theaterService) throw Error('剧场结算服务已卸载，未写入旧费用');
          await theaterService.assertSettlement(theaterResult, transaction.guard);
        }
      } },
    );
    check();
    if (savedData && typeof savedData === 'object' && !Array.isArray(savedData)) assistantData = savedData;
    if (theaterResult?.applied) theaterService.consume(theaterResult, assistantData);
    if (modules['cryptLord.characterExtraction']) {
      try {
        const result = await modules['cryptLord.characterExtraction'].completeTurn(finalText, transaction,
          Object.hasOwn(transaction, 'characterTurn') ? transaction.characterTurn : undefined);
        if (result.warning) notify(result.warning, 'warning');
      } catch (error) {
        check();
        notify(`角色自动入库未完成，已保留正文，可在提取内容中重试：${error?.message || error}`, 'warning');
        console.warn(`[${KEY}] 角色自动入库失败`, error);
      }
    }
    if (modules['cryptLord.battlePromptMode']) {
      try {
        const result = await modules['cryptLord.battlePromptMode'].completeTurn(finalText, transaction,
          Object.hasOwn(transaction, 'battlePromptTurn') ? transaction.battlePromptTurn : undefined);
        if (result.warning) notify(result.warning, 'warning');
      } catch (error) {
        check();
        notify(`战斗提示模式未切换，正文已保留，可在战斗提示模式中重试：${error?.message || error}`, 'warning');
        console.warn(`[${KEY}] 战斗提示自动切换失败`, error);
      }
    }
    if (modules['cryptLord.storyArchive']) {
      try {
        const result = await modules['cryptLord.storyArchive'].completeTurn(finalText, transaction,
          Object.hasOwn(transaction, 'archiveTurn') ? transaction.archiveTurn : undefined);
        if (result.warning) notify(result.warning, 'warning');
      } catch (error) {
        check();
        notify(`剧情未归档，原生正文已保留，可在提取内容中重试：${error?.message || error}`, 'warning');
        console.warn(`[${KEY}] 剧情归档失败`, error);
      }
    }
    if (clues && clueTurn) {
      try {
        const result = await clues.completeTurn(finalText, transaction, clueTurn);
        if (result.warning) notify(result.warning, 'warning');
      } catch (error) {
        notify(`当前线索未归档，已保留本楼正文和线索标签：${error?.message || error}`, 'warning');
        console.warn(`[${KEY}] 当前线索归档失败`, error);
      } finally {
        clues.finishTurn(clueTurn);
      }
    }
    check();
    const shortcuts = modules['cryptLord.quickShortcuts'];
    if (transaction.shortcutTurn?.commands?.length) {
      try {
        await shortcuts?.consumeTurn(transaction, transaction.shortcutTurn, messageToSave);
      } catch (error) {
        console.warn(`[${KEY}] 本轮补充指令清理失败，保留原有勾选`, error);
      }
    } else {
      try { await shortcuts?.consumeNative(transaction, messageToSave); }
      catch (error) { console.warn(`[${KEY}] 原生补充指令清理失败，保留原有勾选`, error); }
    }
    check();
    const random = modules['cryptLord.randomEvents'];
    try {
      if (Object.hasOwn(transaction, 'randomTurn')) await random?.consumeTurn(transaction, transaction.randomTurn, messageToSave);
      else await random?.consumeNative(transaction, messageToSave);
    } catch (error) { console.warn(`[${KEY}] 手动随机事件清理失败，将保留排队记录`, error); }
    check();
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
    getRetryDelayMs(attempt) { return modules['cryptLord.generationQuality']?.retryDelayMs(attempt) ?? 0; },
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
