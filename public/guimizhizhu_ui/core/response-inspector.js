(() => {
  'use strict';
  const KEY = 'cryptLord.responseInspector', root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract, modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (!contract) throw Error('提取内容契约尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  let disposed = false, epoch = 0;
  const clone = value => structuredClone(value);
  function check(guard, token = epoch) {
    if (disposed || modules[KEY] !== api || token !== epoch || guard && !guard()) throw new DOMException('提取内容读取已取消', 'AbortError');
  }
  const protocol = () => modules['cryptLord.responseNormalizer'];
  function blocks(text, tag) {
    return protocol().tagSpans(text, tag).filter(span => span.closed)
      .map(span => ({ index: span.start, text: text.slice(span.innerStart, span.innerEnd).trim() }));
  }
  const last = (text, tag) => blocks(text, tag).at(-1)?.text || '';
  function thoughts(text) {
    const safe = protocol().maskHidden(text, ['reasoning', 'thinking', 'think', 'analysis', '思考', '推理', '分析']);
    const candidates = ['reasoning', 'thinking', 'think', '思考', '推理'].flatMap(tag => protocol().tagSpans(safe, tag));
    return candidates.filter(span => span.closed && !candidates.some(parent =>
      parent !== span && parent.start < span.start && parent.end >= span.end))
      .map(span => ({ index: span.start, text: text.slice(span.innerStart, span.innerEnd).trim() }))
      .sort((a, b) => a.index - b.index).map(block => block.text).filter(Boolean);
  }
  function parse(raw) {
    const text = String(raw || ''), thinking = thoughts(text), clean = protocol().maskHidden(text);
    const controls = protocol().maskHidden(text, ['UpdateVariable', 'JSONPatch']), variableRaw = last(controls, 'UpdateVariable');
    // Original _parseAiResponse first/last split, retained only for legacy combined replies.
    const variableOnly = thinking.length === 1 && protocol().tagSpans(controls, 'UpdateVariable').some(span => span.closed);
    const narrative = thinking.length >= 2 ? thinking[0] : variableOnly ? '' : thinking[0] || '';
    const variable = thinking.length >= 2 ? thinking.at(-1) : variableOnly ? thinking[0] : '';
    const patches = protocol().tagSpans(variableRaw, 'JSONPatch').filter(span => span.closed);
    const variables = patches.length ? patches.map(span => variableRaw.slice(span.innerStart, span.innerEnd).trim()).join('\n') : variableRaw;
    return { thinking: { narrative, variable, legacy: Boolean(thinking.length) }, novelText: last(clean, 'gametxt'),
      variables, journey: last(clean, '本周目经历'), characterCard: last(clean, '角色提取') || last(clean, 'CharacterCard'),
      itemCard: last(clean, '物品提取'), clues: last(clean, '当前线索'), worldLog: last(clean, 'wlog'),
      actions: last(clean, 'action'), danmaku: blocks(clean, 'dm').map(block => block.text).filter(Boolean) };
  }
  async function hash(text) {
    const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text)));
    return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
  }
  async function captureVariable({ messageId, message, response = '', purpose = 'turn-settlement', guard }) {
    const token = epoch; check(guard, token);
    const host = modules['cryptLord.hostApi'], after = modules['cryptLord.afterNativeHost'], surface = after?.getHost?.();
    const script = JSON.stringify(host?.scriptVariableOptions?.()), chat = surface?.window?.SillyTavern?.getCurrentChatId?.();
    if (!Number.isInteger(messageId) || messageId < 0) throw Error('变量思维链楼层编号无效');
    const sourceHash = await hash(message);
    check(guard, token);
    const current = after?.getHost?.();
    if (host !== modules['cryptLord.hostApi'] || after !== modules['cryptLord.afterNativeHost'] ||
      surface?.document !== current?.document || surface?.window !== current?.window ||
      script !== JSON.stringify(host?.scriptVariableOptions?.()) || chat !== current?.window?.SillyTavern?.getCurrentChatId?.())
      throw new DOMException('变量思维链来源宿主已变化', 'AbortError');
    return { version: 1, messageId, sourceHash, variableThinking: thoughts(response).at(-1) || '', purpose };
  }
  async function project(floor) {
    if (floor?.role !== 'assistant' || floor.is_hidden) throw Error('提取内容仅支持可见的真实 assistant 楼层');
    const data = parse(floor.message), record = floor.data?.cryptLord?.responseInspection;
    const owned = record && record.version === 1 && record.messageId === floor.message_id;
    const verified = Boolean(owned && record.sourceHash === await hash(String(floor.message || '')));
    const warning = [];
    if (verified) {
      data.thinking = { narrative: thoughts(floor.message)[0] || '', variable: String(record.variableThinking || ''), legacy: false };
    } else if (record) warning.push('变量模型来源与当前正文不一致，未展示旧记录');
    // Public native reasoning belongs to this assistant, never to the variable model.
    if (!data.thinking.narrative && typeof floor.extra?.reasoning === 'string')
      data.thinking.narrative = floor.extra.reasoning.trim();
    if (data.thinking.legacy) warning.push('旧楼层模型归属按原版标签规则推断');
    return { ...data, warning, variableSource: verified ? record.purpose : 'legacy-tags' };
  }
  function chooseTab(thinking, preferred = 'narrative') {
    if (preferred === 'variable' && !thinking.variable && thinking.narrative) return 'narrative';
    if (preferred !== 'variable' && !thinking.narrative && thinking.variable) return 'variable';
    return preferred === 'variable' ? 'variable' : 'narrative';
  }
  async function load(messageId = null, guard, token = epoch) {
    check(guard, token);
    if (messageId !== null && (!Number.isInteger(messageId) || messageId < 0)) throw Error('楼层编号无效');
    const reader = await contract.waitGlobalInitialized('cryptLord.nativeFloorSource', { timeoutMs: 10000 });
    const source = await reader.read(() => { check(guard, token); return true; }), initial = source.rows;
    check(guard, token);
    if (!Array.isArray(initial)) throw Error('原生楼层不可读取');
    const assistants = initial.filter(row => row.role === 'assistant' && !row.is_hidden && Number.isInteger(row.message_id));
    if (new Set(assistants.map(row => row.message_id)).size !== assistants.length) throw Error('原生楼层编号重复');
    const latest = initial.filter(row => row.role === 'assistant').at(-1);
    const floor = messageId === null ? latest?.is_hidden ? null : latest : assistants.find(row => row.message_id === messageId);
    if (!floor) throw Error('所选原生 assistant 楼层不存在');
    const user = initial.filter(row => row.role === 'user' && row.message_id < floor.message_id).at(-1) || null;
    const extracted = await project(floor);
    await reader.assert(source, () => { check(guard, token); return true; });
    check(guard, token);
    return { messageId: floor.message_id, floor: clone(floor), userText: String(user?.message || ''), extracted,
      floors: assistants.map(row => ({ messageId: row.message_id, name: String(row.name || '') })) };
  }
  const after = modules['cryptLord.afterNativeHost'], chat = after?.tavernEvents()?.CHAT_CHANGED;
  const subscription = chat ? after.bindEvent(chat, () => { epoch++; }) : null;
  const api = Object.freeze({ status: () => ({ key: KEY, ready: !disposed }), parse, project, chooseTab, captureVariable, load,
    dispose() {
      disposed = true; epoch++; subscription?.stop(); contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY]; return true;
    } });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
