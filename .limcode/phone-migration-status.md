# Phone 插件深度源码复原与正确迁移状态文档

> 本文档用于记录 `src/phone` 深度迁移的当前进度、已完成事项、未完成事项、风险与后续执行准则。后续每完成一轮迁移、验证或修复，都必须同步更新本文档。

## 维护规则

1. 每次继续迁移后，必须更新本文档中的：
   - 最近更新时间
   - 当前阶段
   - 本轮新增完成事项
   - 待完成事项状态
   - 验证结果
   - 新增风险或已解除风险
2. 除非用户明确确认，否则不得直接覆盖 `src/phone/index.js` 作为生产入口。
3. 所有深度迁移必须保持：
   - 安全可回滚
   - 不破坏旧入口
   - 不删除 `src/phone/source/**`
   - 每轮修改后运行校验
4. 每次涉及 TODO 状态变化时，还需要同步计划 TODO / 进度记录。

## 最近更新时间

- 2026-05-21 22:20

## 当前总体阶段

- 阶段：深度实现迁移中
- 当前主线 TODO：`p5-service-modules`
- 状态：in_progress
- 当前目标：继续深度还原核心业务模块，重点包括 AI 服务、楼层模块读写、缓存/历史解析、媒体资源库、图片上传、图片生成、设置持久化。

## 当前安全边界

已确认并继续遵守：

- 未覆盖 `src/phone/index.js`
- 未切换生产入口
- 未删除 `src/phone/source/**`
- 新入口仍通过 `TAVERN_HELPER_BUILD_ENTRY='src/phone/index.ts'` 并行构建验证
- 旧入口仍可作为回滚来源

## 已完成事项

### 1. 资产清单与目录规划

- 已确认恢复范围：Vue 文件、缺失普通 TS/JS 模块、webpack 模块依赖图、入口启动链路。
- 已规划目标目录结构：
  - app
  - core
  - services
  - stores
  - composables
  - utils
  - types
  - styles
  - legacy-shims

对应 TODO：

- `p1-inventory` completed
- `p2-target-structure` completed

### 2. 新入口启动层迁移

已还原/建立：

- `src/phone/index.ts`
- `src/phone/core/bootstrap.ts`
- `src/phone/core/mountPhoneApp.ts`
- `src/phone/core/injectLauncher.ts`
- `src/phone/core/lifecycle.ts`
- `src/phone/core/tavernApi.ts`
- Shadow DOM / iframe 宿主挂载相关逻辑
- 按钮注入、事件监听、卸载清理基础链路

对应 TODO：

- `p3-entry-bootstrap` completed

### 3. 基础支撑模块迁移

已恢复/补齐：

- `src/phone/store.ts`
- `src/phone/debug.ts`
- `src/phone/shadowHost.ts`
- `src/phone/abortController.ts`
- `src/phone/dateTimeVariables.ts`
- Settings 相关 composables：
  - `useDisplaySettings.ts`
  - `useChatCss.ts`
  - `useHomeCss.ts`
  - `useMessageModal.ts`
  - `useApiConfig.ts` 当前仍需深度完善

对应 TODO：

- `p4-store-debug-shadow` completed

### 4. Vue import 路径重连

已批量修正 Vue 源码 import 路径，将 webpack 编号模块替换为已命名源码模块或临时 adapter。

对应 TODO：

- `p6-vue-import-rewire` completed

### 5. 构建接入

已补齐：

- `src/phone/index.ts` 新入口
- `src/phone/tsconfig.migration.json`
- webpack entry override 验证方式
- 必要全局类型声明
- lint ignore 策略

已通过多轮验证：

```powershell
pnpm typecheck:phone
pnpm lint:phone --quiet
$env:TAVERN_HELPER_BUILD_ENTRY='src/phone/index.ts'; pnpm build:dev -- --env entry=src/phone/index.ts
```

对应 TODO：

- `p7-build-config` completed

### 6. Settings / Home / 数据模块兼容导出补齐

已补齐：

- `src/phone/apps/Settings/types.ts`
  - `IconCategoryKey`
  - `iconCategories`
  - `standardPageNames`
  - 多个 Settings 页面依赖类型
- `src/phone/apps/Home/types.ts`
  - `HomeWidgetId`
  - `HomeWidgetItemId`
  - `HomeGridItemId`
  - `HOME_WIDGET_ITEM_ID_BY_WIDGET`
  - `HOME_ITEM_META`
- `src/phone/数据/index.ts`
  - 角色、头像、贴纸、动态、聊天、窥屏、新好友、一起听等当前页面依赖导出
- `src/phone/数据/chatGallery.ts`
  - 聊天图库读取、保存、添加、兼容别名

### 7. AI 服务深度迁移第一阶段

`src/phone/预设/aiService.ts` 已从纯 `notMigrated adapter` 升级为基于 Tavern Helper `generate(...)` 的真实调用层。

已完成：

- `callAiWithPreset(...)`
  - 使用全局 `generate`
  - 支持 `custom_api`
  - 支持独立 `generation_id`
  - 接入 abort controller
  - 返回统一 `AiResult`
- `loadApiConfigForView(...)`
  - 支持 `url` / `apiurl` / `apiUrl` / `baseUrl`
  - 支持 `key` / `model` / `source`
  - 支持 `proxyPreset` / `proxy_preset`
- `parseJsonFromResponse<T>()`
  - 支持裸 JSON、fenced JSON、混合文本中截取对象/数组
