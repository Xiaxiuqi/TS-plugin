/**
 * 头像裁剪弹窗
 * 包含 loadCropperLibrary + createCropperModal
 *
 * 完整实现见原 src/ci_island_test/index.ts:7355 (loadCropperLibrary)
 *                  src/ci_island_test/index.ts:7499 (createCropperModal)
 */
import { STORAGE_AVATAR_PREFIX } from '../../core/constants';
import { safeSetItem } from '../../core/storage';
import { showToast } from '../../ui/toast';

declare const $: any;

let isCropperLoaded = false;

/**
 * 加载 Cropper.js 库
 */
export function loadCropperLibrary(callback: () => void): void {
  if (isCropperLoaded || (window as any).Cropper) {
    isCropperLoaded = true;
    callback();
    return;
  }

  showToast('正在加载裁剪组件...', 'success');

  // Load CSS
  if (!$('link[href*="cropper.min.css"]').length) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css';
    document.head.appendChild(link);
  }

  // Load JS
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js';
  script.onload = () => {
    isCropperLoaded = true;
    callback();
  };
  script.onerror = () => {
    showToast('加载裁剪组件失败，请检查网络', 'error');
  };
  document.head.appendChild(script);
}

/**
 * 创建裁剪弹窗
 */
export function createCropperModal(imageSrc: string, d: any): void {
  $('.ci-cropper-modal').remove();

  const $modal = $(`
    <div class="ci-cropper-modal">
      <div class="ci-modal-body">
        <div class="ci-cropper-container">
          <img id="ci-cropper-image" src="${imageSrc}" crossorigin="anonymous" style="max-width: 100%;">
        </div>
        <div class="ci-cropper-actions">
          <button class="ci-btn-secondary ci-cancel-btn">取消</button>
          <button class="ci-btn-primary ci-confirm-btn">确定</button>
        </div>
      </div>
    </div>
  `);

  $('body').append($modal);

  const image = $modal.find('#ci-cropper-image')[0] as HTMLImageElement;
  if (!image) {
    console.error('Cropper image element not found');
    return;
  }
  let cropper: any = null;

  const close = () => {
    if (cropper) cropper.destroy();
    if (imageSrc.startsWith('blob:')) {
      URL.revokeObjectURL(imageSrc);
    }
    $modal.remove();
  };

  $modal.find('.ci-modal-body').on('click', (e: any) => e.stopPropagation());

  $modal.on('click', (e: any) => {
    if ($(e.target).is($modal)) {
      e.stopPropagation();
      close();
    }
  });

  $modal.find('.ci-cancel-btn').on('click', (e: any) => {
    e.stopPropagation();
    close();
  });

  $modal.find('.ci-confirm-btn').on('click', (e: any) => {
    e.stopPropagation();
    if (!cropper) return;

    const canvas = cropper.getCroppedCanvas({
      width: 200,
      height: 200,
    });

    if (canvas) {
      const base64 = canvas.toDataURL('image/png');
      safeSetItem(STORAGE_AVATAR_PREFIX + d.name, base64);
      showToast('头像已更新');
      close();
    }
  });

  // Initialize Cropper safely
  const initCropper = () => {
    const Cropper = (window as any).Cropper;
    if (Cropper && image) {
      if (cropper) cropper.destroy();
      cropper = new Cropper(image, {
        aspectRatio: 1,
        checkOrientation: false,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 1,
        restore: false,
        guides: false,
        center: false,
        highlight: false,
        cropBoxMovable: false,
        cropBoxResizable: false,
        toggleDragModeOnDblclick: false,
      });
    }
  };

  if (image.complete) {
    initCropper();
  } else {
    image.onload = initCropper;
  }
}
