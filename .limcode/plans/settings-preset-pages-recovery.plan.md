## TODO LIST

<!-- LIMCODE_TODO_LIST_START -->
- [x] 审计 PresetSettings/PresetAutoFillSettings 现状、source 样式、现有 AutoFillSettings/useAutoFillPresets/PresetNameModal 依赖与入口关系  `#preset-recovery-1-audit`
- [x] 确定恢复边界与数据契约：PresetSettings 使用本地 prompt preset 数据；PresetAutoFillSettings 作为 PresetSettings 与 AutoFillSettings 的安全分页容器  `#preset-recovery-2-contract`
- [x] 恢复 PresetSettings：实现预设列表、块编辑、增删、排序、导入导出、保存/重置，同时保留已有样式并控制数据兼容  `#preset-recovery-3-preset-settings`
- [x] 恢复 PresetAutoFillSettings：复用 PresetSettings 与 AutoFillSettings，按 initialTab 切换，避免复制 AutoFillSettings 内部复杂逻辑  `#preset-recovery-4-preset-autofill`
- [x] 运行占位复扫、typecheck、lint、new entry build，并记录状态文档/计划/progress  `#preset-recovery-5-validation`
<!-- LIMCODE_TODO_LIST_END -->

# Settings PresetSettings 与 PresetAutoFillSettings 占位恢复细致计划

## 1. 当前结论

本次目标是恢复最后两个 Settings 页面级真实占位：

- `src/phone/apps/Settings/components/views/PresetSettings.vue`
- `src/phone/apps/Settings/components/views/PresetAutoFillSettings.vue`

前一轮复扫结论：

- `MapSettings.vue`、`ChatCssSettings.vue`、`OtherSettings.vue`、`AutoReplySettings.vue`、`WorldbookManager.vue` 已恢复。
- `VariablePickerModal.vue` 已恢复。
- `AvatarLibrary.vue` 仅残留空状态样式类，不是页面占位。
- 真实页面级占位仅剩 Preset 两页。

重要入口关系：

```vue
<PresetAutoFillSettings
  v-else-if="currentView === 'preset' || currentView === 'autoFill'"
  :initial-tab="currentView === 'autoFill' ? 'autoFill' : 'preset'"
  @back="currentView = null"
/>
```

因此实际入口统一走 `PresetAutoFillSettings.vue`，它需要承载两个分页：

1. 预设配置。
2. 自动填充管理。

## 2. 风险点

### 2.1 `source` 文件只有样式，没有可直接复制的模板/脚本

当前 `src/phone/source/apps/Settings/components/views/PresetSettings.vue` 与 `PresetAutoFillSettings.vue` 主要是样式片段，不包含可直接恢复的完整 `<template>` / `<script>` 逻辑。

因此不能简单“从 source 覆盖”。应采用：

- 保留已迁移文件中的旧样式类。
- 重新补齐最小真实交互模板与脚本。
- 小步验证。

### 2.2 `AutoFillSettings.vue` 已经是复杂真实页面，不应复制其内部逻辑

`AutoFillSettings.vue` 已包含：

- 自动填充预设管理。
- 世界书预览。
- 历史预览。
- 人物/页面/格式指导。
- `PresetNameModal`。
- `useAutoFillPresets`。
- `useOtherSettings`。

`PresetAutoFillSettings.vue` 的最佳恢复方式不是重写这些逻辑，而是作为安全分页容器复用：

```vue
<PresetSettings embedded />
<AutoFillSettings embedded />
```

这样可以避免重复迁移和双份状态不一致。

### 2.3 `useAutoFillPresets.ts` 需谨慎确认现状

当前读取到的 `useAutoFillPresets.ts` 是极简版本，只返回：

```ts
{ presets, loadPresets, savePresets }
```

但 `AutoFillSettings.vue` 中看起来按更完整的 API 解构。由于此前命令行 typecheck/lint/build 已通过，可能存在以下情况之一：

