(() => {
  "use strict";

  const KEY = "cryptLord.pathwayPlayState";
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

  function record(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function parseRank(seqStr) {
    if (!seqStr) return 10;
    const match = String(seqStr).match(/序列\s*(\d+)/);
    if (match) return parseInt(match[1], 10);
    if (/神|旧日|支柱/.test(seqStr)) return 0;
    if (/半神|圣者/.test(seqStr)) return 4;
    return 10;
  }

  const PATHWAY_CONFIGS = Object.freeze({
    "占卜家": {
      name: "占卜家",
      title: "愚者途径",
      features: [
        { id: "marionette", name: "秘偶系统", minRank: 5, desc: "序列5「秘偶大师」解锁。操控灵体之线将目标转化为主控或待命秘偶。" }
      ]
    },
    "秘祈人": {
      name: "秘祈人",
      title: "倒吊人途径",
      features: [
        { id: "grazing", name: "放牧灵魂", minRank: 5, desc: "序列5「牧羊人」解锁。放牧逝者或非凡者灵魂，最多同时驱策3具灵魂能力。" }
      ]
    },
    "观众": {
      name: "观众",
      title: "观众途径",
      features: [
        { id: "imagination", name: "空想", minRank: 1, desc: "序列1解锁途径投影；序列0扩展为两个栏位，并可分离作家特性。" }
      ]
    },
    "偷盗者": {
      name: "偷盗者",
      title: "错误途径",
      features: [
        { id: "clone", name: "寄生分身", minRank: 4, desc: "序列4「寄生者」解锁。分化灵体分身寄生目标或独立行动。" }
      ]
    },
    "阅读者": {
      name: "阅读者",
      title: "白塔途径",
      features: [
        { id: "reader-mystic", name: "秘术强化", minRank: 5, desc: "序列5解锁秘术栏位；解析和学习高好感人物的能力以增加秘术点数。" }
      ]
    },
    "通识者": {
      name: "通识者",
      title: "隐者途径",
      features: [
        { id: "savant-material", name: "材料加工", minRank: 6, desc: "认定来源中的具体材质，选择加工工序，将产出存入材料仓库。" },
        { id: "savant-enhancement", name: "装备强化", minRank: 6, desc: "消耗加工材料抽取模块，并在装备间安装或卸下。" }
      ]
    },
    "窥秘人": {
      name: "窥秘人",
      title: "隐者途径",
      features: [
        { id: "reenactment", name: "神秘再现", minRank: 4, desc: "认证神秘学知识，解锁原著法术并创造魔法与巫术。" },
        { id: "scroll", name: "卷轴制造", minRank: 6, desc: "设定卷轴样式，消耗对应位阶的材料批量制造。" }
      ]
    },
    "萨满": {
      name: "萨满",
      title: "萨满途径",
      features: [
        { id: "shaman-territory", name: "设置领地图腾", minRank: 9, desc: "认证固定领地；三天后可消耗材料更换，战斗时按地点判定六维效果。" },
        { id: "shaman-picture", name: "制造画中人", minRank: 5, desc: "消耗至少10点材料制造角色卡，可在战斗中召唤。" }
      ]
    },
    "仲裁人": {
      name: "仲裁人",
      title: "审判者途径",
      features: [
        { id: "jurisdiction", name: "设定辖区", minRank: 8, desc: "认证基础辖区与正式任命，战斗时按归属获得辖区加成。" }
      ]
    }
  });

  function resolvePathway(stat) {
    if (!stat) return { pathway: "未知", rank: 10, title: "未知途径", features: [] };
    const seqStr = String(stat.当前序列 || stat.序列 || stat.位阶 || "普通人").trim();
    const pathwayName = String(stat.当前途径 || stat.途径 || stat.pathway || stat.所属途径 ||
      (seqStr.includes("萨满途径") || seqStr.includes("高维俯视者") ? "萨满" :
        seqStr.includes("仲裁人途径") || seqStr.includes("失序者") ? "仲裁人" : "")).replace(/途径$/, "").trim();
    const specialGate = pathwayName === "萨满" ? modules["cryptLord.shamanTerritory"]?.gate(stat)
      : pathwayName === "仲裁人" ? modules["cryptLord.arbiterJurisdiction"]?.gate(stat) : null;
    const rank = specialGate?.unlocked ? specialGate.rank : parseRank(seqStr);
    const cfg = PATHWAY_CONFIGS[pathwayName] || {
      name: pathwayName || "自由非凡者",
      title: `${pathwayName || "未定"}途径`,
      features: []
    };
    return {
      pathway: cfg.name,
      title: cfg.title,
      sequence: seqStr,
      rank,
      features: (cfg.features || []).map(f => ({
        ...f,
        unlocked: rank <= f.minRank
      }))
    };
  }

  function getPlayData(mvuState) {
    const stat = mvuState?.stat_data || {};
    const world = mvuState?.world_data || {};
    return {
      marionettes: Array.isArray(stat.秘偶列表) ? stat.秘偶列表 : (record(stat.秘偶列表) ? Object.values(stat.秘偶列表).filter(v => v && typeof v === "object" && v.$meta === undefined) : []),
      grazedSouls: Array.isArray(stat.灵魂列表) ? stat.灵魂列表 : (record(stat.灵魂列表) ? Object.values(stat.灵魂列表).filter(v => v && typeof v === "object" && v.$meta === undefined) : []),
      activeSouls: Array.isArray(stat.激活灵魂) ? stat.激活灵魂 : [],
      constructs: Array.isArray(stat.造物列表) ? stat.造物列表 : (record(stat.造物列表) ? Object.values(stat.造物列表).filter(v => v && typeof v === "object" && v.$meta === undefined) : []),
      clones: Array.isArray(stat.分身列表) ? stat.分身列表 : (record(stat.分身列表) ? Object.values(stat.分身列表).filter(v => v && typeof v === "object" && v.$meta === undefined) : []),
      spells: Array.isArray(stat.模仿法术) ? stat.模仿法术 : (record(stat.模仿法术) ? Object.values(stat.模仿法术).filter(v => v && typeof v === "object" && v.$meta === undefined) : [])
    };
  }

  function addMarionette(mvuState, puppet) {
    const next = structuredClone(mvuState);
    if (!next.stat_data) next.stat_data = {};
    if (!Array.isArray(next.stat_data.秘偶列表)) {
      next.stat_data.秘偶列表 = [];
    }
    const item = {
      id: puppet.id || `puppet_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: String(puppet.name || "无名秘偶").trim(),
      sequence: String(puppet.sequence || "序列9").trim(),
      status: String(puppet.status || "待命").trim(),
      abilities: Array.isArray(puppet.abilities) ? puppet.abilities : [],
      vitality: Number(puppet.vitality) || 100,
      active: Boolean(puppet.active)
    };
    next.stat_data.秘偶列表.push(item);
    return { mvuState: next, item };
  }

  function toggleMarionetteActive(mvuState, puppetId) {
    const next = structuredClone(mvuState);
    if (!next.stat_data) next.stat_data = {};
    const list = Array.isArray(next.stat_data.秘偶列表) ? next.stat_data.秘偶列表 : [];
    let target = null;
    list.forEach(p => {
      if (p.id === puppetId) {
        p.active = !p.active;
        target = p;
      }
    });
    return { mvuState: next, target };
  }

  function addGrazedSoul(mvuState, soul) {
    const next = structuredClone(mvuState);
    if (!next.stat_data) next.stat_data = {};
    if (!Array.isArray(next.stat_data.灵魂列表)) {
      next.stat_data.灵魂列表 = [];
    }
    const item = {
      id: soul.id || `soul_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: String(soul.name || "放牧之灵").trim(),
      sequence: String(soul.sequence || "序列").trim(),
      skills: Array.isArray(soul.skills) ? soul.skills : ["灵性震慑", "非凡打击"],
      active: Boolean(soul.active)
    };
    next.stat_data.灵魂列表.push(item);
    return { mvuState: next, item };
  }

  function toggleGrazedSoulActive(mvuState, soulId) {
    const next = structuredClone(mvuState);
    if (!next.stat_data) next.stat_data = {};
    const list = Array.isArray(next.stat_data.灵魂列表) ? next.stat_data.灵魂列表 : [];
    const activeCount = list.filter(s => s.active).length;
    let target = null;
    list.forEach(s => {
      if (s.id === soulId) {
        if (!s.active && activeCount >= 3) {
          throw new Error("最多同时驱策 3 具放牧灵魂，请先取消驱策其他灵魂。");
        }
        s.active = !s.active;
        target = s;
      }
    });
    return { mvuState: next, target };
  }

  function addConstruct(mvuState, construct) {
    const next = structuredClone(mvuState);
    if (!next.stat_data) next.stat_data = {};
    if (!Array.isArray(next.stat_data.造物列表)) {
      next.stat_data.造物列表 = [];
    }
    const item = {
      id: construct.id || `construct_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: String(construct.name || "炼金机关").trim(),
      type: String(construct.type || "机关造物").trim(),
      effect: String(construct.effect || "提供额外防护与侦测").trim(),
      autonomy: Boolean(construct.autonomy)
    };
    next.stat_data.造物列表.push(item);
    return { mvuState: next, item };
  }

  function addMarauderClone(mvuState, clone) {
    const next = structuredClone(mvuState);
    if (!next.stat_data) next.stat_data = {};
    if (!Array.isArray(next.stat_data.分身列表)) {
      next.stat_data.分身列表 = [];
    }
    const item = {
      id: clone.id || `clone_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: String(clone.name || "寄生分身").trim(),
      target: String(clone.target || "暗中潜伏").trim(),
      location: String(clone.location || "同区域").trim(),
      mission: String(clone.mission || "监控环境与情报收集").trim()
    };
    next.stat_data.分身列表.push(item);
    return { mvuState: next, item };
  }

  function formatActionPrompt(mode, actionName, targetName, details = "") {
    let tag = "【途径指令】";
    if (mode === "marionette") tag = "【途径指令·秘偶】";
    else if (mode === "grazing") tag = "【途径指令·放牧】";
    else if (mode === "imagination") tag = "【途径指令·空想】";
    else if (mode === "clone") tag = "【途径指令·分身】";
    else if (mode === "construct") tag = "【途径指令·造物】";
    else if (mode === "mimic") tag = "【途径指令·模仿】";

    let text = `${tag} 执行「${actionName}」：对标目标「${targetName}」`;
    if (details) text += `，细节参数：${details}`;
    return text;
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true }); },
    resolvePathway,
    getPlayData,
    addMarionette,
    toggleMarionetteActive,
    addGrazedSoul,
    toggleGrazedSoulActive,
    addConstruct,
    addMarauderClone,
    formatActionPrompt,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    }
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
