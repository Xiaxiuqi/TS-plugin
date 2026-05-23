# 数据库重填表优化

## 当前版本

- 当前版本：v1.0。
- 最新发布目录：`latest/`。
- 可导入脚本：`latest/酒馆助手脚本-数据库重填表优化 v1.0.json`。
- 同源 JS：`latest/数据库重填表优化 v1.0.js`。

## 项目状态

- 当前阶段：首版脚本已制作。
- 任务来源：用户发现数据库在两类重新生成场景下不会自动重新填表。
- 目标：先明确 SillyTavern 的两个重新生成入口，以及 shujuku/数据库的手动重新填表入口。
- 本轮补充：参考 `https://github.com/jerryzmtz/my-tavern-scripts` 中数据库前端的“重新填表”实现，完善后续酒馆助手脚本计划。

## 工作流规则

- 每一轮工作完成后，必须在“步骤索引”里把本轮完成项从 `[ ]` 改为 `[x]`。
- 每一轮工作完成后，必须更新“下一轮要做什么”。
- 如果本轮只是调研或写 README，不创建脚本文件、不进入脚本版本发布流程。
- 如果后续开始制作或修改脚本，必须改走 `docs/SCRIPT_VERSIONING.md` 流程，并维护脚本版本、latest/archive 与更新日志。

## GitHub 仓库检索策略

- 优先使用 `gh api`、`gh repo view`、GitHub raw 文件读取公开仓库或已授权私有仓库。
- 优先尝试 GitHub Code Search；如果搜索有结果，直接读取命中文件。
- 如果 Code Search 返回 0 条、索引缺失、查询受限或需要跨仓库精确全文检索，则允许临时浅克隆到 `C:\Users\ASUS\AppData\Local\Temp\opencode`。
- 临时克隆只用于本地全文检索，不写入奶龙工具箱项目目录。
- 使用临时克隆后，本轮结束前必须删除临时目录，并在最终回复中说明是否已清理。
- 若用户明确要求“不克隆”，则只使用 GitHub API/raw/网页逐文件读取，但需说明可能更慢且更容易遗漏。

## 步骤索引

- [x] 第 1 轮：创建调研项目 README，明确两个重新生成按钮和数据库重新填表按钮的初步定位。
- [x] 第 2 轮：参考 `jerryzmtz/my-tavern-scripts`，确认“重新填表”按钮实际调用 `AutoCardUpdaterAPI.manualUpdate()`，补充脚本计划和 API 清单。
- [x] 第 3 轮：补充 GitHub 仓库检索策略、步骤索引、每轮勾选规则和下一轮任务。
- [x] 第 4 轮：完成静态事件矩阵整理；确认文档层面可用事件、参数和候选触发路径，但尚未实测用户环境里的实际触发顺序。
- [x] 第 5 轮：完成实机事件验证，确认用户环境中底部 Regenerate 与楼层 Swipe 生成的实际事件顺序。
- [x] 第 6 轮：确认用户数据库环境里的 `AutoCardUpdaterAPI.manualUpdate()` 是否存在、是否返回 Promise、失败时的错误形态，以及是否需要 `refreshDataAndWorldbook()` 回退。
- [x] 第 7 轮：设计脚本实现细节，包括宿主窗口解析、事件去抖、并发队列、跨聊天清理、toast 提示策略。
- [x] 第 8 轮：按脚本版本流程制作首版酒馆助手脚本。

## 下一轮要做什么

- 下一轮建议进行实机导入验证。
- 需要在用户酒馆中导入 `latest/酒馆助手脚本-数据库重填表优化 v1.0.json`，验证重复加载、底部 Regenerate、楼层 Swipe、连续触发和聊天切换场景。
- 若实机发现行为问题，再按 `docs/SCRIPT_VERSIONING.md` 升级到 v1.1 或 v1.0.1。

## 目标模式判定

- 主目标：酒馆助手脚本，用于后续监听或补偿重新生成后的数据库填表流程。
- 运行模式：A 或 B，入口为 `window.TavernHelper`。
- 依赖能力：D，若脚本需要主动触发数据库刷新/回写，应调用 `window.AutoCardUpdaterAPI`。
- 本阶段边界：只建立项目与记录 UI/行为调研，不生成 `.json` 或 `.js` 脚本。

## 参考仓库结论

