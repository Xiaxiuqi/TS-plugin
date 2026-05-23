# Embedded Tables 可读总览

- 来源文件: `docs/nsfw状态栏/RP表格sql.json`
- 生成时间: 2026-04-20T02:45:29.838Z

这个文件用于快速总览；分表版本位于 `readable/` 目录。

## 表单目录

- 纪要表
- 全局数据表
- 选项表
- 重要人物表
- 主角技能表
- 主角信息
- 资产表
- NSFW信息表

## 纪要表

- uid: `sheet_3NoMc1wI`
- orderNo: 5

## 可编辑说明

- 可以直接修改 `## 说明`，会回写到 `sourceData.note`。
- 可以直接修改 `## 更新规则`，但必须保持以下四行格式：`- 初始化: ...`、`- 更新: ...`、`- 插入: ...`、`- 删除: ...`。
- 可以直接修改 `## DDL` 中的 SQL，会回写到 `sourceData.ddl`（仅 SQLite 模式需要）。
- 可以直接修改 `## 当前内容` 下的 Markdown 表格，会回写到 `content`。
- 可以直接修改 `## 更新配置` 中的 JSON，会回写到 `updateConfig`，适合调整上下文深度、批次、更新频率等运行参数。
- 可以直接修改 `## 导出配置` 中的 JSON，会回写到 `exportConfig`，适合调整分组参数、导出参数与注入位置。
- 不要修改 `# 表名`、`uid`、`orderNo`。这些字段当前仅用于展示，不参与回写。
- 修改完成后，运行回包流程即可自动同步到 `embedded-template.pretty.json`。

## 说明

- 轮次日志，每轮交互后必须立即插入一条新记录。
- 【列定义】
- - 列1: 时间跨度 - 本轮事件发生的精确时间范围。
- - 列2: 地点 - 本轮事件发生的地点，从大到小描述（例如：国家-城市-具体地点）。
- - 列3: 纪要 - 【视角要求】
- 绝对客观的第三人称视角
- 【必须记录】
- - 核心事件链：详尽记录因果关系（Action-Reaction）。
- - 高保真交互：对话内容、位置移动、物品交互、战斗动作等。
- - 情绪和身体表现：角色直接表现出的明显情绪(如高兴、愤怒)和身体变化。
- 【必须记录 - 关键情报实体】
- - 核心名词：提到的人名、地名、物品专有名词。
- - 数值与等级：明确出现的金额、数量、等级判定。
- - 关键对话原文：必须保留引发剧情冲突或推动关系变化的重要对白（需标明由谁说的）。
- 【严禁内容】
- - 主观臆测角色的内心想法。
- - 主观评价（如"这一举动标志着..."、"双方关系发生实质性转变"）。
- - 对权力结构、社会关系进行抽象定性（**严禁**使用"确立了...地位"、"形成了...格局"、"奠定了...基础"等总结性措辞）。
- - 文青式的修饰和升华。
- - 使用"生理性"、"物理性"等学术前缀修饰。
- - 使用模糊的形容词。
- 注：允许描述显而易见的因果逻辑（如"因受到惊吓而..."、"为了掩饰尴尬而..."）。
- 【NSFW/亲密场景纪要规则】涉及性行为的场景，纪要仅记录「行为事实」，严禁记录「感官过程」：
- 必须记录：谁主动发起/引导、发生了什么行为(口交/插入等)、使用了什么体位、高潮次数及强度(如首次潮吹)、身体里程碑(破处/初次后庭/中出等)、过程中的关键对话、事后反应和态度变化。
- 严禁记录：体液细节描写、声音/呻吟描写(NSFW表列13已存)、节奏和力度变化、肌肤触感和温度(NSFW表列7已存)、生殖器交合过程的文学描写。
- 本质：把NSFW纪要当成「性行为事实清单」而非「情色小说摘抄」。
- 【整体要求】
- 不回避任何敏感内容，以还原事实经过、前因后果为目标进行总结。不仅要概括结果，必须保留引发剧情冲突的对话细节。总字数≥300且≤450，确保AI阅读总结后能无损还原当前场景。如果未总结的上下文包含多轮交互，将其总结为一条记录。
- - 列4: 概览 - 30字以内，一句话概括纪要内容。
- - 列5: 编码索引 - 格式为 AMXXXX，XXXX从0001递增。

## 更新规则

- 初始化: 故事初始化时，插入一条新记录用于记录初始化剧情。
- 更新: 禁止操作。
- 插入: 每轮交互结束后插入一条新记录。
  SQL示例: INSERT INTO chronicle (row_id, time_span, location, chronicle_text, summary, code_index) VALUES ((SELECT COALESCE(MAX(row_id),0)+1 FROM chronicle), '2024-03-15 14:00~15:00', '王城·中央广场', '本轮纪要内容...', '一句话概括', 'AM0002');
- 删除: 禁止删除。

## DDL

```sql
CREATE TABLE chronicle ( -- 纪要表
  row_id INTEGER PRIMARY KEY, -- 行号
  time_span TEXT NOT NULL, -- 时间跨度
  location TEXT NOT NULL, -- 地点
  chronicle_text TEXT NOT NULL, -- 纪要
  summary TEXT CHECK(summary IS NULL OR LENGTH(summary) <= 30), -- 概览
  code_index TEXT NOT NULL UNIQUE CHECK(code_index GLOB 'AM[0-9][0-9][0-9][0-9]') -- 编码索引
);
```

## 当前内容

| 时间跨度 | 地点 | 纪要 | 概览 | 编码索引 |
| --- | --- | --- | --- | --- |

## 更新配置

```json
{
  "uiSentinel": -1,
  "contextDepth": -1,
  "updateFrequency": -1,
  "batchSize": -1,
  "skipFloors": -1
}
```

## 导出配置

```json
{
  "enabled": true,
  "splitByRow": true,
  "entryName": "纪要",
  "entryType": "keyword",
  "keywords": "编码索引",
  "preventRecursion": true,
  "injectionTemplate": "<记忆回溯>\n$1\n</记忆回溯>",
  "extraIndexEnabled": true,
  "extraIndexEntryName": "纪要索引",
  "extraIndexColumns": [
    "概览",
    "编码索引"
  ],
  "extraIndexColumnModes": {
    "概览": "index_only",
    "编码索引": "both"
  },
  "extraIndexInjectionTemplate": "<已发生的事件概览>\n$1\n</已发生的事件概览>",
  "entryPlacement": {
    "position": "at_depth_as_system",
    "depth": 999,
    "order": 10000
  },
  "extraIndexPlacement": {
    "position": "at_depth_as_system",
    "depth": 1000,
    "order": 10010
  },
  "fixedEntryPlacement": {
    "position": "at_depth_as_system",
    "depth": 9999,
    "order": 99987
  },
  "fixedIndexPlacement": {
    "position": "at_depth_as_system",
    "depth": 9999,
    "order": 99988
  }
}
```


## 全局数据表

- uid: `sheet_dCudvUnH`
- orderNo: 0

## 可编辑说明

- 可以直接修改 `## 说明`，会回写到 `sourceData.note`。
- 可以直接修改 `## 更新规则`，但必须保持以下四行格式：`- 初始化: ...`、`- 更新: ...`、`- 插入: ...`、`- 删除: ...`。
- 可以直接修改 `## DDL` 中的 SQL，会回写到 `sourceData.ddl`（仅 SQLite 模式需要）。
- 可以直接修改 `## 当前内容` 下的 Markdown 表格，会回写到 `content`。
- 可以直接修改 `## 更新配置` 中的 JSON，会回写到 `updateConfig`，适合调整上下文深度、批次、更新频率等运行参数。
- 可以直接修改 `## 导出配置` 中的 JSON，会回写到 `exportConfig`，适合调整分组参数、导出参数与注入位置。
- 不要修改 `# 表名`、`uid`、`orderNo`。这些字段当前仅用于展示，不参与回写。
- 修改完成后，运行回包流程即可自动同步到 `embedded-template.pretty.json`。

## 说明

