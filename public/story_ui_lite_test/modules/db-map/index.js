(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const dom = ui.dom;
  const MODULE_ID = 'db-map';
  const MODULE_VERSION = '1.1.0-lite_test';
  const persistentRuntime = (window.__storyRegexUiRuntime ||= {});
  const databaseUpdateBridges = (persistentRuntime.dbMapUpdateBridges ||= new WeakMap());
  const MAP_CONFIG_STORAGE_KEY = 'db-status-map-config';
  const MAP_SVG_ALLOWED_TAGS = new Set(['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'defs', 'clippath', 'tspan']);
  const MAP_SVG_ALLOWED_ATTRS = new Set(['xmlns', 'viewbox', 'class', 'id', 'data-idx', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height', 'd', 'points', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'fill-opacity', 'stroke-opacity', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline', 'transform', 'clip-path', 'style']);
  const MAP_SVG_ALLOWED_STYLE_PROPS = new Set(['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'fill-opacity', 'stroke-opacity', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline']);
  const EMPTY_MAP_CONFIG = {
    followDatabaseApi: true,
    apiUrl: '',
    apiKey: '',
    model: '',
    enableMapGeneration: true,
    modelList: [],
  };


  function esc(v) { return dom ? dom.escapeHtml(String(v ?? '')) : String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function normalizeMapConfigValue(value) {
    return String(value ?? '').trim();
  }

  function normalizeMapModelList(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map(item => normalizeMapConfigValue(item)).filter(Boolean))];
  }

  const MAP_DEBUG_PREFIX = '[db-map][map-debug]';

  function mapDebugLog(event, details = {}, level = 'info') {
    try {
      const fn = level === 'warn' ? console.warn : console.info;
      fn(MAP_DEBUG_PREFIX, event, details);
    } catch {
      // debug logging must not affect map rendering
    }
  }

  function isMapSecretQueryKey(key) {
    const normalized = normalizeMapConfigValue(key).replace(/[^a-z0-9]/gi, '').toLowerCase();
    if (!normalized) return false;
    return (
      normalized === 'key' ||
      normalized === 'pwd' ||
      normalized === 'auth' ||
      normalized.endsWith('key') ||
      normalized.includes('apikey') ||
      normalized.includes('token') ||
      normalized.includes('authorization') ||
      normalized.endsWith('auth') ||
      normalized.includes('secret') ||
      normalized.includes('password') ||
      normalized.includes('passwd')
    );
  }

  function maskMapSecret(value) {
    const text = normalizeMapConfigValue(value);
    if (!text) return { present: false, tail: '' };
    return { present: true, tail: text.slice(-4) };
  }

  function redactMapUrlSecretValue(value) {
    return value ? '[redacted]' : '';
  }

  function redactMapUrlSecretsInText(value) {
    return normalizeMapConfigValue(value).replace(
      /([?&#;]|^)([^=&#;\s]*?(?:key|api[_-]?key|token|access[_-]?token|authorization|auth|secret|password|passwd|pwd)[^=&#;\s]*=)([^&#;\s]*)/gi,
      (match, prefix, keyPart, secretValue) => `${prefix}${keyPart}${redactMapUrlSecretValue(secretValue)}`,
    );
  }

  function summarizeMapUrl(value) {
    const text = normalizeMapConfigValue(value);
    if (!text) return { present: false, full: '', summary: '' };
    try {
      const url = new URL(text);
      if (url.username) url.username = '[redacted]';
      if (url.password) url.password = '[redacted]';
      url.searchParams.forEach((paramValue, key) => {
        if (isMapSecretQueryKey(key)) {
          url.searchParams.set(key, redactMapUrlSecretValue(paramValue));
        }
      });
      const full = url.href;
      return { present: true, full, summary: full };
    } catch {
      const full = redactMapUrlSecretsInText(text);
      return { present: true, full, summary: full };
    }
  }

  function redactMapSensitiveText(value) {
    let text = redactMapUrlSecretsInText(value);
    text = text.replace(/(authorization\s*[:=]\s*bearer\s+)[^\s,;)}\]]+/gi, '$1[redacted]');
    text = text.replace(
      /((?:api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|auth[_-]?token|client[_-]?secret|secret[_-]?key|token|authorization|auth|secret|password|passwd|pwd|key)\s*[:=]\s*['"]?)([^'"\s,;)}\]]+)/gi,
      (match, prefix, secretValue) => `${prefix}${redactMapUrlSecretValue(secretValue)}`,
    );
    return text;
  }

  function summarizeMapError(error) {
    const name = normalizeMapConfigValue(error?.name) || (error ? typeof error : '');
    const rawMessage = error?.message || String(error ?? '');
    const message = redactMapSensitiveText(rawMessage);
    return {
      name,
      message,
    };
  }

  function getMapErrorMessage(error) {
    return summarizeMapError(error).message;
  }

  function summarizeMapCurrentModel(config, source = 'config') {
    if (config?.followDatabaseApi !== false) {
      return { present: false, model: '', source: 'database-api-current-model-unavailable' };
    }
    const model = normalizeMapConfigValue(config?.model);
    return {
      present: Boolean(model),
      model,
      source: model ? source : 'custom-config-model-empty',
    };
  }

  function summarizeMapModelOnlyConfig(config) {
    return { model: summarizeMapCurrentModel(config).model };
  }

  function summarizeMapConfig(config) {
    return {
      followDatabaseApi: config?.followDatabaseApi !== false,
      apiUrl: summarizeMapUrl(config?.apiUrl),
      apiKey: maskMapSecret(config?.apiKey),
      modelPresent: Boolean(normalizeMapConfigValue(config?.model)),
      model: normalizeMapConfigValue(config?.model),
      currentModel: summarizeMapCurrentModel(config),
      sanitizedLog: summarizeMapModelOnlyConfig(config),
      enableMapGeneration: config?.enableMapGeneration !== false,
      modelCount: Array.isArray(config?.modelList) ? config.modelList.length : 0,
    };
  }

  function summarizeMapCustomApi(customApi) {
    if (!customApi) return { present: false };
    return {
      present: true,
      fields: Object.keys(customApi).sort(),
      hasApiurl: Boolean(customApi.apiurl),
      hasKey: Boolean(customApi.key),
      key: maskMapSecret(customApi.key),
      url: summarizeMapUrl(customApi.apiurl),
      modelPresent: Boolean(customApi.model),
      model: normalizeMapConfigValue(customApi.model),
      currentModel: summarizeMapCurrentModel({ followDatabaseApi: false, model: customApi.model }, 'custom_api.model'),
      maxTokens: customApi.max_tokens,
    };
  }

  function summarizeMapAiResult(result) {
    const type = Array.isArray(result) ? 'array' : typeof result;
    const text = typeof result === 'string' ? result : '';
    return {
      type,
      isString: typeof result === 'string',
      length: text.length,
      trimmedLength: text.trim().length,
      hasSvg: /<svg[\s\S]*<\/svg>/i.test(text),
    };
  }

  function hasUsableMapCustomConfig(parsed) {
    return Boolean(
      normalizeMapConfigValue(parsed?.apiUrl) ||
        normalizeMapConfigValue(parsed?.apiKey) ||
        normalizeMapConfigValue(parsed?.model),
    );
  }

  function getMapAiConfig() {
    try {
      const raw = localStorage.getItem(MAP_CONFIG_STORAGE_KEY);
      if (!raw) {
        const emptyConfig = { ...EMPTY_MAP_CONFIG };
        mapDebugLog('config:read:empty', summarizeMapConfig(emptyConfig));
        return emptyConfig;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        const emptyConfig = { ...EMPTY_MAP_CONFIG };
        mapDebugLog('config:read:invalid', { rawType: typeof parsed, config: summarizeMapConfig(emptyConfig) }, 'warn');
        return emptyConfig;
      }
      const hasExplicitMode = typeof parsed.followDatabaseApi === 'boolean';
      const modelList = normalizeMapModelList(parsed.modelList);
      const model = normalizeMapConfigValue(parsed.model);
      if (model && !modelList.includes(model)) modelList.unshift(model);
      const config = {
        followDatabaseApi: hasExplicitMode ? parsed.followDatabaseApi : !hasUsableMapCustomConfig(parsed),
        apiUrl: normalizeMapConfigValue(parsed.apiUrl),
        apiKey: normalizeMapConfigValue(parsed.apiKey),
        model,
        enableMapGeneration: parsed.enableMapGeneration !== false,
        modelList,
      };
      mapDebugLog('config:read:ok', summarizeMapConfig(config));
      return config;
    } catch (e) {
      const errorSummary = summarizeMapError(e);
      console.warn('[db-map] read map AI config failed:', errorSummary);
      mapDebugLog('config:read:failed', { error: errorSummary, config: summarizeMapConfig(EMPTY_MAP_CONFIG) }, 'warn');
      return { ...EMPTY_MAP_CONFIG };
    }
  }

  function buildMapAiOptions() {
    return { max_tokens: 4000 };
  }

  function hasMapCustomApiConfig(config) {
    return config?.followDatabaseApi === false && Boolean(config.apiUrl || config.apiKey || config.model);
  }

  function getTavernHelperGenerate() {
    const candidates = [];
    try { candidates.push(window.TavernHelper); } catch { /* ignore */ }
    try { candidates.push(parent?.TavernHelper); } catch { /* ignore */ }
    try { candidates.push(globalThis.TavernHelper); } catch { /* ignore */ }
    try { candidates.push(window); } catch { /* ignore */ }
    try { candidates.push(parent); } catch { /* ignore */ }
    for (const candidate of candidates) {
      if (typeof candidate?.generate === 'function') {
        return { generate: candidate.generate.bind(candidate), generateRaw: typeof candidate?.generateRaw === 'function' ? candidate.generateRaw.bind(candidate) : null };
      }
    }
    return null;
  }

  function buildMapCustomApi(config) {
    if (config?.followDatabaseApi !== false) return null;
    const customApi = {};
    if (config.apiUrl) customApi.apiurl = config.apiUrl;
    if (config.apiKey) customApi.key = config.apiKey;
    if (config.model) customApi.model = config.model;
    if (Object.keys(customApi).length === 0) {
      mapDebugLog('custom-api:build:empty', { config: summarizeMapConfig(config) });
      return null;
    }
    customApi.max_tokens = 4000;
    mapDebugLog('custom-api:build:ok', summarizeMapCustomApi(customApi));
    return customApi;
  }

  async function callMapAI(api, prompt) {
    const messages = [{ role: 'user', content: prompt }];
    const options = buildMapAiOptions();
    const config = getMapAiConfig();
    const tavern = getTavernHelperGenerate();
    const customApi = buildMapCustomApi(config);
    const shouldUseCustomApi = hasMapCustomApiConfig(config);
    const currentModel = summarizeMapCurrentModel(config, shouldUseCustomApi ? 'custom-config.model' : 'database-api-config.model');

    function fail(reason, error) {
      const errorSummary = error ? summarizeMapError(error) : null;
      if (errorSummary) console.warn(`[db-map] ${reason}:`, errorSummary);
      else console.warn(`[db-map] ${reason}`);
      mapDebugLog('ai:failed', { reason, error: errorSummary, shouldUseCustomApi, currentModel, customApi: summarizeMapCustomApi(customApi), sanitizedLog: summarizeMapModelOnlyConfig(config) }, 'warn');
      return { ok: false, text: '', reason: errorSummary?.message ? `${reason}: ${errorSummary.message}` : reason };
    }

    mapDebugLog('ai:start', {
      promptLength: String(prompt || '').length,
      shouldUseCustomApi,
      currentModel,
      hasTavernHelperGenerate: Boolean(tavern),
      hasGenerateRaw: Boolean(tavern?.generateRaw),
      hasDatabaseCallAI: typeof api?.callAI === 'function',
      config: summarizeMapConfig(config),
      customApi: summarizeMapCustomApi(customApi),
    });

    if (tavern && shouldUseCustomApi && customApi) {
      try {
        // 优先使用 generateRaw + ordered_prompts: ['user_input']，避免酒馆预设干扰地图生成
        const generatorFn = tavern.generateRaw || tavern.generate;
        const generatorName = tavern.generateRaw ? 'TavernHelper.generateRaw' : 'TavernHelper.generate';
        const generateConfig = tavern.generateRaw ? {
          user_input: prompt,
          should_silence: true,
          ordered_prompts: ['user_input'],
          custom_api: customApi,
        } : {
          user_input: prompt,
          should_silence: true,
          max_chat_history: 0,
          custom_api: customApi,
        };
        mapDebugLog('ai:generator:selected', { generator: generatorName, currentModel, customApi: summarizeMapCustomApi(customApi), sanitizedLog: summarizeMapModelOnlyConfig(config) });
        const result = await generatorFn(generateConfig);
        const resultType = typeof result;
        const resultSummary = {
          generator: generatorName,
          currentModel,
          resultType,
          result: summarizeMapAiResult(result),
          sanitizedLog: summarizeMapModelOnlyConfig(config),
        };
        mapDebugLog('ai:result', resultSummary);
        // generate 返回 string | object，需要兼容两种类型
        if (resultType === 'string' && result.trim()) {
          return { ok: true, text: result, reason: '' };
        }
        // object 类型：尝试提取文本内容
        if (resultType === 'object' && result !== null) {
          const extracted = result.text || result.content || result.message || (Array.isArray(result.choices) && result.choices[0]?.message?.content) || '';
          if (typeof extracted === 'string' && extracted.trim()) {
            mapDebugLog('ai:result:extracted-from-object', { extractedLength: extracted.length });
            return { ok: true, text: extracted, reason: '' };
          }
        }
        console.error('[db-map] TavernHelper.generate 返回无效结果:', resultSummary);
        return fail('TavernHelper.generate returned no usable map text');
      } catch (e) {
        return fail('TavernHelper.generate failed', e);
      }
    }

    if (shouldUseCustomApi) {
      return fail('custom map API is configured but TavernHelper.generate is unavailable');
    }

    if (!api || typeof api.callAI !== 'function') {
      return fail('no available map AI generator');
    }

    try {
      mapDebugLog('ai:generator:selected', { generator: 'AutoCardUpdaterAPI.callAI', currentModel, options, sanitizedLog: summarizeMapModelOnlyConfig(config) });
      const result = await api.callAI(messages, options);
      mapDebugLog('ai:result', { generator: 'AutoCardUpdaterAPI.callAI', currentModel, result: summarizeMapAiResult(result), sanitizedLog: summarizeMapModelOnlyConfig(config) });
      return typeof result === 'string' && result.trim() ? { ok: true, text: result, reason: '' } : fail('database plugin callAI returned no usable map text');
    } catch (e) {
      return fail('database plugin callAI failed', e);
    }
  }

  function hasUnsafeSvgValue(value) {
    const text = String(value ?? '').toLowerCase();
    return /(?:javascript:|data:text\/html|<|>|url\s*\(|expression\s*\()/i.test(text);
  }

  function sanitizeSvgStyle(value) {
    const safeRules = [];
    String(value ?? '').split(';').forEach(rule => {
      const colonIndex = rule.indexOf(':');
      if (colonIndex <= 0) return;
      const prop = rule.slice(0, colonIndex).trim().toLowerCase();
      const propValue = rule.slice(colonIndex + 1).trim();
      if (!MAP_SVG_ALLOWED_STYLE_PROPS.has(prop)) return;
      if (hasUnsafeSvgValue(propValue)) return;
      safeRules.push(`${prop}:${propValue}`);
    });
    return safeRules.join(';');
  }

  function sanitizeSvgAttribute(name, value, tagName) {
    const lowerName = String(name || '').toLowerCase();
    const text = String(value ?? '').trim();
    if (lowerName.startsWith('on')) return null;
    if (lowerName === 'href' || lowerName === 'xlink:href' || lowerName === 'src') return null;
    if (!MAP_SVG_ALLOWED_ATTRS.has(lowerName)) return null;
    if (lowerName === 'xmlns') return tagName === 'svg' && text === 'http://www.w3.org/2000/svg' ? text : null;
    if (lowerName === 'style') return sanitizeSvgStyle(text) || null;
    if (lowerName === 'clip-path') return /^url\(#[A-Za-z][\w:.-]*\)$/.test(text) ? text : null;
    if (lowerName === 'data-idx') return /^\d{1,4}$/.test(text) ? text : null;
    if (lowerName === 'id') return /^[A-Za-z][\w:.-]{0,80}$/.test(text) ? text : null;
    if (hasUnsafeSvgValue(text)) return null;
    return text;
  }

  function sanitizeSvgNode(node) {
    if (!node || node.nodeType !== 1) return;
    const tagName = String(node.tagName || '').toLowerCase();
    if (!MAP_SVG_ALLOWED_TAGS.has(tagName)) {
      node.remove();
      return;
    }
    Array.from(node.attributes || []).forEach(attr => {
      const safeValue = sanitizeSvgAttribute(attr.name, attr.value, tagName);
      if (safeValue === null) node.removeAttribute(attr.name);
      else if (safeValue !== attr.value) node.setAttribute(attr.name, safeValue);
    });
    Array.from(node.children || []).forEach(child => sanitizeSvgNode(child));
  }

  function sanitizeSVG(markup) {
    const raw = String(markup ?? '').trim();
    if (!raw) {
      mapDebugLog('svg:sanitize:failed', { reason: 'empty-input' }, 'warn');
      return '';
    }
    if (typeof DOMParser !== 'function' || typeof XMLSerializer !== 'function') {
      mapDebugLog('svg:sanitize:failed', { reason: 'parser-unavailable' }, 'warn');
      return '';
    }
    try {
      const doc = new DOMParser().parseFromString(raw, 'image/svg+xml');
      if (doc.querySelector('parsererror')) {
        mapDebugLog('svg:sanitize:failed', { reason: 'parsererror', rawLength: raw.length }, 'warn');
        return '';
      }
      const svg = doc.documentElement;
      if (!svg || String(svg.tagName || '').toLowerCase() !== 'svg') {
        mapDebugLog('svg:sanitize:failed', { reason: 'root-not-svg', tagName: svg?.tagName || '', rawLength: raw.length }, 'warn');
        return '';
      }
      sanitizeSvgNode(svg);
      const viewBox = svg.getAttribute('viewBox') || svg.getAttribute('viewbox') || '';
      if (!/^\s*-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s*$/.test(viewBox)) {
        mapDebugLog('svg:sanitize:failed', { reason: 'invalid-viewBox', viewBox, rawLength: raw.length }, 'warn');
        return '';
      }
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const safeSvg = new XMLSerializer().serializeToString(svg);
      mapDebugLog('svg:sanitize:ok', { rawLength: raw.length, safeLength: safeSvg.length, viewBox });
      return safeSvg;
    } catch (e) {
      const errorSummary = summarizeMapError(e);
      console.warn('[db-map] sanitize SVG failed:', errorSummary);
      mapDebugLog('svg:sanitize:failed', { reason: errorSummary.message, rawLength: raw.length }, 'warn');
      return '';
    }
  }

  function extractSvgMarkup(value) {
    const match = String(value ?? '').match(/<svg[\s\S]*<\/svg>/i);
    const svg = match ? match[0] : '';
    mapDebugLog('svg:extract', { inputType: typeof value, inputLength: typeof value === 'string' ? value.length : 0, found: Boolean(svg), svgLength: svg.length });
    return svg;
  }

  function mapNum(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function mapIndex(v) {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function normalizeMapCoord(v, fallback = 0) {
    return mapNum(v, fallback);
  }

  function resolveMapPoint(el, i) {
    const safeIdx = mapIndex(i);
    const fallbackX = 150 + (safeIdx * 137) % 500;
    const fallbackY = 80 + (safeIdx * 91) % 400;
    const cx = Number.isFinite(Number(el?.x)) ? normalizeMapCoord(el.x, fallbackX) : fallbackX;
    const cy = Number.isFinite(Number(el?.y)) ? normalizeMapCoord(el.y, fallbackY) : fallbackY;
    return { cx, cy };
  }

  function renderMapLandMarker(el, i, cx, cy, color, nameOffset = 16) {
    const name = el.name || '';
    const safeIdx = mapIndex(i);
    const safeCx = normalizeMapCoord(cx, 0);
    const safeCy = normalizeMapCoord(cy, 0);
    const safeNameOffset = mapNum(nameOffset, 16);
    const safeColor = MAP_COLOR_MAP[el.type] || color || '#8b7355';
    return `<g class="cm" data-idx="${esc(safeIdx)}"><text x="${safeCx}" y="${safeCy}" text-anchor="middle" fill="${esc(safeColor)}" font-size="18">◆</text><text x="${safeCx}" y="${safeCy + safeNameOffset}" text-anchor="middle" fill="#5c4033" font-size="9">${esc(name)}</text></g>`;
  }

  function normalizeMapClickTargets(root) {
    const viewport = root?.querySelector?.('.db-sb-map-viewport');
    if (!viewport) return;
    viewport.querySelectorAll('.cm, [data-idx]').forEach(node => {
      node.style.cursor = 'pointer';
    });
  }
  const MAP_COLOR_MAP = {
    '主角': '#ff5f9e', '友方': '#6bb7ff', '敌方': '#e74c3c', 'NPC': '#f39c12',
    '地标': '#a88545', '障碍物': '#7a8b99', '出口': '#45c78a',
    protagonist: '#ff5f9e', ally: '#6bb7ff', enemy: '#e74c3c', npc: '#f39c12',
    landmark: '#a88545', obstacle: '#7a8b99', exit: '#45c78a'
  };
  const CHAR_TYPES = ['protagonist', 'ally', 'enemy', 'npc', '主角', '友方', '敌方', 'NPC'];
  const LAND_TYPES = ['landmark', 'obstacle', 'exit', '地标', '障碍物', '出口'];
  const mapCache = Object.create(null);
  let mapBusy = false;
  let pendingAutoMapRequest = null;
  let lastAutoMapSignature = '';
  let lastCity = '';
  let mapLoadingOverlayState = { active: false, message: '' };

  function buildMapSignature(S) {
    const elements = Array.isArray(S?.mapElements) ? S.mapElements : [];
    const compactElements = elements.map(el => ({
      name: String(el?.name ?? ''),
      type: String(el?.type ?? ''),
      x: String(el?.x ?? el?.cx ?? ''),
      y: String(el?.y ?? el?.cy ?? ''),
      desc: String(el?.desc ?? el?.description ?? ''),
    }));
    return JSON.stringify({
      location: String(S?.location || '未知'),
      elements: compactElements,
    });
  }

  function getMapCacheEntry(loc) {
    const raw = mapCache[loc];
    if (!raw) {
      mapDebugLog('cache:read:miss', { loc });
      return null;
    }
    if (typeof raw === 'string') {
      mapDebugLog('cache:read:hit:legacy', { loc, svgLength: raw.length });
      return { svg: raw, signature: '' };
    }
    if (typeof raw === 'object' && typeof raw.svg === 'string') {
      mapDebugLog('cache:read:hit', { loc, svgLength: raw.svg.length, signaturePresent: Boolean(raw.signature) });
      return { svg: raw.svg, signature: String(raw.signature || '') };
    }
    delete mapCache[loc];
    mapDebugLog('cache:read:invalid-cleared', { loc, rawType: typeof raw }, 'warn');
    return null;
  }

  function setMapCacheEntry(loc, svg, signature) {
    if (!loc || !svg) {
      mapDebugLog('cache:write:skipped', { loc, hasSvg: Boolean(svg) }, 'warn');
      return;
    }
    mapCache[loc] = { svg, signature: String(signature || '') };
    mapDebugLog('cache:write:ok', { loc, svgLength: svg.length, signaturePresent: Boolean(signature) });
  }

  function removeMapCacheEntry(loc) {
    if (!loc) {
      mapDebugLog('cache:clear:skipped', { loc }, 'warn');
      return;
    }
    const existed = Boolean(mapCache[loc]);
    delete mapCache[loc];
    mapDebugLog('cache:clear', { loc, existed });
  }

  function getSafeCachedMap(loc) {
    const entry = getMapCacheEntry(loc);
    if (!entry?.svg) {
      mapDebugLog('cache:safe:miss', { loc });
      return null;
    }
    const safeSvg = sanitizeSVG(entry.svg);
    if (!safeSvg) {
      removeMapCacheEntry(loc);
      mapDebugLog('cache:safe:rejected', { loc, originalLength: entry.svg.length }, 'warn');
      return null;
    }
    if (safeSvg !== entry.svg || typeof mapCache[loc] === 'string') {
      setMapCacheEntry(loc, safeSvg, entry.signature);
      mapDebugLog('cache:safe:normalized', { loc, originalLength: entry.svg.length, safeLength: safeSvg.length });
    }
    mapDebugLog('cache:safe:ok', { loc, svgLength: safeSvg.length, signaturePresent: Boolean(entry.signature) });
    return { svg: safeSvg, signature: entry.signature };
  }

  function getMapScale(loc) {
    if (!loc) return 'scene';
    if (/[·—/-]/.test(loc) && loc.length > 4) return 'scene';
    if (loc.length <= 6) return 'city';
    return 'scene';
  }

  function getCityFromLoc(loc) {
    if (!loc) return '';
    const parts = loc.split(/[·—/-]/);
    return parts[0] || loc;
  }

  function notifyMap(message, type = 'info', root) {
    const text = String(message || '').trim();
    if (!text) return;
    const candidates = [];
    try { candidates.push(window); } catch { /* ignore */ }
    try { candidates.push(parent); } catch { /* ignore */ }
    try { candidates.push(globalThis); } catch { /* ignore */ }
    for (const candidate of candidates) {
      try {
        const toastr = candidate?.toastr;
        if (toastr?.[type]) {
          toastr[type](text, '数据库地图');
          break;
        }
        if (toastr?.info) {
          toastr.info(text, '数据库地图');
          break;
        }
      } catch {
        // ignore toast failures
      }
    }
  }

  function setMapLoadingOverlay(root, visible, message) {
    const active = visible === true;
    const text = active ? String(message || '正在生成地图…') : '';
    mapLoadingOverlayState = { active, message: text };
    const overlay = root?.querySelector?.('[data-map-loading-overlay]');
    if (!overlay) return;
    overlay.dataset.active = active ? 'true' : 'false';
    overlay.setAttribute('aria-hidden', active ? 'false' : 'true');
    const textNode = overlay.querySelector?.('[data-map-loading-text]');
    if (textNode) {
      textNode.textContent = text;
    }
  }

  function hideMapDetailPopover(root) {
    const popover = root?.querySelector?.('[data-map-popover]');
    if (!popover) return;
    popover.hidden = true;
    popover.innerHTML = '';
  }

  function showMapDetailPopover(root, event, el) {
    const area = root?.querySelector?.('.db-sb-map-area');
    const popover = root?.querySelector?.('[data-map-popover]');
    if (!area || !popover || !event || !el) return;
    popover.innerHTML = `
      <div class="db-sb-map-popover-title">${esc(el.name || '--')}</div>
      <div class="db-map-detail-row"><span class="db-map-detail-name">类型</span><span class="db-map-detail-value">${esc(el.type || '--')}</span></div>
      <div class="db-map-detail-row"><span class="db-map-detail-name">状态</span><span class="db-map-detail-value">${esc(el.status || '--')}</span></div>
      <div class="db-map-detail-row"><span class="db-map-detail-name">描述</span><span class="db-map-detail-value">${esc(el.desc || '--')}</span></div>
      <div class="db-map-detail-row"><span class="db-map-detail-name">传说背景</span><span class="db-map-detail-value">${esc(el.lore || '--')}</span></div>`;
    popover.hidden = false;
    popover.style.left = '8px';
    popover.style.top = '8px';
    const areaRect = area.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const desiredLeft = event.clientX - areaRect.left + 12;
    const desiredTop = event.clientY - areaRect.top + 12;
    const maxLeft = Math.max(8, areaRect.width - popoverRect.width - 8);
    const maxTop = Math.max(8, areaRect.height - popoverRect.height - 8);
    popover.style.left = `${Math.min(Math.max(8, desiredLeft), maxLeft)}px`;
    popover.style.top = `${Math.min(Math.max(8, desiredTop), maxTop)}px`;
  }

  function renderMapEmptyState(message) {
    return `<div class="db-sb-map-empty">${esc(message)}</div>`;
  }

  function clampMapCoord(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return Math.max(min, Math.min(max, n));
  }

  function getBaseMapPoint(el, index, total) {
    const directX = clampMapCoord(el?.x ?? el?.cx, 60, 740);
    const directY = clampMapCoord(el?.y ?? el?.cy, 60, 540);
    if (directX !== null && directY !== null) return { x: directX, y: directY };
    const count = Math.max(1, total || 1);
    const angle = (-Math.PI / 2) + ((Math.PI * 2 * index) / count);
    return {
      x: Math.round(400 + Math.cos(angle) * 260),
      y: Math.round(300 + Math.sin(angle) * 185),
    };
  }

  function renderBaseMap(S) {
    const elements = Array.isArray(S?.mapElements) ? S.mapElements.filter(Boolean) : [];
    if (!elements.length) return '';
    const area = esc(S?.location || '未知区域');
    const roads = elements.length > 1
      ? elements.map((el, i) => getBaseMapPoint(el, i, elements.length)).map(p => `${p.x},${p.y}`).join(' ')
      : '';
    const markers = elements.map((el, i) => {
      const type = String(el?.type || '地标');
      const color = MAP_COLOR_MAP[type] || '#a88545';
      const point = getBaseMapPoint(el, i, elements.length);
      const name = esc(el?.name || `元素${i + 1}`);
      const status = esc(el?.status || '');
      const initial = esc(String(el?.name || '?').trim().charAt(0) || '?');
      const isCharacter = CHAR_TYPES.includes(type);
      const shape = isCharacter
        ? `<circle cx="${point.x}" cy="${point.y}" r="15" fill="${color}" stroke="#fff8e8" stroke-width="3"></circle><text x="${point.x}" y="${point.y + 1}" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="800" fill="#fff">${initial}</text>`
        : `<rect x="${point.x - 13}" y="${point.y - 13}" width="26" height="26" rx="6" transform="rotate(45 ${point.x} ${point.y})" fill="${color}" stroke="#fff8e8" stroke-width="3"></rect>`;
      return `<g class="cm" data-idx="${i}">${shape}<text x="${point.x}" y="${point.y + 31}" text-anchor="middle" font-size="11" font-weight="700" fill="#5f5140">${name}</text>${status ? `<text x="${point.x}" y="${point.y + 45}" text-anchor="middle" font-size="9" fill="#8a7763">${status}</text>` : ''}</g>`;
    }).join('');

    const svg = `<svg class="db-sb-map-svg db-sb-base-map" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img">
      <rect x="0" y="0" width="800" height="600" fill="#f5ead0"></rect>
      <rect x="32" y="32" width="736" height="536" rx="28" fill="rgba(255,255,255,0.36)" stroke="#d2b887" stroke-width="2"></rect>
      <text x="400" y="58" text-anchor="middle" font-size="18" font-weight="800" fill="#6f5b3e">${area}</text>
      ${roads ? `<polyline points="${roads}" fill="none" stroke="#c7aa72" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="10 10" opacity="0.55"></polyline>` : ''}
      ${markers}
    </svg>`;
    return sanitizeSVG(svg) || '';
  }

  function isBaseMapMarkup(markup) {
    return /class=["'][^"']*\bdb-sb-base-map\b/.test(String(markup || ''));
  }

  function setMapViewportMarkup(root, markup) {
    const viewport = root?.querySelector?.('.db-sb-map-viewport');
    if (!viewport) return;
    viewport.innerHTML = markup || renderMapEmptyState('暂无地图。点击重绘地图生成。');
    normalizeMapClickTargets(root);
  }

  function buildMapPrompt(S) {
    const elements = S.mapElements || [];
    const area = S.location || '未知';
    const scale = getMapScale(area);
    const curCity = getCityFromLoc(area);
    const isNewCity = curCity !== lastCity;
    lastCity = curCity;

    const scaleHint = (scale === 'city' && isNewCity)
      ? '这是刚到达的区域，绘制区域全景俯瞰地图。标注主要功能区、通道、重要地标位置。视角为45度斜俯视鸟瞰。'
      : '绘制当前所在的具体场景地图（室内/街道/建筑内部/广场等局部区域）。视角为近距离斜俯视，只画当前场景范围，不要画整个大区域。标注场景内的装置、通道、交互物件等细节元素。';

    const charList = elements.filter(e => CHAR_TYPES.includes(e.type)).map(e => e.name).join('、') || '暂无';
    const landList = elements.filter(e => LAND_TYPES.includes(e.type)).map(e => e.name).join('、') || '暂无';
    const indexList = elements.length > 0
      ? elements.map((e, i) => `${i}: ${e.name}/${e.type}`).join('；')
      : '暂无';

    return `你是科幻奇幻世界的场景地图绘制师，绘图风格参考《崩坏：星穹铁道》《原神》《鸣潮》等游戏的小地图/区域地图风格。整体采用柔和的暖色调底色(#f5ead0)，搭配精致的描边线条勾勒建筑与道路轮廓，重要地标使用图标标记，场景元素使用半透明色块区分功能区域。所有文字必须使用中文，严禁英文。
当前地点：${area}
地图要求：${scaleHint}
场景中角色：${charList}
场景中元素：${landList}
地图元素索引：${indexList}
SVG viewBox="0 0 800 600"，底色#f5ead0。建筑和道路用柔和描边(stroke-width:2, opacity:0.7)表现层次感。角色使用圆形标记，圆内显示姓名首字(白色)，圆下显示全名，圆形带柔和阴影。颜色：主角=#ff5f9e，友方=#6bb7ff，敌方=#e74c3c，NPC=#f39c12。地标用菱形◆标记=#a88545，障碍物=#7a8b99，出口=#45c78a。所有可点击元素必须加 class="cm" data-idx="对应索引"。只输出<svg>...</svg>，不要解释，不要Markdown。`;
  }

  async function doMap(root, force, options = {}) {
    const requestToken = generationToken;
    const busyOwner = {};
    if (!isModuleEnabled() || !root?.isConnected) return;
    if (mapBusy) {
      mapDebugLog('domap:skipped', { reason: 'busy', force: Boolean(force), options });
      return;
    }
    const S = getState();
    const loc = S.location || '未知';
    const signature = buildMapSignature(S);
    const config = getMapAiConfig();
    const mapGenerationEnabled = config.enableMapGeneration !== false;
    const allowGenerate = Boolean(force || options.allowGenerate);
    const shouldTryGenerate = mapGenerationEnabled && allowGenerate;
    const shouldUpdateAutoSignature = options.updateAutoSignature === true;
    let viewport = root.querySelector('.db-sb-map-viewport');
    const previousMarkup = viewport ? viewport.innerHTML.trim() : '';
    const safePreviousMarkup = previousMarkup ? sanitizeSVG(previousMarkup) : '';
    const cached = getSafeCachedMap(loc);
    const cacheSignatureMatches = cached && (cached.signature === signature || (!allowGenerate && !cached.signature));

    mapDebugLog('domap:start', {
      loc,
      force: Boolean(force),
      allowGenerate,
      shouldTryGenerate,
      shouldUpdateAutoSignature,
      mapGenerationEnabled,
      previousMarkupLength: previousMarkup.length,
      safePreviousMarkupLength: safePreviousMarkup.length,
      cached: Boolean(cached?.svg),
      cachedSignaturePresent: Boolean(cached?.signature),
      cacheSignatureMatches: Boolean(cacheSignatureMatches),
      config: summarizeMapConfig(config),
    });

    if (previousMarkup && safePreviousMarkup && previousMarkup !== safePreviousMarkup && viewport) {
      viewport.innerHTML = safePreviousMarkup;
      normalizeMapClickTargets(root);
    }

    if (!force && cacheSignatureMatches) {
      if (viewport) {
        viewport.innerHTML = cached.svg;
        mapDebugLog('domap:cache:render', { loc, svgLength: cached.svg.length, updateAutoSignature: shouldUpdateAutoSignature });
        normalizeMapClickTargets(root);
      }
      if (shouldUpdateAutoSignature) lastAutoMapSignature = signature;
      return;
    }

    if (!shouldTryGenerate) {
      if (cached?.svg && viewport) {
        mapDebugLog('domap:no-generate:cached-render', { loc, reason: allowGenerate && !mapGenerationEnabled ? 'generation-disabled' : 'cache-only', svgLength: cached.svg.length });
        viewport.innerHTML = cached.svg;
        normalizeMapClickTargets(root);
      } else if (allowGenerate && !mapGenerationEnabled) {
        const baseMap = renderBaseMap(S);
        setMapViewportMarkup(root, baseMap || renderMapEmptyState('AI 地图生成已关闭，且暂无地图元素可显示。'));
        notifyMap('AI 地图生成已关闭，未生成地图。', 'error', root);
      } else {
        const baseMap = renderBaseMap(S);
        setMapViewportMarkup(root, baseMap || renderMapEmptyState('暂无地图元素。请点击重绘地图生成。'));
        notifyMap(baseMap ? '暂无 AI 地图缓存，已显示数据库基础地图。' : '暂无地图元素，请点击重绘地图生成。', 'info', root);
      }
      if (shouldUpdateAutoSignature && !allowGenerate) lastAutoMapSignature = signature;
      return;
    }

    if (force) {
      mapDebugLog('domap:force:clear-cache', { loc });
      removeMapCacheEntry(loc);
    }

    mapBusy = true;
    mapBusyOwner = busyOwner;
    if (activeDataRoot?.isConnected && activeDataRoot !== root) {
      root = activeDataRoot;
      viewport = root.querySelector('.db-sb-map-viewport');
    }
    const refreshBtn = root.querySelector('[data-map-action="refresh"]');
    const redrawBtn = root.querySelector('[data-map-action="redraw"]');
    if (refreshBtn) refreshBtn.disabled = true;
    if (redrawBtn) redrawBtn.disabled = true;
    setMapLoadingOverlay(root, true, force ? '正在重绘地图…' : '正在生成地图…');
    if (!safePreviousMarkup) {
      mapDebugLog('domap:placeholder:render', { loc, reason: 'no-safe-previous-markup' });
    }
    mapDebugLog('domap:generate:start', { loc, force: Boolean(force), hasPreviousSvg: Boolean(safePreviousMarkup), hasCachedSvg: Boolean(cached?.svg) });

    try {
      let svg = '';
      let aiReturnedSvg = false;
      try {
        const api = ui.dbMapData?.getAutoCardAPI?.();
        if ((api && typeof api.callAI === 'function') || getTavernHelperGenerate()) {
          const prompt = buildMapPrompt(S);
          const result = await callMapAI(api, prompt);
          if (!isGenerationCurrent(requestToken, root)) return;
          if (result?.ok && result.text) {
            const rawSvg = extractSvgMarkup(result.text);
            aiReturnedSvg = Boolean(rawSvg);
            svg = sanitizeSVG(rawSvg);
            if (rawSvg && !svg) {
              console.warn('[db-map] AI map SVG rejected by sanitizer');
              mapDebugLog('domap:generate:svg-rejected', { loc, rawSvgLength: rawSvg.length }, 'warn');
              notifyMap('AI 返回的地图 SVG 未通过安全检查，已保留旧图。', 'error', root);
            }
          } else if (result?.reason) {
            notifyMap(`地图 AI 调用失败：${result.reason}`, 'error', root);
          }
        } else {
          notifyMap('没有可用的地图 AI 生成接口。', 'error', root);
        }
      } catch (e) {
        const errorSummary = summarizeMapError(e);
        console.warn('[db-map] AI map generation failed:', errorSummary);
        notifyMap(`地图 AI 生成失败：${errorSummary.message}`, 'error', root);
      }

      if (svg) {
        if (!isGenerationCurrent(requestToken, root)) return;
        setMapCacheEntry(loc, svg, signature);
        mapDebugLog('domap:generate:success', { loc, svgLength: svg.length, updateAutoSignature: shouldUpdateAutoSignature });
        if (shouldUpdateAutoSignature) lastAutoMapSignature = signature;
        if (activeDataRoot?.isConnected && activeDataRoot !== root) {
          root = activeDataRoot;
          viewport = root.querySelector('.db-sb-map-viewport');
          if (mapLoadingOverlayState.active) setMapLoadingOverlay(root, true, mapLoadingOverlayState.message);
        }
        if (viewport) {
          viewport.innerHTML = svg;
          normalizeMapClickTargets(root);
        }
        return;
      }

      const previousSvg = safePreviousMarkup || cached?.svg;
      if (previousSvg) {
        mapDebugLog('domap:generate:failed-keep-previous', { loc, aiReturnedSvg, previousSvgLength: previousSvg.length }, 'warn');
        const previousIsBaseMap = isBaseMapMarkup(previousSvg);
        notifyMap(previousIsBaseMap ? '地图生成失败，已显示数据库基础地图。' : (aiReturnedSvg ? '地图生成失败，已保留旧图。' : 'AI 未返回可用 SVG，已保留旧图。'), 'error', root);
        if (activeDataRoot?.isConnected && activeDataRoot !== root) {
          root = activeDataRoot;
          viewport = root.querySelector('.db-sb-map-viewport');
          if (mapLoadingOverlayState.active) setMapLoadingOverlay(root, true, mapLoadingOverlayState.message);
        }
        if (viewport) {
          viewport.innerHTML = previousSvg;
          normalizeMapClickTargets(root);
        }
        if (shouldUpdateAutoSignature) lastAutoMapSignature = signature;
        return;
      }

      if (mapGenerationEnabled && !aiReturnedSvg) console.warn('[db-map] AI map generation returned no SVG');
      mapDebugLog('domap:generate:failed-empty', { loc, aiReturnedSvg, mapGenerationEnabled }, 'warn');
      setMapViewportMarkup(root, renderBaseMap(S) || renderMapEmptyState('地图生成失败，且暂无地图元素可显示。请检查 API 设置后重试。'));
      notifyMap('地图生成失败，未写入伪造地图缓存。请检查 API 设置后重试。', 'error', root);
      if (shouldUpdateAutoSignature) lastAutoMapSignature = signature;
    } catch (e) {
      const errorSummary = summarizeMapError(e);
      console.warn('[db-map] map rendering failed:', errorSummary);
      mapDebugLog('domap:render:failed', { loc, error: errorSummary }, 'warn');
      notifyMap(`地图渲染失败：${errorSummary.message}`, 'error', root);
    } finally {
      if (mapBusyOwner === busyOwner) {
        mapBusy = false;
        mapBusyOwner = null;
        const pending = pendingAutoMapRequest;
        pendingAutoMapRequest = null;
        if (isGenerationCurrent(requestToken, root)) {
          if (activeDataRoot?.isConnected && activeDataRoot !== root) {
            setMapLoadingOverlay(activeDataRoot, false);
          }
          setMapLoadingOverlay(root, false);
          if (refreshBtn) refreshBtn.disabled = false;
          if (redrawBtn) redrawBtn.disabled = false;
        }
        const pendingRoot = activeDataRoot?.isConnected ? activeDataRoot : pending?.root;
        if (pending && pendingRoot?.isConnected && isModuleEnabled()) {
          mapDebugLog('domap:pending-auto:resume', { loc, pendingOptions: pending.options });
          setTimeout(() => {
            if (isModuleEnabled() && pendingRoot.isConnected) maybeAutoMap(pendingRoot, pending.options);
          }, 0);
        }
      }
    }
  }




  // --- Map Tab (SVG skeleton) ---
  function renderMapTab(S) {
    const elements = S.mapElements || [];
    const area = S.location || '未知';
    const colorMap = {
      '主角': '#ff5f9e',
      '友方': '#6bb7ff',
      '敌方': '#e74c3c',
      'NPC': '#f39c12',
      '地标': '#a88545',
      '障碍物': '#7a8b99',
      '出口': '#45c78a'
    };
    let legend = '';
    Object.entries(colorMap).forEach(([type, color]) => {
      legend += `<span class="db-sb-map-legend-item"><span class="db-sb-map-legend-color" style="background:${color}"></span>${type}</span>`;
    });

    return `
    <div class="db-sb-map-container">
      <div class="db-sb-map-header">
        <span class="db-map-area-label">当前区域: ${esc(area)}</span>
      </div>
      <div class="db-sb-map-viewport">
        ${renderBaseMap(S) || renderMapEmptyState('暂无地图元素。点击重绘地图生成。')}
      </div>
      <div class="db-sb-map-legend">${legend}</div>
    </div>`;
  }

  let debounceTimer = null;
  let autoMapTimer = null;
  let activeDataRoot = null;
  let registeredTableUpdateApi = null;
  let generationToken = 0;
  let mapBusyOwner = null;
  let lastError = '';
  let disposed = false;
  let moduleDefinition = null;

  function isModuleEnabled() {
    return !disposed && ui.registry?.find?.(MODULE_ID) === moduleDefinition && moduleDefinition?.enabled !== false;
  }

  function isGenerationCurrent(token, root) {
    return isModuleEnabled() && token === generationToken && Boolean(root?.isConnected);
  }

  function renderMapShell() {
    const theme = ui.theme?.getTheme?.() || 'day';
    const S = getState();
    const markIcon = theme === 'night' ? '✧' : '✦';
    return `<section class="story-ui-root db-map story-ui-${theme}" data-story-ui-module="${MODULE_ID}">
      <section class="db-map-panel">
        <div class="db-map-header">
          <span class="db-map-mark" data-story-ui-theme-toggle title="切换日夜主题">${markIcon}</span>
          <div><div class="db-map-title">区域地图</div><div class="db-map-subtitle">DATABASE MAP</div></div>
          <div class="db-sb-fn-toolbar-right">
            <button class="db-sb-fn-btn" data-map-action="refresh">⟳ 刷新地图</button>
            <button class="db-sb-fn-btn" data-map-action="redraw">✧ 重绘地图</button>
          </div>
        </div>
        <div class="db-map-body"><div class="db-sb-map-area">${renderMapTab(S)}
          <div class="db-sb-map-popover" data-map-popover hidden></div>
          <div class="db-sb-map-loading-overlay" data-map-loading-overlay data-active="false" aria-hidden="true"><div class="db-sb-map-loading-text" data-map-loading-text></div></div>
        </div></div>
      </section>
    </section>`;
  }

  function bindEvents(root) {
    if (!root || root.dataset.dbMapBound) return;
    root.dataset.dbMapBound = 'true';
    root.addEventListener('click', event => {
      const actionButton = event.target.closest('[data-map-action]');
      if (actionButton && root.contains(actionButton)) {
        hideMapDetailPopover(root);
        if (actionButton.dataset.mapAction === 'refresh') doMap(root, false);
        if (actionButton.dataset.mapAction === 'redraw') doMap(root, true);
        return;
      }
      if (event.target.closest('[data-map-popover]')) return;
      const mapElement = event.target.closest('.db-sb-map-viewport .cm[data-idx], .db-sb-map-viewport [data-idx]');
      if (mapElement && root.contains(mapElement)) {
        const element = (getState().mapElements || [])[Number.parseInt(mapElement.dataset.idx, 10)];
        if (element) showMapDetailPopover(root, event, element);
        return;
      }
      if (event.target.closest('.db-sb-map-viewport')) hideMapDetailPopover(root);
    });
  }

  function rerender(root) {
    if (!root?.parentElement || !isModuleEnabled()) return root;
    const host = document.createElement('div');
    host.innerHTML = renderMapShell();
    const nextRoot = host.firstElementChild;
    root.replaceWith(nextRoot);
    bindEvents(nextRoot);
    activeDataRoot = nextRoot;
    normalizeMapClickTargets(nextRoot);
    if (mapLoadingOverlayState.active) setMapLoadingOverlay(nextRoot, true, mapLoadingOverlayState.message);
    return nextRoot;
  }

  function rerenderAll() {
    if (!isModuleEnabled()) return;
    document.querySelectorAll('.db-map[data-story-ui-module="db-map"]').forEach(root => rerender(root));
  }

  function maybeAutoMap(root, options = {}) {
    if (!isModuleEnabled() || !root?.isConnected) return;
    if (mapBusy) {
      if (options.allowGenerate === true) pendingAutoMapRequest = { root, options: { ...options } };
      return;
    }
    const S = getState();
    const signature = buildMapSignature(S);
    const loc = S.location || '未知';
    const cached = getSafeCachedMap(loc);
    const cacheSignatureMatches = cached && (cached.signature === signature || (options.allowGenerate !== true && !cached.signature));
    const allowGenerate = options.allowGenerate === true && signature !== lastAutoMapSignature && !cacheSignatureMatches;
    doMap(root, false, { allowGenerate, updateAutoSignature: true });
  }

  function scheduleAutoMap(root) {
    if (autoMapTimer) clearTimeout(autoMapTimer);
    const token = generationToken;
    autoMapTimer = setTimeout(() => {
      autoMapTimer = null;
      const target = activeDataRoot?.isConnected ? activeDataRoot : root;
      if (isGenerationCurrent(token, target)) maybeAutoMap(target, { allowGenerate: true });
    }, 0);
  }

  async function refreshData(root, allowAutoGenerate) {
    if (!isModuleEnabled()) return;
    const token = generationToken;
    const api = ui.dbMapData?.getAutoCardAPI?.();
    try {
      if (api?.exportTableAsJson) {
        const tables = await api.exportTableAsJson();
        if (!isGenerationCurrent(token, root)) return;
        ui.dbMapData.parseTables(typeof tables === 'string' ? JSON.parse(tables) : tables);
      } else {
        ui.dbMapData?.loadTestData?.();
      }
      if (!isGenerationCurrent(token, root)) return;
      activeDataRoot = rerender(root) || root;
      if (allowAutoGenerate) scheduleAutoMap(activeDataRoot);
      else lastAutoMapSignature = buildMapSignature(getState());
    } catch (error) {
      if (!isGenerationCurrent(token, root)) return;
      lastError = summarizeMapError(error).message;
      console.warn('[db-map] database load failed:', summarizeMapError(error));
      if (!allowAutoGenerate) ui.dbMapData?.loadTestData?.();
    }
  }

  function setDatabaseUpdateHandler(api, handler) {
    if (!api || typeof api.registerTableUpdateCallback !== 'function') return false;
    if (registeredTableUpdateApi && registeredTableUpdateApi !== api) clearDatabaseUpdateHandler();
    let bridge = databaseUpdateBridges.get(api);
    if (!bridge) {
      bridge = { owner: null, handler: null };
      databaseUpdateBridges.set(api, bridge);
      api.registerTableUpdateCallback(() => bridge.handler?.());
    }
    bridge.owner = moduleDefinition;
    bridge.handler = handler;
    registeredTableUpdateApi = api;
    return true;
  }

  function clearDatabaseUpdateHandler() {
    const api = registeredTableUpdateApi;
    const bridge = api ? databaseUpdateBridges.get(api) : null;
    if (bridge?.owner === moduleDefinition) {
      bridge.owner = null;
      bridge.handler = null;
    }
    registeredTableUpdateApi = null;
  }

  function ensureDatabaseSubscription() {
    if (disposed) return;
    const api = ui.dbMapData?.getAutoCardAPI?.();
    if (!api || registeredTableUpdateApi === api || typeof api.registerTableUpdateCallback !== 'function') return;
    setDatabaseUpdateHandler(api, () => {
      if (!isModuleEnabled()) return;
      const callbackToken = generationToken;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        const root = activeDataRoot;
        if (isGenerationCurrent(callbackToken, root)) refreshData(root, true);
      }, 300);
    });
  }

  function mount(node) {
    if (!isModuleEnabled()) return;
    generationToken += 1;
    const root = node.querySelector?.('.db-map') || node;
    activeDataRoot = root;
    bindEvents(root);
    ensureDatabaseSubscription();
    refreshData(root, false);
  }

  function removeMountedDom() {
    document.querySelectorAll('[data-story-ui-module="db-map"]').forEach(node => {
      const host = node.closest?.('[data-story-ui-after-native-mount="true"], [data-story-ui-raw-mount="true"]') || node;
      const stack = host.closest?.('[data-story-ui-after-native-stack="true"]');
      host.remove();
      if (stack && stack.childElementCount === 0) stack.remove();
    });
  }

  function onEnable() {
    generationToken += 1;
    ensureDatabaseSubscription();
  }

  function onDisable() {
    generationToken += 1;
    if (debounceTimer) clearTimeout(debounceTimer);
    if (autoMapTimer) clearTimeout(autoMapTimer);
    debounceTimer = null;
    autoMapTimer = null;
    pendingAutoMapRequest = null;
    activeDataRoot = null;
    mapBusy = false;
    mapBusyOwner = null;
    mapLoadingOverlayState = { active: false, message: '' };
    clearDatabaseUpdateHandler();
    removeMountedDom();
  }

  async function fetchModels(config) {
    if (!isModuleEnabled()) throw new Error('db-map module disabled');
    const normalized = { ...getMapAiConfig(), ...(config || {}) };
    if (normalized.followDatabaseApi !== false) return [];
    const tavern = (() => {
      try { if (window.TavernHelper) return window.TavernHelper; } catch { /* ignore */ }
      try { if (parent?.TavernHelper) return parent.TavernHelper; } catch { /* ignore */ }
      try { if (globalThis.TavernHelper) return globalThis.TavernHelper; } catch { /* ignore */ }
      return null;
    })();
    const getModelList = tavern?.getModelList || window.getModelList;
    if (typeof getModelList !== 'function') throw new Error('getModelList unavailable');
    const models = await getModelList({ apiurl: normalized.apiUrl, key: normalized.apiKey });
    if (!isModuleEnabled()) throw new Error('db-map module disabled');
    return normalizeMapModelList(models);
  }

  function saveConfig(config) {
    const normalized = {
      followDatabaseApi: config?.followDatabaseApi !== false,
      apiUrl: normalizeMapConfigValue(config?.apiUrl), apiKey: normalizeMapConfigValue(config?.apiKey),
      model: normalizeMapConfigValue(config?.model), enableMapGeneration: config?.enableMapGeneration !== false,
      modelList: normalizeMapModelList(config?.modelList),
    };
    localStorage.setItem(MAP_CONFIG_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function resetConfig() { localStorage.removeItem(MAP_CONFIG_STORAGE_KEY); return getMapAiConfig(); }
  function clearCache() { Object.keys(mapCache).forEach(key => delete mapCache[key]); }
  function diagnose() {
    const config = getMapAiConfig();
    return { enabled: isModuleEnabled(), busy: mapBusy, cacheCount: Object.keys(mapCache).length,
      apiMode: config.followDatabaseApi === false ? 'custom' : 'database', callbackRegistered: Boolean(registeredTableUpdateApi), lastError };
  }

  const themeChanged = () => rerenderAll();
  document.addEventListener('story-ui-theme-changed', themeChanged);

  moduleDefinition = {
    id: MODULE_ID, version: MODULE_VERSION, priority: 90, enabled: true,
    renderContent: () => { const host = document.createElement('div'); host.innerHTML = renderMapShell(); return host.firstElementChild; },
    mount, onEnable, onDisable,
    cleanup() {
      if (disposed) return;
      disposed = true;
      onDisable();
      document.removeEventListener('story-ui-theme-changed', themeChanged);
    },
    management: { getConfig: getMapAiConfig, saveConfig, resetConfig, fetchModels, clearCache, diagnose },
  };
  ui.registry?.register?.(moduleDefinition);
})();