- 参考仓库：`jerryzmtz/my-tavern-scripts`。
- 相关文件：`src/骰子系统/index.ts`。
- 数据库 API 获取方式：优先从宿主/顶层窗口取 `AutoCardUpdaterAPI`，再回退当前 `window.AutoCardUpdaterAPI`。
- 参考实现中固定功能按钮包含 `#acu-btn-refill`，标题为“重新填表”。
- `#acu-btn-refill` 点击后执行 `api.manualUpdate()`。
- 同一前端还用 `api.openSettings()` 打开数据库，用 `api.openVisualizer()` 打开可视化表格编辑器。
- 结论：若目标是模拟数据库前端“重新填表”按钮，后续脚本主调用应优先使用 `AutoCardUpdaterAPI.manualUpdate()`，而不是直接使用 `refreshDataAndWorldbook()`。

## 用户描述中的三个按钮

### 楼层重新生成（Swipe）

- 指 SillyTavern 聊天消息楼层上的 Swipe/重新生成当前回复入口。
- 位置通常在某条 AI 消息的消息操作区，表现为对当前楼层生成新的 swipe 分支，而不是从底部输入区发起新回复。
- 需要后续验证的关键点：该操作是否触发普通消息接收事件、swipe 切换事件，或仅更新当前消息内容。
- 已知 ST 触发语义中存在 `Swipe` 类型，可作为后续监听/判定线索。

### 左下角重新生成

- 指 SillyTavern 聊天输入区附近的全局重新生成按钮。
- 位置通常在聊天界面左下角/底部控制区，用于重新生成最后一条 AI 回复。
- 与楼层 Swipe 的区别：它是底部控制区的 regenerate 行为，不是直接在某条消息楼层里切换或新增 swipe。
- 已知 ST 触发语义中存在 `Regenerate` 类型，可作为后续监听/判定线索。

### 数据库重新填表

- 指 shujuku/神·数据库/SP·数据库 II 面板里的手动刷新/重新填表按钮。
- 参考仓库中的前端按钮 `#acu-btn-refill` 标题为“重新填表”，实际调用 `AutoCardUpdaterAPI.manualUpdate()`。
- 相关外部 API 有两类：`manualUpdate()` 等价于点击立即手动更新/重新填表，`refreshDataAndWorldbook()` 用于重新加载聊天表格、合并独立表、更新世界书并通知 UI 刷新。
- 位置应在数据库 UI 面板内，而不是 SillyTavern 原生聊天底部控制区。

## 后续脚本计划

- 脚本目标：在楼层 Swipe 重新生成、底部 Regenerate 重新生成完成后，自动触发一次数据库“重新填表”。
- 输出形态：优先做可导入酒馆助手脚本 JSON；如需调试，可先维护同名 `.js` 源码再打包。
- 启动检查：确认 `window.TavernHelper`、`eventOn`、`tavern_events` 可用；确认 `AutoCardUpdaterAPI` 可用且存在 `manualUpdate()`。
- 事件监听：监听 `tavern_events.MESSAGE_RECEIVED`，当第二参数 `type` 为 `regenerate` 或 `swipe` 时记录待处理楼层。
- 辅助监听：监听 `tavern_events.MESSAGE_SWIPED` 和 `tavern_events.MESSAGE_UPDATED`，用于覆盖只切换 swipe 或更新楼层但不触发 `MESSAGE_RECEIVED` 的情况。
- 生成完成保护：监听 `tavern_events.GENERATION_ENDED` 后再执行重填表，避免生成中途把半截回复写入数据库。
- 去抖策略：同一聊天、同一楼层在短时间内只触发一次 `manualUpdate()`，避免 swipe、message updated、generation ended 连续事件造成重复填表。
- 并发策略：如果上一次 `manualUpdate()` 尚未完成，新的触发只记录一次 pending，等待当前调用结束后再决定是否补跑。
- 回退策略：如果没有 `manualUpdate()`，再检查是否存在 `refreshDataAndWorldbook()`；若只存在回退接口，脚本应提示“未检测到重新填表接口，已使用刷新数据库/世界书接口替代”。
- 用户提示：成功时可静默或低频 toast；失败时用 `toastr.warning/error` 提示接口不可用或执行失败。

## 需要用到的 API 接口

### 酒馆助手 / TavernHelper

- `window.TavernHelper`：酒馆助手入口，用于判断脚本运行环境。
- `TavernHelper.getLastMessageId()`：需要确认最近楼层时使用。
- `TavernHelper.getChatMessages(range, { include_swipes })`：读取当前楼层内容与 swipe 信息，用于去重和确认文本已稳定。

### SillyTavern 事件