- 记录当前主角所在地点及时间相关参数。此表有且仅有一行。
- 【列速查】列1=地点 | 列2=当前时间 | 列3=上轮时间 | 列4=经过时间 | 列5=天气
- 【列定义】
- - 列1: 主角当前所在地点 - 主角当前所在的具体位置，要求精确到房间/分区级别。格式：「大地点名称-具体房间」，如「某某的家-客厅」「某别墅-卧室」「咖啡厅-二楼靠窗座位」。跨大地点移动时更新整个字段；同一大地点内跨房间移动时仅更新房间部分。
- - 列2: 当前时间 - 游戏世界的当前时间。格式示例：「2024年3月15日 14:30」，年月日时分均须精确填写，禁止使用任何占位符或未知数。初始化时若剧情无明确日期时间，须根据世界观自行设定合理值。具体年月叫法依据当前世界观。
- - 列3: 上轮场景时间 - 上一轮交互结束时的时间，格式与列2相同。
- - 列4: 经过的时间 - 根据当前与上轮时间计算得出的文本描述(如:约15分钟、约2小时)。
- - 列5: 当前天气/环境 - 当前场景的天气与自然环境状态。现代都市场景填写天气(如:晴天、暴雨、雾霾)；古风场景填写天气与季节氛围(如:初春细雨、寒冬大雪)；修仙场景还需额外描述灵气环境(如:灵气稀薄、天劫将至、灵气潮汐涌动)。初始化时根据剧情和世界观合理推断，不能留空。每轮视剧情变化更新。

## 更新规则

- 初始化: 插入一条关于当前世界状态的记录。
- 更新: 【时间更新——必须严格按以下三步顺序在同一次操作中完成，禁止只更新其中部分列】
  ① 先将「当前时间」现有值原样复制写入「上轮场景时间」；
  ② 再将「当前时间」更新为本轮结束时的新时间；
  ③ 最后根据②与①之差计算并更新「经过的时间」（如：约15分钟、约2小时）。
  【地点更新】主角离开当前区域时更新「主角当前所在地点」。
  【天气更新】天气/环境发生变化时（天气转变、进入特殊区域等）更新「当前天气/环境」。
  【操作完整性自检】在本轮所有表格操作结束前，必须确认「上轮场景时间」「当前时间」「经过的时间」三列均已在本次操作中被更新；若任一列缺失，须立即补全，否则视为操作不完整，禁止结束本轮更新。
  【防列偏移自检】写入前检查：列1的值必须为地点格式（含大地点-房间的结构），列2/列3必须为时间格式（含年月日和数字时间）。若列1出现时间格式或列2出现地点格式，须立刻回退并按正确列重新写入。
  SQL示例: UPDATE global_data SET current_location = '新地点', prev_scene_time = cur_time, cur_time = '2024-03-15 16:00', elapsed_time = '约1小时', weather = '晴天' WHERE row_id = 1;
- 插入: 禁止操作。
- 删除: 禁止删除。

## DDL

```sql
CREATE TABLE global_data ( -- 全局数据表
  row_id INTEGER PRIMARY KEY, -- 行号
  current_location TEXT NOT NULL, -- 主角当前所在地点
  cur_time TEXT NOT NULL CHECK(cur_time GLOB '????-??-?? ??:??'), -- 当前时间
  prev_scene_time TEXT, -- 上轮场景时间
  elapsed_time TEXT, -- 经过的时间
  weather TEXT NOT NULL -- 当前天气/环境
);
```

## 当前内容

| 主角当前所在地点 | 当前时间 | 上轮场景时间 | 经过的时间 | 当前天气/环境 |
| --- | --- | --- | --- | --- |

## 更新配置

```json
{
  "uiSentinel": -1,
  "contextDepth": -1,
  "updateFrequency": -1,
  "batchSize": -1,
  "skipFloors": -1
}
```

## 导出配置

```json
{
  "enabled": false,
  "splitByRow": false,
  "entryName": "全局数据表",
  "entryType": "constant",
  "keywords": "",
  "preventRecursion": true,
  "injectionTemplate": "",
  "extraIndexEnabled": false,
  "extraIndexEntryName": "全局数据表-索引",
  "extraIndexColumns": [],
  "extraIndexColumnModes": {},
  "extraIndexInjectionTemplate": "",
  "entryPlacement": {
    "position": "at_depth_as_system",
    "depth": 2,
    "order": 10000
  },
  "extraIndexPlacement": {
    "position": "at_depth_as_system",
    "depth": 2,
    "order": 10010
  },
  "fixedEntryPlacement": {
    "position": "before_character_definition",
    "depth": 2,
    "order": 99981
  },
  "fixedIndexPlacement": {
    "position": "before_character_definition",
    "depth": 2,
    "order": 99982
  }
}
```


## 选项表

- uid: `sheet_OptionsNew`
- orderNo: 6

## 可编辑说明

- 可以直接修改 `## 说明`，会回写到 `sourceData.note`。
- 可以直接修改 `## 更新规则`，但必须保持以下四行格式：`- 初始化: ...`、`- 更新: ...`、`- 插入: ...`、`- 删除: ...`。
- 可以直接修改 `## DDL` 中的 SQL，会回写到 `sourceData.ddl`（仅 SQLite 模式需要）。
- 可以直接修改 `## 当前内容` 下的 Markdown 表格，会回写到 `content`。
- 可以直接修改 `## 更新配置` 中的 JSON，会回写到 `updateConfig`，适合调整上下文深度、批次、更新频率等运行参数。
- 可以直接修改 `## 导出配置` 中的 JSON，会回写到 `exportConfig`，适合调整分组参数、导出参数与注入位置。
- 不要修改 `# 表名`、`uid`、`orderNo`。这些字段当前仅用于展示，不参与回写。
- 修改完成后，运行回包流程即可自动同步到 `embedded-template.pretty.json`。

## 说明

- 记录每轮主角可以进行的动作选项。有且仅有一行。每轮交互后更新。
- 【格式约束】
- - 列1-列4的每个选项必须是具体动作/祈使句，≤25字，禁止写叙述性段落。
- - 列5(NSFW/亲密)选项可适当详细，≤40字，需描述具体的亲密互动动作或调情方式，方便玩家直接选择而无需额外输入。
- 【列定义】
- - 列1: 选项一(推进剧情) - 推动当前核心剧情发展的行动。
- - 列2: 选项二(社交/交互) - 与当前在场角色互动或建立关系的行动。
- - 列3: 选项三(谨慎/保守) - 低风险、稳妥的应对方式。
- - 列4: 选项四(大胆/激进) - 高风险但高回报的冒险行动。
- - 列5: 选项五(NSFW/亲密) - 与当前场景相关的亲密、暧昧或情色互动行动，需描述具体动作意图而非模糊暗示；若场景完全不适合则用擦边球/调情代替。

## 更新规则

- 初始化: 游戏初始化时，生成五个初始选项。
- 更新: 每轮交互后必须更新此表，覆盖原有内容。
  SQL示例: UPDATE options SET option_a = '新选项一', option_b = '新选项二', option_c = '新选项三', option_d = '新选项四', option_nsfw = '新选项五' WHERE row_id = 1;
- 插入: 禁止操作。
- 删除: 禁止删除。

## DDL

```sql
CREATE TABLE options ( -- 选项表
  row_id INTEGER PRIMARY KEY, -- 行号
  option_a TEXT NOT NULL CHECK(LENGTH(option_a) <= 25), -- 选项一(推进剧情)
  option_b TEXT NOT NULL CHECK(LENGTH(option_b) <= 25), -- 选项二(社交/交互)
  option_c TEXT NOT NULL CHECK(LENGTH(option_c) <= 25), -- 选项三(谨慎/保守)
  option_d TEXT NOT NULL CHECK(LENGTH(option_d) <= 25), -- 选项四(大胆/激进)
  option_nsfw TEXT NOT NULL CHECK(LENGTH(option_nsfw) <= 40) -- 选项五(NSFW/亲密)
);
```

## 当前内容

| 选项一(推进剧情) | 选项二(社交/交互) | 选项三(谨慎/保守) | 选项四(大胆/激进) | 选项五(NSFW/亲密) |
| --- | --- | --- | --- | --- |

## 更新配置

```json
{
  "uiSentinel": -1,
  "contextDepth": -1,
  "updateFrequency": -1,
  "batchSize": -1,
  "skipFloors": -1
}
```

## 导出配置

