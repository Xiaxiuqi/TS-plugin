(() => {
  'use strict';

  const KEY = 'cryptLord.nativeFloor';
  const BRIDGE_KEY = 'cryptLord.nativeFloorBridge';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const existing = modules[KEY];
  if (existing) {
    if (typeof existing.status !== 'function' || typeof existing.submitNativeTurn !== 'function' || typeof existing.dispose !== 'function') {
      throw new Error(`[${KEY}] 拒绝复用形状不匹配的模块API`);
    }
    contract.initializeGlobal(KEY, existing);
    return;
  }

  function getDebug() {
    const debug = root.debug;
    return debug && typeof debug.event === 'function' ? debug : null;
  }

  function debugEvent(category, action, details, level = 'info') {
    try {
      getDebug()?.event(category, KEY, action, details, level);
    } catch {
      // Native transaction behavior must never depend on diagnostics.
    }
  }

  const state = {
    active: null,
    retiredGenerationIds: new Set(),
    retry: null,
    watchdog: null,
    watchdogAbortAt: 0,
    retryTimer: null,
    retryTimerResolve: null,
    abortController: new AbortController(),
    disposed: false,
    epoch: 1,
  };

  function isTransactionValid(txn) {
    return !!txn && !state.disposed && txn.epoch === state.epoch && state.active === txn;
  }

  function assertTransactionValid(txn) {
    if (!isTransactionValid(txn)) throw new DOMException('事务已失效', 'AbortError');
  }

  function requireHostFunction(name, owner = window) {
    const fn = owner && owner[name];
    if (typeof fn !== 'function') throw new Error(`[${KEY}] 宿主API不可用: ${name}`);
    return fn.bind(owner);
  }

  function helper() {
    const value = window.TavernHelper;
    if (!value || typeof value !== 'object') throw new Error(`[${KEY}] 宿主API不可用: TavernHelper`);
    return value;
  }

  async function getBridge() {
    debugEvent('bridge', 'bridge-wait', `等待 ${BRIDGE_KEY}`);
    try {
      const bridge = await contract.waitGlobalInitialized(BRIDGE_KEY, {
        timeoutMs: 10000,
        signal: state.abortController.signal,
      });
      if (state.disposed) throw new DOMException('模块已释放', 'AbortError');
      debugEvent('bridge', 'bridge-ready', `${BRIDGE_KEY} 已注册`);
      return bridge;
    } catch (error) {
      debugEvent('failure', 'bridge-timeout-or-failure', `${BRIDGE_KEY}: ${error?.message || error}`, 'error');
      throw error;
    }
  }

  function normalizeOptions(sourceOrOptions, maybeOptions) {
    if (sourceOrOptions && typeof sourceOrOptions === 'object') {
      return {
        source: sourceOrOptions.source || 'external',
        isBranchingAction: !!sourceOrOptions.isBranchingAction,
      };
    }
    const extra = maybeOptions && typeof maybeOptions === 'object' ? maybeOptions : {};
    return {
      source: typeof sourceOrOptions === 'string' && sourceOrOptions ? sourceOrOptions : (extra.source || 'external'),
      isBranchingAction: !!extra.isBranchingAction,
    };
  }

  function newGenerationId() {
    return `guimi_narr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function retireGenerationId(generationId) {
    if (!generationId) return;
    state.retiredGenerationIds.add(generationId);
    while (state.retiredGenerationIds.size > 8) {
      state.retiredGenerationIds.delete(state.retiredGenerationIds.values().next().value);
    }
  }

  function isStaleGeneration(generationId) {
    if (!generationId || state.active?.generationId === generationId) return false;
    return state.retiredGenerationIds.has(generationId);
  }

  async function snapshotFloors() {
    const getChatMessages = requireHostFunction('getChatMessages');
    const list = await Promise.resolve(getChatMessages('0-{{lastMessageId}}'));
    return Array.isArray(list) ? list : [];
  }

  function diffNewFloor(beforeFloors, afterFloors, role, expectedMessage) {
    const beforeIds = new Set((beforeFloors || []).map(item => item.message_id));
    const expected = typeof expectedMessage === 'string' ? expectedMessage.trim() : null;
    const added = (afterFloors || []).filter(item => !beforeIds.has(item.message_id) && item.role === role);
    if (expected === null) return added.length ? added[added.length - 1] : null;
    const exact = added.filter(item => String(item.message || '').trim() === expected);
    return exact.length ? exact[exact.length - 1] : null;
  }

  async function createUserFloor(txn, rawText) {
    assertTransactionValid(txn);
    const tavern = helper();
    const create = requireHostFunction('createChatMessages', tavern);
    const before = await snapshotFloors();
    assertTransactionValid(txn);
    await create([{ role: 'user', message: rawText }], { refresh: 'none' });
    assertTransactionValid(txn);
    const after = await snapshotFloors();
    assertTransactionValid(txn);
    const created = diffNewFloor(before, after, 'user', rawText);
    if (!created) throw new Error('USER_FLOOR_UNVERIFIED: 无法定位刚创建的真实 user 楼层');
    return created.message_id;
  }

  async function writeAssistantFloorUnsafe(txn, messageId, patch, replaceData = false) {
    assertTransactionValid(txn);
    if (!Number.isInteger(messageId)) throw new Error(`[${KEY}] assistant 楼层ID无效`);
    debugEvent('assistant', 'assistant-write-start', `messageId=${messageId}`);
    const tavern = helper();
    const set = requireHostFunction('setChatMessages', tavern);
    const payload = { message_id: messageId };
    if (typeof patch.message === 'string') payload.message = patch.message;
    if (patch.data) {
      if (replaceData) {
        payload.data = structuredCloneSafe(patch.data);
      } else {
        const getChatMessages = requireHostFunction('getChatMessages');
        const list = await Promise.resolve(getChatMessages(String(messageId)));
        assertTransactionValid(txn);
        payload.data = Object.assign({}, structuredCloneSafe(list?.[0]?.data || {}), structuredCloneSafe(patch.data));
      }
    }
    assertTransactionValid(txn);
    await set([payload], { refresh: 'none' });
    assertTransactionValid(txn);
    debugEvent('assistant', 'assistant-write-success', `messageId=${messageId}`);
  }

  async function writeAssistantFloor(txn, messageId, patch, replaceData = false) {
    try {
      return await writeAssistantFloorUnsafe(txn, messageId, patch, replaceData);
    } catch (error) {
      debugEvent('failure', 'assistant-write-failure', `messageId=${messageId}; ${error?.message || error}`, 'error');
      throw error;
    }
  }

  function structuredCloneSafe(value) {
    if (typeof window.structuredClone === 'function') return window.structuredClone(value);
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  async function claimAssistantFloorUnsafe(txn, finalText) {
    assertTransactionValid(txn);
    debugEvent('assistant', 'assistant-claim-start', '尝试认领或创建真实 assistant 楼层');
    if (Number.isInteger(txn.assistantMessageId)) return txn.assistantMessageId;

    const floors = await snapshotFloors();
    assertTransactionValid(txn);
    const existing = floors.filter(item => item.role === 'assistant' && item.message_id > txn.userMessageId);
    if (existing.length) {
      const claimed = existing[existing.length - 1];
      txn.assistantMessageId = claimed.message_id;
      const patch = { message: finalText };
      if (txn.pendingAssistantData) patch.data = txn.pendingAssistantData;
      await writeAssistantFloor(txn, claimed.message_id, patch, false);
      assertTransactionValid(txn);
      txn.pendingAssistantData = null;
      debugEvent('assistant', 'assistant-claim-success', `认领 messageId=${claimed.message_id}`);
      return claimed.message_id;
    }

    const tavern = helper();
    const create = requireHostFunction('createChatMessages', tavern);
    const before = floors;
    assertTransactionValid(txn);
    await create([{ role: 'assistant', message: finalText }], { refresh: 'none' });
    assertTransactionValid(txn);
    const after = await snapshotFloors();
    assertTransactionValid(txn);
    const created = diffNewFloor(before, after, 'assistant', finalText);
    if (!created) throw new Error('ASSISTANT_FLOOR_UNVERIFIED: 无法定位刚创建的真实 assistant 楼层');
    txn.assistantMessageId = created.message_id;
    if (txn.pendingAssistantData) {
      await writeAssistantFloor(txn, created.message_id, { data: txn.pendingAssistantData }, false);
      assertTransactionValid(txn);
      txn.pendingAssistantData = null;
    }
    debugEvent('assistant', 'assistant-claim-success', `创建并认领 messageId=${created.message_id}`);
    return created.message_id;
  }

  async function claimAssistantFloor(txn, finalText) {
    try {
      return await claimAssistantFloorUnsafe(txn, finalText);
    } catch (error) {
      debugEvent('failure', 'assistant-claim-failure', error?.message || error, 'error');
      throw error;
    }
  }


  function clearWatchdog() {
    if (state.watchdog?.timerId) clearTimeout(state.watchdog.timerId);
    state.watchdog = null;
  }

  function armWatchdog(txn) {
    clearWatchdog();
    if (!isTransactionValid(txn)) return;
    const seconds = Number(txn.watchdogSeconds);
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    const current = { timerId: null, seconds };
    state.watchdog = current;
    current.timerId = setTimeout(() => {
      if (state.watchdog !== current || !isTransactionValid(txn)) return;
      state.watchdog = null;
      void onWatchdogFire(txn, seconds);
    }, Math.min(seconds * 1000, 2147483647));
  }

  async function onWatchdogFire(txn, seconds) {
    if (!isTransactionValid(txn)) return;
    state.watchdogAbortAt = Date.now();
    try {
      let stopped = false;
      if (txn.generationId && typeof window.stopGenerationById === 'function') {
        stopped = !!window.stopGenerationById(txn.generationId);
      }
      if (!stopped && typeof window.stopAllGeneration === 'function') window.stopAllGeneration();
    } catch (error) {
      debugEvent('failure', 'generation-stop-failure', error?.message || error, 'error');
      console.warn(`[${KEY}] 中断超时生成失败，将继续重试流程`, error);
    }
    if (await retryNarrative(txn, `生成超时（${seconds}秒）`)) return;
    if (!isTransactionValid(txn)) return;
    await abortTurn(txn, `生成超时且重试用尽`);
    if (!isTransactionValid(txn)) return;
    const bridge = await getBridge().catch(() => null);
    if (!isTransactionValid(txn)) return;
    await bridge?.onTurnAborted?.(`生成超时（${seconds}秒）`);
    if (!isTransactionValid(txn)) return;
    closeTurn();
  }

  function consumeWatchdogAbort() {
    const at = state.watchdogAbortAt;
    state.watchdogAbortAt = 0;
    return !!at && Date.now() - at < 15000;
  }

  async function deleteOrphanUser(txn, reason) {
    if (!isTransactionValid(txn) || !Number.isInteger(txn.userMessageId) || Number.isInteger(txn.assistantMessageId) || txn.responseCommitted) return;
    try {
      const getChatMessages = requireHostFunction('getChatMessages');
      const list = await Promise.resolve(getChatMessages(String(txn.userMessageId)));
      if (!isTransactionValid(txn)) return;
      const target = list?.[0];
      if (!target || target.role !== 'user' || String(target.message || '').trim() !== String(txn.rawText || '').trim()) return;
      const remove = requireHostFunction('deleteChatMessages', helper());
      await remove([txn.userMessageId], { refresh: 'none' });
      if (!isTransactionValid(txn)) return;
      debugEvent('assistant', 'orphan-user-cleanup-success', `messageId=${txn.userMessageId}; ${reason}`, 'warn');
      console.warn(`[${KEY}] 已删除孤立 user 楼层 #${txn.userMessageId}: ${reason}`);
    } catch (error) {
      debugEvent('failure', 'orphan-user-cleanup-failure', error?.message || error, 'error');
      console.error(`[${KEY}] 删除孤立 user 楼层失败`, error);
    }
  }

  function closeTurn() {
    clearWatchdog();
    state.retry = null;
    state.active = null;
  }

  async function abortTurn(txn, reason) {
    await deleteOrphanUser(txn, reason);
  }

  async function invokeGenerate(txn, config) {
    assertTransactionValid(txn);
    const generate = requireHostFunction('generate', helper());
    debugEvent('generation', 'generation-dispatch', `generationId=${config?.generation_id || '未知'}`);
    armWatchdog(txn);
    try {
      const result = await generate(config);
      assertTransactionValid(txn);
      debugEvent('generation', 'generation-dispatch-success', `generationId=${config?.generation_id || '未知'}`);
      return result;
    } catch (error) {
      debugEvent('failure', 'generation-dispatch-failure', error?.message || error, 'error');
      throw error;
    }
  }

  async function retryNarrative(txn, reason) {
    if (!isTransactionValid(txn)) return false;
    const retry = state.retry;
    if (!txn || !retry || retry.count >= retry.limit) return false;
    retry.count += 1;
    debugEvent('generation', 'generation-retry', `${reason}; ${retry.count}/${retry.limit}`, 'warn');
    const bridge = await getBridge();
    if (!isTransactionValid(txn)) return false;
    const delay = Number(await bridge.getRetryDelayMs?.(retry.count)) || 0;
    if (!isTransactionValid(txn)) return false;
    await bridge.onRetry?.(reason, retry.count, retry.limit, delay);
    if (!isTransactionValid(txn)) return false;
    retireGenerationId(txn.generationId);
    txn.generationId = newGenerationId();
    retry.config.generation_id = txn.generationId;
    if (delay > 0) await new Promise(resolve => {
      state.retryTimerResolve = resolve;
      state.retryTimer = setTimeout(() => {
        state.retryTimer = null;
        state.retryTimerResolve = null;
        resolve();
      }, delay);
    });
    if (!isTransactionValid(txn)) return false;
    try {
      await invokeGenerate(txn, retry.config);
    } catch (error) {
      clearWatchdog();
      const message = String(error?.message || '').toLowerCase();
      if (error?.name === 'AbortError' || message.includes('abort')) {
        if (consumeWatchdogAbort()) return true;
        debugEvent('cancel', 'generation-retry-cancelled', '重试过程中被玩家中断', 'warn');
        await abortTurn(txn, '重试过程中被玩家中断');
        if (!isTransactionValid(txn)) return false;
        await bridge.onTurnAborted?.('重试过程中被玩家中断');
        if (isTransactionValid(txn)) closeTurn();
        return true;
      }
      if (await retryNarrative(txn, reason)) return true;
      if (!isTransactionValid(txn)) return false;
      await abortTurn(txn, `重试用尽后仍失败: ${error?.message || error}`);
      if (!isTransactionValid(txn)) return false;
      await bridge.onTurnFailed?.(error);
      if (isTransactionValid(txn)) closeTurn();
    }
    return true;
  }

  async function submitNativeTurn(rawText = '', sourceOrOptions, maybeOptions) {
    if (state.disposed) throw new Error(`[${KEY}] 模块已释放`);
    if (state.active) {
      debugEvent('refusal', 'submit-refused-concurrent', '上一回合仍在处理中', 'warn');
      throw new Error(`[${KEY}] 上一回合仍在处理中，拒绝并发叙事事务`);
    }
    const options = normalizeOptions(sourceOrOptions, maybeOptions);
    debugEvent('action', 'submit-native-turn', `source=${options.source}`);
    const bridge = await getBridge();
    if (state.disposed) return;
    const txn = {
      epoch: state.epoch,
      rawText: String(rawText ?? ''),
      source: options.source,
      isBranchingAction: options.isBranchingAction,
      userMessageId: null,
      assistantMessageId: null,
      generationId: null,
      responseCommitted: false,
      responseCommitPromise: null,
      eventFinalText: null,
      pendingAssistantData: null,
      watchdogSeconds: 0,
      startedAt: Date.now(),
    };
    state.active = txn;

    try {
      const prepared = await bridge.prepareTurn(txn.rawText, options);
      assertTransactionValid(txn);
      if (!prepared || prepared.accepted === false) {
        debugEvent('refusal', 'submit-cancelled-by-bridge', 'bridge.prepareTurn 未接受回合', 'warn');
        closeTurn();
        return prepared?.result;
      }
      txn.pendingAssistantData = structuredCloneSafe(prepared.assistantData || null);
      const built = await bridge.buildGenerationConfig(txn.rawText, options);
      assertTransactionValid(txn);
      if (!built || !built.config) throw new Error(`[${KEY}] bridge未返回生成配置`);
      txn.userMessageId = await createUserFloor(txn, txn.rawText);
      assertTransactionValid(txn);
      txn.generationId = newGenerationId();
      const config = Object.assign({}, built.config, { generation_id: txn.generationId });
      txn.watchdogSeconds = Number(built.watchdogSeconds) || 0;
      state.retry = { count: 0, limit: Math.max(0, Number(built.retryLimit) || 0), config };
      const generatedText = await invokeGenerate(txn, config);
      assertTransactionValid(txn);
      await commitNarrative(txn, generatedText ?? txn.eventFinalText, txn.generationId);
      assertTransactionValid(txn);
      debugEvent('action', 'submit-dispatched', `generationId=${txn.generationId}`);
    } catch (error) {
      if (state.disposed) {
        return;
      }
      clearWatchdog();
      const message = String(error?.message || '').toLowerCase();
      if (error?.name === 'AbortError' || message.includes('abort')) {
        if (consumeWatchdogAbort()) return;
        debugEvent('cancel', 'submit-cancelled', '玩家中断生成', 'warn');
        await abortTurn(txn, '玩家中断生成');
        if (!isTransactionValid(txn)) return;
        await bridge.onTurnAborted?.('玩家中断生成');
        if (isTransactionValid(txn)) closeTurn();
        return;
      }
      if (txn.userMessageId && await retryNarrative(txn, '生成请求失败')) return;
      if (!isTransactionValid(txn)) return;
      await abortTurn(txn, `生成请求最终失败: ${error?.message || error}`);
      if (!isTransactionValid(txn)) return;
      await bridge.onTurnFailed?.(error);
      if (isTransactionValid(txn)) closeTurn();
      debugEvent('failure', 'submit-failure', error?.message || error, 'error');
      throw error;
    }
  }

  function hasActiveTurn() {
    return !!state.active;
  }

  function onGenerationStarted(generationId) {
    if (state.disposed) return false;
    const txn = state.active;
    if (!txn || !generationId || !txn.generationId || txn.generationId !== generationId) {
      debugEvent('refusal', 'generation-start-ignored', `generationId=${generationId || '缺失'}; 无匹配活动事务`, 'warn');
      return false;
    }
    debugEvent('generation', 'generation-started', `generationId=${generationId}`);
    return true;
  }

  async function commitNarrative(txn, finalText, generationId) {
    if (!isTransactionValid(txn) || !generationId || generationId !== txn.generationId || isStaleGeneration(generationId)) {
      debugEvent('refusal', 'generation-end-ignored', `generationId=${generationId || '缺失'}; 无匹配活动事务`, 'warn');
      return false;
    }
    if (txn.responseCommitted) return true;
    if (txn.responseCommitPromise) return txn.responseCommitPromise;

    txn.responseCommitPromise = (async () => {
      debugEvent('generation', 'generation-ended', `generationId=${generationId}`);
      clearWatchdog();

      const bridge = await getBridge();
      if (!isTransactionValid(txn)) return false;
      const inspected = await bridge.inspectNarrative(String(finalText ?? ''), {
        generationId,
        retryCount: state.retry?.count || 0,
        retryLimit: state.retry?.limit || 0,
      });
      if (!isTransactionValid(txn)) return false;
      if (!inspected?.passed) {
        if (inspected?.autoRetryable && await retryNarrative(txn, '剧情生成质量异常')) return true;
        if (!isTransactionValid(txn)) return false;
        debugEvent('cancel', 'narrative-cancelled', '质量检查未通过且未继续修复', 'warn');
        await abortTurn(txn, '剧情生成质量异常且玩家取消修复');
        if (!isTransactionValid(txn)) return false;
        await bridge.onNarrativeCancelled?.();
        if (isTransactionValid(txn)) closeTurn();
        return true;
      }

      const acceptedText = String(inspected.text ?? finalText ?? '');
      const assistantMessageId = await claimAssistantFloor(txn, acceptedText);
      if (!isTransactionValid(txn)) return false;
      txn.responseCommitted = true;
      try {
        await bridge.completeNarrative(String(inspected.parseText ?? acceptedText), {
          userMessageId: txn.userMessageId,
          assistantMessageId,
          generationId: txn.generationId,
          userText: txn.rawText,
          narrativeText: acceptedText,
        });
        if (!isTransactionValid(txn)) return false;
        debugEvent('assistant', 'assistant-complete-success', `messageId=${assistantMessageId}`);
      } finally {
        if (isTransactionValid(txn)) closeTurn();
      }
      return true;
    })();

    try {
      return await txn.responseCommitPromise;
    } finally {
      txn.responseCommitPromise = null;
    }
  }

  async function onGenerationEnded(finalText, generationId = null) {
    if (state.disposed) return false;
    const txn = state.active;
    if (!txn || !generationId || generationId !== txn.generationId || isStaleGeneration(generationId)) {
      debugEvent('refusal', 'generation-end-ignored', `generationId=${generationId || '缺失'}; 无匹配活动事务`, 'warn');
      return false;
    }
    txn.eventFinalText = String(finalText ?? '');
    debugEvent('generation', 'generation-end-captured', `generationId=${generationId}`);
    return true;
  }

  function dispose() {
    if (state.disposed) return true;
    state.epoch += 1;
    state.disposed = true;
    state.abortController.abort();
    clearWatchdog();
    if (state.retryTimer !== null) clearTimeout(state.retryTimer);
    state.retryTimer = null;
    const resolveRetry = state.retryTimerResolve;
    state.retryTimerResolve = null;
    resolveRetry?.();
    const generationId = state.active?.generationId;
    if (generationId) retireGenerationId(generationId);
    try {
      if (generationId && typeof window.stopGenerationById === 'function') {
        window.stopGenerationById(generationId);
      }
    } catch {
      // Disposal must not fall through to chat mutation or retry logic.
    }
    closeTurn();
    state.retiredGenerationIds.clear();
    state.watchdogAbortAt = 0;
    try { contract.releaseGlobal(KEY, api); } catch { /* loader releases exact ownership too */ }
    if (modules[KEY] === api) delete modules[KEY];
    return true;
  }

  const api = Object.freeze({
    status() {
      return Object.freeze({ key: KEY, phase: 'stage2-native-transaction', ready: true, migrated: true, active: hasActiveTurn() });
    },
    hasActiveTurn,
    submitNativeTurn,
    onGenerationStarted,
    onGenerationEnded,
    dispose,
  });

  modules[KEY] = api;
  try {
    contract.initializeGlobal(KEY, api);
    debugEvent('lifecycle', 'registered', '资源已注册；业务功能依赖 cryptLord.nativeFloorBridge 与宿主生成事件接入', 'warn');
  } catch (error) {
    debugEvent('failure', 'registration-failure', error?.message || error, 'error');
    if (modules[KEY] === api) delete modules[KEY];
    throw error;
  }
})();
