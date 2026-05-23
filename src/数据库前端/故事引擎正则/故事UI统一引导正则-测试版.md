# 故事UI统一引导正则-测试版（已废弃）

## 当前状态

本文件保留为历史迁移说明。

从当前版本开始，故事 UI **不再使用正则引导**，也不再通过消息正文插入 `<script>`。

旧方案中的消息内脚本注入在酒馆显示层中可能被清理、转义或不执行，因此已停止作为启用方式。

## 新启用方式

测试版请启用酒馆助手脚本入口：

```text
public/story_regex_ui_test/index.js
```

测试版入口会自动：

1. 加载同目录资源：`public/story_regex_ui_test/loader.js`。
2. 加载测试版公共样式、核心模块和业务模块。
3. 监听消息渲染、更新、swipe、加载更多、聊天切换等事件。
4. 扫描消息中的故事 UI 标记并局部渲染。
5. 注册一个脚本按钮：

```text
咒回前端管理
```

点击该按钮可打开管理界面，进行：

- 手动重扫。
- 诊断刷新。
- 当前环境资源重载。
- 米白 / 暗色模式切换。
- 模块显示模式切换：`脚本显示` / `原生显示` / `共存增强` / `关闭`。

`共存增强` 是测试版第一阶段 `after-native` 模式：酒馆原生正则先渲染 displayed DOM，脚本再按原生可见锚点插入增强 UI，不写回 raw message。当前仅优先验证 `BP战力雷达`、`故事引擎`、`世界运行报告` 三类模块。

## 识别内容

酒馆助手入口会扫描消息中已有的内容标记，例如：

```text
<StatusPlaceHolderImpl/>
<bp_panel>...</bp_panel>
变量更新块
```

其中 `<StatusPlaceHolderImpl/>` 可以是文本形式，也兼容被浏览器解析为未知元素的情况。

## 主题键

主题本地储存键仍为：

```text
jjks_story_ui_theme
```

该键只保存主题，不保存正文内容。

## 旧正则内容（请勿再启用）

旧查找正则：

```regex
/(<StatusPlaceHolderImpl\s*\/>)/i
```

旧替换内容：

```html
$1
<script src="https://ts-plugin.pages.dev/story_regex_ui_test/loader.js?v=test"></script>
```

以上旧替换内容已废弃，请不要再导入或启用。

## 共存增强测试范围

当前测试版已加入 `after-native` / `共存增强` 第一阶段能力。

已验证和优先支持：

- `<bp_panel>...</bp_panel>`：基于 `已扫描目标`、`BP战力雷达`、`扫描状态`、`BP总值` 等原生可见锚点插入。
- `<story_driver>...</story_driver>`：基于 `最终修正`、`全域锚定` 等原生可见锚点插入。
- `<wlog ...>...</wlog>`：基于 `世界主线`、`Time passed:` 等原生可见锚点插入。

暂缓范围：变量更新、MVU 状态栏、羁绊/好感度与新变量模块仍需单独定义稳定 DOM 边界后再进入共存增强。

## 测试到正式流程

1. 测试用户启用：`public/story_regex_ui_test/index.js`。
2. 验证稳定后，将测试版资源同步到正式版目录。
3. 正式用户启用：`public/story_regex_ui_prod/index.js`。
4. 测试版与正式版不要同时启用。
