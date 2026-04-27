/**
 * 浮岛编辑弹窗模块统一导出
 *
 * 已完成迁移：
 * ✅ char-edit.ts      - 角色编辑（含 saveCharData / deleteCharData）
 * ✅ item-edit.ts      - 物品编辑（含 saveItemData）
 * ✅ skill-edit.ts     - 技能编辑（含 saveSkillData）
 * ✅ avatar/cropper.ts - 头像裁剪
 * ✅ avatar/selection.ts - 头像选择
 * ✅ archive-edit.ts   - 角色档案编辑（含 saveArchiveData / updateCellOrComposite）
 * ✅ force-edit.ts     - 势力编辑（含 saveForceData）
 * ✅ event-edit.ts     - 事件编辑（含 saveEventData）
 * ✅ history-edit.ts   - 往期报道编辑
 * ✅ worldinfo-edit.ts - 世界信息编辑入口（路由分发）
 *
 * 仍内联在 panels 中：
 * - inventory 模块：recycle-modal（回收站）
 * - worldinfo 模块：showNewsHistoryModal（往期报道列表）
 */

export { showCharEditDialog, saveCharData, deleteCharData } from './char-edit';
export { openItemEditModal, saveItemData } from './item-edit';
export { openSkillEditModal, saveSkillData } from './skill-edit';
export { loadCropperLibrary, createCropperModal } from './avatar/cropper';
export { createAvatarSelectionModal } from './avatar/selection';
export { showArchiveEditDialog, saveArchiveData, updateCellOrComposite } from './archive-edit';
export { showWorldInfoForceEdit, saveForceData } from './force-edit';
export { showWorldInfoEventEdit, saveEventData } from './event-edit';
export { showHistoryItemEditOverlay } from './history-edit';
export { showWorldInfoEditOverlay } from './worldinfo-edit';
