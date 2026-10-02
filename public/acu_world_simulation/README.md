# 格林推演悬浮面板

独立于 `acu_visualizer_test` 的只读脚本。加载 `index.js` 时会自动加载同目录下的 `style.css`，并在宿主页面挂载悬浮球。

```js
import 'https://ts-plugin.pages.dev/acu_world_simulation/index.js';
```

本地预览：`tests/acu_visualizer_test/world-simulation.preview.html`。

重复导入时会移除上一个实例；也可调用 `window.ACUWorldSimulation?.destroy()` 手动卸载。
