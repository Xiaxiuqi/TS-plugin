(() => {
  const CONFIG = {
    env: 'prod',
    displayEnv: '正式版',
    version: '1.0.0',
    publicBaseUrl: 'https://ts-plugin.pages.dev/story_regex_ui_prod/',
    localBasePath: '/scripts/extensions/third-party/tavern_helper_template/story_regex_ui_prod/',
    globalKey: 'StoryRegexUI',
    loaderFlag: '__storyRegexUiLoaderReady',
    themeKey: 'jjks_story_ui_theme',
    buttonName: '咒回前端管理',
    managerRootId: 'jjks-story-ui-manager-prod',
  };

  const INDEX_FLAG = `__jjksStoryUiIndex_${CONFIG.env}`;
  const STYLE_MARK = `jjks-manager-style-${CONFIG.env}`;
  const LOADER_MARK = `jjks-story-ui-loader-${CONFIG.env}`;
  const logPrefix = `[StoryRegexUI:${CONFIG.env}]`;

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
      .find(src => src.includes('/story_regex_ui_prod/index.js'));
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
  let lastError = '';
  let scanQueued = false;
  let lastDiagnosis = null;

  if (window[INDEX_FLAG]) {
    window[CONFIG.globalKey]?.scanner?.scan?.(document);
    return;
  }
  window[INDEX_FLAG] = true;
  state[CONFIG.env] = {
    env: CONFIG.env,
    displayEnv: CONFIG.displayEnv,
    version: CONFIG.version,
    baseUrl,
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
    return window[CONFIG.globalKey] || null;
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
    const root = document.getElementById(CONFIG.managerRootId);
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
      document.querySelectorAll('.story-ui-root').forEach(root => {
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
      const existed = document.querySelector(`script[data-jjks-story-ui-loader="${LOADER_MARK}"]`);
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
      document.head.appendChild(script);
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

  function getMessageScope(messageId) {
    if (messageId === undefined || messageId === null) return document;
    try {
      const node = window.retrieveDisplayedMessage?.(messageId)?.[0];
      return node || document;
    } catch {
      return document;
    }
  }

  function queueScan(scope = document) {
    if (scanQueued) return;
    scanQueued = true;
    requestAnimationFrame(async () => {
      scanQueued = false;
      try {
        await ensureLoader();
        getUi()?.scanner?.scan?.(scope);
        refreshManagerState();
      } catch (error) {
        console.error(`${logPrefix} 扫描失败`, error);
      }
    });
  }

  function diagnose() {
    const ui = getUi();
    const modules = ui?.registry?.list?.() || [];
    const otherEnv = CONFIG.env === 'test' ? 'prod' : 'test';
    const otherState = state[otherEnv] || null;
    const storyRoots = document.querySelectorAll('.story-ui-root').length;
    const managerExists = Boolean(document.getElementById(CONFIG.managerRootId));
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
      另一个环境状态: otherState,
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
    if (document.querySelector(`style[data-jjks-manager-style="${STYLE_MARK}"]`)) return;
    const style = document.createElement('style');
    style.dataset.jjksManagerStyle = STYLE_MARK;
    style.textContent = `
      .jjks-manager-mask{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(16,13,10,.42);backdrop-filter:blur(5px);font-family:"Noto Serif SC","Microsoft YaHei",serif;}
      .jjks-manager-mask[data-open="true"]{display:flex;}
      .jjks-manager-panel{width:min(860px,calc(100vw - 32px));max-height:min(760px,calc(100vh - 32px));overflow:hidden;border-radius:24px;box-shadow:0 24px 80px rgba(0,0,0,.34);border:1px solid;position:relative;}
      .jjks-manager-panel:before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.55;background:radial-gradient(circle at 14% 0%,rgba(222,184,104,.28),transparent 32%),radial-gradient(circle at 86% 18%,rgba(114,88,187,.18),transparent 30%);}
      .jjks-manager-day .jjks-manager-panel{background:linear-gradient(145deg,#fff8e8 0%,#f4e4c3 48%,#ead0a0 100%);border-color:rgba(158,112,43,.36);color:#3d2a16;}
      .jjks-manager-night .jjks-manager-panel{background:linear-gradient(145deg,#111827 0%,#171225 50%,#090b12 100%);border-color:rgba(217,178,94,.34);color:#f5e9c9;box-shadow:0 24px 90px rgba(0,0,0,.62),0 0 36px rgba(99,102,241,.22);}
      .jjks-manager-head{position:relative;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:22px 24px 18px;border-bottom:1px solid rgba(142,102,42,.22);}
      .jjks-manager-night .jjks-manager-head{border-bottom-color:rgba(217,178,94,.2);}
      .jjks-manager-eyebrow{display:inline-block;font-size:11px;letter-spacing:.18em;text-transform:uppercase;opacity:.72;margin-bottom:4px;}
      .jjks-manager-head h2{margin:0;font-size:25px;letter-spacing:.08em;font-weight:800;}
      .jjks-manager-close{width:38px;height:38px;border-radius:999px;border:1px solid rgba(130,91,34,.35);background:rgba(255,255,255,.34);color:inherit;font-size:24px;line-height:1;cursor:pointer;}
      .jjks-manager-night .jjks-manager-close{background:rgba(255,255,255,.07);border-color:rgba(217,178,94,.26);}
      .jjks-manager-body{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:18px 20px 22px;overflow:auto;max-height:calc(min(760px,calc(100vh - 32px)) - 86px);}
      .jjks-manager-card{border:1px solid rgba(155,112,48,.24);border-radius:18px;padding:16px;background:rgba(255,252,243,.58);box-shadow:0 10px 30px rgba(115,75,25,.08);}
      .jjks-manager-night .jjks-manager-card{background:rgba(18,24,38,.68);border-color:rgba(217,178,94,.18);box-shadow:0 10px 30px rgba(0,0,0,.28);}
      .jjks-manager-card h3{margin:0 0 12px;font-size:16px;letter-spacing:.08em;}
      .jjks-manager-status{display:grid;gap:9px;margin:0;}
      .jjks-manager-status div{display:flex;justify-content:space-between;gap:12px;border-bottom:1px dashed rgba(128,92,40,.2);padding-bottom:7px;}
      .jjks-manager-status dt{opacity:.66;}
      .jjks-manager-status dd{margin:0;font-weight:700;text-align:right;}
      .jjks-manager-actions{display:flex;flex-wrap:wrap;gap:10px;}
      .jjks-manager-button{border:1px solid rgba(146,103,35,.32);border-radius:999px;padding:9px 14px;background:linear-gradient(180deg,rgba(255,255,255,.64),rgba(236,202,135,.38));color:inherit;cursor:pointer;font-weight:700;letter-spacing:.04em;transition:transform .16s ease,box-shadow .16s ease,background .16s ease;}
      .jjks-manager-button:hover{transform:translateY(-1px);box-shadow:0 8px 18px rgba(120,78,24,.16);}
      .jjks-manager-night .jjks-manager-button{background:linear-gradient(180deg,rgba(250,224,159,.16),rgba(76,70,141,.2));border-color:rgba(217,178,94,.28);}
      .jjks-manager-button[data-active="true"]{background:linear-gradient(135deg,#c89438,#f4d58b);color:#2b1a08;box-shadow:0 0 0 2px rgba(255,255,255,.25) inset;}
      .jjks-manager-log{grid-column:1 / -1;}
      .jjks-manager-log pre{white-space:pre-wrap;word-break:break-word;margin:0;min-height:128px;max-height:260px;overflow:auto;border-radius:14px;padding:13px;background:rgba(68,45,18,.08);font-family:"Consolas","Microsoft YaHei",monospace;font-size:12px;line-height:1.55;}
      .jjks-manager-night .jjks-manager-log pre{background:rgba(0,0,0,.28);color:#e9ddbd;}
      .jjks-manager-warning{display:none;margin:0 0 12px;padding:10px 12px;border-radius:12px;background:rgba(186,72,45,.14);border:1px solid rgba(186,72,45,.26);font-size:13px;}
      .jjks-manager-warning[data-visible="true"]{display:block;}
      @media (max-width:720px){.jjks-manager-body{grid-template-columns:1fr}.jjks-manager-panel{border-radius:18px}.jjks-manager-head{padding:18px}.jjks-manager-head h2{font-size:21px}}
    `;
    document.head.appendChild(style);
  }

  function createButton(text, attrs = {}) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'jjks-manager-button';
    button.textContent = text;
    Object.entries(attrs).forEach(([key, value]) => button.setAttribute(key, value));
    return button;
  }

  function ensureManagerDom() {
    injectManagerStyle();
    let root = document.getElementById(CONFIG.managerRootId);
    if (root) return root;

    root = document.createElement('div');
    root.id = CONFIG.managerRootId;
    root.className = 'jjks-manager-mask jjks-manager-day';
    root.dataset.jjksManagerRoot = CONFIG.env;
    root.dataset.open = 'false';

    const panel = document.createElement('section');
    panel.className = 'jjks-manager-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', '咒回前端管理');

    panel.innerHTML = `
      <header class="jjks-manager-head">
        <div>
          <span class="jjks-manager-eyebrow">Jujutsu Kaisen Frontend · ${CONFIG.displayEnv}</span>
          <h2>咒回前端管理</h2>
        </div>
        <button class="jjks-manager-close" type="button" data-jjks-manager-close aria-label="关闭">×</button>
      </header>
      <main class="jjks-manager-body">
        <section class="jjks-manager-card">
          <h3>运行状态</h3>
          <p class="jjks-manager-warning" data-jjks-warning></p>
          <dl class="jjks-manager-status">
            <div><dt>当前环境</dt><dd data-jjks-status="env">${CONFIG.displayEnv}</dd></div>
            <div><dt>入口版本</dt><dd data-jjks-status="version">${CONFIG.version}</dd></div>
            <div><dt>资源状态</dt><dd data-jjks-status="loader">${loaderStatus}</dd></div>
            <div><dt>当前主题</dt><dd data-jjks-status="theme">${getTheme()}</dd></div>
            <div><dt>模块数量</dt><dd data-jjks-status="modules">0</dd></div>
            <div><dt>UI 节点</dt><dd data-jjks-status="roots">0</dd></div>
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
        <section class="jjks-manager-card jjks-manager-log">
          <h3>诊断信息</h3>
          <pre data-jjks-diagnosis>等待诊断...</pre>
        </section>
      </main>
    `;

    root.appendChild(panel);
    document.body.appendChild(root);

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

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && root.dataset.open === 'true') closeManager();
    });

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
    const root = document.getElementById(CONFIG.managerRootId);
    if (root) root.dataset.open = 'false';
  }

  function refreshManagerState() {
    const root = document.getElementById(CONFIG.managerRootId);
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
    setText('modules', modules.length);
    setText('roots', data.故事UI节点数);

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
      queueScan(document);
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
      queueScan(document);
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

    on(events.APP_READY, () => queueScan(document));
    on(events.USER_MESSAGE_RENDERED, messageId => queueScan(getMessageScope(messageId)));
    on(events.CHARACTER_MESSAGE_RENDERED, messageId => queueScan(getMessageScope(messageId)));
    on(events.MESSAGE_UPDATED, messageId => queueScan(getMessageScope(messageId)));
    on(events.MESSAGE_EDITED, messageId => queueScan(getMessageScope(messageId)));
    on(events.MESSAGE_SWIPED, messageId => queueScan(getMessageScope(messageId)));
    on(events.MORE_MESSAGES_LOADED, () => queueScan(document));
    on(events.CHAT_CHANGED, () => window.setTimeout(() => queueScan(document), 300));
  }

  function registerManagerButton() {
    try {
      if (window.appendInexistentScriptButtons) {
        window.appendInexistentScriptButtons([{ name: CONFIG.buttonName, visible: true }]);
      } else if (window.replaceScriptButtons) {
        window.replaceScriptButtons([{ name: CONFIG.buttonName, visible: true }]);
      }

      const eventName = window.getButtonEvent?.(CONFIG.buttonName);
      if (eventName && window.eventOn) {
        window.eventOn(eventName, openManager);
      } else {
        console.warn(`${logPrefix} 脚本按钮事件 API 不可用`);
      }
    } catch (error) {
      console.error(`${logPrefix} 注册管理按钮失败`, error);
    }
  }

  window.JJKSStoryUiManager = window.JJKSStoryUiManager || {};
  window.JJKSStoryUiManager[CONFIG.env] = {
    ensureLoader,
    queueScan,
    openManager,
    closeManager,
    diagnose,
    reloadResources,
    setTheme,
  };

  registerManagerButton();
  bindEvents();
  ensureLoader()
    .then(() => queueScan(document))
    .catch(error => console.error(`${logPrefix} 初始化失败`, error));
})();