- 该逻辑在当前 tsconfig/构建路径下没有被严格检查到。
- 旧代码中部分解构运行时会变成 `undefined`，但暂未触发。
- 后续恢复 PresetAutoFillSettings 时如果直接启用 AutoFillSettings 主入口，可能暴露运行时问题。

因此计划中必须先做依赖契约检查，避免简单嵌入后才发现页面运行时报错。

## 3. 恢复策略总览

### 3.1 先恢复 `PresetSettings.vue`

目标：实现一个独立、可保存、可导入导出的“提示词预设块编辑器”。

建议不要直接接入 Tavern 预设全局 API 做写入，因为 Tavern preset API 涉及模型/生成参数/预设切换，误写风险高。当前迁移阶段应先实现手机插件内部可回滚配置。

建议本地存储键：

```ts
phone_prompt_presets
phone_active_prompt_preset_id
```

数据结构建议：

```ts
interface PromptPresetBlock {
  id: string;
  name: string;
  role: 'system' | 'assistant' | 'user';
  content: string;
  enabled: boolean;
  fixed?: boolean;
}

interface PromptPreset {
  id: string;
  name: string;
  builtin?: boolean;
  blocks: PromptPresetBlock[];
  createdAt: number;
  updatedAt: number;
}
```

默认内置预设建议：

```ts
{
  id: 'builtin-phone-default',
  name: '手机助手默认预设',
  builtin: true,
  blocks: [
    { role: 'system', name: '基础规则', content: '...' },
    { role: 'assistant', name: '输出风格', content: '...' },
    { role: 'user', name: '用户补充', content: '' },
  ]
}
```

交互功能：

- 预设下拉选择。
- 新建预设。
- 重命名用户预设。
- 保存当前预设。
- 删除用户预设。
- 导入 JSON。
- 导出 JSON。
- 恢复默认。
- 添加块。
- 删除块。
- 上移/下移块，替代复杂拖拽，降低移动端和 Vue 状态风险。
- 编辑块名称、role、enabled、content。

验收：

- 不再出现占位文案。
- 刷新页面后配置保留。
- 内置预设不会被误删。
- 导入非法 JSON 有错误提示。
- typecheck/lint/build 通过。

### 3.2 再恢复 `PresetAutoFillSettings.vue`

目标：恢复为“预设配置 / 自动填充管理”的安全分页容器。

建议结构：

```vue
<template>
  <div class="preset-auto-fill detail-page">
    <nav>...</nav>
    <div class="detail-content no-padding">
      <div class="tab-bar">
        <button @click="activeTab = 'preset'">预设配置</button>
        <button @click="activeTab = 'autoFill'">自动填充</button>
      </div>
      <div class="inner">
        <PresetSettings v-if="activeTab === 'preset'" embedded @back="emit('back')" />
        <AutoFillSettings v-else embedded @back="emit('back')" />
      </div>
    </div>
  </div>
</template>
```

但在实现前需要检查 `AutoFillSettings.vue` 的 props：

- 是否已有 `embedded`。
- 是否会隐藏自身导航。
- 是否需要 `initialSubView` 或 `subview-change`。

目前搜索结果显示它确实已有：

```ts
const isEmbeddedMain = computed(() => Boolean(props.embedded) && subView.value === null)
```

说明它已具备被嵌入能力。

`PresetSettings.vue` 也建议新增 `embedded?: boolean`，用于：

- 在单独打开时显示自身导航。
- 在 `PresetAutoFillSettings` 中嵌入时隐藏自身导航，避免双导航。

### 3.3 暂不做的事

为了避免恢复出现问题，本轮不要做：

- 不改 `src/phone/index.js`。
- 不切换生产入口。
- 不删除 `src/phone/source/**`。
- 不大规模重写 `AutoFillSettings.vue`。
- 不直接写入 Tavern 全局预设或模型参数。
- 不把 Preset 与 AutoFill 的 localStorage 数据混用。
- 不一次性引入拖拽库。

