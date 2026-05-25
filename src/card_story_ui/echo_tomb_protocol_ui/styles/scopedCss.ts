/**
 * 局部 CSS 样式
 * 挂载到酒馆页面，使用 .echo-tomb-status-bar 前缀避免冲突
 * 禁止使用 tailwindcss（按脚本规则）
 */

export const SCOPED_CSS = `
/* === 回响坟冢状态栏 === */
.echo-tomb-status-bar .et-shell {
  position: relative;
  margin-top: 12px;
  padding: 12px;
  border-radius: 8px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  overflow: hidden;
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* 日间主题 */
.echo-tomb-status-bar .et-theme-day {
  --et-bg: rgba(240, 245, 255, 0.92);
  --et-bg-card: rgba(255, 255, 255, 0.85);
  --et-text: #1a1a2e;
  --et-text-muted: #555;
  --et-border: rgba(100, 120, 180, 0.2);
  --et-accent: #4a6fa5;
  --et-accent-hover: #3a5f95;
  --et-tab-active: #4a6fa5;
  --et-tab-text: #fff;
  background: var(--et-bg);
  color: var(--et-text);
  border: 1px solid var(--et-border);
}

/* 夜间主题 */
.echo-tomb-status-bar .et-theme-night {
  --et-bg: rgba(15, 15, 35, 0.94);
  --et-bg-card: rgba(25, 25, 50, 0.85);
  --et-text: #e0e0f0;
  --et-text-muted: #8888aa;
  --et-border: rgba(80, 80, 140, 0.3);
  --et-accent: #6b8cce;
  --et-accent-hover: #8ba8e0;
  --et-tab-active: #6b8cce;
  --et-tab-text: #fff;
  background: var(--et-bg);
  color: var(--et-text);
  border: 1px solid var(--et-border);
}

/* 顶部状态 */
.echo-tomb-status-bar .et-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--et-border);
}

.echo-tomb-status-bar .et-global-status {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.echo-tomb-status-bar .et-status-chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--et-bg-card);
  font-size: 12px;
  color: var(--et-text-muted);
  border: 1px solid var(--et-border);
}

.echo-tomb-status-bar .et-theme-toggle {
  cursor: pointer;
  font-size: 16px;
  opacity: 0.7;
  transition: opacity 0.2s;
}
.echo-tomb-status-bar .et-theme-toggle:hover {
  opacity: 1;
}

/* Tab 导航 */
.echo-tomb-status-bar .et-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
  overflow-x: auto;
  scrollbar-width: thin;
}

.echo-tomb-status-bar .et-tab-item {
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
  background: var(--et-bg-card);
  border: 1px solid var(--et-border);
  transition: background 0.2s, color 0.2s;
}
.echo-tomb-status-bar .et-tab-item:hover {
  background: var(--et-accent);
  color: var(--et-tab-text);
}
.echo-tomb-status-bar .et-tab-active {
  background: var(--et-tab-active);
  color: var(--et-tab-text);
  border-color: var(--et-tab-active);
}

/* 内容区 */
.echo-tomb-status-bar .et-content {
  min-height: 60px;
  padding: 8px;
  background: var(--et-bg-card);
  border-radius: 6px;
  border: 1px solid var(--et-border);
}

.echo-tomb-status-bar .et-empty {
  text-align: center;
  color: var(--et-text-muted);
  padding: 20px;
  font-style: italic;
}

.echo-tomb-status-bar .et-loading {
  text-align: center;
  color: var(--et-text-muted);
  padding: 16px;
}

/* 底部按钮 */
.echo-tomb-status-bar .et-footer {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  justify-content: flex-end;
}

.echo-tomb-status-bar .et-btn {
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid var(--et-border);
  background: var(--et-bg-card);
  color: var(--et-text);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.echo-tomb-status-bar .et-btn:hover {
  background: var(--et-accent);
  color: var(--et-tab-text);
  border-color: var(--et-accent);
}
`;
