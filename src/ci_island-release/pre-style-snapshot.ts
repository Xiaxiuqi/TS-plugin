/**
 * Style 自动标记模块
 *
 * 必须在 import 任何 .scss / .css 文件之前 import 此文件。
 *
 * 工作原理：
 *   启动一个 MutationObserver 监视 document.head，所有新增的 <style> 节点
 *   会被自动打上 TELEPORT_ATTR attribute。
 *
 *   index.ts 中的 import 顺序（必须）：
 *     1. import './pre-style-snapshot';   ← 启动 observer
 *     2. import './styles/index.scss';    ← webpack 注入新 style → observer 自动标记
 *     3. import { bootstrap } from './app';
 *     4. bootstrap();                     ← 内部会调用 stopWatchingStyles() 释放 observer
 *
 * 资源占用：
 *   - 监听期间：1 个 MutationObserver（约 300B）
 *   - 调用 stopWatchingStyles() 后：0
 */

export const TELEPORT_ATTR = 'data-ci-teleport-style';

let observer: MutationObserver | null = new MutationObserver(mutations => {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node instanceof HTMLStyleElement) {
        node.setAttribute(TELEPORT_ATTR, '1');
      }
    }
  }
});

observer.observe(document.head, { childList: true });

/**
 * 停止监视并完全释放 observer。
 * 应在 CSS 全部注入完毕后调用（即 import './styles/index.scss' 之后）。
 * 重复调用幂等。
 */
export function stopWatchingStyles(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}
