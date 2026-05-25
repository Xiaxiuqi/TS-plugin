/**
 * 设置项管理
 * 使用酒馆助手脚本变量存储，zod 定义 schema
 */
import { z } from 'zod';

const SettingsSchema = z
  .object({
    /** 日夜主题: 'day' | 'night' | 'auto' */
    theme: z.enum(['day', 'night', 'auto']).default('auto'),
    /** AI 并发上限 1~3 */
    aiConcurrency: z.number().int().min(1).max(3).default(1),
    /** 地图生成 API 来源: 'database' | 'custom' */
    mapApiSource: z.enum(['database', 'custom']).default('database'),
    /** 自定义 API 端点 (仅 mapApiSource === 'custom' 时有效) */
    customApiEndpoint: z.string().default(''),
    /** 自定义 API 模型名 */
    customApiModel: z.string().default(''),
  })
  .default({});

export type Settings = z.infer<typeof SettingsSchema>;

let _settings: Settings | null = null;

export function initSettings(): Settings {
  const raw = getVariables({ type: 'script', script_id: getScriptId() });
  _settings = SettingsSchema.parse(raw ?? {});
  return _settings;
}

export function getSettings(): Settings {
  if (!_settings) throw new Error('[EchoTomb] Settings not initialized');
  return _settings;
}

export function updateSettings(partial: Partial<Settings>): Settings {
  _settings = SettingsSchema.parse({ ..._settings, ...partial });
  insertOrAssignVariables({ ..._settings }, { type: 'script', script_id: getScriptId() });
  return _settings;
}
