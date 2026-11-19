(() => {
  'use strict';
  const KEY = 'cryptLord.appearance';
  const root = (window.cryptLord = window.cryptLord || {}), contract = root.contract;
  if (!contract) throw Error('外观设置契约尚未加载');
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const DEFAULTS = Object.freeze({ theme: 'dark', font: 'font-noto-serif-sc', fontSize: 14,
    disableAnimations: false, fullWidth: false, width: 900, height: 600, mobileScale: 75 });
  const LEGACY_KEYS = Object.freeze(['background', 'customBackgrounds', 'opacity', 'blur', 'autoRandom', 'interval']);
  const FONTS = {
    'font-serif': { name: '系统衬线体', css: '"Noto Serif SC", "Source Han Serif SC", STSong, serif', isArt: false },
    'font-sans': { name: '系统无衬线', css: '"Noto Sans SC", "Source Han Sans SC", "Microsoft YaHei", sans-serif', isArt: false },
    'font-ma-shan-zheng': { name: '马善政毛笔体', css: '"Ma Shan Zheng", cursive, serif', isArt: true,
      url: 'https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap' },
    'font-zcool-kuaile': { name: '站酷快乐体', css: '"ZCOOL KuaiLe", cursive, sans-serif', isArt: true,
      url: 'https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&display=swap' },
  };
  let queue = Promise.resolve(), disposed = false, epoch = 0;
  const proofs = new WeakMap(), subscriptions = [];
  const clone = value => value === undefined ? undefined : structuredClone(value);
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const canonical = value => Object.prototype.toString.call(value) === '[object RegExp]' ? [value.source, value.flags] :
    Object.prototype.toString.call(value) === '[object Date]' ? value.toISOString() : Array.isArray(value) ? value.map(canonical) : record(value) ?
    Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
  function check(guard) {
    if (disposed || modules[KEY] !== api || guard && !guard()) throw new DOMException('外观操作已取消', 'AbortError');
  }
  function clampMainUiScale(raw) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return 75;
    return Math.max(60, Math.min(100, Math.round(n / 5) * 5));
  }
  // Only font stylesheet URLs remain; background images were removed with the native-floor design.
  function resourceUrl(raw) {
    const value = String(raw || '').trim();
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw Error('资源地址无效');
    return url.href;
  }
  function normalizeSettings(value = {}) {
    if (!record(value)) throw Error('外观配置格式损坏，请重新读取或显式恢复默认');
    const next = clone(DEFAULTS);
    for (const key of ['disableAnimations', 'fullWidth']) {
      if (value[key] !== undefined && typeof value[key] !== 'boolean') throw Error('外观开关格式无效');
      next[key] = value[key] ?? next[key];
    }
    if (value.theme !== undefined && !['dark', 'light'].includes(value.theme)) throw Error('主题无效');
    next.theme = value.theme || next.theme;
    for (const [key, min, max, integral] of [['fontSize', 12, 40, true],
      ['width', 800, 2500, true], ['height', 600, 1200, true]]) {
      const raw = value[key] ?? next[key], n = Number(raw);
      if (typeof raw === 'boolean' || raw === '' || !Number.isFinite(n) || n < min || n > max || integral && !Number.isInteger(n))
        throw Error(`${key} 超出范围（${min} - ${max}）`);
      next[key] = n;
    }
    next.mobileScale = clampMainUiScale(value.mobileScale ?? next.mobileScale);
    next.font = value.font ?? next.font;
    if (typeof next.font !== 'string' || !/^[\w-]+$/.test(next.font)) throw Error('字体标识无效');
    return next;
  }
  function options(host) {
    const value = host.scriptVariableOptions?.();
    if (value?.type !== 'script' || !value.script_id) throw Error('无法确定外观设置的脚本身份');
    return value;
  }
  const hostApi = () => contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
  function sourceFor(host) {
    const after = modules['cryptLord.afterNativeHost'], surface = after?.getHost?.();
    return { host, after, document: surface?.document, window: surface?.window,
      chat: (surface?.window?.SillyTavern?.getCurrentChatId?.() ?? surface?.window?.SillyTavern?.getContext?.()?.getCurrentChatId?.()), options: clone(options(host)), epoch };
  }
  function checkSource(source, guard) {
    check(guard);
    const current = sourceFor(source.host);
    if (modules['cryptLord.hostApi'] !== source.host || current.after !== source.after ||
      current.document !== source.document || current.window !== source.window || current.chat !== source.chat ||
      current.epoch !== source.epoch || !same(current.options, source.options))
      throw new DOMException('外观来源或脚本身份已变化，请重新读取', 'AbortError');
  }
  async function snapshot(host, guard, repair = false) {
    check(guard);
    const source = sourceFor(host);
    const scope = clone(options(host)), variables = await host.getVariables(scope);
    checkSource(source, guard);
    if (!record(variables) || !same(scope, options(host))) throw Error('读取失败或脚本身份已变化');
    let settings, warning = '';
    try { settings = normalizeSettings(variables[KEY]); }
    catch (error) { if (!repair) throw error; settings = clone(DEFAULTS); warning = error.message; }
    // The previous theme is a read-only compatibility fallback, never a global save target.
    if (!Object.hasOwn(variables, KEY)) {
      try { settings.theme = window.localStorage?.getItem('cryptLord.originalUi.theme') === 'light' ? 'light' : 'dark'; }
      catch { /* Storage may be unavailable. */ }
    }
    const revision = { scope, exists: Object.hasOwn(variables, KEY), raw: clone(variables[KEY]) };
    proofs.set(revision, { source, value: clone(revision) });
    return { settings, warning, revision };
  }
  async function readSnapshot(guard, repair = false) { await queue; return snapshot(await hostApi(), guard, repair); }
  function saveSettings(value, revision, guard) {
    const next = normalizeSettings(value), baseline = clone(revision);
    if (!baseline) throw Error('请先读取外观设置');
    const proof = proofs.get(revision);
    const task = queue.then(async () => {
      check(guard);
      if (!proof || proof.revoked || !same(proof.value, baseline)) throw Error('外观设置凭据无效或已修改，请重新读取');
      checkSource(proof.source, guard);
      const host = await hostApi(), current = await snapshot(host, guard, true);
      checkSource(proof.source, guard);
      if (!same(baseline, current.revision)) throw Error('外观设置已被外部修改，请重新读取');
      // Drop legacy background keys from old saves instead of carrying them forward.
      const stored = { ...(record(baseline.raw) ? clone(baseline.raw) : {}), ...next };
      for (const key of LEGACY_KEYS) delete stored[key];
      if (baseline.exists && same(stored, baseline.raw)) return { ...current, unchanged: true };
      let attempted = false, failure;
      try { await host.updateVariablesWith(variables => {
        checkSource(proof.source, guard);
        if (!same(options(host), baseline.scope) || !record(variables) ||
          Object.hasOwn(variables, KEY) !== baseline.exists || !same(variables[KEY], baseline.raw))
          throw Error('外观设置或脚本身份已变化，请重新读取');
        attempted = true;
        return { ...variables, [KEY]: clone(stored) };
      }, baseline.scope); } catch (error) { if (!attempted) throw error; failure = error; }
      try {
        checkSource(proof.source, guard);
        const result = await snapshot(host, guard);
        checkSource(proof.source, guard);
        if (failure && same(result.revision, baseline)) throw failure;
        if (!same(result.revision.raw, stored)) throw Error('实际外观配置与提交内容不一致');
        proof.revoked = true;
        return { ...result, ...(failure ? { warning: '外观设置已确认保存，但宿主响应丢失；未重复提交' } : {}) };
      } catch (error) {
        if (failure && error === failure) throw error;
        proof.revoked = true;
        return { settings: null, revision: null, warning: `外观设置保存结果无法确认，请重新读取：${error.message}` };
      }
    });
    queue = task.catch(() => {});
    return task;
  }
  async function loadCatalog(guard) {
    check(guard);
    const host = await hostApi(), source = sourceFor(host), bound = clone(await host.getCharWorldbookNames('current'));
    checkSource(source, guard);
    const primary = bound?.primary || '1源堡';
    const books = [...new Set(['2历史孔隙', ...(bound?.additional || [])].filter(book => book !== primary)), primary];
    const fonts = clone(FONTS), warnings = [];
    const parser = modules['cryptLord.abilityState']?.parseWorldbookJson;
    if (!parser) throw Error('世界书配置解析器尚未加载');
    const entriesByName = new Map(), versions = new Map();
    const select = entries => entries.filter(entry => {
      const name = String(entry.name || entry.comment || '');
      return name.includes('【配置') && name.includes('字体配置');
    });
    for (const book of books) {
      try {
        const entries = clone(await host.getWorldbook(book)); checkSource(source, guard);
        if (!Array.isArray(entries)) throw Error('未返回条目列表');
        const selected = select(entries);
        versions.set(book, selected);
        const names = new Set();
        for (const entry of selected) {
          const name = String(entry.name || entry.comment || '');
          if (names.has(name)) throw Error(`${name} 重名`);
          names.add(name); entriesByName.set(name, { entry, book });
        }
      } catch (error) {
        checkSource(source, guard);
        if (versions.has(book)) throw error;
        versions.set(book, null);
        if (!/不存在|未能找到|not found|does not exist/i.test(error.message || '')) warnings.push(`${book}：${error.message}`);
      }
    }
    for (const { entry, book } of entriesByName.values()) {
      const name = String(entry.name || entry.comment);
      try {
        const parsed = parser(entry.content);
        if (!record(parsed)) throw Error('字体配置不是字典');
        for (const [id, font] of Object.entries(parsed)) {
          if (!/^[\w-]+$/.test(id) || ['__proto__', 'constructor', 'prototype'].includes(id) ||
            !record(font) || typeof font.css !== 'string' || /[{};<>\\]|url\s*\(/i.test(font.css)) {
            warnings.push(`${name}：跳过无效字体 ${id}`); continue;
          }
          fonts[id] = { name: String(font.name || id), css: font.css, isArt: font.isArt === true,
            url: font.url ? resourceUrl(font.url) : '', customCSS: String(font.customCSS || '') };
        }
      } catch (error) { warnings.push(`${name}：${error.message}`); }
    }
    for (const [book, expected] of versions) {
      let entries = null;
      try {
        const rows = await host.getWorldbook(book);
        if (!Array.isArray(rows)) throw Error('未返回条目列表');
        entries = select(rows);
      } catch (error) { if (expected !== null) throw error; }
      checkSource(source, guard);
      if (!same(entries, expected)) throw Error('外观字体配置已变化，请重新读取');
    }
    if (parser !== modules['cryptLord.abilityState']?.parseWorldbookJson ||
      !same(bound, await host.getCharWorldbookNames('current'))) throw Error('外观世界书绑定或解析器已变化，请重新读取');
    checkSource(source, guard); return { fonts, warnings };
  }
  async function readFloors(guard) {
    check(guard);
    const source = modules['cryptLord.nativeFloorSource'];
    if (!source) throw Error('原生楼层来源尚未加载');
    const context = await source.read(guard);
    await source.assert(context, guard);
    check(guard);
    if (modules['cryptLord.nativeFloorSource'] !== source) throw Error('原生楼层来源已变化');
    return context.rows.filter(row => row.role === 'assistant' && !row.is_hidden);
  }
  const api = Object.freeze({
    defaults: () => clone(DEFAULTS), fallbackFonts: () => clone(FONTS), status: () => ({ key: KEY, ready: !disposed }),
    normalizeSettings, clampMainUiScale, readSnapshot, saveSettings, loadCatalog, readFloors,
    dispose() {
      disposed = true; epoch++; subscriptions.splice(0).forEach(item => item?.stop());
      contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY]; return true;
    },
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents?.();
  if (events?.CHAT_CHANGED) subscriptions.push(after.bindEvent(events.CHAT_CHANGED, () => { epoch++; }));
})();
