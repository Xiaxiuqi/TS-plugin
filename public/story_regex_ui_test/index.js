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
  const MODULE_LABELS = {
    'story-engine': '故事引擎',
    'bp-panel': 'BP战力雷达',
    'bp-panel-newvars': 'BP战力雷达（新变量）',
    'world-log': '世界运行报告',
    'relation-status': '角色羁绊档案',
    'variable-update': '变量更新',
    'mvu-status': 'MVU状态栏',
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

  function renderMessageHtmlByModules(messageId, rawText, modules) {
    const text = String(rawText || '').replace(/\r\n?/g, '\n');
    let cursor = 0;
    let html = '';
    const mounted = [];

    while (cursor < text.length) {
      const match = findNextRenderableMatch(modules, text, cursor);
      if (!match) {
        html += renderPlainTextSegment(text.slice(cursor), messageId);
        break;
      }

      html += renderPlainTextSegment(text.slice(cursor, match.start), messageId);
      const rendered = buildNodeForModule(match.module, rawText, {
        messageId,
        messageElement: getDisplayedMessageElement(messageId),
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

    const modules = registry
      .list()
      .filter(module => moduleMatchesRawText(module, rawText) || moduleMatchesSingleTag(module, rawText));
    if (modules.length === 0) {
      mountedModulesByMessage.delete(messageId);
      return false;
    }

    const textElement = getDisplayedMessageTextElement(messageElement);
    if (!textElement) return false;

    const { html, mounted } = renderMessageHtmlByModules(messageId, rawText, modules);
    textElement.innerHTML = html;
    textElement.querySelectorAll?.('.story-ui-root').forEach(root => ui?.theme?.applyThemeToRoot?.(root));
    textElement.querySelectorAll?.('[data-story-ui-raw-mount="true"]').forEach(mountHost => {
      const moduleId = mountHost.getAttribute('data-story-ui-module');
      const module = registry.list({ includeDisabled: true }).find(item => item.id === moduleId);
      if (!module || module.enabled === false) return;
      registry.safelyCall(module, 'mount', mountHost, {
        kind: 'raw',
        rawText,
        messageId,
        node: mountHost,
      });
    });

    if (mounted.length > 0) {
      mountedModulesByMessage.set(messageId, mounted);
      return true;
    }

    mountedModulesByMessage.delete(messageId);
    return false;
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
    const messageElement = getDisplayedMessageElement(messageId);
    if (!messageElement) return false;
    const textElement = getDisplayedMessageTextElement(messageElement);
    if (!textElement) return false;

    const registry = getUi()?.registry;
    if (!registry) return false;
    const modules = registry
      .list()
      .filter(module => moduleMatchesRawText(module, rawText) || moduleMatchesSingleTag(module, rawText));
    if (modules.length === 0) return false;

    let html = String(rawText || '').replace(/\r\n?/g, '\n');
    modules.forEach(module => {
      const extracted = extractModuleContent(module, rawText);
      if (!extracted?.fullMatch) return;
      const title = MODULE_LABELS[module.id] ? `显示代码块 · ${MODULE_LABELS[module.id]}` : '显示代码块';
      html = html.replace(extracted.fullMatch, renderCollapsedBlock(extracted.fullMatch.trim(), title));
    });

    if (html === String(rawText || '').replace(/\r\n?/g, '\n')) return false;
    if (typeof window.formatAsDisplayedMessage === 'function') {
      textElement.innerHTML = window.formatAsDisplayedMessage(html, { message_id: messageId });
    } else {
      textElement.innerHTML = html;
    }
    return true;
  }

  function scanMessageIds(messageIds, mode = 'incremental') {
    if (!Array.isArray(messageIds) || messageIds.length === 0) return;
    lastScanMode = mode;
    const uniqueIds = Array.from(new Set(messageIds.filter(Number.isFinite)));
    const activeSet = new Set(uniqueIds);

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

    getRenderedMessageIds(Number.MAX_SAFE_INTEGER).forEach(messageId => {
      if (activeSet.has(messageId)) return;
      const chatMessage = readRawMessage(messageId);
      const rawText = chatMessage?.message || '';
      if (!rawText) return;
      mountCollapsedPlaceholderForMessage(messageId, rawText);
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
      已注册模块: modules.map(
        module => `${module.id}@${module.version || 'unknown'}${module.enabled === false ? ' [off]' : ''}`,
      ),
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
    const hiddenKeys = new Set(['环境', '环境标识', '入口版本', '入口目录', '加载器地址', 'UI实例来源']);
    return Object.entries(data)
      .filter(([key]) => !hiddenKeys.has(key))
      .map(([key, value]) => {
        if (Array.isArray(value)) return `${key}: ${value.length ? value.join(', ') : '无'}`;
        if (value && typeof value === 'object') return `${key}: ${JSON.stringify(value, null, 2)}`;
        return `${key}: ${value}`;
      })
      .join('\n');
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
      maintenanceActions.appendChild(createButton('刷新诊断', { 'data-jjks-action': 'diagnose' }));
      maintenanceActions.appendChild(createButton('重载资源', { 'data-jjks-action': 'reload' }));
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
      const mountHost = node.closest?.('[data-story-ui-raw-mount="true"]') || node;
      mountHost.remove();
    });
  }

  function clearModuleCaches(moduleId) {
    mountedModulesByMessage.forEach((mounted, messageId) => {
      if (Array.isArray(mounted) && mounted.includes(moduleId)) {
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
    await ensureLoader();
    await ensureManagerUiReady();
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
    const entries = Object.entries(MODULE_LABELS).map(([id, label]) => ({
      id,
      label,
      enabled: registry?.isEnabled?.(id) !== false,
    }));

    listRoot.innerHTML = entries
      .map(
        item => `
          <div class="jjks-manager-module-item">
            <span class="jjks-manager-module-name">${escapeHtml(item.label)}</span>
            <button class="jjks-manager-switch" type="button" data-jjks-module-toggle="${escapeHtml(item.id)}" data-enabled="${item.enabled ? 'true' : 'false'}">${item.enabled ? '开启' : '关闭'}</button>
          </div>
        `,
      )
      .join('');
  }

  function rerenderAllVisibleMessages() {
    const ids = getRenderedMessageIds(Number.MAX_SAFE_INTEGER);
    messageSignatures.clear();
    mountedModulesByMessage.clear();
    scanMessageIds(ids, 'window');
  }

  function getExclusiveModuleId(moduleId) {
    if (moduleId === 'bp-panel') return 'bp-panel-newvars';
    if (moduleId === 'bp-panel-newvars') return 'bp-panel';
    return '';
  }

  function syncExclusiveModuleState(moduleId, enabled) {
    const exclusiveId = getExclusiveModuleId(moduleId);
    if (!exclusiveId) return;
    const registry = getUi()?.registry;
    if (!registry?.find?.(exclusiveId)) return;
    if (enabled) {
      registry.setEnabled(exclusiveId, false);
      clearModuleMountedDom(exclusiveId);
      clearModuleCaches(exclusiveId);
    }
  }

  async function toggleManagerModule(moduleId, button) {
    if (!moduleId) return;
    const registry = getUi()?.registry;
    if (!registry?.find?.(moduleId)) return;
    if (moduleToggleBusy.has(moduleId)) return;

    const enabled = !registry.isEnabled(moduleId);
    const exclusiveId = getExclusiveModuleId(moduleId);
    if (enabled && exclusiveId && registry.isEnabled(exclusiveId)) {
      notify(
        `请先关闭${MODULE_LABELS[exclusiveId] || exclusiveId}，再开启${MODULE_LABELS[moduleId] || moduleId}`,
        'info',
      );
      refreshManagerState();
      return;
    }

    moduleToggleBusy.add(moduleId);
    setManagerButtonBusy(button, enabled ? '开启中' : '关闭中', true);

    if (!enabled) {
      clearModuleMountedDom(moduleId);
      clearModuleCaches(moduleId);
    }

    syncExclusiveModuleState(moduleId, enabled);
    registry.setEnabled(moduleId, enabled);
    await new Promise(resolve => window.setTimeout(resolve, 60));
    rerenderAllVisibleMessages();
    refreshManagerState();
    notify(`${MODULE_LABELS[moduleId] || moduleId}${enabled ? ' 已开启' : ' 已关闭'}`, 'success');

    moduleToggleBusy.delete(moduleId);
    setManagerButtonBusy(button, '', false);
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
    if (diagnosis) diagnosis.textContent = formatDiagnosis(data);
    applyManagerTheme(data.当前主题);
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
      messageSignatures.clear();
      mountedModulesByMessage.clear();
      recentScannedMessageIds.length = 0;
      queueScan(getRecentMessageIds(INITIAL_SCAN_LIMIT));
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
            openManager().catch(error => console.error(`${logPrefix} 打开管理面板失败`, error));
            console.info(`${logPrefix} 已通过宿主页面按钮兜底绑定打开管理面板。`);
          });
        });
      };

      const bindByEventApi = () => {
        const eventName = window.getButtonEvent?.(CONFIG.buttonName);
        if (eventName && window.eventOn) {
          window.eventOn(eventName, () => {
            openManager().catch(error => {
              lastError = error?.message || String(error);
              console.error(`${logPrefix} 通过事件 API 打开管理面板失败`, error);
              notify(`打开管理界面失败：${lastError}`, 'error');
            });
          });
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
