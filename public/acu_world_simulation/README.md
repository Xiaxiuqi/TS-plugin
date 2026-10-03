# 格林推演悬浮面板

独立于 `acu_visualizer_test` 的只读脚本。加载 `index.js` 时会自动加载同目录下的 `style.css`，并在宿主页面挂载悬浮球。

```js
import 'https://ts-plugin.pages.dev/acu_world_simulation/index.js';
```

本地预览：`tests/acu_visualizer_test/world-simulation.preview.html`。

重复导入时会移除上一个实例；也可调用 `window.ACUWorldSimulation?.destroy()` 手动卸载。

脚本在宿主消息更新、聊天切换或消息楼层重绘后读取格林推演资料，不进行定时轮询。更新的分类、条目与字段会高亮，悬浮球收起时也会提示新资料。面板的位置和尺寸在拖动、缩放后保存到浏览器本地存储。

设置中的“注入后修复正文显示”默认关闭。开启后，在消息更新或楼层重绘时，脚本延迟调用一次酒馆助手的 `refreshOneMessage` 刷新最近的 AI 楼层显示；不会修改聊天记录或数据库脚本。
