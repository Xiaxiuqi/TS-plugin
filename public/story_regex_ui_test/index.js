(() => {
  const CONFIG = {
    env: 'test',
    displayEnv: '测试版',
    version: 'test-after-native-20260514',
    publicBaseUrl: 'https://ts-plugin.pages.dev/story_regex_ui_test/',
    localBasePath: '/scripts/extensions/third-party/tavern_helper_template/story_regex_ui_test/',
    globalKey: 'StoryRegexUI',
    loaderFlag: '__storyRegexUiLoaderReady',
    themeKey: 'jjks_story_ui_theme',
    buttonName: '咒回前端管理',
    reloadButtonName: '重载资源',
    managerRootId: 'jjks-story-ui-manager-test',
  };

  const INDEX_FLAG = `__jjksStoryUiIndex_${CONFIG.env}`;
  const STYLE_MARK = `jjks-manager-style-${CONFIG.env}`;
  const LOADER_MARK = `jjks-story-ui-loader-${CONFIG.env}`;
  const logPrefix = `[StoryRegexUI:${CONFIG.env}]`;
  const MODULE_LABELS = {
    'story-engine': '故事引擎',
    'bp-panel': 'BP战力雷达',
    'bp-panel-newvars': 'BP战力雷达（新变量）',
    'world-log': '世界运行报告',
    'relation-status': '角色羁绊档案',
    'variable-update': '变量更新',
    'mvu-status': 'MVU状态栏',
    'mvu-status-newvars': 'MVU状态栏（新变量）',
  };
  const AFTER_NATIVE_ANCHOR_NEEDLES = {
    'bp-panel': ['已扫描目标', 'BP战力雷达', '扫描状态', 'BP总值', '总BP'],
    'story-engine': ['最终修正', '全域锚定', 'STORY ENGINE', 'NPC驱动'],
    'world-log': ['世界主线', 'Time passed:', '世界运行报告', '当前地点'],
  };

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
  let lastScanStats = {
    messageIds: [],
    hasScriptModeMatch: false,
    hasAfterNativeModeMatch: false,
    skippedNativeOrOffOnly: [],
    scriptRewritten: [],
    afterNativeMounted: [],
    afterNativeSkipped: [],
    afterNativeHidden: [],
  };
  let collapseOldMessagesEnabled = true;
  let collapseOldMessagesBusy = false;
  let managerActionBusy = false;
  const moduleToggleBusy = new Set();

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

  const bootstrapUi = window[CONFIG.globalKey] || (window[CONFIG.globalKey] = {});
  bootstrapUi.runtime = bootstrapUi.runtime || {};
  bootstrapUi.runtime.renderDepth = INITIAL_SCAN_LIMIT;
  bootstrapUi.runtime.themeRerenderLimit = INITIAL_SCAN_LIMIT;

  try {
    collapseOldMessagesEnabled = localStorage.getItem('jjks_story_ui_collapse_old_messages') !== 'false';
  } catch {
    collapseOldMessagesEnabled = true;
  }

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
      throw error;
    });

    return loaderPromise;
  }

  function getDisplayedMessageElement(messageId) {
    if (messageId === undefined || messageId === null) return null;
    try {
      const retrieveDisplayedMessage =
        hostWindow.retrieveDisplayedMessage ||
        window.retrieveDisplayedMessage ||
        hostWindow.TavernHelper?.retrieveDisplayedMessage ||
        window.TavernHelper?.retrieveDisplayedMessage;
      const byHelper = retrieveDisplayedMessage?.(messageId)?.[0];
      if (byHelper) return byHelper.closest?.('.mes[mesid]') || byHelper;
    } catch {
      // ignore helper failures
    }

    return hostDocument.querySelector?.(`.mes[mesid="${messageId}"]`) || null;
  }

  function getDisplayedMessageContentElement(messageId) {
    if (messageId === undefined || messageId === null) return null;
    try {
      const retrieveDisplayedMessage =
        hostWindow.retrieveDisplayedMessage ||
        window.retrieveDisplayedMessage ||
        hostWindow.TavernHelper?.retrieveDisplayedMessage ||
        window.TavernHelper?.retrieveDisplayedMessage;
      const byHelper = retrieveDisplayedMessage?.(messageId)?.[0];
      if (byHelper) return byHelper;
    } catch {
      // ignore helper failures
    }

    return getDisplayedMessageTextElement(getDisplayedMessageElement(messageId));
  }

  function getRenderedMessageIds(limit = INITIAL_SCAN_LIMIT) {
    const nodes = Array.from(hostDocument.querySelectorAll('.mes[mesid]'));
    const ids = nodes.map(node => Number(node.getAttribute('mesid'))).filter(Number.isFinite);

    renderedWindowSize = ids.length;
    const activeUi = getUi();
    if (activeUi?.runtime) {
      activeUi.runtime.renderDepth = limit;
      activeUi.runtime.themeRerenderLimit = limit;
    }
    if (ids.length <= limit) return ids;
    return ids.slice(-limit);
  }

  function getRecentMessageIds(limit = INITIAL_SCAN_LIMIT) {
    return getRenderedMessageIds(limit);
  }

  function readRawMessage(messageId) {
    try {
      const getChatMessages =
        hostWindow.getChatMessages ||
        window.getChatMessages ||
        hostWindow.TavernHelper?.getChatMessages ||
        window.TavernHelper?.getChatMessages;
      return getChatMessages?.(messageId)?.[0] || null;
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

  function restoreAfterNativeHiddenSource(messageElement) {
    if (!messageElement) return;
    messageElement.querySelectorAll?.('[data-story-ui-after-native-hidden-source="true"]').forEach(node => {
      node.hidden = false;
      node.removeAttribute('aria-hidden');
      node.classList?.remove('story-ui-after-native-hidden-source');
      delete node.dataset.storyUiAfterNativeHiddenSource;
      delete node.dataset.storyUiAfterNativeHiddenModule;
    });
  }

  function clearAfterNativeMountedStoryUi(messageElement) {
    if (!messageElement) return;
    messageElement.querySelectorAll?.('[data-story-ui-after-native-mount="true"]').forEach(node => node.remove());
    restoreAfterNativeHiddenSource(messageElement);
  }

  function clearAllMountedStoryUi(messageElement) {
    clearMountedStoryUi(messageElement);
    clearAfterNativeMountedStoryUi(messageElement);
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
    return Boolean(
      messageElement.querySelector?.('[data-story-ui-raw-mount="true"], [data-story-ui-after-native-mount="true"]'),
    );
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

    const source = String(rawText || '').replace(/\r\n?/g, '\n');
    let match = source.match(new RegExp(`${escapeRegex(block.open)}([\\s\\S]*?)${escapeRegex(block.close)}`, 'i'));

    if (!match && module?.id === 'story-engine') {
      match = source.match(
        /<story_driver>[\s\S]*?(?:<combat_driver>[\s\S]*?<\/combat_driver>[\s\S]*?)?(?:━━\s*3[.．、]\s*最终修正\s*━━[\s\S]*)?/i,
      );
    }

    if (!match) return null;

    return {
      fullMatch: match[0],
      content: String(match[1] || match[0] || '').trim(),
      block,
    };
  }

  function moduleMatchesRawText(module, rawText) {
    return Boolean(extractModuleContent(module, rawText));
  }

  function moduleMatchesSingleTag(module, rawText) {
    return Boolean(module?.singleTag) && String(rawText || '').includes(module.singleTag);
  }

  function buildNodeForModule(module, rawText, context) {
    if (typeof module?.renderContent === 'function' && module?.singleTag === '<StatusPlaceHolderImpl/>') {
      return getUi()?.registry?.safelyCall(module, 'renderContent', '', {
        ...context,
        rawText,
      });
    }
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
    const formatAsDisplayedMessage =
      hostWindow.formatAsDisplayedMessage ||
      window.formatAsDisplayedMessage ||
      hostWindow.TavernHelper?.formatAsDisplayedMessage ||
      window.TavernHelper?.formatAsDisplayedMessage;
    if (typeof formatAsDisplayedMessage === 'function') {
      return formatAsDisplayedMessage(source, { message_id: messageId });
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

  function findStatusPlaceholderMatch(modules, rawText, startIndex) {
    const target = '<StatusPlaceHolderImpl/>';
    let best = null;
    modules.forEach(module => {
      if (module?.singleTag !== target) return;
      const index = String(rawText || '').indexOf(target, startIndex);
      if (index < 0) return;
      if (!best || index < best.start || (index === best.start && module.priority > best.module.priority)) {
        best = {
          module,
          start: index,
          end: index + target.length,
          fullMatch: target,
          content: '',
          singleTag: target,
        };
      }
    });
    return best;
  }

  function findNextRenderableMatch(modules, rawText, startIndex) {
    const placeholderMatch = findStatusPlaceholderMatch(modules, rawText, startIndex);
    const blockMatch = findNextModuleMatch(modules, rawText, startIndex);

    if (!placeholderMatch) return blockMatch;
    if (!blockMatch) return placeholderMatch;
    if (placeholderMatch.start < blockMatch.start) return placeholderMatch;
    if (blockMatch.start < placeholderMatch.start) return blockMatch;
    return (placeholderMatch.module?.priority || 0) >= (blockMatch.module?.priority || 0)
      ? placeholderMatch
      : blockMatch;
  }

  function renderMessageHtmlByModules(messageId, rawText, modules, registry) {
    const scriptModules = (modules || []).filter(module => (registry?.getMode?.(module.id) || 'script') === 'script');
    if (scriptModules.length === 0) return { html: '', mounted: [] };

    const text = String(rawText || '').replace(/\r\n?/g, '\n');
    let cursor = 0;
    let textWithPlaceholders = '';
    const mounted = [];
    const replacements = [];
    const formatAsDisplayedMessage =
      hostWindow.formatAsDisplayedMessage ||
      window.formatAsDisplayedMessage ||
      hostWindow.TavernHelper?.formatAsDisplayedMessage ||
      window.TavernHelper?.formatAsDisplayedMessage;

    const replaceMountToken = (sourceHtml, token, replacementHtml) => {
      const escapedToken = escapeRegex(token);
      return String(sourceHtml || '')
        .replace(new RegExp(`<p[^>]*>\\s*${escapedToken}\\s*</p>`, 'g'), replacementHtml)
        .replace(new RegExp(`<span[^>]*>\\s*${escapedToken}\\s*</span>`, 'g'), replacementHtml)
        .split(token)
        .join(replacementHtml)
        .split(escapeHtml(token))
        .join(replacementHtml);
    };

    while (cursor < text.length) {
      const match = findNextRenderableMatch(scriptModules, text, cursor);
      if (!match) {
        textWithPlaceholders += text.slice(cursor);
        break;
      }

      textWithPlaceholders += text.slice(cursor, match.start);
      const rendered = buildNodeForModule(match.module, rawText, {
        messageId,
        messageElement: getDisplayedMessageElement(messageId),
        theme: getUi()?.theme?.getTheme?.() || 'day',
      });
      const moduleHtml = nodeToHtml(rendered);
      if (moduleHtml) {
        const token = `JJKSSTORYUIMOUNT${String(CONFIG.env).toUpperCase()}M${messageId}N${replacements.length}END`;
        textWithPlaceholders += token;
        replacements.push({
          token,
          html: `<section class="story-ui-raw-mount" data-story-ui-raw-mount="true" data-story-ui-module="${match.module.id}">${moduleHtml}</section>`,
        });
        mounted.push(match.module.id);
      } else {
        textWithPlaceholders += match.fullMatch;
      }

      cursor = match.end;
    }

    let html = '';
    if (typeof formatAsDisplayedMessage === 'function') {
      html = formatAsDisplayedMessage(textWithPlaceholders, { message_id: messageId });
    } else {
      html = textWithPlaceholders
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
    }

    replacements.forEach(({ token, html: replacementHtml }) => {
      html = replaceMountToken(html, token, replacementHtml);
    });

    return { html, mounted };
  }

  function getRenderableMatchesInOrder(modules, rawText) {
    const text = String(rawText || '').replace(/\r\n?/g, '\n');
    const matches = [];
    let cursor = 0;

    while (cursor < text.length) {
      const match = findNextRenderableMatch(modules, text, cursor);
      if (!match) break;
      matches.push(match);
      cursor = Math.max(match.end, match.start + 1);
    }

    return matches;
  }

  function createRawMountHost(module, moduleHtml) {
    const mountHost = createElementInHost('section');
    mountHost.className = 'story-ui-raw-mount';
    mountHost.dataset.storyUiRawMount = 'true';
    mountHost.dataset.storyUiModule = module.id;
    mountHost.innerHTML = moduleHtml;
    return mountHost;
  }

  function createAfterNativeMountHost(module, moduleHtml, messageId) {
    const mountHost = createElementInHost('section');
    mountHost.className = 'story-ui-after-native-mount';
    mountHost.dataset.storyUiAfterNativeMount = 'true';
    mountHost.dataset.storyUiModule = module.id;
    mountHost.dataset.storyUiMessageId = String(messageId);
    mountHost.innerHTML = moduleHtml;
    return mountHost;
  }

  function normalizeTextForAnchor(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function findAfterNativeAnchor(textElement, moduleId) {
    const needles = AFTER_NATIVE_ANCHOR_NEEDLES[moduleId] || [];
    if (!textElement || needles.length === 0) return null;

    const candidates = Array.from(textElement.querySelectorAll?.('*') || []).filter(node => {
      if (node === textElement) return false;
      if (node.closest?.('[data-story-ui-after-native-mount="true"], [data-story-ui-raw-mount="true"]')) return false;
      const text = normalizeTextForAnchor(node.innerText || node.textContent || '');
      if (!text || text.length > 2500) return false;
      return needles.some(needle => text.includes(needle));
    });

    return (
      candidates
        .map(node => {
          const text = normalizeTextForAnchor(node.innerText || node.textContent || '');
          const childHits = Array.from(node.children || []).filter(child =>
            needles.some(needle => normalizeTextForAnchor(child.innerText || child.textContent || '').includes(needle)),
          ).length;
          return { node, score: text.length + childHits * 600 };
        })
        .sort((a, b) => a.score - b.score)[0]?.node || null
    );
  }

  function normalizeAfterNativeSourceText(value) {
    return normalizeTextForAnchor(
      String(value || '')
        .replace(/<!--([\s\S]*?)-->/g, ' ')
        .replace(/<\/?[a-zA-Z][^>]*>/g, ' ')
        .replace(/[｜|]/g, ' '),
    );
  }

  function buildAfterNativeHideNeedles(module, rawText) {
    const needles = [];
    const pushNeedle = value => {
      const needle = normalizeAfterNativeSourceText(value);
      if (needle.length >= 4 && needle.length <= 180 && !needles.includes(needle)) needles.push(needle);
    };

    (AFTER_NATIVE_ANCHOR_NEEDLES[module?.id] || []).forEach(pushNeedle);
    const extracted = extractModuleContent(module, rawText);
    const source = normalizeAfterNativeSourceText(extracted?.content || extracted?.fullMatch || '');
    source
      .split(/(?:\n| {2,}|\*\*\*\*)/)
      .map(line => line.trim())
      .filter(line => line.length >= 4 && line.length <= 180)
      .slice(0, 36)
      .forEach(pushNeedle);

    return needles;
  }

  function getAfterNativeHideContainer(node, textElement) {
    if (!node || node === textElement) return null;
    const blockTags = new Set(['P', 'LI', 'PRE', 'BLOCKQUOTE', 'DETAILS', 'SUMMARY', 'SECTION', 'ARTICLE', 'TABLE', 'UL', 'OL']);
    let current = node;
    while (current && current.parentElement && current.parentElement !== textElement) {
      if (blockTags.has(current.tagName)) return current;
      current = current.parentElement;
    }
    return current && current !== textElement ? current : null;
  }

  function hideAfterNativeVisibleSource(textElement, module, rawText, anchor) {
    const needles = buildAfterNativeHideNeedles(module, rawText);
    const selected = [];
    const pushNode = node => {
      const container = getAfterNativeHideContainer(node, textElement);
      if (!container) return;
      if (container.closest?.('[data-story-ui-after-native-mount="true"], [data-story-ui-raw-mount="true"]')) return;
      if (!selected.includes(container)) selected.push(container);
    };

    pushNode(anchor);
    Array.from(textElement.querySelectorAll?.('*') || []).forEach(node => {
      if (node === textElement) return;
      if (node.closest?.('[data-story-ui-after-native-mount="true"], [data-story-ui-raw-mount="true"]')) return;
      const text = normalizeAfterNativeSourceText(node.innerText || node.textContent || '');
      if (!text || text.length > 2500) return;
      if (needles.some(needle => text.includes(needle))) pushNode(node);
    });

    const minimal = selected.filter(node => !selected.some(other => other !== node && node.contains(other)));
    minimal.forEach(node => {
      node.dataset.storyUiAfterNativeHiddenSource = 'true';
      node.dataset.storyUiAfterNativeHiddenModule = module.id;
      node.hidden = true;
      node.setAttribute('aria-hidden', 'true');
      node.classList?.add('story-ui-after-native-hidden-source');
    });
    return minimal.length;
  }

  function collectTextNodes(root) {
    const nodes = [];
    const nodeFilter = hostWindow.NodeFilter || window.NodeFilter;
    const walker = hostDocument.createTreeWalker(root, nodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return nodeFilter.FILTER_REJECT;
        if (parent.closest?.('[data-story-ui-raw-mount="true"]')) return nodeFilter.FILTER_REJECT;
        return nodeFilter.FILTER_ACCEPT;
      },
    });

    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    return nodes;
  }

  function findTextRange(root, sourceText) {
    const target = String(sourceText || '').replace(/\r\n?/g, '\n');
    if (!target) return null;

    const nodes = collectTextNodes(root);
    const chunks = [];
    let combined = '';
    nodes.forEach(node => {
      const raw = node.textContent || '';
      const normalized = raw.replace(/\r\n?/g, '\n');
      chunks.push({ node, raw, normalized, start: combined.length, end: combined.length + normalized.length });
      combined += normalized;
    });

    const startIndex = combined.indexOf(target);
    const endIndex = startIndex >= 0 ? startIndex + target.length : -1;
    if (startIndex < 0) {
      const compactCombined = combined.replace(/[ \t]+/g, ' ');
      const compactTarget = target.replace(/[ \t]+/g, ' ');
      const compactIndex = compactCombined.indexOf(compactTarget);
      if (compactIndex < 0) return null;
      return null;
    }

    const startChunk = chunks.find(chunk => startIndex >= chunk.start && startIndex <= chunk.end);
    const endChunk = chunks.find(chunk => endIndex >= chunk.start && endIndex <= chunk.end);
    if (!startChunk || !endChunk) return null;

    const range = hostDocument.createRange();
    range.setStart(startChunk.node, startIndex - startChunk.start);
    range.setEnd(endChunk.node, endIndex - endChunk.start);
    return range;
  }

  function replaceRawTextWithMountHost(textElement, rawSource, mountHost) {
    const candidates = [String(rawSource || ''), String(rawSource || '').trim()].filter(Boolean);
    for (const candidate of candidates) {
      const range = findTextRange(textElement, candidate);
      if (!range) continue;
      range.deleteContents();
      range.insertNode(mountHost);
      return true;
    }
    return false;
  }

  function mountStoryUiHosts(textElement, registry, rawText, messageId) {
    const ui = getUi();
    textElement.querySelectorAll?.('.story-ui-root').forEach(root => ui?.theme?.applyThemeToRoot?.(root));
    textElement.querySelectorAll?.('[data-story-ui-raw-mount="true"]').forEach(mountHost => {
      const moduleId = mountHost.getAttribute('data-story-ui-module');
      const module = registry.list({ includeDisabled: true }).find(item => item.id === moduleId);
      if (!module || registry.getMode?.(moduleId) !== 'script') return;
      registry.safelyCall(module, 'mount', mountHost, {
        kind: 'raw-token',
        rawText,
        messageId,
        node: mountHost,
        mode: 'script',
      });
    });
  }

  function mountAfterNativeModulesForMessage({ messageId, rawText, messageElement, textElement, modules, registry }) {
    const ui = getUi();
    const result = { mounted: [], skipped: [] };
    clearAfterNativeMountedStoryUi(messageElement);

    modules.forEach(module => {
      const rendered = buildNodeForModule(module, rawText, {
        kind: 'after-native',
        mode: 'after-native',
        messageId,
        messageElement,
        textElement,
        theme: ui?.theme?.getTheme?.() || 'day',
      });
      const moduleHtml = nodeToHtml(rendered);
      if (!moduleHtml) {
        result.skipped.push({ moduleId: module.id, reason: 'render-empty-or-raw-not-matched' });
        return;
      }

      const anchor = findAfterNativeAnchor(textElement, module.id);
      if (!anchor) {
        result.skipped.push({ moduleId: module.id, reason: 'anchor-not-found' });
        return;
      }

      const mountHost = createAfterNativeMountHost(module, moduleHtml, messageId);
      anchor.insertAdjacentElement('afterend', mountHost);
      const hiddenCount = hideAfterNativeVisibleSource(textElement, module, rawText, anchor);
      mountHost.dataset.storyUiAfterNativeHiddenCount = String(hiddenCount);
      mountHost.querySelectorAll?.('.story-ui-root').forEach(root => ui?.theme?.applyThemeToRoot?.(root));
      registry.safelyCall(module, 'mount', mountHost, {
        kind: 'after-native',
        rawText,
        messageId,
        node: mountHost,
        messageElement,
        textElement,
        mode: 'after-native',
      });
      result.mounted.push(module.id);
      if (hiddenCount <= 0) result.skipped.push({ moduleId: module.id, reason: 'source-hide-not-found' });
    });

    messageElement.dataset.storyUiAfterNativeMounted = result.mounted.join('|');
    messageElement.dataset.storyUiAfterNativeSkipped = result.skipped
      .map(item => `${item.moduleId}:${item.reason}`)
      .join('|');
    return result;
  }

  function mountModulesForMessage(messageId, rawText) {
    const messageElement = getDisplayedMessageElement(messageId);
    if (!messageElement) return false;

    const ui = getUi();
    const registry = ui?.registry;
    if (!registry) return false;

    const modules = registry
      .list({ includeDisabled: true })
      .filter(module => moduleMatchesRawText(module, rawText) || moduleMatchesSingleTag(module, rawText));
    if (modules.length === 0) {
      clearAllMountedStoryUi(messageElement);
      mountedModulesByMessage.delete(messageId);
      return false;
    }

    const matchedModules = modules.map(module => ({
      id: module.id,
      mode: registry.getMode?.(module.id) || (module.enabled === false ? 'off' : 'script'),
    }));
    const scriptModules = modules.filter(module => (registry.getMode?.(module.id) || 'script') === 'script');
    const afterNativeModules = modules.filter(module => (registry.getMode?.(module.id) || 'script') === 'after-native');
    const hasScriptModeMatch = scriptModules.length > 0;
    const hasAfterNativeModeMatch = afterNativeModules.length > 0;
    messageElement.dataset.storyUiHasScriptModeMatch = hasScriptModeMatch ? 'true' : 'false';
    messageElement.dataset.storyUiHasAfterNativeModeMatch = hasAfterNativeModeMatch ? 'true' : 'false';
    messageElement.dataset.storyUiMatchedModes = matchedModules.map(item => `${item.id}:${item.mode}`).join('|');

    if (!hasScriptModeMatch && !hasAfterNativeModeMatch) {
      clearAllMountedStoryUi(messageElement);
      mountedModulesByMessage.delete(messageId);
      return false;
    }

    const textElement = getDisplayedMessageContentElement(messageId);
    if (!textElement) return false;

    const mounted = [];
    if (hasScriptModeMatch) {
      const rendered = renderMessageHtmlByModules(messageId, rawText, modules, registry);
      if (rendered.mounted.length) {
        textElement.innerHTML = rendered.html;
        mountStoryUiHosts(textElement, registry, rawText, messageId);
        mounted.push(...rendered.mounted.map(moduleId => `${moduleId}:script`));
      } else {
        clearMountedStoryUi(messageElement);
      }
    } else {
      clearMountedStoryUi(messageElement);
    }

    if (hasAfterNativeModeMatch) {
      const afterNative = mountAfterNativeModulesForMessage({
        messageId,
        rawText,
        messageElement,
        textElement,
        modules: afterNativeModules,
        registry,
      });
      mounted.push(...afterNative.mounted.map(moduleId => `${moduleId}:after-native`));
    } else {
      clearAfterNativeMountedStoryUi(messageElement);
      messageElement.dataset.storyUiAfterNativeMounted = '';
      messageElement.dataset.storyUiAfterNativeSkipped = '';
    }

    if (mounted.length > 0) {
      mountedModulesByMessage.set(messageId, mounted);
    } else {
      mountedModulesByMessage.delete(messageId);
    }

    return mounted.length > 0;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderCollapsedBlock(blockText, title) {
    return `<details class="story-ui-code-placeholder"><summary>${escapeHtml(title)}</summary><pre>${escapeHtml(blockText)}</pre></details>`;
  }

  function mountCollapsedPlaceholderForMessage(messageId, rawText) {
    void messageId;
    void rawText;
    return false;
  }

  function scanMessageIds(messageIds, mode = 'incremental') {
    if (!Array.isArray(messageIds) || messageIds.length === 0) return;
    lastScanMode = mode;
    const uniqueIds = Array.from(new Set(messageIds.filter(Number.isFinite)));
    const activeSet = new Set(uniqueIds);
    const recentRenderedSet = new Set(getRecentMessageIds(INITIAL_SCAN_LIMIT));
    const scanStats = {
      messageIds: uniqueIds.slice(),
      hasScriptModeMatch: false,
      hasAfterNativeModeMatch: false,
      skippedNativeOrOffOnly: [],
      scriptRewritten: [],
      afterNativeMounted: [],
      afterNativeSkipped: [],
      afterNativeHidden: [],
    };

    uniqueIds.forEach(messageId => {
      const chatMessage = readRawMessage(messageId);
      const rawText = chatMessage?.message || '';
      const registry = getUi()?.registry;
      const modules = registry?.list?.({ includeDisabled: true }) || [];
      const matchedModules = modules.filter(module => moduleMatchesRawText(module, rawText) || moduleMatchesSingleTag(module, rawText));
      const matchedScriptModules = matchedModules.filter(module => (registry?.getMode?.(module.id) || 'script') === 'script');
      const matchedAfterNativeModules = matchedModules.filter(
        module => (registry?.getMode?.(module.id) || 'script') === 'after-native',
      );
      const matchedNativeOrOffModules = matchedModules.filter(module => {
        const moduleMode = registry?.getMode?.(module.id) || 'script';
        return moduleMode !== 'script' && moduleMode !== 'after-native';
      });
      if (matchedScriptModules.length > 0) scanStats.hasScriptModeMatch = true;
      if (matchedAfterNativeModules.length > 0) scanStats.hasAfterNativeModeMatch = true;
      if (matchedModules.length > 0 && matchedScriptModules.length === 0 && matchedAfterNativeModules.length === 0) {
        scanStats.skippedNativeOrOffOnly.push({
          messageId,
          modules: matchedNativeOrOffModules.map(module => `${module.id}:${registry?.getMode?.(module.id) || 'script'}`),
        });
      }

      const modeSignature = modules.map(module => `${module.id}:${registry?.getMode?.(module.id) || 'script'}`).join('|');
      const signature = `${computeSignature(rawText)}|modes:${modeSignature}`;
      const hasDisplayHost = Boolean(getDisplayedMessageElement(messageId));
      const previousSignature = messageSignatures.get(messageId);
      if (previousSignature === signature && hasDisplayHost) return;

      messageSignatures.set(messageId, signature);
      if (mountModulesForMessage(messageId, rawText)) {
        const messageElement = getDisplayedMessageElement(messageId);
        if (matchedScriptModules.length > 0) {
          scanStats.scriptRewritten.push({
            messageId,
            modules: matchedScriptModules.map(module => module.id),
          });
        }
        if (matchedAfterNativeModules.length > 0) {
          const mounted = String(messageElement?.dataset?.storyUiAfterNativeMounted || '')
            .split('|')
            .filter(Boolean);
          const skipped = String(messageElement?.dataset?.storyUiAfterNativeSkipped || '')
            .split('|')
            .filter(Boolean);
          const hidden = Array.from(
            messageElement?.querySelectorAll?.('[data-story-ui-after-native-hidden-source="true"]') || [],
          ).map(node => `${node.dataset.storyUiAfterNativeHiddenModule || 'unknown'}:${node.tagName.toLowerCase()}`);
          if (mounted.length > 0) {
            scanStats.afterNativeMounted.push({ messageId, modules: mounted });
          }
          if (skipped.length > 0) {
            scanStats.afterNativeSkipped.push({ messageId, modules: skipped });
          }
          if (hidden.length > 0) {
            scanStats.afterNativeHidden.push({ messageId, nodes: hidden });
          }
        }
      }
    });

    getRenderedMessageIds(Number.MAX_SAFE_INTEGER).forEach(messageId => {
      if (activeSet.has(messageId) || recentRenderedSet.has(messageId)) return;
      const chatMessage = readRawMessage(messageId);
      const rawText = chatMessage?.message || '';
      if (!rawText) return;
      mountCollapsedPlaceholderForMessage(messageId, rawText);
    });

    lastScanStats = scanStats;
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
    const modules = ui?.registry?.list({ includeDisabled: true }) || [];
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
      模块显示模式: Object.fromEntries(
        modules.map(module => [module.id, ui?.registry?.getMode?.(module.id) || (module.enabled === false ? 'off' : 'script')]),
      ),
      已注册模块: modules.map(module => {
        const mode = ui?.registry?.getMode?.(module.id) || (module.enabled === false ? 'off' : 'script');
        return `${module.id}@${module.version || 'unknown'} [mode=${mode}]`;
      }),
      故事UI节点数: storyRoots,
      管理界面已创建: managerExists,
      宿主命中TavernHelper: Boolean(hostWindow?.TavernHelper),
      UI实例来源: getUiSource(),
      宿主命中SillyTavern: Boolean(hostWindow?.SillyTavern),
      另一个环境状态: otherState,
      最近扫描窗口: renderedWindowSize,
      最近扫描楼层: recentScannedMessageIds.slice(),
      扫描模式: lastScanMode,
      最近扫描包含脚本接管模块: Boolean(lastScanStats.hasScriptModeMatch),
      最近扫描包含共存增强模块: Boolean(lastScanStats.hasAfterNativeModeMatch),
      最近跳过原生或关闭楼层: lastScanStats.skippedNativeOrOffOnly.slice(-8),
      最近脚本重写楼层: lastScanStats.scriptRewritten.slice(-8),
      最近共存增强挂载楼层: lastScanStats.afterNativeMounted.slice(-8),
      最近共存增强隐藏原文楼层: lastScanStats.afterNativeHidden.slice(-8),
      最近共存增强跳过楼层: lastScanStats.afterNativeSkipped.slice(-8),
      最近错误: lastError || '无',
      诊断时间: new Date().toLocaleString(),
    };

    return lastDiagnosis;
  }

  function formatDiagnosis(data) {
    const hiddenKeys = new Set(['环境', '环境标识', '入口版本', '入口目录', '加载器地址', 'UI实例来源']);
    return Object.entries(data)
      .filter(([key]) => !hiddenKeys.has(key))
      .map(([key, value]) => {
        if (Array.isArray(value)) return `${key}: ${value.length ? value.join(', ') : '无'}`;
        if (value && typeof value === 'object') return `${key}: ${JSON.stringify(value, null, 2)}`;
        if (typeof value === 'boolean') {
          return `${key}: <span class="jjks-manager-bool ${value ? 'is-true' : 'is-false'}">${value}</span>`;
        }
        return `${key}: ${value}`;
      })
      .join('\n');
  }

  function persistCollapseOldMessages(enabled) {
    try {
      localStorage.setItem('jjks_story_ui_collapse_old_messages', enabled ? 'true' : 'false');
    } catch {
      // ignore persistence failures
    }
  }

  function getManagerView() {
    return (
      hostWindow.JJKSStoryUiManagerView || window.JJKSStoryUiManagerView || globalThis.JJKSStoryUiManagerView || null
    );
  }

  async function ensureManagerUiReady(timeout = 5000) {
    if (getManagerView()) return true;

    const styleHref = toUrl('modules/manager-ui/style.css');
    if (!hostDocument.querySelector(`link[href="${styleHref}"]`)) {
      const link = createElementInHost('link');
      link.rel = 'stylesheet';
      link.href = styleHref;
      (hostDocument.head || hostDocument.body).appendChild(link);
    }

    const scriptSrc = toUrl('modules/manager-ui/index.js');
    if (!hostDocument.querySelector(`script[src="${scriptSrc}"]`)) {
      const script = createElementInHost('script');
      script.src = scriptSrc;
      script.async = false;
      (hostDocument.head || hostDocument.body).appendChild(script);
    }

    const startedAt = Date.now();
    while (Date.now() - startedAt < timeout) {
      if (getManagerView()) return true;
      await new Promise(resolve => window.setTimeout(resolve, 50));
    }

    return Boolean(getManagerView());
  }

  async function ensureManagerAssetsReady() {
    await ensureLoader();
    const styleHref = toUrl('modules/manager-ui/style.css');
    let link = hostDocument.querySelector(`link[href="${styleHref}"]`);
    if (!link) {
      link = createElementInHost('link');
      link.rel = 'stylesheet';
      link.href = styleHref;
      (hostDocument.head || hostDocument.body).appendChild(link);
    }

    if (!link.dataset.jjksReady) {
      await new Promise(resolve => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          link.dataset.jjksReady = 'true';
          resolve();
        };
        link.addEventListener('load', done, { once: true });
        link.addEventListener('error', done, { once: true });
        window.setTimeout(done, 300);
      });
    }

    await ensureManagerUiReady();
  }

  function renderManagerPanel(root, panel) {
    const managerView = getManagerView();
    panel.innerHTML =
      managerView?.buildPanelHtml?.({
        displayEnv: CONFIG.displayEnv,
        loaderStatus,
      }) ||
      '<header class="jjks-manager-head"><div><h2>咒回前端管理</h2><p>界面模块未就绪，请稍后重试。</p></div><button class="jjks-manager-close" type="button" data-jjks-manager-close aria-label="关闭">×</button></header><main class="jjks-manager-body"><div class="jjks-manager-column"><section class="jjks-manager-card"><h3>界面模块未就绪</h3></section></div></main>';
    root.dataset.jjksManagerFallback = managerView ? 'false' : 'true';

    const themeActions = panel.querySelector('[data-jjks-theme-actions]');
    if (themeActions && !themeActions.childElementCount) {
      themeActions.appendChild(createButton('米白模式', { 'data-jjks-theme': 'day' }));
      themeActions.appendChild(createButton('暗色模式', { 'data-jjks-theme': 'night' }));
    }

    const maintenanceActions = panel.querySelector('[data-jjks-maintenance-actions]');
    if (maintenanceActions && !maintenanceActions.childElementCount) {
      maintenanceActions.appendChild(createButton('手动重扫', { 'data-jjks-action': 'scan' }));
      maintenanceActions.appendChild(createButton('重载资源', { 'data-jjks-action': 'reload' }));
      maintenanceActions.appendChild(createButton('刷新诊断', { 'data-jjks-action': 'diagnose' }));
      maintenanceActions.appendChild(
        createButton(collapseOldMessagesEnabled ? '旧消息折叠' : '旧消息未折叠', {
          'data-jjks-action': 'toggle-old-collapse',
          'data-jjks-toggle-state': collapseOldMessagesEnabled ? 'on' : 'off',
        }),
      );
    }
  }

  function injectManagerStyle() {
    return;
  }

  function createButton(text, attrs = {}) {
    const button = createElementInHost('button');
    button.type = 'button';
    button.className = 'jjks-manager-button';
    button.textContent = text;
    Object.entries(attrs).forEach(([key, value]) => button.setAttribute(key, value));
    return button;
  }

  function setManagerButtonBusy(button, busyText, busy) {
    if (!button) return;
    if (busy) {
      if (!button.dataset.jjksOriginalText) button.dataset.jjksOriginalText = button.textContent || '';
      button.textContent = busyText;
      button.disabled = true;
      button.dataset.busy = 'true';
      return;
    }
    button.textContent = button.dataset.jjksOriginalText || button.textContent || '';
    button.disabled = false;
    button.dataset.busy = 'false';
  }

  function clearModuleMountedDom(moduleId) {
    hostDocument.querySelectorAll(`[data-story-ui-module="${moduleId}"]`).forEach(node => {
      const mountHost = node.closest?.('[data-story-ui-raw-mount="true"], [data-story-ui-after-native-mount="true"]') || node;
      mountHost.remove();
    });
  }

  function clearModuleCaches(moduleId) {
    mountedModulesByMessage.forEach((mounted, messageId) => {
      if (Array.isArray(mounted) && mounted.some(item => item === moduleId || String(item).startsWith(`${moduleId}:`))) {
        mountedModulesByMessage.delete(messageId);
        messageSignatures.delete(messageId);
      }
    });
  }

  function ensureManagerDom() {
    injectManagerStyle();
    let root = hostDocument.getElementById(CONFIG.managerRootId);
    if (root) {
      const panel = root.querySelector('.jjks-manager-panel');
      if (panel && root.dataset.jjksManagerFallback === 'true' && getManagerView()) {
        renderManagerPanel(root, panel);
      }
      return root;
    }

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
    renderManagerPanel(root, panel);

    root.appendChild(panel);
    hostDocument.body.appendChild(root);

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
        return;
      }

      const moduleModeButton = target.closest?.('[data-jjks-module-mode]');
      if (moduleModeButton) {
        setManagerModuleMode(
          moduleModeButton.getAttribute('data-jjks-module-mode'),
          moduleModeButton.getAttribute('data-jjks-mode-value'),
          moduleModeButton,
        );
        return;
      }

      const moduleButton = target.closest?.('[data-jjks-module-toggle]');
      if (moduleButton) {
        toggleManagerModule(moduleButton.getAttribute('data-jjks-module-toggle'), moduleButton);
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

  async function openManager() {
    await ensureManagerAssetsReady();
    const root = ensureManagerDom();
    refreshManagerState();
    root.dataset.open = 'true';
    root.querySelector('[data-jjks-manager-close]')?.focus?.();
  }

  function closeManager() {
    const root = hostDocument.getElementById(CONFIG.managerRootId);
    if (root) root.dataset.open = 'false';
  }

  function renderManagerModuleList(root) {
    const listRoot = root.querySelector('[data-jjks-module-list]');
    if (!listRoot) return;
    const registry = getUi()?.registry;
    const modes = [
      ['script', '脚本显示'],
      ['native', '原生显示'],
      ['after-native', '共存增强'],
      ['off', '关闭'],
    ];
    const entries = Object.entries(MODULE_LABELS).map(([id, label]) => ({
      id,
      label,
      mode: registry?.getMode?.(id) || (registry?.isEnabled?.(id) === false ? 'off' : 'script'),
    }));

    listRoot.innerHTML = entries
      .map(
        item => `
          <div class="jjks-manager-module-item" data-jjks-module-current-mode="${escapeHtml(item.mode)}">
            <span class="jjks-manager-module-name">${escapeHtml(item.label)}</span>
            <div class="jjks-manager-mode-group" role="group" aria-label="${escapeHtml(item.label)}显示模式">
              ${modes
                .map(
                  ([mode, label]) => `
                    <button class="jjks-manager-mode-button" type="button" data-jjks-module-mode="${escapeHtml(item.id)}" data-jjks-mode-value="${escapeHtml(mode)}" data-active="${item.mode === mode ? 'true' : 'false'}">${escapeHtml(label)}</button>
                  `,
                )
                .join('')}
            </div>
          </div>
        `,
      )
      .join('');
  }

  async function rerenderAllVisibleMessages() {
    const ids = getRenderedMessageIds(Number.MAX_SAFE_INTEGER);
    messageSignatures.clear();
    mountedModulesByMessage.clear();
    const refreshed = await refreshRenderedMessagesForNativeRender(ids);
    if (refreshed) {
      await new Promise(resolve => window.setTimeout(resolve, 80));
    }
    scanMessageIds(ids, 'window');
  }

  function getExclusiveModuleId(moduleId) {
    if (moduleId === 'bp-panel') return 'bp-panel-newvars';
    if (moduleId === 'bp-panel-newvars') return 'bp-panel';
    if (moduleId === 'mvu-status') return 'mvu-status-newvars';
    if (moduleId === 'mvu-status-newvars') return 'mvu-status';
    return '';
  }

  function syncExclusiveModuleMode(moduleId, mode) {
    const exclusiveId = getExclusiveModuleId(moduleId);
    if (!exclusiveId || mode !== 'script') return;
    const registry = getUi()?.registry;
    if (!registry?.find?.(exclusiveId)) return;
    if (registry.getMode?.(exclusiveId) === 'script') {
      registry.setMode(exclusiveId, 'off');
      clearModuleMountedDom(exclusiveId);
      clearModuleCaches(exclusiveId);
      notify(`${MODULE_LABELS[exclusiveId] || exclusiveId} 已因互斥规则切换为关闭`, 'info');
    }
  }

  async function setManagerModuleMode(moduleId, mode, button) {
    if (!moduleId) return;
    const registry = getUi()?.registry;
    if (!registry?.find?.(moduleId) || typeof registry.setMode !== 'function') return;
    if (!['script', 'native', 'after-native', 'off'].includes(mode)) return;
    if (moduleToggleBusy.has(moduleId)) return;

    const currentMode = registry.getMode?.(moduleId) || 'script';
    if (currentMode === mode) return;

    moduleToggleBusy.add(moduleId);
    setManagerButtonBusy(button, '切换中', true);

    clearModuleMountedDom(moduleId);
    clearModuleCaches(moduleId);
    syncExclusiveModuleMode(moduleId, mode);
    registry.setMode(moduleId, mode);
    await new Promise(resolve => window.setTimeout(resolve, 60));
    await rerenderAllVisibleMessages();
    refreshManagerState();
    notify(
      `${MODULE_LABELS[moduleId] || moduleId} 已切换为${mode === 'script' ? '脚本显示' : mode === 'native' ? '原生显示' : mode === 'after-native' ? '共存增强' : '关闭'}`,
      'success',
    );

    moduleToggleBusy.delete(moduleId);
    setManagerButtonBusy(button, '', false);
  }

  async function toggleManagerModule(moduleId, button) {
    const registry = getUi()?.registry;
    const currentMode = registry?.getMode?.(moduleId) || (registry?.isEnabled?.(moduleId) === false ? 'off' : 'script');
    await setManagerModuleMode(moduleId, currentMode === 'off' ? 'script' : 'off', button);
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

    setText('loader', data.加载器状态);
    setText('modules', modules.length);
    setText('roots', data.故事UI节点数);
    setText('scanner', data.扫描器就绪 ? '已就绪' : '未就绪');
    setText('theme-ready', data.主题模块就绪 ? '已就绪' : '未就绪');
    setText('scan-window', data.最近扫描窗口 || 0);

    root.querySelectorAll('[data-jjks-theme]').forEach(button => {
      button.dataset.active = button.dataset.jjksTheme === data.当前主题 ? 'true' : 'false';
    });

    root.querySelectorAll('[data-jjks-toggle-state]').forEach(button => {
      button.dataset.jjksToggleState = collapseOldMessagesEnabled ? 'on' : 'off';
      button.textContent = collapseOldMessagesBusy
        ? collapseOldMessagesEnabled
          ? '折叠切换中'
          : '展开切换中'
        : collapseOldMessagesEnabled
          ? '旧消息折叠'
          : '旧消息未折叠';
      button.disabled = collapseOldMessagesBusy;
    });

    renderManagerModuleList(root);

    const warning = root.querySelector('[data-jjks-warning]');
    const otherState = data.另一个环境状态;
    if (warning) {
      warning.dataset.visible = otherState ? 'true' : 'false';
      warning.textContent = otherState
        ? `检测到另一个环境也可能已启用：${otherState.displayEnv || otherState.env}。建议同一时间只启用测试版或正式版之一。`
        : '';
    }

    const diagnosis = root.querySelector('[data-jjks-diagnosis]');
    if (diagnosis) diagnosis.innerHTML = formatDiagnosis(data);
    applyManagerTheme(data.当前主题);
  }

  async function runQuickReload() {
    if (managerActionBusy) return;
    queueScan(getRecentMessageIds(INITIAL_SCAN_LIMIT));
    await new Promise(resolve => window.setTimeout(resolve, 80));
    await reloadResources();
  }

  async function refreshRenderedMessagesForNativeRender(messageIds) {
    const refreshOneMessage =
      hostWindow.refreshOneMessage ||
      window.refreshOneMessage ||
      hostWindow.TavernHelper?.refreshOneMessage ||
      window.TavernHelper?.refreshOneMessage;
    if (typeof refreshOneMessage !== 'function') return false;

    for (const messageId of messageIds) {
      try {
        await refreshOneMessage(messageId);
      } catch (error) {
        console.warn(`${logPrefix} 刷新原生楼层渲染失败: ${messageId}`, error);
      }
    }
    return true;
  }

  async function reloadResources() {
    if (managerActionBusy) return;
    managerActionBusy = true;
    const root = hostDocument.getElementById(CONFIG.managerRootId);
    const reloadButton = root?.querySelector?.('[data-jjks-action="reload"]');
    setManagerButtonBusy(reloadButton, '重挂载中', true);

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
      const messageIds = getRecentMessageIds(INITIAL_SCAN_LIMIT);
      messageSignatures.clear();
      mountedModulesByMessage.clear();
      recentScannedMessageIds.length = 0;
      const refreshed = await refreshRenderedMessagesForNativeRender(messageIds);
      if (refreshed) {
        await new Promise(resolve => window.setTimeout(resolve, 120));
      }
      queueScan(messageIds.length ? messageIds : getRecentMessageIds(INITIAL_SCAN_LIMIT));
      notify('资源已重新加载', 'success');
    } catch (error) {
      console.error(`${logPrefix} 重载资源失败`, error);
      notify(`资源重载失败：${error?.message || error}`, 'error');
    } finally {
      managerActionBusy = false;
      setManagerButtonBusy(reloadButton, '', false);
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
      return;
    }
    if (action === 'toggle-old-collapse') {
      if (collapseOldMessagesBusy) return;
      collapseOldMessagesBusy = true;
      collapseOldMessagesEnabled = !collapseOldMessagesEnabled;
      persistCollapseOldMessages(collapseOldMessagesEnabled);
      refreshManagerState();
      window.setTimeout(() => {
        rerenderAllVisibleMessages()
          .catch(error => console.error(`${logPrefix} 重渲染可见楼层失败`, error))
          .finally(() => {
            collapseOldMessagesBusy = false;
            refreshManagerState();
          });
      }, 80);
      return;
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
      if (window.appendInexistentScriptButtons) {
        window.appendInexistentScriptButtons([
          { name: CONFIG.buttonName, visible: true },
          { name: CONFIG.reloadButtonName, visible: true },
        ]);
      } else if (window.replaceScriptButtons) {
        window.replaceScriptButtons([
          { name: CONFIG.buttonName, visible: true },
          { name: CONFIG.reloadButtonName, visible: true },
        ]);
      }

      const bindButtonClickFallback = buttonName => {
        const candidates = Array.from(hostDocument.querySelectorAll('button')).filter(button => {
          const name = (button.textContent || '').trim();
          return name === buttonName || name.includes(buttonName);
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
            if (buttonName === CONFIG.reloadButtonName) {
              runQuickReload().catch(error => console.error(`${logPrefix} 快捷重载失败`, error));
              console.info(`${logPrefix} 已通过宿主页面按钮兜底绑定快捷重载。`);
              return;
            }
            openManager().catch(error => console.error(`${logPrefix} 打开管理面板失败`, error));
            console.info(`${logPrefix} 已通过宿主页面按钮兜底绑定打开管理面板。`);
          });
        });
      };

      const bindByEventApi = () => {
        const eventName = window.getButtonEvent?.(CONFIG.buttonName);
        const reloadEventName = window.getButtonEvent?.(CONFIG.reloadButtonName);
        let bound = false;
        if (eventName && window.eventOn) {
          window.eventOn(eventName, () => {
            openManager().catch(error => {
              lastError = error?.message || String(error);
              console.error(`${logPrefix} 通过事件 API 打开管理面板失败`, error);
              notify(`打开管理界面失败：${lastError}`, 'error');
            });
          });
          bound = true;
        }
        if (reloadEventName && window.eventOn) {
          window.eventOn(reloadEventName, () => {
            runQuickReload().catch(error => {
              lastError = error?.message || String(error);
              console.error(`${logPrefix} 通过事件 API 快捷重载失败`, error);
              notify(`快捷重载失败：${lastError}`, 'error');
            });
          });
          bound = true;
        }
        return bound;
      };

      const bound = bindByEventApi();
      bindButtonClickFallback(CONFIG.buttonName);
      bindButtonClickFallback(CONFIG.reloadButtonName);

      if (!bound) {
        console.warn(`${logPrefix} 脚本按钮事件 API 不可用，已启用点击兜底绑定。`);
        window.setTimeout(() => {
          bindButtonClickFallback(CONFIG.buttonName);
          bindButtonClickFallback(CONFIG.reloadButtonName);
        }, 500);
      } else {
        console.info(`${logPrefix} 已通过酒馆按钮事件 API 绑定管理按钮与快捷重载按钮。`);
      }

      notify('咒回前端管理已导入，点击按钮可打开管理界面。', 'success');
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
      toggleManagerModule,
      setManagerModuleMode,
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
      loaderStatus = 'ready';
    })
    .catch(error => {
      console.error(`${logPrefix} 初始化 loader 失败`, error);
    });
})();