- `eventOn(event, handler)`：注册事件监听。
- `tavern_events.MESSAGE_RECEIVED`：接收消息完成事件，参数包含 `message_id` 与生成类型；类型中可出现 `regenerate`、`swipe`。
- `tavern_events.GENERATION_ENDED`：生成结束事件，适合在这里统一触发重填表。
- `tavern_events.MESSAGE_SWIPED`：消息 swipe 切换事件，参数为 `message_id`。
- `tavern_events.MESSAGE_UPDATED`：消息更新事件，参数为 `message_id`，用于兜底捕获重新生成后的楼层变动。
- `tavern_events.CHAT_CHANGED`：聊天文件切换事件，用于清空 pending 状态，避免跨聊天误触发。

### 数据库 / AutoCardUpdaterAPI

- `window.AutoCardUpdaterAPI`：数据库前端/后端暴露的全局 API 对象。
- `AutoCardUpdaterAPI.manualUpdate()`：核心接口；参考仓库“重新填表”按钮实际调用它。
- `AutoCardUpdaterAPI.refreshDataAndWorldbook()`：回退接口；用于重新加载聊天表格、合并独立表、更新世界书和通知 UI 刷新，但不应作为首选“重新填表”接口。
- `AutoCardUpdaterAPI.openSettings()`：非核心接口；可用于后续调试或提示用户打开数据库面板。
- `AutoCardUpdaterAPI.openVisualizer()`：非核心接口；可用于后续调试或打开可视化表格编辑器。

## 第 4 轮事件矩阵

### 文档层面已确认

- `tavern_events.MESSAGE_RECEIVED` 的监听参数为 `(message_id, type)`。
- `MESSAGE_RECEIVED` 的 `type` 候选包含 `normal`、`quiet`、`regenerate`、`impersonate`、`continue`、`swipe`、`append`、`appendFinal`、`first_message`、`command`、`extension`。
- `tavern_events.MESSAGE_SWIPED` 的监听参数为 `message_id`。
- `tavern_events.MESSAGE_UPDATED` 的监听参数为 `message_id`。
- `tavern_events.GENERATION_STARTED` 的监听参数包含 `type`、`option`、`dry_run`。
- `tavern_events.GENERATION_ENDED` 的监听参数为 `message_id`。
- `tavern_events.CHAT_CHANGED` 的监听参数为 `chat_file_name`。
- `TavernHelper.getChatMessages(messageId, { include_swipes: true })` 可读取目标楼层的 `swipe_id`、`swipes`、`swipes_data`、`swipes_info`。

### 候选触发路径

- 底部 Regenerate 预期路径：`GENERATION_STARTED(type=regenerate)` → `MESSAGE_RECEIVED(message_id, type=regenerate)` → `GENERATION_ENDED(message_id)`，期间可能伴随 `MESSAGE_UPDATED(message_id)`。
- 楼层 Swipe 重新生成预期路径：`GENERATION_STARTED(type=swipe)` → `MESSAGE_RECEIVED(message_id, type=swipe)` → `GENERATION_ENDED(message_id)`，期间可能伴随 `MESSAGE_SWIPED(message_id)` 或 `MESSAGE_UPDATED(message_id)`。
- 仅切换已有 Swipe 的预期路径：可能只有 `MESSAGE_SWIPED(message_id)` 或 `MESSAGE_UPDATED(message_id)`，不一定触发 `MESSAGE_RECEIVED` 或 `GENERATION_ENDED`。
- 聊天切换路径：`CHAT_CHANGED(chat_file_name)` 后必须清空所有 pending 状态，避免旧聊天的重填表任务污染新聊天。

### 本轮不能确认的内容

- 不能确认用户当前 SillyTavern 版本中两类重新生成的真实事件顺序。
- 不能确认楼层 Swipe 重新生成是否一定会触发 `MESSAGE_RECEIVED(type=swipe)`。
- 不能确认底部 Regenerate 是否一定会触发 `MESSAGE_UPDATED`。
- 不能确认流式输出时 `GENERATION_ENDED` 与消息文本最终落盘之间是否存在延迟。

### 实机探针要求

- 探针只打印日志，不调用 `AutoCardUpdaterAPI.manualUpdate()`。
- 探针不修改聊天消息、不切换 swipe、不触发生成。
- 探针记录最近 50 条事件，避免控制台刷屏过多。
- 每条日志至少包含：事件名、时间戳、`message_id`、`type`、`lastMessageId`、目标楼层前 80 字。
- 实测后再决定最终脚本应以 `MESSAGE_RECEIVED` 为主触发，还是以 `GENERATION_ENDED` 加 pending 状态为主触发。

