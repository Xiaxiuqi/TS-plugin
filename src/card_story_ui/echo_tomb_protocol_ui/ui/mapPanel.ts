/**
 * 地图面板
 * 数据库填表结束后触发生成，支持 fallback、缓存、SVG 净化
 */

import { getDatabase } from '../core/database';
import { parseTable, filterPresent } from '../core/tables';
import { enqueueAI } from '../core/aiQueue';
import { sanitizeSvg } from '../core/svgSanitize';
import {
  parseMapElements,
  generateTempMapElements,
  buildMapPrompt,
  type MapElement,
} from '../core/mapPrompt';
import { registerCleanup } from '../core/memory';
import { getShellState } from './shell';

/** SVG 缓存，按摘要保留最近 3 个 */
const SVG_CACHE_MAX = 3;
const _svgCache: Map<string, string> = new Map();

let _mapContainer: HTMLElement | null = null;
let _lastDigest: string = '';

/** Fallback SVG：简单的占位地图 */
const FALLBACK_SVG = `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="600" fill="#1a1a2e" rx="8"/>
  <circle cx="400" cy="300" r="40" fill="none" stroke="#6b8cce" stroke-width="2" stroke-dasharray="8 4"/>
  <text x="400" y="305" text-anchor="middle" fill="#8888aa" font-size="14">地图生成中...</text>
  <text x="400" y="340" text-anchor="middle" fill="#555" font-size="11">点击刷新按钮重新生成</text>
</svg>`;

/**
 * 初始化地图面板
 */
export function initMapPanel($container: JQuery): void {
  _mapContainer = $container[0] || null;

  // 注册数据库填表结束回调
  const db = getDatabase();
  db.onTableFillEnd(() => {
    triggerMapGeneration();
  });

  registerCleanup(() => {
    _svgCache.clear();
    _mapContainer = null;
    _lastDigest = '';
  });
}

/**
 * 触发地图生成
 */
export async function triggerMapGeneration(): Promise<void> {
  const elements = await collectMapElements();
  const digest = computeDigest(elements);

  // 摘要未变，不重新生成
  if (digest === _lastDigest && _svgCache.has(digest)) {
    renderSvg(_svgCache.get(digest)!);
    return;
  }

  // 检查缓存
  if (_svgCache.has(digest)) {
    _lastDigest = digest;
    renderSvg(_svgCache.get(digest)!);
    return;
  }

  // 入 AI 队列生成
  try {
    const prompt = buildMapPrompt(elements);
    const svgRaw = await enqueueAI(
      `map-gen-${Date.now()}`,
      () => getDatabase().callAI(prompt),
      'map-generation', // 去重 key，新任务取消旧任务
    );

    if (!svgRaw) {
      renderFallback('地图生成失败：AI 未返回结果');
      return;
    }

    // 提取 SVG 内容（AI 可能返回包含 markdown 代码块）
    const svgContent = extractSvg(svgRaw);
    if (!svgContent) {
      renderFallback('地图生成失败：无法提取 SVG');
      return;
    }

    // 净化
    const sanitized = sanitizeSvg(svgContent);
    if (!sanitized) {
      renderFallback('地图生成失败：SVG 格式无效');
      return;
    }

    // 缓存
    cacheSvg(digest, sanitized);
    _lastDigest = digest;
    renderSvg(sanitized);
  } catch (e: any) {
    // 去重取消不算错误
    if (e?.message?.includes('deduplicated') || e?.message?.includes('destroyed')) {
      return;
    }
    console.error('[EchoTomb] Map generation error:', e);
    renderFallback(`地图生成异常: ${e?.message || '未知错误'}`);
  }
}

/** 收集地图元素 */
async function collectMapElements(): Promise<MapElement[]> {
  const db = getDatabase();

  // 优先尝试读取数据库地图元素表
  const mapRaw = await db.exportTable('地图元素表');
  if (mapRaw && mapRaw.length > 1) {
    const mapTable = parseTable('地图元素表', mapRaw);
    if (mapTable && mapTable.rows.length > 0) {
      return parseMapElements(mapTable.rows);
    }
  }

  // Fallback: 从全局数据和角色生成临时元素
  const shellState = getShellState();
  const globalData = shellState.globalData;

  const charRaw = await db.exportTable('重要角色表');
  let presentChars: Array<{ name: string; charId: string }> = [];
  if (charRaw) {
    const charTable = parseTable('重要角色表', charRaw);
    if (charTable) {
      presentChars = filterPresent(charTable).map(row => ({
        name: row['姓名'] || row['角色ID'] || '',
        charId: row['角色ID'] || '',
      }));
    }
  }

  return generateTempMapElements(globalData, presentChars);
}

/** 计算元素摘要（用于去重和缓存命中） */
function computeDigest(elements: MapElement[]): string {
  // 简单摘要：拼接关键信息
  return elements.map(e => `${e.type}:${e.name}:${e.proximity}`).join('|');
}

/** 缓存 SVG，超过上限则释放最旧的 */
function cacheSvg(digest: string, svg: string): void {
  _svgCache.set(digest, svg);
  if (_svgCache.size > SVG_CACHE_MAX) {
    const firstKey = _svgCache.keys().next().value;
    if (firstKey) _svgCache.delete(firstKey);
  }
}

/** 从 AI 返回中提取 SVG */
function extractSvg(raw: string): string | null {
  // 尝试从 markdown 代码块提取
  const codeBlockMatch = raw.match(/```(?:svg|xml)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // 尝试直接匹配 <svg ... </svg>
  const svgMatch = raw.match(/<svg[\s\S]*<\/svg>/i);
  if (svgMatch) {
    return svgMatch[0];
  }

  return null;
}

/** 渲染 SVG 到容器 */
function renderSvg(svg: string): void {
  if (!_mapContainer) return;
  _mapContainer.innerHTML = `
    <div class="et-map-wrapper">
      ${svg}
    </div>
  `;
  bindMapEvents();
}

/** 渲染 fallback */
function renderFallback(message: string): void {
  if (!_mapContainer) return;
  _mapContainer.innerHTML = `
    <div class="et-map-wrapper et-map-fallback">
      ${FALLBACK_SVG}
      <div class="et-map-error">${message}</div>
    </div>
  `;
}

/** 绑定地图元素点击事件（事件委托） */
function bindMapEvents(): void {
  if (!_mapContainer) return;
  // 事件委托到容器
  _mapContainer.addEventListener('click', (e) => {
    const target = (e.target as Element).closest('.cm[data-idx]');
    if (target) {
      const idx = target.getAttribute('data-idx');
      // TODO: 显示元素详情弹窗
      console.log('[EchoTomb] Map element clicked:', idx);
    }
  });
}
