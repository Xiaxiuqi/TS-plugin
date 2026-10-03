(() => {
  'use strict';
  const KEY = 'cryptLord.imageGeneration';
  const BOOK = '【源堡】玩家自建内容';
  const ENTRY = '[生图提示词]';
  const SETTINGS = 'cryptLord.imageGeneration';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const host = () => contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
  const nameOf = item => String(item?.comment || item?.name || '').trim();
  const DEFAULT_PROMPT = [
    '生成一条用于 image2 的绘图提示词，格式必须为：',
    '',
    '<pic prompt="这里写画面描述">',
    '',
    '生成这条提示词时，必须严格遵守以下规则：',
    '',
    '1. 每次回复至多只能输出一条 `<pic ...>`，不要输出多个，不要提供备选。',
    '2. `<pic ...>` 里的内容必须始终是纯 SFW 的安全画面，不允许出现色情、裸露、性暗示、露骨身体描写、性行为、血腥重伤等内容。即使正文内容本身带有 NSFW 倾向，这条提示词也必须自动转化为安全、纯净、自然的 SFW 画面。',
    '3. 提示词内容必须使用中文连贯句子书写，而不是关键词堆砌。应充分利用强大的世界理解能力和文字生成能力，把画面描述成完整、自然、可直接用于生成单张图片的中文句子。',
    '4. 提示词应尽量与本次正文内容、场景、角色状态、环境氛围保持一致，但画面必须优先安全，可改写为人物立绘、日常场景、背景环境、建筑、街景、室内、道具展示、风景等适合 SFW 呈现的内容。',
    '5. 提示词中可以明确描述人物外观、服装、动作、表情、镜头、构图、光线、时间、天气、背景细节、环境气氛，也可以直接写出画面里应出现的中文文字内容、位置、样式或招牌文字。',
    '6. 提示词只服务于生成一张图片，因此内容必须统一、集中、明确，避免拆分成多幅画面，避免“第一张/第二张/”等表达。',
    '7. 除这一条 `<pic ...>` 外，不要输出任何额外说明，不要解释这条提示词的生成过程。',
  ].join('\n');
  const defaultPreset = () => ({ id: 'default', name: '默认（Image2）', prompt: DEFAULT_PROMPT, locked: true });
  function normalize(list) {
    const ids = new Set();
    const result = [];
    for (const item of Array.isArray(list) ? list : []) {
      if (!item || typeof item !== 'object') continue;
      const id = String(item.id || '').trim();
      if (!id || ids.has(id)) throw new Error('生图套装 ID 缺失或重复，请检查世界书');
      ids.add(id);
      result.push({
        id, name: String(item.name || '未命名套装').trim(), prompt: String(item.prompt || ''),
        locked: id === 'default' || item.locked === true,
      });
    }
    if (!ids.has('default')) result.unshift(defaultPreset());
    const original = result.find(item => item.id === 'default');
    if (!original.prompt.trim()) original.prompt = DEFAULT_PROMPT;
    original.locked = true;
    return result;
  }
  async function storage(api) {
    let entries;
    try { entries = await api.getWorldbook(BOOK); }
    catch (error) {
      if (/未能找到世界书|世界书不存在|worldbook not found|lorebook not found/i.test(String(error?.message || error))) {
        return { exists: false, entry: null, revision: '' };
      }
      throw error;
    }
    if (!Array.isArray(entries)) throw new Error('玩家自建世界书未返回条目');
    const matches = entries.filter(item => nameOf(item) === ENTRY || String(item.name || '').trim() === ENTRY);
    if (matches.length > 1) throw new Error('生图提示词条目不唯一，请先在世界书中修复');
    return { exists: true, entry: matches[0] || null, revision: String(matches[0]?.content || '') };
  }
  async function loadPresets() {
    const stored = await storage(await host());
    let parsed = [];
    if (stored.revision.trim()) {
      try { parsed = JSON.parse(stored.revision); }
      catch { throw new Error('生图提示词条目不是有效 JSON，不会覆盖原内容'); }
      if (!Array.isArray(parsed)) throw new Error('生图提示词条目应为数组');
    }
    return { presets: normalize(parsed), revision: stored.revision };
  }
  let queue = Promise.resolve();
  function savePresets(list, revision) {
    const task = queue.then(async () => {
      const api = await host();
      const stored = await storage(api);
      if (stored.revision !== revision) throw new Error('生图套装已在别处改变，请重新读取');
      const presets = normalize(list);
      const content = JSON.stringify(presets, null, 2);
      if (!stored.exists) await api.createWorldbook(BOOK);
      if (stored.entry) {
        if (stored.entry.uid == null) throw new Error('生图套装条目缺少 UID');
        let changed = false;
        await api.updateWorldbookWith(BOOK, entries => {
          const matches = entries.filter(item => nameOf(item) === ENTRY || String(item.name || '').trim() === ENTRY);
          if (matches.length !== 1 || matches[0].uid !== stored.entry.uid ||
            String(matches[0].content || '') !== stored.revision) throw new Error('生图套装条目已变化，请重新读取');
          changed = true;
          return entries.map(item => item.uid === stored.entry.uid ? { ...item, content } : item);
        }, { render: 'debounced' });
        if (!changed) throw new Error('生图套装条目未更新');
      } else {
        if ((await storage(api)).entry) throw new Error('生图套装条目已由别处创建，请重新读取');
        await api.createWorldbookEntries(BOOK, [{
          name: ENTRY, comment: ENTRY, keys: [ENTRY], content, enabled: false,
          strategy: { type: 'selective', keys: [ENTRY] },
          position: { type: 'at_depth', role: 'system', depth: 0, order: 5000 },
        }], { render: 'debounced' });
      }
      return { presets, revision: content };
    });
    queue = task.catch(() => {});
    return task;
  }
  function settingsOf(value) {
    const item = value && typeof value === 'object' ? value : {};
    const timeout = Number(item.timeout);
    return {
      custom: item.custom === true, url: String(item.url || '').trim(),
      key: String(item.key || '').trim(), model: String(item.model || '').trim(),
      timeout: Number.isSafeInteger(timeout) && timeout > 0 ? timeout : 120,
    };
  }
  async function readSettings() {
    const api = await host();
    return settingsOf(api.getVariables(api.scriptVariableOptions())[SETTINGS]);
  }
  async function saveSettings(value) {
    const api = await host();
    const options = api.scriptVariableOptions();
    const vars = api.getVariables(options);
    const settings = settingsOf(value);
    api.replaceVariables({ ...(vars || {}), [SETTINGS]: settings }, options);
    return settings;
  }
  function extractPrompt(text) {
    const source = String(text || '');
    const matches = [...source.matchAll(/<pic[^>]*\sprompt="([^"]+)"[^>]*>/gi)];
    return matches.at(-1)?.[1]?.trim() || source.trim();
  }
  function latestStory(messages) {
    const last = [...(Array.isArray(messages) ? messages : [])].reverse().find(message => message?.role === 'assistant');
    if (!last) return '';
    const raw = String(last.message || '');
    const blocks = [...raw.matchAll(/<gametxt\b[^>]*>([\s\S]*?)<\/gametxt>/gi)];
    return (blocks.at(-1)?.[1] || raw.replace(/<UpdateVariable\b[^>]*>[\s\S]*?<\/UpdateVariable>/gi, '')).trim();
  }
  async function story() {
    return latestStory(await (await host()).getChatMessages('0-{{lastMessageId}}'));
  }
  async function generatePrompt(rule, text, settings) {
    if (!String(rule || '').trim() || !String(text || '').trim()) throw new Error('套装规则和本轮正文不能为空');
    const config = {
      ordered_prompts: [
        { role: 'system', content: rule.trim() },
        { role: 'user', content: `【最新正文】\n${text.trim()}\n\n请严格按系统规则，仅输出一条绘图提示词结果。` },
      ],
      should_stream: false, max_chat_history: 0,
    };
    if (settings?.custom) {
      if (!settings.url || !settings.key || !settings.model) throw new Error('自定义提示词 API 需填写 URL、Key 和模型');
      config.custom_api = { apiurl: settings.url, key: settings.key, model: settings.model, source: 'openai' };
    }
    const response = await (await host()).generateRaw(config);
    const output = extractPrompt(typeof response === 'string' ? response : response?.content);
    if (!output) throw new Error('模型没有返回提示词');
    return output;
  }
  function events() {
    for (const owner of [window, window.parent, window.top]) {
      try {
        const source = typeof owner?.eventOn === 'function' && typeof owner?.eventEmit === 'function' ? owner : owner?.TavernHelper;
        if (typeof source?.eventOn === 'function' && typeof source?.eventEmit === 'function') {
          return {
            on: source.eventOn.bind(source), emit: source.eventEmit.bind(source),
            remove: source.eventRemoveListener?.bind(source),
          };
        }
      } catch { /* Cross-origin host. */ }
    }
    throw new Error('前端助手生图事件不可用，请检查生图插件');
  }
  function requestImage({ prompt, change = '', width = null, height = null, timeout = 120 }, signal) {
    if (!String(prompt || '').trim()) return Promise.reject(new Error('生图提示词不能为空'));
    if (![width, height].every(value => value == null || Number.isSafeInteger(value) && value > 0)) {
      return Promise.reject(new Error('图片宽高必须为正整数或留空'));
    }
    const bridge = events();
    const id = `crypt-image-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve, reject) => {
      let done = false;
      let timer;
      let remover;
      const finish = (error, data) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        if (typeof remover === 'function') remover();
        else if (typeof remover?.stop === 'function') remover.stop();
        else bridge.remove?.('generate-image-response', listener);
        if (error) reject(error);
        else resolve(data);
      };
      const abort = () => finish(new Error('生图请求已取消'));
      const listener = (...args) => {
        for (const arg of args) {
          let data = arg;
          if (typeof data === 'string') { try { data = JSON.parse(data); } catch { continue; } }
          if (Array.isArray(data) && data.length === 1) data = data[0];
          if (data?.id !== id) continue;
          finish(data.success ? null : new Error(data.error || '图像生成失败'), data.imageData);
          break;
        }
      };
      try {
        remover = bridge.on('generate-image-response', listener);
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted) { abort(); return; }
        const seconds = Number(timeout);
        const deadline = Date.now() + (Number.isSafeInteger(seconds) && seconds > 0 ? seconds : 120) * 1000;
        const tick = () => {
          if (done) return;
          const remaining = deadline - Date.now();
          if (remaining <= 0) finish(new Error('生图请求超时'));
          else timer = setTimeout(tick, Math.min(2147483647, remaining));
        };
        tick();
        Promise.resolve(bridge.emit('generate-image-request', {
          id, prompt: prompt.trim(), change: String(change || ''), width, height,
        })).catch(error => finish(error));
      } catch (error) { finish(error); }
    });
  }
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, ready: true }),
    defaultPreset, normalize, loadPresets, savePresets, readSettings, saveSettings,
    extractPrompt, latestStory, story, generatePrompt, requestImage,
    dispose() { contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY]; },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