## 第 5 轮实机验证状态

- 本轮目标：进入用户实际 SillyTavern 环境，验证楼层 Swipe 与底部 Regenerate 的真实事件触发顺序。
- 当前结果：已完成实机验证。
- 实测地址：`http://192.168.0.182:8000/`。
- 探针方式：通过 `SillyTavern.getContext().eventSource/eventTypes` 注入临时只读事件探针，监听 `GENERATION_STARTED`、`GENERATION_ENDED`、`MESSAGE_RECEIVED`、`MESSAGE_SWIPED`、`MESSAGE_UPDATED`、`CHAT_CHANGED`、`CHAT_LOADED`。
- 安全边界：探针只记录事件；未调用 `AutoCardUpdaterAPI.manualUpdate()`，未调用 `refreshDataAndWorldbook()`，未主动修改聊天消息。
- 清理结果：实测完成后已调用探针 `uninstall()` 卸载监听器。

### 底部 Regenerate 实测结果

```text
1. GENERATION_STARTED(type=regenerate, dry_run=false)
2. GENERATION_ENDED(message_id=1)
3. GENERATION_STARTED(type=normal, dry_run=true)
4. MESSAGE_RECEIVED(message_id=0, type=regenerate)
5. GENERATION_STARTED(type=normal, dry_run=true)
```

- 结论：底部重新生成可以稳定依赖 `MESSAGE_RECEIVED` 的 `type=regenerate` 识别。
- 注意：`GENERATION_ENDED` 的 `message_id` 与 `MESSAGE_RECEIVED` 的 `message_id` 不一致；当前聊天只有 0 楼，`GENERATION_ENDED` 返回了 `1`，所以最终脚本不应只信任 `GENERATION_ENDED` 的楼层号。
- 注意：`MESSAGE_RECEIVED(type=regenerate)` 晚于 `GENERATION_ENDED`，更适合作为“生成已落到消息”的主触发点。
- 注意：期间会出现 `GENERATION_STARTED(type=normal, dry_run=true)`，应忽略 `dry_run=true` 的生成事件。

### 楼层 Swipe 生成实测结果

```text
1. MESSAGE_SWIPED(message_id=0)
2. GENERATION_STARTED(type=swipe, dry_run=false)
3. MESSAGE_UPDATED(message_id=0)
4. GENERATION_ENDED(message_id=1)
5. MESSAGE_RECEIVED(message_id=0, type=swipe)
6. GENERATION_STARTED(type=normal, dry_run=true)
7. MESSAGE_UPDATED(message_id=0)
```

- 结论：楼层 Swipe 生成可以稳定依赖 `MESSAGE_RECEIVED` 的 `type=swipe` 识别。
- 注意：`MESSAGE_SWIPED` 会在生成开始前出现，此时新 swipe 内容可能为空，不能立即触发数据库重填表。
- 注意：生成过程中会出现 `MESSAGE_UPDATED`，但它可能早于最终落盘，也可能在 `MESSAGE_RECEIVED` 后再次出现，不能单独作为重填表主触发。
- 注意：`GENERATION_ENDED` 的 `message_id` 同样与目标楼层不一致，不能只靠它决定重填表目标。

### 第 5 轮触发策略修正

- 主触发事件应改为 `MESSAGE_RECEIVED(message_id, type)`。
- 当 `type` 为 `regenerate` 或 `swipe` 时，标记需要触发数据库重填表。
- `GENERATION_STARTED` 只用于识别生成中状态与过滤 `dry_run=true`，不直接触发重填表。
- `GENERATION_ENDED` 只作为辅助信号，不作为主触发，因为其 `message_id` 在实测中不可靠。
- `MESSAGE_SWIPED` 与 `MESSAGE_UPDATED` 只作为状态辅助或兜底观察，不应在最终脚本中单独触发 `manualUpdate()`。

## 第 6 轮数据库接口验证

- 本轮目标：确认用户实际酒馆环境中数据库 API 的暴露位置、函数类型、返回形态和回退可行性。
- 验证地址：`http://192.168.0.182:8000/`。
- 验证方式：通过 CDP 只读检查 `window`、`parent`、`top`、`opener` 和所有 `window.frames` 上的 `AutoCardUpdaterAPI`，仅读取属性、函数类型、函数参数长度和函数源码头部。
- 安全边界：未调用 `AutoCardUpdaterAPI.manualUpdate()`，未调用 `refreshDataAndWorldbook()`，未修改聊天消息或数据库内容。

