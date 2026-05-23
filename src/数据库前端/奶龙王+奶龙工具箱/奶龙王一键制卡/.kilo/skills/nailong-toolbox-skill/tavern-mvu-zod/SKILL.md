---
name: tavern-mvu-zod
description: MVU + Zod 补充 Skill。当用户需要处理 A~L 模式中的 G（MagVarUpdate / MVU 变量框架、[InitVar]、变量更新块）或 H（Zod 设计/校验 LLM 输出、配置、工具参数 schema）时触发。
---

# Tavern MVU Zod

## 定位

本 skill 将奶龙工具箱中的 MVU 与 Zod 能力合并为一个单文件生态补充模块。

它只处理奶龙王现有制卡流程之外的：

- MVU / MagVarUpdate 变量框架；
- `[InitVar]` 世界书格式；
- MVU 变量更新块；
- Zod schema 设计；
- LLM 输出结构校验；
- 工具参数 / 配置 schema 校验。

奶龙王已有的角色卡编写、表格模板、开场白、状态栏、剧情推进前端流程仍优先使用奶龙王 `prompts/` 与 `docs/`。

## 何时使用

当用户提到以下内容时使用：

- MVU；
- MagVarUpdate；
- `[InitVar]`；
- `stat_data` / `display_data`；
- 变量更新块；
- `window.Mvu`；
- Zod；
- `z.object`；
- `safeParse`；
- `discriminatedUnion`；
- schema 校验；
- LLM 输出格式校验；
- 工具参数 schema。

## 数据索引

见：

```text
data/mvu-zod-index.md
```

## 输出格式

```text
目标：MVU / Zod / MVU+Zod
对应模式：G / H
适用场景：
关键结构：
最小示例：
注意事项：
是否应回到奶龙王主流程：是 / 否
```

## MVU 使用边界

MVU 适合处理：

- 变量初始化；
- 变量更新；
- 状态数据与展示数据分离；
- 世界书中的 `[InitVar]`；
- 与酒馆助手脚本联动的变量控制。

如果只是奶龙王普通表格模板，应优先使用：

```text
prompts/6-表格模板讨论.md
docs/建表指导/
docs/变量语法/
```

## Zod 使用边界

Zod 适合处理：

- LLM 输出结构校验；
- 配置文件校验；
- 工具参数校验；
- schema 组合与安全解析。

如果只是奶龙王项目结构校验，应优先使用：

```text
tools/validate-project.js
schemas/
```

## 组合使用建议

MVU 和 Zod 可以互补：

- MVU 负责变量运行时状态；
- Zod 负责变量输入 / 输出 / 配置结构校验；
- 当 AI 生成变量更新内容时，可先用 Zod 校验结构，再交给 MVU 更新。

## 回答原则

1. 先判断用户是 MVU、Zod，还是两者结合。
2. 若属于奶龙王现有表格 / 项目校验能力，先回到奶龙王主流程。
3. 若属于单文件变量框架或 schema 设计，再给最小示例。
4. 不输出大段文档原文。
