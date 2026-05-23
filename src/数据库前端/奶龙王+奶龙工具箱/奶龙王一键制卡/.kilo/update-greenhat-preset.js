const fs = require('fs');
const path = require('path');

const CARD_PATH = path.join('output', '绿帽之家', '绿帽之家.json');
const OPENING_SOURCE_PATH = path.join('output', '绿帽之家', 'frontend', 'opening-regex.html');
const PRESET_SOURCE_PATH = '剧情推进.json';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function createUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : ((random & 0x3) | 0x8);
    return value.toString(16);
  });
}

function extractTemplateBase64(replaceString) {
  const match = String(replaceString).match(/const EMBEDDED_TEMPLATE_BASE64 = \"([^\"]+)\";/);
  if (!match) {
    throw new Error('未在欢迎页面正则中找到 EMBEDDED_TEMPLATE_BASE64');
  }
  return match[1];
}

const card = readJson(CARD_PATH);
const preset = readJson(PRESET_SOURCE_PATH);

if (!Array.isArray(preset) || !preset[0]) {
  throw new Error('剧情推进预设格式异常');
}

preset[0].name = '绿帽之家-剧情推进';
preset[0].extractTags = 'recall,first,second,third,fourth,chaos';
preset[0].finalSystemDirective = '你现在进入《绿帽之家》正文阶段。用户输入内容是$8\n请先吸收以下推进结果，再基于当前人物状态与场景继续正文：\n- 优先参考 <first> 的场景焦点与叙事节奏。\n- 优先参考 <third> 的人物状态、情绪变化与行为倾向。\n- 优先参考 <fourth> 的道具、伏笔与可推进线索。\n- 若 <chaos> 升高，则让偷窥感、压迫感与色情张力自然升级，但不要无依据跳阶段。\n\n';

const presetBase64 = Buffer.from(JSON.stringify(preset), 'utf8').toString('base64');
const regexScripts = card?.data?.extensions?.regex_scripts;

if (!Array.isArray(regexScripts)) {
  throw new Error('角色卡缺少 regex_scripts');
}

const openingScript = regexScripts.find(script => script.scriptName === '欢迎页面');
if (!openingScript) {
  throw new Error('未找到“欢迎页面”脚本');
}

const templateBase64 = extractTemplateBase64(openingScript.replaceString);
let openingHtml = fs.readFileSync(OPENING_SOURCE_PATH, 'utf8');
openingHtml = openingHtml
  .replace('{{TEMPLATE_BASE64}}', templateBase64)
  .replace('{{PRESET_BASE64}}', presetBase64);

openingScript.replaceString = `====\n\`\`\`html\n${openingHtml}\n\`\`\``;

const plotBeautifyHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>绿帽之家 - 剧情推进面板</title>
<style>
:root {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-card: #0f3460;
  --text-primary: #f6eef2;
  --text-secondary: #cab8c0;
  --accent-pink: #e94560;
  --accent-purple: #7b2cbf;
  --gold: #d4a574;
  --border: rgba(233, 69, 96, 0.24);
  --shadow: 0 12px 32px rgba(0, 0, 0, 0.38);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: transparent;
  color: var(--text-primary);
  font-family: 'Microsoft YaHei', sans-serif;
  font-size: 13px;
  line-height: 1.7;
  padding: 4px;
}
.panel {
  background: linear-gradient(160deg, rgba(26, 26, 46, 0.97), rgba(22, 33, 62, 0.97));
  border: 1px solid var(--border);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: var(--shadow);
}
.hero {
  padding: 18px 18px 14px;
  border-bottom: 1px solid rgba(233, 69, 96, 0.14);
}
.title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #ffb7c5, var(--gold), var(--accent-pink));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.sub {
  margin-top: 6px;
  color: var(--text-secondary);
  font-size: 12px;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 14px 18px 0;
}
.metric {
  background: linear-gradient(180deg, rgba(15, 52, 96, 0.48), rgba(22, 33, 62, 0.76));
  border: 1px solid rgba(233, 69, 96, 0.18);
  border-radius: 12px;
  padding: 12px;
}
.metric-label {
  color: var(--text-secondary);
  font-size: 11px;
  margin-bottom: 6px;
}
.metric-value {
  font-size: 20px;
  font-weight: 800;
}
.content {
  padding: 14px 18px 18px;
}
.section {
  background: rgba(15, 52, 96, 0.18);
  border: 1px solid rgba(233, 69, 96, 0.14);
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 12px;
}
.section.soft {
  border-color: rgba(123, 44, 191, 0.22);
  background: rgba(123, 44, 191, 0.08);
}
.section.highlight {
  border-color: rgba(212, 165, 116, 0.28);
  background: rgba(212, 165, 116, 0.08);
}
.section.empty {
  opacity: 0.92;
}
.section-title {
  font-size: 12px;
  color: #ffb7c5;
  letter-spacing: 0.6px;
  margin-bottom: 10px;
  font-weight: 700;
}
.section-text {
  color: var(--text-primary);
  word-break: break-word;
  white-space: normal;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(233, 69, 96, 0.10);
  border: 1px solid rgba(233, 69, 96, 0.20);
  color: #ffd7df;
  font-size: 12px;
}
@media (max-width: 640px) {
  .metrics { grid-template-columns: 1fr; }
}
</style>
</head>
<body>
<div class="panel">
  <div class="hero">
    <div class="title">绿帽之家 · 剧情推进</div>
    <div class="sub">场景焦点 / 人物状态 / 道具伏笔 / 记忆召回</div>
  </div>
  <div class="metrics">
    <div class="metric">
      <div class="metric-label">混沌值</div>
      <div class="metric-value" id="chaosValue">0</div>
    </div>
    <div class="metric">
      <div class="metric-label">召回数</div>
      <div class="metric-value" id="recallValue">0</div>
    </div>
  </div>
  <div class="content" id="content"></div>
