(() => {
  'use strict';
  const KEY = 'cryptLord.battleSession';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = root.__stage1Modules, contract = root.contract;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  let disposed = false;

  async function request(prompts, guard = () => true, assertCurrent = async () => {}) {
    const host = modules['cryptLord.hostApi'], settingsService = modules['cryptLord.variableSettlementApi'];
    const check = () => {
      if (disposed || modules[KEY] !== api || !guard() || modules['cryptLord.hostApi'] !== host ||
        modules['cryptLord.variableSettlementApi'] !== settingsService)
        throw new DOMException('战斗请求来源已变化，请重新读取。', 'AbortError');
    };
    check();
    await assertCurrent();
    const settings = await settingsService.readSettings();
    check();
    const revision = JSON.stringify(settings);
    const config = {
      should_silence: true, should_stream: false, max_chat_history: 0,
      use_mes_examples: false, use_story_string: false, use_authors_note: false,
      use_persona: false, ordered_prompts: prompts,
    };
    if (settings.useCustomApi) {
      if (!settings.apiUrl || !settings.model) throw Error('系统副 API 未配置完整。');
      config.custom_api = { apiurl: settings.apiUrl, key: settings.apiKey,
        model: settings.model, source: 'openai' };
    }
    await assertCurrent();
    check();
    if (JSON.stringify(await settingsService.readSettings()) !== revision)
      throw new DOMException('战斗 API 设置已变化，请重新读取。', 'AbortError');
    check();
    const response = await host.generateRaw(config);
    check();
    await assertCurrent();
    if (JSON.stringify(await settingsService.readSettings()) !== revision)
      throw new DOMException('战斗 API 设置已变化，请重新读取。', 'AbortError');
    check();
    return modules['cryptLord.responseNormalizer']?.normalize(response).message ?? response;
  }

  async function transaction(expected, guard = () => true) {
    const sourceService = modules['cryptLord.nativeFloorSource'], store = modules['cryptLord.stateStore'];
    if (!sourceService || !store) throw Error('战斗原生保存服务尚未加载。');
    const scope = Object.fromEntries([...new Set([
      ...Object.keys(modules).filter(key => /^cryptLord\.(battle|teamBattle|personalBattle)/.test(key)),
        'cryptLord.stateStore', 'cryptLord.hostApi', 'cryptLord.afterNativeHost', 'cryptLord.nativeFloorSource',
        'cryptLord.abilityState', 'cryptLord.variableSettlementApi', 'cryptLord.nativeSettlement',
        'cryptLord.playerProgression', 'cryptLord.npcProgression', 'cryptLord.itemDerivation',
        'cryptLord.dynamicStatus', 'cryptLord.audienceImagination', 'cryptLord.grazingState',
        'cryptLord.responseNormalizer', 'cryptLord.gameShell',
    ])].map(key => [key, modules[key]]));
    let phase = 'ready', pending = null;
    const check = () => {
      if (disposed || modules[KEY] !== api || !guard() ||
        Object.entries(scope).some(([key, value]) => modules[key] !== value))
        throw new DOMException('战斗来源或服务已变化，请重新读取。', 'AbortError');
    };
    check();
    const source = await sourceService.read(() => { check(); return true; });
    check();
    const floor = source.rows.at(-1);
    if (floor?.role !== 'assistant' || floor.is_hidden || !floor.data?.stat_data ||
      floor.message_id !== expected?.message_id || floor.message !== expected.message ||
      sourceService.signature(floor.data) !== sourceService.signature(expected.data))
      throw Error('战斗末楼、正文或变量已变化，请重新读取。');
    const locked = scope['cryptLord.abilityState']?.locked?.(floor.data);
    const valid = () => {
      check();
      sourceService.assertIdentity(source, guard);
      if (scope['cryptLord.abilityState']?.locked?.(floor.data) !== locked)
        throw Error('能力锁定已变化，请重新读取。');
      return true;
    };
    const verify = async () => {
      try {
        valid();
        await sourceService.assert(source, valid);
        valid();
      } catch (error) { phase = 'invalid'; throw error; }
    };
    const inspect = async writeError => {
      let fresh;
      try { valid(); }
      catch (error) { phase = 'invalid'; throw error; }
      try { fresh = await sourceService.read(valid); }
      catch (error) {
        phase = 'uncertain';
        throw Error(`保存状态待核对，未重复执行战斗操作：${error.message}`);
      }
      try { valid(); }
      catch (error) { phase = 'invalid'; throw error; }
      const saved = structuredClone(source);
      saved.rows.find(row => row.message_id === floor.message_id).data = structuredClone(pending.expected);
      const page = saved.swipes.find(row => row.message_id === floor.message_id);
      page.swipes_data[page.swipe_id] = structuredClone(pending.expected);
      if (sourceService.signature(saved) === sourceService.signature(fresh)) {
        phase = 'saved';
        return { ...pending.result, data: structuredClone(pending.expected),
          warning: writeError ? '保存回执异常，已核对原生楼层并确认保存。' : '' };
      }
      if (sourceService.signature(source) === sourceService.signature(fresh)) {
        phase = 'pending';
        throw Error(`${writeError?.message || '原生楼层尚未保存'}；本次战斗结果已保留，可重试保存。`);
      }
      phase = 'invalid';
      throw Error('保存后楼层、变量或消息页已变化，未覆盖；请重新读取核对。');
    };
    const save = async () => {
      if (phase !== 'pending') throw Error('当前战斗结果不能重新提交，请核对保存或重新读取。');
      phase = 'saving';
      await verify();
      let writeError, attempted = false;
      try {
        await store.writeAssistantData(floor.message_id, pending.result.data, 'affected', verify, valid, {
          abilityPrepared: pending.result.abilityPrepared, rulePool: pending.result.rulePool,
          onWriteAttempt(next) { pending.expected = structuredClone(next); attempted = true; },
        });
      } catch (error) { writeError = error; }
      if (!attempted) {
        if (phase !== 'invalid') phase = 'pending';
        throw writeError || Error('未收到原生写入凭据，本次结果已保留。');
      }
      return inspect(writeError);
    };
    return Object.freeze({
      status: () => phase,
      verify,
      async run(operation) {
        if (phase !== 'ready') throw Error('本次战斗操作已经执行，不能重复计算。');
        phase = 'running';
        await verify();
        let result;
        try {
          result = await operation(structuredClone(floor.data), floor.message,
            () => { valid(); return true; }, verify);
        } catch (error) {
          if (error.name === 'AbortError') phase = 'invalid';
          throw error;
        }
        await verify();
        if (!result?.ok) { phase = 'ready'; throw Error(result?.error || '战斗操作失败。'); }
        if (result.changed === false) { phase = 'saved'; return result; }
        pending = { result, expected: null };
        phase = 'pending';
        return save();
      },
      save,
      inspect() {
        if (phase !== 'uncertain') throw Error('当前无需核对保存。');
        phase = 'checking';
        return inspect();
      },
    });
  }

  async function prepare(data, launch, { evidence = '', guard = () => true, notify = () => {},
    assertCurrent = async () => {} } = {}) {
    const engine = modules['cryptLord.teamBattleState'];
    const check = () => {
      if (disposed || modules[KEY] !== api || modules['cryptLord.teamBattleState'] !== engine || !guard())
        throw new DOMException('战斗准备已取消。', 'AbortError');
    };
    check();
    if (!engine) throw Error('原版战斗引擎未加载。');
    let draft = structuredClone(data);
    const options = structuredClone(launch || {});
    options.seed ??= Math.floor(Math.random() * 4294967296);
    const start = value => options.personal ? engine.startDuel(draft, value) : engine.start(draft, value);
    const initial = start(options);
    if (!initial.ok) return initial;
    const abilities = modules['cryptLord.abilityState'];
    const valid = () => { check(); return true; };
    const abilityPrepared = abilities.prepare ? await abilities.prepare(draft, { mode: 'battle', guard: valid }) : null;
    if (abilityPrepared) draft = structuredClone(abilityPrepared.data);
    const pool = abilityPrepared?.pool || await abilities.loadPool(valid);
    check();
    options.summonPool = pool;
    options.pathways = pool.pathways || {};
    options.averages = pool.pictureConfig?.consumableConfig?.avgAttrByRank;
    for (const [key, field, label] of [
      ['battleLifeSave', 'lifeSaveTable', '保命'], ['battleTags', 'tagRules', '标签'],
    ]) {
      try { options[field] = await modules[`cryptLord.${key}`]?.load(); }
      catch (error) {
        check();
        notify(`${label}配置不可用，本场使用内置规则：${error?.message || error}`, 'warning');
      }
      check();
    }
    const preflight = start(options);
    if (!preflight.ok) return preflight;
    options.imaginationCache = preflight.battle.imaginationMeta?.npcCache;
    try {
      const painter = modules['cryptLord.battlefieldPainter'];
      if (!painter) throw Error('战场绘制模块不可用。');
      const actors = preflight.battle.units.map(unit => ({
        编号: unit.id, 名称: unit.name, 阵营: unit.side === 'ally' ? '我方' : '敌方',
      }));
      const prompt = painter.prompt(preflight.battle.board.cols, preflight.battle.board.rows,
        evidence, actors, modules['cryptLord.weaponClassifier']?.collect(draft) || [],
        modules['cryptLord.npcWeaponAssigner']?.collectTeam(preflight.data) || [],
        (modules['cryptLord.shamanTerritoryBattle']?.section(draft, preflight.battle, pool) || '') +
        (modules['cryptLord.arbiterJurisdictionBattle']?.section(draft, preflight.battle, pool) || ''));
      const response = await request([
        { role: 'system', content: prompt.system }, { role: 'user', content: prompt.user },
      ], valid, assertCurrent);
      check();
      options.opening = painter.parse(response);
      if (!options.opening) throw Error('模型未返回有效战场 JSON。');
    } catch (error) {
      check();
      if (error?.name === 'AbortError') throw error;
      await assertCurrent();
      notify(`战场生成不可用，本场以普通棋盘开战：${error?.message || error}`, 'warning');
    }
    check();
    if (abilityPrepared) await abilities.assertPrepared(abilityPrepared, valid);
    if (abilities.assertPool) await abilities.assertPool(pool, valid);
    check();
    const result = start(options);
    return result.ok ? { ...result, pathwayPool: pool, abilityPrepared,
      rulePool: abilities.assertPool ? pool : undefined } : result;
  }
  const api = Object.freeze({
    prepare, transaction, request, status: () => ({ ready: !disposed }),
    dispose() {
      disposed = true;
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
