#!/usr/bin/env node
/**
 * 酒馆助手脚本 ↔ 纯 JS 双向转换工具
 *
 * 用法：
 *   node scripts/convert.js <input> [选项]
 *
 * 输入文件扩展名决定转换方向：
 *   *.json  → 解包 content 字段，输出为 .js 源码
 *   *.js    → 嵌入到 JSON 模板的 content 字段，输出为酒馆助手脚本格式
 *
 * 选项：
 *   --out <path>          指定输出文件或目录（缺省写入 projects/聊天记录导出工具/latest/）
 *   --meta <ref.json>     JS→JSON 时复用此 JSON 的 metadata（id/name/info/button/data/...）
 *   --no-overwrite        若输出文件已存在则报错而非覆盖
 *   -h, --help            打印帮助
 *
 * 例：
 *   node scripts/convert.js "projects/聊天记录导出工具/latest/酒馆助手脚本-聊天记录导出 v6.0.2.json"
 *   node scripts/convert.js "projects/聊天记录导出工具/latest/聊天记录导出工具 v6.0.2.js" --meta "projects/聊天记录导出工具/latest/酒馆助手脚本-聊天记录导出 v6.0.2.json"
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PROJECTS_ROOT = path.join(PROJECT_ROOT, 'projects');
const SCRIPT_NAME_DEFAULT = '聊天记录导出工具';
const LATEST_DIR = path.join(PROJECTS_ROOT, SCRIPT_NAME_DEFAULT, 'latest');
const ARCHIVE_DIR = path.join(PROJECTS_ROOT, SCRIPT_NAME_DEFAULT, 'archive');
const VERSIONS_JSON_DIR = LATEST_DIR;
const VERSIONS_JS_DIR = LATEST_DIR;

// ---------- 工具函数 ----------

/** 解析命令行参数为 { positional: [], options: {} } */
function parseArgs(argv) {
    const positional = [];
    const options = {};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '-h' || a === '--help') {
            options.help = true;
        } else if (a === '--no-overwrite') {
            options.noOverwrite = true;
        } else if (a === '--out') {
            options.out = argv[++i];
        } else if (a === '--meta') {
            options.meta = argv[++i];
        } else if (a.startsWith('--')) {
            throw new Error(`未知选项：${a}`);
        } else {
            positional.push(a);
        }
    }
    return { positional, options };
}

function printHelp() {
    const help = [
        '酒馆助手脚本 ↔ 纯 JS 双向转换工具',
        '',
        '用法：',
        '  node scripts/convert.js <input> [选项]',
        '',
        '选项：',
        '  --out <path>          指定输出文件或目录',
        '  --meta <ref.json>     JS→JSON 时复用此 JSON 的 metadata',
        '  --no-overwrite        若输出文件已存在则报错而非覆盖',
        '  -h, --help            打印此帮助',
        '',
        '示例：',
        '  node scripts/convert.js "projects/聊天记录导出工具/latest/酒馆助手脚本-聊天记录导出 v6.0.2.json"',
        '  node scripts/convert.js "projects/聊天记录导出工具/latest/聊天记录导出工具 v6.0.2.js"',
        '  node scripts/convert.js "my.js" --meta "projects/聊天记录导出工具/latest/酒馆助手脚本-聊天记录导出 v6.0.2.json"',
    ].join('\n');
    console.log(help);
}

/** 从 "聊天记录导出工具 v6.0.js" 或 "酒馆助手脚本-聊天记录导出 v6.0.json" 中抽出 "v6.0" */
function extractVersionTag(filename) {
    const m = path.basename(filename).match(/v\d+(?:\.\d+)+/);
    return m ? m[0] : null;
}

