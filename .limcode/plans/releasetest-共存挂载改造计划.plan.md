## TODO LIST

<!-- LIMCODE_TODO_LIST_START -->
- [x] 对比 releasetest 正式入口与共存候选的差异，识别仅属于挂载策略的变更点  `#releasetest-coexist-1`
- [x] 设计并确认 releasetest 的仅共存挂载流程，冻结所有模块匹配模式不变  `#releasetest-coexist-2`
- [x] 实现 releasetest 的共存挂载改造，删除 script/native/off 切换并保留 after-native 插入  `#releasetest-coexist-3`
- [x] 回归 BP、story-engine、world-log 等关键模块并完成语法/行为验证  `#releasetest-coexist-4`
<!-- LIMCODE_TODO_LIST_END -->

# 目标

将 `public/story_regex_ui_releasetest/index.js` 调整为**仅共存模式**的挂载方案。

核心要求：

- **不修改正式版文件**。
- **不修改任何模块的匹配表达式**。
- **不保留 script / native / off 模式切换**。
- **只保留 after-native / 共存增强挂载路径**。
- **锚点定位沿用 releasetest 现有模块匹配方式**，在此基础上于原生渲染后的可见 DOM 中完成插入，不回写消息正文。

# 共存模式定义

共存模式的工作方式固定为：

1. 酒馆原生正则先完成显示层渲染。
2. 脚本读取已经渲染出来的 displayed DOM。
3. 仍按 releasetest 现有模块匹配方式识别目标模块。
4. 再根据匹配到的模块，在原生可见节点中寻找对应锚点。
5. 在锚点后插入 after-native 增强节点。
6. 保持原生结果不被覆盖，脚本增强与原生显示同时存在。

# 范围

## 仅允许调整
- releasetest 的挂载调度。
- 原生渲染后的锚点查找逻辑。
- after-native 增强节点的插入和清理。
- 诊断状态与管理面板中与共存挂载相关的展示。

## 明确不改
- `public/story_regex_ui_releasetest/modules/**` 下任意模块的 `block.open / block.close`。
- 任意模块的正文解析规则、正则表达式、渲染逻辑。
- 正式版目录与其他环境目录的任何文件。
- script/native/off 模式切换逻辑。

# 设计原则

1. **只保留共存路径**：releasetest 只实现 after-native 挂载，不保留调试模式。
2. **原生优先**：先让酒馆原生正则完成渲染，再做脚本增强。
3. **不写回正文**：所有增强只作用于 displayed DOM。
4. **锚点驱动**：锚点查找使用 releasetest 既有模块匹配结果，再结合原生可见 DOM 定位挂载位置。
5. **最小侵入**：只动挂载层，不动模块匹配层。

# 实施步骤

## 1. 梳理现状
- 对比 `public/story_regex_ui_releasetest/index.js` 与 `index.after-native-candidate.js`。
- 找出所有属于“调试模式切换”的代码并排除。
- 保留共存挂载真正需要的部分：模块匹配、锚点查找、after-native 宿主插入、清理、诊断。

## 2. 冻结模块匹配规则
- 确认 BP、story-engine、world-log 等模块的匹配表达式完全不动。
- 保留现有模块输出结构，避免与酒馆原生显示发生二次冲突。
- 仅在渲染时使用模块匹配结果，不改匹配本身。

## 3. 只保留 after-native 挂载路径
- 删除 `script / native / off` 的显示模式切换。
- 删除与模式切换相关的 UI、状态存储和诊断字段。
- 保留 after-native 插入宿主、锚点寻找和挂载清理逻辑。

## 4. 调整挂载时序
- 让扫描只面向已渲染的 displayed DOM。
- 先读取原生显示结果，再通过既有模块匹配方式识别模块，再定位锚点。
- 在锚点后插入增强节点，避免覆盖原生美化内容。

## 5. 处理清理与重扫
- 重新扫描时只清理对应消息的共存挂载节点。
- 不误删酒馆原生渲染层。
- 确保消息更新、swipe、加载更多、聊天切换时能稳定重挂载。

## 6. 回归验证
- 重点验证 BP 战力雷达共存挂载。
- 验证 story-engine、world-log 的模块匹配与锚点定位。
- 确认原生美化存在时，脚本增强仍可保留且不互斥。

# 风险

- 锚点文本如果变化，可能导致 after-native 定位失败。
- 如果清理边界不清晰，可能误删原生节点。
- 如果扫描仍混入旧调试逻辑，可能再次引入互斥问题。

# 交付结果

- releasetest 入口仅保留共存挂载。
- 所有模块匹配规则保持原样。
- 不再存在 script/native/off 调试切换。
- BP、story-engine、world-log 在原生显示基础上可正常 after-native 增强。
