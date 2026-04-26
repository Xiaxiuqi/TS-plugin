# 浮岛 SCSS 样式拆分目录

> 当前状态：原 [`src/ci_island_test/style.scss`](../style.scss:1) 文件保留完整功能，未做拆分。
> 本目录为后续阶段7（样式拆分）预留。

## 规划的拆分文件

```
styles/
├── _variables.scss        # CSS 变量与主题（:root + body.theme-*）
├── _island.scss           # 浮岛容器（#ci-island-container）
├── _panels.scss           # 通用面板（#ci-panel/#ci-map-panel/.ci-sub-panel）
├── _characters.scss       # 角色卡（含 archive、bag）
├── _relation.scss         # 人物关系图（SVG）
├── _inventory.scss        # 物品仓库 + 视图切换 + 货币
├── _skills.scss           # 技能面板
├── _worldinfo.scss        # 世界信息（新闻条/势力/事件）
├── _map.scss              # 地图（含弹窗、外部区域）
├── _dialogs.scss          # 各种编辑弹窗与覆盖层
├── _avatar.scss           # 头像选择/裁剪
└── _radar.scss            # 雷达图
```

## 主入口聚合方式

完成拆分后，[`src/ci_island_test/style.scss`](../style.scss:1) 将简化为：

```scss
@use 'styles/variables';
@use 'styles/island';
@use 'styles/panels';
@use 'styles/characters';
@use 'styles/relation';
@use 'styles/inventory';
@use 'styles/skills';
@use 'styles/worldinfo';
@use 'styles/map';
@use 'styles/dialogs';
@use 'styles/avatar';
@use 'styles/radar';
```

## 拆分原则

1. **保持选择器不变**：仅按文件分块，不修改任何 CSS 选择器
2. **变量集中**：所有 CSS 变量定义集中在 `_variables.scss`
3. **主题适配**：每个分文件内部包含其相关的 `.theme-night` 适配
4. **无外部依赖**：每个分文件可独立使用，不依赖其他分文件
