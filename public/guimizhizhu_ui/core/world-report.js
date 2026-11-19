(() => {
  'use strict';
  const KEY = 'cryptLord.worldReport', root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract, modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (!contract) throw Error('世界线报告契约尚未加载');
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const RESERVED = new Set(['$meta', '__proto__', 'constructor', 'prototype']);
  let disposed = false, epoch = 0;
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const text = value => value == null ? '' : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
  const entries = value => record(value) ? Object.entries(value).filter(([key]) => !RESERVED.has(key)) : [];
  function clean(raw) {
    const value = String(raw || '').replace(/\r\n?/g, '\n').replace(/<!--[\s\S]*?(?:-->|$)/g, '');
    const stack = [], parts = [];
    const tags = /\\[\s\S]|"|<(\/?)(safe|thinking|reasoning|think|analysis|思考|推理|分析|style|script|Auto|UpdateVariable|JSONPatch)(?=\s|>)[^>]*>/gi;
    let offset = 0, quoted = false;
    for (const match of value.matchAll(tags)) {
      const patch = stack.some(tag => ['updatevariable', 'jsonpatch'].includes(tag));
      if (!match[2]) {
        if (patch && match[0] === '"') quoted = !quoted;
        continue;
      }
      if (patch && quoted) continue;
      if (!stack.length) parts.push(value.slice(offset, match.index));
      const tag = match[2].toLowerCase();
      if (!match[1]) stack.push(tag);
      else if (stack.at(-1) === tag) stack.pop();
      // Invalid hidden markup remains hidden; it must not expose a sample report.
      else if (stack.length) break;
      offset = match.index + match[0].length;
    }
    if (!stack.length) parts.push(value.slice(offset));
    return parts.join('');
  }
  function blocks(raw, tag) {
    const stack = [], result = [];
    for (const match of String(raw || '').matchAll(new RegExp(`<(/?)${tag}(?:\\s+[^>]*)?\\s*>`, 'gi'))) {
      if (!match[1]) stack.push(match.index + match[0].length);
      else if (stack.length) {
        const start = stack.pop();
        if (!stack.length) result.push(raw.slice(start, match.index).trim());
      }
    }
    return result;
  }
  function lines(value, keyed = false) {
    const source = Array.isArray(value) ? value : record(value) ? entries(value).map(([key, item]) =>
      keyed ? `[${key}] ${text(item)}` : text(item)) : typeof value === 'string' ? value.split('\n') : value == null ? [] : [value];
    return source.map(text).map(item => item.trim()).filter(Boolean);
  }
  function plans(value) {
    return lines(value).map(line => {
      const parts = line.split('|').map(item => item.trim());
      return { content: parts[0], status: parts[1] || '', time: parts[2] || '' };
    });
  }
  function npc(name, value, legacy = false) {
    if (!record(value)) return null;
    const exp = Math.max(0, Math.floor(Number(value.$战斗经验) || 0));
    const level = Math.max(0, Math.floor(Number(value.$战斗经验等级) || 0));
    const experience = modules['cryptLord.battleExperience'];
    const need = experience?.levelNeed(level) || 0;
    const cap = experience ? 12 - experience.rank(value.当前序列 || '普通人') : Infinity;
    return { name, identity: text(value.身份), behavior: text(value.行为链片段),
      statuses: record(value.当前状态) ? entries(value.当前状态).map(([key, item]) => `${key}: ${text(item)}`) : lines(value.当前状态),
      doing: text(value.正在做的事), location: text(value.所处地点), appearance: text(value.外貌),
      goal: text(value.长期目标), plans: plans(value.近期打算), history: lines(value.事件历史, true),
      memories: lines(value.关键记忆, true), legacy,
      experience: legacy ? null : { level, exp, need, full: level >= cap, percentage: need > 0 ? Math.min(100, exp / need * 100) : 0 } };
  }
  function newspaper(value) {
    return entries(value).map(([key, item]) => ({
      date: key.replace(/[[\]【】()]/g, '').replace(/-\d+$/, '').trim(),
      content: (Array.isArray(item) ? item.map(text).join(' | ') :
        record(item) ? entries(item).map(([, child]) => text(child)).join(' | ') : text(item)).trim(),
    })).filter(item => item.content);
  }
  function legacyNews(raw) {
    const matches = raw.match(/[[【(][^\]】)]+[\]】)]\s*[^\n[【(]+/g) || [];
    if (!matches.length) return raw.split('\n').filter(line => line.trim() && line.length > 5 &&
      !/^[💠#]*\s*日报[与和]?传闻\s*[:：]?$/u.test(line.trim())).map(line => ({ date: '', content: line.trim() }));
    return matches.flatMap(item => {
      const match = item.match(/([[【(][^\]】)]+[\]】)])\s*(.+)/);
      return match ? [{ date: match[1].replace(/[[\]【】()]/g, '').trim(), content: match[2].trim() }] : [];
    });
  }
  function legacy(raw) {
    const candidates = blocks(clean(raw), 'details').filter(item => /自动化系统|<Auto[\s>]|💠/.test(item));
    const body = candidates.at(-1)?.replace(/<\/?summary[^>]*>/gi, '') || '';
    const newsIndex = body.search(/[💠#]*\s*日报[与和]?传闻/iu);
    const npcText = newsIndex < 0 ? body : body.slice(0, newsIndex), people = [];
    for (const block of npcText.split('💠').filter(item => item.trim().length > 10)) {
      if (/识别.*NPC|核心.*活跃|自动化系统/.test(block.slice(0, 30))) continue;
      const rows = block.split('\n'), match = rows[0].trim().match(/^\[?([^\]:：(（]+)\]?(?:[[(（]([^)）\]]+)[)）\]])?\s*[:：]?/);
      if (!match) continue;
      const value = { 身份: match[2] || '', 近期打算: [], 关键记忆: [], 事件历史: [] };
      let section = '';
      for (const rawLine of rows.slice(1)) {
        const line = rawLine.trim(); if (!line) continue;
        const field = line.match(/^(行为链片段|当前状态|长期目标|近期打算|关键记忆(?:更新)?|事件历史)\s*[:：]\s*(.*)$/);
        if (field) {
          const key = field[1].replace(/更新$/, '');
          section = ['近期打算', '关键记忆', '事件历史'].includes(key) ? key : '';
          if (section) { if (field[2]) value[section].push(field[2]); }
          else value[key] = field[2];
        } else if (section && !/[:：]$/.test(line)) value[section].push(line.replace(/^[-*•]\s*/, '').trim());
        else section = '';
      }
      if (!value.行为链片段 && !value.当前状态 && !value.长期目标 && !value.近期打算.length &&
        !value.关键记忆.length && !value.事件历史.length) continue;
      const card = npc(match[1].trim(), value, true);
      const status = String(value.当前状态 || '').split('|').map(item => item.trim());
      card.statuses = (status[0] || '').split(/[/\\]/).filter(Boolean);
      card.doing = status[1] || ''; card.location = status[2] || ''; card.appearance = '';
      card.action = status[3] || ''; people.push(card);
    }
    return { people, news: newsIndex < 0 ? [] : legacyNews(body.slice(newsIndex)) };
  }
  function worldLog(raw) {
    const value = blocks(clean(raw), 'wlog').at(-1)?.replace(/\n{3,}/g, '\n\n').trim() || '';
    if (!value) return null;
    const rows = value.split('\n'), time = /^\u{1f552}/u.test(rows[0]) ? rows.shift().replace(/^\u{1f552}\s*/u, '').trim() : '';
    return { time, body: rows.join('\n').trim() || value };
  }
  function project(floor, previous = null) {
    if (floor?.role !== 'assistant') throw Error('世界线报告仅支持真实 assistant 楼层');
    const raw = clean(floor.message), data = floor.data || {}, npcData = data.npc_data, warning = [];
    const journey = blocks(raw, '本周目经历').at(-1) || '';
    const people = modules['cryptLord.journeyReader']?.parse(journey).at(-1)?.在场人物 || '';
    const names = [...new Set(String(people).replace(/[（(][^）)]*[）)]/g, '').split(/[、，,]/)
      .map(name => name.trim()).filter(name => name && name !== data.stat_data?.名称 && !RESERVED.has(name)))];
    const modified = new Set();
    // JSON Pointer segments retain literal dots, slashes and tildes in NPC names.
    for (const { domain, command } of modules['cryptLord.variablePatch']?.commands(floor.message) || []) {
      if (!['add', 'replace', 'remove'].includes(command?.op) || typeof command?.path !== 'string') continue;
      const parts = command.path.split('/').slice(1).map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'));
      const target = ['stat_data', 'npc_data', 'world_data'].includes(parts[0]) ? parts.shift() : domain;
      if (target === 'npc_data' && parts[0] && !RESERVED.has(parts[0])) modified.add(parts[0]);
    }
    if (!modified.size && previous?.role === 'assistant' && record(previous.data?.npc_data)) {
      for (const [name, value] of entries(npcData))
        if (!same(value, previous.data.npc_data[name])) modified.add(name);
    }
    const selected = name => {
      if (!record(npcData) || !Object.hasOwn(npcData, name) || !record(npcData[name])) {
        warning.push(`人物「${name}」没有有效的本楼层数据`); return null;
      }
      return npc(name, npcData[name]);
    };
    const active = names.map(selected).filter(Boolean);
    const offscreen = [...modified].filter(name => !names.includes(name) && record(npcData) && Object.hasOwn(npcData, name))
      .map(selected).filter(Boolean);
    const old = legacy(raw), dynamic = Boolean(active.length || offscreen.length);
    const news = newspaper(data.world_data?.日报与传闻);
    if (npcData !== undefined && !record(npcData)) warning.push('NPC 数据格式异常');
    const newsValue = data.world_data?.日报与传闻;
    if (newsValue !== undefined && !record(newsValue)) warning.push('日报与传闻格式异常，保留旧版文本展示');
    const log = worldLog(raw);
    return { messageId: floor.message_id, active, offscreen, legacy: dynamic ? [] : old.people,
      news: news.length ? news : old.news, worldLog: log, warning,
      hasContent: Boolean(active.length || offscreen.length || old.people.length || news.length || old.news.length || log),
      source: dynamic || news.length ? 'native-data' : 'legacy-text' };
  }
  function check(guard, token) {
    if (disposed || modules[KEY] !== api || token !== epoch || guard && !guard())
      throw new DOMException('世界线报告读取已取消', 'AbortError');
  }
  async function snapshot(host, guard, token) {
    check(guard, token);
    const source = modules['cryptLord.nativeFloorSource'];
    if (!source) throw Error('原生楼层来源服务尚未加载');
    const loaded = await source.read(() => { check(guard, token); return true; });
    check(guard, token);
    if (modules['cryptLord.hostApi'] !== host) throw Error('世界线报告来源服务已变化');
    return { source, loaded };
  }
  async function scan(guard, token = epoch) {
    const host = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
    check(guard, token);
    const first = await snapshot(host, guard, token), reports = [], floors = [];
    let previous = null;
    for (const floor of first.loaded.rows) {
      if (floor.role !== 'assistant') continue;
      if (!floor.is_hidden) {
        reports.push(project(floor, previous));
        floors.push({ messageId: floor.message_id, name: String(floor.name || '') });
      }
      previous = floor;
    }
    if (modules['cryptLord.nativeFloorSource'] !== first.source) throw Error('世界线报告来源服务已变化');
    await first.source.assert(first.loaded, () => { check(guard, token); return true; });
    return { reports, floors };
  }
  async function load(messageId = null, guard) {
    if (messageId !== null && (!Number.isInteger(messageId) || messageId < 0)) throw Error('楼层编号无效');
    const result = await scan(guard);
    const report = messageId === null ? result.reports.at(-1) : result.reports.find(row => row.messageId === messageId);
    if (!report) throw Object.assign(Error('所选原生 assistant 楼层不存在或已隐藏'), {
      code: 'REPORT_FLOOR_UNAVAILABLE', floors: result.floors,
    });
    return { report, floors: result.floors };
  }
  const after = modules['cryptLord.afterNativeHost'], events = after?.tavernEvents(), subscriptions = [];
  if (events?.CHAT_CHANGED) subscriptions.push(after.bindEvent(events.CHAT_CHANGED, () => { epoch++; }));
  if (events?.GENERATION_STARTED) subscriptions.push(after.bindEvent(events.GENERATION_STARTED, (type, options, dryRun) => {
    if (!['quiet', 'dryRun'].includes(type) && !dryRun && !options?.dryRun && !options?.quiet_prompt) epoch++;
  }));
  const api = Object.freeze({ status: () => ({ key: KEY, ready: !disposed }), project, newspaper, legacyNews, legacy, worldLog, load, scan,
    dispose() {
      disposed = true; epoch++; subscriptions.forEach(item => item?.stop()); contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    } });
  modules[KEY] = api; contract.initializeGlobal(KEY, api);
})();
