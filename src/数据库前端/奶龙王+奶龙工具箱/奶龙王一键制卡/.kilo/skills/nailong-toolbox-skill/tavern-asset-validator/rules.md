# Asset Validator Rules

| ID | 名称 | 说明 |
| --- | --- | --- |
| `runtime-entry-match` | 运行环境入口对象匹配 | A/B 使用 `window.TavernHelper`；C 使用 `SillyTavern.getContext()`；D 使用 `window.AutoCardUpdaterAPI`；G 使用 `window.Mvu + window.TavernHelper`；H 使用 `z`；I 是 HTML/CSS snippet；J 是 slash commands；K 是 `spec: chara_card_v3`；L 是 API Connections。 |
| `single-file-vs-card-project` | 单文件与整卡流程边界 | 单个脚本、Regex、Preset、Theme、Quick Reply、世界书单条目、前端片段、STscript、Tavern Card v3 识别审查走工具箱；解包、回包、构建、发布、批量整卡修改走奶龙王。 |
| `nailongwang-first` | 奶龙王主流程优先 | 写卡、修改整张卡、项目结构、批量世界书、整卡风格、发布准备优先回到奶龙王 prompts/docs/examples/tools。 |
| `external-examples-only-skeleton` | 外部样例只作格式骨架 | 从奶龙工具箱抽取的 examples 只作为格式参考，不作为真实角色卡正文、长 prompt 或第三方主题 CSS 来源。 |
| `no-cross-ecosystem-api` | 避免跨生态 API 混用 | 不要把 shujuku API 写进 SillyTavern Extension，不要把 JS-Slash-Runner API 当作普通浏览器 API，不要把 MVU 格式写成普通世界书字段。 |
| `regex-safety` | Regex 安全检查 | 检查 `findRegex` 是否有灾难性回溯风险；`replaceString` HTML 是否包含脚本、事件属性或未清理捕获组。 |
| `frontend-snippet-safety` | 前端片段安全检查 | 前端片段必须 scoped CSS，避免全局选择器；插入真实 DOM 前考虑 DOMPurify；禁止 script/iframe/onerror/onclick。 |
| `preset-backend-compatibility` | 预设与后端兼容 | 检查 prompts、prompt_order、role、depth、stop strings、streaming、Function Calling 是否适配目标后端。 |
| `api-connections-secrets` | API Connections 不写密钥 | API Connections 示例和审查结论不得写入真实 API key、cookie、token、私有 endpoint 或敏感 header。 |
| `validator-boundary` | 校验边界 | 奶龙王项目结构和 JSON 可解析性由 `tools/validate-project.js` 处理；本 skill 只补单文件生态格式和入口对象检查建议。 |