## 4. 分阶段执行步骤

### 阶段 A：依赖契约复核

1. 检查 `PresetAutoFillSettings.vue` 的实际入口使用。
2. 检查 `AutoFillSettings.vue` props / emits：
   - `embedded`
   - `initialTab` 是否由容器管理，还是只在外层用。
3. 检查 `useAutoFillPresets.ts` 与 `AutoFillSettings.vue` 是否存在 API 不匹配。
4. 如发现 `useAutoFillPresets.ts` 真实缺函数：
   - 不在本计划直接大修全部 auto fill preset API。
   - 先让 `PresetAutoFillSettings` 只做容器，保持已有 `AutoFillSettings` 行为不扩散。
   - 如运行验证暴露问题，再单独修复 `useAutoFillPresets`。

### 阶段 B：恢复 `PresetSettings.vue`

1. 替换占位 template。
2. 补齐 script：
   - 类型定义。
   - 默认预设。
   - localStorage load/save。
   - 预设 CRUD。
   - block CRUD。
   - import/export。
3. 保留现有 style 中真实样式类。
4. 移除 `migration-placeholder-card` 等真实占位样式，或至少不再在模板中使用。
5. 单独运行：

```powershell
pnpm typecheck:phone
pnpm lint:phone --quiet
```

### 阶段 C：恢复 `PresetAutoFillSettings.vue`

1. 替换占位 template 为 tab 容器。
2. 补齐 script：
   - `initialTab` prop。
   - `activeTab` state。
   - watch initialTab。
   - emits back。
3. 引入：

```ts
import PresetSettings from './PresetSettings.vue';
import AutoFillSettings from './AutoFillSettings.vue';
```

4. 使用已有 deep 样式隐藏内嵌导航。
5. 单独运行：

```powershell
pnpm typecheck:phone
pnpm lint:phone --quiet
```

### 阶段 D：占位复扫与构建验证

复扫命令逻辑：

```text
正在从旧 bundle
当前占位组件
该弹窗模板正在深度复原
migration-placeholder-card
```

预期结果：

- `PresetSettings.vue` 不再命中真实占位。
- `PresetAutoFillSettings.vue` 不再命中真实占位。
- 允许 `AvatarLibrary.vue` 仅作为空状态样式残留，但应记录为非占位。

最终验证：

```powershell
pnpm typecheck:phone
pnpm lint:phone --quiet
$env:TAVERN_HELPER_BUILD_ENTRY='src/phone/index.ts'; pnpm build:dev -- --env entry=src/phone/index.ts
```

### 阶段 E：同步文档与状态

更新：

- `.limcode/phone-migration-status.md`
- `.limcode/plans/phone-下一阶段深度迁移细致计划.plan.md`
- `.limcode/progress.md`

若全部通过，将 `next-8-settings-placeholders` 标记为 completed，并把下一步指向：

```text
next-9：P8 兼容验证清单准备
```

## 5. 回滚方案

如恢复出现问题：

1. 不影响生产入口，因为仍未覆盖 `src/phone/index.js`。
2. 可只回滚两个文件：
   - `PresetSettings.vue`
   - `PresetAutoFillSettings.vue`
3. localStorage 数据独立使用新 key，不会污染已有 `phone_other_settings`、`phone_auto_fill_presets`。
4. 若导入/导出功能异常，可临时禁用导入按钮，不影响主页面构建。

## 6. 成功标准

全部满足才算迁移完成：

1. 两个页面不再出现占位卡。
2. `PresetAutoFillSettings` 可从 `currentView === 'preset'` 和 `currentView === 'autoFill'` 两个入口正确进入对应 tab。
3. `PresetSettings` 可完成预设 CRUD 和块编辑。
4. `AutoFillSettings` 仍可嵌入打开，原有自动填充页面不被破坏。
5. 复扫 Settings 无真实占位页。
6. typecheck/lint/build 全部通过。
7. 状态文档同步完成。
