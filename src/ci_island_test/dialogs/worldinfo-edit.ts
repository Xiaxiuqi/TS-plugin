/**
 * 世界信息编辑入口弹窗（路由分发到各子区域）
 *
 * 完整实现见原 src/ci_island_test/_backup/index.original.ts:10875 (showWorldInfoEditOverlay)
 *
 * 三个子区域：
 *  - ticker  滚动新闻条
 *  - latest  最新信息区
 *  - forces  势力信息区
 *
 * 注：原 showWorldInfoTickerEdit / showWorldInfoLatestEdit / showWorldInfoForcesEdit
 *     是更深层的子弹窗，目前以 toast 占位（与原暂存方式一致），可后续按需迁移。
 *     单个势力 / 单个事件 编辑已由 force-edit / event-edit 模块完整覆盖。
 */
import { ICONS } from '../core';
import { showToast } from '../ui/toast';

declare const $: any;

/**
 * 显示世界信息编辑入口
 */
export function showWorldInfoEditOverlay(): void {
  const $overlay = $(`
    <div class="ci-worldinfo-edit-overlay ci-edit-overlay">
      <div class="ci-worldinfo-edit-card ci-edit-card" style="max-width: 800px; width: 90%;">
        <div class="ci-edit-header">
          <div class="ci-edit-avatar" style="background: var(--ci-accent); color: #fff; display:flex; align-items:center; justify-content:center;">${ICONS.world}</div>
          <span class="ci-edit-title">编辑世界信息</span>
          <div class="ci-edit-close">${ICONS.close}</div>
        </div>
        <div class="ci-edit-body" style="padding: 20px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 20px;">
            <div class="ci-worldinfo-edit-section" style="border: 2px solid rgba(76, 175, 80, 0.3); border-radius: 8px; padding: 12px; background: rgba(76, 175, 80, 0.05); cursor: pointer;" data-section="ticker">
              <div style="font-weight: 600; color: #4caf50; margin-bottom: 8px;">滚动新闻条</div>
              <div style="font-size: 12px; color: #666;">点击编辑滚动显示的新闻内容</div>
            </div>

            <div class="ci-worldinfo-edit-section" style="border: 2px solid rgba(33, 150, 243, 0.3); border-radius: 8px; padding: 12px; background: rgba(33, 150, 243, 0.05); cursor: pointer;" data-section="latest">
              <div style="font-weight: 600; color: #2196f3; margin-bottom: 8px;">最新信息区</div>
              <div style="font-size: 12px; color: #666;">点击编辑最新报道和总结内容</div>
            </div>

            <div class="ci-worldinfo-edit-section" style="border: 2px solid rgba(255, 152, 0, 0.3); border-radius: 8px; padding: 12px; background: rgba(255, 152, 0, 0.05); cursor: pointer;" data-section="forces">
              <div style="font-weight: 600; color: #ff9800; margin-bottom: 8px;">势力信息区</div>
              <div style="font-size: 12px; color: #666;">点击编辑组织和势力信息</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `);

  $('body').append($overlay);

  $overlay.find('.ci-edit-close').on('click', () => $overlay.remove());
  $overlay.on('click', (e: any) => {
    if (e.target === $overlay[0]) $overlay.remove();
  });

  $overlay.find('.ci-worldinfo-edit-section').on('click', function (this: any) {
    const section = $(this).data('section');
    $overlay.remove();

    // 三个子区域的细粒度编辑暂以 toast 提示占位
    // 单个势力 / 单个事件 的编辑已由 force-edit / event-edit 模块完整提供
    const labelMap: Record<string, string> = {
      ticker: '滚动新闻条',
      latest: '最新信息区',
      forces: '势力信息区',
    };
    const label = labelMap[section] || section;
    showToast(`${label}：批量编辑功能正在迁移中，请直接点击具体卡片进行编辑`, 'success');
  });
}
