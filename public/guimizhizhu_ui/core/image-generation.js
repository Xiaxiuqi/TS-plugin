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
  const after = modules['cryptLord.afterNativeHost'];
  const receipts = new WeakMap(), subscriptions = [];
  let disposed = false, epoch = 0, generating = false;
  const clone = value => structuredClone(value);
  function canonical(value) {
    if (Object.prototype.toString.call(value) === '[object RegExp]') return { source: value.source, flags: value.flags };
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    return value;
  }
  const signature = value => JSON.stringify(canonical(value));
  function includesFields(actual, expected) {
    if (!expected || typeof expected !== 'object' || Array.isArray(expected) ||
      Object.prototype.toString.call(expected) === '[object RegExp]') return signature(actual) === signature(expected);
    return Object.entries(expected).every(([key, value]) => includesFields(actual?.[key], value));
  }
  function usable(guard, token = epoch) {
    if (disposed) throw Error('图像生成服务已卸载');
    if (modules[KEY] !== api || token !== epoch || generating || guard?.() === false)
      throw new DOMException('图像操作已取消，聊天或窗口已变化，请重新读取', 'AbortError');
  }
  function check(source, guard) {
    usable(guard, source.token);
    if (modules['cryptLord.hostApi'] !== source.host || modules['cryptLord.afterNativeHost'] !== after ||
      after?.getHost()?.document !== source.document) throw Error('生图来源服务已变化，请重新读取');
  }
  async function capture(guard, token = epoch) {
    usable(guard, token);
    const source = { token, document: after?.getHost()?.document };
    source.host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
    check(source, guard);
    source.binding = clone(await source.host.getCharWorldbookNames('current'));
    check(source, guard);
    if (!source.binding || typeof source.binding !== 'object' || Array.isArray(source.binding)) throw Error('角色世界书绑定不可读取');
    return source;
  }
  async function verify(source, guard) {
    check(source, guard);
    const binding = await source.host.getCharWorldbookNames('current');
    check(source, guard);
    if (signature(binding) !== signature(source.binding)) throw Error('角色世界书绑定已变化，请重新读取');
  }
  function sign(value, source, extra = {}) {
    receipts.set(value, { source, signature: signature(value), ...extra });
    return value;
  }
  function receipt(value) {
    const proof = receipts.get(value);
    if (!proof || proof.signature !== signature(value)) throw Error('生图来源凭据无效或被修改，请重新读取');
    return proof;
  }
  const nameOf = item => String(item?.comment || item?.name || '').trim();
