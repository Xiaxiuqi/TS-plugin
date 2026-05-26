# 表格模板同步约定

## 背景

「回响坟冢-私用版」角色卡的表格模板原本位于 `nailongwang/奶龙王一键制卡/projects/回响坟冢-私用版/tables/table-template.json`。该目录在仓库根 `.gitignore` 中被整体忽略，不进入 git 跟踪。

为了让状态栏 UI（本项目 `src/card_story_ui/echo_tomb_protocol_ui/`）与表格模板保持版本一致、可回溯、可对比，本项目内部维护一份表格模板副本 `tables/table-template.json`，提交到 git。

## 权威版本

**本项目内的 `tables/table-template.json` 是权威版本**。

原因：

- 该表格模板与状态栏 UI 强绑定。UI 按中文表头定位列，initNode SQL 示例决定首次填表格式，DDL 约束决定未来填入数据的合法范围。表格模板一变，UI 需要同步调整。
- 仅本项目内的副本进入 git 历史，能提供完整的变更记录、对比、回溯能力。
- `nailongwang/` 目录是奇龙制卡项目的工作区，无法作为权威版本。

## 修改流程

在本项目内维护表格模板时，按以下顺序操作：

1. **修改本项目内副本**： `src/card_story_ui/echo_tomb_protocol_ui/tables/table-template.json`。
2. **验证 JSON 合法性**： `node -e "JSON.parse(require('fs').readFileSync('src/card_story_ui/echo_tomb_protocol_ui/tables/table-template.json','utf-8'))"`。
3. **同步回奇龙王目录**：将本项目内副本复制覆盖到 `nailongwang/奶龙王一键制卡/projects/回响坟冢-私用版/tables/table-template.json`。
4. **提交 git**：仅提交本项目内副本；奇龙王目录不进 git，不需要也不允许修改 `.gitignore`。
5. **在酒馆重新导入**：在酒馆助手中重新从奇龙王项目导出角色卡，验证最新表格模板生效。

## 反向同步（极少使用）

如果奇龙王目录的表格模板被其他工具（如奇龙王一键制卡脈动）修改过，要谨慎处理：

1. 先在本项目内副本中另存为补丁，手工合并奇龙王目录的变更。
2. 验证合并后 JSON 合法且与 UI 列名依赖一致。
3. 重新同步回奇龙王目录，保证两边一致。

不要直接用奇龙王目录的版本覆盖本项目内副本，避免丢失这边状态栏 UI 依赖的修改。

## 判断两边是否同步

如果需要检查两边是否一致，执行：

```powershell
Get-FileHash src/card_story_ui/echo_tomb_protocol_ui/tables/table-template.json
Get-FileHash nailongwang/奶龙王一键制卡/projects/回响坟冢-私用版/tables/table-template.json
```

两个 hash 一致即同步。

## 列名依赖

状态栏 UI 在以下位置依赖表格中文表头列名，修改表头名称时必须同步修改 UI。主要受影响点：

- `core/tables.ts`：表格标准化、按中文表头定位列、离场过滤、背包归属过滤
- `ui/shell.ts`：全局状态显示依赖全局数据表列名
- `ui/subjectPanel.ts`、`ui/inventoryPanel.ts`：实体档案/属性/装备/技能/背包面板依赖主体相关表、背包表列名
- `ui/upgradePanel.ts`：升级系统依赖主体档案表、主体属性表列名
- `core/writeback.ts`：安全写回依赖表名和主键列

如果表头名称修改了，要在上述文件中搜索同步修改。

## 本次修改记录

本次部署状态栏 UI 项目时对表格模板作了以下结构性修改：

1. **全局数据表**：新增第 9 列 `战斗状态`（枚举：非战斗 / 遭遇 / 战斗中 / 收尾），默认 `非战斗`；清除原初始数据行（原行违反 `cur_time` 的 GLOB 格式与 `sex` NOT NULL CHECK。AI 根据 initNode 插入完整首行）。
2. **重要角色表**：在 `备注` 与 `角色ID` 之间新增 `是否离场` 列（枚举：是 / 否），默认 `否`；删除 2 行 Unknown 占位。
3. **主体档案表**：在 `法则反噬` 与 `角色ID` 之间新增 `是否离场` 列，默认 `否`。
4. **主角属性表**：修正 note 文本中 "智慧" 为 "智力"，与 DDL 中 `attribute_name IN ('力量','敏捷','体质','智力','感知','魅力')` 对齐；保留 6 行六维占位。
5. **主角档案表、区域熵值表、背包物品表、任务与事件表、阵营声望表、NPC 压力节点表**：清除非结构性占位数据行，只保留表头。AI 首次填表时按 initNode SQL 示例插入。
6. **主体技能表**：删除 `ss_001_sample` 占位 stub；保留 3 行主角传承技能设定（传承感知 / 情报瘟疫 / 彼岸之眼）。
7. **主体传承路径表**：修正 `whispering_echoes` 行的 `路径状态`（原为 `否`）为 `未觉醒`；修正 `关键节点`（原为 `否`）为 `初始传承觉醒路径未启动`。
8. **保留的结构性数据**：主角属性表 6 行六维（DDL 枚举 CHECK 约束）；主体装备表 12 行 player_main 装备槽位（DDL 枚举 CHECK + UNIQUE 约束）；状态栏主体表 player_main 主角入口；主体传承路径表 whispering_echoes。