### 暴露位置

- `window.AutoCardUpdaterAPI` 存在，类型为 `object`。
- `window.parent.AutoCardUpdaterAPI` 存在，且 `parent === window`。
- `window.top.AutoCardUpdaterAPI` 存在，且 `top === window`。
- `window.opener` 不存在。
- 页面中的 `about:srcdoc` frames 未暴露 `AutoCardUpdaterAPI`。
- 结论：最终脚本仍应优先解析宿主/顶层窗口，但当前用户环境中直接使用当前 `window.AutoCardUpdaterAPI` 即可命中。

### manualUpdate

```text
type: function
name: manualUpdate
length: 0
constructorName: AsyncFunction
sourceHead: async function () {
    try {
        return await handleManualUpdate_ACU();
    }
    catch (e) {
        logError_ACU('manualUpdate failed:', e);
        return false;
    }
}
```

- `manualUpdate()` 存在且不需要参数。
- `manualUpdate()` 是 `AsyncFunction`，按 JavaScript 语义调用后一定返回 Promise。
- 源码显示成功值来自 `handleManualUpdate_ACU()`，失败时捕获异常、记录 `manualUpdate failed:`，并返回 `false`。
- 结论：后续脚本可以 `await api.manualUpdate()`，并把返回值 `false` 视为失败。

### refreshDataAndWorldbook

```text
type: function
name: refreshDataAndWorldbook
length: 0
constructorName: AsyncFunction
sourceHead: async function () {
    try {
        await refreshMergedDataAndNotifyWithUI_ACU();
        logDebug_ACU('refreshDataAndWorldbook: Data refreshed and worldbook updated successfully.');
        return true;
    }
    catch (e) {
        logError_ACU('refreshDataAndWorldbook failed:', e);
        return false;
    }
}
```

- `refreshDataAndWorldbook()` 存在且不需要参数。
- `refreshDataAndWorldbook()` 是 `AsyncFunction`，按 JavaScript 语义调用后一定返回 Promise。
- 源码显示成功时返回 `true`，失败时捕获异常、记录 `refreshDataAndWorldbook failed:`，并返回 `false`。
- 结论：当前环境不需要默认回退到 `refreshDataAndWorldbook()`，因为首选 `manualUpdate()` 已存在；但后续脚本可在 `manualUpdate` 缺失时把它作为可选回退。

### 第 6 轮接口策略修正

- 首选接口：`AutoCardUpdaterAPI.manualUpdate()`。
- 调用方式：`await api.manualUpdate()`。
- 成功判定：不应只依赖 truthy；若返回 `false`，应提示失败；其他返回值可按成功处理并保留日志。
- 异常处理：仍需外层 `try/catch`，因为未来版本可能不在 API 内部吞异常，或宿主窗口访问可能失败。
- 回退接口：仅当 `manualUpdate` 不存在但 `refreshDataAndWorldbook` 存在时，才考虑回退调用 `refreshDataAndWorldbook()`，并提示这是刷新/同步回退，不等同于首选重新填表。

## 第 7 轮脚本实现设计

- 本轮目标：把第 5 轮事件实测结果和第 6 轮数据库接口验证结果合并为首版脚本实现方案。
- 本轮边界：只更新设计记录，不创建 `.js` 或 `.json` 脚本，不进入版本发布流程。
- 输出形态建议：第 8 轮优先制作酒馆助手脚本 JSON；如需便于维护，可同步维护纯 JS 源码并用项目工具转换。

### 运行入口与依赖检查

- 目标模式：A/B + D。
- 脚本入口：`window.TavernHelper`。
- 事件入口优先级：优先用 `SillyTavern.getContext().eventSource/eventTypes`；若酒馆助手环境已直接暴露 `eventOn` / `tavern_events`，可作为兼容读取。
- 数据库入口：通过宿主窗口解析取得 `AutoCardUpdaterAPI`，再检查 `manualUpdate` 和 `refreshDataAndWorldbook`。
- 启动时必须防御检查：缺 `TavernHelper`、缺事件系统、缺数据库 API 时不抛裸错误，只记录日志并用低频 `toastr.warning` 提示。
- 最终脚本不需要读取或修改聊天正文；仅在需要确认楼层稳定时读取 `TavernHelper.getChatMessages()`。