```json
{
  "enabled": false,
  "splitByRow": false,
  "entryName": "选项表",
  "entryType": "constant",
  "keywords": "",
  "preventRecursion": true,
  "injectionTemplate": "",
  "extraIndexEnabled": false,
  "extraIndexEntryName": "选项表-索引",
  "extraIndexColumns": [],
  "extraIndexColumnModes": {},
  "extraIndexInjectionTemplate": "",
  "entryPlacement": {
    "position": "at_depth_as_system",
    "depth": 2,
    "order": 10000
  },
  "extraIndexPlacement": {
    "position": "at_depth_as_system",
    "depth": 2,
    "order": 10010
  },
  "fixedEntryPlacement": {
    "position": "at_depth_as_system",
    "depth": 2,
    "order": 99990
  },
  "fixedIndexPlacement": {
    "position": "at_depth_as_system",
    "depth": 2,
    "order": 99991
  },
  "injectIntoWorldbook": false
}
```


## 重要人物表

- uid: `sheet_NcBlYRH5`
- orderNo: 2

## 可编辑说明

- 可以直接修改 `## 说明`，会回写到 `sourceData.note`。
- 可以直接修改 `## 更新规则`，但必须保持以下四行格式：`- 初始化: ...`、`- 更新: ...`、`- 插入: ...`、`- 删除: ...`。
- 可以直接修改 `## DDL` 中的 SQL，会回写到 `sourceData.ddl`（仅 SQLite 模式需要）。
- 可以直接修改 `## 当前内容` 下的 Markdown 表格，会回写到 `content`。
- 可以直接修改 `## 更新配置` 中的 JSON，会回写到 `updateConfig`，适合调整上下文深度、批次、更新频率等运行参数。
- 可以直接修改 `## 导出配置` 中的 JSON，会回写到 `exportConfig`，适合调整分组参数、导出参数与注入位置。
- 不要修改 `# 表名`、`uid`、`orderNo`。这些字段当前仅用于展示，不参与回写。
- 修改完成后，运行回包流程即可自动同步到 `embedded-template.pretty.json`。

## 说明

- 记录所有关键NPC的核心身份信息与当前动态状态。重要人物表压缩为12列，优先保证检索清晰、更新稳定、避免串列。
- 【列速查】列1=姓名|列2=性别/年龄|列3=身份标签|列4=外貌|列5=当前衣着|列6=所在/离场|列7=对主角认知|列8=当前态度|列9=关系定位|列10=诉求/目标|列11=关键经历|列12=别称
- 【列定义】
- - 列1: 姓名 - NPC的名字。角色死亡时在姓名后标注(已死亡)。本列为唯一键，禁止出现同名多行；比较姓名时必须先做标准化（去掉尾部状态后缀(已离场)/(已死亡)后再比对）。
- - 列2: 性别/年龄 - 生理性别和年龄。格式：男/女，XX岁。
- - 列3: 身份标签 - 一句话身份定位，优先写社会身份、职业阶层、阵营定位或世界观身份，如「刑警队长」「财阀千金」「宗门执事」「黑市情报贩」。控制在16字内，低频更新。
- - 列4: 外貌特征 - 固有外貌特征，必须包含：发型、发色、身高、身材、肤色、五官。女性角色可补充三围和体重数据。严禁包含神态、服装、姿势或临时状态。除非身体出现永久性改变，否则不更新。初始化时若正文未明确某项外貌特征，允许根据角色身份、年龄及世界观合理推断补全，但须保证逻辑一致。
- - 列5: 当前衣着/装扮 - 当前穿着必须使用半结构化格式："上身：...；下身：...；内层：...；鞋袜：...；配饰：..."。未明确的穿着根据场景推断。脱下的服装在对应条目后标注(脱)但不删除。仅当服装完全损毁、丢失或重新更换时删除旧条目。明确不穿内衣/内裤时写入对应部位。【严禁在本列记录生理状态、体液或性行为相关内容。】若某件服饰属于主角赠送、专门定制、角色标志性穿搭或后续会反复提及的关键服饰，可在对应部位后追加极短标记，如"(主角赠)""(定制)""(常穿)"；详细材质、结构、来源与关系意义不得堆在本列，应转记到资产表。
- - 列6: 当前所在/是否离场 - 使用固定格式："在场：地点"、"离场：去向"、"失联"或"已死亡"。禁止只写是/否。
- - 列7: 对主角认知 - 该NPC已掌握、正在怀疑、试图探明或存在误解的主角信息。格式：数字列表（1. 2. 3.），每项不超过18字，并在条目前加标记【已知】或【存疑】。示例：「1. 【已知】主角住在旧城区；2. 【存疑】主角可能认识某人」。上限6项，超限时删除最旧条目。【⚠️本列是全表唯一可以使用【已知】/【存疑】标签和编号认知列表的列。】列7只写一次，写完后直接跳到列8，严禁将更新后的认知列表再写一遍到列8。
- - 列8: 当前态度 - 该NPC对主角的当前态度与情绪倾向。【⚠️格式硬约束：必须是一句非列表的短语（≤24字），如「友善且信任」「表面配合但警惕」「暧昧试探」。严禁使用编号列表、严禁包含【已知】或【存疑】标签。】若发现列8的值中包含「1. 」「2. 」编号格式、或「【已知】」「【存疑】」标签，则100%发生了列7→列8串列错误：此时必须丢弃该值，回退思考该NPC的真实态度，重新写入一句态度短语。
- - 列9: 关系定位 - 该角色与主角及其他重要角色的明确关系。优先记录与主角的关系，其次记录与其他NPC的关键关系（如亲属、上下级、情侣）。用分号分隔多重关系。格式示例：「主角的母亲」「主角的客户；某角色的亲姐姐」「主角的盟友；某角色的上司」。仅记录设定中明确或正文中已体现的关系，不得推测。
- - 列10: 当前诉求/目标 - 记录该NPC当前最直接、最重要的意图或行动目标。用短语或短句表示，控制在20字内，如"试探主角底细"、"稳住合作关系"、"尽快摆脱警方调查"。只写眼下目标，不写长期人生理想。
- - 列11: 关键经历 - 记录遭遇主角后的重要事件摘要，只保留关键节点，不写流水账。格式：数字列表1、2、3。每条≤30token，总数上限8条；达到8条时，立即将时间最早且内容最相近的2-3条合并为1条。必须使用客观中性表述。
- - 列12: 别称 - 记录角色的别名、外号、爱称、常用称呼。逗号分隔。初始化时若无明确别称，默认填写姓名中的名或姓+身份称呼，不可留空。

## 更新规则

