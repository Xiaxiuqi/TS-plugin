
(function () {
    'use strict';

    const VERSION = 'v1.0';
    const INSTANCE_KEY = '__nlDbRefillAuto';
    const NAME = '[奶龙数据库重填表]';
    const DEBOUNCE_MS = 1000;
    const WARN_COOLDOWN_MS = 30000;
    const REFILL_TYPES = new Set(['regenerate', 'swipe']);

    if (window[INSTANCE_KEY] && typeof window[INSTANCE_KEY].uninstall === 'function') {
        window[INSTANCE_KEY].uninstall();
    }

    const state = {
        installed: false,
        currentChatId: getCurrentChatId(),
        timer: null,
        running: false,
        pending: false,
        pendingReason: '',
        pendingMessageId: null,
        lastRunAt: 0,
        lastTriggerKey: '',
        lastWarnAt: {},
        chatToken: 0,
        installedAt: new Date().toISOString(),
    };

    const disposers = [];

    function logInfo(message, detail) {
        if (detail !== undefined) {
            console.info(NAME, message, detail);
        } else {
            console.info(NAME, message);
        }
    }

    function logWarn(message, detail) {
        if (detail !== undefined) {
            console.warn(NAME, message, detail);
        } else {
            console.warn(NAME, message);
        }
    }

    function toast(type, message, key) {
        const now = Date.now();
        const warnKey = key || message;
        if (now - (state.lastWarnAt[warnKey] || 0) < WARN_COOLDOWN_MS) return;
        state.lastWarnAt[warnKey] = now;

        const api = window.toastr;
        if (api && typeof api[type] === 'function') {
            api[type](message);
        } else {
            logWarn(message);
        }
    }

    function safeGetWindow(label, getter) {
        try {
            const candidate = getter();
            return candidate || null;
        } catch (error) {
            logWarn(`访问 ${label} 窗口失败`, error);
            return null;
        }
    }

    function resolveApi() {
        const candidates = [
            safeGetWindow('parent', () => window.parent),
            safeGetWindow('top', () => window.top),
            safeGetWindow('opener', () => window.opener),
            window,
        ];

        const seen = new Set();
        for (const candidate of candidates) {
            if (!candidate || seen.has(candidate)) continue;
            seen.add(candidate);

            try {
                const api = candidate.AutoCardUpdaterAPI;
                if (!api) continue;
                if (typeof api.manualUpdate === 'function' || typeof api.refreshDataAndWorldbook === 'function') {
                    return api;
                }
            } catch (error) {
                logWarn('读取 AutoCardUpdaterAPI 失败', error);
            }
        }

        return null;
    }

    function getContext() {
        try {
            if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
                return window.SillyTavern.getContext();
            }
        } catch (error) {
            logWarn('读取 SillyTavern context 失败', error);
        }
        return null;
    }

    function getEventBinding() {
        const context = getContext();
        const eventSource = context && context.eventSource;
        const eventTypes = (context && (context.eventTypes || context.event_types)) || window.tavern_events;

        if (eventSource && eventTypes && typeof eventSource.on === 'function') {
            return {
                eventTypes,
                on(eventName, handler) {
                    eventSource.on(eventName, handler);
                    return function dispose() {
                        if (typeof eventSource.off === 'function') eventSource.off(eventName, handler);
                        else if (typeof eventSource.removeListener === 'function') eventSource.removeListener(eventName, handler);
                    };
                },
            };
        }

        if (typeof window.eventOn === 'function' && eventTypes) {
            return {
                eventTypes,
                on(eventName, handler) {
                    const result = window.eventOn(eventName, handler);
                    return typeof result === 'function' ? result : function noop() {};
                },
            };
        }

        return null;
    }

    function getCurrentChatId() {
        try {
            if (window.SillyTavern && typeof window.SillyTavern.getCurrentChatId === 'function') {
                const chatId = window.SillyTavern.getCurrentChatId();
                if (chatId !== undefined && chatId !== null) return String(chatId);
            }
        } catch (error) {
            logWarn('读取当前聊天 ID 失败', error);
        }

        try {
            const context = getContext();
            const metadata = (context && context.chatMetadata) || window.chat_metadata || window.chatMetadata;
            if (metadata && metadata.chat_id) return String(metadata.chat_id);
            if (metadata && metadata.file_name) return String(metadata.file_name);
        } catch (error) {
            logWarn('读取聊天 metadata 失败', error);
        }

        return window.location.href;
    }

    function clearTimer() {
        if (state.timer !== null) {
            clearTimeout(state.timer);
            state.timer = null;
        }
    }

    function clearPending() {
        clearTimer();
        state.pending = false;
        state.pendingReason = '';
        state.pendingMessageId = null;
        state.lastTriggerKey = '';
    }

    function handleChatChanged() {
        state.currentChatId = getCurrentChatId();
        state.chatToken += 1;
        clearPending();
        logInfo('聊天已切换，已清理待重填表状态');
    }

    function scheduleRefill(messageId, type) {
        const chatId = getCurrentChatId();
        const triggerKey = `${chatId}:${messageId}:${type}`;

        state.currentChatId = chatId;
        state.pending = true;
        state.pendingReason = type;
        state.pendingMessageId = Number.isFinite(Number(messageId)) ? Number(messageId) : null;
        state.lastTriggerKey = triggerKey;

        clearTimer();
        const token = state.chatToken;
        state.timer = setTimeout(function delayedRun() {
            state.timer = null;
            runRefill(token).catch(function handleRunError(error) {
                logWarn('重填表任务执行异常', error);
                toast('error', '数据库自动重填表执行异常，详情见控制台。', 'run-error');
            });
        }, DEBOUNCE_MS);

        logInfo('已计划自动重填表', { messageId, type, debounceMs: DEBOUNCE_MS });
    }

    async function runRefill(token) {
        if (token !== state.chatToken) return;

        if (state.running) {
            state.pending = true;
            return;
        }

        if (!state.pending) return;

        state.pending = false;
        const reason = state.pendingReason;
        const messageId = state.pendingMessageId;
        state.pendingReason = '';
        state.pendingMessageId = null;
        state.running = true;

        try {
            const api = resolveApi();
            if (!api) {
                toast('warning', '未检测到数据库 AutoCardUpdaterAPI，无法自动重填表。', 'missing-api');
                return;
            }

            let result;
            if (typeof api.manualUpdate === 'function') {
                result = await api.manualUpdate();
                if (result === false) {
                    toast('warning', '数据库重新填表返回失败，请检查数据库面板或控制台。', 'manual-false');
                    return;
                }
                state.lastRunAt = Date.now();
                logInfo('已完成数据库自动重填表', { reason, messageId, result });
                return;
            }

            if (typeof api.refreshDataAndWorldbook === 'function') {
                toast('warning', '未检测到重新填表接口，已使用刷新数据库/世界书接口替代。', 'fallback-refresh');
                result = await api.refreshDataAndWorldbook();
                if (result === false) {
                    toast('warning', '数据库刷新/世界书回退接口返回失败，请检查数据库面板或控制台。', 'fallback-false');
                    return;
                }
                state.lastRunAt = Date.now();
                logInfo('已完成数据库刷新回退', { reason, messageId, result });
                return;
            }

            toast('warning', '数据库 API 缺少 manualUpdate 和 refreshDataAndWorldbook，无法自动重填表。', 'missing-methods');
        } catch (error) {
            logWarn('调用数据库重填表接口失败', error);
            toast('error', '调用数据库重填表接口失败，详情见控制台。', 'api-error');
        } finally {
            state.running = false;
            if (token !== state.chatToken) return;

            if (state.pending) {
                clearTimer();
                state.timer = setTimeout(function rerun() {
                    state.timer = null;
                    runRefill(state.chatToken).catch(function handleRerunError(error) {
                        logWarn('补跑重填表任务异常', error);
                        toast('error', '数据库自动重填表补跑异常，详情见控制台。', 'rerun-error');
                    });
                }, DEBOUNCE_MS);
            }
        }
    }

    function onMessageReceived(messageId, type) {
        if (!REFILL_TYPES.has(type)) return;
        scheduleRefill(messageId, type);
    }

    function install() {
        const TH = window.TavernHelper;
        if (!TH) {
            toast('warning', '未检测到 TavernHelper，请确认脚本运行在酒馆助手环境中。', 'missing-th');
            return false;
        }

        const binding = getEventBinding();
        if (!binding || !binding.eventTypes) {
            toast('warning', '未检测到 SillyTavern 事件系统，数据库自动重填表未启动。', 'missing-events');
            return false;
        }

        const eventTypes = binding.eventTypes;
        if (!eventTypes.MESSAGE_RECEIVED) {
            toast('warning', '当前事件系统缺少 MESSAGE_RECEIVED，数据库自动重填表未启动。', 'missing-message-received');
            return false;
        }

        disposers.push(binding.on(eventTypes.MESSAGE_RECEIVED, onMessageReceived));

        if (eventTypes.CHAT_CHANGED) disposers.push(binding.on(eventTypes.CHAT_CHANGED, handleChatChanged));
        if (eventTypes.CHAT_LOADED) disposers.push(binding.on(eventTypes.CHAT_LOADED, handleChatChanged));

        state.installed = true;
        logInfo(`已安装 ${VERSION}`);
        return true;
    }

    function uninstall() {
        clearPending();
        while (disposers.length) {
            const dispose = disposers.pop();
            try {
                dispose();
            } catch (error) {
                logWarn('卸载事件监听失败', error);
            }
        }
        state.installed = false;
        if (window[INSTANCE_KEY] && window[INSTANCE_KEY].version === VERSION) {
            delete window[INSTANCE_KEY];
        }
        logInfo('已卸载');
    }

    function getState() {
        return {
            version: VERSION,
            installed: state.installed,
            currentChatId: state.currentChatId,
            running: state.running,
            pending: state.pending,
            pendingReason: state.pendingReason,
            pendingMessageId: state.pendingMessageId,
            lastRunAt: state.lastRunAt,
            lastTriggerKey: state.lastTriggerKey,
            chatToken: state.chatToken,
            installedAt: state.installedAt,
        };
    }

    window[INSTANCE_KEY] = {
        version: VERSION,
        uninstall,
        getState,
    };

    if (!install()) {
        window[INSTANCE_KEY].getState = getState;
    }
})();
