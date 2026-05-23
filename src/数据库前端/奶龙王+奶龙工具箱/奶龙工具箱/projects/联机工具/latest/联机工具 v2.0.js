import { createPinia, defineStore } from 'https://cdn.jsdelivr.net/npm/pinia/+esm'; // 引入 Pinia

// JS-Slash-Runner 的 srcdoc iframe 内没有全局 Vue/jQuery，必须从父窗口获取
const parentWindow = (() => {
    try { return window.top || window.parent || window; } catch (e) { return window; }
})();
const o = parentWindow.Vue || window.Vue;
if (!o) {
    console.error('[联机Mod] 无法获取 Vue 实例，脚本终止');
    throw new Error('Vue not found');
}
const $ = parentWindow.jQuery || window.jQuery;
const { ref, reactive, computed, watch, shallowRef, triggerRef, onMounted, onUnmounted, nextTick, defineComponent, createApp } = o;

const _trackedEventOffs = [];
let _eventOffMissingWarned = false;

const onEventTracked = (eventName, handler) => {
    const eventOnFn =
        (typeof eventOn === 'function' && eventOn) ||
        (typeof parentWindow.eventOn === 'function' && parentWindow.eventOn) ||
        null;

    const eventOffFn =
        (typeof eventOff === 'function' && eventOff) ||
        (typeof parentWindow.eventOff === 'function' && parentWindow.eventOff) ||
        null;

    if (!eventOnFn) {
        console.error('[联机Mod] eventOn 不可用，事件未注册:', eventName);
        return;
    }

    let off = null;

    try {
        const ret = eventOnFn(eventName, handler);
        if (typeof ret === 'function') {
            off = ret;
        }
    } catch (e) {
        console.error('[联机Mod] 事件注册失败:', eventName, e);
        return;
    }

    if (!off && eventOffFn) {
        off = () => {
            try { eventOffFn(eventName, handler); } catch (e) {}
        };
    }

    if (off) {
        _trackedEventOffs.push(off);
    } else if (!_eventOffMissingWarned) {
        _eventOffMissingWarned = true;
        console.info('[联机Mod] 当前环境未提供可追踪 eventOff；事件可用，但热重载时将依赖页面卸载清理。');
    }
};

const offAllTrackedEvents = () => {
    while (_trackedEventOffs.length > 0) {
        const off = _trackedEventOffs.pop();
        try { off?.(); } catch (e) {}
    }
};

// ==========================================
// 1. CSS样式注入
// ==========================================
const PLUGIN_DISPLAY_VERSION = 'v2.0.0+20260304.02';
const PLUGIN_VERSION_TOKEN = PLUGIN_DISPLAY_VERSION.replace(/[^a-zA-Z0-9_-]/g, '_');

const STORE_ID = `multiplayer_${PLUGIN_VERSION_TOKEN}`;
const STYLE_ID = `multiplayer-mod-styles-${PLUGIN_VERSION_TOKEN}`;
const STYLE_VERSION = PLUGIN_DISPLAY_VERSION;
const CONTAINER_ID = `st-multiplayer-container-${PLUGIN_VERSION_TOKEN}`;

const VARIABLE_MODE_STORAGE_KEY = `st_multiplayer_variable_mode_${PLUGIN_VERSION_TOKEN}`;
const LEGACY_VARIABLE_MODE_STORAGE_KEY = 'st_multiplayer_variable_mode';
const SETTINGS_STORAGE_KEY = `st_multiplayer_settings_${PLUGIN_VERSION_TOKEN}`;
const LEGACY_SETTINGS_STORAGE_KEY = 'st_multiplayer_settings';

const PERSONA_PROMPT_ID = `mp_personas_${PLUGIN_VERSION_TOKEN}`;
const ACU_REGISTERED_CALLBACK_KEY = `__st_multiplayer_acu_registered_callback_${PLUGIN_VERSION_TOKEN}__`;
const ACU_CALLBACK_REGISTERED_FLAG_KEY = `__st_multiplayer_acu_callback_registered_${PLUGIN_VERSION_TOKEN}__`;
const RUNTIME_SINGLETON_KEY = '__st_multiplayer_runtime_singleton__';
const CONTAINER_ID_PREFIX = 'st-multiplayer-container-';
const STYLE_ID_PREFIX = 'multiplayer-mod-styles-';
const LEGACY_CONTAINER_IDS = Object.freeze([
    'st-multiplayer-container-v2',
    'st-multiplayer-container'
]);
const LEGACY_STYLE_IDS = Object.freeze([
    'multiplayer-mod-styles'
]);
const SCRIPT_INSTANCE_ID = `${PLUGIN_VERSION_TOKEN}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const removeLegacyMountArtifacts = (doc) => {
    if (!doc) return;

    LEGACY_CONTAINER_IDS.forEach((id) => {
        const el = doc.getElementById(id);
        if (!el) return;
        try { el.remove(); } catch (e) {}
    });

    LEGACY_STYLE_IDS.forEach((id) => {
        const el = doc.getElementById(id);
        if (!el) return;
        try { el.remove(); } catch (e) {}
    });
};

const injectStyles = () => {
    const targetDoc = parentWindow.document;
    const prevStyle = targetDoc.getElementById(STYLE_ID);
    if (prevStyle) prevStyle.remove();

    const style = targetDoc.createElement('style');
    style.id = STYLE_ID;
    style.setAttribute('data-style-version', STYLE_VERSION);
    style.innerHTML = `
/* ===== Panel ===== */
.multiplayer-panel{
  position:fixed;
  z-index:99999;
  --mp-panel-viewport-gap:18px;
  --mp-home-max-height:480px;
  --mp-room-max-height:620px;
  --mp-current-max-height:var(--mp-home-max-height);
  width:340px;
  min-height:44px;
  height:min(var(--mp-current-max-height), calc(100vh - var(--mp-panel-viewport-gap)));
  max-height:calc(100vh - var(--mp-panel-viewport-gap));
  display:flex;
  flex-direction:column;
  overflow:hidden;

  font-family:"gg sans","Noto Sans","Helvetica Neue",Helvetica,Arial,"PingFang SC","Microsoft YaHei","Heiti SC",sans-serif!important;
  font-size:13px;
  font-weight:500;
  color:#B8B8B8!important;

  background:#323339;
  border:1px solid rgba(50,51,57,1);
  border-radius:10px;
  box-shadow:0 12px 30px rgba(49,51,57,.62);
  transition:border-color .24s ease, opacity .16s ease;
}
.multiplayer-panel.mode-home{
  --mp-current-max-height:var(--mp-home-max-height);
}
.multiplayer-panel.mode-room{
  --mp-current-max-height:var(--mp-room-max-height);
}
.multiplayer-panel.minimized{
  width:44px;
  min-width:44px;
  height:44px;
  min-height:44px;
  max-height:44px;
  border-radius:50%;
}
.multiplayer-panel.minimized .panel-header{
  height:44px;
  padding:0;
  justify-content:center;
  border-bottom:none;
}
.multiplayer-panel.minimized .header-left{
  flex:none;
  width:100%;
  justify-content:center;
  gap:0;
}
.multiplayer-panel.minimized .title,
.multiplayer-panel.minimized .header-actions{
  display:none!important;
}
.multiplayer-panel.dragging{opacity:.94;cursor:grabbing;}
.multiplayer-panel.resizing{opacity:.96;cursor:nwse-resize;}

.panel-resize-handle{
  position:absolute;
  right:0;
  bottom:0;
  width:16px;
  height:16px;
  cursor:nwse-resize;
  touch-action:none;
  z-index:4;
}
.panel-resize-handle::before{
  content:"";
  position:absolute;
  right:3px;
  bottom:3px;
  width:9px;
  height:9px;
  border-right:2px solid rgba(184,184,184,.88);
  border-bottom:2px solid rgba(184,184,184,.88);
  opacity:.82;
}
.multiplayer-panel.minimized .panel-resize-handle{display:none;}

/* ===== Header ===== */
.panel-header{
  height:44px;
  padding:0 8px 0 16px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  background:rgba(57,58,65,.86);
  border-bottom:1px solid rgba(50,51,57,.92);
  cursor:grab;
  touch-action:none;
  user-select:none;
}
.header-left,.header-actions{display:flex;align-items:center;}
.header-left{flex:1;min-width:0;gap:8px;}
.header-actions{
  margin-left:10px;
  gap:2px;
}
.title{
  flex:1;min-width:0;
  height:44px;
  display:flex;align-items:center;
  font-size:16px;
  font-weight:700;
  color:#F9FAFF;
  letter-spacing:.1px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}

/* ===== Content Containers ===== */
.panel-content{
  flex:1;
  display:flex;
  flex-direction:column;
  gap:12px;
  padding:14px;
  overflow:auto;
}
.settings-section,.online-rooms-section,.create-room-section,.username-section{
  display:flex;flex-direction:column;
}
.settings-section,.online-rooms-section{gap:14px;}
.create-room-section{
  margin-top:8px;
  padding-top:12px;
  border-top:1px solid rgba(50,51,57,.92);
  gap:8px;
}
.username-section{
  gap:8px;
  padding-bottom:12px;
  border-bottom:1px solid rgba(50,51,57,.92);
}
.setting-row{
  display:flex;
  align-items:center;
  gap:8px;
  min-height:34px;
}
.setting-row label{
  min-width:60px;
  height:34px;
  display:inline-flex;
  align-items:center;
}
.section-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
}
.join-room-section{
  display:grid;
  grid-template-columns:minmax(0,1fr) 74px 74px;
  align-items:center;
  gap:8px;
  margin-top:4px;
}
.create-room-options,.button-group,.chat-input-area{display:flex;gap:8px;}
.button-group{margin-top:4px;}
.input-submit-area{
  display:flex;flex-direction:column;gap:8px;
  padding:12px;
  border:1px solid rgba(50,51,57,.95);
  border-radius:8px;
  background:rgba(57,58,65,.72);
}
.sync-buttons-row{
  display:grid;
  grid-template-columns:repeat(4, minmax(0, 1fr));
  gap:8px;
  margin-bottom:4px;
}
.mp-sync-actions-column{
  display:flex;
  flex-direction:column;
  gap:8px;
  margin-top:6px;
}
.room-controls{
  display:flex;
  justify-content:flex-end;
}
.leave-room-btn{
  flex:0 0 auto;
  min-width:98px;
}

