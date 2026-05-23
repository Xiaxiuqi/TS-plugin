const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const dir = path.resolve('projects/魔法少女是不会败北恶堕的吧！/unpacked/entries');
const files = fs.readdirSync(dir).filter(file => file.endsWith('.yaml')).sort();
const legacyPattern = /(getvar\(['"](?:stat_data|previous_stat_data|initialized_lorebooks)['"]\)|previous_stat_data|initialized_lorebooks|<\/?UpdateVariable>|<\/?JSONPatch>|JSONPatch|UpdateVariable|stat_data)/;

function block(lines) {
  return '<tableEdit>\n-- Analysis: ' + lines[0] + '\n' + lines.slice(1).join('\n') + '\n</tableEdit>';
}

function base(title) {
  return '# ' + title + '\n\n本条目已完成纯数据库化。状态读取以 shujuku / SP·数据库 II 的数据库表格和【当前剧情数据库状态】为准；状态写入只能使用 <tableEdit> 数据库更新块。\n\n通用规则：\n- 不生成旧变量树更新块。\n- 不生成旧补丁数组。\n- 不在正文中混入 SQL。\n- 只更新本轮剧情实际变化的数据库字段。\n- 单行表使用 WHERE row_id = 1，多行表使用业务主键定位。\n';
}

function dbState() {
  return '# 当前剧情数据库状态\n\n<status_current_variables>\n阶段：{[sql "SELECT phase FROM process_state WHERE row_id=1"]}\n日期：{[sql "SELECT date_mmdd FROM process_state WHERE row_id=1"]}\n主角：HP {[sql "SELECT hp_current FROM protagonist_core WHERE row_id=1"]}/{[sql "SELECT hp_max FROM protagonist_core WHERE row_id=1"]}；MP {[sql "SELECT mp_current FROM protagonist_core WHERE row_id=1"]}/{[sql "SELECT mp_max FROM protagonist_core WHERE row_id=1"]}\n人格：{[sql "SELECT personality FROM protagonist_core WHERE row_id=1"]}\n姿态：{[sql "SELECT combat_stance FROM protagonist_core WHERE row_id=1"]}\nBoss：{[sql "SELECT level_name FROM world_level WHERE row_id=1"]}；韧性 {[sql "SELECT boss_toughness FROM world_level WHERE row_id=1"]}\n快感：{[sql "SELECT pleasure_value FROM pleasure_state WHERE row_id=1"]}/{[sql "SELECT orgasm_threshold FROM pleasure_state WHERE row_id=1"]}\n污染度：{[sql "SELECT pollution FROM pleasure_state WHERE row_id=1"]}%\n待处理事件：{[sql "SELECT event_key FROM event_queue WHERE status!=\'已处理\'"]}\n</status_current_variables>';
}

function manual() {
  return '# 数据库变量处理手册\n\n本卡为 shujuku / SP·数据库 II 纯数据库卡。变量主路径为数据库表格，唯一推荐更新块为 <tableEdit>。\n\n## 核心表格\n\n- 进程状态表：阶段、日期、主角创建完毕、幕间计数。\n- 世界关卡表：Boss、关卡、韧性、威胁等级、幕间事件。\n- 主角核心状态表：HP、MP、人格、变身、净化之力、污秽魔力、战斗姿态。\n- 快感状态表：快感、高潮阈值、污染度、总高潮次数。\n- 性癖经验表：性癖经验、等级、觉醒状态。\n- 生理状态表：受孕、阴道、后穴、精液存量。\n- 体内异物与来源表：体内异物、来源、残留。\n- 事件队列表：所有待处理事件。\n- 世界备注表、道具栏表、永久身体改造表、战斗记录与名声表：长期记忆与状态。\n\n## 标准更新块\n\n<tableEdit>\n-- Analysis: 简述本轮需要更新的数据库状态。\nUPDATE protagonist_core SET hp_current = hp_current - 10 WHERE row_id = 1;\nUPDATE pleasure_state SET pleasure_value = pleasure_value + 15 WHERE row_id = 1;\n</tableEdit>\n\n## 禁止\n\n- 不输出旧变量树更新。\n- 不输出旧补丁数组。\n- 不把数据库 SQL 混入故事正文。\n- 不全量覆盖表格，只更新本轮发生变化的字段。';
}

function initInfo() {
  return '# 数据库初始表格说明\n\n本卡的初始化数据位于内嵌数据库模板：\n\n- extracted/tables/embedded-template.pretty.json\n- extracted/tables/readable/\n\n本条目仅保留为说明，不参与注入。角色创建与初始化应写入主角档案表、进程状态表、主角核心状态表、生理状态表、快感状态表和相关多行表。';
}

function eventContent(title, eventKey, eventType) {
  return base(title) + '\n触发条件：事件队列表存在事件 `' + eventKey + '`，且状态不是“已处理”。\n\n处理要求：\n- 正文演绎该事件的即时后果。\n- 事件处理完必须清理事件队列。\n- 如发生数值或长期状态变化，写入对应数据库表。\n\n' + block(['处理 ' + eventKey + ' 后清理事件队列。', "DELETE FROM event_queue WHERE event_key = '" + eventKey + "';"]);
}

function phaseContent(title, phases) {
  return base(title) + '\n适用阶段：' + phases.join('、') + '。\n\n请根据【当前剧情数据库状态】中的阶段、Boss、HP、MP、快感、事件队列和世界备注进行叙事。若需要更新状态，使用数据库更新块。\n\n' + block(['根据本条目实际叙事需要更新数据库；以下为示例，实际输出时只保留必要语句。', "UPDATE record_fame SET current_combat_log = '根据本轮剧情填写' WHERE row_id = 1;"]);
}

function personalityContent(title, personality) {
  return base(title) + '\n适用人格：' + personality + '。\n\n当【当前剧情数据库状态】显示人格为 `' + personality + '` 时，本条目的设定、语气、世界观与事件判断生效。若人格不匹配，请忽略本条目的叙事指令。\n';
}

function actionContent(title) {
  return base(title) + '\n本条目按玩家关键词或剧情语义触发。执行后如涉及资源消耗、状态恢复、道具变化、受孕/分娩/净化等长期状态，必须写入数据库表。\n\n' + block(['行动结算示例；实际输出时根据剧情替换字段和值。', "UPDATE protagonist_core SET purification_power = purification_power - 100 WHERE row_id = 1;", "UPDATE physiology SET pregnancy_status = '未受孕', pregnancy_source = '无', pregnancy_counter = 0 WHERE row_id = 1;"]);
}

function contentFor(file, data) {
  const title = data.comment || path.basename(file, '.yaml');

  if (file.startsWith('012-')) { data.comment = '[数据库] 变量处理手册'; return manual(); }
  if (file.startsWith('045-')) { data.comment = '[数据库] 初始表格说明'; data.enabled = false; return initInfo(); }
  if (file.startsWith('048-')) { data.comment = '[数据库] 当前系统变量状态'; return dbState(); }
  if (file.startsWith('032-')) {
    return base(title) + '\n最终输出结构：\n\n1. 故事正文。\n2. <tableEdit> 数据库更新块。\n\n' + block(['本轮剧情完成后的数据库更新示例。', "UPDATE record_fame SET current_combat_log = '本轮剧情摘要' WHERE row_id = 1;"]);
  }

  const eventRules = [
    ['010-', '性癖觉醒事件', '成长'], ['011-', '状态演化事件', '系统'], ['014-', '受孕事件', '生理'], ['021-', '武装升级事件', '成长'], ['027-', '强制解除变身', '系统'], ['028-', '幕间休息完全恢复', '幕间'], ['030-', '主角能力成长', '成长'], ['033-', '高潮事件', '生理'], ['039-', '战后声望结算事件', '声望'], ['040-', '知名度升级事件', '声望'], ['041-', '体内满溢事件', '生理'], ['042-', '魔法少女恶堕', '成长'], ['043-', '线索整理事件', '系统'], ['049-', '淫纹显现事件', '生理']
  ];
  for (const [prefix, key, type] of eventRules) if (file.startsWith(prefix)) return eventContent(title, key, type);

  if (file.startsWith('013-') || file.startsWith('034-')) return actionContent(title);
  if (file.startsWith('046-')) return base(title) + '\n角色创建完成时，将创角结果写入数据库表。\n\n' + block(['创角完成，写入主角档案并进入幕间休息。', "UPDATE protagonist_profile SET name = '待填写', magical_name = '待填写', appearance_summary = '根据创角正文填写', identity_job = '根据创角正文填写', personality = '根据创角正文填写', weapon_ability = '根据创角正文填写' WHERE row_id = 1;", "UPDATE process_state SET protagonist_created = 'true', phase = '幕间休息', current_task = '角色创建完成，进入初始幕间' WHERE row_id = 1;"]);

  if (file.startsWith('001-') || file.startsWith('005-') || file.startsWith('006-') || file.startsWith('007-') || file.startsWith('008-') || file.startsWith('009-')) return personalityContent(title, '善良');
  if (file.startsWith('016-') || file.startsWith('017-') || file.startsWith('019-') || file.startsWith('020-') || file.startsWith('022-') || file.startsWith('023-')) return personalityContent(title, '堕落');

  if (file.startsWith('002-')) return phaseContent(title, ['战斗准备']);
  if (file.startsWith('003-')) return phaseContent(title, ['战斗胜利', '战斗败北', '战后处理']);
  if (file.startsWith('004-')) return phaseContent(title, ['幕间休息', '战斗准备']);
  if (file.startsWith('015-') || file.startsWith('025-') || file.startsWith('029-')) return phaseContent(title, ['战斗回合', '终结回合']);
  if (file.startsWith('031-') || file.startsWith('035-')) return phaseContent(title, ['幕间休息']);

  return base(title) + '\n本条目为数据库版通用叙事/规则条目。请根据【当前剧情数据库状态】和数据库表格注入内容决定是否生效。';
}

let changed = 0;
for (const file of files) {
  const fullPath = path.join(dir, file);
  const data = yaml.load(fs.readFileSync(fullPath, 'utf8'));
  if (!data || typeof data !== 'object') continue;
  if (!legacyPattern.test(String(data.content || ''))) continue;
  data.content = contentFor(file, data);
  fs.writeFileSync(fullPath, yaml.dump(data, { lineWidth: -1, noRefs: true, quotingType: "'" }), 'utf8');
  changed += 1;
  console.log('migrated', file);
}
console.log('changed', changed);