### 宿主窗口解析

- 解析候选窗口顺序：`window.parent`、`window.top`、`window.opener`、`window`。
- 每个候选窗口访问都必须放进 `try/catch`，避免跨域或已关闭窗口导致脚本中断。
- 命中标准：候选窗口存在 `AutoCardUpdaterAPI`，且 `manualUpdate` 或 `refreshDataAndWorldbook` 至少一个是 `function`。
- 当前用户环境中 `parent === window`、`top === window`，直接 `window.AutoCardUpdaterAPI` 可用；保留宿主解析是为了兼容脚本未来可能运行在 iframe 或弹窗里的情况。
- 若多个窗口都命中，优先使用第一个满足条件的 API，不做多窗口广播，避免重复填表。

### 主触发事件

- 主触发只监听 `MESSAGE_RECEIVED(message_id, type)`。
- 当 `type === 'regenerate'` 或 `type === 'swipe'` 时，记录一次待重填表请求。
- 不直接用 `GENERATION_ENDED(message_id)` 作为主触发，因为实测中它返回的 `message_id` 与目标楼层不一致。
- 不直接用 `MESSAGE_SWIPED(message_id)` 作为主触发，因为它可能在新 swipe 内容生成前出现。
- 不直接用 `MESSAGE_UPDATED(message_id)` 作为主触发，因为它可能早于最终落盘，也可能在 `MESSAGE_RECEIVED` 后再次出现。
- `GENERATION_STARTED(type, options, dry_run)` 仅作为可选状态记录；如果实现中监听它，必须忽略 `dry_run === true`，且不能由它触发重填表。

### 待处理状态模型

```text
state = {
  installed: true,
  currentChatId: string | number | null,
  timer: number | null,
  running: false,
  pending: false,
  pendingReason: string,
  pendingMessageId: number | null,
  lastRunAt: number,
  lastTriggerKey: string,
  lastWarnAt: Record<string, number>
}
```

- `pending` 表示已有一次重填表请求等待执行。
- `running` 表示当前正在 `await api.manualUpdate()` 或回退接口。
- `pendingMessageId` 只用于日志和去抖，不传给数据库 API，因为 `manualUpdate()` 不接收楼层参数。
- `currentChatId` 用于跨聊天清理；优先读取 `SillyTavern.getCurrentChatId()`，没有则使用 `chatMetadata` 或 URL/时间兜底。
- `lastTriggerKey` 建议由 `chatId + ':' + messageId + ':' + type` 组成，用于短时间内跳过重复事件。

### 去抖策略

- `MESSAGE_RECEIVED(type=regenerate/swipe)` 后不要立刻调用数据库，建议延迟 `800ms` 到 `1200ms`。
- 首版固定使用 `1000ms` 延迟即可，后续如果用户反馈慢或漏触发再做配置项。
- 如果延迟期间再次收到同一 `chatId/messageId/type`，只刷新 timer，不新增多次请求。
- 如果延迟期间收到不同目标的 regenerate/swipe，只保留一次 `pending = true`，因为数据库重填表是全局刷新式 API，不按楼层局部刷新。
- 去抖窗口用于吸收 Swipe 过程中的 `MESSAGE_UPDATED`、dry-run 生成事件和最终落盘后的轻微异步延迟。

### 并发队列策略

- 采用单飞模型：同一时间最多运行一个数据库重填表调用。
- 如果 `running === false` 且延迟结束，立即执行 `runRefill()`。
- 如果 `running === true` 时又收到触发，只设置 `pending = true`，不并发调用数据库。
- 当前调用结束后，如果 `pending === true`，再等待一个短延迟后补跑一次。
- 补跑最多按“当前运行期间是否出现过新触发”折叠为一次，不按事件数量逐个排队。
- 这样可以避免 regenerate/swipe 连续点击时把数据库接口打爆，同时确保最后一次变更仍会被刷新。

### 数据库调用策略

- 首选调用：`await api.manualUpdate()`。
- 成功判定：返回值不是 `false` 即视作成功；若返回 `false`，记录失败并提示。
- 外层仍需 `try/catch`，不要假设数据库 API 永远吞异常。
- 仅当 `manualUpdate` 不存在但 `refreshDataAndWorldbook` 存在时，才调用 `await api.refreshDataAndWorldbook()`。
- 使用回退接口时必须提示“未检测到重新填表接口，已使用刷新数据库/世界书接口替代”，避免用户误以为等价。
- 如果两个接口都不存在，脚本应停止执行触发逻辑，只低频提示数据库 API 不可用。

