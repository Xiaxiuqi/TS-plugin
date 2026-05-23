const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`读取文件失败: ${filePath}`);
    throw error;
  }
}

function readJsonFile(filePath) {
  const content = readFile(filePath);
  try {
    return JSON.parse(content);
  } catch (error) {
    console.error(`JSON解析失败: ${filePath}`);
    throw error;
  }
}

function createEntryTemplate() {
  return {
    keys: [],
    secondary_keys: [],
    constant: true,
    selective: true,
    insertion_order: 100,
    enabled: true,
    position: "before_char",
    use_regex: true,
    extensions: {
      position: 0,
      exclude_recursion: false,
      display_index: 0,
      probability: 100,
      useProbability: true,
      depth: 4,
      selectiveLogic: 0,
      outlet_name: "",
      group: "",
      group_override: false,
      group_weight: 100,
      prevent_recursion: true,
      delay_until_recursion: false,
      scan_depth: null,
      match_whole_words: null,
      use_group_scoring: false,
      case_sensitive: null,
      automation_id: "",
      role: 0,
      vectorized: false,
      sticky: 0,
      cooldown: 0,
      delay: 0,
      match_persona_description: false,
      match_character_description: false,
      match_character_personality: false,
      match_character_depth_prompt: false,
      match_scenario: false,
      match_creator_notes: false,
      triggers: [],
      ignore_budget: false
    }
  };
}

function convertPosition(positionStr) {
  const positionMap = {
    'before_char': 0,
    'after_char': 1,
    'before_em': 5,
    'after_em': 6,
    'before_an': 2,
    'after_an': 3,
    'at_depth': 4
  };
  return positionMap[positionStr] ?? 0;
}

function loadEntriesFromDir(entriesDir) {
  const entries = [];
  
  if (!fs.existsSync(entriesDir)) {
    console.log(`条目目录不存在: ${entriesDir}`);
    return entries;
  }
  
  const files = fs.readdirSync(entriesDir)
    .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
    .sort();
  
  for (const file of files) {
    const filePath = path.join(entriesDir, file);
    const content = readFile(filePath);
    const entryData = yaml.load(content);
    
    const entry = createEntryTemplate();
    entry.id = entries.length;
    entry.comment = entryData.comment || file;
    entry.content = entryData.content || "";
    entry.enabled = entryData.enabled ?? true;
    entry.position = entryData.position || "before_char";
    entry.insertion_order = entryData.insertion_order ?? 100;
    
    if (entryData.constant === false) {
      entry.constant = false;
    }
    
    if (entryData.keys && Array.isArray(entryData.keys)) {
      entry.keys = entryData.keys;
    }
    
    if (entryData.secondary_keys && Array.isArray(entryData.secondary_keys)) {
      entry.secondary_keys = entryData.secondary_keys;
    }
    
    entry.extensions.position = convertPosition(entry.position);
    entry.extensions.display_index = entries.length;
    entry.extensions.depth = entryData.depth ?? 4;
    entry.extensions.role = entryData.role ?? 0;
    
    if (entryData.prevent_recursion === false) {
      entry.extensions.prevent_recursion = false;
    }
    
    if (entryData.exclude_recursion !== undefined) {
      entry.extensions.exclude_recursion = entryData.exclude_recursion;
    }
    
    entries.push(entry);
    console.log(`  加载条目: ${entryData.comment || file}`);
  }
  
  return entries;
}

function encodeToBase64(jsonObj) {
  const jsonStr = JSON.stringify(jsonObj);
  const utf8Bytes = Buffer.from(jsonStr, 'utf-8');
  return utf8Bytes.toString('base64');
}

