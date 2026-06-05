# db-status-bar 数据库状态栏重构设计

## 1. 背景与目标

### 1.1 唯一参考模板
`数据库前端/咒回前端/TavernDB_template_咒回模板·改-夏-地图版.json`（1307行，17张表）

### 1.2 目标
将 `public/story_ui_lite_test/modules/db-status-bar/` 模块的数据解析、UI渲染和交互逻辑对齐新模板的真实表结构，并按用户布局需求重构界面。

### 1.3 非目标
- 不涉及 `mvu-status-newvars`、`bp-panel-newvars`、`world-log` 等其他模块的代码修改
- 不涉及势力表、地点表、性爱信息表、NSFW表、备忘录表、纪要表、选项表、数值规则表的前端展示
- 不实现独立于数据库状态栏的外部地图面板；状态栏内置地图的 `defMap()` / `fbMap()` / AI prompt / 刷新重绘链路以 `modules/db-status-bar/index.js` 的现有实现为准，安全加固和管理界面配置仍待验收
- 不修改模板 JSON 本身

---

## 2. 新模板表结构摘要（状态栏相关，共10张）

### 2.1 全局数据表 `global_state`
| content表头 | DDL字段 | 状态栏用途 |
|---|---|---|
| 当前位置 | current_location | 世界状态-地点 |
| 当前时间 | cur_time | 世界状态-时间 |
| 在场角色姓名 | present_characters | 可选展示 |
| 经过的时间 | elapsed_time | 可选展示 |

不读取：row_id、上轮场景时间、是否色色。
注意：**新模板无"天数"字段**，`GameState.dayCount` 应删除。

### 2.2 主角信息表 `protagonist_info`
| content表头 | DDL字段 | 状态栏用途 |
|---|---|---|
| 姓名 | name | 主角名 |
| 性别/年龄 | gender_age | 基础信息 |
| 外貌特征 | appearance | 可选 |
| 当前衣着/装扮 | current_outfit | 可选 |
| 当前状态/伤情 | current_status | **必须展示** |
| 职业/身份 | occupation_identity | 基础信息 |
| 独特能力与咒力特性 | unique_abilities | 右栏展示 |
| 生得术式 | innate_technique | 右栏展示 |
| 术式简介 | technique_intro | 右栏展示 |
| 持有的咒具 | cursed_tools | 右栏展示 |
| 领域 | domain_expansion | 右栏展示 |
| 反转术式 | reverse_technique | 右栏展示 |
| 永久损伤 | permanent_injuries | **必须展示** |

### 2.3 主角属性表 `protagonist_stats`
| content表头 | DDL字段 | 状态栏用途 |
|---|---|---|
| 术式潜力等级 | technique_potential | 展示 |
| 术式潜力值 | technique_potential_value | 展示 |
| 术式精通等级 | technique_proficiency | 展示（替代旧proficiency） |
| 术式熔断与修复 | technique_burnout | 展示 |
| 等级 | level | 展示 |
| 经验值 | exp | meter |
| 技能点 | kp | 展示 |
| 咒力量(咒力总量) | cursed_energy_total | meter |
| 咒力当前值 | cursed_energy_current | meter |
| 咒力操纵精度 | cursed_energy_precision | 展示 |
| 咒力消耗倍率 | cursed_energy_cost_rate | 展示 |
| 基础肉体值 | base_physical | 展示 |
| 武艺值 | martial_arts | 展示 |

不读取：row_id、姓名（冗余）。
注意：**无"金钱"列**（已确认废弃）。

### 2.4 重要角色表 `important_npc`
| content表头 | DDL字段 | 状态栏用途 |
|---|---|---|
| 姓名 | name | TAB标签 |
| 性别/年龄 | gender_age | 左栏 |
| 当前状态/伤情 | current_status | **左栏展示** |
| 是否离场 | is_absent | 过滤（离场不显示TAB） |
| 职业/身份 | occupation_identity | 左栏 |
| 战力等级 | power_level | 左栏 |
| 生得术式 | innate_technique | 左栏 |
| BPA(总肉体值) | bp_a | 左栏 |
| BPB(术式强度) | bp_b | 左栏 |
| 领域 | domain_expansion | 右栏 |
| 好感度 | affection | 左栏-关系条 |
| 信任度 | trust | 左栏-关系条 |
| 关系阶段 | relationship_stage | 左栏 |