</div>
<script>
(function () {
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  function updateHeight() {
    setTimeout(function () {
      var height = document.body.scrollHeight;
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'resizeIframe', height: height }, '*');
      }
    }, 60);
  }

  function getChatMessages() {
    try {
      if (typeof getContext === 'function') {
        var ctx = getContext();
        if (ctx && Array.isArray(ctx.chat)) return ctx.chat;
      }
    } catch (e) {}

    try {
      if (typeof window.SillyTavern !== 'undefined' && Array.isArray(window.SillyTavern.chat)) {
        return window.SillyTavern.chat;
      }
    } catch (e) {}

    return null;
  }

  function extractTagFromChat(tagName) {
    var chat = getChatMessages();
    if (!chat) return '';
    var regex = new RegExp('<' + tagName + '>([\\s\\S]*?)<\\/' + tagName + '>', 'i');

    for (var i = chat.length - 1; i >= 0; i--) {
      var msg = chat[i];
      if (!msg) continue;
      var sources = [msg.extra && msg.extra.qrf_plot ? msg.extra.qrf_plot : null, msg.mes, msg.qrf_plot];

      if (Array.isArray(msg.swipes)) {
        for (var s = 0; s < msg.swipes.length; s++) {
          var swipe = msg.swipes[s];
          if (typeof swipe === 'string') sources.push(swipe);
          else if (swipe && swipe.extra && swipe.extra.qrf_plot) sources.push(swipe.extra.qrf_plot);
        }
      }

      for (var j = 0; j < sources.length; j++) {
        var source = sources[j];
        if (!source) continue;
        var match = source.match(regex);
        if (match && match[1]) return match[1].trim();
      }
    }

    return '';
  }

  function extractUserInputBlock() {
    var chat = getChatMessages();
    if (!chat) return '';
    var regex = /你现在进入《绿帽之家》正文阶段。用户输入内容是([\s\S]*?)(?:\n请先吸收以下推进结果，再基于当前人物状态与场景继续正文：|$)/i;

    for (var i = chat.length - 1; i >= 0; i--) {
      var msg = chat[i];
      if (!msg) continue;
      var sources = [msg.mes, msg.extra && msg.extra.qrf_plot ? msg.extra.qrf_plot : null, msg.qrf_plot];

      for (var j = 0; j < sources.length; j++) {
        var source = sources[j];
        if (!source) continue;
        var match = source.match(regex);
        if (match && match[1]) return match[1].trim();
      }
    }

    return '';
  }

  function splitRecall(text) {
    return String(text || '').split(/\r?\n/).map(function (line) {
      return line.trim();
    }).filter(Boolean);
  }

  function renderSection(title, text, extraClass) {
    if (!text) return '';
    return '<section class="section ' + (extraClass || '') + '"><div class="section-title">' + escapeHtml(title) + '</div><div class="section-text">' + escapeHtml(text).replace(/\n/g, '<br>') + '</div></section>';
  }

  function init() {
    var firstText = extractTagFromChat('first');
    var secondText = extractTagFromChat('second');
    var thirdText = extractTagFromChat('third');
    var fourthText = extractTagFromChat('fourth');
    var chaosText = extractTagFromChat('chaos') || '0';
    var recallLines = splitRecall(extractTagFromChat('recall'));
    var userInput = extractUserInputBlock();

    document.getElementById('chaosValue').textContent = chaosText;
    document.getElementById('recallValue').textContent = String(recallLines.length);

    var html = '';
    if (userInput) html += renderSection('用户输入', userInput, 'highlight');
    html += renderSection('场景焦点', firstText);
    html += renderSection('推进判断', secondText, 'soft');
    html += renderSection('人物状态', thirdText);
    html += renderSection('道具与伏笔', fourthText, 'soft');

    if (recallLines.length) {
      html += '<section class="section"><div class="section-title">记忆召回</div><div class="tags">' + recallLines.map(function (line) {
        return '<span class="tag">' + escapeHtml(line) + '</span>';
      }).join('') + '</div></section>';
    } else {
      html += '<section class="section empty"><div class="section-title">记忆召回</div><div class="section-text">暂无召回条目</div></section>';
    }

    if (!html) {
      html = '<section class="section empty"><div class="section-title">剧情推进</div><div class="section-text">等待推进结果...</div></section>';
    }

    document.getElementById('content').innerHTML = html;
    updateHeight();
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(init, 0);
  }
  document.addEventListener('DOMContentLoaded', init);
  setTimeout(init, 120);
  setTimeout(init, 320);
})();
</script>
</body>
</html>`;

const beautifyScript = {
  id: createUuid(),
  scriptName: '绿帽之家-剧情推进美化',
  findRegex: '/你现在进入《绿帽之家》正文阶段。用户输入内容是[\\s\\S]*$/m',
  replaceString: `====\n\`\`\`html\n${plotBeautifyHtml}\n\`\`\``,
  trimStrings: [],
  placement: [1],
  disabled: false,
  markdownOnly: true,
  promptOnly: false,
  runOnEdit: true,
  substituteRegex: 0,
  minDepth: null,
  maxDepth: 2
};

