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

/**
 * 初始化设置。读取脚本变量并按 schema 校验：
 * - 读取或校验失败时不抛错，回退到 schema 默认值，并立即写回覆盖脏值，
 *   保证 bootstrap 不因为旧版本/手改残留的非法字段整体失败（见 stage-01 §8.5）。
 */
export function initSettings(): Settings {
  let raw: unknown = null;
  try {
    raw = getVariables({ type: 'script', script_id: getScriptId() });
  } catch (e) {
    console.warn('[EchoTomb] 读取脚本变量失败，使用默认设置：', e);
  }

  const parsed = SettingsSchema.safeParse(raw ?? {});
  if (parsed.success) {
    _settings = parsed.data;
    return _settings;
  }

  const issueSummary = parsed.error.issues
    .map(i => `${i.path.join('.') || '<root>'}: ${i.message}`)
    .join('; ');
  console.warn(
    `[EchoTomb] 脚本变量中的设置项校验失败，已重置为默认值。issues: ${issueSummary}`,
  );

  _settings = SettingsSchema.parse({});
  try {
    insertOrAssignVariables(
      { ..._settings },
      { type: 'script', script_id: getScriptId() },
    );
  } catch (e) {
    console.warn('[EchoTomb] 兜底设置写回脚本变量失败：', e);
  }
  return _settings;
}

export function getSettings(): Settings {
  if (!_settings) throw new Error('[EchoTomb] Settings not initialized');
  return _settings;
}

/**
 * 更新设置并持久化到脚本变量。
 * 校验失败会抛错（调用方应避免传入非法值）；持久化失败仅 warn，不抛。
 */
export function updateSettings(partial: Partial<Settings>): Settings {
  _settings = SettingsSchema.parse({ ..._settings, ...partial });
  try {
    insertOrAssignVariables(
      { ..._settings },
      { type: 'script', script_id: getScriptId() },
    );
  } catch (e) {
    console.warn('[EchoTomb] 设置写回脚本变量失败：', e);
  }
  return _settings;
}