不读取：row_id、外貌特征、当前衣着/装扮、独特能力与咒力特性、人际关系、人物简介、别称、欲望值。
**关键变更：`total_bp` 已删除，改为 `bp_a` + `bp_b` 双列。**

### 2.5 扩展术式表 `extended_techniques`
| content表头 | DDL字段 | 状态栏用途 |
|---|---|---|
| 所属角色 | owner | **按角色分组的关键字段** |
| 术式/能力名称 | tech_name | 展示 |
| 类别 | tech_type | 展示 |
| 熟练度/阶段 | proficiency | 展示 |
| 效果描述 | effect_desc | 展示 |
| 简介 | brief_intro | 展示 |

### 2.6 咒灵/式神表 `shikigami_spirits`
| content表头 | DDL字段 | 状态栏用途 |
|---|---|---|
| 所属角色 | owner | **按角色分组的关键字段** |
| 名称 | spirit_name | 展示 |
| 类型 | spirit_type | 展示 |
| 起源 | origin | 可选 |
| 术式 | technique | 展示 |
| 能力简介 | ability_desc | 展示 |
| BPA(总肉体值) | bp_a | 展示 |
| BPB(术式强度) | bp_b | 展示 |
| 战力等级 | power_rank | 展示 |
| 当前状态 | current_status | 展示 |

**关键变更：`peak_bp` 已删除，改为 `bp_a` + `bp_b` 双列。**

### 2.7 束缚表 `binding_vows`
| content表头 | DDL字段 |
|---|---|
| 束缚名称 | vow_name |
| 缔结方 | parties |
| 成立条件 | conditions |
| 代价与风险 | cost_risk |
| 违约惩罚 | penalty |
| 当前状态 | status |

### 2.8 背包物品表 `inventory`
| content表头 | DDL字段 | 状态栏用途 |
|---|---|---|
| 物品名称 | item_name | 展示 |
| 拥有人 | owner | 过滤/分组 |
| 数量 | quantity | 展示 |
| 类别 | category | 分类筛选 |
| 所在位置 | current_location | 可选 |
| 描述 | description | 展示 |
| 效果 | effect | **展示（新增）** |
| 重要备注 | important_notes | 可选 |


#### 2.8.1 背包再利用交互规则

- 物品卡使用 `owner` 字段做持有人分组，`category` 字段做类别筛选；货币显示仅从主角持有且类别为 `货币` 的物品中提取。
- 再利用操作支持：使用、销毁、合成、赠予、索取、丢弃。
- 赠予模式必须限制为主角持有物品：自动切换到主角 owner 分类，非主角 owner 分类不可点击，非主角物品卡不可选；确认前必须选择目标角色。
- 索取模式必须限制为非主角物品：主角 owner 分类不可点击，主角物品卡不可选；选择来源角色后，仅该来源角色持有的物品卡可选。
- 再利用确认文案应注入酒馆输入框；预览页提供 `#send_textarea` 用于测试文案结果。

#### 2.8.2 头像与角色头部信息展示规则

- 外侧头像与设置头像弹窗预览统一为 90x120 的 3:4 长方形。
- 主角与重要角色头部信息栏统一使用强调样式，保持姓名、职业/身份、等级或战力等级的字号和右对齐行为一致。

### 2.9 任务与事件表 `quests_events`
| content表头 | DDL字段 |
|---|---|
| 任务名称 | quest_name |
| 任务评级 | quest_grade |
| 目标情报 | target_info |
| 委派方/辅助监督 | issuer |
| 详细描述 | detail_desc |
| 当前进度 | current_progress |
| 报酬与风险 | reward_penalty |

### 2.10 地图元素表 `map_elements`
| content表头 | DDL字段 |
|---|---|
| 元素名称 | element_name |
| 元素类型 | element_type |
| X坐标 | x_coord |
| Y坐标 | y_coord |
| 状态 | status |
| 描述 | description |
| 所属区域 | area |
| 传说背景 | legend_background |

---

## 3. data.js 数据模型重构

### 3.1 GameState 结构（修正后）

