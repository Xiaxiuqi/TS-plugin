# 故事UI统一引导正则-正式版（已废弃）

## 当前状态

本文件保留为历史迁移说明。

从当前版本开始，故事 UI **不再使用正则引导**，也不再通过消息正文插入 `<script>`。

正式环境应改为启用酒馆助手脚本入口。

## 新启用方式

正式版请启用酒馆助手脚本入口：

```text
public/story_regex_ui_prod/index.js
```

正式版入口会自动：

1. 加载同目录资源：`public/story_regex_ui_prod/loader.js`。
2. 加载正式版公共样式、核心模块和业务模块。
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
<script src="https://ts-plugin.pages.dev/story_regex_ui_prod/loader.js?v=1.0.0"></script>
```

以上旧替换内容已废弃，请不要再导入或启用。

## 测试版差异

测试版已开始验证 `after-native` / `共存增强` 模式：酒馆原生正则先渲染 displayed DOM，脚本再按原生可见锚点插入增强 UI。该能力当前只在 `public/story_regex_ui_test` 中实现，正式版尚未同步。

正式版用户仍按当前正式入口使用；待测试版确认稳定后，再将共存增强同步到 `public/story_regex_ui_prod`。

## 发布流程

1. 日常开发只修改：`public/story_regex_ui_test/**`。
2. 测试稳定后同步到：`public/story_regex_ui_prod/**`。
3. 正式用户只启用：`public/story_regex_ui_prod/index.js`。
4. 测试版与正式版不要同时启用。
