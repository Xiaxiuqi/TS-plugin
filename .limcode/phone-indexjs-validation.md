# Phone `src/phone/index.js` 直接源文件校验文档

## 1. 唯一校验基准

Phone 当前唯一权威源文件是：

```text
src/phone/index.js
```

所有 CSS、界面分类、交互逻辑、字体逻辑、返回/导航逻辑、导入导出通知、业务功能都必须以这个文件实际运行结果为准。

禁止再把以下目录作为真源或验收基准：

```text
src/phone/source/**
src/phone/apps/**
src/phone/core/**
src/phone/services/**
src/phone/stores/**
src/phone/composables/**
src/phone/utils/**
src/phone/types/**
src/phone/数据/**
src/phone/预设/**
src/phone/imageGen/**
```

这些目录如存在，只能视为历史错误迁移产物；清理后应不存在。

## 2. 推荐加载方式

本地静态服务启动后，直接加载源文件：

```js
(() => {
  const old = document.getElementById('phone-dev-live-script');
  old?.remove();

  const script = document.createElement('script');
  script.id = 'phone-dev-live-script';
  script.src = 'http://127.0.0.1:5501/src/phone/index.js?ts=' + Date.now();
  document.head.appendChild(script);
})();
```

不要用 `dist/phone/index.js` 做本轮验收，因为 dist 可能被旧 watch 或旧构建入口覆盖。

## 3. 如何确认加载的是权威源

在浏览器开发者工具 Network 面板确认：

- 请求 URL 必须是：

```text
http://127.0.0.1:5501/src/phone/index.js?ts=...
```

- Response 内容尾部应包含：

```text
//# sourceMappingURL=index.js.map
```

如果 Network 中出现：

```text
/dist/phone/index.js
```

则本轮校验无效。

## 4. 控制台基础校验

加载后控制台应出现源文件自身日志，例如：

```text
[Improved Phone] Script loaded
```

不得出现旧错误迁移路线中的提示，例如：

```text
该 App 页面样式已从旧 bundle 复原，交互模板正在逐步还原
当前占位组件用于确保新入口可安全构建
仍处于迁移 adapter 阶段
Cannot read properties of undefined
R is not a function
```

如果出现上述内容，说明不是直接运行权威源，或存在旧迁移产物干扰。

## 5. CSS 与界面校验

### 5.1 总体外观

检查手机外壳、状态栏、刘海、关闭按钮、拖拽按钮、Home Indicator、背景、圆角、阴影是否与 `src/phone/index.js` 运行版本一致。

### 5.2 Settings 样式

进入设置后检查：

- 设置背景为浅蓝渐变。
- 设置菜单卡片、图标、分组、圆角、阴影、字体大小与源文件一致。
- 子页面 header、返回按钮、保存按钮、输入框、弹窗样式与源文件一致。

### 5.3 首页样式

检查首页：

- App 图标顺序。
- App 图标名称。
- 小组件位置与尺寸。
- 分页滑动。
- 时间、日期、天气、音乐、电池等 widget 样式。
- 自定义首页 CSS 是否生效。

## 6. 字体校验

权威源字体逻辑以 `src/phone/index.js` 为准，用户字体从：

```text
phone_data.user.font
```

读取。

### 6.1 字体 CSS link 校验

在宿主文档检查是否存在：

```css
link[data-phone-font]
link[data-phone-font-script]
```

### 6.2 CSS 变量校验

手机容器应通过 CSS 变量控制字体：

```text
--phone-font-family
```

字体生效时，容器或子元素 computed style 中应能看到用户字体名。

### 6.3 设置页字体校验

在设置中切换用户字体后：

- `phone_data.user.font` 被更新。
- 手机界面字体立即变化或重新加载后变化。
- 控制台不出现字体加载错误。

## 7. Settings 功能校验

### 7.1 主菜单

打开 Settings 主菜单，检查分类与源文件一致，包括但不限于：

- 用户数据
- 角色数据
- 头像/背景库
- 音乐库
- 地图数据
- API 配置
- 绘图配置
- 预设/自动填充
- 世界书管理
- 自动回复
- 手机美化
- 其他设置

### 7.2 子页面返回

进入每个设置子页面，检查源文件中应存在的返回按钮：

- 点击返回后回到 Settings 主菜单。
- 不应跳回主页，除非源文件原本如此设计。
- 主菜单若源文件没有返回按钮，不得擅自添加。

### 7.3 导入/导出/保存

检查：

- 导入 JSON 数据成功后出现源文件一致的成功通知。
- 导入错误时出现源文件一致的错误通知。
- 导出文件字段结构与 `src/phone/index.js` 逻辑一致。
- 保存设置后变量被写入角色变量。

## 8. APP 功能校验清单

逐个打开以下 APP，确认界面、CSS、按钮、加载通知、AI 生成提示、返回逻辑与直接源文件一致：

- Home
- Assist
- Chat
- User
- Forum
- Settings
- Dynamic
- Browser
- Phone
- Camera
- Email
- Map
- Music
- Listen Together
- Live List
- Live Room
- Calendar
- Diary
- Shopping

## 9. 拖拽与外层控制校验

检查：

- 拖动手机不报错。
- 隐藏/显示手机不报错。
- 手机位置保存/恢复逻辑与源文件一致。
- 点击 APP 时不出现 Vue runtime 错误。

## 10. 验收结论格式

每轮验证记录应写明：

```text
加载 URL：
验证时间：
是否直接加载 src/phone/index.js：是/否
Settings：通过/失败
字体：通过/失败
首页：通过/失败
APP 打开：通过/失败
控制台错误：无/列出
结论：通过/不通过
```
