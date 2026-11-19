(() => {
  "use strict";
  const KEY = "cryptLord.detectiveCaseUi";
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const service = modules["cryptLord.detectiveState"];
  const afterNative = modules["cryptLord.afterNativeHost"];
  if (!contract || !service || !afterNative) throw new Error("事件真相依赖尚未加载");
  const state = {
    panel: null, content: null, status: null, selected: "", snapshot: null,
    token: 0, busy: false, disposed: false, subscriptions: [], draft: "",
    config: null, showConfig: false, configDraft: null, configError: "",
    pending: null, invalid: false, generating: false, cancelButton: null, keyListener: null, returnFocus: null,
  };
  const doc = () => afterNative.getHost()?.document || document;
  const win = () => doc().defaultView || window;
  const el = (tag, className = "", text) => {
    const node = doc().createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (text, fn, title) => {
    const node = el("button", "", text);
    node.type = "button";
    if (title) node.title = title;
    if (title && text === "×") node.setAttribute("aria-label", title);
    node.addEventListener("click", fn);
    return node;
  };
  const viewButton = (...args) => {
    const node = button(...args);
    node.dataset.readonly = "true";
    return node;
  };
  const active = token => !state.disposed && state.token === token &&
    modules[KEY] === api && modules["cryptLord.detectiveState"] === service && state.panel?.dataset.open === "true";
  function status(text, error = false) {
    if (!state.status) return;
    state.status.textContent = text;
    state.status.dataset.error = String(error);
  }
  function close() {
    state.token++;
    state.panel?.setAttribute("data-open", "false");
    state.snapshot = null;
    state.selected = "";
    state.draft = "";
    state.showConfig = false;
    state.busy = false;
    state.config = null;
    state.configDraft = null;
    state.configError = "";
    state.pending = null;
    state.invalid = false;
    state.panel?.removeAttribute("aria-busy");
    if (state.returnFocus?.isConnected) state.returnFocus.focus?.();
  }
  function cancel() {
    if (!state.busy) return;
    state.token++;
    state.busy = false;
    state.invalid = true;
    state.panel?.removeAttribute("aria-busy");
    status("操作已取消，草稿保留；请重新读取案件");
    render();
  }
  function invalidate() {
    state.token++;
    state.busy = false;
    state.invalid = true;
    state.panel?.removeAttribute("aria-busy");
    status("正文正在生成，草稿保留；完成后请重新读取案件", true);
    render();
  }
  function mount() {
    if (state.disposed || state.panel || !doc().body) return Boolean(state.panel);
    const panel = el("section", "crypt-lord-detective-case");
    panel.dataset.open = "false";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "事件真相 · 侦探本");
    panel.tabIndex = -1;
    const header = el("header");
    const cancelButton = button("取消", cancel);
    header.append(el("strong", "", "事件真相 · 侦探本"), cancelButton, button("×", close, "关闭"));
    const content = el("main", "crypt-lord-detective-case__content");
    const footer = el("footer", "crypt-lord-detective-case__status");
    footer.setAttribute("role", "status");
    panel.append(header, content, footer);
    doc().body.append(panel);
    Object.assign(state, { panel, content, status: footer, cancelButton });
    let drag = null;
    header.addEventListener("pointerdown", event => {
      if (event.button !== 0 || event.target.closest("button")) return;
      const rect = panel.getBoundingClientRect();
      drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      header.setPointerCapture?.(event.pointerId);
    });
    header.addEventListener("pointermove", event => {
      if (!drag) return;
      panel.style.left = `${Math.max(8, Math.min(win().innerWidth - panel.offsetWidth - 8, drag.left + event.clientX - drag.x))}px`;
      panel.style.top = `${Math.max(8, Math.min(win().innerHeight - panel.offsetHeight - 8, drag.top + event.clientY - drag.y))}px`;
      panel.style.transform = "none";
    });
    header.addEventListener("pointerup", () => { drag = null; });
    header.addEventListener("pointercancel", () => { drag = null; });
    const events = afterNative.tavernEvents();
    const bind = (event, fn) => { if (event) state.subscriptions.push(afterNative.bindEvent(event, fn)); };
    bind(events?.CHAT_CHANGED, () => { state.generating = false; close(); });
    bind(events?.GENERATION_STARTED, (type, options, dryRun) => {
      if (!["quiet", "dryRun"].includes(type) && !options?.dryRun && !dryRun) {
        state.generating = true; invalidate();
      }
    });
    for (const event of new Set([events?.GENERATION_ENDED, events?.GENERATION_STOPPED].filter(Boolean)))
      bind(event, () => { state.generating = false; render(); });
    state.keyListener = event => {
      if (panel.dataset.open !== "true") return;
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key !== "Tab") return;
      const nodes = [...panel.querySelectorAll("button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary")]
        .filter(node => node.getClientRects().length);
      const first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && (doc().activeElement === first || doc().activeElement === panel)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (doc().activeElement === last || !panel.contains(doc().activeElement))) {
        event.preventDefault(); first?.focus();
      }
    };
    doc().addEventListener("keydown", state.keyListener);
    return true;
  }
  async function load(token) {
    status("正在读取当前 assistant 楼层…");
    state.snapshot = null;
    state.config = null;
    const latest = await service.load(() => active(token));
    if (!active(token)) return;
    state.snapshot = latest;
    state.invalid = false;
    state.pending = null;
    let config;
    try { config = await service.configuration(false, () => active(token)); }
    catch (error) {
      if (!active(token)) return;
      state.config = null;
      state.configError = `提示词配置读取失败：${error?.message || error}`;
      status(state.configError, true);
    }
    if (!active(token)) return;
    if (config) { state.config = config; state.configError = ""; }
    state.configDraft = null;
    if (config) status(latest.reason || "已读取当前 assistant 楼层", !latest.editable);
    render();
  }
  async function verify(token) {
    if (!active(token) || !state.snapshot) throw new Error("窗口或聊天已变化");
    if (state.invalid || state.generating) throw Error("案件来源已失效，请重新读取");
    return service.assertSource(state.snapshot, () => active(token));
  }
  async function savePending(token) {
    if (!state.pending) throw Error("没有待保存结果");
    const pending = state.pending;
    const saved = await service.commitOperation(pending.operation, () => active(token) && !state.invalid);
    if (!active(token)) return;
    state.pending = null;
    state.snapshot = saved.loaded;
    state.invalid = !saved.loaded;
    if (pending.select) state.selected = pending.operation.caseId;
    if (pending.clearDraft && state.draft === pending.draft) state.draft = "";
    status(saved.warning || "已写入当前 assistant 楼层", Boolean(saved.warning));
    render();
  }
  async function commit(token, action, options = {}) {
    if (state.pending) throw Error("请先保存或放弃本次结果");
    await verify(token);
    const operation = await service.prepareOperation(state.snapshot, action, () => active(token));
    if (!active(token)) return;
    state.pending = { operation, ...options };
    await savePending(token);
  }
  async function task(work) {
    if (state.busy || state.generating) return;
    const token = state.token;
    state.busy = true;
    state.panel?.setAttribute("aria-busy", "true");
    render();
    try { await work(token); }
    catch (error) {
      if (active(token)) {
        if (error.code === "DETECTIVE_SOURCE_CHANGED" || error.requiresReload) state.invalid = true;
        status(error?.message || String(error), true);
      }
    }
    finally {
      if (active(token)) {
        state.busy = false;
        state.panel?.removeAttribute("aria-busy");
        render();
      }
    }
  }
  function actions(parent, ...children) {
    const row = el("div", "crypt-lord-detective-case__actions");
    row.append(...children);
    parent.append(row);
    return row;
  }
  function reload() {
    if ((state.pending || state.configDraft) && !win().confirm("重新读取将放弃待保存结果与配置草稿，继续？")) return;
    return task(load);
  }
  function chosen() {
    return service.getCases(state.snapshot?.data).find(item => item.id === state.selected);
  }
  async function generateStage(token, id, stage, action = "") {
    if (state.pending) throw Error("请先保存或放弃本次结果");
    const current = await verify(token);
    const source = service.caseById(current.data, id);
    const config = state.config;
    const draft = state.draft;
    const customization = service.customFor(state.config?.custom, stage);
    const prompt = service.promptFor(source, stage, action, state.config?.prompts, customization);
    status(stage === "intro" ? "生成引子中…" : stage === "turn" ? "演绎本回合…" :
      stage === "verdict" ? "裁定中…" : `生成阶段 ${Number(stage) + 1}/5…`);
    const raw = await service.request(prompt, customization, state.snapshot.story,
      () => active(token) && !state.invalid, state.snapshot, config);
    if (!String(raw).trim()) throw new Error("模型没有返回内容，请重试");
    await commit(token, { type: "stage", id, stage, raw, action, folds: customization.folds, config },
      { clearDraft: stage === "turn", draft });
  }
  function requestStage(item, stage, action = "") {
    return task(token => generateStage(token, item.id, stage, action));
  }
  function generateRemaining(item) {
    return task(async token => {
      while (active(token) && !state.invalid) {
        const current = await verify(token);
        const selected = service.caseById(current.data, item.id);
        if (selected.genProgress >= service.steps.length) break;
        await generateStage(token, item.id, selected.genProgress);
      }
      if (active(token) && !state.invalid) status("五阶段案情已全部保存，可以开始探案");
    });
  }
  function renderList() {
    const top = el("div", "crypt-lord-detective-case__toolbar");
    top.append(button("新建案件", () => {
      void task(async token => {
        await commit(token, { type: "create", options: {
          mode: state.config?.custom.默认题材 || "本格",
        } }, { select: true });
      });
    }));
    top.append(button("重新读取", () => void reload(), "从当前原生楼层重新读取"));
    top.append(button("提示词配置", () => { state.showConfig = true; render(); }));
    state.content.append(top);
    const cases = service.getCases(state.snapshot?.data).slice().reverse();
    if (!cases.length) state.content.append(el("p", "crypt-lord-detective-case__muted", "当前楼层还没有案件。"));
    for (const item of cases) {
      const row = el("div", "crypt-lord-detective-case__slot");
      const detail = el("div");
      detail.append(el("strong", "", item.title || "未命名案件"),
        el("small", "", `${item.mode || "本格"} · ${item.roleCount || 5}人 · ${item.status}`));
      row.append(detail);
      actions(row,
        viewButton("进入", () => { state.selected = item.id; render(); }),
        button("删除", () => {
          if (!win().confirm(`删除「${item.title}」的案件存档？`)) return;
          void task(async token => {
            await commit(token, { type: "remove", id: item.id });
            if (!active(token) || state.invalid || state.pending) return;
            if (state.selected === item.id) state.selected = "";
            status("案件已删除");
          });
        }),
      );
      state.content.append(row);
    }
  }
  function renderConfig() {
    const back = button("← 案件列表", () => { state.showConfig = false; render(); });
    state.content.append(back);
    const config = state.config || { prompts: service.rules.prompts, custom: {}, revisions: {} };
    const draft = state.configDraft ||= {
      scheme: JSON.stringify(config.prompts, null, 2), custom: {
        ...config.custom, 思维链_引子: config.custom.思维链_引子 ?? service.rules.defaultCotIntro,
        思维链_探案: config.custom.思维链_探案 ?? config.custom.思维链 ?? service.rules.defaultCotPlay,
        折叠标签: (config.custom.折叠标签 || ["reasoning", "danmaku_raw", "thinking", "think", "action"]).join("\n"),
        对话条数: config.custom.对话条数 ?? 200, 默认题材: config.custom.默认题材 || "本格",
      },
    };
    const scheme = el("textarea");
    scheme.value = draft.scheme;
    scheme.addEventListener("input", () => { draft.scheme = scheme.value; });
    scheme.setAttribute("aria-label", "五阶段及探案提示词方案 JSON");
    scheme.style.minHeight = "190px";
    const fold = el("details");
    fold.append(el("summary", "", "工作流方案 JSON"), scheme);
    state.content.append(fold);
    const fields = [
      ["生成", "生成阶段自定义提示词"],
      ["引子", "引子自定义提示词"],
      ["后续", "探案与结案自定义提示词"],
      ["思维链_引子", "引子思维链"],
      ["思维链_探案", "探案与结案思维链"],
      ["折叠标签", "折叠标签（每行一个）"],
      ["对话条数", "小窗对话发送条数"],
      ["默认题材", "默认题材"],
    ];
    const values = {};
    for (const [key, label] of fields) {
      const row = el("label", "crypt-lord-detective-case__field", label);
      const textarea = el(key === "对话条数" ? "input" : key === "默认题材" ? "select" : "textarea");
      if (key === "对话条数") {
        textarea.type = "number"; textarea.min = "10"; textarea.max = "2000"; textarea.step = "10";
      }
      if (key === "默认题材") for (const value of ["本格", "变格"]) {
        const option = el("option", "", value); option.value = value; textarea.append(option);
      }
      textarea.value = String(draft.custom[key] ?? "");
      textarea.setAttribute("aria-label", label);
      textarea.addEventListener("input", () => { draft.custom[key] = textarea.value; });
      textarea.addEventListener("change", () => { draft.custom[key] = textarea.value; });
      values[key] = textarea;
      row.append(textarea);
      state.content.append(row);
    }
    actions(state.content,
      button("保存到世界书", () => void task(async token => {
        let prompts;
        try { prompts = JSON.parse(draft.scheme); }
        catch { throw new Error("工作流方案 JSON 无效"); }
        const custom = { ...config.custom };
        for (const [key] of fields) custom[key] = key === "折叠标签"
          ? draft.custom[key].split(/\r?\n/).map(value => value.trim()).filter(Boolean)
          : key === "对话条数" ? Number(draft.custom[key]) : draft.custom[key];
        const saved = await service.saveConfiguration({ prompts, custom },
          structuredClone(config.revisions), () => active(token));
        if (active(token)) {
          state.config = saved.revisions ? saved : null; state.configDraft = null;
          state.configError = saved.warning || "";
          render(); status(saved.warning || "提示词已保存到 2历史孔隙", Boolean(saved.warning));
        }
      })),
      button("恢复内置方案", () => {
        scheme.value = JSON.stringify(service.rules.prompts, null, 2);
        draft.scheme = scheme.value;
        status("内置方案已载入编辑框，点击保存后生效");
      }),
      button("重新读取配置", () => void task(async token => {
        if (state.configDraft && !win().confirm("放弃配置草稿并重新读取？")) return;
        const config = await service.configuration(false, () => active(token));
        if (!active(token)) return;
        state.config = config; state.configDraft = null;
        status("已重新读取提示词配置");
      })),
    );
  }
  function renderGeneration(item) {
    const settings = el("div", "crypt-lord-detective-case__toolbar");
    if (!item.draw) {
      const mode = el("select");
      mode.setAttribute("aria-label", "题材模式");
      for (const value of ["本格", "变格"]) {
        const option = el("option", "", value); option.value = value; mode.append(option);
      }
      mode.value = item.mode || "本格";
      const count = el("select");
      count.setAttribute("aria-label", "角色人数");
      for (const value of [4, 5, 6]) {
        const option = el("option", "", `${value}人`); option.value = String(value); count.append(option);
      }
      count.value = String(item.roleCount || 5);
      settings.append(mode, count, button("抽取核诡", () => void task(async token => {
        await commit(token, { type: "draw", id: item.id, options: {
          mode: mode.value, roleCount: Number(count.value),
        } });
        if (active(token) && !state.invalid && !state.pending) status("核诡已抽取");
      })));
    } else {
      settings.append(el("span", "", `${item.mode} · ${item.roleCount}人`),
        button("重新抽取", () => {
          if (!win().confirm("重新抽取将清除已生成的全部案情，继续？")) return;
          void task(async token => commit(token, { type: "draw", id: item.id }));
        }));
    }
    state.content.append(settings);
    if (item.draw && item.genProgress < service.steps.length)
      actions(state.content, button(item.genProgress ? "继续生成全部案情" : "生成全部案情", () => generateRemaining(item)));
    for (const [index, step] of service.steps.entries()) {
      const row = el("div", "crypt-lord-detective-case__step");
      const generated = index < item.genProgress;
      const go = button(`${index + 1}. ${step.label}`, () => {
        if (generated && !win().confirm("重新生成此阶段会清除后续阶段的案情，继续？")) return;
        requestStage(item, index);
      });
      go.disabled = !item.draw || index > item.genProgress || state.busy;
      row.append(go, el("small", "", generated ? "已完成" : index === item.genProgress ? "待生成" : "未解锁"));
      state.content.append(row);
    }
    if (item.genProgress >= 5) actions(state.content,
      button("开始探案", () => requestStage(item, "intro")));
  }
  function renderRecords(item) {
    const log = el("div", "crypt-lord-detective-case__log");
    for (const row of item.records || []) {
      const entry = el("article", `crypt-lord-detective-case__${row.role}`);
      entry.append(el("small", "", row.role === "player" ? "你的行动" :
        row.role === "report" ? "结案报告 · 不导出" : "世界正文"), el("p", "", row.text));
      for (const fold of row.foldBlocks || []) {
        const detail = el("details");
        detail.append(el("summary", "", fold.tag), el("pre", "", fold.xml));
        entry.append(detail);
      }
      log.append(entry);
    }
    state.content.append(log);
    log.scrollTop = log.scrollHeight;
  }
  function renderPlay(item) {
    const clues = el("details");
    clues.append(el("summary", "", `已解锁线索 ${item.clues.filter(c => c.unlocked).length}/${item.clues.length}`));
    for (const clue of item.clues.filter(c => c.unlocked)) clues.append(el("p", "", `${clue.id} · ${clue.phenom}`));
    state.content.append(clues);
    renderRecords(item);
    const input = el("textarea");
    input.placeholder = "输入调查行动、询问或搜查内容";
    input.setAttribute("aria-label", "调查行动");
    input.value = state.draft;
    input.addEventListener("input", () => { state.draft = input.value; });
    state.content.append(input);
    actions(state.content,
      button("发送行动", () => requestStage(item, "turn", state.draft.trim())),
      button("结案", () => {
        const conclusion = win().prompt("结案结论（凶手、手法、关键真相）：", "");
        if (conclusion !== null) requestStage(item, "verdict", conclusion.trim());
      }),
      button("导出正文", () => void exportCase(item)));
  }
  async function exportCase(item) {
    await task(async token => {
      const current = await verify(token);
      const report = service.exportChronicle(service.caseById(current.data, item.id));
      const input = await contract.waitGlobalInitialized("cryptLord.inputAdapter", { timeoutMs: 10000 });
      await verify(token);
      const native = doc().querySelector("#send_textarea"), previous = native?.value;
      if (!native) throw Error("找不到原生输入框");
      if (previous.trim() && previous !== report && !win().confirm("原生输入框已有草稿，是否替换为探案纪实？")) return;
      await verify(token);
      if (modules["cryptLord.inputAdapter"] !== input || doc().querySelector("#send_textarea") !== native ||
        native.value !== previous) throw Error("原生输入框或草稿已变化，未替换");
      input.setInputText(report, "sillytavern-native");
      status("探案纪实已填入原生输入框，由你决定何时发送");
    });
  }
  function render() {
    if (!state.content || state.panel.dataset.open !== "true") return;
    state.cancelButton.hidden = !state.busy;
    state.content.replaceChildren();
    if (state.invalid || state.generating) {
      state.content.append(el("p", "", "案件来源已失效，未保存草稿保留。"));
      actions(state.content, button("重新读取", () => void reload()));
      for (const control of state.content.querySelectorAll("button")) control.disabled = state.busy || state.generating;
      return;
    }
    if (!state.snapshot) {
      state.content.append(el("p", "", "没有可写入的真实 assistant 楼层。"));
      actions(state.content, button("重新读取", () => void reload()));
      return;
    }
    if (!state.config) {
      state.content.append(el("p", "", state.configError || "正在读取提示词配置…"));
      actions(state.content, button("重新读取", () => void reload()),
        button("载入内置配置", () => void task(async token => {
          const config = await service.configuration(true, () => active(token));
          if (!active(token)) return;
          state.config = config; state.configError = ""; state.configDraft = null;
          status("已载入内置配置，世界书未修改");
        })));
    } else renderReady();
    if (!state.snapshot.editable) {
      state.content.prepend(el("p", "crypt-lord-detective-case__muted", state.snapshot.reason));
      for (const control of state.content.querySelectorAll("button, input, select, textarea"))
        if (control.dataset.readonly !== "true") control.disabled = true;
      actions(state.content, button("重新读取", () => void reload()));
    }
    if (state.pending) {
      for (const control of state.content.querySelectorAll("button, input, select, textarea")) control.disabled = true;
      const row = actions(state.content,
        button("重试保存本次结果", () => void task(savePending)),
        button("放弃结果并重读", () => void reload()));
      row.classList.add("crypt-lord-detective-case__pending");
    }
    for (const control of state.content.querySelectorAll("button, input, select, textarea"))
      if (state.busy) control.disabled = true;
  }
  function renderReady() {
    const item = chosen();
    if (state.showConfig) { renderConfig(); return; }
    if (!item) { renderList(); return; }
    try { service.validateCase(item); }
    catch (error) {
      state.content.append(el("p", "", error.message));
      actions(state.content, viewButton("← 案件列表", () => { state.selected = ""; render(); }));
      return;
    }
    const toolbar = el("div", "crypt-lord-detective-case__toolbar");
    toolbar.append(viewButton("← 案件列表", () => { state.selected = ""; render(); }),
      el("strong", "", item.title || "未命名案件"));
    state.content.append(toolbar);
    if (item.status === "生成中") renderGeneration(item);
    else if (item.status === "探案中") renderPlay(item);
    else {
      if (item.verdictReport) state.content.append(el("p", "crypt-lord-detective-case__report", item.verdictReport));
      renderRecords(item);
      actions(state.content, button("导出正文", () => void exportCase(item)));
    }
  }
  async function open() {
    if (!mount()) return false;
    if (state.panel.dataset.open !== "true") state.returnFocus = doc().activeElement;
    state.token++;
    const token = state.token;
    state.selected = "";
    state.snapshot = null;
    state.draft = "";
    state.config = null;
    state.configDraft = null;
    state.configError = "";
    state.pending = null;
    state.invalid = false;
    state.busy = false;
    state.panel.removeAttribute("aria-busy");
    state.showConfig = false;
    state.panel.dataset.open = "true";
    state.panel.style.left = "";
    state.panel.style.top = "";
    state.panel.style.transform = "";
    status("正在读取当前 assistant 楼层…");
    render();
    state.panel.focus();
    try { await load(token); }
    catch (error) { if (active(token)) status(error?.message || String(error), true); }
    return true;
  }
  const api = Object.freeze({
    status: () => ({ ready: Boolean(state.panel), open: state.panel?.dataset.open === "true" }),
    mount, open, close,
    dispose() {
      state.disposed = true;
      close();
      state.subscriptions.forEach(item => item?.stop());
      doc().removeEventListener("keydown", state.keyListener);
      state.panel?.remove();
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  mount();
})();
