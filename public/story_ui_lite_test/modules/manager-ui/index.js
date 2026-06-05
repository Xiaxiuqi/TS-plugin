(() => {
  function title(text) {
    return `<span class="jjks-manager-title-row"><span class="jjks-manager-title-icon" data-jjks-title-icon></span><span>${text}</span></span>`;
  }

  const view = {
    buildPanelHtml({ displayEnv, loaderStatus }) {
      return `
        <header class="jjks-manager-head">
          <div>
            <span class="jjks-manager-eyebrow">Jujutsu Kaisen Frontend · ${displayEnv}</span>
            <h2>咒回前端管理·lite</h2>
            <p>统一查看 Story UI 模块装载、扫描结果与前端主题状态。</p>
          </div>
          <button class="jjks-manager-close" type="button" data-jjks-manager-close aria-label="关闭">×</button>
        </header>
        <main class="jjks-manager-body">
          <section class="jjks-manager-card jjks-manager-row-full">
            <h3>${title('运行总览')}</h3>
            <div class="jjks-manager-overview jjks-manager-overview-inline">
              <article class="jjks-manager-metric"><span>资源状态</span><strong data-jjks-status="loader">${loaderStatus}</strong></article>
              <article class="jjks-manager-metric"><span>模块数量</span><strong data-jjks-status="modules">0</strong></article>
              <article class="jjks-manager-metric"><span>故事 UI 节点</span><strong data-jjks-status="roots">0</strong></article>
            </div>
          </section>

          <div class="jjks-manager-panel-stack">
            <section class="jjks-manager-card jjks-manager-panel-status">
              <h3>${title('状态细节')}</h3>
              <p class="jjks-manager-warning" data-jjks-warning></p>
              <dl class="jjks-manager-status">
                <div><dt>扫描器</dt><dd data-jjks-status="scanner">-</dd></div>
                <div><dt>主题模块</dt><dd data-jjks-status="theme-ready">-</dd></div>
                <div><dt>最近扫描窗口</dt><dd data-jjks-status="scan-window">-</dd></div>
              </dl>
            </section>
            <section class="jjks-manager-card jjks-manager-panel-theme">
              <h3>${title('主题模式')}</h3>
              <div class="jjks-manager-actions jjks-manager-actions-theme" data-jjks-theme-actions></div>
            </section>
          </div>

          <section class="jjks-manager-card jjks-manager-panel-tools">
            <h3>${title('维护工具')}</h3>
            <p class="jjks-manager-tool-note">初次加载需要点击一次手动重扫和重载资源，如果美化消失，可以点击重载资源进行重新挂载</p>
            <p class="jjks-manager-tool-note secondary">旧消息折叠是将超过渲染量的旧楼层美化相关标签内容折叠，如果关闭，旧楼层的美化内容会暴露出来。调整该选项后，需要点击重载资源进行重新挂载美化</p>
            <div class="jjks-manager-actions jjks-manager-actions-tools" data-jjks-maintenance-actions></div>
          </section>

          <section class="jjks-manager-card jjks-manager-map-config jjks-manager-row-full">
            <h3>${title('地图生成 API 设置')}</h3>
            <p class="jjks-manager-tool-note">只影响数据库状态栏里的 AI 地图生成。选择“跟随当前数据库 API”时直接复用数据库插件当前 API；选择“自行设置 API”时按酒馆助手 custom_api 调用。</p>
            <p class="jjks-manager-tool-note secondary">自行设置时先填写 API 地址和密钥，再点击“拉取模型列表”，从模型下拉框选择模型后保存。代理预设对应 custom_api.proxy_preset。</p>
            <form class="jjks-manager-map-config-form" data-jjks-map-config-form novalidate>
              <div class="jjks-manager-map-mode jjks-manager-map-field-wide">
                <label>
                  <input type="radio" name="apiMode" value="database" data-jjks-map-mode />
                  <span>跟随当前数据库 API</span>
                </label>
                <label>
                  <input type="radio" name="apiMode" value="custom" data-jjks-map-mode />
                  <span>自行设置 API</span>
                </label>
              </div>
              <label class="jjks-manager-map-field">
                <span>API 地址 apiurl</span>
                <input type="text" name="apiUrl" data-jjks-map-custom-field autocomplete="off" placeholder="例如 https://api.openai.com/v1" />
              </label>
              <label class="jjks-manager-map-field">
                <span>API 密钥 key</span>
                <input type="password" name="apiKey" data-jjks-map-custom-field autocomplete="off" placeholder="填写中转或模型服务密钥" />
              </label>
              <label class="jjks-manager-map-field">
                <span>API 源 source</span>
                <input type="text" name="source" data-jjks-map-custom-field autocomplete="off" placeholder="默认 openai" />
              </label>
              <label class="jjks-manager-map-field">
                <span>模型 model</span>
                <select name="model" data-jjks-map-model-select data-jjks-map-custom-field>
                  <option value="">先拉取模型列表</option>
                </select>
              </label>
              <label class="jjks-manager-map-field jjks-manager-map-field-wide">
                <span>酒馆代理预设 proxy_preset</span>
                <input
                  type="text"
                  name="proxyPreset"
                  data-jjks-map-custom-field
                  autocomplete="off"
                  list="jjks-map-proxy-presets"
                  placeholder="填写 getProxyPresetNames() 返回的预设名称；留空不指定"
                />
              </label>
              <datalist id="jjks-map-proxy-presets" data-jjks-map-proxy-presets></datalist>
              <p class="jjks-manager-map-model-status jjks-manager-map-field-wide" data-jjks-map-model-status>模型列表尚未拉取。</p>
              <div class="jjks-manager-actions jjks-manager-actions-map-config">
                <button class="jjks-manager-button" type="button" data-jjks-map-action="fetch-models">拉取模型列表</button>
                <button class="jjks-manager-button" type="button" data-jjks-map-action="save">保存地图 API 设置</button>
                <button class="jjks-manager-button" type="button" data-jjks-map-action="reset">清空并跟随数据库 API</button>
              </div>
            </form>
          </section>

          <section class="jjks-manager-card jjks-manager-row-full">
            <h3>${title('模块状态')}</h3>
            <div class="jjks-manager-module-list" data-jjks-module-list></div>
          </section>

          <section class="jjks-manager-card jjks-manager-log jjks-manager-row-full">
            <h3>${title('诊断信息')}</h3>
            <pre data-jjks-diagnosis>等待诊断...</pre>
          </section>
        </main>
      `;
    },
  };

  globalThis.JJKSStoryUiManagerView = view;
  window.JJKSStoryUiManagerView = view;
})();