- `parseYamlFromResponse<T>()`
  - 优先 JSON，再尝试 YAML
- `fetchStructuredData(...)`
  - 统一调用、解析、错误返回
- 已补齐当前页面使用的业务包装函数：
  - 私聊 / 群聊
  - 动态 / 动态主页 / 动态回复 / 用户发动态
  - 论坛 / 帖子 / 评论 / 用户发帖
  - 邮件 / 发邮件
  - 浏览器
  - 日历
  - 日记
  - 直播 / 直播列表
  - 地图
  - 音乐
  - 商城 / 商品 / 卖家 / 搜索
  - 语音通话
  - 一起听

仍需后续深化：

- 针对每个业务模块恢复更精确的 prompt 模板。
- 针对每个业务模块校验返回 schema。
- API 配置 UI 与 `loadApiConfigForView()` 字段仍需完全对齐。

### 8. Store 楼层模块读写深度迁移第一阶段

`src/phone/store.ts` 楼层模块读写已从简单追加 adapter 升级为兼容实现。

已支持：

- 从消息正文 `<phone_module ...>...</phone_module>` 读取。
- 从 `message.data.phoneModules[type]` 读取。
- 兼容旧格式：直接保存业务数据。
- 兼容新格式：
  - `__phoneModuleType`
  - `__phoneModuleCharacter`
  - `__phoneModuleUpdatedAt`
  - `data`
- 支持按角色/人物过滤：
  - `dynamicHome + characterName`
  - `live + streamerName`
- `saveToTavernMessage(...)`：
  - 写入文本块
  - 写入结构化 data
  - 返回 `messageId | null`
- `updateModuleInMessage(...)`：
  - 倒序查找已有模块
  - 原楼层更新
  - 同步正文与 `message.data.phoneModules`
  - 返回 boolean 供调用方 fallback
- `saveCharacterModuleToMessage(...)` / `updateCharacterModuleInMessage(...)`：
  - 已按人物名保存/更新

仍需后续深化：

- 针对 Shopping / Forum / Dynamic / Live 的历史精确匹配继续增强。
- 校验旧 bundle 的楼层标签格式是否还有其他变体。
- 补充失败时的降级策略与用户提示。

### 9. 图片生成/上传链路深度迁移第一阶段

`src/phone/imageGen/novelai.ts`、`src/phone/imageGen/novelAiConfig.ts`、`src/phone/services/upload/sillyTavernUpload.ts` 已从纯占位 adapter 升级为可执行的真实链路第一阶段。

已支持：

- `loadNovelAiConfig()` 返回标准化配置，兼容 legacy 顶层字段与 provider 嵌套字段。
- 支持绘图 provider：
  - `pollinations`：默认免 key 远程生图回退。
  - `openai`：OpenAI-compatible `/v1/images/generations`。
  - `gemini`：通用 POST endpoint 适配。
  - `novelai`：NovelAI generate-image endpoint 基础适配。
- `buildPromptRequestByMode(...)` 已返回页面期望的 `{ promptText, referenceImages }`。
- `queueNovelAiImageGeneration(prompt, options)` 已修正为兼容页面实际双参数调用，并保持串行队列。
- `generateNovelAiImage(...)` 已返回页面期望的 `{ success, dataUrl, imageUrl, error }`。
- `uploadImageDataUrlToSillyTavern(dataUrl, { characterName })` 已兼容页面实际 options 调用：
  - 尝试 `/api/images/upload`。
  - 失败后尝试 `/api/files/upload`。
  - 上传失败时安全回退为原始 data URL，避免阻断聊天/动态/直播图片写回。

仍需后续深化：

- 对照旧 bundle 确认 NovelAI 请求参数、zip/二进制响应格式、负面提示词、参考图格式。
- 与绘图配置 UI 完全对齐字段。
- 在酒馆内真实验证各 provider。

## 当前仍未完成事项

### P5：核心业务模块深度还原

状态：in_progress

尚未完成子项：

1. 图片生成链路
   - `src/phone/imageGen/novelai.ts`
   - `src/phone/imageGen/novelAiConfig.ts`
   - `src/phone/imageGen/tavernImageUpload.ts`
   - 已完成真实链路第一阶段，但仍需对照旧 bundle 精细化 NovelAI 参数、参考图、二进制响应与 UI 配置字段。

2. 设置持久化与 API 配置页面
   - `src/phone/apps/Settings/composables/useApiConfig.ts`
   - `src/phone/apps/Settings/components/views/ApiSettings.vue`
   - 需要确保 UI、localStorage schema、`aiService.loadApiConfigForView()` 字段完全一致。

3. 历史读取精准化
   - Shopping 商品/卖家/订单历史匹配
   - Forum 帖子详情缓存与历史读取：已完成第一阶段（forum 列表历史读取/AI 回退、forumPost 标题/作者评分匹配、评论优先更新原帖子楼层）；仍需酒馆实测旧数据兼容
   - Dynamic 动态、评论、配图更新：已完成第一阶段（历史去重 key、评论/配图更新后优先更新原 dynamic 楼层并刷新历史视图）；仍需动态主页与酒馆真实历史回归验证
   - Live 直播间/直播列表历史：已完成第一阶段（liveList 历史读取/AI 回退、live 直播间 streamer/title 评分匹配、封面/画面/AI 回复优先更新原楼层）；仍需酒馆真实历史回归验证
   - 媒体资源库：已完成第一阶段（头像/背景/角色图/直播图/贴纸/聊天图库/音乐库统一读取 helper，聊天图库同步 chat variables/localStorage/phone_data，Settings 音乐库恢复可操作列表并写回 Music/ListenTogether 共享 store）；仍需 AvatarLibrary 完整交互页与酒馆真实资源回归验证

