(() => {
  'use strict';

  const KEY = 'cryptLord.nativeSettlement';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  function equal(left, right) {
    if (Object.is(left, right)) return true;
    if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
    if (Array.isArray(left) !== Array.isArray(right)) return false;
    const leftKeys = Object.keys(left).filter(key => key !== 'cryptLord').sort();
    const rightKeys = Object.keys(right).filter(key => key !== 'cryptLord').sort();
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every((key, index) => key === rightKeys[index] && equal(left[key], right[key]));
  }

  function clone(value) {
    if (typeof window.structuredClone === 'function') return window.structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function syncProjection(data, isLocked) {
    if (typeof window.PlayerProjectionSync?.syncAll === 'function') {
      window.PlayerProjectionSync.syncAll(data, isLocked);
      return true;
    }
    if (typeof window.AudienceImaginationCore?.syncPlayerProjections === 'function') {
      window.AudienceImaginationCore.syncPlayerProjections(data, isLocked);
      return true;
    }
    return false;
  }

  function syncSequenceAbilities(data) {
    const statData = data?.stat_data;
    if (!statData || typeof statData !== 'object' || Array.isArray(statData)) return false;
    const isLocked = window.localStorage?.getItem('ST_LoM_AbilityLock') === 'true';
    const sequence = String(statData['当前序列'] || '').trim();
    if (!sequence || sequence.includes('普通人')) return syncProjection(data, isLocked);
    if (typeof window.fetchAvailableAbilities !== 'function') return syncProjection(data, isLocked);

    let required;
    try { required = window.fetchAvailableAbilities(sequence, isLocked); } catch (error) {
      console.warn(`[${KEY}] 查询序列能力失败，已跳过能力同步`, error);
      return syncProjection(data, isLocked);
    }
    if (!required || typeof required !== 'object' || Array.isArray(required)) return syncProjection(data, isLocked);

    const record = statData['序列能力列表'];
    const abilities = record && typeof record === 'object' && !Array.isArray(record) ? record : {};
    let changed = false;
    Object.entries(required).forEach(([sequenceName, entries]) => {
      if (!Array.isArray(entries)) return;
      const existing = Array.isArray(abilities[sequenceName]) ? abilities[sequenceName] : [];
      const existingNames = new Set(existing.map(item => String(item?.名称 || '').trim()).filter(Boolean));
      entries.forEach(entry => {
        const name = String(entry?.名称 || '').trim();
        if (!name || existingNames.has(name)) return;
        existing.push(clone(entry));
        existingNames.add(name);
        changed = true;
      });
      abilities[sequenceName] = existing;
    });
    if (changed) statData['序列能力列表'] = abilities;
    return syncProjection(data, isLocked) || changed;
  }

  function apply(data, previousData) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return Object.freeze({ data, changed: false, applied: Object.freeze([]) });
    }
    if (equal(previousData || {}, data)) {
      return Object.freeze({ data, changed: false, applied: Object.freeze([]) });
    }

    const applied = [];
    try {
      if (typeof window.TimePassageEngine?.applyTimePassage === 'function') {
        window.TimePassageEngine.applyTimePassage(data);
        applied.push('time-passage');
      }
    } catch (error) {
      console.warn(`[${KEY}] 时间流逝结算失败，已保留本回合状态`, error);
    }
    try {
      if (typeof window.checkCollectionGrowth === 'function') {
        window.checkCollectionGrowth(data);
        applied.push('collection-growth');
      }
    } catch (error) {
      console.warn(`[${KEY}] 变量增殖提醒失败，已保留本回合状态`, error);
    }
    try {
      if (syncSequenceAbilities(data)) applied.push('sequence-abilities');
    } catch (error) {
      console.warn(`[${KEY}] 序列能力同步失败，已保留本回合状态`, error);
    }
    return Object.freeze({ data, changed: true, applied: Object.freeze(applied) });
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true, handlers: Object.freeze(['time-passage', 'collection-growth', 'sequence-abilities']) }); },
    apply,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
