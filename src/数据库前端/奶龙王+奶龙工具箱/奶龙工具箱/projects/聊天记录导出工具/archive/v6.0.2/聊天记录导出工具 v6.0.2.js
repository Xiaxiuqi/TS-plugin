
(function() {
    // === 0. 常量 ===
    const STYLE_ID = 'chat-tool-css-v50';
    const STORAGE_KEY = 'chat_tool_v33_settings';
    const BTN_CLASS = 'cet-msg-bookmark-btn';

    // === 1. 样式 ===
    $('[id^=chat-tool-css]').remove();
    $('[id^=chat-export-tool-css]').remove();

    $('head').append(`
        <style id="${STYLE_ID}">
            /* 核心布局 */
            .swal2-popup {
                width: 95% !important; max-width: 600px !important; padding: 0 !important;
                display: flex !important; flex-direction: column;
                height: 80vh !important; max-height: 700px !important;
                min-height: 0 !important;
            }
            .swal2-html-container {
                margin: 0 !important; padding: 0 !important; overflow: hidden !important;
                text-align: left; flex: 1; display: flex; flex-direction: column; min-height: 0 !important;
            }
            .cet-wrapper {
                width: 100%; height: 100%; display: flex; flex-direction: column;
                padding: 8px; box-sizing: border-box; gap: 6px;
                background: var(--smart-theme-bg);
                position: relative;
                min-height: 0;
            }
            .cet-card { display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden; }

            /* 头部 - 固定不滚动 */
            .cet-header-group { flex-shrink: 0; display: flex; flex-direction: column; gap: 5px; border-bottom: 1px solid var(--smart-theme-border-color-1); padding-bottom: 5px; }
            .cet-header-row { display: flex; align-items: center; justify-content: space-between; }
            .cet-title { font-weight: bold; font-size: 1em; display: flex; align-items: center; gap: 6px; }
            .cet-count { font-size: 0.75em; opacity: 0.6; }

            /* 右上角关闭按钮 */
            .cet-close-btn {
                width: 26px; height: 26px;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; opacity: 0.5; transition: all 0.2s;
                border-radius: 4px; font-size: 1em;
                color: var(--smart-theme-body-color);
            }
            .cet-close-btn:hover { opacity: 1; background: rgba(217, 83, 79, 0.15); color: #d9534f; }

            .cet-tabs { display: flex; gap: 4px; }
            .cet-tab {
                flex: 1; text-align: center; padding: 6px; cursor: pointer;
                font-size: 0.9em; opacity: 0.6; border-bottom: 2px solid transparent;
                transition: all 0.2s; user-select: none; white-space: nowrap;
            }
            .cet-tab:hover { opacity: 0.9; background: rgba(0,0,0,0.03); }
            .cet-tab.active { opacity: 1; font-weight: bold; border-bottom-color: #7a9a83; color: var(--smart-theme-body-color); }

            /* 主内容容器 - 包含滚动区和底部按钮 */
            .cet-main-body { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; gap: 8px; }

            /* 文本导出tab的特殊容器 - 固定550px */
            .cet-tab-content#tab-txt { max-height: 550px; min-height: 0; display: none; flex-direction: column; overflow: hidden; }
            .cet-tab-content#tab-txt.active { display: flex; }
            .cet-tab-content#tab-txt .cet-txt-scroll { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding-right: 5px; }

            /* 其他tab正常显示 */
            .cet-tab-content#tab-nav, .cet-tab-content#tab-json { display: none; flex-direction: column; gap: 8px; flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding-right: 5px; }
            .cet-tab-content#tab-nav.active, .cet-tab-content#tab-json.active { display: flex; }

            /* 移动端触摸滚动：避免 Android WebView / iOS WKWebView 中父级弹窗吞掉内部滚动 */
            .cet-tab-content,
            .cet-txt-scroll,
            .cet-search-results,
            .cet-tags-list,
            .cet-scan-container,
            .cet-textarea {
                -webkit-overflow-scrolling: touch;
                overscroll-behavior: contain;
                touch-action: pan-y;
            }

            /* 滚动条样式 - 始终占位 */
            .cet-tab-content::-webkit-scrollbar, .cet-txt-scroll::-webkit-scrollbar { width: 5px; }
            .cet-tab-content::-webkit-scrollbar-track, .cet-txt-scroll::-webkit-scrollbar-track { background: transparent; }
            .cet-tab-content::-webkit-scrollbar-thumb, .cet-txt-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 2px; }

            /* 固定底部按钮区 */
            .cet-footer-actions {
                flex-shrink: 0;
                padding-top: 8px;
                border-top: 1px solid var(--smart-theme-border-color-1);
            }
            .cet-footer-actions > div { display: none; flex-direction: column; gap: 6px; }
            .cet-footer-actions > div.active { display: flex; }

            /* 组件 */
            .cet-input-group { display: flex; flex-direction: column; gap: 2px; width: 100%; flex-shrink: 0; }
            .cet-label-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
            .cet-label-title { font-weight: bold; font-size: 0.85em; }
            .cet-label-desc { font-size: 0.7em; opacity: 0.6; }
            .cet-input-wrapper { display: flex; gap: 4px; width: 100%; box-sizing: border-box; align-items: center; }
            .cet-text-input {
                flex: 1; min-width: 0; background: rgba(0,0,0,0.05); border: 1px solid var(--smart-theme-border-color-1);
                color: var(--smart-theme-body-color); padding: 6px 8px; border-radius: 4px; font-family: monospace; font-size: 0.85em; height: 30px;
            }
            /* ★ 新增：专属的多行文本框样式 ★ */
            .cet-textarea {
                min-width: 0; background: rgba(0,0,0,0.05); border: 1px solid var(--smart-theme-border-color-1);
                color: var(--smart-theme-body-color); padding: 6px 8px; border-radius: 4px; font-family: monospace; font-size: 0.8em;
                min-height: 80px; resize: vertical; line-height: 1.4; box-sizing: border-box; width: 100%; resize: vertical; overflow: auto;
            }
            .cet-select {
                flex: 1; min-width: 0; background: rgba(0,0,0,0.05); border: 1px solid var(--smart-theme-border-color-1);
                color: var(--smart-theme-body-color); padding: 4px; border-radius: 4px; font-size: 0.8em; max-width: 100%; height: 30px;
            }
            .cet-btn-icon {
                flex-shrink: 0; width: 30px; height: 30px; border: 1px solid var(--smart-theme-border-color-1);
                background: rgba(0,0,0,0.05); color: var(--smart-theme-body-color); border-radius: 4px;
                cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; font-size: 0.9em;
            }
            .cet-btn-icon:hover { background: var(--smart-theme-color-red); color: white; border-color: var(--smart-theme-color-red); }
            .cet-btn-icon.action:hover { background: #7a9a83; color: white; border-color: #7a9a83; }
            .cet-btn-icon.magic:hover { background: #5b8db8; color: white; border-color: #5b8db8; }
            .cet-btn-icon.magic.active { background: #5b8db8; color: white; border-color: #5b8db8; }
            .cet-btn-icon.delete-active { background: #d9534f !important; color: white !important; border-color: #d9534f !important; }
            .cet-btn-icon.star:hover { background: #f0ad4e; color: white; border-color: #f0ad4e; }
            .cet-btn-icon.star.active { background: #f0ad4e; color: white; border-color: #f0ad4e; }
            .cet-btn-icon.add-active { background: #f0ad4e !important; color: white !important; border-color: #f0ad4e !important; }
            .cet-btn-icon.naming-active { background: #9b59b6 !important; color: white !important; border-color: #9b59b6 !important; }
            .cet-btn-icon.add { width: auto; padding: 0 8px; font-size: 0.8em; font-weight: bold; }
            .cet-btn-icon.add:hover { background: #7a9a83; color: white; border-color: #7a9a83; }

            .cet-history-area { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; min-height: 0; }
            .cet-tags-list { display: flex; flex-wrap: wrap; gap: 4px; min-height: 0; max-height: 150px; overflow-y: auto; }
            .cet-tags-list::-webkit-scrollbar { width: 3px; }
            .cet-tags-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 2px; }

            .cet-scan-container {
                display: none; flex-wrap: wrap; gap: 4px; padding: 6px; margin-top: 8px; margin-bottom: 1px;
                background: rgba(0,0,0,0.02); border: 1px dashed rgba(0,0,0,0.1); border-radius: 4px;
                max-height: 150px; overflow-y: auto;
            }
            .cet-scan-container::-webkit-scrollbar { width: 3px; }
            .cet-scan-container::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 2px; }

            .cet-user-tags-box {
                background: rgba(0,0,0,0.02);
                border: 1px dashed rgba(0,0,0,0.1);
                border-radius: 4px;
                padding: 6px;
                margin-top: 2px;
                display: flex; flex-direction: column; gap: 4px;
            }
            .cet-tags-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
            .cet-toolbar-label { font-size: 0.8em; opacity: 0.7; }
            .cet-toolbar-actions { display: flex; gap: 4px; }
            .cet-btn-icon.mini { width: 24px; height: 24px; font-size: 0.8em; }

            .cet-chip {
                font-size: 0.75em; padding: 2px 6px; background: var(--smart-theme-border-color-1);
                border-radius: 4px;
                cursor: pointer; display: flex; align-items: center; gap: 4px; border: 1px solid transparent; user-select: none;
            }
            .cet-chip:hover { border-color: var(--smart-theme-border-color-2); background: rgba(0,0,0,0.1); }
            .cet-chip.bookmark { background: rgba(122, 154, 131, 0.15); border-color: rgba(122, 154, 131, 0.3); }
            .cet-chip.bookmark:hover { background: rgba(122, 154, 131, 0.25); }
            .cet-chip.bookmark.loading { background: rgba(122, 154, 131, 0.3); pointer-events: none; opacity: 0.8; }
            .cet-chip.detected { background: rgba(91, 141, 184, 0.15); border-color: rgba(91, 141, 184, 0.3); }
            .cet-chip.detected:hover { background: rgba(91, 141, 184, 0.25); }
            .cet-chip.delete-mode, .cet-chip.blocking { background: rgba(217, 83, 79, 0.15) !important; border-color: rgba(217, 83, 79, 0.3) !important; cursor: pointer; }
            .cet-chip.delete-mode:hover, .cet-chip.blocking:hover { background: rgba(217, 83, 79, 0.25) !important; border-color: rgba(217, 83, 79, 0.5) !important; }
            .cet-chip.range { background: rgba(240, 173, 78, 0.15); border-color: rgba(240, 173, 78, 0.3); }
            .cet-chip.range:hover { background: rgba(240, 173, 78, 0.25); }
            .cet-chip.favorite { background: rgba(240, 173, 78, 0.1); border-color: rgba(240, 173, 78, 0.3); }
            .cet-chip.favorite:hover { background: rgba(240, 173, 78, 0.2); }
            .cet-chip.add-target {
                background: rgba(240, 173, 78, 0.15) !important;
                border-color: rgba(240, 173, 78, 0.3) !important;
                cursor: copy !important;
            }
            .cet-chip.add-target:hover { background: rgba(240, 173, 78, 0.25) !important; border-color: rgba(240, 173, 78, 0.5) !important; }
            .cet-chip.naming-mode {
                background: rgba(155, 89, 182, 0.15) !important;
                border-color: rgba(155, 89, 182, 0.3) !important;
            }
            .cet-chip.naming-mode:hover { background: rgba(155, 89, 182, 0.25) !important; border-color: rgba(155, 89, 182, 0.5) !important; }
            .cet-chip.active-tag {
                background: rgba(122, 154, 131, 0.15); color: var(--smart-theme-body-color); border-color: rgba(122, 154, 131, 0.3); border-radius: 4px;
            }
            .cet-chip.active-tag:hover { background: rgba(122, 154, 131, 0.25); border-color: rgba(122, 154, 131, 0.5); }

            .cet-chip-text { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .cet-chip-del { font-size: 0.8em; opacity: 0.5; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
            .cet-chip-del:hover { background: var(--smart-theme-color-red); color: white; opacity: 1; }

            .cet-options { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; row-gap: 6px; background: rgba(0,0,0,0.03); padding: 6px 8px; border-radius: 6px; flex-shrink: 0; }
            .cet-checkbox-label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.8em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .cet-checkbox-label input { transform: scale(0.9); margin: 0; }

            .cet-btn {
                width: 100%; border: none; padding: 8px; border-radius: 6px; font-weight: bold; font-size: 0.9em; color: white;
                cursor: pointer; transition: all 0.2s; display: flex; justify-content: center; align-items: center; gap: 6px; flex-shrink: 0;
            }
            .cet-btn.txt { background: #7a9a83; } .cet-btn.txt:hover { background: #6b8c72; }
            .cet-btn.json { background: #5b8db8; } .cet-btn.json:hover { background: #4a7ca7; }
            .cet-btn.import { background: transparent; color: var(--smart-theme-body-color); border: 1px solid var(--smart-theme-border-color-2); } .cet-btn.import:hover { background: rgba(0,0,0,0.05); }

            .cet-search-results { flex: 1; min-height: 100px; overflow-y: auto; background: rgba(0,0,0,0.02); border: 1px solid var(--smart-theme-border-color-1); border-radius: 6px; display: flex; flex-direction: column; position: relative; }
            .cet-search-item { padding: 6px 8px; border-bottom: 1px solid var(--smart-theme-border-color-1); cursor: pointer; font-size: 0.8em; display: flex; flex-direction: column; gap: 2px; }
            .cet-search-item:last-child { border-bottom: none; }
            .cet-search-item:hover { background: rgba(122, 154, 131, 0.1); }
            .cet-search-item.loading { background: rgba(122, 154, 131, 0.2); pointer-events: none; opacity: 0.8; }

            .cet-res-meta { display: flex; justify-content: space-between; opacity: 0.7; font-size: 0.8em; }
            .cet-res-content { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--smart-theme-body-color); }
            .cet-res-match { color: #d9534f; font-weight: bold; }
            .cet-divider { height: 1px; background: var(--smart-theme-border-color-1); margin: 4px 0; flex-shrink: 0; }

            .cet-collapse-wrapper { display: flex; justify-content: center; padding: 5px; background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.02)); }
            .cet-collapse-btn {
                background: var(--smart-theme-border-color-1); color: var(--smart-theme-body-color);
                padding: 4px 12px; border-radius: 12px; font-size: 0.75em; cursor: pointer;
                display: flex; align-items: center; gap: 5px; transition: all 0.2s; border: 1px solid transparent; box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            }
            .cet-collapse-btn:hover { background: rgba(122, 154, 131, 0.2); border-color: rgba(122, 154, 131, 0.5); color: #7a9a83; }

            .${BTN_CLASS} { cursor: pointer; opacity: 0.4; margin-left: 5px; display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; transition: all 0.2s; }
            .${BTN_CLASS}:hover { opacity: 0.8; transform: scale(1.1); }
            .${BTN_CLASS}.active { opacity: 1; color: #7a9a83; text-shadow: 0 0 2px rgba(122, 154, 131, 0.3); }
            .cet-btn-icon.block-active { background: #d9534f !important; color: white !important; border-color: #d9534f !important; }

            .cet-exclude-hint { font-size: 0.7em; color: #d9534f; padding: 6px; background: rgba(217, 83, 79, 0.1); border-radius: 4px; margin-top: 2px; line-height: 1.5; border: 1px solid rgba(217, 83, 79, 0.2); }

            /* 文本导出tab内的各区块间距 */
            .cet-txt-scroll .cet-input-group { margin-bottom: 8px; }
            .cet-txt-scroll .cet-options { margin-top: 4px; }

            @media (max-width: 768px), (pointer: coarse) {
                .swal2-popup {
                    width: 100% !important;
                    max-width: 100% !important;
                    height: min(92dvh, 92vh) !important;
                    max-height: min(92dvh, 92vh) !important;
                    margin: 0 !important;
                }
                .swal2-html-container { min-height: 0 !important; }
                .cet-wrapper { padding: 6px; gap: 5px; }
                .cet-tab-content#tab-txt {
                    max-height: none;
                    flex: 1;
                    min-height: 0;
                }
                .cet-tab-content#tab-txt .cet-txt-scroll,
                .cet-tab-content#tab-nav,
                .cet-tab-content#tab-json {
                    min-height: 0;
                    overflow-y: auto;
                    touch-action: pan-y;
                    -webkit-overflow-scrolling: touch;
                }
                .cet-tags-list,
                .cet-scan-container,
                .cet-search-results,
                .cet-textarea {
                    touch-action: pan-y;
                    -webkit-overflow-scrolling: touch;
                }
            }
        </style>
    `);
    
    // 1. 先定义核心的转译函数
    const replaceMacros = (text) => {
        if (!text || typeof text !== 'string') return text;
        const userName = (window.SillyTavern && window.SillyTavern.name1) ? window.SillyTavern.name1 : "User";
        const charName = (window.SillyTavern && window.SillyTavern.name2) ? window.SillyTavern.name2 : "Character";
        return text.replace(/\{\{user\}\}/gi, userName).replace(/\{\{char\}\}/gi, charName);
    };

    // === 2. 逻辑 ===
    const Logic = {
        getCurrentChatKey: () => {
            if (window.SillyTavern && SillyTavern.getCurrentChatId) return SillyTavern.getCurrentChatId();
            return "unknown_chat";
        },
        loadSettings: () => {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                const defaults = {
                    lastExportTags: "content, small_theater",
                    lastSearchTags: "content, small_theater",
                    lastExcludeTags: "",
                    lastActiveRanges: [],
                    history: ["content", "small_theater"],
                    options: { hidden: true, user: true, showName: true, showFloor: true, clean: true, chapter: false, checkMissing: true },
                    bookmarks: {},
                    ignoredTags: [],
                    favorites: [],
                    favoriteAliases: {}
                };
                let data = raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
                if (!data.ignoredTags) data.ignoredTags = [];
                if (!data.favorites) data.favorites = [];
                if (!data.favoriteAliases) data.favoriteAliases = {};
                if (Array.isArray(data.bookmarks)) {
                    const currentKey = Logic.getCurrentChatKey();
                    const oldArr = data.bookmarks;
                    data.bookmarks = {};
                    if(currentKey) data.bookmarks[currentKey] = oldArr;
                }
                return data;
            } catch { return {}; }
        },
        saveSettings: (s) => localStorage.setItem(STORAGE_KEY, JSON.stringify(s)),
        getCurrentBookmarks: () => {
            const settings = Logic.loadSettings();
            const key = Logic.getCurrentChatKey();
            return settings.bookmarks[key] || [];
        },
        saveCurrentBookmarks: (newArr) => {
            const settings = Logic.loadSettings();
            const key = Logic.getCurrentChatKey();
            settings.bookmarks[key] = newArr;
            Logic.saveSettings(settings);
        },
        getProcessedMessages: () => {
            if (typeof window.TavernHelper === 'undefined') return [];
            const lastId = window.TavernHelper.getLastMessageId();
            return window.TavernHelper.getChatMessages(`0-${lastId}`, { include_swipes: false });
        },
        getRawMessagesForBackup: () => {
            if (window.SillyTavern && window.SillyTavern.chat) return window.SillyTavern.chat;
            return Logic.getProcessedMessages();
        },
        getDefaultFilename: () => {
            try {
                let charName = "Character", chatTitle = "Chat";
                if (window.SillyTavern && SillyTavern.characters && SillyTavern.characterId) {
                    const char = SillyTavern.characters[SillyTavern.characterId];
                    if (char && char.name) charName = char.name;
                }
                if (SillyTavern.chatMetadata && SillyTavern.chatMetadata.title) chatTitle = SillyTavern.chatMetadata.title;
                else if (SillyTavern.getCurrentChatId) {
                    const chatId = SillyTavern.getCurrentChatId();
                    if (chatId) chatTitle = chatId.replace(/\.jsonl?$/, '');
                }
                const safeChar = charName.replace(/[\\/:*?"<>|]/g, '').trim();
                const safeTitle = chatTitle.replace(/[\\/:*?"<>|]/g, '').trim();
                const date = new Date().toISOString().slice(0, 10);

                let maxFloor = 0;
                if (typeof window.TavernHelper !== 'undefined') maxFloor = window.TavernHelper.getLastMessageId();

                let base = safeTitle.toLowerCase().startsWith(safeChar.toLowerCase()) ? `${safeTitle}` : `${safeChar}_${safeTitle}`;
                return `${base}_${date}_@${maxFloor}`;
            } catch (e) { return "Chat_Export_" + Date.now(); }
        },
        download: (content, filename, type = 'text/plain;charset=utf-8') => {
            if (!content) return false;
            try {
                const blob = new Blob([content], { type: type });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url; link.download = filename;
                document.body.appendChild(link); link.click(); document.body.removeChild(link);
                URL.revokeObjectURL(url); return true;
            } catch (e) { return false; }
        },
        escapeRegex: (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        escapeXml: (value) => String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;'),
        parseRegex: (str) => {
            if (!str || typeof str !== 'string') return null;
            const trimmed = str.trim();
            const match = trimmed.match(/^\/(.+)\/([a-z]*)$/);
            if (match) {
                try {
                    let flags = match[2] || '';
                    if (!flags.includes('g')) flags += 'g';
                    return new RegExp(match[1], flags);
                } catch(e) { console.error('Invalid Regex:', str, e); }
            }
            return null;
        },
        getHtmlTagSet: () => new Set([
            'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base', 'bdi', 'bdo', 'blockquote',
            'body', 'br', 'button', 'canvas', 'caption', 'cite', 'code', 'col', 'colgroup', 'data', 'datalist',
            'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'embed', 'fieldset', 'figcaption',
            'figure', 'font', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hr',
            'html', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'link', 'main', 'map',
            'mark', 'meta', 'meter', 'nav', 'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p',
            'param', 'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script', 'section',
            'select', 'slot', 'small', 'source', 'span', 'strike', 'strong', 'style', 'sub', 'summary', 'sup',
            'svg', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title',
            'tr', 'track', 'u', 'ul', 'var', 'video', 'wbr', 'center'
        ]),
        normalizeTagName: (raw) => {
            if (!raw || typeof raw !== 'string') return null;
            const text = raw.trim().replace(/^<\/?/, '').replace(/\/?\s*>$/, '').trim();
            const match = text.match(/^([\u4e00-\u9fa5a-zA-Z0-9_\-.]+)/);
            if (!match) return null;
            const tag = match[1].trim();
            if (!tag || !/^[\u4e00-\u9fa5a-zA-Z0-9_\-.]+$/.test(tag)) return null;
            if (Logic.getHtmlTagSet().has(tag.toLowerCase())) return null;
            return tag;
        },
        parseTagInput: (tagInput) => {
            const rules = {};
            const regexes = [];
            const tagNames = [];
            if (!tagInput) return { rules, regexes, tagNames };

            tagInput.split(/[,，]/).map(t => t.trim()).filter(t => t).forEach(t => {
                const rx = Logic.parseRegex(t);
                if (rx) { regexes.push(rx); return; }

                if (t.includes(':') && !t.startsWith('<')) {
                    const colonIdx = t.indexOf(':');
                    const tagName = Logic.normalizeTagName(t.substring(0, colonIdx));
                    const kWord = t.substring(colonIdx + 1).trim();
                    if (!tagName || !kWord) return;
                    if (!rules[tagName]) rules[tagName] = [];
                    if (rules[tagName] !== null) rules[tagName].push(kWord);
                    if (!tagNames.includes(tagName)) tagNames.push(tagName);
                    return;
                }

                const tagName = Logic.normalizeTagName(t);
                if (!tagName) return;
                rules[tagName] = null;
                if (!tagNames.includes(tagName)) tagNames.push(tagName);
            });
            return { rules, regexes, tagNames };
        },
        getConfiguredTagNames: (tagInput, options = {}) => {
            if (!tagInput) return [];
            const includeBeforeRules = options.includeBeforeRules === true;
            const names = [];
            tagInput.split(/[,，]/).map(t => t.trim()).filter(t => t).forEach(t => {
                if (Logic.parseRegex(t)) return;
                if (t.startsWith('</') && !includeBeforeRules) return;

                const source = (t.includes(':') && !t.startsWith('<')) ? t.slice(0, t.indexOf(':')) : t;
                const tagName = Logic.normalizeTagName(source);
                if (tagName && !names.includes(tagName)) names.push(tagName);
            });
            return names;
        },
        getTagBalanceIssues: (messages, tagNames) => {
            const issues = [];
            const uniqueTags = [...new Set((tagNames || []).map(t => Logic.normalizeTagName(t)).filter(Boolean))];
            if (uniqueTags.length === 0 || !Array.isArray(messages) || messages.length === 0) return issues;

            uniqueTags.forEach(tag => {
                const escapedTag = Logic.escapeRegex(tag);
                const tokenRegex = new RegExp(`<\/?${escapedTag}(?:\s[^<>]*)?>`, 'gi');
                let openCount = 0;
                let closeCount = 0;
                const brokenFloors = [];

                messages.forEach(item => {
                    const text = item?.text || '';
                    if (!text) return;

                    const tokens = text.match(tokenRegex) || [];
                    tokens.forEach(token => {
                        if (/^<\//.test(token)) closeCount++;
                        else if (!/\/\s*>$/.test(token)) openCount++;
                    });

                    const brokenOpenRegex = new RegExp(`<${escapedTag}(?:\s[^<>]*)?$`, 'i');
                    if (brokenOpenRegex.test(text)) brokenFloors.push(item?.id ?? '未知');
                });

                if (openCount !== closeCount) {
                    issues.push(`标签 <${tag}> 结构异常 (开始: ${openCount}, 结束: ${closeCount})`);
                }
                if (brokenFloors.length > 0) {
                    issues.push(`标签 <${tag}> 结构异常 (截断: 标签未闭合)，涉及楼层: #${Logic.formatRanges(brokenFloors.filter(n => n !== '未知')) || brokenFloors.join(', #')}`);
                }
            });
            return issues;
        },
        createHeader: () => JSON.stringify({
            user_name: window.SillyTavern.name1 || "User",
            character_name: window.SillyTavern.name2 || "Character",
            create_date: Date.now(),
            chat_metadata: window.SillyTavern.chatMetadata || {}
        }),

        cleanMessage: (text) => {
            if (!text) return "";
            let t = replaceMacros(text);
            t = t.replace(/<!--[\s\S]*?-->/g, '');
            t = t.replace(/\[[a-zA-Z_]+\]/g, '');
            t = t.replace(/<(br|p|div)[^>]*>/gi, '\n');
            t = t.replace(/<[^>]+>/g, '');

            const txt = document.createElement("textarea"); txt.innerHTML = t; t = txt.value;
            return t.trim();
        },

        // ★ 新增：弱清理模式（仅去注释和系统宏，保留自定义标签）
        weakCleanMessage: (text) => {
            if (!text) return "";
            let t = replaceMacros(text);
            t = t.replace(/<!--[\s\S]*?-->/g, '');
            t = t.replace(/\[[a-zA-Z_]+\]/g, ''); // 去除酒馆宏变量 (如 [start])
            // 💡 不做 <[^>]+> 的暴力清除，完美保留 <msg>
            return t.trim();
        },

        scanUsedTags: () => {
            const msgs = Logic.getProcessedMessages();
            const settings = Logic.loadSettings();
            const ignored = new Set((settings.ignoredTags || []).map(t => String(t).toLowerCase()));
            const tagStats = {};
            const tagTokenRegex = /<\/?([\u4e00-\u9fa5a-zA-Z0-9_\-.]+)(?:\s[^<>]*)?>/g;

            msgs.forEach(msg => {
                if(!msg.message) return;
                const matches = [...msg.message.matchAll(tagTokenRegex)];
                matches.forEach(m => {
                    const tagName = Logic.normalizeTagName(m[1]);
                    if (!tagName) return;
                    const key = tagName.toLowerCase();
                    if (ignored.has(key)) return;
                    if (!tagStats[key]) tagStats[key] = { name: tagName, count: 0 };
                    tagStats[key].count++;
                });
            });

            return Object.values(tagStats)
                .sort((a,b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN'))
                .map(item => item.name);
        },
        clearIgnoredTags: () => {
            const settings = Logic.loadSettings();
            settings.ignoredTags = [];
            Logic.saveSettings(settings);
        },
        ignoreTag: (tag) => {
            const settings = Logic.loadSettings();
            if (!settings.ignoredTags.includes(tag)) { settings.ignoredTags.push(tag); Logic.saveSettings(settings); }
        },

        jumpTo: (id) => {
            if (window.TavernHelper && window.TavernHelper.triggerSlash) {
                window.TavernHelper.triggerSlash(`/chat-jump ${id}`);
                [500, 1000, 2000].forEach(delay => setTimeout(() => Logic.scanAndInject(), delay));
                return true;
            } return false;
        },
        toggleBookmark: (id, defaultName = "") => {
            const bookmarks = Logic.getCurrentBookmarks(); const idNum = parseInt(id); const index = bookmarks.findIndex(b => b.id === idNum);
            if (index > -1) {
                if(confirm(`楼层 #${id} 已在书签中，确定要移除吗？`)) {
                    bookmarks.splice(index, 1); Logic.saveCurrentBookmarks(bookmarks);
                    toastr.info(`书签 #${id} 已移除`); Logic.syncAllStates(idNum, false);
                }
            } else {
                const name = prompt("添加书签，请输入名称:", defaultName || `楼层 ${id}`);
                if (name) {
                    bookmarks.push({ id: idNum, name: name, date: Date.now() }); bookmarks.sort((a, b) => a.id - b.id);
                    Logic.saveCurrentBookmarks(bookmarks); toastr.success(`已添加书签: ${name}`); Logic.syncAllStates(idNum, true);
                }
            }
        },
        isBookmarked: (id) => { const bookmarks = Logic.getCurrentBookmarks(); return bookmarks.some(b => b.id == id); },
        syncAllStates: (id, isActive) => {
            const $btn = $(`#chat .mes[mesid="${id}"] .${BTN_CLASS}`);
            if (isActive) $btn.addClass('active'); else $btn.removeClass('active');
            const $ui = $('.cet-wrapper'); if ($ui.length > 0) $ui.trigger('cet-bookmark-update');
        },
        injectBookmarkButtonToMessage: (mesElement) => {
            const $mes = $(mesElement); const mesId = $mes.attr('mesid'); if (!mesId) return;
            const $btnContainer = $mes.find('.mes_buttons'); if ($btnContainer.length === 0) return;
            if ($btnContainer.find(`.${BTN_CLASS}`).length > 0) return;
            const $btn = $(`<div class="${BTN_CLASS}" title="添加/取消书签"><i class="fa-solid fa-bookmark"></i></div>`);
            if (Logic.isBookmarked(mesId)) $btn.addClass('active');
            $btn.on('click', (e) => { e.stopPropagation(); Logic.toggleBookmark(mesId); });
            $btnContainer.prepend($btn);
        },
        scanAndInject: () => { $('#chat .mes').each(function() { Logic.injectBookmarkButtonToMessage(this); }); },
        searchMessages: (keyword, tags) => {
            const msgs = Logic.getProcessedMessages(); if (!keyword) return [];
            let standardRegex = null;
            let customRegexes = [];

            if (tags) {
                const tagList = tags.split(/[,，]/).map(t => t.trim()).filter(t => t);
                const safeTags = [];
                tagList.forEach(t => {
                    const rx = Logic.parseRegex(t);
                    if (rx) customRegexes.push(rx);
                    else safeTags.push(Logic.escapeRegex(t));
                });
                if (safeTags.length > 0) {
                    const pattern = `<(${safeTags.join('|')})>([\\s\\S]*?)<\\/\\1>`;
                    standardRegex = new RegExp(pattern, 'gi');
                }
            }
            const results = [];
            msgs.forEach(msg => {
                let textToSearch = "";
                if (!standardRegex && customRegexes.length === 0) textToSearch = msg.message;
                else {
                    if (standardRegex) {
                         const matches = [...msg.message.matchAll(standardRegex)];
                         if (matches.length > 0) textToSearch += matches.map(m => m[2]).join(" ") + " ";
                    }
                    customRegexes.forEach(rx => {
                         const matches = [...msg.message.matchAll(rx)];
                         if (matches.length > 0) textToSearch += matches.map(m => (m.length > 1 ? m[1] : m[0])).join(" ") + " ";
                    });
                }
                if (textToSearch && textToSearch.toLowerCase().includes(keyword.toLowerCase())) {
                    const idx = textToSearch.toLowerCase().indexOf(keyword.toLowerCase());
                    const start = Math.max(0, idx - 10); const end = Math.min(textToSearch.length, idx + keyword.length + 30);
                    let snippet = textToSearch.substring(start, end); if (start > 0) snippet = "..." + snippet; if (end < textToSearch.length) snippet = snippet + "...";
                    results.push({ id: msg.message_id, name: msg.name, snippet: snippet });
                }
            });
            return results.reverse();
        },
        updateTagHistory: (tagInput) => {
            const settings = Logic.loadSettings();
            if (tagInput) {
                const newTags = tagInput.split(/[,，]/).map(t => t.trim()).filter(t => t);
                let changed = false;
                newTags.forEach(t => { if (!settings.history.includes(t)) { settings.history.push(t); changed = true; } });
                if (changed) Logic.saveSettings(settings);
            }
        },
        buildExcludePatterns: (tagInput) => {
            const patterns = [];
            if (!tagInput) return patterns;
            const tagList = tagInput.split(/[,，]/).map(t => t.trim()).filter(t => t);
            tagList.forEach(tag => {
                // 自定义正则
                const rx = Logic.parseRegex(tag);
                if (rx) { patterns.push({ type: 'regex', regex: rx }); return; }

                // tag:keyword 条件排除
                if (tag.includes(':') && !tag.startsWith('</')) {
                    const colonIndex = tag.indexOf(':');
                    const tagName = tag.slice(0, colonIndex).trim().replace(/^<|>$/g, '');
                    const keyword = tag.slice(colonIndex + 1).trim();
                    if (tagName && keyword) {
                        patterns.push({
                            type: 'conditional',
                            regex: new RegExp(
                                `<${Logic.escapeRegex(tagName)}[^>]*>\\s*<summary[^>]*>[^<]*${Logic.escapeRegex(keyword)}[^<]*<\\/summary>[\\s\\S]*?<\\/${Logic.escapeRegex(tagName)}>`,
                                'gi'
                            )
                        });
                    }
                    return;
                }

                // </tag> 形式 - 删除从开头到该闭合标签
                if (tag.startsWith('</') && tag.endsWith('>')) {
                    const tagName = tag.slice(2, -1);
                    patterns.push({
                        type: 'before',
                        regex: new RegExp(`^[\\s\\S]*?<\\/${Logic.escapeRegex(tagName)}>`, 'gi')
                    });
                }
                // <tag> 或 纯标签名 - 删除 <tag>...</tag>
                else {
                    const cleanTag = tag.replace(/^<|>$/g, '');
                    patterns.push({
                        type: 'pair',
                        regex: new RegExp(`<${Logic.escapeRegex(cleanTag)}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${Logic.escapeRegex(cleanTag)}>`, 'gi')
                    });
                }
            });
            return patterns;
        },
        applyExcludePatterns: (content, patterns) => {
            if (!patterns || patterns.length === 0) return content;
            let result = content;
            patterns.forEach(p => {
                result = result.replace(p.regex, '');
            });
            result = result.replace(/\n{3,}/g, '\n\n');
            return result.trim();
        },
        formatRanges: (numbers) => {
            if(!numbers || numbers.length === 0) return "";
            const arr = [...new Set(numbers)].sort((a,b)=>a-b);
            let ranges = [], start = arr[0], end = arr[0];
            for(let i=1; i<arr.length; i++) {
                if(arr[i] === end + 1) {
                    end = arr[i];
                } else {
                    ranges.push(start === end ? start : `${start}-${end}`);
                    start = arr[i];
                    end = arr[i];
                }
            }
            ranges.push(start === end ? start : `${start}-${end}`);
            return ranges.join(', ');
        },
        exportEPUB: async (title, author, chaptersData, customCSS = "") => {
            if (!window.JSZip) {
                toastr.info('正在加载 EPUB 打包组件...');
                try {
                    await new Promise((res, rej) => {
                        const script = document.createElement('script');
                        script.src = "https://unpkg.com/jszip@3.10.1/dist/jszip.min.js";
                        script.onload = res; script.onerror = rej;
                        document.head.appendChild(script);
                    });
                } catch(e) { return toastr.error('组件加载失败，请检查网络'); }
            }
            const zip = new JSZip();
            const uuid = `urn:uuid:${Date.now()}`;
            const safeTitle = Logic.escapeXml(title || 'export');
            const safeAuthor = Logic.escapeXml(author || 'SillyTavern User');
            
            zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
            zip.folder("META-INF").file("container.xml", `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
            
            const oebps = zip.folder("OEBPS");
            const coverXhtml = `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>封面</title><style>body{text-align:center;margin-top:30%;font-family:sans-serif;}</style></head><body><h1 style="font-size:2.5em;margin-bottom:0.5em;">${safeTitle}</h1><p style="font-size:1.5em;color:#555;">${safeAuthor}</p></body></html>`;
            oebps.file("cover.xhtml", coverXhtml);

            let manifest = `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`;
            let spine = `<itemref idref="cover"/>`;
            let navMap = `<navPoint id="nav_cover" playOrder="0"><navLabel><text>封面</text></navLabel><content src="cover.xhtml"/></navPoint>`;

            chaptersData.forEach((ch, idx) => {
                const chId = `ch${idx + 1}`;
                const filename = `chapter${idx + 1}.xhtml`;
                const safeChapterTitle = Logic.escapeXml(ch.title || `第${idx + 1}章`);
                // 注意这里引入了 ${customCSS}
                const xhtml = `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${safeChapterTitle}</title><style>body{font-family:sans-serif;padding:5%; line-height:1.6;} p {text-indent: 2em; margin: 0.5em 0;} h2{text-align:center;color:#333;border-bottom:1px solid #ccc;padding-bottom:10px;margin-bottom:20px;} .sender-name {font-weight:bold; color:#555; text-indent:0; margin-top:1em;} \n${customCSS}</style></head><body><h2>${safeChapterTitle}</h2>${ch.content}</body></html>`;
                
                manifest += `<item id="${chId}" href="${filename}" media-type="application/xhtml+xml"/>`;
                spine += `<itemref idref="${chId}"/>`;
                navMap += `<navPoint id="nav_${chId}" playOrder="${idx + 1}"><navLabel><text>${safeChapterTitle}</text></navLabel><content src="${filename}"/></navPoint>`;
                oebps.file(filename, xhtml);
            });

            const opf = `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${safeTitle}</dc:title><dc:creator>${safeAuthor}</dc:creator><dc:language>zh-CN</dc:language><dc:identifier id="BookID">${uuid}</dc:identifier></metadata><manifest>${manifest}</manifest><spine toc="ncx">${spine}</spine></package>`;
            oebps.file("content.opf", opf);
            oebps.file("toc.ncx", `<?xml version="1.0" encoding="UTF-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="${uuid}"/></head><docTitle><text>${safeTitle}</text></docTitle><navMap>${navMap}</navMap></ncx>`);

            const content = await zip.generateAsync({ type: "blob" });
            Logic.download(content, `${title}.epub`, "application/epub+zip");
        }
    };

    // === 3. UI ===
    async function showExportUI() {
        try {
            const msgsForTxt = Logic.getProcessedMessages();
            const settings = Logic.loadSettings();
            const currentBookmarks = Logic.getCurrentBookmarks();
            const defaultFilename = Logic.getDefaultFilename();
            const currentMaxId = msgsForTxt.length > 0 ? msgsForTxt[msgsForTxt.length-1].message_id : 0;

            let activeRanges = settings.lastActiveRanges || [];

            const $wrapper = $('<div class="cet-wrapper"></div>');

            const $card = $(`
                <div class="cet-card">
                    <div class="cet-header-group">
                        <div class="cet-header-row">
                            <div class="cet-title"><i class="fa-solid fa-toolbox"></i> 记录导出工具</div>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <div class="cet-count">${msgsForTxt.length} 条消息</div>
                                <div class="cet-close-btn" id="btn-close-popup" title="关闭"><i class="fa-solid fa-xmark"></i></div>
                            </div>
                        </div>
                        <div class="cet-tabs">
                            <div class="cet-tab active" data-tab="tab-nav">导航/搜索</div>
                            <div class="cet-tab" data-tab="tab-txt">文本导出</div>
                            <div class="cet-tab" data-tab="tab-json">数据备份</div>
                        </div>
                    </div>

                    <div class="cet-main-body">
                        <!-- TAB 0: 导航 -->
                        <div class="cet-tab-content active" id="tab-nav">
                            <div class="cet-input-group">
                                <div class="cet-label-row"><span class="cet-label-title">楼层跳转 & 书签</span></div>
                                <div class="cet-input-wrapper">
                                    <input type="number" class="cet-text-input" id="inp-jump-id" placeholder="楼层号 (0-${currentMaxId})" value="${currentMaxId}">
                                    <div class="cet-btn-icon action" id="btn-do-jump" title="跳转"><i class="fa-solid fa-paper-plane"></i></div>
                                    <div class="cet-btn-icon action" id="btn-add-bookmark" title="收藏/取消当前输入的楼层"><i class="fa-solid fa-bookmark"></i></div>
                                </div>
                                <div class="cet-history-area" id="bookmark-area"></div>
                            </div>
                            <div class="cet-divider"></div>
                            <div class="cet-input-group">
                                <div class="cet-label-row"><span class="cet-label-title">关键字搜索</span><span class="cet-label-desc">包含隐藏层</span></div>
                                <div class="cet-input-wrapper">
                                    <input type="text" class="cet-text-input" id="inp-search-tags" placeholder="标签(content) 或 正则(/pat/)...">
                                    <div class="cet-btn-icon magic" id="btn-scan-search-tags" title="扫描文中标签"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
                                    <div class="cet-btn-icon star" id="btn-fav-search" title="收藏夹"><i class="fa-solid fa-star"></i></div>
                                </div>
                                <div class="cet-user-tags-box">
                                    <div class="cet-tags-toolbar">
                                        <span class="cet-toolbar-label">已选标签:</span>
                                        <div class="cet-toolbar-actions">
                                            <div class="cet-btn-icon mini" id="btn-clear-search-tags" title="清空标签"><i class="fa-solid fa-trash-can"></i></div>
                                            <div class="cet-btn-icon mini" id="btn-toggle-del-search" title="橡皮擦模式"><i class="fa-solid fa-eraser"></i></div>
                                        </div>
                                    </div>
                                    <div class="cet-tags-list" id="tag-list-search"></div>
                                </div>
                                <div class="cet-user-tags-box" id="search-detected-area" style="display:none;"></div>
                                <div class="cet-user-tags-box" id="fav-box-search" style="display:none;"></div>
                                <div class="cet-input-wrapper" style="margin-top:2px;">
                                    <input type="text" class="cet-text-input" id="inp-search-key" placeholder="输入搜索关键字...">
                                    <div class="cet-btn-icon action" id="btn-do-search" title="搜索"><i class="fa-solid fa-search"></i></div>
                                </div>
                            </div>
                            <div class="cet-search-results" id="search-results-area" style="display:none;"></div>
                        </div>

                        <!-- TAB 1: 文本导出 - 固定550px高度 -->
                        <div class="cet-tab-content" id="tab-txt">
                            <div class="cet-txt-scroll">
                                <div class="cet-input-group">
                                    <div class="cet-label-row"><span class="cet-label-title">导出文件名</span></div>
                                    <div class="cet-input-wrapper">
                                        <input type="text" class="cet-text-input" id="inp-filename-txt">
                                        <div class="cet-btn-icon" id="btn-clear-filename-txt"><i class="fa-solid fa-trash-can"></i></div>
                                    </div>
                                </div>

                                <div id="range-settings-txt"></div>

                                <div class="cet-input-group">
                                    <div class="cet-label-row"><span class="cet-label-title">正文标签提取</span></div>
                                    <div class="cet-input-wrapper">
                                        <input type="text" class="cet-text-input" id="inp-export-tags" placeholder="留空全部 / 标签 / 正则...">
                                        <div class="cet-btn-icon magic" id="btn-scan-export-tags" title="扫描文中标签"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
                                        <div class="cet-btn-icon star" id="btn-fav-export" title="收藏夹"><i class="fa-solid fa-star"></i></div>
                                    </div>
                                    <div class="cet-user-tags-box">
                                        <div class="cet-tags-toolbar">
                                            <span class="cet-toolbar-label">已选标签:</span>
                                            <div class="cet-toolbar-actions">
                                                <div class="cet-btn-icon mini" id="btn-clear-export-tags" title="清空标签"><i class="fa-solid fa-trash-can"></i></div>
                                                <div class="cet-btn-icon mini" id="btn-toggle-del-export" title="橡皮擦模式"><i class="fa-solid fa-eraser"></i></div>
                                            </div>
                                        </div>
                                        <div class="cet-tags-list" id="tag-list-export"></div>
                                    </div>
                                    <div class="cet-user-tags-box" id="export-detected-area" style="display:none;"></div>
                                    <div class="cet-user-tags-box" id="fav-box-export" style="display:none;"></div>
                                </div>

                                <div class="cet-input-group">
                                    <div class="cet-label-row"><span class="cet-label-title">标签排除</span></div>
                                    <div class="cet-input-wrapper">
                                        <input type="text" class="cet-text-input" id="inp-exclude-tags" placeholder="排除标签 或 正则(/pat/)...">
                                        <div class="cet-btn-icon magic" id="btn-scan-exclude-tags" title="扫描文中标签"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
                                        <div class="cet-btn-icon star" id="btn-fav-exclude" title="收藏夹"><i class="fa-solid fa-star"></i></div>
                                    </div>
                                    <div class="cet-user-tags-box">
                                        <div class="cet-tags-toolbar">
                                            <span class="cet-toolbar-label">已选标签:</span>
                                            <div class="cet-toolbar-actions">
                                                <div class="cet-btn-icon mini" id="btn-clear-exclude-tags" title="清空标签"><i class="fa-solid fa-trash-can"></i></div>
                                                <div class="cet-btn-icon mini" id="btn-toggle-del-exclude" title="橡皮擦模式"><i class="fa-solid fa-eraser"></i></div>
                                            </div>
                                        </div>
                                        <div class="cet-tags-list" id="tag-list-exclude"></div>
                                    </div>
                                    <div class="cet-user-tags-box" id="exclude-detected-area" style="display:none;"></div>
                                    <div class="cet-user-tags-box" id="fav-box-exclude" style="display:none;"></div>
                                </div>

                                <div class="cet-options">
                                    <label class="cet-checkbox-label" title="自动去除代码标签并应用{{user}}等宏规则"><input type="checkbox" id="opt-clean"> 阅读模式 (去除代码)</label>
                                    <label class="cet-checkbox-label" title="仅去除HTML注释，保留 <div> 等标签"><input type="checkbox" id="opt-weak-clean" style="accent-color: #5b8db8;"> 弱清理 (推荐EPUB)</label>
                                    <label class="cet-checkbox-label"><input type="checkbox" id="opt-user"> 包含用户发言</label>
                                    <label class="cet-checkbox-label"><input type="checkbox" id="opt-name"> 显示发送者</label>
                                    <label class="cet-checkbox-label"><input type="checkbox" id="opt-floor"> 显示楼层号</label>
                                    <label class="cet-checkbox-label"><input type="checkbox" id="opt-chapter"> 自动生成章节</label>
                                    <label class="cet-checkbox-label" title="检测缺层或标签包裹不完整"><input type="checkbox" id="opt-check-missing"> 检测错误(缺层/标签/正则)</label>
                                </div>
                                <div class="cet-input-group" style="margin-top: 8px; border-top: 1px solid var(--smart-theme-border-color-1); padding-top: 8px;">
                                    <div class="cet-label-row">
                                        <span class="cet-label-title"><i class="fa-solid fa-book-open"></i> EPUB 分章与排版 (CSS & 正则)</span>
                                        <label class="cet-checkbox-label" style="margin-left:auto; color:#5b8db8;" title="开启后将支持 *斜体*、**加粗** 等原生酒馆 Markdown 渲染"><input type="checkbox" id="opt-parse-md"> 启用 Markdown 渲染</label>
                                    </div>
                                    
                                    <div class="cet-input-wrapper" style="margin-top: 4px; margin-bottom: 6px;">
                                        <span style="font-size: 0.8em; opacity:0.8;">自动分章规则 (每章消息数):</span>
                                        <input type="number" class="cet-text-input" id="inp-epub-split" value="1" style="width: 80px; flex:none; margin-left:8px;" title="每隔多少条对话自动生成新的一章">
                                    </div>

                                    <div style="display: flex; flex-direction: column; gap: 8px;">
                                        <div style="display: flex; flex-direction: column;">
                                            <span style="font-size: 0.75em; opacity: 0.7; margin-bottom: 2px;">自定义 CSS 样式:</span>
                                            <textarea id="inp-epub-css" class="cet-textarea" placeholder="/* 比如写 .st-dialogue { color: blue; } */"></textarea>
                                        </div>
                                        
                                        <div style="display: flex; flex-direction: column;">
                                            <span style="font-size: 0.75em; opacity: 0.7; margin-bottom: 2px;">自定义正则 (格式: /正则/修饰符 === 替换HTML)</span>
                                            <textarea id="inp-epub-regex" class="cet-textarea" style="white-space: pre;" placeholder='/([“«"].*?[”»"])/g === <span class="st-dialogue">$1</span>'></textarea>
                                        </div>
                                    </div>
                                </div>
                                
                            </div>
                        </div>

                        <!-- TAB 2: JSONL -->
                        <div class="cet-tab-content" id="tab-json">
                            <div style="font-size:0.8em;opacity:0.8;background:rgba(0,0,0,0.03);padding:6px;border-radius:6px;line-height:1.4;">
                                <i class="fa-solid fa-info-circle"></i> <b>导出无损 JSON 数据文件</b><br>
                                支持保存指定楼层范围，用于创建剧情分支 (Branching) 或 备份迁移数据。
                            </div>
                            <div class="cet-input-group">
                                <div class="cet-label-row"><span class="cet-label-title">导出文件名</span></div>
                                <div class="cet-input-wrapper">
                                    <input type="text" class="cet-text-input" id="inp-filename-json">
                                    <div class="cet-btn-icon" id="btn-clear-filename-json"><i class="fa-solid fa-trash-can"></i></div>
                                </div>
                            </div>

                            <div id="range-settings-json"></div>
                        </div>

                        <!-- 固定底部按钮区 -->
                        <div class="cet-footer-actions">
                            <div data-for-tab="tab-nav" class="active"></div>
                            <div data-for-tab="tab-txt">
                                <button class="cet-btn txt" id="btn-export-txt"><i class="fa-solid fa-file-lines"></i> 导出 TXT</button>
                                <button class="cet-btn json" id="btn-export-epub"><i class="fa-solid fa-book"></i> 导出 EPUB</button>
                            </div>
                            <div data-for-tab="tab-json">
                                <button class="cet-btn json" id="btn-export-json"><i class="fa-solid fa-file-export"></i> 导出聊天数据</button>
                                <button class="cet-btn import" id="btn-import-json"><i class="fa-solid fa-file-import"></i> 导入聊天数据</button>
                                <input type="file" id="inp-file-json" style="display:none" accept="*">
                            </div>
                        </div>
                    </div>
                </div>
            `);

            $wrapper.append($card);
            let popupInstance = null;

            const saveCurrentState = () => {
                settings.options = {
                    clean: $('#opt-clean').is(':checked'),
                    weakClean: $('#opt-weak-clean').is(':checked'), // <-- 新增这一行
                    user: $('#opt-user').is(':checked'),
                    showName: $('#opt-name').is(':checked'),
                    showFloor: $('#opt-floor').is(':checked'),
                    chapter: $('#opt-chapter').is(':checked'),
                    checkMissing: $('#opt-check-missing').is(':checked'),
                    parseMd: $('#opt-parse-md').is(':checked') // 保存 Markdown 开关
                };
                settings.lastExportTags = $wrapper.find('#inp-export-tags').data('real-value') || "";
                settings.lastSearchTags = $wrapper.find('#inp-search-tags').data('real-value') || "";
                settings.lastExcludeTags = $wrapper.find('#inp-exclude-tags').data('real-value') || "";
                settings.lastActiveRanges = activeRanges;
                settings.customCSS = $('#inp-epub-css').val();     // 保存 CSS
                settings.customRegex = $('#inp-epub-regex').val(); // 保存自定义正则
                Logic.saveSettings(settings);
            };

            const normalizeActiveRanges = (ranges) => {
                if (!Array.isArray(ranges)) return [];
                return ranges
                    .map(r => ({ start: Number(r?.start), end: Number(r?.end) }))
                    .filter(r => Number.isFinite(r.start) && Number.isFinite(r.end) && r.start <= r.end);
            };

            const resolveMessageId = (msg, idx) => {
                const rawId = msg?.message_id !== undefined ? msg.message_id : (msg?.id !== undefined ? msg.id : idx);
                const idNum = Number(rawId);
                return Number.isFinite(idNum) ? idNum : null;
            };

            const renderRangeSettings = (containerId) => {
                const $container = $wrapper.find(containerId);
                const html = `
                    <div class="cet-input-group">
                        <div class="cet-label-row"><span class="cet-label-title">导出范围 (可选)</span><span class="cet-label-desc">留空则导出全部</span></div>
                        <div class="cet-input-wrapper">
                            <input type="number" class="cet-text-input inp-range-start" placeholder="起始(默认0)">
                            <span style="opacity:0.5">-</span>
                            <input type="number" class="cet-text-input inp-range-end" placeholder="结束(默认Max)">
                            <div class="cet-btn-icon add btn-add-range" title="添加范围"><i class="fa-solid fa-plus"></i></div>
                        </div>
                        <div class="cet-input-wrapper" style="margin-top:2px;">
                            <select class="cet-select sel-bm-start"><option value="">选择书签(起)...</option></select>
                            <select class="cet-select sel-bm-end"><option value="">选择书签(止)...</option></select>
                        </div>
                        <div class="cet-history-area range-list-area" style="margin-top:2px;"></div>
                    </div>
                `;
                $container.html(html);
            };

            renderRangeSettings('#range-settings-txt');
            renderRangeSettings('#range-settings-json');

            const updateRangeUI = () => {
                const bms = Logic.getCurrentBookmarks();
                let html = '<option value="">选择书签...</option>';
                bms.forEach(b => html += `<option value="${b.id}">#${b.id} ${_.escape(b.name)}</option>`);
                $wrapper.find('.sel-bm-start').html(html.replace('选择书签...', '选择书签(起)...'));
                $wrapper.find('.sel-bm-end').html(html.replace('选择书签...', '选择书签(止)...'));

                $wrapper.find('.range-list-area').empty();
                if (activeRanges.length > 0) {
                    activeRanges.forEach((r, idx) => {
                        const $chip = $(`<div class="cet-chip active-tag"><span>[${r.start} - ${r.end}]</span><div class="cet-chip-del"><i class="fa-solid fa-times"></i></div></div>`);
                        $chip.find('.cet-chip-del').on('click', () => {
                            activeRanges.splice(idx, 1);
                            updateRangeUI();
                            saveCurrentState();
                        });
                        $wrapper.find('.range-list-area').append($chip.clone(true));
                    });
                }
            };
            updateRangeUI();

            $wrapper.on('change', '.sel-bm-start', function() { $(this).closest('.cet-input-group').find('.inp-range-start').val(this.value); });
            $wrapper.on('change', '.sel-bm-end', function() { $(this).closest('.cet-input-group').find('.inp-range-end').val(this.value); });

            $wrapper.on('click', '.btn-add-range', function() {
                const $grp = $(this).closest('.cet-input-group');
                let startRaw = $grp.find('.inp-range-start').val();
                let endRaw = $grp.find('.inp-range-end').val();

                let start = startRaw === "" ? 0 : parseInt(startRaw);
                let end = endRaw === "" ? currentMaxId : parseInt(endRaw);

                if (isNaN(start) || isNaN(end)) return toastr.warning("请输入有效的楼层号");
                if (start > end) return toastr.warning("起始楼层不能大于结束楼层");

                activeRanges.push({ start, end });
                updateRangeUI();
                saveCurrentState();
                $grp.find('.inp-range-start, .inp-range-end').val('');
                $grp.find('select').val('');
            });

            class TagInputManager {
                constructor(inputId, containerId, initialValue, toggleBtnId) {
                    this.$input = $wrapper.find(inputId);
                    this.$container = $wrapper.find(containerId);
                    this.$toggleBtn = $wrapper.find(toggleBtnId);
                    this.$box = this.$container.closest('.cet-user-tags-box');
                    this.isDeleteMode = false;
                    this.isAddTargetMode = false;
                    this.onAddTarget = null;
                    this.tags = initialValue ? initialValue.split(/[,，]/).map(t => t.trim()).filter(t => t) : [];

                    this.render(true);
                    this.bindEvents();
                }

                setAddTargetMode(isActive, callback) {
                    this.isAddTargetMode = isActive;
                    this.onAddTarget = callback;
                    this.render(true);
                }

                render(skipSave = false) {
                    if (this.tags.length > 0) {
                         this.$box.show();
                    } else {
                         this.$box.hide();
                    }

                    this.$container.empty();
                    this.tags.forEach((tag, index) => {
                        let className = 'cet-chip active-tag';
                        if (this.isAddTargetMode) className += ' add-target';
                        else if (this.isDeleteMode) className += ' delete-mode';

                        const $chip = $(`<div class="${className}"><span>${_.escape(tag)}</span></div>`);
                        $chip.on('click', () => {
                            if (this.isAddTargetMode) {
                                if (this.onAddTarget) this.onAddTarget(tag);
                            } else if (this.isDeleteMode) {
                                this.tags.splice(index, 1);
                                this.render();
                            }
                        });
                        this.$container.append($chip);
                    });
                    this.updateState(skipSave);
                }

                add(tag) {
                    tag = tag.replace(/[,，]+$/, '').trim();
                    if (!tag) return;
                    if (!this.tags.includes(tag)) {
                        this.tags.push(tag);
                        this.render();
                    }
                    this.updateState();
                }

                updateState(skipSave = false) {
                    const currentInput = this.$input.val().trim();
                    const combined = [...this.tags];
                    if (currentInput && !combined.includes(currentInput)) {
                        combined.push(currentInput);
                    }
                    this.$input.data('real-value', combined.join(', '));
                    if (!skipSave) saveCurrentState();
                }

                clear() {
                    this.tags = [];
                    this.render();
                    this.$input.val('');
                    this.updateState();
                }

                bindEvents() {
                    this.$input.on('keydown', (e) => {
                        if (e.which === 32 || e.which === 13) {
                            e.preventDefault();
                            const val = this.$input.val().trim();
                            if (val) {
                                this.add(val);
                                this.$input.val('');
                            }
                        }
                    });
                    this.$input.on('input', () => this.updateState());

                    this.$toggleBtn.on('click', () => {
                        this.isDeleteMode = !this.isDeleteMode;
                        if(this.isDeleteMode) this.$toggleBtn.addClass('delete-active');
                        else this.$toggleBtn.removeClass('delete-active');
                        this.render();
                    });
                }
            }

            const searchTagMgr = new TagInputManager('#inp-search-tags', '#tag-list-search', settings.lastSearchTags, '#btn-toggle-del-search');
            const exportTagMgr = new TagInputManager('#inp-export-tags', '#tag-list-export', settings.lastExportTags, '#btn-toggle-del-export');
            const excludeTagMgr = new TagInputManager('#inp-exclude-tags', '#tag-list-exclude', settings.lastExcludeTags, '#btn-toggle-del-exclude');

            $wrapper.find('#inp-search-tags, #inp-export-tags, #inp-exclude-tags').val('');

            $wrapper.find('#inp-filename-txt, #inp-filename-json').val(defaultFilename);

            $wrapper.find('#opt-clean').prop('checked', settings.options.clean !== false && settings.options.weakClean !== true);
            $wrapper.find('#opt-weak-clean').prop('checked', settings.options.weakClean === true);
            // 加入互斥逻辑
            $wrapper.find('#opt-weak-clean').on('change', function() {
                if ($(this).is(':checked')) $wrapper.find('#opt-clean').prop('checked', false);
                saveCurrentState();
            });
            $wrapper.find('#opt-clean').on('change', function() {
                if ($(this).is(':checked')) $wrapper.find('#opt-weak-clean').prop('checked', false);
                saveCurrentState();
            });
            $wrapper.find('#opt-user').prop('checked', settings.options.user);
            $wrapper.find('#opt-name').prop('checked', settings.options.showName);
            $wrapper.find('#opt-floor').prop('checked', settings.options.showFloor);
            $wrapper.find('#opt-chapter').prop('checked', settings.options.chapter);
            $wrapper.find('#opt-check-missing').prop('checked', settings.options.checkMissing !== false);
            // 默认勾选 Markdown 渲染
            $wrapper.find('#opt-parse-md').prop('checked', settings.options.parseMd !== false);
            // 预设默认的 CSS 和正则匹配方案
            const defaultCSS = "/* 语言描写 (各种引号包裹) */\n.st-dialogue { font-weight: bold; color: #2c3e50; }";
            const defaultRegex = "/([“«\\\"].*?[”»\\\"])/g === <span class=\"st-dialogue\">$1</span>";
            $wrapper.find('#inp-epub-css').val(settings.customCSS !== undefined ? settings.customCSS : defaultCSS);
            $wrapper.find('#inp-epub-regex').val(settings.customRegex !== undefined ? settings.customRegex : defaultRegex);

            // Tab 切换逻辑
            $wrapper.find('.cet-tab').on('click', function() {
                const target = $(this).data('tab');
                $wrapper.find('.cet-tab').removeClass('active'); $(this).addClass('active');
                $wrapper.find('.cet-tab-content').removeClass('active'); $wrapper.find('#' + target).addClass('active');
                $wrapper.find('.cet-footer-actions > div').removeClass('active');
                $wrapper.find(`.cet-footer-actions > div[data-for-tab="${target}"]`).addClass('active');
            });

            let isBlockMode = false;
            let isAddTargetMode = false;
            let onAddTargetCallback = null;

            const renderDetectedTags = (areaId, manager, tags) => {
                const $area = $wrapper.find(areaId).empty().show();
                const $toolbar = $('<div class="cet-tags-toolbar"></div>');
                $toolbar.append('<span class="cet-toolbar-label"><i class="fa-solid fa-wand-magic-sparkles"></i> 扫描结果</span>');

                const $actions = $('<div class="cet-toolbar-actions"></div>');

                const $refreshBtn = $(`<div class="cet-btn-icon mini" title="恢复标签"><i class="fa-solid fa-rotate-right"></i></div>`);
                $refreshBtn.on('click', () => {
                    Logic.clearIgnoredTags(); handleScan(areaId, manager, true);
                });

                const $blockBtn = $(`<div class="cet-btn-icon mini" title="橡皮擦模式"><i class="fa-solid fa-eraser"></i></div>`);
                if(isBlockMode) $blockBtn.addClass('delete-active');

                const toggleBlockMode = () => {
                    isBlockMode = !isBlockMode;
                    if(isBlockMode) {
                        $blockBtn.addClass('delete-active');
                        $area.find('.cet-chip.detected').addClass('delete-mode');
                    } else {
                        $blockBtn.removeClass('delete-active');
                        $area.find('.cet-chip.detected').removeClass('delete-mode');
                    }
                };
                $blockBtn.on('click', toggleBlockMode);

                $actions.append($refreshBtn).append($blockBtn);
                $toolbar.append($actions);
                $area.append($toolbar);

                const $cloud = $('<div class="cet-tags-list"></div>');
                if (tags.length === 0) { $cloud.append('<span style="font-size:0.8em;opacity:0.5;">未检测到成对标签</span>'); }
                else {
                    tags.forEach(tag => {
                        let className = 'cet-chip detected';
                        if (isAddTargetMode) className += ' add-target';
                        if (isBlockMode) className += ' delete-mode';

                        const $chip = $(`<div class="${className}"><span>${_.escape(tag)}</span></div>`);
                        $chip.on('click', () => {
                            if (isAddTargetMode) {
                                if (onAddTargetCallback) onAddTargetCallback(tag);
                            } else if (isBlockMode) {
                                Logic.ignoreTag(tag); $chip.remove();
                            } else {
                                manager.add(tag);
                            }
                        });
                        $cloud.append($chip);
                    });
                }
                $area.append($cloud);
            };

            const handleScan = (areaId, manager, force = false) => {
                const $area = $wrapper.find(areaId);
                const $magicBtn = $wrapper.find(areaId).prev().prev().find('.magic');
                if ($area.is(':visible') && !force) {
                    $area.hide();
                    $magicBtn.removeClass('active');
                    return;
                }
                isBlockMode = false;
                const original = $magicBtn.html();
                if(!force) $magicBtn.html('<i class="fa-solid fa-spinner fa-spin"></i>');
                setTimeout(() => {
                    const tags = Logic.scanUsedTags();
                    renderDetectedTags(areaId, manager, tags);
                    if(!force) $magicBtn.html(original);
                    $magicBtn.addClass('active');
                }, 200);
            };

            $wrapper.find('#btn-scan-search-tags').on('click', () => handleScan('#search-detected-area', searchTagMgr));
            $wrapper.find('#btn-scan-export-tags').on('click', () => handleScan('#export-detected-area', exportTagMgr));
            $wrapper.find('#btn-scan-exclude-tags').on('click', () => handleScan('#exclude-detected-area', excludeTagMgr));

            // === 收藏夹功能 ===
            const setupFavorites = (starBtnId, boxId, manager, scanAreaId) => {
                const $btn = $wrapper.find(starBtnId);
                const $box = $wrapper.find(boxId);
                let isFavDeleteMode = false;
                let isFavAddMode = false;
                let isFavNameMode = false;

                const showRenameDialog = (oldName, oldAlias, onConfirm) => {
                    const result = prompt(`设置标签 [${oldName}] 的别名:\n(清空并确认可恢复原名)`, oldAlias || "");
                    if (result !== null) {
                        onConfirm(result.trim());
                    }
                };

                const renderFavs = () => {
                    $box.empty();
                    const $toolbar = $('<div class="cet-tags-toolbar"></div>');
                    $toolbar.append('<span class="cet-toolbar-label"><i class="fa-solid fa-star"></i> 收藏夹</span>');
                    const $actions = $('<div class="cet-toolbar-actions"></div>');

                    const $nameBtn = $(`<div class="cet-btn-icon mini" title="命名模式"><i class="fa-solid fa-pen"></i></div>`);
                    if (isFavNameMode) $nameBtn.addClass('naming-active');
                    $nameBtn.on('click', () => {
                         isFavNameMode = !isFavNameMode;
                         if(isFavNameMode) { isFavDeleteMode = false; isFavAddMode = false; }
                         renderFavs();
                    });

                    const $addBtn = $(`<div class="cet-btn-icon mini" title="添加模式"><i class="fa-solid fa-plus"></i></div>`);
                    if (isFavAddMode) $addBtn.addClass('add-active');
                    $addBtn.on('click', () => {
                        isFavAddMode = !isFavAddMode;
                        if(isFavAddMode) { isFavDeleteMode = false; isFavNameMode = false; }
                        manager.setAddTargetMode(isFavAddMode, (tag) => {
                             if (!settings.favorites.includes(tag)) {
                                 settings.favorites.push(tag);
                                 Logic.saveSettings(settings);
                                 renderFavs();
                             }
                        });
                        const $scanArea = $wrapper.find(scanAreaId);
                        if ($scanArea.is(':visible')) {
                            isAddTargetMode = isFavAddMode;
                            onAddTargetCallback = (tag) => {
                                 if (!settings.favorites.includes(tag)) {
                                     settings.favorites.push(tag);
                                     Logic.saveSettings(settings);
                                     renderFavs();
                                 }
                            };
                            const tags = Logic.scanUsedTags();
                            renderDetectedTags(scanAreaId, manager, tags);
                        }
                        renderFavs();
                    });

                    const $delBtn = $(`<div class="cet-btn-icon mini" title="橡皮擦模式"><i class="fa-solid fa-eraser"></i></div>`);
                    if (isFavDeleteMode) $delBtn.addClass('delete-active');
                    $delBtn.on('click', () => {
                        isFavDeleteMode = !isFavDeleteMode;
                        if(isFavDeleteMode) { isFavAddMode = false; isFavNameMode = false; }
                        renderFavs();
                    });

                    $actions.append($nameBtn).append($addBtn).append($delBtn);
                    $toolbar.append($actions);
                    $box.append($toolbar);

                    const $list = $('<div class="cet-tags-list"></div>');
                    const favs = settings.favorites || [];
                    if (favs.length === 0) {
                         $list.append('<span style="font-size:0.8em;opacity:0.5;padding:4px;">暂无收藏标签</span>');
                    } else {
                         favs.forEach((tag, idx) => {
                             const alias = settings.favoriteAliases ? settings.favoriteAliases[tag] : null;
                             const displayName = alias || tag;
                             const displayTitle = alias ? `${tag}` : "";

                             const $chip = $(`<div class="cet-chip favorite" title="${_.escape(displayTitle)}"><span>${_.escape(displayName)}</span></div>`);
                             if (isFavDeleteMode) $chip.addClass('delete-mode');
                             if (isFavNameMode) $chip.addClass('naming-mode');

                             $chip.on('click', () => {
                                 if (isFavNameMode) {
                                     showRenameDialog(tag, alias, (newAlias) => {
                                         if (!settings.favoriteAliases) settings.favoriteAliases = {};
                                         if (newAlias) settings.favoriteAliases[tag] = newAlias;
                                         else delete settings.favoriteAliases[tag];
                                         Logic.saveSettings(settings);
                                         renderFavs();
                                     });
                                 } else if (isFavDeleteMode) {
                                     settings.favorites.splice(idx, 1);
                                     if(settings.favoriteAliases) delete settings.favoriteAliases[tag];
                                     Logic.saveSettings(settings);
                                     renderFavs();
                                 } else {
                                     manager.add(tag);
                                 }
                             });
                             $list.append($chip);
                         });
                    }
                    $box.append($list);
                };

                $btn.on('click', () => {
                    if ($box.is(':visible')) {
                        $box.hide();
                        $btn.removeClass('active');
                        if (isFavAddMode) {
                             isFavAddMode = false;
                             manager.setAddTargetMode(false, null);
                             isAddTargetMode = false;
                             if ($wrapper.find(scanAreaId).is(':visible')) {
                                const tags = Logic.scanUsedTags();
                                renderDetectedTags(scanAreaId, manager, tags);
                             }
                        }
                        isFavDeleteMode = false;
                        isFavNameMode = false;
                    } else {
                        renderFavs();
                        $box.show();
                        $btn.addClass('active');
                    }
                });
            };

            setupFavorites('#btn-fav-search', '#fav-box-search', searchTagMgr, '#search-detected-area');
            setupFavorites('#btn-fav-export', '#fav-box-export', exportTagMgr, '#export-detected-area');
            setupFavorites('#btn-fav-exclude', '#fav-box-exclude', excludeTagMgr, '#exclude-detected-area');

            $wrapper.find('#btn-clear-export-tags').on('click', () => { exportTagMgr.clear(); });
            $wrapper.find('#btn-clear-search-tags').on('click', () => { searchTagMgr.clear(); });
            $wrapper.find('#btn-clear-exclude-tags').on('click', () => { excludeTagMgr.clear(); });

            const closePopup = () => {
                if(popupInstance && popupInstance.completeAffirmative) popupInstance.completeAffirmative();
                else { $('.swal2-container').remove(); }
            };

            $wrapper.find('#btn-close-popup').on('click', closePopup);

            $wrapper.find('#btn-do-jump').on('click', function() {
                const $btn = $(this); const id = parseInt($wrapper.find('#inp-jump-id').val());
                if (isNaN(id)) return;
                const originalIcon = $btn.html(); $btn.html('<i class="fa-solid fa-spinner fa-spin"></i>');
                setTimeout(() => { if (Logic.jumpTo(id)) { closePopup(); } setTimeout(() => $btn.html(originalIcon), 1000); }, 50);
            });

            const renderBookmarks = () => {
                const $area = $wrapper.find('#bookmark-area').empty();
                const bookmarks = Logic.getCurrentBookmarks();
                if (bookmarks.length === 0) { $area.append('<span style="font-size:0.8em;opacity:0.5;padding:4px;">当前对话暂无书签</span>'); return; }
                bookmarks.forEach((bm, idx) => {
                    const $chip = $(`<div class="cet-chip bookmark" title="点击跳转至 #${bm.id}"><span class="cet-chip-text"><i class="fa-solid fa-bookmark" style="font-size:0.8em"></i> ${_.escape(bm.name)} (#${bm.id})</span><div class="cet-chip-del"><i class="fa-solid fa-times"></i></div></div>`);
                    $chip.find('.cet-chip-text').on('click', function(e) {
                        e.stopPropagation();
                        const $thisChip = $(this).closest('.cet-chip');
                        const $icon = $(this).find('i');
                        const originalClass = $icon.attr('class');

                        $thisChip.addClass('loading');
                        $icon.attr('class', 'fa-solid fa-spinner fa-spin');

                        setTimeout(() => {
                            if(Logic.jumpTo(bm.id)) closePopup();
                            setTimeout(() => {
                                $thisChip.removeClass('loading');
                                $icon.attr('class', originalClass);
                            }, 1000);
                        }, 50);
                    });
                    $chip.find('.cet-chip-del').on('click', (e) => {
                        e.stopPropagation(); bookmarks.splice(idx, 1); Logic.saveCurrentBookmarks(bookmarks); renderBookmarks(); Logic.syncAllStates(bm.id, false); updateRangeUI();
                    });
                    $area.append($chip);
                });
            };
            renderBookmarks();
            $wrapper.on('cet-bookmark-update', () => { renderBookmarks(); updateRangeUI(); });

            $wrapper.find('#btn-add-bookmark').on('click', () => {
                const id = $wrapper.find('#inp-jump-id').val(); if (id === "") return toastr.warning("请输入楼层号");
                Logic.toggleBookmark(id);
            });

            $wrapper.find('#btn-do-search').on('click', () => {
                const key = $wrapper.find('#inp-search-key').val().trim(); const tags = settings.lastSearchTags;
                if (!key) return toastr.warning("请输入搜索关键字");
                Logic.updateTagHistory(tags);
                const $resArea = $wrapper.find('#search-results-area').empty().show();
                $resArea.append('<div style="padding:10px;text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> 搜索中...</div>');

                setTimeout(() => {
                    const results = Logic.searchMessages(key, tags);
                    $resArea.empty();
                    if (results.length === 0) {
                        $resArea.append('<div style="padding:10px;text-align:center;opacity:0.6;">未找到匹配内容</div>');
                    } else {
                        $resArea.append(`<div style="padding:5px 10px;font-size:0.8em;opacity:0.6;background:rgba(0,0,0,0.05);">找到 ${results.length} 条结果 (点击跳转)</div>`);
                        results.forEach(res => {
                            const hlSnippet = _.escape(res.snippet).replace(new RegExp(Logic.escapeRegex(key), 'gi'), match => `<span class="cet-res-match">${match}</span>`);
                            const $item = $(`<div class="cet-search-item"><div class="cet-res-meta"><span>${_.escape(res.name)}</span><span>#${res.id}</span></div><div class="cet-res-content">${hlSnippet}</div></div>`);

                            $item.on('click', function() {
                                const $this = $(this);
                                $this.addClass('loading');
                                $this.html('<div style="text-align:center;padding:5px;"><i class="fa-solid fa-spinner fa-spin"></i> 跳转中...</div>');
                                setTimeout(() => { if(Logic.jumpTo(res.id)) closePopup(); }, 50);
                            });
                            $resArea.append($item);
                        });

                        const $collapseWrapper = $('<div class="cet-collapse-wrapper"></div>');
                        const $collapseBtn = $(`<div class="cet-collapse-btn"><i class="fa-solid fa-chevron-up"></i> 收起搜索结果</div>`);
                        $collapseBtn.on('click', () => { $resArea.empty().hide(); });
                        $collapseWrapper.append($collapseBtn);
                        $resArea.append($collapseWrapper);
                    }
                }, 50);
            });
            $wrapper.find('#inp-search-key').on('keypress', (e) => { if(e.which === 13) $wrapper.find('#btn-do-search').click(); });

            $wrapper.find('#btn-clear-filename-txt').on('click', () => $wrapper.find('#inp-filename-txt').val(''));
            $wrapper.find('#btn-clear-filename-json').on('click', () => $wrapper.find('#inp-filename-json').val(''));
            $wrapper.find('.cet-options input').on('change', saveCurrentState);

            $wrapper.find('#btn-export-txt').on('click', () => {
                try {
                    saveCurrentState();

                    // 重新获取最新消息数据
                    const freshMsgs = Logic.getProcessedMessages();
                    const normalizedRanges = normalizeActiveRanges(activeRanges);

                    const tagInput = settings.lastExportTags;
                    const excludeInput = settings.lastExcludeTags;

                    const isFullExport = (tagInput === "");
                    const isCleanMode = settings.options.clean;
                    const isWeakCleanMode = settings.options.weakClean; // <-- 新增
                    const includeUser = settings.options.user;
                    const opts = settings.options;

                    const allErrors = [];

                    if (opts.checkMissing) {
                        const valRx = (str, src) => {
                            if (!str) return [];
                            const errs = [];
                            str.split(/[,，]/).forEach(t => {
                                t = t.trim();
                                if (t.startsWith('/')) {
                                    if (!/^\/(.+)\/[a-z]*$/.test(t)) {
                                        errs.push(src + ' [' + t + '] 格式错误。\n正确格式如: /abc/gi (需包含前后斜杠)');
                                    } else {
                                        try {
                                            const m = t.match(/^\/(.+)\/([a-z]*)$/);
                                            new RegExp(m[1], m[2]);
                                        } catch (e) {
                                            errs.push(src + ' [' + t + '] 语法错误: ' + e.message);
                                        }
                                    }
                                }
                            });
                            return errs;
                        };
                        const rErrs = [...valRx(tagInput, '提取'), ...valRx(excludeInput, '排除')];
                        if (rErrs.length > 0) allErrors.push(...rErrs);
                    }

                    Logic.updateTagHistory(tagInput);

                    let filename = $wrapper.find('#inp-filename-txt').val().trim() || "export";
                    filename = filename.replace(/\.(json|jsonl)$/i, '');
                    if (!filename.toLowerCase().endsWith('.txt')) filename += '.txt';

                    const parsedExportTags = isFullExport ? { rules: {}, regexes: [], tagNames: [] } : Logic.parseTagInput(tagInput);
                    const extractRules = parsedExportTags.rules;
                    const extractTagsList = parsedExportTags.tagNames;
                    const extractRegexList = parsedExportTags.regexes;
                    const excludeTagsList = Logic.getConfiguredTagNames(excludeInput, { includeBeforeRules: false });

                    let extractRegex = null;
                    if (extractTagsList.length > 0) {
                        const safeTags = extractTagsList.map(t => Logic.escapeRegex(t));
                        const pattern = `<(${safeTags.join('|')})>([\\s\\S]*?)<\\/\\1>`;
                        extractRegex = new RegExp(pattern, 'gi');
                    }

                    const excludePatterns = Logic.buildExcludePatterns(excludeInput);

                    let exportText = "", count = 0;
                    const processContent = (content) => {
                        if (isCleanMode) return Logic.cleanMessage(content);
                        if (isWeakCleanMode) return Logic.weakCleanMessage(content); // <-- 优先触发弱清理
                        return content.trim();
                    };

                    let missingFloors = [];
                    const checkMessages = [];
                    const allCheckTags = [...new Set([...extractTagsList, ...excludeTagsList])];

                    freshMsgs.forEach((msg, idx) => {
                        const msgId = resolveMessageId(msg, idx);

                        if (normalizedRanges.length > 0) {
                            if (msgId === null) return;
                            const inRange = normalizedRanges.some(r => msgId >= r.start && msgId <= r.end);
                            if (!inRange) return;
                        }

                        const isUser = msg.role === 'user' || msg.is_user;
                        const isZero = msgId === 0;

                        // 用户过滤逻辑
                        if (isUser && !isZero) {
                            if (!includeUser) return;
                        }

                        let metaParts = [];
                        if (opts.showFloor && msgId !== null) metaParts.push(`#${msgId}`);
                        let prefix = "";
                        if (metaParts.length > 0) prefix += `[${metaParts.join('|')}] `;
                        if (opts.showName) prefix += `【${msg.name}】`;
                        prefix = prefix.trim();

                        // ★★★ 核心修复：先对整条消息执行排除，再做提取 ★★★
                        let msgText = msg.message;
                        if (excludePatterns.length > 0) {
                            msgText = Logic.applyExcludePatterns(msgText, excludePatterns);
                        }
                        if (opts.checkMissing && allCheckTags.length > 0 && msgText) {
                            checkMessages.push({ id: msgId, text: msgText });
                        }

                        let contentParts = [];

                        if (isZero) {
                            // 第0楼：也应用排除
                            contentParts.push(msgText);
                        } else if (isFullExport) {
                            contentParts.push(msgText);
                        } else {
                            let extractedBlocks = [];
                            if (extractRegex) {
                                const matches = [...msgText.matchAll(extractRegex)];
                                matches.forEach(m => {
                                    const tagName = m[1];
                                    const content = m[2];
                                    const rules = extractRules[tagName];
                                    let keep = true;
                                    if (rules !== null && rules !== undefined) {
                                        keep = rules.some(kw => {
                                             const re = new RegExp(`<summary[^>]*>[\\s\\S]*?${Logic.escapeRegex(kw)}[\\s\\S]*?<\\/summary>`, 'i');
                                             return re.test(content);
                                        });
                                    }
                                    if (keep) extractedBlocks.push({ idx: m.index, content: content });
                                });
                                if (matches.length === 0 && extractRegexList.length === 0 && msgText && msgText.trim()) {
                                    const lowerMsg = msgText.toLowerCase();
                                    if (extractTagsList.some(t => lowerMsg.includes('<' + t.toLowerCase()))) {
                                        if (msgId !== null) missingFloors.push(msgId);
                                    }
                                }
                            }
                            extractRegexList.forEach(rx => {
                                const matches = [...msgText.matchAll(rx)];
                                matches.forEach(m => {
                                    extractedBlocks.push({ idx: m.index, content: (m.length > 1 ? m[1] : m[0]) });
                                });
                            });

                            extractedBlocks.sort((a,b) => a.idx - b.idx);
                            contentParts = extractedBlocks.map(b => b.content);
                        }

                        let finalMsgBlock = "";

                        contentParts.forEach(part => {
                            let t = processContent(part);

                            if (t.trim()) {
                                if (finalMsgBlock) finalMsgBlock += "\n\n";
                                finalMsgBlock += t;
                            }
                        });

                        if (finalMsgBlock) {
                            if (opts.chapter) {
                                const cnNum = (n) => { const c=['零','一','二','三','四','五','六','七','八','九']; if(n<10)return c[n]; if(n<20)return '十'+(n%10?c[n%10]:''); const t=Math.floor(n/10); const u=n%10; return c[t]+'十'+(u?c[u]:''); return n; };
                                exportText += ` 第${cnNum(count+1)}章\n\n`;
                            }
                            if (prefix) exportText += prefix + "\n";
                            exportText += finalMsgBlock + "\n\n--------------------\n\n";
                            count++;
                        }
                    });

                    if (opts.checkMissing) {
                        allErrors.push(...Logic.getTagBalanceIssues(checkMessages, allCheckTags));
                        if (missingFloors.length > 0) {
                            allErrors.push(`检测到以下楼层提取后内容为空 (可能是提取标签设置错误):\n#${Logic.formatRanges(missingFloors)}`);
                        }

                        if (allErrors.length > 0) {
                            alert("⚠️ 导出已终止！检测到以下错误：\n\n" + allErrors.join("\n\n") + "\n\n请修正后再导出，或取消勾选【检测错误】忽略。");
                            return;
                        }
                    }

                    if (count === 0) toastr.warning("未匹配到内容");
                    else if (Logic.download(exportText, filename)) toastr.success(`已导出 TXT (${count}条)`);
                } catch (err) {
                    toastr.error("导出出错: " + err.message);
                    console.error(err);
                }
            });
            // === 新增：导出 EPUB 的点击事件 ===
            $wrapper.find('#btn-export-epub').on('click', async function() {
                try {
                    saveCurrentState();
                    const freshMsgs = Logic.getProcessedMessages();
                    const normalizedRanges = normalizeActiveRanges(activeRanges);
                    const tagInput = settings.lastExportTags;
                    const excludeInput = settings.lastExcludeTags;
                    const isFullExport = (tagInput === "");
                    const isCleanMode = settings.options.clean;
                    const isWeakCleanMode = settings.options.weakClean; // <-- 新增
                    const includeUser = settings.options.user;
                    const opts = settings.options;
                    const allErrors = [];

                    // 1. 语法检查
                    if (opts.checkMissing) {
                        const valRx = (str, src) => {
                            if (!str) return [];
                            const errs = [];
                            str.split(/[,，]/).forEach(t => {
                                t = t.trim();
                                if (t.startsWith('/')) {
                                    if (!/^\/(.+)\/[a-z]*$/.test(t)) errs.push(src + ' [' + t + '] 格式错误');
                                    else { try { const m = t.match(/^\/(.+)\/([a-z]*)$/); new RegExp(m[1], m[2]); } catch (e) { errs.push(src + ' [' + t + '] 语法错误'); } }
                                }
                            });
                            return errs;
                        };
                        const rErrs = [...valRx(tagInput, '提取'), ...valRx(excludeInput, '排除')];
                        if (rErrs.length > 0) allErrors.push(...rErrs);
                    }

                    Logic.updateTagHistory(tagInput);
                    let filename = $wrapper.find('#inp-filename-txt').val().trim() || "export";
                    filename = filename.replace(/\.(txt|json|jsonl)$/i, '');

                    const parsedExportTags = isFullExport ? { rules: {}, regexes: [], tagNames: [] } : Logic.parseTagInput(tagInput);
                    const extractRules = parsedExportTags.rules;
                    const extractTagsList = parsedExportTags.tagNames;
                    const extractRegexList = parsedExportTags.regexes;
                    const excludeTagsList = Logic.getConfiguredTagNames(excludeInput, { includeBeforeRules: false });
                    let extractRegex = extractTagsList.length > 0 ? new RegExp(`<(${extractTagsList.map(t => Logic.escapeRegex(t)).join('|')})>([\\s\\S]*?)<\\/\\1>`, 'gi') : null;
                    const excludePatterns = Logic.buildExcludePatterns(excludeInput);
                    const processContent = (content) => {
                        if (isCleanMode) return Logic.cleanMessage(content);
                        if (isWeakCleanMode) return Logic.weakCleanMessage(content); // <-- 优先触发弱清理
                        return content.trim();
                    };

                    let missingFloors = [];
                    const checkMessages = [];
                    const allCheckTags = [...new Set([...extractTagsList, ...excludeTagsList])];
                    let extractedMessages = []; // 用于保存处理好的富文本段落

                    // 2. 遍历消息处理
                    freshMsgs.forEach((msg, idx) => {
                        const msgId = resolveMessageId(msg, idx);
                        if (normalizedRanges.length > 0 && msgId !== null && !normalizedRanges.some(r => msgId >= r.start && msgId <= r.end)) return;
                        
                        const isUser = msg.role === 'user' || msg.is_user;
                        if (isUser && !includeUser) return;

                        let prefix = "";
                        let metaParts = [];
                        if (opts.showFloor && msgId !== null) metaParts.push(`#${msgId}`);
                        if (metaParts.length > 0) prefix += `[${metaParts.join('|')}] `;
                        if (opts.showName) prefix += `【${msg.name}】`;
                        prefix = prefix.trim();

                        let msgText = excludePatterns.length > 0 ? Logic.applyExcludePatterns(msg.message, excludePatterns) : msg.message;
                        if (opts.checkMissing && allCheckTags.length > 0 && msgText) {
                            checkMessages.push({ id: msgId, text: msgText });
                        }
                        let contentParts = [];

                        if (isFullExport) {
                            contentParts.push(msgText);
                        } else {
                            let extractedBlocks = [];
                            if (extractRegex) {
                                const matches = [...msgText.matchAll(extractRegex)];
                                matches.forEach(m => {
                                    let keep = true;
                                    if (extractRules[m[1]]) keep = extractRules[m[1]].some(kw => new RegExp(`<summary[^>]*>[\\s\\S]*?${Logic.escapeRegex(kw)}[\\s\\S]*?<\\/summary>`, 'i').test(m[2]));
                                    if (keep) extractedBlocks.push({ idx: m.index, content: m[2] });
                                });
                                if (matches.length === 0 && extractRegexList.length === 0 && msgText.trim() && extractTagsList.some(t => msgText.toLowerCase().includes('<' + t.toLowerCase()))) {
                                    if (msgId !== null) missingFloors.push(msgId);
                                }
                            }
                            extractRegexList.forEach(rx => { [...msgText.matchAll(rx)].forEach(m => extractedBlocks.push({ idx: m.index, content: (m.length > 1 ? m[1] : m[0]) })); });
                            extractedBlocks.sort((a,b) => a.idx - b.idx);
                            contentParts = extractedBlocks.map(b => b.content);
                        }

                        let finalMsgBlock = "";
                        contentParts.forEach(part => {
                            let t = processContent(part);
                            if (t.trim()) finalMsgBlock += (finalMsgBlock ? "\n\n" : "") + t;
                        });

                        if (finalMsgBlock) {
                            extractedMessages.push({ prefix: prefix, text: finalMsgBlock });
                        }
                    });

                    // 3. 错误抛出
                    if (opts.checkMissing) allErrors.push(...Logic.getTagBalanceIssues(checkMessages, allCheckTags));
                    if (opts.checkMissing && missingFloors.length > 0) allErrors.push(`以下楼层提取后为空:\n#${Logic.formatRanges(missingFloors)}`);
                    if (opts.checkMissing && allErrors.length > 0) return alert("⚠️ EPUB 导出终止！检测到错误：\n\n" + allErrors.join("\n\n"));
                    if (extractedMessages.length === 0) return toastr.warning("未匹配到内容，无法生成电子书");

                    // 4. 解析设置与动态加载引擎
                    const $btn = $(this);
                    const oriHtml = $btn.html();
                    let splitCount = parseInt($wrapper.find('#inp-epub-split').val());
                    if (isNaN(splitCount) || splitCount < 1) splitCount = 20;

                    const doParseMd = opts.parseMd !== false;
                    const userCSS = settings.customCSS || "";
                    
                    // 将用户在多行文本框填写的正则转换为执行规则
                    const customRegexRules = [];
                    const regexLines = (settings.customRegex || "").split('\n');
                    regexLines.forEach((line, idx) => {
                        const trimmedLine = line.trim();
                        if (!trimmedLine) return;

                        const parts = trimmedLine.split('===');
                        if (parts.length !== 2) {
                            allErrors.push(`自定义正则第${idx + 1}行格式错误：${trimmedLine}\n正确格式: /pattern/flags === 替换HTML`);
                            return;
                        }

                        const match = parts[0].trim().match(/^\/(.+)\/([a-z]*)$/);
                        if (!match) {
                            allErrors.push(`自定义正则第${idx + 1}行格式错误：${trimmedLine}\n正确格式: /pattern/flags === 替换HTML`);
                            return;
                        }

                        try {
                            customRegexRules.push({ re: new RegExp(match[1], match[2]), rep: parts[1].trim() });
                        } catch(e) {
                            allErrors.push(`自定义正则第${idx + 1}行语法错误：${e.message}`);
                        }
                    });

                    if (allErrors.length > 0) return alert("⚠️ EPUB 导出终止！检测到错误：\n\n" + allErrors.join("\n\n"));

                    // 动态加载 Markdown 引擎 (Showdown.js)
                    let converter = null;
                    if (doParseMd) {
                        if (!window.showdown) {
                            $btn.html('<i class="fa-solid fa-spinner fa-spin"></i> 加载渲染引擎...').prop('disabled', true);
                            try {
                                await new Promise((res, rej) => {
                                    const script = document.createElement('script');
                                    script.src = "https://unpkg.com/showdown@2.1.0/dist/showdown.min.js";
                                    script.onload = res; script.onerror = rej;
                                    document.head.appendChild(script);
                                });
                            } catch(e) { 
                                $btn.html(oriHtml).prop('disabled', false);
                                return toastr.error('Markdown 引擎加载失败，请检查网络'); 
                            }
                        }
                        // 开启下划线、删除线、表情支持
                        converter = new showdown.Converter({ simpleLineBreaks: true, strikethrough: true, emoji: true, literalMidWordUnderscores: true });
                    }

                    // 5. 分章排版处理
                    $btn.html('<i class="fa-solid fa-spinner fa-spin"></i> 渲染排版中...').prop('disabled', true);
                    let chaptersData = [];
                    let currentChapterHtml = "";
                    let chapterIndex = 1;
                    const cnNum = (n) => { const c=['零','一','二','三','四','五','六','七','八','九']; if(n<10)return c[n]; if(n<20)return '十'+(n%10?c[n%10]:''); const t=Math.floor(n/10); const u=n%10; return c[t]+'十'+(u?c[u]:''); };

                    extractedMessages.forEach((msgObj, idx) => {
                        if (msgObj.prefix) currentChapterHtml += `<div class="sender-name">${_.escape(msgObj.prefix)}</div>`;
                        
                        // 【优化核心】：直接处理整段消息，绝不提前拆分换行
                        let processedText = msgObj.text;
                        
                        // 第一步：如果不用 Markdown，必须在正则前先对文本进行安全转义
                        if (!doParseMd) processedText = _.escape(processedText);

                        // 第二步：全局应用正则！此时 <msg>...</msg> 即便跨越了十几个换行，也能完美匹配
                        customRegexRules.forEach(rule => {
                            processedText = processedText.replace(rule.re, rule.rep);
                        });

                        // 第三步：交给 Markdown 引擎或手动分段
                        if (doParseMd && converter) {
                            // 引擎会自动处理 \n 为分段 <p>，并且忽略已注入的 HTML 气泡
                            currentChapterHtml += converter.makeHtml(processedText);
                        } else {
                            // 手动按回车划分段落
                            const paras = processedText.split('\n').filter(p => p.trim());
                            paras.forEach(p => { currentChapterHtml += `<p>${p}</p>`; });
                        }

                        if ((idx + 1) % splitCount === 0 || idx === extractedMessages.length - 1) {
                            chaptersData.push({ title: `第${cnNum(chapterIndex)}章`, content: currentChapterHtml });
                            chapterIndex++;
                            currentChapterHtml = "";
                        }
                    });

                    // 6. 封包生成电子书
                    const author = window.SillyTavern.name1 || "SillyTavern User";
                    $btn.html('<i class="fa-solid fa-spinner fa-spin"></i> 打包文件中...');
                    await Logic.exportEPUB(filename, author, chaptersData, userCSS);
                    
                    $btn.html(oriHtml).prop('disabled', false);
                    toastr.success(`已生成小说，共 ${chaptersData.length} 章`);

                } catch (err) {
                    toastr.error("EPUB 导出出错: " + err.message);
                    console.error(err);
                }
            });


            $wrapper.find('#btn-export-json').on('click', () => {
                const rawChat = Logic.getRawMessagesForBackup(); if (!rawChat || rawChat.length === 0) return toastr.warning("没有消息");
                const normalizedRanges = normalizeActiveRanges(activeRanges);
                let filename = $wrapper.find('#inp-filename-json').val().trim() || "chat_backup"; filename = filename.replace(/\.txt$/i, ''); if (!filename.toLowerCase().endsWith('.jsonl')) filename += '.jsonl';
                const header = Logic.createHeader(); const lines = [header];
                let count = 0;
                rawChat.forEach((msg, idx) => {
                    const item = JSON.parse(JSON.stringify(msg));
                    const mId = resolveMessageId(item, idx);
                    if (normalizedRanges.length > 0) {
                        if (mId === null) return;
                        const inRange = normalizedRanges.some(r => mId >= r.start && mId <= r.end);
                        if (!inRange) return;
                    }
                    if (item.message !== undefined && item.mes === undefined) item.mes = item.message; lines.push(JSON.stringify(item)); count++;
                });
                if (count === 0) return toastr.warning("范围内无消息");
                if (Logic.download(lines.join('\n'), filename, 'application/json')) toastr.success(`已导出聊天数据 (${count}条)`);
            });

            const $fileInput = $wrapper.find('#inp-file-json');
            $wrapper.find('#btn-import-json').on('click', () => $fileInput.click());
            $fileInput.on('change', (e) => {
                const file = e.target.files[0]; if (!file) return;
                const $btnImport = $wrapper.find('#btn-import-json'); const originalText = $btnImport.html();
                $btnImport.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> 正在处理...');
                setTimeout(() => {
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                        try {
                            const content = event.target.result; let jsonlString = "";
                            try {
                                const jsonArray = JSON.parse(content);
                                if (Array.isArray(jsonArray)) { const header = Logic.createHeader(); const lines = [header]; jsonArray.forEach(item => { if (item.message !== undefined && item.mes === undefined) item.mes = item.message; lines.push(JSON.stringify(item)); }); jsonlString = lines.join('\n'); } else throw new Error("Not array");
                            } catch {
                                const lines = content.split('\n').filter(l => l.trim());
                                if (lines.length > 0) { const first = JSON.parse(lines[0]); if (first.mes !== undefined || first.message !== undefined) { const header = Logic.createHeader(); jsonlString = header + '\n' + content; } else jsonlString = content; }
                            }
                            const importName = file.name.replace(/\.(json|jsonl|txt)$/i, '') + "_imported";
                            if (window.TavernHelper && window.TavernHelper.importRawChat) { await window.TavernHelper.importRawChat(importName, jsonlString); toastr.success(`导入成功!`); } else toastr.error("TavernHelper 接口不可用");
                        } catch (err) { toastr.error("导入失败: " + err.message); } finally { $btnImport.prop('disabled', false).html(originalText); $fileInput.val(''); }
                    };
                    reader.readAsText(file);
                }, 50);
            });

            if (window.SillyTavern && SillyTavern.Popup) {
                popupInstance = new SillyTavern.Popup($wrapper, SillyTavern.POPUP_TYPE.TEXT, "", { okButton: false });
                popupInstance.show();
            }
            else {
                const popupFunc = SillyTavern.callGenericPopup || window.callGenericPopup;
                popupFunc($wrapper, 1, "", { okButton: false });
            }
        } catch (e) { toastr.error("UI加载失败"); console.error(e); }
    }

    function registerMagicWandEntry() {
        const ENTRY_ID = 'cet-export-ui-magic-entry';
        const ENTRY_TEXT = '聊天记录导出工具';

        const bindClick = ($entry) => {
            $entry.off('click.cetExportUI').on('click.cetExportUI', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showExportUI();
            });
        };

        const tryInject = () => {
            const selectors = ['#extensionsMenu', '#extensions-menu', '#extensions-dropdown'];
            let $menu = $();
            for (const sel of selectors) {
                const $candidate = $(sel);
                if ($candidate.length) {
                    $menu = $candidate.first();
                    break;
                }
            }
            if (!$menu.length) return false;

            const $exists = $menu.find(`#${ENTRY_ID}`);
            if ($exists.length) {
                bindClick($exists);
                return true;
            }

            const $entry = $(`
                <a id="${ENTRY_ID}" class="list-group-item" href="javascript:void(0)">
                    <i class="fa-solid fa-file-export"></i>
                    <span>${ENTRY_TEXT}</span>
                </a>
            `);
            bindClick($entry);
            $menu.append($entry);
            return true;
        };

        tryInject();
        setTimeout(tryInject, 800);
        setTimeout(tryInject, 2000);

        if (typeof MutationObserver !== 'undefined') {
            const mo = new MutationObserver(() => {
                tryInject();
            });
            mo.observe(document.body, { childList: true, subtree: true });
        }
    }

    // === 4. 注册与监听 ===
    const register = () => {
        if (window.SillyTavern && SillyTavern.SlashCommandParser) {
            SillyTavern.SlashCommandParser.addCommandObject(SillyTavern.SlashCommand.fromProps({ name: 'export-ui', callback: showExportUI, helpString: '打开聊天记录工具箱' }));
        }
        registerMagicWandEntry();

        const observerCallback = (mutationsList) => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            if ($(node).hasClass('mes')) Logic.injectBookmarkButtonToMessage(node);
                            else $(node).find('.mes').each(function() { Logic.injectBookmarkButtonToMessage(this); });
                        }
                    });
                }
            }
        };
        const chatContainer = document.querySelector('#chat');
        if (chatContainer) {
            const observer = new MutationObserver(observerCallback);
            observer.observe(chatContainer, { childList: true, subtree: true });
        }

        if (window.eventOn && typeof tavern_events !== 'undefined') {
            window.eventOn(tavern_events.CHAT_CHANGED, () => {
                $(`.${BTN_CLASS}`).remove();
                setTimeout(() => Logic.scanAndInject(), 500);
            });
            Logic.scanAndInject();
        }
    };
    setTimeout(register, 1000);
})();
