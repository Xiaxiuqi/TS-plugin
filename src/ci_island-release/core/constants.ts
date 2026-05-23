/**
 * 浮岛核心常量定义
 * 包含脚本ID、存储键名、配置项、主题、地图模板等
 */

// ========== 脚本身份与存储键 ==========
export const SCRIPT_ID = 'char_island_v8_5_map_inject';
export const STORAGE_POS_KEY = 'ci_island_pos_v5';
export const STORAGE_PANEL_SIZE_KEY = 'ci_panel_size_v5';
export const STORAGE_MAP_SIZE_KEY = 'ci_map_size_v5';
export const STORAGE_AVATAR_PREFIX = 'ci_avatar_img_';
export const STORAGE_CUSTOM_CATEGORIES_KEY = 'ci_custom_cats_v1';
export const STORAGE_MAP_LAYOUT_KEY = 'ci_map_layout_v1';
export const STORAGE_THEME_KEY = 'ci_theme_v1';
export const STORAGE_OPACITY_KEY = 'ci_opacity_v1';
export const STORAGE_RECYCLE_NAME_KEY = 'ci_recycle_name_v1';
export const STORAGE_RECYCLE_OPTION_KEY = 'ci_recycle_option_v1';
export const STORAGE_RECYCLE_ACTIVE_KEY = 'ci_recycle_active_v1';

// ========== 数据库模板键 (V1.3.0 适配 Extension Settings) ==========
export const ACU_DB_NAMESPACE = 'shujuku_v100__userscript_settings_v1';
export const ACU_DB_GLOBAL_META_KEY = 'shujuku_v100_globalMeta_v1';
export const ACU_DB_PROFILE_PREFIX = 'shujuku_v100_profile_v1';

// ========== 业务配置 ==========
export const CONFIG = {
  keywords: [
    '恋人', '情人', '爱人', '挚友', '宿敌',
    '夫妻', '搭档', '死党', '亲人', '兄妹',
    '姐弟', '父母', '核心', '正派', '反派',
    'BOSS', '伴侣', '未婚', '婚配', '主角', '重要',
  ],
  genericNames: [
    '妈', '婶', '伯', '叔', '姨', '爷', '奶',
    '混混', '路人', '老板', '小二', '侍卫',
    '丫鬟', '管家', '士兵', '司机', '路人',
  ],
  tables: {
    protagonist: '主角信息',
    important: '重要人物表',
    items: ['物品', '道具', '背包', '装备', '库存'],
    global: '全局数据表',
  },
};

// ========== 主题 ==========
export const THEMES = [
  { id: 'light', name: '日间模式', color: '#ffffff' },
  { id: 'night', name: '夜间模式', color: '#000000' },
];

// ========== 地图相关 ==========
export const getMapEnabledKey = () => 'ci_map_enabled_v1';
export const MAP_TABLE_MARKER = '_浮岛地图_';

// 地图模板定义（用于注入到用户数据库）
export const MAP_TEMPLATES = {
  locationTable: {
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
      customStyles: {},
    },
    sourceData: {
      note: '记录当前活动层级的具体地点。',
      initNode: '游戏初始化时,需为当前层级区域新增至少三个主要地点。在当前层级内发现新地点时添加。',
      deleteNode: '当发生地点层级深入时，原表中的地点在移至"外部区域列表"后将被删除。',
      updateNode: '地点的环境描述等信息发生变化时更新。',
      insertNode: '在当前层级内发现新地点时添加。',
    },
    content: [[null, '地点名称', '环境描述']],
  },
  elementTable: {
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
      customStyles: {},
    },
    sourceData: {
      note: '记录场景中可交互的实体（怪物/NPC/物品）。`所属主地点`必须与主要地点表对应。',
      initNode: '新地点创建时，必须为其添加至少一个地图元素。场景中出现新的可交互实体时添加。',
      deleteNode: '实体被消灭/摧毁/取走，或者普通NPC因为剧情发展变成剧情重要角色时删除。',
      updateNode: '实体状态因交互改变时更新。每轮必须根据最新情景刷新所有互动选项。',
      insertNode: '场景中出现新的可交互实体时添加。',
    },
    content: [[null, '元素名称', '元素类型', '元素描述', '所属主地点', '状态', '互动选项1', '互动选项2', '互动选项3']],
  },
};

// 地图提示词模板（简化版，只包含地图相关的表格说明）
export const MAP_PROMPT_TEMPLATE = `
## 地图表格填写指南（浮岛地图扩展）

### 主要地点表
【说明】记录当前活动层级的具体地点。当地点层级深入时（如从'小区'进入'公寓楼'），此表会被清空并填充新层级的子地点。
- 列0: 地点名称 - 地点的唯一名称。
- 列1: 环境描述 - 对该地点环境、氛围的简要文字描述。

【增删改触发条件】
插入：游戏初始化时，需为当前层级区域新增至少三个主要地点。在当前层级内发现新地点时添加。
更新：地点的环境描述等信息发生变化时更新。
删除：当发生地点层级深入时，原表中的地点在移至'外部区域列表'后将被删除。

### 地图元素表
【说明】记录场景中可交互的实体（怪物/NPC/物品）。\`所属主地点\`必须与主要地点表对应。
- 列0: 元素名称 - 实体的名称。
- 列1: 元素类型 - 分为"怪物"、"NPC"、"物品"、"载具"、"环境"等。
- 列2: 元素描述 - 对该实体外观、特征的简要描述。
- 列3: 所属主地点 - 该实体当前所在的"地点名称"，必须与表1中的地点对应。
- 列4: 状态 - 实体的当前状态（如："游荡"、"可调查"、"已摧毁"）。
- 列5-7: 互动选项 - 主角可以对该实体执行的3个具体动作。

【增删改触发条件】
插入：新地点创建时，必须为其添加至少一个地图元素。场景中出现新的可交互实体时添加。
更新：实体状态因交互改变时更新。每轮必须根据最新情景刷新所有互动选项。
删除：实体被消灭/摧毁/取走，或者普通NPC因为剧情发展变成剧情重要角色时删除。
`;
