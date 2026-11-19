(() => {
  'use strict';

  const KEY = 'cryptLord.stateStore';
  const HOST_API_KEY = 'cryptLord.hostApi';
  const PATCH_KEY = 'cryptLord.variablePatch';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const existing = modules[KEY];
  if (existing) {
    contract.initializeGlobal(KEY, existing);
    return;
  }
  const preparedWrites = new WeakMap();

  function clone(value) {
    if (value === undefined) return undefined;
    return typeof window.structuredClone === 'function' ? window.structuredClone(value) : JSON.parse(JSON.stringify(value));
  }

  function cleanData(value) {
    const data = clone(value || {});
    if (data?.world_data && typeof data.world_data === 'object' && !Array.isArray(data.world_data)) {
      delete data.world_data['星界之门'];
    }
    if (data?.cryptLord?.rewards && typeof data.cryptLord.rewards === 'object' && !Array.isArray(data.cryptLord.rewards)) {
      delete data.cryptLord.rewards.astralDust;
      if (!Object.keys(data.cryptLord.rewards).length) delete data.cryptLord.rewards;
    }
    return data;
  }
  async function settledData(value, options = {}) {
    const items = modules['cryptLord.itemDerivation'];
    if (options.itemOnly) {
      if (!items || !options.itemPrepared) throw Error('物品修正来源不可确认');
      return items.adopt(value, options.itemPrepared, options.guard);
    }
    const npcGrowth = modules['cryptLord.npcProgression'];
    if (options.npcOnly) {
      if (!npcGrowth || !options.npcPrepared) throw Error('NPC修正来源不可确认');
      const result = npcGrowth.adopt(value, options.npcPrevious, options.npcPrepared);
      return { data: result.data, npcProgression: result.prepared };
    }
    let data = cleanData(value);
    const itemDerivation = items && !options.skipItemDerivation ? await items.prepare(data, options.guard) : null;
    if (itemDerivation) data = itemDerivation.data;
    const territory = modules['cryptLord.shamanTerritoryState'];
    const hasTerritory = data?.stat_data?.$专属玩法?.萨满途径?.设置领地图腾玩法;
    const mysteryNeedsPool = data?.stat_data && modules['cryptLord.mysteryAnalysisState'] &&
      (data.stat_data.$专属玩法?.窥秘人途径?.神秘解析玩法 ||
        data.stat_data.$神秘解析上限同步 || data.stat_data.辅助能力列表?.['#神秘解析']);
    const imagination = modules['cryptLord.audienceImaginationState'];
    const inBattle = ['teamBattle', 'personalBattle'].some(key => data?.cryptLord?.[key]?.status === 'active');
    const projectionNeedsPool = imagination && !inBattle && data.stat_data &&
      (data.stat_data.$专属玩法?.观众途径?.空想玩法 || data.stat_data.$专属玩法?.秘祈人途径?.放牧玩法 ||
        Object.keys(data.stat_data.序列能力列表 || {}).some(key => /^#(?:空想|放牧):/.test(key)) ||
        data.stat_data.辅助能力列表?.['#空想'] || data.stat_data.辅助能力列表?.['#放牧']);
    const growth = modules['cryptLord.playerProgression'];
    const progression = growth ? await growth.prepare(data, options.progressionPrevious, options.guard) : null;
    if (progression) data = progression.data;
    const abilities = modules['cryptLord.abilityState'];
    const abilityDerivation = abilities?.prepare && !options.skipAbilityDerivation
      ? await abilities.prepare(data, { previous: options.progressionPrevious, mode: options.abilityMode || 'save',
        guard: options.guard }) : null;
    if (abilityDerivation) data = clone(abilityDerivation.data);
    const pool = abilityDerivation?.pool ||
      (!options.skipAbilityDerivation && !abilityDerivation &&
        (territory && hasTerritory || mysteryNeedsPool || projectionNeedsPool) && abilities
        ? await abilities.loadPool() : undefined);
    if (!abilityDerivation && projectionNeedsPool && pool) {
      imagination.validate(data);
      const hostWindow = modules['cryptLord.afterNativeHost']?.getHost()?.window || window;
      const setting = modules['cryptLord.abilityState'].locked ? null : hostWindow.localStorage?.getItem('ST_LoM_AbilityLock');
      modules['cryptLord.audienceImagination'].sync(data, pool,
        modules['cryptLord.abilityState'].locked?.(data) ??
          (setting == null ? data.stat_data.序列能力锁定 === true : setting === 'true'));
    }
    if (!abilityDerivation && territory) {
      if (hasTerritory && pool) territory.sync(data, pool);
    } else if (!territory) modules['cryptLord.shamanTerritory']?.syncRadius?.(data);
    const mystery = modules['cryptLord.mysteryAnalysis'];
    if (data?.stat_data && mystery) {
      const stat = data.stat_data;
      if (!abilityDerivation) mystery.syncDisplay(stat, pool);
      if (!modules['cryptLord.attributeRecalculation']) mystery.reconcile(stat, pool);
    }
    if (progression && !progression.skipped) {
      progression.data = data;
      growth.finalize(progression, pool);
    }
    else modules['cryptLord.attributeRecalculation']?.apply(data, pool);
    const npcProgression = npcGrowth && !options.skipNpcProgression ? await npcGrowth.prepare(data, options.npcPrevious, options.guard) : null;
    if (npcProgression) data = npcProgression.data;
    const world = modules['cryptLord.nativeSettlement'];
    if (options.worldPrepared && !world?.prepare) throw Error('世界结算服务已卸载，请重新准备');
    let worldSettlement = null;
    // The original schemas derive maxima before time passage regenerates current resources.
    if (world?.prepare && !options.skipWorldSettlement) {
      worldSettlement = options.worldPrepared || await world.prepare(data, options.settlementPrevious, options.guard,
        { ...options.settlementContext, warfareRules: options.warfareRules, industryRules: options.industryRules });
      data = options.worldPrepared
        ? await world.adopt(data, options.settlementPrevious, options.worldPrepared, options.guard)
        : clone(worldSettlement.data);
    }
    const dynamic = modules['cryptLord.dynamicStatus'];
    let dynamicPrepared = null;
    if (options.dynamicPrepared && !dynamic?.assertLoaded) throw Error('动态规则服务已卸载，请重新准备');
    if (dynamic && options.dynamicEpoch !== undefined && dynamic.status().epoch !== options.dynamicEpoch)
      throw Object.assign(Error('动态状态来源聊天或生成已变化，未写入旧结果'), { code: 'DYNAMIC_STATUS_CANCELLED' });
    if (dynamic && (data?.stat_data || data?.npc_data) && !options.skipDynamicStatus) {
      dynamicPrepared = options.dynamicPrepared || await dynamic.load(options.guard);
      dynamic.assertIdentity?.(dynamicPrepared, options.guard);
      const rules = dynamicPrepared.rules;
      if (data.stat_data) dynamic.apply(data, rules);
      else {
        const work = { stat_data: {}, npc_data: data.npc_data };
        dynamic.apply(work, rules); data.npc_data = work.npc_data;
      }
    }
    modules['cryptLord.characterPanelState']?.normalizeQuests?.(data);
    modules['cryptLord.cashflow']?.normalize(data);
    return { data, progression, npcProgression, itemDerivation, abilityDerivation,
      abilityService: abilities, worldSettlement, worldService: world, dynamicPrepared, dynamicService: dynamic };
  }
  function previewAssistantData(data, previous, guard) {
    return settledData(data, { settlementPrevious: previous, progressionPrevious: previous?.stat_data,
      npcPrevious: previous?.npc_data, guard });
  }
  async function assertAbilities(result, opening, guard) {
    if (result.abilityDerivation) {
      if (modules['cryptLord.abilityState'] !== result.abilityService)
        throw Error('能力同步服务已卸载，请重新准备');
      await result.abilityService.assertPrepared(result.abilityDerivation, guard);
    }
    if (opening) {
      const service = modules['cryptLord.abilityState'];
      if (!service?.assertPrepared) throw Error('开战能力同步服务已卸载');
      await service.assertPrepared(opening, guard);
    }
  }

  async function assertGenerationRules(result, options, guard) {
    if (options.detectiveSource || options.detectiveConfig) {
      const service = modules['cryptLord.detectiveState'];
      if (!service?.assertSource || !service?.assertConfig) throw Error('探案来源服务已卸载，未写入');
      if (options.detectiveSource) await service.assertSource(options.detectiveSource, guard);
      if (options.detectiveConfig) await service.assertConfig(options.detectiveConfig, guard);
    }
    if (result.dynamicPrepared && result.dynamicService?.assertLoaded) {
      if (modules['cryptLord.dynamicStatus'] !== result.dynamicService) throw Error('动态规则服务已卸载');
      await result.dynamicService.assertLoaded(result.dynamicPrepared, guard);
    }
    if (options.variablePrepared) {
      const service = modules['cryptLord.variableSettlementApi'];
      if (!service?.assertResult) throw Error('变量模板来源服务已卸载');
      await service.assertResult(options.variablePrepared, guard);
    }
    if (options.rulePool) {
      const service = modules['cryptLord.abilityState'];
      if (!service?.assertPool) throw Error('玩法规则服务已卸载，请重新读取');
      await service.assertPool(options.rulePool, guard);
    }
    if (options.warfareRules) {
      const service = modules['cryptLord.domainState'];
      if (!service?.assertWarRules) throw Error('战争规则服务已卸载，请重新读取');
      await service.assertWarRules(options.warfareRules, guard);
    }
    if (options.affairRules) {
      const service = modules['cryptLord.affairState'];
      if (!service?.assertRules) throw Error('事务规则服务已卸载，请重新读取');
      await service.assertRules(options.affairRules, guard);
    }
    if (options.forgeRules) {
      const service = modules['cryptLord.itemDerivation'];
      if (!service?.assertRules) throw Error('重铸规则服务已卸载，请重新读取');
      await service.assertRules(options.forgeRules, guard);
    }
    if (options.industryRules) {
      const service = modules['cryptLord.industryState'];
      if (!service?.assertRules) throw Error('产业规则服务已卸载，请重新读取');
      await service.assertRules(options.industryRules, guard);
    }
  }
  function guardDynamicSource(result, guard) {
    if (!result.dynamicPrepared) return;
    if (modules['cryptLord.dynamicStatus'] !== result.dynamicService) throw Error('动态规则服务已卸载');
    result.dynamicService.assertIdentity?.(result.dynamicPrepared, guard);
  }

  async function messages() {
    const hostApi = await contract.waitGlobalInitialized(HOST_API_KEY, { timeoutMs: 10000 });
    const list = await hostApi.getChatMessages('0-{{lastMessageId}}');
    return { hostApi, list: Array.isArray(list) ? list : [] };
  }

  let openingPromise = null;
  async function ensureOpeningState() {
    if (openingPromise) return openingPromise;
    openingPromise = (async () => {
      const { hostApi, list } = await messages();
      const opening = list.find(message => Number(message?.message_id) === 0 && message?.role === 'assistant');
      if (!opening || !/<UpdateVariable\b/i.test(String(opening.message || ''))) return null;
      const patch = await contract.waitGlobalInitialized(PATCH_KEY, { timeoutMs: 10000 });
      const commands = patch.commands(opening.message);
      if (!commands.length) return null;
      const source = JSON.stringify(commands);
      let hash = 2166136261;
      for (let index = 0; index < source.length; index += 1) {
        hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
      }
      const signature = `${source.length}:${(hash >>> 0).toString(16)}`;
      const current = cleanData(opening.data);
      if (current.cryptLord?.openingPatchSignature === signature) return current;
      const result = patch.apply(opening.message, current);
      if (!result.applied) return null;
      const next = cleanData(result.data);
      next.cryptLord = { ...(next.cryptLord || {}), openingPatchSignature: signature };
      await hostApi.setChatMessages([{ message_id: 0, data: next }], { refresh: 'affected' });
      try { await modules['cryptLord.nativeFloorStatusBar']?.refresh?.(0); }
      catch (error) { console.warn(`[${KEY}] 开场变量已写入，状态条刷新失败`, error); }
      return next;
    })();
    try { return await openingPromise; }
    finally { openingPromise = null; }
  }

  async function findLatestAssistant(beforeMessageId = Infinity) {
    await ensureOpeningState();
    const { list } = await messages();
    for (let index = list.length - 1; index >= 0; index -= 1) {
      const message = list[index];
      if (message?.role === 'assistant' && message.message_id < beforeMessageId) {
        const latest = clone(message);
        latest.data = cleanData(latest.data);
        return latest;
      }
    }
    return null;
  }

  async function readAssistantData(beforeMessageId = Infinity) {
    return cleanData((await findLatestAssistant(beforeMessageId))?.data);
  }

  async function readMessageData(messageId) {
    if (!Number.isInteger(messageId)) throw new Error(`[${KEY}] 消息楼层 ID 无效`);
    if (messageId === 0) await ensureOpeningState();
    const { hostApi } = await messages();
    const list = await hostApi.getChatMessages(String(messageId));
    return cleanData(Array.isArray(list) ? list[0]?.data : {});
  }

  async function readMessage(messageId) {
    if (!Number.isInteger(messageId)) throw new Error(`[${KEY}] 消息楼层 ID 无效`);
    if (messageId === 0) await ensureOpeningState();
    const { hostApi } = await messages();
    const list = await hostApi.getChatMessages(String(messageId));
    if (!Array.isArray(list) || !list[0]) return null;
    const message = clone(list[0]);
    message.data = cleanData(message.data);
    return message;
  }

  function notifyCollectionGrowth(messageId) {
    const growth = modules['cryptLord.collectionGrowth'];
    if (growth) void growth.observe(messageId).catch(error => {
      if (error?.name !== 'AbortError') console.warn(`[${KEY}] 楼层已保存，变量增殖提醒可重新读取`, error);
    });
  }

  async function writeAssistantMessage(messageId, message, data, options = {}) {
    // Hide/unhide by context extensions is not a content change; compare only settlement inputs.
    const sourceKey = rows => JSON.stringify((rows || []).map(row => row && typeof row === 'object' ? { ...row, is_hidden: undefined, extra: undefined } : row));
    if (!options.preserveData && !options.npcOnly && !options.itemOnly && !options.skipDynamicStatus) {
      const guard = modules['cryptLord.dynamicStatus']?.createGuard?.(options.guard);
      if (guard) options = { ...options, guard };
    }
    await options.beforeWrite?.();
    const directHost = options.nativeTarget ? await contract.waitGlobalInitialized(HOST_API_KEY, { timeoutMs: 10000 }) : null;
    const target = directHost ? clone((await directHost.getChatMessages(String(messageId)))?.[0]) : await readMessage(messageId);
    if (target?.role !== 'assistant') throw new Error(`[${KEY}] 只能编辑真实 assistant 楼层`);
    const { hostApi } = await messages();
    const worldRevision = !options.preserveData && !options.npcOnly && !options.itemOnly &&
      (!options.skipWorldSettlement && modules['cryptLord.nativeSettlement']?.prepare ||
        modules['cryptLord.abilityState']?.prepare || modules['cryptLord.dynamicStatus'] ||
        options.variablePrepared || options.rulePool || options.warfareRules || options.affairRules || options.forgeRules || options.industryRules)
      ? clone(await hostApi.getChatMessages('0-{{lastMessageId}}', { include_swipes: true })) : null;
    const result = options.preserveData ? { data: clone(target.data) } :
      await settledData(options.npcOnly ? { ...clone(target.data), npc_data: clone(data?.npc_data) } : data ?? target.data,
        { ...options, settlementPrevious: options.settlementPrevious ?? target.data,
        progressionPrevious: options.progressionPrevious ?? target.data?.stat_data,
        npcPrevious: options.npcPrevious ?? target.data?.npc_data });
    const next = result.data;
    await options.beforeWrite?.();
    if (result.progression) await modules['cryptLord.playerProgression'].assertPrepared(result.progression, options.guard);
    if (result.npcProgression) await modules['cryptLord.npcProgression'].assertPrepared(result.npcProgression, options.guard);
    if (result.itemDerivation) await modules['cryptLord.itemDerivation'].assertPrepared(result.itemDerivation, options.guard);
    await assertAbilities(result, options.abilityPrepared, options.guard);
    if (result.worldSettlement) {
      if (modules['cryptLord.nativeSettlement'] !== result.worldService) throw Error('世界结算服务已卸载，请重新准备');
      await result.worldService.assertPrepared(result.worldSettlement, options.guard);
    }
    await assertGenerationRules(result, options, options.guard);
    if (worldRevision && sourceKey(await hostApi.getChatMessages('0-{{lastMessageId}}', { include_swipes: true })) !== sourceKey(worldRevision))
      throw Error('世界结算来源正文、变量、消息页或末楼已变化，未写入');
    const current = (await hostApi.getChatMessages(String(messageId)))?.[0];
    if (sourceKey([current]) !== sourceKey([target])) throw Error('目标assistant楼层已变化，未覆盖外部修改');
    if (options.preserveData) await options.onWriteAttempt?.(clone(next));
    if (options.guard && !options.guard()) throw new DOMException('楼层保存已取消', 'AbortError');
    guardDynamicSource(result, options.guard);
    await hostApi.setChatMessages([{ message_id: messageId, message: String(message), data: next }], { refresh: 'affected' });
    notifyCollectionGrowth(messageId);
    return clone(next);
  }

  async function writeAssistantData(messageId, data, refresh = 'affected', beforeWrite, guard, options = {}) {
    if (!Number.isInteger(messageId)) throw new Error(`[${KEY}] assistant 楼层 ID 无效`);
    if (!options.itemOnly) guard = modules['cryptLord.dynamicStatus']?.createGuard?.(guard) || guard;
    const { hostApi, list } = await messages();
    const target = clone(list.find(row => row.message_id === messageId));
    if (target?.role !== 'assistant') throw new Error(`[${KEY}] 只能编辑真实 assistant 楼层`);
    const worldRevision = !options.itemOnly && (!options.skipWorldSettlement && modules['cryptLord.nativeSettlement']?.prepare ||
      modules['cryptLord.abilityState']?.prepare || modules['cryptLord.dynamicStatus'] ||
      options.variablePrepared || options.rulePool || options.warfareRules || options.affairRules || options.forgeRules || options.industryRules || options.detectiveSource)
      ? clone(await hostApi.getChatMessages('0-{{lastMessageId}}', { include_swipes: true })) : null;
    const dependencies = Object.fromEntries([KEY, HOST_API_KEY, 'cryptLord.afterNativeHost',
      'cryptLord.itemDerivation', 'cryptLord.playerProgression', 'cryptLord.npcProgression',
      'cryptLord.abilityState', 'cryptLord.attributeRecalculation', 'cryptLord.nativeSettlement',
      'cryptLord.dynamicStatus', 'cryptLord.shamanTerritoryState', 'cryptLord.shamanTerritory',
      'cryptLord.mysteryAnalysisState', 'cryptLord.mysteryAnalysis', 'cryptLord.audienceImaginationState',
      'cryptLord.audienceImagination', 'cryptLord.characterPanelState', 'cryptLord.cashflow',
    ].map(key => [key, modules[key]]));
    const previous = options.preparedWrite && preparedWrites.get(options.preparedWrite);
    if (options.preparedWrite && (!previous || previous.messageId !== messageId ||
      JSON.stringify(previous.target) !== JSON.stringify(target) || previous.input !== JSON.stringify(data) ||
      Object.entries(previous.dependencies).some(([key, service]) => modules[key] !== service)))
      throw Error('原生派生保存凭据或来源已变化，请重新读取');
    const result = previous?.result || await settledData(options.itemOnly ? target.data : data, {
      settlementPrevious: target.data, skipWorldSettlement: options.skipWorldSettlement === true,
      worldPrepared: options.worldPrepared,
      warfareRules: options.warfareRules,
      industryRules: options.industryRules,
      dynamicPrepared: options.dynamicPrepared,
      progressionPrevious: target.data?.stat_data, npcPrevious: target.data?.npc_data,
      skipNpcProgression: options.skipNpcProgression === true, skipItemDerivation: options.skipItemDerivation === true,
      skipAbilityDerivation: options.skipAbilityDerivation === true, abilityMode: options.abilityMode,
      itemOnly: options.itemOnly === true, itemPrepared: options.itemPrepared, guard });
    const next = clone(result.data);
    await beforeWrite?.();
    if (result.progression) await modules['cryptLord.playerProgression'].assertPrepared(result.progression, guard);
    if (result.npcProgression) await modules['cryptLord.npcProgression'].assertPrepared(result.npcProgression, guard);
    if (result.itemDerivation) await modules['cryptLord.itemDerivation'].assertPrepared(result.itemDerivation, guard);
    await assertAbilities(result, options.abilityPrepared, guard);
    if (result.worldSettlement) {
      if (modules['cryptLord.nativeSettlement'] !== result.worldService) throw Error('世界结算服务已卸载，请重新准备');
      await result.worldService.assertPrepared(result.worldSettlement, guard);
    }
    await assertGenerationRules(result, options, guard);
    if (worldRevision && JSON.stringify(await hostApi.getChatMessages('0-{{lastMessageId}}', { include_swipes: true })) !== JSON.stringify(worldRevision))
      throw Error('世界结算来源正文、变量、消息页或末楼已变化，未写入');
    const current = (await hostApi.getChatMessages(String(messageId)))?.find(row => row.message_id === messageId);
    if (JSON.stringify(current) !== JSON.stringify(target)) throw Error('目标assistant楼层已变化，未覆盖外部修改');
    if (options.onWriteAttempt) {
      const receipt = options.preparedWrite || Object.freeze({});
      if (!previous) preparedWrites.set(receipt, { result, target: clone(target), messageId,
        input: JSON.stringify(data), dependencies });
      await options.onWriteAttempt(clone(next), receipt);
    }
    if (guard && !guard()) throw new DOMException('楼层保存已取消', 'AbortError');
    guardDynamicSource(result, guard);
    await hostApi.setChatMessages([{ message_id: messageId, data: next }], { refresh });
    notifyCollectionGrowth(messageId);
    return clone(next);
  }

  async function restoreVariableTag(messageId) {
    const target = await readMessage(messageId);
    if (target?.role !== 'assistant' || !target.data?.cryptLord?.lastUpdateVariable) return false;
    const patch = await contract.waitGlobalInitialized(PATCH_KEY, { timeoutMs: 10000 });
    if (/<UpdateVariable\b/i.test(String(target.message || '')) &&
      patch.updateTag(target.message) !== patch.updateTag(target.data.cryptLord.lastUpdateVariable)) return false;
    const message = patch.embedUpdate(target.message, target.data.cryptLord.lastUpdateVariable);
    if (message === target.message) return false;
    const { hostApi } = await messages();
    await hostApi.setChatMessages([{ message_id: messageId, message }], { refresh: 'affected' });
    return true;
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true, source: 'native-assistant-floor' }); },
    findLatestAssistant,
    ensureOpeningState,
    readAssistantData,
    readMessageData,
    readMessage,
    writeAssistantData,
    writeAssistantMessage,
    previewAssistantData,
    restoreVariableTag,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
