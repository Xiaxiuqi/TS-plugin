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
    token: 0, busy: false, disposed: false, subscription: null, draft: "",
    config: null, showConfig: false,
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
    node.addEventListener("click", fn);
    return node;
  };
  const store = () => contract.waitGlobalInitialized("cryptLord.stateStore", { timeoutMs: 10000 });
  const active = token => !state.disposed && state.token === token && state.panel?.dataset.open === "true";
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
  }
  function mount() {
    if (state.disposed || state.panel || !doc().body) return Boolean(state.panel);
    const panel = el("section", "crypt-lord-detective-case");
    panel.dataset.open = "false";
    const header = el("header");
    header.append(el("strong", "", "事件真相 · 侦探本"), button("×", close, "关闭"));
    const content = el("main", "crypt-lord-detective-case__content");
    const footer = el("footer", "crypt-lord-detective-case__status");
    footer.setAttribute("role", "status");
    panel.append(header, content, footer);
    doc().body.append(panel);
    Object.assign(state, { panel, content, status: footer });
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
    if (events?.CHAT_CHANGED) state.subscription = afterNative.bindEvent(events.CHAT_CHANGED, close);
    return true;
  }
  async function load(token) {
    const latest = await (await store()).findLatestAssistant();
    if (!active(token)) return;
    state.snapshot = latest ? {
      messageId: latest.message_id, message: latest.message,
      data: latest.data, revision: JSON.stringify(latest.data),
    } : null;
    try { state.config = await service.configuration(); }
    catch (error) {
      state.config = { prompts: service.rules.prompts, custom: {}, revisions: {} };
      if (active(token)) status(`提示词配置读取失败，暂用内置方案：${error?.message || error}`, true);
    }
    if (!active(token)) return;
    render();
  }
  async function verify(token) {
    if (!active(token) || !state.snapshot) throw new Error("窗口或聊天已变化");
    const current = await (await store()).findLatestAssistant();
    if (!active(token) || !current || current.message_id !== state.snapshot.messageId ||
      current.message !== state.snapshot.message || JSON.stringify(current.data) !== state.snapshot.revision) {
      throw new Error("聊天、正文或变量已变化，请重新读取案件");
    }
    return current;
  }
  async function commit(token, transform) {
    const current = await verify(token);
    const next = transform(current.data);
    await verify(token);
    await (await store()).writeAssistantData(current.message_id, next);
    if (!active(token)) return;
    const saved = await (await store()).readMessage?.(current.message_id);
    if (!active(token)) return;
    state.snapshot.data = saved?.data || next;
    state.snapshot.revision = JSON.stringify(state.snapshot.data);
    render();
  }
  async function task(work) {
    if (state.busy) return;
    const token = state.token;
    state.busy = true;
    state.panel?.setAttribute("aria-busy", "true");
    render();
    try { await work(token); }
    catch (error) { if (active(token)) status(error?.message || String(error), true); }
    finally {
      state.busy = false;
      state.panel?.removeAttribute("aria-busy");
      if (active(token)) render();
    }
  }
  function actions(parent, ...children) {
    const row = el("div", "crypt-lord-detective-case__actions");
    row.append(...children);
    parent.append(row);
    return row;
  }
  function chosen() {
    return service.getCases(state.snapshot?.data).find(item => item.id === state.selected);
  }
  function requestStage(item, stage, action = "") {
    return task(async token => {
      const current = await verify(token);
      const source = service.caseById(current.data, item.id);
      const prompt = service.promptFor(source, stage, action, state.config?.prompts);
      const customization = service.customFor(state.config?.custom, stage);
      status(stage === "intro" ? "生成引子中…" : stage === "turn" ? "演绎本回合…" :
        stage === "verdict" ? "裁定中…" : `生成阶段 ${Number(stage) + 1}/5…`);
      const raw = await service.request(prompt, customization);
      if (!String(raw).trim()) throw new Error("模型没有返回内容，请重试");
      await commit(token, data => service.applyStage(data, item.id, stage, raw, action, customization.folds).mvuState);
      if (active(token)) {
        state.draft = "";
        status("已写入当前 assistant 楼层");
      }
    });
  }
  function renderList() {
    const top = el("div", "crypt-lord-detective-case__toolbar");
    top.append(button("新建案件", () => {
      void task(async token => {
        const result = service.newInvestigation(state.snapshot.data);
        await commit(token, () => result.mvuState);
        state.selected = result.caseItem.id;
        render();
      });
    }));
    top.append(button("重新读取", () => void task(load), "从当前原生楼层重新读取"));
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
        button("进入", () => { state.selected = item.id; render(); }),
        button("删除", () => {
          if (!win().confirm(`删除「${item.title}」的案件存档？`)) return;
          void task(async token => {
            await commit(token, data => service.removeCase(data, item.id));
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
    const scheme = el("textarea");
    scheme.value = JSON.stringify(config.prompts, null, 2);
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
    ];
    const values = {};
    for (const [key, label] of fields) {
      const row = el("label", "crypt-lord-detective-case__field", label);
      const textarea = el("textarea");
      textarea.value = key === "折叠标签"
        ? (config.custom[key] || ["reasoning", "danmaku_raw", "thinking", "think", "action"]).join("\n")
        : String(config.custom[key] ?? (key === "思维链_引子" ? service.rules.defaultCotIntro :
          key === "思维链_探案" ? service.rules.defaultCotPlay : ""));
      values[key] = textarea;
      row.append(textarea);
      state.content.append(row);
    }
    actions(state.content,
      button("保存到世界书", () => void task(async token => {
        let prompts;
        try { prompts = JSON.parse(scheme.value); }
        catch { throw new Error("工作流方案 JSON 无效"); }
        const custom = { ...config.custom };
        for (const [key] of fields) custom[key] = key === "折叠标签"
          ? values[key].value.split(/\r?\n/).map(value => value.trim()).filter(Boolean)
          : values[key].value;
        state.config = await service.saveConfiguration({ prompts, custom },
          structuredClone(config.revisions), () => active(token));
        if (active(token)) { render(); status("提示词已保存到 2历史孔隙"); }
      })),
      button("恢复内置方案", () => {
        scheme.value = JSON.stringify(service.rules.prompts, null, 2);
        status("内置方案已载入编辑框，点击保存后生效");
      }),
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
        await commit(token, data => {
          const cases = service.getCases(data).map(c => c.id === item.id ?
            { ...c, mode: mode.value, roleCount: Number(count.value) } : c);
          const next = structuredClone(data);
          next.world_data = { ...(next.world_data || {}), 案件列表: cases };
          return service.drawCase(next, item.id).mvuState;
        });
        status("核诡已抽取");
      })));
    } else {
      settings.append(el("span", "", `${item.mode} · ${item.roleCount}人`),
        button("重新抽取", () => {
          if (!win().confirm("重新抽取将清除已生成的全部案情，继续？")) return;
          void task(async token => commit(token, data => service.drawCase(data, item.id).mvuState));
        }));
      const draw = el("details");
      draw.append(el("summary", "", "查看抽取结果"), el("pre", "", service.rules.formatDraw(item.draw) +
        "\n" + service.rules.formatAxes(item.draw)));
      state.content.append(draw);
    }
    state.content.append(settings);
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
    try {
      const input = await contract.waitGlobalInitialized("cryptLord.inputAdapter", { timeoutMs: 10000 });
      input.setInputText(service.exportChronicle(item), "sillytavern-native");
      status("探案纪实已填入原生输入框，由你决定何时发送");
    } catch (error) { status(error?.message || String(error), true); }
  }
  function render() {
    if (!state.content || state.panel.dataset.open !== "true") return;
    state.content.replaceChildren();
    if (!state.snapshot) {
      state.content.append(el("p", "", "没有可写入的真实 assistant 楼层。"));
      return;
    }
    const item = chosen();
    if (state.showConfig) { renderConfig(); return; }
    if (!item) { renderList(); return; }
    const toolbar = el("div", "crypt-lord-detective-case__toolbar");
    toolbar.append(button("← 案件列表", () => { state.selected = ""; render(); }),
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
    state.token++;
    const token = state.token;
    state.selected = "";
    state.showConfig = false;
    state.panel.dataset.open = "true";
    state.panel.style.left = "";
    state.panel.style.top = "";
    state.panel.style.transform = "";
    status("正在读取当前 assistant 楼层…");
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
      state.subscription?.stop();
      state.panel?.remove();
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  mount();
})();