```javascript
const GameState = {
  // 全局
  time: '', location: '', presentChars: '', elapsedTime: '',
  // 主角信息
  protagonist: {
    name: '', genderAge: '', appearance: '', currentOutfit: '',
    currentStatus: '', occupation: '', uniqueAbilities: '',
    innateTechnique: '', techniqueIntro: '', cursedTools: '',
    domainExpansion: '', reverseTechnique: '', permanentInjuries: ''
  },
  // 主角属性
  stats: {
    level: 1, exp: 0, kp: 0,
    cursedEnergy: { total: 0, current: 0, precision: 0, costRate: 1 },
    basePhysical: 0, martialArts: 0,
    techniquePotential: '', techniquePotentialValue: 0,
    techniqueProficiency: '', techniqueBurnout: ''
  },
  // 列表
  techniques: [],   // { owner, name, type, proficiency, effect, intro }
  characters: [],   // { name, genderAge, currentStatus, isAbsent, occupation, powerLevel, innateTechnique, bpA, bpB, domain, affection, trust, relationStage }
  shikigami: [],    // { owner, name, type, origin, technique, ability, bpA, bpB, powerRank, status }
  bindings: [],     // { name, parties, condition, risk, penalty, status }
  inventory: [],    // { name, owner, quantity, category, location, desc, effect, notes }
  quests: [],       // { name, grade, target, issuer, desc, progress, reward }
  mapElements: []   // { name, type, x, y, status, desc, area, lore }
};
```

### 3.2 列名映射修正规则

每个 parse 函数的 `g(row, colName)` 调用必须：
1. 第一参数 = 新模板 `content[0]` 中的**精确中文列名**（含斜杠、括号）
2. 第二参数（fallback）= DDL 英文字段名

示例：
```javascript
// 旧（错误）
p.genderAge = g(r, '性别年龄') || g(r, 'gender_age') || '';
// 新（正确）
p.genderAge = g(r, '性别/年龄') || g(r, 'gender_age') || '';
```

### 3.3 各 parse 函数列名修正清单

#### parseGlobal
| 旧读取 | 新读取（第一优先） |
|---|---|
| '当前时间' / 'cur_time' | '当前时间' / 'cur_time' (不变) |
| '主角当前所在地点' / '当前地点' / 'current_location' | **'当前位置'** / 'current_location' |
| '天数' / 'day_count' | **删除** |
| (缺失) | **新增 '在场角色姓名' / 'present_characters'** |
| (缺失) | **新增 '经过的时间' / 'elapsed_time'** |

#### parseProtagonistInfo
| 旧读取 | 新读取 |
|---|---|
| '性别年龄' | **'性别/年龄'** |
| '当前状态' | **'当前状态/伤情'** |
| '职业身份' | **'职业/身份'** |
| (缺失) | **新增 '外貌特征' / 'appearance'** |
| (缺失) | **新增 '当前衣着/装扮' / 'current_outfit'** |
| (缺失) | **新增 '独特能力与咒力特性' / 'unique_abilities'** |
| '术式介绍' | **'术式简介'** |
| '咒具' | **'持有的咒具'** |
| '领域展开' | **'领域'** |

#### parseProtagonistStats
| 旧读取 | 新读取 |
|---|---|
| '术式潜力' | **'术式潜力等级'** |
| (缺失) | **新增 '术式潜力值' / 'technique_potential_value'** |
| (缺失) | **新增 '术式精通等级' / 'technique_proficiency'** |
| '术式熔断' | **'术式熔断与修复'** |
| '经验' | **'经验值'** |
| 'KP' | **'技能点'** |
| '咒力总量' | **'咒力量(咒力总量)'** |
| '咒力当前' | **'咒力当前值'** |
| '咒力精度' | **'咒力操纵精度'** |
| '消耗倍率' | **'咒力消耗倍率'** |
| '基础肉体' | **'基础肉体值'** |
| '武艺' | **'武艺值'** |

#### parseCharacters
| 旧读取 | 新读取 |
|---|---|
| '性别年龄' | **'性别/年龄'** |
| '职业身份' | **'职业/身份'** |
| '总BP' / 'total_bp' | **删除，改为 'BPA(总肉体值)' + 'BPB(术式强度)'** |
| (缺失) | **新增 '当前状态/伤情' / 'current_status'** |
| (缺失) | **新增 '领域' / 'domain_expansion'** |

#### parseTechniques
| 旧读取 | 新读取 |
|---|---|
| (缺失) | **新增 '所属角色' / 'owner'** |
| '术式名称' | **'术式/能力名称'** |
| '术式类型' | **'类别'** |
| '熟练度' | **'熟练度/阶段'** |