4. 媒体资源库
   - 音乐库
   - 头像库
   - 图片库
   - 聊天图库
   - 贴纸/角色图查找策略

5. 真实业务 schema 适配
   - 每个 AI fetch 函数目前已有统一生成层，但 prompt/schema 仍需按旧功能细化。

### P8：兼容验证

状态：pending

需要建立验证清单并逐项确认：

- 新入口启动
- UI 打开/关闭/按钮注入
- Settings 各子页面
- Chat 私聊/群聊/通话/窥屏
- Dynamic 动态流/动态主页/评论/发动态/配图
- Forum 列表/帖子/评论/发帖
- Shopping 主页/商品/卖家/搜索/订单
- Live 直播列表/直播间
- Calendar 保存和历史更新
- Diary 生成与查看
- Email 收发
- Browser 搜索
- AI 生成与取消
- 楼层模块新增/更新/读取
- 旧入口回滚

### P9：渐进切换

状态：pending

尚未执行：

- 并行输出迁移产物
- 对比旧 bundle 与新源码构建产物
- 灰度替换 `src/phone/index.js`
- 制定并验证回滚方案

### P10：文档与清理

状态：pending

尚未完成：

- 模块映射表
- 迁移说明
- legacy adapter 清单
- 已确认真实模块清单
- 临时抽取脚本清理
- 无效诊断清理

注意：本文档本身是 P10 的前置工作，但 P10 不能因此直接标记完成。

## 当前已知诊断/风险

### 1. IDE 动态诊断可能与迁移 tsconfig 不一致

当前动态上下文显示：

- `src/phone/types/global.d.ts` 找不到 `../core/lifecycle`
- `src/phone/apps/Settings/components/views/WorldbookManager.vue` 找不到 `props`
- 根 `tsconfig.json` 出现 TS6/rootDir/baseUrl 相关提示

但最近命令行验证已通过：

```powershell
pnpm typecheck:phone
pnpm lint:phone --quiet
```

后续仍需清理 IDE 层诊断来源，但不能在未确认影响范围前大改根 tsconfig。

### 2. 占位页面仍存在

部分 Settings 子页面仍是迁移占位模板，样式保留但交互模板未完全恢复。

需要继续逐个从 `source` 或旧 bundle 恢复真实模板与逻辑。

### 3. AI 真实调用已接入但 schema 仍需细化

当前 AI 服务已能调用 `generate`，但各业务模块 prompt 仍偏通用。

后续必须按旧功能逐个恢复精确 prompt、返回字段约束、错误提示。

### 4. 尚未切换生产入口

这是刻意保留的安全边界。后续只有在 P8 兼容验证完成后，才进入 P9 渐进切换。

## 最近一次通过的验证

最近确认通过：

```powershell
pnpm typecheck:phone
pnpm lint:phone --quiet
$env:TAVERN_HELPER_BUILD_ENTRY='src/phone/index.ts'; pnpm build:dev -- --env entry=src/phone/index.ts
```

构建结论：

- webpack compiled successfully
- 无阻断性 typecheck 错误
- 无阻断性 lint 错误

## 后续执行顺序建议

1. 继续对齐绘图/API 配置 UI 与 `aiService`、`imageGen` 配置 schema。
2. 再增强各业务历史匹配。
3. 再细化 NovelAI/OpenAI/Gemini 各 provider 的真实酒馆内验证。
4. 然后建立 P8 兼容验证清单并逐项执行。
5. P8 通过后才进入 P9 渐进切换。
6. 每轮结束必须更新本文档。

## 更新日志

### 2026-05-22 · 下一阶段基线与 Forum 历史读取第一阶段

- 按 `.limcode/plans/phone-下一阶段深度迁移细致计划.plan.md` 开始安全迁移。
- 完成下一阶段基线验证：`pnpm typecheck:phone`、`pnpm lint:phone --quiet`、`$env:TAVERN_HELPER_BUILD_ENTRY='src/phone/index.ts'; pnpm build:dev -- --env entry=src/phone/index.ts` 均通过。
- 保持安全边界：未覆盖 `src/phone/index.js`，未切换生产入口，未删除 `src/phone/source/**`。
- `src/phone/store.ts` 新增 Forum 历史读取第一阶段：forum 列表优先读历史，缺失时调用 AI 并写入 `forum` 楼层。
- `forumPost` 帖子详情从历史读取由空 adapter 升级为标题/作者评分匹配，并按最新 messageId 排序。
- `ForumPost.vue` 评论写回改为优先更新原 `forumPost` 楼层，避免同一帖子评论生成多条历史记录；更新失败时仍安全新增楼层。
- `src/phone/apps/Dynamic/index.vue` 新增动态 post key：优先 `id/postId`，否则使用 author/content/time，历史读取按最新楼层优先并跳过当前动态与重复历史动态。
- Dynamic 评论写回改为使用最新 `dynamicState.data` 更新原 `dynamic` 楼层，失败时安全新增楼层，并在写回后刷新历史动态视图。
- Dynamic 配图生成完成后同步刷新响应式数据，优先更新原 `dynamic` 楼层，失败时安全新增楼层。
- Forum/Dynamic 本轮修改后再次通过：
  - `pnpm typecheck:phone`
  - `pnpm lint:phone --quiet`
  - `$env:TAVERN_HELPER_BUILD_ENTRY='src/phone/index.ts'; pnpm build:dev -- --env entry=src/phone/index.ts`
