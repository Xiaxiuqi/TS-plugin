/**
 * 设置 store
 * 包装 settings.ts 使其响应式，变更同时持久化到脚本变量
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getSettings, updateSettings, type Settings } from '../settings';

export const useSettingsStore = defineStore('echoTomb_settings', () => {
  const initial = getSettings();

  const theme = ref<Settings['theme']>(initial.theme);
  const aiConcurrency = ref<Settings['aiConcurrency']>(initial.aiConcurrency);
  const mapApiSource = ref<Settings['mapApiSource']>(initial.mapApiSource);
  const customApiEndpoint = ref<Settings['customApiEndpoint']>(initial.customApiEndpoint);
  const customApiModel = ref<Settings['customApiModel']>(initial.customApiModel);

  function setTheme(value: Settings['theme']) {
    theme.value = value;
    persist();
  }

  function setAiConcurrency(value: Settings['aiConcurrency']) {
    if (value < 1 || value > 3 || !Number.isInteger(value)) return;
    aiConcurrency.value = value;
    persist();
  }

  function setMapApiSource(value: Settings['mapApiSource']) {
    mapApiSource.value = value;
    persist();
  }

  function setCustomApi(endpoint: string, model: string) {
    customApiEndpoint.value = endpoint;
    customApiModel.value = model;
    persist();
  }

  /** 将当前状态同步到脚本变量 */
  function persist() {
    updateSettings({
      theme: theme.value,
      aiConcurrency: aiConcurrency.value,
      mapApiSource: mapApiSource.value,
      customApiEndpoint: customApiEndpoint.value,
      customApiModel: customApiModel.value,
    });
  }

  return {
    // state
    theme,
    aiConcurrency,
    mapApiSource,
    customApiEndpoint,
    customApiModel,
    // actions
    setTheme,
    setAiConcurrency,
    setMapApiSource,
    setCustomApi,
  };
});