/* ===== Inputs ===== */
.multiplayer-panel .input-field,
.multiplayer-panel .settings-input,
.multiplayer-panel .chat-input,
.multiplayer-panel .input-textarea{
  box-sizing:border-box;
  border:1px solid rgba(50,51,57,.98)!important;
  border-radius:8px!important;
  background:#393A41!important;
  color:#B8B8B8!important;
  -webkit-text-fill-color:#B8B8B8!important;
  outline:none;
  font-family:"gg sans","Noto Sans","Helvetica Neue",Helvetica,Arial,"PingFang SC","Microsoft YaHei","Heiti SC",sans-serif;
  font-size:13px;
  font-weight:500;
  line-height:1.45;
  padding:7px 12px;
  transition:border-color .16s ease, background .16s ease, box-shadow .16s ease;
}
.multiplayer-panel .input-field,
.multiplayer-panel .settings-input,
.multiplayer-panel .chat-input{height:34px;}
.multiplayer-panel .input-field{flex:1;}
.multiplayer-panel .input-field:focus,
.multiplayer-panel .settings-input:focus,
.multiplayer-panel .chat-input:focus,
.multiplayer-panel .input-textarea:focus{
  border-color:#323339!important;
  box-shadow:0 0 0 2px rgba(98,110,240,.20);
  background:#3D3E47!important;
}
.input-field.medium{min-width:128px;max-width:176px;}
.input-field.small{max-width:86px;}
.input-field.tiny{max-width:72px;}
.input-textarea{
  width:100%;
  min-height:84px;
  resize:vertical;
}
.settings-input{
  width:100%;
  appearance:none;
  -webkit-appearance:none;
}
input[type="number"].settings-input{background:#393A41!important;}
.join-room-section .input-field{min-width:0;max-width:100%;}
.chat-input{flex:1;}

/* ===== Buttons ===== */
.icon-btn,.refresh-btn,.action-btn,.send-btn,.sync-history-btn,.transfer-leading-btn{
  transition:all .16s ease;
  font-family:"gg sans","Noto Sans","Helvetica Neue",Helvetica,Arial,"PingFang SC","Microsoft YaHei","Heiti SC",sans-serif;
}
.icon-btn{
  width:28px;
  height:28px;
  border:none;
  border-radius:8px;
  background:transparent!important;
  color:#B8B8B8!important;
  cursor:pointer;
}
.refresh-btn{
  width:32px;
  height:32px;
  border:1px solid rgba(50,51,57,.95);
  border-radius:8px;
  background:#393A41!important;
  color:#B8B8B8!important;
  cursor:pointer;
}
.icon-btn:hover{
  background:rgba(249,250,255,.08)!important;
  color:#F9FAFF!important;
}
.refresh-btn:hover:not(:disabled){
  border-color:rgba(50,51,57,1);
  background:#444654!important;
  color:#F9FAFF!important;
}
.icon-btn.danger-icon:hover{
  background:rgba(212,48,48,.14)!important;
  color:#D43030!important;
}

.action-btn,.send-btn{
  border-radius:8px;
  border:1px solid transparent;
  cursor:pointer;
  min-height:34px;
}
.action-btn{
  flex:1;
  min-width:72px;
  padding:0 12px;
  font-size:13px;
  font-weight:500;
  color:#F9FAFF;
}
.action-btn.primary,.send-btn{
  background:#4E5ADF;
  border-color:#626EF0;
  color:#F9FAFF;
}
.action-btn.primary:hover:not(:disabled),.send-btn:hover:not(:disabled){
  background:#5A66EA;
  border-color:#6D78F4;
}
.action-btn.secondary{
  background:#393A41;
  border-color:rgba(50,51,57,1);
  color:#B8B8B8;
}
.action-btn.secondary:hover:not(:disabled){
  color:#F9FAFF;
  border-color:#626EF0;
  background:#444654;
}

.create-room-section .action-btn{
  min-height:38px;
  font-size:13px;
  padding:0 12px;
}
.join-room-section .action-btn{
  min-width:74px;
  padding:0 8px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  white-space:nowrap;
}
.join-room-section .join-btn-icon.fa-solid{font-size:14px;line-height:1;}
.join-room-section .join-btn-label{line-height:1;overflow:hidden;text-overflow:ellipsis;}

.send-btn{
  min-width:46px;
  padding:0 12px;
  font-size:13px;
  font-weight:500;
}
.sync-history-btn{
  display:flex;
  align-items:center;
  justify-content:center;
  width:100%;
  padding:6px 10px;
  border-radius:8px;
  border:1px solid #626EF0;
  background:#4E5ADF;
  color:#F9FAFF;
  cursor:pointer;
  font-size:12px;
  font-weight:400;
}
.sync-history-btn:hover{
  background:#5A66EA;
  border-color:#6D78F4;
}
.transfer-leading-btn{
  width:16px;
  min-width:16px;
  height:16px;
  padding:0;
  border:none;
  border-radius:50%;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  background:transparent;
  color:#E8BE61;
  font-size:11px;
  cursor:pointer;
}
.transfer-leading-btn:hover{
  color:#FFE3A6;
  background:rgba(232,190,97,.20);
}
.action-btn:disabled,.send-btn:disabled,.refresh-btn:disabled{opacity:.45;cursor:not-allowed;}

/* ===== Scrollbars ===== */
.panel-content,.settings-modal-body,.chat-logs,.room-list,.pending-inputs,.debug-logs{
  scrollbar-width:thin;
  scrollbar-color:#7C7C82 transparent!important;
}
.panel-content::-webkit-scrollbar,.settings-modal-body::-webkit-scrollbar,.chat-logs::-webkit-scrollbar,.room-list::-webkit-scrollbar,.pending-inputs::-webkit-scrollbar,.debug-logs::-webkit-scrollbar{
  width:6px;
  height:6px;
}
.panel-content::-webkit-scrollbar-thumb,.settings-modal-body::-webkit-scrollbar-thumb,.chat-logs::-webkit-scrollbar-thumb,.room-list::-webkit-scrollbar-thumb,.pending-inputs::-webkit-scrollbar-thumb,.debug-logs::-webkit-scrollbar-thumb{
  background:#7C7C82!important;
  border-radius:999px;
}
.panel-content::-webkit-scrollbar-button,
.settings-modal-body::-webkit-scrollbar-button,
.chat-logs::-webkit-scrollbar-button,
.room-list::-webkit-scrollbar-button,
.pending-inputs::-webkit-scrollbar-button,
.debug-logs::-webkit-scrollbar-button{
  display:none;
  width:0;
  height:0;
}

/* ===== Typo Hierarchy ===== */
.section-title{
  margin-bottom:4px;
  font-size:15px; /* 标题 > 正文 */
  font-weight:700;
  letter-spacing:.2px;
  color:#F9FAFF;
  text-transform:none;
}
.setting-row label,.room-meta,.empty-rooms,.host-badge,.all-submitted,.pending-input-item,.empty-inputs,.hint,.preview-label,.preview-text,.sync-history-btn{
  font-family:"gg sans","Noto Sans","Helvetica Neue",Helvetica,Arial,"PingFang SC","Microsoft YaHei","Heiti SC",sans-serif;
  font-size:12px;
  font-weight:400;
}
.hint{opacity:.84;color:#A9ADBB;}
.icon-btn.fa-solid,.refresh-btn.fa-solid,.join-btn-icon.fa-solid,.transfer-leading-btn.fa-solid,.user-leading-icon.fa-solid,.send-btn.fa-solid,.sync-history-btn.fa-solid,.action-btn.fa-solid,.section-title.fa-solid{
  font-family:"Font Awesome 6 Free","Font Awesome 5 Free"!important;
  font-weight:900!important;
  font-size:14px;
  line-height:1;
}

/* ===== Status ===== */
.discord-status-icon{
  width:22px;
  min-width:22px;
  height:22px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border-radius:50%;
  color:#8F93A3;
  font-size:18px;
  line-height:1;
  transition:color .16s ease, filter .16s ease;
}
.discord-status-icon.fa-brands{
  font-family:"Font Awesome 6 Brands","Font Awesome 5 Brands","Font Awesome 6 Free"!important;
  font-weight:400!important;
}
.discord-status-icon.minimized{
  width:22px;
  min-width:22px;
  height:22px;
  font-size:18px;
}
.discord-status-icon.state-online{
  color:#59C98A!important;
  filter:drop-shadow(0 0 6px rgba(89,201,138,.58));
}
.discord-status-icon.state-warning{
  color:#E8BE61!important;
  animation:mp-pulse 1s infinite;
}
.discord-status-icon.state-offline{
  color:#8F93A3!important;
}
.top-status-line{
  display:flex;
  align-items:center;
  gap:8px;
  min-height:30px;
  padding:6px 10px;
  border:1px solid rgba(50,51,57,.95);
  border-radius:8px;
  background:rgba(57,58,65,.72);
}
.top-status-line .fa-solid{opacity:.92;}
.top-status-line .top-status-text{
  flex:1;
  min-width:0;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.top-status-line.level-milestone{border-color:#59C98A;}
.top-status-line.level-error{
  border-color:#D43030;
  color:#F38F8F;
}

/* ===== Room List ===== */
.room-list{
  display:flex;flex-direction:column;gap:8px;
  max-height:190px;
  overflow-y:auto;
}
.room-item,.empty-rooms{
  border-radius:8px;
  background:rgba(57,58,65,.72);
}
.room-item{
  border:1px solid rgba(50,51,57,.95);
  padding:10px 12px;
  cursor:pointer;
}
.room-item:hover{
  border-color:rgba(50,51,57,.80);
  background:#3A3D49;
}
.room-item.selected{
  border-color:rgba(50,51,57,1);
  background:rgba(98,110,240,.14);
}
.room-info,.room-meta{
  display:flex;align-items:center;gap:8px;
}
.room-name{
  color:#F9FAFF;
  font-size:13px;
  font-weight:500;
}
.room-meta{
  margin-top:4px;
  opacity:.95;
}
.empty-rooms{
  padding:20px;
  text-align:center;
  color:#A9ADBB;
}

/* ===== Users (胶囊) ===== */
.user-list,.spectator-list{flex-shrink:0;}
.user-list .section-title,.spectator-list .section-title{margin-bottom:8px;}
.user-items,.spectator-items{display:flex;flex-wrap:wrap;gap:8px;}
.user-item{
  display:inline-flex;
  align-items:center;
  gap:8px;
  min-width:76px;
  max-width:130px;
  height:32px;
  padding:0 12px;
  border-radius:999px;
  border:1px solid rgba(50,51,57,.98);
  background:rgba(57,58,65,.72);
  font-size:12px;
  color:#B8B8B8;
  white-space:nowrap;
  overflow:hidden;
}
.user-item.host{
  background:rgba(232,190,97,.14);
  border-color:rgba(232,190,97,.6);
}
.user-item.submitted{
  background:rgba(89,201,138,.14);
  border-color:rgba(89,201,138,.56);
}
.user-item.spectator-item{
  background:rgba(57,58,65,.72);
  border-color:rgba(50,51,57,.98);
}
.user-leading-icon{
  width:14px;min-width:14px;
  text-align:center;
  font-size:11px;
  opacity:.92;
}
.user-leading-icon.host-crown{color:#E8BE61;opacity:1;}
.user-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;}
.host-badge{margin-left:8px;color:#E8BE61;}
.all-submitted{margin-left:8px;color:#59C98A;}

/* 指定重点文本区域字体 */
.user-item,
.user-name,
.log-item,
.log-from,
.log-content,
.debug-item,
.debug-time,
.pending-input-item,
.input-user,
.input-content{
  font-family:"gg sans","Noto Sans","Helvetica Neue",Helvetica,Arial,"PingFang SC","Microsoft YaHei","Heiti SC",sans-serif!important;
}

/* ===== Logs ===== */
.chat-logs{
  flex:1;
  min-height:110px;
  max-height:180px;
  overflow-y:auto;
  padding:8px;
  border:1px solid rgba(50,51,57,.95);
  border-radius:8px;
  background:rgba(57,58,65,.72)!important;
}
.log-item{
  padding:4px 2px;
  line-height:1.5;
  word-break:break-word;
  color:#B8B8B8;
}
.log-item.chat{color:#B8B8B8!important;}
.log-item.error{color:#F38F8F;}
.log-item.milestone{color:#F9FAFF;}

.chat-logs .log-item{
  display:flex;
  align-items:flex-start;
  gap:4px;
}
.chat-logs .log-from{
  flex-shrink:0;
  margin-right:0;
}
.chat-logs .log-content{
  flex:1;
  min-width:0;
  display:block;
  max-height:6em; /* 约4行（line-height=1.5） */
  overflow-y:auto;
  overflow-x:hidden;
  white-space:pre-wrap;
  line-height:1.5;
}

.log-from{
  margin-right:4px;
  font-weight:500;
  color:#F9FAFF;
}
.log-item.chat .log-from,.log-item.chat .log-content{font-weight:500;}
.empty-logs{
  display:flex;
  align-items:center;
  justify-content:center;
  min-height:72px;
  color:#A9ADBB;
  text-align:center;
}
.debug-panel{flex-shrink:0;}
.mp-debug-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  cursor:pointer;
}
.debug-logs{
  max-height:118px;
  overflow-y:auto;
  padding:8px;
  border:1px solid rgba(50,51,57,.95);
  border-radius:8px;
  background:rgba(57,58,65,.72);
}
.debug-item{
  padding:4px 2px;
  line-height:1.45;
  word-break:break-word;
  color:#B8B8B8;
}
.debug-item.error{color:#F38F8F;}
.debug-item.debug{color:#A9ADBB;}
.debug-item.milestone{color:#F9FAFF;}
.debug-time{margin-right:4px;opacity:.72;}


/* ===== Pending Inputs ===== */
.pending-inputs{
  max-height:130px;
  overflow-y:auto;
  padding:8px;
  border-radius:8px;
  border:1px solid rgba(50,51,57,.95);
  background:rgba(57,58,65,.74);
}
.pending-input-item{
  padding:5px 2px;
  border-bottom:1px solid rgba(50,51,57,.92);
}
.pending-input-item:last-child{border-bottom:none;}
.input-user{
  margin-right:8px;
  font-weight:500;
  color:#79C0FF;
}
.input-content{color:#C6C8D2;}
.empty-inputs{
  padding:12px;
  text-align:center;
  color:#A9ADBB;
}

/* ===== Settings Modal (卡片化) ===== */
.settings-modal,.settings-modal-content{
  width:100%;
  flex:1;min-height:0;
  display:flex;flex-direction:column;
}

.settings-modal{
  position:static!important;
  inset:auto!important;
  height:auto!important;
}

.multiplayer-panel.settings-open .header-actions{
  display:flex!important;
  visibility:visible!important;
  opacity:1!important;
}

.mp-settings-page-overlay{
  position:fixed;
  inset:0;
  z-index:calc(99999 + 1);
  display:flex;
  align-items:center;
  justify-content:center;
  padding:20px;
  background:rgba(0,0,0,.46);
}
.mp-settings-page{
  width:min(860px, calc(100vw - 40px));
  height:min(78vh, 760px);
  display:flex;
  flex-direction:column;
  overflow:hidden;
  border:1px solid rgba(50,51,57,1);
  border-radius:10px;
  background:#323339;
  box-shadow:0 16px 36px rgba(49,51,57,.62);
}
.mp-settings-page-header{
  height:44px;
  padding:0 8px 0 16px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  background:rgba(57,58,65,.86);
  border-bottom:1px solid rgba(50,51,57,.92);
}
.mp-settings-page-title{
  font-size:16px;
  font-weight:700;
  color:#F9FAFF;
  letter-spacing:.1px;
}
.mp-settings-page-body{
  flex:1;
  min-height:0;
  display:flex;
  flex-direction:column;
}
.mp-settings-page-body .settings-modal-content{
  border:none!important;
  border-radius:0;
  background:transparent!important;
}

.settings-modal-content{
  overflow:hidden;
  border:1px solid rgba(50,51,57,1)!important;
  border-radius:0 0 10px 10px;
  background:#323339!important;
}

.settings-tabs{
  display:flex;
  align-items:flex-end;
  gap:18px;
  padding:0 0 8px 0;
  margin-bottom:8px;
  border-bottom:1px solid rgba(124,124,130,.28);
  background:transparent;
}

.settings-tab-btn{
  position:relative;
  height:auto;
  padding:0 2px 8px 2px;
  border:none;
  background:transparent;
  color:#B8B8B8;
  cursor:pointer;
  font-family:"gg sans","Noto Sans","Helvetica Neue",Helvetica,Arial,"PingFang SC","Microsoft YaHei","Heiti SC",sans-serif;
  font-size:15px;
  font-weight:700;
  line-height:1;
}

.settings-tab-btn.active::after{
  content:"";
  position:absolute;
  left:0;
  right:0;
  bottom:-8px;
  height:3px;
  border-radius:999px;
  background:#626EF0;
}


.settings-modal-body{
  flex:1;
  min-height:0;
  overflow:auto;
  padding:14px 16px 18px 16px;
  display:flex;
  flex-direction:column;
  gap:18px;
}

/* 设置页改为平面分组（非卡片） */
.setting-item{
  display:block;
  font-size:13px;
  color:#B8B8B8!important;
  background:transparent;
  border:none;
  border-radius:0;
  padding:0 0 14px 0;
  border-bottom:1px solid rgba(124,124,130,.28);
}
.settings-modal-body .setting-item:last-child{
  border-bottom:none;
  padding-bottom:0;
}
.settings-modal-body .setting-item>label{
  display:block;
  margin-bottom:8px;
  font-family:"gg sans","Noto Sans","Helvetica Neue",Helvetica,Arial,"PingFang SC","Microsoft YaHei","Heiti SC",sans-serif;
  font-size:15px;
  font-weight:500;
  color:#F9FAFF;
}

.settings-modal-body .toggle-label,
.settings-modal-body .toggle-label > span{
  font-family:"gg sans","Noto Sans","Helvetica Neue",Helvetica,Arial,"PingFang SC","Microsoft YaHei","Heiti SC",sans-serif;
  font-size:15px;
  font-weight:500;
  color:#F9FAFF;
}
.preview-box{
  margin-top:8px;
  padding:12px;
  border-radius:8px;
  border:1px solid rgba(50,51,57,.95);
  background:rgba(57,58,65,.78);
}
.preview-label{margin-right:8px;opacity:.92;color:#F9FAFF;}
.preview-text{font-style:normal;color:#B8B8B8;}

.mp-choice-group{
  display:flex;
  flex-direction:column;
  gap:2px;
}
.mp-choice-item{
  display:flex;
  align-items:flex-start;
  gap:10px;
  padding:6px 0;
  cursor:pointer;
  user-select:none;
}
.mp-choice-dot{
  width:16px;
  height:16px;
  margin-top:2px;
  border-radius:50%;
  border:2px solid #6F7482;
  background:transparent;
  position:relative;
  flex-shrink:0;
}

.mp-choice-item.active .mp-choice-dot{
  border-color:#626EF0;
  background:#626EF0;
}

.mp-choice-item.active .mp-choice-dot::after{
  content:"";
  position:absolute;
  left:50%;
  top:50%;
  width:6px;
  height:6px;
  border-radius:50%;
  background:#F9FAFF;
  transform:translate(-50%,-50%);
}
.mp-choice-content{
  min-width:0;
}
.mp-choice-title{
  font-family:"gg sans","Noto Sans","Helvetica Neue",Helvetica,Arial,"PingFang SC","Microsoft YaHei","Heiti SC",sans-serif;
  font-size:15px;
  font-weight:500;
  color:#F9FAFF;
  line-height:1.25;
}
.mp-choice-item.active .mp-choice-title{
  color:#F9FAFF;
}
.mp-choice-desc{
  margin-top:2px;
  font-family:"gg sans","Noto Sans","Helvetica Neue",Helvetica,Arial,"PingFang SC","Microsoft YaHei","Heiti SC",sans-serif;
  font-size:12px;
  color:#A9ADBB;
  line-height:1.35;
}

/* toggle */
.toggle-item{margin-bottom:0;}
.toggle-label{
  display:flex;
  align-items:center;
  gap:14px;
  cursor:pointer;
  font-size:15px;
  font-weight:500;
  color:#F9FAFF;
}
.toggle-switch{
  position:relative;
  display:inline-block;
  width:44px;height:24px;
  border-radius:999px;
  background:#575A67;
  border:1px solid rgba(249,250,255,.20);
}
.toggle-switch::after{
  content:"";
  position:absolute;
  top:2px;left:2px;
  width:18px;height:18px;
  border-radius:50%;
  background:#F9FAFF;
  transition:transform .24s ease;
}
.toggle-switch.active{
  background:#5A66EA!important;
  border-color:#6D78F4;
}
.toggle-switch.active::after{transform:translateX(20px)!important;}

/* util */
@keyframes mp-pulse{0%,100%{opacity:1;}50%{opacity:.52;}}
@keyframes mp-shake{
  0%,100%{transform:translateX(0);}
  20%{transform:translateX(-4px);}
  40%{transform:translateX(4px);}
  60%{transform:translateX(-3px);}
  80%{transform:translateX(3px);}
}
.mp-input-shake{
  border-color:#D43030!important;
  animation:mp-shake .32s ease;
}
.hidden-content{color:#B8B8B8;font-style:italic;}
.mp-spoiler{
  padding:0 6px;
  border-radius:8px;
  cursor:pointer;user-select:none;
  color:transparent;
  background:#5D606C;
}
.mp-spoiler:hover{background:#6A6E7C;}
.mp-spoiler.revealed{
  color:inherit;
  cursor:text;
  user-select:auto;
  background:transparent;
}

/* helper */
.mp-fa-gap{margin-right:6px;}
.mp-spectator-header{display:flex;align-items:center;justify-content:space-between;cursor:pointer;}
.mp-mt-1{margin-top:4px;}
.mp-mt-2{margin-top:8px;}
.mp-mb-1{margin-bottom:4px;}
.mp-input-narrow{width:96px!important;}

/* ===== Mobile 缩放（整体缩小一圈） ===== */
@media (max-width: 768px), (hover: none) and (pointer: coarse){
/* ===== Panel ===== */
.multiplayer-panel{
  --mp-panel-viewport-gap:12px;
  --mp-home-max-height:500px;
  --mp-room-max-height:540px;
  width:300px;
  min-height:40px;
  height:min(var(--mp-current-max-height), calc(100vh - var(--mp-panel-viewport-gap)));
  max-height:calc(100vh - var(--mp-panel-viewport-gap));
  font-size:12px;
}

.multiplayer-panel.minimized{width:40px;min-width:40px;height:40px;min-height:40px;max-height:40px}

.multiplayer-panel.minimized .panel-header{height:40px;padding:0}
.multiplayer-panel.minimized .panel-resize-handle{display:none}

/* ===== Header ===== */
.panel-header{height:40px;padding:0 8px 0 14px}

.header-left{gap:6px}

.title{height:40px;font-size:15px}

/* ===== Content Containers ===== */
.panel-content{gap:10px;padding:12px}

.settings-section,.online-rooms-section{gap:12px}

.create-room-section{margin-top:6px;padding-top:10px;gap:6px}

.username-section{gap:6px;padding-bottom:10px}

.setting-row{gap:6px;min-height:30px}

.setting-row label{height:30px}

.join-room-section{gap:6px}

.create-room-options,.button-group,.chat-input-area{gap:6px}

.input-submit-area{gap:6px;padding:10px}

.sync-buttons-row{gap:6px}
.mp-sync-actions-column{gap:6px}

/* ===== Inputs ===== */
.multiplayer-panel .input-field,
.multiplayer-panel .settings-input,
.multiplayer-panel .chat-input,
.multiplayer-panel .input-textarea{font-size:12px}

.multiplayer-panel .input-field,
.multiplayer-panel .settings-input,
.multiplayer-panel .chat-input{height:30px}

.refresh-btn{width:28px;height:28px}

.action-btn,.send-btn{min-height:30px}

.action-btn{font-size:12px}

.create-room-section .action-btn{font-size:12px}

.join-room-section .action-btn{padding:0 6px;gap:6px}

.join-room-section .join-btn-icon.fa-solid{font-size:13px}

.send-btn{font-size:12px}

.sync-history-btn{font-size:11px}

.transfer-leading-btn{width:14px;min-width:14px;height:14px}

/* ===== Typo Hierarchy ===== */
.section-title{font-size:14px}

.setting-row label,.room-meta,.empty-rooms,.host-badge,.all-submitted,.pending-input-item,.empty-inputs,.hint,.preview-label,.preview-text,.sync-history-btn{font-size:11px}

.icon-btn.fa-solid,.refresh-btn.fa-solid,.join-btn-icon.fa-solid,.transfer-leading-btn.fa-solid,.user-leading-icon.fa-solid,.send-btn.fa-solid,.sync-history-btn.fa-solid,.action-btn.fa-solid,.section-title.fa-solid{font-size:13px}

.top-status-line{gap:6px}

/* ===== Room List ===== */
.room-list{gap:6px;max-height:150px}

.room-info,.room-meta{gap:6px}

.room-name{font-size:12px}

.empty-rooms{padding:16px}

.user-list .section-title,.spectator-list .section-title{margin-bottom:6px}

.user-items,.spectator-items{gap:6px}

.user-item{gap:6px;height:28px;font-size:11px}

.host-badge{margin-left:6px}

.all-submitted{margin-left:6px}

/* ===== Logs ===== */
.chat-logs{min-height:88px;max-height:140px;padding:6px}

.debug-logs{padding:6px}

/* ===== Pending Inputs ===== */
.pending-inputs{max-height:108px;padding:6px}

.input-user{margin-right:6px}

.empty-inputs{padding:10px}

.mp-settings-page-header{height:40px;padding:0 8px 0 14px}

.mp-settings-page-title{font-size:15px}

.settings-tab-btn{font-size:14px}

/* 设置页改为平面分组（非卡片） */
.setting-item{font-size:12px}

.settings-modal-body .setting-item>label{font-size:14px}

.settings-modal-body .toggle-label,
.settings-modal-body .toggle-label > span{font-size:14px}

.preview-box{margin-top:6px;padding:10px}

.preview-label{margin-right:6px}

.mp-choice-title{font-size:14px}

.mp-choice-desc{font-size:11px}

.toggle-label{gap:12px;font-size:14px}

.mp-mt-2{margin-top:6px}

.multiplayer-panel{
    box-shadow:0 8px 18px rgba(49,51,57,.62);
}
}
`;
    targetDoc.head.appendChild(style);
};

// ==========================================
// 2. 大厅 API 服务 
// ==========================================
const requestWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            cache: 'no-store'
        });
        return response;
    } catch (e) {
        if (e?.name === 'AbortError') {
            throw new Error('请求超时，请检查网络或稍后重试');
        }
        throw e;
    } finally {
        clearTimeout(timer);
    }
};

const RoomApiService = {
    async fetchRooms(baseUrl) {
        const response = await requestWithTimeout(`${baseUrl}/rooms`, {}, 8000);
        if (!response.ok) throw new Error('获取房间列表失败');
        return (await response.json()).rooms || [];
    },
    async createRoom(baseUrl, params) {
        const response = await requestWithTimeout(`${baseUrl}/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        }, 8000);

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '创建房间失败');
        return data;
    },
    async verifyAndJoin(baseUrl, roomId, password) {
        const response = await requestWithTimeout(`${baseUrl}/rooms/${roomId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        }, 8000);

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const err = new Error(
                data.error ||
                (response.status === 404 ? '房间不存在或已关闭' : '加入房间失败')
            );
            err.status = response.status;
            err.code = 'ROOM_JOIN_FAILED';
            throw err;
        }

        return `${baseUrl.replace('http', 'ws')}/ws/room/${roomId}`;
    }
};

// ==========================================
// 3. 网络通信模块
// ==========================================
const generateId = () => Math.random().toString(36).substring(2, 10); // 生成随机用户ID

class WebSocketClient {
    constructor() {
        this.ws = null;
        this.userId = generateId();
        this.userName = '';
        this.isConnected = false;
        this.isHost = false;
        this.isSpectator = false;
        this.handlers = {};

        this.heartbeatTimer = null;
        this.pendingPong = false;
        this.missedPongs = 0;

        this.HEARTBEAT_INTERVAL = 5000;
        this.MAX_MISSED_PONGS = 8;
        this.CONNECT_TIMEOUT_MS = 10000;
    }

    init(handlers) {
        this.handlers = handlers;
    }

    async connect(url, password) {
        return new Promise((resolve, reject) => {
            let settled = false;
            let connectTimer = null;

            const safeReject = (err) => {
                if (settled) return;
                settled = true;
                clearTimeout(connectTimer);
                reject(err);
            };

            const safeResolve = () => {
                if (settled) return;
                settled = true;
                clearTimeout(connectTimer);
                resolve();
            };

            try {
                this.ws = new WebSocket(url);

                connectTimer = setTimeout(() => {
                    this.handlers.onError?.('连接超时，请重试');
                    try { this.ws?.close(); } catch (e) {}
                    safeReject(new Error('连接超时'));
                }, this.CONNECT_TIMEOUT_MS);

                this.ws.onopen = () => {
                    this.isConnected = true;
                    this.missedPongs = 0;
                    this.pendingPong = false;

                    this.startHeartbeat();
                    this.send({
                        type: 'join',
                        data: {
                            name: this.userName,
                            password,
                            spectator: !!this.isSpectator
                        }
                    });
                    this.handlers.onConnectionChange?.(true);

                    safeResolve();
                };

                this.ws.onclose = () => {
                    this.stopHeartbeat();
                    this.isConnected = false;
                    this.handlers.onConnectionChange?.(false);

                    if (!settled) {
                        safeReject(new Error('连接已关闭'));
                    }
                };

                this.ws.onerror = (e) => {
                    this.handlers.onError?.('WebSocket错误');
                    safeReject(e instanceof Error ? e : new Error('WebSocket错误'));
                };

                this.ws.onmessage = (e) => {
                    // 收到任意消息都说明链路可用，降低误判断线
                    this.pendingPong = false;
                    this.missedPongs = 0;

                    let msg = null;
                    try {
                        msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
                    } catch (err) {
                        console.warn('[联机Mod] 收到非 JSON 消息，已忽略:', e.data);
                        return;
                    }

                    if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') {
                        console.warn('[联机Mod] 收到非法消息结构，已忽略:', msg);
                        return;
                    }

                    switch (msg.type) {
                        case 'pong':
                            break;
                        case 'error':
                            if (msg.data?.targetId === this.userId) {
                                this.handlers.onError?.(msg.data.message);
                            }
                            break;
                        case 'join': {
                            const d = msg.data || {};
                            const hasSpectatorFlag =
                                Object.prototype.hasOwnProperty.call(d, 'spectator') ||
                                Object.prototype.hasOwnProperty.call(d, 'isSpectator') ||
                                Object.prototype.hasOwnProperty.call(d, 'observer') ||
                                Object.prototype.hasOwnProperty.call(d, 'is_observer') ||
                                Object.prototype.hasOwnProperty.call(d, 'role');

                            const parsedSpectator =
                                d.spectator ??
                                d.isSpectator ??
                                d.observer ??
                                d.is_observer ??
                                (d.role === 'spectator' || d.role === 'observer');

                            const joinUser = {
                                id: msg.from,
                                name: msg.fromName,
                                isHost: false
                            };

                            if (hasSpectatorFlag) {
                                joinUser.isSpectator = !!parsedSpectator;
                            }

                            this.handlers.onUserJoin?.(joinUser);
                            break;
                        }
                        case 'leave':
                            this.handlers.onUserLeave?.(msg.from);
                            break;
                        case 'sync_state':
                            if (msg.data?.users) {
                                msg.data.users.forEach(u => this.handlers.onUserJoin?.(u));
                            }
                            break;
                        case 'host_change':
                            this.handlers.onMessage?.(msg);
                            break;
                        default:
                            this.handlers.onMessage?.(msg);
                    }
                };
            } catch (e) {
                safeReject(e);
            }
        });
    }

    send(payload) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                ...payload,
                from: this.userId,
                fromName: this.userName,
                timestamp: Date.now()
            }));
        }
    }

    broadcast(payload) {
        this.send(payload);
    }

    startHeartbeat() {
        this.stopHeartbeat();
        this.pendingPong = false;

        this.heartbeatTimer = setInterval(() => {
            if (!this.isConnected) return;

            if (this.pendingPong) {
                this.missedPongs++;
                if (this.missedPongs >= this.MAX_MISSED_PONGS) {
                    this.handlers.onError?.('网络不稳定，连接已断开');
                    this.ws?.close();
                    return;
                }
            }

            this.pendingPong = true;
            this.send({ type: 'ping', data: { timestamp: Date.now() } });
        }, this.HEARTBEAT_INTERVAL);
    }

    stopHeartbeat() {
        clearInterval(this.heartbeatTimer);
        this.pendingPong = false;
        this.missedPongs = 0;
    }

    disconnect() {
        this.stopHeartbeat();
        this.ws?.close();
        this.isConnected = false;
    }
}

// ==========================================
// 4. 状态管理器
// ==========================================

const useMultiplayerStore = defineStore(STORE_ID, () => {
    const isConnected = ref(false);
    const mode = ref('disconnected');
    const isHost = ref(false);

    const users = ref([]);
    const chatLogs = ref([]);

    const pendingInputs = shallowRef(new Map());
    const pendingInputsVersion = ref(0);

    const pendingPersonas = shallowRef(new Map());
    const acuSyncState = ref({ fullSynced: false, lastSyncTimestamp: 0, isolationKey: '' });

    const settings = reactive({
        onlineServer: 'https://room.yufugemini.cloud',
        defaultUserName: '',
        timedInputSeconds: 0
    });

    // 变量模式（可多选：mvu / apotheosis）
    const VARIABLE_MODE_OPTIONS = Object.freeze(['mvu', 'apotheosis']);

    const normalizeVariableModes = (raw) => {
        let src = raw;

        if (typeof src === 'string') {
            const s = src.trim();
            if (!s || s === 'none') return [];
            try {
                const parsed = JSON.parse(s);
                if (Array.isArray(parsed)) src = parsed;
                else src = [s];
            } catch (e) {
                src = [s];
            }
        }

        if (!Array.isArray(src)) src = [];
        const set = new Set(
            src.map(x => String(x || '').trim().toLowerCase()).filter(Boolean)
        );
        return VARIABLE_MODE_OPTIONS.filter(x => set.has(x));
    };

    const variableMode = ref(normalizeVariableModes(
        localStorage.getItem(VARIABLE_MODE_STORAGE_KEY)
        ?? localStorage.getItem(LEGACY_VARIABLE_MODE_STORAGE_KEY)
    ));
    watch(variableMode, (v) => {
        localStorage.setItem(VARIABLE_MODE_STORAGE_KEY, JSON.stringify(normalizeVariableModes(v)));
    }, { deep: true });

    const spectatorMode = ref(false);

    let networkClient = null;
    let userJoinOrderSeed = 0;

    // 房主限时发送计时器
    let timeoutTimer = null;
    let lastPendingSize = 0;
    // 发送互斥锁：防止“立即发送/自动发送/限时发送”并发触发导致重复推送
    let submitInFlight = false;

    // 自动重连状态
    let reconnectTimer = null;
    let reconnectAttempt = 0;
    const reconnectDelays = [1000, 2000, 4000];
    const MAX_RECONNECT_ATTEMPTS = 5;
    let reconnectContext = null;
    let sessionEstablished = false;
    let manualDisconnect = false;

    const NO_ROOM_KEY = '__no_room__';
    const currentRoomId = ref('');
    const MAX_CHAT_LOGS = 50;
    const MAX_DEBUG_LOGS = 30;

    const DEFAULT_STATUS_TEXT = '等待操作';
    const topStatusLine = ref(DEFAULT_STATUS_TEXT);
    const topStatusLevel = ref('info');

    // 仅会话内存日志，不做本地持久化
    const roomLogsMap = ref({});
    const roomStatusMap = ref({});
    const debugLogs = ref([]);

    // -------------------------
    // 工具函数
    // -------------------------
    const normalizeRoomKey = (roomId = '') => ((roomId || '').toString().trim().toLowerCase() || NO_ROOM_KEY);
    const normalizeUserName = (name = '') => name.trim().toLowerCase();
    const normalizeUid = (uid = '') => uid.toString().trim().toLowerCase();

    const makeBoundUserId = (roomId, uid) => {
        const roomKey = (roomId || 'global').toString().trim().toLowerCase();
        const uidKey = normalizeUid(uid || 'uid_anonymous') || 'uid_anonymous';
        return `u_${encodeURIComponent(roomKey)}_${encodeURIComponent(uidKey)}`;
    };

    const normalizeIncomingUser = (user = {}) => {
        const hasHostField =
            Object.prototype.hasOwnProperty.call(user, 'isHost') ||
            Object.prototype.hasOwnProperty.call(user, 'host');

        const hasSpectatorField =
            Object.prototype.hasOwnProperty.call(user, 'isSpectator') ||
            Object.prototype.hasOwnProperty.call(user, 'spectator') ||
            Object.prototype.hasOwnProperty.call(user, 'is_observer') ||
            Object.prototype.hasOwnProperty.call(user, 'observer');

        return {
            id: user.id,
            name: user.name || user.fromName || '匿名',
            isHost: !!(user.isHost ?? user.host ?? false),
            isSpectator: !!(user.isSpectator ?? user.spectator ?? user.is_observer ?? user.observer ?? false),
            hasHostField,
            hasSpectatorField
        };
    };

    const touchPendingInputs = () => {
        pendingInputsVersion.value++;
        triggerRef(pendingInputs);
    };

    const clearPendingInputs = () => {
        pendingInputs.value.clear();
        touchPendingInputs();
        if (timeoutTimer) {
            clearTimeout(timeoutTimer);
            timeoutTimer = null;
        }
    };

    const getJoinOrder = (u, idx = 0) => Number.isFinite(u?._joinOrder) ? u._joinOrder : (idx + 1);

    const buildUsersSnapshot = () => {
        return users.value.map((u, idx) => ({
            id: u.id,
            name: u.name || '匿名',
            isHost: !!u.isHost,
            isSpectator: !!u.isSpectator,
            _joinOrder: getJoinOrder(u, idx)
        }));
    };

    const buildPendingInputsSnapshot = () => {
        return Array.from(pendingInputs.value.entries())
            .map(([userId, data]) => ({
                userId,
                userName: data?.userName || '匿名',
                content: (data?.content ?? '').toString(),
                prefix: data?.prefix || '[{name}]:',
                suffix: (data?.suffix ?? '').toString(),
                submittedAt: Number(data?.submittedAt || 0),
                hideContent: !!data?.hideContent
            }))
            .filter(item => item.content.trim().length > 0)
            .sort((a, b) => {
                if (a.submittedAt !== b.submittedAt) return a.submittedAt - b.submittedAt;
                return String(a.userId).localeCompare(String(b.userId), 'zh-CN');
            });
    };

    const pickNextHostCandidate = () => {
        return users.value
            .filter(u => !u.isSpectator)
            .slice()
            .sort((a, b) => {
                const d = getJoinOrder(a) - getJoinOrder(b);
                if (d !== 0) return d;
                return String(a.id).localeCompare(String(b.id), 'zh-CN');
            })[0] || null;
    };

    // -------------------------
    // 日志相关
    // -------------------------
    const getStatusByRoom = (roomId = '') => {
        const key = normalizeRoomKey(roomId || currentRoomId.value);
        return roomStatusMap.value[key] || null;
    };

    const setStatusLine = (content = '', level = 'info', roomId = '') => {
        const text = (content ?? '').toString().trim() || DEFAULT_STATUS_TEXT;
        const lv = (level || 'info').toString().trim().toLowerCase();
        const key = normalizeRoomKey(roomId || currentRoomId.value);

        roomStatusMap.value[key] = {
            content: text,
            level: ['info', 'debug', 'milestone', 'error'].includes(lv) ? lv : 'info',
            timestamp: Date.now()
        };

        if (key === normalizeRoomKey(currentRoomId.value)) {
            topStatusLine.value = roomStatusMap.value[key].content;
            topStatusLevel.value = roomStatusMap.value[key].level;
        }
    };

    const refreshCurrentStatus = () => {
        const current = getStatusByRoom(currentRoomId.value);
        if (!current) {
            topStatusLine.value = DEFAULT_STATUS_TEXT;
            topStatusLevel.value = 'info';
            return;
        }
        topStatusLine.value = current.content || DEFAULT_STATUS_TEXT;
        topStatusLevel.value = current.level || 'info';
    };

    const pushDebugLog = (type = 'debug', from = '系统', content = '', roomId = '') => {
        const key = normalizeRoomKey(roomId || currentRoomId.value);
        const item = {
            id: `dbg-${Date.now()}-${Math.random()}`,
            type,
            from: (from || '系统').toString(),
            content: (content ?? '').toString(),
            timestamp: Date.now(),
            roomKey: key
        };
        debugLogs.value = [...debugLogs.value, item].slice(-MAX_DEBUG_LOGS);
    };

    const classifySystemLog = (type, content = '') => {
        const t = String(type || '').trim().toLowerCase();
        const text = String(content || '');

        if (t === 'error') return 'error';
        if (t === 'milestone' || t === 'info' || t === 'debug') return t;

        if (t === 'chat') {
            if (/(正在|请求|继续|同步中|加载中|触发|开始|尝试|处理中)/.test(text)) return 'info';
            if (/(成功|完成|已连接|连接成功|重连成功|已断开|退出房间|已恢复|已回滚)/.test(text)) return 'milestone';
            if (/(失败|错误|异常|超时|不存在|断开)/.test(text)) return 'error';
            return 'info';
        }

        return 'debug';
    };

    const buildDisplayLogs = (roomId = '') => {
        const key = normalizeRoomKey(roomId);
        const logs = Array.isArray(roomLogsMap.value[key]) ? roomLogsMap.value[key] : [];

        return logs
            .filter(item => item?.type === 'chat')
            .sort((a, b) => {
                const ta = Number(a?.timestamp || 0);
                const tb = Number(b?.timestamp || 0);
                if (ta !== tb) return ta - tb;
                return String(a?.id || '').localeCompare(String(b?.id || ''), 'zh-CN');
            });
    };

    const refreshCurrentRoomLogs = () => {
        chatLogs.value = buildDisplayLogs(currentRoomId.value);
    };

    const currentDebugLogs = computed(() => {
        const roomKey = normalizeRoomKey(currentRoomId.value);
        return (debugLogs.value || [])
            .filter(item => normalizeRoomKey(item?.roomKey || '') === roomKey)
            .sort((a, b) => {
                const ta = Number(a?.timestamp || 0);
                const tb = Number(b?.timestamp || 0);
                if (ta !== tb) return ta - tb;
                return String(a?.id || '').localeCompare(String(b?.id || ''), 'zh-CN');
            });
    });

    const switchRoomLogs = (roomId = '') => {
        currentRoomId.value = (roomId || '').toString().trim();
        const key = normalizeRoomKey(currentRoomId.value);

        if (!Array.isArray(roomLogsMap.value[key])) {
            roomLogsMap.value[key] = [];
        }

        refreshCurrentRoomLogs();
        refreshCurrentStatus();
    };

    const pruneRoomLogsByExistingRoomIds = (roomIds = []) => {
        const keepKeys = new Set(roomIds.map(id => normalizeRoomKey(id)));
        const next = {};
        const nextStatus = {};

        Object.entries(roomLogsMap.value || {}).forEach(([k, logs]) => {
            if (k === NO_ROOM_KEY || keepKeys.has(k)) {
                next[k] = Array.isArray(logs) ? logs.slice(-MAX_CHAT_LOGS) : [];
            }
        });

        Object.entries(roomStatusMap.value || {}).forEach(([k, status]) => {
            if (k === NO_ROOM_KEY || keepKeys.has(k)) {
                nextStatus[k] = status;
            }
        });

        roomLogsMap.value = next;
        roomStatusMap.value = nextStatus;

        const currentKey = normalizeRoomKey(currentRoomId.value);
        if (currentKey !== NO_ROOM_KEY && !keepKeys.has(currentKey)) {
            currentRoomId.value = '';
            chatLogs.value = [];
            topStatusLine.value = DEFAULT_STATUS_TEXT;
            topStatusLevel.value = 'info';
        } else {
            refreshCurrentRoomLogs();
            refreshCurrentStatus();
        }
    };

    const clearRoomLogCache = (roomId = '') => {
        const key = normalizeRoomKey(roomId || currentRoomId.value);
        if (key === NO_ROOM_KEY) return;

        if (Object.prototype.hasOwnProperty.call(roomLogsMap.value, key)) {
            delete roomLogsMap.value[key];
        }
        if (Object.prototype.hasOwnProperty.call(roomStatusMap.value, key)) {
            delete roomStatusMap.value[key];
        }

        if (normalizeRoomKey(currentRoomId.value) === key) {
            chatLogs.value = [];
            topStatusLine.value = DEFAULT_STATUS_TEXT;
            topStatusLevel.value = 'info';
        }
    };

    const addLog = (type, from, content) => {
        const key = normalizeRoomKey(currentRoomId.value);
        const rawType = String(type || '').trim().toLowerCase();
        const sender = (from || '系统').toString().trim() || '系统';
        const text = (content ?? '').toString();
        if (!text.trim()) return;

        if (sender === '系统') {
            const level = classifySystemLog(rawType, text);
            pushDebugLog(level, sender, text, currentRoomId.value);
            return;
        }

        if (rawType !== 'chat' && rawType !== 'error') return;

        const item = {
            id: `log-${Date.now()}-${Math.random()}`,
            type: rawType,
            from: sender,
            content: text,
            timestamp: Date.now()
        };

        const list = Array.isArray(roomLogsMap.value[key]) ? [...roomLogsMap.value[key]] : [];
        list.push(item);
        roomLogsMap.value[key] = list.slice(-MAX_CHAT_LOGS);

        if (key === normalizeRoomKey(currentRoomId.value)) {
            refreshCurrentRoomLogs();
        }
    };

    // -------------------------
    // 重连相关
    // -------------------------
    const clearReconnectTimer = () => {
        if (!reconnectTimer) return;
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    };

    const scheduleReconnect = () => {
        if (manualDisconnect || !reconnectContext || reconnectTimer || isConnected.value) return;

        if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
            addLog('error', '系统', '网络已断开，重连失败次数过多，已自动退出房间');
            disconnect();
            return;
        }

        const idx = Math.min(reconnectAttempt, reconnectDelays.length - 1);
        const delay = reconnectDelays[idx];
        reconnectAttempt++;

        reconnectTimer = setTimeout(async () => {
            reconnectTimer = null;
            if (manualDisconnect || isConnected.value || !reconnectContext) return;

            try {
                await connectOnline(
                    reconnectContext.roomId,
                    reconnectContext.pwd,
                    reconnectContext.name,
                    reconnectContext.uid,
                    { isReconnect: true }
                );
            } catch (e) {
                const status = Number(e?.status || 0);
                const msg = String(e?.message || '');

                if (status === 404 || /404|房间不存在|已关闭/.test(msg)) {
                    addLog('error', '系统', '房间已不存在，已停止自动重连并退出房间');
                    disconnect();
                    return;
                }

                scheduleReconnect();
            }
        }, delay);
    };




    // -------------------------
    // 用户/连接处理
    // -------------------------
    const syncHostStateIfNeeded = () => {
        if (!isHost.value) return;
        networkClient?.broadcast({
            type: 'sync_user_state',
            data: { users: buildUsersSnapshot() }
        });
    };

    const ensureMeExists = () => {
        const myId = networkClient?.userId;
        if (!myId) return;

        const me = users.value.find(u => u.id === myId);
        if (me) return;

        users.value.push({
            id: myId,
            name: networkClient?.userName || '我',
            isHost: false,
            isSpectator: !!networkClient?.isSpectator,
            _joinOrder: ++userJoinOrderSeed
        });
    };

    const upsertUser = (user) => {
        const normalized = normalizeIncomingUser(user);
        const selfId = networkClient?.userId || '';

        const target = users.value.find(u => u.id === normalized.id);
        if (!target) {
            users.value.push({
                id: normalized.id,
                name: normalized.name,
                isHost: normalized.id === selfId
                    ? (!!normalized.isHost && !networkClient?.isSpectator)
                    : normalized.isHost,
                isSpectator: normalized.id === selfId
                    ? !!networkClient?.isSpectator
                    : normalized.isSpectator,
                _joinOrder: ++userJoinOrderSeed
            });
        } else {
            const oldId = target.id;
            const idChanged = !!(normalized.id && target.id !== normalized.id);

            if (idChanged) {
                target.id = normalized.id;
                if (pendingInputs.value.has(oldId)) {
                    const oldInput = pendingInputs.value.get(oldId);
                    pendingInputs.value.delete(oldId);
                    pendingInputs.value.set(normalized.id, oldInput);
                    touchPendingInputs();
                }
            }

            if (normalized.hasHostField) target.isHost = normalized.isHost;
            if (normalized.hasSpectatorField) target.isSpectator = normalized.isSpectator;
            if (normalized.name && normalized.name !== target.name) target.name = normalized.name;

            if (normalized.id === selfId) {
                target.isSpectator = !!networkClient?.isSpectator;
                if (target.isSpectator) target.isHost = false;
            }

            if (!target.isHost && idChanged) {
                target._joinOrder = ++userJoinOrderSeed;
            } else if (!Number.isFinite(target._joinOrder)) {
                target._joinOrder = ++userJoinOrderSeed;
            }
        }

        if (normalized.id === selfId) {
            const me = users.value.find(u => u.id === selfId);
            isHost.value = !!(me?.isHost && !me?.isSpectator);
            mode.value = me?.isSpectator ? 'spectator' : 'client';
        }

        syncHostStateIfNeeded();
    };

    const handleUserLeave = (userId) => {
        const idx = users.value.findIndex(u => u.id === userId);
        if (idx === -1) return;

        const leaving = users.value[idx];
        const wasHost = !!leaving.isHost;

        users.value.splice(idx, 1);
        pendingInputs.value.delete(userId);
        touchPendingInputs();

        if (!wasHost || !isConnected.value) return;

        const nextHost = pickNextHostCandidate();
        if (!nextHost) {
            clearRoomLogCache(currentRoomId.value);
            disconnect();
            return;
        }

        users.value.forEach(u => {
            u.isHost = (u.id === nextHost.id);
        });

        isHost.value = nextHost.id === (networkClient?.userId || '');
        if (isHost.value) {
            mode.value = 'client';
            networkClient?.broadcast({
                type: 'host_change',
                data: { hostId: nextHost.id, hostName: nextHost.name }
            });
            syncHostStateIfNeeded();
        }
    };

    const initNetwork = () => {
        if (networkClient) {
            try { networkClient.disconnect(); } catch (e) {}
        }

        networkClient = new WebSocketClient();

        networkClient.init({
            onConnectionChange: (status) => {
                isConnected.value = status;

                if (status) {
                    addLog('milestone', '系统', mode.value === 'reconnecting' ? '重连成功' : '连接成功');
                    sessionEstablished = true;
                    reconnectAttempt = 0;
                    clearReconnectTimer();
                    return;
                }

                users.value = [];
                clearPendingInputs();

                if (timeoutTimer) {
                    clearTimeout(timeoutTimer);
                    timeoutTimer = null;
                }

                const canAutoReconnect =
                    !manualDisconnect &&
                    sessionEstablished &&
                    !!reconnectContext;

                if (canAutoReconnect) {
                    mode.value = 'reconnecting';
                    addLog('info', '系统', '连接断开，正在自动重连...');
                    scheduleReconnect();
                    return;
                }

                mode.value = 'disconnected';
                addLog('milestone', '系统', '连接已断开');
                currentRoomId.value = '';
                chatLogs.value = [];
            },

            onError: (msg) => addLog('error', '系统', msg),

            onUserJoin: (user) => upsertUser(user),

            onUserLeave: (userId) => handleUserLeave(userId),

            onMessage: (msg) => {
                const myId = (networkClient?.userId || '').toString();

                const emitMap = {
                    ai_stream: 'multiplayer_ai_stream',
                    delete_last_message: 'multiplayer_delete_last_message',
                    request_input: 'multiplayer_request_input',
                    sync_history_data: 'multiplayer_sync_history_data',
                    sync_regex_data: 'multiplayer_sync_regex_data',
                    acu_full_sync: 'multiplayer_acu_full_sync',
                    acu_delta_sync: 'multiplayer_acu_delta_sync'
                };

                switch (msg.type) {
                    case 'chat':
                        if (msg.from !== myId) addLog('chat', msg.fromName, msg.data.content);
                        break;

                    case 'rename': {
                        const newName = (msg.data?.name || msg.fromName || '').trim();
                        if (!newName) break;

                        const duplicated = users.value.find(
                            u => u.id !== msg.from && normalizeUserName(u.name) === normalizeUserName(newName)
                        );
                        if (duplicated) {
                            addLog('error', '系统', `用户名 "${newName}" 已存在，重命名被忽略`);
                            break;
                        }

                        const target = users.value.find(u => u.id === msg.from);
                        if (target) target.name = newName;
                        break;
                    }

                    case 'user_input':
                        pendingInputs.value.set(msg.from, {
                            userName: msg.fromName,
                            content: msg.data.content,
                            prefix: msg.data.messagePrefix,
                            suffix: msg.data.messageSuffix || '',
                            submittedAt: msg.timestamp || Date.now(),
                            hideContent: !!msg.data?.hideContent
                        });
                        touchPendingInputs();
                        break;

                    case 'revoke_input':
                        if (pendingInputs.value.has(msg.from)) {
                            pendingInputs.value.delete(msg.from);
                            touchPendingInputs();
                        }
                        break;

                    case 'spectator_mode': {
                        const enabled = !!msg.data?.enabled;
                        const targetId = msg.from || msg.data?.userId || '';
                        const target = users.value.find(u => u.id === targetId);

                        if (target) {
                            target.isSpectator = enabled;
                            if (enabled && pendingInputs.value.has(target.id)) {
                                pendingInputs.value.delete(target.id);
                                touchPendingInputs();
                            }
                        }

                        syncHostStateIfNeeded();
                        break;
                    }

                    case 'ai_response':
                        if (msg.data?.variableModes !== undefined) {
                            variableMode.value = normalizeVariableModes(msg.data.variableModes);
                        }
                        eventEmit('multiplayer_ai_response', msg.data || {});
                        break;

                    case 'user_message':
                        clearPendingInputs();
                        eventEmit('multiplayer_user_message', msg.data || {});
                        break;

                    case 'request_pending_inputs':
                        if (isHost.value && msg.from !== myId) {
                            networkClient.send({
                                type: 'sync_pending_inputs',
                                data: {
                                    targetUserId: msg.from,
                                    items: buildPendingInputsSnapshot()
                                }
                            });
                            networkClient.send({
                                type: 'sync_user_state',
                                data: {
                                    targetUserId: msg.from,
                                    users: buildUsersSnapshot()
                                }
                            });
                        }
                        break;

                    case 'sync_pending_inputs':
                        if (!isHost.value && msg.data?.targetUserId === myId) {
                            pendingInputs.value.clear();
                            (msg.data.items || []).forEach(item => {
                                pendingInputs.value.set(item.userId, {
                                    userName: item.userName,
                                    content: item.content,
                                    prefix: item.prefix,
                                    suffix: item.suffix || '',
                                    hideContent: !!item.hideContent
                                });
                            });
                            touchPendingInputs();
                        }
                        break;

                    case 'sync_user_state':
                        if (!isHost.value) {
                            const targetUserId = (msg.data?.targetUserId || '').toString();
                            if (targetUserId && targetUserId !== myId) break;

                            const incoming = Array.isArray(msg.data?.users) ? msg.data.users : [];
                            const nextUsers = incoming
                                .map((u, idx) => {
                                    const nu = normalizeIncomingUser(u);
                                    return {
                                        id: nu.id,
                                        name: nu.name,
                                        isHost: nu.isHost,
                                        isSpectator: nu.isSpectator,
                                        _joinOrder: Number.isFinite(u?._joinOrder) ? u._joinOrder : (idx + 1)
                                    };
                                })
                                .filter(u => !!u.id);

                            if (myId && !nextUsers.some(u => u.id === myId)) {
                                nextUsers.push({
                                    id: myId,
                                    name: networkClient?.userName || '我',
                                    isHost: false,
                                    isSpectator: !!networkClient?.isSpectator,
                                    _joinOrder: nextUsers.length + 1
                                });
                            }

                            users.value = nextUsers;

                            const me = users.value.find(u => u.id === myId);
                            if (me) {
                                me.isSpectator = !!networkClient?.isSpectator;
                                if (me.isSpectator) me.isHost = false;
                            }

                            isHost.value = !!users.value.find(u => u.id === myId)?.isHost;
                            mode.value = me?.isSpectator ? 'spectator' : 'client';
                        }
                        break;

                    case 'reset_input':
                        clearPendingInputs();
                        break;

                    case 'sync_history_request':
                        if (isHost.value) {
                            eventEmit('multiplayer_sync_history_request', {
                                userId: msg.from,
                                depth: msg.data?.depth || 0,
                                batchId: msg.data?.batchId || '',
                                resumeFrom: msg.data?.resumeFrom,
                                acceptChunk: msg.data?.acceptChunk,
                                chunkSize: msg.data?.chunkSize
                            });
                        }
                        break;

                    case 'sync_history_ack':
                        if (isHost.value) {
                            eventEmit('multiplayer_sync_history_ack', {
                                userId: msg.from,
                                batchId: msg.data?.batchId || '',
                                resumeFrom: msg.data?.resumeFrom,
                                received: msg.data?.received
                            });
                        }
                        break;

                    case 'sync_regex_request':
                        if (isHost.value) {
                            eventEmit('multiplayer_sync_regex_request', {
                                userId: msg.from,
                                scopes: Array.isArray(msg.data?.scopes) ? msg.data.scopes : ['character']
                            });
                        }
                        break;

                    case 'sync_variables_request':
                        if (isHost.value) {
                            eventEmit('multiplayer_sync_variables_request', {
                                userId: msg.from,
                                variableModes: msg.data?.variableModes
                            });
                        }
                        break;

                    case 'sync_scripts_request':
                        if (isHost.value) {
                            eventEmit('multiplayer_sync_scripts_request', {
                                userId: msg.from
                            });
                        }
                        break;

                    case 'sync_variables':
                        if (!isHost.value) {
                            const targetUserId = (msg.data?.targetUserId || '').toString();
                            if (targetUserId && targetUserId !== myId) break;
                            eventEmit('multiplayer_sync_variables', {
                                variableType: msg.data?.variableType,
                                content: msg.data?.content,
                                packetId: (msg.data?.packetId || '').toString(),
                                targetUserId
                            });
                        }
                        break;

                    case 'sync_scripts':
                        if (!isHost.value) {
                            const targetUserId = (msg.data?.targetUserId || '').toString();
                            if (targetUserId && targetUserId !== myId) break;
                            eventEmit('multiplayer_sync_scripts', {
                                state: msg.data?.state,
                                packetId: (msg.data?.packetId || '').toString(),
                                targetUserId
                            });
                        }
                        break;

                    case 'user_persona':
                        pendingPersonas.value.set(msg.from, {
                            userName: msg.fromName,
                            content: msg.data.content,
                            prefix: msg.data.prefix
                        });
                        triggerRef(pendingPersonas);
                        break;

                    case 'transfer_host': {
                        // 只允许当前房主处理转让请求：兼容“服务器只投递给房主”的实现
                        if (!isHost.value) break;

                        const targetUserId = (msg.data?.targetUserId || '').toString();
                        if (!targetUserId) break;

                        const target = users.value.find(u => u.id === targetUserId);
                        if (!target || target.isSpectator) {
                            addLog('error', '系统', '房主转让失败：目标不存在或为观众');
                            break;
                        }

                        users.value.forEach(u => {
                            u.isHost = (u.id === target.id);
                        });

                        // 由“当前房主”广播 host_change + 完整用户态，避免依赖目标客户端二次广播
                        networkClient?.broadcast({
                            type: 'host_change',
                            data: { hostId: target.id, hostName: target.name }
                        });
                        networkClient?.broadcast({
                            type: 'sync_user_state',
                            data: { users: buildUsersSnapshot() }
                        });

                        // 本端（旧房主）立刻降权；新房主会在 host_change 里自动开启同步
                        isHost.value = false;
                        break;
                    }

                    case 'host_change':
                        if (msg.data?.hostId) {
                            let targetHost = users.value.find(u => u.id === msg.data.hostId);

                            if (!targetHost || targetHost.isSpectator) {
                                const fallbackHost = pickNextHostCandidate();
                                if (!fallbackHost) {
                                    clearRoomLogCache(currentRoomId.value);
                                    disconnect();
                                    break;
                                }
                                targetHost = fallbackHost;
                            }

                            users.value.forEach(u => {
                                u.isHost = (u.id === targetHost.id);
                            });

                            isHost.value = targetHost.id === myId && !targetHost.isSpectator;
                            if (isHost.value) {
                                // 切换为新房主后，主动同步一次状态，避免客户端依赖旧房主继续广播
                                syncHostStateIfNeeded();
                            }
                        }
                        break;

                    default:
                        if (emitMap[msg.type]) {
                            if (msg.type === 'acu_full_sync' && !isHost.value) {
                                acuSyncState.value.fullSynced = true;
                                acuSyncState.value.lastSyncTimestamp = Date.now();
                                acuSyncState.value.isolationKey = msg.data?.isolationKey || '';
                            }
                            if (msg.type === 'acu_delta_sync' && !isHost.value) {
                                acuSyncState.value.lastSyncTimestamp = Date.now();
                            }
                            eventEmit(emitMap[msg.type], msg.data || {});
                        }
                        break;
                }
            }
        });
    };

    // -------------------------
    // 输入池限时自动发送
    // -------------------------
    watch(pendingInputsVersion, () => {
        const newSize = pendingInputs.value.size;
        const oldSize = lastPendingSize;
        lastPendingSize = newSize;

        if (isHost.value && settings.timedInputSeconds > 0 && newSize > 0 && newSize > oldSize) {
            if (timeoutTimer) clearTimeout(timeoutTimer);
            timeoutTimer = setTimeout(() => {
                if (isHost.value && pendingInputs.value.size > 0) {
                    submitToAI();
                }
            }, settings.timedInputSeconds * 1000);
        }
    });

    // -------------------------
    // 对外动作
    // -------------------------
    const submitToAI = async () => {
        if (!isHost.value) return;
        if (submitInFlight) return;

        submitInFlight = true;

        try {

            if (timeoutTimer) {
                clearTimeout(timeoutTimer);
                timeoutTimer = null;
            }

            const snapshot = buildPendingInputsSnapshot();
            if (snapshot.length === 0) {
                addLog('error', '系统', '没有可发送的输入');
                return;
            }

            const toLine = (item) => {
                const p = (item.prefix || '[{name}]:').replace('{name}', item.userName);
                return `${p} ${item.content}${item.suffix || ''}`;
            };

            const fullCombined = snapshot.map(toLine).join('\n\n');
            const userLayerMessage = fullCombined;

            const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

            await createChatMessages([{ role: 'user', message: fullCombined }]);
            const hostMsgId = getLastMessageId();

            networkClient?.broadcast({
                type: 'user_message',
                data: {
                    batchId,
                    content: userLayerMessage,
                    inputs: snapshot,
                    userLayerHidden: false
                }
            });

            await triggerSlash('/trigger');

            try {
                if (hostMsgId >= 0) {
                    await setChatMessages([{ message_id: hostMsgId, message: userLayerMessage }]);
                }
            } catch (e) {
                console.warn('[联机Mod] 用户层脱敏回写失败:', e);
            }

            clearPendingInputs();
        } catch (e) {
            addLog('error', '系统', `发送给AI失败: ${e.message}`);
            console.error('[联机Mod] submitToAI 失败:', e);
        } finally {
            submitInFlight = false;
        }
    };

    const renameSelf = (newNameRaw) => {
        if (!networkClient) return { ok: false, reason: 'no_client' };

        const newName = (newNameRaw || '').trim();
        if (!newName) return { ok: false, reason: 'empty' };

        const myId = networkClient.userId;
        const duplicated = users.value.find(
            u => u.id !== myId && normalizeUserName(u.name) === normalizeUserName(newName)
        );

        if (duplicated) {
            addLog('error', '系统', `用户名 "${newName}" 已被占用`);
            return { ok: false, reason: 'duplicate' };
        }

        networkClient.userName = newName;
        const me = users.value.find(u => u.id === myId);
        if (me) me.name = newName;

        if (isConnected.value) {
            networkClient.broadcast({ type: 'rename', data: { name: newName } });
        }

        return { ok: true };
    };

    const setClientIdentity = ({ roomKey, name, uid, spectator }) => {
        const safeName = (name || '').trim() || '匿名';
        const safeUid = (uid || '').trim() || `uid_${Math.random().toString(36).slice(2, 10)}`;

        networkClient.userName = safeName;
        networkClient.userId = makeBoundUserId(roomKey, safeUid);
        networkClient.isSpectator = !!spectator;

        spectatorMode.value = !!spectator;
        return { safeName, safeUid };
    };

    const postJoinSync = (spectatorFlag, assumeHost = false) => {
        const hostFlag = !!(assumeHost && !spectatorFlag);

        mode.value = spectatorFlag ? 'spectator' : 'client';
        isHost.value = hostFlag;
        if (networkClient) networkClient.isHost = hostFlag;

        ensureMeExists();

        const myId = networkClient?.userId || '';

        if (hostFlag && myId) {
            users.value.forEach((u) => {
                u.isHost = (u.id === myId) && !u.isSpectator;
            });
        }

        const me = users.value.find(u => u.id === myId);
        if (me) {
            me.isSpectator = spectatorFlag;
            me.isHost = hostFlag && !spectatorFlag;
        }

        if (hostFlag) {
            syncHostStateIfNeeded();
        }

        networkClient.send({
            type: 'spectator_mode',
            data: {
                enabled: spectatorFlag,
                userId: networkClient.userId,
                userName: networkClient.userName
            }
        });

        if (!hostFlag) {
            networkClient.send({ type: 'request_pending_inputs', data: {} });
        }
    };

    const connectOnline = async (roomId, pwd, name, uid, options = {}) => {
        const { isReconnect = false, spectator = false, assumeHost = false } = options;
        const spectatorFlag = isReconnect ? !!reconnectContext?.spectator : !!spectator;

        if (!isReconnect) {
            sessionEstablished = false;
            reconnectAttempt = 0;
        }

        manualDisconnect = false;
        reconnectContext = { roomId, pwd, name, uid, spectator: spectatorFlag };

        initNetwork();
        if (!isReconnect) switchRoomLogs(roomId);

        setClientIdentity({
            roomKey: roomId,
            name,
            uid,
            spectator: spectatorFlag
        });

        try {
            const wsUrl = await RoomApiService.verifyAndJoin(settings.onlineServer, roomId, pwd);
            await networkClient.connect(wsUrl, pwd);
            postJoinSync(spectatorFlag, !isReconnect && !!assumeHost);
        } catch (e) {
            addLog('error', '系统', `${isReconnect ? '自动重连失败' : '连接失败'}: ${e.message}`);
            throw e;
        }
    };

    const disconnect = () => {
        manualDisconnect = true;
        sessionEstablished = false;
        reconnectContext = null;
        reconnectAttempt = 0;
        clearReconnectTimer();

        if (timeoutTimer) {
            clearTimeout(timeoutTimer);
            timeoutTimer = null;
        }

        isConnected.value = false;
        mode.value = 'disconnected';
        isHost.value = false;
        users.value = [];
        clearPendingInputs();
        addLog('milestone', '系统', '已断开连接');
        currentRoomId.value = '';
        chatLogs.value = [];
        topStatusLine.value = DEFAULT_STATUS_TEXT;
        topStatusLevel.value = 'info';
        debugLogs.value = [];
        networkClient?.disconnect();
    };

    const revokeMyInput = () => {
        if (!networkClient || !isConnected.value) return;

        const myId = networkClient.userId;
        if (!pendingInputs.value.has(myId)) return;

        pendingInputs.value.delete(myId);
        touchPendingInputs();

        networkClient.broadcast({
            type: 'revoke_input',
            data: {}
        });
    };

    const setSpectatorMode = (enabled) => {
        const next = !!enabled;

        // 房主禁止切到观众
        if (isHost.value && next) {
            spectatorMode.value = false;
            addLog('error', '系统', '房主不可切换为观众模式');
            return { ok: false, reason: 'host_forbidden' };
        }

        spectatorMode.value = next;

        if (!networkClient) {
            return { ok: true };
        }

        networkClient.isSpectator = next;

        const me = users.value.find(u => u.id === networkClient.userId);
        if (me) me.isSpectator = next;

        if (!isConnected.value) {
            return { ok: true };
        }

        if (next && pendingInputs.value.has(networkClient.userId)) {
            pendingInputs.value.delete(networkClient.userId);
            touchPendingInputs();
            networkClient.broadcast({ type: 'revoke_input', data: {} });
        }

        networkClient.broadcast({
            type: 'spectator_mode',
            data: {
                enabled: next,
                userId: networkClient.userId,
                userName: networkClient.userName
            }
        });

        mode.value = next ? 'spectator' : 'client';
        return { ok: true };
    };

    return {
        isConnected,
        mode,
        isHost,
        users,
        chatLogs,
        topStatusLine,
        topStatusLevel,
        currentDebugLogs,
        pendingInputs,
        pendingInputsVersion,
        pendingPersonas,
        settings,
        acuSyncState,
        variableMode,
        spectatorMode,
        addLog,
        initNetwork,
        connectOnline,
        submitToAI,
        clearPendingInputs,
        revokeMyInput,
        setSpectatorMode,
        renameSelf,
        disconnect,
        pruneRoomLogsByExistingRoomIds,
        currentRoomId,
        getClient: () => networkClient
    };
});


// ==========================================
// 5. 数据库 
// ==========================================
const initACUSync = (store) => {
    const getWin = () => window.top || window.parent || window;
    const getApi = () => getWin().AutoCardUpdaterAPI || null;

    let retry = 0;
    let debounceTimer = null;

    // 模板恢复状态
    let hasTemplateBackup = false;
    let originalTemplateBackup = null;
    let templateOverriddenBySync = false;
    let restoringTemplate = false;

    const deepClone = (obj) => {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (e) {
            return null;
        }
    };

    const sanitizeTableData = (raw) => {
        const src = (raw && typeof raw === 'object') ? raw : {};
        const out = {};

        const mate = (src.mate && typeof src.mate === 'object')
            ? deepClone(src.mate)
            : { type: 'chatSheets', version: 1 };

        out.mate = mate || { type: 'chatSheets', version: 1 };

        Object.keys(src).forEach((k) => {
            if (k.startsWith('sheet_')) {
                out[k] = deepClone(src[k]);
            }
        });

        return out;
    };

    const hasAnySheet = (data) => {
        return !!Object.keys(data || {}).find(k => k.startsWith('sheet_'));
    };

    const backupOriginalTemplateIfNeeded = () => {
        if (hasTemplateBackup) return;

        const api = getApi();
        if (!api?.getTableTemplate) return;

        const current = api.getTableTemplate();
        originalTemplateBackup = current ? deepClone(current) : null;
        hasTemplateBackup = true;
    };

    const restoreOriginalTemplateIfNeeded = async (reason = 'disconnect') => {
        if (!templateOverriddenBySync || restoringTemplate) return;

        const api = getApi();
        if (!api) return;

        restoringTemplate = true;
        try {
            if (originalTemplateBackup && api.importTemplateFromData) {
                const ret = await api.importTemplateFromData(originalTemplateBackup);
                if (!ret?.success) {
                    store.addLog('error', '系统', `恢复原模板失败: ${ret?.message || '未知错误'}`);
                    return;
                }
            } else if (!originalTemplateBackup && api.resetTemplate) {
                await api.resetTemplate();
            }

            store.addLog('milestone', '系统', `已恢复本地模板（${reason}）`);
            templateOverriddenBySync = false;
            hasTemplateBackup = false;
            originalTemplateBackup = null;
        } catch (e) {
            store.addLog('error', '系统', `恢复原模板失败: ${e?.message || e}`);
        } finally {
            restoringTemplate = false;
        }
    };

    const extractACUData = () => {
        const api = getApi();
        if (!api?.exportTableAsJson) return null;

        const tableJson = api.exportTableAsJson();
        const tables = sanitizeTableData(tableJson);

        if (!hasAnySheet(tables)) return null;

        const currentTemplate = api.getTableTemplate ? deepClone(api.getTableTemplate()) : null;

        // isolationKey 仅用于状态展示/兼容
        const chat = getWin().SillyTavern?.getContext?.()?.chat || [];
        let isoKey = '';
        for (let i = chat.length - 1; i >= 0; i--) {
            const msg = chat[i] || {};
            if (msg.TavernDB_ACU_IsolatedData) {
                const keys = Object.keys(msg.TavernDB_ACU_IsolatedData);
                if (keys.length > 0) {
                    isoKey = keys[0];
                    break;
                }
            }
            if (msg.TavernDB_ACU_Identity !== undefined) {
                isoKey = msg.TavernDB_ACU_Identity || '';
                break;
            }
        }

        return {
            isolationKey: isoKey,
            tables,
            template: currentTemplate,
            modifiedKeys: Object.keys(tables).filter(k => k.startsWith('sheet_'))
        };
    };

    const importTemplateIfProvided = async (template) => {
        if (!template || typeof template !== 'object') return;

        const api = getApi();
        if (!api?.importTemplateFromData) return;

        backupOriginalTemplateIfNeeded();

        const ret = await api.importTemplateFromData(template);
        if (!ret?.success) {
            throw new Error(ret?.message || '模板导入失败');
        }

        templateOverriddenBySync = true;
    };

    const importTablesIfProvided = async (tables) => {
        if (!tables || typeof tables !== 'object') return;

        const api = getApi();
        if (!api?.importTableAsJson) return;

        const sanitized = sanitizeTableData(tables);
        if (!hasAnySheet(sanitized)) return;

        const ok = await api.importTableAsJson(JSON.stringify(sanitized));
        if (ok === false) {
            throw new Error('表格数据导入失败');
        }
    };

    const register = () => {
        const api = getApi();

        if (!api?.registerTableUpdateCallback) {
            if (++retry < 20) setTimeout(register, 3000);
            return;
        }

        const win = getWin();

        const oldCb = win[ACU_REGISTERED_CALLBACK_KEY];
        if (oldCb && typeof api.unregisterTableUpdateCallback === 'function') {
            try {
                api.unregisterTableUpdateCallback(oldCb);
            } catch (e) {}
        }

        const cb = () => {
            if (store.isConnected && store.isHost) {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    const data = extractACUData();
                    if (!data) return;

                    const shouldFull = !store.acuSyncState.fullSynced;
                    const payload = shouldFull
                        ? data
                        : {
                            isolationKey: data.isolationKey,
                            tables: data.tables,
                            modifiedKeys: data.modifiedKeys
                        };

                    store.getClient()?.broadcast({
                        type: shouldFull ? 'acu_full_sync' : 'acu_delta_sync',
                        data: payload
                    });

                    if (shouldFull) {
                        store.acuSyncState.fullSynced = true;
                        store.acuSyncState.lastSyncTimestamp = Date.now();
                        store.acuSyncState.isolationKey = data.isolationKey || '';
                    }
                }, 3000);
            }
        };

        api.registerTableUpdateCallback(cb);
        win[ACU_REGISTERED_CALLBACK_KEY] = cb;
        win[ACU_CALLBACK_REGISTERED_FLAG_KEY] = true;
    };

    onEventTracked('multiplayer_acu_full_sync', async (payload) => {
        if (store.isHost) return;

        try {
            await importTemplateIfProvided(payload?.template);
            await importTablesIfProvided(payload?.tables);
        } catch (e) {
            store.addLog('error', '系统', `同步数据库失败: ${e?.message || e}`);
        }
    });

    onEventTracked('multiplayer_acu_delta_sync', async (payload) => {
        if (store.isHost) return;

        try {
            if (payload?.template) {
                await importTemplateIfProvided(payload.template);
            }
            await importTablesIfProvided(payload?.tables);
        } catch (e) {
            store.addLog('error', '系统', `增量同步数据库失败: ${e?.message || e}`);
        }
    });

    watch(
        () => store.isConnected,
        (connected) => {
            if (!connected) {
                store.acuSyncState.fullSynced = false;
                store.acuSyncState.lastSyncTimestamp = 0;
                store.acuSyncState.isolationKey = '';
                restoreOriginalTemplateIfNeeded('退出房间');
            }
        }
    );

    register();
};

// ==========================================
// 6. 剧透遮罩渲染 
// ==========================================
const initSpoilerEngine = () => {
    const targetDoc = parentWindow.document;
    const ua = parentWindow.navigator?.userAgent || '';
    const deviceMemory = Number(parentWindow.navigator?.deviceMemory || 8);
    const hardwareConcurrency = Number(parentWindow.navigator?.hardwareConcurrency || 8);
    const isLowPerfDevice =
        /Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(ua) ||
        deviceMemory <= 4 ||
        hardwareConcurrency <= 4;

    const process = (root) => {
        if (!root || root.dataset?.mpSpoilerScanned === '1') return;

        const walker = targetDoc.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        const nodes = [];
        while (walker.nextNode()) {
            if (walker.currentNode.textContent.includes('||')) nodes.push(walker.currentNode);
        }

        nodes.forEach(node => {
            const text = node.textContent;
            const regex = /\|\|(.+?)\|\|/g;

            if (regex.test(text)) {
                const frag = targetDoc.createDocumentFragment();
                let match;
                let last = 0;
                regex.lastIndex = 0;

                while ((match = regex.exec(text)) !== null) {
                    if (match.index > last) {
                        frag.appendChild(targetDoc.createTextNode(text.slice(last, match.index)));
                    }
                    const span = targetDoc.createElement('span');
                    span.className = 'mp-spoiler';
                    span.textContent = match[1];
                    span.onclick = function() { this.classList.toggle('revealed'); };
                    frag.appendChild(span);
                    last = match.index + match[0].length;
                }

                if (last < text.length) {
                    frag.appendChild(targetDoc.createTextNode(text.slice(last)));
                }

                node.parentNode?.replaceChild(frag, node);
            }
        });

        if (root.dataset) root.dataset.mpSpoilerScanned = '1';
    };

    const handler = (mesId) => setTimeout(() => {
        const el = targetDoc.querySelector(`[mesid="${mesId}"] .mes_text`);
        if (el) process(el);
    }, 50);

    onEventTracked(tavern_events.USER_MESSAGE_RENDERED, handler);
    onEventTracked(tavern_events.CHARACTER_MESSAGE_RENDERED, handler);

    const processInChunks = (elements, chunkSize = 8) => {
        let i = 0;
        const run = () => {
            const end = Math.min(i + chunkSize, elements.length);
            for (; i < end; i++) process(elements[i]);
            if (i < elements.length) {
                setTimeout(run, 16);
            }
        };
        run();
    };

    setTimeout(() => {
        const all = Array.from(targetDoc.querySelectorAll('.mes_text'));
        const seed = isLowPerfDevice ? all.slice(-20) : all;
        processInChunks(seed, isLowPerfDevice ? 4 : 10);
    }, 1000);
};

// ==========================================
// 7. ST 原生事件桥接 
// ==========================================
const initSTHooks = (store) => {
    let streamMsgId = null; // 客户端当前流式消息 ID
    let lastDeleteTrackId = getLastMessageId(); // 删除追踪

    // 房主端流标识
    let hostStreamId = '';
    let hostStreamSeq = 0;
    let hostAiResponseSent = false;
    let hostLastAiResponseContent = '';

    // 客户端端流状态
    let clientActiveStreamId = '';
    let clientLastSeq = 0;

    // 已完成流 -> 本地消息 ID（用于变量同步精准落位）
    const completedStreamMessageMap = new Map();
    const COMPLETED_STREAM_CACHE_LIMIT = 50;

    // 已处理变量同步包去重（避免重复包导致重复写入）
    const seenSyncPacketIds = new Set();
    const seenSyncPacketQueue = [];
    const SYNC_PACKET_CACHE_LIMIT = 50;

    // 串行化消息写入，避免 create/set 并发竞态
    let streamQueue = Promise.resolve();
    const enqueueStreamTask = (task) => {
        streamQueue = streamQueue
            .then(() => task())
            .catch((e) => {
                console.error('[联机Mod] 流式任务失败:', e);
            });
        return streamQueue;
    };

    const rememberCompletedStreamMessage = (streamId, messageId) => {
        const sid = (streamId || '').toString();
        const mid = Number(messageId);
        if (!sid || !Number.isFinite(mid) || mid < 0) return;

        if (completedStreamMessageMap.has(sid)) {
            completedStreamMessageMap.delete(sid);
        }
        completedStreamMessageMap.set(sid, mid);

        while (completedStreamMessageMap.size > COMPLETED_STREAM_CACHE_LIMIT) {
            const oldest = completedStreamMessageMap.keys().next().value;
            if (!oldest) break;
            completedStreamMessageMap.delete(oldest);
        }
    };

    const makeSyncPacketId = (prefix = 'sync') => {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    };

    const rememberSyncPacketId = (packetId = '') => {
        const id = (packetId || '').toString();
        if (!id) return true;
        if (seenSyncPacketIds.has(id)) return false;

        seenSyncPacketIds.add(id);
        seenSyncPacketQueue.push(id);

        while (seenSyncPacketQueue.length > SYNC_PACKET_CACHE_LIMIT) {
            const dropped = seenSyncPacketQueue.shift();
            if (dropped) seenSyncPacketIds.delete(dropped);
        }
        return true;
    };

    const hasMvuSyncPayload = (vars) => {
        return !!(vars && (vars.stat_data || vars.display_data || vars.delta_data || vars.schema));
    };

    const normalizeAssistantContentForMatch = (text = '') => {
        return String(text || '')
            .replace(/\s*<StatusPlaceHolderImpl\/>\s*/g, '\n')
            .trim();
    };

    const findLatestAssistantMessageId = (expectedContent = '') => {
        const lastId = getLastMessageId();
        if (lastId < 0) return -1;

        let messages = [];
        try {
            messages = getChatMessages(`0-${lastId}`) || [];
        } catch (e) {
            return -1;
        }

        const expected = normalizeAssistantContentForMatch(expectedContent);

        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i] || {};
            if (msg.role !== 'assistant') continue;

            if (!expected) return i;

            const current = normalizeAssistantContentForMatch(msg.message ?? '');
            if (current === expected) return i;
        }

        return -1;
    };

    const waitForAssistantMessageId = async ({
        streamId = '',
        expectedContent = '',
        maxWaitMs = 1500,
        stepMs = 120
    } = {}) => {
        const sid = (streamId || '').toString();
        const start = Date.now();

        while (Date.now() - start <= maxWaitMs) {
            if (sid && completedStreamMessageMap.has(sid)) {
                const cached = Number(completedStreamMessageMap.get(sid));
                if (Number.isFinite(cached) && cached >= 0) return cached;
            }

            const matchedId = findLatestAssistantMessageId(expectedContent);
            if (matchedId >= 0) return matchedId;

            await new Promise(resolve => setTimeout(resolve, stepMs));
        }

        // 定位失败时禁止回退到“最后助手楼层”，交给上层按失败处理
        return -1;
    };

    const waitForMvuPayloadReady = async ({
        expectedContent = '',
        maxWaitMs = 1400,
        stepMs = 100
    } = {}) => {
        const start = Date.now();

        while (Date.now() - start <= maxWaitMs) {
            const msgId = findLatestAssistantMessageId(expectedContent);
            if (msgId >= 0) {
                try {
                    const vars = getVariables({ type: 'message', message_id: msgId });
                    if (hasMvuSyncPayload(vars)) {
                        return { msgId, vars };
                    }
                } catch (e) {}
            }

            await new Promise(resolve => setTimeout(resolve, stepMs));
        }

        return null;
    };

    // 历史同步去重：sourceIndex -> fingerprint
    const historySyncIndexMap = new Map();

    const HISTORY_SYNC_CHUNK_SIZE = 20;
    const HISTORY_SYNC_SESSION_LIMIT = 24;
    const HISTORY_SYNC_PACKET_DEDUPE_LIMIT = 300;

    // 房主侧：记录客户端已确认偏移，支持断点续传
    const historySyncHostAckMap = new Map(); // key: userId::batchId -> ackOffset
    // 客户端侧：记录会话进度与去重信息
    const historySyncClientSessions = new Map(); // key: batchId -> session

    const makeHistorySyncBatchId = () => `hs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const makeHistorySyncHostKey = (userId = '', batchId = '') => `${String(userId)}::${String(batchId)}`;

    const toSafeInt = (v, fallback = 0) => {
        const n = Number(v);
        return Number.isFinite(n) ? Math.floor(n) : fallback;
    };

    const normalizeHistoryRole = (rawRole = '', rawMessage = {}) => {
        const directRole = String(rawRole || '').trim().toLowerCase();
        if (directRole) return directRole;

        if (rawMessage && typeof rawMessage === 'object') {
            if (rawMessage.is_user === true || rawMessage.isUser === true) return 'user';
            if (rawMessage.is_system === true || rawMessage.isSystem === true) return 'system';
            if (rawMessage.is_assistant === true || rawMessage.isAssistant === true) return 'assistant';
        }

        return '';
    };

    const normalizeHistoryMessage = (rawMessage = {}) => {
        const candidates = [
            rawMessage?.message,
            rawMessage?.mes,
            rawMessage?.content,
            rawMessage?.text
        ];

        for (const candidate of candidates) {
            if (candidate === undefined || candidate === null) continue;
            if (typeof candidate === 'string') return candidate;
            try {
                return JSON.stringify(candidate);
            } catch (e) {
                return String(candidate);
            }
        }

        return '';
    };

    const normalizeHistoryRecord = (rawMessage = {}, fallbackSourceIndex = -1) => {
        const role = normalizeHistoryRole(rawMessage?.role, rawMessage);
        const message = normalizeHistoryMessage(rawMessage);
        const sourceIndexRaw = rawMessage?.sourceIndex;
        const sourceIndex = Number.isFinite(Number(sourceIndexRaw))
            ? Math.floor(Number(sourceIndexRaw))
            : (Number.isFinite(Number(fallbackSourceIndex)) ? Math.floor(Number(fallbackSourceIndex)) : -1);

        return {
            sourceIndex,
            role,
            message
        };
    };

    const buildHistoryMessageFingerprint = (role = '', message = '') => {
        return `${String(role || '').trim().toLowerCase()}\n${String(message ?? '')}`;
    };

    const buildLocalHistoryFingerprintBudget = () => {
        const budget = new Map();

        try {
            const lastId = getLastMessageId();
            if (lastId < 0) return budget;

            const localMessages = getChatMessages(`0-${lastId}`) || [];
            localMessages.forEach((raw, idx) => {
                const rec = normalizeHistoryRecord(raw, idx);
                if (!rec.role) return;

                const fp = buildHistoryMessageFingerprint(rec.role, rec.message);
                budget.set(fp, (budget.get(fp) || 0) + 1);
            });
        } catch (e) {}

        return budget;
    };

    const consumeHistoryFingerprintBudget = (budget, fingerprint) => {
        if (!budget || !fingerprint) return false;
        const count = Number(budget.get(fingerprint) || 0);
        if (count <= 0) return false;

        if (count === 1) budget.delete(fingerprint);
        else budget.set(fingerprint, count - 1);
        return true;
    };

    const trimHistorySyncClientSessions = () => {
        while (historySyncClientSessions.size > HISTORY_SYNC_SESSION_LIMIT) {
            const oldest = historySyncClientSessions.keys().next().value;
            if (!oldest) break;
            historySyncClientSessions.delete(oldest);
        }
    };

    const ensureHistorySyncClientSession = (batchId = '', hintTotal = 0) => {
        const key = (batchId || 'legacy').toString();
        if (!historySyncClientSessions.has(key)) {
            historySyncClientSessions.set(key, {
                batchId: key,
                total: Math.max(0, toSafeInt(hintTotal, 0)),
                received: 0,
                seenPackets: new Set(),
                seenPacketsQueue: [],
                seenLegacyItems: new Set(),
                receivedRanges: [],
                localFingerprintBudget: null
            });
            trimHistorySyncClientSessions();
        }

        const s = historySyncClientSessions.get(key);
        if (Number.isFinite(toSafeInt(hintTotal, NaN))) {
            s.total = Math.max(s.total, Math.max(0, toSafeInt(hintTotal, 0)));
        }

        if (!s.localFingerprintBudget) {
            s.localFingerprintBudget = buildLocalHistoryFingerprintBudget();
        }

        return s;
    };

    const appendHistorySyncReceivedRange = (session, start, endExclusive) => {
        if (!session) return;

        let s = Math.max(0, toSafeInt(start, 0));
        let e = Math.max(0, toSafeInt(endExclusive, 0));
        if (e <= s) return;

        const ranges = Array.isArray(session.receivedRanges) ? session.receivedRanges : [];
        const next = [];
        let inserted = false;

        for (const r of ranges) {
            const rs = Math.max(0, toSafeInt(r?.start, 0));
            const re = Math.max(0, toSafeInt(r?.end, 0));
            if (re <= rs) continue;

            if (re < s) {
                next.push({ start: rs, end: re });
                continue;
            }

            if (e < rs) {
                if (!inserted) {
                    next.push({ start: s, end: e });
                    inserted = true;
                }
                next.push({ start: rs, end: re });
                continue;
            }

            s = Math.min(s, rs);
            e = Math.max(e, re);
        }

        if (!inserted) {
            next.push({ start: s, end: e });
        }

        next.sort((a, b) => a.start - b.start);
        session.receivedRanges = next;

        const first = next[0];
        if (!first || first.start > 0) {
            session.received = 0;
            return;
        }

        let contiguousEnd = first.end;
        for (let i = 1; i < next.length; i++) {
            const r = next[i];
            if (r.start > contiguousEnd) break;
            contiguousEnd = Math.max(contiguousEnd, r.end);
        }

        session.received = Math.max(0, contiguousEnd);
        if (session.total > 0 && session.received > session.total) {
            session.received = session.total;
        }
    };

    const rememberHistorySyncPacket = (session, packetKey) => {
        if (!session || !packetKey) return false;
        if (session.seenPackets.has(packetKey)) return false;
        session.seenPackets.add(packetKey);
        session.seenPacketsQueue.push(packetKey);
        while (session.seenPacketsQueue.length > HISTORY_SYNC_PACKET_DEDUPE_LIMIT) {
            const dropped = session.seenPacketsQueue.shift();
            if (dropped) session.seenPackets.delete(dropped);
        }
        return true;
    };

    // ---- 正则同步：范围解析 + 备份/回滚 ----
    const normalizeRegexScopeList = (scopes) => {
        return ['character'];
    };

    const cloneRegexes = (regexes) => JSON.parse(JSON.stringify(regexes || []));

    const tryGetRegexesByScope = async (scopeKey) => {
        const key = 'character';
        const candidates = ['character'];

        for (const apiScope of candidates) {
            try {
                const regexes = await Promise.resolve(getTavernRegexes({ scope: apiScope }));
                if (Array.isArray(regexes)) {
                    return { ok: true, apiScope, regexes };
                }
            } catch (e) {}
        }

        return { ok: false, apiScope: candidates[0] || key, regexes: [] };
    };

    const tryReplaceRegexesByScope = async (scopeKey, regexes, preferredApiScope = '') => {
        const key = 'character';
        const candidates = [preferredApiScope, 'character'].filter(Boolean);
        const uniqueCandidates = Array.from(new Set(candidates));

        let lastErr = null;
        for (const apiScope of uniqueCandidates) {
            try {
                await replaceTavernRegexes(regexes, { scope: apiScope });
                return apiScope;
            } catch (e) {
                lastErr = e;
            }
        }

        throw lastErr || new Error(`replaceTavernRegexes 失败: ${key}`);
    };

    const regexBackupMap = new Map();

    const ensureRegexBackup = async (scopeKey, fallbackApiScope = '') => {
        const key = 'character';
        if (regexBackupMap.has(key)) return;

        const snap = await tryGetRegexesByScope(key);
        if (!snap.ok) return;

        regexBackupMap.set(key, {
            scopeKey: key,
            apiScope: fallbackApiScope || snap.apiScope || key,
            regexes: cloneRegexes(snap.regexes)
        });
    };

    const applyRegexSyncPacket = async (packet) => {
        const scopeKey = 'character';
        const regexes = Array.isArray(packet?.regexes) ? packet.regexes : null;
        if (!regexes) return;

        await ensureRegexBackup(scopeKey, packet?.apiScope || '');
        await tryReplaceRegexesByScope(scopeKey, regexes, packet?.apiScope || '');
    };

    const rollbackRegexBackups = async (reason = 'disconnect') => {
        if (regexBackupMap.size === 0) return;

        const entries = Array.from(regexBackupMap.values());
        for (const item of entries) {
            try {
                await tryReplaceRegexesByScope(item.scopeKey, item.regexes, item.apiScope);
            } catch (e) {
                store.addLog('error', '系统', `回滚${item.scopeKey}正则失败: ${e?.message || e}`);
            }
        }

        regexBackupMap.clear();
        store.addLog('milestone', '系统', `已回滚正则覆盖（${reason}）`);
    };

    // ---- 角色脚本同步：快照 + 备份/回滚 ----
    const cloneScriptState = (obj, fallback = null) => {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (e) {
            return fallback;
        }
    };

    const getRuntimeFn = (name) => {
        try {
            if (typeof globalThis !== 'undefined' && typeof globalThis[name] === 'function') return globalThis[name];
        } catch (e) {}
        try {
            if (typeof parentWindow?.[name] === 'function') return parentWindow[name];
        } catch (e) {}
        return null;
    };

    const hasScriptTreeApi = () => typeof getRuntimeFn('getScriptTrees') === 'function';

    const tryGetCharacterScriptState = async () => {
        const getTreesFn = getRuntimeFn('getScriptTrees');
        if (!getTreesFn) {
            return { ok: false, error: '脚本API不可用（缺少 getScriptTrees）', state: null };
        }

        try {
            const trees = await Promise.resolve(getTreesFn({ type: 'character' }));
            const getEnabledButtonsFn = getRuntimeFn('getAllEnabledScriptButtons');

            let enabledButtons = [];
            if (getEnabledButtonsFn) {
                try {
                    const ret = await Promise.resolve(getEnabledButtonsFn());
                    enabledButtons = Array.isArray(ret) ? ret : [];
                } catch (e) {
                    enabledButtons = [];
                }
            }

            return {
                ok: true,
                error: '',
                state: {
                    scriptTrees: cloneScriptState(trees, null),
                    enabledButtons: cloneScriptState(enabledButtons, []),
                    capturedAt: Date.now()
                }
            };
        } catch (e) {
            return {
                ok: false,
                error: `读取角色脚本失败: ${e?.message || e}`,
                state: null
            };
        }
    };

    const isTruthyApplyResult = (ret) => {
        if (ret === false) return false;
        if (ret && typeof ret === 'object' && ret.success === false) return false;
        return true;
    };

    const tryApplyCharacterScriptTrees = async (scriptTrees) => {
        const replaceFn = getRuntimeFn('replaceScriptTrees');
        const setFn = getRuntimeFn('setScriptTrees');
        const appliers = [replaceFn, setFn].filter(fn => typeof fn === 'function');

        if (appliers.length === 0) {
            throw new Error('脚本API不可用（缺少 replaceScriptTrees/setScriptTrees）');
        }

        const callArgsList = [
            [{ type: 'character', scriptTrees }],
            [{ type: 'character', trees: scriptTrees }],
            [scriptTrees, { type: 'character' }],
            [scriptTrees, 'character'],
            [scriptTrees]
        ];

        let lastErr = null;
        for (const fn of appliers) {
            for (const args of callArgsList) {
                try {
                    const ret = await Promise.resolve(fn(...args));
                    if (isTruthyApplyResult(ret)) return;
                } catch (e) {
                    lastErr = e;
                }
            }
        }

        throw (lastErr || new Error('角色脚本应用失败'));
    };

    let scriptBackupState = null;

    const ensureScriptBackup = async () => {
        if (scriptBackupState) return;
        const snap = await tryGetCharacterScriptState();
        if (!snap.ok || !snap.state) return;
        scriptBackupState = snap.state;
    };

    const applyScriptSyncState = async (state) => {
        if (!state || typeof state !== 'object') {
            throw new Error('脚本同步数据无效');
        }

        if (state.scriptTrees === undefined || state.scriptTrees === null) {
            throw new Error('脚本同步数据缺少 scriptTrees');
        }

        await ensureScriptBackup();
        await tryApplyCharacterScriptTrees(state.scriptTrees);

        // 仅做校验/日志辅助：确保同步包已覆盖启用按钮信息
        if (Array.isArray(state.enabledButtons)) {
            const getEnabledButtonsFn = getRuntimeFn('getAllEnabledScriptButtons');
            if (getEnabledButtonsFn) {
                try {
                    const localEnabled = await Promise.resolve(getEnabledButtonsFn());
                    const localCount = Array.isArray(localEnabled) ? localEnabled.length : 0;
                    const remoteCount = state.enabledButtons.length;
                    if (localCount !== remoteCount) {
                        store.addLog('info', '系统', `脚本按钮启用快照已校验（远端${remoteCount}/本地${localCount}）`);
                    }
                } catch (e) {}
            }
        }
    };

    const rollbackScriptBackup = async (reason = 'disconnect') => {
        if (!scriptBackupState) return;

        try {
            await tryApplyCharacterScriptTrees(scriptBackupState.scriptTrees);
            store.addLog('milestone', '系统', `已恢复本地角色脚本（${reason}）`);
        } catch (e) {
            store.addLog('error', '系统', `恢复本地角色脚本失败: ${e?.message || e}`);
        } finally {
            scriptBackupState = null;
        }
    };

    let lastConnected = !!store.isConnected;
    watch(
        () => store.isConnected,
        (connected) => {
            if (lastConnected && !connected) {
                rollbackRegexBackups('连接断开');
                rollbackScriptBackup('连接断开');
            }
            if (!connected) {
                historySyncIndexMap.clear();
                historySyncHostAckMap.clear();
                historySyncClientSessions.clear();
                completedStreamMessageMap.clear();
                seenSyncPacketIds.clear();
                seenSyncPacketQueue.length = 0;
                scriptBackupState = null;
            }
            lastConnected = !!connected;
        }
    );

    watch(
        () => store.currentRoomId,
        () => {
            historySyncIndexMap.clear();
            historySyncHostAckMap.clear();
            historySyncClientSessions.clear();
            completedStreamMessageMap.clear();
            seenSyncPacketIds.clear();
            seenSyncPacketQueue.length = 0;
        }
    );

    // ---- 房主：广播流式 Token ----
    onEventTracked(tavern_events.STREAM_TOKEN_RECEIVED, (token) => {
        if (store.isHost && store.isConnected) {
            if (!hostStreamId) {
                hostStreamId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                hostStreamSeq = 0;
                hostAiResponseSent = false;
                hostLastAiResponseContent = '';
            }
            hostStreamSeq += 1;

            store.getClient()?.broadcast({
                type: 'ai_stream',
                data: {
                    streamId: hostStreamId,
                    seq: hostStreamSeq,
                    content: token
                }
            });
        }
    });

    // ---- 房主：广播完整 AI 回复 ----
    onEventTracked(tavern_events.MESSAGE_RECEIVED, (data) => {
        lastDeleteTrackId = getLastMessageId();
        if (!store.isHost || !store.isConnected) return;

        const msgs = getChatMessages(data);
        if (msgs.length > 0 && msgs[0].role === 'assistant') {
            if (!hostStreamId) {
                hostStreamId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                hostStreamSeq = 0;
                hostAiResponseSent = false;
                hostLastAiResponseContent = '';
            }

            const doneStreamId = hostStreamId;
            const content = (msgs[0].message ?? '').toString();

            // 某些环境下 MESSAGE_RECEIVED 可能对同一条消息触发多次，避免反复广播正文
            if (hostAiResponseSent && hostLastAiResponseContent === content) return;

            store.getClient()?.broadcast({
                type: 'ai_response',
                data: {
                    streamId: doneStreamId,
                    content,
                    variableModes: Array.isArray(store.variableMode) ? store.variableMode : []
                }
            });

            hostAiResponseSent = true;
            hostLastAiResponseContent = content;
        }
    });

    // ---- 房主：消息发送后更新追踪 ID ----
    onEventTracked(tavern_events.MESSAGE_SENT, () => {
        lastDeleteTrackId = getLastMessageId();
    });

    // ---- 房主：检测删除最新消息并广播 ----
    onEventTracked(tavern_events.MESSAGE_DELETED, (id) => {
        if (store.isConnected && store.isHost) {
            if (id === lastDeleteTrackId) {
                store.getClient()?.broadcast({ type: 'delete_last_message', data: {} });
            }
            lastDeleteTrackId = getLastMessageId();
        }
    });

    // ---- 房主：AI 生成结束后同步 MVU 变量 ----
    onEventTracked(tavern_events.GENERATION_ENDED, () => {
        const endedStreamId = hostStreamId;
        let endedAiContent = hostLastAiResponseContent;

        if (store.isConnected && store.isHost) {
            // 一轮生成结束：重置流标识，保证下一轮不会复用旧 streamId
            hostStreamId = '';
            hostStreamSeq = 0;
            hostAiResponseSent = false;
            hostLastAiResponseContent = '';
        }

        if (
            store.isConnected &&
            store.isHost &&
            Array.isArray(store.variableMode) &&
            store.variableMode.includes('mvu')
        ) {
            (async () => {
                try {
                    // 生成结束后等待变量就绪，避免固定延迟导致竞态
                    const ready = await waitForMvuPayloadReady({
                        expectedContent: endedAiContent,
                        maxWaitMs: 1400,
                        stepMs: 100
                    });

                    if (!ready || ready.msgId < 0 || !hasMvuSyncPayload(ready.vars)) {
                        return;
                    }

                    const msgId = ready.msgId;
                    const vars = ready.vars;

                    if (!endedAiContent) {
                        const single = getChatMessages(`${msgId}-${msgId}`) || [];
                        endedAiContent = (single[0]?.message ?? '').toString();
                    }

                    store.getClient()?.broadcast({
                        type: 'sync_variables',
                        data: {
                            variableType: 'mvu',
                            packetId: makeSyncPacketId('mvu_auto'),
                            content: {
                                stat_data: vars.stat_data,
                                display_data: vars.display_data,
                                delta_data: vars.delta_data,
                                schema: vars.schema,
                                _syncMeta: {
                                    streamId: endedStreamId,
                                    assistantContent: endedAiContent
                                }
                            }
                        }
                    });
                } catch (e) {
                    console.error('[联机Mod] MVU 自动同步失败:', e);
                }
            })();
        }
    });

    // ---- 房主：注入联机玩家 Persona ----
    onEventTracked(tavern_events.GENERATION_AFTER_COMMANDS, () => {
        const personaMap = (() => {
            const pp = store.pendingPersonas;
            return (pp && typeof pp.has === 'function') ? pp : (pp?.value ?? new Map());
        })();

        if (store.isHost && personaMap.size > 0) {
            const combined = Array.from(personaMap.values())
                .map(p => `${p.prefix} ${p.content}`)
                .join('\n\n');
            injectPrompts([{
                id: PERSONA_PROMPT_ID,
                position: 'in_chat',
                depth: 0,
                role: 'system',
                content: combined
            }], { once: true });
            personaMap.clear();
            try { triggerRef(store.pendingPersonas); } catch (e) {}
        }

    });

    // ---- 客户端：接收流式 Token ----
    onEventTracked('multiplayer_ai_stream', (payload) => {
        if (store.isHost) return;

        enqueueStreamTask(async () => {
            const data = typeof payload === 'string'
                ? { content: payload, streamId: '', seq: 0 }
                : (payload || {});

            const token = (data.content ?? '').toString();
            const incomingStreamId = (data.streamId || '').toString();
            const incomingSeq = Number(data.seq || 0);

            // 新流：重置序列与消息引用
            if (incomingStreamId && incomingStreamId !== clientActiveStreamId) {
                clientActiveStreamId = incomingStreamId;
                clientLastSeq = 0;
                streamMsgId = null;
            }

            // 去重/乱序保护（有 seq 时生效）
            if (incomingSeq > 0) {
                if (incomingSeq <= clientLastSeq) return;
                clientLastSeq = incomingSeq;
            }

            if (streamMsgId === null) {
                await createChatMessages([{ role: 'assistant', message: token }]);
                streamMsgId = getLastMessageId();
            } else {
                await setChatMessages([{ message_id: streamMsgId, message: token }]);
            }
        });
    });

    // ---- 客户端：接收完整 AI 回复 ----
    onEventTracked('multiplayer_ai_response', (payload) => {
        if (store.isHost) return;

        enqueueStreamTask(async () => {
            try {
                const data = typeof payload === 'string'
                    ? { content: payload, streamId: '' }
                    : (payload || {});

                const content = (data.content ?? '').toString();
                const doneStreamId = (data.streamId || '').toString();

                let finalContent = content;
                if (
                    Array.isArray(store.variableMode) &&
                    store.variableMode.includes('mvu') &&
                    !content.includes('<StatusPlaceHolderImpl/>')
                ) {
                    finalContent = content + '\n\n<StatusPlaceHolderImpl/>';
                }

                if (doneStreamId && clientActiveStreamId && doneStreamId !== clientActiveStreamId) {
                    // 完整包属于新轮次，直接新建，避免覆盖旧流
                    streamMsgId = null;
                    clientActiveStreamId = doneStreamId;
                    clientLastSeq = 0;
                }

                if (streamMsgId !== null) {
                    await setChatMessages([{ message_id: streamMsgId, message: finalContent }]);
                    if (doneStreamId) {
                        rememberCompletedStreamMessage(doneStreamId, streamMsgId);
                    }
                } else {
                    await createChatMessages([{ role: 'assistant', message: finalContent }]);
                    if (doneStreamId) {
                        rememberCompletedStreamMessage(doneStreamId, getLastMessageId());
                    }
                }

                streamMsgId = null;
                clientActiveStreamId = '';
                clientLastSeq = 0;

            } catch (e) {
                store.addLog('error', '系统', '同步AI回复失败');
                console.error('[联机Mod] 同步AI回复失败:', e);
            }
        });
    });

    // ---- 客户端：接收用户合并消息 ----
    const _seenUserMessageBatchIds = new Set();
    const _seenUserMessageBatchQueue = [];
    const rememberUserBatchId = (id) => {
        if (!id) return;
        if (_seenUserMessageBatchIds.has(id)) return;
        _seenUserMessageBatchIds.add(id);
        _seenUserMessageBatchQueue.push(id);
        if (_seenUserMessageBatchQueue.length > 50) {
            const drop = _seenUserMessageBatchQueue.shift();
            if (drop) _seenUserMessageBatchIds.delete(drop);
        }
    };

    onEventTracked('multiplayer_user_message', async (payload) => {
        if (store.isHost) return;

        enqueueStreamTask(async () => {
            try {
                const batchId = (payload?.batchId || '').toString();
                if (batchId && _seenUserMessageBatchIds.has(batchId)) return;
                rememberUserBatchId(batchId);

                let content = '';

                if (payload && Array.isArray(payload.inputs) && payload.inputs.length > 0) {
                    content = payload.inputs
                        .map(item => {
                            const name = item.userName || '匿名';
                            const prefix = (item.prefix || '[{name}]:').replace('{name}', name);
                            return `${prefix} ${(item.content ?? '').toString()}`;
                        })
                        .join('\n\n');
                } else {
                    content = (payload?.content ?? '').toString();
                }

                if (!content.trim()) {
                    if (!payload?.userLayerHidden) {
                        store.addLog('error', '系统', '同步用户消息为空，已忽略');
                    }
                    return;
                }

                await createChatMessages([{ role: 'user', message: content }]);
            } catch (e) {
                store.addLog('error', '系统', '创建用户消息失败');
                console.error('[联机Mod] 创建用户消息失败:', e);
            }
        });
    });

    // ---- 客户端：接收删除最新消息指令 ----
    onEventTracked('multiplayer_delete_last_message', async () => {
        if (store.isHost) return;
        try {
            const lastId = getLastMessageId();
            if (lastId >= 0) {
                await deleteChatMessages([lastId]);
            }
        } catch (e) {
            store.addLog('error', '系统', '删除消息失败');
            console.error('[联机Mod] 删除消息失败:', e);
        }
    });

    // ---- 房主：处理历史同步请求 ----
    onEventTracked('multiplayer_sync_history_request', async (payload) => {
        if (!store.isHost) return;

        const safePayload = payload ?? {};
        let userId = '';
        let depth = 0;
        let batchId = '';
        let resumeFrom = 0;
        let acceptChunk = false;
        let chunkSize = HISTORY_SYNC_CHUNK_SIZE;

        if (typeof safePayload === 'string') {
            userId = safePayload;
            batchId = makeHistorySyncBatchId();
        } else {
            userId = (safePayload.userId || '').toString();
            const d = Number(safePayload.depth);
            depth = Number.isFinite(d) && d >= 0 ? Math.floor(d) : 0;
            batchId = (safePayload.batchId || '').toString() || makeHistorySyncBatchId();
            resumeFrom = Math.max(0, toSafeInt(safePayload.resumeFrom, 0));
            acceptChunk = safePayload.acceptChunk === true;
            chunkSize = Math.max(1, Math.min(100, toSafeInt(safePayload.chunkSize, HISTORY_SYNC_CHUNK_SIZE) || HISTORY_SYNC_CHUNK_SIZE));
        }

        try {
            const lastId = getLastMessageId();
            if (lastId < 0) {
                store.getClient()?.send({
                    type: 'sync_history_data',
                    data: {
                        targetUserId: userId,
                        batchId,
                        phase: 'complete',
                        complete: true,
                        count: 0,
                        total: 0,
                        received: 0
                    }
                });
                return;
            }

            let startId = 0;
            if (depth > 0 && lastId >= depth) {
                startId = lastId - depth + 1;
            }

            const messages = getChatMessages(`${startId}-${lastId}`)
                .map((m, idx) => normalizeHistoryRecord(m, startId + idx))
                .filter(item => !!item.role);

            const total = messages.length;
            const hostSessionKey = makeHistorySyncHostKey(userId, batchId);
            const ackedOffset = Math.max(0, toSafeInt(historySyncHostAckMap.get(hostSessionKey), 0));
            const fromOffset = Math.min(total, Math.max(resumeFrom, ackedOffset));

            const client = store.getClient();

            client?.send({
                type: 'sync_history_data',
                data: {
                    targetUserId: userId,
                    batchId,
                    phase: 'start',
                    total,
                    fromOffset,
                    chunkSize,
                    complete: false
                }
            });

            if (acceptChunk) {
                for (let i = fromOffset; i < total; i += chunkSize) {
                    const chunk = messages.slice(i, i + chunkSize);
                    client?.send({
                        type: 'sync_history_data',
                        data: {
                            targetUserId: userId,
                            batchId,
                            phase: 'chunk',
                            offset: i,
                            total,
                            messages: chunk
                        }
                    });
                }
            } else {
                // 兼容旧客户端：仍按单条包发送
                for (let i = fromOffset; i < total; i++) {
                    const msg = messages[i];
                    client?.send({
                        type: 'sync_history_data',
                        data: {
                            targetUserId: userId,
                            batchId,
                            phase: 'data',
                            offset: i,
                            total,
                            sourceIndex: msg.sourceIndex,
                            role: msg.role,
                            message: msg.message
                        }
                    });
                }
            }

            client?.send({
                type: 'sync_history_data',
                data: {
                    targetUserId: userId,
                    batchId,
                    phase: 'complete',
                    complete: true,
                    count: total,
                    total,
                    received: total
                }
            });
        } catch (e) {
            store.getClient()?.send({
                type: 'sync_history_data',
                data: {
                    targetUserId: userId,
                    batchId,
                    phase: 'fail',
                    complete: false,
                    error: e?.message || '获取历史消息失败'
                }
            });
            store.addLog('error', '系统', '获取历史消息失败');
            console.error('[联机Mod] 获取历史消息失败:', e);
        }
    });

    // ---- 房主：记录历史同步 ACK（用于续传） ----
    onEventTracked('multiplayer_sync_history_ack', (payload) => {
        if (!store.isHost) return;

        const userId = (payload?.userId || '').toString();
        const batchId = (payload?.batchId || '').toString();
        if (!userId || !batchId) return;

        const nextOffset = Math.max(
            0,
            toSafeInt(payload?.resumeFrom, toSafeInt(payload?.received, 0))
        );

        historySyncHostAckMap.set(makeHistorySyncHostKey(userId, batchId), nextOffset);
    });

    // ---- 客户端：接收历史消息数据 ----
    onEventTracked('multiplayer_sync_history_data', async (data) => {
        if (store.isHost) return;

        const myId = (store.getClient()?.userId || '').toString();
        const targetUserId = (data?.targetUserId || '').toString();

        if (targetUserId && targetUserId !== myId) return;

        enqueueStreamTask(async () => {
            try {
                const batchId = (data?.batchId || 'legacy').toString();
                const phase = (data?.phase || '').toString();
                const total = Math.max(0, toSafeInt(data?.total, 0));
                const session = ensureHistorySyncClientSession(batchId, total);

                if (phase === 'start') {
                    session.total = Math.max(session.total, total);
                    const fromOffset = Math.max(0, toSafeInt(data?.fromOffset, 0));
                    session.received = Math.max(session.received, fromOffset);
                    session.receivedRanges = [];
                    session.localFingerprintBudget = buildLocalHistoryFingerprintBudget();
                    if (fromOffset > 0) {
                        session.receivedRanges.push({ start: 0, end: fromOffset });
                    }
                    eventEmit('multiplayer_sync_history_progress', {
                        batchId,
                        phase: 'start',
                        total: session.total,
                        received: session.received
                    });
                    return;
                }

                if (phase === 'fail') {
                    const message = (data?.error || '历史同步失败').toString();
                    eventEmit('multiplayer_sync_history_result', {
                        ok: false,
                        batchId,
                        message,
                        count: session.received,
                        total: session.total
                    });
                    return;
                }

                // 兼容旧格式（单条 role/message + complete）与新格式（messages 分片）
                const offset = Math.max(0, toSafeInt(data?.offset, session.received));
                let incomingItems = [];

                if (Array.isArray(data?.messages)) {
                    const packetKey = `${phase || 'chunk'}@${offset}#${data.messages.length}`;
                    if (!rememberHistorySyncPacket(session, packetKey)) return;
                    incomingItems = data.messages;
                } else if (data?.role && data?.message !== undefined) {
                    const legacyPacketKey = `${phase || 'data'}@${offset}#1#${String(data.role)}#${String(data.message).length}`;
                    if (!rememberHistorySyncPacket(session, legacyPacketKey)) return;
                    incomingItems = [{
                        sourceIndex: data?.sourceIndex,
                        role: data.role,
                        message: data.message
                    }];
                }

                if (incomingItems.length > 0) {
                    const toWrite = [];

                    incomingItems.forEach((item, idx) => {
                        const rec = normalizeHistoryRecord(item, offset + idx);
                        const role = rec.role;
                        const message = rec.message;
                        const sourceIndex = rec.sourceIndex;

                        if (!role) return;

                        const fingerprint = buildHistoryMessageFingerprint(role, message);

                        let duplicated = false;
                        if (Number.isFinite(sourceIndex) && sourceIndex >= 0) {
                            const prevFp = historySyncIndexMap.get(sourceIndex);
                            if (prevFp === fingerprint) {
                                duplicated = true;
                            } else {
                                historySyncIndexMap.set(sourceIndex, fingerprint);
                            }
                        } else {
                            const legacyItemKey = `${role}\n${message}`;
                            if (session.seenLegacyItems.has(legacyItemKey)) duplicated = true;
                            else session.seenLegacyItems.add(legacyItemKey);
                        }

                        if (!duplicated && consumeHistoryFingerprintBudget(session.localFingerprintBudget, fingerprint)) {
                            duplicated = true;
                        }

                        if (!duplicated) {
                            toWrite.push({ role, message });
                        }
                    });

                    if (toWrite.length > 0) {
                        for (const item of toWrite) {
                            await createChatMessages([{ role: item.role, message: item.message }]);
                        }
                    }

                    const nextOffset = offset + incomingItems.length;
                    appendHistorySyncReceivedRange(session, offset, nextOffset);

                    eventEmit('multiplayer_sync_history_progress', {
                        batchId,
                        phase: 'progress',
                        total: session.total,
                        received: session.received
                    });

                    store.getClient()?.send({
                        type: 'sync_history_ack',
                        data: {
                            batchId,
                            resumeFrom: session.received,
                            received: session.received
                        }
                    });
                }

                if (data?.complete || phase === 'complete') {
                    const totalCount = Math.max(session.total, Math.max(0, toSafeInt(data?.count, 0)));
                    session.total = totalCount;

                    eventEmit('multiplayer_sync_history_progress', {
                        batchId,
                        phase: 'complete',
                        total: session.total,
                        received: Math.max(session.received, Math.max(0, toSafeInt(data?.received, session.received)))
                    });

                    eventEmit('multiplayer_sync_history_result', {
                        ok: true,
                        batchId,
                        count: totalCount,
                        received: session.received,
                        total: session.total
                    });
                }
            } catch (e) {
                store.addLog('error', '系统', '创建历史消息失败');
                eventEmit('multiplayer_sync_history_result', {
                    ok: false,
                    batchId: (data?.batchId || '').toString(),
                    message: e?.message || '创建历史消息失败'
                });
                console.error('[联机Mod] 创建历史消息失败:', e);
            }
        });
    });

    // ---- 房主：处理正则同步请求 ----
    onEventTracked('multiplayer_sync_regex_request', async (payload) => {
        if (!store.isHost) return;

        const userId = (payload?.userId || payload || '').toString();
        const scopes = normalizeRegexScopeList(payload?.scopes);

        try {
            const packs = [];

            for (const scopeKey of scopes) {
                const snap = await tryGetRegexesByScope(scopeKey);
                if (!snap.ok) continue;

                packs.push({
                    scopeKey,
                    apiScope: snap.apiScope,
                    regexes: cloneRegexes(snap.regexes)
                });
            }

            if (packs.length === 0) {
                store.addLog('error', '系统', '未获取到可同步的正则数据');
                return;
            }

            store.getClient()?.send({
                type: 'sync_regex_data',
                data: {
                    packs,
                    targetUserId: userId
                }
            });
        } catch (e) {
            store.addLog('error', '系统', '获取正则失败');
            console.error('[联机Mod] 获取正则失败:', e);
        }
    });

    // ---- 客户端：接收正则数据 ----
    onEventTracked('multiplayer_sync_regex_data', async (data) => {
        if (store.isHost) return;

        const myId = (store.getClient()?.userId || '').toString();
        const targetUserId = (data?.targetUserId || '').toString();

        if (targetUserId && targetUserId !== myId) return;

        try {
            if (Array.isArray(data?.packs) && data.packs.length > 0) {
                for (const packet of data.packs) {
                    await applyRegexSyncPacket(packet);
                }
                eventEmit('multiplayer_sync_regex_result', { ok: true });
                return;
            }

            const regexes = Array.isArray(data?.regexes) ? data.regexes : null;
            if (regexes) {
                await applyRegexSyncPacket({
                    scopeKey: data?.scopeKey || 'character',
                    apiScope: data?.apiScope || 'character',
                    regexes
                });
                eventEmit('multiplayer_sync_regex_result', { ok: true });
                return;
            }

            eventEmit('multiplayer_sync_regex_result', {
                ok: false,
                message: '未收到可用的正则数据'
            });
        } catch (e) {
            store.addLog('error', '系统', '替换正则失败');
            eventEmit('multiplayer_sync_regex_result', {
                ok: false,
                message: e?.message || '替换正则失败'
            });
            console.error('[联机Mod] 替换正则失败:', e);
        }
    });

    // ---- 房主：处理角色脚本同步请求 ----
    onEventTracked('multiplayer_sync_scripts_request', async (payload) => {
        if (!store.isHost) return;

        const userId = (payload?.userId || '').toString();
        const client = store.getClient();

        try {
            if (!hasScriptTreeApi()) {
                client?.send({
                    type: 'sync_scripts',
                    data: {
                        packetId: makeSyncPacketId('script_sync'),
                        state: { error: '脚本API不可用（缺少 getScriptTrees）' },
                        targetUserId: userId
                    }
                });
                return;
            }

            const snap = await tryGetCharacterScriptState();
            if (!snap.ok || !snap.state) {
                client?.send({
                    type: 'sync_scripts',
                    data: {
                        packetId: makeSyncPacketId('script_sync'),
                        state: { error: snap.error || '读取角色脚本失败' },
                        targetUserId: userId
                    }
                });
                return;
            }

            client?.send({
                type: 'sync_scripts',
                data: {
                    packetId: makeSyncPacketId('script_sync'),
                    state: snap.state,
                    targetUserId: userId
                }
            });
        } catch (e) {
            store.addLog('error', '系统', `脚本同步失败: ${e?.message || e}`);
            console.error('[联机Mod] 脚本同步失败:', e);
        }
    });

    // ---- 客户端：接收角色脚本同步数据 ----
    onEventTracked('multiplayer_sync_scripts', (payload) => {
        if (store.isHost) return;

        enqueueStreamTask(async () => {
            const packetId = (payload?.packetId || '').toString();
            const state = payload?.state;

            try {
                if (!state || typeof state !== 'object') {
                    eventEmit('multiplayer_sync_scripts_result', {
                        ok: false,
                        message: '未收到脚本同步内容'
                    });
                    return;
                }

                // 幂等去重：重复包直接忽略并回报成功
                if (!rememberSyncPacketId(packetId)) {
                    eventEmit('multiplayer_sync_scripts_result', {
                        ok: true,
                        message: '重复包已忽略'
                    });
                    return;
                }

                if (state.error) {
                    store.addLog('error', '系统', `同步脚本失败: ${state.error}`);
                    eventEmit('multiplayer_sync_scripts_result', {
                        ok: false,
                        message: state.error
                    });
                    return;
                }

                await applyScriptSyncState(state);
                eventEmit('multiplayer_sync_scripts_result', { ok: true });
            } catch (e) {
                store.addLog('error', '系统', `同步脚本失败: ${e?.message || e}`);
                eventEmit('multiplayer_sync_scripts_result', {
                    ok: false,
                    message: e?.message || '同步脚本失败'
                });
                console.error('[联机Mod] 同步脚本失败:', e);
            }
        });
    });

    // ---- 房主：处理变量同步请求 ----
    onEventTracked('multiplayer_sync_variables_request', async (payload) => {
        if (!store.isHost) return;

        const userId = (payload?.userId || '').toString();
        const reqRaw = payload?.variableModes ?? [];
        const reqModes = Array.isArray(reqRaw)
            ? reqRaw.map(x => String(x || '').trim().toLowerCase())
            : [String(reqRaw || '').trim().toLowerCase()];

        const picked = new Set(reqModes.filter(Boolean));
        const client = store.getClient();

        try {
            if (picked.has('mvu')) {
                const msgId = findLatestAssistantMessageId('');
                if (msgId < 0) {
                    client?.send({
                        type: 'sync_variables',
                        data: {
                            variableType: 'mvu',
                            packetId: makeSyncPacketId('mvu_sync'),
                            content: { error: '无可同步的助手消息' },
                            targetUserId: userId
                        }
                    });
                } else {
                    const msgList = getChatMessages(`${msgId}-${msgId}`) || [];
                    const assistantContent = (msgList[0]?.message ?? '').toString();
                    const vars = getVariables({ type: 'message', message_id: msgId });
                    if (!hasMvuSyncPayload(vars)) {
                        client?.send({
                            type: 'sync_variables',
                            data: {
                                variableType: 'mvu',
                                packetId: makeSyncPacketId('mvu_sync'),
                                content: { error: '无MVU变量' },
                                targetUserId: userId
                            }
                        });
                    } else {
                        client?.send({
                            type: 'sync_variables',
                            data: {
                                variableType: 'mvu',
                                packetId: makeSyncPacketId('mvu_sync'),
                                content: {
                                    stat_data: vars.stat_data,
                                    display_data: vars.display_data,
                                    delta_data: vars.delta_data,
                                    schema: vars.schema,
                                    _syncMeta: {
                                        streamId: '',
                                        assistantContent
                                    }
                                },
                                targetUserId: userId
                            }
                        });
                    }
                }
            }

            if (picked.has('apotheosis')) {
                const api = parentWindow.AutoCardUpdaterAPI;

                if (!api?.exportTableAsJson) {
                    client?.send({
                        type: 'sync_variables',
                        data: {
                            variableType: 'apotheosis',
                            packetId: makeSyncPacketId('apo_sync'),
                            content: { error: '数据库API不可用（缺少 exportTableAsJson）' },
                            targetUserId: userId
                        }
                    });
                } else {
                    const deepClone = (obj) => {
                        try {
                            return JSON.parse(JSON.stringify(obj));
                        } catch (e) {
                            return null;
                        }
                    };

                    const sanitizeTables = (raw) => {
                        const src = (raw && typeof raw === 'object') ? raw : {};
                        const out = {};
                        const mate = (src.mate && typeof src.mate === 'object')
                            ? deepClone(src.mate)
                            : { type: 'chatSheets', version: 1 };

                        out.mate = mate || { type: 'chatSheets', version: 1 };

                        Object.keys(src).forEach((k) => {
                            if (k.startsWith('sheet_')) {
                                out[k] = deepClone(src[k]);
                            }
                        });

                        return out;
                    };

                    const rawTables = api.exportTableAsJson();
                    const tables = sanitizeTables(rawTables);
                    const hasSheet = Object.keys(tables).some((k) => k.startsWith('sheet_'));
                    const template = api.getTableTemplate ? deepClone(api.getTableTemplate()) : null;

                    if (!hasSheet) {
                        client?.send({
                            type: 'sync_variables',
                            data: {
                                variableType: 'apotheosis',
                                packetId: makeSyncPacketId('apo_sync'),
                                content: { error: '无数据库变量' },
                                targetUserId: userId
                            }
                        });
                    } else {
                        client?.broadcast({
                            type: 'acu_full_sync',
                            data: {
                                isolationKey: '',
                                tables,
                                template
                            }
                        });

                        store.acuSyncState.fullSynced = true;
                        store.acuSyncState.lastSyncTimestamp = Date.now();
                        store.acuSyncState.isolationKey = '';
                    }
                }
            }

            if (!picked.has('mvu') && !picked.has('apotheosis')) {
                client?.send({
                    type: 'sync_variables',
                    data: {
                        variableType: 'unknown',
                        packetId: makeSyncPacketId('var_sync'),
                        content: { error: '未选择变量模式' },
                        targetUserId: userId
                    }
                });
            }
        } catch (e) {
            store.addLog('error', '系统', `变量同步失败: ${e.message}`);
            console.error('[联机Mod] 变量同步失败:', e);
        }
    });

    // ---- 客户端：接收变量同步数据 ----
    onEventTracked('multiplayer_sync_variables', (payload) => {
        if (store.isHost) return;

        enqueueStreamTask(async () => {
            const variableType = payload?.variableType;
            const content = payload?.content;
            const packetId = (payload?.packetId || '').toString();

            try {
                if (!content) {
                    eventEmit('multiplayer_sync_variables_result', {
                        ok: false,
                        message: '未收到变量内容'
                    });
                    return;
                }

                // 幂等去重：重复包直接忽略并回报成功，避免重复写入
                if (!rememberSyncPacketId(packetId)) {
                    eventEmit('multiplayer_sync_variables_result', {
                        ok: true,
                        message: '重复包已忽略'
                    });
                    return;
                }

                if (content?.error) {
                    store.addLog('error', '系统', `同步变量失败: ${content.error}`);
                    eventEmit('multiplayer_sync_variables_result', {
                        ok: false,
                        message: content.error
                    });
                    return;
                }

                if (variableType === 'mvu') {
                    const syncMeta = (content._syncMeta && typeof content._syncMeta === 'object')
                        ? content._syncMeta
                        : {};

                    const targetMsgId = await waitForAssistantMessageId({
                        streamId: (syncMeta.streamId || '').toString(),
                        expectedContent: (syncMeta.assistantContent || '').toString()
                    });

                    if (targetMsgId < 0) {
                        const reason = '未找到可写入的助手消息楼层';
                        store.addLog('error', '系统', `变量同步失败: ${reason}`);
                        eventEmit('multiplayer_sync_variables_result', {
                            ok: false,
                            message: reason
                        });
                        return;
                    }

                    await updateVariablesWith((v) => {
                        if (content.stat_data) v.stat_data = content.stat_data;
                        if (content.display_data) v.display_data = content.display_data;
                        if (content.delta_data) v.delta_data = content.delta_data;
                        if (content.schema) v.schema = content.schema;
                        return v;
                    }, { type: 'message', message_id: targetMsgId });
                } else {
                    const typeText = String(variableType || 'unknown');
                    eventEmit('multiplayer_sync_variables_result', {
                        ok: false,
                        message: `未处理类型: ${typeText}`
                    });
                    return;
                }

                eventEmit('multiplayer_sync_variables_result', { ok: true });
            } catch (e) {
                store.addLog('error', '系统', `变量同步失败: ${e.message}`);
                eventEmit('multiplayer_sync_variables_result', {
                    ok: false,
                    message: e?.message || '变量同步失败'
                });
                console.error('[联机Mod] 变量同步失败:', e);
            }
        });
    });
};

// ==========================================
// 8. Vue 界面组件 (UI)
// ==========================================

const MultiplayerPanel = defineComponent({
    setup() {
        const store = useMultiplayerStore();

        const UI_TOKENS = Object.freeze({
            panelStartOffset: 20,
            panelFallbackWidth: 320,
            panelFallbackHeight: 44,
            panelMinWidth: 280,
            panelMinHeight: 240
        });

        const px = (n) => `${n}px`;
        const isMinimized = ref(true);
        const showSettings = ref(false);
        const isDragging = ref(false);
        const isResizing = ref(false);
        const hasPanelSizeOverride = ref(false);
        const panelRef = ref(null);

        const closeSettingsPanel = () => {
            showSettings.value = false;
        };

        const openSettingsPanel = () => {
            if (isMinimized.value) isMinimized.value = false;
            showSettings.value = true;
        };

        const toggleSettings = () => {
            if (showSettings.value) closeSettingsPanel();
            else openSettingsPanel();
        };

        const settingsTab = ref('general');
        const SETTINGS_TAB_OPTIONS = Object.freeze([
            { value: 'appearance', label: '外观' },
            { value: 'general', label: '通用' },
            { value: 'host', label: '房主' },
            { value: 'player', label: '玩家' },
            { value: 'logs', label: '日志' }
        ]);

        // 不再在 render 中绑定 style，改为 DOM 定位写入
        const panelPos = reactive({
            left: UI_TOKENS.panelStartOffset,
            top: UI_TOKENS.panelStartOffset + 20
        });
        const panelSize = reactive({
            width: UI_TOKENS.panelFallbackWidth,
            height: UI_TOKENS.panelFallbackHeight
        });

        const applyPanelPos = () => {
            const el = panelRef.value;
            if (!el) return;
            el.style.left = px(panelPos.left);
            el.style.top = px(panelPos.top);
        };
        const applyPanelSize = () => {
            const el = panelRef.value;
            if (!el) return;
            if (isMinimized.value || !hasPanelSizeOverride.value) {
                el.style.removeProperty('width');
                el.style.removeProperty('height');
                return;
            }
            el.style.width = px(panelSize.width);
            el.style.height = px(panelSize.height);
        };

        let dragOffset = { x: 0, y: 0 };
        const DRAG_TAP_THRESHOLD = 6;
        let dragStartPoint = { x: 0, y: 0 };
        let dragMoved = false;

        const userName = ref(store.settings.defaultUserName || '');
        const myInput = ref('');
        const chatMsg = ref('');
        const logsRef = ref(null);

        const joinPwdShake = ref(false);

        const isPasswordError = (err) => {
            const msg = (err && err.message) ? err.message : (err || '');
            return /密码|password/i.test(String(msg));
        };

        const triggerInputShake = (flagRef) => {
            flagRef.value = false;
            requestAnimationFrame(() => {
                flagRef.value = true;
                setTimeout(() => { flagRef.value = false; }, 360);
            });
        };

        const syncState = reactive({
            history: false,
            regex: false,
            variables: false,
            scripts: false
        });
        const historySyncProgress = reactive({
            batchId: '',
            received: 0,
            total: 0,
            phase: 'idle' // idle | start | progress | complete | fail
        });
        const syncTimers = new Map();
        const SYNC_TIMEOUT_MS = 12000;
        const HISTORY_CHUNK_SIZE = 20;

        const clearSyncTimer = (type) => {
            const t = syncTimers.get(type);
            if (t) {
                clearTimeout(t);
                syncTimers.delete(type);
            }
        };

        const startSync = (type, label) => {
            syncState[type] = true;
            clearSyncTimer(type);
            const timer = setTimeout(() => {
                finishSync(type, false, `${label}超时，请检查网络后重试`);
            }, SYNC_TIMEOUT_MS);
            syncTimers.set(type, timer);
        };

        const finishSync = (type, ok, message) => {
            clearSyncTimer(type);
            syncState[type] = false;
            if (ok) {
                store.addLog('milestone', '系统', `[弹窗替代:同步结果] ${message}`);
            } else {
                store.addLog('error', '系统', `[弹窗替代:同步结果] ${message}`);
            }
        };

        // 在线房间相关
        const onlineRooms = ref([]);
        const isLoadingRooms = ref(false);
        const isJoining = ref(false);
        const isCreating = ref(false);

        const selectedRoom = ref(null);
        const joinPassword = ref('');
        const newRoomName = ref('');
        const newRoomPassword = ref('');
        const newRoomMaxUsers = ref(8);

        const normalizeRoomName = (name = '') => name.trim().toLowerCase();

        const displayRooms = computed(() => {
            const map = new Map();
            for (const room of onlineRooms.value) {
                const key = normalizeRoomName(room?.name || '');
                if (!key) continue;
                if (!map.has(key)) map.set(key, room);
            }
            return Array.from(map.values());
        });

        const toSafeInt = (v) => {
            const n = Number(v);
            return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
        };

        const getRoomDisplayCurrentUsers = (room = {}) => {
            const explicitTotal = toSafeInt(
                room.totalUsers ??
                room.totalCount ??
                room.onlineCount
            );

            if (explicitTotal > 0) return explicitTotal;

            const players = toSafeInt(
                room.currentUsers ??
                room.currentUserCount ??
                room.playerCount ??
                room.players
            );

            const spectators = toSafeInt(
                room.spectatorCount ??
                room.spectators ??
                room.observerCount ??
                room.watchers ??
                room.audienceCount
            );

            return players + spectators;
        };

        const fetchRooms = async () => {
            isLoadingRooms.value = true;
            try {
                onlineRooms.value = await RoomApiService.fetchRooms(store.settings.onlineServer);
                store.pruneRoomLogsByExistingRoomIds((onlineRooms.value || []).map(r => r.id));
            } catch (e) {
                store.addLog('error', '系统', '获取房间列表失败: ' + e.message);
            } finally {
                isLoadingRooms.value = false;
            }
        };

        const selectRoom = (room) => {
            selectedRoom.value = room.id;
            joinPassword.value = '';
        };

        const joinSelectedRoom = async (asSpectator = false) => {
            if (!selectedRoom.value || isJoining.value) return;

            const safeName = (userName.value || '').trim();
            if (!safeName) {
                store.addLog('error', '系统', '[弹窗替代:加入房间] 请输入用户名');
                return;
            }

            isJoining.value = true;
            try {
                store.settings.defaultUserName = safeName;
                await store.connectOnline(
                    selectedRoom.value,
                    joinPassword.value || '',
                    safeName,
                    localSettings.clientUid,
                    { spectator: asSpectator }
                );
            } catch (e) {
                console.error(e);
                if (isPasswordError(e)) {
                    triggerInputShake(joinPwdShake);
                }
            } finally {
                isJoining.value = false;
            }
        };

        const createAndJoinRoom = async () => {
            if (isCreating.value) return;

            const roomName = newRoomName.value.trim();
            const creatorName = (userName.value || '').trim() || '匿名';
            if (!roomName) return;

            const duplicated = displayRooms.value.some(
                r => normalizeRoomName(r.name) === normalizeRoomName(roomName)
            );
            if (duplicated) {
                store.addLog('error', '系统', '[弹窗替代:创建房间] 房间名已存在，请换一个');
                return;
            }

            isCreating.value = true;
            try {
                store.settings.defaultUserName = creatorName;
                const room = await RoomApiService.createRoom(store.settings.onlineServer, {
                    name: roomName,
                    password: newRoomPassword.value || undefined,
                    maxUsers: newRoomMaxUsers.value || 8,
                    creatorName
                });

                if (room?.id) {
                    await store.connectOnline(
                        room.id,
                        newRoomPassword.value || '',
                        creatorName,
                        localSettings.clientUid,
                        { assumeHost: true }
                    );
                }
            } catch (e) {
                console.error(e);
            } finally {
                isCreating.value = false;
            }
        };

        fetchRooms();

        const getPendingMap = () => {
            const pi = store.pendingInputs;
            return (pi && typeof pi.has === 'function') ? pi : (pi?.value ?? new Map());
        };

        const hasSubmitted = (userId) => getPendingMap().has(userId);

        const mySubmitted = computed(() => {
            const _v = store.pendingInputsVersion;
            const client = store.getClient();
            if (!client) return false;
            return getPendingMap().has(client.userId);
        });

        const myClientId = computed(() => store.getClient()?.userId || '');

        const getJoinOrder = (u, idx = 0) => Number.isFinite(u?._joinOrder) ? u._joinOrder : (idx + 1);

        const onlineUsers = computed(() => {
            return store.users
                .filter(u => !u.isSpectator)
                .slice()
                .sort((a, b) => {
                    if (!!a.isHost !== !!b.isHost) return a.isHost ? -1 : 1;
                    return getJoinOrder(a) - getJoinOrder(b);
                });
        });

        const spectators = computed(() => {
            return store.users
                .filter(u => !!u.isSpectator)
                .slice()
                .sort((a, b) => getJoinOrder(a) - getJoinOrder(b));
        });

        const spectatorsCollapsed = ref(true);
        const toggleSpectatorsCollapsed = () => {
            spectatorsCollapsed.value = !spectatorsCollapsed.value;
        };

        const userCount = computed(() => onlineUsers.value.length);

        const submittedCount = computed(() => {
            const _v = store.pendingInputsVersion;
            let count = 0;
            for (const [uid] of getPendingMap().entries()) {
                const u = store.users.find(x => x.id === uid);
                if (u && !u.isSpectator) count++;
            }
            return count;
        });

        const allSubmitted = computed(() => {
            const _v = store.pendingInputsVersion;
            return userCount.value > 0 && submittedCount.value >= userCount.value;
        });

        const sendChat = () => {
            if (!chatMsg.value.trim() || !store.getClient()) return;
            store.getClient().send({ type: 'chat', data: { content: chatMsg.value.trim() } });
            store.addLog('chat', userName.value || '我', chatMsg.value.trim());
            chatMsg.value = '';
        };

        const sendInput = () => {
            if (store.spectatorMode) return;
            if (!myInput.value.trim() || !store.getClient()) return;

            const prefix = applyNameToken(localSettings.messagePrefix || '[{name}]:');

            const personaRaw = getPersonaContentRaw();
            if (personaRaw) {
                store.getClient().send({
                    type: 'user_persona',
                    data: {
                        content: personaRaw,
                        prefix: applyNameToken(localSettings.personaPrefix || '[{name}]的设定:')
                    }
                });
            }

            store.getClient().send({
                type: 'user_input',
                data: {
                    content: myInput.value,
                    messagePrefix: prefix,
                    messageSuffix: localSettings.messageSuffix || '',
                    hideContent: !!localSettings.hideUserInputContent
                }
            });

            myInput.value = '';
        };

        const revokeInput = () => {
            const client = store.getClient();
            if (!client) return;

            const mine = getPendingMap().get(client.userId);
            if (mine?.content) {
                myInput.value = String(mine.content);
            }

            store.revokeMyInput();
        };

        const submitToAI = async () => {
            await store.submitToAI();
            myInput.value = '';
        };

        const resetInputs = () => {
            store.clearPendingInputs();
            store.getClient()?.broadcast({ type: 'reset_input', data: {} });
            myInput.value = '';
        };

        const hasSyncPeer = () => {
            const client = store.getClient();
            const myId = (client?.userId || '').toString();
            return store.users.some(u => !u.isSpectator && u.id !== myId);
        };

        const ensureSyncTargetOrSkip = (type, label) => {
            if (hasSyncPeer()) return true;
            finishSync(type, true, `${label}已跳过：当前无可同步对象`);
            return false;
        };

        const requestSyncHistory = () => {
            try {
                if (!store.isConnected) {
                    finishSync('history', false, '同步历史失败: 当前未连接');
                    return;
                }

                const client = store.getClient();
                if (!client) {
                    finishSync('history', false, '同步历史失败: 当前客户端不可用');
                    return;
                }

                if (syncState.history) return;
                if (!ensureSyncTargetOrSkip('history', '同步历史')) return;

                const canResume = !!historySyncProgress.batchId &&
                    historySyncProgress.received > 0 &&
                    (historySyncProgress.total <= 0 || historySyncProgress.received < historySyncProgress.total);

                const batchId = canResume
                    ? historySyncProgress.batchId
                    : `hs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

                const resumeFrom = canResume ? Math.max(0, Number(historySyncProgress.received || 0)) : 0;

                if (!canResume) {
                    historySyncProgress.batchId = batchId;
                    historySyncProgress.received = 0;
                    historySyncProgress.total = 0;
                }
                historySyncProgress.phase = 'start';

                startSync('history', '同步历史');
                client.send({
                    type: 'sync_history_request',
                    data: {
                        depth: localSettings.syncHistoryDepth || 10,
                        batchId,
                        resumeFrom,
                        acceptChunk: true,
                        chunkSize: HISTORY_CHUNK_SIZE
                    }
                });

                store.addLog(
                    'info',
                    '系统',
                    canResume
                        ? `继续同步历史消息（批次 ${batchId.slice(-8)}，从 ${resumeFrom} 开始）...`
                        : `正在请求同步历史消息（批次 ${batchId.slice(-8)}）...`
                );
            } catch (e) {
                historySyncProgress.phase = 'fail';
                finishSync('history', false, `同步历史失败: ${e?.message || e}`);
            }
        };

        const requestSyncRegex = (scopes = ['character']) => {
            try {
                if (!store.isConnected) {
                    finishSync('regex', false, '同步正则失败: 当前未连接');
                    return;
                }

                const client = store.getClient();
                if (!client) {
                    finishSync('regex', false, '同步正则失败: 当前客户端不可用');
                    return;
                }

                if (!ensureSyncTargetOrSkip('regex', '同步正则')) return;

                startSync('regex', '同步正则');
                const normalized = Array.from(new Set(
                    (Array.isArray(scopes) ? scopes : ['character'])
                        .map(s => String(s || '').trim().toLowerCase())
                        .filter(Boolean)
                ));
                client.send({ type: 'sync_regex_request', data: { scopes: normalized } });
            } catch (e) {
                finishSync('regex', false, `同步正则失败: ${e?.message || e}`);
            }
        };

        const requestSyncVariables = () => {
            try {
                if (!store.isConnected) {
                    finishSync('variables', false, '同步变量失败: 当前未连接');
                    return;
                }

                const client = store.getClient();
                if (!client) {
                    finishSync('variables', false, '同步变量失败: 当前客户端不可用');
                    return;
                }

                if (!ensureSyncTargetOrSkip('variables', '同步变量')) return;

                startSync('variables', '同步变量');
                const variableModes = Array.isArray(store.variableMode) ? store.variableMode : [];
                client.send({
                    type: 'sync_variables_request',
                    data: { variableModes }
                });
            } catch (e) {
                finishSync('variables', false, `同步变量失败: ${e?.message || e}`);
            }
        };

        const requestSyncScripts = () => {
            try {
                if (!store.isConnected) {
                    finishSync('scripts', false, '同步脚本失败: 当前未连接');
                    return;
                }

                const client = store.getClient();
                if (!client) {
                    finishSync('scripts', false, '同步脚本失败: 当前客户端不可用');
                    return;
                }

                if (syncState.scripts) return;

                if (!ensureSyncTargetOrSkip('scripts', '同步脚本')) return;

                startSync('scripts', '同步脚本');
                client.send({ type: 'sync_scripts_request', data: {} });
            } catch (e) {
                finishSync('scripts', false, `同步脚本失败: ${e?.message || e}`);
            }
        };

        const autoSyncInFlight = ref(false);
        const firstRoomClickSyncArmed = ref(false);
        const firstRoomClickSynced = ref(false);
        const HISTORY_AUTO_SYNC_INTERVAL_MS = 15000;
        let historyAutoSyncTimer = null;

        const stopHistoryAutoSync = () => {
            if (!historyAutoSyncTimer) return;
            clearInterval(historyAutoSyncTimer);
            historyAutoSyncTimer = null;
        };

        const startHistoryAutoSync = () => {
            if (historyAutoSyncTimer || !store.isConnected || store.isHost) return;
            historyAutoSyncTimer = setInterval(() => {
                if (!store.isConnected || store.isHost) {
                    stopHistoryAutoSync();
                    return;
                }
                if (syncState.history) return;
                requestSyncHistory();
            }, HISTORY_AUTO_SYNC_INTERVAL_MS);
        };

        const triggerAutoSync = () => {
            if (!store.isConnected || store.isHost || autoSyncInFlight.value) return;
            if (!hasSyncPeer()) return;

            const picked = new Set(normalizeAutoSyncFeatures(localSettings.autoSyncFeatures));
            if (picked.size === 0) return;

            try {
                console.log('[联机Mod] 自动同步触发:', Array.from(picked));
            } catch (e) {}

            autoSyncInFlight.value = true;
            setTimeout(() => {
                try {
                    if (picked.has('history')) requestSyncHistory();

                    const regexScopes = [];
                    if (picked.has('regex_character')) regexScopes.push('character');
                    if (regexScopes.length > 0) requestSyncRegex(regexScopes);

                    if (picked.has('variables')) requestSyncVariables();
                    if (picked.has('scripts')) requestSyncScripts();
                } finally {
                    setTimeout(() => { autoSyncInFlight.value = false; }, 400);
                }
            }, 200);
        };

        const triggerFirstRoomClickSync = () => {
            if (!firstRoomClickSyncArmed.value || firstRoomClickSynced.value) return;
            if (!store.isConnected || store.isHost) return;

            firstRoomClickSynced.value = true;
            firstRoomClickSyncArmed.value = false;

            requestSyncHistory();
            requestSyncRegex(['character']);
            requestSyncVariables();
            requestSyncScripts();
            startHistoryAutoSync();
        };

        watch(() => store.isConnected, (connected) => {
            if (!connected) {
                autoSyncInFlight.value = false;
                firstRoomClickSyncArmed.value = false;
                firstRoomClickSynced.value = false;
                stopHistoryAutoSync();
                ['history', 'regex', 'variables'].forEach((t) => {
                    clearSyncTimer(t);
                    syncState[t] = false;
                });
                clearSyncTimer('scripts');
                syncState.scripts = false;
                historySyncProgress.batchId = '';
                historySyncProgress.received = 0;
                historySyncProgress.total = 0;
                historySyncProgress.phase = 'idle';
                return;
            }

            if (store.isHost) {
                firstRoomClickSyncArmed.value = false;
                firstRoomClickSynced.value = false;
                stopHistoryAutoSync();
                return;
            }

            firstRoomClickSyncArmed.value = true;
            firstRoomClickSynced.value = false;
            stopHistoryAutoSync();
        });

        watch(() => store.isHost, (isHostNow) => {
            if (!store.isConnected) return;
            if (isHostNow) {
                firstRoomClickSyncArmed.value = false;
                firstRoomClickSynced.value = false;
                stopHistoryAutoSync();
                return;
            }
            firstRoomClickSyncArmed.value = true;
            firstRoomClickSynced.value = false;
            stopHistoryAutoSync();
        });

        const historySyncButtonText = computed(() => {
            if (!syncState.history) return '同步历史';
            if (historySyncProgress.total > 0) {
                return `同步中 ${historySyncProgress.received}/${historySyncProgress.total}`;
            }
            return '同步中…';
        });

        onEventTracked('multiplayer_sync_history_progress', (progress) => {
            if (store.isHost) return;

            const batchId = (progress?.batchId || '').toString();
            if (batchId) historySyncProgress.batchId = batchId;

            const total = Number(progress?.total);
            const received = Number(progress?.received);
            if (Number.isFinite(total) && total >= 0) historySyncProgress.total = Math.floor(total);
            if (Number.isFinite(received) && received >= 0) historySyncProgress.received = Math.floor(received);

            const phase = (progress?.phase || '').toString();
            if (phase) historySyncProgress.phase = phase;
            if (!syncState.history && (phase === 'start' || phase === 'progress')) {
                syncState.history = true;
            }
        });

        onEventTracked('multiplayer_sync_history_result', (result) => {
            if (store.isHost) return;

            const batchId = (result?.batchId || '').toString();
            if (batchId) historySyncProgress.batchId = batchId;

            const total = Number(result?.total ?? result?.count);
            const received = Number(result?.received ?? result?.count);
            if (Number.isFinite(total) && total >= 0) historySyncProgress.total = Math.floor(total);
            if (Number.isFinite(received) && received >= 0) historySyncProgress.received = Math.floor(received);

            if (result?.ok) {
                const cnt = Number(result?.count || 0);
                historySyncProgress.phase = 'complete';
                finishSync('history', true, cnt > 0 ? `同步历史成功（${cnt}条）` : '同步历史成功');
                historySyncProgress.batchId = '';
            } else {
                historySyncProgress.phase = 'fail';
                finishSync('history', false, `同步历史失败: ${result?.message || '未知错误'}`);
            }
        });

        onEventTracked('multiplayer_sync_regex_result', (result) => {
            if (store.isHost) return;
            if (result?.ok) {
                finishSync('regex', true, '同步正则成功');
            } else {
                finishSync('regex', false, `同步正则失败: ${result?.message || '未知错误'}`);
            }
        });

        onEventTracked('multiplayer_sync_variables_result', (result) => {
            if (store.isHost) return;
            if (result?.ok) {
                finishSync('variables', true, '同步变量成功');
            } else {
                finishSync('variables', false, `同步变量失败: ${result?.message || '未知错误'}`);
            }
        });

        onEventTracked('multiplayer_sync_scripts_result', (result) => {
            if (store.isHost) return;
            if (result?.ok) {
                finishSync('scripts', true, '同步脚本成功');
            } else {
                finishSync('scripts', false, `同步脚本失败: ${result?.message || '未知错误'}`);
            }
        });

        onEventTracked('multiplayer_acu_full_sync', () => {
            if (store.isHost) return;
            if (syncState.variables) {
                finishSync('variables', true, '同步变量成功（数据库）');
            }
        });

        const VARIABLE_MODE_FEATURE_OPTIONS = Object.freeze([
            { value: 'mvu', label: 'MVU变量', desc: '同步消息级变量（stat/display/delta/schema）' },
            { value: 'apotheosis', label: '数据库', desc: '同步 ACU 隔离表与数据库变量' }
        ]);

        const AUTO_SYNC_FEATURE_OPTIONS = Object.freeze([
            { value: 'regex_character', label: '局部正则', desc: '自动拉取房主角色正则' },
            { value: 'history', label: '历史记录', desc: '自动同步最近历史消息' },
            { value: 'variables', label: '变量', desc: '自动同步已勾选的变量模式数据' },
            { value: 'scripts', label: '角色脚本', desc: '自动同步房主角色脚本树状态' }
        ]);

        const getVariableModes = () => Array.isArray(store.variableMode) ? store.variableMode : [];

        const isVariableModePicked = (key) => getVariableModes().includes(key);

        const toggleVariableMode = (key) => {
            const next = new Set(getVariableModes());
            if (next.has(key)) next.delete(key);
            else next.add(key);
            store.variableMode = Array.from(next);
        };

        const renderMultiSelectSetting = (
            h,
            {
                label,
                options,
                isPicked,
                onToggle,
                hint,
                extraClass = 'mp-mt-2'
            }
        ) => {
            return h('div', { class: ['setting-item', extraClass] }, [
                h('label', {}, label),
                h('div', { class: 'mp-choice-group' },
                    options.map(opt =>
                        h('div', {
                            key: opt.value,
                            class: ['mp-choice-item', { active: isPicked(opt.value) }],
                            onClick: () => onToggle(opt.value)
                        }, [
                            h('span', { class: 'mp-choice-dot' }),
                            h('div', { class: 'mp-choice-content' }, [
                                h('div', { class: 'mp-choice-title' }, opt.label),
                                opt.desc ? h('div', { class: 'mp-choice-desc' }, opt.desc) : null
                            ].filter(Boolean))
                        ])
                    )
                ),
                hint ? h('small', { class: 'hint' }, hint) : null
            ].filter(Boolean));
        };

        const normalizeAutoSyncFeatures = (raw) => {
            const valid = new Set(AUTO_SYNC_FEATURE_OPTIONS.map(x => x.value));
            const src = Array.isArray(raw) ? raw : [];
            const picked = [];
            for (const item of src) {
                const key = String(item || '').trim();
                if (valid.has(key) && !picked.includes(key)) picked.push(key);
            }
            return picked;
        };

        const isAutoSyncPicked = (key) => normalizeAutoSyncFeatures(localSettings.autoSyncFeatures).includes(key);

        const toggleAutoSyncFeature = (key) => {
            const next = new Set(normalizeAutoSyncFeatures(localSettings.autoSyncFeatures));
            if (next.has(key)) next.delete(key);
            else next.add(key);
            localSettings.autoSyncFeatures = normalizeAutoSyncFeatures(Array.from(next));
            saveSettings();

            // 已连接时，切换选项后立即触发一次自动同步，方便用户验证
            if (store.isConnected && !store.isHost) {
                triggerAutoSync();
            }
        };

        const autoSubmitInFlight = ref(false);
        watch(allSubmitted, async (ready) => {
            if (!ready) return;
            if (!store.isHost || store.spectatorMode) return;
            if (!localSettings.autoSendWhenAllSubmitted) return;
            if (getPendingMap().size <= 0 || autoSubmitInFlight.value) return;

            autoSubmitInFlight.value = true;
            try {
                await submitToAI();
            } finally {
                setTimeout(() => { autoSubmitInFlight.value = false; }, 0);
            }
        });

        const transferHost = (userId) => {
            store.addLog('info', '系统', '[弹窗替代:房主转让确认] 已发起房主转让请求');
            store.getClient()?.send({ type: 'transfer_host', data: { targetUserId: userId } });
        };

        const makeRandomUid = () => `uid_${Math.random().toString(36).slice(2, 10)}`;

        const defaultSettings = {
            defaultUserName: '',
            clientUid: makeRandomUid(),
            messagePrefix: '[{name}]:',
            messageSuffix: '',
            autoSendWhenAllSubmitted: false,
            autoSyncFeatures: ['regex_character', 'history', 'variables', 'scripts'],
            autoMinimizeOnOutsideTap: true,
            hideUserInputContent: false,
            personaPrefix: '[{name}]的设定:',
            timedInputSeconds: 0,
            syncHistoryDepth: 10,
            onlineServer: 'https://room.yufugemini.cloud'
        };

        const loadSettings = () => {
            try {
                const raw = localStorage.getItem(SETTINGS_STORAGE_KEY) ?? localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY);
                if (!raw) return { ...defaultSettings };
                const parsed = JSON.parse(raw) || {};
                if (Object.prototype.hasOwnProperty.call(parsed, 'uiThemeTokens')) {
                    delete parsed.uiThemeTokens;
                }
                const merged = { ...defaultSettings, ...parsed };

                if (!Array.isArray(parsed.autoSyncFeatures) && typeof parsed.autoSyncOnConnect === 'boolean') {
                    merged.autoSyncFeatures = parsed.autoSyncOnConnect
                        ? [...defaultSettings.autoSyncFeatures]
                        : [];
                }

                merged.autoSyncFeatures = normalizeAutoSyncFeatures(merged.autoSyncFeatures);
                return merged;
            } catch (e) {
                return { ...defaultSettings };
            }
        };

        const localSettings = reactive(loadSettings());
        const saveSettings = () => {
            try { localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(localSettings)); } catch (e) {}
        };

        store.settings.defaultUserName = (localSettings.defaultUserName || '').trim();
        store.settings.timedInputSeconds = Number(localSettings.timedInputSeconds) || 0;
        store.settings.onlineServer = (localSettings.onlineServer || 'https://room.yufugemini.cloud').trim();

        watch(() => localSettings.timedInputSeconds, (v) => {
            const next = Number(v) || 0;
            if (store.settings.timedInputSeconds !== next) store.settings.timedInputSeconds = next;
            saveSettings();
        });

        watch(() => store.settings.timedInputSeconds, (v) => {
            const next = Number(v) || 0;
            if ((Number(localSettings.timedInputSeconds) || 0) !== next) {
                localSettings.timedInputSeconds = next;
                saveSettings();
            }
        });

        watch(() => store.settings.onlineServer, (v) => {
            const next = (v || '').toString().trim();
            if ((localSettings.onlineServer || '') !== next) {
                localSettings.onlineServer = next;
                saveSettings();
            }
        });

        // 从用户设定正文中解析「姓名」字段（如 **姓名:**夏高·纳西索斯），用于 {name} 占位符
        const getPersonaNameFromDescription = () => {
            const ctx = parentWindow.SillyTavern?.getContext?.();
            const userPersona = ctx?.userPersona;
            const text = typeof userPersona === 'string'
                ? userPersona
                : (userPersona?.description || userPersona?.content || '');
            const domPersona = (
                parentWindow.document?.querySelector('#persona_description')?.value ||
                parentWindow.document?.querySelector('textarea[name="persona_description"]')?.value ||
                ''
            );
            const raw = (text || domPersona || '').toString();
            const m = raw.match(/\*\*姓名\*\*:\s*([^*\n]+?)(?=\s*\*\*|$)/m) ||
                raw.match(/姓名\s*[：:]\s*([^\n*]+?)(?=\s*\*\*|$)/m) ||
                raw.match(/\*\*姓名\*\*:\s*([^*\n]+)/);
            return m ? m[1].trim() : '';
        };

        const getPersonaRoleName = () => {
            const ctx = parentWindow.SillyTavern?.getContext?.();
            const pu = parentWindow.power_user || ctx?.power_user || {};

            const roleName = (
                (typeof ctx?.userPersona === 'object' ? ctx?.userPersona?.name : '') ||
                ctx?.persona?.name ||
                pu?.persona_name ||
                ctx?.personaName ||
                getPersonaNameFromDescription() ||
                ctx?.name1 ||
                ''
            ).toString().trim();

            return roleName || '角色名';
        };

        const applyNameToken = (template) => {
            return (template || '').replace(/\{\s*name\s*\}|\[\s*name\s*\]/gi, getPersonaRoleName());
        };

        const personaRefreshTick = ref(0);
        let personaPreviewDomUnbind = null;
        let personaSyncDebounceTimer = null;
        let lastBroadcastPersonaSnapshot = '';

        const clearPersonaSyncDebounceTimer = () => {
            if (!personaSyncDebounceTimer) return;
            clearTimeout(personaSyncDebounceTimer);
            personaSyncDebounceTimer = null;
        };

        const sendPersonaUpdateIfNeeded = () => {
            if (!store.isConnected || store.spectatorMode) return;
            const client = store.getClient();
            if (!client) return;

            const content = getPersonaContentRaw();
            if (!content) return;

            const prefix = applyNameToken(localSettings.personaPrefix || '[{name}]的设定:');
            const snapshot = `${prefix}\n${content}`;
            if (snapshot === lastBroadcastPersonaSnapshot) return;

            client.send({
                type: 'user_persona',
                data: { content, prefix }
            });
            lastBroadcastPersonaSnapshot = snapshot;
        };

        const schedulePersonaSync = () => {
            clearPersonaSyncDebounceTimer();
            personaSyncDebounceTimer = setTimeout(() => {
                sendPersonaUpdateIfNeeded();
            }, 120);
        };

        const bindPersonaPreviewSync = () => {
            if (personaPreviewDomUnbind) {
                personaPreviewDomUnbind();
                personaPreviewDomUnbind = null;
            }

            const nodes = [
                parentWindow.document?.querySelector('#persona_description'),
                parentWindow.document?.querySelector('textarea[name="persona_description"]')
            ].filter(Boolean);

            if (nodes.length === 0) return;

            const handler = () => {
                personaRefreshTick.value++;
                schedulePersonaSync();
            };

            nodes.forEach((node) => {
                node.addEventListener('input', handler);
                node.addEventListener('change', handler);
                node.addEventListener('blur', handler);
            });

            personaPreviewDomUnbind = () => {
                nodes.forEach((node) => {
                    node.removeEventListener('input', handler);
                    node.removeEventListener('change', handler);
                    node.removeEventListener('blur', handler);
                });
            };
        };

        if (localSettings.defaultUserName && !userName.value) userName.value = localSettings.defaultUserName;

        let renameDebounceTimer = null;
        let lastBroadcastName = '';

        const doRenameBroadcast = (nextName) => {
            const ret = store.renameSelf(nextName);
            if (ret?.ok) lastBroadcastName = nextName;
            else if (ret?.reason === 'duplicate') {
                store.addLog('error', '系统', '[弹窗替代:重命名] 该用户名已在房间中使用');
            }
        };

        const flushRenameNow = () => {
            const nextName = (localSettings.defaultUserName || '').trim();
            if (!store.isConnected || !nextName) return;

            if (renameDebounceTimer) {
                clearTimeout(renameDebounceTimer);
                renameDebounceTimer = null;
            }

            if (nextName === lastBroadcastName) return;
            doRenameBroadcast(nextName);
        };

        watch(() => localSettings.defaultUserName, (val) => {
            const nextName = (val || '').trim();
            userName.value = nextName;
            store.settings.defaultUserName = nextName;
            saveSettings();

            if (!store.isConnected || !nextName) return;

            if (renameDebounceTimer) clearTimeout(renameDebounceTimer);

            renameDebounceTimer = setTimeout(() => {
                if (nextName === lastBroadcastName) return;
                doRenameBroadcast(nextName);
            }, 700);
        });

        const previewText = computed(() => {
            void personaRefreshTick.value;
            const prefix = applyNameToken(localSettings.messagePrefix || '[{name}]:');
            const content = (myInput.value || '消息内容').toString();
            return `${prefix} ${content}${localSettings.messageSuffix}`.replace(/\s+/g, ' ').trim();
        });

        const getPersonaContentRaw = () => {
            const ctx = parentWindow.SillyTavern?.getContext?.();
            const pu = parentWindow.power_user || ctx?.power_user || {};

            const userPersona = ctx?.userPersona;
            const userPersonaText = typeof userPersona === 'string'
                ? userPersona
                : (userPersona?.description || userPersona?.content || '');

            const domPersona = (
                parentWindow.document?.querySelector('#persona_description')?.value ||
                parentWindow.document?.querySelector('textarea[name="persona_description"]')?.value ||
                ''
            );

            const raw = (
                userPersonaText ||
                ctx?.persona?.description ||
                ctx?.persona_description ||
                pu?.persona_description ||
                domPersona ||
                ''
            ).toString().trim();

            return raw.replace(/<[^>]+>/g, '').trim();
        };

        const personaPreviewText = computed(() => {
            void personaRefreshTick.value;
            const prefix = applyNameToken(localSettings.personaPrefix || '[{name}]的设定:');
            const raw = getPersonaContentRaw() || '（未读取到用户设定内容）';
            const merged = `${prefix} ${raw}`.replace(/\s+/g, ' ').trim();
            return merged.length > 80 ? `${merged.slice(0, 80)}...` : merged;
        });

        const personaPrefixPreviewText = computed(() => {
            void personaRefreshTick.value;
            return applyNameToken(localSettings.personaPrefix || '[{name}]的设定:');
        });

        watch(showSettings, (opened) => {
            if (opened) personaRefreshTick.value++;
        });

        watch(() => localSettings.personaPrefix, () => {
            personaRefreshTick.value++;
            schedulePersonaSync();
        });

        watch(() => localSettings.defaultUserName, () => {
            personaRefreshTick.value++;
            schedulePersonaSync();
        });

        watch(() => store.isConnected, (connected) => {
            if (!connected) {
                lastBroadcastPersonaSnapshot = '';
                clearPersonaSyncDebounceTimer();
                return;
            }
            schedulePersonaSync();
        });

        const scrollLogsToBottom = () => {
            nextTick(() => {
                if (!logsRef.value) return;
                logsRef.value.scrollTop = logsRef.value.scrollHeight;
            });
        };

        watch(() => store.chatLogs.length, () => scrollLogsToBottom());

        watch(isMinimized, (minimized) => {
            applyPanelSize();
            clampPanelIntoViewport({ skipWhenKeyboardOpen: true });
            if (!minimized) scrollLogsToBottom();
        });

        watch(showSettings, (opened) => {
            if (!opened && !isMinimized.value) scrollLogsToBottom();
        });

        let activePointerId = null;
        let dragPointerTarget = null;

        const startPointerDrag = (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea') || e.target.closest('select')) return;

            isDragging.value = true;
            activePointerId = e.pointerId;
            dragPointerTarget = e.currentTarget || null;

            dragOffset.x = e.clientX - panelPos.left;
            dragOffset.y = e.clientY - panelPos.top;

            dragStartPoint.x = e.clientX;
            dragStartPoint.y = e.clientY;
            dragMoved = false;

            try { dragPointerTarget?.setPointerCapture?.(activePointerId); } catch (_) {}

            const targetDoc = parentWindow.document || document;
            targetDoc.addEventListener('pointermove', onPointerDrag, { passive: false });
            targetDoc.addEventListener('pointerup', stopPointerDrag);
            targetDoc.addEventListener('pointercancel', stopPointerDrag);
        };

        const getViewportSize = () => {
            const vv = parentWindow.visualViewport;
            const viewportWidth = vv?.width || parentWindow.innerWidth || window.innerWidth || 0;
            const viewportHeight = vv?.height || parentWindow.innerHeight || window.innerHeight || 0;
            return {
                width: Math.max(0, Math.floor(viewportWidth)),
                height: Math.max(0, Math.floor(viewportHeight))
            };
        };

        const clampPanelSizeToViewport = () => {
            if (!hasPanelSizeOverride.value) return;
            const { width: viewportWidth, height: viewportHeight } = getViewportSize();
            const minWidth = Math.min(Math.max(180, UI_TOKENS.panelMinWidth), Math.max(120, viewportWidth));
            const minHeight = Math.min(Math.max(120, UI_TOKENS.panelMinHeight), Math.max(120, viewportHeight));

            const maxWidth = Math.max(minWidth, viewportWidth - panelPos.left);
            const maxHeight = Math.max(minHeight, viewportHeight - panelPos.top);

            panelSize.width = Math.min(maxWidth, Math.max(minWidth, panelSize.width));
            panelSize.height = Math.min(maxHeight, Math.max(minHeight, panelSize.height));
            applyPanelSize();
        };

        let lastViewportHeight = 0;
        let lastStablePanelTop = panelPos.top;
        let keyboardClosePending = false;
        let keyboardSettleTimer = null;

        const clearKeyboardSettleTimer = () => {
            if (!keyboardSettleTimer) return;
            clearTimeout(keyboardSettleTimer);
            keyboardSettleTimer = null;
        };

        const clampPanelIntoViewport = (options = {}) => {
            const { skipWhenKeyboardOpen = false } = options;

            if (skipWhenKeyboardOpen && isMobileLike() && isVirtualKeyboardLikelyOpen()) {
                return;
            }

            const panelEl = panelRef.value;
            if (!panelEl) return;

            const { width: viewportWidth, height: viewportHeight } = getViewportSize();
            const panelWidth = panelEl.offsetWidth || UI_TOKENS.panelFallbackWidth;
            const panelHeight = panelEl.offsetHeight || UI_TOKENS.panelFallbackHeight;

            if (
                skipWhenKeyboardOpen &&
                isMobileLike() &&
                keyboardClosePending &&
                viewportHeight > 0 &&
                panelHeight > 0 &&
                viewportHeight <= panelHeight + 12
            ) {
                return;
            }

            const maxLeft = Math.max(0, viewportWidth - panelWidth);
            const maxTop = Math.max(0, viewportHeight - panelHeight);

            const nextLeft = Math.min(maxLeft, Math.max(0, panelPos.left));
            const nextTop = Math.min(maxTop, Math.max(0, panelPos.top));

            panelPos.left = nextLeft;
            panelPos.top = nextTop;
            applyPanelPos();
        };


        let resizeRafId = null;
        const KEYBOARD_RESIZE_DELTA = 60;
        const KEYBOARD_SETTLE_MS = 140;

        const onViewportResize = () => {
            if (resizeRafId !== null) {
                parentWindow.cancelAnimationFrame?.(resizeRafId);
                resizeRafId = null;
            }
            resizeRafId = (parentWindow.requestAnimationFrame || window.requestAnimationFrame)(() => {
                resizeRafId = null;

                const { height: viewportHeight } = getViewportSize();
                const prevHeight = lastViewportHeight || viewportHeight;
                const delta = viewportHeight - prevHeight;
                const mobileLike = isMobileLike();

                if (mobileLike && delta < -KEYBOARD_RESIZE_DELTA) {
                    // 视口快速变小：通常是键盘弹出，缓存当前稳定 top，避免后续收起回弹到 0
                    lastStablePanelTop = panelPos.top;
                    keyboardClosePending = false;
                    clearKeyboardSettleTimer();

                    clampPanelSizeToViewport();
                    clampPanelIntoViewport({ skipWhenKeyboardOpen: true });
                    lastViewportHeight = viewportHeight;
                    return;
                }

                if (mobileLike && delta > KEYBOARD_RESIZE_DELTA) {
                    // 视口快速变大：通常是键盘收起，等待视口稳定后再钳制，避免过渡帧把 top 吸到 0
                    keyboardClosePending = true;
                    clearKeyboardSettleTimer();

                    keyboardSettleTimer = setTimeout(() => {
                        keyboardClosePending = false;

                        const { height: settledHeight } = getViewportSize();
                        if (settledHeight > 0) {
                            lastViewportHeight = settledHeight;
                        }

                        if (panelPos.top <= 0 && lastStablePanelTop > 0) {
                            panelPos.top = lastStablePanelTop;
                            applyPanelPos();
                        }

                        clampPanelSizeToViewport();
                        clampPanelIntoViewport({ skipWhenKeyboardOpen: true });

                        if (!isVirtualKeyboardLikelyOpen()) {
                            lastStablePanelTop = panelPos.top;
                        }
                    }, KEYBOARD_SETTLE_MS);

                    lastViewportHeight = viewportHeight;
                    return;
                }

                clampPanelSizeToViewport();
                clampPanelIntoViewport({ skipWhenKeyboardOpen: true });

                if (!isVirtualKeyboardLikelyOpen()) {
                    lastStablePanelTop = panelPos.top;
                }

                lastViewportHeight = viewportHeight;
            });
        };

        const onPointerDrag = (e) => {
            if (!isDragging.value) return;
            if (activePointerId !== null && e.pointerId !== activePointerId) return;

            e.preventDefault();

            const dx = Math.abs(e.clientX - dragStartPoint.x);
            const dy = Math.abs(e.clientY - dragStartPoint.y);
            if (dx > DRAG_TAP_THRESHOLD || dy > DRAG_TAP_THRESHOLD) {
                dragMoved = true;
            }

            const { width: viewportWidth, height: viewportHeight } = getViewportSize();
            const panelEl = panelRef.value;
            const panelWidth = panelEl?.offsetWidth || UI_TOKENS.panelFallbackWidth;
            const panelHeight = panelEl?.offsetHeight || UI_TOKENS.panelFallbackHeight;

            const maxLeft = Math.max(0, viewportWidth - panelWidth);
            const maxTop = Math.max(0, viewportHeight - panelHeight);

            panelPos.left = Math.min(maxLeft, Math.max(0, e.clientX - dragOffset.x));
            panelPos.top = Math.min(maxTop, Math.max(0, e.clientY - dragOffset.y));
            applyPanelPos();
        };

        let resizeStartSize = { width: panelSize.width, height: panelSize.height };
        let resizeStartPoint = { x: 0, y: 0 };
        let activeResizePointerId = null;
        let resizePointerTarget = null;

        const startPointerResize = (e) => {
            if (isMinimized.value) return;
            if (e.pointerType === 'mouse' && e.button !== 0) return;

            e.preventDefault();
            e.stopPropagation();

            const panelEl = panelRef.value;
            const currentWidth = panelEl?.offsetWidth || panelSize.width || UI_TOKENS.panelFallbackWidth;
            const currentHeight = panelEl?.offsetHeight || panelSize.height || UI_TOKENS.panelFallbackHeight;

            panelSize.width = currentWidth;
            panelSize.height = currentHeight;
            hasPanelSizeOverride.value = true;
            applyPanelSize();

            isResizing.value = true;
            activeResizePointerId = e.pointerId;
            resizePointerTarget = e.currentTarget || null;
            resizeStartSize = { width: currentWidth, height: currentHeight };
            resizeStartPoint = { x: e.clientX, y: e.clientY };

            try { resizePointerTarget?.setPointerCapture?.(activeResizePointerId); } catch (_) {}

            const targetDoc = parentWindow.document || document;
            targetDoc.addEventListener('pointermove', onPointerResize, { passive: false });
            targetDoc.addEventListener('pointerup', stopPointerResize);
            targetDoc.addEventListener('pointercancel', stopPointerResize);
        };

        const onPointerResize = (e) => {
            if (!isResizing.value) return;
            if (activeResizePointerId !== null && e.pointerId !== activeResizePointerId) return;

            e.preventDefault();

            const dx = e.clientX - resizeStartPoint.x;
            const dy = e.clientY - resizeStartPoint.y;

            const { width: viewportWidth, height: viewportHeight } = getViewportSize();
            const minWidth = Math.min(Math.max(180, UI_TOKENS.panelMinWidth), Math.max(120, viewportWidth));
            const minHeight = Math.min(Math.max(120, UI_TOKENS.panelMinHeight), Math.max(120, viewportHeight));
            const maxWidth = Math.max(minWidth, viewportWidth - panelPos.left);
            const maxHeight = Math.max(minHeight, viewportHeight - panelPos.top);

            panelSize.width = Math.min(maxWidth, Math.max(minWidth, resizeStartSize.width + dx));
            panelSize.height = Math.min(maxHeight, Math.max(minHeight, resizeStartSize.height + dy));
            applyPanelSize();
            clampPanelIntoViewport({ skipWhenKeyboardOpen: true });
        };

        const stopPointerResize = (e) => {
            if (e && activeResizePointerId !== null && e.pointerId !== activeResizePointerId) return;
            isResizing.value = false;

            try {
                if (resizePointerTarget && activeResizePointerId !== null) {
                    resizePointerTarget.releasePointerCapture?.(activeResizePointerId);
                }
            } catch (_) {}

            activeResizePointerId = null;
            resizePointerTarget = null;

            const targetDoc = parentWindow.document || document;
            targetDoc.removeEventListener('pointermove', onPointerResize);
            targetDoc.removeEventListener('pointerup', stopPointerResize);
            targetDoc.removeEventListener('pointercancel', stopPointerResize);
        };

        const stopPointerDrag = (e) => {
            if (e && activePointerId !== null && e.pointerId !== activePointerId) return;
            isDragging.value = false;

            try {
                if (dragPointerTarget && activePointerId !== null) {
                    dragPointerTarget.releasePointerCapture?.(activePointerId);
                }
            } catch (_) {}

            const wasTap = !dragMoved;

            activePointerId = null;
            dragPointerTarget = null;

            const targetDoc = parentWindow.document || document;
            targetDoc.removeEventListener('pointermove', onPointerDrag);
            targetDoc.removeEventListener('pointerup', stopPointerDrag);
            targetDoc.removeEventListener('pointercancel', stopPointerDrag);

            if (wasTap) {
                isMinimized.value = !isMinimized.value;
                if (isMinimized.value) {
                    closeSettingsPanel();
                }
            }

            if (!isVirtualKeyboardLikelyOpen()) {
                lastStablePanelTop = panelPos.top;
            }

            dragMoved = false;
        };

        const isMobileLike = () => {
            try {
                const mm = parentWindow.matchMedia?.('(hover: none) and (pointer: coarse)');
                if (mm?.matches) return true;
            } catch (_) {}
            const ua = parentWindow.navigator?.userAgent || '';
            return /Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(ua);
        };

        const OUTSIDE_MINIMIZE_WHITELIST_SELECTORS = [
            'input',
            'textarea',
            'select',
            '[contenteditable="true"]',
            '.swal2-container',
            '.dropdown-menu',
            '.ui-autocomplete',
            '.autocomplete',
            '.ime-candidate',
            '.candidate-window',
            '.composition-view',
            '.tox-tinymce'
        ];

        const isWhitelistedTarget = (target) => {
            if (!target || typeof target.closest !== 'function') return false;
            return OUTSIDE_MINIMIZE_WHITELIST_SELECTORS.some(selector => !!target.closest(selector));
        };

        const isVirtualKeyboardLikelyOpen = () => {
            if (!isMobileLike()) return false;

            const doc = parentWindow.document || document;
            const ae = doc.activeElement;

            const isEditing = !!ae && (
                ae.tagName === 'INPUT' ||
                ae.tagName === 'TEXTAREA' ||
                ae.isContentEditable
            );

            if (!isEditing) return false;

            const vv = parentWindow.visualViewport;
            if (!vv) return true;

            const baseHeight = parentWindow.innerHeight || window.innerHeight || 0;
            if (!baseHeight) return isEditing;

            return vv.height < baseHeight * 0.82;
        };

        let autoMinimizeLastCheckTs = 0;
        const AUTO_MINIMIZE_CHECK_INTERVAL_MS = 120;

        const onBrowserOffline = () => {
            if (!store.isConnected) return;
            store.addLog('error', '系统', '网络已断开，已自动退出房间');
            store.disconnect();
        };

        const onDocumentPointerDownAutoMinimize = (e) => {
            triggerFirstRoomClickSync();

            if (!localSettings.autoMinimizeOnOutsideTap || isMinimized.value) return;

            const nowTs = Number(e?.timeStamp || Date.now());
            if (nowTs - autoMinimizeLastCheckTs < AUTO_MINIMIZE_CHECK_INTERVAL_MS) return;
            autoMinimizeLastCheckTs = nowTs;

            const panelEl = panelRef.value;
            const target = e.target;

            if (!panelEl || !target) return;
            if (panelEl.contains(target)) return;

            const doc = parentWindow.document || document;

            const ae = doc.activeElement;
            const isPanelEditing = !!ae && panelEl.contains(ae) && (
                ae.tagName === 'INPUT' ||
                ae.tagName === 'TEXTAREA' ||
                ae.isContentEditable
            );
            if (isPanelEditing) return;

            const acEl = doc.querySelector('.autocomplete, .ui-autocomplete');
            const acVisible = !!(acEl && acEl.offsetParent !== null);
            if (acVisible) return;

            if (isWhitelistedTarget(target)) return;
            if (isVirtualKeyboardLikelyOpen()) return;

            isMinimized.value = true;
            closeSettingsPanel();
        };

        onMounted(() => {
            const targetDoc = parentWindow.document || document;
            targetDoc.addEventListener('pointerdown', onDocumentPointerDownAutoMinimize, true);

            const initialViewport = getViewportSize();
            lastViewportHeight = initialViewport.height;
            lastStablePanelTop = panelPos.top;

            parentWindow.addEventListener('resize', onViewportResize);
            parentWindow.addEventListener('orientationchange', onViewportResize);

            const vv = parentWindow.visualViewport;
            vv?.addEventListener('resize', onViewportResize);

            parentWindow.addEventListener('offline', onBrowserOffline);

            nextTick(() => {
                const panelEl = panelRef.value;
                if (panelEl && !isMinimized.value && hasPanelSizeOverride.value) {
                    panelSize.width = panelEl.offsetWidth || panelSize.width;
                    panelSize.height = panelEl.offsetHeight || panelSize.height;
                }
                applyPanelSize();
                applyPanelPos();
                clampPanelSizeToViewport();
                clampPanelIntoViewport();
                if (!isVirtualKeyboardLikelyOpen()) {
                    lastStablePanelTop = panelPos.top;
                }
            });

            bindPersonaPreviewSync();
        });

        onUnmounted(() => {
            stopPointerDrag();
            stopPointerResize();
            clearKeyboardSettleTimer();
            stopHistoryAutoSync();

            const targetDoc = parentWindow.document || document;
            targetDoc.removeEventListener('pointerdown', onDocumentPointerDownAutoMinimize, true);

            parentWindow.removeEventListener('resize', onViewportResize);
            parentWindow.removeEventListener('orientationchange', onViewportResize);

            const vv = parentWindow.visualViewport;
            vv?.removeEventListener('resize', onViewportResize);

            parentWindow.removeEventListener('offline', onBrowserOffline);

            if (resizeRafId !== null) {
                parentWindow.cancelAnimationFrame?.(resizeRafId);
                resizeRafId = null;
            }

            if (renameDebounceTimer) {
                clearTimeout(renameDebounceTimer);
                renameDebounceTimer = null;
            }

            clearPersonaSyncDebounceTimer();

            if (personaPreviewDomUnbind) {
                personaPreviewDomUnbind();
                personaPreviewDomUnbind = null;
            }
        });

        const disconnect = () => store.disconnect();

        return () => {
            const h = o.h;
            const statusClass = (() => {
                const currentLevel = (store.topStatusLevel || '').toString().toLowerCase();
                const knownHealthyLevel = ['info', 'debug', 'milestone'];

                // 在线且状态正常：绿色；异常/未知/错误：黄色
                if (store.isConnected) {
                    return (knownHealthyLevel.includes(currentLevel))
                        ? 'state-online'
                        : 'state-warning';
                }

                if (!store.isConnected && store.mode !== 'disconnected') return 'state-warning';
                return 'state-offline';
            })();

            const statusTitle = statusClass === 'state-online'
                ? '在线正常'
                : (statusClass === 'state-warning' ? '在线状态异常' : '未连接');

            const faGap = (icon) => h('span', { class: ['fa-solid', 'mp-fa-gap'] }, String.fromCharCode(icon));

            return h('div', {
                class: ['multiplayer-panel', {
                    minimized: isMinimized.value,
                    dragging: isDragging.value,
                    resizing: isResizing.value,
                    'mode-home': store.mode === 'disconnected',
                    'mode-room': store.mode !== 'disconnected',
                    'settings-open': !isMinimized.value && showSettings.value
                }],
                ref: panelRef
            }, [
                h('div', { class: 'panel-header', onPointerdown: startPointerDrag }, [
                    h('div', { class: 'header-left' }, [
                        h('span', {
                            class: ['discord-status-icon', 'fa-brands', statusClass, { minimized: isMinimized.value }],
                            title: statusTitle
                        }, String.fromCharCode(0xf392)),
                        !isMinimized.value ? h('span', { class: 'title' }, '联机工具') : null
                    ].filter(Boolean)),
                    h('div', { class: 'header-actions' }, [
                        store.mode !== 'disconnected'
                            ? h('button', {
                                class: 'icon-btn danger-icon fa-solid',
                                title: '断开连接',
                                onClick: (e) => { e.stopPropagation(); disconnect(); }
                            }, String.fromCharCode(0xf011))
                            : null,
                        h('button', {
                            class: 'icon-btn fa-solid',
                            title: '设置',
                            onClick: (e) => { e.stopPropagation(); toggleSettings(); }
                        }, String.fromCharCode(0xf013))
                    ].filter(Boolean))
                ]),
                h('div', {
                    class: 'panel-resize-handle',
                    onPointerdown: startPointerResize,
                    title: '拖拽调整面板尺寸'
                }),

                (!isMinimized.value && !showSettings.value) ? h('div', { class: 'panel-content' }, [
                    store.mode === 'disconnected' ? h('div', { class: 'settings-section' }, [
                        h('div', { class: 'username-section' }, [
                            h('div', { class: 'section-title' }, [faGap(0xf007), '用户名']),
                            h('input', {
                                value: userName.value,
                                onInput: (e) => {
                                    const nextName = (e.target.value || '');
                                    userName.value = nextName;
                                    localSettings.defaultUserName = nextName;
                                },
                                onBlur: flushRenameNow,
                                placeholder: '输入用户名',
                                class: 'input-field'
                            })
                        ]),

                        h(o.Fragment, null, [
                            h('div', { key: 'rooms-section', class: 'online-rooms-section' }, [
                                h('div', { class: 'section-header' }, [
                                    h('span', { class: 'section-title' }, [faGap(0xf0ac), '在线房间']),
                                    h('button', {
                                        class: 'refresh-btn fa-solid',
                                        onClick: fetchRooms,
                                        disabled: isLoadingRooms.value
                                    }, isLoadingRooms.value ? String.fromCharCode(0xf252) : String.fromCharCode(0xf021))
                                ]),

                                displayRooms.value.length > 0
                                    ? h('div', { class: 'room-list' },
                                        displayRooms.value.map(room =>
                                            h('div', {
                                                key: room.id,
                                                class: ['room-item', { selected: selectedRoom.value === room.id }],
                                                onClick: () => selectRoom(room)
                                            }, [
                                                h('div', { class: 'room-info' }, [
                                                    h('span', { class: 'room-name' }, room.name),
                                                    room.hasPassword
                                                        ? h('span', { class: 'room-lock fa-solid' }, String.fromCharCode(0xf023))
                                                        : null
                                                ].filter(Boolean)),
                                                h('div', { class: 'room-meta' }, [
                                                    h('span', { class: 'fa-solid' }, String.fromCharCode(0xf0c0) + ' ' + getRoomDisplayCurrentUsers(room) + '/' + room.maxUsers)
                                                ])
                                            ])
                                        )
                                    )
                                    : h('div', { class: 'empty-rooms' }, isLoadingRooms.value ? '加载中...' : '暂无房间，点击下方创建'),

                                selectedRoom.value
                                    ? h('div', { class: 'join-room-section' }, [
                                        h('input', {
                                            value: joinPassword.value,
                                            onInput: (e) => joinPassword.value = e.target.value,
                                            type: 'password',
                                            placeholder: '密码（可留空）',
                                            class: ['input-field', { 'mp-input-shake': joinPwdShake.value }]
                                        }),
                                        h('button', {
                                            class: 'action-btn primary',
                                            onClick: () => joinSelectedRoom(false),
                                            disabled: isJoining.value,
                                            title: isJoining.value ? '正在加入，请稍候...' : '加入'
                                        }, [
                                            h('span', { class: 'join-btn-icon fa-solid' }, String.fromCharCode(0xf2f6)),
                                            h('span', { class: 'join-btn-label' }, '加入')
                                        ]),
                                        h('button', {
                                            class: 'action-btn primary',
                                            onClick: () => joinSelectedRoom(true),
                                            disabled: isJoining.value,
                                            title: isJoining.value ? '正在进入观看，请稍候...' : '观看'
                                        }, [
                                            h('span', { class: 'join-btn-icon fa-solid' }, String.fromCharCode(0xf06e)),
                                            h('span', { class: 'join-btn-label' }, '观看')
                                        ])
                                    ])
                                    : null,

                                h('div', { class: 'create-room-section' }, [
                                    h('div', { class: 'section-title' }, [faGap(0xf067), '创建房间']),
                                    h('input', {
                                        value: newRoomName.value,
                                        onInput: (e) => newRoomName.value = e.target.value,
                                        placeholder: '房间名称',
                                        class: 'input-field'
                                    }),
                                    h('div', { class: 'create-room-options' }, [
                                        h('input', {
                                            value: newRoomPassword.value,
                                            onInput: (e) => newRoomPassword.value = e.target.value,
                                            type: 'password',
                                            placeholder: '密码（可留空）',
                                            class: 'input-field medium'
                                        }),
                                        h('input', {
                                            value: newRoomMaxUsers.value,
                                            onInput: (e) => newRoomMaxUsers.value = parseInt(e.target.value) || 8,
                                            type: 'number',
                                            placeholder: '人数',
                                            class: 'input-field tiny',
                                            min: 2,
                                            max: 20
                                        })
                                    ]),
                                    h('button', {
                                        class: 'action-btn primary',
                                        onClick: createAndJoinRoom,
                                        disabled: !newRoomName.value.trim() || isCreating.value
                                    }, isCreating.value ? '创建中...' : '创建并加入')
                                ])
                            ])
                        ])
                    ]) : null,

                    store.mode !== 'disconnected' ? h(o.Fragment, null, [
                        h('div', { key: 'user-list', class: 'user-list' }, [
                            h('div', { class: 'section-title fa-solid' }, [
                                String.fromCharCode(0xf0c0) + ' 玩家 (' + userCount.value + ') ',
                                store.isHost ? h('span', { class: 'host-badge' }, '你是房主') : null
                            ]),
                            h('div', { class: 'user-items' },
                                onlineUsers.value.map(u => {
                                    const leadingNode = u.isHost
                                        ? h('span', {
                                            class: ['user-leading-icon', 'host-crown', 'fa-solid'],
                                            title: '房主'
                                        }, String.fromCharCode(0xf521))
                                        : (
                                            store.isHost
                                                ? h('button', {
                                                    class: 'transfer-leading-btn fa-solid',
                                                    title: '转让房主',
                                                    onClick: (e) => {
                                                        e.stopPropagation();
                                                        transferHost(u.id);
                                                    }
                                                }, String.fromCharCode(0xf362))
                                                : h('span', {
                                                    class: ['user-leading-icon', 'fa-solid'],
                                                    title: '玩家'
                                                }, String.fromCharCode(0xf007))
                                        );

                                    return h('div', {
                                        key: u.id,
                                        class: ['user-item', { host: u.isHost, submitted: hasSubmitted(u.id) }]
                                    }, [
                                        leadingNode,
                                        h('span', { class: 'user-name' }, u.name || '匿名')
                                    ]);
                                })
                            )
                        ]),

                        spectators.value.length > 0
                            ? h('div', { key: 'spectator-list', class: 'spectator-list' }, [
                                h('div', {
                                    class: 'section-title fa-solid mp-spectator-header',
                                    onClick: toggleSpectatorsCollapsed
                                }, [
                                    h('span', {}, `${String.fromCharCode(0xf06e)} 观众 (${spectators.value.length})`),
                                    h('span', { class: 'fa-solid' }, spectatorsCollapsed.value ? String.fromCharCode(0xf078) : String.fromCharCode(0xf077))
                                ]),
                                !spectatorsCollapsed.value
                                    ? h('div', { class: 'spectator-items' },
                                        spectators.value.map(u =>
                                            h('span', { key: u.id, class: ['user-item', 'spectator-item'] }, [
                                                h('span', {
                                                    class: ['user-leading-icon', 'fa-solid'],
                                                    title: '观众'
                                                }, String.fromCharCode(0xf06e)),
                                                h('span', { class: 'user-name' }, u.name || '匿名')
                                            ])
                                        )
                                    )
                                    : null
                            ])
                            : null,

                        h(o.Fragment, null, [
                            h('div', { class: 'section-title fa-solid' }, `${String.fromCharCode(0xf4ad)} 聊天消息`),
                            h('div', { key: 'chat-logs', class: 'chat-logs', ref: logsRef }, [
                                ...store.chatLogs.map(log =>
                                    h('div', { key: log.id, class: ['log-item', log.type] }, [
                                        h('span', { class: 'log-from' }, log.from + ':'),
                                        h('span', { class: 'log-content' }, log.content)
                                    ])
                                ),
                                store.chatLogs.length === 0
                                    ? h('div', { class: 'empty-logs' }, '暂无输入')
                                    : null
                            ])
                        ]),

                        h('div', { key: 'inputs-display' }, [
                            h('div', { class: 'section-title fa-solid' }, [
                                `${String.fromCharCode(0xf46d)} 本轮输入池 (${submittedCount.value}/${userCount.value}) `,
                                allSubmitted.value && userCount.value > 0 ? h('span', { class: 'all-submitted' }, '✓ 全部到齐') : null
                            ]),
                            getPendingMap().size > 0
                                ? h('div', { class: 'pending-inputs' },
                                    Array.from(getPendingMap().entries()).map(([uid, data]) =>
                                        h('div', { key: uid, class: 'pending-input-item' }, [
                                            h('span', { class: 'input-user' }, data.userName + ':'),
                                            data.hideContent
                                                ? h('span', { class: 'input-content hidden-content' }, '********')
                                                : h('span', { class: 'input-content' }, data.content.substring(0, 50) + (data.content.length > 50 ? '...' : ''))
                                        ])
                                    )
                                )
                                : h('div', { class: 'empty-inputs' }, '暂无输入')
                        ]),

                        h('div', { key: 'input-submit', class: 'input-submit-area' }, [
                            null,

                            !store.spectatorMode
                                ? h('textarea', {
                                    value: myInput.value,
                                    onInput: (e) => myInput.value = e.target.value,
                                    class: 'input-textarea',
                                    placeholder: store.isHost
                                        ? '房主输入（可选，会与其他输入合并）...'
                                        : '输入你的本轮内容，点击提交发送...',
                                    rows: 3
                                })
                                : null,

                            !store.spectatorMode
                                ? h('div', { class: 'button-group' }, [
                                    store.isHost
                                        ? h('button', {
                                            class: 'action-btn secondary',
                                            onClick: resetInputs,
                                            disabled: getPendingMap().size === 0
                                        }, '重置')
                                        : null,
                                    h('button', {
                                        class: ['action-btn', mySubmitted.value ? 'secondary fa-solid' : 'primary'],
                                        onClick: mySubmitted.value ? revokeInput : sendInput,
                                        disabled: mySubmitted.value ? false : !myInput.value.trim()
                                    }, mySubmitted.value ? `${String.fromCharCode(0xf2ea)} 撤回` : '提交输入'),
                                    store.isHost
                                        ? h('button', {
                                            class: 'action-btn primary',
                                            onClick: submitToAI,
                                            disabled: getPendingMap().size === 0
                                        }, '立即发送 ')
                                        : null
                                ].filter(Boolean))
                                : null
                        ]),

                        h('div', { key: 'chat-input', class: 'chat-input-area' }, [
                            h('input', {
                                value: chatMsg.value,
                                onInput: (e) => chatMsg.value = e.target.value,
                                onKeyup: (e) => { if (e.key === 'Enter') sendChat(); },
                                placeholder: '发送聊天消息...',
                                class: 'chat-input'
                            }),
                            h('button', {
                                class: 'send-btn small fa-solid',
                                onClick: sendChat,
                                disabled: !chatMsg.value.trim()
                            }, String.fromCharCode(0xf1d8))
                        ])
                    ]) : null
                ]) : null,

                (!isMinimized.value && showSettings.value) ? h('div', {
                    key: 'settings',
                    class: 'settings-modal'
                }, [
                    h('div', { class: 'settings-modal-content' }, [
                        h('div', { class: 'settings-modal-body' }, [
                            h('div', { class: 'settings-tabs' },
                                SETTINGS_TAB_OPTIONS.map(tab =>
                                    h('button', {
                                        key: tab.value,
                                        class: ['settings-tab-btn', { active: settingsTab.value === tab.value }],
                                        onClick: (e) => {
                                            e.stopPropagation();
                                            settingsTab.value = tab.value;
                                        }
                                    }, tab.label)
                                )
                            ),
                            settingsTab.value === 'logs'
                                ? h('div', { class: ['setting-item', 'debug-panel'] }, [
                                    h('div', {
                                        class: 'section-title fa-solid'
                                    }, `${String.fromCharCode(0xf188)} 调试日志（最近30条）`),
                                    h('div', { class: 'debug-logs' }, [
                                        ...store.currentDebugLogs.map(log =>
                                            h('div', { key: log.id, class: ['debug-item', log.type] }, [
                                                h('span', { class: 'debug-time' }, new Date(log.timestamp || Date.now()).toLocaleTimeString()),
                                                h('span', { class: 'log-content' }, `[${log.from || '系统'}] ${log.content || ''}`)
                                            ])
                                        ),
                                        store.currentDebugLogs.length === 0
                                            ? h('div', { class: 'empty-logs' }, '暂无调试日志')
                                            : null
                                    ]),
                                    h('small', { class: ['hint', 'mp-mt-1'] }, `版本: ${PLUGIN_DISPLAY_VERSION}`)
                                ])
                                : null,
                            settingsTab.value === 'general'
                                ? h('div', { class: 'setting-item' }, [
                                    h('label', {}, '用户名'),
                                    h('input', {
                                        value: localSettings.defaultUserName,
                                        onInput: (e) => { localSettings.defaultUserName = e.target.value; },
                                        onChange: saveSettings,
                                        onBlur: flushRenameNow,
                                        onKeyup: (e) => { if (e.key === 'Enter') flushRenameNow(); },
                                        placeholder: '设置用户名',
                                        class: 'settings-input'
                                    })
                                ])
                                : null,

                            settingsTab.value === 'appearance'
                                ? h('div', { class: ['setting-item', 'toggle-item', 'mp-mt-2'] }, [
                                    h('div', {
                                        class: 'toggle-label',
                                        onClick: () => {
                                            localSettings.autoMinimizeOnOutsideTap = !localSettings.autoMinimizeOnOutsideTap;
                                            saveSettings();
                                        }
                                    }, [
                                        h('span', {}, '点击空白最小化:'),
                                        h('span', { class: ['toggle-switch', { active: localSettings.autoMinimizeOnOutsideTap }] })
                                    ]),
                                    h('small', { class: 'hint' }, '开启后点击面板外空白区域会自动最小化；关闭后不会自动最小化')
                                ])
                                : null,

                            settingsTab.value === 'general'
                                ? h('div', { class: ['setting-item', 'mp-mt-1'] }, [
                                    h('label', {}, 'UID:'),
                                    h('input', {
                                        value: localSettings.clientUid,
                                        onInput: (e) => { localSettings.clientUid = e.target.value; },
                                        onChange: saveSettings,
                                        placeholder: '用户唯一标识（可自定义）',
                                        class: 'settings-input',
                                        disabled: store.isConnected
                                    }),
                                    h('small', { class: 'hint' },
                                        store.isConnected
                                            ? '已连接状态下 UID 已锁定，断开后可修改'
                                            : '用于绑定身份，不随用户名变化'
                                    )
                                ])
                                : null,

                            settingsTab.value === 'general'
                                ? h('div', { class: ['setting-item', 'mp-mb-1'] }, [
                                    h('label', {}, '服务器地址:'),
                                    h('input', {
                                        value: store.settings.onlineServer,
                                        onInput: (e) => { store.settings.onlineServer = e.target.value; },
                                        placeholder: 'https://room.example.com',
                                        class: 'settings-input'
                                    })
                                ])
                                : null,

                            settingsTab.value === 'player'
                                ? h('div', { class: ['setting-item', 'toggle-item', 'mp-mt-2'] }, [
                                    h('div', {
                                        class: 'toggle-label',
                                        onClick: () => {
                                            const next = !store.spectatorMode;
                                            const ret = store.setSpectatorMode(next);
                                            if (ret?.ok === false) return;
                                            saveSettings();
                                        }
                                    }, [
                                        h('span', {}, '观众模式:'),
                                        h('span', { class: ['toggle-switch', { active: store.spectatorMode }] })
                                    ]),
                                    h('small', { class: 'hint' },
                                        store.isHost
                                            ? '房主不可切换为观众模式'
                                            : (store.isConnected ? '已连接：立即切换观战状态' : '未连接：作为默认加入身份')
                                    )
                                ])
                                : null,

                            settingsTab.value === 'host'
                                ? renderMultiSelectSetting(h, {
                                    label: '变量模式:',
                                    options: VARIABLE_MODE_FEATURE_OPTIONS,
                                    isPicked: isVariableModePicked,
                                    onToggle: toggleVariableMode,
                                    hint: '可同时勾选：MVU变量 + 数据库',
                                    extraClass: ''
                                })
                                : null,

                            settingsTab.value === 'host'
                                ? h('div', { class: 'setting-item toggle-item' }, [
                                    h('div', {
                                        class: 'toggle-label',
                                        onClick: () => {
                                            localSettings.autoSendWhenAllSubmitted = !localSettings.autoSendWhenAllSubmitted;
                                            saveSettings();
                                        }
                                    }, [
                                        h('span', {}, '自动发送:'),
                                        h('span', { class: ['toggle-switch', { active: localSettings.autoSendWhenAllSubmitted }] })
                                    ]),
                                    h('small', { class: 'hint' }, '开启后，所有玩家提交完成将自动发送')
                                ])
                                : null,

                            settingsTab.value === 'host'
                                ? h('div', { class: 'setting-item' }, [
                                    h('label', {}, '限时输入 (秒):'),
                                    h('input', {
                                        type: 'number',
                                        value: localSettings.timedInputSeconds,
                                        onInput: (e) => { localSettings.timedInputSeconds = parseInt(e.target.value) || 0; },
                                        onChange: saveSettings,
                                        min: 0,
                                        max: 300,
                                        class: 'settings-input mp-input-narrow'
                                    }),
                                    h('small', { class: 'hint' }, '有人提交后N秒自动发送，0为关闭')
                                ])
                                : null,

                            settingsTab.value === 'player'
                                ? h('div', { class: ['setting-item', 'mp-mt-2'] }, [
                                    h('label', {}, '同步正则:'),
                                    h('div', { class: 'mp-sync-actions-column' }, [
                                        h('button', {
                                            class: 'sync-history-btn',
                                            title: '同步房主的历史消息',
                                            onClick: requestSyncHistory,
                                            disabled: !store.isConnected || store.isHost || syncState.history
                                        }, historySyncButtonText.value),
                                        h('button', {
                                            class: 'sync-history-btn',
                                            title: '同步房主的局部正则',
                                            onClick: () => requestSyncRegex(['character']),
                                            disabled: !store.isConnected || store.isHost || syncState.regex
                                        }, syncState.regex ? '同步中…' : '同步正则'),
                                        h('button', {
                                            class: 'sync-history-btn',
                                            title: '同步房主的变量数据',
                                            onClick: requestSyncVariables,
                                            disabled: !store.isConnected || store.isHost || syncState.variables
                                        }, syncState.variables ? '同步中…' : '同步变量'),
                                        h('button', {
                                            class: 'sync-history-btn',
                                            title: '同步房主的角色脚本',
                                            onClick: requestSyncScripts,
                                            disabled: !store.isConnected || store.isHost || syncState.scripts
                                        }, syncState.scripts ? '同步中…' : '同步脚本')
                                    ]),
                                    h('small', { class: 'hint' },
                                        store.isHost
                                            ? '房主无需执行该同步'
                                            : '进入房间后首次点击会自动执行一次同步，并启动历史记录自动同步'
                                    )
                                ])
                                : null,

                            settingsTab.value === 'general'
                                ? h('div', { class: ['setting-item', 'toggle-item', 'mp-mt-2'] }, [
                                    h('div', {
                                        class: 'toggle-label',
                                        onClick: () => {
                                            localSettings.hideUserInputContent = !localSettings.hideUserInputContent;
                                            saveSettings();
                                        }
                                    }, [
                                        h('span', {}, '隐藏模式:'),
                                        h('span', { class: ['toggle-switch', { active: localSettings.hideUserInputContent }] })
                                    ]),
                                    h('small', { class: 'hint' }, '开启后仅“本轮输入池”显示为 ********，发送到用户层仍为真实内容')
                                ])
                                : null,

                            settingsTab.value === 'player'
                                ? h('div', { class: 'setting-item' }, [
                                    h('label', {}, '同步历史消息层数:'),
                                    h('input', {
                                        type: 'number',
                                        value: localSettings.syncHistoryDepth,
                                        onInput: (e) => { localSettings.syncHistoryDepth = parseInt(e.target.value) || 0; },
                                        onChange: saveSettings,
                                        min: 0,
                                        max: 1000,
                                        class: 'settings-input mp-input-narrow'
                                    }),
                                    h('small', { class: 'hint' }, '限制同步的历史消息数量，0为全部')
                                ])
                                : null,

                            settingsTab.value === 'general'
                                ? h('div', { class: ['setting-item', 'mp-mt-1'] }, [
                                    h('label', {}, '设定前缀:'),
                                    h('input', {
                                        value: localSettings.personaPrefix,
                                        onInput: (e) => { localSettings.personaPrefix = e.target.value; },
                                        onChange: saveSettings,
                                        placeholder: '例如: [{name}]的设定:',
                                        class: 'settings-input'
                                    }),
                                    h('small', { class: 'hint' }, `当前设定前缀预览：${personaPrefixPreviewText.value}`)
                                ])
                                : null,

                            settingsTab.value === 'general'
                                ? h('div', { class: ['setting-item', 'message-prefix-setting', 'mp-mt-1'] }, [
                                    h('label', {}, '消息前缀:'),
                                    h('input', {
                                        value: localSettings.messagePrefix,
                                        onInput: (e) => { localSettings.messagePrefix = e.target.value; },
                                        onChange: saveSettings,
                                        placeholder: '例如: [{name}]',
                                        class: 'settings-input'
                                    }),
                                    h('small', { class: 'hint' }, '使用 {name}，默认按用户设定角色名替换')
                                ])
                                : null,

                            settingsTab.value === 'general'
                                ? h('div', { class: ['setting-item', 'mp-mt-1'] }, [
                                    h('label', {}, '消息后缀:'),
                                    h('input', {
                                        value: localSettings.messageSuffix,
                                        onInput: (e) => { localSettings.messageSuffix = e.target.value; },
                                        onChange: saveSettings,
                                        placeholder: '例如: desu!!',
                                        class: 'settings-input'
                                    })
                                ])
                                : null,

                            settingsTab.value === 'general'
                                ? h('div', { class: 'preview-box' }, [
                                    h('div', {}, [
                                        h('span', { class: 'preview-label' }, '消息预览:'),
                                        h('span', { class: 'preview-text' }, previewText.value)
                                    ]),
                                    h('div', { class: 'mp-mt-2' }, [
                                        h('span', { class: 'preview-label' }, '用户设定发送预览:'),
                                        h('span', { class: 'preview-text' }, personaPreviewText.value)
                                    ])
                                ])
                                : null
                                ].filter(Boolean))
                        ])
                ]) : null
            ]);
        };
    }
});



// ==========================================
// 9. 挂载与初始化 
// ==========================================
let _app = null; // 模块级变量，用于 unload 时 unmount
let _unloadHandler = null; // 防重复绑定 unload


// JS-Slash-Runner iframe 中 DOM 可能已 ready，用兼容写法确保执行
const bootstrap = () => {
    const targetDoc = parentWindow.document;

    // 先清理当前实例遗留监听
    offAllTrackedEvents();

    // 清理旧版本/旧实例遗留容器与样式，避免并行实例重复挂事件
    removeLegacyMountArtifacts(targetDoc);

    const staleContainers = Array.from(targetDoc.querySelectorAll(`[id^="${CONTAINER_ID_PREFIX}"]`));
    staleContainers.forEach((el) => {
        if (el.id !== CONTAINER_ID) {
            try { el.remove(); } catch (e) {}
        }
    });

    const staleStyles = Array.from(targetDoc.querySelectorAll(`[id^="${STYLE_ID_PREFIX}"]`));
    staleStyles.forEach((el) => {
        if (el.id !== STYLE_ID) {
            try { el.remove(); } catch (e) {}
        }
    });

    // 若旧容器存在，先尝试卸载旧 app 再移除容器
    const existed = targetDoc.getElementById(CONTAINER_ID);
    if (existed) {
        try { _app?.unmount(); } catch (e) {}
        existed.remove();
    }

    // 同一页面中仅允许一个活动实例：主动清理上一个实例
    const runtimeHost = parentWindow || window;
    const prevRuntime = runtimeHost[RUNTIME_SINGLETON_KEY];
    if (prevRuntime && typeof prevRuntime.dispose === 'function') {
        try {
            if (prevRuntime.instanceId !== SCRIPT_INSTANCE_ID) {
                prevRuntime.dispose('replaced_by_new_instance');
            }
        } catch (e) {}
    }

    // 注入样式
    injectStyles();

    // 创建挂载点 — 面板需要挂到父窗口的 body 上才能在酒馆主界面可见
    const container = targetDoc.createElement('div');
    container.id = CONTAINER_ID;
    targetDoc.body.appendChild(container);

    const pinia = createPinia();
    _app = createApp(MultiplayerPanel);
    _app.use(pinia);
    _app.mount(container);


    const store = useMultiplayerStore();
    initSTHooks(store);
    initACUSync(store);
    initSpoilerEngine();

    if (_unloadHandler) {
        window.removeEventListener('unload', _unloadHandler);
    }

    _unloadHandler = () => {
        try {
            const s = useMultiplayerStore();
            if (s.isConnected) s.getClient()?.disconnect();
        } catch (e) {}

        offAllTrackedEvents();

        try {
            const win = window.top || window.parent || window;
            const api = win.AutoCardUpdaterAPI;
            const cbKey = ACU_REGISTERED_CALLBACK_KEY;
            const cb = win[cbKey];

            if (cb && typeof api?.unregisterTableUpdateCallback === 'function') {
                api.unregisterTableUpdateCallback(cb);
            }

            delete win[cbKey];
            delete win[ACU_CALLBACK_REGISTERED_FLAG_KEY];
        } catch (e) {}

        try { _app?.unmount(); } catch (e) {}

        const doc = (parentWindow.document || document);

        removeLegacyMountArtifacts(doc);

        const old = doc.getElementById(CONTAINER_ID);
        if (old) old.remove();

        const oldStyle = doc.getElementById(STYLE_ID);
        if (oldStyle) oldStyle.remove();

        try {
            const host = parentWindow || window;
            const rt = host[RUNTIME_SINGLETON_KEY];
            if (rt && rt.instanceId === SCRIPT_INSTANCE_ID) {
                delete host[RUNTIME_SINGLETON_KEY];
            }
        } catch (e) {}
    };

    const disposeCurrentInstance = (reason = 'manual_dispose') => {
        try {
            if (typeof _unloadHandler === 'function') {
                _unloadHandler();
            }
        } catch (e) {}
        try {
            window.removeEventListener('unload', _unloadHandler);
        } catch (e) {}
    };

    try {
        const host = parentWindow || window;
        host[RUNTIME_SINGLETON_KEY] = {
            instanceId: SCRIPT_INSTANCE_ID,
            dispose: disposeCurrentInstance
        };
    } catch (e) {}

    window.addEventListener('unload', _unloadHandler);
    store.addLog('milestone', '系统', '[弹窗替代:启动提示] 联机工具 已加载完毕！');
};

// 兼容 jQuery 存在/不存在两种情况
if ($ && typeof $ === 'function') {
    $(bootstrap);
} else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}