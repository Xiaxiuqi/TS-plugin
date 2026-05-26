/**
 * UI 状态 store
 * 负责面板切换、当前主体 Tab、师令型 UI 状态
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ActivePanel = 'subject' | 'map' | 'upgrade' | 'team';

export const useUiStore = defineStore('echoTomb_ui', () => {
  /** 当前面板 */
  const activePanel = ref<ActivePanel>('subject');
  /** 当前选中的主体角色ID */
  const activeCharId = ref<string>('');
  /** 升级交互开启标记 */
  const upgradeOpen = ref(false);
  /** 组队向导开启标记 */
  const teamWizardOpen = ref(false);

  function setActivePanel(p: ActivePanel) {
    activePanel.value = p;
  }

  function setActiveTab(charId: string) {
    activeCharId.value = charId;
  }

  function openUpgrade() {
    activePanel.value = 'upgrade';
    upgradeOpen.value = true;
  }

  function openTeamWizard() {
    activePanel.value = 'team';
    teamWizardOpen.value = true;
  }

  return {
    activePanel,
    activeCharId,
    upgradeOpen,
    teamWizardOpen,
    setActivePanel,
    setActiveTab,
    openUpgrade,
    openTeamWizard,
  };
});