### 跨聊天清理

- 监听 `CHAT_CHANGED(chat_file_name)` 和可用时的 `CHAT_LOADED`。
- 聊天切换时立即清除 `timer`、`pending`、`pendingReason`、`pendingMessageId`、`lastTriggerKey`。
- 如果切换聊天时已有 `running === true`，不能取消已发起的数据库 Promise，但调用完成后不得因旧 pending 自动补跑。
- 可通过递增 `generationToken` / `chatToken` 实现：每次聊天切换 token +1，`runRefill()` 结束时如果 token 已变化，就跳过补跑。
- 这样避免旧聊天的 regenerate/swipe 触发新聊天里的数据库重填表。

### Toast 与日志策略

- 默认成功静默，只在控制台 `console.info` 记录低噪声日志。
- 首次安装成功可以不弹 toast，避免每次打开酒馆干扰用户。
- 失败必须提示：数据库 API 不可用、`manualUpdate()` 返回 `false`、接口抛异常。
- 回退到 `refreshDataAndWorldbook()` 时提示一次 warning，并做冷却。
- 相同 warning 建议至少 `30s` 冷却，避免连续 regenerate 时刷屏。
- 调试日志可统一加前缀：`[奶龙数据库重填表]`。

### 安装与卸载保护

- 脚本启动时先检查全局标记，例如 `window.__nlDbRefillAuto`。
- 如果已安装，先调用旧实例的 `uninstall()`，再安装新监听，避免重复导入脚本导致多次触发。
- 保存所有事件解绑函数；若事件系统只有 `on/off`，卸载时用同一 handler 调用 `off`。
- 暴露调试对象：`window.__nlDbRefillAuto = { version, uninstall, getState }`。
- `getState()` 只返回状态快照，不暴露聊天正文和数据库数据。

### 首版伪代码

```js
(function () {
    'use strict';

    const NAME = '[奶龙数据库重填表]';
    const DEBOUNCE_MS = 1000;
    const WARN_COOLDOWN_MS = 30000;
    const REFILL_TYPES = new Set(['regenerate', 'swipe']);

    // 1. 卸载旧实例。
    // 2. 解析 TavernHelper、SillyTavern context、eventSource/eventTypes。
    // 3. 解析宿主窗口上的 AutoCardUpdaterAPI。
    // 4. 监听 MESSAGE_RECEIVED / CHAT_CHANGED / CHAT_LOADED。
    // 5. MESSAGE_RECEIVED 命中 regenerate/swipe 后 scheduleRefill(messageId, type)。
    // 6. scheduleRefill 合并重复触发并设置 1000ms timer。
    // 7. runRefill 单飞调用 manualUpdate；运行中收到新触发则折叠成一次补跑。
    // 8. 聊天切换时清空 pending，并通过 token 阻止旧任务补跑。
})();
```

### 首版不做的事

- 不修改聊天消息，不调用 `setChatMessages()`。
- 不删除、不切换、不创建 swipe。
- 不主动点击 SillyTavern UI 或数据库 UI 按钮。
- 不监听所有 `MESSAGE_UPDATED` 后自动填表，避免普通编辑也触发数据库重填表。
- 不为每个楼层分别调用数据库接口，因为 `manualUpdate()` 是全局手动重填表接口。
- 不默认开放大量配置项，首版先用固定延迟和固定触发类型，减少误用面。

### 第 8 轮制作验收点

- 脚本导入后重复加载不会出现多重监听。
- 底部 Regenerate 完成后触发一次 `manualUpdate()`。
- 楼层 Swipe 生成完成后触发一次 `manualUpdate()`。
- 连续快速触发时不会并发调用多个 `manualUpdate()`，最多当前一次加结束后的补跑一次。
- 切换聊天后旧 pending 不会污染新聊天。
- `manualUpdate()` 返回 `false` 或抛错时有明确 warning/error。
- 缺少数据库 API 时有低频 warning，脚本不崩溃。
- 代码通过 `npm run validate`、`npm run check-refs`、`npm run test`。

## 第 8 轮首版制作记录

- 本轮目标：按 `docs/SCRIPT_VERSIONING.md` 制作首版酒馆助手脚本。
- 版本号：v1.0。
- 发布目录：`projects/数据库重填表优化/latest/`。
- 归档目录：`projects/数据库重填表优化/archive/`。
- 新建脚本文件：`latest/数据库重填表优化 v1.0.js`。
- 新建可导入 JSON：`latest/酒馆助手脚本-数据库重填表优化 v1.0.json`。
- 本项目此前没有 `latest/` 当前版本，因此首版无旧版本可归档。
- JSON 由 `scripts/convert.js` 使用同版本 JS 和 JSON metadata 打包生成。

