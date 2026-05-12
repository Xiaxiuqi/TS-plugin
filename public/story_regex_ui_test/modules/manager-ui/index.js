(() => {
  const view = {
    buildPanelHtml({ displayEnv, loaderStatus, theme }) {
      return `
        <header class="jjks-manager-head">
          <div>
            <span class="jjks-manager-eyebrow">Jujutsu Kaisen Frontend · ${displayEnv}</span>
            <h2>咒回前端管理</h2>
            <p>统一查看 Story UI 模块装载、扫描结果与前端主题状态。</p>
          </div>
          <button class="jjks-manager-close" type="button" data-jjks-manager-close aria-label="关闭">×</button>
        </header>
        <main class="jjks-manager-body">
          <div class="jjks-manager-column jjks-manager-column-main">
            <section class="jjks-manager-card">
              <h3>运行总览</h3>
              <div class="jjks-manager-overview">
                <article class="jjks-manager-metric"><span>资源状态</span><strong data-jjks-status="loader">${loaderStatus}</strong></article>
                <article class="jjks-manager-metric"><span>模块数量</span><strong data-jjks-status="modules">0</strong></article>
                <article class="jjks-manager-metric"><span>故事 UI 节点</span><strong data-jjks-status="roots">0</strong></article>
                <article class="jjks-manager-metric"><span>当前主题</span><strong data-jjks-status="theme">${theme}</strong></article>
              </div>
            </section>
            <section class="jjks-manager-card">
              <h3>维护工具</h3>
              <div class="jjks-manager-actions jjks-manager-actions-tools" data-jjks-maintenance-actions></div>
            </section>
            <section class="jjks-manager-card jjks-manager-log">
              <h3>诊断信息</h3>
              <pre data-jjks-diagnosis>等待诊断...</pre>
            </section>
          </div>
          <div class="jjks-manager-column jjks-manager-column-side">
            <section class="jjks-manager-card">
              <h3>状态细节</h3>
              <p class="jjks-manager-warning" data-jjks-warning></p>
              <dl class="jjks-manager-status">
                <div><dt>扫描器</dt><dd data-jjks-status="scanner">-</dd></div>
                <div><dt>主题模块</dt><dd data-jjks-status="theme-ready">-</dd></div>
                <div><dt>最近扫描窗口</dt><dd data-jjks-status="scan-window">-</dd></div>
                <div><dt>扫描模式</dt><dd data-jjks-status="scan-mode">-</dd></div>
              </dl>
            </section>
            <section class="jjks-manager-card">
              <h3>日夜模式</h3>
              <div class="jjks-manager-actions jjks-manager-actions-theme" data-jjks-theme-actions></div>
            </section>
            <section class="jjks-manager-card">
              <h3>模块状态标签</h3>
              <div class="jjks-manager-chip-row" data-jjks-module-chips></div>
            </section>
          </div>
        </main>
      `;
    },
  };

  globalThis.JJKSStoryUiManagerView = view;
  window.JJKSStoryUiManagerView = view;
})();
