// SillyTavern 原生扩展最小入口样例
// 目标：演示 getContext、事件监听、设置面板注入、DOM/CSS 作用域。

(function () {
    'use strict';

    const EXTENSION_NAME = 'chat-export-example';

    function getContextSafe() {
        if (!window.SillyTavern || typeof window.SillyTavern.getContext !== 'function') {
            throw new Error('SillyTavern.getContext() 不可用：请确认当前脚本运行在 SillyTavern 原生扩展环境内');
        }
        return window.SillyTavern.getContext();
    }

    function showToast(message, type = 'info') {
        if (window.toastr && typeof window.toastr[type] === 'function') {
            window.toastr[type](message, '示例扩展');
        } else {
            console.log(`[示例扩展][${type}]`, message);
        }
    }

    function mountSettingsPanel(context) {
        const container = document.querySelector('#extensions_settings2') || document.body;
        if (document.querySelector(`#${EXTENSION_NAME}-settings`)) return;

        const wrapper = document.createElement('section');
        wrapper.id = `${EXTENSION_NAME}-settings`;
        wrapper.className = 'chat-export-example-settings';
        wrapper.innerHTML = `
            <div class="chat-export-example-card">
                <h3>聊天记录导出扩展骨架</h3>
                <p>这是 SillyTavern 原生扩展样例，不是 JS-Slash-Runner 脚本。</p>
                <button id="${EXTENSION_NAME}-ping" class="menu_button">测试事件环境</button>
            </div>
        `;

        container.appendChild(wrapper);

        wrapper.querySelector(`#${EXTENSION_NAME}-ping`).addEventListener('click', () => {
            const chatId = typeof context.getCurrentChatId === 'function' ? context.getCurrentChatId() : '(unknown)';
            showToast(`当前聊天 ID: ${chatId}`, 'success');
        });
    }

    function registerEvents(context) {
        const { eventSource, event_types } = context;
        if (!eventSource || !event_types) return;

        eventSource.on(event_types.APP_READY, () => {
            showToast('SillyTavern 扩展已就绪');
        });

        eventSource.on(event_types.CHAT_CHANGED, () => {
            console.log('[示例扩展] 聊天已切换');
        });
    }

    function main() {
        const context = getContextSafe();
        mountSettingsPanel(context);
        registerEvents(context);
    }

    try {
        main();
    } catch (error) {
        console.error('[示例扩展] 初始化失败:', error);
        showToast(error.message || String(error), 'error');
    }
})();
