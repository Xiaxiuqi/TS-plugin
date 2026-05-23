## TODO LIST

<!-- LIMCODE_TODO_LIST_START -->
- [x] 确认并固定唯一权威源为 src/phone/index.js，停止引用 src/phone/source/** 作为真源  `#p0-freeze-authority`
- [x] 生成 Phone 相关文件清单，将权威源、运行必需文件、可删除过时文件分组  `#p1-inventory-obsolete`
- [x] 重写校验文档：记录如何从 src/phone/index.js 校验 CSS、界面、功能、字体、返回/导航与导入通知  `#p2-rewrite-validation-doc`
- [x] 重写迁移文档：明确从 src/phone/index.js 反查、提取、迁入、对比、验收的流程，废弃旧 source/** 基准  `#p3-rewrite-migration-doc`
- [x] 删除旧的错误迁移文档和过时对比报告，仅保留新的基准文档/计划/必要进度记录  `#p4-delete-outdated-docs`
- [x] 删除错误迁移产生且不再作为运行入口的 Phone 过时源码/适配器/占位目录，保留 src/phone/index.js 与明确需要的开发服务文件  `#p5-delete-obsolete-phone-artifacts`
- [x] 验证直接加载 http://127.0.0.1:5501/src/phone/index.js 后功能、CSS、字体、设置页面与通知行为等同源文件  `#p6-verify-direct-source-load`
- [x] 更新进度记录，标记旧迁移路线废弃，新迁移路线以 src/phone/index.js 为唯一基准  `#p7-update-progress`
<!-- LIMCODE_TODO_LIST_END -->

# Phone 迁移基准重置与过时文件清理计划

## 目标

把 Phone 迁移工作从错误基准中纠正回来：

- 唯一权威源文件：`src/phone/index.js`
- 不再把 `src/phone/source/**` 当作源文件或验收基准。
- 重写迁移文档和校验文档。
- 删除过时文件，尤其是此前错误迁移过程中产生的文档、对比报告、占位源码、adapter、错误拆分产物。
- 删除前必须先列清单，避免误删 `src/phone/index.js` 或当前开发服务器必需文件。

## 当前关键判断

### 权威源

```text
src/phone/index.js
```

这是唯一需要一比一对齐的源文件。

### 明确废弃的错误基准

```text
src/phone/source/**
```

该目录不能再作为 CSS、功能、界面分类、组件结构、字体逻辑、返回/导航逻辑的真源。

### 当前临时加载建议

开发验证时优先直接加载：

```js
(() => {
  const old = document.getElementById('phone-dev-live-script');
  old?.remove();

  const script = document.createElement('script');
  script.id = 'phone-dev-live-script';
  script.src = 'http://127.0.0.1:5501/src/phone/index.js?ts=' + Date.now();
  document.head.appendChild(script);
})();
```

这样绕开 `dist/phone/index.js` 和错误迁移入口，直接使用权威源。

## 文件清理原则

### 绝对保留

- `src/phone/index.js`
- 当前用于本地静态服务的文件，例如：
  - `.limcode/experiments/cors-static-server.mjs`
- 新写的迁移/校验文档与本计划。

### 待清理候选

需要先生成清单再删除：

- 旧迁移状态文档：
  - `.limcode/phone-migration-status.md`
- 旧迁移计划中基于错误拆分路线的文档：
  - `.limcode/plans/phone-插件深度源码复原与正确迁移计划.plan.md`
  - `.limcode/plans/phone-下一阶段深度迁移细致计划.plan.md`
- 旧 Phone docs：
  - `src/phone/README.migration.md`
  - `src/phone/docs/compat-report.md`
  - `src/phone/docs/live-reload-prod-watch.md`
  - `src/phone/docs/missing-imports.md`
  - `src/phone/docs/module-mapping.md`
- 错误基准目录：
  - `src/phone/source/**`
- 错误迁移拆分产物候选：
  - `src/phone/apps/**`
  - `src/phone/core/**`
  - `src/phone/services/**`
  - `src/phone/stores/**`
  - `src/phone/composables/**`
  - `src/phone/utils/**`
  - `src/phone/types/**`
  - `src/phone/数据/**`
  - `src/phone/预设/**`
  - `src/phone/imageGen/**`
  - `src/phone/App.vue`
  - `src/phone/index.ts`
  - `src/phone/store.ts`
  - `src/phone/debug.ts`
  - `src/phone/shadowHost.ts`
  - `src/phone/dateTimeVariables.ts`
  - `src/phone/abortController.ts`
  - `src/phone/phoneImagePreview.ts`
  - `src/phone/tsconfig.migration.json`
  - `src/phone/vue-shims.d.ts`
  - `src/phone/module-summary.json`

> 注意：这些是“候选”，不是立即删除清单。执行删除前必须输出最终确认清单。

## 新文档要求

### 1. 校验文档

建议路径：

```text
.limcode/phone-indexjs-validation.md
```

必须包含：

- 如何确认当前加载的是 `src/phone/index.js`。
- 如何验证 CSS 与界面分类来自 `src/phone/index.js`。
- 如何验证字体逻辑：`phone_data.user.font`、字体 CSS link、`--phone-font-family`。
- 如何验证 Settings：主菜单、子页面返回、导入、导出、保存、通知。
- 如何验证首页：App 列表、小组件、拖拽、分页。
- 如何验证功能模块：聊天、动态、论坛、商城、直播、地图、日记、音乐、电话、邮件、相机等。
- 控制台不能出现的错误清单。
- 手动验收清单。

### 2. 迁移文档

建议路径：

```text
.limcode/phone-indexjs-migration.md
```

必须包含：

- 唯一基准声明。
- 禁止使用 `src/phone/source/**` 作为真源。
- 从 `src/phone/index.js` 搜索/定位模块的方法。
- 如何提取 CSS/template/render/业务函数。
- 如何做一比一迁移。
- 如何做差异校验。
- 每次迁移的验收流程。
- 删除和回滚策略。

## 执行步骤

### P0：固定权威源

- 在新文档中明确：`src/phone/index.js` 是唯一真源。
- 所有旧 source 目录只作为废弃迁移产物，不作为参考基准。

### P1：生成文件清单

- 列出 `src/phone` 下所有文件。
- 标记：
  - 保留
  - 新文档
  - 待删除
  - 暂缓确认

### P2：重写校验文档

写入 `.limcode/phone-indexjs-validation.md`。

### P3：重写迁移文档

写入 `.limcode/phone-indexjs-migration.md`。

### P4：删除过时文档

删除旧 Phone 迁移路线相关文档和报告。

### P5：删除过时源码/adapter

按确认清单删除错误迁移拆分产物。

### P6：验证直接加载源文件

通过静态服务直接加载：

```text
http://127.0.0.1:5501/src/phone/index.js
```

验收：

- Settings 可正常打开。
- 字体生效。
- 返回/导航逻辑与源文件一致。
- 原本应有的导入/载入/通知行为正常。
- 不出现迁移占位文字。
- 不出现 adapter 未迁移警告。

### P7：更新进度

更新 `.limcode/progress.md` 或新的 Phone 进度文档，说明旧迁移路线废弃。

## 风险与防护

### 风险 1：误删权威源

防护：删除工具调用前不包含 `src/phone/index.js`。

### 风险 2：误删开发服务器需要文件

防护：保留 `.limcode/experiments/cors-static-server.mjs`。

### 风险 3：watch 再次覆盖 dist

防护：当前验证直接加载 `src/phone/index.js`，不要依赖 `dist/phone/index.js`。

### 风险 4：删除后需要回看旧错误迁移记录

防护：删除前在新迁移文档中记录“废弃原因”和“可恢复方式”；如需完全保留历史，则仅删除 Phone 相关错误产物，不动非 Phone 项目的计划/设计。

## 完成标准

- 新校验文档完成。
- 新迁移文档完成。
- 旧错误迁移文档删除或标记废弃。
- `src/phone/index.js` 保留。
- 直接加载 `src/phone/index.js` 可正常运行。
- 不再把 `src/phone/source/**` 当作迁移基准。
- 后续迁移只能从 `src/phone/index.js` 反查和提取。