/** 在 projects/<脚本名>/latest 与 archive 下按版本号查找匹配的旧 JSON 文件，找不到返回 null */
function findMatchingJsonByVersion(versionTag) {
    if (!versionTag) return null;
    const candidates = [];
    if (fs.existsSync(LATEST_DIR)) {
        for (const f of fs.readdirSync(LATEST_DIR)) {
            if (f.endsWith('.json')) candidates.push(path.join(LATEST_DIR, f));
        }
    }
    if (fs.existsSync(ARCHIVE_DIR)) {
        for (const v of fs.readdirSync(ARCHIVE_DIR)) {
            const dir = path.join(ARCHIVE_DIR, v);
            if (!fs.statSync(dir).isDirectory()) continue;
            for (const f of fs.readdirSync(dir)) {
                if (f.endsWith('.json')) candidates.push(path.join(dir, f));
            }
        }
    }
    const exact = candidates.find((p) => extractVersionTag(path.basename(p)) === versionTag);
    return exact || null;
}

/** 确保目录存在 */
function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

/** 读取 JSON 文件，失败时给出清晰错误 */
function readJsonFile(file) {
    let raw;
    try {
        raw = fs.readFileSync(file, 'utf8');
    } catch (e) {
        throw new Error(`读取文件失败 (${file})：${e.message}`);
    }
    try {
        return JSON.parse(raw);
    } catch (e) {
        throw new Error(`输入 JSON 格式不合法 (${file})：${e.message}`);
    }
}

/**
 * 解析 --out：可能是文件路径，也可能是目录。
 * 四态判定：
 *   1. 已存在且是文件 → 按文件路径处理
 *   2. 已存在且是目录 → 按目录处理，拼接默认文件名
 *   3. 不存在但以斜杠结尾 → 按目录处理（创建后拼默认文件名）
 *   4. 不存在且无尾斜杠：扩展名等于期望扩展名 → 文件；否则按目录处理（创建后拼默认文件名）
 *
 * expectedExt 由调用方传入（'.js' 或 '.json'），表示当前转换方向的目标文件扩展名。
 */
function resolveOutputPath(outArg, defaultDir, defaultBasename, expectedExt) {
    if (!outArg) {
        return path.join(defaultDir, defaultBasename);
    }
    const abs = path.resolve(outArg);

    if (fs.existsSync(abs)) {
        const st = fs.statSync(abs);
        if (st.isFile()) return abs;
        if (st.isDirectory()) return path.join(abs, defaultBasename);
        throw new Error(`--out 指向的对象既非文件也非目录：${abs}`);
    }

    if (/[\\/]$/.test(outArg)) {
        ensureDir(abs);
        return path.join(abs, defaultBasename);
    }

    const ext = path.extname(outArg).toLowerCase();
    if (ext === expectedExt) {
        return abs;
    }
    // 无扩展名或扩展名不匹配 → 视为目录
    ensureDir(abs);
    return path.join(abs, defaultBasename);
}

function writeOutput(outputPath, content, { noOverwrite }) {
    if (fs.existsSync(outputPath)) {
        if (noOverwrite) {
            throw new Error(`输出文件已存在 (${outputPath})，使用 --no-overwrite 时不会覆盖`);
        }
        console.log(`[覆盖] ${outputPath}`);
    }
    ensureDir(path.dirname(outputPath));
    fs.writeFileSync(outputPath, content, 'utf8');
}

// ---------- 转换核心 ----------

/** JSON → JS：取 content 字段写出为 .js */
function convertJsonToJs(inputPath, options) {
    const obj = readJsonFile(inputPath);
    if (typeof obj.content !== 'string') {
        throw new Error(`输入 JSON 缺少字符串型 content 字段 (${inputPath})`);
    }

    const baseName = path.basename(inputPath, path.extname(inputPath));
    // "酒馆助手脚本-聊天记录导出 v6.0" → "聊天记录导出工具 v6.0"
    const versionTag = extractVersionTag(baseName);
    const defaultBase = versionTag
        ? `聊天记录导出工具 ${versionTag}.js`
        : `${baseName}.js`;

    const outputPath = resolveOutputPath(options.out, VERSIONS_JS_DIR, defaultBase, '.js');
    writeOutput(outputPath, obj.content, options);

    console.log(`[完成] JSON → JS`);
    console.log(`  输入: ${inputPath}`);
    console.log(`  输出: ${outputPath}`);
    console.log(`  字节: ${Buffer.byteLength(obj.content, 'utf8')}`);
    return outputPath;
}

