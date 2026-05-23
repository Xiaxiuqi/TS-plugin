# ACU Visualizer 内存优化基线记录 - 2026-05-17

本文件用于记录内存优化实施前的测试版基线。当前阶段只建立测量记录，不修改业务运行逻辑。

## 1. 当前版本与入口

| 项目         | 值                                                                   |
| ------------ | -------------------------------------------------------------------- |
| 测量日期     | 2026-05-17                                                           |
| 测量对象     | ACU Visualizer 测试版单文件产物                                      |
| 源码目录     | `src/acu_visualizer_test/`                                           |
| 发布产物     | `public/acu_visualizer_test/index.js`                                |
| 推荐加载方式 | `import('https://ts-plugin.pages.dev/acu_visualizer_test/index.js')` |
| 构建命令     | `pnpm build:entry --env entry=src/acu_visualizer_test/index.js`      |
| 当前功能状态 | 用户已确认加载、CSS、通知、行排序、删除行、搜索均正常                |

## 2. 浏览器控制台基线采集脚本

在开始任何内存优化代码修改前，先在酒馆页面加载测试版后运行以下脚本。

```js
(() => {
  const rootWindow = window.parent && window.parent !== window ? window.parent : window;
  const rootDocument = rootWindow.document || document;
  const style = rootDocument.querySelector('#acu-visualizer-test-style-loader');

  const storageKeys = [
    'acu_table_order',
    'acu_table_expanded',
    'acu_night_mode',
    'acu_active_tab',
    'acu_table_inner_scroll_position_v2',
    'acu_ui_config_v8_1',
    'acu_data_snapshot_v8_5',
    'acu_pagination_state_v2',
    'acu_tab_status_v8_1',
    'acu_cell_history_v8_8',
    'acu_cleanup_settings_v8_9',
  ];

  const storageReport = {};
  let acuStorageTotal = 0;
  for (const key of Object.keys(rootWindow.localStorage)) {
    if (!key.startsWith('acu_')) continue;
    const value = rootWindow.localStorage.getItem(key) || '';
    const bytes = new Blob([value]).size;
    acuStorageTotal += bytes;
    if (storageKeys.includes(key) || key.startsWith('acu_row_position_mapping_')) {
      storageReport[key] = { chars: value.length, bytes };
    }
  }

  const tableSections = [...rootDocument.querySelectorAll('.acu-table-section')];
  const rowCounts = tableSections.map(section => ({
    id: section.id,
    tableName: rootDocument.querySelector(`.acu-tab-btn[data-table-id="${section.id.replace(/^acu-table-/, '')}"]`)?.dataset?.tableName || section.id,
    rows: section.querySelectorAll('.data-table tbody tr').length,
    cols: section.querySelectorAll('.data-table thead th').length,
    active: section.classList.contains('active'),
  }));

  const report = {
    measuredAt: new Date().toISOString(),
    location: rootWindow.location.href,
    hasACU: !!rootWindow.ACUVisualizerTest,
    version: rootWindow.ACUVisualizerTest?.version,
    hasStyle: !!style,
    styleLength: style?.textContent?.length || 0,
    styleSource: style?.dataset?.source || null,
    dom: {
      tableContainer: rootDocument.querySelectorAll('.acu-table-container').length,
      tableSections: rootDocument.querySelectorAll('.acu-table-section').length,
      tableRows: rootDocument.querySelectorAll('.data-table tbody tr').length,
      editableCells: rootDocument.querySelectorAll('.acu-editable-cell').length,
      notifications: rootDocument.querySelectorAll('.acu-notification').length,
      cellMenus: rootDocument.querySelectorAll('.acu-cell-menu').length,
      editOverlays: rootDocument.querySelectorAll('.acu-edit-overlay').length,
      settingsOverlays: rootDocument.querySelectorAll('.acu-settings-overlay').length,
      shortcutOverlays: rootDocument.querySelectorAll('.acu-shortcut-lite-overlay').length,
      markNodes: rootDocument.querySelectorAll('mark.acu-search-match-text').length,
    },
    tables: {
      count: rowCounts.length,
      maxRows: Math.max(0, ...rowCounts.map(item => item.rows)),
      maxCols: Math.max(0, ...rowCounts.map(item => item.cols)),
      active: rowCounts.find(item => item.active) || null,
      details: rowCounts,
    },
    storage: {
      acuStorageTotalBytes: acuStorageTotal,
      keys: storageReport,
    },
    runtimeState: rootWindow.ACUVisualizerTest?.deps ? {
      hasDeps: true,
      pendingDeletesSize: rootWindow.ACUVisualizerTest.deps.pendingDeletes?.size ?? null,
      currentUserEditMapSize: rootWindow.ACUVisualizerTest.deps.currentUserEditMap?.size ?? null,
      rowPositionMappingTables: rootWindow.ACUVisualizerTest.deps.rowPositionMapping ? Object.keys(rootWindow.ACUVisualizerTest.deps.rowPositionMapping).length : null,
    } : { hasDeps: false },
    performanceMemory: performance.memory ? {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
    } : null,
  };

  console.log('[ACU MEMORY BASELINE]', report);
  return report;
})();
```

## 3. 手工记录区

将控制台输出粘贴或摘要填写到这里。

| 指标                                | 基线值 | 备注                                       |
| ----------------------------------- | ------ | ------------------------------------------ |
| 表格数量                            | 待测   |                                            |
| 最大行数                            | 待测   |                                            |
| 最大列数                            | 待测   |                                            |
| `.acu-table-container` 数量         | 待测   | 应为 1                                     |
| `.acu-table-section` 数量           | 待测   |                                            |
| `.acu-editable-cell` 数量           | 待测   |                                            |
| 样式节点数量                        | 待测   | `#acu-visualizer-test-style-loader` 应为 1 |
| 样式文本长度                        | 待测   | 约 100KB+                                  |
| ACU localStorage 总字节             | 待测   |                                            |
| 快照 key 字节                       | 待测   | `acu_data_snapshot_v8_5`                   |
| 历史 key 字节                       | 待测   | `acu_cell_history_v8_8`                    |
| `performance.memory.usedJSHeapSize` | 待测   | Chrome 可用                                |

## 4. DevTools 手工 Heap Snapshot 场景

| 场景                           | 是否完成 | 结果摘要 |
| ------------------------------ | -------- | -------- |
| 首次加载后 Heap Snapshot       | 待测     |          |
| 连续刷新 10 次后 Heap Snapshot | 待测     |          |
| 设置弹窗打开关闭 10 次         | 待测     |          |
| 编辑弹窗打开关闭 10 次         | 待测     |          |
| 搜索/清空 10 次                | 待测     |          |
| 行排序开关 + 拖动 10 次        | 待测     |          |
| 删除/恢复行 10 次              | 待测     |          |

## 5. L0 结论

当前文件是优化前基线记录模板。后续 L1/L2/L3 每个阶段完成后，都应使用同一脚本重新采集，并与本文件结果对照。
