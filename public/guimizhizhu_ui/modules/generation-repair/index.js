(() => {
  'use strict';
  const KEY = 'cryptLord.generationRepairUi', root = window.cryptLord, modules = root?.__stage1Modules;
  const contract = root?.contract, host = modules?.['cryptLord.afterNativeHost'];
  if (!contract || !host) throw Error('生成检修宿主尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const doc = () => host.getHost()?.document || document;
  const view = () => doc().defaultView || window;
  let mask = null, panel = null, pending = null, disposed = false;
  const subscriptions = [];
  function node(tag, className, text) {
    const item = doc().createElement(tag);
    if (className) item.className = className;
    if (text !== undefined) item.textContent = text;
    return item;
  }
  function button(label, icon, handler, caption = '') {
    const item = node('button'); item.type = 'button'; item.title = label; item.setAttribute('aria-label', label);
    item.innerHTML = `<i class="fa-solid fa-${icon}" aria-hidden="true"></i>`;
    if (caption) item.append(node('span', '', caption));
    item.addEventListener('click', handler); return item;
  }
  const field = name => panel.querySelector(`[data-repair="${name}"]`);
  function active(ticket) {
    try {
      return pending === ticket && !disposed && !ticket.options.signal?.aborted &&
        (!ticket.options.guard || ticket.options.guard());
    } catch { return false; }
  }
  function close(result = null) {
    const old = pending; pending = null;
    if (mask) mask.hidden = true;
    old?.options.signal?.removeEventListener('abort', old.abort);
    old?.resolve(result); if (old?.focus?.isConnected) old.focus.focus();
    return true;
  }
  function confirm() {
    const ticket = pending;
    if (!ticket) return false;
    if (!active(ticket)) { close(); return false; }
    const text = field('draft').value;
    const visible = modules['cryptLord.responseNormalizer'].normalize(text).message;
    if (!visible.trim()) { field('status').textContent = '没有可显示的正文，未提交。'; field('draft').focus(); return false; }
    // Explicit manual takeover follows the original force-accept semantics.
    close({ text }); return true;
  }
  function mount() {
    if (disposed || mask) return Boolean(mask);
    mask = node('div', 'crypt-lord-generation-repair-mask'); mask.hidden = true;
    panel = node('section', 'crypt-lord-generation-repair'); panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', '生成检修站');
    const header = node('header'), badge = node('span', 'crypt-lord-generation-repair__badge');
    badge.dataset.repair = 'target';
    header.append(node('strong', '', '生成检修站'), badge, button('取消生成检修', 'xmark', () => close()));
    const main = node('main'), errors = node('ul', 'crypt-lord-generation-repair__errors');
    errors.dataset.repair = 'errors'; main.append(errors);
    const toolbar = node('div', 'crypt-lord-generation-repair__toolbar');
    toolbar.append(node('strong', '', '修复稿'),
      button('恢复修复底稿', 'rotate-left', () => {
        if (!pending) return;
        if (!active(pending)) { close(); return; }
        if (field('draft').value !== pending.options.draft && !view().confirm('放弃当前修改，恢复修复底稿？')) return;
        field('draft').value = pending.options.draft; field('status').textContent = '底稿已恢复。';
      }),
      button('重新诊断', 'stethoscope', () => {
        if (!pending) return;
        if (!active(pending)) { close(); return; }
        const result = modules['cryptLord.generationQuality'].diagnose(field('draft').value, pending.options);
        field('status').textContent = result.isValid ? '质量与标签检查通过。' : result.errorMessages.join(' ');
      }));
    const draft = node('textarea'); draft.dataset.repair = 'draft';
    draft.setAttribute('aria-label', '生成修复稿'); draft.spellcheck = false;
    const details = node('details'), original = node('pre');
    original.dataset.repair = 'original'; details.append(node('summary', '', '原始响应'), original);
    main.append(toolbar, draft, details);
    const footer = node('footer'), message = node('span'); message.dataset.repair = 'status'; message.setAttribute('role', 'status');
    const cancel = button('取消生成检修', 'ban', () => close(), '取消');
    const accept = button('采用修复稿', 'check', confirm, '采用修复稿'); accept.className = 'is-primary';
    footer.append(message, cancel, accept); panel.append(header, main, footer); mask.append(panel); doc().body.append(mask);
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const controls = [...panel.querySelectorAll('button,textarea,summary')].filter(item =>
        !item.matches(':disabled') && item.getClientRects().length &&
        view().getComputedStyle(item).visibility !== 'hidden');
      if (event.shiftKey && [controls[0], panel].includes(doc().activeElement)) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && [controls.at(-1), panel].includes(doc().activeElement)) { event.preventDefault(); controls[0]?.focus(); }
    });
    const events = host.tavernEvents?.();
    if (events?.CHAT_CHANGED) subscriptions.push(host.bindEvent(events.CHAT_CHANGED, () => close()));
    const onHide = () => close();
    view().addEventListener('pagehide', onHide); subscriptions.push({ stop: () => view().removeEventListener('pagehide', onHide) });
    return true;
  }
  function review(options) {
    try {
      if (disposed || options.signal?.aborted || options.guard && !options.guard()) return Promise.resolve(null);
    } catch { return Promise.resolve(null); }
    if (pending) return Promise.resolve(null);
    if (!mount()) return Promise.resolve(null);
    field('errors').replaceChildren(...options.errorMessages.map(text => node('li', '', text)));
    field('draft').value = options.draft; field('original').textContent = options.original;
    field('target').textContent = Number.isInteger(options.assistantMessageId) ? `原生楼层 #${options.assistantMessageId}` :
      `正文请求 · 重试 ${options.retryCount || 0}/${options.retryLimit || 0}`;
    field('status').textContent = '待确认'; panel.querySelector('details').open = false;
    mask.hidden = false;
    const promise = new Promise(resolve => {
      const ticket = { options, resolve, focus: doc().activeElement, abort: () => { if (pending === ticket) close(); } };
      pending = ticket; options.signal?.addEventListener('abort', ticket.abort, { once: true });
    });
    field('draft').focus(); return promise;
  }
  const api = Object.freeze({
    status: () => ({ key: KEY, ready: !disposed, open: Boolean(pending) }), mount, review, close,
    dispose() {
      close(); disposed = true; subscriptions.splice(0).forEach(item => item?.stop?.()); mask?.remove(); mask = panel = null;
      contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY]; return true;
    },
  });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