- 初始化: 游戏初始化时为当前在场的重要人物分别插入一个条目。
- 更新: 【同名覆盖规则】以列1姓名为唯一键。更新前先按标准化姓名匹配（去掉尾部(已离场)/(已死亡)后比较）；命中同名时必须在原行updateRow覆盖变化列，禁止insertRow重复建档。
  同名覆盖时仅更新本轮发生变化的列；姓名、身份标签、固有外貌在无新证据时禁止改写或清空。
  - 列2(性别/年龄)：年龄变化时更新。
  - 列3(身份标签)：社会身份、职位、阵营身份发生明确变化时更新，平时保持稳定。
  - 列4(外貌特征)：身体出现永久性改变时更新。
  - 列5(当前衣着/装扮)：更换服装、脱下服装、服装损毁时更新，且必须保持"上身：...；下身：...；内层：...；鞋袜：...；配饰：..."格式。若当前穿着中出现主角赠送、专门定制、标志性穿搭或反复被点名的关键服饰，只允许追加极短标记；详细材质、特殊设计、开合结构、来源和意义必须写入资产表，不得塞进本列。
  - 列6(当前所在/是否离场)：角色离开、返回、失联或死亡时更新，必须使用固定格式。
  - 列7(对主角认知)：NPC获得新情报、形成新怀疑、消除误解时更新；新增条目时必须标注【已知】或【存疑】。
  - 列8(当前态度)：随互动和剧情发展实时更新态度变化。只能写非列表的态度短语，禁止写认知列表、事件列表或关系定义。
  - 列9(关系定位)：【低频更新】仅当关系发生实质性质变时更新（如从客户变为情人、从陌生人变为盟友），日常互动中态度升温不算关系变化。无变化时此列保持原值不动，禁止每轮都改写。只能写关系定义，不得写情绪评价、认知列表或行动目标。
  - 列10(当前诉求/目标)：当前直接目标发生改变、完成或被迫中断时更新，始终保留最重要的一项。只能写短目标，不得写关系定义或事件摘要。
  - 列11(关键经历)：发生关键事件时添加新条目。【强制合并】每次新增条目后立即计数：若超过8条，必须当轮立即将时间最早且内容最相近的2-3条合并为1条。合并失败（即下轮仍超8条）视为操作错误。只能写编号事件摘要列表。
  - 列12(别称)：角色获得新的别名、外号、爱称或常用称呼变化时更新。只能写称呼集合，逗号分隔，禁止写事件列表。【防串列硬校验】列12仅允许填写称呼/名字/外号，严禁出现动词、事件描述或编号列表。若列12的值中包含"1. ""2. "等数字编号列表格式或动词短语，则说明发生了列11到列12的串列错误，须立即回退并仅重试正确列。
  【防串列校验】重要人物表写入前必须先做键位核对：列5=当前衣着/装扮，列6=当前所在/是否离场，列7=对主角认知，列8=当前态度，列9=关系定位，列10=当前诉求/目标，列11=关键经历，列12=别称。严禁把衣着写入列6/列7/列10，严禁把地点写入列5/列7/列10；严禁把列7认知列表写入列8；严禁把列8态度短语写入列9；严禁把列9关系定义写入列10；严禁把列11事件列表写入列12。
  【值校验——硬格式拦截】每次写入列7-12时，必须执行以下拦截检查：
  ·列7：必须是编号认知列表且含【已知】或【存疑】标签。
  ·列8：必须是≤24字的态度短语。【拦截规则】若值中出现「1. 」「2. 」编号格式或「【已知】」「【存疑】」字样→此值属于列7，立即停止写入列8，检查是否把列7的内容写了两遍，然后重新为列8生成态度短语。
  ·列9：必须是关系定义短语且包含「的」字（如「主角的XX」「XX的闺蜜」），不含编号。若值中不含「的」字且像动作/意图短句→可能是列10串到列9，立即回退。
  ·列10：必须是≤20字的动作/意图目标短句，不含「XX的XX」关系表达。若值中包含关系定义→可能是列9串到列10，立即回退。
  ·列11：必须是编号事件摘要列表。
  ·列12：必须是逗号分隔的称呼集合，不含动词或编号。
  若列5不含「上身：」等结构标签→拦截。若列6不含「在场：」或「离场：」→拦截。
  以上任一拦截触发时，保留原值不覆盖，重新生成正确内容。
  SQL示例: UPDATE important_characters SET location_status = '在场：王城·中央广场', attitude = '友善且信任' WHERE name = '角色名';
- 插入: 【同名去重优先】插入前必须先按标准化姓名查重（去掉尾部(已离场)/(已死亡)后比较）：命中同名→禁止insert，改为对原行updateRow覆盖变化字段；未命中→才允许insertRow。
  【入表门槛——必须同时满足以下两条才可插入】
  ① 角色拥有明确的专属姓名（非"店员""路人""侍卫甲"等泛称或临时称呼）；
  ② 与主角存在实质剧情关联：有持续性互动、掌握关键信息、影响剧情走向，或预期后续还会出现。
  仅满足其一或两条均不满足的角色（如一次性交易的店铺NPC、背景群演、仅有一两句对话的路人）禁止入表。
  新增女性角色时，若该角色档案来自<正文数据>中的<archive>标签→必须同步在NSFW信息表创建对应条目，确保14列均有实质内容。若该角色档案来自<背景设定>中的<角色档案_XX>标签→禁止在NSFW表建档（世界书角色）。
  【⚠️绝对禁止重复建档】即使角色从"离场"变为"在场"，也必须先按姓名查重，命中后用updateRow更新列6为"在场：新地点"，严禁insertRow创建第二行。查重必须在任何insert操作之前执行。
  SQL示例: INSERT INTO important_characters (row_id, name, gender_age, identity_tag, appearance, current_outfit, location_status, knowledge_of_protagonist, attitude, relationship, current_goal, key_events, aliases) VALUES ((SELECT COALESCE(MAX(row_id),0)+1 FROM important_characters), '角色名', '女/20', '身份标签', '外貌描述', '上身：…；下身：…；内层：…；鞋袜：…；配饰：…', '在场：某地', '1. 【已知】某信息', '友善', '主角的XX', '某目标', '1. 初次登场', '昵称');
- 删除: 【临时NPC立即删除规则】以下情况须立即删除该NPC条目，禁止保留：
  ① 该NPC姓名为泛称/无专名（如"店员""路人甲""侍卫""士兵""行人""小厮"等），且在剧情中仅出现1次、后续无再登场迹象；
  ② 该NPC与主角仅有一次性、无实质剧情关联的互动（如问路、单次买卖完成），且后续明确不会再出现；
  满足以上任一条件，本轮互动结束后立即删除，不得保留。
  【具名NPC保留规则】拥有明确专属姓名（非泛称）的NPC，即使暂时离场也禁止删除，在姓名后标注(已离场)或(已死亡)保留条目。
  SQL示例: DELETE FROM important_characters WHERE name = '路人甲';

## DDL

```sql
CREATE TABLE important_characters ( -- 重要人物表
  row_id INTEGER PRIMARY KEY, -- 行号
  name TEXT NOT NULL UNIQUE, -- 姓名
  gender_age TEXT, -- 性别/年龄
  identity_tag TEXT CHECK(identity_tag IS NULL OR LENGTH(identity_tag) <= 16), -- 身份标签
  appearance TEXT, -- 外貌特征
  current_outfit TEXT, -- 当前衣着/装扮
  location_status TEXT NOT NULL, -- 当前所在/是否离场
  knowledge_of_protagonist TEXT, -- 对主角认知
  attitude TEXT CHECK(attitude IS NULL OR LENGTH(attitude) <= 24), -- 当前态度
  relationship TEXT, -- 关系定位
  current_goal TEXT CHECK(current_goal IS NULL OR LENGTH(current_goal) <= 20), -- 当前诉求/目标
  key_events TEXT, -- 关键经历
  aliases TEXT -- 别称
);
```

## 当前内容

| 姓名 | 性别/年龄 | 身份标签 | 外貌特征 | 当前衣着/装扮 | 当前所在/是否离场 | 对主角认知 | 当前态度 | 关系定位 | 当前诉求/目标 | 关键经历 | 别称 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## 更新配置

```json
{
  "uiSentinel": -1,
  "contextDepth": -1,
  "updateFrequency": -1,
  "batchSize": -1,
  "skipFloors": -1
}
```

## 导出配置

```json
{
  "enabled": true,
  "splitByRow": true,
  "entryName": "重要人物表",
  "entryType": "keyword",
  "keywords": "姓名,别称",
  "preventRecursion": true,
  "injectionTemplate": "",
  "extraIndexEnabled": true,
  "extraIndexEntryName": "重要人物表-索引",
  "extraIndexColumns": [
    "姓名",
    "当前所在/是否离场",
    "当前态度",
    "别称"
  ],
  "extraIndexColumnModes": {
    "姓名": "both",
    "当前所在/是否离场": "both",
    "当前态度": "both",
    "别称": "index_only"
  },
  "extraIndexInjectionTemplate": "以下为已经登场过的重要角色：\n<已登场角色>\n$1\n</已登场角色>",
  "entryPlacement": {
    "position": "at_depth_as_system",
    "depth": 10000,
    "order": 10000
  },
  "extraIndexPlacement": {
    "position": "at_depth_as_system",
    "depth": 10000,
    "order": 8000
  },
  "fixedEntryPlacement": {
    "position": "at_depth_as_system",
    "depth": 10000,
    "order": 99983
  },
  "fixedIndexPlacement": {
    "position": "at_depth_as_system",
    "depth": 10000,
    "order": 99984
  }
}
```


## 主角技能表

- uid: `sheet_lEARaBa8`
- orderNo: 3

## 可编辑说明

