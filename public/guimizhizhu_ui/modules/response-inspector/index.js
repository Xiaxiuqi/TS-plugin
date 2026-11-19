(() => {
  'use strict';
  const KEY = 'cryptLord.responseInspectorUi', root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract, modules = root.__stage1Modules;
  const host = modules?.['cryptLord.afterNativeHost'], service = modules?.['cryptLord.responseInspector'];
  if (!host || !service) throw Error('提取内容宿主尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const CATEGORIES = [['thinking', '模型思维链', 'brain'], ['variables', '变量变化', 'code'],
    ['journey', '本周目经历', 'book-open'], ['novelText', '正文', 'align-left'],
    ['characterCard', '提取角色', 'user'], ['itemCard', '提取物品', 'box'],
    ['clues', '当前线索', 'magnifying-glass'], ['worldLog', '世界日志', 'globe'],
    ['actions', '行动选项', 'list-check'], ['danmaku', '弹幕', 'comments'], ['raw', '完整原文', 'file-lines']];
  const state = { disposed: false, panel: null, token: 0, epoch: 0, busy: false, loaded: null, selected: null,
    category: 'thinking', model: 'narrative', focus: null, tools: new Map(), timer: null, scanToken: 0,
    cleanups: [], scanning: false, rescan: false, generating: false, observer: null,
    cardConfig: null, cardTicket: null, cardBusy: false, cardToken: 0, cardPending: null,
    archiveConfig: null, archiveTicket: null, archiveBusy: false, archiveToken: 0, archivePending: null };
  const doc = () => state.surface?.document || host.getHost()?.document || document, win = () => doc().defaultView || window;
  const openNow = () => Boolean(state.panel && !state.panel.hidden && !state.disposed);
  function surfaceValid() {
    const surface = host.getHost();
    return surface?.document === state.surface?.document && surface?.window === state.surface?.window &&
      modules['cryptLord.afterNativeHost'] === host && modules['cryptLord.responseInspector'] === service &&
      modules['cryptLord.hostApi'] === state.hostApi && (!state.cardService ||
        modules['cryptLord.characterExtraction'] === state.cardService) &&
      (!state.archiveService || modules['cryptLord.storyArchive'] === state.archiveService);
  }
  const active = token => {
    if (!openNow() || token !== state.token) return false;
    if (!surfaceValid()) { close(true); return false; }
    return true;
  };
  function discardCard() {
    if (state.cardPending && !win().confirm('放弃本次角色保存恢复？已提交的配置或角色不会撤销。')) return false;
    return !state.archivePending || win().confirm('放弃本次剧情归档恢复？已提交的设置或剧情不会撤销。');
  }
  const field = name => state.panel.querySelector(`[data-inspect-${name}]`);
  const clone = value => structuredClone(value);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function node(tag, className, text) {
    const item = doc().createElement(tag); if (className) item.className = className;
    if (text !== undefined) item.textContent = text; return item;
  }
  function tool(label, icon, callback, caption) {
    const item = node('button'); item.type = 'button'; item.title = label; item.setAttribute('aria-label', label);
    item.innerHTML = `<i class="fa-solid fa-${icon}" aria-hidden="true"></i>`;
    if (caption) item.append(node('span', '', caption));
    item.addEventListener('click', callback); return item;
  }
  function message(text) { if (state.panel) field('status').textContent = text; }
  function currentText() {
    if (!state.loaded) return '';
    const data = state.loaded.extracted;
    if (state.category === 'thinking') return data.thinking[state.model] || '';
    if (state.category === 'raw') return state.loaded.floor.message || '';
    if (state.category === 'danmaku') return data.danmaku.join('\n\n');
    return data[state.category] || '';
  }
  function controls() {
    if (!state.panel) return;
    const busy = state.busy || state.cardBusy || state.archiveBusy, pending = Boolean(state.cardPending || state.archivePending);
    state.panel.setAttribute('aria-busy', String(busy));
    field('reload').disabled = busy || state.generating;
    field('floor').disabled = busy || state.generating || pending;
    field('copy').disabled = busy || !currentText();
    field('edit').disabled = busy || !state.loaded || state.generating || pending;
    field('sync').disabled = busy || !state.loaded?.extracted.journey || state.generating;
    field('index').disabled = busy || !state.loaded;
    field('sync-row').hidden = state.category !== 'journey';
    const archive = modules['cryptLord.storyArchive'];
    field('index').closest('label').hidden = Boolean(archive);
    field('archive-row').hidden = !archive || !['journey', 'novelText'].includes(state.category);
    field('archive-index').disabled = busy || pending || state.generating || !state.archiveConfig?.revision;
    field('archive-settings').disabled = busy || pending || state.generating || !state.archiveConfig?.revision;
    for (const [name, key] of [['journey-auto', 'journeyAutomatic'], ['novel-auto', 'novelAutomatic']]) {
      field(name).disabled = busy || pending || state.generating || !state.archiveConfig?.revision;
      if (!state.archiveBusy) field(name).checked =
        (state.archivePending?.config || state.archiveConfig?.config)?.[key] === true;
    }
    field('novel-save').hidden = state.category !== 'novelText';
    field('novel-save').disabled = busy || pending || state.generating || !state.archiveTicket;
    if (archive) field('sync').disabled = busy || pending || state.generating || !state.archiveTicket;
    const archivePhase = state.archivePending?.transaction.status().phase;
    field('archive-recover').hidden = !state.archivePending;
    field('archive-recover').disabled = busy || state.generating || archivePhase === 'conflict';
    const archiveLabel = archivePhase === 'uncertain' ? '核对剧情归档' : '重试剧情归档';
    field('archive-recover').setAttribute('aria-label', archiveLabel); field('archive-recover').title = archiveLabel;
    field('archive-recover').querySelector('span').textContent = archivePhase === 'uncertain' ? '核对保存' : '重试保存';
    field('archive-target').textContent = state.archiveTicket ? `「${state.archiveTicket.book}」·「${state.archiveTicket.rows[0].name}」` : '';
    field('archive-target').title = field('archive-target').textContent;
    field('card-row').hidden = state.category !== 'characterCard';
    if (!state.cardBusy) field('card-auto').checked = state.cardPending?.kind === 'config' ?
      state.cardPending.automatic : state.cardConfig?.config.automatic === true;
    field('card-auto').disabled = busy || state.generating || !state.cardConfig?.revision || pending;
    field('card-save').disabled = busy || state.generating || !state.cardTicket || state.cardTicket.action === 'existing' || pending;
    const phase = state.cardPending?.transaction.status().phase;
    field('card-recover').hidden = !pending;
    field('card-recover').disabled = busy || state.generating || phase === 'conflict';
    field('card-recover').querySelector('span').textContent = phase === 'uncertain' ? '核对保存' : '重试保存';
    field('card-recover').setAttribute('aria-label', phase === 'uncertain' ? '核对角色保存' : '重试角色保存');
    field('card-recover').title = phase === 'uncertain' ? '核对角色保存' : '重试角色保存';
    field('card-target').textContent = state.cardTicket ? `「${state.cardTicket.name}」${
      state.cardTicket.action === 'existing' ? '已存在，保留原设定' : state.cardTicket.action === 'fill' ? '待填充' : '待新建'}` : '';
    field('card-target').title = field('card-target').textContent;
    field('models').hidden = state.category !== 'thinking';
    field('user').textContent = state.loaded?.userText || '无对应玩家行动';
    field('user-row').hidden = !state.loaded;
    for (const button of [...field('models').querySelectorAll('button'), ...field('tabs').querySelectorAll('button')]) {
      const selected = button.dataset.inspectModel ? button.dataset.inspectModel === state.model : button.dataset.inspectCategory === state.category;
      button.disabled = busy;
      button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
    }
    field('scroll').setAttribute('aria-labelledby', `crypt-lord-inspect-tab-${state.category}${
      state.category === 'thinking' ? ` crypt-lord-inspect-model-${state.model}` : ''}`);
  }
  function render() {
    if (!state.panel) return;
    field('text').textContent = currentText();
    field('empty').hidden = Boolean(currentText());
    if (state.category === 'thinking') field('empty').textContent =
      state.model === 'narrative' ? '本楼层正文模型未输出思维链' : '本楼层没有可确认的变量模型思维链';
    else field('empty').textContent = '本楼层未提取到内容';
    field('source').textContent = state.loaded ? `#${state.loaded.messageId} · assistant` : '';
    controls();
  }
  function setCategory(category, readCharacter = true) {
    if (!CATEGORIES.some(item => item[0] === category)) return;
    if (state.category === category && readCharacter) return;
    if (state.cardBusy || state.archiveBusy || !discardCard()) return;
    clearCharacter();
    clearArchive();
    state.category = category; render(); field('scroll').scrollTop = 0;
    if (readCharacter && category === 'characterCard' && state.loaded && !state.busy) void loadCharacter();
    if (readCharacter && ['journey', 'novelText'].includes(category) && state.loaded && !state.busy) void loadArchive();
  }
  function clearCharacter() {
    state.cardToken++; state.cardBusy = false; state.cardConfig = null; state.cardTicket = null; state.cardPending = null;
  }
  function clearArchive() {
    state.archiveToken++; state.archiveBusy = false; state.archiveConfig = null; state.archiveTicket = null; state.archivePending = null;
  }
  function invalidate(text) {
    if (state.cardPending || state.archivePending) { message(`${text}；保存结果仍待处理，可核对或重新读取。`); return; }
    state.token++; state.busy = false; state.loaded = null; clearCharacter(); clearArchive(); render(); message(text);
  }
  async function reload() {
    if (!openNow() || state.busy || state.cardBusy || state.archiveBusy || state.generating) return false;
    if (!discardCard()) return false;
    clearCharacter(); clearArchive();
    const token = ++state.token; state.busy = true; controls(); message('正在读取原生楼层...');
    try {
      const loaded = await service.load(state.selected, () => active(token));
      if (!active(token)) return false;
      state.loaded = loaded; state.selected = loaded.messageId;
      state.model = service.chooseTab(loaded.extracted.thinking, state.model);
      field('floor').replaceChildren(...loaded.floors.slice().reverse().map(row => {
        const option = node('option', '', `#${row.messageId}${row.name ? ` · ${row.name}` : ''}`);
        option.value = row.messageId; option.selected = row.messageId === state.selected; return option;
      }));
      render(); message(loaded.extracted.warning.join('；') || '原生楼层已读取。'); return true;
    } catch (error) {
      if (active(token)) { state.loaded = null; render(); message(`读取失败：${error.message}`); } return false;
    } finally {
      if (active(token)) {
        state.busy = false; controls();
        if (state.loaded && state.category === 'characterCard') void loadCharacter();
        if (state.loaded && ['journey', 'novelText'].includes(state.category)) void loadArchive();
      }
    }
  }
  async function loadCharacter() {
    const archive = modules['cryptLord.characterExtraction'];
    if (!archive || !state.loaded || state.busy || state.cardBusy || state.generating) return false;
    const token = state.token, op = ++state.cardToken, floor = clone(state.loaded.floor);
    const guard = () => active(token) && op === state.cardToken && state.category === 'characterCard';
    state.cardService = archive;
    state.cardBusy = true; controls(); message('正在核对角色入库来源...');
    try {
      const config = await archive.readConfig(guard);
      if (!guard()) return false;
      state.cardConfig = config;
      if (!state.loaded.extracted.characterCard) { message('本楼层未提取到角色内容。'); return true; }
      const ticket = await archive.prepare(floor, guard);
      if (!guard()) return false;
      state.cardTicket = ticket;
      message(ticket.action === 'existing' ? `角色「${ticket.name}」已有真实设定，不会覆盖。` : '角色来源已核对。');
      return true;
    } catch (error) {
      if (guard()) { state.cardTicket = null; message(`角色入库不可用：${error.message}`); } return false;
    } finally { if (active(token) && op === state.cardToken) { state.cardBusy = false; controls(); } }
  }
  async function saveCharacter() {
    if (!state.cardTicket || state.cardTicket.action === 'existing' || state.busy || state.cardBusy || state.generating || state.cardPending) return false;
    const ticket = state.cardTicket, token = state.token, op = state.cardToken;
    const guard = () => active(token) && op === state.cardToken && state.category === 'characterCard';
    if (!win().confirm(`将楼层 #${ticket.floor.message_id} 提取的角色「${ticket.name}」${
      ticket.action === 'fill' ? '填充' : '新建'}至「1源堡」？`)) { message('已取消角色入库。'); return false; }
    state.cardBusy = true; controls(); message('正在写入角色...');
    try {
      state.cardPending = { transaction: state.cardService.begin(ticket, guard), kind: 'card' };
      return await finishCharacter(guard);
    } catch (error) {
      if (guard()) message(`角色入库失败：${error.message}`); return false;
    } finally { if (active(token) && op === state.cardToken) { state.cardBusy = false; controls(); } }
  }
  async function setCharacterAuto() {
    if (!state.cardConfig?.revision || state.busy || state.cardBusy || state.generating || state.cardPending) return false;
    const automatic = field('card-auto').checked, before = state.cardConfig, token = state.token, op = state.cardToken;
    const guard = () => active(token) && op === state.cardToken && state.category === 'characterCard';
    state.cardBusy = true; controls();
    try {
      state.cardPending = { transaction: state.cardService.beginConfig({ ...before.config, automatic }, before.revision, guard),
        kind: 'config', automatic };
      return await finishCharacter(guard);
    } catch (error) { if (guard()) message(`设置失败：${error.message}`); return false; }
    finally { if (active(token) && op === state.cardToken) { state.cardBusy = false; controls(); } }
  }
  async function finishCharacter(guard, inspect = false) {
    const pending = state.cardPending, transaction = pending.transaction;
    const result = await transaction[inspect ? 'inspect' : 'save']();
    if (!guard()) return false;
    if (transaction.status().phase !== 'saved') { message(result.warning); return false; }
    state.cardPending = null;
    if (pending.kind === 'config') {
      state.cardConfig = result; message(result.warning || `角色自动入库已${pending.automatic ? '开启' : '关闭'}。`);
    } else {
      state.cardTicket = null; message(result.warning || (result.existing ? '角色已有真实设定，未覆盖。' : `角色「${result.name}」已入库。`));
    }
    return true;
  }
  async function recoverCharacter() {
    if (!state.cardPending || state.cardBusy || state.busy || state.generating) return false;
    const token = state.token, op = state.cardToken;
    const guard = () => active(token) && op === state.cardToken;
    state.cardBusy = true; controls();
    try { return await finishCharacter(guard, state.cardPending.transaction.status().phase === 'uncertain'); }
    catch (error) { if (guard()) message(`角色保存未完成：${error.message}`); return false; }
    finally { if (guard()) { state.cardBusy = false; controls(); } }
  }
  async function sync() {
    if (modules['cryptLord.storyArchive']) return saveStory();
    if (!state.loaded || state.busy || state.cardBusy || state.archiveBusy || state.generating) return false;
    const token = state.token, guard = () => active(token), baseline = clone(state.loaded);
    const index = Number(field('index').value);
    state.busy = true; controls(); message('正在核对经历同步来源...');
    try {
      const editor = await contract.waitGlobalInitialized('cryptLord.nativeEditor', { timeoutMs: 10000 });
      const loaded = await editor.open(baseline.messageId, guard);
      if (!guard()) return false;
      if (!same(loaded.floor, baseline.floor)) throw Error('楼层来源已变化，请重新读取');
      const ticket = await editor.prepareSync(loaded, index, guard);
      if (!guard() || !win().confirm(`将楼层 #${baseline.messageId} 的经历 #${ticket.serials.join('、')} 同步至「${ticket.name}」？`)) {
        if (guard()) message('已取消经历同步。'); return false;
      }
      const result = await editor.syncJourney(ticket, guard);
      if (!guard()) return false;
      if (result.warning) { state.loaded = null; render(); message(result.warning); }
      else message(result.unchanged ? '经历没有变化，未写入。' : `经历已同步至「${result.name}」。`);
      return true;
    } catch (error) { if (guard()) message(`同步失败：${error.message}`); return false; }
    finally { if (guard()) { state.busy = false; controls(); } }
  }
  async function loadArchive() {
    const archive = modules['cryptLord.storyArchive'];
    if (!archive || !state.loaded || state.busy || state.archiveBusy || state.generating || state.archivePending) return false;
    const token = state.token, op = ++state.archiveToken, kind = state.category, floor = clone(state.loaded.floor);
    const guard = () => active(token) && op === state.archiveToken && kind === state.category;
    state.archiveService = archive;
    state.archiveBusy = true; controls(); message('正在核对剧情归档来源...');
    try {
      const config = await archive.readConfig(guard);
      if (!guard()) return false;
      state.archiveConfig = config; field('archive-index').value = config.config.index;
      if (!state.loaded.extracted[kind]) { message('本楼层没有可归档的内容。'); return true; }
      const ticket = await archive.prepare(floor, [kind], guard);
      if (!guard()) return false;
      state.archiveTicket = ticket; message('归档来源已核对。'); return true;
    } catch (error) { if (guard()) { state.archiveTicket = null; message(`剧情归档不可用：${error.message}`); } return false; }
    finally { if (active(token) && op === state.archiveToken) { state.archiveBusy = false; controls(); } }
  }
  async function saveArchiveSettings() {
    if (!state.archiveConfig?.revision || state.busy || state.archiveBusy || state.generating || state.archivePending) return false;
    const archive = modules['cryptLord.storyArchive'], before = state.archiveConfig, token = state.token, op = state.archiveToken;
    const guard = () => active(token) && op === state.archiveToken;
    const config = { ...before.config, index: Number(field('archive-index').value),
      journeyAutomatic: field('journey-auto').checked, novelAutomatic: field('novel-auto').checked };
    state.archiveBusy = true; controls();
    try {
      state.archivePending = { kind: 'config', config, transaction: archive.beginConfig(config, before.revision, guard) };
      return await finishArchive(guard);
    } catch (error) {
      if (guard()) message(`归档设置失败：${error.message}`);
      return false;
    } finally { if (active(token) && op === state.archiveToken) { state.archiveBusy = false; controls(); } }
  }
  async function saveStory() {
    if (!state.archiveTicket || state.busy || state.archiveBusy || state.generating || state.archivePending) return false;
    const ticket = state.archiveTicket, token = state.token, op = state.archiveToken;
    const guard = () => active(token) && op === state.archiveToken;
    if (!win().confirm(`将楼层 #${ticket.floor.message_id} 的${state.category === 'journey' ? '经历' : '正文'}归档至「${ticket.book}」的「${ticket.rows[0].name}」？`)) {
      message('已取消剧情归档。'); return false;
    }
    state.archiveBusy = true; controls();
    try {
      state.archivePending = { kind: 'archive', transaction: state.archiveService.begin(ticket, guard) };
      return await finishArchive(guard);
    } catch (error) {
      if (guard()) {
        if (/已变化|凭据|取消/.test(error.message)) state.archiveTicket = null;
        message(`剧情归档失败：${error.message}`);
      }
      return false;
    } finally { if (active(token) && op === state.archiveToken) { state.archiveBusy = false; controls(); } }
  }
  async function finishArchive(guard, inspect = false) {
    const pending = state.archivePending, transaction = pending.transaction;
    const result = await transaction[inspect ? 'inspect' : 'save']();
    if (!guard()) return false;
    if (transaction.status().phase !== 'saved') { message(result.warning); return false; }
    state.archivePending = null; state.archiveTicket = null;
    if (pending.kind === 'config') {
      state.archiveConfig = result; state.archiveBusy = false;
      const token = state.token;
      const loaded = await loadArchive();
      if (active(token)) message(result.warning || (loaded ? '归档设置已保存。' : '归档设置已保存，但来源未能重新读取，请重新读取。'));
    } else message(result.warning || (result.unchanged ? '内容已存在，未重复写入。' : '剧情已归档。'));
    return true;
  }
  async function recoverArchive() {
    if (!state.archivePending || state.archiveBusy || state.busy || state.generating) return false;
    const token = state.token, op = state.archiveToken, guard = () => active(token) && op === state.archiveToken;
    state.archiveBusy = true; controls();
    try { return await finishArchive(guard, state.archivePending.transaction.status().phase === 'uncertain'); }
    catch (error) { if (guard()) message(`剧情归档未完成：${error.message}`); return false; }
    finally { if (guard()) { state.archiveBusy = false; controls(); } }
  }
  async function copy() {
    if (state.busy || state.cardBusy || state.archiveBusy || !state.loaded || !currentText()) return false;
    const token = state.token, text = currentText();
    try {
      await win().navigator.clipboard.writeText(text);
      if (active(token)) message('已复制所选内容。'); return true;
    } catch { if (active(token)) message('无法访问剪贴板，可直接选择文本。'); return false; }
  }
  async function edit() {
    if (state.busy || state.cardBusy || state.archiveBusy || !state.loaded) return;
    const id = state.loaded.messageId, token = state.token;
    try {
      const editor = await contract.waitGlobalInitialized('cryptLord.nativeFloorEditorUi', { timeoutMs: 10000 });
      if (active(token) && close()) await editor.open(id);
    } catch (error) { if (active(token)) message(`编辑器不可用：${error.message}`); }
  }
  function clamp() {
    if (!openNow()) return;
    const rect = state.panel.getBoundingClientRect(), view = win();
    const left = Math.max(8, Math.min(rect.left, view.innerWidth - rect.width - 8));
    const top = Math.max(8, Math.min(rect.top, view.innerHeight - rect.height - 8));
    state.panel.style.left = `${left}px`; state.panel.style.top = `${top}px`;
  }
  async function open(messageId = null, category = 'thinking') {
    if (!mount() || state.disposed) return false;
    if (!surfaceValid()) { close(true); return false; }
    if (openNow() && (state.selected === messageId || messageId === null)) {
      if (!state.cardPending && !state.archivePending && !state.archiveBusy && !state.cardBusy && !state.busy && category !== state.category) setCategory(category);
      state.panel.focus(); return true;
    }
    if (!discardCard()) return false;
    state.focus = doc().activeElement; state.token++; state.busy = false;
    if (state.selected !== messageId) state.loaded = null;
    state.selected = messageId; state.panel.hidden = false;
    state.panel.dataset.theme = modules['cryptLord.appearanceUi']?.current?.().theme || 'light';
    setCategory(category, false); state.panel.focus(); clamp(); return reload();
  }
  function close(force = false) {
    if (force !== true && !discardCard()) return false;
    state.token++; state.busy = false; clearCharacter(); clearArchive();
    if (state.panel) { state.panel.hidden = true; state.loaded = null; render(); }
    if (state.focus?.isConnected && !state.panel?.contains(state.focus)) state.focus.focus();
    return true;
  }
  async function scan() {
    if (state.disposed || state.generating) return;
    if (!surfaceValid()) { close(true); return; }
    if (state.scanning) { state.rescan = true; return; }
    state.scanning = true; const epoch = state.epoch, token = state.scanToken;
    try {
      const rows = await host.listAssistantMessages();
      if (state.disposed || epoch !== state.epoch || token !== state.scanToken || state.generating) return;
      if (state.loaded && openNow()) {
        const current = rows.find(row => row.message_id === state.loaded.messageId);
        const displayed = host.getDisplayedMessageElement(state.loaded.messageId);
        if (!same(current, state.loaded.floor) || displayed?.getAttribute('is_user') === 'true')
          invalidate('原生楼层已变化，请重新读取');
      }
      const tools = new Map();
      for (const row of rows) {
        if (row.role !== 'assistant' || !Number.isInteger(row.message_id)) continue;
        const messageElement = host.getDisplayedMessageElement(row.message_id);
        if (!messageElement?.isConnected || messageElement.getAttribute('is_user') === 'true') continue;
        let button = state.tools.get(row.message_id);
        if (!button || !messageElement.contains(button)) {
          button?.remove();
          const anchor = messageElement.querySelector('.mes_text,.custom-mes_text');
          if (!anchor) continue;
          button = tool(`查看楼层 #${row.message_id} 提取内容`, 'file-lines', () => void open(row.message_id), '提取内容');
          button.className = 'crypt-lord-inspector-floor-tool'; anchor.insertAdjacentElement('afterend', button);
        }
        button.disabled = state.generating; tools.set(row.message_id, button);
      }
      for (const [id, button] of state.tools) if (tools.get(id) !== button) button.remove();
      state.tools = tools;
    } catch { state.tools.forEach(button => button.remove()); state.tools.clear(); }
    finally { state.scanning = false; if (state.rescan) { state.rescan = false; schedule(); } }
  }
  function schedule() {
    if (state.disposed) return;
    state.scanToken++;
    if (state.timer !== null) return;
    state.timer = win().setTimeout(() => { state.timer = null; void scan(); }, 80);
  }
  function mount() {
    if (state.disposed || state.panel) return Boolean(state.panel);
    state.surface = host.getHost(); state.hostApi = modules['cryptLord.hostApi'];
    if (!doc().body) return false;
    const panel = node('section', 'crypt-lord-response-inspector'); panel.hidden = true; panel.tabIndex = -1;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', '提取内容');
    panel.innerHTML = '<header><strong>提取内容</strong><span data-inspect-source></span><div data-inspect-header></div></header><div class="crypt-lord-response-inspector-toolbar"><select aria-label="提取内容楼层" data-inspect-floor></select><div data-inspect-tools></div></div><nav role="tablist" aria-label="提取分区" data-inspect-tabs></nav><div role="tablist" aria-label="模型来源" data-inspect-models></div><main data-inspect-scroll><p data-inspect-empty></p><pre data-inspect-text></pre></main><div data-inspect-sync-row><label>经历索引<input type="number" min="1" step="1" value="1" aria-label="经历索引" data-inspect-index></label><div data-inspect-sync-tools></div></div><details data-inspect-user-row><summary>对应玩家行动</summary><pre data-inspect-user></pre></details><footer role="status" data-inspect-status></footer>';
    state.panel = panel; doc().body.append(panel);
    const cardRow = node('div'); cardRow.dataset.inspectCardRow = '';
    cardRow.innerHTML = '<span data-inspect-card-target></span><label><input type="checkbox" aria-label="角色自动入库" data-inspect-card-auto>自动入库</label>';
    const cardSave = tool('角色写入世界书', 'file-export', () => void saveCharacter(), '写入世界书');
    const cardRecover = tool('重试角色保存', 'rotate-right', () => void recoverCharacter(), '重试保存');
    cardRecover.dataset.inspectCardRecover = '';
    cardSave.dataset.inspectCardSave = ''; cardRow.append(cardRecover, cardSave); field('sync-row').insertAdjacentElement('afterend', cardRow);
    field('card-auto').addEventListener('change', () => void setCharacterAuto());
    const archiveRow = node('div'); archiveRow.dataset.inspectArchiveRow = '';
    archiveRow.innerHTML = '<span data-inspect-archive-target></span><label>归档索引<input type="number" min="1" step="1" value="1" aria-label="归档索引" data-inspect-archive-index></label><label><input type="checkbox" aria-label="自动归档经历" data-inspect-journey-auto>自动归档经历</label><label><input type="checkbox" aria-label="小说模式自动归档" data-inspect-novel-auto>小说模式</label><div data-inspect-archive-tools></div>';
    cardRow.insertAdjacentElement('afterend', archiveRow);
    const archiveSettings = tool('保存剧情归档设置', 'floppy-disk', () => void saveArchiveSettings());
    archiveSettings.dataset.inspectArchiveSettings = '';
    const novelSave = tool('归档小说正文', 'file-export', () => void saveStory(), '归档正文');
    const archiveRecover = tool('重试剧情归档', 'rotate-right', () => void recoverArchive(), '重试保存');
    archiveRecover.dataset.inspectArchiveRecover = '';
    novelSave.dataset.inspectNovelSave = ''; field('archive-tools').append(archiveSettings, archiveRecover, novelSave);
    for (const name of ['journey-auto', 'novel-auto']) field(name).addEventListener('change', () => void saveArchiveSettings());
    field('archive-index').addEventListener('input', () => { state.archiveTicket = null; controls(); });
    field('scroll').id = 'crypt-lord-inspect-content'; field('scroll').setAttribute('role', 'tabpanel');
    field('scroll').tabIndex = 0;
    const refresh = tool('重新读取提取内容', 'rotate-right', () => void reload()); refresh.dataset.inspectReload = '';
    field('header').append(refresh, tool('关闭提取内容', 'xmark', close));
    const copyButton = tool('复制当前分区', 'copy', () => void copy()); copyButton.dataset.inspectCopy = '';
    const editButton = tool('编辑楼层正文', 'pen-to-square', () => void edit()); editButton.dataset.inspectEdit = '';
    field('tools').append(copyButton, editButton);
    const syncButton = tool('同步本周目经历', 'book', () => void sync(), '同步经历'); syncButton.dataset.inspectSync = '';
    field('sync-tools').append(syncButton);
    for (const [category, caption, icon] of CATEGORIES) {
      const button = tool(caption, icon, () => setCategory(category), caption);
      button.dataset.inspectCategory = category; button.id = `crypt-lord-inspect-tab-${category}`;
      button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', field('scroll').id); field('tabs').append(button);
    }
    for (const [model, caption] of [['narrative', '正文模型'], ['variable', '变量模型']]) {
      const button = tool(caption, 'microchip', () => { state.model = model; render(); field('scroll').scrollTop = 0; }, caption);
      button.dataset.inspectModel = model; button.id = `crypt-lord-inspect-model-${model}`;
      button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', field('scroll').id); field('models').append(button);
    }
    for (const name of ['tabs', 'models']) field(name).addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const buttons = [...field(name).querySelectorAll('button')], index = buttons.indexOf(event.target);
      if (index < 0) return;
      event.preventDefault();
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 :
        (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[target].click(); buttons[target].focus();
    });
    field('floor').addEventListener('change', () => {
      state.selected = Number(field('floor').value); state.loaded = null; render(); void reload();
    });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        const controls = [...panel.querySelectorAll('button,input,select,[tabindex="0"]')].filter(item =>
          !item.matches(':disabled') && item.getClientRects().length && item.checkVisibility());
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && [panel, first].includes(doc().activeElement)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && doc().activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    });
    let drag = null;
    panel.querySelector('header').addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const rect = panel.getBoundingClientRect();
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault();
    });
    panel.querySelector('header').addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      panel.style.left = `${drag.left + event.clientX - drag.x}px`; panel.style.top = `${drag.top + event.clientY - drag.y}px`; clamp();
    });
    for (const name of ['pointerup', 'pointercancel']) panel.querySelector('header').addEventListener(name, () => { drag = null; });
    const view = win();
    view.addEventListener('resize', clamp); state.cleanups.push(() => view.removeEventListener('resize', clamp));
    const resize = new (win().ResizeObserver)(clamp); resize.observe(panel); state.cleanups.push(() => resize.disconnect());
    const changed = () => {
      state.scanToken++; if (openNow()) invalidate('原生楼层已变化，请重新读取'); schedule();
    };
    win().addEventListener('cryptLord:message-edited', changed);
    win().addEventListener('cryptLord:variables-updated', changed);
    state.cleanups.push(() => { view.removeEventListener('cryptLord:message-edited', changed); view.removeEventListener('cryptLord:variables-updated', changed); });
    const events = host.tavernEvents() || {};
    function bind(name, callback) {
      if (!events[name]) return;
      const subscription = host.bindEvent(events[name], callback);
      if (subscription) state.cleanups.push(() => subscription.stop());
    }
    bind('CHAT_CHANGED', () => {
      state.epoch++; close(true); state.selected = null; state.generating = false;
      field('floor').replaceChildren(); field('index').value = '1'; state.tools.forEach(button => button.remove());
      state.tools.clear(); schedule();
    });
    bind('GENERATION_STARTED', (type, options, dryRun) => {
      if (['quiet', 'quiet_prompt'].includes(type) || dryRun || options?.dryRun || options?.params?.dryRun ||
        options?.quiet_prompt || options?.params?.quiet_prompt) return;
      clearCharacter();
      clearArchive();
      state.generating = true; changed(); state.tools.forEach(button => { button.disabled = true; }); controls();
    });
    for (const name of ['GENERATION_ENDED', 'GENERATION_STOPPED']) bind(name, () => { state.generating = false; controls(); schedule(); });
    for (const name of ['MESSAGE_RECEIVED', 'MESSAGE_UPDATED', 'MESSAGE_EDITED', 'MESSAGE_SWIPED',
      'MESSAGE_DELETED', 'MESSAGE_REASONING_EDITED', 'MESSAGE_REASONING_DELETED', 'MESSAGE_SWIPE_DELETED']) bind(name, changed);
    bind('CHARACTER_MESSAGE_RENDERED', schedule);
    const chat = doc().querySelector('#chat');
    if (chat) {
      state.observer = new (win().MutationObserver)(changes => {
        if (changes.some(change => change.type === 'attributes' ||
          [...change.addedNodes, ...change.removedNodes].some(item => item.nodeType === 1 &&
            !item.matches('[class^="crypt-lord-"]') && (item.matches('.mes,.mes_text') || item.querySelector('.mes,.mes_text'))))) schedule();
      });
      state.observer.observe(chat, { childList: true, subtree: true, attributes: true, attributeFilter: ['is_user', 'mesid'] });
    }
    render(); schedule(); return true;
  }
  const api = Object.freeze({ status: () => ({ key: KEY, ready: !state.disposed, open: openNow(), busy: state.busy || state.cardBusy || state.archiveBusy, messageId: state.selected }),
    mount, open, close, reload, sync, copy, saveCharacter, setCharacterAuto, refresh: scan,
    dispose() {
      state.disposed = true; state.epoch++; close(true); state.observer?.disconnect();
      if (state.timer !== null) win().clearTimeout(state.timer);
      state.cleanups.splice(0).forEach(cleanup => cleanup()); state.tools.forEach(button => button.remove());
      state.tools.clear(); state.panel?.remove(); contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY]; return true;
    } });
  modules[KEY] = api; contract.initializeGlobal(KEY, api); mount();
})();