- Live 历史读取第一阶段：
  - `src/phone/store.ts` 新增 liveList 历史读取/AI 回退，非强制刷新时优先读取最新 `liveList` 楼层。
  - 新增 live 直播间 streamer/title 历史评分匹配与 `loadLiveRoomFromHistoryAsync()`。
  - 新增 `updateLiveRoomInHistory()`，直播间 AI 回复、画面更新优先更新原 `live` 楼层，失败时安全新增楼层。
  - `LiveList.vue` 封面生成后优先更新原 `liveList` 楼层，失败时安全新增楼层。
  - 已通过 typecheck/lint/build。

- 媒体资源库第一阶段：
  - `src/phone/数据/index.ts` 补齐统一资源读取 helper：头像大小写/别名匹配、背景库、音乐库、角色图/直播图字段兼容、贴纸字段兼容。
  - `src/phone/数据/chatGallery.ts` 从单一 localStorage 升级为 chat variables + `phone_data.chatGallery/imageLibrary` + localStorage 合并读取，并在保存时同步三处；`addToChatGallery()` 恢复 `{status}` 返回值，避免调用方误判。
  - `src/phone/store.ts` 恢复 `initMusicData()` 真实初始化，并让 `musicAddSong()` 去重、置顶、写回 `phone_data.music`。
  - `src/phone/apps/Chat/ChatDetail.vue` 与 `GroupChatDetail.vue` 改为复用统一聊天图库 helper，避免私聊/群聊与动态图库来源不一致。
  - `src/phone/apps/Settings/components/views/MusicLibrary.vue` 从占位恢复为可查看、排序、删除、搜索添加、URL 添加的音乐库页面，并与 Settings 保存逻辑和 Music/ListenTogether store 对齐。
  - 已通过 typecheck/lint/build。

- AvatarLibrary 第一阶段恢复：
  - `src/phone/apps/Settings/components/views/AvatarLibrary.vue` 从占位恢复为可查看头像/背景、预览图片、单项删除、单项添加入口、批量导入头像/背景的资源库页面。
  - `src/phone/apps/Settings/index.vue` 中头像/背景新增、删除、批量导入现在会去重并立即 `saveEditableData()`，减少 Settings 资源页与运行时数据不一致风险。
  - 已通过 typecheck/lint/build。

- StickerLibrary 第一阶段恢复：
  - `src/phone/数据/index.ts` 新增 `getStickerLibrary()` / `saveStickerLibrary()`，合并读取 `phone_data.stickers/stickerLibrary/emojiLibrary/emojis`、角色变量 `phone_sticker_library/phone_stickers` 与全局表情变量，并统一字段为 `name/url`。
  - `src/phone/apps/Settings/StickerLibrary.vue` 从占位恢复为可查看、预览、添加、编辑、删除、保存的表情包库页面；保存会同步 `phone_data` 与角色变量，聊天 sticker 解析可复用同一套数据。
  - 已通过 typecheck/lint/build。

- CharacterImageLibrary 数据层对齐：
  - `src/phone/数据/index.ts` 强化 `getCharacterImageLibrary()` / `saveCharacterImageLibrary()`：通用图库只返回未绑定角色的公共图片，角色图库合并读取角色字段、角色 images/imageLibrary/characterImages 以及带 `characterName/owner` 的全局图库项。
  - `getCharacterImageUrlByName()` 现在可从公共图库、角色图库、别名/id/title/characterName 中解析图片，支持聊天图片消息、动态配图、直播图 fallback 共享同一查找策略。
  - 保存公共图库时保留已绑定角色的全局条目，避免编辑通用图库误删角色专属图片；角色图库保存支持 name/nickname/id 的规范化匹配。
  - 已通过 typecheck/lint/build。

- CharacterImageLibrary UI 收尾与媒体库一致性确认：
  - `src/phone/apps/Settings/CharacterImageLibrary.vue` 补齐批量导入入口，支持每行 `名称,URL` 或直接 URL，导入时过滤当前图库重复 URL 并自动写回当前通用/角色图库。
  - 角色图片库网格页新增同步提示，明确通用图库写回 phone_data 公共图库，角色图库写回角色 images，并共同参与聊天图片、动态配图、直播图 fallback 解析。
  - 媒体资源库一致性已确认：MusicLibrary、AvatarLibrary、StickerLibrary、CharacterImageLibrary 均已走统一 helper/Settings 保存策略或已有可操作页面；聊天图库通过 `chatGallery.ts` 继续保持独立 helper。
  - `next-5-media-library` 可视为当前阶段完成，后续可转入 `next-6-ai-schema` 或 `next-8-settings-placeholders`。
  - 已通过 typecheck/lint/build。

- next-6-ai-schema 启动：Shopping schema 第一阶段：
  - `src/phone/预设/aiService.ts` 新增 Shopping 系列 schema spec，覆盖 `shopHome`、`shopProduct`、`shopSeller`、`shopSearch` 的期望结构、必填路径、生成规则与 fallback。
  - `buildPrompt()` 现在会按 view 注入 schema 说明，要求 AI 只输出单个可解析 JSON/YAML 对象，减少 Markdown/解释文本污染。
  - `fetchStructuredData()` 增加结构归一化：Shopping 首页补齐 `shopHome/usedHome/categoryPanel`，商品详情确保 `bizType/title/sellerName/price/kind/iconName/description`，卖家页确保 `sellerType/name/intro/sourceTitle/sourceKind`，搜索页确保四个 tabs 均存在。
  - 已通过 typecheck/lint/build。