function injectTablesIntoOpening(openingHtml, tablesJson) {
  const templateBase64 = encodeToBase64(tablesJson);
  
  // 只替换变量赋值语句中的占位符，保留函数调用中的占位符参数
  // 匹配: const EMBEDDED_TEMPLATE_BASE64 = "{{TEMPLATE_BASE64}}";
  const pattern = /const EMBEDDED_TEMPLATE_BASE64 = "{{TEMPLATE_BASE64}}";/;
  if (pattern.test(openingHtml)) {
    return openingHtml.replace(pattern, `const EMBEDDED_TEMPLATE_BASE64 = "${templateBase64}";`);
  }
  
  // 如果没有占位符，则注入新的 script 标签（向后兼容）
  const injectScript = `<script>
const TEMPLATE_BASE64 = "${templateBase64}";

function decodeBase64(base64Str) {
  try {
    const binaryStr = atob(base64Str);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const jsonStr = new TextDecoder('utf-8').decode(bytes);
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Base64解码失败:', e);
    return null;
  }
}

const TEMPLATE = decodeBase64(TEMPLATE_BASE64);
console.log('表格模板已加载:', TEMPLATE);
</script>`;
  
  if (openingHtml.includes('</body>')) {
    return openingHtml.replace('</body>', injectScript + '\n</body>');
  } else {
    return openingHtml + '\n' + injectScript;
  }
}

function injectPresetIntoOpening(openingHtml, presetJson) {
  const presetBase64 = encodeToBase64(presetJson);

  // 只替换变量赋值语句中的占位符，保留函数调用中的占位符参数
  // 匹配: const EMBEDDED_PRESET_BASE64 = "{{PRESET_BASE64}}";
  const pattern = /const EMBEDDED_PRESET_BASE64 = "{{PRESET_BASE64}}";/;
  if (pattern.test(openingHtml)) {
    return openingHtml.replace(pattern, `const EMBEDDED_PRESET_BASE64 = "${presetBase64}";`);
  }

  console.log('  ⚠️ 开场白未提供 {{PRESET_BASE64}} 占位符，跳过剧情推进预设注入');
  return openingHtml;
}

function injectAssetsIntoOpening(openingHtml, tablesJson, presetJson) {
  let finalHtml = openingHtml;

  if (tablesJson) {
    finalHtml = injectTablesIntoOpening(finalHtml, tablesJson);
  }

  if (presetJson) {
    finalHtml = injectPresetIntoOpening(finalHtml, presetJson);
  }

  return finalHtml;
}

function loadPlotPreset(frontendDir) {
  if (!fs.existsSync(frontendDir)) {
    return null;
  }

  const candidateFiles = ['剧情推进.json', 'plot-preset.json', 'preset.json'];

  for (const file of candidateFiles) {
    const filePath = path.join(frontendDir, file);
    if (fs.existsSync(filePath)) {
      return {
        fileName: file,
        data: readJsonFile(filePath)
      };
    }
  }

  return null;
}

function loadPlotRegexAssets(frontendDir, hasPlotPreset) {
  if (!hasPlotPreset) {
    return null;
  }

  const beautifyFileName = '推进美化.html';
  const configFileName = '推进正则配置.json';
  const beautifyPath = path.join(frontendDir, beautifyFileName);
  const configPath = path.join(frontendDir, configFileName);

  if (!fs.existsSync(beautifyPath)) {
    throw new Error(`检测到剧情推进预设，但缺少卡专属推进美化HTML: ${beautifyPath}`);
  }

  if (!fs.existsSync(configPath)) {
    throw new Error(`检测到剧情推进预设，但缺少卡专属推进正则配置: ${configPath}`);
  }

  const config = readJsonFile(configPath);

  if (!config || typeof config !== 'object') {
    throw new Error(`推进正则配置格式错误: ${configPath}`);
  }

  if (!config.beautify || !config.cleanup) {
    throw new Error(`推进正则配置必须同时包含 beautify 和 cleanup 段: ${configPath}`);
  }

  if (!config.beautify.scriptName || !config.beautify.findRegex) {
    throw new Error(`推进正则 beautify 段缺少 scriptName 或 findRegex: ${configPath}`);
  }

  if (!config.cleanup.scriptName || !config.cleanup.findRegex) {
    throw new Error(`推进正则 cleanup 段缺少 scriptName 或 findRegex: ${configPath}`);
  }

  return {
    beautifyFileName,
    configFileName,
    beautifyHtml: readFile(beautifyPath),
    config
  };
}

