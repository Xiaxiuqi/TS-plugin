const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { renderReadableTables, syncReadableTablesToJson, buildEmbeddedTablesFromReadable } = require('./render-embedded-tables');

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`读取文件失败: ${filePath}\n${error.message}`);
  }
}

function writeText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
}

function readJson(filePath) {
  const raw = readText(filePath);
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`JSON 解析失败: ${filePath}\n${error.message}`);
  }
}

function readYaml(filePath) {
  const raw = readText(filePath);
  try {
    return yaml.load(raw);
  } catch (error) {
    throw new Error(`YAML 解析失败: ${filePath}\n${error.message}`);
  }
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function encodeToBase64(jsonObj) {
  const jsonStr = JSON.stringify(jsonObj);
  const utf8Bytes = Buffer.from(jsonStr, 'utf-8');
  return utf8Bytes.toString('base64');
}

function injectTablesIntoHtml(html, tablesJson) {
  if (!tablesJson) {
    return html;
  }

  const templateBase64 = encodeToBase64(tablesJson);
  const pattern = /const EMBEDDED_TEMPLATE_BASE64 = "[^"]*";/;

  if (pattern.test(html)) {
    return html.replace(pattern, `const EMBEDDED_TEMPLATE_BASE64 = "${templateBase64}";`);
  }

  return html;
}

function createRegexReplaceString(html) {
  return '====\n```html\n' + html + '\n```';
}

function updateRegexScriptReplaceString(card, scriptName, replaceString) {
  const roots = [];

  if (card && card.data && card.data.extensions && Array.isArray(card.data.extensions.regex_scripts)) {
    roots.push(card.data.extensions.regex_scripts);
  }
  if (card && card.extensions && Array.isArray(card.extensions.regex_scripts)) {
    roots.push(card.extensions.regex_scripts);
  }

  roots.forEach((scripts) => {
    scripts.forEach((script) => {
      if (script && script.scriptName === scriptName) {
        script.replaceString = replaceString;
      }
    });
  });
}

function injectPresetIntoHtml(html, presetJson) {
  if (!presetJson) {
    return html;
  }

  const presetBase64 = encodeToBase64(presetJson);

  const pattern = /const EMBEDDED_PRESET_BASE64 = "{{PRESET_BASE64}}";/;
  if (pattern.test(html)) {
    return html.replace(pattern, `const EMBEDDED_PRESET_BASE64 = "${presetBase64}";`);
  }

  console.log('  ⚠️ 开场白未提供 {{PRESET_BASE64}} 占位符，跳过剧情推进预设注入');
  return html;
}