- next-6-ai-schema：Forum schema 第一阶段：
  - `src/phone/预设/aiService.ts` 新增 Forum 系列 schema spec，覆盖 `forum`、`forumPost`、`forumComment`、`forumPostUser` 的期望结构、必填路径、生成规则与 fallback。
  - `fetchStructuredData()` 增加 Forum 结构归一化：论坛首页保证 `nearby/discover/trending/posts` 数组稳定；帖子详情保证 `title/author/content/views/commentCount/comments`；评论追加只保留规范的 `comments[]`。
  - 修正 `postUserForumPost()` 的签名兼容：同时支持旧调用 `(title, category, content, currentPosts)` 与对象 context，避免 Forum 发帖页继续传多参数时丢失字段。
  - 修正 `generateForumPostForumCommentFromAi()` 的签名兼容：同时支持旧调用 `(postContext, userComment)` 与对象 context，确保用户评论不会被 AI 重复生成。
  - 已通过 typecheck/lint/build。

- next-6-ai-schema：Dynamic schema 第一阶段：
  - `src/phone/预设/aiService.ts` 新增 Dynamic 系列 schema spec，覆盖 `dynamic`、`dynamicHome`、`dynamicReply`、`dynamicPost` 的期望结构、必填路径、生成规则与 fallback。
  - `fetchStructuredData()` 增加 Dynamic 结构归一化：动态流/用户发动态保证 `posts[]` 稳定；动态主页保证 `name/signature/following/followers/likes/posts`；动态评论追加只保留规范 `comments[]`。
  - 修正 `postUserDynamic()` 签名兼容：同时支持旧调用 `(content, image, posts, options)` 与对象 context，避免发布动态时内容/配图/已有 posts 丢失。
  - 已通过 typecheck/lint/build。

- next-6-ai-schema：Live schema 第一阶段：
  - `src/phone/预设/aiService.ts` 新增 Live 系列 schema spec，覆盖 `liveList`、`live` 的期望结构、必填路径、生成规则与 fallback。
  - `fetchStructuredData()` 增加 Live 结构归一化：直播列表保证 `rooms[]` 稳定并补齐 `name/title/status/image/viewers/likes/followers`；直播间保证 `streamer/roomTitle/roomDesc/viewers/likes/followers/image/thought/contents/barrage/superchat/ranking`。
  - 直播间归一化优先使用请求 `streamerName/roomTitle` 回填，避免 AI 返回主播名/房间标题缺失导致历史匹配失败。
  - 已通过 typecheck/lint/build。

- next-6-ai-schema：Chat schema 第一阶段：
  - `src/phone/预设/aiService.ts` 新增 Chat 系列 schema spec，覆盖 `privateChat`、`groupChat`、`voiceCall` 的期望结构、必填路径、生成规则与 fallback。
  - `fetchStructuredData()` 增加 Chat 结构归一化：私聊/群聊保证 `messages[]` 稳定；群聊兼容 `group_message.messages` 包装；语音通话保证 `name/thought/content/callStatus`。
  - AI 聊天消息归一化会补齐 `type/content/name/sender/time`，并强制 `me/isMe=false`，避免 AI 回复被前端误判为用户消息。
  - 语音通话归一化优先使用 `contactName` 回填联系人名，避免通话面板空白。
  - 已通过 typecheck/lint/build。

- next-6-ai-schema：辅助模块 schema 第一阶段：
  - `src/phone/预设/aiService.ts` 新增 Auxiliary 系列 schema spec，覆盖 `diary`、`email`、`emailSend`、`browser`、`calendar`、`map` 的期望结构、必填路径、生成规则与 fallback。
  - `fetchStructuredData()` 增加辅助模块结构归一化：日记兼容 `{ diary: {...} }` 与根对象；邮箱保证 `emails[]`；浏览器保证 `query/results[]`；日历保证四类事件数组；地图保证 `locations/characters` 对象。
  - 修正 `sendUserEmail()` 签名兼容：同时支持旧调用 `(to, subject, content, emails)` 与对象 context，避免发件内容/已有邮件列表丢失。
  - 已通过 typecheck/lint/build。

- next-6-ai-schema：收尾完成并进入 next-7：
  - `src/phone/预设/aiService.ts` 补齐 `music` 与 `listenTogether` schema spec、fallback 与结构归一化。
  - `listenTogether` 兼容当前旧调用 `(partnerName, messagesToSend, playInfo)`，避免播放信息被误放入 history。
  - 已执行 fetch view 覆盖检查；当前 `fetchStructuredData(...)` 使用到的主要 view 均已有 schema 约束或归一化路径。
  - 已通过 typecheck/lint/build，`next-6-ai-schema` 标记完成。
- next-7-imagegen-provider：第一阶段开始：
  - `src/phone/imageGen/novelai.ts` 增强 provider 响应解析：支持 JSON 常见 b64/url、Gemini inlineData、二进制图片以及 NovelAI ZIP 首图提取。
  - OpenAI-compatible：有参考图时自动走 `/v1/images/edits` FormData；无参考图继续走 `/v1/images/generations` JSON，并支持 response_format/responseFormat。
  - Gemini：Google generativelanguage endpoint 下将参考图转换为 inlineData parts；非 Google/中转 endpoint 保持旧 JSON 结构。
  - NovelAI：参数补齐 `uc`、`negative_prompt`、`qualityToggle`、`sm`、`sm_dyn`，并保留 sampler/steps/scale/seed。
  - 已通过 typecheck/lint/build。

