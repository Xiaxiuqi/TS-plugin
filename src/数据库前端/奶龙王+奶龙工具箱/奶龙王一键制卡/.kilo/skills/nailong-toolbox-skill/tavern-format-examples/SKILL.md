---
name: tavern-format-examples
description: 单文件格式样例 Skill。当用户需要奶龙王 examples 未覆盖的单文件资产格式骨架，如 JS-Slash-Runner、SillyTavern Extension、Quick Reply、Worldbook Entry、Regex、Preset、Theme、前端片段、STscript、shujuku、MVU、Zod 等时触发。
---

# Tavern Format Examples

## 定位

本 skill 只提供**单文件格式骨架参考**。

奶龙王已有 examples 优先级更高：

- `examples/full-card/轮回禁则/`
- `examples/table-template/`
- `examples/regex/`
- `examples/markdown-first-demo/`

如果用户需求可以由奶龙王 examples 覆盖，优先使用奶龙王 examples。

## 何时使用

当用户需要：

- JS-Slash-Runner 脚本 JSON 或纯 JS 骨架；
- SillyTavern 原生扩展结构；
- Quick Reply / Worldbook / Worldbook Entry / Regex / Completion Preset / Theme 格式；
- 前端片段 / 状态栏 HTML / Regex replaceString HTML / scoped CSS；
- STscript / Slash Commands / Quick Reply 命令；
- shujuku 模板 / 剧情预设 / API 预设 / UI 主题；
- MVU `[InitVar]` 或 MVU 脚本格式；
- Zod schema 片段；
- 奶龙王当前 examples 没有覆盖的单文件资产骨架。

## 样例索引

见：

```text
examples/examples-index.md
```

## 输出格式

```text
目标格式：
优先使用奶龙王 examples：是 / 否
外部参考样例：
必要字段：
最小骨架：
注意事项：
```

## 使用原则

1. examples 只作为格式骨架，不作为业务正文来源。
2. 如果奶龙王已有对应范例，不重复给外部样例。
3. 如果是单文件生态格式，只给最小骨架和字段说明。
4. 不把具体工具箱项目正文迁入真实卡项目。
5. 需要解包、回包、构建或批量整卡修改时，回到奶龙王主流程。