### v1.0 功能

- 监听 `MESSAGE_RECEIVED(message_id, type)`。
- 当 `type` 为 `regenerate` 或 `swipe` 时，延迟 1000ms 触发数据库重填表。
- 首选调用 `AutoCardUpdaterAPI.manualUpdate()`。
- 仅当 `manualUpdate` 不存在但 `refreshDataAndWorldbook` 存在时，回退调用 `refreshDataAndWorldbook()` 并 warning 提示。
- 使用单飞并发模型，避免多个 `manualUpdate()` 并发执行。
- 运行中收到新触发时折叠为一次补跑。
- 监听 `CHAT_CHANGED` 和 `CHAT_LOADED`，跨聊天时清理 pending 状态。
- 使用 `chatToken` 防止旧聊天的异步任务在新聊天补跑。
- 重复导入脚本时先卸载旧实例，避免多重监听。
- 暴露 `window.__nlDbRefillAuto.getState()` 和 `uninstall()` 供调试使用。
- 成功默认静默，仅输出控制台 info；失败、缺 API、回退时使用低频 toast 提示。

### v1.0 不做的事

- 不修改聊天消息。
- 不调用 `setChatMessages()`。
- 不主动点击 SillyTavern 或数据库 UI。
- 不监听所有 `MESSAGE_UPDATED` 后自动填表，避免普通编辑误触发。
- 不按楼层分别调用数据库接口，因为 `manualUpdate()` 是全局重填表接口。

## 更新日志

### v1.0 - 2026-05-07

- 新增：首版酒馆助手脚本，支持底部 Regenerate 与楼层 Swipe 生成完成后自动触发数据库重新填表。
- 新增：宿主窗口解析，兼容 `parent`、`top`、`opener` 和当前 `window` 上的 `AutoCardUpdaterAPI`。
- 新增：1000ms 去抖、单飞并发队列、运行中补跑一次、跨聊天 pending 清理。
- 新增：重复加载自动卸载旧实例，避免多重监听。
- 新增：失败和回退场景低频 toast 提示。
- 约束：首版只触发 `manualUpdate()` 或必要时回退 `refreshDataAndWorldbook()`，不修改聊天内容和 UI。

## 推荐触发流程草案

```text
1. 脚本加载后解析宿主窗口，取得 TavernHelper、eventOn、tavern_events、AutoCardUpdaterAPI。
2. 监听 MESSAGE_RECEIVED，若 type 是 regenerate 或 swipe，记录 message_id 为待重填表目标。
3. 监听 MESSAGE_SWIPED 和 MESSAGE_UPDATED，把对应 message_id 标记为待确认目标。
4. 监听 GENERATION_ENDED，等待短暂延迟后读取目标楼层文本，确认文本非空且已稳定。
5. 调用 AutoCardUpdaterAPI.manualUpdate()。
6. 若 manualUpdate 不存在但 refreshDataAndWorldbook 存在，则可按设置决定是否回退调用。
7. 调用完成后清理 pending 状态；若期间又收到新触发，则排队补跑一次。
```

## 初步问题假设

- 两类重新生成都会改变最后一条或当前楼层消息文本，但数据库插件没有在这些路径后自动执行重新填表。
- 后续脚本可行方向是监听 SillyTavern 消息更新、swipe 变更或 regenerate 完成后的状态变化，再调用数据库重新填表接口。
- 如果目标是“模拟用户点重新填表”，参考仓库已证明首选接口是 `manualUpdate()`；`refreshDataAndWorldbook()` 只作为回退或刷新同步接口。
- 必须避免在生成尚未完成时提前刷新，否则会把半截回复写入表格。

## 后续制作脚本前需要确认

- 用户使用的数据库版本名称：神·数据库、SP·数据库 II，或其他分支。
- 手动重新填表按钮在用户界面上的准确文案。
- `window.AutoCardUpdaterAPI` 在用户环境中是否存在，且是否暴露 `manualUpdate()`。
- 如果 `manualUpdate()` 不存在，是否允许回退调用 `refreshDataAndWorldbook()`。
- 两类重新生成后，是否只需要重填最后一条 AI 回复，还是也要处理任意楼层的 swipe。
