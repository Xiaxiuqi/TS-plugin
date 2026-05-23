# SillyTavern Regex API / 格式速查

对应机器可检索数据库：`data/sillytavern-regex-api.json`

Regex 是 SillyTavern 内置扩展，用于查找、替换、删除或包装文本。它可作用于用户输入、AI 输出、Slash Commands、World Info 等来源。

## 1. 核心字段

| 字段 | 说明 |
| --- | --- |
| `id` | 脚本唯一标识 |
| `scriptName` | 脚本名/显示名 |
| `findRegex` | 查找表达式，常见格式 `/pattern/flags` |
| `replaceString` | 替换文本，可含 `$1`、`{{match}}` 或短 HTML |
| `trimStrings` | 替换前裁剪内容 |
| `placement` | 作用来源/位置枚举数组，保留导出原值 |
| `disabled` | 禁用 |
| `markdownOnly` | 仅显示/Markdown 路径相关开关 |
| `promptOnly` | 仅发给模型路径相关开关 |
| `runOnEdit` | 编辑消息后重新运行 |
| `substituteRegex` | `findRegex` 中宏替换策略 |
| `minDepth` / `maxDepth` | 聊天深度限制 |

示例：`examples/sillytavern-assets/regex-format.json`

## 2. 作用域与回包边界

| 类型 | 保存位置 | 影响范围 |
| --- | --- | --- |
| Global Regex | 用户设置 | 多角色/全局 |
| Scoped Regex | 角色卡或角色相关数据 | 当前角色 |

奶龙工具箱可以审查单个 Regex JSON、生成骨架、优化单条表达式；不会自动把 Regex 回包到角色卡 `regex_scripts`。需要角色卡解包/回包时，应切换到奶龙王一键制卡流程。

## 3. 安全写法

推荐：

```json
{
  "findRegex": "/<note>[\\s\\S]*?<\\/note>/gi",
  "replaceString": ""
}
```

避免：

```text
/(.*)+/
/(.+)+/
/(.*)(.*)(.*)/
```

原因：嵌套贪婪分组容易在长消息上产生灾难性回溯。

## 4. HTML replaceString

`replaceString` 可短暂包装 HTML，例如：

```html
<span class="nl-regex-chip">$1</span>
```

注意：

- 不写 `<script>`。
- 不写 `onclick` / `onerror` 等事件属性。
- 来自捕获组的内容可能包含用户/模型文本，插入真实 DOM 前应考虑 DOMPurify。
- 复杂交互应转为前端片段、原生扩展或 JS-Slash-Runner 脚本。

## 5. 调试清单

- `placement` 是否覆盖目标来源？
- `promptOnly` / `markdownOnly` 是否导致显示与模型上下文不一致？
- `runOnEdit` 是否会重复改写旧消息？
- 正则是否有边界、是否在长文本上安全？
