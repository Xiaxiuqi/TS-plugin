// ACU Visualizer 测试版搜索模块
// 来源：public/acu_visualizer/acu_visualizer-test.js 中搜索栏状态、过滤、mark 高亮和事件绑定逻辑。
// 迁移原则：保留原 class、按钮图标切换、Enter 搜索、清空恢复和 mark class，不夹带优化。

import { getCore } from '../core/bridge.js';
import { state } from '../core/state.js';

export function getSearchTerm(searchState = state.search) {
  return searchState.currentSearchTerm || '';
}

export function setSearchTerm(term, searchState = state.search) {
  searchState.currentSearchTerm = term || '';
  return searchState.currentSearchTerm;
}

export function setSearchVisible(visible, flags = state.flags) {
  flags.isSearchVisible = !!visible;
  return flags.isSearchVisible;
}

export function filterRowDisplayIndices(
  tableData,
  tableName,
  { getOriginalRowIndex, searchTerm = getSearchTerm() } = {},
) {
  const filteredIndices = [];
  const totalRows = tableData?.rows?.length || 0;
  for (let i = 0; i < totalRows; i++) filteredIndices.push(i);

  if (!searchTerm) return filteredIndices;
  const term = searchTerm.toLowerCase();
  return filteredIndices.filter(displayIndex => {
    const originalIndex =
      typeof getOriginalRowIndex === 'function' ? getOriginalRowIndex(tableName, displayIndex) : displayIndex;
    const row = tableData.rows[originalIndex];
    return row.some((cell, idx) => {
      if (idx === 0) return false;
      return String(cell || '')
        .toLowerCase()
        .includes(term);
    });
  });
}

export function countFilteredRows(tableData, searchTerm = getSearchTerm()) {
  const rowCount = tableData?.rows ? tableData.rows.length : 0;
  if (!searchTerm) return rowCount;
  const term = searchTerm.toLowerCase();
  return tableData.rows.filter(row =>
    row.some(
      (cell, idx) =>
        idx > 0 &&
        String(cell || '')
          .toLowerCase()
          .includes(term),
    ),
  ).length;
}

export function highlightSearchMatches(content, searchTerm = getSearchTerm()) {
  let formattedContent = String(content || '').replace(/\n/g, '<br>');
  if (searchTerm && searchTerm.trim() !== '') {
    try {
      const term = searchTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${term})`, 'gi');
      formattedContent = formattedContent
        .split(/(<br>)/gi)
        .map(part => {
          if (part.toLowerCase() === '<br>') return part;
          return part.replace(regex, '<mark class="acu-search-match-text">$1</mark>');
        })
        .join('');
    } catch (reErr) {
      console.warn('[ACU] 高亮正则生成失败:', reErr);
    }
  }
  return formattedContent;
}

export function generateSearchToolbarHTML({
  isSearchVisible = state.flags.isSearchVisible,
  currentSearchTerm = getSearchTerm(),
} = {}) {
  return `
                            <div class="acu-search-toolbar" style="display:flex !important; flex-direction:row !important; flex-wrap:nowrap !important; align-items:center !important; gap:5px !important; margin-left:auto !important;">
                                <div class="acu-search-input-box" style="display:${isSearchVisible ? 'flex' : 'none'}; align-items:center; background:none !important; border:none !important; border-bottom:1px solid var(--acu-primary, #5c9dff) !important; padding:0 4px; height:20px;">
                                    <input type="text" class="acu-search-field-input" placeholder="搜索..." value="${currentSearchTerm}" style="background:transparent !important; border:none !important; outline:none !important; color:var(--acu-text) !important; font-size:11px !important; width:100px !important; padding:0 !important; margin:0 !important;">
                                    <i class="fas fa-times acu-search-clear-btn" style="font-size:10px; cursor:pointer; opacity:0.4; margin-left:8px; margin-right:12px; ${currentSearchTerm ? '' : 'display:none;'}"></i>
                                    <i class="fas fa-search acu-search-execute-btn" title="点击搜索" style="color:var(--acu-primary); font-size:12px; cursor:pointer; opacity:0.6;"></i>
                                </div>
                                <i class="fas ${isSearchVisible ? 'fa-times' : 'fa-search'} acu-search-toggle-trigger"
                                   title="${isSearchVisible ? '取消并收起' : '展开搜索'}"
                                   style="color:var(--acu-primary); font-size:14px; cursor:pointer; opacity:0.6; padding:4px;"></i>
                            </div>`;
}

export function bindSearchEvents(
  $section,
  { updateTableContentOnly, core = getCore(), flags = state.flags, searchState = state.search } = {},
) {
  const { $ } = core;
  const $searchInput = $section.find('.acu-search-field-input');
  const $searchBox = $section.find('.acu-search-input-box');
  const $toggleBtn = $section.find('.acu-search-toggle-trigger');
  const $clearBtn = $section.find('.acu-search-clear-btn');
  const $execBtn = $section.find('.acu-search-execute-btn');

  $toggleBtn.off('click.acu').on('click.acu', function () {
    flags.isSearchVisible = !flags.isSearchVisible;
    const $icon = $(this);
    if (flags.isSearchVisible) {
      $searchBox.css('display', 'flex');
      $icon.removeClass('fa-search').addClass('fa-times');
      $icon.attr('title', '取消并收起');
      $searchInput.focus();
    } else {
      $searchBox.css('display', 'none');
      $icon.removeClass('fa-times').addClass('fa-search');
      $icon.attr('title', '展开搜索');
      if (searchState.currentSearchTerm) {
        searchState.currentSearchTerm = '';
        $searchInput.val('');
        $clearBtn.hide();
        updateTableContentOnly?.();
      }
    }
  });

  $execBtn.off('click.acu').on('click.acu', function () {
    searchState.currentSearchTerm = $searchInput.val().trim();
    updateTableContentOnly?.();
  });

  $searchInput.off('keydown.acu').on('keydown.acu', function (e) {
    if (e.key === 'Enter') {
      searchState.currentSearchTerm = $(this).val().trim();
      updateTableContentOnly?.();
    }
  });

  $clearBtn.off('click.acu').on('click.acu', function () {
    $searchInput.val('');
    searchState.currentSearchTerm = '';
    $(this).hide();
    updateTableContentOnly?.();
  });

  $searchInput.on('input.acu', function () {
    if ($(this).val()) $clearBtn.show();
    else $clearBtn.hide();
  });
}