- 可以直接修改 `## 说明`，会回写到 `sourceData.note`。
- 可以直接修改 `## 更新规则`，但必须保持以下四行格式：`- 初始化: ...`、`- 更新: ...`、`- 插入: ...`、`- 删除: ...`。
- 可以直接修改 `## DDL` 中的 SQL，会回写到 `sourceData.ddl`（仅 SQLite 模式需要）。
- 可以直接修改 `## 当前内容` 下的 Markdown 表格，会回写到 `content`。
- 可以直接修改 `## 更新配置` 中的 JSON，会回写到 `updateConfig`，适合调整上下文深度、批次、更新频率等运行参数。
- 可以直接修改 `## 导出配置` 中的 JSON，会回写到 `exportConfig`，适合调整分组参数、导出参数与注入位置。
- 不要修改 `# 表名`、`uid`、`orderNo`。这些字段当前仅用于展示，不参与回写。
- 修改完成后，运行回包流程即可自动同步到 `embedded-template.pretty.json`。

## 说明

- 记录主角获得的所有技能项目。
- 【列定义】
- - 列1: 技能名称 - 技能的名称。
- - 列2: 技能类型 - 如:"被动"、"主动"、"固有"、"职业"、"性爱"。
- - 列3: 等级/阶段 - 当前等级(固有技能可标为"固有")。
- - 列4: 效果描述 - 具体效果。

## 更新规则

- 初始化: 游戏初始化时，根据设定添加初始技能。
- 更新: 已有技能被升级或强化时，更新其等级/阶段和效果描述。
  - 固有技能：如设定中固有技能可成长，则可更新效果描述，但类型保持"固有"。
  - 非固有技能：可通过训练、实战、顿悟等方式升级，更新等级和效果。
  - 技能升级须有合理的触发条件，如完成特定任务、达到使用次数、获得指导等。
  - 升级后的效果描述须明确体现出与之前等级的差异。
  SQL示例: UPDATE protagonist_skills SET level_stage = 'Lv.3', effect_desc = '新效果描述' WHERE skill_name = '火球术';
- 插入: 主角获得新的技能时添加。
  - 新技能的获得须有合理的剧情支撑，如学习、传授、觉醒、奖励等。
  - 根据技能性质选择合适的类型标签："被动"、"主动"、"职业"、"性爱"、"生活"、"战斗"等。
  - 初始等级根据获得方式决定：学习通常从1级开始，传授可能直接获得高等级，觉醒可能直接达到成熟阶段。
  - 效果描述须具体明确，避免模糊表述。
  SQL示例: INSERT INTO protagonist_skills (row_id, skill_name, skill_type, level_stage, effect_desc) VALUES ((SELECT COALESCE(MAX(row_id),0)+1 FROM protagonist_skills), '新技能', '主动', 'Lv.1', '效果描述');
- 删除: 【删除规则】以下情况删除对应行：
  ① 技能因剧情被永久剥夺（如被封印、被废除、被移除）时删除；
  ② 技能被同类新技能直接替换（即新技能与旧技能功能高度重叠、旧技能不再存在）时，删除旧技能行，同轮插入新技能行；注意区分"替换"与"升级"：升级指同一技能提升等级（执行updateNode），替换指旧技能彻底消失由完全不同的新技能取代（执行delete+insert）。
  固有技能不可删除，固有技能的"替换"按升级处理（updateNode）。
  SQL示例: DELETE FROM protagonist_skills WHERE skill_name = '被剥夺的技能';

## DDL

```sql
CREATE TABLE protagonist_skills ( -- 主角技能表
  row_id INTEGER PRIMARY KEY, -- 行号
  skill_name TEXT NOT NULL UNIQUE, -- 技能名称
  skill_type TEXT NOT NULL CHECK(skill_type IN ('被动', '主动', '固有', '职业', '性爱', '生活', '战斗')), -- 技能类型
  level_stage TEXT NOT NULL, -- 等级/阶段
  effect_desc TEXT -- 效果描述
);
```

## 当前内容

| 技能名称 | 技能类型 | 等级/阶段 | 效果描述 |
| --- | --- | --- | --- |

## 更新配置

```json
{
  "uiSentinel": -1,
  "contextDepth": -1,
  "updateFrequency": -1,
  "batchSize": -1,
  "skipFloors": -1
}
```

## 导出配置

```json
{
  "enabled": false,
  "splitByRow": false,
  "entryName": "主角技能表",
  "entryType": "constant",
  "keywords": "",
  "preventRecursion": true,
  "injectionTemplate": "",
  "extraIndexEnabled": false,
  "extraIndexEntryName": "主角技能表-索引",
  "extraIndexColumns": [],
  "extraIndexColumnModes": {},
  "extraIndexInjectionTemplate": "",
  "entryPlacement": {
    "position": "at_depth_as_system",
    "depth": 2,
    "order": 10000
  },
  "extraIndexPlacement": {
    "position": "at_depth_as_system",
    "depth": 2,
    "order": 10010
  },
  "fixedEntryPlacement": {
    "position": "at_depth_as_system",
    "depth": 2,
    "order": 99990
  },
  "fixedIndexPlacement": {
    "position": "at_depth_as_system",
    "depth": 2,
    "order": 99991
  }
}
```


## 主角信息

- uid: `sheet_Protagonist`
- orderNo: 1

## 可编辑说明

- 可以直接修改 `## 说明`，会回写到 `sourceData.note`。
- 可以直接修改 `## 更新规则`，但必须保持以下四行格式：`- 初始化: ...`、`- 更新: ...`、`- 插入: ...`、`- 删除: ...`。
- 可以直接修改 `## DDL` 中的 SQL，会回写到 `sourceData.ddl`（仅 SQLite 模式需要）。
- 可以直接修改 `## 当前内容` 下的 Markdown 表格，会回写到 `content`。
- 可以直接修改 `## 更新配置` 中的 JSON，会回写到 `updateConfig`，适合调整上下文深度、批次、更新频率等运行参数。
- 可以直接修改 `## 导出配置` 中的 JSON，会回写到 `exportConfig`，适合调整分组参数、导出参数与注入位置。
- 不要修改 `# 表名`、`uid`、`orderNo`。这些字段当前仅用于展示，不参与回写。
- 修改完成后，运行回包流程即可自动同步到 `embedded-template.pretty.json`。

## 说明

- 记录主角的核心身份信息。此表有且仅有一行。
- 【列定义】
- - 列1: 人物名称 - 主角的名字。
- - 列2: 性别/年龄 - 主角的生理性别和年龄。
- - 列3: 外貌特征 - 记录主角的固有外貌特征，必须包含发型、发色、身高、身材、肤色、五官外貌。严禁包含神态描写（如"嘴角勾起一抹冷笑"）、服装、姿势或临时状态。女性角色还需填写身材数据如三围和身高体重等，并且允许NSFW内容，男性角色则不需要。（低频更新，除非发生重大剧情改变。）
- - 列4: 当前衣着/装扮 - 记录主角当前穿着，必须使用半结构化格式："上身：...；下身：...；内层：...；鞋袜：...；配饰：..."。不含姿势或临时状态。未明确的穿着可根据场景合理补全；脱下的衣物在对应条目后标注(脱)但不删除；仅当服装明确完全损毁、遗失或被重新更换时才移除旧条目；明确不穿内衣/内裤时写入对应部位。
- - 列5: 职业/境界 - 主角在社会中的主要职业角色。修仙/古风世界观下同时填写当前修为境界（如：散修/筑基中期），格式为"职业 | 境界"。现代都市世界观仅填写职业即可。
- - 列6: 固有性特征 - 男性角色填写阴茎的具体长度（勃起时）、粗细（周长或直径）、以及简要评价（如形状、颜色、特征等）。女性角色此列不填或填"-"。格式示例："长度18cm、周长12cm，形状笔直，龟头饱满,颜色健康"。
- 【更新规则】此列为固有生理特征，除非发生以下情况，否则禁止更新：
- ① 剧情中明确发生了影响生殖器官的医疗/魔法/科技改造
- ② 角色发生了性别转换
- ③ 初始化时填写错误需要修正
- 【禁止】禁止将临时状态（如勃起/疲软、湿润/干燥）写入此列
- 【禁止】禁止将服装状态（如穿着内裤）写入此列
- 【禁止】禁止将性行为过程描写写入此列

## 更新规则

