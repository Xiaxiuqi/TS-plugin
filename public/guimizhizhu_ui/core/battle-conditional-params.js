(() => {
  'use strict';

  const KEY = 'cryptLord.battleConditionalParams';
  const root = (window.cryptLord = window.cryptLord || {});
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const OPERATORS = ['===', '!==', '>=', '<=', '==', '!=', '&&', '||', '>', '<', '+', '-', '*', '/', '%', '!', '(', ')', '.', ','];
  const PRECEDENCE = { '||': 1, '&&': 2, '==': 3, '!=': 3, '===': 3, '!==': 3,
    '>': 4, '<': 4, '>=': 4, '<=': 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6 };
  const STATS = {
    当前活力: 'hp', 活力: 'maxHp', 当前灵性: 'spirit', 灵性: 'maxSpirit',
    当前理智: 'sanity', 理智: 'maxSanity', 当前人性: 'humanity', 人性: 'maxHumanity',
    当前敏捷: 'agility', 敏捷: 'maxAgility', 运气: 'luck', 当前运气: 'luck',
    currentHealth: 'hp', maxHealth: 'maxHp', sequenceRank: 'rank', attack: 'power',
    speed: 'conditionSpeed', defense: 'conditionDefense', 神性: 'divinity', level: 'level',
  };
  const FUNCTIONS = new Set(['hasTag', 'getTagStacks', 'getTagDuration']);
  const OVERRIDES = new Set(['power', '威力', '伤害', 'damage', 'healAmt', 'healValue',
    '治疗量', '治疗数值', 'isHeal', 'healType', 'range', '射程', '攻击距离',
    'effects', '效果', 'skillTags', 'applyTags', 'removeTags', 'damageType', '伤害类型',
    'aoeRadius', '范围半径', '爆炸半径', 'healValueType', '治疗数值类型',
    'fixedDamage', 'isAccuracyWeapon', 'accuracyTier']);
  const NAMES = { 威力: 'power', 伤害: 'power', damage: 'power', 治疗量: 'healAmt',
    治疗数值: 'healAmt', healValue: 'healAmt', 射程: 'range', 攻击距离: 'range', 效果: 'effects',
    伤害类型: 'damageType', 范围半径: 'aoeRadius', 爆炸半径: 'aoeRadius',
    治疗数值类型: 'healValueType' };
  function normalizeEffects(value) {
    if (!Array.isArray(value)) return null;
    return value.map(effect => {
      if (!effect || typeof effect !== 'object' || Array.isArray(effect)) return null;
      return {
        ...effect, name: effect.name ?? effect.名称,
        type: effect.type ?? effect.类型,
        duration: effect.duration ?? effect.持续时间,
        power: effect.power ?? effect.威力 ?? effect.强度,
        stat: effect.stat ?? effect.属性 ?? effect.目标属性,
        valueType: effect.valueType ?? effect.数值类型,
        effectTarget: effect.effectTarget ?? effect.效果目标,
        priority: effect.priority ?? effect.优先级,
        modifier: effect.modifier ?? effect.修正值,
        triggerTiming: effect.triggerTiming ?? effect.触发时机,
      };
    }).filter(Boolean);
  }

  function tokenize(source) {
    if (typeof source !== 'string' || source.length > 512) throw new Error('条件长度无效');
    const tokens = [];
    let index = 0;
    while (index < source.length) {
      if (/\s/u.test(source[index])) { index += 1; continue; }
      const rest = source.slice(index);
      const string = rest.match(/^("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/u);
      const number = rest.match(/^\d+(?:\.\d+)?/u);
      const identifier = rest.match(/^[\p{L}_$][\p{L}\p{N}_$]*/u);
      const value = string?.[0] || number?.[0] || identifier?.[0] ||
        OPERATORS.find(operator => rest.startsWith(operator));
      if (!value) throw new Error('不支持的条件符号');
      tokens.push({ value, type: string ? 'string' : number ? 'number' : identifier ? 'name' : 'operator' });
      if (tokens.length > 128) throw new Error('条件过长');
      index += value.length;
    }
    return tokens;
  }

  function evaluate(source, caster, target, roll) {
    const tokens = tokenize(source);
    let index = 0;
    const take = value => tokens[index]?.value === value ? (index += 1, true) : false;
    const expect = value => { if (!take(value)) throw new Error(`缺少 ${value}`); };
    const context = { caster, target };
    const parse = (minimum = 0) => {
      let left;
      const token = tokens[index++];
      if (!token) throw new Error('条件不完整');
      if (token.value === '(') { left = parse(); expect(')'); }
      else if (['!', '-', '+'].includes(token.value)) {
        const operand = parse(7);
        left = () => token.value === '!' ? !operand() : token.value === '-' ? -Number(operand()) : Number(operand());
      } else if (token.type === 'number') left = () => Number(token.value);
      else if (token.type === 'string') {
        const value = token.value[0] === '"' ? JSON.parse(token.value)
          : token.value.slice(1, -1).replace(/\\(['\\])/gu, '$1');
        left = () => value;
      } else if (token.type === 'name') {
        if (['true', 'false', 'null'].includes(token.value))
          left = () => token.value === 'null' ? null : token.value === 'true';
        else if (token.value === 'random' || token.value === '随机数') {
          expect('(');
          const min = parse(); expect(','); const max = parse(); expect(')');
          left = () => {
            const lower = Number(min()); const upper = Number(max());
            return Number.isFinite(lower) && Number.isFinite(upper)
              ? Math.floor(roll * 100) + 1 : 0;
          };
        } else if (token.value === 'caster' || token.value === 'target') {
          expect('.');
          const name = tokens[index++];
          if (name?.type !== 'name') throw new Error('属性无效');
          if (FUNCTIONS.has(name.value)) {
            expect('('); const argument = parse(); expect(')');
            left = () => {
              const tags = context[token.value]?.tags || [];
              const tag = tags.find(row => (typeof row === 'string' ? row : row.name) === argument());
              if (name.value === 'hasTag') return Boolean(tag);
              return tag && typeof tag === 'object'
                ? Number(tag[name.value === 'getTagStacks' ? 'stacks' : 'duration']) || 0 : 0;
            };
          } else {
            if (!Object.hasOwn(STATS, name.value)) throw new Error('属性不在白名单');
            left = () => Number(context[token.value]?.[STATS[name.value]] ??
              (name.value === 'speed' ? context[token.value]?.agility :
                name.value === 'defense' ? context[token.value]?.maxHp : 0)) || 0;
          }
        } else throw new Error('未知条件标识符');
      } else throw new Error('条件无效');
      while (tokens[index] && (PRECEDENCE[tokens[index].value] || 0) >= minimum &&
        PRECEDENCE[tokens[index].value]) {
        const op = tokens[index++].value;
        const right = parse(PRECEDENCE[op] + 1);
        const previous = left;
        left = () => {
          const a = previous();
          if (op === '&&') return a && right();
          if (op === '||') return a || right();
          const b = right();
          switch (op) {
            case '===': return a === b;
            case '!==': return a !== b;
            case '==': return a == b;
            case '!=': return a != b;
            case '>': return a > b;
            case '<': return a < b;
            case '>=': return a >= b;
            case '<=': return a <= b;
            case '+': return a + b;
            case '-': return a - b;
            case '*': return a * b;
            case '/': return a / b;
            default: return a % b;
          }
        };
      }
      return left;
    };
    const result = parse();
    if (index !== tokens.length) throw new Error('条件包含多余内容');
    return Boolean(result());
  }

  function select(ability, caster, target, roll = 0) {
    if (!ability || typeof ability !== 'object') return ability;
    const selected = { ...ability };
    delete selected.conditionalParams;
    delete selected.条件参数集;
    const rows = ability.conditionalParams || ability.条件参数集;
    if (!Array.isArray(rows)) return selected;
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const condition = row.condition || row.条件;
      let matches = false;
      try { matches = evaluate(condition, caster, target, roll); }
      catch (error) { console.warn(`[${KEY}] 忽略无效条件`, error); }
      if (!matches) continue;
      const params = row.params || row.参数;
      if (params && typeof params === 'object' && !Array.isArray(params)) {
        for (const [key, value] of Object.entries(params)) {
          const field = NAMES[key] || key;
          if (!OVERRIDES.has(key) || (selected[field] !== undefined && typeof value !== typeof selected[field]))
            continue;
          const normalized = field === 'effects' ? normalizeEffects(value) : value;
          if (normalized !== null) selected[field] = normalized;
        }
      }
      break;
    }
    return selected;
  }

  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true }); },
    evaluate, select,
    dispose() {
      try { contract.releaseGlobal(KEY, api); } catch { /* Loader owns final cleanup. */ }
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