// BEGIN ORIGINAL IMAGE
/* eslint-disable no-empty */
function originalRules(bridge = {}) {
  const eventOn = bridge.on, eventEmit = bridge.emit, eventRemoveListener = bridge.remove;
  class ImageRules {
getDefaultImagePromptSeed() {
    return [
      "生成一条用于 image2 的绘图提示词，格式必须为：",
      "",
      '<pic prompt="这里写画面描述">',
      "",
      "生成这条提示词时，必须严格遵守以下规则：",
      "",
      "1. 每次回复至多只能输出一条 `<pic ...>`，不要输出多个，不要提供备选。",
      "2. `<pic ...>` 里的内容必须始终是纯 SFW 的安全画面，不允许出现色情、裸露、性暗示、露骨身体描写、性行为、血腥重伤等内容。即使正文内容本身带有 NSFW 倾向，这条提示词也必须自动转化为安全、纯净、自然的 SFW 画面。",
      "3. 提示词内容必须使用中文连贯句子书写，而不是关键词堆砌。应充分利用强大的世界理解能力和文字生成能力，把画面描述成完整、自然、可直接用于生成单张图片的中文句子。",
      "4. 提示词应尽量与本次正文内容、场景、角色状态、环境氛围保持一致，但画面必须优先安全，可改写为人物立绘、日常场景、背景环境、建筑、街景、室内、道具展示、风景等适合 SFW 呈现的内容。",
      "5. 提示词中可以明确描述人物外观、服装、动作、表情、镜头、构图、光线、时间、天气、背景细节、环境气氛，也可以直接写出画面里应出现的中文文字内容、位置、样式或招牌文字。",
      "6. 提示词只服务于生成一张图片，因此内容必须统一、集中、明确，避免拆分成多幅画面，避免“第一张/第二张/”等表达。",
      "7. 除这一条 `<pic ...>` 外，不要输出任何额外说明，不要解释这条提示词的生成过程。",
    ].join("\n");
  }
buildDefaultImagePromptPreset() {
    return {
      id: "default",
      name: "默认（Image2）",
      prompt: this.getDefaultImagePromptSeed(),
      locked: true,
    };
  }
normalizeImagePromptPresets(list) {
    const arr = Array.isArray(list) ? list : [];
    const mapped = arr
      .filter((it) => it && typeof it === "object")
      .map((it, idx) => ({
        id: String(it.id || (it.locked ? "default" : `user-${Date.now()}-${idx}`)),
        name: String(it.name || "未命名套装").trim() || "未命名套装",
        prompt: String(it.prompt || ""),
        locked: it.locked === true || it.id === "default",
      }))
      .filter((it) => it.prompt || it.id === "default");

    if (!mapped.some((it) => it.id === "default")) {
      mapped.unshift(this.buildDefaultImagePromptPreset());
    } else {
      const def = mapped.find((it) => it.id === "default");
      if (def) {
        def.locked = true;
        if (!def.name) def.name = "默认（Image2）";
        if (!String(def.prompt || "").trim()) def.prompt = this.getDefaultImagePromptSeed();
      }
    }
    return mapped;
  }
_extractPicPromptFromText(text) {
  const source = String(text || "");
  if (!source) return "";
  // 与 ST-OpenAI-Image-Relay 默认提取正则对齐
  const re = /<pic[^>]*\sprompt="([^"]+)"[^>]*>/gi;
  let last = "";
  let m;
  while ((m = re.exec(source)) !== null) {
    if (m[1] && m[1].trim()) last = m[1].trim();
  }
  return last;
}
_cleanupImageGenRequest() {
  if (typeof this._imageGenRemoveListener === "function") {
    try { this._imageGenRemoveListener(); } catch (_) {}
  }
  this._imageGenRemoveListener = null;
  if (typeof eventRemoveListener === "function" && this._imageGenResponseHandler) {
    try { eventRemoveListener("generate-image-response", this._imageGenResponseHandler); } catch (_) {}
  }
  this._imageGenResponseHandler = null;
  if (this._imageGenTimeoutId) {
    clearTimeout(this._imageGenTimeoutId);
    this._imageGenTimeoutId = null;
  }
  this._imageGenTimeoutDeadline = null;
  this._imageGenRequestId = null;
}
_scheduleImageGenTimeout(requestId, timeoutMs, onTimeout) {
  const deadline = Date.now() + Math.max(0, timeoutMs);
  this._imageGenTimeoutDeadline = deadline;
  const MAX_DELAY = 2147483647; // 2^31-1，setTimeout 安全上限
  const tick = () => {
    if (this._imageGenRequestId !== requestId) return;
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      this._imageGenTimeoutId = null;
      onTimeout();
      return;
    }
    this._imageGenTimeoutId = setTimeout(tick, Math.min(remaining, MAX_DELAY));
  };
  tick();
}
requestGenerateImage({ prompt, change = "", width = null, height = null } = {}) {
  return new Promise((resolve, reject) => {
    if (typeof eventEmit !== "function" || typeof eventOn !== "function") {
      reject(new Error("前端助手未就绪（缺少 eventEmit/eventOn），请安装并启用前端助手扩展。"));
      return;
    }
    if (!prompt || !String(prompt).trim()) {
      reject(new Error("提示词不能为空"));
      return;
    }

    // 取消上一笔未完成请求，避免监听/超时互相覆盖导致 UI 卡死
    this._cleanupImageGenRequest();

    const requestId = "req-" + Date.now() + "-" + Math.random().toString(36).slice(2, 11);
    this._imageGenRequestId = requestId;
    const EventType = {
      GENERATE_IMAGE_REQUEST: "generate-image-request",
      GENERATE_IMAGE_RESPONSE: "generate-image-response",
    };

    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      if (this._imageGenRequestId === requestId) {
        this._cleanupImageGenRequest();
      }
      try {
        fn(value);
      } catch (e) {
        console.error("[图像生成] finish 回调异常:", e);
      }
    };

    const normalizeResponse = (raw) => {
      if (raw == null) return null;
      if (typeof raw === "string") {
        try { return JSON.parse(raw); } catch (_) { return null; }
      }
      // 兼容 (event, data) 或 [data] 等宿主传参差异
      if (Array.isArray(raw) && raw.length === 1 && raw[0] && typeof raw[0] === "object") {
        return raw[0];
      }
      return raw;
    };

    const imageResponseHandler = (...args) => {
      let responseData = normalizeResponse(args[0]);
      if (responseData && responseData.id == null && args.length > 1) {
        responseData = normalizeResponse(args[1]) || responseData;
      }
      if (!responseData || responseData.id !== requestId) return;
      if (responseData.success) {
        finish(resolve, responseData.imageData);
      } else {
        finish(reject, new Error(responseData.error || "图像生成失败"));
      }
    };
    this._imageGenResponseHandler = imageResponseHandler;

    try {
      const maybeRemover = eventOn(EventType.GENERATE_IMAGE_RESPONSE, imageResponseHandler);
      if (typeof maybeRemover === "function") this._imageGenRemoveListener = maybeRemover;
    } catch (e) {
      finish(reject, e instanceof Error ? e : new Error(String(e)));
      return;
    }

    const timeoutSec = Math.max(1, parseInt(this.imageGenTimeoutSeconds, 10) || 120);
    const timeoutMs = timeoutSec * 1000;
    this._scheduleImageGenTimeout(requestId, timeoutMs, () => {
      finish(reject, new Error(`图像生成超时（${timeoutSec}s），请检查前端助手与生图后端是否正常，或在系统设置中调大超时时间。`));
    });

    const requestData = {
      id: requestId,
      prompt: String(prompt).trim(),
      change: change == null ? "" : String(change),
      width: width == null || width === "" ? null : Number(width),
      height: height == null || height === "" ? null : Number(height),
    };
    if (requestData.width != null && Number.isNaN(requestData.width)) requestData.width = null;
    if (requestData.height != null && Number.isNaN(requestData.height)) requestData.height = null;

    Promise.resolve(eventEmit(EventType.GENERATE_IMAGE_REQUEST, requestData)).catch((e) => {
      finish(reject, e instanceof Error ? e : new Error(String(e)));
    });
  });
}
  }
  return new ImageRules();
}
// END ORIGINAL IMAGE
/* eslint-enable no-empty */
  const defaultPreset = () => originalRules().buildDefaultImagePromptPreset();
  function normalize(list) {
    const ids = new Set();
    for (const item of Array.isArray(list) ? list : []) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw Error('生图套装格式无效');
      const id = String(item.id || '').trim();
      if (id && (ids.has(id) || ['__proto__', 'constructor', 'prototype'].includes(id)))
        throw new Error('生图套装 ID 无效或重复，请检查世界书');
      ids.add(id);
    }
    const result = originalRules().normalizeImagePromptPresets(list);
    if (new Set(result.map(row => row.id)).size !== result.length) throw Error('生图套装 ID 重复');
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
    const entry = storedEntry(entries);
    return { exists: true, entry, revision: String(entry?.content || '') };
  }
  function storedEntry(entries) {
    if (!Array.isArray(entries) || entries.some(item => !item || typeof item !== 'object' || Array.isArray(item)))
      throw new Error('玩家自建世界书未返回有效条目');
    const matches = entries.filter(item => nameOf(item) === ENTRY || String(item.name || '').trim() === ENTRY);
    if (matches.length > 1) throw new Error('生图提示词条目不唯一，请先在世界书中修复');
    const entry = matches[0] || null;
    if (entry && (entry.uid == null || entries.filter(item => item.uid === entry.uid).length !== 1)) throw Error('生图条目 UID 缺失或不唯一');
    return entry;
  }
  const revisionOf = stored => ({ exists: stored.exists, entry: clone(stored.entry) });
  async function loadPresets(useDefaults = false, guard) {
    const token = epoch;
    await queue;
    const source = await capture(guard, token);
    const stored = await storage(source.host);
    await verify(source, guard);
    let parsed = [];
    if (stored.revision.trim() && !useDefaults) {
      try { parsed = JSON.parse(stored.revision); }
      catch { throw new Error('生图提示词条目不是有效 JSON，不会覆盖原内容'); }
      if (!Array.isArray(parsed)) throw new Error('生图提示词条目应为数组');
    }
    return { presets: normalize(parsed), revision: sign(revisionOf(stored), source) };
  }
  let queue = Promise.resolve();
  function savePresets(list, revision, isCurrent = () => true) {
    const input = clone(list), expected = clone(revision), proof = receipts.get(revision);
    const task = queue.then(async () => {
      usable(isCurrent);
      if (!proof || proof.signature !== signature(expected)) throw Error('生图套装来源凭据无效，请重新读取');
      const source = proof.source, api = source.host;
      await verify(source, isCurrent);
      const stored = await storage(api);
      await verify(source, isCurrent);
      if (signature(revisionOf(stored)) !== signature(expected)) throw new Error('生图套装已在别处改变，请重新读取');
      const presets = normalize(input);
      const content = JSON.stringify(presets, null, 2);
      const newEntry = {
        name: ENTRY, content, enabled: false,
        strategy: { type: 'selective', keys: [ENTRY] },
        position: { type: 'at_depth', role: 'system', depth: 0, order: 5000 },
      };
      if (!stored.exists) {
        await verify(source, isCurrent);
        try { await api.createWorldbook(BOOK); }
        catch (error) {
          await verify(source, isCurrent);
          if (!(await storage(api)).exists) throw error;
        }
      }
      let transformed = false, writeError = null;
      try {
        await api.updateWorldbookWith(BOOK, async entries => {
          await verify(source, isCurrent);
          const current = storedEntry(entries);
          if (signature(current) !== signature(stored.entry)) throw new Error('生图套装条目已变化，请重新读取');
          transformed = true;
          if (current) return entries.map(item => item.uid === current.uid ? { ...item, content } : item);
          return [...entries, newEntry];
        }, { render: 'debounced' });
      } catch (error) { writeError = error; }
      try {
        await verify(source, isCurrent);
        const saved = await storage(api);
        await verify(source, isCurrent);
        if (!transformed || !saved.entry || saved.revision !== content ||
          (stored.entry ? signature(saved.entry) !== signature({ ...stored.entry, content }) : !includesFields(saved.entry, newEntry)))
          {
            if (writeError && signature(saved.entry) === signature(stored.entry)) writeError.requiresReload = false;
            throw writeError || Error('生图套装提交结果未确认');
          }
        if (writeError && stored.revision === content) throw writeError;
        return { presets, revision: sign(revisionOf(saved), source), warning: writeError ? '套装已保存，但宿主未返回成功响应' : '' };
      } catch (error) {
        if (writeError) { writeError.requiresReload ??= true; throw writeError; }
        return { presets, revision: null, warning: `套装已提交，但复核失败：${error.message}` };
      }
    });
    queue = task.catch(() => {});
    return task;
  }
  function settingsOf(value) {
    const item = value && typeof value === 'object' ? value : {};
    const timeout = Number(item.timeout);
    return {
      timeout: Number.isSafeInteger(timeout) && timeout > 0 && timeout <= Math.floor(Number.MAX_SAFE_INTEGER / 1000)
        ? timeout : 120,
      selected: typeof item.selected === 'string' ? item.selected : 'default',
    };
  }
  async function readSettings(guard) {
    const source = await capture(guard);
    const options = source.host.scriptVariableOptions();
    const vars = await source.host.getVariables(options);
    await verify(source, guard);
    if (signature(options) !== signature(source.host.scriptVariableOptions())) throw Error('生图脚本身份已变化');
    return sign(settingsOf(vars?.[SETTINGS]), source, { options: clone(options),
      exists: Object.hasOwn(vars || {}, SETTINGS), raw: clone(vars?.[SETTINGS]) });
  }
  function saveSettings(value, isCurrent = () => true, baseline) {
    const input = clone(value), proof = receipts.get(baseline), baselineSignature = signature(baseline);
    const task = queue.then(async () => {
      usable(isCurrent);
      if (!proof || proof.signature !== baselineSignature) throw Error('生图设置来源凭据无效，请重新读取');
      const source = proof.source, api = source.host, options = proof.options;
      const checkSettings = async () => {
        await verify(source, isCurrent);
        if (signature(options) !== signature(api.scriptVariableOptions())) throw Error('生图脚本身份已变化');
      };
      const sameBase = vars => Object.hasOwn(vars || {}, SETTINGS) === proof.exists && signature(vars?.[SETTINGS]) === signature(proof.raw);
      const settings = settingsOf(input);
      const merged = { ...(proof.raw || {}), ...settings };
      for (const obsolete of ['apiUrl', 'apiKey', 'model', 'key']) delete merged[obsolete];
      let transformed = false, writeError = null;
      try {
        await checkSettings();
        await api.updateVariablesWith(async vars => {
          await checkSettings();
          if (!sameBase(vars)) throw Error('生图设置已在别处变化，请重新读取');
          transformed = true;
          return { ...vars, [SETTINGS]: merged };
        }, options);
      } catch (error) { writeError = error; }
      try {
        await checkSettings();
        const saved = await api.getVariables(options);
        await checkSettings();
        if (!transformed || signature(saved?.[SETTINGS]) !== signature(merged)) throw writeError || Error('生图设置提交结果未确认');
        if (writeError && signature(proof.raw) === signature(merged)) throw writeError;
        const result = sign(settings, source, { options: clone(options), exists: true, raw: clone(merged) });
        return { settings: result, warning: writeError ? '设置已保存，但宿主未返回成功响应' : '' };
      } catch (error) {
        if (writeError) { writeError.requiresReload = true; throw writeError; }
        return { settings: null, warning: `设置已提交，但复核失败：${error.message}` };
      }
    });
    queue = task.catch(() => {});
    return task;
  }
  function extractPrompt(text) {
    const source = String(text || '');
    return originalRules()._extractPicPromptFromText(source) || source.trim();
  }
  function latestStory(messages) {
    const last = [...(Array.isArray(messages) ? messages : [])].reverse().find(message => message?.role === 'assistant');
    if (!last) return '';
    const normalizer = modules['cryptLord.responseNormalizer'];
    if (!normalizer) throw Error('原生正文规范化服务尚未加载');
    return normalizer.normalize(String(last.message || '')).message;
  }
  async function story(guard) {
    return (await readFloor(null, guard)).text;
  }
  async function floorSource(source, guard) {
    await verify(source, guard);
    const rows = clone(await source.host.getChatMessages('0-{{lastMessageId}}'));
    check(source, guard);
    const pages = clone(await source.host.getChatMessages('0-{{lastMessageId}}', { include_swipes: true }));
    await verify(source, guard);
    if (!Array.isArray(rows) || !Array.isArray(pages) || rows.length !== pages.length ||
      rows.some(row => !Number.isInteger(row?.message_id) || row.message_id < 0) ||
      new Set(rows.map(row => row.message_id)).size !== rows.length ||
      new Set(pages.map(page => page?.message_id)).size !== pages.length ||
      rows.some(row => {
        const page = pages.find(page => page?.message_id === row.message_id);
        return !page || page.role !== row.role || Boolean(page.is_hidden) !== Boolean(row.is_hidden) || !Array.isArray(page.swipes) ||
          !Number.isInteger(page.swipe_id) || page.swipe_id < 0 || page.swipe_id >= page.swipes.length ||
          page.swipes[page.swipe_id] !== row.message || !Array.isArray(page.swipes_data) ||
          signature(page.swipes_data[page.swipe_id]) !== signature(row.data);
      })) throw Error('原生消息分支不可读取，请重新读取');
    return { rows: rows.sort((a, b) => a.message_id - b.message_id), pages };
  }
  async function readFloor(messageId = null, guard) {
    if (messageId != null && (!Number.isInteger(messageId) || messageId < 0)) throw Error('生图楼层号无效');
    const source = await capture(guard), normalizer = modules['cryptLord.responseNormalizer'];
    const floor = await floorSource(source, guard);
    const last = floor.rows.at(-1);
    if (!last || last.role !== 'assistant' || last.message_id === 0 || last.is_hidden ||
      messageId != null && last.message_id !== messageId) throw Error('当前楼层已不是可生图的最新回合');
    const witness = { id: last.message_id, message: last.message, data: signature(last.data), text: latestStory([last]) };
    if (signature(await floorSource(source, guard)) !== signature(floor)) throw Error('楼层正文或变量已变化，旧生图结果未应用');
    if (modules['cryptLord.responseNormalizer'] !== normalizer) throw Error('正文规范化服务已变化');
    return sign(witness, source, { floor, normalizer });
  }
  async function verifyFloor(witness, guard) {
    const proof = receipt(witness);
    if (modules['cryptLord.responseNormalizer'] !== proof.normalizer ||
      signature(await floorSource(proof.source, guard)) !== signature(proof.floor))
      throw Error('楼层正文或变量已变化（含消息分支），旧生图结果未应用');
    return witness;
  }
  async function verifyPresets(revision, guard) {
    const proof = receipt(revision);
    await verify(proof.source, guard);
    const stored = await storage(proof.source.host);
    await verify(proof.source, guard);
    if (signature(revisionOf(stored)) !== signature(revision)) throw Error('生图套装已变化，请重新读取');
  }
  async function generatePrompt(rule, text, guard, options = {}) {
    const source = await capture(guard);
    const normalizer = modules['cryptLord.responseNormalizer'];
    if (!normalizer) throw Error('正文规范化服务尚未加载');
    if (!String(rule || '').trim() || !String(text || '').trim()) throw new Error('套装规则和本轮正文不能为空');
    const config = {
      ordered_prompts: [
        { role: 'system', content: rule.trim() },
        { role: 'user', content: `【最新正文】\n${text.trim()}\n\n请严格按系统规则，仅输出一条绘图提示词结果。` },
      ],
      should_stream: false, should_silence: true, max_chat_history: 0,
      use_mes_examples: false, use_story_string: false, use_authors_note: false,
    };
    const settlement = await contract.waitGlobalInitialized('cryptLord.variableSettlementApi', { timeoutMs: 10000 });
    await verify(source, guard);
    const settings = clone(await settlement.readSettings());
    const unchanged = async () => {
      await verify(source, guard);
      if (modules['cryptLord.responseNormalizer'] !== normalizer) throw Error('正文规范化服务已变化');
      if (modules['cryptLord.variableSettlementApi'] !== settlement ||
        signature(await settlement.readSettings()) !== signature(settings)) throw Error('副模型设置已变化，请重新生成');
      if (options.witness) await verifyFloor(options.witness, guard);
      if (options.revision) await verifyPresets(options.revision, guard);
      await verify(source, guard);
    };
    await unchanged();
    if (settings.useCustomApi) {
      if (!settings.apiUrl || !settings.model) throw new Error('系统副 API 尚未填写 URL 或模型名');
      config.custom_api = { apiurl: settings.apiUrl, key: settings.apiKey, model: settings.model, source: 'openai' };
    }
    const response = await source.host.generateRaw(config);
    await unchanged();
    let visible = String((typeof response === 'string' ? response : response?.content) || '');
    for (const name of normalizer.status().hiddenTags) {
      const tag = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      visible = visible.replace(new RegExp(`<${tag}(?:\\s+[^>]*)?>[\\s\\S]*?<\\/${tag}\\s*>`, 'gi'), '');
      if (new RegExp(`<${tag}(?:\\s|>)`, 'i').test(visible)) throw Error('模型分析或控制标签未闭合，请重新生成提示词');
    }
    const output = originalRules()._extractPicPromptFromText(visible) || normalizer.normalize(visible).message;
    if (!output) throw new Error('模型没有返回提示词');
    return output;
  }
  function events() {
    for (const owner of [window, window.parent, window.top]) {
      try {
        const source = typeof owner?.eventOn === 'function' && typeof owner?.eventEmit === 'function' ? owner : owner?.TavernHelper;
        if (typeof source?.eventOn === 'function' && typeof source?.eventEmit === 'function') {
          return {
            owner: source, onFunction: source.eventOn, emitFunction: source.eventEmit,
            on: source.eventOn.bind(source), emit: source.eventEmit.bind(source),
            remove: source.eventRemoveListener?.bind(source),
          };
        }
      } catch { /* Cross-origin host. */ }
    }
    throw new Error('前端助手生图事件不可用，请检查生图插件');
  }
  const pendingRequests = new Set();
  function requestImage(input, signal, guard) {
    const { prompt, change = '', width = null, height = null, timeout = 120, witness, revision } = input;
    const token = epoch, document = after?.getHost()?.document, host = modules['cryptLord.hostApi'];
    try { usable(guard, token); } catch (error) { return Promise.reject(error); }
    if (!String(prompt || '').trim()) return Promise.reject(new Error('生图提示词不能为空'));
    if (![width, height].every(value => value == null || Number.isSafeInteger(value) && value > 0)) {
      return Promise.reject(new Error('图片宽高必须为正整数或留空'));
    }
    if (signal?.aborted) return Promise.reject(Error('生图请求已取消'));
    let source;
    try { source = events(); }
    catch (error) { return Promise.reject(error); }
    const bridge = {
      ...source, on(name, fn) {
        const remover = source.on(name, fn);
        if (typeof remover === 'function') return remover;
        if (typeof remover?.stop === 'function') return () => remover.stop();
        return () => source.remove?.(name, fn);
      },
      remove: undefined,
    };
    const rules = originalRules(bridge);
    rules.imageGenTimeoutSeconds = settingsOf({ timeout }).timeout;
    const validate = async () => {
      usable(guard, token);
      if (modules['cryptLord.hostApi'] !== host || modules['cryptLord.afterNativeHost'] !== after ||
        after?.getHost()?.document !== document || source.owner.eventOn !== source.onFunction ||
        source.owner.eventEmit !== source.emitFunction) throw Error('生图事件或宿主来源已变化');
      if (witness) await verifyFloor(witness, guard);
      if (revision) await verifyPresets(revision, guard);
      usable(guard, token);
    };
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = (error, data) => {
        if (done) return;
        done = true;
        rules._cleanupImageGenRequest();
        pendingRequests.delete(abort);
        signal?.removeEventListener('abort', abort);
        if (error) reject(error);
        else resolve(data);
      };
      const abort = () => finish(new Error('生图请求已取消'));
      pendingRequests.add(abort);
      try {
        signal?.addEventListener('abort', abort, { once: true });
        const start = () => {
          if (done) return;
          rules.requestGenerateImage({ prompt, change, width, height }).then(async image => {
            try { await validate(); finish(null, image); } catch (error) { finish(error); }
          }, error => finish(error));
        };
        if (witness || revision) void validate().then(start, error => finish(error));
        else start();
      } catch (error) { finish(error); }
    });
  }
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, ready: !disposed, epoch, generating }),
    defaultPreset, normalize, loadPresets, savePresets, readSettings, saveSettings,
    extractPrompt, latestStory, story, readFloor, verifyFloor, verifyPresets, generatePrompt, requestImage, originalRules,
    dispose() {
      disposed = true;
      epoch++;
      subscriptions.splice(0).forEach(sub => sub.stop());
      for (const abort of [...pendingRequests]) abort();
      contract.releaseGlobal(KEY, api); if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  const eventsMap = after?.tavernEvents();
  const bind = (name, fn) => { if (name) { const sub = after.bindEvent(name, fn); if (sub) subscriptions.push(sub); } };
  const cancelPending = () => { for (const abort of [...pendingRequests]) abort(); };
  bind(eventsMap?.CHAT_CHANGED, () => { epoch++; generating = false; cancelPending(); });
  bind(eventsMap?.GENERATION_STARTED, (type, options, dryRun) => {
    if (dryRun || options?.dryRun || ['quiet', 'dryRun'].includes(type) || options?.quiet_prompt) return;
    epoch++; generating = true; cancelPending();
  });
  bind(eventsMap?.GENERATION_ENDED, () => { generating = false; });
  bind(eventsMap?.GENERATION_STOPPED, () => { generating = false; });
})();
