# Phone `src/phone/index.js` 基准迁移文档

## 1. 唯一基准声明

Phone 的唯一权威源文件是：

```text
src/phone/index.js
```

后续任何迁移、修复、拆分、格式化、重构、文档校验，都必须从该文件反查和提取。

以下目录不是权威源，不能作为迁移基准：

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

如果这些目录存在，视为历史错误迁移产物，应清理。

## 2. 当前运行策略

当前优先不拆分、不重构，直接运行：

```text
src/phone/index.js
```

验证加载脚本：

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

## 3. 从 `index.js` 反查的方法

`src/phone/index.js` 是打包后的大文件，不能用普通逐行阅读完整打开。应使用搜索定位。

### 3.1 PowerShell 定位字符串

```powershell
Select-String -Path src/phone/index.js -Pattern 'settings-container' -SimpleMatch
Select-String -Path src/phone/index.js -Pattern 'phone_data.user.font' -SimpleMatch
Select-String -Path src/phone/index.js -Pattern 'data-phone-font' -SimpleMatch
Select-String -Path src/phone/index.js -Pattern 'homeCssSettings' -SimpleMatch
```

### 3.2 读取局部上下文

使用 PowerShell 按行读取局部范围：

```powershell
$p = 'src/phone/index.js'
Get-Content $p | Select-Object -Skip 53000 -First 120
```

### 3.3 关键定位词

#### 外层挂载/启动

```text
[Improved Phone] Script loaded
SillyTavern.getCurrentChatId
mount
phone-wrapper
phone-container
```

#### 字体

```text
phone_data
user.font
data-phone-font
data-phone-font-script
--phone-font-family
用户字体已加载
```

#### Settings

```text
settings-container
MainMenu
currentView
baseInfo.characters.length
saveEditableData
```

#### Home

```text
app-home-screen
homeCssSettings
phone_home_custom_css
phone_home_app_order
```

#### 占位/错误迁移检查

```text
占位组件
仍处于迁移 adapter 阶段
```

权威源中不应依赖这些错误迁移占位文案。

## 4. 迁移原则

### 4.1 一比一原则

迁移目标必须满足：

- CSS 一致。
- DOM/template/render 结构一致。
- 界面分类一致。
- 功能入口一致。
- 设置字段一致。
- 通知文案一致。
- 返回/导航行为一致。
- 字体读取和注入逻辑一致。

不得因为“能构建”而替换成自写占位逻辑。

### 4.2 禁止行为

禁止：

- 自己编写替代组件。
- 用 `src/phone/source/**` 当真源。
- 用 adapter 输出“仍处于迁移”代替真实逻辑。
- 用占位页面代替源文件页面。
- 改动界面分类、菜单结构、通知文案。
- 未对比源文件就修改 CSS。

## 5. 如果未来必须拆分

只有在直接运行 `src/phone/index.js` 验证稳定后，才允许重新考虑拆分。

拆分步骤必须是：

1. 从 `src/phone/index.js` 精确定位模块。
2. 抽取局部代码。
3. 写入新文件。
4. 保持外部行为不变。
5. 用直接源文件与拆分版本做逐项对比。
6. 任何差异都以 `src/phone/index.js` 为准修正。

## 6. CSS 提取要求

CSS 必须从 `src/phone/index.js` 中对应 style 字符串提取。

提取后必须校验：

- class 名一致。
- scoped hash 或等价隔离策略一致。
- 颜色、间距、圆角、阴影、字体大小一致。
- 动画、transition、backdrop-filter 一致。

不得使用格式化后的旧 source 目录 CSS 作为替代。

## 7. 字体迁移要求

字体必须遵守源文件逻辑：

- 用户字体来自：

```text
phone_data.user.font
```

- 字体样式通过 link 注入：

```text
link[data-phone-font]
link[data-phone-font-script]
```

- 手机容器通过：

```text
--phone-font-family
```

控制字体。

## 8. Settings 迁移要求

Settings 必须逐项对照源文件：

- 主菜单分类。
- 子页面进入条件。
- 子页面返回逻辑。
- 导入/导出结构。
- 保存逻辑。
- 字体设置。
- 图片/音乐/图标选择弹窗。
- 成功/失败通知。

## 9. 删除与回滚策略

### 9.1 删除策略

清理旧迁移产物时必须保留：

```text
src/phone/index.js
```

其余 Phone 拆分源码、错误 adapter、旧 source、旧 docs 可以删除。

### 9.2 回滚策略

如清理后需要恢复旧迁移产物，只能通过版本控制恢复，不得把这些旧产物重新设为真源。

## 10. 验收流程

每轮迁移或清理后：

1. 确认 `src/phone/index.js` 存在。
2. 启动静态服务。
3. 浏览器直接加载 `http://127.0.0.1:5501/src/phone/index.js?ts=...`。
4. 按 `.limcode/phone-indexjs-validation.md` 执行手动验收。
5. 控制台不得出现旧迁移占位/adapter 错误。
6. 记录结论。
