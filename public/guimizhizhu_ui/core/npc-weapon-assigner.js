(() => {
  'use strict';
  const KEY = 'cryptLord.npcWeaponAssigner';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  // 原版两份世俗池；一行对应一种固定的四维攻击，不是 NPC 背包物品。
  const human = [
    ['徒手格斗', '棍棒级', '近战无精度', '近战', '无AOE', '赤手空拳', '手无寸铁的平民'],
    ['单手钝器', '棍棒级', '近战无精度', '近战', '无AOE', '单手钝器', '警棍、扳手、椅腿'],
    ['长柄钝器', '棍棒级', '近战无精度', '近战', '霰弹枪级', '长柄钝器', '铁锹、船桨、长棍'],
    ['短刃', '砍刀级', '近战无精度', '近战', '无AOE', '贴身短刃', '匕首、剃刀、碎酒瓶'],
    ['长刃', '砍刀级', '近战无精度', '近战', '无AOE', '一人份的长刃', '佩剑、砍刀、斧'],
    ['长柄利刃', '砍刀级', '近战无精度', '近战', '霰弹枪级', '长柄利刃', '镰刀、长矛、刺刀'],
    ['冲阵劈砍', '重型手枪级', '近战无精度', '近战', '无AOE', '借马势重劈', '只给骑在马上的骑兵'],
    ['投掷杂物', '棍棒级', '手枪级', '中距离', '无AOE', '隔段距离投掷', '石块、酒瓶、砖头'],
    ['投掷利器', '砍刀级', '手枪级', '中距离', '无AOE', '隔段距离掷出利器', '飞刀、标枪、鱼叉'],
    ['短管火枪', '手枪级', '手枪级', '中距离', '无AOE', '单手火枪', '左轮、袖枪'],
    ['大口径短枪', '重型手枪级', '手枪级', '中距离', '无AOE', '大口径单手火枪', '军官、职业杀手'],
    ['散射火枪', '手枪级', '霰弹枪级', '中距离', '霰弹枪级', '近距散射火枪', '猎枪、鸟枪、火铳'],
    ['长管步枪', '步枪级', '步枪级', '远程', '无AOE', '长管步枪', '列兵、猎鹿枪'],
    ['精准长枪', '狙击枪级', '狙击枪级', '极远', '无AOE', '架设的精准长枪', '军中神射手、职业枪手'],
    ['投掷爆炸物', '炸弹级', '手枪级', '中距离', '手雷级', '投掷爆炸物', '掷弹兵、工兵'],
  ];
  const nonhuman = [
    ['贴身轻伤', '棍棒级', '近战无精度', '近战', '无AOE', '贴身轻击', '小体型或孱弱生物'],
    ['贴身见血', '砍刀级', '近战无精度', '近战', '无AOE', '贴身撕裂', '寻常猛兽'],
    ['贴身扫中一片', '砍刀级', '近战无精度', '近战', '霰弹枪级', '贴身扫击', '攻击范围横跨一片'],
    ['贴身猛撞', '重型手枪级', '近战无精度', '近战', '无AOE', '整个身体猛撞', '只给庞大巨物'],
    ['远处骚扰', '棍棒级', '手枪级', '中距离', '无AOE', '远处骚扰', '远处纠缠的生物'],
    ['远处连番袭击', '砍刀级', '手枪级', '中距离', '无AOE', '远处扑击', '反复扑击的生物'],
    ['远处重伤一人', '手枪级', '手枪级', '中距离', '无AOE', '远距重伤', '有远距手段的生物'],
    ['远处扫中一片', '手枪级', '霰弹枪级', '中距离', '霰弹枪级', '远处散射', '远距覆盖攻击'],
    ['远距重击', '步枪级', '步枪级', '远程', '无AOE', '远距重击', '远距猎杀生物'],
    ['极远覆盖一片', '步枪级', '狙击枪级', '极远', '霰弹枪级', '极远覆盖', '极远范围攻击'],
  ];
  const fields = ['名称', '威力量级', '精度', '射程', 'AOE', '说明', '适合谁'];
  const rows = pool => Object.freeze(pool.map(values =>
    Object.freeze(Object.fromEntries(fields.map((field, index) => [field, values[index]])))));
  const pools = Object.freeze({ human: rows(human), nonhuman: rows(nonhuman) });
  const index = new Map([...pools.human, ...pools.nonhuman].map(row => [row.名称, row]));
  const hints = ['兽', '怪', '恶灵', '幽灵', '亡灵', '灵体', '尸', '虫', '龙', '妖', '魔物', '犬', '狼', '非人'];
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const active = value => Array.isArray(value) ? value.some(active)
    : record(value) ? (Boolean(value.名称 && value.战斗效果?.基础效果) ||
      Object.entries(value).some(([key, item]) => key !== '$meta' && active(item)))
      : false;
  const generated = ability => ability?.$系统兜底攻击 === true ||
    String(ability?.名称 || ability?.name || '').trim() ===
      '攻击手段（由你根据攻击者的人设决定具体是什么手段）';
  function realMove(ability) {
    return record(ability) && !generated(ability) && ability.isPassive !== true &&
      !/被动/.test(String(ability.类型 || '')) &&
      String(ability.名称 || ability.name || '').trim() !== '普通攻击';
  }
  function eligible(npc) {
    return record(npc) && modules['cryptLord.battleExperience']?.rank(npc.当前序列) === 10 &&
      !(Array.isArray(npc.能力清单) && npc.能力清单.some(realMove)) &&
      !active(npc.序列能力列表) && !active(npc.辅助能力列表);
  }
  function fallback(npc) {
    const description = [npc?.当前序列, npc?.模板, npc?.身份].map(value => String(value || '')).join(' ');
    return index.get(hints.some(hint => description.includes(hint)) ? '贴身见血' : '单手钝器');
  }
  function collect(data) {
    const enemy = data?.cryptLord?.personalBattle?.enemy;
    const npc = data?.npc_data?.[enemy?.npcKey];
    if (!enemy?.pendingLlmWeapon || !eligible(npc)) return [];
    return [{ 名称: enemy.name, 序列: String(npc.当前序列 || '普通人'),
      身份: String(npc.身份 || '未知'), 外貌: String(npc.外貌 || '未知'),
      npcKey: enemy.npcKey }];
  }
  function collectTeam(data) {
    return (data?.cryptLord?.teamBattle?.units || []).flatMap(unit => {
      const npc = data.npc_data?.[unit.id];
      if (unit.source !== 'npc' || !eligible(npc)) return [];
      return [{ 名称: unit.id, 序列: String(npc.当前序列 || '普通人'),
        身份: String(npc.身份 || '未知'), 外貌: String(npc.外貌 || '未知'),
        npcKey: unit.id }];
    });
  }
  function applyTeam(data, requested, picks) {
    const next = structuredClone(data);
    let applied = 0;
    for (const entry of Array.isArray(requested) ? requested : []) {
      const unit = next.cryptLord?.teamBattle?.units.find(row =>
        row.source === 'npc' && row.id === entry.npcKey);
      const npc = next.npc_data?.[entry.npcKey];
      if (!unit || !eligible(npc) || String(npc.身份 || '未知') !== entry.身份 ||
        String(npc.外貌 || '未知') !== entry.外貌 ||
        String(npc.当前序列 || '普通人') !== entry.序列) continue;
      const pick = picks?.get?.(entry.名称);
      unit.fallbackWeapon = { ...(pick?.spec || fallback(npc)),
        显示名: pick?.称呼 || pick?.spec?.名称 || fallback(npc).名称 };
      if (pick) applied++;
    }
    return { data: next, applied };
  }
  function section(npcs) {
    if (!Array.isArray(npcs) || !npcs.length) return '';
    const listing = pool => pool.map(row =>
      `${row.名称} | ${row.说明} | ${row.适合谁}`).join('\n');
    return `\n附加任务：为无技能的世俗 NPC 按身份挑选本场临时攻击方式，不给超自然能力。
角色 | 序列 | 身份 | 外貌
${npcs.map(row => [row.名称, row.序列, row.身份, row.外貌]
    .map(value => JSON.stringify(String(value).slice(0, 80))).join(' | ')).join('\n')}
能持械的人从下表挑；野兽或非人形从第二张表挑。每人只挑一类，火器须有合理来处；
精准长枪及爆炸物仅限正规武装人员，冲阵劈砍仅给骑兵，贴身猛撞仅给庞大巨物。
拿不准就选低威力，不编造类别。类别 | 说明 | 适合谁
${listing(pools.human)}
非人形类别 | 说明 | 适合谁
${listing(pools.nonhuman)}
在原战场 JSON 中添加 "NPC武器":[{"角色":"原名","类别":"表内类别","称呼":"本场出手称呼"}]。
称呼不超过8字；角色和类别必须与上表原样一致。`;
  }
  function parse(raw) {
    const out = new Map();
    for (const item of Array.isArray(raw) ? raw : []) {
      if (!record(item)) continue;
      const name = String(item.角色 || '').trim();
      const spec = index.get(String(item.类别 || '').trim());
      if (!name || !spec || out.has(name)) continue;
      out.set(name, { spec, 称呼: String(item.称呼 || '').replace(/\s+/g, '').slice(0, 8) });
    }
    return out;
  }
  function apply(data, requested, picks) {
    const enemy = data?.cryptLord?.personalBattle?.enemy;
    const entry = Array.isArray(requested) ? requested[0] : null;
    const pick = picks?.get?.(entry?.名称);
    const npc = data?.npc_data?.[entry?.npcKey];
    if (!entry || !pick || !enemy?.pendingLlmWeapon || enemy.npcKey !== entry.npcKey ||
      enemy.name !== entry.名称 || !eligible(npc) ||
      String(npc.身份 || '未知') !== entry.身份 || String(npc.外貌 || '未知') !== entry.外貌 ||
      String(npc.当前序列 || '普通人') !== entry.序列) return { data, applied: 0 };
    const next = structuredClone(data);
    next.cryptLord.personalBattle.enemy.fallbackWeapon = {
      ...pick.spec, 显示名: pick.称呼 || pick.spec.名称,
    };
    next.cryptLord.personalBattle.enemy.pendingLlmWeapon = false;
    return { data: next, applied: 1 };
  }
  const api = Object.freeze({
    status: () => Object.freeze({ key: KEY, ready: true }),
    pools, eligible, fallback, collect, section, parse, apply, collectTeam, applyTeam,
    dispose() {
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