- 初始化: 游戏初始化时，插入主角的唯一条目。
- 更新: 当主角各项状态发生改变时更新对应列。特别注意：
  - 列3（外貌特征）：仅在固有外貌改变时更新，禁止写入神态、姿势、临时状态
  - 列4（当前衣着）：仅在换装、衣物破损时更新，必须保持"上身：...；下身：...；内层：...；鞋袜：...；配饰：..."格式；脱下标注(脱)但不删除条目；性行为结束、角色重新更衣后，须一次性更新为最终穿着状态，清除所有(脱)标注
  - 列5（职业/境界）：职业变动或境界突破时更新
  - 列6（固有性特征）：仅在生理特征永久改变时更新，禁止写入临时状态或过程描写
  【防串列校验】提交updateRow前必须做列级校验：列4仅允许半结构化穿着内容。若列5出现衣着词（如上衣、内衣、裤、袜、鞋、装扮、(脱)、配饰）则禁止覆盖旧值，必须回退并只重试正确列。
  SQL示例: UPDATE protagonist_info SET current_outfit = '上身：白衬衫；下身：西裤；内层：-；鞋袜：皮鞋；配饰：手表', occupation = '新职业' WHERE row_id = 1;
- 插入: 禁止操作。
- 删除: 禁止删除。

## DDL

```sql
CREATE TABLE protagonist_info ( -- 主角信息
  row_id INTEGER PRIMARY KEY, -- 行号
  name TEXT NOT NULL, -- 人物名称
  gender_age TEXT NOT NULL, -- 性别/年龄
  appearance TEXT NOT NULL, -- 外貌特征
  current_outfit TEXT NOT NULL, -- 当前衣着/装扮
  occupation TEXT NOT NULL, -- 职业/境界
  virginity_status TEXT -- 固有性特征
);
```

## 当前内容

| 人物名称 | 性别/年龄 | 外貌特征 | 当前衣着/装扮 | 职业/境界 | 固有性特征 |
| --- | --- | --- | --- | --- | --- |

## 更新配置

```json
{
  "uiSentinel": -1,
  "contextDepth": -1,
  "updateFrequency": -1,
  "batchSize": -1,
  "skipFloors": -1
}
```

## 导出配置

```json
{
  "enabled": false,
  "splitByRow": false,
  "entryName": "主角信息",
  "entryType": "constant",
  "keywords": "",
  "preventRecursion": true,
  "injectionTemplate": "",
  "extraIndexEnabled": false,
  "extraIndexEntryName": "主角信息-索引",
  "extraIndexColumns": [],
  "extraIndexColumnModes": {},
  "extraIndexInjectionTemplate": "",
  "entryPlacement": {
    "position": "at_depth_as_system",
    "depth": 2,
    "order": 10000
  },
  "extraIndexPlacement": {
    "position": "at_depth_as_system",
    "depth": 2,
    "order": 10010
  },
  "fixedEntryPlacement": {
    "position": "at_depth_as_system",
    "depth": 2,
    "order": 99990
  },
  "fixedIndexPlacement": {
    "position": "at_depth_as_system",
    "depth": 2,
    "order": 99991
  }
}
```


## 资产表

- uid: `sheet_asset_resource`
- orderNo: 4

## 可编辑说明

- 可以直接修改 `## 说明`，会回写到 `sourceData.note`。
- 可以直接修改 `## 更新规则`，但必须保持以下四行格式：`- 初始化: ...`、`- 更新: ...`、`- 插入: ...`、`- 删除: ...`。
- 可以直接修改 `## DDL` 中的 SQL，会回写到 `sourceData.ddl`（仅 SQLite 模式需要）。
- 可以直接修改 `## 当前内容` 下的 Markdown 表格，会回写到 `content`。
- 可以直接修改 `## 更新配置` 中的 JSON，会回写到 `updateConfig`，适合调整上下文深度、批次、更新频率等运行参数。
- 可以直接修改 `## 导出配置` 中的 JSON，会回写到 `exportConfig`，适合调整分组参数、导出参数与注入位置。
- 不要修改 `# 表名`、`uid`、`orderNo`。这些字段当前仅用于展示，不参与回写。
- 修改完成后，运行回包流程即可自动同步到 `embedded-template.pretty.json`。

## 说明

- 记录主角及重要关键人物所持有的高价值、长期性或剧情关键资产。
- 【⚠️严禁录入以下类别——硬排除清单】
- ① 一次性消耗品：食品、饮料、酒水、茶叶、香烟、零食等
- ② 工作流程文件：评级表、档案袋、委托书、合同、资料袋、报告等
- ③ 临时社交礼品：伴手礼、水果篮、巧克力、护肤品礼盒等
- ④ NPC内部资产：非主角持有且与主角无直接利益关系的NPC个人财产
- ⑤ 常识性随身物品：手机、钱包、钥匙等无需AI记忆的日用品
- ⑥ 信息类文档：角色资料卡、模特卡、联系方式、简历、背景信息等信息文档
- 判断标准：填写前自问「这个物品在5轮之后，仍值得AI追踪其状态变化吗？」若否，禁止填入。
- 【收录范围——仅限以下类别】
- - 金钱储备（须标明具体金额）、大额债权债务、不动产、产业、载具
- - 主角赠送给重要角色的关键服饰、定制服装、特殊内衣、标志性饰品、戒指等——只要具有承诺/象征意义、后续会反复提及、或影响关系和扮演稳定性
- - 贵重首饰、传家物、稀有资源、武器/法宝
- 【列定义】
- - 列1: 资产名称 - 资产或贵重物名称。若同一系列资产含多个款式/变体（如定制内衣含日常款、工作款、社交款），必须拆为每款一行独立记录，禁止用一行笼统概括。
- - 列2: 持有人 - 当前实际持有者姓名。
- - 列3: 详情 - 自由描述该资产的类型、价值/规模、材质/特征、来源/关系备注。合并为一列避免串列，但应包含关键信息。
- 【服饰/饰品类强制格式】服饰、首饰、内衣等穿戴类资产必须使用以下格式：
- 「类型 | 材质/面料 | 版型/设计特点 | 特殊结构/机关 | 来源与关系意义」
- 示例：「定制内衣-工作款 | 黑色蕾丝+弹力网纱 | 全罩杯高侧收设计 | 前扣开合，无钢圈 | 主角为某角色定制的职业场合内衣」
- 【金钱类格式】须写明具体金额，如「150万元职业收入+50万元某客户酬金」。
- 【其他类】自由描述，≤80字。
- - 列4: 状态 - 填写当前资产状态，仅限以下枚举：持有中、已转让、已消耗、已损毁、冻结中。
- 【去重规则】资产名称+持有人为联合唯一键，优先updateRow。

## 更新规则

- 初始化: 从上下文中提取主角及重要人物持有的重要资产建立清单。必须逐条核对硬排除清单，排除清单中的类别严禁录入。含多款式的系列资产须拆行。
- 更新: 当资产价值、持有人、状态或详情发生重大变化时更新对应列。金钱类资产金额变化时更新列3中的金额数值。资产被彻底转手、损毁、失效且不再需要追踪时可删除对应行。
  SQL示例: UPDATE assets SET status = '已转让', details = '更新后的详情' WHERE asset_name = '资产名' AND holder = '持有人';
- 插入: 【插入前必须执行排除检查】逐条核对硬排除清单（消耗品/工作文件/临时礼品/NPC内部资产/常识随身物/信息类文档），命中任一条则禁止插入。
  通过排除检查后，当主角或重要人物首次获得值得持续追踪的重要资产时新增一行。
  【多款式拆行规则】若同一系列资产含多个款式/变体，必须拆为每款一行，分别填写详情——禁止合并为一行笼统概括。
  主角赠送的关键服饰/饰品/信物，必须按服饰强制格式填写详情列。
  新增时列4默认填"持有中"。
  SQL示例: INSERT INTO assets (row_id, asset_name, holder, details, status) VALUES ((SELECT COALESCE(MAX(row_id),0)+1 FROM assets), '新资产', '持有人', '详情描述', '持有中');
- 删除: 仅当资产已不复存在、已完全脱离剧情、或确认无需继续追踪时删除。
  SQL示例: DELETE FROM assets WHERE asset_name = '已消耗资产' AND holder = '持有人';

## DDL

