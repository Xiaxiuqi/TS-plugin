/**
 * 技能面板模块
 *
 * 完整迁移自原 src/ci_island_test/index.ts:5108-5755
 * 包含：renderSkillsPanel + renderCharacterSkillsView + renderAllSkillsView
 *      + createSkillCard + showSkillDetail + openSkillEditModal
 *      + saveSkillData + handleUseSkill
 */
import { ICONS } from '../../core/icons';
import { state } from '../../core/state';
import { isSystemColumn, extractCoreName } from '../../core/utils';
import { showToast } from '../../ui/toast';
import { getApi, saveTableUpdates } from '../../data/api';
import { processData } from '../../data/processor';

declare const $: any;

export type SkillsViewMode = 'character' | 'skill';

export interface SkillsPanelCallbacks {
  showSkillDetail?: (skill: any, event: any) => void;
  openSkillEditModal?: (skill: any) => void;
  /** 用于保存技能后刷新所有打开的面板 */
  updateOpenPanels?: () => void;
  /** 获取主角名 */
  getProtagonistName?: () => string;
  /** 根据角色获取代词 */
  getPronounByChar?: (char: any) => string;
  /** 获取在场角色集合 */
  getPresentCharacterList?: () => Set<string>;
}

let callbacks: SkillsPanelCallbacks = {};

export function setSkillsPanelCallbacks(cb: SkillsPanelCallbacks): void {
  callbacks = { ...callbacks, ...cb };
}

/**
 * 渲染技能面板入口
 */
export function renderSkillsPanel(
  $container: any,
  viewMode: SkillsViewMode = 'character',
): void {
  $container.empty();

  const allSkills = state.cachedData.allSkills || [];
  const allChars = [...state.cachedData.main, ...state.cachedData.side];

  if (allSkills.length === 0) {
    $container.html(`
      <div class="ci-inv-empty" style="flex-direction: column; gap: 10px;">
        <div style="opacity: 0.3; transform: scale(1.5);">${ICONS.tool}</div>
        <div style="opacity: 0.6; font-size: 14px;">暂无技能数据</div>
      </div>
    `);
    return;
  }

  // 视图切换标签
  const $viewTabs = $(`
    <div class="ci-inv-view-tabs">
      <div class="ci-inv-tab ${viewMode === 'character' ? 'active' : ''}" data-view="character">
        角色视图
      </div>
      <div class="ci-inv-tab ${viewMode === 'skill' ? 'active' : ''}" data-view="skill">
        技能视图
      </div>
    </div>
  `);

  $viewTabs.find('.ci-inv-tab').on('click', function (this: any, e: any) {
    e.stopPropagation();
    const view = $(this).data('view');
    renderSkillsPanel($container, view);
  });

  $container.append($viewTabs);

  const $content = $('<div class="ci-inv-content"></div>');

  if (viewMode === 'character') {
    renderCharacterSkillsView($content, allSkills, allChars);
  } else {
    renderAllSkillsView($content, allSkills);
  }

  $container.append($content);
}

/**
 * 角色视图：按拥有者分组
 */
