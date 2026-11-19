(() => {
  'use strict';
  // Shared save/inspect state machine: pending -> uncertain -> saved | pending | conflict.
  // A failed read-back only allows inspection; retry is allowed only after confirming nothing was written.
  const KEY = 'cryptLord.saveRecovery';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (!contract) throw Error('保存恢复契约尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  function create({
    enqueue, verify, write, inspect, pending, isConflict, text,
    onSaved = value => value, inspected = response => response, finish = () => {}, retry = () => {},
  }) {
    let phase = 'pending', running = false, submitted = false, result, failure;
    const waiting = warning => ({ ...pending(), pending: true, warning });
    async function inspectResult() {
      await verify();
      const actual = await inspect();
      await verify();
      if (actual.saved) {
        phase = 'saved'; finish();
        result = onSaved(actual.result, failure);
        return result;
      }
      if (actual.unchanged) {
        phase = 'pending'; retry();
        if (failure) { const error = failure; failure = null; throw error; }
        return waiting(text.unchanged);
      }
      phase = 'conflict'; finish();
      return waiting(text.conflict);
    }
    function run(action) {
      if (running) return Promise.reject(Error(text.busy));
      if (phase === 'saved') return Promise.resolve(result);
      if (phase === 'conflict') return Promise.reject(Error(text.invalid));
      running = true;
      return enqueue(async () => {
        try { return await action(); }
        catch (error) {
          if (isConflict(error)) { phase = 'conflict'; if (submitted) finish(); }
          throw error;
        } finally { running = false; }
      });
    }
    return Object.freeze({
      status: () => ({ phase, running }),
      save: () => run(async () => {
        if (phase === 'uncertain') throw Error(text.uncertain);
        await verify(); submitted = false; failure = null;
        try {
          const unchanged = await write(() => { submitted = true; phase = 'uncertain'; });
          if (unchanged) { phase = 'saved'; finish(); result = unchanged; return result; }
          if (!submitted) return waiting(text.notSubmitted);
        } catch (error) { if (!submitted) throw error; failure = error; }
        try { return await inspectResult(); }
        catch (error) {
          if (phase !== 'uncertain') throw error;
          return waiting(text.recheckFailed(error));
        }
      }),
      inspect: () => run(async () => {
        // A failed read is not evidence that the previous write failed.
        if (!submitted) { await verify(); return waiting('尚未提交，可重试原结果'); }
        return inspected(await inspectResult(), phase);
      }),
    });
  }

  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, ready: true }),
    create,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
