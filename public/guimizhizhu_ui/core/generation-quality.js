(() => {
  'use strict';
  const KEY = 'cryptLord.generationQuality', SETTINGS = 'cryptLord.generationQuality';
  const root = (window.cryptLord = window.cryptLord || {}), contract = root.contract;
  if (!contract) throw Error('生成检修契约尚未加载');
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const DEFAULTS = Object.freeze({ retryLimit: 3, streamTimeoutSeconds: 300, noStreamTimeoutSeconds: 900 });
  let disposed = false, epoch = 0, reviewEpoch = 0, queue = Promise.resolve();
  const proofs = new WeakMap(), subscriptions = [];
  const clone = value => value === undefined ? undefined : structuredClone(value);
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const canonical = value => Object.prototype.toString.call(value) === '[object RegExp]' ? [value.source, value.flags] :
    Object.prototype.toString.call(value) === '[object Date]' ? value.toISOString() : Array.isArray(value) ? value.map(canonical) : record(value) ?
    Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
  function check(options = {}) {
    if (disposed || modules[KEY] !== api || options.signal?.aborted || options.guard && !options.guard())
      throw new DOMException('生成检修已取消', 'AbortError');
  }
  function normalizeSettings(value = {}) {
    if (!record(value)) throw Error('正文失败处理配置无效');
    const result = {};
    for (const key of Object.keys(DEFAULTS)) {
      const number = Number(value[key] ?? DEFAULTS[key]);
      if (!Number.isInteger(number) || number < 0 || number > (key === 'retryLimit' ? 999 : 86400))
        throw Error(`${key === 'retryLimit' ? '正文重试次数' : '正文超时秒数'}超出范围`);
      result[key] = number;
    }
    return Object.freeze(result);
  }
  const hostApi = () => contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
  function scriptOptions(host) {
    const options = host.scriptVariableOptions?.() || { type: 'script', script_id: host.getScriptId?.() };
    if (options.type !== 'script' || !options.script_id) throw Error('正文设置无法确定脚本身份');
    return options;
  }
  function sourceFor(host) {
    const after = modules['cryptLord.afterNativeHost'], surface = after?.getHost?.();
    return { host, after, document: surface?.document, window: surface?.window,
      chat: (surface?.window?.SillyTavern?.getCurrentChatId?.() ?? surface?.window?.SillyTavern?.getContext?.()?.getCurrentChatId?.()), options: clone(scriptOptions(host)), epoch };
  }
  function checkSource(source, guard) {
    check({ guard });
    const current = sourceFor(source.host);
    if (modules['cryptLord.hostApi'] !== source.host || current.after !== source.after ||
      current.document !== source.document || current.window !== source.window || current.chat !== source.chat ||
      current.epoch !== source.epoch || !same(current.options, source.options))
      throw Error('正文设置或检修来源已变化，请重新读取');
    return true;
  }
  async function snapshot(host, guard) {
    check({ guard });
    const source = sourceFor(host);
    const options = scriptOptions(host), variables = await host.getVariables(options);
    checkSource(source, guard);
    if (!record(variables) || !same(options, scriptOptions(host))) throw Error('正文设置读取失败或脚本身份已变化');
    const revision = {
      options: clone(options), exists: Object.hasOwn(variables, SETTINGS), raw: clone(variables[SETTINGS]),
    };
    const settings = normalizeSettings(variables[SETTINGS]);
    proofs.set(revision, { source, value: clone(revision) });
    return { settings, revision };
  }
  async function readSnapshot(guard) { await queue; return snapshot(await hostApi(), guard); }
  function saveSettings(value, revision, guard) {
    const next = normalizeSettings(value), baseline = clone(revision);
    if (!baseline) throw Error('请先读取正文设置');
    const proof = proofs.get(revision);
    const task = queue.then(async () => {
      check({ guard });
      if (!proof || proof.revoked || !same(proof.value, baseline)) throw Error('正文设置凭据无效或已变化，请重新读取');
      checkSource(proof.source, guard);
      const host = await hostApi(), current = await snapshot(host, guard);
      if (!same(current.revision, baseline)) throw Error('正文设置已变化，请重新读取');
      const stored = { ...(record(baseline.raw) ? clone(baseline.raw) : {}), ...next };
      checkSource(proof.source, guard);
      if (baseline.exists && same(stored, baseline.raw)) return { ...current, unchanged: true };
      let attempted = false, failure;
      try { await host.updateVariablesWith(variables => {
        checkSource(proof.source, guard);
        if (!same(scriptOptions(host), baseline.options) || !record(variables) ||
          Object.hasOwn(variables, SETTINGS) !== baseline.exists || !same(variables[SETTINGS], baseline.raw))
          throw Error('正文设置已变化，请重新读取');
        attempted = true;
        return { ...variables, [SETTINGS]: clone(stored) };
      }, baseline.options); } catch (error) { if (!attempted) throw error; failure = error; }
      try {
        checkSource(proof.source, guard);
        const result = await snapshot(host, guard);
        checkSource(proof.source, guard);
        if (failure && same(result.revision, baseline)) throw failure;
        if (!same(result.revision.raw, stored)) throw Error('实际保存的正文设置与提交内容不一致');
        proof.revoked = true;
        return { ...result, ...(failure ? { warning: '正文设置已确认保存，但宿主响应丢失；未重复提交' } : {}) };
      } catch (error) {
        if (failure && error === failure) throw error;
        proof.revoked = true;
        return { settings: null, revision: null, warning: `正文设置保存结果无法确认，请重新读取：${error.message || error}` };
      }
    });
    queue = task.catch(() => {});
    return task;
  }
  function validateFormat(text, criticalTags = ['thinking', 'gametxt', 'action'], requiredTags = ['gametxt']) {
    const errors = [];
    for (const tag of criticalTags) {
      const opens = (text.match(new RegExp(`<${tag}(?:\\s+[^>]*)?>`, 'gi')) || []).length;
      const closes = (text.match(new RegExp(`</${tag}\\s*>`, 'gi')) || []).length;
      if (opens !== closes) errors.push(`标签 [${tag}] 未正确闭合 (开始: ${opens}个, 结束: ${closes}个)。`);
    }
    for (const tag of requiredTags)
      if (!new RegExp(`<${tag}(?:\\s+[^>]*)?>[\\s\\S]*?</${tag}\\s*>`, 'i').test(text))
        errors.push(`回复中缺少必需的 [${tag}] 标签片段。`);
    return { isValid: !errors.length, errorMessages: errors };
  }
  // Keep the original deterministic repair algorithm; it is a draft, not approval.
  function autoFixTags(text, tags = ['thinking', 'gametxt', 'action']) {
    let fixed = String(text ?? '');
    for (const tag of tags) {
      const opens = [...fixed.matchAll(new RegExp(`<${tag}(?:\\s+[^>]*)?>`, 'gi'))];
      const closes = [...fixed.matchAll(new RegExp(`<\\/${tag}>`, 'gi'))];
      if (opens.length <= closes.length) continue;
      const last = opens.at(-1), start = last.index + last[0].length;
      const next = fixed.slice(start).match(new RegExp('<\\\\/?\\\\w+[^>]*>'));
      const position = next && next.index !== undefined ? start + next.index : fixed.length;
      fixed = fixed.slice(0, position).trim() + `\n</${tag}>\n` + fixed.slice(position);
    }
    return fixed;
  }
  function diagnose(text, options = {}) {
    const trimmed = String(text ?? '').trim();
    if (trimmed.length < 5) return { isValid: false, failureKind: 'content',
      errorMessages: [`AI 似乎睡着了，生成内容严重缺失 (仅 ${trimmed.length} 字符)`] };
    if (trimmed.length < 20) return { isValid: false, failureKind: 'content',
      errorMessages: [`生成内容过短，涉嫌敷衍空回 (仅 ${trimmed.length} 字符)`] };
    if (!options.isTrueNewGame && !/[=：:]/.test(trimmed)) return { isValid: false, failureKind: 'content',
      errorMessages: ['未检测到有效的标点或文本特征，可能生成了乱码'] };
    return { ...validateFormat(String(text)), failureKind: 'tag' };
  }
  async function inspect(text, options = {}) {
    check(options);
    const source = sourceFor(await hostApi()), token = reviewEpoch, normalizer = modules['cryptLord.responseNormalizer'];
    const guard = () => {
      check(options);
      try { checkSource(source, options.guard); }
      catch (error) { throw new DOMException(error.message, 'AbortError'); }
      if (reviewEpoch !== token) throw new DOMException('生成检修已取消', 'AbortError');
      if (modules['cryptLord.responseNormalizer'] !== normalizer) throw new DOMException('正文检修归一化来源已变化', 'AbortError');
      return true;
    };
    guard();
    const original = String(text ?? ''), fixed = autoFixTags(original, ['wlog']);
    const result = diagnose(fixed, options);
    if (result.isValid) return { passed: true, text: fixed };
    if (options.allowModal === false && result.failureKind === 'content')
      return { passed: false, autoRetryable: true, ...result };
    const ui = await contract.waitGlobalInitialized('cryptLord.generationRepairUi', { timeoutMs: 10000, signal: options.signal });
    guard();
    const accepted = await ui.review({ original, draft: autoFixTags(fixed),
      errorMessages: result.errorMessages, kind: 'narrative', ...options, guard });
    guard();
    if (modules['cryptLord.generationRepairUi'] !== ui) throw new DOMException('正文检修界面来源已变化，未采用旧结果', 'AbortError');
    return accepted ? { passed: true, text: accepted.text, isRepaired: true, manualTakeover: true } :
      { passed: false, manualTakeover: true };
  }
  const api = Object.freeze({
    status: () => ({ key: KEY, ready: !disposed }),
    defaults: () => ({ ...DEFAULTS }), normalizeSettings, readSnapshot, saveSettings,
    validateFormat, autoFixTags, diagnose, inspect,
    retryDelayMs: attempt => Math.min(Math.max(0, Number(attempt) || 0) * 1000, 10000),
    dispose() {
      disposed = true; epoch++; reviewEpoch++; modules['cryptLord.generationRepairUi']?.close();
      subscriptions.splice(0).forEach(item => item?.stop());
      contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY]; return true;
    },
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents?.() || {};
  for (const [name, handler] of [
    ['CHAT_CHANGED', () => { epoch++; reviewEpoch++; modules['cryptLord.generationRepairUi']?.close(); }],
    ['GENERATION_STOPPED', () => { reviewEpoch++; modules['cryptLord.generationRepairUi']?.close(); }],
  ]) if (events[name]) subscriptions.push(after.bindEvent(events[name], handler));
})();