function renderCharacterSkillsView($container: any, allSkills: any[], _allChars: any[]): void {
  const protagonistName = callbacks.getProtagonistName ? callbacks.getProtagonistName() : '';
  // 注：此处保留主角核心名计算以与原版逻辑一致
  void extractCoreName(protagonistName);

  const getNormalizedKey = (raw: string): string => {
    if (!raw) return '无归属';
    const parts = raw
      .split(/[,，;；/／]/)
      .map(s => s.trim())
      .filter(s => s);
    const cores = parts.map(p => extractCoreName(p));
    return Array.from(new Set(cores)).sort().join(';');
  };

  const skillsByOwner: Record<string, any[]> = {};
  const noOwnerSkills: any[] = [];

  allSkills.forEach((skill: any) => {
    if (skill.owner && skill.owner.trim()) {
      const key = getNormalizedKey(skill.owner);
      if (!skillsByOwner[key]) skillsByOwner[key] = [];
      skillsByOwner[key].push(skill);
    } else {
      noOwnerSkills.push(skill);
    }
  });

  const $charAreas = $('<div class="ci-inv-char-areas ci-inv-content"></div>');

  Object.keys(skillsByOwner).forEach(ownerName => {
    const skills = skillsByOwner[ownerName];
    const displayName = ownerName.split(';').join('、');

    const $charBox = $(`
      <div class="ci-inv-char-box" data-owner="${ownerName}">
        <div class="ci-inv-char-header">
          <span class="ci-inv-char-name">${displayName}</span>
          <span class="ci-inv-char-count">${skills.length}个</span>
        </div>
        <div class="ci-inv-char-items"></div>
        <div class="ci-inv-char-nav">
          <span class="ci-inv-nav-prev">◀</span>
          <span class="ci-inv-nav-dots"></span>
          <span class="ci-inv-nav-next">▶</span>
        </div>
      </div>
    `);

    const $itemsContainer = $charBox.find('.ci-inv-char-items');
    const itemsPerPage = 15;
    const totalPages = Math.ceil(skills.length / itemsPerPage);
    let currentPage = 0;

    const renderPage = (page: number) => {
      $itemsContainer.empty();
      skills.slice(page * itemsPerPage, (page + 1) * itemsPerPage).forEach(skill => {
        $itemsContainer.append(createSkillCard(skill));
      });

      const $dots = $charBox.find('.ci-inv-nav-dots').empty();
      for (let i = 0; i < totalPages; i++) {
        $dots.append(`<span class="ci-inv-dot ${i === page ? 'active' : ''}" data-page="${i}"></span>`);
      }
    };

    renderPage(0);

    $charBox.find('.ci-inv-nav-prev').on('click', (e: any) => {
      e.stopPropagation();
      if (currentPage > 0) {
        currentPage--;
        renderPage(currentPage);
      }
    });
    $charBox.find('.ci-inv-nav-next').on('click', (e: any) => {
      e.stopPropagation();
      if (currentPage < totalPages - 1) {
        currentPage++;
        renderPage(currentPage);
      }
    });
    $charBox.on('click', '.ci-inv-dot', function (this: any, e: any) {
      e.stopPropagation();
      currentPage = $(this).data('page');
      renderPage(currentPage);
    });

    $charAreas.append($charBox);
  });

  if (noOwnerSkills.length > 0) {
    const $noOwnerBox = $(`
      <div class="ci-inv-char-box no-owner">
        <div class="ci-inv-char-header">
          <span class="ci-inv-char-name">通用技能</span>
          <span class="ci-inv-char-count">${noOwnerSkills.length}个</span>
        </div>
        <div class="ci-inv-char-items"></div>
      </div>
    `);
    noOwnerSkills.forEach(skill => $noOwnerBox.find('.ci-inv-char-items').append(createSkillCard(skill)));
    $charAreas.append($noOwnerBox);
  }

  $container.append($charAreas);
}

/**
 * 技能视图：按分类分组
 */
function renderAllSkillsView($container: any, allSkills: any[]): void {
  const categoryMap: Record<string, any[]> = { 全部: [] };
  const normalizeCat = (s: string): string => s.trim();

  allSkills.forEach((skill: any) => {
    categoryMap['全部'].push(skill);
    const rawType = skill.type || '其他';
    const parts = rawType.split(/[,，;；/／]/);
    let hasValidCat = false;

    parts.forEach((part: string) => {
      const cat = normalizeCat(part);
      if (!cat) return;
      hasValidCat = true;
      if (!categoryMap[cat]) categoryMap[cat] = [];
      if (!categoryMap[cat].includes(skill)) categoryMap[cat].push(skill);
    });

    if (!hasValidCat) {
      if (!categoryMap['其他']) categoryMap['其他'] = [];
      categoryMap['其他'].push(skill);
    }
  });

  $container.empty();

  const $categoryTabs = $('<div class="ci-inv-category-tabs"></div>');
  const sortedCats = Object.keys(categoryMap).sort((a, b) => {
    if (a === '全部') return -1;
    if (b === '全部') return 1;
    if (a === '其他') return 1;
    if (b === '其他') return -1;
    return categoryMap[b].length - categoryMap[a].length;
  });

  sortedCats.forEach((cat, i) => {
    const $tab = $('<span class="ci-inv-cat-tab"></span>');
    if (i === 0) $tab.addClass('active');
    $tab.data('cat', cat);
    $tab.append(document.createTextNode(cat + ' '));
    $tab.append($('<span class="count"></span>').text(`(${categoryMap[cat].length})`));
    $categoryTabs.append($tab);
  });

  const $skillsGrid = $('<div class="ci-inv-items-grid"></div>');

  const showCategory = (cat: string) => {
    $skillsGrid.empty();
    const skills = categoryMap[cat] || [];
    if (skills.length === 0) {
      $skillsGrid.html('<div class="ci-inv-empty-tip">该分类下没有技能</div>');
      return;
    }
    skills.forEach(skill => $skillsGrid.append(createSkillCard(skill)));
  };

  if (sortedCats.length > 0) showCategory(sortedCats[0]);

  $categoryTabs.on('click', '.ci-inv-cat-tab', function (this: any, e: any) {
    e.stopPropagation();
    const $this = $(this);
    if ($this.hasClass('active')) return;

    $this.siblings('.ci-inv-cat-tab').removeClass('active');
    $this.addClass('active');

    showCategory($this.data('cat'));
  });

  $container.append($categoryTabs).append($skillsGrid);
}