function loadPlotPreset(frontendDir) {
  if (!fileExists(frontendDir)) {
    return null;
  }

  const candidateFiles = ['剧情推进.json', 'plot-preset.json', 'preset.json'];

  for (const file of candidateFiles) {
    const filePath = path.join(frontendDir, file);
    if (fileExists(filePath)) {
      return {
        fileName: file,
        data: readJson(filePath)
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

  if (!fileExists(beautifyPath)) {
    throw new Error(`检测到剧情推进预设，但缺少卡专属推进美化HTML: ${beautifyPath}`);
  }

  if (!fileExists(configPath)) {
    throw new Error(`检测到剧情推进预设，但缺少卡专属推进正则配置: ${configPath}`);
  }

  const config = readJson(configPath);

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
    beautifyHtml: readText(beautifyPath),
    config
  };
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function ensureCompleteHtml(content) {
  const hasDoctype = content.trim().toLowerCase().startsWith('<!doctype html');
  const hasHtmlTag = content.includes('<html');
  const hasHtmlEndTag = content.includes('</html>');

  if (hasDoctype && hasHtmlTag && hasHtmlEndTag) {
    return content;
  }

  if (!hasDoctype) {
    console.log('  ⚠️ HTML 缺少 <!DOCTYPE html>，已自动补全');
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AutoCardUpdater</title>
</head>
<body>
${content}
</body>
</html>`;
  }

  return content;
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

function ensureRegexScriptsArray(card) {
  const roots = [];
  if (card && card.data && card.data.extensions) {
    if (!Array.isArray(card.data.extensions.regex_scripts)) {
      card.data.extensions.regex_scripts = [];
    }
    roots.push(card.data.extensions.regex_scripts);
  }
  if (card && card.extensions) {
    if (!Array.isArray(card.extensions.regex_scripts)) {
      card.extensions.regex_scripts = [];
    }
    roots.push(card.extensions.regex_scripts);
  }
  return roots;
}

function addOrUpdateRegexScript(card, scriptName, newScript) {
  const roots = ensureRegexScriptsArray(card);
  let found = false;

  roots.forEach((scripts) => {
    for (let i = 0; i < scripts.length; i++) {
      if (scripts[i] && scripts[i].scriptName === scriptName) {
        scripts[i] = newScript;
        found = true;
        break;
      }
    }
  });

  if (!found) {
    roots.forEach((scripts) => {
      scripts.push(newScript);
    });
    console.log(`  新增正则脚本: ${scriptName}`);
  } else {
    console.log(`  更新正则脚本: ${scriptName}`);
  }
}

function ensureAcuYamlFiles(entriesDir, tablesJson, presetJson) {
  const templateYaml = path.join(entriesDir, '999-ACU-表格模板.yaml');
  const presetYaml = path.join(entriesDir, '999-ACU-剧情推进预设.yaml');

  if (!fileExists(templateYaml) && !fileExists(presetYaml)) {
    return 0;
  }

  let created = 0;

  if (tablesJson) {
    const entry = {
      id: 999800,
      keys: ['__ACU_TEMPLATE_DATA__'],
      secondary_keys: [],
      comment: 'AutoCardUpdater 表格模板（勿删勿改）',
      content: encodeToBase64(tablesJson),
      constant: false,
      selective: false,
      insertion_order: 9998,
      enabled: false,
      position: 'before_char',
      use_regex: false,
      extensions: {
        position: 0,
        exclude_recursion: true,
        display_index: 9998,
        probability: 100,
        useProbability: true,
        depth: 4,
        selectiveLogic: 0,
        prevent_recursion: true,
        delay_until_recursion: false,
        scan_depth: null,
        match_whole_words: null,
        use_group_scoring: false,
        case_sensitive: null,
        automation_id: '',
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
    writeText(templateYaml, yaml.dump(entry, { lineWidth: -1 }));
    created++;
  }

  if (presetJson) {
    const entry = {
      id: 999900,
      keys: ['__ACU_PRESET_DATA__'],
      secondary_keys: [],
      comment: 'AutoCardUpdater 剧情推进预设（勿删勿改）',
      content: encodeToBase64(presetJson),
      constant: false,
      selective: false,
      insertion_order: 9999,
      enabled: false,
      position: 'before_char',
      use_regex: false,
      extensions: {
        position: 0,
        exclude_recursion: true,
        display_index: 9999,
        probability: 100,
        useProbability: true,
        depth: 4,
        selectiveLogic: 0,
        prevent_recursion: true,
        delay_until_recursion: false,
        scan_depth: null,
        match_whole_words: null,
        use_group_scoring: false,
        case_sensitive: null,
        automation_id: '',
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
    writeText(presetYaml, yaml.dump(entry, { lineWidth: -1 }));
    created++;
  }

  if (created > 0) {
    console.log(`  创建ACU YAML文件: ${created}个`);
  }

  return created;
}

function syncExtractedAssets(bundleDir, card) {
  const frontendDir = path.join(bundleDir, 'extracted', 'frontend');

  const openingPath = path.join(frontendDir, 'opening-regex.source.html');
  const statusPath = path.join(frontendDir, 'status-bar.source.html');

  const presetInfo = loadPlotPreset(frontendDir);
  const presetJson = presetInfo ? presetInfo.data : null;
  if (presetInfo) {
    console.log(`  加载剧情推进预设: ${presetInfo.fileName}`);
  }

  let plotRegexAssets = null;
  try {
    plotRegexAssets = loadPlotRegexAssets(frontendDir, Boolean(presetJson));
  } catch (e) {
    console.error(`  ⚠️ ${e.message}`);
  }

  if (plotRegexAssets) {
    console.log(`  加载推进美化HTML: ${plotRegexAssets.beautifyFileName}`);
    console.log(`  加载推进正则配置: ${plotRegexAssets.configFileName}`);
  }

  if (fileExists(openingPath)) {
    const openingHtml = readText(openingPath);
    updateRegexScriptReplaceString(card, '欢迎页面', createRegexReplaceString(openingHtml));
  }

  if (fileExists(statusPath)) {
    const statusHtml = readText(statusPath);
    updateRegexScriptReplaceString(card, '状态栏', createRegexReplaceString(statusHtml));
  }

  if (plotRegexAssets) {
    const beautifyScript = createPlotBeautifyRegex(plotRegexAssets.beautifyHtml, plotRegexAssets.config.beautify);
    addOrUpdateRegexScript(card, plotRegexAssets.config.beautify.scriptName, beautifyScript);

    const cleanupScript = createPlotCleanupRegex(plotRegexAssets.config.cleanup);
    addOrUpdateRegexScript(card, plotRegexAssets.config.cleanup.scriptName, cleanupScript);
  }
}

function normalizeToOsPath(baseDir, relativePath) {
  return path.join(baseDir, ...String(relativePath).split('/'));
}

function setAtPath(target, segments, value) {
  let current = target;

  for (let i = 0; i < segments.length - 1; i += 1) {
    const key = segments[i];
    const nextKey = segments[i + 1];

    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = typeof nextKey === 'number' ? [] : {};
    }

    current = current[key];
  }

  current[segments[segments.length - 1]] = value;
}

function ensureArrayAtPath(target, segments) {
  let current = target;

  for (let i = 0; i < segments.length; i += 1) {
    const key = segments[i];
    const isLeaf = i === segments.length - 1;

    if (isLeaf) {
      if (!Array.isArray(current[key])) {
        current[key] = [];
      }
      return current[key];
    }

    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }

    current = current[key];
  }

  return [];
}

function inferOutputPath(bundleDir, card) {
  const cardName = (card.data && card.data.name) || card.name || '角色卡';
  const safeName = String(cardName).replace(/[\\/:*?"<>|]/g, '-').trim() || '角色卡';
  const projectDir = path.basename(bundleDir) === 'unpacked' ? path.dirname(bundleDir) : null;
  if (projectDir && path.basename(path.dirname(projectDir)) === 'projects') {
    return path.join(projectDir, 'release', `${safeName}-repacked.json`);
  }
  return path.join(process.cwd(), 'output', 'latest', `${safeName}-repacked.json`);
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('manifest.json 格式无效');
  }

  if (!manifest.mappings || typeof manifest.mappings !== 'object') {
    throw new Error('manifest.json 缺少 mappings');
  }

  if (!manifest.targets || typeof manifest.targets !== 'object') {
    throw new Error('manifest.json 缺少 targets');
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('用法: node tools/repack-card.js <解包目录> [输出JSON路径]');
    console.log('示例: node tools/repack-card.js projects/次元欢乐岛/unpacked projects/次元欢乐岛/release/次元欢乐岛-修改版.json');
    console.log('默认输出路径: projects/<角色卡名>/release/<角色卡名>-repacked.json；非标准目录则输出到 output/latest/');
    process.exit(args.length === 0 ? 1 : 0);
  }

  const bundleDir = path.resolve(process.cwd(), args[0]);
  const manifestPath = path.join(bundleDir, 'manifest.json');
  const originalCardPath = path.join(bundleDir, 'original-card.json');

  const manifest = readJson(manifestPath);
  validateManifest(manifest);

  const originalCard = readJson(originalCardPath);

  const frontendDir = path.join(bundleDir, 'extracted', 'frontend');
  const tablesDir = path.join(bundleDir, 'extracted', 'tables');
  const entriesDir = path.join(bundleDir, 'entries');
  const tablesPath = path.join(tablesDir, 'embedded-template.pretty.json');
  const readableDir = path.join(tablesDir, 'readable');

  if (fileExists(path.join(readableDir, '00-目录.md'))) {
    buildEmbeddedTablesFromReadable(readableDir, tablesPath);
    console.log('  从readable MD重建表格JSON');
  }

  const tablesJson = fileExists(tablesPath) ? readJson(tablesPath) : null;
  const presetInfo = loadPlotPreset(frontendDir);
  const presetJson = presetInfo ? presetInfo.data : null;

  const acuCreated = ensureAcuYamlFiles(entriesDir, tablesJson, presetJson);

  if (acuCreated > 0) {
    const acuFiles = [
      '999-ACU-表格模板.yaml',
      '999-ACU-剧情推进预设.yaml'
    ];
    for (const file of acuFiles) {
      const filePath = path.join(entriesDir, file);
      if (fileExists(filePath)) {
        const entry = readYaml(filePath);
        const relativePath = 'entries/' + file;
        manifest.mappings.entries.push({
          index: entry.insertion_order || 0,
          id: entry.id || null,
          comment: entry.comment || '',
          path: relativePath,
          keys: entry.keys || [],
          enabled: entry.enabled ?? false,
          constant: entry.constant ?? false,
          position: entry.position || null,
          summary: ''
        });
      }
    }
  } else {
    const acuFiles = [
      '999-ACU-表格模板.yaml',
      '999-ACU-剧情推进预设.yaml'
    ];
    for (const file of acuFiles) {
      const filePath = path.join(entriesDir, file);
      if (fileExists(filePath) && !manifest.mappings.entries.some(m => m.path === 'entries/' + file)) {
        const entry = readYaml(filePath);
        const relativePath = 'entries/' + file;
        manifest.mappings.entries.push({
          index: entry.insertion_order || 0,
          id: entry.id || null,
          comment: entry.comment || '',
          path: relativePath,
          keys: entry.keys || [],
          enabled: entry.enabled ?? false,
          constant: entry.constant ?? false,
          position: entry.position || null,
          summary: ''
        });
      }
    }
  }

  const firstMesMapping = manifest.mappings.first_mes;
  if (firstMesMapping && firstMesMapping.path) {
    const firstMes = readText(normalizeToOsPath(bundleDir, firstMesMapping.path));
    (manifest.targets.first_mes || []).forEach((segments) => {
      setAtPath(originalCard, segments, firstMes);
    });
  }

  const alternateGreetings = (manifest.mappings.alternate_greetings || []).map((item) => {
    return readText(normalizeToOsPath(bundleDir, item.path));
  });

  (manifest.targets.alternate_greetings || []).forEach((segments) => {
    setAtPath(originalCard, segments, alternateGreetings);
  });

  const rebuiltEntries = (manifest.mappings.entries || []).map((item) => {
    const entryPath = normalizeToOsPath(bundleDir, item.path);
    const entry = readYaml(entryPath);

    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`条目文件必须解析为对象: ${item.path}`);
    }

    return entry;
  });

  (manifest.targets.character_book_entries || []).forEach((segments) => {
    const arrayRef = ensureArrayAtPath(originalCard, segments);
    arrayRef.length = 0;
    rebuiltEntries.forEach((entry) => arrayRef.push(entry));
  });

  const rebuiltRegexScripts = (manifest.mappings.regex_scripts || []).map((item) => {
    const scriptPath = normalizeToOsPath(bundleDir, item.path);
    const script = readJson(scriptPath);

    if (!script || typeof script !== 'object' || Array.isArray(script)) {
      throw new Error(`正则脚本文件必须解析为对象: ${item.path}`);
    }

    if (item.files) {
      const files = item.files;
      if (files.find) {
        const findPath = normalizeToOsPath(bundleDir, files.find);
        if (fileExists(findPath)) {
          script.findRegex = readText(findPath);
        }
      }
      if (files.replace) {
        const replacePath = normalizeToOsPath(bundleDir, files.replace);
        if (fileExists(replacePath)) {
          script.replaceString = createRegexReplaceString(readText(replacePath));
        }
      }
    }

    return script;
  });

  (manifest.targets.regex_scripts || []).forEach((segments) => {
    const arrayRef = ensureArrayAtPath(originalCard, segments);
    arrayRef.length = 0;
    rebuiltRegexScripts.forEach((script) => arrayRef.push(script));
  });

  const rebuiltTavernHelperScripts = (manifest.mappings.tavern_helper_scripts || []).map((item) => {
    const scriptPath = normalizeToOsPath(bundleDir, item.path);
    const script = readJson(scriptPath);

    if (!script || typeof script !== 'object' || Array.isArray(script)) {
      throw new Error(`酒馆助手脚本文件必须解析为对象: ${item.path}`);
    }

    return script;
  });

  (manifest.targets.tavern_helper_scripts || []).forEach((segments) => {
    const arrayRef = ensureArrayAtPath(originalCard, segments);
    arrayRef.length = 0;
    rebuiltTavernHelperScripts.forEach((script) => arrayRef.push(script));
  });

  const tavernHelperVariablesMapping = manifest.mappings.tavern_helper_variables;
  if (tavernHelperVariablesMapping && tavernHelperVariablesMapping.path) {
    const variables = readJson(normalizeToOsPath(bundleDir, tavernHelperVariablesMapping.path));
    if (!variables || typeof variables !== 'object' || Array.isArray(variables)) {
      throw new Error(`酒馆助手变量文件必须解析为对象: ${tavernHelperVariablesMapping.path}`);
    }
    (manifest.targets.tavern_helper_variables || []).forEach((segments) => {
      setAtPath(originalCard, segments, variables);
    });
  }

  syncExtractedAssets(bundleDir, originalCard);

  const outputPath = args[1]
    ? path.resolve(process.cwd(), args[1])
    : inferOutputPath(bundleDir, originalCard);

  writeText(outputPath, JSON.stringify(originalCard, null, 2));

  console.log(`已回包角色卡: ${outputPath}`);
  console.log(`覆盖字段: first_mes / alternate_greetings / character_book.entries / extensions.regex_scripts / extensions.tavern_helper`);
  console.log(`世界书条目数: ${rebuiltEntries.length}`);
  console.log(`正则脚本数: ${rebuiltRegexScripts.length}`);
  console.log(`酒馆助手脚本数: ${rebuiltTavernHelperScripts.length}`);
  console.log(`候选开场白数: ${alternateGreetings.length}`);
  console.log('其余未拆出的字段均直接沿用 original-card.json。');
}

main();
