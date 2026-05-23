---
name: tavern-asset-validator
description: 单文件资产规范检查建议 Skill。当用户需要检查奶龙王现有校验器未覆盖的单文件生态资产，如 JS-Slash-Runner、SillyTavern Extension、Quick Reply、Worldbook、Regex、Preset、Theme、前端片段、STscript、Tavern Card v3、API Connections、shujuku、MVU、Zod 等是否混用格式或入口对象时触发。
---

# Tavern Asset Validator

## 定位

本 skill 只补充单文件生态资产检查建议。

奶龙王已有校验仍由以下内容负责：

- `tools/validate-project.js`
- `tests/run.js`
- `schemas/`
- `projects/<卡名>/` 结构规则

本 skill 不替代上述校验器。

## 何时使用

当用户需要检查：

- JS-Slash-Runner 脚本是否误用原生扩展 API；
- SillyTavern Extension manifest / index / style 是否结构合理；
- Quick Reply、Worldbook、Regex、Preset、Theme 是否字段混乱；
- 世界书单条目是否正确映射到 ST JSON；
- 前端片段是否 scoped、是否有 HTML 注入风险；
- STscript / Slash Commands 是否有副作用；
- Tavern Card v3 单文件是否只是识别审查还是应回到整卡流程；
- API Connections 是否包含密钥或后端兼容风险；
- shujuku 模板、剧情预设、API 预设是否字段混乱；
- MVU `[InitVar]` 或更新块是否格式合理；
- Zod schema 是否适合作为校验结构；
- 某个 JSON / HTML / JS / STscript 片段是否属于正确运行环境。

## 规则索引

见：

```text
rules.md
schemas/schema-index.md
```

## 输出格式

```text
检查对象：
目标生态：
应使用入口对象 / 文件形态：
通过项：
问题项：
修复建议：
风险等级：低 / 中 / 高
是否应回到奶龙王主流程：是 / 否
```

## 检查重点

1. 生态边界是否正确。
2. 入口对象是否匹配。
3. 文件形态是否匹配。
4. 是否把单文件生态对象写进奶龙王整卡流程文件。
5. Regex 是否存在灾难性回溯或不安全 HTML 替换。
6. 前端片段是否 scoped，是否需要 DOMPurify。
7. Preset 是否与目标后端兼容。
8. API Connections 是否含真实密钥或私有连接信息。
9. 是否该由奶龙王现有校验器处理，而不是由本 skill 处理。

## 与奶龙王校验器的关系

- 项目结构、根目录 JSON、`projects/<卡名>/` 是否完整：交给奶龙王校验器。
- 单文件生态格式、API 入口对象、跨生态混用：由本 skill 给检查建议。
- 解包、回包、构建、发布：回到奶龙王主流程。