#### parseShikigami
| 旧读取 | 新读取 |
|---|---|
| (缺失) | **新增 '所属角色' / 'owner'** |
| '式神名称' | **'名称'** |
| '能力描述' | **'能力简介'** |
| '巅峰BP' / 'peak_bp' | **删除，改为 'BPA(总肉体值)' + 'BPB(术式强度)'** |
| (缺失) | **新增 '起源' / 'origin'** |

#### parseInventory
| 旧读取 | 新读取 |
|---|---|
| (缺失) | **新增 '拥有人' / 'owner'** |
| '分类' | **'类别'** |
| (缺失) | **新增 '所在位置' / 'current_location'** |
| (缺失) | **新增 '效果' / 'effect'** |
| '备注' | **'重要备注'** |

#### parseQuests
| 旧读取 | 新读取 |
|---|---|
| '评级' | **'任务评级'** |
| '委派方' | **'委派方/辅助监督'** |
| '描述' | **'详细描述'** |
| '进度' | **'当前进度'** |
| '报酬' | **'报酬与风险'** |

#### parseMapElements — 无变更（列名完全匹配）

---

## 4. UI 布局重构

### 4.1 整体结构（三段式）

```
[世界状态薄条] ← 常显，不折叠，不用panel/card
[角色档案面板] ← 可折叠，TAB切换，左右分栏
[功能面板]     ← 可折叠，TAB只保留：背包/任务/地图
```

### 4.2 世界状态薄条

取消 panel 包裹、取消折叠、取消内部 card。改为紧凑 inline 信息条：

```html
<section class="db-sb-world-strip">
  <span class="db-sb-world-item">
    <span class="db-sb-label">时间</span>
    <span class="db-sb-value">{time}</span>
  </span>
  <span class="db-sb-world-sep"></span>
  <span class="db-sb-world-item">
    <span class="db-sb-label">地点</span>
    <span class="db-sb-value">{location}</span>
  </span>
</section>
```

CSS：高度 32-36px，flex 布局，背景 `var(--db-card-2)`，无 shadow，无折叠图标。

### 4.3 角色档案面板 — 左右分栏

每个角色 TAB content 内部：

```html
<div class="db-sb-char-layout">
  <div class="db-sb-char-left"><!-- 基础信息 --></div>
  <div class="db-sb-char-right"><!-- 术式/式神/束缚 --></div>
</div>
```

CSS：`grid-template-columns: 1fr 1fr`，`@media (max-width: 360px)` fallback 为纵向堆叠。

#### 主角左栏
- 姓名、职业/身份、等级、技能点
- 当前状态/伤情、永久损伤
- EXP meter、咒力 meter
- 基础肉体值、武艺值、咒力操纵精度、咒力消耗倍率
- 术式潜力等级、术式精通等级、术式熔断与修复

#### 主角右栏
- 生得术式 + 术式简介
- 独特能力与咒力特性
- 领域、反转术式、持有的咒具
- 扩展术式列表（筛选 `owner === protagonist.name`）
- 式神列表（筛选 `owner === protagonist.name`）
- 束缚列表（筛选 `parties` 包含主角名）

#### NPC 左栏
- 姓名、职业/身份、战力等级
- 当前状态/伤情
- BPA / BPB
- 生得术式、领域
- 关系阶段、好感度条、信任度条

#### NPC 右栏
- 扩展术式（筛选 `owner === npc.name`）
- 式神（筛选 `owner === npc.name`）
- 束缚（筛选 `parties` 包含该 NPC 名）
- 若右栏为空则显示"暂无关联数据"

### 4.4 功能面板 — 只保留三个 TAB

```javascript
const tabDefs = [
  { id: 'inventory', label: '背包' },
  { id: 'quest', label: '任务' },
  { id: 'map', label: '地图' }
];
```

术式/式神/束缚 TAB 从功能面板移除（已移入角色右栏）。

### 4.5 地图功能实现状态

当前地图不再是纯骨架，代码以 `public/story_ui_lite_test/modules/db-status-bar/index.js` 为准：

- `renderFunctionPanel(S, theme)` 提供任务、刷新地图、重绘地图入口。
- `renderMapTab(S)` 渲染地图容器、SVG 视口、图例和详情区域。
- `do(root, false)` 用于刷新，优先复用 `mapCache[loc]`。
- `doMap(root, true)` 用于重绘，会清理当前地点缓存并重新生成。
- `buildMapPrompt(S)` 基于 `GameState.location` 与 `GameState.mapElements` 构造 AI 地图提示词。
- AI 生成当前通过 `AutoCardUpdaterAPI.callAI()` 尝试完成，失败时回退 `fbMap(S)` 或 `defMap(S)`。

