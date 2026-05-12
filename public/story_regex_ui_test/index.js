(() => {
  const CONFIG = {
    env: 'test',
    displayEnv: '测试版',
    version: 'test',
    publicBaseUrl: 'https://ts-plugin.pages.dev/story_regex_ui_test/',
    localBasePath: '/scripts/extensions/third-party/tavern_helper_template/story_regex_ui_test/',
    globalKey: 'StoryRegexUI',
    loaderFlag: '__storyRegexUiLoaderReady',
    themeKey: 'jjks_story_ui_theme',
    buttonName: '咒回前端管理',
    managerRootId: 'jjks-story-ui-manager-test',
  };

  const INDEX_FLAG = `__jjksStoryUiIndex_${CONFIG.env}`;
  const STYLE_MARK = `jjks-manager-style-${CONFIG.env}`;
  const LOADER_MARK = `jjks-story-ui-loader-${CONFIG.env}`;
  const logPrefix = `[StoryRegexUI:${CONFIG.env}]`;

  function getCandidateWindows() {
    const candidates = [];
    const push = candidate => {
      if (!candidate || candidates.includes(candidate)) return;
      candidates.push(candidate);
    };

    push(window);

    try {
      push(window.parent);
    } catch {
      // ignore cross-origin parent
    }

    try {
      push(window.top);
    } catch {
      // ignore cross-origin top
    }

    return candidates;
  }

  function scoreHostWindow(candidate) {
    if (!candidate) return -1;

    let score = 0;
    try {
      if (candidate === window) score += 1;
      if (candidate !== window) score += 3;
      if (candidate.document?.body) score += 2;
      if (candidate.document?.head) score += 1;
      if (candidate.SillyTavern) score += 20;
      if (candidate.TavernHelper) score += 20;
      if (candidate.document?.querySelector?.('#send_textarea')) score += 8;
      if (candidate.document?.querySelector?.('#extensions_settings')) score += 8;
    } catch {
      return -1;
    }

    return score;
  }

  function findHostWindow() {
    return (
      getCandidateWindows()
        .map(candidate => ({ candidate, score: scoreHostWindow(candidate) }))
        .sort((lhs, rhs) => rhs.score - lhs.score)[0]?.candidate || window
    );
  }

  const hostWindow = findHostWindow();
  const hostDocument = hostWindow.document || document;

  function createElementInHost(tagName) {
    return hostDocument.createElement(tagName);
  }

  const state = (window.__jjksStoryUiIndexState = window.__jjksStoryUiIndexState || {});
  const currentScript = document.currentScript;
  function normalizeBaseUrl(value) {
    try {
      return new URL('.', value).href;
    } catch {
      return '';
    }
  }

  function detectBaseUrl() {
    const current = normalizeBaseUrl(currentScript?.src || '');
    if (current) return current;

    const scriptSrc = Array.from(document.scripts)
      .map(script => script.src)
      .find(src => src.includes('/story_regex_ui_test/index.js'));
    const fromScriptList = normalizeBaseUrl(scriptSrc || '');
    if (fromScriptList) return fromScriptList;

    try {
      return new URL(CONFIG.localBasePath, window.location.origin).href;
    } catch {
      return CONFIG.publicBaseUrl;
    }
  }

  const baseUrl = detectBaseUrl();
  let loaderPromise = null;
  let loaderStatus = 'idle';
  const INITIAL_SCAN_LIMIT = 5;
  const messageSignatures = new Map();
  const mountedModulesByMessage = new Map();
  const recentScannedMessageIds = [];
  let renderedWindowSize = 0;
  let recentScanRetryTimer = null;
  let lastScanMode = 'dom';
  let lastError = '';
  let scanQueued = false;
  let lastDiagnosis = null;

  if (window[INDEX_FLAG]) {
    hostWindow[CONFIG.globalKey]?.scanner?.scan?.(hostDocument);
    return;
  }
  window[INDEX_FLAG] = true;
  state[CONFIG.env] = {
    env: CONFIG.env,
    displayEnv: CONFIG.displayEnv,
    version: CONFIG.version,
    baseUrl,
    hostEqualsWindow: hostWindow === window,
    hostHasTavernHelper: Boolean(hostWindow?.TavernHelper),
    hostLocation: hostWindow?.location?.href || '',
    startedAt: new Date().toISOString(),
  };

  function notify(message, type = 'info') {
    try {
      if (window.toastr?.[type]) {
        window.toastr[type](message, '咒回前端管理');
      } else if (window.toastr?.info) {
        window.toastr.info(message, '咒回前端管理');
      }
    } catch {
      // ignore toast failures
    }
  }

  function toUrl(path) {
    const errors = [];
    for (const base of [baseUrl, CONFIG.publicBaseUrl]) {
      try {
        const url = new URL(path, base);
        url.searchParams.set('v', CONFIG.version);
        return url.href;
      } catch (error) {
        errors.push(error);
      }
    }

    throw new TypeError(`${logPrefix} 无法构造资源 URL：path=${path}, baseUrl=${baseUrl || '(empty)'}`);
  }

  function getUi() {
    return hostWindow[CONFIG.globalKey] || window[CONFIG.globalKey] || null;
  }

  function getStoryDocument() {
    return hostDocument;
  }

  function getUiSource() {
    return hostWindow[CONFIG.globalKey] ? 'hostWindow' : window[CONFIG.globalKey] ? 'localWindow' : 'missing';
  }

  function getTheme() {
    const apiTheme = getUi()?.theme?.getTheme?.();
    if (apiTheme === 'day' || apiTheme === 'night') return apiTheme;

    try {
      const stored = localStorage.getItem(CONFIG.themeKey);
      return stored === 'night' ? 'night' : 'day';
    } catch {
      return 'day';
    }
  }

  function applyManagerTheme(theme = getTheme()) {
    const root = hostDocument.getElementById(CONFIG.managerRootId);
    if (!root) return;
    root.classList.toggle('jjks-manager-night', theme === 'night');
    root.classList.toggle('jjks-manager-day', theme !== 'night');
    root.dataset.theme = theme;
  }

  function setTheme(theme) {
    const nextTheme = theme === 'night' ? 'night' : 'day';
    try {
      localStorage.setItem(CONFIG.themeKey, nextTheme);
    } catch (error) {
      console.warn(`${logPrefix} 保存主题失败`, error);
    }

    const themeApi = getUi()?.theme;
    if (themeApi?.setTheme) {
      themeApi.setTheme(nextTheme);
    } else {
      getStoryDocument()
        .querySelectorAll('.story-ui-root')
        .forEach(root => {
          root.classList.toggle('story-ui-night', nextTheme === 'night');
          root.classList.toggle('story-ui-day', nextTheme !== 'night');
          root.dataset.storyUiTheme = nextTheme;
        });
    }

    applyManagerTheme(nextTheme);
    refreshManagerState();
    notify(nextTheme === 'night' ? '已切换为暗色模式' : '已切换为米白模式', 'success');
  }

  function ensureLoader() {
    if (getUi()?.scanner) {
      loaderStatus = 'ready';
      return Promise.resolve();
    }
    if (loaderPromise) return loaderPromise;

    loaderStatus = 'loading';
    lastError = '';
    const src = toUrl('loader.js');

    loaderPromise = new Promise((resolve, reject) => {
      const existed = hostDocument.querySelector(`script[data-jjks-story-ui-loader="${LOADER_MARK}"]`);
      if (existed) {
        const waitStartedAt = Date.now();
        const timer = window.setInterval(() => {
          if (getUi()?.scanner) {
            window.clearInterval(timer);
            loaderStatus = 'ready';
            resolve();
          } else if (Date.now() - waitStartedAt > 8000) {
            window.clearInterval(timer);
            loaderStatus = 'failed';
            lastError = '检测到 loader 标签存在，但 StoryRegexUI 未就绪';
            reject(new Error(lastError));
          }
        }, 120);
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.dataset.jjksStoryUiLoader = LOADER_MARK;
      script.dataset.jjksStoryUiEnv = CONFIG.env;
      script.onload = () => {
        const waitStartedAt = Date.now();
        const timer = window.setInterval(() => {
          if (getUi()?.scanner) {
            window.clearInterval(timer);
            loaderStatus = 'ready';
            resolve();
          } else if (Date.now() - waitStartedAt > 8000) {
            window.clearInterval(timer);
            loaderStatus = 'failed';
            lastError = 'loader 已加载，但扫描器未就绪';
            reject(new Error(lastError));
          }
        }, 120);
      };
      script.onerror = () => {
        loaderStatus = 'failed';
        lastError = `loader 加载失败: ${src}`;
        loaderPromise = null;
        reject(new Error(lastError));
      };
      (hostDocument.head || hostDocument.body).appendChild(script);
    }).catch(error => {
      loaderStatus = 'failed';
      lastError = error?.message || String(error);
      loaderPromise = null;
      console.error(`${logPrefix} 启动失败`, error);
      notify(`资源加载失败：${lastError}`, 'error');
      throw error;
    });

    return loaderPromise;
  }

  function getDisplayedMessageElement(messageId) {
    if (messageId === undefined || messageId === null) return null;
    try {
      const byHelper = window.retrieveDisplayedMessage?.(messageId)?.[0];
      if (byHelper) return byHelper.closest?.('.mes[mesid]') || byHelper;
    } catch {
      // ignore helper failures
    }

    return hostDocument.querySelector?.(`.mes[mesid="${messageId}"]`) || null;
  }

  function getRenderedMessageIds(limit = INITIAL_SCAN_LIMIT) {
    const nodes = Array.from(hostDocument.querySelectorAll('.mes[mesid]'));
    const ids = nodes.map(node => Number(node.getAttribute('mesid'))).filter(Number.isFinite);

    renderedWindowSize = ids.length;
    if (ids.length <= limit) return ids;
    return ids.slice(-limit);
  }

  function getRecentMessageIds(limit = INITIAL_SCAN_LIMIT) {
    return getRenderedMessageIds(limit);
  }

  function readRawMessage(messageId) {
    try {
      return window.getChatMessages?.(messageId)?.[0] || null;
    } catch {
      return null;
    }
  }

  function computeSignature(rawText) {
    const text = String(rawText || '');
    if (!text) return 'empty:0';
    const head = text.slice(0, 120);
    const tail = text.slice(-120);
    return `${text.length}:${head}:${tail}`;
  }

  function rememberRecentScannedMessageIds(messageIds) {
    messageIds.forEach(messageId => {
      const index = recentScannedMessageIds.indexOf(messageId);
      if (index >= 0) recentScannedMessageIds.splice(index, 1);
      recentScannedMessageIds.push(messageId);
    });

    while (recentScannedMessageIds.length > 10) {
      recentScannedMessageIds.shift();
    }
  }

  function clearMountedStoryUi(messageElement) {
    if (!messageElement) return;
    messageElement.querySelectorAll?.('[data-story-ui-raw-mount="true"]').forEach(node => node.remove());
  }

  function getDisplayedMessageTextElement(messageElement) {
    if (!messageElement) return null;

    const candidates = Array.from(messageElement.querySelectorAll?.('.mes_text, .custom-mes_text') || []);
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    return (
      candidates
        .map(node => ({
          node,
          textLength: (node.textContent || '').trim().length,
          depth: node.closest?.('.mes_block') ? 1 : 0,
        }))
        .sort((lhs, rhs) => {
          if (rhs.textLength !== lhs.textLength) return rhs.textLength - lhs.textLength;
          return rhs.depth - lhs.depth;
        })[0]?.node ||
      candidates[candidates.length - 1] ||
      null
    );
  }

  function hasMountedStoryUi(messageElement) {
    if (!messageElement) return false;
    return Boolean(messageElement.querySelector?.('[data-story-ui-raw-mount="true"]'));
  }

  function escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function getModuleBlockConfig(module) {
    if (!module || typeof module !== 'object') return null;
    const block = module.block;
    if (!block || typeof block !== 'object') return null;
    if (typeof block.open !== 'string' || typeof block.close !== 'string') return null;
    return block;
  }

  function extractModuleContent(module, rawText) {
    const block = getModuleBlockConfig(module);
    if (!block) return null;

    const pattern = new RegExp(`${escapeRegex(block.open)}([\\s\\S]*?)${escapeRegex(block.close)}`, 'i');
    const source = String(rawText || '').replace(/\r\n?/g, '\n');
    const match = source.match(pattern);
    if (!match) return null;

    return {
      fullMatch: match[0],
      content: String(match[1] || '').trim(),
      block,
    };
  }

  function moduleMatchesRawText(module, rawText) {
    return Boolean(extractModuleContent(module, rawText));
  }

  function buildNodeForModule(module, rawText, context) {
    const extracted = extractModuleContent(module, rawText);
    if (!extracted) return null;
    return getUi()?.registry?.safelyCall(module, 'renderContent', extracted.content, {
      ...context,
      extracted,
      rawText,
    });
  }

  function nodeToHtml(node) {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (node.outerHTML) return node.outerHTML;
    const wrapper = createElementInHost('div');
    wrapper.appendChild(node.cloneNode?.(true) || node);
    return wrapper.innerHTML;
  }

  function renderPlainTextSegment(text, messageId) {
    const source = String(text || '');
    if (!source.trim()) return source;
    if (typeof window.formatAsDisplayedMessage === 'function') {
      return window.formatAsDisplayedMessage(source, { message_id: messageId });
    }
    return source.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  }

  function findNextModuleMatch(modules, rawText, startIndex) {
    let best = null;
    modules.forEach(module => {
      const block = getModuleBlockConfig(module);
      if (!block) return;
      const pattern = new RegExp(`${escapeRegex(block.open)}([\\s\\S]*?)${escapeRegex(block.close)}`, 'i');
      const slice = String(rawText || '').slice(startIndex);
      const match = slice.match(pattern);
      if (!match || match.index === undefined) return;
      const absoluteStart = startIndex + match.index;
      const absoluteEnd = absoluteStart + match[0].length;
      if (
        !best ||
        absoluteStart < best.start ||
        (absoluteStart === best.start && module.priority > best.module.priority)
      ) {
        best = {
          module,
          block,
          start: absoluteStart,
          end: absoluteEnd,
          fullMatch: match[0],
          content: String(match[1] || '').trim(),
        };
      }
    });
    return best;
  }

  function renderMessageHtmlByModules(messageId, rawText, modules) {
    const text = String(rawText || '').replace(/\r\n?/g, '\n');
    let cursor = 0;
    let html = '';
    const mounted = [];

    while (cursor < text.length) {
      const match = findNextModuleMatch(modules, text, cursor);
      if (!match) {
        html += renderPlainTextSegment(text.slice(cursor), messageId);
        break;
      }

      html += renderPlainTextSegment(text.slice(cursor, match.start), messageId);

      const rendered = getUi()?.registry?.safelyCall(match.module, 'renderContent', match.content, {
        messageId,
        rawText,
        extracted: match,
        theme: getUi()?.theme?.getTheme?.() || 'day',
      });
      const moduleHtml = nodeToHtml(rendered);
      if (moduleHtml) {
        html += `<section class="story-ui-raw-mount" data-story-ui-raw-mount="true" data-story-ui-module="${match.module.id}">${moduleHtml}</section>`;
        mounted.push(match.module.id);
      } else {
        html += renderPlainTextSegment(match.fullMatch, messageId);
      }

      cursor = match.end;
    }

    return { html, mounted };
  }

  function mountModulesForMessage(messageId, rawText) {
    const messageElement = getDisplayedMessageElement(messageId);
    if (!messageElement) return false;

    const ui = getUi();
    const registry = ui?.registry;
    if (!registry) return false;

    const modules = registry.list().filter(module => moduleMatchesRawText(module, rawText));
    if (modules.length === 0) {
      mountedModulesByMessage.delete(messageId);
      return false;
    }

    const textElement = getDisplayedMessageTextElement(messageElement);
    if (!textElement) return false;

    const { html, mounted } = renderMessageHtmlByModules(messageId, rawText, modules);
    textElement.innerHTML = html;
    textElement.querySelectorAll?.('.story-ui-root').forEach(root => ui?.theme?.applyThemeToRoot?.(root));

    if (mounted.length > 0) {
      mountedModulesByMessage.set(messageId, mounted);
      return true;
    }

    mountedModulesByMessage.delete(messageId);
    return false;
  }

  function scanMessageIds(messageIds, mode = 'incremental') {
    if (!Array.isArray(messageIds) || messageIds.length === 0) return;
    lastScanMode = mode;
    const uniqueIds = Array.from(new Set(messageIds.filter(Number.isFinite)));

    uniqueIds.forEach(messageId => {
      const chatMessage = readRawMessage(messageId);
      const rawText = chatMessage?.message || '';
      const signature = computeSignature(rawText);
      const hasDisplayHost = Boolean(getDisplayedMessageElement(messageId));
      const hasMountedUi = hasMountedStoryUi(getDisplayedMessageElement(messageId));
      const previousSignature = messageSignatures.get(messageId);
      if (previousSignature === signature && hasDisplayHost && hasMountedUi) return;

      messageSignatures.set(messageId, signature);
      mountModulesForMessage(messageId, rawText);
    });

    rememberRecentScannedMessageIds(uniqueIds);
  }

  function normalizeScanTargets(input) {
    if (Array.isArray(input)) return input.filter(Number.isFinite);
    if (typeof input === 'number' && Number.isFinite(input)) return [input];

    const scope = input || getStoryDocument();
    const fromScope =
      scope?.nodeType === Node.ELEMENT_NODE
        ? [Number(scope.getAttribute?.('mesid')), Number(scope.closest?.('.mes')?.getAttribute?.('mesid'))].filter(
            Number.isFinite,
          )
        : [];

    if (fromScope.length > 0) return fromScope;
    return getRecentMessageIds(INITIAL_SCAN_LIMIT);
  }

  function getMessageScope(messageId) {
    if (messageId === undefined || messageId === null) return getStoryDocument();
    try {
      const node = window.retrieveDisplayedMessage?.(messageId)?.[0];
      return node || getStoryDocument();
    } catch {
      return getStoryDocument();
    }
  }

  function queueScan(scope = getStoryDocument()) {
    if (scanQueued) return;
    const messageIds = normalizeScanTargets(scope);
    scanQueued = true;
    requestAnimationFrame(async () => {
      scanQueued = false;
      try {
        await ensureLoader();
        scanMessageIds(messageIds, Array.isArray(scope) || typeof scope === 'number' ? 'message_ids' : 'window');
        refreshManagerState();
      } catch (error) {
        console.error(`${logPrefix} 扫描失败`, error);
      }
    });
  }

  function queueRetryRecentScan(delay = 600) {
    if (recentScanRetryTimer) {
      window.clearTimeout(recentScanRetryTimer);
    }

    recentScanRetryTimer = window.setTimeout(() => {
      recentScanRetryTimer = null;
      queueScan(getRecentMessageIds(INITIAL_SCAN_LIMIT));
    }, delay);
  }

  function diagnose() {
    const ui = getUi();
    const modules = ui?.registry?.list?.() || [];
    const otherEnv = CONFIG.env === 'test' ? 'prod' : 'test';
    const otherState = state[otherEnv] || null;
    const storyRoots = hostDocument.querySelectorAll('.story-ui-root').length;
    const managerExists = Boolean(hostDocument.getElementById(CONFIG.managerRootId));
    const loaderUrl = toUrl('loader.js');

    lastDiagnosis = {
      环境: CONFIG.displayEnv,
      环境标识: CONFIG.env,
      入口版本: CONFIG.version,
      入口目录: baseUrl,
      加载器地址: loaderUrl,
      加载器状态: loaderStatus,
      全局对象就绪: Boolean(ui),
      扫描器就绪: Boolean(ui?.scanner),
      主题模块就绪: Boolean(ui?.theme),
      当前主题: getTheme(),
      主题键: CONFIG.themeKey,
      已注册模块: modules.map(module => `${module.id}@${module.version || 'unknown'}`),
      故事UI节点数: storyRoots,
      管理界面已创建: managerExists,
      宿主命中TavernHelper: Boolean(hostWindow?.TavernHelper),
      UI实例来源: getUiSource(),
      宿主命中SillyTavern: Boolean(hostWindow?.SillyTavern),
      另一个环境状态: otherState,
      最近扫描窗口: renderedWindowSize,
      最近扫描楼层: recentScannedMessageIds.slice(),
      扫描模式: lastScanMode,
      最近错误: lastError || '无',
      诊断时间: new Date().toLocaleString(),
    };

    return lastDiagnosis;
  }

  function formatDiagnosis(data) {
    return Object.entries(data)
      .map(([key, value]) => {
        if (Array.isArray(value)) return `${key}: ${value.length ? value.join(', ') : '无'}`;
        if (value && typeof value === 'object') return `${key}: ${JSON.stringify(value, null, 2)}`;
        return `${key}: ${value}`;
      })
      .join('\n');
  }

  function injectManagerStyle() {
    if (hostDocument.querySelector(`style[data-jjks-manager-style="${STYLE_MARK}"]`)) return;
    const style = createElementInHost('style');
    style.dataset.jjksManagerStyle = STYLE_MARK;
    style.textContent = `
      .jjks-manager-mask{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(6,10,20,.58);backdrop-filter:blur(18px);font-family:"Segoe UI","Noto Sans SC","Microsoft YaHei",sans-serif;}
      .jjks-manager-mask[data-open="true"]{display:flex;}
      .jjks-manager-panel{width:min(1120px,calc(100vw - 40px));max-height:min(860px,calc(100vh - 40px));overflow:hidden;border-radius:28px;box-shadow:0 30px 90px rgba(0,0,0,.45);border:1px solid;position:relative;}
      .jjks-manager-panel:before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.75;background:radial-gradient(circle at 14% 0%,rgba(112,170,255,.18),transparent 32%),radial-gradient(circle at 86% 18%,rgba(158,114,255,.16),transparent 30%),linear-gradient(180deg,rgba(255,255,255,.05),transparent 32%);}
      .jjks-manager-day .jjks-manager-panel{background:linear-gradient(180deg,#f4f8ff 0%,#edf4ff 46%,#e5ecfa 100%);border-color:rgba(107,133,179,.24);color:#152033;}
      .jjks-manager-night .jjks-manager-panel{background:linear-gradient(180deg,#0b1220 0%,#12182a 46%,#0d1424 100%);border-color:rgba(106,136,198,.28);color:#edf4ff;box-shadow:0 32px 96px rgba(0,0,0,.58),0 0 42px rgba(96,130,255,.16);}
      .jjks-manager-head{position:relative;display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:26px 28px 22px;border-bottom:1px solid rgba(124,147,189,.16);}
      .jjks-manager-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.22em;text-transform:uppercase;opacity:.78;margin-bottom:8px;}
      .jjks-manager-eyebrow:before{content:"";width:32px;height:1px;background:currentColor;opacity:.46;display:inline-block;}
      .jjks-manager-head h2{margin:0;font-size:28px;letter-spacing:.03em;font-weight:800;}
      .jjks-manager-head p{margin:10px 0 0;font-size:13px;line-height:1.7;opacity:.72;max-width:620px;}
      .jjks-manager-close{width:42px;height:42px;border-radius:14px;border:1px solid rgba(120,146,193,.22);background:rgba(255,255,255,.08);color:inherit;font-size:24px;line-height:1;cursor:pointer;backdrop-filter:blur(10px);transition:transform .16s ease,background .16s ease,border-color .16s ease;}
      .jjks-manager-close:hover{transform:translateY(-1px);background:rgba(255,255,255,.14);border-color:rgba(120,146,193,.38);}
      .jjks-manager-body{position:relative;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:18px;padding:22px 24px 26px;overflow:auto;max-height:calc(min(860px,calc(100vh - 40px)) - 110px);}
      .jjks-manager-column{display:grid;gap:18px;align-content:start;min-width:0;}
      .jjks-manager-card{border:1px solid rgba(116,139,184,.16);border-radius:22px;padding:18px;background:rgba(255,255,255,.58);box-shadow:0 12px 34px rgba(31,55,96,.08);backdrop-filter:blur(12px);}
      .jjks-manager-night .jjks-manager-card{background:rgba(17,24,39,.72);border-color:rgba(120,146,193,.18);box-shadow:0 14px 36px rgba(0,0,0,.24);}
      .jjks-manager-card h3{margin:0 0 14px;font-size:15px;letter-spacing:.08em;text-transform:uppercase;opacity:.88;}
      .jjks-manager-overview{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
      .jjks-manager-metric{padding:14px 15px;border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.64),rgba(210,224,255,.38));border:1px solid rgba(116,139,184,.14);}
      .jjks-manager-night .jjks-manager-metric{background:linear-gradient(180deg,rgba(36,51,81,.88),rgba(20,30,49,.78));border-color:rgba(120,146,193,.16);}
      .jjks-manager-metric span{display:block;font-size:12px;opacity:.64;margin-bottom:8px;letter-spacing:.04em;}
      .jjks-manager-metric strong{display:block;font-size:18px;line-height:1.3;word-break:break-word;}
      .jjks-manager-status{display:grid;gap:10px;margin:0;}
      .jjks-manager-status div{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:10px 0;border-bottom:1px dashed rgba(118,140,184,.18);}
      .jjks-manager-status div:last-child{border-bottom:none;padding-bottom:0;}
      .jjks-manager-status dt{opacity:.66;font-size:13px;}
      .jjks-manager-status dd{margin:0;font-weight:700;text-align:right;max-width:58%;word-break:break-word;}
      .jjks-manager-actions{display:flex;flex-wrap:wrap;gap:10px;}
      .jjks-manager-button{border:1px solid rgba(110,136,187,.2);border-radius:14px;padding:10px 14px;background:linear-gradient(180deg,rgba(255,255,255,.84),rgba(222,234,255,.64));color:inherit;cursor:pointer;font-weight:700;font-size:13px;letter-spacing:.03em;transition:transform .16s ease,box-shadow .16s ease,background .16s ease,border-color .16s ease;}
      .jjks-manager-button:hover{transform:translateY(-1px);box-shadow:0 10px 22px rgba(52,86,146,.14);border-color:rgba(100,130,192,.34);}
      .jjks-manager-night .jjks-manager-button{background:linear-gradient(180deg,rgba(39,53,83,.92),rgba(22,33,54,.88));border-color:rgba(120,146,193,.2);}
      .jjks-manager-button[data-active="true"]{background:linear-gradient(135deg,#78a7ff,#a88bff);border-color:transparent;color:#081120;box-shadow:0 10px 24px rgba(120,167,255,.28);}
      .jjks-manager-log{grid-column:1 / -1;}
      .jjks-manager-log pre{white-space:pre-wrap;word-break:break-word;margin:0;min-height:180px;max-height:360px;overflow:auto;border-radius:18px;padding:16px;background:rgba(11,20,38,.06);font-family:"Consolas","SFMono-Regular","Microsoft YaHei",monospace;font-size:12px;line-height:1.66;border:1px solid rgba(116,139,184,.12);}
      .jjks-manager-night .jjks-manager-log pre{background:rgba(6,10,19,.56);color:#dbe8ff;border-color:rgba(120,146,193,.14);}
      .jjks-manager-warning{display:none;margin:0 0 14px;padding:12px 14px;border-radius:16px;background:rgba(255,179,71,.16);border:1px solid rgba(255,179,71,.24);font-size:13px;line-height:1.65;}
      .jjks-manager-warning[data-visible="true"]{display:block;}
      .jjks-manager-chip-row{display:flex;flex-wrap:wrap;gap:8px;}
      .jjks-manager-chip{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border-radius:999px;background:rgba(120,167,255,.14);border:1px solid rgba(120,167,255,.18);font-size:12px;font-weight:600;}
      .jjks-manager-night .jjks-manager-chip{background:rgba(120,167,255,.12);border-color:rgba(120,167,255,.22);}
      @media (max-width:860px){.jjks-manager-body{grid-template-columns:1fr}.jjks-manager-overview{grid-template-columns:1fr 1fr}}
      @media (max-width:640px){.jjks-manager-panel{border-radius:20px}.jjks-manager-head{padding:22px 20px 18px}.jjks-manager-head h2{font-size:22px}.jjks-manager-body{padding:18px}.jjks-manager-overview{grid-template-columns:1fr}}
    `;
    (hostDocument.head || hostDocument.body).appendChild(style);
  }

  function createButton(text, attrs = {}) {
    const button = createElementInHost('button');
    button.type = 'button';
    button.className = 'jjks-manager-button';
    button.textContent = text;
    Object.entries(attrs).forEach(([key, value]) => button.setAttribute(key, value));
    return button;
  }

  function ensureManagerDom() {
    injectManagerStyle();
    let root = hostDocument.getElementById(CONFIG.managerRootId);
    if (root) return root;

    root = hostDocument.createElement('div');
    root.id = CONFIG.managerRootId;
    root.className = 'jjks-manager-mask jjks-manager-day';
    root.dataset.jjksManagerRoot = CONFIG.env;
    root.dataset.open = 'false';

    const panel = createElementInHost('section');
    panel.className = 'jjks-manager-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', '咒回前端管理');

    panel.innerHTML = `
      <header class="jjks-manager-head">
        <div>
          <span class="jjks-manager-eyebrow">Jujutsu Kaisen Frontend · ${CONFIG.displayEnv}</span>
          <h2>咒回前端管理</h2>
          <p>统一查看 Story UI 模块装载、扫描结果与前端主题状态。当前面板已按 MVU 状态栏的视觉语言重构。</p>
        </div>
        <button class="jjks-manager-close" type="button" data-jjks-manager-close aria-label="关闭">×</button>
      </header>
      <main class="jjks-manager-body">
        <div class="jjks-manager-column">
          <section class="jjks-manager-card">
            <h3>运行总览</h3>
            <div class="jjks-manager-overview">
              <article class="jjks-manager-metric"><span>当前环境</span><strong data-jjks-status="env">${CONFIG.displayEnv}</strong></article>
              <article class="jjks-manager-metric"><span>资源状态</span><strong data-jjks-status="loader">${loaderStatus}</strong></article>
              <article class="jjks-manager-metric"><span>模块数量</span><strong data-jjks-status="modules">0</strong></article>
              <article class="jjks-manager-metric"><span>故事 UI 节点</span><strong data-jjks-status="roots">0</strong></article>
            </div>
          </section>
          <section class="jjks-manager-card jjks-manager-log">
            <h3>诊断信息</h3>
            <pre data-jjks-diagnosis>等待诊断...</pre>
          </section>
        </div>
        <div class="jjks-manager-column">
          <section class="jjks-manager-card">
            <h3>状态细节</h3>
            <p class="jjks-manager-warning" data-jjks-warning></p>
            <dl class="jjks-manager-status">
              <div><dt>入口版本</dt><dd data-jjks-status="version">${CONFIG.version}</dd></div>
              <div><dt>当前主题</dt><dd data-jjks-status="theme">${getTheme()}</dd></div>
              <div><dt>UI 实例来源</dt><dd data-jjks-status="ui-source">-</dd></div>
              <div><dt>宿主页面</dt><dd data-jjks-status="host">-</dd></div>
            </dl>
          </section>
          <section class="jjks-manager-card">
            <h3>日夜模式</h3>
            <div class="jjks-manager-actions" data-jjks-theme-actions></div>
          </section>
          <section class="jjks-manager-card">
            <h3>维护工具</h3>
            <div class="jjks-manager-actions" data-jjks-maintenance-actions></div>
          </section>
          <section class="jjks-manager-card">
            <h3>模块状态标签</h3>
            <div class="jjks-manager-chip-row" data-jjks-module-chips></div>
          </section>
        </div>
      </main>
    `;

    root.appendChild(panel);
    hostDocument.body.appendChild(root);

    const themeActions = root.querySelector('[data-jjks-theme-actions]');
    themeActions.appendChild(createButton('米白模式', { 'data-jjks-theme': 'day' }));
    themeActions.appendChild(createButton('暗色模式', { 'data-jjks-theme': 'night' }));

    const maintenanceActions = root.querySelector('[data-jjks-maintenance-actions]');
    maintenanceActions.appendChild(createButton('手动重扫', { 'data-jjks-action': 'scan' }));
    maintenanceActions.appendChild(createButton('刷新诊断', { 'data-jjks-action': 'diagnose' }));
    maintenanceActions.appendChild(createButton('重载资源', { 'data-jjks-action': 'reload' }));

    root.addEventListener('click', event => {
      const target = event.target;
      if (target === root || target.closest?.('[data-jjks-manager-close]')) {
        closeManager();
        return;
      }

      const themeButton = target.closest?.('[data-jjks-theme]');
      if (themeButton) {
        setTheme(themeButton.dataset.jjksTheme);
        return;
      }

      const actionButton = target.closest?.('[data-jjks-action]');
      if (actionButton) {
        handleManagerAction(actionButton.dataset.jjksAction);
      }
    });

    if (!hostDocument.documentElement.dataset.jjksStoryUiEscBound) {
      hostDocument.documentElement.dataset.jjksStoryUiEscBound = CONFIG.env;
      hostDocument.addEventListener('keydown', event => {
        if (event.key === 'Escape' && root.dataset.open === 'true') closeManager();
      });
    }

    applyManagerTheme();
    refreshManagerState();
    return root;
  }

  function openManager() {
    const root = ensureManagerDom();
    refreshManagerState();
    root.dataset.open = 'true';
    root.querySelector('[data-jjks-manager-close]')?.focus?.();
  }

  function closeManager() {
    const root = hostDocument.getElementById(CONFIG.managerRootId);
    if (root) root.dataset.open = 'false';
  }

  function refreshManagerState() {
    const root = hostDocument.getElementById(CONFIG.managerRootId);
    if (!root) return;

    const data = diagnose();
    const modules = data.已注册模块 || [];
    const setText = (name, value) => {
      const node = root.querySelector(`[data-jjks-status="${name}"]`);
      if (node) node.textContent = String(value);
    };

    setText('env', data.环境);
    setText('version', data.入口版本);
    setText('loader', data.加载器状态);
    setText('theme', data.当前主题 === 'night' ? '暗色模式' : '米白模式');
    setText('ui-source', data.UI实例来源 || '-');
    setText('host', data.宿主命中SillyTavern ? 'SillyTavern 宿主已命中' : '未命中');
    setText('modules', modules.length);
    setText('roots', data.故事UI节点数);

    const chips = root.querySelector('[data-jjks-module-chips]');
    if (chips)
      chips.innerHTML = modules.length
        ? modules.map(item => `<span class="jjks-manager-chip">${item}</span>`).join('')
        : '<span class="jjks-manager-chip">暂无已注册模块</span>';

    root.querySelectorAll('[data-jjks-theme]').forEach(button => {
      button.dataset.active = button.dataset.jjksTheme === data.当前主题 ? 'true' : 'false';
    });

    const warning = root.querySelector('[data-jjks-warning]');
    const otherState = data.另一个环境状态;
    if (warning) {
      warning.dataset.visible = otherState ? 'true' : 'false';
      warning.textContent = otherState
        ? `检测到另一个环境也可能已启用：${otherState.displayEnv || otherState.env}。建议同一时间只启用测试版或正式版之一。`
        : '';
    }

    const diagnosis = root.querySelector('[data-jjks-diagnosis]');
    if (diagnosis) diagnosis.textContent = formatDiagnosis(data);
    applyManagerTheme(data.当前主题);
  }

  async function reloadResources() {
    loaderStatus = 'loading';
    lastError = '';
    refreshManagerState();

    try {
      getUi()?.scanner?.destroy?.();
    } catch (error) {
      console.warn(`${logPrefix} scanner destroy 失败`, error);
    }

    document
      .querySelectorAll(
        `script[data-jjks-story-ui-loader="${LOADER_MARK}"], script[data-story-ui-script*="/story_regex_ui_${CONFIG.env}/"], link[data-story-ui-css*="/story_regex_ui_${CONFIG.env}/"]`,
      )
      .forEach(node => node.remove());

    try {
      window[CONFIG.loaderFlag] = false;
      window[CONFIG.globalKey] = undefined;
    } catch {
      // ignore reset failures
    }

    loaderPromise = null;
    try {
      await ensureLoader();
      messageSignatures.clear();
      mountedModulesByMessage.clear();
      recentScannedMessageIds.length = 0;
      queueScan(getRecentMessageIds(INITIAL_SCAN_LIMIT));
      notify('资源已重新加载', 'success');
    } catch (error) {
      console.error(`${logPrefix} 重载资源失败`, error);
      notify(`资源重载失败：${error?.message || error}`, 'error');
    } finally {
      refreshManagerState();
    }
  }

  function handleManagerAction(action) {
    if (action === 'scan') {
      queueScan(getRecentMessageIds(INITIAL_SCAN_LIMIT));
      notify('已触发手动重扫', 'success');
      return;
    }
    if (action === 'diagnose') {
      refreshManagerState();
      notify('诊断信息已刷新', 'info');
      return;
    }
    if (action === 'reload') {
      reloadResources();
    }
  }

  function bindEvents() {
    const on = window.eventOn;
    const events = window.tavern_events;
    if (!on || !events) {
      console.warn(`${logPrefix} 酒馆事件 API 不可用，将仅依赖初始扫描与 loader MutationObserver。`);
      return;
    }

    on(events.APP_READY, () => {
      queueScan(getRecentMessageIds(INITIAL_SCAN_LIMIT));
      queueRetryRecentScan();
    });
    on(events.USER_MESSAGE_RENDERED, messageId => queueScan(messageId));
    on(events.CHARACTER_MESSAGE_RENDERED, messageId => queueScan(messageId));
    on(events.MESSAGE_UPDATED, messageId => queueScan(messageId));
    on(events.MESSAGE_EDITED, messageId => queueScan(messageId));
    on(events.MESSAGE_SWIPED, messageId => queueScan(messageId));
    on(events.MORE_MESSAGES_LOADED, () => {
      queueScan(getRecentMessageIds(INITIAL_SCAN_LIMIT));
      queueRetryRecentScan();
    });
    on(events.CHAT_CHANGED, () =>
      window.setTimeout(() => {
        queueScan(getRecentMessageIds(INITIAL_SCAN_LIMIT));
        queueRetryRecentScan();
      }, 300),
    );
  }

  function registerManagerButton() {
    try {
      notify('咒回前端管理正在载入，请稍候…', 'info');

      if (window.appendInexistentScriptButtons) {
        window.appendInexistentScriptButtons([{ name: CONFIG.buttonName, visible: true }]);
      } else if (window.replaceScriptButtons) {
        window.replaceScriptButtons([{ name: CONFIG.buttonName, visible: true }]);
      }

      const bindButtonClickFallback = () => {
        const candidates = Array.from(hostDocument.querySelectorAll('button')).filter(button => {
          const name = (button.textContent || '').trim();
          return name === CONFIG.buttonName || name.includes(CONFIG.buttonName);
        });

        candidates.forEach(button => {
          if (button.dataset.jjksStoryUiBound === CONFIG.env) return;
          button.dataset.jjksStoryUiBound = CONFIG.env;
          button.addEventListener('click', event => {
            try {
              event.preventDefault();
              event.stopPropagation();
            } catch {
              // ignore
            }
            openManager();
            console.info(`${logPrefix} 已通过宿主页面按钮兜底绑定打开管理面板。`);
          });
        });
      };

      const bindByEventApi = () => {
        const eventName = window.getButtonEvent?.(CONFIG.buttonName);
        if (eventName && window.eventOn) {
          window.eventOn(eventName, openManager);
          return true;
        }
        return false;
      };

      const bound = bindByEventApi();
      bindButtonClickFallback();

      if (!bound) {
        console.warn(`${logPrefix} 脚本按钮事件 API 不可用，已启用点击兜底绑定。`);
        window.setTimeout(() => {
          bindButtonClickFallback();
        }, 500);
      } else {
        console.info(`${logPrefix} 已通过酒馆按钮事件 API 绑定管理按钮。`);
      }

      notify('咒回前端管理已就绪，点击按钮可打开管理界面。', 'success');
    } catch (error) {
      console.error(`${logPrefix} 注册管理按钮失败`, error);
      notify(`咒回前端管理初始化失败：${error?.message || error}`, 'error');
    }
  }

  function exposeManagerApi() {
    const api = {
      ensureLoader,
      queueScan,
      openManager,
      closeManager,
      diagnose,
      reloadResources,
      setTheme,
      hostWindow,
      hostDocument,
    };

    window.JJKSStoryUiManager = window.JJKSStoryUiManager || {};
    window.JJKSStoryUiManager[CONFIG.env] = api;
    hostWindow.JJKSStoryUiManager = hostWindow.JJKSStoryUiManager || {};
    hostWindow.JJKSStoryUiManager[CONFIG.env] = api;
    hostDocument.documentElement.dataset.jjksStoryUiHost = CONFIG.env;
    hostDocument.documentElement.dataset.jjksStoryUiHostEqualsWindow = hostWindow === window ? 'true' : 'false';
    hostDocument.documentElement.dataset.jjksStoryUiHostLocation = hostWindow?.location?.href || '';
  }

  exposeManagerApi();

  registerManagerButton();
  bindEvents();
  ensureLoader()
    .then(() => {
      notify('故事 UI 外置资源加载完成。', 'success');
      queueScan(getRecentMessageIds(INITIAL_SCAN_LIMIT));
      queueRetryRecentScan();
    })
    .catch(error => console.error(`${logPrefix} 初始化失败`, error));
})();
