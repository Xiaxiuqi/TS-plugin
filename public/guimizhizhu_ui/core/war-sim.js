(() => {
  'use strict';

  const KEY = 'cryptLord.warSim';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error("[" + KEY + "] shared/contract.js 尚未加载");
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }

window.WarSim = (function () {
  'use strict';

  // ---------------- 配置 ----------------

  // DB 在 GameDBManager.init 之后才有值；未 init 时直接读静态 _fallback，保证任何时机都能跑
  function rawConf() {
    const G = (typeof GameDBManager !== 'undefined') ? GameDBManager : null;
    if (!G) return {};
    const fromDB = G.DB && G.DB.warConfig;
    if (fromDB && Object.keys(fromDB).length) return fromDB;
    return (G._fallback && G._fallback.warConfig) || {};
  }

  // 一场战斗开始时解析一次，之后全程用这份快照，避免中途配置变动导致结算不自洽
  function resolveConf(override) {
    const c = Object.assign({}, rawConf(), override || {});
    const d = Object.assign({}, (rawConf().defaults || {}), (c.defaults || {}));
    const pp = Object.assign({}, (rawConf().pp || {}), (c.pp || {}));
    return {
      cols: (c.board && c.board.cols) ?? 8,
      rows: (c.board && c.board.rows) ?? 6,
      maxPiecesPerSide: c.maxPiecesPerSide ?? 8,
      tickMs: c.tickMs ?? 100,
      battleSecondsPerTick: c.battleSecondsPerTick ?? 36,
      segmentTicks: c.segmentTicks ?? 100,
      stalemateTicks: c.stalemateTicks ?? 300,
      hardCapTicks: c.hardCapTicks ?? 36000,
      armorFactor: c.armorFactor ?? 0.05,
      baseProjectileSpeed: c.baseProjectileSpeed ?? 3,
      minDamage: c.minDamage ?? 1,
      weather: c.weather || 'NEUTRAL',
      hazards: Array.isArray(c.hazards) ? c.hazards : [],
      enrageDelayMs: c.enrageDelayMs ?? 120000,
      reportMaxDamageSources: c.reportMaxDamageSources ?? 3,
      recordEvents: c.recordEvents !== false,
      abilities: c.abilities || {},
      pp: {
        onAttack: pp.onAttack ?? 5,
        passivePerSecond: pp.passivePerSecond ?? 10,
        damageRatioCap: pp.damageRatioCap ?? 0.25,
      },
      defaults: {
        speed: d.speed ?? 50,
        range: d.range ?? 1,
        def: d.def ?? 0,
        speDef: d.speDef ?? 0,
        critChance: d.critChance ?? 10,
        critPower: d.critPower ?? 2,
        ap: d.ap ?? 0,
        dodge: d.dodge ?? 0,
        luck: d.luck ?? 0,
        shield: d.shield ?? 0,
        maxPP: d.maxPP ?? 100,
        ability: d.ability || 'HEAVY_STRIKE',
        attackFrames: d.attackFrames || { d: 18, t: 36 },
      },
    };
  }

  // ---------------- 通用工具 ----------------

  // 种子随机：同样的输入必然产出同样的战斗，便于复现与排查
  function makeRng(seed) {
    let a = (Number(seed) || 0) >>> 0;
    if (a === 0) a = 0x9e3779b9;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const lowClamp = (floor) => (v) => Math.max(floor, v);   // 下限夹取
  const highClamp = (ceil) => (v) => Math.min(ceil, v);    // 上限夹取

  // 射程判定用切比雪夫（方形范围），视野与寻路用曼哈顿。两者混用会让索敌行为出错
  const distanceC = (x1, y1, x2, y2) => Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
  const distanceM = (x1, y1, x2, y2) => Math.abs(x1 - x2) + Math.abs(y1 - y2);

  // ---------------- 棋盘 ----------------

  const ORIENTATIONS = {
    DOWN: '0', DOWNRIGHT: '1', RIGHT: '2', UPRIGHT: '3',
    UP: '4', UPLEFT: '5', LEFT: '6', DOWNLEFT: '7',
  };

  class WarBoard {
    constructor(cols, rows) {
      this.cols = cols;
      this.rows = rows;
      this.cells = new Array(cols * rows).fill(undefined);
    }

    inBounds(x, y) { return x >= 0 && y >= 0 && x < this.cols && y < this.rows; }
    idx(x, y) { return y * this.cols + x; }

    getEntityOnCell(x, y) {
      if (!this.inBounds(x, y)) return undefined;
      return this.cells[this.idx(x, y)];
    }

    setEntityOnCell(x, y, v) {
      if (!this.inBounds(x, y)) return;
      this.cells[this.idx(x, y)] = v;
      if (v) { v.x = x; v.y = y; }
    }

    // 移动即交换两格；目标格通常为空，交换等价于位移
    swapCells(x1, y1, x2, y2) {
      const a = this.getEntityOnCell(x1, y1);
      const b = this.getEntityOnCell(x2, y2);
      this.cells[this.idx(x1, y1)] = b;
      this.cells[this.idx(x2, y2)] = a;
      if (a) { a.x = x2; a.y = y2; }
      if (b) { b.x = x1; b.y = y1; }
    }

    forEach(cb) {
      for (let y = 0; y < this.rows; y++) {
        for (let x = 0; x < this.cols; x++) cb(x, y, this.cells[this.idx(x, y)]);
      }
    }

    // 八邻接
    getAdjacentCells(x, y) {
      const out = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (this.inBounds(nx, ny)) out.push({ x: nx, y: ny, value: this.getEntityOnCell(nx, ny) });
        }
      }
      return out;
    }

    // 以 (x,y) 为心、切比雪夫距离恰为 range 的一圈格子。远程单位就停在这一圈上
    getOuterRangeCells(x, y, range) {
      const r = Math.max(1, Number(range) || 1);
      const out = [];
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const nx = x + dx, ny = y + dy;
          if (this.inBounds(nx, ny)) out.push({ x: nx, y: ny, value: this.getEntityOnCell(nx, ny) });
        }
      }
      return out;
    }

    occupiedKeys() {
      const set = new Set();
      this.forEach((x, y, v) => { if (v) set.add(x + ',' + y); });
      return set;
    }

    orientation(x1, y1, x2, y2) {
      const dx = Math.sign(x2 - x1);
      const dy = Math.sign(y2 - y1);
      if (dx === 0 && dy === 1) return ORIENTATIONS.DOWN;
      if (dx === 1 && dy === 1) return ORIENTATIONS.DOWNRIGHT;
      if (dx === 1 && dy === 0) return ORIENTATIONS.RIGHT;
      if (dx === 1 && dy === -1) return ORIENTATIONS.UPRIGHT;
      if (dx === 0 && dy === -1) return ORIENTATIONS.UP;
      if (dx === -1 && dy === -1) return ORIENTATIONS.UPLEFT;
      if (dx === -1 && dy === 0) return ORIENTATIONS.LEFT;
      if (dx === -1 && dy === 1) return ORIENTATIONS.DOWNLEFT;
      return ORIENTATIONS.DOWN;
    }
  }

  // A* 八方向寻路。blocked 为占位格键集合，起点自身不算阻挡；返回不含起点的步序列
  function findPath(board, blocked, sx, sy, gx, gy) {
    if (sx === gx && sy === gy) return [];
    const startKey = sx + ',' + sy;
    const goalKey = gx + ',' + gy;
    const h = (x, y) => distanceC(x, y, gx, gy);

    const open = [{ x: sx, y: sy, g: 0, f: h(sx, sy) }];
    const cameFrom = new Map();
    const gScore = new Map([[startKey, 0]]);
    const closed = new Set();

    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
      const cur = open.splice(bi, 1)[0];
      const curKey = cur.x + ',' + cur.y;
      if (curKey === goalKey) {
        const path = [];
        let k = curKey;
        while (k !== startKey) {
          const [px, py] = k.split(',').map(Number);
          path.unshift([px, py]);
          k = cameFrom.get(k);
          if (k === undefined) return [];
        }
        return path;
      }
      if (closed.has(curKey)) continue;
      closed.add(curKey);

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cur.x + dx, ny = cur.y + dy;
          if (!board.inBounds(nx, ny)) continue;
          const nk = nx + ',' + ny;
          if (closed.has(nk)) continue;
          if (nk !== goalKey && nk !== startKey && blocked.has(nk)) continue;
          const tentative = cur.g + 1;
          if (gScore.has(nk) && tentative >= gScore.get(nk)) continue;
          gScore.set(nk, tentative);
          cameFrom.set(nk, curKey);
          open.push({ x: nx, y: ny, g: tentative, f: tentative + h(nx, ny) });
        }
      }
    }
    return [];
  }

  // ---------------- 延迟命令 ----------------

  // 攻击不是即时结算：出手有前摇，弹道还要飞。到点才真正扣血，飞行途中目标可能已经死了
  class AttackCommand {
    constructor(delay, attacker, target, board) {
      this.delay = delay;
      this.attacker = attacker;
      this.target = target;
      this.board = board;
      this.executed = false;
    }
    update(dt) {
      if (this.executed) return;
      this.delay -= dt;
      if (this.delay <= 0) {
        this.executed = true;
        if (this.attacker.alive) this.attacker.state.attack(this.attacker, this.board, this.target);
      }
    }
  }

  // 通用延迟回调，供技能做多段伤害、延迟位移等
  class DelayedCommand {
    constructor(delay, fn) { this.delay = delay; this.fn = fn; this.executed = false; }
    update(dt) {
      if (this.executed) return;
      this.delay -= dt;
      if (this.delay <= 0) { this.executed = true; this.fn(); }
    }
  }

  // ---------------- 攻击时序 ----------------

  function getAttackTimings(unit) {
    const speed = unit.status.paralysis ? unit.speed / 2 : unit.speed;
    const attackDuration = 1000 / (0.4 + speed * 0.007);
    const frames = unit.attackFrames || { d: 18, t: 36 };
    const delayBeforeShoot = highClamp(attackDuration / 2)((attackDuration * frames.d) / frames.t);
    const distance = distanceC(unit.targetX, unit.targetY, unit.x, unit.y);
    const travelTime = (distance * 1000) / (unit.sim.conf.baseProjectileSpeed * (1 + speed / 100));
    return { delayBeforeShoot, travelTime, attackDuration };
  }

  function getMoveSpeed(unit) {
    // 0 速时系数 0.5，50 速为 1.0（500ms 一格），300 速为 3.5
    const speed = unit.status.paralysis ? unit.speed / 2 : unit.speed;
    return 0.5 + speed / 100;
  }

  // ---------------- 瞬移 ----------------
  // 引擎本身只有 MovingState.move 的逐格寻路。冲锋、掠袭这类位移技能需要一步到位，
  // 走这里。复用 move 事件让回放照常渲染，只是时长压到一格的水平。

  // forced = 被别人推拉，要过 canBeMoved；自己发动的位移不查
  function teleportUnit(unit, board, x, y, forced = false) {
    if (forced && !unit.canBeMoved) return false;
    if (!board.inBounds(x, y)) return false;
    const occupant = board.getEntityOnCell(x, y);
    if (occupant && occupant !== unit) return false;
    const oldX = unit.x, oldY = unit.y;
    if (oldX === x && oldY === y) return true;
    board.swapCells(oldX, oldY, x, y);
    unit.orientation = board.orientation(oldX, oldY, x, y);
    unit.setTarget(null);
    unit.sim.resetStale();
    unit.sim.emit('move', {
      id: unit.id, team: unit.team,
      from: { x: oldX, y: oldY }, to: { x, y },
      durationMs: 200, teleport: true,
    });
    return true;
  }

  // 贴到目标身边：取目标八邻接里离自己最近的空格
  function teleportNextTo(unit, board, target) {
    if (!target) return false;
    const cells = board.getAdjacentCells(target.x, target.y)
      .filter((c) => c.value === undefined)
      .sort((a, b) => distanceC(unit.x, unit.y, a.x, a.y) - distanceC(unit.x, unit.y, b.x, b.y));
    return cells.length ? teleportUnit(unit, board, cells[0].x, cells[0].y) : false;
  }

  // 脱离接触：跳到离最近敌人最远的空格
  function teleportAway(unit, board) {
    const enemies = unit.sim.units.filter((u) => u.alive && u.team !== unit.team);
    if (!enemies.length) return false;
    let best = null;
    let bestDist = -1;
    board.forEach((x, y, v) => {
      if (v !== undefined) return;
      let near = Infinity;
      enemies.forEach((e) => { near = Math.min(near, distanceC(x, y, e.x, e.y)); });
      if (near > bestDist) { bestDist = near; best = { x, y }; }
    });
    return best ? teleportUnit(unit, board, best.x, best.y) : false;
  }

  // ---------------- 周期性效果 ----------------

  // 自带间隔计时与触发计数，供技能挂持续性效果
  class PeriodicEffect {
    constructor(fn, origin, intervalMs) {
      this.apply = fn;
      this.origin = origin;
      this.intervalMs = intervalMs;
      this.timer = intervalMs;
      this.count = 0;
      this.expired = false;
    }
    update(dt, unit, board) {
      if (this.expired) return;
      this.timer -= dt;
      if (this.timer <= 0) {
        this.count++;
        this.apply(unit, board, this);
        this.timer = this.intervalMs;
      }
    }
  }

  // ---------------- 状态效果 ----------------
  // 29 种状态。这里保留英文语义名，展示层再换成战争说法。

  const CC_COOLDOWN = 1500;   // 冰冻/睡眠等硬控解除后的免疫窗口
  const MAX_SPEED = 300;
  const RAGE_SPEED_BONUS = 80;

  // 状态时长的天气修正要读它。棋子未挂到模拟器上时按无天气处理
  function weatherOf(unit) {
    return (unit && unit.sim && unit.sim.weather) || 'NEUTRAL';
  }

  // ---------------- 技能分档参数 ----------------
  // 数组下标 = 精锐等级 − 1。技能强度只由精锐决定，不进战力预算，属各精锐各自的福利。
  // 与设计文档「技能倍率」三张表一一对应，改数值时两边一起改。
  const ELITE_MULT      = [2.00, 2.50, 3.00, 3.50, 4.00];   // 单体一击的基础倍率
  const ELITE_SHIELD    = [0.20, 0.25, 0.30, 0.35, 0.40];   // 自身护盾，占施法者 maxHp
  const ELITE_SHIELD_AL = [0.06, 0.075, 0.09, 0.105, 0.12]; // 群体护盾，每名友军
  const ELITE_HEAL      = [0.10, 0.125, 0.15, 0.175, 0.20]; // 单体治疗
  const ELITE_BUFF      = [0.20, 0.25, 0.30, 0.35, 0.40];   // 属性增益 / 减益强度
  const ELITE_PP_GIFT   = [0.32, 0.40, 0.48, 0.56, 0.64];   // 回 PP，占目标 maxPP
  const ELITE_SPIKE     = [0.16, 0.20, 0.24, 0.28, 0.32];   // 荆棘反弹，占本次实伤
  const ELITE_BOUNCE    = [0.50, 0.63, 0.75, 0.88, 1.00];   // 反射 / 弹回，占本次实伤
  const ELITE_BUFF_MS   = [4000, 5000, 6000, 7000, 8000];   // 增益 / 减益 / 标记 / 荆棘
  const ELITE_REFLECT_MS = [1200, 1400, 1600, 1800, 2000];  // 反射：等于短时物理免疫，必须短
  const ELITE_PROTECT_MS = [400, 800, 1200, 1600, 2000];    // 完全免伤，比反射还狠

  // 形态系数：基础倍率是「单体一击」口径，覆盖面越广按比例摊薄，否则 AoE 白赚
  const SHAPE = { SINGLE: 1.00, MULTI3: 0.40, LINE: 0.55, AREA: 0.40, ALL: 0.30 };

  // 取分档参数。棋子的精锐等级由主兵种决定，见 DomainCore.armyToPiece
  function byElite(table, unit) {
    const lv = Math.max(1, Math.min(5, Number(unit && unit.eliteLevel) || 1));
    return table[lv - 1];
  }

  // 只有倒计时、解除时无额外动作的状态，统一走通用递减
  const PLAIN_STATUSES = [
    'silence', 'fatigue', 'protect', 'wound', 'armorReduction', 'runeProtect',
    'flinch', 'spikeArmor', 'magicBounce', 'reflect', 'blinded', 'safeguard',
  ];

  const POSITIVE_STATUSES = [
    'pokerus', 'resurrection', 'safeguard', 'protect', 'runeProtect',
    'electricField', 'psychicField', 'grassField', 'fairyField',
    'spikeArmor', 'magicBounce', 'reflect', 'enraged',
  ];

  const NEGATIVE_STATUSES = [
    'burn', 'silence', 'fatigue', 'freeze', 'sleep', 'confusion', 'wound',
    'paralysis', 'charm', 'flinch', 'armorReduction', 'curse', 'locked',
    'possessed', 'blinded',
  ];

  class WarStatus {
    constructor(enrageDelayMs) {
      // 负面
      this.burn = false; this.burnCooldown = 0; this.burnDamageCooldown = 1000; this.burnOrigin = null;
      this.poisonStacks = 0; this.poisonCooldown = 0; this.poisonDamageCooldown = 1000; this.poisonOrigin = null;
      this.silence = false; this.silenceCooldown = 0; this.silenceOrigin = null;
      this.fatigue = false; this.fatigueCooldown = 0;
      this.freeze = false; this.freezeCooldown = 0;
      this.sleep = false; this.sleepCooldown = 0;
      this.confusion = false; this.confusionCooldown = 0;
      this.wound = false; this.woundCooldown = 0; this.woundOrigin = null;
      this.paralysis = false; this.paralysisCooldown = 0;
      this.charm = false; this.charmCooldown = 0; this.charmOrigin = null;
      this.flinch = false; this.flinchCooldown = 0;
      this.armorReduction = false; this.armorReductionCooldown = 0;
      this.curse = false; this.curseCooldown = 0;
      this.locked = false; this.lockedCooldown = 0;
      this.possessed = false; this.possessedCooldown = 0; this.possessedOrigin = null;
      this.blinded = false; this.blindedCooldown = 0;
      // 正面
      this.protect = false; this.protectCooldown = 0;
      this.runeProtect = false; this.runeProtectCooldown = 0;
      this.safeguard = false; this.safeguardCooldown = 0;
      this.resurrection = false;
      this.resurrecting = false; this.resurrectingCooldown = 0;
      this.pokerus = false; this.pokerusCooldown = 3000;
      this.spikeArmor = false; this.spikeArmorCooldown = 0;
      this.magicBounce = false; this.magicBounceCooldown = 0;
      this.reflect = false; this.reflectCooldown = 0;
      this.enraged = false; this.enrageCooldown = 0;
      this.enrageDelay = enrageDelayMs;
      // 场地
      this.electricField = false;
      this.psychicField = false;
      this.grassField = false;
      this.fairyField = false;
      // 杂项
      this.skydiving = false;
      this.untargettable = false;
      this.ccCooldown = 0;
    }

    // 减控接入点。本作没有装备与羁绊，唯一来源是「庇护」
    applyDurationReductions(duration, unit) {
      return this.safeguard ? Math.round(duration * 0.5) : duration;
    }

    // 通用触发：取较长的那一个，不叠加
    trigger(key, duration, unit, origin) {
      if (this.runeProtect && NEGATIVE_STATUSES.indexOf(key) >= 0) return;
      const d = this.applyDurationReductions(duration, unit);
      this[key] = true;
      const ck = key + 'Cooldown';
      if (d > this[ck]) this[ck] = Math.round(d);
      if (origin && (key + 'Origin') in this) this[key + 'Origin'] = origin;
    }

    triggerBurn(duration, unit, origin) { this.trigger('burn', duration, unit, origin); }
    triggerSilence(duration, unit, origin) { this.trigger('silence', duration, unit, origin); }
    triggerFatigue(duration, unit) { this.trigger('fatigue', duration, unit); }
    // 血月延长创伤
    triggerWound(duration, unit, origin) {
      const d = weatherOf(unit) === 'BLOODMOON' ? duration * 1.3 : duration;
      this.trigger('wound', d, unit, origin);
    }
    triggerArmorReduction(duration, unit) { this.trigger('armorReduction', duration, unit); }
    triggerFlinch(duration, unit) { this.trigger('flinch', duration, unit); }
    // 不可叠加刷新；暴怒者减半，与冰冻、睡眠、锁定同一条口径
    triggerBlinded(duration, unit) {
      if (this.blinded || this.runeProtect) return;
      const d = this.applyDurationReductions(this.enraged ? duration / 2 : duration, unit);
      this.blinded = true;
      this.blindedCooldown = Math.round(d);
    }
    triggerSpikeArmor(duration) { this.spikeArmor = true; if (duration > this.spikeArmorCooldown) this.spikeArmorCooldown = duration; }
    triggerMagicBounce(duration) { this.magicBounce = true; if (duration > this.magicBounceCooldown) this.magicBounceCooldown = duration; }
    triggerReflect(duration) { this.reflect = true; if (duration > this.reflectCooldown) this.reflectCooldown = duration; }
    triggerSafeguard(duration, unit) { this.trigger('safeguard', duration, unit); }
    triggerRuneProtect(duration) { this.runeProtect = true; if (duration > this.runeProtectCooldown) this.runeProtectCooldown = duration; }

    triggerProtect(duration) {
      // 保护不可叠加，暴怒状态下无法进入保护
      if (!this.protect && !this.enraged) { this.protect = true; this.protectCooldown = duration; }
    }

    triggerPoison(duration, unit, origin, maxStacks = 3) {
      if (this.runeProtect) return;
      if (origin) this.poisonOrigin = origin;
      this.poisonStacks = Math.min(maxStacks, this.poisonStacks + 1);
      const d = this.applyDurationReductions(duration, unit);
      if (d > this.poisonCooldown) this.poisonCooldown = d;
    }

    triggerFreeze(duration, unit) {
      // 硬控不叠加：已在冰冻中再挨一次不会刷新时长，否则短控能顶掉长控
      if (this.freeze || this.runeProtect || this.skydiving || this.ccCooldown > 0) return;
      // 大旱把冰冻晒短
      let d = weatherOf(unit) === 'DROUGHT' ? duration * 0.7 : duration;
      if (this.enraged) d /= 2;
      d = this.applyDurationReductions(d, unit);
      this.freeze = true;
      this.freezeCooldown = Math.round(d);
    }

    triggerSleep(duration, unit) {
      if (this.sleep || this.runeProtect || this.skydiving || this.ccCooldown > 0) return;
      // 烈日下睡不沉
      let d = weatherOf(unit) === 'ZENITH' ? duration * 0.7 : duration;
      if (this.enraged) d /= 2;
      d = this.applyDurationReductions(d, unit);
      this.sleep = true;
      this.sleepCooldown = Math.round(d);
    }

    triggerConfusion(duration, unit) {
      if (this.confusion || this.runeProtect || this.ccCooldown > 0) return;
      // 沙暴里更容易迷向
      const base = weatherOf(unit) === 'SANDSTORM' ? duration * 1.3 : duration;
      const d = this.applyDurationReductions(base, unit);
      this.confusion = true;
      this.confusionCooldown = Math.round(d);
    }

    triggerParalysis(duration, unit) {
      if (this.runeProtect) return;
      const d = this.applyDurationReductions(duration, unit);
      this.paralysis = true;
      if (d > this.paralysisCooldown) this.paralysisCooldown = Math.round(d);
    }

    triggerCharm(duration, unit, origin) {
      if (this.charm || this.runeProtect) return;
      // 迷雾天魅惑更久
      const base = weatherOf(unit) === 'MISTY' ? duration * 1.3 : duration;
      const d = this.applyDurationReductions(base, unit);
      this.charm = true;
      this.charmCooldown = d;
      this.charmOrigin = origin;
      unit.setTarget(origin);
    }

    triggerCurse(duration, unit) {
      if (this.runeProtect) return;
      if (this.curse) { this.curseCooldown = 0; return; }  // 已被诅咒则立即引爆
      this.curse = true;
      this.curseCooldown = duration;
    }

    triggerLocked(duration, unit) {
      if (this.locked || this.skydiving || this.runeProtect || this.ccCooldown > 0) return;
      let d = unit.status.enraged ? duration / 2 : duration;
      d = this.applyDurationReductions(d, unit);
      this.locked = true;
      this.lockedCooldown = Math.round(d);
      if (unit.range !== 1) unit.toMovingState();  // 射程被压成 1，需要重新贴脸
      unit.range = 1;
    }

    // 策反：短时倒戈到对面阵营，到期归队。
    // 若本方除自己外已无人可倒戈，则退化为魅惑，避免把一方打空触发歼灭判定
    triggerPossessed(duration, unit, origin) {
      if (this.runeProtect || !origin) return;
      const stillOurs = unit.sim.units.filter(
        (u) => u.alive && u.team === unit.team && u.id !== unit.id && !u.status.possessed
      );
      if (!stillOurs.length) {
        this.triggerCharm(duration, unit, origin);
        return;
      }
      const d = this.applyDurationReductions(duration, unit);
      if (!this.possessed) unit.team = (unit.team === 'A') ? 'B' : 'A';
      this.possessed = true;
      this.possessedOrigin = origin;
      if (d > this.possessedCooldown) this.possessedCooldown = Math.round(d);
      unit.setTarget(null);
      origin.setTarget(null);
    }

    updatePossessed(dt, unit) {
      this.possessedCooldown -= dt;
      // 对面只剩被策反的人时提前解除，否则原队伍会被判全灭
      const otherTeam = (unit.team === 'A') ? 'B' : 'A';
      const others = unit.sim.units.filter((u) => u.alive && u.team === otherTeam);
      const allPossessed = others.length > 0 && others.every((u) => u.status.possessed);
      if (this.possessedCooldown <= 0 || allPossessed) {
        this.possessed = false;
        this.possessedCooldown = 0;
        unit.team = unit.baseTeam;
        this.possessedOrigin = null;
        unit.setTarget(null);
      }
    }

    // 战意蔓延：每 3 秒自身加攻，并把状态传给最多两名相邻友军
    triggerPokerus(unit) {
      if (!this.pokerus) { this.pokerus = true; this.pokerusCooldown = 3000; }
    }

    updatePokerus(dt, unit, board) {
      if (this.pokerusCooldown - dt > 0) { this.pokerusCooldown -= dt; return; }
      unit.addAttack(Math.max(1, Math.round(unit.baseAtk * 0.05)));
      let infected = 0;
      board.getAdjacentCells(unit.x, unit.y).forEach((c) => {
        if (infected >= 2 || !c.value) return;
        if (c.value.team === unit.team && !c.value.status.pokerus) {
          c.value.status.triggerPokerus(c.value);
          infected++;
        }
      });
      this.pokerusCooldown = 3000;
    }

    triggerRage(duration, unit) {
      if (!this.enraged) {
        this.enraged = true;
        this.protect = false;
        unit.addSpeed(RAGE_SPEED_BONUS);
        this.enrageCooldown = duration;
        // 暴怒把睡眠与冰冻的剩余时间砍半
        this.sleepCooldown = Math.floor(this.sleepCooldown * 0.5);
        this.freezeCooldown = Math.floor(this.freezeCooldown * 0.5);
      } else if (duration > this.enrageCooldown) {
        this.enrageCooldown = duration;
      }
    }

    triggerResurrection(unit) {
      this.resurrection = false;
      this.resurrecting = true;
      this.resurrectingCooldown = 2000;
      this.untargettable = true;
      this.clearNegative(unit);
    }

    clearNegative(unit) {
      NEGATIVE_STATUSES.forEach((k) => { this[k] = false; this[k + 'Cooldown'] = 0; });
      this.poisonStacks = 0;
      this.poisonCooldown = 0;
    }

    clearPositive(unit) {
      POSITIVE_STATUSES.forEach((k) => { if (k in this) this[k] = false; });
      this.ccCooldown = 0;
    }

    updateAll(dt, unit, board) {
      if (this.burn) this.updateBurn(dt, unit, board);
      if (this.poisonStacks > 0) this.updatePoison(dt, unit, board);
      if (this.freeze) this.updateFreeze(dt);
      if (this.sleep) this.updateSleep(dt);
      if (this.confusion) this.updateConfusion(dt, unit);
      if (this.charm) this.updateCharm(dt, unit);
      if (this.locked) this.updateLocked(dt, unit);
      if (this.curse) this.updateCurse(dt, unit, board);
      if (this.paralysis) this.updateParalysis(dt);
      if (this.possessed) this.updatePossessed(dt, unit);
      if (this.pokerus) this.updatePokerus(dt, unit, board);
      if (this.resurrecting) this.updateResurrecting(dt, unit);

      // 纯倒计时状态统一处理
      PLAIN_STATUSES.forEach((k) => {
        if (!this[k]) return;
        const ck = k + 'Cooldown';
        if (this[ck] - dt <= 0) {
          this[k] = false;
          this[ck] = 0;
          if ((k + 'Origin') in this) this[k + 'Origin'] = null;
        } else {
          this[ck] -= dt;
        }
      });

      this.updateRage(dt, unit);
      if (this.ccCooldown > 0) this.ccCooldown = lowClamp(0)(this.ccCooldown - dt);
    }

    updateBurn(dt, unit, board) {
      if (this.burnDamageCooldown - dt <= 0) {
        let dmg = unit.maxHp * 0.05;
        const w = unit.sim.weather;
        if (w === 'DROUGHT') dmg *= 1.3;
        else if (w === 'RAIN') dmg *= 0.7;
        unit.handleDamage({
          damage: dmg, board, attackType: 'TRUE',
          attacker: this.burnOrigin, shouldTargetGainMana: true, cause: 'burn',
        });
        this.burnDamageCooldown = 1000;
      } else {
        this.burnDamageCooldown -= dt;
      }
      if (this.burnCooldown - dt <= 0) { this.burn = false; this.burnOrigin = null; }
      else this.burnCooldown -= dt;
    }

    updatePoison(dt, unit, board) {
      if (this.poisonDamageCooldown - dt <= 0) {
        let dmg = unit.maxHp * 0.05 * this.poisonStacks;
        if (unit.sim.weather === 'RAIN') dmg *= 0.7;
        unit.handleDamage({
          damage: lowClamp(1)(Math.round(dmg)), board, attackType: 'TRUE',
          attacker: this.poisonOrigin, shouldTargetGainMana: false, cause: 'poison',
        });
        this.poisonDamageCooldown = 1000;
      } else {
        this.poisonDamageCooldown -= dt;
      }
      if (this.poisonCooldown - dt <= 0) {
        this.poisonStacks = 0;
        this.poisonOrigin = null;
        this.poisonDamageCooldown = 1000;
      } else {
        this.poisonCooldown -= dt;
      }
    }

    updateFreeze(dt) {
      if (this.freezeCooldown - dt <= 0) {
        this.freeze = false;
        this.ccCooldown = Math.max(this.ccCooldown, CC_COOLDOWN);
      } else {
        // 身上带火时冰冻掉得快一倍
        this.freezeCooldown -= dt * (this.burn ? 2 : 1);
      }
    }

    updateSleep(dt) {
      if (this.sleepCooldown - dt <= 0) {
        this.sleep = false;
        this.ccCooldown = Math.max(this.ccCooldown, CC_COOLDOWN);
      } else {
        this.sleepCooldown -= dt;
      }
    }

    updateConfusion(dt, unit) {
      if (this.confusionCooldown - dt <= 0) { this.confusion = false; unit.setTarget(null); }
      else this.confusionCooldown -= dt;
    }

    updateCharm(dt, unit) {
      if (this.charmCooldown - dt <= 0) { this.charm = false; this.charmOrigin = null; unit.setTarget(null); }
      else this.charmCooldown -= dt;
    }

    updateLocked(dt, unit) {
      if (this.lockedCooldown - dt <= 0) {
        this.locked = false;
        unit.range = unit.baseRange;
        this.ccCooldown = Math.max(this.ccCooldown, CC_COOLDOWN);
      } else {
        this.lockedCooldown -= dt;
      }
    }

    updateParalysis(dt) {
      if (this.paralysisCooldown - dt <= 0) { this.paralysis = false; this.paralysisCooldown = 0; }
      else this.paralysisCooldown -= dt;
    }

    // 诅咒到期直接抹除目标
    updateCurse(dt, unit, board) {
      this.curseCooldown -= dt;
      if (this.curseCooldown <= 0) {
        this.curse = false;
        unit.handleDamage({
          damage: 9999, board, attackType: 'TRUE',
          attacker: null, shouldTargetGainMana: false, cause: 'curse',
        });
      }
    }

    updateResurrecting(dt, unit) {
      if (this.resurrectingCooldown - dt <= 0) {
        this.resurrecting = false;
        this.untargettable = false;
        unit.resurrect();
      } else {
        this.resurrectingCooldown -= dt;
      }
    }

    // 全场超过 enrageDelay 后自动进入暴怒，用来推动僵持的战局收敛
    updateRage(dt, unit) {
      if (this.enrageDelay <= 0) return;   // 配置为 0 表示关闭
      if (!this.enraged && this.enrageDelay - dt <= 0 && !unit.sim.finished) {
        this.enraged = true;
        this.protect = false;
        unit.addSpeed(RAGE_SPEED_BONUS);
      } else if (this.enraged && this.enrageCooldown - dt <= 0 && this.enrageDelay - dt > 0) {
        this.enraged = false;
        unit.addSpeed(-RAGE_SPEED_BONUS);
      }
      this.enrageDelay -= dt;
      this.enrageCooldown -= dt;
    }
  }

  // ---------------- 状态机基类 ----------------
  // 每 tick 固定做五件事：推命令队列、推状态计时、推周期效果、检查强制待机、每秒结算

  class WarUnitState {
    constructor() { this.name = ''; }

    update(unit, dt, board) {
      this.updateCommands(unit, dt);
      unit.status.updateAll(dt, unit, board);
      unit.periodicEffects.forEach((e) => e.update(dt, unit, board));
      if (unit.focusMark > 0) unit.focusMark = Math.max(0, unit.focusMark - dt);

      if ((unit.status.resurrecting || unit.status.freeze || unit.status.sleep) && unit.state.name !== 'idle') {
        unit.toIdleState();
      }

      if (unit.oneSecondCooldown <= 0) {
        this.updateEachSecond(unit, board);
        unit.oneSecondCooldown = 1000;
      } else {
        unit.oneSecondCooldown = lowClamp(0)(unit.oneSecondCooldown - dt);
      }
    }

    updateCommands(unit, dt) {
      unit.commands.forEach((c) => c.update(dt));
      unit.commands = unit.commands.filter((c) => !c.executed);
    }

    updateEachSecond(unit, board) {
      unit.addPP(unit.sim.conf.pp.passivePerSecond, unit);
      unit.sim.applyWeatherPerSecond(unit, board);
      unit.sim.applyHazardsPerSecond(unit, board);
    }

    onEnter(unit) {}
    onExit(unit) {}

    // ---- 索敌：八种取法 ----

    getTargetsAtRange(unit, board) {
      const out = [];
      const r = unit.range;
      for (let x = lowClamp(0)(unit.x - r); x <= highClamp(board.cols - 1)(unit.x + r); x++) {
        for (let y = lowClamp(0)(unit.y - r); y <= highClamp(board.rows - 1)(unit.y + r); y++) {
          const v = board.getEntityOnCell(x, y);
          if (v && v.isTargettableBy(unit)) out.push(v);
        }
      }
      return out;
    }

    getNearestTargetAtRange(unit, board) {
      const targets = this.getTargetsAtRange(unit, board);
      let dist = unit.range + 1;
      let candidates = [];
      for (const t of targets) {
        const d = distanceC(unit.x, unit.y, t.x, t.y);
        if (d < dist) { dist = d; candidates = [t]; }
        else if (d === dist) candidates.push(t);
      }
      if (!candidates.length) return undefined;
      // 两层优先级：集火标记 > 嘲讽 > 随机。
      // 标记排在嘲讽前面，所以「集火指令」能把火力从对面的墙上拽开
      const marked = candidates.filter((c) => c.focusMark > 0);
      if (marked.length) return unit.sim.pickRandomIn(marked);
      const taunts = candidates.filter((c) => c.taunt);
      return unit.sim.pickRandomIn(taunts.length ? taunts : candidates);
    }

    getNearestTargetAtSight(unit, board) {
      let dist = 999;
      let candidates = [];
      board.forEach((x, y, v) => {
        if (v && v.isTargettableBy(unit)) {
          const d = distanceM(unit.x, unit.y, x, y);
          if (d < dist) { dist = d; candidates = [{ x, y, target: v }]; }
          else if (d === dist) candidates.push({ x, y, target: v });
        }
      });
      return candidates.length ? unit.sim.pickRandomIn(candidates) : null;
    }

    getFarthestTarget(unit, board) {
      let farthest;
      let maxD = 0;
      board.forEach((x, y, v) => {
        if (v && v.isTargettableBy(unit)) {
          const d = distanceM(unit.x, unit.y, x, y);
          if (d > maxD) { farthest = v; maxD = d; }
        }
      });
      return farthest;
    }

    getNearestAllies(unit, board) {
      let allies = [];
      let minD = 999;
      board.forEach((x, y, v) => {
        if (v && v.team === unit.team && v.id !== unit.id) {
          const d = distanceC(unit.x, unit.y, v.x, v.y);
          if (d < minD) { allies = [v]; minD = d; }
          else if (d === minD) allies.push(v);
        }
      });
      return allies;
    }

    getMostSurroundedCoordinateAvailablePlace(team, board) {
      const empties = [];
      board.forEach((x, y, v) => {
        if (v === undefined) {
          let n = 0;
          board.getAdjacentCells(x, y).forEach((c) => { if (c.value && c.value.team === team) n++; });
          empties.push({ x, y, neighbour: n });
        }
      });
      empties.sort((a, b) => b.neighbour - a.neighbour);
      return empties.length ? { x: empties[0].x, y: empties[0].y } : undefined;
    }

    getNearestAvailablePlaceCoordinates(unit, board, maxRange) {
      let candidates = [];
      let minD = 999;
      board.forEach((x, y, v) => {
        const d = distanceM(unit.x, unit.y, x, y);
        if (v === undefined && (maxRange === undefined || d <= maxRange)) {
          if (d < minD) { candidates = [{ x, y }]; minD = d; }
          else if (d === minD) candidates.push({ x, y });
        }
      });
      return candidates.length ? unit.sim.pickRandomIn(candidates) : null;
    }

    // 混乱：有一半概率把友军甚至自己也纳入候选
    getTargetWhenConfused(unit, board) {
      let dist = unit.range + 1;
      let candidates = [];
      const alsoAllies = !unit.sim.chance(0.5, unit);
      board.forEach((x, y, v) => {
        if (v && v.id !== unit.id && v.isTargettableBy(unit, true, alsoAllies)) {
          const d = distanceM(unit.x, unit.y, x, y);
          if (d < dist) { dist = d; candidates = [v]; }
          else if (d === dist) candidates.push(v);
        }
      });
      if (alsoAllies) candidates.push(unit);
      return candidates.length ? unit.sim.pickRandomIn(candidates) : undefined;
    }

    // ---- 普攻结算 ----
    // 由 AttackCommand 在前摇加弹道飞完之后调用，此刻目标可能已经不在了

    attack(unit, board, target) {
      if (!unit.alive || !target || target.hp <= 0) return;

      let damage = unit.atk;
      let physicalDamage = 0;
      let specialDamage = 0;
      let trueDamage = 0;
      let totalTakenDamage = 0;
      let attackType = unit.effects.has('SPECIAL_ATTACKS') ? 'SPECIAL' : 'PHYSICAL';

      const crit = unit.sim.chance(unit.critChance / 100, unit);
      if (crit) {
        // 暴击减免只削掉「超出基础伤害的那部分」，基础伤害不受影响
        const base = damage;
        const afterCrit = damage * unit.critPower;
        damage = lowClamp(0)(Math.round(base + (afterCrit - base) * target.critReductionFactor));
        target.counters.crit++;
      }

      if (target.effects.has('WONDER_ROOM')) attackType = 'SPECIAL';
      if (attackType === 'SPECIAL') damage = Math.ceil(damage * (1 + unit.ap / 100));

      let isAttackSuccessful = true;
      let hasAttackKilled = false;

      let dodgeChance = target.dodge;
      if (unit.status.blinded) dodgeChance += 0.5;
      const cannotDodge = target.status.paralysis || target.status.sleep
        || target.status.freeze || target.status.locked;
      if (!cannotDodge && unit.sim.chance(dodgeChance, target, 0.9)) {
        isAttackSuccessful = false;
        damage = 0;
        target.counters.dodgeCount++;
        unit.sim.emit('dodge', { id: target.id, team: target.team, byId: unit.id });
      }

      if (target.status.protect || target.status.skydiving) {
        isAttackSuccessful = false;
        damage = 0;
        unit.sim.emit('blocked', { id: target.id, team: target.team, byId: unit.id });
      }

      // 真伤占比：把普攻伤害按比例转成无视防御的真实伤害
      if (unit.trueDamageRatio > 0 && damage > 0) {
        trueDamage = Math.ceil(damage * unit.trueDamageRatio);
        damage = lowClamp(0)(damage * (1 - unit.trueDamageRatio));
      }

      if (attackType === 'SPECIAL') specialDamage += damage;
      else physicalDamage = damage;

      const totalDamage = physicalDamage + specialDamage + trueDamage;

      if (physicalDamage > 0) {
        const r = target.handleDamage({
          damage: physicalDamage, board, attackType: 'PHYSICAL',
          attacker: unit, shouldTargetGainMana: true, cause: 'attack',
        });
        totalTakenDamage += r.takenDamage;
        if (r.death) hasAttackKilled = true;
      }
      if (specialDamage > 0) {
        const r = target.handleDamage({
          damage: specialDamage, board, attackType: 'SPECIAL',
          attacker: unit, shouldTargetGainMana: true, cause: 'attack',
        });
        totalTakenDamage += r.takenDamage;
        if (r.death) hasAttackKilled = true;
      }
      if (trueDamage > 0) {
        const r = target.handleDamage({
          damage: trueDamage, board, attackType: 'TRUE',
          attacker: unit, shouldTargetGainMana: true, cause: 'attack',
        });
        totalTakenDamage += r.takenDamage;
        if (r.death) hasAttackKilled = true;
      }

      unit.runHooks('onAttack', {
        unit, target, board, physicalDamage, specialDamage, trueDamage,
        totalDamage, crit, hasAttackKilled,
      });
      if (isAttackSuccessful) {
        unit.runHooks('onHit', {
          attacker: unit, target, board, totalTakenDamage,
          physicalDamage, specialDamage, trueDamage,
        });
        target.runHooks('onAttackReceived', {
          unit: target, attacker: unit, board,
          physicalDamage, specialDamage, trueDamage, totalDamage, crit,
        });

        // 荆棘：只对贴脸近战生效，不免伤，按本次实伤回敬一部分并让伤口无法治疗。
        // 反弹量取实伤比例而非目标防御——防御不随精锐放大，按绝对值算对高阶等于零
        if (target.status.spikeArmor && target.alive && totalTakenDamage > 0
          && distanceC(unit.x, unit.y, target.x, target.y) === 1) {
          const back = Math.round(byElite(ELITE_SPIKE, target) * totalTakenDamage);
          unit.status.triggerWound(2000, unit, target);
          if (back > 0) {
            unit.handleDamage({
              damage: back, board, attackType: 'PHYSICAL',
              attacker: target, shouldTargetGainMana: true,
              isRetaliation: true, cause: 'spikeArmor',
            });
          }
        }
      }
    }

    // ---- 伤害管线 ----
    // 全场唯一的扣血入口：普攻、技能、灼烧中毒、场地危险物都走这里

    handleDamage(unit, opts) {
      const {
        damage: incomingDamage, board, attackType, attacker,
        shouldTargetGainMana, isRetaliation = false, cause = '',
      } = opts;

      let death = false;
      let takenDamage = 0;
      let damage = incomingDamage;

      if (isNaN(damage)) {
        console.warn('[WarSim] 伤害为 NaN，来源：' + (attacker ? attacker.name : '环境'));
        return { death: false, takenDamage: 0 };
      }
      if (unit.hp <= 0 || unit.status.resurrecting) return { death: false, takenDamage: 0 };

      if (attacker && attacker.status.enraged) damage *= 2;

      if (unit.status.protect || unit.status.skydiving) return { death: false, takenDamage: 0 };

      // 场地增伤：站在自家场地上的攻击者打得更疼
      if (attacker) {
        if (attacker.status.electricField) damage *= 1.2;
        if (attacker.status.psychicField) damage *= 1.2;
        if (attacker.status.grassField) damage *= 1.2;
        if (attacker.status.fairyField) damage *= 1.2;
      }

      // 天气增伤
      const weather = unit.sim.weather;
      if (weather === 'MISTY' && attackType === 'SPECIAL') damage *= 1.2;
      if (weather === 'BLOODMOON' && attackType === 'PHYSICAL') damage *= 1.2;

      // 破甲：防御与特防砍半
      let def = unit.status.armorReduction ? Math.round(unit.def / 2) : unit.def;
      let speDef = unit.status.armorReduction ? Math.round(unit.speDef / 2) : unit.speDef;
      if (unit.effects.has('WONDER_ROOM')) { const t = def; def = speDef; speDef = t; }

      // 反射：物理伤害原样弹回。isRetaliation 防止两个反射单位无限互弹
      if (unit.status.reflect && attackType === 'PHYSICAL') {
        if (attacker && !isRetaliation) {
          const reflectDamage = Math.round(unit.reflectFactor * damage * (1 + unit.ap / 100));
          attacker.handleDamage({
            damage: reflectDamage, board, attackType: 'SPECIAL',
            attacker: unit, shouldTargetGainMana: true,
            isRetaliation: true, cause: 'reflect',
          });
        }
        return { death: false, takenDamage: 0 };
      }

      // 护甲公式
      const AF = unit.sim.conf.armorFactor;
      let reducedDamage = damage;
      if (attackType === 'PHYSICAL') reducedDamage = damage / (1 + AF * def);
      else if (attackType === 'SPECIAL') reducedDamage = damage / (1 + AF * speDef);

      // 固定值减伤，真实伤害不吃
      if (attackType !== 'TRUE' && unit.flatDamageBlock > 0) {
        reducedDamage -= unit.flatDamageBlock;
        unit.counters.blockCount++;
      }

      reducedDamage = lowClamp(unit.sim.conf.minDamage)(Math.ceil(reducedDamage));

      if (attackType === 'PHYSICAL') unit.physicalDamageReduced += lowClamp(0)(damage - reducedDamage);
      else if (attackType === 'SPECIAL') unit.specialDamageReduced += lowClamp(0)(damage - reducedDamage);

      let residualDamage = reducedDamage;

      // 护盾吸收；畏缩状态下护盾只挡一半，另一半直接打在血上
      if (unit.shield > 0) {
        let damageOnShield;
        if (unit.status.flinch) {
          damageOnShield = Math.ceil(reducedDamage * 0.5);
          residualDamage = Math.ceil(reducedDamage * 0.5);
        } else {
          damageOnShield = reducedDamage;
          residualDamage = 0;
        }
        if (damageOnShield >= unit.shield) {
          residualDamage += damageOnShield - unit.shield;
          damageOnShield = unit.shield;
          unit.runHooks('onShieldDepleted', { unit, board, attacker, damage: reducedDamage });
        }
        unit.shieldDamageTaken += damageOnShield;
        takenDamage += damageOnShield;
        unit.shield = lowClamp(0)(unit.shield - damageOnShield);
      }

      takenDamage += Math.min(residualDamage, unit.hp);

      // 濒死保命：装备与羁绊在此挂钩，置 prevent 即可完全免掉这一击
      if (unit.hp - residualDamage <= 0) {
        const lethal = { unit, board, attacker, residualDamage, prevent: false };
        unit.runHooks('onLethal', lethal);
        if (lethal.prevent) {
          return { death: false, takenDamage: 0 };
        }
        residualDamage = lethal.residualDamage;
      }

      unit.hp = Math.max(0, unit.hp - residualDamage);
      unit.damageTaken += takenDamage;

      // 受击回 PP 必须与规模无关：实伤随精锐平方放大，按绝对值折算的话
      // 精锐 3 以上一次受击就能充满，maxPP 这条属性会彻底失效
      if (shouldTargetGainMana) {
        const cap = unit.sim.conf.pp.damageRatioCap;
        const ratio = unit.maxHp > 0 ? Math.min(cap, residualDamage / unit.maxHp) : 0;
        unit.addPP(Math.ceil(unit.maxPP * ratio), unit);
      }

      if (takenDamage > 0) {
        const srcId = attacker ? attacker.id : ('env:' + (cause || 'unknown'));
        unit.damageBySource[srcId] = (unit.damageBySource[srcId] || 0) + takenDamage;

        if (unit.hp > 0) {
          // 挨打会醒：睡眠每次受击少 300ms，被魅惑者挨魅惑来源的打少 500ms
          if (unit.status.sleepCooldown > 0) unit.status.sleepCooldown -= 300;
          if (unit.status.charmCooldown > 0 && attacker && attacker === unit.status.charmOrigin) {
            unit.status.charmCooldown -= 500;
          }

          unit.runHooks('onDamageReceived', {
            unit, attacker, board, damage: takenDamage,
            damageBeforeReduction: damage, attackType, isRetaliation,
          });
        }
        if (attacker) {
          attacker.runHooks('onDamageDealt', {
            unit: attacker, target: unit, damage: takenDamage, attackType, isRetaliation,
          });
          if (attacker !== unit) {
            if (attackType === 'PHYSICAL') attacker.physicalDamage += takenDamage;
            else if (attackType === 'SPECIAL') attacker.specialDamage += takenDamage;
            else attacker.trueDamage += takenDamage;
          }
        }

        unit.sim.emit('hit', {
          id: unit.id, team: unit.team,
          sourceId: attacker ? attacker.id : '',
          cause: cause || 'unknown',
          attackType,
          amount: Math.round(takenDamage),
          hp: Math.max(0, Math.round(unit.hp)),
          maxHp: unit.maxHp,
          shield: Math.max(0, Math.round(unit.shield)),
          pp: Math.round(unit.pp), maxPP: unit.maxPP,
          x: unit.x, y: unit.y,
        });
      }

      if (unit.hp <= 0) {
        if (unit.status.resurrection) {
          unit.status.triggerResurrection(unit);
          unit.runHooks('onResurrect', { unit, board, attacker });
          // 立刻让所有锁定它的单位改换目标，避免复活后的索敌延迟
          board.forEach((x, y, e) => {
            if (e && e.targetEntityId === unit.id) { e.cooldown = 0; e.toMovingState(); }
          });
        } else {
          death = true;
        }
      }

      if (death) this.triggerDeath(unit, attacker, board, attackType);

      return { death, takenDamage: Math.round(takenDamage) };
    }

    // 技能伤害入口：额外处理 AP 加成与暴击
    handleSpecialDamage(unit, damage, board, attackType, attacker, crit, apBoost = true) {
      // 保护 / 滞空 / 法术反弹在技能入口统一早退，任何技能伤害都进不来
      if (unit.status.protect || unit.status.skydiving || unit.status.magicBounce) {
        unit.counters.spellBlockedCount++;

        // 反弹按未加成的原始伤害算，隔半秒才回敬。
        // isRetaliation 防两个反弹单位无限对弹。当前技能库一律走 PHYSICAL，
        // 这条是给后续开特殊攻击时备的
        if (unit.status.magicBounce && attackType === 'SPECIAL' && damage > 0 && attacker) {
          unit.commands.push(new DelayedCommand(500, () => {
            const back = Math.round(
              byElite(ELITE_BOUNCE, unit) * damage * (1 + unit.ap / 100) * (crit ? unit.critPower : 1)
            );
            if (back > 0) {
              attacker.handleDamage({
                damage: back, board, attackType: 'SPECIAL',
                attacker: unit, shouldTargetGainMana: true,
                isRetaliation: true, cause: 'magicBounce',
              });
            }
          }));
        }
        return { death: false, takenDamage: 0 };
      }

      let d = damage;
      if (apBoost && attacker) d = d * (1 + attacker.ap / 100);
      if (crit && attacker) d = d * attacker.critPower;

      return this.handleDamage(unit, {
        damage: Math.ceil(d), board, attackType,
        attacker, shouldTargetGainMana: true, cause: 'ability',
      });
    }

    handleHeal(unit, heal, caster, apBoost, crit) {
      // 创伤直接禁疗
      if (unit.status.wound) return { healReceived: 0, overheal: 0 };
      if (unit.hp <= 0 || unit.status.protect) return { healReceived: 0, overheal: 0 };

      let h = heal;
      if (apBoost > 0 && caster) h *= 1 + (apBoost * caster.ap) / 100;
      if (crit && caster) h *= caster.critPower;
      if (unit.effects.has('BUFF_HEAL_RECEIVED')) h *= 1.3;
      if (unit.status.burn) h *= 0.5;
      if (unit.status.fatigue) h *= 0.5;
      if (unit.status.enraged) h *= 0.5;
      if (unit.sim.weather === 'ZENITH') h *= 1.2;

      h = Math.round(h);
      const missing = unit.maxHp - unit.hp;
      const healReceived = highClamp(missing)(h);
      const overheal = lowClamp(0)(h - missing);
      unit.hp += healReceived;

      if (caster && healReceived > 0) {
        caster.healDone += healReceived;
        unit.sim.emit('heal', {
          id: unit.id, team: unit.team, sourceId: caster.id,
          amount: healReceived, hp: Math.round(unit.hp), maxHp: unit.maxHp,
        });
      }
      return { healReceived, overheal };
    }

    addShield(unit, shield, caster, apBoost, crit) {
      if (unit.hp <= 0) return;
      let s = shield;
      if (apBoost > 0 && caster) s *= 1 + (caster.ap * apBoost) / 100;
      if (crit && caster) s *= caster.critPower;
      if (unit.status.fatigue && s > 0) s *= 0.5;
      if (unit.status.enraged && s > 0) s *= 0.5;

      s = Math.round(s);
      unit.shield = lowClamp(0)(unit.shield + s);
      if (caster && s > 0) {
        caster.shieldDone += s;
        unit.sim.emit('shield', {
          id: unit.id, team: unit.team, sourceId: caster.id,
          amount: s, shield: Math.round(unit.shield),
        });
      }
    }

    triggerDeath(unit, attacker, board, attackType) {
      if (!unit.alive) return;
      unit.alive = false;
      unit.hp = 0;
      unit.diedAtTick = unit.sim.tick;
      unit.killedBy = attacker ? attacker.id : '';
      unit.action = 'Hurt';

      unit.runHooks('onDeath', { unit, board, attacker });
      board.setEntityOnCell(unit.x, unit.y, undefined);

      if (attacker && attacker !== unit) {
        attacker.kills++;
        attacker.runHooks('onKill', { attacker, target: unit, board, attackType });
      }

      // 阵亡者施加的场地效果随之消散
      if (unit.fieldEffect) {
        board.forEach((x, y, e) => {
          if (e && e.team === unit.team && e.status[unit.fieldEffect]) e.status[unit.fieldEffect] = false;
        });
      }

      unit.sim.emit('death', {
        id: unit.id, team: unit.team,
        killerId: attacker ? attacker.id : '',
        x: unit.x, y: unit.y,
      });
    }
  }

  // ---------------- 待机 ----------------

  class IdleState extends WarUnitState {
    constructor() { super(); this.name = 'idle'; }

    update(unit, dt, board) {
      super.update(unit, dt, board);

      // 无需目标的技能在待机状态下也能放出去
      if (unit.pp >= unit.maxPP && unit.canCast && unit.abilityRequiresTarget() === false) {
        castAbility(unit, board, null);
      }

      if (unit.canMove) unit.toMovingState();

      if (unit.cooldown <= 0) unit.cooldown = 500;
      else unit.cooldown -= dt;
    }

    onEnter(unit) {
      unit.action = (unit.status.sleep || unit.status.freeze) ? 'Sleep'
        : unit.status.resurrecting ? 'Hurt' : 'Idle';
      unit.cooldown = 0;
    }

    onExit(unit) { unit.setTarget(null); }
  }

  // ---------------- 移动 ----------------

  class MovingState extends WarUnitState {
    constructor() { super(); this.name = 'moving'; }

    update(unit, dt, board) {
      super.update(unit, dt, board);
      if (unit.cooldown > 0) { unit.cooldown = Math.max(0, unit.cooldown - dt); return; }

      unit.cooldown = Math.round(500 / getMoveSpeed(unit));
      const targetAtRange = this.getNearestTargetAtRange(unit, board);

      if (unit.status.charm && unit.canMove) {
        // 被魅惑时强制走向施法者
        const origin = unit.status.charmOrigin;
        if (origin && distanceC(unit.x, unit.y, origin.x, origin.y) > 1) {
          this.move(unit, board, { x: origin.x, y: origin.y });
        }
        return;
      }

      if (unit.pp >= unit.maxPP && unit.canCast && unit.abilityRequiresTarget() === false) {
        castAbility(unit, board, null);
        return;
      }

      if (targetAtRange) { unit.toAttackingState(); return; }

      const sight = this.getNearestTargetAtSight(unit, board);
      if (sight && unit.canMove) this.move(unit, board, sight);
    }

    // 落脚点不是敌人所在格，而是以敌人为心、半径等于自身射程的那一圈空格
    move(unit, board, coordinates) {
      const blocked = board.occupiedKeys();
      const ring = board.getOuterRangeCells(coordinates.x, coordinates.y, unit.range);
      let best = null;
      let bestLen = Infinity;

      ring.forEach((cell) => {
        if (cell.value !== undefined) return;
        const path = findPath(board, blocked, unit.x, unit.y, cell.x, cell.y);
        if (path.length && path.length < bestLen) { bestLen = path.length; best = path[0]; }
      });

      if (!best) return;
      const oldX = unit.x, oldY = unit.y;
      unit.action = 'Walk';
      board.swapCells(oldX, oldY, best[0], best[1]);
      this.onMove(unit, board, oldX, oldY, best[0], best[1]);
    }

    onMove(unit, board, oldX, oldY, newX, newY) {
      unit.orientation = board.orientation(oldX, oldY, newX, newY);
      unit.movedCells++;
      // 走位也算战局有进展，否则开场接近阶段会被误判成僵局
      unit.sim.resetStale();
      unit.sim.emit('move', {
        id: unit.id, team: unit.team,
        from: { x: oldX, y: oldY }, to: { x: newX, y: newY },
        durationMs: Math.round(500 / getMoveSpeed(unit)),
      });
      unit.runHooks('onMove', { unit, board, oldX, oldY, newX, newY });
    }

    onEnter(unit) { unit.action = 'Walk'; unit.cooldown = 0; }
    onExit(unit) { unit.setTarget(null); }
  }

  // ---------------- 攻击 ----------------

  class AttackingState extends WarUnitState {
    constructor() { super(); this.name = 'attacking'; }

    update(unit, dt, board) {
      super.update(unit, dt, board);
      if (unit.cooldown > 0) { unit.cooldown = Math.max(0, unit.cooldown - dt); return; }

      const speed = unit.status.paralysis ? unit.speed / 2 : unit.speed;
      unit.resetCooldown(1000, speed);

      if (!unit.canAttack) return;

      // 目标粘性：优先继续打上一个目标，脱战或死亡才重新索敌
      let target = board.getEntityOnCell(unit.targetX, unit.targetY);
      const previous = unit.sim.unitsById.get(unit.targetEntityId);

      if (unit.merciless && unit.pp < unit.maxPP) {
        const candidates = this.getTargetsAtRange(unit, board);
        let minLife = Infinity;
        for (const c of candidates) {
          if (c.hp + c.shield < minLife) { minLife = c.hp + c.shield; target = c; }
        }
      } else if (unit.status.confusion) {
        target = this.getTargetWhenConfused(unit, board);
      } else if (!target || target.id !== unit.targetEntityId) {
        if (previous && previous.isTargettableBy(unit)
          && distanceC(unit.x, unit.y, previous.x, previous.y) <= unit.range) {
          target = previous;
        } else {
          target = this.getNearestTargetAtRange(unit, board);
        }
      } else if (previous && previous.isTargettableBy(unit) === false) {
        target = this.getNearestTargetAtRange(unit, board);
      }

      if (!target || unit.status.charm) {
        if (this.getNearestTargetAtSight(unit, board)) unit.toMovingState();
        return;
      }

      unit.targetX = target.x;
      unit.targetY = target.y;
      unit.targetEntityId = target.id;
      unit.orientation = board.orientation(unit.x, unit.y, target.x, target.y);

      if (unit.pp >= unit.maxPP && unit.canCast) {
        castAbility(unit, board, target);
      } else {
        unit.counters.attackCount++;
        const { delayBeforeShoot, travelTime } = getAttackTimings(unit);
        // 攒蓝在出手时就给，不等弹道落地：回放的 PP 环靠 attack_start 这一个事件更新，
        // 挪到结算后会让环恒定慢一次普攻。原项目是结算后给，这里为显示准确性有意不跟
        unit.addPP(unit.sim.conf.pp.onAttack, unit);
        unit.sim.emit('attack_start', {
          id: unit.id, team: unit.team, targetId: target.id,
          from: { x: unit.x, y: unit.y }, to: { x: target.x, y: target.y },
          delayMs: Math.round(delayBeforeShoot), travelMs: Math.round(travelTime),
          pp: Math.round(unit.pp), maxPP: unit.maxPP,
        });
        unit.commands.push(new AttackCommand(delayBeforeShoot + travelTime, unit, target, board));
      }
    }

    onEnter(unit) { unit.action = 'Attack'; unit.cooldown = 0; }
    onExit(unit) { unit.setTarget(null); }
  }

  // ---------------- 技能系统 ----------------
  // 基类负责扣 PP、计数、发事件；子类调 super.process 之后写自己的效果。
  // 目标类型、伤害类型、触发时机的槽位全部预留，后续补技能只需新增策略再注册进表。

  // 目标类型槽位：resolveAbilityTargets 会按这些语义把技能目标解出来
  const ABILITY_TARGET_TYPES = [
    'SELF', 'SINGLE', 'ADJACENT', 'LINE', 'AREA',
    'ALL_ENEMIES', 'ALL_ALLIES', 'RANDOM_ENEMY', 'FARTHEST_ENEMY', 'LOWEST_HP_ALLY',
  ];

  // 效果种类槽位：伤害、治疗、护盾、增益、减益、状态、位移、召唤、复活
  const ABILITY_EFFECT_KINDS = [
    'DAMAGE', 'HEAL', 'SHIELD', 'BUFF', 'DEBUFF',
    'STATUS', 'DISPLACEMENT', 'SUMMON', 'RESURRECT',
  ];

  function resolveAbilityTargets(unit, board, target, strategy) {
    const st = unit.state;
    switch (strategy.targetType) {
      case 'SELF': return [unit];
      case 'SINGLE': return target ? [target] : [];
      case 'ADJACENT':
        return board.getAdjacentCells(target ? target.x : unit.x, target ? target.y : unit.y)
          .map((c) => c.value).filter((v) => v && v.isTargettableBy(unit));
      case 'LINE': {
        if (!target) return [];
        const dx = Math.sign(target.x - unit.x);
        const dy = Math.sign(target.y - unit.y);
        const out = [];
        let x = unit.x + dx, y = unit.y + dy;
        while (board.inBounds(x, y)) {
          const v = board.getEntityOnCell(x, y);
          if (v && v.isTargettableBy(unit)) out.push(v);
          x += dx; y += dy;
          if (dx === 0 && dy === 0) break;
        }
        return out;
      }
      case 'AREA': {
        const cx = target ? target.x : unit.x;
        const cy = target ? target.y : unit.y;
        const r = strategy.radius || 1;
        const out = [];
        board.forEach((x, y, v) => {
          if (v && v.isTargettableBy(unit) && distanceC(cx, cy, x, y) <= r) out.push(v);
        });
        return out;
      }
      case 'ALL_ENEMIES':
        return unit.sim.units.filter((u) => u.alive && u.team !== unit.team);
      case 'ALL_ALLIES':
        return unit.sim.units.filter((u) => u.alive && u.team === unit.team);
      case 'RANDOM_ENEMY': {
        const pool = unit.sim.units.filter((u) => u.alive && u.team !== unit.team);
        const pick = unit.sim.pickRandomIn(pool);
        return pick ? [pick] : [];
      }
      case 'FARTHEST_ENEMY': {
        const f = st.getFarthestTarget(unit, board);
        return f ? [f] : [];
      }
      case 'LOWEST_HP_ALLY': {
        const allies = unit.sim.units.filter((u) => u.alive && u.team === unit.team);
        if (!allies.length) return [];
        return [allies.reduce((a, b) => (a.hp / a.maxHp <= b.hp / b.maxHp ? a : b))];
      }
      default: return target ? [target] : [];
    }
  }

  class AbilityStrategy {
    constructor(opts) {
      const o = opts || {};
      this.id = o.id || '';
      this.name = o.name || o.id || '';
      // false 表示无需贴近目标，可以在移动甚至待机状态下隔空放出
      this.requiresTarget = o.requiresTarget !== false;
      this.canCritByDefault = !!o.canCritByDefault;
      this.targetType = o.targetType || 'SINGLE';
      this.damageType = o.damageType || 'PHYSICAL';
      this.radius = o.radius || 1;
    }

    process(unit, board, target, crit) {
      unit.pp = lowClamp(0)(unit.pp - unit.maxPP);
      unit.counters.ult++;
      unit.action = 'Ability';
      unit.sim.abilitiesCast[unit.team].push(this.id);
      unit.sim.emit('ability', {
        id: unit.id, team: unit.team, skill: this.id, skillName: this.name,
        targetId: target ? target.id : '', crit,
        from: { x: unit.x, y: unit.y },
        to: target ? { x: target.x, y: target.y } : null,
        pp: Math.round(unit.pp), maxPP: unit.maxPP,
      });
    }
  }

  // ---------------- 技能库 ----------------
  //
  // 强度只由精锐决定（查 ELITE_* 与 SHAPE），不进兵种的战力预算——技能是各精锐各自的福利，
  // 所以给兵种配技能不需要回头重算基准属性。
  //
  // 三条硬约束，加新技能时别破：
  //   1. 数值一律写成 unit.atk 的倍率或 maxHp 的百分比，禁止固定值。一颗棋子是一整支部队，
  //      精锐 5 的 atk 能到几十万，写死常数在高阶等于零
  //   2. 伤害类型一律 PHYSICAL。特殊攻击与特防成对启用，本轮不开
  //   3. 不碰灼烧与中毒。它们按 maxHp 百分比走真伤，会绕过整套有效生命配平

  // 一次施放的伤害。形态系数负责摊薄覆盖面，否则 AoE 白赚
  function abilityDamage(unit, shape) {
    return unit.atk * byElite(ELITE_MULT, unit) * (shape ?? SHAPE.SINGLE);
  }

  function dealTo(list, unit, board, dmg, crit, type) {
    list.forEach((t) => {
      // 技能按攻击力放大，不吃 AP，所以 apBoost 传 false
      t.handleSpecialDamage(dmg, board, type || 'PHYSICAL', unit, crit, false);
    });
  }

  // 纯伤害技能的通用实现。hits > 1 时分段打出，每段单独结算
  class ShapeDamageStrategy extends AbilityStrategy {
    constructor(o) {
      super(o);
      this.shape = o.shape ?? SHAPE.SINGLE;
      this.hits = o.hits || 1;
      this.hitGapMs = o.hitGapMs || 220;
      this.retarget = !!o.retarget;   // 每段重新挑目标，用于扫射
    }

    strike(unit, board, target, crit) {
      if (!unit.alive) return;
      const dmg = abilityDamage(unit, this.shape);
      if (this.retarget) {
        const pool = unit.state.getTargetsAtRange(unit, board);
        const pick = unit.sim.pickRandomIn(pool);
        if (pick) dealTo([pick], unit, board, dmg, crit, this.damageType);
        return;
      }
      dealTo(resolveAbilityTargets(unit, board, target, this), unit, board, dmg, crit, this.damageType);
    }

    process(unit, board, target, crit) {
      super.process(unit, board, target, crit);
      this.strike(unit, board, target, crit);
      for (let i = 1; i < this.hits; i++) {
        unit.commands.push(new DelayedCommand(this.hitGapMs * i, () => this.strike(unit, board, target, crit)));
      }
    }
  }

  // 狙击：改打全场最远的敌人，够不着就打眼前的
  class SnipeStrategy extends AbilityStrategy {
    constructor() { super({ id: 'SNIPE', name: '狙击', targetType: 'FARTHEST_ENEMY' }); }
    process(unit, board, target, crit) {
      super.process(unit, board, target, crit);
      let list = resolveAbilityTargets(unit, board, target, this);
      if (!list.length && target) list = [target];
      dealTo(list, unit, board, abilityDamage(unit, SHAPE.SINGLE), crit, this.damageType);
    }
  }

  // 冲锋：瞬移贴到目标身侧再砍。位移是这两个兵种的灵魂，引擎的逐格寻路做不出这个手感
  class ChargeStrategy extends AbilityStrategy {
    constructor() { super({ id: 'CHARGE', name: '冲锋', targetType: 'SINGLE' }); }
    process(unit, board, target, crit) {
      super.process(unit, board, target, crit);
      if (!target) return;
      teleportNextTo(unit, board, target);
      dealTo([target], unit, board, abilityDamage(unit, SHAPE.SINGLE), crit, this.damageType);
    }
  }

  // 掠袭：先打一下再脱离接触，靠速度和闪避活命
  class RaidStrategy extends AbilityStrategy {
    constructor() { super({ id: 'RAID', name: '掠袭', targetType: 'SINGLE' }); }
    process(unit, board, target, crit) {
      super.process(unit, board, target, crit);
      if (target) dealTo([target], unit, board, abilityDamage(unit, SHAPE.SINGLE), crit, this.damageType);
      unit.commands.push(new DelayedCommand(200, () => { if (unit.alive) teleportAway(unit, board); }));
    }
  }

  // 追击：对已受伤的目标翻倍。和「斩尽」标记天然配套
  class PursuitStrategy extends AbilityStrategy {
    constructor() { super({ id: 'PURSUIT', name: '追击', targetType: 'SINGLE' }); }
    process(unit, board, target, crit) {
      super.process(unit, board, target, crit);
      if (!target) return;
      const wounded = target.hp < target.maxHp;
      dealTo([target], unit, board, abilityDamage(unit, SHAPE.SINGLE) * (wounded ? 2 : 1), crit, this.damageType);
    }
  }

  // 破垒弹：伤害之外再削防御，给后排炮组开路
  class BreachingStrategy extends AbilityStrategy {
    constructor() { super({ id: 'BREACHING', name: '破垒弹', targetType: 'SINGLE' }); }
    process(unit, board, target, crit) {
      super.process(unit, board, target, crit);
      if (!target) return;
      dealTo([target], unit, board, abilityDamage(unit, SHAPE.SINGLE), crit, this.damageType);
      target.status.triggerArmorReduction(byElite(ELITE_BUFF_MS, unit), target);
    }
  }

  // 鱼雷齐射：范围高伤，自己也要吃一份。换命突击的代价写在技能里
  class TorpedoSalvoStrategy extends AbilityStrategy {
    constructor() { super({ id: 'TORPEDO_SALVO', name: '鱼雷齐射', targetType: 'AREA', radius: 1 }); }
    process(unit, board, target, crit) {
      super.process(unit, board, target, crit);
      dealTo(resolveAbilityTargets(unit, board, target, this), unit, board,
        abilityDamage(unit, SHAPE.AREA), crit, this.damageType);
      unit.handleDamage({
        damage: Math.round(unit.maxHp * 0.08), board, attackType: 'TRUE',
        attacker: null, shouldTargetGainMana: false, cause: 'selfBlast',
      });
    }
  }

  // 拒马：挂荆棘。只对贴脸近战反弹，不免伤，所以可以挂满一整段
  class ChevauxStrategy extends AbilityStrategy {
    constructor() { super({ id: 'CHEVAUX', name: '拒马', requiresTarget: false, targetType: 'SELF' }); }
    process(unit, board, target, crit) {
      super.process(unit, board, target, crit);
      unit.status.triggerSpikeArmor(byElite(ELITE_BUFF_MS, unit));
    }
  }

  // 装甲带：短暂完全免伤。protect 一切伤害归零，所以时长按精锐给到两秒封顶
  class ArmorBeltStrategy extends AbilityStrategy {
    constructor() { super({ id: 'ARMOR_BELT', name: '装甲带', requiresTarget: false, targetType: 'SELF' }); }
    process(unit, board, target, crit) {
      super.process(unit, board, target, crit);
      unit.status.triggerProtect(byElite(ELITE_PROTECT_MS, unit));
    }
  }

  // 自身增益：铁壳加防、全速加速、超压换命（大幅加攻但掉防）
  class SelfBuffStrategy extends AbilityStrategy {
    constructor(o) {
      super(Object.assign({ requiresTarget: false, targetType: 'SELF' }, o));
      this.stat = o.stat;              // 'def' | 'speed' | 'atk'
      this.tradeDef = !!o.tradeDef;    // 超压：加攻的同时削自己的防
    }
    process(unit, board, target, crit) {
      super.process(unit, board, target, crit);
      const k = byElite(ELITE_BUFF, unit);
      const ms = byElite(ELITE_BUFF_MS, unit);
      if (this.stat === 'def') {
        const v = Math.max(1, Math.round(unit.def * k));
        unit.addDefense(v);
        unit.commands.push(new DelayedCommand(ms, () => unit.addDefense(-v)));
      } else if (this.stat === 'speed') {
        const v = Math.max(1, Math.round(unit.speed * k));
        unit.addSpeed(v);
        unit.commands.push(new DelayedCommand(ms, () => unit.addSpeed(-v)));
      } else {
        const v = Math.max(1, Math.round(unit.baseAtk * k));
        unit.addAttack(v);
        const d = this.tradeDef ? Math.round(unit.def * 0.5) : 0;
        if (d > 0) unit.addDefense(-d);
        unit.commands.push(new DelayedCommand(ms, () => {
          unit.addAttack(-v);
          if (d > 0) unit.addDefense(d);
        }));
      }
    }
  }

  // 装甲展开：自身护盾 + 加防。三堵墙的输出本来就不该来自普攻
  class ArmorDeployStrategy extends AbilityStrategy {
    constructor() { super({ id: 'ARMOR_DEPLOY', name: '装甲展开', requiresTarget: false, targetType: 'SELF' }); }
    process(unit, board, target, crit) {
      super.process(unit, board, target, crit);
      unit.addShield(Math.round(unit.maxHp * byElite(ELITE_SHIELD, unit)), unit, 0, false);
      const v = Math.max(1, Math.round(unit.def * byElite(ELITE_BUFF, unit)));
      unit.addDefense(v);
      unit.commands.push(new DelayedCommand(byElite(ELITE_BUFF_MS, unit), () => unit.addDefense(-v)));
    }
  }

  // 掩护弹幕：全队护盾。按施法者 maxHp 折算，防止套在大血量友军身上失控
  class CoverBarrageStrategy extends AbilityStrategy {
    constructor() { super({ id: 'COVER_BARRAGE', name: '掩护弹幕', requiresTarget: false, targetType: 'ALL_ALLIES' }); }
    process(unit, board, target, crit) {
      super.process(unit, board, target, crit);
      const amount = Math.round(unit.maxHp * byElite(ELITE_SHIELD_AL, unit));
      resolveAbilityTargets(unit, board, target, this).forEach((a) => a.addShield(amount, unit, 0, false));
    }
  }

  // 集火指令：标记一名敌人，索敌优先级高于嘲讽，把火力从对面的墙上拽开
  class FocusOrderStrategy extends AbilityStrategy {
    constructor() { super({ id: 'FOCUS_ORDER', name: '集火指令', targetType: 'SINGLE' }); }
    process(unit, board, target, crit) {
      super.process(unit, board, target, crit);
      if (!target) return;
      target.focusMark = Math.max(target.focusMark, byElite(ELITE_BUFF_MS, unit));
      dealTo([target], unit, board, abilityDamage(unit, SHAPE.SINGLE), crit, this.damageType);
    }
  }

  // 救护：治疗血量比例最低的友军。治疗抬高剩余血 = 直接抹掉战后减员
  class FieldAidStrategy extends AbilityStrategy {
    constructor() { super({ id: 'FIELD_AID', name: '救护', requiresTarget: false, targetType: 'LOWEST_HP_ALLY' }); }
    process(unit, board, target, crit) {
      super.process(unit, board, target, crit);
      const amount = Math.round(unit.maxHp * byElite(ELITE_HEAL, unit));
      resolveAbilityTargets(unit, board, target, this).forEach((a) => a.handleHeal(amount, unit, 0, false));
    }
  }

  // 抢修：上护盾并清掉负面。解控在敌方有减益时才值钱
  class DamageControlStrategy extends AbilityStrategy {
    constructor() { super({ id: 'DAMAGE_CONTROL', name: '抢修', requiresTarget: false, targetType: 'LOWEST_HP_ALLY' }); }
    process(unit, board, target, crit) {
      super.process(unit, board, target, crit);
      const amount = Math.round(unit.maxHp * byElite(ELITE_SHIELD_AL, unit));
      resolveAbilityTargets(unit, board, target, this).forEach((a) => {
        a.addShield(amount, unit, 0, false);
        a.status.clearNegative(a);
      });
    }
  }

  // 补弹：给一名友军回 PP，把「多开技能」传染出去。PP 不随规模变，所以按 maxPP 定比
  class ResupplyStrategy extends AbilityStrategy {
    constructor() { super({ id: 'RESUPPLY', name: '补弹', requiresTarget: false, targetType: 'ALL_ALLIES' }); }
    process(unit, board, target, crit) {
      super.process(unit, board, target, crit);
      const allies = resolveAbilityTargets(unit, board, target, this)
        .filter((a) => a.id !== unit.id && a.pp < a.maxPP);
      const pick = unit.sim.pickRandomIn(allies);
      if (pick) pick.addPP(Math.ceil(pick.maxPP * byElite(ELITE_PP_GIFT, unit)), unit);
    }
  }

  // 校射 / 旗语：同一套机制，给一名友军短时加攻
  class BuffAllyAtkStrategy extends AbilityStrategy {
    constructor(o) { super(Object.assign({ requiresTarget: false, targetType: 'ALL_ALLIES' }, o)); }
    process(unit, board, target, crit) {
      super.process(unit, board, target, crit);
      const allies = resolveAbilityTargets(unit, board, target, this).filter((a) => a.id !== unit.id);
      // 挑攻击最高的友军，增益才不浪费
      const pick = allies.reduce((a, b) => (!a || b.atk > a.atk ? b : a), null);
      if (!pick) return;
      const v = Math.max(1, Math.round(pick.baseAtk * byElite(ELITE_BUFF, unit)));
      pick.addAttack(v);
      // 回退挂在被增益者身上：施法者先死也不该让增益永久留着
      pick.commands.push(new DelayedCommand(byElite(ELITE_BUFF_MS, unit), () => pick.addAttack(-v)));
    }
  }

  // 督战：全队加速。速度同时是攻速与走位，对慢速炮兵收益最大
  class SuperviseStrategy extends AbilityStrategy {
    constructor() { super({ id: 'SUPERVISE', name: '督战', requiresTarget: false, targetType: 'ALL_ALLIES' }); }
    process(unit, board, target, crit) {
      super.process(unit, board, target, crit);
      const k = byElite(ELITE_BUFF, unit);
      const ms = byElite(ELITE_BUFF_MS, unit);
      resolveAbilityTargets(unit, board, target, this).forEach((a) => {
        const v = Math.max(1, Math.round(a.speed * k));
        a.addSpeed(v);
        a.commands.push(new DelayedCommand(ms, () => a.addSpeed(-v)));
      });
    }
  }

  // 弹着修正：全体敌人破防，不带伤害
  class SpottingFixStrategy extends AbilityStrategy {
    constructor() { super({ id: 'SPOTTING_FIX', name: '弹着修正', requiresTarget: false, targetType: 'ALL_ENEMIES' }); }
    process(unit, board, target, crit) {
      super.process(unit, board, target, crit);
      const ms = byElite(ELITE_BUFF_MS, unit);
      resolveAbilityTargets(unit, board, target, this).forEach((e) => e.status.triggerArmorReduction(ms, e));
    }
  }

  const AbilityStrategies = {};
  [
    // 重击：民兵、武装纵帆船、六磅炮艇。最底层的兵就该没有战术
    new ShapeDamageStrategy({ id: 'HEAVY_STRIKE', name: '重击', targetType: 'SINGLE', shape: SHAPE.SINGLE }),
    new ShapeDamageStrategy({ id: 'VOLLEY', name: '排枪齐射', targetType: 'SINGLE', shape: SHAPE.MULTI3, hits: 3 }),
    new ShapeDamageStrategy({ id: 'STRAFE', name: '扫射', targetType: 'SINGLE', shape: SHAPE.MULTI3, hits: 3, retarget: true, hitGapMs: 160 }),
    new ShapeDamageStrategy({ id: 'GRENADE', name: '掷弹', targetType: 'AREA', radius: 1, shape: SHAPE.AREA }),
    new ShapeDamageStrategy({ id: 'BARRAGE', name: '弹幕覆盖', targetType: 'AREA', radius: 1, shape: SHAPE.AREA }),
    new ShapeDamageStrategy({ id: 'BROADSIDE', name: '舷侧齐射', targetType: 'LINE', shape: SHAPE.LINE }),
    new ShapeDamageStrategy({ id: 'FULL_BOMBARD', name: '全场轰击', targetType: 'LINE', shape: SHAPE.LINE }),
    new SnipeStrategy(),
    new ChargeStrategy(),
    new RaidStrategy(),
    new PursuitStrategy(),
    new BreachingStrategy(),
    new TorpedoSalvoStrategy(),
    new ChevauxStrategy(),
    new ArmorBeltStrategy(),
    new ArmorDeployStrategy(),
    new CoverBarrageStrategy(),
    new FocusOrderStrategy(),
    new SelfBuffStrategy({ id: 'IRONHULL', name: '铁壳', stat: 'def' }),
    new SelfBuffStrategy({ id: 'FULL_STEAM', name: '全速', stat: 'speed' }),
    new SelfBuffStrategy({ id: 'OVERPRESSURE', name: '超压', stat: 'atk', tradeDef: true }),
    new FieldAidStrategy(),
    new DamageControlStrategy(),
    new ResupplyStrategy(),
    new SuperviseStrategy(),
    new SpottingFixStrategy(),
    new BuffAllyAtkStrategy({ id: 'SPOTTING', name: '校射' }),
    new BuffAllyAtkStrategy({ id: 'SIGNAL_FLAGS', name: '旗语' }),
  ].forEach((s) => { AbilityStrategies[s.id] = s; });

  // 三条释放路径共用这一个入口：攻击态（需目标）、移动态与待机态（无需目标）
  function castAbility(unit, board, target, canCrit = true) {
    if (!unit.canCast) return;
    const strategy = AbilityStrategies[unit.skill];
    if (!strategy) { unit.pp = 0; return; }   // 技能未注册时清空 PP，避免卡在满蓝反复尝试

    let crit = false;
    if (canCrit && (unit.effects.has('ABILITY_CRIT') || strategy.canCritByDefault)) {
      crit = unit.sim.chance(unit.critChance / 100, unit);
    }
    strategy.process(unit, board, target, crit);
    unit.runHooks('onAbilityCast', { unit, board, target, crit });
  }

  // 供外部扩展技能库：WarSim.registerAbility(new MyStrategy())
  function registerAbility(strategy) {
    if (!strategy || !strategy.id) throw new Error('[WarSim] 技能缺少 id');
    AbilityStrategies[strategy.id] = strategy;
    return strategy;
  }

  // ---------------- 棋子实体 ----------------

  class WarUnit {
    constructor(def, team, sim) {
      const D = sim.conf.defaults;
      this.sim = sim;
      this.id = String(def.id);
      this.name = def.name || def.名称 || this.id;
      this.icon = def.icon || def.图标 || '';
      // 表现层用：立绘按兵种键取图。引擎自身不读它，缺失就是回落 SVG 图标
      this.troopId = String(def.troopId || def.主兵种 || '');
      this.eliteLevel = Number(def.eliteLevel ?? def.精锐等级 ?? 1) || 1;
      this.count = Number(def.count ?? def.数量 ?? 0) || 0;
      this.team = team;
      this.baseTeam = team;   // 被策反时 team 会临时翻面，到期照这个归队
      this.x = Number(def.x) || 0;
      this.y = Number(def.y) || 0;

      this.maxHp = Math.max(1, Math.round(Number(def.hp ?? def.生命) || 1));
      this.hp = this.maxHp;
      this.shield = Number(def.shield ?? D.shield) || 0;
      this.baseAtk = Math.max(0, Number(def.atk ?? def.攻击) || 0);
      this.atk = this.baseAtk;
      this.def = Number(def.def ?? D.def) || 0;
      this.speDef = Number(def.speDef ?? D.speDef) || 0;
      this.range = Math.max(1, Number(def.range ?? D.range) || 1);
      this.critChance = Number(def.critChance ?? D.critChance) || 0;
      this.critPower = Number(def.critPower ?? D.critPower) || 1;
      this.ap = Number(def.ap ?? D.ap) || 0;
      this.dodge = Number(def.dodge ?? D.dodge) || 0;
      // luck：-100～100；默认 0 时判定与无 luck 相同
      const rawLuck = Number(def.luck ?? D.luck ?? 0) || 0;
      this.luck = Math.max(-100, Math.min(100, rawLuck));
      this.attackFrames = def.attackFrames || D.attackFrames;

      // 外部可直接给 speed；只给 attackSpeed（次/秒）时按攻击间隔公式反解
      if (def.speed !== undefined) this.speed = Number(def.speed) || D.speed;
      else if (def.attackSpeed !== undefined) this.speed = Math.max(0, (Number(def.attackSpeed) - 0.4) / 0.007);
      else this.speed = D.speed;

      this.maxPP = Math.max(1, Number(def.maxPP ?? D.maxPP) || 100);
      this.pp = Number(def.pp) || 0;
      this.skill = def.ability !== undefined ? def.ability : D.ability;

      this.alive = true;
      this.orientation = team === 'A' ? ORIENTATIONS.UP : ORIENTATIONS.DOWN;
      this.action = 'Idle';
      this.cooldown = 0;
      this.oneSecondCooldown = 1000;
      this.targetX = -1;
      this.targetY = -1;
      this.targetEntityId = '';
      this.commands = [];
      this.periodicEffects = [];
      this.hooks = {};
      this.effects = new Set();
      this.status = new WarStatus(sim.conf.enrageDelayMs);
      this.taunt = !!def.taunt;
      this.merciless = !!def.merciless;
      // 集火标记的剩余毫秒。索敌优先级高于嘲讽，由「集火指令」写入
      this.focusMark = 0;
      this.movedCells = 0;
      this.diedAtTick = null;
      this.killedBy = '';
      this.baseRange = this.range;

      // 伤害管线上的可调系数，装备与羁绊接进来时改这几项即可
      this.critReductionFactor = 1;   // 1 表示不减免暴击溢出部分
      this.trueDamageRatio = 0;       // 普攻中转成真实伤害的占比
      this.reflectFactor = 1;         // 反射系数
      this.flatDamageBlock = 0;       // 固定值减伤
      this.fieldEffect = '';          // 该单位施加的场地效果字段名，阵亡时清场
      this.consumedHazards = new Set(); // 已吃过的一次性场地危险物

      // 统计计数器，直接作为战报的数据源
      this.counters = { attackCount: 0, ult: 0, crit: 0, dodgeCount: 0, blockCount: 0, spellBlockedCount: 0 };
      this.physicalDamage = 0;
      this.specialDamage = 0;
      this.trueDamage = 0;
      this.physicalDamageReduced = 0;
      this.specialDamageReduced = 0;
      this.shieldDamageTaken = 0;
      this.healDone = 0;
      this.shieldDone = 0;
      this.damageTaken = 0;
      this.kills = 0;
      this.damageBySource = {};

      this.state = new IdleState();
    }

    get canMove() {
      return !this.status.freeze && !this.status.sleep && !this.status.resurrecting && !this.status.locked;
    }

    get canCast() {
      return !this.status.silence && !this.status.freeze && !this.status.sleep && !this.status.resurrecting;
    }

    // 能不能出手。与 canMove 的差别：锁定照样能打，滞空不能
    get canAttack() {
      return !this.status.freeze && !this.status.sleep && !this.status.resurrecting && !this.status.skydiving;
    }

    // 能不能被别人挪动。自己走位不看这个，只有强制位移才查
    get canBeMoved() {
      return !this.status.skydiving && !this.status.locked;
    }

    abilityRequiresTarget() {
      const strategy = AbilityStrategies[this.skill];
      return strategy ? strategy.requiresTarget : true;
    }

    isTargettableBy(attacker, targetEnemies = true, targetAllies = false) {
      if (!this.alive || this.hp <= 0) return false;
      if (this.status.untargettable) return false;
      if (this.status.resurrecting) return false;
      const isAlly = this.team === attacker.team;
      if (isAlly) return targetAllies;
      return targetEnemies;
    }

    setTarget(target) {
      if (target) {
        this.targetX = target.x; this.targetY = target.y; this.targetEntityId = target.id;
      } else {
        this.targetX = -1; this.targetY = -1; this.targetEntityId = '';
      }
    }

    resetCooldown(base = 1000, speed) {
      if (speed === undefined) { this.cooldown = base; return; }
      this.cooldown = base / (0.4 + speed * 0.007);
    }

    addPP(amount, caster) {
      if (!this.alive || this.status.resurrecting) return;
      // 沉默与保护只挡进账，不挡扣蓝
      if (amount > 0 && (this.status.silence || this.status.protect)) return;
      this.pp = Math.max(0, Math.min(this.maxPP * 2, this.pp + amount));
    }

    changeState(next) {
      if (this.state) this.state.onExit(this);
      this.state = next;
      this.state.onEnter(this);
    }

    toIdleState() { if (this.state.name !== 'idle') this.changeState(new IdleState()); }
    toMovingState() { if (this.state.name !== 'moving') this.changeState(new MovingState()); }
    toAttackingState() { if (this.state.name !== 'attacking') this.changeState(new AttackingState()); }

    // 事件钩子：注册在单位身上，由伤害管线与状态机在对应时机统一触发
    addHook(name, fn, priority = 0, origin = '') {
      if (!this.hooks[name]) this.hooks[name] = [];
      this.hooks[name].push({ fn, priority, origin });
      this.hooks[name].sort((a, b) => b.priority - a.priority);
    }

    runHooks(name, args) {
      const list = this.hooks[name];
      if (!list || !list.length) return;
      for (const h of list) {
        try { h.fn(args); } catch (e) { console.warn('[WarSim] 钩子异常 ' + name, e); }
      }
    }

    addPeriodicEffect(fn, origin, intervalMs) {
      const e = new PeriodicEffect(fn, origin, intervalMs);
      this.periodicEffects.push(e);
      return e;
    }

    // ---- 伤害与治疗：统一转发给状态机基类上的管线 ----
    handleDamage(opts) { return this.state.handleDamage(this, opts); }
    handleSpecialDamage(damage, board, attackType, attacker, crit, apBoost) {
      return this.state.handleSpecialDamage(this, damage, board, attackType, attacker, crit, apBoost);
    }
    handleHeal(heal, caster, apBoost = 0, crit = false) {
      return this.state.handleHeal(this, heal, caster, apBoost, crit);
    }
    addShield(shield, caster, apBoost = 0, crit = false) {
      return this.state.addShield(this, shield, caster, apBoost, crit);
    }

    // ---- 属性增减 ----
    addSpeed(v) { this.speed = Math.max(0, Math.min(MAX_SPEED, this.speed + v)); }
    addAttack(v) { this.atk = Math.max(0, this.atk + v); }
    addDefense(v) { this.def = Math.max(0, this.def + v); }
    addSpecialDefense(v) { this.speDef = Math.max(0, this.speDef + v); }
    addAbilityPower(v) { this.ap += v; }
    addCritChance(v) { this.critChance = Math.max(0, this.critChance + v); }
    addDodge(v) { this.dodge = Math.max(0, this.dodge + v); }
    addRange(v) { this.range = Math.max(1, this.range + v); this.baseRange = this.range; }
    addMaxHp(v) { this.maxHp = Math.max(1, Math.round(this.maxHp + v)); this.hp = Math.min(this.hp + Math.max(0, v), this.maxHp); }

    resurrect() {
      this.hp = this.maxHp;
      this.shield = 0;
      this.status.clearNegative(this);
      this.cooldown = 0;
      this.toMovingState();
      this.sim.emit('resurrect', { id: this.id, team: this.team, hp: this.hp, x: this.x, y: this.y });
    }
  }

  // ---------------- 模拟主体 ----------------

  class WarSimulation {
    constructor(input) {
      const inp = input || {};
      this.conf = resolveConf(inp.config);
      if (inp.board) {
        this.conf.cols = inp.board.cols ?? this.conf.cols;
        this.conf.rows = inp.board.rows ?? this.conf.rows;
      }
      this.rng = makeRng(inp.seed ?? 0);
      this.board = new WarBoard(this.conf.cols, this.conf.rows);
      this.tick = 0;
      this.finished = false;
      this.winner = null;
      this.reason = '';
      this.events = [];
      this.units = [];
      this.unitsById = new Map();
      this.teamEffects = { A: new Set(), B: new Set() };   // 队伍级增益，供后续兵种协同接入
      this.abilitiesCast = { A: [], B: [] };
      this.weather = this.conf.weather;
      this.hazards = this.conf.hazards.slice();
      this._lastTotalHp = -1;
      this._staleTicks = 0;

      this.spawnTeam(inp.teams && inp.teams.A, 'A');
      this.spawnTeam(inp.teams && inp.teams.B, 'B');
      this.units.forEach((u) => u.runHooks('onSpawn', { unit: u, board: this.board }));
      this.units.forEach((u) => u.runHooks('onSimulationStart', { unit: u, board: this.board }));
    }

    spawnTeam(list, team) {
      const arr = Array.isArray(list) ? list : [];
      if (arr.length > this.conf.maxPiecesPerSide) {
        throw new Error(`[WarSim] ${team} 方棋子数 ${arr.length} 超过上限 ${this.conf.maxPiecesPerSide}`);
      }
      const half = Math.floor(this.conf.rows / 2);
      arr.forEach((def) => {
        const u = new WarUnit(def, team, this);
        if (!this.board.inBounds(u.x, u.y)) {
          throw new Error(`[WarSim] 棋子 ${u.id} 坐标 (${u.x},${u.y}) 越界`);
        }
        // A 方占下半区、B 方占上半区，越界不静默修正
        const okZone = team === 'A' ? u.y >= half : u.y < half;
        if (!okZone) {
          throw new Error(`[WarSim] 棋子 ${u.id} 坐标 (${u.x},${u.y}) 不在 ${team} 方半区`);
        }
        if (this.board.getEntityOnCell(u.x, u.y)) {
          throw new Error(`[WarSim] 格子 (${u.x},${u.y}) 已被占用，棋子 ${u.id} 无法入场`);
        }
        this.board.setEntityOnCell(u.x, u.y, u);
        this.units.push(u);
        this.unitsById.set(u.id, u);
        this.emit('spawn', {
          id: u.id, team, name: u.name, icon: u.icon,
          eliteLevel: u.eliteLevel, count: u.count,
          x: u.x, y: u.y, hp: u.hp, maxHp: u.maxHp, atk: u.atk, range: u.range, maxPP: u.maxPP,
        });
      });
    }

    emit(type, data) {
      if (!this.conf.recordEvents && type !== 'death' && type !== 'end') return;
      this.events.push(Object.assign({ tick: this.tick, type }, data));
    }

    pickRandomIn(arr) {
      if (!arr || !arr.length) return undefined;
      return arr[Math.floor(this.rng() * arr.length) % arr.length];
    }

    // 有效概率 = p^(1 - luck/100)；luck=0 时即 p；p=0 恒失败
    chance(p, unit, cap) {
      if (p === 0) return false;
      const limit = cap === undefined ? 1 : cap;
      const luck = unit && Number.isFinite(unit.luck) ? unit.luck : 0;
      const effective = Math.pow(p, 1 - luck / 100);
      return this.rng() < Math.max(0, Math.min(limit, effective));
    }

    // 天气：每秒结算一次，影响 PP 回复与环境伤害
    applyWeatherPerSecond(unit, board) {
      switch (this.weather) {
        case 'RAIN': unit.addPP(3, unit); break;
        case 'DROUGHT': unit.addPP(-3, unit); break;
        case 'SANDSTORM':
          if (!this.finished) {
            unit.handleDamage({
              damage: 5, board, attackType: 'SPECIAL',
              attacker: null, shouldTargetGainMana: false, cause: 'sandstorm',
            });
          }
          break;
        default: break;
      }
    }

    // 场地危险物：布设在某一方半场，该方单位每秒吃一次
    applyHazardsPerSecond(unit, board) {
      if (!this.hazards.length || this.finished) return;
      for (const h of this.hazards) {
        if (h.team && h.team !== unit.team) continue;
        switch (h.type) {
          case 'STEALTH_ROCKS':
            unit.handleDamage({
              damage: 10, board, attackType: 'PHYSICAL',
              attacker: null, shouldTargetGainMana: true, cause: 'stealthRocks',
            });
            unit.status.triggerWound(1000, unit);
            break;
          case 'SPIKES':
            unit.handleDamage({
              damage: 10, board, attackType: 'TRUE',
              attacker: null, shouldTargetGainMana: true, cause: 'spikes',
            });
            unit.status.triggerArmorReduction(1000, unit);
            break;
          case 'TOXIC_SPIKES':
            unit.status.triggerPoison(1000, unit, null);
            break;
          case 'HAIL':
            // 冰雹对同一个单位只生效一次
            if (unit.consumedHazards.has('HAIL')) break;
            unit.consumedHazards.add('HAIL');
            unit.handleDamage({
              damage: 10, board, attackType: 'SPECIAL',
              attacker: null, shouldTargetGainMana: true, cause: 'hail',
            });
            unit.status.triggerFreeze(1000, unit);
            break;
          case 'EMBER':
            unit.handleDamage({
              damage: 10, board, attackType: 'SPECIAL',
              attacker: null, shouldTargetGainMana: true, cause: 'ember',
            });
            unit.status.triggerBurn(2200, unit, null);
            break;
          default: break;
        }
      }
    }

    resetStale() { this._staleTicks = 0; }

    aliveOf(team) { return this.units.filter((u) => u.team === team && u.alive); }

    totalHpOf(team) {
      return this.aliveOf(team).reduce((s, u) => s + u.hp + u.shield, 0);
    }

    update(dt) {
      const snapshot = this.units.slice();
      for (const u of snapshot) {
        if (!u.alive) continue;
        u.state.update(u, dt, this.board);
      }
      this.tick++;
      this.checkEnd();
    }

    checkEnd() {
      const aliveA = this.aliveOf('A').length;
      const aliveB = this.aliveOf('B').length;
      if (aliveA === 0 || aliveB === 0) {
        this.finish(aliveA === aliveB ? 'draw' : (aliveA > 0 ? 'A' : 'B'), 'annihilation');
        return;
      }

      // 僵局检测：连续多少 tick 全场血量与护盾都没有任何变化
      const total = this.totalHpOf('A') + this.totalHpOf('B');
      if (total === this._lastTotalHp) this._staleTicks++;
      else { this._staleTicks = 0; this._lastTotalHp = total; }

      if (this._staleTicks >= this.conf.stalemateTicks || this.tick >= this.conf.hardCapTicks) {
        this.finishByRemainingHp();
      }
    }

    // 僵局与硬上限走同一条结算路径：比剩余总血量，相等才判平局
    finishByRemainingHp() {
      const a = this.totalHpOf('A');
      const b = this.totalHpOf('B');
      this.finish(a === b ? 'draw' : (a > b ? 'A' : 'B'), 'stalemate');
    }

    finish(winner, reason) {
      if (this.finished) return;
      this.finished = true;
      this.winner = winner;
      this.reason = reason;
      this.emit('end', { winner, reason, ticks: this.tick });
    }

    run() {
      const dt = this.conf.tickMs;
      while (!this.finished && this.tick < this.conf.hardCapTicks) this.update(dt);
      if (!this.finished) this.finishByRemainingHp();
      return this.result();
    }

    result() {
      return {
        winner: this.winner,
        reason: this.reason,
        ticks: this.tick,
        conf: {
          tickMs: this.conf.tickMs,
          segmentTicks: this.conf.segmentTicks,
          battleSecondsPerTick: this.conf.battleSecondsPerTick,
          cols: this.conf.cols,
          rows: this.conf.rows,
        },
        units: this.units.map((u) => ({
          id: u.id, name: u.name, icon: u.icon, team: u.team,
          troopId: u.troopId,
          eliteLevel: u.eliteLevel, count: u.count,
          alive: u.alive,
          hp: Math.max(0, Math.round(u.hp)),
          initialHp: u.maxHp,
          shield: Math.max(0, Math.round(u.shield)),
          damageDealt: Math.round(u.physicalDamage + u.specialDamage + u.trueDamage),
          damageTaken: Math.round(u.damageTaken),
          kills: u.kills,
          attackCount: u.counters.attackCount,
          abilityCount: u.counters.ult,
          critCount: u.counters.crit,
          dodgeCount: u.counters.dodgeCount,
          diedAtTick: u.diedAtTick,
          killedBy: u.killedBy,
          x: u.x, y: u.y,
        })),
        events: this.events,
      };
    }
  }

  // ---------------- 对外入口 ----------------

  function simulate(input) {
    const sim = new WarSimulation(input);
    return sim.run();
  }

  // 供控制台冒烟：WarSim.demo() 直接跑一场四对四
  function demo(seed) {
    const mk = (id, name, x, y, hp, atk, range) => ({ id, name, x, y, hp, atk, range });
    return simulate({
      seed: seed ?? 20260726,
      teams: {
        A: [
          mk('a1', '常备步兵', 2, 4, 1700, 170, 1),
          mk('a2', '常备步兵', 3, 4, 1700, 170, 1),
          mk('a3', '弓弩手', 2, 5, 1100, 210, 3),
          mk('a4', '辎重队', 4, 5, 1200, 90, 1),
        ],
        B: [
          mk('b1', '民兵', 2, 1, 1200, 140, 1),
          mk('b2', '民兵', 3, 1, 1200, 140, 1),
          mk('b3', '猎手', 4, 0, 900, 180, 2),
          mk('b4', '乡勇', 1, 0, 1000, 120, 1),
        ],
      },
    });
  }

  return {
    simulate,
    demo,
    WarSimulation,
    WarBoard,
    WarUnit,
    WarStatus,
    AbilityStrategy,
    AbilityStrategies,
    registerAbility,
    castAbility,
    resolveAbilityTargets,
    ABILITY_TARGET_TYPES,
    ABILITY_EFFECT_KINDS,
    PeriodicEffect,
    DelayedCommand,
    distanceC,
    distanceM,
    findPath,
    resolveConf,
    ORIENTATIONS,
    CC_COOLDOWN,
    MAX_SPEED,
  };
})();