```sql
CREATE TABLE assets ( -- 资产表
  row_id INTEGER PRIMARY KEY, -- 行号
  asset_name TEXT NOT NULL, -- 资产名称
  holder TEXT NOT NULL, -- 持有人
  details TEXT CHECK(details IS NULL OR LENGTH(details) <= 80), -- 详情
  status TEXT NOT NULL CHECK(status IN ('持有中', '已转让', '已消耗', '已损毁', '冻结中')) -- 状态
);
```

## 当前内容

| 资产名称 | 持有人 | 详情 | 状态 |
| --- | --- | --- | --- |

## 更新配置

```json
{
  "uiSentinel": -1,
  "contextDepth": -1,
  "updateFrequency": -1,
  "batchSize": -1,
  "skipFloors": -1
}
```

## 导出配置

```json
{
  "enabled": false,
  "splitByRow": false,
  "entryName": "资产表",
  "entryType": "constant",
  "keywords": "资产名称",
  "preventRecursion": true,
  "injectionTemplate": "",
  "extraIndexEnabled": false,
  "extraIndexEntryName": "资产表-索引",
  "extraIndexColumns": [
    "资产名称",
    "持有人"
  ],
  "extraIndexColumnModes": {
    "资产名称": "both",
    "持有人": "both"
  },
  "extraIndexInjectionTemplate": "",
  "entryPlacement": {
    "position": "at_depth_as_system",
    "depth": 2,
    "order": 10000
  },
  "extraIndexPlacement": {
    "position": "at_depth_as_system",
    "depth": 2,
    "order": 10010
  },
  "fixedEntryPlacement": {
    "position": "at_depth_as_system",
    "depth": 2,
    "order": 99990
  },
  "fixedIndexPlacement": {
    "position": "at_depth_as_system",
    "depth": 2,
    "order": 99991
  }
}
```


## NSFW信息表

- uid: `sheet_nsfw_info`
- orderNo: 7

## 可编辑说明

- 可以直接修改 `## 说明`，会回写到 `sourceData.note`。
- 可以直接修改 `## 更新规则`，但必须保持以下四行格式：`- 初始化: ...`、`- 更新: ...`、`- 插入: ...`、`- 删除: ...`。
- 可以直接修改 `## DDL` 中的 SQL，会回写到 `sourceData.ddl`（仅 SQLite 模式需要）。
- 可以直接修改 `## 当前内容` 下的 Markdown 表格，会回写到 `content`。
- 可以直接修改 `## 更新配置` 中的 JSON，会回写到 `updateConfig`，适合调整上下文深度、批次、更新频率等运行参数。
- 可以直接修改 `## 导出配置` 中的 JSON，会回写到 `exportConfig`，适合调整分组参数、导出参数与注入位置。
- 不要修改 `# 表名`、`uid`、`orderNo`。这些字段当前仅用于展示，不参与回写。
- 修改完成后，运行回包流程即可自动同步到 `embedded-template.pretty.json`。

## 说明

- 【⚠️填表警告】严禁照抄档案原文至表格，必须根据角色实际设定压缩提取。
- 【表定位】本表是女性角色的长期压缩扮演档案：记录稳定身体基线与可复用的互动风格，目的是让AI长期稳定扮演。
- 【⚠️衣着禁区】本表任何列均不得记录服装穿着信息，服装信息仅在「重要人物表」的「当前衣着/装扮」列更新。
- 【⚠️核心原则：基线特征 vs 场景临时状态】
- 本表所有列只记录角色的【稳定基线特征】，即无论当前场景如何变化都客观存在的固有特征。
- 严禁将以下内容写入任何列：
- ① 场景临时状态：如「宫腔内满溢精液」「爱液正在渗出」等瞬时描写
- ② 纯过程描写：如「正被深度研磨」「被调教后」等进行时描写
- ③ 只出现一次、无法长期复用的临场感受
- 判断标准：填写前自问「这个信息在数轮之后，仍能稳定帮助AI扮演该角色吗？」若否，禁止填入。
- 【与重要人物表的分工】
- - 重要人物表负责：身份标签、外貌总览、当前衣着、当前所在、对主角认知、当前态度、关系定位、当前诉求/目标、关键经历、别称。
- - NSFW信息表负责：性格与两性态度、身体基线、偏好触发逻辑、羞耻点与击穿点、分阶段声线、NSFW语境下的互动倾向。
- - 身份/职业、年龄、社会关系、发型妆容等信息已在重要人物表中记录，本表不重复建档。
- 本表仅为正文中通过<archive>标签动态生成档案的女性角色建档。
- 【⚠️建档硬条件——按标签判断】
- ·只有角色数据来自<正文数据>中的<archive></archive>标签时，才允许在本表建档。
- ·角色数据来自<背景设定>中的<角色档案_XX>标签的，属于世界书预设角色，严禁在本表建档——世界书已有完整档案，重复建档浪费token。
- 判断方法：该角色的身体数据/性格/两性态度等信息是在<archive>标签里看到的，还是在<角色档案_>标签里看到的？前者建档，后者禁止。
- 【列速查】列1=姓名|列2=性格与性情|列3=对主角的态度|列4=身高/体重|列5=三围/罩杯|列6=身材与特异性征|列7=肌肤与体香|列8=敏感/XP倾向|列9=性经验程度|列10=阴道与处女膜状态|列11=后庭与肛门状态|列12=泌乳/体液状态|列13=声线/叫床风格|列14=羞耻点/心理防线
- 【列定义】
- - 列1: 姓名 - 必须与重要人物表中的姓名完全一致，作为唯一关联标识。本列为唯一键，禁止同名多行。
- - 列2: 性格与性情 - 记录角色的核心性格特质与情绪表达方式。每个性格特质必须搭配一个具体行为场景佐证，严禁堆砌抽象形容词。严禁搬入台词/语料。
- 【数据来源】从角色档案的「性格与性情→核心性格+情绪表达」压缩提取。
- 总字数不超过100字。
- - 列3: 对主角的态度 - 压缩记录初见反应、日常相处模式、私密语境下的互动倾向与潜在走向。可写动作、视线、借口、默许方式、升级路径。
- 【数据来源】从角色档案的「对主角的态度→初见反应+相处模式+潜在走向」压缩提取。
- 总字数不超过100字。
- - 列4: 身高/体重 - 格式："XXXcm / XXkg,(体感描述)"。优先保留抱感、肉感分布、腰臀对比等对扮演有帮助的描述。
- 总字数不超过40字。
- - 列5: 三围/罩杯 - 格式："BXX(X杯)-WXX-HXX,(视觉描述)"。数值必须精确。
- 总字数不超过40字。
- - 列6: 身材与特异性征 - 合并描写整体体型轮廓（脂肪分布、动态视觉）与天生的特殊生理构造（如特殊体质、独特身体标记）。
- 【数据来源】从角色档案的「机体数据→身材与特异性征」压缩提取。
- 总字数不超过100字。
- - 列7: 肌肤与体香 - 合并描写皮肤色泽、质地、触感与身体气味来源和混合层次。
- 【数据来源】从角色档案的「机体数据→肌肤与体香」压缩提取。
- 总字数不超过80字。
- - 列8: 敏感/XP倾向 - 压缩记录主动发起、被动接受、真正拒绝时的触发条件；写明什么刺激、什么场景最容易让她松动或升温。
- 【数据来源】从角色档案的「两性态度→触发条件(主动发起/被动接受/拒绝底线)」压缩提取。
- 总字数不超过90字。
- - 列9: 性经验程度 - 描述当前性经验与熟练度基线。仅在正文或设定明确体现明显变化时才更新。
- 【数据来源】从角色档案的「两性态度→性经验与身体状态」提取。
- 总字数不超过50字。
- - 列10: 阴道与处女膜状态 - 记录处女膜状态、阴道结构和分泌基线，不写当前场景体液或过程描写。
- 总字数不超过90字。
- - 列11: 后庭与肛门状态 - 记录后庭开发程度、括约肌状态、颜色、敏感反应等稳定特征。
- 总字数不超过70字。
- - 列12: 泌乳/体液状态 - 只记录乳汁与爱液的分泌基线倾向、触发强度和稳定体质。
- 总字数不超过70字。
- - 列13: 声线/叫床风格 - 必须按阶段压缩：至少覆盖日常、暧昧/前戏、承受、高潮/失控、事后五段中的关键声音特征。严禁搬入台词。
- 总字数不超过100字。
- - 列14: 羞耻点/心理防线 - 必须写成可执行的攻略逻辑：核心羞耻点、击穿防线的言行、崩溃阈值分别是什么，以及会产生什么效果。
- 【数据来源】从角色档案的「心理弱点→最在意什么+击穿言行+崩溃阈值」和「感官与弱点→羞耻点」合并压缩。
- 总字数不超过100字。
- 【关联规则】
- - 列1"姓名"必须在重要人物表中存在对应条目。
- - 当重要人物表中的女性角色死亡或彻底离场时，本表对应条目不删除，但在姓名旁标注(已离场)或(已死亡)。
- 【记录原则】
- 1. 本表仅记录女性角色，男性角色不创建条目。
- 2. 每个在重要人物表登场的女性角色，必须同步在本表创建详细条目。
- 3. 允许NSFW内容，描述需详实具体，但优先保留长期可复用的扮演信息。
- 4. 各列字数限制必须严格遵守，避免token浪费。
- 【防串列校验】写入前必须先做键位核对（参照列速查行）：
- 列2=性格与性情(性格特质+行为场景)，列3=对主角的态度(初见/相处/走向)，列4=身高/体重(数值+体感)，列5=三围/罩杯(数值)，列6=身材与特异性征(体型+特殊构造)，列7=肌肤与体香(皮肤+气味)，列8=敏感/XP倾向(触发条件)，列9=性经验程度(经验基线)，列10=阴道状态(生理结构)，列11=后庭状态(开发程度)，列12=泌乳/体液(分泌基线)，列13=声线/叫床(阶段声音)，列14=羞耻点/心理防线(击穿逻辑)。
- 严禁将列2性格描述写入列8；严禁将列8触发条件写入列3；严禁将列13声线描写挤入列14。
- 【格式特征校验】列4的值必须含数值(cm/kg)；列5的值必须含罩杯字母；列13的值必须含声音阶段描述(日常/承受/高潮等)；列14的值必须含"羞耻"或"击穿"或"崩溃"关键词。若不匹配则保留原值，回退重试。