const cleanupScript = {
  id: createUuid(),
  scriptName: '绿帽之家-剧情推进高楼层隐藏',
  findRegex: '/你现在进入《绿帽之家》正文阶段。用户输入内容是[\\s\\S]*$/m',
  replaceString: '',
  trimStrings: [],
  placement: [1],
  disabled: false,
  markdownOnly: true,
  promptOnly: true,
  runOnEdit: true,
  substituteRegex: 0,
  minDepth: 1,
  maxDepth: null
};

const cleanedScripts = regexScripts.filter(script => !['绿帽之家-剧情推进美化', '绿帽之家-剧情推进高楼层隐藏'].includes(script.scriptName));
const statusIndex = cleanedScripts.findIndex(script => script.scriptName === '状态栏');

if (statusIndex >= 0) {
  cleanedScripts.splice(statusIndex + 1, 0, beautifyScript, cleanupScript);
} else {
  cleanedScripts.push(beautifyScript, cleanupScript);
}

card.data.extensions.regex_scripts = cleanedScripts;
fs.writeFileSync(CARD_PATH, JSON.stringify(card, null, 2) + '\n', 'utf8');

console.log('已为绿帽之家写入剧情推进预设与配套正则。');
console.log('剧情推进预设名称:', preset[0].name);
console.log('当前正则脚本数量:', card.data.extensions.regex_scripts.length);