- next-7-imagegen-provider：ImageGenSettings provider 字段 UI 补齐：
  - `src/phone/apps/Settings/components/views/ImageGenSettings.vue` 现在所有 provider 均可编辑 URL/Endpoint、模型、尺寸与负面提示词。
  - NovelAI 增加 `qualityToggle`、`sm`、`sm_dyn` 开关，并保留 steps/scale/sampler。
  - OpenAI-compatible 增加 `response_format` 与图片数量 `n`，并提示有参考图时走 `/v1/images/edits`、无参考图走 `/v1/images/generations`。
  - Gemini 增加 Google endpoint inlineData/referenceImages 行为说明。
  - Pollinations 增加 model、seed、nologo、private、enhance 字段，默认免 key/URL fallback 说明。
  - 已通过 typecheck/lint/build。

- next-7-imagegen-normalization：对照旧 bundle/旧配置键补齐 provider config normalization 并评估 next-7：
  - `src/phone/imageGen/novelAiConfig.ts` 增加 `getDefaultNovelAiConfig()`，补齐 NovelAI/OpenAI/Gemini/Pollinations 默认 provider 配置。
  - normalization 增加字段别名：`endpoint/url/apiUrl/apiurl`、`key/token/apiKey/apikey`、`scale/cfg/cfgScale`、`negativePrompt/negative_prompt/negative/uc`、`response_format/responseFormat`、`sm_dyn/smDyn`、`aspectRatio/aspect_ratio`、`imageSize/image_size`、`promptPrefix/prompt_prefix`、`promptSuffix/prompt_suffix` 等。
  - NovelAI 默认值对齐旧 UI：`nai-diffusion-4-5-full`、832x1216、steps 28、cfg/scale 5、sampler `k_euler_ancestral`、scheduler `karras`、seed -1、qualityToggle true、ucPreset/cfgRescale/characterReference* 字段默认。
  - `src/phone/imageGen/novelai.ts` 生图请求补齐：provider promptPrefix/promptSuffix 组合、Pollinations `enhance`、OpenAI `n/size/aspect_ratio`、Gemini `generationConfig.imageConfig`、NovelAI `cfg/scheduler/autoSmea/decrisper/smDyn/varietyBoost/cfgRescale/ucPreset`。
  - 已确认现有实现已覆盖参考图路径：OpenAI edits FormData、Gemini Google inlineData、中转 referenceImages JSON；二进制/zip 响应路径已覆盖 JSON/base64/url/blob/NovelAI ZIP 首图提取。
  - 已通过 typecheck/lint/build。next-7-imagegen-provider 从代码层面可判定完成；剩余仅为真实外部 provider 凭据联调，不阻塞迁移清单进入下一项。

- next-8-settings-main-menu：Settings 剩余占位页清理启动，并恢复 MainMenu 真实入口：
  - 已扫描 `src/phone/apps/Settings`，占位页集中在 `components/views/*` 与 `VariablePickerModal.vue`；其中 Music/Sticker/Avatar 等出现的 `migration-placeholder-*` 多为真实空状态样式，不按未迁移页处理。
  - `src/phone/apps/Settings/components/views/MainMenu.vue` 已从占位卡恢复为真实设置菜单，支持刷新、导入、导出，并可导航到 user/characters/avatars/music/sticker/characterImages/map/api/imageGen/preset/autoFill/worldbookManager/autoReply/chatCss/other。
  - 菜单统计接入父组件传入的角色、头像、背景、音乐、地图区域数量。
  - 已通过 typecheck/lint/build。下一步优先恢复 UserSettings / CharacterList / CharacterDetail / GroupDetail 这类核心数据编辑页。

- next-8-settings-character-list：恢复 Settings 角色/群聊列表真实模板：
  - `src/phone/apps/Settings/components/views/CharacterList.vue` 已从迁移占位卡恢复为可交互列表。
  - 支持返回、添加角色、添加群聊、角色详情导航、群聊详情导航。
  - 角色列表读取 `editableData.characters`，群聊列表读取 `editableData.groups`，并补齐空状态与成员摘要。
  - 已通过 typecheck/lint/build。下一步继续恢复 `CharacterDetail.vue` / `GroupDetail.vue` 详情编辑页。

- next-8-settings-character-detail：恢复 Settings 角色详情真实编辑页：
  - `src/phone/apps/Settings/components/views/CharacterDetail.vue` 已从迁移占位卡恢复为可编辑详情页。
  - 支持返回、保存、删除、编辑 ID/名称/昵称/邮箱/在线状态/简介、头像选择、聊天背景选择、动态背景选择，以及 URL 直接编辑。
  - 继续沿用父组件 `update-field`、`open-image-picker`、`save`、`delete` 链路，避免改动数据加载与保存边界。
  - 已修复一次样式残留导致的重复 `</style>` 解析问题，并通过 typecheck/lint/build。下一步继续恢复 `GroupDetail.vue`。

