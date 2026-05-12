(() => {
  const view = {
    buildPanelHtml({ displayEnv, version, loaderStatus, theme }) {
      return `
        <header class="jjks-manager-head">
          <div>
            <span class="jjks-manager-eyebrow">Jujutsu Kaisen Frontend · ${displayEnv}</span>
            <h2>咒回前端管理</h2>
            <p>统一查看 Story UI 模块装载、扫描结果与前端主题状态。界面已迁移为独立模块，并与 MVU / 故事引擎保持一致的米白 / 暗色视觉语言。</p>
          </div>
          <button class="jjks-manager-close" type="button" data-jjks-manager-close aria-label="关闭">×</button>
        </header>
        <main class="jjks-manager-body">
          <div class="jjks-manager-column">
            <section class="jjks-manager-card">
              <h3>运行总览</h3>
              <div class="jjks-manager-overview">
                <article class="jjks-manager-metric"><span>当前环境</span><strong data-jjks-status="env">${displayEnv}</strong></article>
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
                <div><dt>入口版本</dt><dd data-jjks-status="version">${version}</dd></div>
                <div><dt>当前主题</dt><dd data-jjks-status="theme">${theme}</dd></div>
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
            <section class="jjks-manager-card">
              <h3>界面尺寸</h3>
              <div class="jjks-manager-size-grid">
                <label class="jjks-manager-size-field"><span>宽度</span><input type="text" value="940px" data-jjks-manager-size="width" placeholder="如 940px / 72vw"></label>
                <label class="jjks-manager-size-field"><span>高度</span><input type="text" value="720px" data-jjks-manager-size="height" placeholder="如 720px / 80vh"></label>
              </div>
            </section>
          </div>
        </main>
      `;
    },
  };

  window.JJKSStoryUiManagerView = view;
})();
