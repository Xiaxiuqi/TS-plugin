/**
 * 浮岛主入口（模块化版本，简化版）
 *
 * 完整业务逻辑见：
 * - src/ci_island_test/app.ts
 * - src/ci_island_test/core/
 * - src/ci_island_test/data/
 * - src/ci_island_test/ui/
 * - src/ci_island_test/panels/
 * - src/ci_island_test/dialogs/
 * - src/ci_island_test/styles/
 *
 * 原 11569 行单文件版本已备份至 备份/角色浮岛_重构前原始单体版本_20260427/index.original.ts
 *
 * ⚠️ 关键 import 顺序（不要随意调整）：
 *   1. ./pre-style-snapshot  → 启动 MutationObserver 监听 head 中新增 <style>
 *   2. ./styles/index.scss   → webpack 注入 CSS（被步骤 1 自动标记）
 *   3. ./app                 → 业务代码（其内部会调用 stopWatchingStyles()）
 */
import './pre-style-snapshot';
import './styles/index.scss';
import { bootstrap } from './app';

bootstrap();
