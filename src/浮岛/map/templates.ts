export const MAP_TABLE_MARKER = '_浮岛地图_';

export const MAP_TEMPLATES = {
  // 1. 主要地点表 (宏观地图)
  locationTable: {
    uid: 'sheet_Z1BTpFt5',
    name: '主要地点表' + MAP_TABLE_MARKER,
    domain: 'chat',
    type: 'dynamic',
    enable: true,
    required: false,
    triggerSend: false,
    triggerSendDeep: 1,
    config: {
      toChat: true,
      useCustomStyle: false,
      triggerSendToChat: false,
      alternateTable: false,
      insertTable: false,
      alternateLevel: 0,
      skipTop: false,
      selectedCustomStyleKey: '',
      customStyles: {
        自定义样式: {
          mode: 'regex',
          basedOn: 'html',
          regex: '/(^[\\s\\S]*$)/g',
          replace: '$1',
          replaceDivide: '',
        },
      },
    },
    sourceData: {
      note: '你是一位专业的关卡设计师。你的任务是规划区域的宏观布局。\n\n**主要地点表（区域平面图）**\n记录当前区域内的各个房间/区域。所有地点应在一个统一的**无限平面坐标系**中无缝拼接，共同组成一个完整的楼层平面图。\n\n## 核心设计原则 (HSR 风格)\n1. **宏大空间感**：不要画小盒子！一个普通的房间至少要有 **300x200** 像素。走廊宽度至少 **80-100** 像素。\n2. **无限画布**：**画布尺寸无限制**。请放心使用大坐标（如 2000, 2000），确保所有房间都有充足的空间，**绝对不要**把所有房间挤在一起！\n3. **无缝拼接**：房间之间通过共享墙壁紧密连接。走廊也是房间的一种（长条形）。\n4. **有机形状**：使用 SVG Path (在墙壁表中) 绘制非矩形房间。例如 L 型走廊、圆形大厅。\n\n## 字段说明\n- **地点名称**：唯一名称 (如: 控制室)\n- **X坐标/Y坐标**：**【严重警告：必须填数字！】绝对不允许留空、填“未知”或“待定”。如果不知道具体位置，请必须根据上下文逻辑随机生成一个合理的坐标整数！**\n- **宽度/高度**：**【必填】**该区域的边界框尺寸 (整数)。\n- **环境描述**：简要描述 (如: 充满全息投影的控制中心)\n\n## 尺寸与布局指南 (重要)\n- **画布尺寸**：**无限制**。请根据需要向四周扩展。\n- **房间比例**：\n  - **小房间**：约 200x200 到 300x300。\n  - **大厅/广场**：约 400x400 到 600x500。\n  - **走廊**：宽度至少 60-100。\n- **避免拥挤**：**不要创建小于 100x100 的房间**。请拉开房间之间的距离，不要堆叠。\n- **布局逻辑**：\n  - **【绝对禁止重叠】**：房间之间物理上不能重叠。想象你在画一张平面图，Room A (0,0 to 200,200) 不能和 Room B (100,100 to 300,300) 重叠！\n  - 房间应通过“门”或“走廊”相连。\n  - 示例布局：大厅(0,0,400,400) -> 走廊(400,150,100,100) -> 卧室(500,100,300,200)。\n\n## 核心规则\n1. **坐标必填**：X/Y坐标必须是数字，禁止留空。\n2. **走廊实体化**：走廊也是一个“地点”，物理上连接两个房间。\n3. **全局坐标**：所有地点的坐标基于同一个无限画布。\n4. **非矩形支持**：虽然这里定义了边界框(Bounding Box)，但具体形状由【地图墙壁表】定义。\n5. **坐标一致性**：请记住你规划的每个地点的坐标范围 (X, Y, W, H)，后续生成的【墙壁】、【设施】和【元素】必须严格位于这个范围内！',
      initNode: '游戏初始化时，需为当前层级区域新增至少三个主要地点。请确保地点之间逻辑连接。',
      deleteNode:
        '【绝对禁止删除】除非该地点在剧情中被彻底毁灭（如爆炸、沉没），否则严禁删除任何地点！角色离开、前往新区域或进入子区域时，必须保留原地点数据以便返回。切记：不要因为角色不在该地点就删除它！',
      updateNode:
        '地点的环境描述等信息发生变化时更新。如果不确定地点名称，请不要随意修改地点名称，以免导致关联的墙壁和设施数据丢失。',
      insertNode: '在当前层级内发现新地点时添加。添加时请参考“尺寸与比例指南”，确保新地点有足够的空间。',
    },
    content: [[null, '地点名称', 'X坐标', 'Y坐标', '宽度', '高度', '环境描述']],
    exportConfig: {
      enabled: false,
      splitByRow: false,
      entryName: '主要地点表',
      entryType: 'constant',
      keywords: '',
      preventRecursion: true,
      injectionTemplate: '',
    },
  },

  // 2. 地图元素表 (动态实体)
  elementTable: {
    uid: 'sheet_pxNhO3iA',
    name: '地图元素表' + MAP_TABLE_MARKER,
    domain: 'chat',
    type: 'dynamic',
    enable: true,
    required: false,
    triggerSend: false,
    triggerSendDeep: 1,
    config: {
      toChat: true,
      useCustomStyle: false,
      triggerSendToChat: false,
      alternateTable: false,
      insertTable: false,
      alternateLevel: 0,
      skipTop: false,
      selectedCustomStyleKey: '',
      customStyles: {
        自定义样式: {
          mode: 'regex',
          basedOn: 'html',
          regex: '/(^[\\s\\S]*$)/g',
          replace: '$1',
          replaceDivide: '',
        },
      },
    },
    sourceData: {
      note: '你是一位注重玩家体验的游戏策划。你的任务是布置场景中的互动元素和NPC。\n\n**地图元素表（动态实体）**\n记录场景中可交互的**动态实体**（怪物/NPC/物品）。\n**注意：固定设施（如吧台、桌椅、床铺）请填入【地图设施表】，不要填在这里。**\n\n## 字段说明\n- **元素名称**：实体名称 (如: 神秘宝箱)\n- **元素类型**：怪物/NPC/物品/载具\n- **元素描述**：外观/特征 (如: 锈迹斑斑的铁箱)\n- **所属主地点**：必须对应主要地点表中的名称 (如: 酒馆大厅)\n- **X坐标/Y坐标**：**【必填数字】**在全局无限画布上的位置。**严禁留空或填“未知”！**\n- **状态**：当前状态 (如: 上锁)\n- **互动选项1/2/3**：10字以内的交互描述 (如: 尝试撬开锁)。**如果没有互动选项，请填“无”，严禁留空！**\n\n## 填写规则\n- **【坐标校验】(重要)**：请检查`所属主地点`在`主要地点表`中的 (X, Y, Width, Height)。**本元素的坐标必须位于该地点的范围内！** 例如：如果酒馆大厅在 (0,0) 到 (500,500)，那么酒馆里的宝箱坐标必须在 0-500 之间，绝不能是 (600, 600)！\n- **所属主地点**：必须存在于`主要地点表`中。\n- **坐标系统**：基于全局无限坐标系。\n- **分类原则**：可移动/可带走的实体填本表；固定的家具填设施表。',
      initNode: '新地点创建时，必须为其添加至少一个地图元素。场景中出现新的可交互实体时添加。',
      deleteNode:
        "【禁止误删】仅在实体被彻底消灭、摧毁或永久移除时删除。角色离开或物品暂时取走时，不要删除，应更新其状态为'不在场'或类似描述。",
      updateNode: '实体状态因交互改变时更新。每轮必须根据最新情景刷新所有互动选项。',
      insertNode: '场景中出现新的可交互实体时添加。',
    },
    content: [
      [
        null,
        '元素名称',
        '元素类型',
        '元素描述',
        '所属主地点',
        'X坐标',
        'Y坐标',
        '状态',
        '互动选项1',
        '互动选项2',
        '互动选项3',
      ],
    ],
    exportConfig: {
      enabled: false,
      splitByRow: false,
      entryName: '地图元素表',
      entryType: 'constant',
      keywords: '',
      preventRecursion: true,
      injectionTemplate: '',
    },
  },

  // 3. 地图墙壁表 (微观结构) - New
  wallsTable: {
    uid: 'sheet_MapWalls',
    name: '地图墙壁表' + MAP_TABLE_MARKER,
    domain: 'chat',
    type: 'dynamic',
    enable: true,
    required: false,
    triggerSend: false,
    triggerSendDeep: 1,
    config: {
      toChat: true,
      useCustomStyle: false,
      triggerSendToChat: false,
      alternateTable: false,
      insertTable: false,
      alternateLevel: 0,
      skipTop: false,
      selectedCustomStyleKey: '',
      customStyles: {
        自定义样式: {
          mode: 'regex',
          basedOn: 'html',
          regex: '/(^[\\s\\S]*$)/g',
          replace: '$1',
          replaceDivide: '',
        },
      },
    },
    sourceData: {
      note: '你是一位精通SVG路径的CAD绘图员。你的任务是根据平面图绘制精确的墙壁轮廓。\n\n**微观结构表（房间轮廓/墙壁）**\n定义地点的具体形状轮廓。**关键：请使用 SVG Path 绘制非矩形的、有机的或高科技感的房间形状。**\n\n## 字段说明\n- **场景ID**：对应主要地点表名称 (如: 控制室)\n- **路径数据**：SVG Path d属性 (如: M0,0 L200,0 L200,150 L0,150 Z)\n- **类型**：Wall (墙) / Door (门/标记) / Gap (开口)\n- **颜色**：Hex代码 (如: #333333)\n\n## 空间感与比例 (关键)\n- **墙壁范围**：墙壁围成的区域必须足够宽敞！**不要画只有几十像素宽的狭窄区域**。\n- **示例尺寸**：一个普通的矩形房间路径应该是 `M100,100 L400,100 L400,300 L100,300 Z` (300x200大小)。\n- **留白**：家具和角色需要空间，请确保墙壁内有足够的留白。\n\n## 路径数据绘制指南 (SVG Path)\n**请确保围成的区域足够大！**\n- **错误示例 (太小)**: `M10,10 L50,10 L50,50 L10,50 Z` (40x40，连椅子都放不下)\n- **正确示例 (宽敞)**: `M100,100 L500,100 L500,400 L100,400 Z` (400x300，适合大房间)\n- **复杂示例**: `M100,100 L400,100 L400,200 L600,200 L600,500 L100,500 Z` (L型大走廊)\n\n## 门与连接绘制 (HSR风格)\n1. **房间轮廓**：使用 `Type: Wall` 绘制封闭的房间形状 (`... Z`)。\n2. **门/连接**：在两个房间的交界处，绘制一条单独的线段，并设置 `Type: Door` (如果有门) 或 `Type: Gap` (如果是开放式通道)。\n   - 示例(门): `M400,200 L450,200` (Type: Door)\n3. **全局坐标**：Path 数据必须使用全局坐标，与主要地点表的坐标保持一致。\n4. **禁止JSON**：所有数据必须拆解为独立的表格行。',
      initNode:
        '当创建或发现新的主要地点时，必须同步创建该地点的墙壁结构。**重要：必须确保【场景ID】与【主要地点表】中的【地点名称】完全一致。**',
      deleteNode:
        '【绝对禁止删除】只要对应的主要地点存在，就严禁删除其墙壁数据！严禁因为角色离开或不在该区域就删除墙壁数据！',
      updateNode:
        '仅在场景内结构发生重大变化（如墙壁倒塌、扩建）时更新。**严禁修改【场景ID】，除非【主要地点表】中的对应地点名称也发生了变更。**',
      insertNode: '发现新场景时添加。**注意：场景ID必须对应主要地点表中的地点名称。**',
    },
    content: [[null, '场景ID', '路径数据', '类型', '颜色']],
    exportConfig: {
      enabled: false,
      splitByRow: false,
      entryName: '地图墙壁表',
      entryType: 'constant',
      keywords: '',
      preventRecursion: true,
      injectionTemplate: '',
    },
  },

  // 4. 地图设施表 (微观物体) - New (原地图家具表)
  facilityTable: {
    uid: 'sheet_MapFacility',
    name: '地图设施表' + MAP_TABLE_MARKER,
    domain: 'chat',
    type: 'dynamic',
    enable: true,
    required: false,
    triggerSend: false,
    triggerSendDeep: 1,
    config: {
      toChat: true,
      useCustomStyle: false,
      triggerSendToChat: false,
      alternateTable: false,
      insertTable: false,
      alternateLevel: 0,
      skipTop: false,
      selectedCustomStyleKey: '',
      customStyles: {
        自定义样式: {
          mode: 'regex',
          basedOn: 'html',
          regex: '/(^[\\s\\S]*$)/g',
          replace: '$1',
          replaceDivide: '',
        },
      },
    },
    sourceData: {
      note: '你是一位资深的室内设计师。你的任务是合理摆放家具和装饰，兼顾美观与通行空间。\n\n**微观场景设施表（家具/互动点）**\n定义室内/场景的固定家具、装饰及可互动设施。**注意：移动的NPC或物品请填入【地图元素表】。**\n\n## 字段说明\n- **场景ID**：对应主要地点表的名称 (如: 酒馆一楼)\n- **名称**：设施名称 (如: 老旧吧台)\n- **类型**：预设类型ID (如: bar_counter)\n- **X坐标/Y坐标**：**【必填数字】**在全局无限画布上的位置。**严禁留空或填“未知”！**\n- **宽度/高度**：像素尺寸 (整数)\n- **旋转**：顺时针旋转角度 (0-360)。**默认为 0，严禁留空！**\n- **互动选项1/2/3**：10字以内的交互描述 (如: 坐在椅子上)。**如果没有互动选项，请填“无”，严禁留空！**\n\n## 尺寸参考 (像素)\n- **椅子 (chair)**: 30x30\n- **圆桌 (table_round)**: 80x80\n- **长桌 (table_rect)**: 120x60\n- **床 (bed)**: 80x120\n- **吧台 (bar_counter)**: 300x60\n- **柜子 (shelf)**: 100x30\n- **门 (door)**: 40x10\n\n## 类型ID对照表\n- `bar_counter`: 吧台 (长方形)\n- `table_round`: 圆桌\n- `table_rect`: 长桌\n- `chair`: 椅子\n- `bed`: 床\n- `shelf`: 柜子/书架\n- `door`: 门 (物体)\n- `stairs`: 楼梯\n\n## 填写规则 (必读)\n- **【坐标校验】(重要)**：请检查`场景ID`对应的地点在`主要地点表`中的 (X, Y, Width, Height)。**本设施的坐标必须位于该地点的范围内！** \n- **【不要错位】**：家具必须摆放在房间内部，不能摆到墙外面去。\n- **不要太拥挤**：家具之间要留出通道，不要堆在一起。\n- **类型ID**：必须严格使用上述英文ID，禁止自造类型。\n- **旋转**：顺时针旋转角度，0表示不旋转。\n- **禁止JSON**：所有数据必须拆解为独立的表格行。',
      initNode:
        '当角色进入一个新的微观场景时，如果该场景尚未生成布局，则创建新条目。**重要：必须确保【场景ID】与【主要地点表】中的【地点名称】完全一致。**',
      deleteNode:
        '【谨慎删除】除非设施被彻底摧毁，否则尽量保留。如果上下文窗口紧张，可以仅删除长时间未访问的场景设施。',
      updateNode:
        '场景内设施发生移动或改变时更新。**严禁修改【场景ID】，除非【主要地点表】中的对应地点名称也发生了变更。**',
      insertNode: '发现新场景时添加。**注意：场景ID必须对应主要地点表中的地点名称。**',
    },
    content: [
      [null, '场景ID', '名称', '类型', 'X坐标', 'Y坐标', '宽度', '高度', '旋转', '互动选项1', '互动选项2', '互动选项3'],
    ],
    exportConfig: {
      enabled: false,
      splitByRow: false,
      entryName: '地图设施表',
      entryType: 'constant',
      keywords: '',
      preventRecursion: true,
      injectionTemplate: '',
    },
  },
};
