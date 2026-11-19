(() => {
  'use strict';

  const KEY = 'cryptLord.nativeFloor';
  const BRIDGE_KEY = 'cryptLord.nativeFloorBridge';
  const HOST_API_KEY = 'cryptLord.hostApi';
  const AFTER_NATIVE_HOST_KEY = 'cryptLord.afterNativeHost';
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
    retryTimer: null,
    retryTimerResolve: null,
    abortController: new AbortController(),
    disposed: false,
    epoch: 1,
    nativeObserverHost: null,
    nativeMessageReceivedHandle: null,
    observedAssistantId: null,
    processedNativeAssistantIds: new Set(),
    subscriptions: [],
    inspections: new Set(),
    stoppingOwned: false,
  };

  function hostIdentity() {
    const host = modules[HOST_API_KEY], after = modules[AFTER_NATIVE_HOST_KEY], surface = after?.getHost?.();
    return { host, after, document: surface?.document, window: surface?.window,
      script: JSON.stringify(host?.scriptVariableOptions?.()), chat: surface?.window?.SillyTavern?.getCurrentChatId?.() };
  }

  function sameHost(identity) {
    try {
      const current = hostIdentity();
      return Object.keys(identity).every(key => identity[key] === current[key]);
    } catch { return false; }
  }

  function isTransactionValid(txn) {
    return !!txn && !state.disposed && txn.epoch === state.epoch && state.active === txn && sameHost(txn.identity);
  }

  function assertTransactionValid(txn) {
    if (!isTransactionValid(txn) || txn.controller?.signal.aborted) throw new DOMException('事务已失效', 'AbortError');
  }

  async function getHostApi() {
    const api = await contract.waitGlobalInitialized(HOST_API_KEY, {
      timeoutMs: 10000,
      signal: state.abortController.signal,
    });
    if (state.disposed) throw new DOMException('模块已释放', 'AbortError');
    return api;
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

  function rememberProcessedNativeAssistant(messageId) {
    const id = Number(messageId);
    if (!Number.isInteger(id)) return;
    state.processedNativeAssistantIds.add(id);
    while (state.processedNativeAssistantIds.size > 32) {
      state.processedNativeAssistantIds.delete(state.processedNativeAssistantIds.values().next().value);
    }
  }

  function isVariableNarrative(message) {
    const text = String(message?.message || '');
    return /<(?:UpdateVariable|JSONPatch|gametxt|action)\b/i.test(text);
  }

  function nearestNativeUser(messages, assistantMessageId) {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (Number(message?.message_id) >= assistantMessageId) continue;
      if (message?.role === 'user') return message;
    }
    return null;
  }

  function hasNativeState(message) {
    const data = message?.data;
    return Boolean(data && typeof data === 'object' && !Array.isArray(data) &&
      ['stat_data', 'npc_data', 'world_data'].some(key =>
        data[key] && typeof data[key] === 'object' && !Array.isArray(data[key])));
  }

  async function processNativeAssistantFloor(messageId, options = {}) {
    const id = Number(messageId);
    if (options.reprocess && !state.active && !state.inspections.size) state.processedNativeAssistantIds.delete(id);
    if (state.disposed || state.active || !Number.isInteger(id) || state.processedNativeAssistantIds.has(id)) {
      debugEvent('refusal', 'native-assistant-skipped', `messageId=${id}; active=${!!state.active}; processed=${state.processedNativeAssistantIds.has(id)}`, 'warn');
      return false;
    }
    debugEvent('assistant', 'native-assistant-begin', `messageId=${id}; reprocess=${!!options.reprocess}`);
    const epoch = state.epoch;
    const controller = new AbortController();
    const valid = () => !state.disposed && state.epoch === epoch && !controller.signal.aborted && !state.active;
    const floors = await snapshotFloors();
    const assistant = floors.find(message => Number(message?.message_id) === id && message?.role === 'assistant');
    // Only the final native receive event may settle ordinary narrative text.
    if (!assistant || (!options.allowInheritedState && !isVariableNarrative(assistant))) {
      debugEvent('refusal', 'native-assistant-missing', `messageId=${id}; found=${!!assistant}; last=${floors.at(-1)?.message_id}`, 'warn');
      return false;
    }
    const user = nearestNativeUser(floors, id);
    if (!user) {
      debugEvent('refusal', 'native-assistant-without-user', `messageId=${id}`, 'warn');
      return false;
    }
    if (!valid() || state.processedNativeAssistantIds.has(id) || Number(floors.at(-1)?.message_id) !== id) {
      debugEvent('refusal', 'native-assistant-stale', `messageId=${id}; last=${floors.at(-1)?.message_id}`, 'warn');
      return false;
    }
    // Only the floor count and the last user/assistant pair feed this settlement; metadata on older
    // floors (is_hidden, extra) changes freely while extensions run.
    const fingerprint = list => JSON.stringify([list.length,
      ...list.slice(-2).map(row => [row?.message_id, row?.role, row?.message, row?.swipe_id ?? null, row?.data])]);
    const source = fingerprint(floors);
    const beforeWrite = async () => {
      if (!valid()) throw new DOMException('原生生成来源已变化', 'AbortError');
      const latest = await snapshotFloors();
      if (fingerprint(latest) !== source || !valid()) {
        const [beforeLength, ...before] = JSON.parse(source), [nowLength, ...now] = JSON.parse(fingerprint(latest));
        const changed = beforeLength !== nowLength ? `length ${beforeLength}->${nowLength}` :
          before.flatMap((row, i) => row.map((v, k) => JSON.stringify(v) !== JSON.stringify(now[i]?.[k])
            ? `${i ? 'assistant' : 'user'}:${['id', 'role', 'message', 'swipe', 'data'][k]}` : '').filter(Boolean)).join(',');
        debugEvent('refusal', 'native-source-changed', `messageId=${id}; ${changed}`, 'warn');
        throw new DOMException('原生生成来源已变化', 'AbortError');
      }
    };

    // Mark before mutation: setChatMessages itself may cause a second DOM mutation.
    rememberProcessedNativeAssistant(id);
    state.inspections.add(controller);
    let completed = false;
    try {
      const bridge = await getBridge();
      const inspected = await bridge.inspectNarrative(String(assistant.message || ''), {
        source: 'sillytavern-native',
        assistantMessageId: id,
        signal: controller.signal,
        guard: valid,
        isTrueNewGame: !floors.some(row => row.role === 'assistant' && Number(row.message_id) < Number(user.message_id)),
      });
      if (!valid()) return false;
      if (!inspected?.passed) {
        state.processedNativeAssistantIds.delete(id);
        debugEvent('refusal', 'native-assistant-rejected', `messageId=${id}; 文本未通过处理`, 'warn');
        return false;
      }
      await beforeWrite();
      await bridge.completeNarrative(String(inspected.parseText ?? assistant.message ?? ''), {
        userMessageId: Number(user.message_id),
        assistantMessageId: id,
        generationId: `native-host-${id}`,
        userText: String(user.message || ''),
        narrativeText: String(inspected.text ?? assistant.message ?? ''),
        guard: valid,
        beforeWrite,
        floorText: inspected.floorText,
      });
      debugEvent('assistant', 'native-assistant-settled', `messageId=${id}`);
      completed = true;
      return true;
    } catch (error) {
      if (epoch === state.epoch) state.processedNativeAssistantIds.delete(id);
      if (error?.name === 'AbortError') {
        if (epoch === state.epoch && !state.disposed && !controller.signal.aborted)
          window.toastr?.warning?.('原生正文来源已变化，本次检修未覆盖外部修改。');
        return false;
      }
      throw error;
    } finally {
      if (!completed && epoch === state.epoch) state.processedNativeAssistantIds.delete(id);
      if (!completed && valid()) modules['cryptLord.battlePromptMode']?.finishTurn();
      state.inspections.delete(controller);
    }
  }

  async function scanNativeAssistantFloors(options = {}) {
    if (state.disposed) return 0;
    const floors = await snapshotFloors();
    const assistants = floors
      .filter(message => message?.role === 'assistant' && Number.isInteger(Number(message.message_id)))
      .sort((left, right) => Number(left.message_id) - Number(right.message_id));
    const latestId = assistants.length ? Number(assistants[assistants.length - 1].message_id) : -1;
    if (state.observedAssistantId === null) {
      state.observedAssistantId = latestId;
      debugEvent('lifecycle', 'native-observer-primed', `latestAssistantId=${latestId}`);
      const latest = assistants[assistants.length - 1];
      if (options.recoverLatest && latest && !hasNativeState(latest)) {
        return (await processNativeAssistantFloor(latest.message_id, { allowInheritedState: true })) ? 1 : 0;
      }
      return 0;
    }
    const pending = assistants.filter(message => Number(message.message_id) > state.observedAssistantId);
    state.observedAssistantId = Math.max(state.observedAssistantId, latestId);
    let settled = 0;
    for (const message of pending) {
      if (!options.allowInheritedState) continue;
      if (await processNativeAssistantFloor(message.message_id, options)) settled += 1;
    }
    return settled;
  }

  // Settlement is driven only by MESSAGE_RECEIVED. At install we recover the latest floor once
  // in case a reply landed while the script was not loaded.
  async function installNativeObserver() {
    const afterNative = modules[AFTER_NATIVE_HOST_KEY];
    const host = afterNative?.getHost?.();
    if (!host?.document || state.disposed || state.nativeObserverHost) return false;
    state.nativeObserverHost = host;
    await scanNativeAssistantFloors({ recoverLatest: true });
    if (state.disposed) return false;
    const events = afterNative?.tavernEvents?.();
    if (events?.MESSAGE_RECEIVED && !state.nativeMessageReceivedHandle) {
      state.nativeMessageReceivedHandle = afterNative.bindEvent?.(events.MESSAGE_RECEIVED, (messageId, type) => {
        if (type && !['normal', 'regenerate', 'swipe', 'continue', 'append'].includes(type)) return;
        void processNativeAssistantFloor(Number(messageId), {
          allowInheritedState: true, reprocess: ['regenerate', 'swipe', 'continue', 'append'].includes(type),
        }).catch(error => {
          debugEvent('failure', 'native-message-received-settlement-failure', error?.message || error, 'error');
        });
      }) || null;
    }
    debugEvent('lifecycle', 'native-observer-installed', host.document.URL || 'unknown-host');
    return true;
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
    const hostApi = await getHostApi();
    const list = await hostApi.getChatMessages('0-{{lastMessageId}}');
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
    const hostApi = await getHostApi();
    const before = await snapshotFloors();
    assertTransactionValid(txn);
    await hostApi.createChatMessages([{ role: 'user', message: rawText }], { refresh: 'none' });
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
    const hostApi = await getHostApi();
    const payload = { message_id: messageId };
    if (typeof patch.message === 'string') payload.message = patch.message;
    if (patch.data) {
      if (replaceData) {
        payload.data = structuredCloneSafe(patch.data);
      } else {
        const list = await hostApi.getChatMessages(String(messageId));
        assertTransactionValid(txn);
        payload.data = Object.assign({}, structuredCloneSafe(list?.[0]?.data || {}), structuredCloneSafe(patch.data));
      }
    }
    assertTransactionValid(txn);
    await hostApi.setChatMessages([payload], { refresh: 'none' });
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
    const user = floors.find(item => item.message_id === txn.userMessageId);
    if (user?.role !== 'user' || user.message !== txn.rawText) throw new DOMException('用户楼层已变化', 'AbortError');
    if (existing.length) {
      const claimed = existing[existing.length - 1];
      if (existing.length !== 1 || floors.at(-1)?.message_id !== claimed.message_id ||
        ![txn.generatedRaw, finalText].includes(String(claimed.message || '')))
        throw new DOMException('出现外部楼层，不能认领', 'AbortError');
      txn.assistantMessageId = claimed.message_id;
      const patch = { message: finalText };
      if (txn.pendingAssistantData) patch.data = txn.pendingAssistantData;
      await writeAssistantFloor(txn, claimed.message_id, patch, false);
      assertTransactionValid(txn);
      txn.pendingAssistantData = null;
      debugEvent('assistant', 'assistant-claim-success', `认领 messageId=${claimed.message_id}`);
      return claimed.message_id;
    }
    if (floors.at(-1)?.message_id !== txn.userMessageId) throw new DOMException('出现外部楼层，不能创建正文', 'AbortError');

    const hostApi = await getHostApi();
    const before = floors;
    assertTransactionValid(txn);
    await hostApi.createChatMessages([{ role: 'assistant', message: finalText }], { refresh: 'none' });
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
    const current = { timerId: null, seconds, generationId: txn.generationId };
    state.watchdog = current;
    current.timerId = setTimeout(() => {
      if (state.watchdog !== current || !isTransactionValid(txn)) return;
      state.watchdog = null;
      txn.timeoutGeneration?.(current.generationId, seconds);
    }, Math.min(seconds * 1000, 2147483647));
  }

  function stopOwnedGeneration(id) {
    const owner = modules[AFTER_NATIVE_HOST_KEY]?.getHost?.()?.window || window;
    try {
      state.stoppingOwned = true;
      if (typeof owner.stopGenerationById === 'function') owner.stopGenerationById(id);
      else owner.TavernHelper?.stopGenerationById?.(id);
    } catch { /* Do not stop unrelated native or secondary requests. */ }
    finally { state.stoppingOwned = false; }
  }

  function onStreamToken(text, generationId) {
    const txn = state.active;
    if (!isTransactionValid(txn) || generationId !== txn.generationId || !txn.shouldStream || !text || !state.watchdog) return false;
    armWatchdog(txn); return true;
  }

  async function deleteOrphanUser(txn, reason) {
    if (!isTransactionValid(txn) || !Number.isInteger(txn.userMessageId) || Number.isInteger(txn.assistantMessageId) || txn.responseCommitted) return;
    try {
      const hostApi = await getHostApi();
      if (!isTransactionValid(txn)) return;
      const floors = await snapshotFloors();
      if (!isTransactionValid(txn)) return;
      const target = floors.at(-1);
      if (target?.message_id !== txn.userMessageId) return;
      if (!target || target.role !== 'user' || String(target.message || '').trim() !== String(txn.rawText || '').trim()) return;
      await hostApi.deleteChatMessages([txn.userMessageId], { refresh: 'none' });
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
    modules['cryptLord.battlePromptMode']?.finishTurn(state.active?.battlePromptTurn);
    state.active?.controller.abort();
    state.retry = null;
    state.active = null;
  }

  async function abortTurn(txn, reason) {
    await deleteOrphanUser(txn, reason);
  }

  async function invokeGenerate(txn, config) {
    assertTransactionValid(txn);
    const hostApi = await getHostApi();
    assertTransactionValid(txn);
    await txn.assertQueues?.({
      userMessageId: txn.userMessageId, userText: txn.rawText,
      guard: () => isTransactionValid(txn) && !txn.controller.signal.aborted,
    });
    assertTransactionValid(txn);
    debugEvent('generation', 'generation-dispatch', `generationId=${config?.generation_id || '未知'}`);
    const generationId = txn.generationId;
    txn.eventFinalText = null;
    txn.shouldStream = Boolean(config.should_stream);
    let abort;
    const interrupted = new Promise((_, reject) => {
      abort = () => reject(new DOMException('生成已取消', 'AbortError'));
      txn.controller.signal.addEventListener('abort', abort, { once: true });
      txn.timeoutGeneration = (id, seconds) => {
        if (id !== generationId || !isTransactionValid(txn)) return;
        retireGenerationId(id);
        reject(new Error(`正文生成超时（${seconds}秒）`));
        stopOwnedGeneration(id);
      };
    });
    armWatchdog(txn);
    try {
      const result = await Promise.race([hostApi.generate({ ...config }), interrupted]);
      assertTransactionValid(txn);
      if (txn.generationId !== generationId) throw new DOMException('旧请求已失效', 'AbortError');
      debugEvent('generation', 'generation-dispatch-success', `generationId=${config?.generation_id || '未知'}`);
      return result ?? txn.eventFinalText;
    } catch (error) {
      debugEvent('failure', 'generation-dispatch-failure', error?.message || error, 'error');
      throw error;
    } finally {
      if (state.active === txn && txn.generationId === generationId) { clearWatchdog(); txn.timeoutGeneration = null; }
      txn.controller.signal.removeEventListener('abort', abort);
    }
  }

  async function retryNarrative(txn, reason, commit = true) {
    if (!isTransactionValid(txn)) return false;
    const retry = state.retry;
    if (!txn || !retry || txn.responseCommitted || Number.isInteger(txn.assistantMessageId) ||
      retry.manualTakeover || retry.count >= retry.limit) return false;
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
      const text = await invokeGenerate(txn, retry.config);
      if (!commit) return { text, generationId: txn.generationId };
      await commitNarrative(txn, text, txn.generationId);
    } catch (error) {
      if (!isTransactionValid(txn)) return false;
      clearWatchdog();
      const message = String(error?.message || '').toLowerCase();
      if (error?.name === 'AbortError' || message.includes('abort')) {
        debugEvent('cancel', 'generation-retry-cancelled', '重试过程中被玩家中断', 'warn');
        await abortTurn(txn, '重试过程中被玩家中断');
        if (!isTransactionValid(txn)) return false;
        await bridge.onTurnAborted?.('重试过程中被玩家中断');
        if (isTransactionValid(txn)) closeTurn();
        return true;
      }
      const next = await retryNarrative(txn, reason, commit);
      if (next) return next;
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
    const identity = hostIdentity();
    debugEvent('action', 'submit-native-turn', `source=${options.source}`);
    const bridge = await getBridge();
    if (state.disposed) return;
    if (!sameHost(identity)) throw new DOMException('原生回合宿主、聊天或脚本已变化', 'AbortError');
    if (state.active || state.inspections.size) throw new Error(`[${KEY}] 上一回合仍在处理中，拒绝并发叙事事务`);
    const txn = {
      identity,
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
      controller: new AbortController(),
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
      txn.shortcutTurn = built.shortcutTurn;
      txn.clueTurn = structuredCloneSafe(built.clueTurn);
      txn.characterTurn = structuredCloneSafe(built.characterTurn);
      txn.archiveTurn = structuredCloneSafe(built.archiveTurn);
      txn.battlePromptTurn = built.battlePromptTurn;
      txn.randomTurn = built.randomTurn;
      txn.assertQueues = built.assertQueues;
      txn.userMessageId = await createUserFloor(txn, txn.rawText);
      assertTransactionValid(txn);
      txn.generationId = newGenerationId();
      const config = Object.assign({}, built.config, { generation_id: txn.generationId });
      txn.watchdogSeconds = Number(built.watchdogSeconds) || 0;
      state.retry = { count: 0, limit: Math.max(0, Number(built.retryLimit) || 0), config };
      const generatedText = await invokeGenerate(txn, config);
      assertTransactionValid(txn);
      await commitNarrative(txn, generatedText ?? txn.eventFinalText, txn.generationId);
      debugEvent('action', 'submit-dispatched', `generationId=${txn.generationId}`);
    } catch (error) {
      if (!isTransactionValid(txn)) {
        return;
      }
      clearWatchdog();
      const message = String(error?.message || '').toLowerCase();
      if (error?.name === 'AbortError' || message.includes('abort')) {
        debugEvent('cancel', 'submit-cancelled', '玩家中断生成', 'warn');
        await abortTurn(txn, '玩家中断生成');
        if (!isTransactionValid(txn)) return;
        await bridge.onTurnAborted?.('玩家中断生成');
        if (isTransactionValid(txn)) closeTurn();
        return;
      }
      if (Number.isInteger(txn.userMessageId) && !txn.responseCommitted && await retryNarrative(txn, '生成请求失败')) return;
      if (!isTransactionValid(txn)) return;
      await abortTurn(txn, `生成请求最终失败: ${error?.message || error}`);
      if (!isTransactionValid(txn)) return;
      await bridge.onTurnFailed?.(error);
      if (isTransactionValid(txn)) closeTurn();
      debugEvent('failure', 'submit-failure', error?.message || error, 'error');
      throw error;
    } finally {
      if (state.active === txn && !isTransactionValid(txn)) closeTurn();
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
      let inspected;
      while (isTransactionValid(txn)) {
        txn.generatedRaw = String(finalText ?? '');
        inspected = await bridge.inspectNarrative(txn.generatedRaw, {
          generationId,
          retryCount: state.retry?.count || 0,
          retryLimit: state.retry?.limit || 0,
          signal: txn.controller.signal,
          guard: () => isTransactionValid(txn) && !txn.controller.signal.aborted,
          isTrueNewGame: !(await snapshotFloors()).some(row => row.role === 'assistant' && row.message_id < txn.userMessageId),
        });
        if (inspected?.manualTakeover && state.retry) state.retry.manualTakeover = true;
        if (!isTransactionValid(txn)) return false;
        if (!inspected?.autoRetryable) break;
        const next = await retryNarrative(txn, '剧情生成质量异常', false);
        if (!next || typeof next !== 'object') return false;
        finalText = next.text; generationId = next.generationId;
      }
      if (!isTransactionValid(txn)) return false;
      if (!inspected?.passed) {
        if (!isTransactionValid(txn)) return false;
        debugEvent('cancel', 'narrative-cancelled', '质量检查未通过且未继续修复', 'warn');
        await abortTurn(txn, '剧情生成质量异常且玩家取消修复');
        if (!isTransactionValid(txn)) return false;
        await bridge.onNarrativeCancelled?.();
        if (isTransactionValid(txn)) closeTurn();
        return true;
      }

      const acceptedText = String(inspected.text ?? finalText ?? '');
      const assistantMessageId = await claimAssistantFloor(txn, String(inspected.floorText ?? acceptedText));
      if (!isTransactionValid(txn)) return false;
      txn.responseCommitted = true;
      rememberProcessedNativeAssistant(assistantMessageId);
      const committedSource = JSON.stringify(await snapshotFloors());
      const beforeWrite = async () => {
        if (!isTransactionValid(txn) || JSON.stringify(await snapshotFloors()) !== committedSource || !isTransactionValid(txn))
          throw new DOMException('正文来源已变化，停止结算', 'AbortError');
      };
      try {
        await bridge.completeNarrative(String(inspected.parseText ?? acceptedText), {
          userMessageId: txn.userMessageId,
          assistantMessageId,
          generationId: txn.generationId,
          userText: txn.rawText,
          narrativeText: acceptedText,
          shortcutTurn: txn.shortcutTurn,
          clueTurn: txn.clueTurn,
          characterTurn: txn.characterTurn,
          archiveTurn: txn.archiveTurn,
          battlePromptTurn: txn.battlePromptTurn,
          randomTurn: txn.randomTurn,
          guard: () => isTransactionValid(txn) && !txn.controller.signal.aborted,
          beforeWrite,
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
    state.active?.controller.abort();
    state.inspections.forEach(controller => controller.abort());
    state.subscriptions.splice(0).forEach(handle => handle?.stop?.());
    state.abortController.abort();
    clearWatchdog();
    if (state.retryTimer !== null) clearTimeout(state.retryTimer);
    state.retryTimer = null;
    const resolveRetry = state.retryTimerResolve;
    state.retryTimerResolve = null;
    resolveRetry?.();
    const generationId = state.active?.generationId;
    if (generationId) retireGenerationId(generationId);
    if (generationId) stopOwnedGeneration(generationId);
    closeTurn();
    state.retiredGenerationIds.clear();
    state.nativeObserverHost = null;
    state.nativeMessageReceivedHandle?.stop?.();
    state.nativeMessageReceivedHandle = null;
    state.observedAssistantId = null;
    state.processedNativeAssistantIds.clear();
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
    processNativeAssistantFloor,
    scanNativeAssistantFloors,
    onGenerationStarted,
    onGenerationEnded,
    onStreamToken,
    dispose,
  });

  modules[KEY] = api;
  try {
    contract.initializeGlobal(KEY, api);
    debugEvent('lifecycle', 'registered', '资源已注册；业务功能依赖 cryptLord.nativeFloorBridge 与宿主生成事件接入', 'warn');
    void installNativeObserver().catch(error => {
      debugEvent('failure', 'native-observer-install-failure', error?.message || error, 'error');
    });
    const after = modules[AFTER_NATIVE_HOST_KEY], events = after?.tavernEvents?.();
    const owner = after?.getHost?.()?.window || window, helperEvents = owner.iframe_events || window.iframe_events;
    if (helperEvents?.STREAM_TOKEN_RECEIVED_FULLY) state.subscriptions.push(
      after.bindEvent(helperEvents.STREAM_TOKEN_RECEIVED_FULLY, onStreamToken));
    if (events?.CHAT_CHANGED) state.subscriptions.push(after.bindEvent(events.CHAT_CHANGED, () => {
      state.epoch += 1;
      const id = state.active?.generationId;
      state.active?.controller.abort();
      state.inspections.forEach(controller => controller.abort());
      if (id) stopOwnedGeneration(id);
      if (state.retryTimer) clearTimeout(state.retryTimer);
      state.retryTimerResolve?.(); state.retryTimer = state.retryTimerResolve = null;
      closeTurn(); state.observedAssistantId = null; state.processedNativeAssistantIds.clear();
    }));
    // Deleted floor ids are reused by the next reply; forget them so it can settle again.
    if (events?.MESSAGE_DELETED) state.subscriptions.push(after.bindEvent(events.MESSAGE_DELETED, messageId => {
      const from = Number(messageId);
      for (const id of [...state.processedNativeAssistantIds])
        if (!Number.isInteger(from) || id >= from) state.processedNativeAssistantIds.delete(id);
      if (state.observedAssistantId !== null && (!Number.isInteger(from) || state.observedAssistantId >= from))
        state.observedAssistantId = Number.isInteger(from) ? from - 1 : null;
    }));
    if (events?.GENERATION_STOPPED) state.subscriptions.push(after.bindEvent(events.GENERATION_STOPPED, () => {
      if (state.stoppingOwned) return;
      state.active?.controller.abort();
      state.inspections.forEach(controller => controller.abort());
      if (state.active?.generationId) stopOwnedGeneration(state.active.generationId);
      if (state.retryTimer) clearTimeout(state.retryTimer);
      state.retryTimerResolve?.(); state.retryTimer = state.retryTimerResolve = null;
    }));
  } catch (error) {
    debugEvent('failure', 'registration-failure', error?.message || error, 'error');
    if (modules[KEY] === api) delete modules[KEY];
    throw error;
  }
})();
