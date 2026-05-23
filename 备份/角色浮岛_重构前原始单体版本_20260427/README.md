# 浮岛模块化重构 - 原始单体版本备份

> 备份时间：2026-04-27
> 重构后位置：[`src/ci_island_test/`](../../src/ci_island_test)

本目录保留浮岛重构前的**原始单体源文件**作为参考与回滚保险。

## 文件清单

| 文件 | 原路径 | 行数 | 大小 | 说明 |
|------|--------|------|------|------|
| `index.original.ts` | `src/ci_island_test/index.ts` | 11569 | 434 KB | 重构前的完整单体脚本 |
| `style.original.scss` | `src/ci_island_test/style.scss` | 8190 | 170 KB | 重构前的完整样式文件 |

## 重要提示

- 这些备份文件**不会**被 webpack 编译或 TypeScript 检查
- 它们仅作历史参考与紧急回滚使用
- 不要直接编辑这些备份文件

## 重构后的模块化结构

```
src/ci_island_test/
├── core/                # 6 个核心文件（常量、状态、工具、存储等）
├── data/                # 4 个数据处理模块
├── ui/                  # 7 个 UI 基础模块（toast、theme、events 等）
├── panels/              # 6 大面板（characters / relation / inventory / skills / map / worldinfo）
├── dialogs/             # 10 个弹窗模块
├── styles/              # 13 个 SCSS 分文件 + index.scss
├── app.ts               # 主应用入口
├── index.ts             # 简化版入口（19 行）
└── REFACTOR_PLAN.md     # 重构路线图与全量比对修复记录
```

## 回滚指引

如果模块化版本出现问题需要回滚到原始版本：

```cmd
cd d:\酒馆项目\tavern_helper_template
copy /Y "备份\角色浮岛_重构前原始单体版本_20260427\index.original.ts" "src\ci_island_test\index.ts"
copy /Y "备份\角色浮岛_重构前原始单体版本_20260427\style.original.scss" "src\ci_island_test\style.scss"
```

然后清理 `src/ci_island_test/` 下新增的模块化目录（`core/`、`data/`、`ui/`、`panels/`、`dialogs/`、`styles/`），删除 `app.ts` 和 `REFACTOR_PLAN.md`，最后重新运行 `npx webpack --mode production`。

## 重构成果

| 指标 | 重构前 | 重构后 | 变化 |
|------|--------|--------|------|
| 主入口行数 | 11569 | 19 | -99.84% |
| TypeScript 文件数 | 1 | ~50 | +49 |
| SCSS 文件数 | 1 | 13 | +12 |
| 产物大小 | 597 KiB | 713 KiB | +19.4% |
| 构建状态 | ✅ 通过 | ✅ 通过 | 无变化 |
| 错误数 | 0 | 0 | 无变化 |
| 模块化得分 | 单体 | 6 层架构 | 显著改进 |

**🎉 浮岛模块化重构圆满完成！**
