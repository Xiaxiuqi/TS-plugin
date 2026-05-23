# MVU Zod Index

来源：奶龙工具箱 MVU 与 Zod 资料的合并索引。

## 模块

| ID | 模式 | 名称 | 入口 | 源文件 | 用途 |
| --- | --- | --- | --- | --- | --- |
| `mvu` | G | MVU / MagVarUpdate | `window.Mvu + window.TavernHelper` | `data/mvu-api.json`；`docs/MVU_API.md`；`examples/mvu/initvar-format.json`；`examples/mvu/mvu-script.json`；`examples/mvu/update-block-format.txt`；`schemas/mvu-initvar.schema.json` | 变量初始化、变量更新、状态数据与展示数据分离、世界书变量块、酒馆助手脚本联动变量控制 |
| `zod` | H | Zod runtime schema | `z` | `data/zod-api.json`；`docs/ZOD_API.md`；`examples/zod/zod-schema-snippets.js` | LLM 输出校验、配置结构校验、工具参数校验、运行时安全解析 |

## 组合使用

- 用 Zod 校验 AI 生成的变量更新结构，再交给 MVU 更新变量。
- 用 Zod 约束配置格式，用 MVU 承担运行时变量状态。
- MVU 管运行时状态，Zod 管输入输出结构边界。

## 奶龙王优先场景

- 普通表格模板设计。
- 奶龙王项目结构校验。
- 开场白 / 状态栏 / 剧情推进组件流程。
- 整卡解包 / 回包 / 构建 / 发布。
