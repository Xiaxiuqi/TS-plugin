const fs = require('fs');

const file = 'src/数据库前端/regex-正文-诡秘之主catiger52发';
let s = fs.readFileSync(file, 'utf8');
const original = s;

function mustReplace(label, pattern, replacement) {
  const before = s;
  s = s.replace(pattern, replacement);
  if (s === before) {
    console.warn(`[WARN] 未匹配: ${label}`);
  } else {
    console.log(`[OK] ${label}`);
  }
}

function replaceAll(label, pattern, replacement) {
  const matches = s.match(pattern);
  s = s.replace(pattern, replacement);
  console.log(`[OK] ${label}: ${matches ? matches.length : 0}`);
}

mustReplace('移除移动端滚动容器中的 summarizer 引用', /\n\s*#summarizer-input-list,/, '');

mustReplace(
  '删除智能总结器与二次精炼器 CSS',
  /\/\* --- 新增：美化版智能总结器UI：[^\n]*\n[\s\S]*?(?=\/\* 思维链和弹幕位置\*\/)/,
  '',
);

mustReplace(
  '删除总结器与二次精炼器 HTML 模态框',
  /<div id="summarizer-modal" class="modal-overlay">[\s\S]*?<div id="sequence-fixer-modal" class="modal-overlay">/,
  '<div id="sequence-fixer-modal" class="modal-overlay">',
);

mustReplace(
  '删除 DOM 缓存中的总结器热点',
  /\n\s*\/\/ 总结器相关\n\s*'summarizer-body': '#summarizer-body',\n\s*'summarizer-footer': '#summarizer-footer',\n\s*'summarizer-output-container': '#summarizer-output-container',\n\s*'summarizer-output': '#summarizer-output',\n\s*'btn-generate-summary': '#btn-generate-summary',/,
  '',
);

mustReplace(
  '删除总结与精炼模板',
  /\n\s*"refine_memory": `[\s\S]*?`,\n\s*"defensive_template": `[\s\S]*?`,(?=\n\s*"gacha_template")/,
  '',
);

mustReplace('清理模板渲染注释中的 refine_memory 示例', /例如 "refine_memory"/g, '例如 "event_template"');

mustReplace(
  '删除 ChronicleCore 核心记忆键与总结标记工具',
  /getLorebookKey\(type, unifiedIndex\) \{\n\s*const baseKeys = \{\n\s*journey: "本周目经历",\n\s*core_memory: "本周目核心记忆"\n\s*\};\n\s*const base = baseKeys\[type\] \|\| type;\n\s*return unifiedIndex > 1 \? `\$\{base\}\(\$\{unifiedIndex\}\)` : base;\n\s*\},\n\n\s*\/\/ 2\. 标签解析器：精准提取最后总结的事件 ID\n\s*extractSummarizedId\(text\) \{[\s\S]*?\n\s*\},\n\n\s*\/\/ 3\. 标签烙印器：安全覆盖或追加总结 ID，绝不破坏原有格式\n\s*updateSummarizedId\(text, newId\) \{[\s\S]*?\n\s*\},/,
  `getLorebookKey(type, unifiedIndex) {
    const baseKeys = {
      journey: "本周目经历"
    };
    const base = baseKeys[type] || type;
    return unifiedIndex > 1 ? \`\${base}(\${unifiedIndex})\` : base;
  },`,
);

mustReplace('删除 GameManager 总结状态字段', /\n\s*lastExtractedCoreMemory: null,[^\n]*/, '');

mustReplace(
  '删除 GameManager 总结工作锁字段',
  /\n\s*isSummarizing: false,[^\n]*\n\s*summaryReminderShown: false,[^\n]*/,
  '',
);

mustReplace(
  '删除核心记忆上下文装配函数',
  /\n\/\/ 本周目核心记忆\nasync _assembleCoreMemory\(\) \{[\s\S]*?\n\},\n\/\/人物档案/,
  '\n//人物档案',
);

mustReplace(
  '简化 _assembleContexts 并移除核心记忆注入',
  /const \[shortTermMemory, dossierText, coreMemory\] = await Promise\.all\(\[\n\s*this\._assembleShortTermMemory\(\), \/\/ 返回 \{ normal, important \}\n\s*this\._assembleCharacterDossiers\(stat_data, userMessage\), \/\/ 返回 string\n\s*this\._assembleCoreMemory\(\)\s*\/\/ 返回 \{ content, isImportant \}\n\s*\]\);/,
  `const [shortTermMemory, dossierText] = await Promise.all([
    this._assembleShortTermMemory(),
    this._assembleCharacterDossiers(stat_data, userMessage)
  ]);`,
);

mustReplace(
  '删除 _assembleContexts 核心记忆分流块',
  /\n\s*\/\/ 根据核心记忆的开关决定放入哪个池子\n\s*if \(coreMemory\.content\) \{[\s\S]*?\n\s*\}\n(?=\n\s*\/\/ 4\. 组装 should_scan: true)/,
  '\n',
);

mustReplace(
  '改写短期记忆提示文案去总结化',
  /\[以下是之前发生的事情总结（供参考，非本轮新发生内容）\]/g,
  '[以下是之前发生的事情记录（供参考，非本轮新发生内容）]',
);

mustReplace(
  '改写短期记忆结束文案去总结化',
  /\[以上是之前发生的事情总结（短期内容已结束）\]/g,
  '[以上是之前发生的事情记录（短期内容已结束）]',
);

mustReplace(
  '删除 handleStreamEnd 总结/精炼劫持',
  /\n\s*if \(this\.isSummarizing\) return this\._handleSummaryHijack\(finalText\);\n\s*if \(this\.isRefining\) return this\._handleRefineHijack\(finalText\);/,
  '',
);

mustReplace('删除 clear locks 中的总结/精炼锁', /\n\s*this\.isSummarizing = false;\n\s*this\.isRefining = false;/, '');

mustReplace(
  '删除 _parseAiResponse 核心记忆提取',
  /\n\s*coreMemory: this\._extractLastTagContent\("本周目核心记忆", sanitizedText\),/,
  '',
);

mustReplace(
  '删除总结器与精炼器劫持函数',
  /\n\/\/ 3\. 智能总结拦截器：专职处理DOM\n_handleSummaryHijack\(finalText\) \{[\s\S]*?\n\},\n\n\/\/ 5\. 变量修改拦截器：专职处理DOM/,
  '\n// 5. 变量修改拦截器：专职处理DOM',
);

mustReplace(
  '删除回合快照自动坍缩触发',
  /\n\s*\/\/ 4\. 触发异步机制：自动坍缩\n\s*if \(!this\.collapseSettings\) await this\.loadCollapseSettings\(\);\n\s*if \(this\.collapseSettings\?\.autoEnable\) \{[\s\S]*?\n\s*\}\n(?=\} catch \(e\) \{)/,
  '\n',
);

mustReplace('删除世界书统一入库后的总结提醒调用', /\n\s*await this\.checkForSummaryReminder\(\);/, '');

mustReplace('删除禁用清理函数里的核心记忆缓存', /\n\s*this\.lastExtractedCoreMemory = null;/g, '');

mustReplace(
  '删除 _updateInstanceData 核心记忆缓存写入',
  /\n\s*if \(parsedData\.coreMemory\) this\.lastExtractedCoreMemory = parsedData\.coreMemory;/,
  '',
);

mustReplace('删除提取内容解析中的 coreMemory 返回', /\n\s*coreMemory: this\.lastExtractedCoreMemory \|\| "",/, '');

mustReplace(
  '保留线索覆写策略并移除核心记忆分支',
  /else if \(baseEntryKey === "本周目核心记忆" \|\| baseEntryKey === "当前线索"\) \{/,
  'else if (baseEntryKey === "当前线索") {',
);

mustReplace(
  '删除设置面板核心记忆扫描项',
  /\n\s*<div class="setting-item">\n\s*<label\n\s*class="setting-label"\n\s*for="core-memory-important-toggle"\n\s*>核心记忆高强度扫描<\/label[\s\S]*?\n\s*<\/div>\n(?=\n\s*<div class="setting-item">\n\s*<label\n\s*class="setting-label"\n\s*for="max-companion-slots-input")/,
  '\n',
);

mustReplace(
  '删除设置面板核心记忆扫描绑定',
  /\n\s*const coreMemoryImportantToggle = document\.getElementById\(\n\s*"core-memory-important-toggle",\n\s*\);\n\s*if \(coreMemoryImportantToggle\) \{[\s\S]*?\n\s*\}\n(?=\n\s*document\n\s*\.getElementById\("btn-import-bg"\))/,
  '\n',
);

mustReplace(
  '精简 saveMemorySplitSettings',
  /async saveMemorySplitSettings\(\) \{\n\s*try \{\n\s*await AppStorage\.saveData\(\n\s*"memory_split_important_events",\n\s*this\.recentImportantEventsCount\n\s*\);\n\s*await AppStorage\.saveData\(\n\s*"memory_split_core_memory",\n\s*this\.isCoreMemoryImportant\n\s*\);\n\s*console\.log\("\[记忆系统\] 分流设置已保存"\);\n\s*\} catch \(error\) \{[\s\S]*?\n\s*\}\n\s*\},/,
  `async saveMemorySplitSettings() {
  try {
    await AppStorage.saveData(
      "memory_split_important_events",
      this.recentImportantEventsCount
    );
    console.log("[记忆系统] 分流设置已保存");
  } catch (error) {
    console.error("[记忆系统] 保存分流设置失败:", error);
  }
},`,
);

mustReplace(
  '精简 loadMemorySplitSettings',
  /async loadMemorySplitSettings\(\) \{\n\s*try \{[\s\S]*?this\.isCoreMemoryImportant = true;\n\s*\}\n\s*\},/,
  `async loadMemorySplitSettings() {
  try {
    this.recentImportantEventsCount = await AppStorage.loadData(
      "memory_split_important_events",
      3
    );
    console.log(
      \`[记忆系统] 分流设置已加载 - 高优近期事件:\${this.recentImportantEventsCount}条\`
    );
  } catch (error) {
    console.error("[记忆系统] 加载分流设置失败，使用默认值:", error);
    this.recentImportantEventsCount = 3;
  }
},`,
);

mustReplace(
  '清理 showPastLives 中总结器按钮残留',
  /\n\s*\/\/ 清除"本周目经历"可能添加的按钮\n\s*const existingBtn = document\.getElementById\("btn-show-summarizer"\);\n\s*if \(existingBtn\) existingBtn\.remove\(\);/,
  '',
);

mustReplace(
  '删除 showJourney 总结按钮、精炼按钮与坍缩控制台',
  /\/\/主界面：本周目经历、坍缩控制台与总结入口\nasync showJourney\(\) \{[\s\S]*?\n\},\n\/\/ 本周目经历浏览/,
  `//主界面：本周目经历
async showJourney() {
  this.openModal("history-modal");
  await this.loadUnifiedIndex();
  const header = document.querySelector(
    "#history-modal .modal-header",
  );
  const titleEl = document.getElementById("history-modal-title");
  if (titleEl) titleEl.textContent = "本周目经历";

  const existingRepairBtn = document.getElementById("btn-repair-journey");
  if (existingRepairBtn) existingRepairBtn.remove();

  const contentPlaceholder = document.getElementById(
    "timeline-content-container",
  );
  const consolePlaceholder = document.getElementById(
    "trim-console-placeholder",
  );

  if (contentPlaceholder)
    contentPlaceholder.innerHTML =
      '<p class="modal-placeholder">正在安全加载记忆...请勿操作</p>';
  if (consolePlaceholder) consolePlaceholder.innerHTML = "";

  if (header) {
    const repairBtn = document.createElement("button");
    repairBtn.id = "btn-repair-journey";
    repairBtn.className = "interaction-btn";
    repairBtn.style.marginLeft = "auto";
    repairBtn.innerHTML = "深度修复经历";
    repairBtn.title = "当发现经历漏记或错乱时，点击此按钮从快照中重新提取并覆盖重写世界书。";
    header.insertBefore(repairBtn, titleEl ? titleEl.nextSibling : header.firstChild);
    repairBtn.addEventListener("click", async () => {
      this.showConfirmModal(
        "确定要深度修复本周目经历吗？\\n警告：这将从历史快照中重新提取经历并覆盖当前世界书，您手动修改过的经历将被重置。",
        async () => {
          await this.forceSyncJourneyLorebook();
          await this.showJourney();
        }
      );
    });
  }

  if (!contentPlaceholder) return;

  try {
    const index = this.unifiedIndex;
    const journeyKey = index > 1 ? \`本周目经历(\${index})\` : "本周目经历";

    const entries = await WorldbookManager.fetchEntries(journeyKey, { exactMatch: true });
    const journeyEntry = entries[0];

    contentPlaceholder.innerHTML = this.renderJourneyFromContent(journeyEntry);
    this.bindJourneyListeners();

    const repairBtn = document.getElementById("btn-repair-journey");
    if (repairBtn && journeyEntry && journeyEntry.content) {
      const events = this.parseJourneyEntry(journeyEntry.content);
      const historyLen = this.chatHistoryCache.length;

      if (historyLen > 5 && events.length < historyLen - 3) {
        repairBtn.innerHTML = "⚠️ 建议修复经历";
        repairBtn.style.backgroundColor = "var(--color-danger, #d9534f)";
        repairBtn.style.color = "white";
        repairBtn.style.animation = "pulse 2s infinite";
      }
    }
  } catch (error) {
    console.error('读取"本周目经历"时出错:', error);
    contentPlaceholder.innerHTML = /* HTML */ \`<p class="modal-placeholder">读取记忆时出现错误：\${error.message}</p>\`;
  }
},
// 本周目经历浏览`,
);

mustReplace(
  '移除经历事件中的总结/修剪复选框',
  /\n\s*<input type="checkbox" class="journey-select-checkbox" data-sequence-id="\$\{eventData\["序号"\]\}" title="勾选此条目用于修剪或总结">/,
  '',
);

mustReplace(
  '删除时间线坍缩和大总结函数块',
  /\n\/\/ -------- 【重构版修剪台】时间线坍缩系统 ---------[\s\S]*?\n\/\/ ============================================\n\/\/ ===========快照序号修正工具================/,
  '\n// ============================================\n// ===========快照序号修正工具================',
);

mustReplace(
  '删除 _buildSavePayload 中 coreMemoryKey 声明',
  /\n\s*const coreMemoryKey = ChronicleCore\.getLorebookKey\("core_memory", this\.unifiedIndex\);/,
  '',
);

mustReplace(
  '删除 _buildSavePayload 中核心记忆读取',
  /\n\s*\/\/ 2\. 提取核心记忆与玩家人设\n\s*const coreMemoryContent = allEntries\.find\(\(e\) => e\.comment === coreMemoryKey\)\?\.content \|\| "";/,
  '\n  // 2. 提取玩家人设',
);

mustReplace(
  '删除存档 payload 中 core_memory',
  /lorebook_content: \{ journey: journeyContent, core_memory: coreMemoryContent, player_persona: playerPersonaContent \}/,
  'lorebook_content: { journey: journeyContent, player_persona: playerPersonaContent }',
);

mustReplace(
  '删除读档恢复核心记忆条目',
  /\n\s*\{\n\s*key: this\.unifiedIndex > 1 \? `本周目核心记忆\(\$\{this\.unifiedIndex\}\)` : "本周目核心记忆",\n\s*content: loreContent\.core_memory\n\s*\},/,
  '',
);

mustReplace(
  '删除新周目清空核心记忆',
  /const entriesToClear = \["本周目经历", "本周目核心记忆", "当前线索", "历史的投影", "玩家人设"\];/,
  'const entriesToClear = ["本周目经历", "当前线索", "历史的投影", "玩家人设"];',
);

mustReplace('删除归档清理核心记忆', /\n\s*index > 1 \? `本周目核心记忆\(\$\{index\}\)` : "本周目核心记忆",/, '');

mustReplace(
  '删除核心世界书蓝图中的核心记忆',
  /\n\s*\{\n\s*name: "本周目核心记忆",\n\s*enabled: false,\n\s*strategy: \{ type: 'selective' \},\n\s*position: \{ type: 'at_depth', role: 'system', depth: 0, order: 5000 \},\n\s*content: ""\n\s*\},/,
  '',
);

if (s === original) {
  console.log('未产生任何变更');
  process.exit(1);
}

fs.writeFileSync(file, s, 'utf8');
console.log(`完成写入，字符差异: ${original.length} -> ${s.length}`);