```html
<div class="db-sb-fn-layout">
  <div class="db-sb-fn-toolbar">
    <button data-fn-action="quest">任务</button>
    <button data-map-action="refresh">刷新地图</button>
    <button data-map-action="redraw">重绘地图</button>
  </div>
  <div class="db-sb-map-viewport">
    <svg viewBox="0 0 800 600" class="db-sb-map-svg" id="db-map-svg">
      <rect width="800" height="600" fill="#f5ead0"/>
      <!-- 动态元素 -->
    </svg>
  </div>
  <div class="db-sb-map-legend"><!-- 颜色图例 --></div>
  <div class="db-sb-map-detail" id="db-map-detail"></div>
</div>
```

#### 颜色契约
| 元素类型 | 颜色 |
|---|---|
| 主角 | #ff5f9e |
| 友方 | #6bb7ff |
| 敌方 | #e74c3c |
| NPC | #f39c12 |
| 地标 | var(--db-gold) |
| 障碍物 | #95a5a6 |
| 出口 | #2ecc71 |

#### SVG 元素渲染
```javascript
mapElements.forEach((el, i) => {
  // <circle class="cm" data-idx="{i}" cx="{el.x}" cy="{el.y}" r="8" fill="{colorByType}" />
  // <text x="{el.x}" y="{el.y - 12}" text-anchor="middle">{el.name}</text>
});
```

#### 点击交互
监听 `.cm[data-idx]` 点击，在 `#db-map-detail` 中显示：元素名称、类型、状态、描述、传说背景。

---

## 5. 文件变更清单

| 文件 | 变更类型 | 说明 |
|---|---|---|
| `data.js` | 重构 | GameState 结构修正；所有 parse 函数列名对齐新模板；loadTestData 同步更新 |
| `index.js` | 重构 | renderHeaderPanel 改为 renderWorldStrip；renderProtagonistContent 左右分栏；renderCharacterContent 左右分栏；renderFunctionPanel 缩减为地图与任务布局；renderMapTab/doMap/buildMapPrompt/fbMap/defMap 构成状态栏地图链路；删除 renderTechniqueTab/renderShikigamiTab/renderBindingTab 的独立调用（逻辑移入角色右栏） |
| `style.css` | 修改 | 新增 .db-sb-world-strip、.db-sb-char-layout/-left/-right、.db-sb-map-* 样式；删除 .db-sb-world-grid/.db-sb-world-card；新增窄屏 media query |
| `preview-db-status.html` | 修改 | loadTestData 调用同步更新 |
| `STATUS_BAR_PLAN.md` | 重写 | 数据映射章节全部对齐新模板 |

---

## 6. 风险与边界条件

### 6.1 owner 字段匹配
角色右栏按 `owner === character.name` 筛选术式和式神。如果模板中 `owner` 填写的名称与 `important_npc.name` 或 `protagonist_info.name` 不完全一致（如别称），会导致匹配失败。
**缓解**：匹配时同时检查 `alias` 字段（如果后续需要）。当前设计先做精确匹配。

### 6.2 BP 展示策略
新模板用 BPA + BPB 替代单一总BP。状态栏展示两种方案：
- **方案A**：直接展示 BPA / BPB 双行
- **方案B**：计算 `总BP = max(BPA, BPB)` 并展示（按数值规则表定义）

建议采用**方案A**（直接展示双列），因为总BP的计算公式在战斗时还涉及特殊补正，静态展示 max 值可能误导。

### 6.3 窄屏适配
左右分栏在 `max-width: 360px` 时 fallback 为纵向堆叠。需要一条 media query。

### 6.4 地图实现边界
当前已做：状态栏内置 SVG 地图、地图元素点击详情、`mapCache` 无原型缓存、`mapBusy` 防重入、刷新/重绘按钮、`buildMapPrompt(S)`、`AutoCardUpdaterAPI.callAI()` 尝试生成、shujuku API 预设桥接、`fbMap(S)` / `defMap(S)` fallback、进入 DOM 前的 `sanitizeSVG()` 白名单清理。

当前未闭环：
- 管理界面地图配置分页已补 API URL、API Key、模型、代理预设四字段和保存/读取/重置/每次打开回填链路，仍需本轮验证与审计确认。
- AI 返回 SVG 的白名单清理、原子替换、失败保留旧图已接入代码，仍需安全验收。
- 工具条按钮已移除 emoji 文案并保留允许的 Unicode 几何符号，仍需搜索验证防回归。
- 实时动画仍不属于当前交付范围。

