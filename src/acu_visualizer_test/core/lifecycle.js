// ACU Visualizer 测试版生命周期模块
// 来源：public/acu_visualizer/acu_visualizer-test.js 中 init()、initializeScript()、数据库回调注册和 AI 消息观察逻辑。
// 迁移原则：保留初始化延迟、数据库就绪检查、快照初始化和回调注册语义，不夹带优化。

import { generateDataHash } from '../modules/diff-highlighting.js';
import { getTableData } from '../modules/table-data.js';
import { getCore } from './bridge.js';
import {
  createSchedulerRegistry,
  observeAIMessages,
  retryUntilDatabaseReady,
  scheduleInitialize,
} from './scheduler.js';
import { state, UpdateController } from './state.js';
import { cleanupStorage, loadSnapshot, saveSnapshot } from './storage.js';

export function createLifecycle(deps = {}) {
  const registry = deps.schedulerRegistry || createSchedulerRegistry();

  const initializeScript = () => {
    const core = deps.core || getCore();
    const { $, getDB } = core;

    return retryUntilDatabaseReady({
      getDB,
      retryMs: 3000,
      onReady: api => {
        try {
          deps.insertTableAfterLatestAIMessage?.();
        } catch (err) {
          console.error('[ACU] insertTableAfterLatestAIMessage 出错:', err);
        }

        deps.showLoadSuccessNotification?.();

        if (!loadSnapshot()) {
          const current = api.exportTableAsJson();
          if (current) {
            saveSnapshot(current);
            state.hashes.lastTableDataHash = generateDataHash(current);
          }
        }

        if (api?.registerTableUpdateCallback) {
          api.registerTableUpdateCallback(() => {
            UpdateController.handleUpdate({
              smartUpdateTable: deps.smartUpdateTable,
              insertTableAfterLatestAIMessage: deps.insertTableAfterLatestAIMessage,
            });
          });
        }

        if (api?.registerTableFillStartCallback) {
          api.registerTableFillStartCallback(() => {
            state.currentUserEditMap.clear();
            const current = api.exportTableAsJson();
            if (current) saveSnapshot(current);
          });
        }

        registry.setTimeout(() => {
          const chatContainer = $('#chat, .chat-container').get?.(0) || document.body;
          const observer = observeAIMessages({
            $,
            root: chatContainer,
            onAIMessageAdded: () => deps.checkAndUpdateTablePosition?.(),
          });
          registry.addObserver(observer);
        }, 1000);

        state.flags.isInitialized = true;
      },
    });
  };

  return {
    async init() {
      if (state.flags.isInitialized) return;
      cleanupStorage(deps);
      if (typeof deps.addStyles === 'function') {
        await deps.addStyles();
      }
      state.scroll.currentTableScrollTop = deps.getInnerScrollPositionState?.() || 0;
      scheduleInitialize(initializeScript, 2000);
    },
    destroy() {
      registry.clearAll();
      state.flags.isInitialized = false;
      deps.core
        ?.$?.(
          '.acu-table-container, .acu-cell-menu, .acu-edit-overlay, .acu-settings-overlay, .acu-shortcut-lite-overlay',
        )
        ?.remove?.();
    },
    initializeScript,
  };
}

export function initAcuVisualizerTest(deps = {}) {
  const lifecycle = createLifecycle(deps);
  const { $ } = deps.core || getCore();
  if ($) {
    $(document).ready(() => lifecycle.init());
  } else {
    window.addEventListener('load', () => lifecycle.init());
  }
  return lifecycle;
}

export { getTableData };
