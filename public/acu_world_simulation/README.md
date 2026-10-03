# 格林推演悬浮面板

独立于 `acu_visualizer_test` 的只读脚本。加载 `index.js` 时会自动加载同目录下的 `style.css`，并在宿主页面挂载悬浮球。

```js
import 'https://ts-plugin.pages.dev/acu_world_simulation/index.js';
```

本地预览：`tests/acu_visualizer_test/world-simulation.preview.html`。

重复导入时会移除上一个实例；也可调用 `window.ACUWorldSimulation?.destroy()` 手动卸载。

脚本在宿主消息更新、聊天切换或消息楼层重绘后读取格林推演资料，不进行定时轮询。更新的分类、条目与字段会高亮，悬浮球收起时也会提示新资料。面板的位置和尺寸在拖动、缩放后保存到浏览器本地存储。

设置中的“注入后修复正文显示”默认关闭。开启后，仅当同一聊天的正文出现或更新完整的 `<与此同时>…</与此同时>` 内容，或旧版 `qrf-world-simulation-projection:v1/v2` 投影块时，脚本延迟调用一次酒馆助手的 `refreshOneMessage` 刷新对应楼层；优先比较〈与此同时〉内容，不检查账本写入。编辑正文和普通楼层重绘不会触发，正在编辑正文时也会跳过排队中的刷新。不会修改聊天记录或数据库脚本。