### 6.5 未验证项
- 当前文件未经浏览器实际运行验证
- `style.css` 剩余部分（L251-541）未完整审计，可能存在与新类名冲突的选择器

---

## 7. 验证方式

1. **数据层**：用 `loadTestData()` 填充符合新模板结构的测试数据，确认 `GameState` 各字段正确填充
2. **渲染层**：在 `preview-db-status.html` 中加载模块，目视确认三段式布局、左右分栏、地图 SVG 渲染
3. **交互层**：确认 TAB 切换、面板折叠、地图点击详情、背包分类筛选均正常工作
4. **回归**：确认不影响其他模块（`mvu-status-newvars` 等）的加载和渲染

---

## 8. 实施顺序建议

1. `data.js` — 修正 GameState 结构 + 所有 parse 函数列名 + loadTestData
2. `index.js` — 世界状态薄条 + 角色左右分栏 + 功能面板缩减 + 地图骨架
3. `style.css` — 新增/修改对应样式
4. `preview-db-status.html` — 同步更新
5. `STATUS_BAR_PLAN.md` — 重写数据映射章节


---

## 9. 等级颜色映射表（来源: BP系统美化正则-新变量结构-米白版本 L548-585）

| 等级标签 | 文字色 | 背景色 | 适用场景 |
|---|---|---|---|
| S级·论外 / 出神入化 / 论外熟练 | #b54a4a | rgba(181,74,74,.18) | 战力等级、武艺阶段、熟练度 |
| AA级·强特级 | #a6782a | rgba(183,154,98,.25) | 战力等级 |
| A级·特级 / 出类拔萃 / 特级熟练 | #8f5fa8 | rgba(138,129,157,.24) | 战力等级、熟练度 |
| B级·一级 / C级·准一级 / 登堂入室 / 精通 | #527999 | rgba(116,139,157,.22) | 战力等级、武艺阶段、熟练度 |
| D级·二级 / E级·三级 / 熟练 | #617f58 | rgba(127,146,124,.2) | 战力等级、熟练度 |
| F级·四级 / 入门 / 未入门 / 初步觉醒 | #6f6255 | rgba(117,107,96,.14) | 战力等级、熟练度 |

### 匹配规则（getRarityColor 函数逻辑）

```javascript
if (/论外|出神入化/.test(label)) return S级;
if (/强特级/.test(label)) return AA级;
if (/特级|出类拔萃/.test(label)) return A级;
if (/一级|准一级|登堂入室|精通/.test(label)) return B/C级;
if (/二级|三级|熟练/.test(label)) return D/E级;
其余 -> F级
```

---

## 10. 熟练度阶段进度条规则

数据来源: `TavernDB_template_咜回模板·改-夏-地图版.json` L338/L373/L389

| 阶段名 | 数值范围 | 进度条 min | 进度条 max | 颜色 |
|---|---|---|---|---|
| 初步觉醒 | 1~99 | 0 | 99 | #6f6255 |
| 入门 | 100~199 | 100 | 199 | #6f6255 |
| 精通 | 200~499 | 200 | 499 | #527999 |
| 特级熟练 | 500~799 | 500 | 799 | #8f5fa8 |
| 论外熟练 | 800+ | 800 | 1000 | #b54a4a |

进度条百分比 = (当前值 - 阶段min) / (阶段max - 阶段min) * 100

解析格式: `"阶段名(数值)"` 如 `"入门(150)"`

---

## 11. 背包物品类别染色映射

数据来源: 模板中背包物品表 category 字段定义

| 类别 | 颜色 | 说明 |
|---|---|---|
| 武器 | #b54a4a | 红系(S级色) |
| 护具 | #527999 | 蓝系(B/C级色) |
| 消耗品 | #617f58 | 绿系(D/E级色) |
| 材料 | #6f6255 | 灰棕系(F级色) |
| 货币 | #a6782a | 金系(AA级色) |
| 文件 | #8f5fa8 | 紫系(A级色) |
| 饰品 | #8f5fa8 | 紫系(A级色) |
| 衣物 | #527999 | 蓝系(B/C级色) |
| 杂物 | var(--db-muted) | 默认灰 |

应用方式: 物品卡片左边框 3px solid 对应颜色
