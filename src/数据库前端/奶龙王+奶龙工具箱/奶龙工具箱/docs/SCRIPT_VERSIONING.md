# 脚本版本管理规范

适用范围：仓库 `projects/<脚本名>/` 下的所有脚本（包括 JS-Slash-Runner 脚本、SillyTavern 扩展、shujuku UI、MVU 脚本等）。

本规范是 **AI 与人类的硬约束**，每次改脚本都必须执行。具体强制语见仓库根 `AGENTS.md`。

## 1. 目录结构

每个脚本一个文件夹，内部分两层：

```
projects/<脚本名>/
├── README.md            脚本级总览 + 当前版本 + 完整更新日志（唯一 README）
├── latest/              最新版（仅一个版本，只放脚本文件）
│   ├── <脚本名> v<X>.<ext>
│   └── ...（其他与脚本同源的资源，如 .json + .js 一对）
└── archive/
    ├── v<已发布版本>/<脚本名> v<已发布版本>.<ext>
    └── ...
```

约束：

- 当前发布目录永远只放当前版本的文件，不得遗留其他版本。
- `archive/v<X>/` 必须按版本号命名，不得用 `old-1`、`backup` 等非语义名称。
- `projects/<脚本名>/README.md` 必须存在，并随每次发布更新。
- `latest/` 不维护更新日志；`latest/README.md` 不作为正式日志位置。
- 文件名中的版本号必须与所在目录名一致（v6.0 文件不能放进 v6.1 目录）。

## 2. 版本号规则

只允许三种递进方式：

| 改动性质 | 版本号变化 | 示例 |
| --- | --- | --- |
| 新增小功能、向后兼容修复 | 次版本 +0.1 | v6.0 → v6.1 |
| 仅修微小 bug、文案、样式 | 末位 +0.0.1 | v6.0 → v6.0.1 |
| 大量重构、行为不兼容、新模块 | 主版本 +1.0 | v6.0 → v7.0 |

禁止：

- 跳号（v6.0 → v6.3）。
- 重复版本号（archive 里已有 v5.2，不得再发一个 v5.2）。
- 非语义后缀（v6.0a、v6.0-rc 等不允许长期存在；如果需要预发布，请用 v6.0.1 类正式语义号）。

## 3. 修改流程（每次必走）

```text
①  读取 latest/ 当前版本号 X
②  把 latest/ 当前所有文件整体复制到 archive/v<X>/（保持文件名不变）
③  在 latest/ 中：
    - 决定新版本号 Y（按上节规则）
    - 把 latest/ 中所有版本号文件重命名为 v<Y>
    - 修改脚本本体（JSON 的 content 字段或 JS 源码）
    - 修改 JSON 的 info 字段，写明 v<Y> 新增内容
④  更新 `projects/<脚本名>/README.md`：
    - 顶部「当前版本」字段
    - 「更新日志」追加 v<Y> 一节，列出新增/修复/破坏性变更
⑤  同步：
    - 仓库根 CHANGELOG.md 写一条「YYYY-MM-DD <脚本名> v<X> → v<Y>」
⑥  本地验证：
    - npm run validate
    - npm run check-refs
    - npm run test
⑦  必要时跑往返转换：
    - npm run convert -- "projects/<脚本名>/latest/<JSON>"
    - npm run convert -- "projects/<脚本名>/latest/<JS>"
```

## 4. 反向操作（回滚）

如需回滚到已发布版本：

```text
①  把 archive/v<目标版本>/ 复制到 latest/，覆盖
②  在 `projects/<脚本名>/README.md` 顶部「当前版本」改回 v<目标版本>
③  在「更新日志」追加一条：
    v<新版本>：回滚至 v<目标版本>，理由：……
④  把刚才被覆盖的 latest/ 旧文件再复制回 archive/v<刚被覆盖的版本>/（如已存在则跳过）
```

## 5. 多文件脚本的处理

JS-Slash-Runner 脚本通常一对：`*.json` + `*.js`。

约束：

- 同一版本的 JSON 与 JS 必须放在同一个目录（`latest/` 或 `archive/v<X>/`），不得分离。
- 升级时必须同时改两份文件名与内容。
- `*.js` 的源码必须能通过 `npm run convert` 反向打包回 `*.json` 且 SHA256（LF 归一化后）一致。

## 6. 强制校验

完成本流程后，必须运行：

```powershell
npm run validate
npm run check-refs
npm run test
```

未通过则禁止把变更视为「完成」。

## 7. 与项目知识库的关系

- 写脚本前先查 `docs/TARGET_RUNTIME_MODES.md` 判定模式。
- 用对应 `data/*-api.json` 与 `docs/*_API.md` 查 API。
- 不要把脚本正文复制进 `examples/`，`examples/` 永远只放格式骨架。

## 8. 与工程记录的关系

| 路径 | 用途 |
| --- | --- |
| `projects/<脚本名>/README.md` | 脚本本体的更新日志（用户视角） |
| `CHANGELOG.md` | 仓库工程化变更（贡献者视角） |

脚本本体更新时必须维护脚本级 README；工具链或知识库结构更新时维护 CHANGELOG。