// ================================================================
// 📜 战报生成 WarReport
// 把 WarSim 的事件流聚合成逐棋子的客观流水账。
// 时间一律用战场时间：10 秒实时折算 1 小时，即 1 tick = 36 秒战场时间。
// 战报只陈述发生了什么、造成了多少，不做任何文学化描述。
// ================================================================
window.WarReport = (function () {
  'use strict';

  const REASON_LABEL = {
    annihilation: '全歼',
    stalemate: '僵持',
  };

  const CAUSE_LABEL = {
    burn: '灼烧',
    poison: '中毒',
    curse: '诅咒',
    reflect: '反射',
    sandstorm: '沙暴',
    stealthRocks: '隐形岩',
    spikes: '撒菱',
    hail: '冰雹',
    ember: '火星',
    unknown: '未知',
  };

  // tick → 战场时间
  function tickToMinutes(tick, secondsPerTick) {
    return Math.round((tick * secondsPerTick) / 60);
  }

  // 「2 小时 08 分」
  function stampOf(tick, secondsPerTick) {
    const total = tickToMinutes(tick, secondsPerTick);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${h} 小时 ${String(m).padStart(2, '0')} 分`;
  }

  // 「13 小时 42 分」，用于总时长
  function durationOf(tick, secondsPerTick) {
    const total = tickToMinutes(tick, secondsPerTick);
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h <= 0) return `${m} 分`;
    return `${h} 小时 ${String(m).padStart(2, '0')} 分`;
  }

  function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }

  function emptySlice() {
    return {
      moved: 0,
      attacks: 0, attackDamage: 0,
      abilities: {},           // 技能名 → { count, damage }
      kills: [],               // { targetId, targetName, tick }
      taken: 0, takenBy: {},   // 来源 id → 累计
      healed: 0, shielded: 0,
      diedAtTick: null, killedBy: '',
      acted: false,
    };
  }

  // 事件流 → 分段数据
  function aggregate(result) {
    const conf = result.conf || {};
    const segTicks = conf.segmentTicks || 100;
    const spt = conf.battleSecondsPerTick || 36;

    const meta = new Map();      // id → 静态信息
    const live = new Map();      // id → 当前血量等动态信息
    result.units.forEach((u) => {
      meta.set(u.id, { id: u.id, name: u.name, team: u.team, maxHp: u.initialHp, icon: u.icon });
      live.set(u.id, { hp: u.initialHp, x: u.x, y: u.y, alive: true });
    });

    const segCount = Math.max(1, Math.ceil((result.ticks + 1) / segTicks));
    const segments = [];
    for (let i = 0; i < segCount; i++) {
      const slices = new Map();
      result.units.forEach((u) => slices.set(u.id, emptySlice()));
      segments.push({
        index: i,
        fromTick: i * segTicks,
        toTick: (i + 1) * segTicks - 1,
        hour: i + 1,
        slices,
      });
    }

    const killChain = [];
    const lastAbility = new Map();   // 单位 → 最近施放的技能名，供跨段落地的伤害归属
    const segOf = (tick) => segments[Math.min(segments.length - 1, Math.floor(tick / segTicks))];

    result.events.forEach((ev) => {
      const seg = segOf(ev.tick);
      if (!seg) return;

      switch (ev.type) {
        case 'spawn': {
          const l = live.get(ev.id);
          if (l) { l.x = ev.x; l.y = ev.y; l.hp = ev.hp; }
          break;
        }
        case 'move': {
          const s = seg.slices.get(ev.id);
          if (s) { s.moved++; s.acted = true; }
          const l = live.get(ev.id);
          if (l) { l.x = ev.to.x; l.y = ev.to.y; }
          break;
        }
        case 'attack_start': {
          const s = seg.slices.get(ev.id);
          if (s) { s.attacks++; s.acted = true; }
          break;
        }
        case 'ability': {
          const s = seg.slices.get(ev.id);
          if (s) {
            const key = ev.skillName || ev.skill;
            if (!s.abilities[key]) s.abilities[key] = { count: 0, damage: 0 };
            s.abilities[key].count++;
            s.acted = true;
            lastAbility.set(ev.id, key);
          }
          break;
        }
        case 'hit': {
          const victim = seg.slices.get(ev.id);
          const l = live.get(ev.id);
          if (l) { l.hp = ev.hp; l.x = ev.x; l.y = ev.y; }
          if (victim) {
            victim.taken += ev.amount;
            victim.acted = true;
            const srcKey = ev.sourceId || ('env:' + (ev.cause || 'unknown'));
            victim.takenBy[srcKey] = (victim.takenBy[srcKey] || 0) + ev.amount;
          }
          if (ev.sourceId) {
            const dealer = seg.slices.get(ev.sourceId);
            if (dealer) {
              dealer.acted = true;
              if (ev.cause === 'ability') {
                // 归给该单位最近一次施放的技能；跨段落地时沿用上一段的技能名
                const keys = Object.keys(dealer.abilities);
                const key = keys.length ? keys[keys.length - 1]
                  : (lastAbility.get(ev.sourceId) || '技能');
                if (!dealer.abilities[key]) dealer.abilities[key] = { count: 0, damage: 0 };
                dealer.abilities[key].damage += ev.amount;
              } else {
                dealer.attackDamage += ev.amount;
              }
            }
          }
          break;
        }
        case 'heal': {
          const s = seg.slices.get(ev.id);
          if (s) { s.healed += ev.amount; s.acted = true; }
          const l = live.get(ev.id);
          if (l) l.hp = ev.hp;
          break;
        }
        case 'shield': {
          const s = seg.slices.get(ev.id);
          if (s) { s.shielded += ev.amount; s.acted = true; }
          break;
        }
        case 'death': {
          const s = seg.slices.get(ev.id);
          const l = live.get(ev.id);
          if (l) { l.alive = false; l.hp = 0; }
          if (s) { s.diedAtTick = ev.tick; s.killedBy = ev.killerId; s.acted = true; }
          if (ev.killerId) {
            const killer = seg.slices.get(ev.killerId);
            const victimMeta = meta.get(ev.id);
            if (killer) {
              killer.acted = true;
              killer.kills.push({
                targetId: ev.id,
                targetName: victimMeta ? victimMeta.name : ev.id,
                tick: ev.tick,
              });
            }
            const killerMeta = meta.get(ev.killerId);
            killChain.push({
              tick: ev.tick,
              stamp: stampOf(ev.tick, spt),
              killerId: ev.killerId,
              killerName: killerMeta ? killerMeta.name : ev.killerId,
              victimId: ev.id,
              victimName: victimMeta ? victimMeta.name : ev.id,
            });
          }
          break;
        }
        default: break;
      }
    });

    // 段末的血量与坐标快照：按段边界重放一次事件流
    const snapshots = segments.map(() => new Map());
    const cur = new Map();
    result.units.forEach((u) => cur.set(u.id, { hp: u.initialHp, x: 0, y: 0, alive: true }));
    let si = 0;
    result.events.forEach((ev) => {
      while (si < segments.length - 1 && ev.tick > segments[si].toTick) {
        snapshots[si] = cloneState(cur);
        si++;
      }
      const c = cur.get(ev.id);
      if (!c) return;
      if (ev.type === 'spawn') { c.hp = ev.hp; c.x = ev.x; c.y = ev.y; }
      else if (ev.type === 'move') { c.x = ev.to.x; c.y = ev.to.y; }
      else if (ev.type === 'hit') { c.hp = ev.hp; c.x = ev.x; c.y = ev.y; }
      else if (ev.type === 'heal') { c.hp = ev.hp; }
      else if (ev.type === 'death') { c.hp = 0; c.alive = false; }
      else if (ev.type === 'resurrect') { c.hp = ev.hp; c.alive = true; }
    });
    for (let i = si; i < segments.length; i++) snapshots[i] = cloneState(cur);

    segments.forEach((seg, i) => { seg.snapshot = snapshots[i]; });

    return { meta, segments, killChain, spt, segTicks };
  }

  function cloneState(map) {
    const out = new Map();
    map.forEach((v, k) => out.set(k, { hp: v.hp, x: v.x, y: v.y, alive: v.alive }));
    return out;
  }

  // ---------------- 文本渲染 ----------------

  function renderSegment(seg, agg, maxSources) {
    const { meta, spt } = agg;
    const snap = seg.snapshot;

    let aliveA = 0, aliveB = 0;
    meta.forEach((m, id) => {
      const s = snap.get(id);
      if (!s || !s.alive) return;
      if (m.team === 'A') aliveA++; else aliveB++;
    });

    const lines = [`【第 ${seg.hour} 小时】存活 A ${aliveA} / B ${aliveB}`, ''];
    let printed = 0;

    meta.forEach((m, id) => {
      const s = seg.slices.get(id);
      const st = snap.get(id);
      if (!s || !s.acted) return;

      const body = [];
      if (s.moved > 0) body.push(`移动 ${s.moved} 格`);
      if (s.attacks > 0) body.push(`攻击 ${s.attacks} 次，造成伤害 ${Math.round(s.attackDamage)}`);
      Object.keys(s.abilities).forEach((k) => {
        const a = s.abilities[k];
        // 上一段放出、这一段才落地的伤害没有施放次数，单独措辞
        body.push(a.count > 0
          ? `${k} ${a.count} 次，造成伤害 ${Math.round(a.damage)}`
          : `${k}（上一时段发出）造成伤害 ${Math.round(a.damage)}`);
      });
      s.kills.forEach((k) => {
        body.push(`击杀 ${k.targetName} ${k.targetId}（${stampOf(k.tick, spt)}）`);
      });
      if (s.healed > 0) body.push(`受到治疗 ${Math.round(s.healed)}`);
      if (s.shielded > 0) body.push(`获得护盾 ${Math.round(s.shielded)}`);
      if (s.taken > 0) body.push(`受到伤害 ${Math.round(s.taken)}（${renderSources(s.takenBy, meta, maxSources)}）`);

      if (s.diedAtTick !== null) {
        const killer = s.killedBy ? (meta.get(s.killedBy) || {}) : null;
        body.push(killer && killer.id
          ? `阵亡（${stampOf(s.diedAtTick, spt)}，被 ${killer.name} ${killer.id} 击杀）`
          : `阵亡（${stampOf(s.diedAtTick, spt)}）`);
      } else if (st) {
        body.push(`剩余 ${Math.round(st.hp)} / ${m.maxHp}（${pct(st.hp, m.maxHp)}%）　位置 (${st.x},${st.y})`);
      }

      if (!body.length) return;
      lines.push(`${m.name} ${id}`);
      body.forEach((b) => lines.push('  ' + b));
      lines.push('');
      printed++;
    });

    if (!printed) lines.push('本时段无任何行动。', '');
    return lines.join('\n');
  }

  // 伤害来源分解：只列前几名，其余并进「其他」
  function renderSources(takenBy, meta, maxSources) {
    const entries = Object.keys(takenBy).map((k) => {
      const m = meta.get(k);
      const label = m ? `${m.name} ${k}` : ('环境·' + (CAUSE_LABEL[String(k).replace('env:', '')] || String(k).replace('env:', '')));
      return { label, amount: Math.round(takenBy[k]) };
    }).sort((a, b) => b.amount - a.amount);

    if (entries.length <= maxSources) {
      return entries.map((e) => `${e.label} ${e.amount}`).join(' / ');
    }
    const head = entries.slice(0, maxSources);
    const rest = entries.slice(maxSources).reduce((s, e) => s + e.amount, 0);
    return head.map((e) => `${e.label} ${e.amount}`).join(' / ') + ` / 其他 ${rest}`;
  }

  function renderSummary(result, agg) {
    const { meta, killChain, spt } = agg;
    const winnerLabel = result.winner === 'draw' ? '双方平局'
      : `${result.winner} 方获胜`;
    const reason = REASON_LABEL[result.reason] || result.reason;

    const lostA = result.units.filter((u) => u.team === 'A' && !u.alive).length;
    const lostB = result.units.filter((u) => u.team === 'B' && !u.alive).length;

    const lines = [];
    lines.push(`【战果】${winnerLabel}（${reason}）　交战历时 ${durationOf(result.ticks, spt)}`);
    lines.push(`【战损】A 方阵亡 ${lostA} 支 / B 方阵亡 ${lostB} 支`);
    lines.push('');
    lines.push('【全场统计】');
    result.units.forEach((u) => {
      const tail = u.alive
        ? `剩余 ${u.hp} / ${u.initialHp}（${pct(u.hp, u.initialHp)}%）`
        : `阵亡于 ${stampOf(u.diedAtTick || 0, spt)}`;
      lines.push(`  [${u.team}] ${u.name} ${u.id}　输出 ${u.damageDealt}　承伤 ${u.damageTaken}`
        + `　击杀 ${u.kills}　普攻 ${u.attackCount}　技能 ${u.abilityCount}　暴击 ${u.critCount}　${tail}`);
    });

    const mvp = result.units.slice().sort((a, b) => b.damageDealt - a.damageDealt)[0];
    if (mvp) lines.push('', `【全场最高输出】${mvp.name} ${mvp.id}（${mvp.damageDealt}）`);

    if (killChain.length) {
      lines.push('', '【击杀链】');
      killChain.forEach((k) => {
        lines.push(`  ${k.stamp}　${k.killerName} ${k.killerId} 击杀 ${k.victimName} ${k.victimId}`);
      });
    }
    return lines.join('\n');
  }

  // ---------------- 对外入口 ----------------

  function build(result, options) {
    const opts = options || {};
    const maxSources = opts.maxDamageSources
      ?? ((typeof GameDBManager !== 'undefined' && GameDBManager.DB && GameDBManager.DB.warConfig
        && GameDBManager.DB.warConfig.reportMaxDamageSources) || 3);

    const agg = aggregate(result);
    const segments = agg.segments.map((seg) => ({
      index: seg.index,
      hour: seg.hour,
      fromTick: seg.fromTick,
      toTick: seg.toTick,
      text: renderSegment(seg, agg, maxSources),
    }));
    const summary = renderSummary(result, agg);

    return {
      segments,
      summary,
      killChain: agg.killChain,
      text: segments.map((s) => s.text).join('\n') + '\n' + summary,
      duration: durationOf(result.ticks, agg.spt),
      settlement: settlement(result, agg),
    };
  }

  // 结算输出：外部编组系统据此把剩余血量换算回兵力
  function settlement(result, agg) {
    const spt = (agg && agg.spt) || (result.conf && result.conf.battleSecondsPerTick) || 36;
    return {
      winner: result.winner,
      reason: result.reason,
      reasonLabel: REASON_LABEL[result.reason] || result.reason,
      ticks: result.ticks,
      duration: durationOf(result.ticks, spt),
      units: result.units.map((u) => ({
        id: u.id,
        name: u.name,
        team: u.team,
        alive: u.alive,
        hp: u.hp,
        initialHp: u.initialHp,
        hpPercent: pct(u.hp, u.initialHp),
        damageDealt: u.damageDealt,
        damageTaken: u.damageTaken,
        kills: u.kills,
        diedAt: u.diedAtTick === null ? '' : stampOf(u.diedAtTick, spt),
      })),
    };
  }

  return { build, settlement, stampOf, durationOf, tickToMinutes, REASON_LABEL, CAUSE_LABEL };
})();


  const api = Object.freeze({
    status() {
      return Object.freeze({
        key: KEY,
        ready: true,
        handlers: Object.freeze(["war-simulation", "war-report"]),
      });
    },
    simulate: (...args) => window.WarSim.simulate(...args),
    demo: (...args) => window.WarSim.demo(...args),
    buildReport: (...args) => window.WarReport.build(...args),
    settlement: (...args) => window.WarReport.settlement(...args),
    WarSim: window.WarSim,
    WarReport: window.WarReport,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
      return true;
    },
  });

  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
