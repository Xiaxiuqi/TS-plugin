/**
 * 扩展菜单注入
 * 在 SillyTavern 的扩展菜单中注入"浮岛设置"菜单项
 *
 * 完整实现见原 src/ci_island_test/index.ts:10716 addSettingsToExtensionMenu
 */
declare const $: any;

/**
 * 注入设置菜单项到 SillyTavern 扩展菜单
 * @param onClickHandler 点击菜单项时的处理函数
 */
export function addSettingsToExtensionMenu(onClickHandler: () => void): void {
  const parentDoc = (window.parent as any).document;
  if (!parentDoc) return;

  const exMenu = $(parentDoc).find('#extensionsMenu');
  if (!exMenu.length) {
    setTimeout(() => addSettingsToExtensionMenu(onClickHandler), 1000);
    return;
  }
  if ($(parentDoc).find('#ci-settings-menu-item').length) return;

  const menuItemHTML = `
    <div class="list-group-item flex-container flexGap5 interactable" id="ci-settings-menu-item" title="浮岛设置">
      <div class="fa-fw fa-solid fa-cog extensionsMenuExtensionButton"></div>
      <span>浮岛设置</span>
    </div>
  `;

  const $item = $(menuItemHTML);
  $item.on('click', () => {
    onClickHandler();
  });

  exMenu.append($item);
}
