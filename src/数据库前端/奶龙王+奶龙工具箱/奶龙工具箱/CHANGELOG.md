# 项目级 CHANGELOG

记录本工具箱当前工程能力；具体脚本的版本日志保留在 `projects/<脚本名>/README.md` 的“更新日志”里。

## 当前能力

- 2026-05-08：从 `sillyTavern酒馆项目架构详细说明.md` 抽取低风险内容，补充 SillyTavern 资产存储位置、Data Bank 三层概念、扩展加载流程、扩展持久化位置，以及服务端插件/前端扩展边界，并同步 assets/extension 文档。
- 2026-05-08：清洗 `STscript语言参考.txt`，补充 `data/sillytavern-stscript-api.json` 的命令分类、闭包/解析器语法、变量结构、世界书字段、Quick Reply 管理命令与副作用等级，并同步 `docs/SILLYTAVERN_STSCRIPT_API.md`。
- A~L 十二模式能力索引：JS-Slash-Runner、SillyTavern Extension、shujuku、SillyTavern 资产、MVU、Zod、前端片段、STscript、Tavern Card v3 单文件识别、API Connections。
- 结构化知识库：`data/*-api.json`、`data/*-format.json` 与对应 schema。
- 人类速查文档：`docs/*_API.md`、`docs/*_FORMAT.md`、`docs/TARGET_RUNTIME_MODES.md`。
- 格式骨架样例：`examples/` 下各模式样例。
- 格式校验：`schemas/`、`scripts/validate-examples.js`、`tests/fixtures/invalid/`、`tests/negative.test.js`。
- 生成器：`scripts/new.js` 与 `scripts/cli.js`。
- 交叉引用检查：`scripts/check-api-references.js`。
- JSON ↔ JS 转换：`scripts/convert.js`。

## 当前约束

- `examples/` 只放格式骨架，不放业务正文、真实密钥、第三方长 CSS 或真实角色卡内容。
- 新增 API/格式知识库时，同步 data、schema、docs、examples、capabilities、生成器、校验器和测试负例。
- 修改 `projects/<脚本名>/` 下脚本本体时，按 `docs/SCRIPT_VERSIONING.md` 执行本地版本发布流程。
- 每轮涉及代码或知识库结构变更后，运行：

```powershell
npm run validate
npm run check-refs
npm run test
```