/** 默认 metadata 模板 */
function buildDefaultMeta(jsBaseName) {
    return {
        type: 'script',
        enabled: true,
        name: jsBaseName,
        id: crypto.randomUUID(),
        content: '',
        info: '',
        button: { enabled: false, buttons: [] },
        data: {},
    };
}

/** JS → JSON：将 .js 文本嵌入到 JSON 模板的 content 字段 */
function convertJsToJson(inputPath, options) {
    let jsContent;
    try {
        jsContent = fs.readFileSync(inputPath, 'utf8');
    } catch (e) {
        throw new Error(`读取文件失败 (${inputPath})：${e.message}`);
    }

    const baseName = path.basename(inputPath, path.extname(inputPath));
    const versionTag = extractVersionTag(baseName);

    // 决定 metadata 来源
    let metaObj;
    let metaSource = '';
    if (options.meta) {
        const metaPath = path.resolve(options.meta);
        if (!fs.existsSync(metaPath)) {
            throw new Error(`--meta 指定的文件不存在：${metaPath}`);
        }
        metaObj = readJsonFile(metaPath);
        metaSource = `--meta (${metaPath})`;
    } else {
        const auto = findMatchingJsonByVersion(versionTag);
        if (auto) {
            metaObj = readJsonFile(auto);
            metaSource = `自动匹配版本 (${auto})`;
        } else {
            metaObj = buildDefaultMeta(baseName);
            metaSource = '默认模板';
            console.warn('[警告] 未找到匹配的 metadata 参考文件，将使用默认模板与新生成的 UUID');
        }
    }

    // 替换 content 字段，保持其他字段顺序与值不变
    const merged = { ...metaObj, content: jsContent };

    // 还原打包格式：缩进 2，与酒馆助手默认导出一致
    const jsonText = JSON.stringify(merged, null, 2) + '\n';

    const defaultBase = versionTag
        ? `酒馆助手脚本-聊天记录导出 ${versionTag}.json`
        : `${baseName}.json`;
    const outputPath = resolveOutputPath(options.out, VERSIONS_JSON_DIR, defaultBase, '.json');
    writeOutput(outputPath, jsonText, options);

    console.log(`[完成] JS → JSON`);
    console.log(`  输入: ${inputPath}`);
    console.log(`  metadata 来源: ${metaSource}`);
    console.log(`  输出: ${outputPath}`);
    console.log(`  字节: ${Buffer.byteLength(jsonText, 'utf8')}`);
    return outputPath;
}

// ---------- 主入口 ----------

function main() {
    let parsed;
    try {
        parsed = parseArgs(process.argv.slice(2));
    } catch (e) {
        console.error(`[错误] ${e.message}`);
        printHelp();
        process.exit(2);
    }

    if (parsed.options.help || parsed.positional.length === 0) {
        printHelp();
        process.exit(parsed.options.help ? 0 : 2);
    }

    const inputArg = parsed.positional[0];
    const inputPath = path.resolve(inputArg);
    if (!fs.existsSync(inputPath)) {
        console.error(`[错误] 输入文件不存在: ${inputPath}`);
        process.exit(1);
    }
    if (!fs.statSync(inputPath).isFile()) {
        console.error(`[错误] 输入路径不是文件: ${inputPath}`);
        process.exit(1);
    }

    const ext = path.extname(inputPath).toLowerCase();
    try {
        if (ext === '.json') {
            convertJsonToJs(inputPath, parsed.options);
        } else if (ext === '.js') {
            convertJsToJson(inputPath, parsed.options);
        } else {
            console.error(`[错误] 不支持的输入扩展名 ${ext || '(无扩展名)'}（仅支持 .json/.js）`);
            process.exit(2);
        }
    } catch (e) {
        console.error(`[错误] ${e.message}`);
        process.exit(1);
    }
}

main();