- next-8-settings-group-detail：恢复 Settings 群聊详情真实编辑页：
  - `src/phone/apps/Settings/components/views/GroupDetail.vue` 已从迁移占位卡恢复为可编辑详情页。
  - 支持返回、保存、删除、编辑 ID/群名/群简介/其他成员备注、群头像选择、群聊背景选择与 URL 直接编辑。
  - 主要成员列表接入 `user` 与 `characters`，通过 `toggle-member` 复用父组件成员切换逻辑，并保留用户置顶规则。
  - 已通过 typecheck/lint/build。下一步可继续恢复 `UserSettings.vue` 或进入 Map/ChatCss/Other 等剩余占位页分类处理。

- next-8-settings-user-settings：恢复 Settings 用户数据真实编辑页：
  - `src/phone/apps/Settings/components/views/UserSettings.vue` 已从迁移占位卡恢复为可编辑用户资料页。
  - 支持返回、保存、编辑 ID/名称/昵称/邮箱/状态/简介、头像选择、手机桌面背景选择、聊天列表背景选择、背景 URL 直接编辑与字体选择。
  - 初次实现触发 `vue/no-mutating-props` 与 computed 副作用告警，已改为只读取 `editableData.user` 并在事件中更新既有对象字段，避免 computed 内初始化 prop。
  - 已通过 typecheck/lint/build。Settings 核心用户/角色/群聊数据页已恢复，下一步可继续 MapSettings 或 ChatCss/Other/AutoReply 等剩余占位页。

- next-8-settings-map-settings：按指定顺序恢复 Settings 地图设置真实编辑页：
  - `src/phone/apps/Settings/components/views/MapSettings.vue` 已从迁移占位卡恢复为地图编辑页。
  - 支持地图名称编辑、添加/删除/上下移动地区、编辑地区名称/position/图标、添加/删除/上下移动子地点、编辑子地点名称/position/图标，并接入 `open-icon-picker`。
  - 初次实现触发 `vue/no-mutating-props` 与重复 `</style>` 解析问题，已改为通过 `map.value` 既有对象间接更新并清理残留重复样式片段。
  - 已通过 typecheck/lint/build。下一步按用户指定顺序处理 `ChatCssSettings.vue`，Preset 相关页面保持单独计划迁移不纳入本轮。

- next-8-settings-chat-css：按指定顺序恢复 Settings 聊天美化真实设置页：
  - `src/phone/apps/Settings/components/views/ChatCssSettings.vue` 已从迁移占位卡恢复为可交互设置页。
  - 接入 `useChatCss`、`useHomeCss`、`useDisplaySettings`，支持聊天 CSS/主页 CSS 开关与编辑、显示与注入开关、历史读取楼层数、日期/时间变量绑定。
  - 保留状态预览区，便于确认聊天 CSS、主页 CSS 是否启用；保存按钮同步调用三组配置保存函数。
  - 已通过 typecheck/lint/build。下一步按用户指定顺序处理 `OtherSettings.vue`。

- next-8-settings-other：按指定顺序恢复 Settings 其他设置真实设置页：
  - `src/phone/apps/Settings/components/views/OtherSettings.vue` 已从迁移占位卡恢复为可交互设置页。
  - 接入 `useDisplaySettings` 与 `useOtherSettings`，支持启动显示、悬浮按钮、控件刘海区、追加楼层、聊天追加楼层、生成结束事件、历史楼层数、日期/时间变量绑定。
  - 增加 `phone_other_settings` 本地设置项：调试模式、紧凑设置页、减少提示、本地备注，并提供重置其他本地设置与立即保存。
  - 已通过 typecheck/lint/build。下一步按用户指定顺序处理 `AutoReplySettings.vue`。

- next-8-settings-auto-reply：按指定顺序恢复 Settings 自动回复真实设置页：
  - `src/phone/apps/Settings/components/views/AutoReplySettings.vue` 已从迁移占位卡恢复为可交互设置页。
  - 配置保存在 `localStorage: phone_auto_reply_settings`，支持全局启用、私聊/群聊/动态/直播/好友开关、世界书同步预留开关、默认回复、回复延迟、每轮最多回复。
  - 支持自动回复规则增删、启用/关闭、规则名称、适用场景、匹配方式、触发内容、回复内容编辑，并展示规则数量/启用数量状态。
  - 已通过 typecheck/lint/build。下一步按用户指定顺序处理 `WorldbookManager.vue`。

- next-8-settings-worldbook-manager：按指定顺序恢复 Settings 世界书管理真实设置页：
  - `src/phone/apps/Settings/components/views/WorldbookManager.vue` 已从迁移占位卡恢复为可交互世界书管理页。
  - 接入世界书 API：`getWorldbookNames`、`getWorldbook`、`getGlobalWorldbookNames`、`rebindGlobalWorldbooks`、`getChatWorldbookName`、`rebindChatWorldbook`、`getCharWorldbookNames`、`rebindCharWorldbooks`、`createOrReplaceWorldbook`。
  - 支持读取世界书列表/条目、筛选、展开条目、查看自动填充标签、创建手机助手模板世界书、绑定当前聊天世界书、设为当前角色主世界书、切换全局启用状态。
  - 初次实现出现模板属性损坏，已修复并通过 typecheck/lint/build。用户指定的 MapSettings → ChatCssSettings → OtherSettings → AutoReplySettings → WorldbookManager 顺序已完成；PresetSettings/PresetAutoFillSettings 仍保持单独计划迁移。