// 检查并补全开场白的 <start> 标签
function ensureStartTags(content) {
  const hasStartTag = content.includes('<start>');
  const hasEndTag = content.includes('</start>');
  
  if (!hasStartTag && !hasEndTag) {
    console.log('  ⚠️ 开场白缺少 <start> 标签，已自动补全');
    return '<start>\n' + content + '\n</start>';
  } else if (!hasStartTag) {
    console.log('  ⚠️ 开场白缺少 <start> 开始标签，已自动补全');
    return '<start>\n' + content;
  } else if (!hasEndTag) {
    console.log('  ⚠️ 开场白缺少 </start> 结束标签，已自动补全');
    return content + '\n</start>';
  }
  return content;
}

// 检查并补全状态栏的完整HTML格式
function ensureCompleteHtml(content) {
  const hasDoctype = content.trim().toLowerCase().startsWith('<!doctype html');
  const hasHtmlTag = content.includes('<html');
  const hasHtmlEndTag = content.includes('</html>');
  
  // 如果已经是完整的HTML文档，直接返回
  if (hasDoctype && hasHtmlTag && hasHtmlEndTag) {
    return content;
  }
  
  // 如果缺少完整HTML结构，自动补全
  if (!hasDoctype) {
    console.log('  ⚠️ 状态栏缺少 <!DOCTYPE html>，已自动补全');
    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>状态栏</title>
</head>
<body>
${content}
</body>
</html>`;
    return htmlContent;
  }
  
  return content;
}

function createOpeningRegex(openingHtml, tablesJson, presetJson) {
  // 检查并补全 <start> 标签
  let finalHtml = ensureStartTags(openingHtml);
  finalHtml = injectAssetsIntoOpening(finalHtml, tablesJson, presetJson);
  
  // 使用 $1 占位符来引用正则匹配的第一个捕获组（即 <start> 标签内的内容）
  // 这样开场白内容会被插入到 HTML 中显示
  const replaceString = "====\n```html\n" + finalHtml + "\n```";
  
  return {
    id: generateUUID(),
    scriptName: "欢迎页面",
    findRegex: "/<start>([\\s\\S]*?)<\\/start>/gsi",
    replaceString: replaceString,
    trimStrings: [],
    placement: [2],
    disabled: false,
    markdownOnly: true,
    promptOnly: false,
    runOnEdit: true,
    substituteRegex: 1,  // 启用正则替换，使用 $1 引用捕获组
    minDepth: null,
    maxDepth: 0
  };
}

// 从 opening-regex.html 创建正则（完整的HTML文档，不需要检查 <start> 标签）
function createOpeningRegexFromHtml(openingHtml, tablesJson, presetJson) {
  let finalHtml = openingHtml;
  finalHtml = injectAssetsIntoOpening(finalHtml, tablesJson, presetJson);
  
  // opening-regex.html 是完整的HTML文档，直接使用
  const replaceString = "====\n```html\n" + finalHtml + "\n```";
  
  return {
    id: generateUUID(),
    scriptName: "欢迎页面",
    findRegex: "/<start>([\\s\\S]*?)<\\/start>/gsi",
    replaceString: replaceString,
    trimStrings: [],
    placement: [2],
    disabled: false,
    markdownOnly: true,
    promptOnly: false,
    runOnEdit: true,
    substituteRegex: 1,  // 启用正则替换，使用 $1 引用捕获组
    minDepth: null,
    maxDepth: 0
  };
}

function createRegexScriptFromConfig(scriptConfig, replaceString) {
  return {
    id: generateUUID(),
    scriptName: scriptConfig.scriptName,
    findRegex: scriptConfig.findRegex,
    replaceString,
    trimStrings: Array.isArray(scriptConfig.trimStrings) ? scriptConfig.trimStrings : [],
    placement: Array.isArray(scriptConfig.placement) && scriptConfig.placement.length > 0 ? scriptConfig.placement : [1],
    disabled: scriptConfig.disabled ?? false,
    markdownOnly: scriptConfig.markdownOnly ?? true,
    promptOnly: scriptConfig.promptOnly ?? false,
    runOnEdit: scriptConfig.runOnEdit ?? true,
    substituteRegex: scriptConfig.substituteRegex ?? 0,
    minDepth: scriptConfig.minDepth ?? null,
    maxDepth: scriptConfig.maxDepth ?? null
  };
}

function createPlotBeautifyRegex(plotBeautifyHtml, scriptConfig) {
  const finalHtml = ensureCompleteHtml(plotBeautifyHtml);
  const replaceString = "====\n```html\n" + finalHtml + "\n```";
  return createRegexScriptFromConfig(scriptConfig, replaceString);
}

function createPlotCleanupRegex(scriptConfig) {
  return createRegexScriptFromConfig(scriptConfig, scriptConfig.replaceString ?? "");
}

function createStatusBarRegex(statusBarHtml) {
  // 检查并补全完整HTML格式
  const finalHtml = ensureCompleteHtml(statusBarHtml);
  
  const replaceString = "====\n```html\n" + finalHtml + "\n```";
  
  return {
    id: generateUUID(),
    scriptName: "状态栏",
    findRegex: "/$/g",
    replaceString: replaceString,
    trimStrings: [],
    placement: [2],
    disabled: false,
    markdownOnly: true,
    promptOnly: false,
    runOnEdit: true,
    substituteRegex: 0,
    minDepth: null,
    maxDepth: 0
  };
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function loadTableTemplates(tablesDir) {
  if (!fs.existsSync(tablesDir)) {
    return null;
  }
  
  const files = fs.readdirSync(tablesDir)
    .filter(f => f.endsWith('.json'));
  
  if (files.length === 0) {
    return null;
  }
  
  const mergedTables = {};
  
  for (const file of files) {
    const filePath = path.join(tablesDir, file);
    const content = readFile(filePath);
    try {
      const tableData = JSON.parse(content);
      
      if (tableData.mate && tableData.mate.type === 'chatSheets') {
        Object.keys(tableData).forEach(key => {
          if (key !== 'mate') {
            mergedTables[key] = tableData[key];
          }
        });
        mergedTables.mate = tableData.mate;
        console.log(`  加载表格(奶龙格式): ${file}`);
      } else if (typeof tableData === 'object' && !Array.isArray(tableData)) {
        Object.keys(tableData).forEach(key => {
          if (key !== 'mate') {
            mergedTables[key] = tableData[key];
          }
        });
        if (tableData.mate) {
          mergedTables.mate = tableData.mate;
        }
        console.log(`  加载表格(对象格式): ${file}`);
      } else {
        console.log(`  跳过不支持的表格格式: ${file}`);
      }
    } catch (e) {
      console.log(`  表格解析失败: ${file} - ${e.message}`);
    }
  }
  
  const tableCount = Object.keys(mergedTables).filter(k => k !== 'mate').length;
  if (tableCount === 0) {
    return null;
  }
  
  console.log(`  共加载 ${tableCount} 个表格`);
  
  const hasJournal = Object.keys(mergedTables).some(k => 
    mergedTables[k].name === '纪要表' || mergedTables[k].uid?.includes('3NoMc1wI')
  );
  const hasCharacters = Object.keys(mergedTables).some(k => 
    mergedTables[k].name === '重要角色表' || mergedTables[k].uid?.includes('NcBlYRH5')
  );
  
  if (!hasJournal) {
    console.log('  ⚠️ 警告: 缺少纪要表，将使用默认模板');
  }
  if (!hasCharacters) {
    console.log('  ⚠️ 警告: 缺少重要角色表，将使用默认模板');
  }
  
  return mergedTables;
}

function buildCharacterCard(planPath) {
  const planDir = path.dirname(planPath);
  const entriesDir = path.join(planDir, 'entries');
  const tablesDir = path.join(planDir, 'tables');
  const frontendDir = path.join(planDir, 'frontend');
  
  console.log('\n正在构建角色卡...\n');
  
  console.log('1. 加载世界书条目...');
  const entries = loadEntriesFromDir(entriesDir);
  console.log(`  共加载 ${entries.length} 个条目\n`);
  
  console.log('2. 加载表格模板...');
  const tablesJson = loadTableTemplates(tablesDir);
  if (tablesJson) {
    const tableCount = Object.keys(tablesJson).filter(k => k !== 'mate').length;
    console.log(`  表格模板加载完成\n`);
  } else {
    console.log('  未找到表格模板\n');
  }

  console.log('3. 加载剧情推进预设...');
  const presetInfo = loadPlotPreset(frontendDir);
  const presetJson = presetInfo ? presetInfo.data : null;
  const plotRegexAssets = loadPlotRegexAssets(frontendDir, Boolean(presetJson));
  if (presetInfo) {
    console.log(`  加载剧情推进预设: ${presetInfo.fileName}`);
    console.log(`  加载推进美化HTML: ${plotRegexAssets.beautifyFileName}`);
    console.log(`  加载推进正则配置: ${plotRegexAssets.configFileName}\n`);
  } else {
    console.log('  未找到剧情推进预设（将仅注入表格模板）\n');
  }
  
  console.log('4. 加载前端组件...');
  const regexScripts = [];
  
  // 优先使用 opening-regex.html（完整的美化HTML），否则使用 opening.html
  const openingRegexPath = path.join(frontendDir, 'opening-regex.html');
  const openingPath = path.join(frontendDir, 'opening.html');
  
  if (fs.existsSync(openingRegexPath)) {
    // opening-regex.html 是完整的HTML文档，不需要检查 <start> 标签
    const openingHtml = readFile(openingRegexPath);
    regexScripts.push(createOpeningRegexFromHtml(openingHtml, tablesJson, presetJson));
    console.log(`  加载开场白美化正则HTML（opening-regex.html，${presetJson ? '已注入表格模板+剧情推进预设' : '已注入表格模板'}）`);
  } else if (fs.existsSync(openingPath)) {
    // opening.html 是纯文本，需要检查 <start> 标签
    const openingHtml = readFile(openingPath);
    regexScripts.push(createOpeningRegex(openingHtml, tablesJson, presetJson));
    console.log(`  加载开场白（${presetJson ? '已注入表格模板+剧情推进预设' : '已注入表格模板'}）`);
  }
  
  let statusFiles = [];
  if (fs.existsSync(frontendDir)) {
    statusFiles = fs.readdirSync(frontendDir)
      .filter(f => f.startsWith('status-bar') && f.endsWith('.html'))
      .sort();
  }
  
  for (const file of statusFiles) {
    const filePath = path.join(frontendDir, file);
    const statusBarHtml = readFile(filePath);
    regexScripts.push(createStatusBarRegex(statusBarHtml));
    console.log(`  加载状态栏: ${file}`);
  }

  if (plotRegexAssets) {
    regexScripts.push(createPlotBeautifyRegex(plotRegexAssets.beautifyHtml, plotRegexAssets.config.beautify));
    console.log(`  加载剧情推进美化正则: ${plotRegexAssets.config.beautify.scriptName}`);

    regexScripts.push(createPlotCleanupRegex(plotRegexAssets.config.cleanup));
    console.log(`  加载剧情推进高楼层隐藏正则: ${plotRegexAssets.config.cleanup.scriptName}`);
  }
  console.log('');
  
  let planData = {};
  if (fs.existsSync(planPath)) {
    const planContent = readFile(planPath);
    try {
      planData = yaml.load(planContent);
    } catch (e) {
      console.error('\n❌ 错误: 计划文件解析失败！');
      console.error(`  文件: ${planPath}`);
      console.error(`  错误信息: ${e.message}`);
      console.error('\n请检查计划文件的YAML格式后重试。');
      process.exit(1);
    }
  } else {
    console.error('\n❌ 错误: 计划文件不存在！');
    console.error(`  期望路径: ${planPath}`);
    console.error('\n请确保计划文件存在后重试。');
    process.exit(1);
  }
  
  const now = new Date();
  const createDate = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} @${now.getHours()}h ${now.getMinutes()}m ${now.getSeconds()}s ${now.getMilliseconds()}ms`;
  
  const cardName = planData.name || planData['角色名称'] || '角色卡';
  
  const card = {
    name: cardName,
    description: planData.description || "",
    personality: planData.personality || "",
    scenario: planData.scenario || "",
    first_mes: planData.first_mes || "<start>\n简要描述你的角色，让我们开始冒险吧\n</start>",
    mes_example: planData.mes_example || "",
    creatorcomment: "",
    avatar: "none",
    talkativeness: planData.extensions?.talkativeness || "0.5",
    fav: planData.extensions?.fav || false,
    tags: [],
    spec: "chara_card_v3",
    spec_version: "3.0",
    data: {
      name: cardName,
      description: planData.description || "",
      personality: planData.personality || "",
      scenario: planData.scenario || "",
      first_mes: planData.first_mes || "<start>\n简要描述你的角色，让我们开始冒险吧\n</start>",
      mes_example: planData.mes_example || "",
      creator_notes: planData.creator_notes || "",
      system_prompt: planData.system_prompt || "",
      post_history_instructions: planData.post_history_instructions || "",
      tags: [],
      creator: planData.creator || "",
      character_version: planData.character_version || "1.0",
      alternate_greetings: [],
      extensions: {
        talkativeness: planData.extensions?.talkativeness || "0.5",
        fav: planData.extensions?.fav || false,
        world: planData.extensions?.world || cardName,
        depth_prompt: {
          prompt: "",
          depth: 4,
          role: "system"
        },
        tavern_helper: {
          scripts: [],
          variables: {}
        },
        regex_scripts: regexScripts
      },
      group_only_greetings: [],
      character_book: {
        entries: entries,
        name: cardName
      }
    },
    create_date: createDate
  };
  
  return { card, cardName, hasPreset: Boolean(presetJson) };
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('用法: node build-card.js <计划文件路径>');
    console.error('示例: node tools/build-card.js projects/落霞宗遗址/current-plan.yaml');
    console.error('输出: projects/落霞宗遗址/release/落霞宗遗址.json');
    process.exit(1);
  }
  
  const planPath = args[0];
  
  try {
    const { card, cardName, hasPreset } = buildCharacterCard(planPath);
    
    const outputDir = path.join(path.dirname(planPath), 'release');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, `${cardName}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(card, null, 2), 'utf-8');
    
    console.log(`✓ 角色卡已成功生成: ${outputPath}\n`);
    console.log('统计信息:');
    console.log(`  - 世界书条目: ${card.data.character_book.entries.length} 个`);
    console.log(`  - 正则脚本: ${card.data.extensions.regex_scripts.length} 个`);
    
    const tableCount = card.data.extensions.regex_scripts.filter(s =>
      s.scriptName === "欢迎页面"
    ).length > 0 ? "已注入开场白" : "无";
    console.log(`  - 表格模板: ${tableCount}`);
    console.log(`  - 剧情推进预设: ${hasPreset ? '已注入' : '无'}`);
    console.log(`  - 剧情推进配套正则: ${card.data.extensions.regex_scripts.filter(s => s.scriptName !== "欢迎页面" && s.scriptName !== "状态栏").length} 个`);
    
    const blueEntries = card.data.character_book.entries.filter(e =>
      e.constant === true && e.extensions.prevent_recursion === true
    ).length;
    const greenEntries = card.data.character_book.entries.filter(e => 
      e.constant === false
    ).length;
    console.log(`  - 蓝灯条目: ${blueEntries} 个`);
    console.log(`  - 绿灯条目: ${greenEntries} 个`);
  } catch (error) {
    console.error('构建失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();