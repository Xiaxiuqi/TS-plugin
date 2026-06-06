(() => {
  const ui = (window.StoryRegexUI = window.StoryRegexUI || {});
  const dom = ui.dom;
  const MODULE_ID = 'db-status-bar';
  const MODULE_VERSION = '1.0.0-lite_test';
  const SINGLE_TAG = '<DbStatusBar/>';
  const MAP_INSTANCE_ID = `${MODULE_ID}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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
  function safeAvatarSrc(v) {
    const s = String(v ?? '').trim();
    return /^(data:image\/|blob:|https?:\/\/)/i.test(s) ? s : '';
  }
  function avatarImg(src, style) {
    const safe = safeAvatarSrc(src);
    return safe ? `<img src="${esc(safe)}"${style ? ` style="${style}"` : ''}>` : '';
  }
  function avatarContent(src, name, style) {
    return avatarImg(src, style) || `<span class="db-sb-avatar-placeholder">${esc(String(name || '').charAt(0) || '?')}</span>`;
  }

  function getAvatarSrc(name) {
    try {
      return safeAvatarSrc(localStorage.getItem('db-avatar-' + name) || '');
    } catch(e) {
      return '';
    }
  }

  function normalizeMapConfigValue(value) {
    return String(value ?? '').trim();
  }

  function normalizeMapModelList(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map(item => normalizeMapConfigValue(item)).filter(Boolean))];
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
      if (!raw) return { ...EMPTY_MAP_CONFIG };
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return { ...EMPTY_MAP_CONFIG };
      const hasExplicitMode = typeof parsed.followDatabaseApi === 'boolean';
      const modelList = normalizeMapModelList(parsed.modelList);
      const model = normalizeMapConfigValue(parsed.model);
      if (model && !modelList.includes(model)) modelList.unshift(model);
      return {
        followDatabaseApi: hasExplicitMode ? parsed.followDatabaseApi : !hasUsableMapCustomConfig(parsed),
        apiUrl: normalizeMapConfigValue(parsed.apiUrl),
        apiKey: normalizeMapConfigValue(parsed.apiKey),
        model,
        enableMapGeneration: parsed.enableMapGeneration !== false,
        modelList,
      };
    } catch (e) {
      console.warn('[db-status-bar] read map AI config failed:', e);
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
      if (typeof candidate?.generate === 'function') return candidate.generate.bind(candidate);
    }
    return null;
  }

  function buildMapCustomApi(config) {
    if (config?.followDatabaseApi !== false) return null;
    const customApi = {};
    if (config.apiUrl) customApi.apiurl = config.apiUrl;
    if (config.apiKey) customApi.key = config.apiKey;
    if (config.model) customApi.model = config.model;
    if (Object.keys(customApi).length === 0) return null;
    customApi.max_tokens = 4000;
    return customApi;
  }

  async function callMapAI(api, prompt) {
    const messages = [{ role: 'user', content: prompt }];
    const options = buildMapAiOptions();
    const config = getMapAiConfig();
    const generate = getTavernHelperGenerate();
    const customApi = buildMapCustomApi(config);
    const shouldUseCustomApi = hasMapCustomApiConfig(config);

    if (generate && shouldUseCustomApi && customApi) {
      try {
        const result = await generate({
          user_input: prompt,
          should_silence: true,
          max_chat_history: 0,
          custom_api: customApi,
        });
        if (typeof result === 'string' && result.trim()) return result;
        console.warn('[db-status-bar] TavernHelper.generate returned no usable map text, using fallback map');
        return '';
      } catch (e) {
        console.warn('[db-status-bar] TavernHelper.generate failed, using fallback map:', e);
        return '';
      }
    }

    if (shouldUseCustomApi) {
      console.warn('[db-status-bar] custom map API is configured but TavernHelper.generate is unavailable, using fallback map');
      return '';
    }

    if (!api || typeof api.callAI !== 'function') {
      console.warn('[db-status-bar] no available map AI generator');
      return '';
    }

    try {
      return await api.callAI(messages, options);
    } catch (e) {
      console.warn('[db-status-bar] database plugin callAI failed:', e);
      return '';
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
    if (!raw || typeof DOMParser !== 'function' || typeof XMLSerializer !== 'function') return '';
    try {
      const doc = new DOMParser().parseFromString(raw, 'image/svg+xml');
      if (doc.querySelector('parsererror')) return '';
      const svg = doc.documentElement;
      if (!svg || String(svg.tagName || '').toLowerCase() !== 'svg') return '';
      sanitizeSvgNode(svg);
      const viewBox = svg.getAttribute('viewBox') || svg.getAttribute('viewbox') || '';
      if (!/^\s*-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s*$/.test(viewBox)) return '';
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      return new XMLSerializer().serializeToString(svg);
    } catch (e) {
      console.warn('[db-status-bar] sanitize SVG failed:', e);
      return '';
    }
  }

  function extractSvgMarkup(value) {
    const match = String(value ?? '').match(/<svg[\s\S]*<\/svg>/i);
    return match ? match[0] : '';
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

  function renderMapMarker(el, i, cx, cy, color, radius = 16, nameOffset = 30) {
    const name = el.name || '';
    const avatarSrc = getAvatarSrc(name);
    const safeIdx = mapIndex(i);
    const safeCx = mapNum(cx, 0);
    const safeCy = mapNum(cy, 0);
    const safeRadius = Math.max(2, mapNum(radius, 16));
    const safeNameOffset = mapNum(nameOffset, 30);
    const safeColor = MAP_COLOR_MAP[el.type] || color || '#999';
    const clipId = `db-map-avatar-${MAP_INSTANCE_ID}-${safeIdx}`;
    const base = `<circle cx="${safeCx}" cy="${safeCy}" r="${safeRadius}" fill="${esc(safeColor)}" stroke="#fff" stroke-width="2"/><text x="${safeCx}" y="${safeCy + 5}" text-anchor="middle" fill="#fff" font-size="11" font-weight="bold">${esc(String(name).charAt(0) || '')}</text>`;
    const avatar = avatarSrc ? `<defs><clipPath id="${clipId}"><circle cx="${safeCx}" cy="${safeCy}" r="${safeRadius - 1}"/></clipPath></defs><image href="${esc(avatarSrc)}" x="${safeCx - safeRadius + 1}" y="${safeCy - safeRadius + 1}" width="${(safeRadius - 1) * 2}" height="${(safeRadius - 1) * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>` : '';
    return `<g class="cm" data-idx="${esc(safeIdx)}">${base}${avatar}<circle cx="${safeCx}" cy="${safeCy}" r="${safeRadius + 3}" fill="none" stroke="${esc(safeColor)}" stroke-width="1.5" opacity="0.45"/><text x="${safeCx}" y="${safeCy + safeNameOffset}" text-anchor="middle" fill="${esc(safeColor)}" font-size="9">${esc(name)}</text></g>`;
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

  function clamp(v, max) { const n = Number(v) || 0; const m = Number(max) || 1; return m <= 0 ? 0 : Math.max(0, Math.min(100, (n / m) * 100)); }

  function getState() { return ui.dbStatusData?.GameState || {}; }

  function rarityTag(label) { const r = ui.dbStatusData?.getRarityColor?.(label); if (!r) return esc(label || '--'); return `<span class="db-sb-rarity" style="color:${r.color};background:${r.bg};padding:1px 6px;border-radius:4px;font-size:10px">${esc(label)}</span>`; }
  function profBar(value) { const r = ui.dbStatusData?.parseProficiencyBar?.(value); if (!r) return esc(value || '--'); const rc = ui.dbStatusData?.getRarityColor?.(r.stage); const barColor = rc ? rc.color : r.color; return `<div class="db-sb-meter prof"><div class="db-sb-meter-head"><span>${esc(r.stage)}</span><span>${r.num} / ${r.max}</span></div><div class="db-sb-meter-track"><span class="db-sb-meter-fill" style="width:${r.percent}%;background:${barColor}90"></span></div></div>`; }

  // --- Render Shell ---
  function renderStatusShell() {
    const theme = ui.theme?.getTheme?.() || 'day';
    const S = getState();
    return `
<section class="story-ui-root db-status-bar theme-${theme}" data-story-ui-module="${MODULE_ID}">
  <main class="db-sb-root">
    ${renderWorldStrip(S)}
    ${renderCharacterPanel(S, theme)}
    ${renderFunctionPanel(S, theme)}
  </main>
</section>`;
  }

  // --- World Strip ---
  function renderWorldStrip(S) {
    return `
    <section class="db-sb-world-strip">
      <span class="db-sb-world-title">✦ 世界状态</span>
      <span class="db-sb-world-center">
        <span class="db-sb-world-item"><span class="db-sb-label">时间</span><span class="db-sb-value">${esc(S.time || '--')}</span></span>
        <span class="db-sb-world-sep"></span>
        <span class="db-sb-world-item"><span class="db-sb-label">地点</span><span class="db-sb-value">${esc(S.location || '--')}</span></span>
      </span>
    </section>`;
  }

  // --- Character Panel ---
  function renderCharacterPanel(S, theme) {
    const chars = (S.characters || []).filter(c => !c.isAbsent);
    const pName = (S.protagonist && S.protagonist.name) || '主角';
    let tabs = `<span class="db-sb-tab active" data-tab="char-protagonist">${esc(pName)}</span>`;
    chars.forEach((c, i) => { tabs += `<span class="db-sb-tab" data-tab="char-${i}">${esc(c.name)}</span>`; });

    let contents = `<div class="db-sb-tab-content active" data-tab-content="char-protagonist">${renderProtagonistContent(S)}</div>`;
    chars.forEach((c, i) => { contents += `<div class="db-sb-tab-content" data-tab-content="char-${i}">${renderCharacterContent(c, S)}</div>`; });

    return `
    <section class="db-sb-panel">
      <div class="db-sb-header" data-db-toggle="char-body">
        <span class="db-sb-mark">✧</span>
        <div><div class="db-sb-title">角色档案</div><div class="db-sb-subtitle">CHARACTER ARCHIVE</div></div>
        <span class="db-sb-toggle-icon">▼</span>
      </div>
      <div class="db-sb-body" id="db-char-body">
        <div class="db-sb-tabs" data-tab-group="characters">
          <div class="db-sb-tab-bar">${tabs}</div>
          ${contents}
        </div>
        <div class="db-sb-inv-section">
          ${renderInventoryTab(S)}
        </div>
      </div>
    </section>`;
  }

  // --- Protagonist Content (Left/Right Layout) ---
  function renderProtagonistContent(S) {
    const p = S.protagonist || {};
    const s = S.stats || {};
    const ce = s.cursedEnergy || {};
    const charName = p.name || '';
    const techs = (S.techniques || []).filter(t => t.owner === charName);
    const shiki = (S.shikigami || []).filter(sk => sk.owner === charName);
    const binds = (S.bindings || []).filter(b => b.parties && b.parties.includes(charName));

    // Left column - avatar header + stats below
    let left = '';
    const avatarSrc = (() => { try { return localStorage.getItem('db-avatar-' + charName) || ''; } catch(e) { return ''; } })();
    left += `<div class="db-sb-char-header-row"><div class="db-sb-avatar-box" data-avatar-char="${esc(charName)}"><div class="db-sb-avatar">${avatarContent(avatarSrc, charName)}</div></div><div class="db-sb-char-header-info"><div class="db-sb-stat-row db-sb-char-key-stat"><span class="db-sb-stat-name">姓名</span><span class="db-sb-stat-value">${esc(p.name || '--')}</span></div>${p.occupation ? '<div class="db-sb-stat-row db-sb-char-key-stat"><span class="db-sb-stat-name">职业/身份</span><span class="db-sb-stat-value">' + esc(p.occupation) + '</span></div>' : ''}${s.level != null && s.level !== '' ? '<div class="db-sb-stat-row db-sb-char-key-stat"><span class="db-sb-stat-name">等级</span><span class="db-sb-stat-value">Lv.' + esc(s.level) + '</span></div>' : ''}${p.uniqueAbilities ? '<div class="db-sb-stat-row db-sb-char-key-stat"><span class="db-sb-stat-name">独特能力</span><span class="db-sb-stat-value">' + esc(p.uniqueAbilities) + '</span></div>' : ''}${s.kp != null && s.kp !== '' ? '<div class="db-sb-stat-row db-sb-char-key-stat"><span class="db-sb-stat-name">KP</span><span class="db-sb-stat-value">' + esc(s.kp) + '</span></div>' : ''}</div></div>`;
    if (s.exp != null && s.exp !== '') { left += `<div class="db-sb-meter exp"><div class="db-sb-meter-head"><span>EXP</span><span>${esc(s.exp)} / 100</span></div><div class="db-sb-meter-track"><span class="db-sb-meter-fill exp" style="width:${clamp(s.exp, 100)}%"></span></div></div>`; }
    if (ce.total != null && ce.total !== '') { left += `<div class="db-sb-meter energy"><div class="db-sb-meter-head"><span>咒力</span><span>${esc(ce.current)} / ${esc(ce.total)}</span></div><div class="db-sb-meter-track"><span class="db-sb-meter-fill energy" style="width:${clamp(ce.current, ce.total)}%"></span></div></div>`; }
    if (ce.precision != null || ce.costRate != null) { left += `<div class="db-sb-aux-row">${ce.precision != null && ce.precision !== '' ? '<span class="db-sb-aux-label">精度 <strong>' + esc(ce.precision) + '</strong></span>' : ''}${ce.costRate != null && ce.costRate !== '' ? '<span class="db-sb-aux-label">倍率 <strong>x' + esc(ce.costRate) + '</strong></span>' : ''}</div>`; }
    if (p.cursedTools) { left += `<div class="db-sb-stat-row"><span class="db-sb-stat-name">持有咒具</span><span class="db-sb-stat-value">${esc(p.cursedTools)}</span></div>`; }
    if (p.currentStatus) { left += `<div class="db-sb-stat-row"><span class="db-sb-stat-name">当前状态</span><span class="db-sb-stat-value">${esc(p.currentStatus)}</span></div>`; }
    if (p.permanentInjuries) { left += `<div class="db-sb-stat-row"><span class="db-sb-stat-name">永久损伤</span><span class="db-sb-stat-value">${esc(p.permanentInjuries)}</span></div>`; }
    if (s.basePhysical != null && s.basePhysical !== '') { left += `<div class="db-sb-stat-row"><span class="db-sb-stat-name">基础肉体值</span><span class="db-sb-stat-value">${esc(s.basePhysical)}</span></div>`; }
    if (s.martialArts != null && s.martialArts !== '') { left += `<div class="db-sb-stat-row"><span class="db-sb-stat-name">武艺值</span><span class="db-sb-stat-value">${esc(s.martialArts)}</span></div>`; }
    if (s.techniquePotential) { left += `<div class="db-sb-stat-row"><span class="db-sb-stat-name">术式潜力等级</span><span class="db-sb-stat-value">${rarityTag(s.techniquePotential)}</span></div>`; }
    if (s.techniqueProficiency) { left += `<div class="db-sb-stat-row"><span class="db-sb-stat-name">术式精通等级</span><span class="db-sb-stat-value">${rarityTag(s.techniqueProficiency)}</span></div>`; }
    if (s.burnout) { const burnoutVal = s.burnout; left += `<div class="db-sb-stat-row"><span class="db-sb-stat-name">术式熔断与修复</span><span class="db-sb-stat-value" style="color:${burnoutVal === '否' ? '#617f58' : '#b54a4a'}">${esc(burnoutVal)}</span></div>`; }

    // Right column
    let right = '';
    if (p.innateTechnique) { right += `<div class="db-sb-card"><div class="db-sb-mini-title">[生得术式] ${esc(p.innateTechnique)}</div><div class="db-sb-mini-body"><p>${esc(p.techniqueIntro || '--')}</p></div></div>`; }
    if (p.domainExpansion && p.domainExpansion !== '未习得') { right += `<div class="db-sb-stat-row"><span class="db-sb-c-lbl">领域:</span> <span class="db-sb-stat-value">${esc(p.domainExpansion)}</span></div>`; }
    if (p.reverseTechnique && p.reverseTechnique !== '未习得') { right += `<div class="db-sb-stat-row"><span class="db-sb-c-lbl">反转术式:</span> <span class="db-sb-stat-value">${esc(p.reverseTechnique)}</span></div>`; }

    // Extended techniques for protagonist
    if (techs.length > 0) {
      right += '<div class="db-sb-sub-section"><div class="db-sb-toggle-header" data-db-toggle-next>扩展术式 (' + techs.length + ') <span class="db-sb-toggle-icon collapsed">▼</span></div><div class="db-sb-toggle-content"><div class="db-sb-mini-grid">';
      techs.forEach(t => { right += `<div class="db-sb-mini-card"><div class="db-sb-mini-title">${esc(t.name)}</div><div class="db-sb-mini-body"><p><span class="db-sb-c-lbl">类型:</span> ${esc(t.type)}</p>${profBar(t.proficiency)}<p><span class="db-sb-c-lbl">效果:</span> ${esc(t.effect)}</p></div></div>`; });
      right += '</div></div></div>';
    }

    // Shikigami for protagonist
    if (shiki.length > 0) {
      right += '<div class="db-sb-sub-section"><div class="db-sb-toggle-header" data-db-toggle-next>式神/咒灵 (' + shiki.length + ') <span class="db-sb-toggle-icon collapsed">▼</span></div><div class="db-sb-toggle-content"><div class="db-sb-mini-grid">';
      shiki.forEach(sk => { const stColor = sk.status === '生效中' ? '#617f58' : sk.status === '封印中' ? '#b54a4a' : sk.status === '待命' ? '#a6782a' : sk.status === '消亡' ? '#6f6255' : ''; right += `<div class="db-sb-mini-card"><div class="db-sb-mini-title">${esc(sk.name)}</div><div class="db-sb-mini-body"><p><span class="db-sb-c-lbl">类型:</span> ${esc(sk.type)}</p><p><span class="db-sb-c-lbl">术式:</span> ${esc(sk.technique)}</p><p><span class="db-sb-c-lbl">战力:</span> ${rarityTag(sk.powerRank)}</p><p><span class="db-sb-c-lbl">状态:</span> <span style="${stColor ? 'color:' + stColor : ''}">${esc(sk.status)}</span></p></div></div>`; });
      right += '</div></div></div>';
    }

    // Bindings for protagonist
    if (binds.length > 0) {
      right += '<div class="db-sb-sub-section"><div class="db-sb-sub-title">束缚 (' + binds.length + ')</div><div class="db-sb-mini-grid">';
      binds.forEach(b => { const bStColor = b.status === '生效中' ? '#617f58' : b.status === '已违约' ? '#b54a4a' : b.status === '已解除' ? '#6f6255' : ''; right += `<div class="db-sb-mini-card"><div class="db-sb-mini-title">${esc(b.name)}</div><div class="db-sb-mini-body"><p><span class="db-sb-c-lbl">缔结方:</span> ${esc(b.parties)}</p><p><span class="db-sb-c-lbl">条件:</span> ${esc(b.condition)}</p><p><span class="db-sb-c-lbl">代价:</span> ${esc(b.risk)}</p><p><span class="db-sb-c-lbl">违约:</span> <span style="color:#b54a4a">${esc(b.penalty)}</span></p><p><span class="db-sb-c-lbl">状态:</span> <span style="${bStColor ? 'color:' + bStColor : ''}">${esc(b.status)}</span></p></div></div>`; });
      right += '</div></div>';
    }

    return `
      <div class="db-sb-char-layout">
        <div class="db-sb-char-left">${left}</div>
        <div class="db-sb-char-right">${right}</div>
      </div>`;
  }

  // --- NPC Character Content (Left/Right Layout) ---
  function renderCharacterContent(c, S) {
    const affW = (Math.min(Math.abs(c.affection), 100) / 100) * 50;
    const trustW = (Math.min(Math.abs(c.trust), 100) / 100) * 50;
    const affClass = c.affection >= 0 ? 'positive' : 'negative';
    const trustClass = c.trust >= 0 ? 'trust-pos' : 'trust-neg';
    const affStyle = c.affection >= 0 ? `left:50%;width:${affW}%` : `right:50%;width:${affW}%`;
    const trustStyle = c.trust >= 0 ? `left:50%;width:${trustW}%` : `right:50%;width:${trustW}%`;

    const techs = (S.techniques || []).filter(t => t.owner === c.name);
    const shiki = (S.shikigami || []).filter(sk => sk.owner === c.name);
    const binds = (S.bindings || []).filter(b => b.parties && b.parties.includes(c.name));

    // Left column - avatar header + stats below
    let left = '';
    const avatarSrc = (() => { try { return localStorage.getItem('db-avatar-' + c.name) || ''; } catch(e) { return ''; } })();
    left += `<div class="db-sb-char-header-row"><div class="db-sb-avatar-box" data-avatar-char="${esc(c.name)}"><div class="db-sb-avatar">${avatarContent(avatarSrc, c.name)}</div></div><div class="db-sb-char-header-info"><div class="db-sb-stat-row db-sb-char-key-stat"><span class="db-sb-stat-name">姓名</span><span class="db-sb-stat-value">${esc(c.name)}</span></div><div class="db-sb-stat-row db-sb-char-key-stat"><span class="db-sb-stat-name">职业/身份</span><span class="db-sb-stat-value">${esc(c.occupation || '--')}</span></div><div class="db-sb-stat-row db-sb-char-key-stat"><span class="db-sb-stat-name">战力等级</span><span class="db-sb-stat-value">${rarityTag(c.powerLevel)}</span></div></div></div>`;
    left += `<div class="db-sb-stat-row"><span class="db-sb-stat-name">当前状态</span><span class="db-sb-stat-value">${esc(c.currentStatus || '--')}</span></div>`;
    left += `<div class="db-sb-stat-row"><span class="db-sb-stat-name">BPA(肉体)</span><span class="db-sb-stat-value">${esc(c.bpA || '--')}</span></div>`;
    left += `<div class="db-sb-stat-row"><span class="db-sb-stat-name">BPB(术式)</span><span class="db-sb-stat-value">${esc(c.bpB || '--')}</span></div>`;
    left += `<div class="db-sb-stat-row"><span class="db-sb-stat-name">生得术式</span><span class="db-sb-stat-value">${esc(c.innateTechnique || '--')}</span></div>`;
    left += `<div class="db-sb-stat-row"><span class="db-sb-stat-name">领域</span><span class="db-sb-stat-value">${esc(c.domain || '--')}</span></div>`;
    left += `<div class="db-sb-stat-row"><span class="db-sb-stat-name">关系阶段</span><span class="db-sb-stat-value">${esc(c.relationStage || '--')}</span></div>`;
    left += `<div class="db-sb-stat-row"><span class="db-sb-stat-name">好感度 ${c.affection}</span></div><div class="db-sb-relation-bar"><div class="center-line"></div><div class="fill ${affClass}" style="${affStyle}"></div></div>`;
    left += `<div class="db-sb-stat-row"><span class="db-sb-stat-name">信任度 ${c.trust}</span></div><div class="db-sb-relation-bar"><div class="center-line"></div><div class="fill ${trustClass}" style="${trustStyle}"></div></div>`;

    // Right column
    let right = '';
    if (techs.length > 0) {
      right += '<div class="db-sb-sub-section"><div class="db-sb-toggle-header" data-db-toggle-next>扩展术式 (' + techs.length + ') <span class="db-sb-toggle-icon collapsed">▼</span></div><div class="db-sb-toggle-content"><div class="db-sb-mini-grid">';
      techs.forEach(t => { right += `<div class="db-sb-mini-card"><div class="db-sb-mini-title">${esc(t.name)}</div><div class="db-sb-mini-body"><p><span class="db-sb-c-lbl">类型:</span> ${esc(t.type)}</p>${profBar(t.proficiency)}<p><span class="db-sb-c-lbl">效果:</span> ${esc(t.effect)}</p></div></div>`; });
      right += '</div></div></div>';
    }
    if (shiki.length > 0) {
      right += '<div class="db-sb-sub-section"><div class="db-sb-toggle-header" data-db-toggle-next>式神/咒灵 (' + shiki.length + ') <span class="db-sb-toggle-icon collapsed">▼</span></div><div class="db-sb-toggle-content"><div class="db-sb-mini-grid">';
      shiki.forEach(sk => { const stColor = sk.status === '生效中' ? '#617f58' : sk.status === '封印中' ? '#b54a4a' : sk.status === '待命' ? '#a6782a' : sk.status === '消亡' ? '#6f6255' : ''; right += `<div class="db-sb-mini-card"><div class="db-sb-mini-title">${esc(sk.name)}</div><div class="db-sb-mini-body"><p><span class="db-sb-c-lbl">类型:</span> ${esc(sk.type)}</p><p><span class="db-sb-c-lbl">术式:</span> ${esc(sk.technique)}</p><p><span class="db-sb-c-lbl">战力:</span> ${rarityTag(sk.powerRank)}</p><p><span class="db-sb-c-lbl">状态:</span> <span style="${stColor ? 'color:' + stColor : ''}">${esc(sk.status)}</span></p></div></div>`; });
      right += '</div></div></div>';
    }
    if (binds.length > 0) {
      right += '<div class="db-sb-sub-section"><div class="db-sb-toggle-header" data-db-toggle-next>束缚 (' + binds.length + ') <span class="db-sb-toggle-icon collapsed">▼</span></div><div class="db-sb-toggle-content"><div class="db-sb-mini-grid">';
      binds.forEach(b => { const bStColor = b.status === '生效中' ? '#617f58' : b.status === '已违约' ? '#b54a4a' : b.status === '已解除' ? '#6f6255' : ''; right += `<div class="db-sb-mini-card"><div class="db-sb-mini-title">${esc(b.name)}</div><div class="db-sb-mini-body"><p><span class="db-sb-c-lbl">缔结方:</span> ${esc(b.parties)}</p><p><span class="db-sb-c-lbl">条件:</span> ${esc(b.condition)}</p><p><span class="db-sb-c-lbl">代价:</span> ${esc(b.risk)}</p><p><span class="db-sb-c-lbl">违约:</span> <span style="color:#b54a4a">${esc(b.penalty)}</span></p><p><span class="db-sb-c-lbl">状态:</span> <span style="${bStColor ? 'color:' + bStColor : ''}">${esc(b.status)}</span></p></div></div>`; });
      right += '</div></div></div>';
    }
    if (!right) { right = '<div class="db-sb-empty">暂无关联数据</div>'; }

    return `
      <div class="db-sb-char-layout">
        <div class="db-sb-char-left">${left}</div>
        <div class="db-sb-char-right">${right}</div>
      </div>`;
  }

  // --- Function Panel (Map persistent + Quest overlay) ---
  function renderFunctionPanel(S, theme) {
    return `
    <section class="db-sb-panel">
      <div class="db-sb-header" data-db-toggle="fn-body">
        <span class="db-sb-mark">✦</span>
        <div><div class="db-sb-title">地图与任务</div><div class="db-sb-subtitle">MAP & QUEST</div></div>
        <span class="db-sb-toggle-icon">▼</span>
      </div>
      <div class="db-sb-body" id="db-fn-body">
        <div class="db-sb-fn-layout">
          <div class="db-sb-fn-toolbar">
            <button class="db-sb-fn-btn" data-fn-action="quest">任务</button>
            <button class="db-sb-fn-btn" data-map-action="refresh">⟳ 刷新地图</button>
            <button class="db-sb-fn-btn" data-map-action="redraw">✧ 重绘地图</button>
          </div>
          <div class="db-sb-quest-overlay" id="db-quest-overlay" style="display:none">
            <div class="db-sb-quest-header"><span class="db-sb-sub-title">任务列表</span><button class="db-sb-quest-close" data-quest-close>✕</button></div>
            <div class="db-sb-quest-list">${renderQuestTab(S)}</div>
          </div>
          <div class="db-sb-map-area">
            ${renderMapTab(S)}
          </div>
        </div>
      </div>
    </section>`;
  }

  // --- Technique Tab (retained for reuse) ---
  function renderTechniqueTab(S, filterOwner) {
    const p = S.protagonist || {};
    const techs = filterOwner ? (S.techniques || []).filter(t => t.owner === filterOwner) : (S.techniques || []);
    let html = '';
    if (!filterOwner && p.innateTechnique) {
      html += `<div class="db-sb-card" style="margin-bottom:8px"><div class="db-sb-mini-title">[生得术式] ${esc(p.innateTechnique)}</div><div class="db-sb-mini-body"><p>${esc(p.techniqueIntro || '--')}</p></div></div>`;
    }
    if (!filterOwner && p.domainExpansion && p.domainExpansion !== '未习得') {
      html += `<div class="db-sb-stat-row"><span class="db-sb-c-lbl">领域展开:</span> <span class="db-sb-stat-value">${esc(p.domainExpansion)}</span></div>`;
    }
    if (!filterOwner && p.reverseTechnique && p.reverseTechnique !== '未习得') {
      html += `<div class="db-sb-stat-row"><span class="db-sb-c-lbl">反转术式:</span> <span class="db-sb-stat-value">${esc(p.reverseTechnique)}</span></div>`;
    }
    if (techs.length > 0) {
      html += '<div class="db-sb-mini-grid">';
      techs.forEach(t => {
        html += `<div class="db-sb-mini-card"><div class="db-sb-mini-title">${esc(t.name)}</div><div class="db-sb-mini-body"><p><span class="db-sb-c-lbl">类型:</span> ${esc(t.type)}</p><p><span class="db-sb-c-lbl">熟练度:</span> ${esc(t.proficiency)}</p><p><span class="db-sb-c-lbl">效果:</span> ${esc(t.effect)}</p></div></div>`;
      });
      html += '</div>';
    } else {
      html += '<div class="db-sb-empty">暂无扩展术式</div>';
    }
    return html;
  }

  // --- Shikigami Tab (retained for reuse) ---
  function renderShikigamiTab(S, filterOwner) {
    const list = filterOwner ? (S.shikigami || []).filter(s => s.owner === filterOwner) : (S.shikigami || []);
    if (list.length === 0) return '<div class="db-sb-empty">暂无式神/咒灵</div>';
    let html = '<div class="db-sb-mini-grid">';
    list.forEach(s => {
      html += `<div class="db-sb-mini-card"><div class="db-sb-mini-title">${esc(s.name)}</div><div class="db-sb-mini-body"><p><span class="db-sb-c-lbl">类型:</span> ${esc(s.type)}</p><p><span class="db-sb-c-lbl">术式:</span> ${esc(s.technique)}</p><p><span class="db-sb-c-lbl">战力:</span> ${esc(s.powerRank)}</p><p><span class="db-sb-c-lbl">状态:</span> ${esc(s.status)}</p></div></div>`;
    });
    html += '</div>';
    return html;
  }

  // --- Binding Tab (retained for reuse) ---
  function renderBindingTab(S, filterName) {
    const list = filterName ? (S.bindings || []).filter(b => b.parties && b.parties.includes(filterName)) : (S.bindings || []);
    if (list.length === 0) return '<div class="db-sb-empty">暂无束缚</div>';
    let html = '<div class="db-sb-mini-grid">';
    list.forEach(b => {
      html += `<div class="db-sb-mini-card"><div class="db-sb-mini-title">${esc(b.name)}</div><div class="db-sb-mini-body"><p><span class="db-sb-c-lbl">缔结方:</span> ${esc(b.parties)}</p><p><span class="db-sb-c-lbl">条件:</span> ${esc(b.condition)}</p><p><span class="db-sb-c-lbl">代价:</span> ${esc(b.risk)}</p><p><span class="db-sb-c-lbl">违约:</span> ${esc(b.penalty)}</p><p><span class="db-sb-c-lbl">状态:</span> ${esc(b.status)}</p></div></div>`;
    });
    html += '</div>';
    return html;
  }

  // --- Inventory Tab ---
  // --- Inventory Panel (物品栏 - collapsible) ---
  function renderInventoryTab(S) {
    const list = S.inventory || [];
    if (list.length === 0) return '<div class="db-sb-inv-bar"><div class="db-sb-inv-bar-header" data-inv-toggle><span class="db-sb-inv-title">物品栏</span><span class="db-sb-toggle-icon collapsed">▼</span></div></div>';

    // Currency display
    const pName = String((S.protagonist && S.protagonist.name) || '').trim();
    const currencies = list.filter(i => String(i.category || '').trim() === '货币' && (!pName || String(i.owner || '').trim() === pName));
    let currencyHtml = '';
    if (currencies.length > 0) {
      currencyHtml = currencies.map(c => `<span class="db-sb-inv-coin">${esc(c.name)}:${esc(c.quantity)}</span>`).join('');
    }

    // Owner-based grouping (conditional)
    const hasOwner = list.some(i => i.owner && i.owner.trim());
    const owners = hasOwner ? ['全部', ...new Set(list.map(i => i.owner).filter(Boolean))] : [];

    // Category list
    const categories = ['全部', ...new Set(list.map(i => i.category).filter(Boolean))];

    let html = '<div class="db-sb-inv-bar">';
    // Header bar: title + currency + recycle button + toggle
    html += `<div class="db-sb-inv-bar-header" data-inv-toggle><span class="db-sb-inv-title">物品栏</span><span class="db-sb-inv-currency">${currencyHtml}</span><button class="db-sb-inv-recycle-btn" data-inv-action="recycle">再利用</button><span class="db-sb-toggle-icon collapsed">▼</span></div>`;

    // Collapsible content (hidden by default)
    html += '<div class="db-sb-inv-bar-content" style="display:none">';

    // Tab bar: owner tabs + category tabs in one line
    html += '<div class="db-sb-inv-tab-bar">';
    if (hasOwner && owners.length > 1) {
      owners.forEach((o, i) => { html += `<span class="db-sb-tab${i === 0 ? ' active' : ''}" data-owner-filter="${esc(o)}">${esc(o)}</span>`; });
      html += '<span class="db-sb-inv-tab-sep">|</span>';
    }
    categories.forEach((c, i) => { html += `<span class="db-sb-tab${i === 0 ? ' active' : ''}" data-filter="${esc(c)}">${esc(c)}</span>`; });
    html += '</div>';

    // Item list (5 rows visible, scroll beyond)
    html += '<div class="db-sb-inv-list" id="db-inventory-grid">';
    const getCatColor = ui.dbStatusData?.getCategoryColor || (() => '');
    list.forEach(item => {
      const catColor = getCatColor(item.category);
      const catStyle = catColor ? `color:${catColor}` : '';
      html += `<div class="db-sb-inv-card" data-category="${esc(item.category)}" data-owner="${esc(item.owner || '')}">
        <div class="db-sb-inv-card-name">${esc(item.name)}</div>
        <div class="db-sb-inv-card-qty">x${esc(item.quantity)}</div>
        <div class="db-sb-inv-card-cat" style="${catStyle}">${esc(item.category || '')}</div>
        ${item.desc ? '<div class="db-sb-inv-card-desc">' + esc(item.desc) + '</div>' : ''}
      </div>`;
    });
    html += '</div>';

    // Recycle panel (hidden) - full action bar
    html += '<div class="db-sb-inv-recycle-panel" id="db-inv-recycle" style="display:none"><div class="db-sb-inv-recycle-header"><span class="db-sb-inv-recycle-hint">选择物品后执行动作</span><div class="db-sb-inv-recycle-actions"><span class="db-sb-tab active" data-recycle-mode="use">使用</span><span class="db-sb-tab" data-recycle-mode="destroy">销毁</span><span class="db-sb-tab" data-recycle-mode="synthesize">合成</span><span class="db-sb-tab" data-recycle-mode="gift">赠予</span><span class="db-sb-tab" data-recycle-mode="request">索取</span><span class="db-sb-tab" data-recycle-mode="discard">丢弃</span></div></div><div class="db-sb-inv-recycle-target" style="display:none"><span class="db-sb-inv-recycle-target-label">目标角色:</span><select class="db-sb-inv-recycle-target-select"></select></div><div class="db-sb-inv-recycle-footer"><button data-inv-action="recycle-confirm">确认</button><button data-inv-action="recycle-cancel">取消</button></div></div>';

    html += '</div></div>';
    return html;
  }


  // --- Quest Tab ---
  function renderQuestTab(S) {
    const list = S.quests || [];
    if (list.length === 0) return '<div class="db-sb-empty">暂无任务</div>';
    let html = '';
    list.forEach(q => {
      html += `<div class="db-sb-toggle-header" data-db-toggle-next>${esc(q.name)} <span style="margin-left:6px;font-size:10px;color:var(--db-gold)">[${esc(q.rating)}]</span> <span class="db-sb-toggle-icon collapsed">▼</span></div>`;
      html += `<div class="db-sb-toggle-content"><div class="db-sb-mini-body"><p><span class="db-sb-c-lbl">进度:</span> ${esc(q.progress || '--')}</p><p><span class="db-sb-c-lbl">委派方:</span> ${esc(q.client || '--')}</p><p><span class="db-sb-c-lbl">目标:</span> ${esc(q.target || '--')}</p><p><span class="db-sb-c-lbl">描述:</span> ${esc(q.desc || '--')}</p><p><span class="db-sb-c-lbl">报酬:</span> ${esc(q.reward || '--')}</p></div></div>`;
    });
    return html;
  }

  // --- Map Generation System (星穹铁道/原神/鸣潮 style) ---
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
  let lastCity = '';

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

  function fbMap(S) {
    const elements = S.mapElements || [];
    const area = S.location || '未知';
    let svg = '<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">';
    svg += '<rect width="800" height="600" fill="#f5ead0"/>';
    svg += '<rect x="10" y="10" width="780" height="580" fill="none" stroke="#d4a853" stroke-width="2" stroke-dasharray="6,3" rx="12"/>';
    svg += `<text x="400" y="35" text-anchor="middle" fill="#5c4033" font-size="16" font-weight="bold">${esc(area)}</text>`;
    elements.forEach((el, i) => {
      const color = MAP_COLOR_MAP[el.type] || '#8b7355';
      const point = resolveMapPoint(el, i);
      const { cx, cy } = point;
      const isChar = CHAR_TYPES.includes(el.type);
      if (isChar) {
        svg += renderMapMarker(el, i, cx, cy, color, 16, 30);
      } else {
        svg += renderMapLandMarker(el, i, cx, cy, color, 16);
      }
    });
    svg += '</svg>';
    return svg;
  }

  function defMap(S) {
    const area = S.location || '未知';
    return `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="600" fill="#f5ead0"/><rect x="10" y="10" width="780" height="580" fill="none" stroke="#d4a853" stroke-width="2" stroke-dasharray="6,3" rx="12"/><text x="400" y="35" text-anchor="middle" fill="#5c4033" font-size="16" font-weight="bold">${esc(area)}</text><circle cx="400" cy="300" r="20" fill="#ff5f9e" stroke="#fff" stroke-width="2.5"/><text x="400" y="305" text-anchor="middle" fill="#fff" font-size="12" font-weight="bold">你</text><text x="400" y="330" text-anchor="middle" fill="#5c4033" font-size="10">当前位置</text></svg>`;
  }

  async function doMap(root, force) {
    if (mapBusy) return;
    const S = getState();
    const loc = S.location || '未知';
    const config = getMapAiConfig();
    const mapGenerationEnabled = config.enableMapGeneration !== false;
    const viewport = root.querySelector('.db-sb-map-viewport');
    const previousMarkup = viewport ? viewport.innerHTML.trim() : '';
    const safePreviousMarkup = mapGenerationEnabled && previousMarkup ? sanitizeSVG(previousMarkup) : '';
    const previousCached = mapCache[loc] || '';
    const safePreviousCached = mapGenerationEnabled && previousCached ? sanitizeSVG(previousCached) : '';

    if (previousCached && safePreviousCached) mapCache[loc] = safePreviousCached;
    else if (previousCached) delete mapCache[loc];

    if (previousMarkup && safePreviousMarkup && previousMarkup !== safePreviousMarkup && viewport) {
      viewport.innerHTML = safePreviousMarkup;
      normalizeMapClickTargets(root);
    }

    if (!force && safePreviousCached) {
      if (viewport) {
        viewport.innerHTML = safePreviousCached;
        normalizeMapClickTargets(root);
      }
      return;
    }

    if (!force) {
      if (viewport) {
        const elements = S.mapElements || [];
        const fallbackSvg = sanitizeSVG(elements.length > 0 ? fbMap(S) : defMap(S));
        if (fallbackSvg) {
          viewport.innerHTML = fallbackSvg;
          normalizeMapClickTargets(root);
        } else {
          console.warn('[db-status-bar] fallback map SVG rejected by sanitizer');
        }
      }
      return;
    }

    mapBusy = true;
    const refreshBtn = root.querySelector('[data-map-action="refresh"]');
    const redrawBtn = root.querySelector('[data-map-action="redraw"]');
    if (refreshBtn) refreshBtn.disabled = true;
    if (redrawBtn) redrawBtn.disabled = true;

    try {
      let svg = '';
      let aiReturnedSvg = false;
      try {
        const api = ui.dbStatusData?.getAutoCardAPI?.();
        if (mapGenerationEnabled && ((api && typeof api.callAI === 'function') || getTavernHelperGenerate())) {
          const prompt = buildMapPrompt(S);
          const result = await callMapAI(api, prompt);
          if (result) {
            const rawSvg = extractSvgMarkup(result);
            aiReturnedSvg = Boolean(rawSvg);
            svg = sanitizeSVG(rawSvg);
            if (rawSvg && !svg) console.warn('[db-status-bar] AI map SVG rejected by sanitizer');
          }
        }
      } catch (e) {
        console.warn('[db-status-bar] AI map generation failed:', e);
      }

      if (svg) {
        mapCache[loc] = svg;
        if (viewport) {
          viewport.innerHTML = svg;
          normalizeMapClickTargets(root);
        }
        return;
      }

      const previousSvg = safePreviousMarkup || safePreviousCached;
      if (previousSvg) {
        if (viewport) {
          viewport.innerHTML = previousSvg;
          normalizeMapClickTargets(root);
        }
        if (safePreviousCached) mapCache[loc] = safePreviousCached;
        return;
      }

      if (mapGenerationEnabled && !aiReturnedSvg) console.warn('[db-status-bar] AI map generation returned no SVG, using fallback');
      if (viewport) {
        const elements = S.mapElements || [];
        const fallbackSvg = sanitizeSVG(elements.length > 0 ? fbMap(S) : defMap(S));
        if (fallbackSvg) {
          viewport.innerHTML = fallbackSvg;
          normalizeMapClickTargets(root);
        } else {
          console.warn('[db-status-bar] fallback map SVG rejected by sanitizer');
        }
      }
    } catch (e) {
      console.warn('[db-status-bar] map rendering failed:', e);
    } finally {
      mapBusy = false;
      if (refreshBtn) refreshBtn.disabled = false;
      if (redrawBtn) redrawBtn.disabled = false;
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
    // --- Fallback SVG 渲染 ---
    let svgElements = '';
    elements.forEach((el, i) => {
      const color = MAP_COLOR_MAP[el.type] || colorMap[el.type] || '#999';
      const point = resolveMapPoint(el, i);
      const { cx, cy } = point;
      if (CHAR_TYPES.includes(el.type)) {
        svgElements += renderMapMarker(el, i, cx, cy, color, 10, 22);
      } else {
        svgElements += renderMapLandMarker(el, i, cx, cy, color, 16);
      }
    });

    let legend = '';
    Object.entries(colorMap).forEach(([type, color]) => {
      legend += `<span class="db-sb-map-legend-item"><span class="db-sb-map-legend-color" style="background:${color}"></span>${type}</span>`;
    });

    return `
    <div class="db-sb-map-container">
      <div class="db-sb-map-header">
        <span class="db-sb-label">当前区域: ${esc(area)}</span>
      </div>
      <div class="db-sb-map-viewport">
        <svg viewBox="0 0 800 600" class="db-sb-map-svg" id="db-map-svg">
          <rect width="800" height="600" fill="#f5ead0"/>
          <text x="400" y="30" text-anchor="middle" fill="#5c4033" font-size="14" font-weight="bold" opacity="0.8">${esc(area)}</text>
          ${svgElements}
        </svg>
      </div>
      <div class="db-sb-map-legend">${legend}</div>
      <div class="db-sb-map-detail" id="db-map-detail"></div>
    </div>`;
  }

  // --- Combined inventory filter (owner + category) ---
  function applyInvFilter(root) {
    const grid = root.querySelector('#db-inventory-grid');
    if (!grid) return;
    const activeOwner = root.querySelector('[data-owner-filter].active');
    const activeCat = root.querySelector('.db-sb-inv-tab-bar .db-sb-tab[data-filter].active');
    const ownerVal = activeOwner ? activeOwner.dataset.ownerFilter : '\u5168\u90e8';
    const catVal = activeCat ? activeCat.dataset.filter : '\u5168\u90e8';
    grid.querySelectorAll('.db-sb-inv-card').forEach(item => {
      const matchOwner = ownerVal === '\u5168\u90e8' || item.dataset.owner === ownerVal;
      const matchCat = catVal === '\u5168\u90e8' || item.dataset.category === catVal;
      item.style.display = (matchOwner && matchCat) ? '' : 'none';
    });
  }


  // --- Interaction ---
  function bindEvents(root) {
    if (!root || root.dataset.dbBound) return;
    root.dataset.dbBound = 'true';

    root.addEventListener('click', e => {
      // Panel toggle
      const header = e.target.closest('[data-db-toggle]');
      if (header && root.contains(header)) {
        const body = header.nextElementSibling;
        if (body) {
          const hidden = body.classList.contains('hidden');
          body.classList.toggle('hidden', !hidden);
          const icon = header.querySelector('.db-sb-toggle-icon');
          if (icon) icon.classList.toggle('collapsed', !hidden);
        }
        return;
      }

      // Toggle-next
      const toggleNext = e.target.closest('[data-db-toggle-next]');
      if (toggleNext && root.contains(toggleNext)) {
        const content = toggleNext.nextElementSibling;
        if (content && content.classList.contains('db-sb-toggle-content')) {
          content.classList.toggle('open');
          const icon = toggleNext.querySelector('.db-sb-toggle-icon');
          if (icon) icon.classList.toggle('collapsed', !content.classList.contains('open'));
        }
        return;
      }

      // TAB click
      const tab = e.target.closest('.db-sb-tab');
      const tabGroup = tab ? tab.closest('.db-sb-tabs') : null;
      if (tab && tabGroup && root.contains(tab)) {
        const id = tab.dataset.tab;
        tabGroup.querySelectorAll('.db-sb-tab').forEach(t => t.classList.toggle('active', t === tab));
        tabGroup.querySelectorAll('.db-sb-tab-content').forEach(c => c.classList.toggle('active', c.dataset.tabContent === id));
        return;
      }

      // Filter click
      const filter = e.target.closest('.db-sb-filter');
      if (filter && root.contains(filter)) {
        const group = filter.closest('.db-sb-filters');
        if (!group) return;
        group.querySelectorAll('.db-sb-filter').forEach(f => f.classList.toggle('active', f === filter));
        const val = filter.dataset.filter;
        const grid = group.nextElementSibling;
        if (grid) {
          grid.querySelectorAll('.db-sb-mini-card').forEach(card => {
            card.style.display = (val === '全部' || card.dataset.category === val) ? '' : 'none';
          });
        }
        return;
      }
      // Map action (refresh / redraw)
      const mapActionBtn = e.target.closest('[data-map-action]');
      if (mapActionBtn && root.contains(mapActionBtn)) {
        const action = mapActionBtn.dataset.mapAction;
        if (action === 'refresh') { doMap(root, false); }
        else if (action === 'redraw') { doMap(root, true); }
        return;
      }



      // Map element click
      const mapEl = e.target.closest('.db-sb-map-viewport .cm[data-idx], .db-sb-map-viewport [data-idx]');
      if (mapEl && root.contains(mapEl)) {
        const idx = parseInt(mapEl.dataset.idx, 10);
        const S = getState();
        const elements = S.mapElements || [];
        const el = elements[idx];
        if (el) {
          const detail = root.querySelector('#db-map-detail');
          if (detail) {
            detail.innerHTML = `
              <div class="db-sb-card">
                <div class="db-sb-stat-row"><span class="db-sb-stat-name">名称</span><span class="db-sb-stat-value">${esc(el.name)}</span></div>
                <div class="db-sb-stat-row"><span class="db-sb-stat-name">类型</span><span class="db-sb-stat-value">${esc(el.type)}</span></div>
                <div class="db-sb-stat-row"><span class="db-sb-stat-name">状态</span><span class="db-sb-stat-value">${esc(el.status || '--')}</span></div>
                <div class="db-sb-stat-row"><span class="db-sb-stat-name">描述</span><span class="db-sb-stat-value">${esc(el.desc || '--')}</span></div>
                <div class="db-sb-stat-row"><span class="db-sb-stat-name">传说背景</span><span class="db-sb-stat-value">${esc(el.lore || '--')}</span></div>
              </div>`;
          }
        }
        return;
      }

      // Quest overlay toggle
      const questBtn = e.target.closest('[data-fn-action="quest"]');
      if (questBtn && root.contains(questBtn)) {
        const overlay = root.querySelector('#db-quest-overlay');
        if (overlay) { overlay.style.display = overlay.style.display === 'none' ? '' : 'none'; }
        return;
      }

      // Quest overlay close
      const questClose = e.target.closest('[data-quest-close]');
      if (questClose && root.contains(questClose)) {
        const overlay = root.querySelector('#db-quest-overlay');
        if (overlay) { overlay.style.display = 'none'; }
        return;
      }

      // Avatar click → show upload modal
      const avatarBox = e.target.closest('.db-sb-avatar-box');
      if (avatarBox && root.contains(avatarBox)) {
        const charName = avatarBox.dataset.avatarChar;
        showAvatarModal(charName, root);
        return;
      }

      // Inventory bar toggle (expand/collapse)
      const invToggle = e.target.closest('[data-inv-toggle]');
      if (invToggle && root.contains(invToggle) && !e.target.closest('[data-inv-action]')) {
        const content = invToggle.nextElementSibling;
        const icon = invToggle.querySelector('.db-sb-toggle-icon');
        if (content && content.classList.contains('db-sb-inv-bar-content')) {
          const isHidden = content.style.display === 'none';
          content.style.display = isHidden ? '' : 'none';
          if (icon) icon.classList.toggle('collapsed', !isHidden);
        }
        return;
      }


      // Owner filter click
      const ownerFilter = e.target.closest('[data-owner-filter]');
      if (ownerFilter && root.contains(ownerFilter)) {
        if (ownerFilter.classList.contains('disabled')) return;
        const tabBar = ownerFilter.closest('.db-sb-inv-tab-bar');
        if (!tabBar) return;
        tabBar.querySelectorAll('[data-owner-filter]').forEach(f => f.classList.toggle('active', f === ownerFilter));
        applyInvFilter(root);
        return;
      }

      // Inventory category filter click
      const invCatFilter = e.target.closest('.db-sb-inv-tab-bar > .db-sb-tab[data-filter]');
      if (invCatFilter && root.contains(invCatFilter)) {
        const tabBar = invCatFilter.closest('.db-sb-inv-tab-bar');
        if (!tabBar) return;
        tabBar.querySelectorAll('[data-filter]').forEach(f => f.classList.toggle('active', f === invCatFilter));
        applyInvFilter(root);
        return;
      }



      // --- Recycle (再利用) mode ---
      // Helper: apply owner/item lock based on current recycle mode
      function applyRecycleLock(root, mode) {
        const state = getState();
        const pName = String((state.protagonist && state.protagonist.name) || '').trim();
        const tabBar = root.querySelector('.db-sb-inv-tab-bar');
        const targetRow = root.querySelector('.db-sb-inv-recycle-target');
        const targetSelect = root.querySelector('.db-sb-inv-recycle-target-select');

        // Reset all locks
        root.querySelectorAll('.db-sb-inv-card').forEach(item => {
          item.classList.remove('db-sb-locked', 'db-sb-selectable', 'db-sb-selected');
        });
        if (tabBar) tabBar.querySelectorAll('[data-owner-filter]').forEach(t => t.classList.remove('disabled'));

        if (mode === 'gift') {
          // Gift: only protagonist items selectable, other owner tabs disabled
          if (tabBar && pName) {
            tabBar.querySelectorAll('[data-owner-filter]').forEach(t => {
              const val = t.dataset.ownerFilter;
              if (val !== '\u5168\u90e8' && val !== pName) t.classList.add('disabled');
            });
            // Auto-switch to protagonist tab
            const pTab = [...tabBar.querySelectorAll('[data-owner-filter]')].find(t => t.dataset.ownerFilter === pName);
            if (pTab && !pTab.classList.contains('active')) {
              tabBar.querySelectorAll('[data-owner-filter]').forEach(f => f.classList.toggle('active', f === pTab));
              applyInvFilter(root);
            }
          }
          // Lock non-protagonist items
          root.querySelectorAll('.db-sb-inv-card').forEach(item => {
            const owner = String(item.dataset.owner || '').trim();
            if (pName && owner !== pName) {
              item.classList.add('db-sb-locked');
            } else {
              item.classList.add('db-sb-selectable');
            }
          });
          // Show target character selector (gift target)
          if (targetRow && targetSelect) {
            const chars = (state.characters || []).filter(c => !c.isAbsent && c.name !== pName);
            targetSelect.innerHTML = chars.length === 0
              ? '<option value="">\u65E0\u53EF\u9009\u89D2\u8272</option>'
              : chars.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('');
            targetRow.style.display = '';
          }
        } else if (mode === 'request') {
          // Request: only non-protagonist items selectable, protagonist tab disabled
          if (tabBar && pName) {
            tabBar.querySelectorAll('[data-owner-filter]').forEach(t => {
              const val = t.dataset.ownerFilter;
              if (val === pName) t.classList.add('disabled');
            });
            // Auto-switch to first non-protagonist owner tab or '全部'
            const activeTab = tabBar.querySelector('[data-owner-filter].active');
            if (activeTab && activeTab.dataset.ownerFilter === pName) {
              const allTab = tabBar.querySelector('[data-owner-filter="\u5168\u90e8"]');
              if (allTab) {
                tabBar.querySelectorAll('[data-owner-filter]').forEach(f => f.classList.toggle('active', f === allTab));
                applyInvFilter(root);
              }
            }
          }
          // Show target character selector (request source - who to request from)
          let requestSource = '';
          if (targetRow && targetSelect) {
            const currentSource = targetSelect.value || '';
            const requestOwners = [...new Set([...root.querySelectorAll('.db-sb-inv-card')]
              .map(item => String(item.dataset.owner || '').trim())
              .filter(owner => owner && owner !== pName))];
            targetSelect.innerHTML = requestOwners.length === 0
              ? '<option value="">\u65E0\u53EF\u9009\u89D2\u8272</option>'
              : requestOwners.map(owner => `<option value="${esc(owner)}">${esc(owner)}</option>`).join('');
            if (currentSource && requestOwners.includes(currentSource)) targetSelect.value = currentSource;
            requestSource = targetSelect.value || '';
            targetSelect.onchange = () => applyRecycleLock(root, 'request');
            targetRow.style.display = '';
          }
          // Lock protagonist items and, when a source is selected, lock other owners too.
          root.querySelectorAll('.db-sb-inv-card').forEach(item => {
            const owner = String(item.dataset.owner || '').trim();
            if ((pName && owner === pName) || (requestSource && owner !== requestSource)) {
              item.classList.add('db-sb-locked');
            } else {
              item.classList.add('db-sb-selectable');
            }
          });
        } else {
          // Other modes: all items selectable, no lock
          root.querySelectorAll('.db-sb-inv-card').forEach(item => item.classList.add('db-sb-selectable'));
          if (targetRow) targetRow.style.display = 'none';
        }
      }

      // Helper: reset all recycle state
      function resetRecycleState(root) {
        const panel = root.querySelector('#db-inv-recycle');
        if (panel) panel.style.display = 'none';
        const targetRow = root.querySelector('.db-sb-inv-recycle-target');
        if (targetRow) targetRow.style.display = 'none';
        const tabBar = root.querySelector('.db-sb-inv-tab-bar');
        if (tabBar) tabBar.querySelectorAll('[data-owner-filter]').forEach(t => t.classList.remove('disabled'));
        root.querySelectorAll('.db-sb-inv-card').forEach(item => {
          item.classList.remove('db-sb-selectable', 'db-sb-selected', 'db-sb-locked');
        });
      }

      // Recycle mode toggle (enter)
      const recycleBtn = e.target.closest('[data-inv-action="recycle"]');
      if (recycleBtn && root.contains(recycleBtn)) {
        const panel = root.querySelector('#db-inv-recycle');
        if (panel) { panel.style.display = ''; }
        const activeMode = root.querySelector('[data-recycle-mode].active');
        const mode = activeMode ? activeMode.dataset.recycleMode : 'use';
        applyRecycleLock(root, mode);
        return;
      }

      // Recycle mode tab switch
      const recycleMode = e.target.closest('[data-recycle-mode]');
      if (recycleMode && root.contains(recycleMode)) {
        const group = recycleMode.closest('.db-sb-inv-recycle-actions');
        if (group) { group.querySelectorAll('.db-sb-tab').forEach(t => t.classList.toggle('active', t === recycleMode)); }
        const mode = recycleMode.dataset.recycleMode;
        applyRecycleLock(root, mode);
        return;
      }

      // Recycle target/source switch
      const recycleTarget = e.target.closest('.db-sb-inv-recycle-target-select');
      if (recycleTarget && root.contains(recycleTarget)) {
        const activeMode = root.querySelector('[data-recycle-mode].active');
        applyRecycleLock(root, activeMode ? activeMode.dataset.recycleMode : 'use');
        return;
      }

      // Recycle cancel
      const recycleCancel = e.target.closest('[data-inv-action="recycle-cancel"]');
      if (recycleCancel && root.contains(recycleCancel)) {
        resetRecycleState(root);
        return;
      }

      // Recycle confirm - generate action text based on mode
      const recycleConfirm = e.target.closest('[data-inv-action="recycle-confirm"]');
      if (recycleConfirm && root.contains(recycleConfirm)) {
        const selected = [...root.querySelectorAll('.db-sb-inv-card.db-sb-selected')];
        if (selected.length === 0) return;
        const names = selected.map(el => el.querySelector('.db-sb-inv-card-name')?.textContent || '').filter(Boolean);
        const owners = selected.map(el => el.dataset.owner || '').filter(Boolean);
        const activeMode2 = root.querySelector('[data-recycle-mode].active');
        const mode = activeMode2 ? activeMode2.dataset.recycleMode : 'use';

        const state = getState();
        const pName = (state.protagonist && state.protagonist.name) || '\u4E3B\u89D2';
        const chars = state.characters || [];
        const itemNames = names.join('\u3001');
        const otherOwners = [...new Set(owners.filter(o => o && o !== pName))];
        const presentChars = chars.filter(c => !c.isAbsent).map(c => c.name);

        let message = '';
        if (mode === 'use') {
          if (otherOwners.length === 0) {
            message = `${pName}\u4F7F\u7528\u4E86${itemNames}\u3002`;
          } else {
            const isPresent = otherOwners.every(o => presentChars.includes(o));
            message = isPresent
              ? `${pName}\u548C${otherOwners.join('\u3001')}\u5546\u91CF\u4E86\u4E00\u4E0B\uFF0C\u4F7F\u7528\u4E86${itemNames}\u3002`
              : `${pName}\u53BB\u627E${otherOwners.join('\u3001')}\u5546\u91CF\u4E86\u4E00\u4E0B\uFF0C\u4F7F\u7528\u4E86${itemNames}\u3002`;
          }
        } else if (mode === 'destroy') {
          if (otherOwners.length === 0) {
            message = `${pName}\u9500\u6BC1\u4E86${itemNames}\u3002`;
          } else {
            const isPresent = otherOwners.every(o => presentChars.includes(o));
            message = isPresent
              ? `${pName}\u4E0E${otherOwners.join('\u3001')}\u5546\u91CF\u4E86\u4E00\u4E0B\uFF0C\u51B3\u5B9A\u9500\u6BC1${itemNames}\u3002`
              : `${pName}\u53BB\u627E${otherOwners.join('\u3001')}\u5546\u91CF\u4E86\u4E00\u4E0B\uFF0C\u51B3\u5B9A\u9500\u6BC1${itemNames}\u3002`;
          }
        } else if (mode === 'synthesize') {
          if (otherOwners.length === 0) {
            message = `${pName}\u5C06${itemNames}\u8FDB\u884C\u4E86\u5408\u6210\u3002`;
          } else {
            const isPresent = otherOwners.every(o => presentChars.includes(o));
            message = isPresent
              ? `${pName}\u548C${otherOwners.join('\u3001')}\u5546\u91CF\u4E86\u4E00\u4E0B\uFF0C\u5C06${itemNames}\u8FDB\u884C\u4E86\u5408\u6210\u3002`
              : `${pName}\u53BB\u627E${otherOwners.join('\u3001')}\u5546\u91CF\u4E86\u4E00\u4E0B\uFF0C\u5C06${itemNames}\u8FDB\u884C\u4E86\u5408\u6210\u3002`;
          }
        } else if (mode === 'gift') {
          const targetSelect = root.querySelector('.db-sb-inv-recycle-target-select');
          const target = targetSelect ? targetSelect.value : '';
          if (target) {
            const isPresent = presentChars.includes(target);
            message = isPresent
              ? `${pName}\u5C06${itemNames}\u8D60\u4E88\u4E86${target}\u3002`
              : `${pName}\u53BB\u627E${target}\uFF0C\u5C06${itemNames}\u8D60\u4E88\u4E86${target}\u3002`;
          } else {
            return;
          }
        } else if (mode === 'request') {
          const targetSelect = root.querySelector('.db-sb-inv-recycle-target-select');
          const target = targetSelect ? targetSelect.value : '';
          const itemOwners = [...new Set(owners.map(o => String(o || '').trim()).filter(o => o && o !== pName))];
          const sourceChar = itemOwners.length === 1 ? itemOwners[0] : (target || itemOwners.join('\u3001'));
          if (sourceChar) {
            const isPresent = presentChars.includes(sourceChar);
            message = isPresent
              ? `${pName}\u5411${sourceChar}\u7D22\u53D6\u4E86${itemNames}\u3002`
              : `${pName}\u53BB\u627E${sourceChar}\uFF0C\u7D22\u53D6\u4E86${itemNames}\u3002`;
          } else {
            message = `${pName}\u7D22\u53D6\u4E86${itemNames}\u3002`;
          }
        } else if (mode === 'discard') {
          if (otherOwners.length === 0) {
            message = `${pName}\u5C06${itemNames}\u4E22\u5F03\u4E86\u3002`;
          } else {
            const isPresent = otherOwners.every(o => presentChars.includes(o));
            message = isPresent
              ? `${pName}\u4E0E${otherOwners.join('\u3001')}\u5546\u91CF\u4E86\u4E00\u4E0B\uFF0C\u5C06${itemNames}\u4E22\u5F03\u4E86\u3002`
              : `${pName}\u53BB\u627E${otherOwners.join('\u3001')}\u5546\u91CF\u4E86\u4E00\u4E0B\uFF0C\u5C06${itemNames}\u4E22\u5F03\u4E86\u3002`;
          }
        }

        // Inject to textarea
        const textarea = document.querySelector('#send_textarea');
        if (textarea && message) { textarea.value += (textarea.value ? '\n' : '') + message; textarea.dispatchEvent(new Event('input', { bubbles: true })); }
        else if (message) { try { navigator.clipboard.writeText(message); } catch(ex) { console.warn('[db-status-bar] clipboard write failed:', ex); } }

        // Reset
        resetRecycleState(root);
        return;
      }

      // Item select in recycle mode (only selectable, not locked)
      const invItem = e.target.closest('.db-sb-inv-card.db-sb-selectable');
      if (invItem && root.contains(invItem) && !invItem.classList.contains('db-sb-locked')) {
        invItem.classList.toggle('db-sb-selected');
        return;
      }

    });
  }

  // --- Avatar Upload Modal (Cropper.js) ---
  let cropperLoadPromise = null;
  function loadCropperLib() {
    if (window.Cropper) return Promise.resolve();
    if (cropperLoadPromise) return cropperLoadPromise;
    cropperLoadPromise = new Promise((resolve, reject) => {
      if (!document.querySelector('link[href*="cropperjs"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css';
        document.head.appendChild(link);
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js';
      script.onload = () => resolve();
      script.onerror = () => { cropperLoadPromise = null; reject(new Error('Cropper.js CDN load failed')); };
      document.head.appendChild(script);
    });
    return cropperLoadPromise;
  }

  function showAvatarModal(charName, root) {
    const oldModal = root.querySelector('.db-sb-avatar-modal');
    if (oldModal) {
      if (oldModal._cropper) oldModal._cropper.destroy();
      oldModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'db-sb-avatar-modal';
    modal.innerHTML = `
      <div class="db-sb-avatar-modal-overlay"></div>
      <div class="db-sb-avatar-modal-body">
        <div class="db-sb-avatar-modal-title">\u8BBE\u7F6E\u5934\u50CF: ${esc(charName)}</div>
        <div class="db-sb-avatar-crop-area" style="display:none">
          <img class="db-sb-avatar-crop-img" style="max-width:100%;display:block">
        </div>
        <div class="db-sb-avatar-crop-actions" style="display:none"><button class="db-sb-avatar-crop-ok">\u786E\u8BA4\u88C1\u526A</button><button class="db-sb-avatar-crop-cancel">\u53D6\u6D88</button></div>
        <div class="db-sb-avatar-preview">${(() => { try { return avatarContent(localStorage.getItem('db-avatar-' + charName) || '', charName, 'width:90px;height:120px;object-fit:cover;border-radius:6px'); } catch(e) { return avatarContent('', charName); } })()}</div>
        <div class="db-sb-avatar-actions">
          <div class="db-sb-avatar-url-row">
            <input type="text" class="db-sb-avatar-url-input" placeholder="\u8F93\u5165\u56FE\u7247URL..." />
            <button class="db-sb-avatar-url-btn">\u786E\u8BA4</button>
          </div>
          <label class="db-sb-avatar-upload-btn">
            \u9009\u62E9\u672C\u5730\u56FE\u7247
            <input type="file" accept="image/*" style="display:none" />
          </label>
          <button class="db-sb-avatar-remove-btn">\u79FB\u9664\u5934\u50CF</button>
        </div>
        <button class="db-sb-avatar-close-btn">\u2715</button>
      </div>`;

    root.appendChild(modal);

    const preview = modal.querySelector('.db-sb-avatar-preview');
    const urlInput = modal.querySelector('.db-sb-avatar-url-input');
    const fileInput = modal.querySelector('input[type="file"]');
    const cropArea = modal.querySelector('.db-sb-avatar-crop-area');
    const cropImgEl = modal.querySelector('.db-sb-avatar-crop-img');
    let cropper = null;

    function saveFromCrop() {
      if (!cropper) return;
      const canvas = cropper.getCroppedCanvas({ width: 90, height: 120, imageSmoothingQuality: 'high' });
      if (!canvas) return;
      let dataURL;
      try { dataURL = canvas.toDataURL('image/jpeg', 0.7); } catch(e) { console.warn('[avatar] Canvas tainted:', e); return; }
      try { localStorage.setItem('db-avatar-' + charName, dataURL); } catch(e) { console.warn('[avatar] Storage failed:', e); return; }
      cropper.destroy(); cropper = null;
      rerender(root.closest('.db-status-bar') || root);
      modal.remove();
    }

    function showCropUI(src) {
      loadCropperLib().then(() => {
        if (!modal.parentNode) return; // modal already closed
        cropImgEl.crossOrigin = 'anonymous';
        cropImgEl.src = src;
        cropArea.style.display = '';
        modal.querySelector('.db-sb-avatar-crop-actions').style.display = '';
        preview.style.display = 'none';
        modal.querySelector('.db-sb-avatar-actions').style.display = 'none';
        if (cropper) { cropper.destroy(); cropper = null; }
        cropper = new window.Cropper(cropImgEl, {
          aspectRatio: 3 / 4,
          viewMode: 1,
          dragMode: 'move',
          autoCropArea: 0.8,
          restore: false,
          guides: true,
          center: true,
          highlight: false,
          cropBoxMovable: true,
          cropBoxResizable: true,
          toggleDragModeOnDblclick: false
        });
        modal._cropper = cropper;
      }).catch(() => {
        if (!modal.parentNode) return;
        preview.innerHTML = '<span style="color:var(--db-rose);font-size:10px">Cropper.js \u52A0\u8F7D\u5931\u8D25</span>';
      });
    }

    // Crop confirm/cancel
    modal.querySelector('.db-sb-avatar-crop-ok').addEventListener('click', saveFromCrop);
    modal.querySelector('.db-sb-avatar-crop-cancel').addEventListener('click', () => {
      if (cropper) { cropper.destroy(); cropper = null; }
      cropArea.style.display = 'none';
      modal.querySelector('.db-sb-avatar-crop-actions').style.display = 'none';
      preview.style.display = '';
      modal.querySelector('.db-sb-avatar-actions').style.display = '';
    });

    function loadFromURL(url) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => showCropUI(url);
      img.onerror = () => { preview.innerHTML = '<span style="color:var(--db-rose);font-size:10px">\u52A0\u8F7D\u5931\u8D25</span>'; };
      img.src = url;
    }

    // URL confirm
    modal.querySelector('.db-sb-avatar-url-btn').addEventListener('click', () => {
      const url = urlInput.value.trim();
      if (url) loadFromURL(url);
    });

    // File upload
    fileInput.addEventListener('change', (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (re) => showCropUI(re.target.result);
      reader.readAsDataURL(file);
    });

    // Remove avatar
    modal.querySelector('.db-sb-avatar-remove-btn').addEventListener('click', () => {
      try { localStorage.removeItem('db-avatar-' + charName); } catch(e) { console.warn('[db-status-bar] remove avatar failed:', e); }
      rerender(root.closest('.db-status-bar') || root);
      modal.remove();
    });

    // Close modal
    modal.querySelector('.db-sb-avatar-close-btn').addEventListener('click', () => { if (cropper) { cropper.destroy(); } modal.remove(); });
    modal.querySelector('.db-sb-avatar-modal-overlay').addEventListener('click', () => { if (cropper) { cropper.destroy(); } modal.remove(); });
  }




  // --- Lifecycle ---
  function renderContentNode(content, context) {
    const wrapper = dom ? dom.createElement('div', { html: renderStatusShell() }) : (() => { const d = document.createElement('div'); d.innerHTML = renderStatusShell(); return d; })();
    return wrapper.firstElementChild || wrapper;
  }

  function mount(node, context) {
    ui.theme?.applyTheme?.(node);
    const root = node.querySelector?.('.db-status-bar') || node;
    bindEvents(root);
    initData(root);
  }

  let debounceTimer = null;
  let activeDataRoot = null;
  let registeredTableUpdateApi = null;

  async function initData(root) {
    activeDataRoot = root;
    const api = ui.dbStatusData?.getAutoCardAPI?.();
    if (api) {
      try {
        const tables = await api.exportTableAsJson();
        ui.dbStatusData.parseTables(typeof tables === 'string' ? JSON.parse(tables) : tables);
      } catch (e) {
        console.warn('[db-status-bar] API load failed, using test data:', e);
        ui.dbStatusData.loadTestData();
      }
      if (registeredTableUpdateApi !== api && typeof api.registerTableUpdateCallback === 'function') {
        registeredTableUpdateApi = api;
        api.registerTableUpdateCallback(() => {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(async () => {
            const targetRoot = activeDataRoot;
            if (!targetRoot?.isConnected) return;
            try {
              const t = await api.exportTableAsJson();
              ui.dbStatusData.parseTables(typeof t === 'string' ? JSON.parse(t) : t);
              activeDataRoot = rerender(targetRoot) || targetRoot;
              maybeAutoMap(activeDataRoot);
            } catch (e) { console.error('[db-status-bar] Update failed:', e); }
          }, 300);
        });
      }
    } else {
      ui.dbStatusData?.loadTestData?.();
    }
    root = rerender(root) || root;
    activeDataRoot = root;
    maybeAutoMap(root);
  }

  function maybeAutoMap(root) {
    if (!root || mapBusy) return;
    normalizeMapClickTargets(root);
    doMap(root, false);
  }

  function rerender(root) {
    if (!root) return;
    const parent = root.parentElement;
    if (!parent) return;
    const fresh = document.createElement('div');
    fresh.innerHTML = renderStatusShell();
    const newRoot = fresh.firstElementChild;
    if (newRoot) {
      root.replaceWith(newRoot);
      bindEvents(newRoot);
      normalizeMapClickTargets(newRoot);
      return newRoot;
    }
    return root;
  }

  // --- Register ---
  ui.registry?.register?.({
    id: MODULE_ID,
    version: MODULE_VERSION,
    priority: 80,
    enabled: true,
    singleTag: SINGLE_TAG,
    renderContent: renderContentNode,
    mount,
  });
})();