- next-8-settings-placeholder-scan：扫描 Settings 剩余迁移占位：
  - `src/phone/apps/Settings/components/views/*.vue` 中，除用户指定单独迁移的 `PresetSettings.vue`、`PresetAutoFillSettings.vue` 外，未发现仍使用“正在从旧 bundle 深度复原/当前占位组件”的完整页面占位。
  - `ApiSettings.vue`、`ImageGenSettings.vue`、`AvatarLibrary.vue`、`MusicLibrary.vue` 等仍保留 `migration-view-shell` 或 `migration-placeholder-*` 类名，但命中位置为真实页面壳/空状态样式，不属于完整迁移占位页。
  - 额外发现 `src/phone/apps/Settings/components/modals/VariablePickerModal.vue` 仍是迁移占位弹窗；它不是本次用户指定的页面列表，但属于 Settings 子组件遗留占位，后续可单独恢复或标注 legacy adapter。
  - 因 Preset 两页需单独计划迁移且 VariablePickerModal 仍待处理，`next-8-settings-placeholders` 暂保持 in_progress，不进入 P8 收尾完成态。

- next-8-settings-variable-picker：恢复 Settings 变量选择弹窗：
  - `src/phone/apps/Settings/components/modals/VariablePickerModal.vue` 已从迁移占位恢复为真实变量选择弹窗。
  - 支持读取楼层/聊天/角色/全局变量，按路径/类型/预览值展平展示，提供搜索、快捷路径、刷新、选择路径、ESC/遮罩关闭。
  - 复扫 `src/phone/apps/Settings` 后，除 `PresetSettings.vue`、`PresetAutoFillSettings.vue` 外，未再发现“正在从旧 bundle/当前占位组件/弹窗模板正在深度复原”的真实占位；`AvatarLibrary.vue` 仅残留空状态样式类，不是页面占位。
  - 已通过 typecheck/lint/build。下一步继续恢复 PresetSettings/PresetAutoFillSettings，确保 Settings 占位页全部迁移完成。

- next-8-settings-preset-pages：恢复 Settings 预设配置与预设/自动填充分页容器：
  - `src/phone/apps/Settings/components/views/PresetSettings.vue` 已从占位恢复为本地提示词预设块编辑器，支持预设选择、新建、重命名、保存、删除、导入、导出、恢复默认、块增删与上移/下移、role/enabled/content 编辑。
  - `src/phone/apps/Settings/components/views/PresetAutoFillSettings.vue` 已恢复为安全分页容器，按 `initialTab` 在“预设配置 / 自动填充”之间切换，并复用 `PresetSettings` 与 `AutoFillSettings`，避免复制自动填充复杂逻辑。
  - 加固 `useAutoFillPresets.ts` 与 `useOtherSettings.ts` 的运行契约，补齐 AutoFillSettings 所需 API；补齐 `src/phone/预设/autoFill.ts` 的标签解析导出，消除新入口构建告警。
  - 复扫 Settings 后仅 `AvatarLibrary.vue` 残留 `migration-placeholder-card` 空状态样式类，未发现真实页面占位。
  - 已通过 typecheck/lint/build；生产入口 `src/phone/index.js` 未切换。

- next-9-p8-compat-checklist：建立 P8 兼容验证报告并完成静态基线：
  - 新增 `src/phone/docs/compat-report.md`，覆盖启动/UI、Settings、Chat、Dynamic、Forum、Shopping、Live、Calendar、Diary、Email、Browser、Map、Camera、Music、AI、图片生成、楼层读写与旧入口回滚检查项。
  - 已通过 `pnpm typecheck:phone`、`pnpm lint:phone --quiet`、`$env:TAVERN_HELPER_BUILD_ENTRY='src/phone/index.ts'; pnpm build:dev -- --env entry=src/phone/index.ts`。
  - Settings 占位复扫仅 `AvatarLibrary.vue` 命中 `migration-placeholder-card` 空状态样式类，非页面占位。
  - 当前结论：P8 静态兼容验证通过，可进入 Tavern 环境人工业务流验收；生产入口 `src/phone/index.js` 仍未切换。

### 2026-05-21 · 图片生成/上传链路第一阶段迁移

- 将 `src/phone/imageGen/novelAiConfig.ts` 从简单 localStorage adapter 升级为标准化配置层，兼容 `pollinations`、`openai`、`gemini`、`novelai` provider。
- 将 `src/phone/imageGen/novelai.ts` 从“图片生成服务仍在迁移中”升级为真实调用层：支持 prompt 构建、参考图透传、串行队列、Pollinations/OpenAI-compatible/Gemini/NovelAI 基础请求。
- 将 `src/phone/services/upload/sillyTavernUpload.ts` 升级为兼容 options 参数的上传层，支持多 endpoint 尝试和失败时 data URL 安全回退。
- 已通过 `pnpm typecheck:phone`、`pnpm lint:phone --quiet`。
- 已通过 `$env:TAVERN_HELPER_BUILD_ENTRY='src/phone/index.ts'; pnpm build:dev -- --env entry=src/phone/index.ts`。
- 未切换生产入口，未覆盖 `src/phone/index.js`。

### 2026-05-21 · 创建状态文档

- 创建本文档，记录当前 phone 插件迁移进度。
- 汇总已完成事项：入口、基础模块、构建、import rewiring、AI 服务第一阶段、store 楼层读写第一阶段。
- 汇总未完成事项：图片生成、API 配置 UI、历史精准匹配、媒体资源库、兼容验证、渐进切换、文档清理。
- 明确后续每轮迁移后必须更新本文档。
