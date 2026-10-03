(() => {
  'use strict';

  const KEY = 'cryptLord.domainConsole';
  const HOST_KEY = 'cryptLord.afterNativeHost';
  const STORE_KEY = 'cryptLord.stateStore';
  const DOMAIN_KEY = 'cryptLord.domainState';
  const FOUNDATION_KEY = 'cryptLord.domainFoundation';
  const RECOGNITION_KEY = 'cryptLord.domainRecognition';
  const AUDIO_KEY = 'cryptLord.gameAudio';
  const root = (window.cryptLord = window.cryptLord || {});
  const contract = root.contract;
  if (!contract) throw new Error(`[${KEY}] shared/contract.js 尚未加载`);
  const modules = (root.__stage1Modules = root.__stage1Modules || Object.create(null));
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const host = modules[HOST_KEY];
  const domainState = modules[DOMAIN_KEY];
  const foundation = modules[FOUNDATION_KEY];
  const recognition = modules[RECOGNITION_KEY];
  if (!host || !domainState || !foundation || !recognition) throw new Error(`[${KEY}] 依赖尚未加载`);

  const state = {
    mask: null, dialog: null, body: null, targetId: null, data: null, domain: null,
    baseline: '', dataBaseline: '', pendingPromotion: null,
    intentDraft: null, foundationDraft: null, verdict: null,
    peerVerdicts: Object.create(null),
    armory: { field: '陆战', branch: '陆军', troop: '', quantity: 1, forming: null },
    buildingPicks: Object.create(null),
    roomPicks: Object.create(null),
    drag: null, busy: false, epoch: 0, disposed: false, subscription: null,
  };

  function document() { return host.getHost()?.document || window.document; }
  function view() { return document().defaultView || window; }
  function record(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
  function clone(value) { return typeof window.structuredClone === 'function' ? window.structuredClone(value) : JSON.parse(JSON.stringify(value)); }
  function number(value, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
  function element(tag, className, text) {
    const node = document().createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(label, className, handler) {
    const node = element('button', className, label);
    node.type = 'button';
    node.disabled = state.busy;
    node.addEventListener('click', handler);
    return node;
  }
  function notify(message, level = 'info') {
    const fn = window.toastr?.[level];
    if (typeof fn === 'function') fn(message);
  }
  function currentTime() {
    return number(state.data?.world_data?.当前时间分钟, 0);
  }
  function saveData() {
    return state.data;
  }
  function input(label, value, onChange, type = 'text') {
    const row = element('label', 'crypt-lord-domain-console__field');
    row.appendChild(element('span', '', label));
    const control = element('input');
    control.type = type;
    control.value = String(value ?? '');
    control.addEventListener('change', () => onChange(type === 'number' ? number(control.value) : control.value));
    row.appendChild(control);
    return row;
  }
  function select(label, value, options, onChange) {
    const row = element('label', 'crypt-lord-domain-console__field');
    row.appendChild(element('span', '', label));
    const control = element('select');
    options.forEach(option => {
      const item = element('option', '', option.label ?? option);
      item.value = option.value ?? option;
      control.appendChild(item);
    });
    control.value = String(value ?? '');
    control.addEventListener('change', () => onChange(control.value));
    row.appendChild(control);
    return row;
  }
  function metric(label, value) {
    const node = element('div', 'crypt-lord-domain-console__metric');
    node.append(element('span', '', label), element('strong', '', String(value)));
    return node;
  }
  function refreshDomain() {
    state.domain = domainState.ensureDomain(state.data?.stat_data?.领地 || {});
    if (!state.data.stat_data) state.data.stat_data = {};
    state.data.stat_data.领地 = state.domain;
    return state.domain;
  }
  function dragHeader(header) {
    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const rect = state.dialog.getBoundingClientRect();
      state.drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      header.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    header.addEventListener('pointermove', event => {
      if (!state.drag) return;
      const rect = state.dialog.getBoundingClientRect();
      state.dialog.style.left = `${Math.max(8, Math.min(view().innerWidth - rect.width - 8, state.drag.left + event.clientX - state.drag.x))}px`;
      state.dialog.style.top = `${Math.max(8, Math.min(view().innerHeight - rect.height - 8, state.drag.top + event.clientY - state.drag.y))}px`;
      state.dialog.style.transform = 'none';
    });
    const stop = () => { state.drag = null; };
    header.addEventListener('pointerup', stop);
    header.addEventListener('pointercancel', stop);
  }
  function mount() {
    if (state.disposed || state.mask) return Boolean(state.mask);
    const body = document().body;
    if (!body) return false;
    const mask = element('section', 'crypt-lord-domain-console');
    mask.dataset.open = 'false';
    mask.innerHTML = '<section class="crypt-lord-domain-console__dialog" role="dialog" aria-modal="true"><header><strong data-domain-title>独立领地</strong><span data-domain-subtitle></span><button type="button" data-domain-close title="关闭">×</button></header><div class="crypt-lord-domain-console__body" data-domain-body></div><footer data-domain-footer></footer></section>';
    state.mask = mask;
    state.dialog = mask.querySelector('.crypt-lord-domain-console__dialog');
    state.body = mask.querySelector('[data-domain-body]');
    mask.addEventListener('click', event => {
      if (event.target === mask || event.target?.dataset?.domainClose !== undefined) close();
    });
    dragHeader(mask.querySelector('header'));
    body.appendChild(mask);
    const events = host.tavernEvents();
    if (events?.CHAT_CHANGED) state.subscription = host.bindEvent(events.CHAT_CHANGED, () => { state.epoch += 1; close(); });
    return true;
  }
  function close() {
    state.epoch += 1;
    state.pendingPromotion = null;
    state.foundationDraft = null;
    state.verdict = null;
    state.peerVerdicts = Object.create(null);
    state.armory.forming = null;
    state.buildingPicks = Object.create(null);
    state.roomPicks = Object.create(null);
    if (modules[AUDIO_KEY]?.status()?.scope === 'war') modules[AUDIO_KEY].stop();
    if (state.mask) state.mask.dataset.open = 'false';
  }
  function renderSummary() {
    const domain = state.domain;
    const summary = element('section', 'crypt-lord-domain-console__summary');
    summary.append(
      metric('等级', domain.等级),
      metric('人口', domain.人口),
      metric('核心', `${domain.核心?.名称 || '未命名'} Lv${domainState.coreLevelOf(domain)}`),
      metric('总兵力', domainState.totalTroops(domain)),
    );
    state.body.appendChild(summary);
    const overview = element('p', 'crypt-lord-domain-console__overview', domainState.buildFactionOverview(domain) || '暂无领地概述');
    state.body.appendChild(overview);
  }
  function renderBuildings() {
    const section = element('section', 'crypt-lord-domain-console__section');
    section.appendChild(element('h3', '', '建筑与施工'));
    const defs = domainState.buildingDefs(state.domain);
    const relations = state.data?.stat_data?.人物关系列表 || {};
    const stewards = Object.keys(relations).filter(name => name !== '$meta' && record(relations[name]) && record(state.data?.npc_data?.[name]));
    section.appendChild(element('p', 'crypt-lord-domain-console__muted',
      `可用人口 ${domainState.population(state.domain) - domainState.usedLabor(state.domain)}/${domainState.population(state.domain)} · 金镑 ${state.data?.stat_data?.货币?.鲁恩王国?.金镑 ?? '钱包不可用'} · 取消施工与拆除均不退款`));
    domainState.SLOT_KEYS.forEach(key => {
      const slot = state.domain.格子[key];
      const row = element('article', 'crypt-lord-domain-console__row');
      const title = element('strong', '', `${key} · ${slot.建筑 ? domainState.buildingLabel(domainState.buildingOf(state.domain, slot.建筑), state.domain.线路) || slot.建筑 : '空地'}`);
      const meta = element('span', 'crypt-lord-domain-console__muted',
        slot.施工动作 ? `${slot.施工动作} 施工中 · 剩余 ${formatDuration(slot.完工时刻 - currentTime())}` :
          `Lv${slot.等级} · ${slot.开工 ? '生产中' : '停工'} · 用工 ${domainState.slotLabor(slot, state.domain.等级)} · 周产 ${formatGoods(domainState.recipeOf(state.domain, slot))}`);
      const actions = element('div', 'crypt-lord-domain-console__row-actions');
      if (!slot.施工动作) {
        if (slot.等级 > 0) {
          actions.append(button(slot.开工 ? '停工' : '复工', 'crypt-lord-domain-console__button', () => {
            void domainAction(domain => domainState.toggleBuilding(domain, key), '建筑状态已更新');
          }));
          if (slot.总管) {
            actions.append(element('span', 'crypt-lord-domain-console__muted', `总管 ${slot.总管}`));
            actions.append(button('撤总管', 'crypt-lord-domain-console__button', () => {
              void domainAction(domain => domainState.clearSteward(domain, key), '总管已撤任');
            }));
          } else if (stewards.length) {
            const picker = select('总管', '', [{ label: '选择人物', value: '' }, ...stewards.map(name => ({ label: name, value: name }))],
              value => { state.buildingPicks[`${key}:steward`] = value; });
            actions.append(picker, button('任命', 'crypt-lord-domain-console__button', () => {
              void domainAction(domain => domainState.assignSteward(domain, key, state.buildingPicks[`${key}:steward`]), '总管已任命');
            }));
          }
          actions.append(button('拆除', 'crypt-lord-domain-console__button', () => {
            if (!view().confirm?.('拆除不退还金镑与物资，确定拆除？')) return;
            void domainAction(domain => domainState.demolishBuilding(domain, key), '建筑已拆除');
          }));
        } else {
          const options = [{ label: '选择建筑', value: '' }].concat(defs.map(item => ({
            label: domainState.buildingLabel(item, state.domain.线路), value: item.id,
          })));
          actions.append(select('建筑', state.buildingPicks[key] || '', options, value => {
            state.buildingPicks[key] = value; render();
          }));
        }
        const id = slot.等级 ? slot.建筑 : state.buildingPicks[key];
        if (id && domainState.actionForSlot(slot)) {
          const cost = domainState.costOf(state.domain, slot, id);
          const fast = domainState.costOf(state.domain, slot, id, { fast: true });
          const costNote = element('p', 'crypt-lord-domain-console__cost',
            `${cost.action} · 物资 ${formatGoods(cost.扣货)} · 普通 ${cost.金镑} 金镑 / ${formatDuration(cost.工期)} · 超凡 ${fast.金镑} 金镑 / ${formatDuration(fast.工期)}`);
          row.append(title, meta, costNote);
          for (const [label, quick] of [['普通施工', false], ['超凡施工', true]]) {
            actions.append(button(label, `crypt-lord-domain-console__button${quick ? '' : ' is-primary'}`, () => {
              if (quick && !view().confirm?.(`使用超凡建筑队，花费 ${fast.金镑} 金镑，确定？`)) return;
              void domainAction((domain, data) =>
                domainState.beginConstruction(domain, data, key, id, currentTime(), { fast: quick }), '施工已开始');
            }));
          }
        }
      } else {
        actions.append(button('取消施工', 'crypt-lord-domain-console__button', () => {
          if (!view().confirm?.('取消施工不退金镑与物资，确定？')) return;
          void domainAction(domain => domainState.cancelConstruction(domain, key), '施工已取消');
        }));
      }
      if (!title.parentNode) row.append(title, meta);
      row.append(actions);
      section.appendChild(row);
    });
    state.body.appendChild(section);
  }
  function renderRooms() {
    const section = element('section', 'crypt-lord-domain-console__section');
    section.appendChild(element('h3', '', `核心与客房 · ${state.domain.核心?.名称 || '核心'}`));
    const actions = element('div', 'crypt-lord-domain-console__toolbar');
    if (state.domain.核心?.施工动作) {
      section.appendChild(element('p', 'crypt-lord-domain-console__muted',
        `扩建 ${state.domain.核心.施工动作} · 剩余 ${formatDuration(state.domain.核心.完工时刻 - currentTime())}`));
      actions.append(button('取消扩建', 'crypt-lord-domain-console__button', () => {
        if (!view().confirm?.('取消扩建不退金镑，确定？')) return;
        void domainAction(domain => domainState.cancelCoreUpgrade(domain), '扩建已取消');
      }));
    } else {
      const cost = domainState.coreUpgradeCost(state.domain);
      if (cost.ok) {
        const fast = domainState.coreUpgradeCost(state.domain, { fast: true });
        section.appendChild(element('p', 'crypt-lord-domain-console__muted',
          `扩建 ${cost.action} · 不扣物资 · 普通 ${cost.金镑} 金镑 / ${formatDuration(cost.工期)} · 超凡 ${fast.金镑} 金镑 / ${formatDuration(fast.工期)}`));
        for (const [label, quick] of [['普通扩建', false], ['超凡扩建', true]]) {
          actions.append(button(label, `crypt-lord-domain-console__button${quick ? '' : ' is-primary'}`, () => {
            if (quick && !view().confirm?.(`超凡扩建需 ${fast.金镑} 金镑，确定？`)) return;
            void domainAction((domain, data) =>
              domainState.beginCoreUpgrade(domain, data, currentTime(), { fast: quick }), '核心扩建已开始');
          }));
        }
      } else section.appendChild(element('p', 'crypt-lord-domain-console__muted', cost.reason));
    }
    section.appendChild(actions);
    const relations = state.data?.stat_data?.人物关系列表 || {};
    const rooms = domainState.roomsOf(state.domain);
    const room0 = rooms.房0;
    section.appendChild(element('p', 'crypt-lord-domain-console__muted',
      `客房 ${domainState.listGuestRoomKeys(state.domain).length} 间 · 不占建筑格与用工 · 有效住客每 7 天好感 +5，常住与短住相同`));
    function roomNameField(key, room) {
      const field = input('房名', room.名称 || key, () => {});
      const row = element('div', 'crypt-lord-domain-console__room-name');
      row.append(field, button('改名', 'crypt-lord-domain-console__button', () => {
        const name = field.querySelector('input').value;
        void domainAction(domain => domainState.renameRoom(domain, key, name), '房间已改名');
      }));
      return row;
    }
    const lordRow = element('article', 'crypt-lord-domain-console__row crypt-lord-domain-console__room');
    lordRow.append(element('strong', '', '房0 · 领主房'), element('span', 'crypt-lord-domain-console__muted', '固定入住 · 不计客房好感'),
      roomNameField('房0', room0));
    section.appendChild(lordRow);
    const occupied = new Set(domainState.listGuestRoomKeys(state.domain)
      .map(key => String(rooms[key]?.住客 || '').trim()).filter(Boolean));
    const candidates = Object.keys(relations)
      .filter(name => name !== '$meta' && record(relations[name])).sort((a, b) => a.localeCompare(b, 'zh'));
    domainState.listGuestRoomKeys(state.domain).forEach(key => {
      const room = rooms[key];
      const guest = String(room.住客 || '').trim();
      const row = element('article', 'crypt-lord-domain-console__row crypt-lord-domain-console__room');
      row.append(element('strong', '', `${key} · ${room.名称 || key}`),
        element('span', 'crypt-lord-domain-console__muted',
          guest ? `${guest}${record(relations[guest]) ? '' : '（关系失效）'}${record(state.data?.npc_data?.[guest]) ? '' : '（不在 NPC 池）'} · ${room.常住 ? '常住' : '短住'}` : '空置'),
        roomNameField(key, room));
      const controls = element('div', 'crypt-lord-domain-console__row-actions');
      if (guest) {
        controls.append(button(room.常住 ? '改为短住' : '改为常住', 'crypt-lord-domain-console__button', () => {
          void domainAction(domain => domainState.toggleRoomResident(domain, key), '住客状态已更新');
        }), button('解除预留', 'crypt-lord-domain-console__button', () => {
          void domainAction(domain => domainState.clearRoom(domain, key), '客房已解除预留');
        }));
      } else {
        const available = candidates.filter(name => !occupied.has(name));
        controls.append(select('住客', state.roomPicks[key] || '',
          [{ label: '选择人物', value: '' }, ...available.map(name => ({ label: name, value: name }))],
          value => { state.roomPicks[key] = value; }),
        button('预留', 'crypt-lord-domain-console__button is-primary', () => {
          void domainAction((domain, data) =>
            domainState.assignRoom(domain, key, state.roomPicks[key], data.stat_data?.人物关系列表), '客房已预留');
        }));
      }
      row.appendChild(controls);
      section.appendChild(row);
    });
    state.body.appendChild(section);
  }
  function renderTraining() {
    const section = element('section', 'crypt-lord-domain-console__section');
    section.appendChild(element('h3', '', '招募与训练'));
    const armory = state.armory;
    const troops = domainState.troopsOfBranch(armory.branch);
    if (!troops.some(item => item.id === armory.troop)) armory.troop = troops[0]?.id || '';
    const troop = domainState.findTroop(armory.troop);
    const form = element('div', 'crypt-lord-domain-console__toolbar');
    form.append(
      select('军种', armory.branch, domainState.BRANCHES, value => {
        armory.branch = value; armory.troop = ''; render();
      }),
      select('兵种', armory.troop, troops.map(item => ({
        value: item.id, label: `${item.名称 || item.id} · 精锐${item.精锐}`,
      })), value => { armory.troop = value; render(); }),
      input('数量', armory.quantity, value => { armory.quantity = value; render(); }, 'number'),
      button('招募', 'crypt-lord-domain-console__button is-primary', () => {
        void armoryAction((domain, data) => domainState.recruit(domain, data, armory.troop, armory.quantity, currentTime()),
          '招募已进入训练队列');
      }),
    );
    section.appendChild(form);
    if (troop) {
      const cost = domainState.recruitGold(troop.精锐, armory.quantity);
      const gold = state.data?.stat_data?.货币?.鲁恩王国?.金镑;
      const scale = domainState.eliteScale(troop.精锐);
      section.appendChild(element('p', 'crypt-lord-domain-console__muted',
        `单兵属性：生命 ${Math.round(number(troop.生命) * scale)} · 攻击 ${Math.round(number(troop.攻击) * scale)}${troop.护盾 ? ` · 护盾 ${Math.round(number(troop.护盾) * scale)}` : ''} · 射程 ${troop.射程 ?? 1} · 防御 ${troop.防御 ?? 0} · 速度 ${troop.速度 ?? 50} · 暴击 ${troop.暴击率 ?? 0}% · 闪避 ${troop.闪避 ?? 0} · PP ${troop.maxPP ?? 100} · 技能 ${troop.技能 || 'HEAVY_STRIKE'}`));
      section.appendChild(element('p', 'crypt-lord-domain-console__muted',
        `金镑 ${gold ?? '钱包不可用'} · 花费 ${Number.isFinite(cost) ? cost : '数量无效'} · 工期 ${Math.round(domainState.trainMinutes(troop.精锐) / 1440)} 天（与人数无关） · 单兵周维持 ${formatGoods(domainState.unitUpkeep(troop.精锐))}`));
    } else section.appendChild(element('p', 'crypt-lord-domain-console__muted', '当前军种没有可招募兵种。'));
    state.domain.训练队列.forEach(order => {
      const row = element('div', 'crypt-lord-domain-console__row');
      row.append(
        element('span', '', `${domainState.stackDisplayName(order)} · 精锐${order.精锐等级} ×${order.数量} · 完工 ${order.完工时刻}`),
        button('取消训练', 'crypt-lord-domain-console__button', () => {
          if (!view().confirm?.('取消训练不退还金镑，确定取消？')) return;
          void armoryAction(domain => domainState.cancelTraining(domain, order.id)
            ? { ok: true } : { ok: false, reason: '训练订单已不存在' }, '训练已取消');
        }),
      );
      section.appendChild(row);
    });
    section.appendChild(element('p', 'crypt-lord-domain-console__muted', '招募即扣金镑。训练中的部队不吃维持，也不能编成；取消不退款。'));
    state.body.appendChild(section);
  }
  function formatGoods(goods) {
    return Object.entries(goods || {}).map(([key, value]) => `${key} ×${value}`).join('、') || '无';
  }
  function formatDuration(minutes) {
    const total = Math.max(0, Math.ceil(number(minutes)));
    return `${Math.floor(total / 1440)} 天 ${Math.floor(total % 1440 / 60)} 小时`;
  }
  async function domainAction(change, success, operation = '领地') {
    if (state.busy) return false;
    const epoch = state.epoch;
    if (JSON.stringify(state.domain) !== state.baseline &&
      !view().confirm?.('领地面板还有未保存修改。本次操作会一并保存这些修改，确定继续？')) return false;
    state.busy = true;
    render();
    try {
      const next = clone(state.data);
      const domain = domainState.ensureDomain(next.stat_data?.领地);
      const result = change(domain, next);
      if (!result?.ok) throw new Error(result?.reason || '操作未完成');
      if (!record(next.stat_data.势力)) next.stat_data.势力 = {};
      domainState.syncProjection(next);
      await commitDomainData(next, epoch);
      notify(success, 'success');
      return true;
    } catch (error) {
      if (epoch === state.epoch) notify(`${operation}操作失败：${error?.message || error}`, 'error');
      return false;
    } finally {
      state.busy = false;
      if (epoch === state.epoch) render();
    }
  }
  function armoryAction(change, success) { return domainAction(change, success, '军备'); }
  function renderGarrison() {
    const section = element('section', 'crypt-lord-domain-console__section');
    const headerRow = element('div', 'crypt-lord-domain-console__row');
    headerRow.append(
      element('h3', '', '军备与编成'),
      select('战场', state.armory.field, ['陆战', '海战'], value => { state.armory.field = value; render(); }),
      button('沙盘军演', 'crypt-lord-domain-console__button is-primary', () => {
        const ids = domainState.deployListOf(state.domain);
        if (!ids.length || ids.some(id =>
          !domainState.canDeploy(state.domain, domainState.findArmy(state.domain, id), state.armory.field).ok)) {
          notify('请先选择当前战场可出战的军队', 'warning');
          return;
        }
        const drill = domainState.runDrill(state.domain, ids);
        modules['cryptLord.warReplayUi']?.open(drill.result, { title: '沙盘军演' });
        notify(drill.summary || ('沙盘军演演练完毕：' + (drill.winner === 'A' ? '我军获胜' : '假想敌获胜')), 'info');
        render();
      })
    );
    const controls = modules['cryptLord.gameAudioControl'];
    if (controls) headerRow.appendChild(controls.create(document(), 'war'));
    section.appendChild(headerRow);
    const zeroed = domainState.zeroedOf(state.domain);
    section.appendChild(element('p', 'crypt-lord-domain-console__muted',
      `本地兵力 ${domainState.totalTroops(state.domain)} · 出战 ${domainState.deployListOf(state.domain).length}/${domainState.maxDeploy()} · 周维持 ${formatGoods(domainState.upkeepGoods(state.domain))}`));
    if (zeroed.length) section.appendChild(element('p', 'crypt-lord-domain-console__verdict',
      `物资欠账：${formatGoods(Object.fromEntries(domainState.shortageKeys(state.domain).map(key => [key, state.domain.物资库[key]])))}；精锐 ${zeroed.join('/')} 级属性归零，补货前不可出战。`));
    const loose = domainState.listAvailableLoose(state.domain, state.data);
    section.appendChild(element('h3', '', `散兵池 · ${loose.length} 组`));
    loose.forEach(stack => {
      const row = element('div', 'crypt-lord-domain-console__row');
      const faction = domainState.isFactionStack(stack);
      const key = domainState.looseKey(stack);
      row.append(
        element('span', '', `${domainState.stackDisplayName(stack)} · ${faction ? `势力「${stack.势力名 || stack.势力键}」` : stack.军种} · 精锐${stack.精锐等级} ×${stack.数量}${!faction && zeroed.includes(Number(stack.精锐等级)) ? ' · 属性归零' : ''}`),
        button('遣散', 'crypt-lord-domain-console__button', () => {
          const raw = view().prompt?.(`遣散人数（当前 ${stack.数量}，不退金镑）`, String(stack.数量));
          if (raw === null || raw === undefined) return;
          void armoryAction((domain, data) => domainState.dischargeLoose(domain, data, key, raw), '散兵已遣散');
        }),
      );
      section.appendChild(row);
    });
    if (!loose.length) section.appendChild(element('p', 'crypt-lord-domain-console__muted', '散兵池为空。'));
    section.appendChild(element('h3', '', `军队 · ${state.domain.驻军.军队.length} 支`));
    state.domain.驻军.军队.forEach(army => {
      const row = element('div', 'crypt-lord-domain-console__row');
      const check = domainState.canDeploy(state.domain, army, state.armory.field);
      const selected = domainState.deployListOf(state.domain).includes(army.id);
      const quality = domainState.armyQuality(army);
      row.append(element('strong', '', `${army.名称 || army.id} · ${army.军种} · ${armyCountLabel(army)}`),
        element('span', 'crypt-lord-domain-console__muted',
          `${domainState.armyStacks(army).map(stack => `${domainState.stackDisplayName(stack)} 精${stack.精锐等级}×${stack.数量}${domainState.isFactionStack(stack) ? '（势力）' : ''}`).join('、')} · 生命 ${domainState.armyHp(army)} · 攻击 ${domainState.armyAtk(army)} · 护盾 ${domainState.armyShield(army)} · 射程 ${quality.射程} · 防御 ${quality.防御} · 速度 ${quality.速度} · 暴击 ${quality.暴击率}% · 闪避 ${quality.闪避} · PP ${quality.maxPP} · 技能 ${quality.技能}`),
        button(selected ? '移出出战' : '加入出战', 'crypt-lord-domain-console__button', () => {
          void armoryAction(domain => domainState.toggleDeploy(domain, army.id, state.armory.field),
            selected ? '已移出出战名单' : '已加入出战名单');
        }),
        button('拆编', 'crypt-lord-domain-console__button', () => {
          void armoryAction((domain, data) => ({ ok: domainState.disbandArmy(domain, army.id, data) }), '已拆编，士兵回到可用池');
        }),
        button('遣散军队', 'crypt-lord-domain-console__button', () => {
          if (!view().confirm?.(`遣散「${army.名称 || army.id}」全部 ${domainState.armyCount(army)} 人？不退金镑，士兵不会回到散兵池。`)) return;
          void armoryAction(domain => ({ ok: domainState.dischargeArmy(domain, army.id) }), '军队已遣散');
        }));
      if (!check.ok) row.appendChild(element('span', 'crypt-lord-domain-console__verdict', check.reason));
      section.appendChild(row);
    });
    section.appendChild(button(state.armory.forming ? '收起编成' : '新建军队',
      'crypt-lord-domain-console__button', () => {
        state.armory.forming = state.armory.forming ? null :
          { branch: state.armory.branch, main: '', name: '', picks: Object.create(null) };
        render();
      }));
    if (state.armory.forming) renderFormation(section);
    section.appendChild(element('p', 'crypt-lord-domain-console__muted',
      '势力兵编成时从原势力数量转出，拆编时退回；势力兵不计入领地周维持。'));
    state.body.appendChild(section);
  }
  function armyCountLabel(army) { return `${domainState.armyCount(army)}人 · ${domainState.validateArmy(army).ok ? '编成有效' : '待整编'}`; }
  function renderFormation(section) {
    const draft = state.armory.forming;
    const pool = domainState.listAvailableLoose(state.domain, state.data, draft.branch);
    const mainOptions = [...new Set(pool.map(stack => stack.兵种))].map(id => ({
      value: id, label: domainState.findTroop(id)?.名称 || id,
    }));
    const form = element('div', 'crypt-lord-domain-console__formation');
    const nameField = input('军队名称', draft.name, value => { draft.name = value; });
    nameField.querySelector('input').addEventListener('input', event => { draft.name = event.target.value; });
    form.append(
      element('h3', '', '编成新军队'),
      select('军种', draft.branch, domainState.BRANCHES, value => {
        draft.branch = value; draft.main = ''; draft.picks = Object.create(null); render();
      }),
      select('主兵种', draft.main, [{ value: '', label: '请选择' }, ...mainOptions], value => { draft.main = value; render(); }),
      nameField,
    );
    pool.forEach(stack => {
      const key = domainState.looseKey(stack);
      const row = element('label', 'crypt-lord-domain-console__formation-pick');
      row.append(element('span', '', `${domainState.stackDisplayName(stack)} · ${domainState.isFactionStack(stack) ? `势力「${stack.势力名 || stack.势力键}」` : '本地'} · 精锐${stack.精锐等级} · 可用 ${stack.数量}`));
      const count = element('input');
      count.type = 'number'; count.min = '0'; count.max = String(stack.数量); count.step = '1';
      count.dataset.looseKey = key;
      count.value = String(draft.picks[key] || 0);
      count.setAttribute('aria-label', `编入 ${domainState.stackDisplayName(stack)} ${key}`);
      count.addEventListener('input', () => { draft.picks[key] = count.value; });
      count.addEventListener('change', () => { draft.picks[key] = count.value; render(); });
      row.appendChild(count);
      form.appendChild(row);
    });
    const picks = Object.entries(draft.picks).map(([looseKey, value]) => ({
      looseKey, 数量: Number(value),
    })).filter(item => item.数量 > 0);
    const stacks = picks.map(item => {
      const source = domainState.findAvailableLoose(state.domain, state.data, item.looseKey);
      return source && { ...source, 数量: item.数量 };
    }).filter(Boolean);
    const proposed = { 军种: draft.branch, 主兵种: draft.main, 编成: stacks };
    const validation = domainState.validateArmy(proposed);
    form.appendChild(element('p', validation.ok ? 'crypt-lord-domain-console__muted' : 'crypt-lord-domain-console__verdict',
      stacks.length ? `${domainState.armyCount(proposed)} 人 · 生命 ${domainState.armyHp(proposed)} · 攻击 ${domainState.armyAtk(proposed)} · 护盾 ${domainState.armyShield(proposed)} · 主兵种生命占比 ${(domainState.mainTypeRatio(proposed) * 100).toFixed(1)}%${validation.ok ? '' : ` · ${validation.reason}`}` : '先从散兵池选兵，再选主兵种。'));
    form.appendChild(button('确认编成', 'crypt-lord-domain-console__button is-primary', () => {
      draft.name = nameField.querySelector('input').value;
      const selected = Array.from(form.querySelectorAll('input[data-loose-key]'))
        .map(control => ({ looseKey: control.dataset.looseKey, 数量: Number(control.value) }))
        .filter(item => item.数量 > 0);
      void armoryAction((domain, data) => domainState.formArmy(domain, draft.name.trim(),
        draft.branch, draft.main, selected, data), '军队编成完成').then(saved => {
        if (saved && state.armory.forming === draft) state.armory.forming = null;
        render();
      });
    }));
    section.appendChild(form);
  }
  function renderPeers() {
    const section = element('section', 'crypt-lord-domain-console__section');
    section.appendChild(element('h3', '', '邻境与晋升'));
    const peers = domainState.peersOf(state.domain);
    const campaign = state.data?.cryptLord?.domainCampaign;
    peers.forEach(peer => {
      const row = element('div', 'crypt-lord-domain-console__row');
      row.append(element('span', '', `${peer.名称 || peer.id} · ${peer.状态 || '存续'}`));
      if (campaign?.peerId === peer.id) {
        row.appendChild(button('继续战役', 'crypt-lord-domain-console__button is-primary', () => {
          void Promise.resolve(modules['cryptLord.domainCampaignUi']?.open(state.targetId, peer.id)).catch(error =>
            notify(`打开战役失败：${error?.message || error}`, 'error'));
        }));
      } else if (peer.状态 !== '已吞并' && !campaign) {
        row.append(
          button('出兵讨伐', 'crypt-lord-domain-console__button is-primary', () => {
            const field = peer.战场 || '陆战';
            const ids = domainState.deployListOf(state.domain);
            if (!ids.length || ids.some(id =>
              !domainState.canDeploy(state.domain, domainState.findArmy(state.domain, id), field).ok)) {
              notify(`请先在军备中选择能上${field}的出战军队`, 'warning');
              return;
            }
            if (JSON.stringify(state.domain) !== state.baseline &&
              !view().confirm?.('领地面板还有未保存的修改。进入战役会重新读取当前楼层，确定放弃这些修改？')) return;
            void Promise.resolve(modules['cryptLord.domainCampaignUi']?.open(state.targetId, peer.id)).catch(error =>
              notify(`打开战役失败：${error?.message || error}`, 'error'));
          }),
          button('正文结盟', 'crypt-lord-domain-console__button', () => { void recognizePeer(peer.id, '正文结盟'); }),
          button('正文吞并', 'crypt-lord-domain-console__button', () => { void recognizePeer(peer.id, '正文吞并'); })
        );
      }
      section.appendChild(row);
      for (const mode of ['正文结盟', '正文吞并']) {
        const verdict = state.peerVerdicts[`${peer.id}|${mode}`];
        if (verdict) section.appendChild(element('p', 'crypt-lord-domain-console__verdict',
          `${peer.名称 || peer.id} · ${mode}未通过：${verdict.reason}`));
      }
    });
    if (!peers.length) section.appendChild(element('p', 'crypt-lord-domain-console__muted', '当前等级没有载入邻境名单。'));
    const promote = domainState.canPromote(state.domain);
    section.appendChild(element('p', 'crypt-lord-domain-console__muted', promote ? '本层邻境已完成，可以准备晋升。' : '完成当前等级全部邻境后才可晋升。'));
    if (promote) section.appendChild(button('晋升领地', 'crypt-lord-domain-console__button is-primary', () => {
      void beginPromotion();
    }));
    state.body.appendChild(section);
  }
  async function commitDomainData(next, epoch) {
    const store = await contract.waitGlobalInitialized(STORE_KEY, { timeoutMs: 10000 });
    const latest = await store.findLatestAssistant();
    const target = await store.readMessage(state.targetId);
    if (epoch !== state.epoch || state.mask?.dataset.open !== 'true' ||
      latest?.message_id !== state.targetId || target?.role !== 'assistant' ||
      JSON.stringify(target.data || {}) !== state.dataBaseline)
      throw new Error('当前楼层或变量已变化，请重新读取');
    const before = clone(target.data || {});
    await store.writeAssistantData(state.targetId, next);
    state.data = next;
    refreshDomain();
    state.dataBaseline = JSON.stringify(next);
    state.baseline = JSON.stringify(state.domain);
    root.__stage1Modules?.['cryptLord.variableWorkbench']?.notifyUpdate?.({
      messageId: state.targetId, beforeData: before, afterData: next, source: KEY,
    });
  }
  function renderFoundationIntent() {
    const section = element('section', 'crypt-lord-domain-console__promotion');
    section.appendChild(element('h3', '', '待建领地'));
    section.appendChild(element('p', 'crypt-lord-domain-console__muted', '先在正文中取得领地，再用当前聊天的原生剧情验收。'));
    section.append(
      input('目标地点', state.intentDraft.地点, value => { state.intentDraft.地点 = value; }),
      select('线路', state.intentDraft.线路, [
        { label: '乡村线', value: '乡村' }, { label: '市内线', value: '市内' },
      ], value => { state.intentDraft.线路 = value; }),
    );
    const saved = state.domain.待建目标 || {};
    if (saved.地点) section.appendChild(element('p', 'crypt-lord-domain-console__muted', `已保存：${saved.地点} · ${saved.线路}线`));
    if (state.verdict) section.appendChild(element('p',
      state.verdict.ok ? 'crypt-lord-domain-console__verdict is-success' : 'crypt-lord-domain-console__verdict',
      `${state.verdict.ok ? '验收通过' : '验收未通过'}：${state.verdict.reason}`));
    const actions = element('div', 'crypt-lord-domain-console__promotion-actions');
    actions.append(
      button('保存目标', 'crypt-lord-domain-console__button', () => { void saveFoundationIntent(); }),
      button(state.busy ? '验收中…' : '验收正文', 'crypt-lord-domain-console__button is-primary', () => { void verifyFoundation(); }),
    );
    section.appendChild(actions);
    state.body.appendChild(section);
  }
  function renderFoundationForm() {
    const draft = state.foundationDraft;
    const section = element('section', 'crypt-lord-domain-console__promotion');
    section.appendChild(element('h3', '', '建立领地'));
    section.appendChild(element('p', 'crypt-lord-domain-console__muted',
      `验收通过：${draft.地点}（${draft.线路}线）。选择开局等级与农、工、服各一栋。`));
    const levels = domainState.foundationLevels();
    section.appendChild(select('开局等级', draft.等级, levels.map(level => ({
      label: `${level} 级 · ${domainState.ladderName(draft.线路, level)}`, value: level,
    })), value => {
      draft.等级 = Number(value);
      draft.建筑 = { 农产品: '', 工业品: '', 服务: '' };
      render();
    }));
    const missed = domainState.missedFoundationSpoils(draft.等级);
    section.appendChild(element('p', 'crypt-lord-domain-console__muted',
      missed.length ? `跳级将错过：${missed.join('、')}` : '从 1 级开始可逐层取得邻境战利品。'));
    section.appendChild(input('领地名', draft.名称, value => { draft.名称 = value; }));
    const defs = domainState.buildingDefs({ ...state.domain, 等级: draft.等级, 线路: draft.线路 });
    for (const type of ['农产品', '工业品', '服务']) {
      section.appendChild(select(`${type}（必选）`, draft.建筑[type], [
        { label: '-- 请选择 --', value: '' },
        ...defs.filter(item => item.主产出 === type).map(item => ({
          label: domainState.buildingLabel(item, draft.线路), value: item.id,
        })),
      ], value => { draft.建筑[type] = value; }));
    }
    const actions = element('div', 'crypt-lord-domain-console__promotion-actions');
    actions.append(
      button('稍后建立', 'crypt-lord-domain-console__button', () => {
        state.foundationDraft = null;
        render();
      }),
      button('建立领地', 'crypt-lord-domain-console__button is-primary', () => { void createFoundation(); }),
    );
    section.appendChild(actions);
    state.body.appendChild(section);
  }
  async function saveFoundationIntent() {
    if (state.busy) return;
    const epoch = state.epoch;
    state.busy = true;
    try {
      const next = clone(state.data);
      const domain = domainState.ensureDomain(next.stat_data?.领地 || {});
      const result = domainState.setFoundationTarget(domain, state.intentDraft.地点, state.intentDraft.线路);
      if (!result.ok) throw new Error(result.reason);
      next.stat_data.领地 = domain;
      await commitDomainData(next, epoch);
      state.verdict = null;
      state.foundationDraft = null;
      notify('待建目标已保存到当前楼层', 'success');
    } catch (error) { notify(`保存目标失败：${error?.message || error}`, 'error'); }
    finally { state.busy = false; if (epoch === state.epoch) render(); }
  }
  async function verifyFoundation() {
    if (state.busy) return;
    const epoch = state.epoch;
    state.busy = true;
    state.verdict = null;
    render();
    try {
      const target = state.domain.待建目标 || {};
      if (!target.地点 || target.地点 !== state.intentDraft.地点 || target.线路 !== state.intentDraft.线路)
        throw new Error('请先保存目标地点和线路');
      const store = await contract.waitGlobalInitialized(STORE_KEY, { timeoutMs: 10000 });
      const latest = await store.findLatestAssistant();
      if (latest?.message_id !== state.targetId) throw new Error('只能在最新 assistant 楼层验收');
      const hostApi = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
      const messages = await hostApi.getChatMessages('0-{{lastMessageId}}');
      const evidence = foundation.evidence(messages, state.targetId);
      const verdict = await foundation.verify(target.地点, messages, state.targetId);
      const current = await store.readMessage(state.targetId);
      const recent = await hostApi.getChatMessages('0-{{lastMessageId}}');
      const nowLatest = await store.findLatestAssistant();
      if (epoch !== state.epoch || state.mask?.dataset.open !== 'true' ||
        nowLatest?.message_id !== state.targetId || current?.role !== 'assistant' ||
        JSON.stringify(current.data || {}) !== state.dataBaseline ||
        foundation.evidence(recent, state.targetId) !== evidence)
        throw new Error('验收期间楼层或正文已变化，请重新读取');
      state.verdict = verdict;
      if (verdict.ok) {
        state.foundationDraft = {
          地点: target.地点, 线路: target.线路, 等级: domainState.foundationLevels()[0] || 1,
          名称: '', 建筑: { 农产品: '', 工业品: '', 服务: '' }, evidence,
        };
      }
    } catch (error) { if (epoch === state.epoch) notify(`领地验收失败：${error?.message || error}`, 'error'); }
    finally { state.busy = false; if (epoch === state.epoch) render(); }
  }
  async function createFoundation() {
    if (state.busy || !state.foundationDraft) return;
    const draft = state.foundationDraft;
    const ids = ['农产品', '工业品', '服务'].map(type => draft.建筑[type]);
    const next = clone(state.data);
    const domain = domainState.ensureDomain(next.stat_data?.领地 || {});
    const result = domainState.foundDomain(domain, { 等级: draft.等级, 名称: draft.名称, 建筑: ids });
    if (!result.ok) { notify(result.reason, 'warning'); return; }
    if (!view().confirm?.(`在${draft.地点}建立「${result.name}」？所选开局等级为 ${draft.等级} 级，低等级邻境战利品将无法再取得。`)) return;
    const epoch = state.epoch;
    state.busy = true;
    try {
      const hostApi = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
      const messages = await hostApi.getChatMessages('0-{{lastMessageId}}');
      if (foundation.evidence(messages, state.targetId) !== draft.evidence) throw new Error('正文已变化，请重新验收');
      next.stat_data.领地 = domain;
      if (!record(next.stat_data.势力)) next.stat_data.势力 = {};
      domainState.syncProjection(next);
      await commitDomainData(next, epoch);
      state.foundationDraft = null;
      state.verdict = null;
      notify(`领地「${result.name}」已建立`, 'success');
    } catch (error) { if (epoch === state.epoch) notify(`建立领地失败：${error?.message || error}`, 'error'); }
    finally { state.busy = false; if (epoch === state.epoch) render(); }
  }
  async function recognizePeer(peerId, mode) {
    if (state.busy) return;
    const selected = domainState.findPeer(state.domain, peerId);
    if (!state.domain?.已建立 || !selected || selected.状态 === '已吞并' ||
      state.data?.cryptLord?.domainCampaign) {
      notify('邻境不可认定，请重新读取或先完成战役', 'warning');
      return;
    }
    let message = `确定对「${selected.名称 || selected.id}」发起${mode}认定？\n通过后立即增加人口并永久完成该邻境，不能撤销或再次攻击。`;
    if (selected.战利品?.名称)
      message += `\n特殊战利品「${selected.战利品.名称}」仅在首次战争胜利后发放，正文认定通过将无法获取。`;
    if (!view().confirm?.(message)) return;
    state.busy = true;
    let epoch = state.epoch;
    const verdictKey = `${peerId}|${mode}`;
    delete state.peerVerdicts[verdictKey];
    render();
    try {
      if (JSON.stringify(state.domain) !== state.baseline) {
        if (!view().confirm?.('领地面板有未保存的修改。重新读取楼层并放弃修改后继续认定？')) return;
        if (!await open(state.targetId)) return;
        epoch = state.epoch;
      }
      const peer = domainState.findPeer(state.domain, peerId);
      if (!peer || peer.状态 === '已吞并' || state.data?.cryptLord?.domainCampaign)
        throw new Error('邻境状态已经变化，请重新读取');
      const store = await contract.waitGlobalInitialized(STORE_KEY, { timeoutMs: 10000 });
      const latest = await store.findLatestAssistant();
      const target = await store.readMessage(state.targetId);
      if (epoch !== state.epoch || latest?.message_id !== state.targetId ||
        target?.role !== 'assistant' || JSON.stringify(target.data || {}) !== state.dataBaseline)
        throw new Error('当前楼层或变量已变化，请重新读取');
      const hostApi = await contract.waitGlobalInitialized('cryptLord.hostApi', { timeoutMs: 10000 });
      const messages = await hostApi.getChatMessages('0-{{lastMessageId}}');
      const evidence = foundation.evidence(messages, state.targetId);
      const verdict = await recognition.verify(state.domain, peerId, mode, messages, state.targetId);
      const current = await store.readMessage(state.targetId);
      const recent = await hostApi.getChatMessages('0-{{lastMessageId}}');
      const nowLatest = await store.findLatestAssistant();
      if (epoch !== state.epoch || state.mask?.dataset.open !== 'true' ||
        nowLatest?.message_id !== state.targetId || current?.role !== 'assistant' ||
        JSON.stringify(current.data || {}) !== state.dataBaseline ||
        foundation.evidence(recent, state.targetId) !== evidence)
        throw new Error('认定期间正文或变量已变化，请重新读取');
      if (!verdict.ok) {
        state.peerVerdicts[verdictKey] = verdict;
        notify(`${mode}未通过：${verdict.reason}`, 'warning');
        return;
      }
      const next = clone(state.data);
      const domain = domainState.ensureDomain(next.stat_data?.领地);
      const result = domainState.settlePeerRecognition(domain, peerId, mode, verdict.reason);
      if (!result.ok) throw new Error(result.reason);
      if (!record(next.stat_data.势力)) next.stat_data.势力 = {};
      domainState.syncProjection(next);
      await commitDomainData(next, epoch);
      notify(`${mode}通过：${result.peerName}，人口 +${result.popGain}${result.canPromote ? '；本层可晋升' : ''}`, 'success');
    } catch (error) {
      if (epoch === state.epoch) notify(`${mode}认定失败：${error?.message || error}`, 'error');
    } finally {
      state.busy = false;
      if (epoch === state.epoch) render();
    }
  }
  async function beginPromotion() {
    if (state.busy) return;
    state.busy = true;
    let epoch = state.epoch;
    try {
      if (state.data?.cryptLord?.domainCampaign) throw new Error('请先完成进行中的领地战役');
      if (JSON.stringify(state.domain) !== state.baseline) {
        if (!view().confirm?.('当前领地面板有未保存的改动。重新读取楼层并放弃这些改动？')) return;
        if (!await open(state.targetId)) return;
        epoch = state.epoch;
      }
      const store = await contract.waitGlobalInitialized(STORE_KEY, { timeoutMs: 10000 });
      const latest = await store.findLatestAssistant();
      const target = await store.readMessage(state.targetId);
      if (epoch !== state.epoch || latest?.message_id !== state.targetId || target?.role !== 'assistant' ||
        JSON.stringify(target.data || {}) !== state.dataBaseline)
        throw new Error('当前楼层已变化，请重新读取后再晋升');
      if (!domainState.canPromote(state.domain)) throw new Error('尚未满足晋升条件');
      const count = domainState.promoteGiftCount(state.domain);
      const nextLevel = Number(state.domain.等级) + 1;
      if (!view().confirm?.(`晋升到 ${nextLevel} 级？建筑将清空并重选 ${count} 栋；人口按新阶重算，物资与军队保留。`)) return;
      if (epoch !== state.epoch) return;
      state.pendingPromotion = { count, nextLevel, forced: { 农产品: '', 工业品: '', 服务: '' }, free: Array(Math.max(0, count - 3)).fill('') };
      render();
    } catch (error) {
      notify(`准备晋升失败：${error?.message || error}`, 'error');
    } finally {
      state.busy = false;
    }
  }
  function renderPromotion() {
    const pending = state.pendingPromotion;
    const section = element('section', 'crypt-lord-domain-console__promotion');
    section.appendChild(element('h3', '', `晋升至 ${pending.nextLevel} 级 · 选择初始建筑`));
    section.appendChild(element('p', 'crypt-lord-domain-console__muted',
      `共选 ${pending.count} 栋：农、工、服各一栋，另选 ${pending.free.length} 栋。晋升后旧建筑清空，物资、驻军与现有客房保留。`));
    const defs = domainState.buildingDefs({ ...state.domain, 等级: pending.nextLevel });
    function picker(label, options, current, onChange) {
      const field = element('label', 'crypt-lord-domain-console__promotion-field');
      field.appendChild(element('span', '', label));
      const input = element('select');
      const placeholder = element('option', '', '-- 请选择 --');
      placeholder.value = '';
      input.appendChild(placeholder);
      for (const def of options) {
        const option = element('option', '', `${def.名称 || def.id} · ${def.主产出}`);
        option.value = def.id;
        input.appendChild(option);
      }
      input.value = current;
      input.addEventListener('change', () => onChange(input.value));
      field.appendChild(input);
      section.appendChild(field);
    }
    for (const type of ['农产品', '工业品', '服务']) {
      picker(`${type}（必选）`, defs.filter(def => def.主产出 === type), pending.forced[type],
        value => { pending.forced[type] = value; });
    }
    pending.free.forEach((id, index) => picker(`自由建筑 ${index + 1}`, defs, id,
      value => { pending.free[index] = value; }));
    const actions = element('div', 'crypt-lord-domain-console__promotion-actions');
    actions.append(
      button('取消', 'crypt-lord-domain-console__button', () => { state.pendingPromotion = null; render(); }),
      button('确认晋升', 'crypt-lord-domain-console__button is-primary', () => { void confirmPromotion(); }),
    );
    section.appendChild(actions);
    state.body.appendChild(section);
  }
  async function confirmPromotion() {
    if (state.busy || !state.pendingPromotion) return;
    const pending = state.pendingPromotion;
    const ids = [...Object.values(pending.forced), ...pending.free];
    if (ids.length !== pending.count || ids.some(id => !id)) {
      notify('请为农、工、服及全部自由建筑选满名额', 'warning');
      return;
    }
    if (!view().confirm?.(`确定以所选 ${ids.length} 栋建筑晋升吗？此操作会重置旧建筑与人口。`)) return;
    const epoch = state.epoch;
    state.busy = true;
    try {
      const store = await contract.waitGlobalInitialized(STORE_KEY, { timeoutMs: 10000 });
      const latest = await store.findLatestAssistant();
      const target = await store.readMessage(state.targetId);
      if (epoch !== state.epoch || latest?.message_id !== state.targetId || target?.role !== 'assistant' ||
        JSON.stringify(target.data || {}) !== state.dataBaseline)
        throw new Error('当前楼层变量已变化，请重新读取后再晋升');
      const before = clone(target.data || {});
      const next = clone(before);
      const domain = domainState.ensureDomain(next.stat_data?.领地);
      if (!domain || domain.等级 + 1 !== pending.nextLevel) throw new Error('晋升目标已变化');
      const result = domainState.promote(domain, ids);
      if (!result.ok) throw new Error(result.reason);
      domainState.syncProjection(next);
      if (epoch !== state.epoch) throw new Error('窗口已关闭，晋升取消');
      await store.writeAssistantData(state.targetId, next);
      state.data = next;
      state.domain = domain;
      state.baseline = JSON.stringify(domain);
      state.dataBaseline = JSON.stringify(next);
      state.pendingPromotion = null;
      root.__stage1Modules?.['cryptLord.variableWorkbench']?.notifyUpdate?.({
        messageId: state.targetId, beforeData: before, afterData: next, source: KEY,
      });
      notify(`领地已晋升至 ${result.level} 级，获赠 ${result.giftCount} 栋建筑`, 'success');
    } catch (error) {
      notify(`晋升失败：${error?.message || error}`, 'error');
    } finally {
      state.busy = false;
      if (epoch === state.epoch) render();
    }
  }
  function renderAffairs() {
    const affairState = root.__stage1Modules?.['cryptLord.affairState'] || window.cryptLord?.affairState;
    if (!affairState) return;
    const section = element('section', 'crypt-lord-domain-console__section');
    const affairs = affairState.affairsOf(state.domain);
    const todos = affairs?.待办 || [];
    const bar = element('div', 'crypt-lord-domain-console__row');
    bar.append(
      element('h3', '', `事务评定 (${todos.length} 项待办)`),
      button('进入事务评定', 'crypt-lord-domain-console__button is-primary', () => {
        if (JSON.stringify(state.domain) !== state.baseline &&
          !view().confirm?.('领地面板还有未保存的修改。进入事务评定会重新读取当前楼层，确定放弃这些修改？')) return;
        void Promise.resolve(modules['cryptLord.domainAffairsUi']?.open(state.targetId)).catch(error =>
          notify(`打开事务评定失败：${error?.message || error}`, 'error'));
      })
    );
    section.appendChild(bar);
    if (!todos.length) {
      section.appendChild(element('p', 'crypt-lord-domain-console__muted', '当前没有待办事务。'));
    } else {
      todos.forEach(todo => {
        const row = element('div', 'crypt-lord-domain-console__row');
        row.append(
          element('span', '', `[${todo.类型 || '事务'}] ${todo.标题 || todo.id} · ${todo.状态 || '待指派'} · ${todo.处理者 || '未指派'}`)
        );
        section.appendChild(row);
      });
    }
    state.body.appendChild(section);
  }
  function render() {
    if (!state.body || state.mask?.dataset.open !== 'true') return;
    const scrollTop = state.body.scrollTop;
    refreshDomain();
    state.dialog.querySelector('[data-domain-title]').textContent = `${state.domain.领地名 || '独立领地'} · 楼层 #${state.targetId}`;
    state.dialog.querySelector('[data-domain-subtitle]').textContent = state.domain.已建立
      ? '领地经营、驻军与邻境' : '当前楼层尚未建立领地';
    state.body.replaceChildren();
    if (!state.domain.已建立) {
      if (state.foundationDraft) renderFoundationForm();
      else renderFoundationIntent();
      state.dialog.querySelector('[data-domain-footer]').replaceChildren(
        button('重新读取', 'crypt-lord-domain-console__button', () => { void open(state.targetId); }));
      return;
    }
    if (state.pendingPromotion) {
      renderPromotion();
      state.dialog.querySelector('[data-domain-footer]').replaceChildren();
      return;
    }
    renderSummary();
    renderBuildings();
    renderRooms();
    renderTraining();
    renderGarrison();
    renderPeers();
    renderAffairs();
    const footer = state.dialog.querySelector('[data-domain-footer]');
    footer.replaceChildren(
      button('重新读取', 'crypt-lord-domain-console__button', () => { void open(state.targetId); }),
      button('保存到当前楼层', 'crypt-lord-domain-console__button is-primary', () => { void save(); }),
    );
    state.body.scrollTop = scrollTop;
  }
  async function save() {
    if (state.busy) return;
    const epoch = state.epoch;
    state.busy = true;
    try {
      const store = await contract.waitGlobalInitialized(STORE_KEY, { timeoutMs: 10000 });
      const latest = await store.findLatestAssistant();
      const target = await store.readMessage(state.targetId);
      if (epoch !== state.epoch || latest?.message_id !== state.targetId ||
        target?.role !== 'assistant' || JSON.stringify(target.data || {}) !== state.dataBaseline)
        throw new Error('聊天楼层或变量已变化，请重新读取。');
      const before = clone(target.data || {});
      const next = clone(state.data || {});
      const current = next.stat_data?.领地;
      if (JSON.stringify(current) !== JSON.stringify(state.data.stat_data.领地) && !current) throw new Error('领地数据校验失败。');
      await store.writeAssistantData(state.targetId, next);
      state.data = next;
      state.baseline = JSON.stringify(next.stat_data.领地);
      state.dataBaseline = JSON.stringify(next);
      root.__stage1Modules?.['cryptLord.variableWorkbench']?.notifyUpdate?.({ messageId: state.targetId, beforeData: before, afterData: next, source: KEY });
      notify('领地数据已保存到真实 assistant 楼层。', 'success');
    } catch (error) {
      notify(`保存失败：${error?.message || error}`, 'error');
    } finally { state.busy = false; }
  }
  async function open(messageId) {
    if (!mount()) return false;
    const epoch = ++state.epoch;
    const store = await contract.waitGlobalInitialized(STORE_KEY, { timeoutMs: 10000 });
    const target = await store.readMessage(messageId);
    if (epoch !== state.epoch) return false;
    if (target?.role !== 'assistant') throw new Error('请先选择一条真实 assistant 楼层。');
    state.targetId = target.message_id;
    state.data = clone(target.data || {});
    state.dataBaseline = JSON.stringify(target.data || {});
    state.data.stat_data = record(state.data.stat_data) ? state.data.stat_data : {};
    refreshDomain();
    state.baseline = JSON.stringify(state.domain);
    state.pendingPromotion = null;
    state.intentDraft = { ...state.domain.待建目标 };
    state.foundationDraft = null;
    state.verdict = null;
    state.peerVerdicts = Object.create(null);
    state.armory.forming = null;
    state.buildingPicks = Object.create(null);
    state.roomPicks = Object.create(null);
    state.dialog.querySelector('[data-domain-title]').textContent = `${state.domain.领地名 || '独立领地'} · 楼层 #${state.targetId}`;
    state.dialog.querySelector('[data-domain-subtitle]').textContent = state.domain.已建立 ? '领地经营、驻军与邻境' : '当前楼层尚未建立领地';
    state.mask.dataset.open = 'true';
    void modules[AUDIO_KEY]?.preload();
    render();
    return true;
  }
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: Boolean(state.mask), open: state.mask?.dataset.open === 'true', targetId: state.targetId }); },
    mount, open, close,
    dispose() { state.disposed = true; if (modules[AUDIO_KEY]?.status()?.scope === 'war') modules[AUDIO_KEY].stop(); state.subscription?.stop?.(); state.mask?.remove(); state.mask = null; try { contract.releaseGlobal(KEY, api); } catch { /* Loader may already have released this global. */ } if (modules[KEY] === api) delete modules[KEY]; return true; },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
  mount();
})();