/**
 * 创建技能卡
 */
function createSkillCard(skill: any): any {
  const icon = ICONS.tool;

  const $card = $(`
    <div class="ci-inv-item-card ${state.isEditing ? 'ci-editing' : ''}" data-skill-name="${skill.name}">
      <div class="ci-inv-item-icon">${icon}</div>
      <div class="ci-inv-item-name">${skill.name}</div>
      <div class="ci-inv-item-count" style="background:transparent; color:#999; font-size:10px;">${skill.type || ''}</div>
      ${state.isEditing ? `<div class="ci-edit-overlay-small" style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(76,175,80,0.2); border:2px solid #4caf50; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#2e7d32; font-size:16px; pointer-events:none;">${ICONS.edit}</div>` : ''}
    </div>
  `);

  $card.on('click', function (e: any) {
    e.stopPropagation();

    if (state.isEditing) {
      openSkillEditModal(skill);
      return;
    }

    showSkillDetail(skill, e);
  });

  return $card;
}

/**
 * 显示技能详情弹窗
 */
export function showSkillDetail(skill: any, event: any): void {
  $('.ci-item-card-popup').remove();

  const isPassive = (skill.type || '').includes('被动');
  const showUseBtn = !isPassive;

  const $card = $(`
    <div class="ci-item-card-popup" style="
      position: fixed; z-index: 2147483647; width: 280px; background: #fff;
      border: 1px solid var(--ci-border); border-radius: 8px;
      box-shadow: 0 5px 25px rgba(0,0,0,0.4); display: flex; flex-direction: column;
      overflow: hidden; opacity: 0;
    ">
      <div class="ci-item-popup-header">
        <div class="ci-item-popup-icon">${ICONS.tool}</div>
        <div class="ci-item-popup-title-group">
          <div class="ci-item-popup-name">${skill.name}</div>
          <div class="ci-item-popup-type">${skill.type || '技能'}</div>
        </div>
        <div class="ci-item-popup-close">${ICONS.close}</div>
      </div>
      <div class="ci-item-popup-body">
        <div class="ci-item-popup-desc" style="white-space: pre-wrap;">${skill.desc || '暂无描述'}</div>
        <div class="ci-item-popup-details">
          ${Object.entries(skill.details || {})
            .filter(([k]) => !['名称', '类型', '描述', '拥有人', '持有者', '角色名'].includes(k) && !isSystemColumn(k))
            .map(
              ([k, v]) => `
              <div class="ci-item-detail-row">
                <span class="ci-item-detail-label">${k}</span>
                <span class="ci-item-detail-val">${v}</span>
              </div>
            `,
            )
            .join('')}
        </div>
      </div>
      <div class="ci-item-popup-footer">
        <span>归属: ${skill.owner || '未知'}</span>
      </div>
      ${
        showUseBtn
          ? `
      <div class="ci-item-popup-actions" style="padding: 8px 16px; background: #f8f9fa; display: flex; justify-content: flex-end;">
         <button class="ci-item-use-btn">${ICONS.tool || '🛠️'} 使用</button>
      </div>`
          : ''
      }
    </div>
  `);

  if (showUseBtn) {
    $card.find('.ci-item-use-btn').on('click', function (e: any) {
      e.stopPropagation();
      handleUseSkill(skill);
      $card.remove();
    });
  }

  $('body').append($card);

  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const cardW = 280;
  const cardH = $card.outerHeight() || 300;

  let clientX = event.clientX;
  let clientY = event.clientY;
  if (event.touches && event.touches.length) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  }

  let l = clientX;
  let d = clientY;

  if (l + cardW > winW - 10) l = clientX - cardW;
  if (d + cardH > winH - 10) d = clientY - cardH;
  if (l < 10) l = 10;
  if (d < 10) d = 10;

  $card.css({ left: l + 'px', top: d + 'px', opacity: 1 });

  $card.find('.ci-item-popup-close').on('click', (e: any) => {
    e.stopPropagation();
    $card.remove();
  });
}

/**
 * 打开技能编辑弹窗
 */
export function openSkillEditModal(skill: any): void {
  $('.ci-skill-edit-overlay').remove();

  const editFields: string[] = [];

  editFields.push(`
    <div class="ci-input-group" style="margin-bottom:12px;">
      <label class="ci-input-label">技能名称</label>
      <input class="ci-input-field" data-field="name" value="${skill.name || ''}">
    </div>
  `);

  if (skill.type && skill.type.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group" style="margin-bottom:12px;">
        <label class="ci-input-label">类型/分类</label>
        <input class="ci-input-field" data-field="type" value="${skill.type || ''}">
      </div>
    `);
  }

  if (skill.owner && skill.owner.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group" style="margin-bottom:12px;">
        <label class="ci-input-label">归属/拥有者</label>
        <input class="ci-input-field" data-field="owner" value="${skill.owner || ''}">
      </div>
    `);
  }

  if (skill.desc && skill.desc.trim() !== '') {
    editFields.push(`
      <div class="ci-input-group" style="margin-bottom:12px;">
        <label class="ci-input-label">描述/效果</label>
        <textarea class="ci-input-field" data-field="desc" rows="3">${skill.desc || ''}</textarea>
      </div>
    `);
  }

  if (skill.details && Object.keys(skill.details).length > 0) {
    const excludeFields = [
      '名称', '技能名称', '技能名', 'Name',
      '类型', '技能类型', 'Type', '种类', 'Category',
      '描述', '效果', '说明', 'Desc',
      '拥有人', '持有者', '角色名', '姓名', '角色名称', 'Owner',
    ];

    Object.entries(skill.details).forEach(([key, value]) => {
      if (
        !excludeFields.includes(key) &&
        !isSystemColumn(key) &&
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ''
      ) {
        editFields.push(`
          <div class="ci-input-group" style="margin-bottom:12px;">
            <label class="ci-input-label">${key}</label>
            <textarea class="ci-input-field" data-field="detail-${key}" rows="2" placeholder="输入${key}">${value || ''}</textarea>
          </div>
        `);
      }
    });
  }

  const $overlay = $(`
    <div class="ci-skill-edit-overlay ci-edit-overlay">
      <div class="ci-item-edit-card ci-edit-card">
        <div class="ci-edit-header">
          <div class="ci-edit-avatar" style="background: var(--ci-accent); color: #fff; display:flex; align-items:center; justify-content:center;">${ICONS.tool}</div>
          <span class="ci-edit-title">编辑技能</span>
          <div class="ci-edit-close">${ICONS.close}</div>
        </div>
        <div class="ci-edit-body" style="padding: 16px; overflow-y:auto; flex:1;">
          ${editFields.join('')}
        </div>
        <div class="ci-edit-footer" style="padding:16px; border-top:1px solid #eee; display:flex; justify-content:flex-end;">
          <button class="ci-edit-save-btn">${ICONS.save} 提交修改</button>
        </div>
      </div>
    </div>
  `);

  $('body').append($overlay);

  $overlay.find('.ci-edit-close').on('click', () => $overlay.remove());
  $overlay.on('click', (e: any) => {
    if (e.target === $overlay[0]) $overlay.remove();
  });

  $overlay.find('.ci-edit-save-btn').on('click', async () => {
    const newData: any = {
      name: $overlay.find('[data-field="name"]').val(),
      type: $overlay.find('[data-field="type"]').val(),
      owner: $overlay.find('[data-field="owner"]').val(),
      desc: $overlay.find('[data-field="desc"]').val(),
      details: {},
    };

    $overlay.find('[data-field^="detail-"]').each(function (this: any) {
      const fieldName = $(this).data('field').replace('detail-', '');
      const fieldValue = $(this).val();
      if (fieldValue !== undefined && fieldValue !== null && String(fieldValue).trim() !== '') {
        newData.details[fieldName] = fieldValue;
      }
    });

    await saveSkillData(skill, newData);
    $overlay.remove();
  });
}

/**
 * 保存技能数据
 */
async function saveSkillData(originalSkill: any, newData: any): Promise<void> {
  const api = getApi();
  if (!api || !api.exportTableAsJson || !api.importTableAsJson) {
    showToast('无法连接到数据库API', 'error');
    return;
  }

  const fullData = api.exportTableAsJson();
  if (!fullData) {
    showToast('数据库返回为空', 'error');
    return;
  }

  if (!fullData.mate) {
    fullData.mate = { type: 'chatSheets', version: 1 };
  }

  const src = originalSkill._src;
  if (!src || !src.table) {
    showToast('技能源信息不完整', 'error');
    return;
  }

  let table: any = null;
  for (const key in fullData) {
    if (fullData[key] && fullData[key].name === src.table) {
      table = fullData[key];
      break;
    }
  }

  if (!table) {
    showToast('未找到对应的技能数据表', 'error');
    return;
  }

  let row: any = null;
  if (src.rowIdx && table.content[src.rowIdx]) {
    row = table.content[src.rowIdx];
  }

  if (!row) {
    showToast('未找到对应的技能数据行', 'error');
    return;
  }

  const h = table.content[0];
  const getColIdx = (ns: string[]) =>
    h.findIndex((x: string) => x && ns.some(n => x.toLowerCase().includes(n.toLowerCase())));

  const cols = {
    name: getColIdx(['技能名', '技能名称', '名称', 'Name']),
    type: getColIdx(['类型', '技能类型', 'Type', '种类', 'Category']),
    owner: getColIdx(['拥有人', '持有者', '角色名', '姓名', '角色名称', 'Owner']),
    desc: getColIdx(['描述', '效果', '说明', 'Desc']),
  };

  const rowData: Record<string, any> = {};
  const setField = (colIdx: number, val: any) => {
    if (colIdx > -1 && val !== undefined) {
      rowData[h[colIdx]] = val;
      row[colIdx] = val;
    }
  };
  setField(cols.name, newData.name);
  setField(cols.type, newData.type);
  setField(cols.owner, newData.owner);
  setField(cols.desc, newData.desc);

  if (newData.details && Object.keys(newData.details).length > 0) {
    Object.entries(newData.details).forEach(([fieldName, fieldValue]) => {
      const fieldColIdx = h.findIndex((header: any) => header === fieldName);
      if (
        fieldColIdx > -1 &&
        fieldColIdx !== cols.name &&
        fieldColIdx !== cols.type &&
        fieldColIdx !== cols.owner &&
        fieldColIdx !== cols.desc
      ) {
        row[fieldColIdx] = fieldValue;
        rowData[h[fieldColIdx]] = fieldValue;
      }
    });
  }

  const updates = Object.keys(rowData).length > 0
    ? [{ tableName: src.table, rowIndex: src.rowIdx, data: rowData }]
    : [];

  const ok = await saveTableUpdates(api, updates, fullData);
  if (ok) {
    showToast(`技能"${newData.name || originalSkill.name}"保存成功`, 'success');
    state.cachedData = processData(api.exportTableAsJson());
    if (callbacks.updateOpenPanels) callbacks.updateOpenPanels();
    $('.ci-edit-overlay').remove();
  } else {
    showToast('保存失败', 'error');
  }
}

/**
 * 处理使用技能：生成消息插入到输入框
 */
export function handleUseSkill(skill: any): void {
  const protagonistName = callbacks.getProtagonistName ? callbacks.getProtagonistName() : '';
  const pCore = extractCoreName(protagonistName);

  const owner = skill.owner || '';
  const ownerCore = extractCoreName(owner);

  let message = '';

  const isProtagonist = owner.includes('主角') || ownerCore === pCore || !owner;

  if (isProtagonist) {
    message = `${pCore}使用了${skill.name}。`;
  } else {
    const allChars = [...state.cachedData.main, ...state.cachedData.side, ...state.cachedData.retired];
    const ownerChar = allChars.find((c: any) => extractCoreName(c.name) === ownerCore);

    const pronoun = (ownerChar && callbacks.getPronounByChar)
      ? callbacks.getPronounByChar(ownerChar)
      : '他';
    const presentNames = callbacks.getPresentCharacterList
      ? callbacks.getPresentCharacterList()
      : new Set<string>();
    const isPresent = presentNames.has(ownerCore);

    if (isPresent) {
      message = `${pCore}和${ownerCore}商量了一下，让${pronoun}使用了${skill.name}。`;
    } else {
      const location = ownerChar && ownerChar.loc && ownerChar.loc !== '未知' ? ownerChar.loc : null;
      if (location) {
        message = `${pCore}去了${location}和${ownerCore}商量了一下，让${pronoun}使用了${skill.name}。`;
      } else {
        message = `${pCore}去找${ownerCore}商量了一下，让${pronoun}使用了${skill.name}。`;
      }
    }
  }

  const $textarea = $('#send_textarea', window.parent.document);
  if ($textarea.length) {
    const currentVal = ($textarea.val() as string) || '';
    const finalVal = currentVal ? currentVal + '\n' + message : message;
    $textarea.val(finalVal).trigger('input').trigger('change');
    try {
      const ctx = (window.parent as any).SillyTavern?.getContext?.();
      if (ctx) ctx.input = finalVal;
    } catch {
      // Ignore
    }
  }
  showToast('已生成技能使用描述');
}
