/**
 * 头像选择弹窗
 * 包含 createAvatarSelectionModal
 *
 * 完整实现见原 src/ci_island_test/index.ts:7387 (createAvatarSelectionModal)
 */
import { ICONS } from '../../core/icons';
import { state } from '../../core/state';
import { STORAGE_AVATAR_PREFIX } from '../../core/constants';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../../core/storage';
import { showToast } from '../../ui/toast';
import { loadCropperLibrary, createCropperModal } from './cropper';

declare const $: any;

/**
 * 创建头像选择模态弹窗
 */
export function createAvatarSelectionModal(d: any): void {
  $('.ci-avatar-selection-modal').remove();

  const localImg = safeGetItem(STORAGE_AVATAR_PREFIX + d.name, '');
  const avatarHtml = localImg
    ? `<img src="${localImg}" class="ci-preview-avatar">`
    : `<div class="ci-preview-avatar-placeholder">${d.name.charAt(0)}</div>`;

  const $modal = $(`
    <div class="ci-avatar-selection-modal">
      <div class="ci-modal-body">
        <div class="ci-avatar-preview-container">
          ${avatarHtml}
        </div>

        <div class="ci-upload-section">
          <button class="ci-btn-primary ci-local-upload-btn">
            ${ICONS.upload} 本地上传
          </button>
          <button class="ci-btn-icon ci-reset-avatar-btn" title="恢复默认头像" style="margin-left: 8px;">
            ${ICONS.refresh}
          </button>
        </div>

        <div class="ci-url-section">
          <div class="ci-input-wrapper">
            <input type="text" class="ci-url-input" placeholder="请输入图片URL">
            <button class="ci-btn-icon ci-url-confirm-btn">${ICONS.save}</button>
          </div>
        </div>
      </div>
    </div>
  `);

  // 阻止内部点击冒泡
  $modal.find('.ci-modal-body').on('click', (e: any) => e.stopPropagation());

  // 点击遮罩关闭
  $modal.on('click', (e: any) => {
    if ($(e.target).is($modal)) {
      e.stopPropagation();
      $modal.remove();
    }
  });

  // 本地上传
  $modal.find('.ci-local-upload-btn').on('click', (e: any) => {
    e.stopPropagation();
    state.currentUploadChar = d;
    $('#ci-hidden-input').click();
  });

  // 重置头像
  $modal.find('.ci-reset-avatar-btn').on('click', (e: any) => {
    e.stopPropagation();
    if (confirm('确定要恢复默认头像吗？这将删除当前自定义头像。')) {
      safeRemoveItem(STORAGE_AVATAR_PREFIX + d.name);
      showToast('已恢复默认头像');
      $modal.remove();
    }
  });

  // URL 上传
  $modal.find('.ci-url-confirm-btn').on('click', (e: any) => {
    e.stopPropagation();
    const url = ($modal.find('.ci-url-input').val() as string).trim();
    if (!url) {
      showToast('请输入图片链接', 'error');
      return;
    }

    fetch(url)
      .then(async response => {
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        loadCropperLibrary(() => {
          createCropperModal(blobUrl, d);
          $modal.remove();
        });
      })
      .catch(() => {
        // CORS 回退检查
        const imgNoCors = new Image();
        imgNoCors.onload = () => {
          if (
            confirm(
              '该图片不支持跨域裁剪（CORS限制）。\n是否直接使用原图作为头像？\n\n注意：直接使用依赖原始链接，如果链接失效，头像将无法显示。',
            )
          ) {
            safeSetItem(STORAGE_AVATAR_PREFIX + d.name, url);
            showToast('头像已更新');
            $modal.remove();
          }
        };
        imgNoCors.onerror = () => {
          showToast('无效的图片链接或加载失败', 'error');
        };
        imgNoCors.src = url;
      });
  });

  $('body').append($modal);
}