## 更新规则

- 初始化: 游戏初始化时，必须先判断数据来源标签：
  ①该角色的档案出现在<archive></archive>标签中→必须在本表创建完整条目；
  ②该角色的档案出现在<角色档案_XX></角色档案_XX>标签中→严禁建档，这是世界书角色。
  只看标签，不做主观判断。初始化时应优先从角色档案中按映射关系压缩提取各列信息，确保每列有内容。禁止直接复制重要人物表原句或世界书整段。
- 更新: 【同名覆盖规则】以列1姓名为唯一键。更新前先按标准化姓名匹配；命中同名时必须在原行updateRow覆盖变化列，禁止insertRow重复建档。
  同名覆盖时仅更新本轮发生变化的列；基线生理特征在无新证据时禁止改写或清空。
  仅当正文、世界书、角色档案中明确描述了角色相关信息发生变化时，更新对应列的内容。
  未发生变化的列保持原样，禁止无依据地修改。
  【列重点校验】列2必须保留性格特质+行为场景，不得退化成抽象标签；列8必须写触发条件；列13必须体现阶段差异；列14必须写击穿方式与效果；列3必须包含互动模式或潜在走向。
  【防越界校验】列10/列11/列12只允许写基线生理状态，不得写场景过程或临时体液状态。
  SQL示例: UPDATE nsfw_info SET personality = '更新内容' WHERE name = '角色名';
- 插入: 【同名去重优先】插入前必须先按标准化姓名查重：命中同名→禁止insert，改为updateRow。
  当重要人物表中新增女性角色时，必须先判断数据来源标签：
  ①该角色的档案出现在<archive></archive>标签中→必须在本表创建完整条目；
  ②该角色的档案出现在<角色档案_XX></角色档案_XX>标签中→严禁建档，这是世界书角色。
  只看标签，不做主观判断。
  插入新行时，应从角色档案按照列定义中标注的【数据来源】逐列压缩提取。
  SQL示例: INSERT INTO nsfw_info (row_id, name, personality, attitude_to_protagonist, height_weight, measurements, body_features, skin_scent, sensitivity, experience_level, vaginal_status, anal_status, lactation_status, voice_style, shame_points) VALUES ((SELECT COALESCE(MAX(row_id),0)+1 FROM nsfw_info), '角色名', '性格', '态度', '身高体重', '三围', '身材', '肌肤', '敏感', '经验', '阴道', '后庭', '泌乳', '声线', '羞耻点');
- 删除: 禁止删除。角色离场或死亡时在列1姓名后标注(已离场)或(已死亡)，保留条目。

## DDL

```sql
CREATE TABLE nsfw_info ( -- NSFW信息表
  row_id INTEGER PRIMARY KEY, -- 行号
  name TEXT NOT NULL UNIQUE, -- 姓名
  personality TEXT CHECK(personality IS NULL OR LENGTH(personality) <= 100), -- 性格与性情
  attitude_to_protagonist TEXT CHECK(attitude_to_protagonist IS NULL OR LENGTH(attitude_to_protagonist) <= 100), -- 对主角的态度
  height_weight TEXT CHECK(height_weight IS NULL OR LENGTH(height_weight) <= 40), -- 身高/体重
  measurements TEXT CHECK(measurements IS NULL OR LENGTH(measurements) <= 40), -- 三围/罩杯
  body_features TEXT CHECK(body_features IS NULL OR LENGTH(body_features) <= 100), -- 身材与特异性征
  skin_scent TEXT CHECK(skin_scent IS NULL OR LENGTH(skin_scent) <= 80), -- 肌肤与体香
  sensitivity TEXT CHECK(sensitivity IS NULL OR LENGTH(sensitivity) <= 90), -- 敏感/XP倾向
  experience_level TEXT CHECK(experience_level IS NULL OR LENGTH(experience_level) <= 50), -- 性经验程度
  vaginal_status TEXT CHECK(vaginal_status IS NULL OR LENGTH(vaginal_status) <= 90), -- 阴道与处女膜状态
  anal_status TEXT CHECK(anal_status IS NULL OR LENGTH(anal_status) <= 70), -- 后庭与肛门状态
  lactation_status TEXT, -- 泌乳/体液状态
  voice_style TEXT, -- 声线/叫床风格
  shame_points TEXT -- 羞耻点/心理防线
);
```

## 当前内容

| 姓名 | 性格与性情 | 对主角的态度 | 身高/体重 | 三围/罩杯 | 身材与特异性征 | 肌肤与体香 | 敏感/XP倾向 | 性经验程度 | 阴道与处女膜状态 | 后庭与肛门状态 | 泌乳/体液状态 | 声线/叫床风格 | 羞耻点/心理防线 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## 更新配置

```json
{
  "uiSentinel": -1,
  "contextDepth": -1,
  "updateFrequency": -1,
  "batchSize": -1,
  "skipFloors": -1
}
```

## 导出配置

```json
{
  "enabled": true,
  "splitByRow": true,
  "entryName": "NSFW信息表",
  "entryType": "keyword",
  "keywords": "姓名",
  "preventRecursion": true,
  "injectionTemplate": "",
  "extraIndexEnabled": true,
  "extraIndexEntryName": "NSFW信息表-索引",
  "extraIndexColumns": [
    "姓名",
    "性格与性情",
    "敏感/XP倾向",
    "对主角的态度"
  ],
  "extraIndexColumnModes": {
    "姓名": "both",
    "性格与性情": "index_only",
    "敏感/XP倾向": "index_only",
    "对主角的态度": "both"
  },
  "extraIndexInjectionTemplate": "以下为角色的私密档案：\n<NSFW档案>\n$1\n</NSFW档案>",
  "entryPlacement": {
    "position": "at_depth_as_system",
    "depth": 10000,
    "order": 10000
  },
  "extraIndexPlacement": {
    "position": "at_depth_as_system",
    "depth": 10000,
    "order": 8000
  },
  "fixedEntryPlacement": {
    "position": "at_depth_as_system",
    "depth": 10000,
    "order": 99989
  },
  "fixedIndexPlacement": {
    "position": "at_depth_as_system",
    "depth": 10000,
    "order": 99990
  }
}
```
