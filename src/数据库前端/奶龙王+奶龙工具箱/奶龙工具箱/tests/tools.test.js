'use strict';

/**
 * 工具脚本闭环测试：
 *   1. scripts/new.js 生成 js-script
 *   2. scripts/validate-examples.js 应当通过（生成产物使用 examples 已知 API）
 *   3. scripts/convert.js 解包后再打包，与原文 LF 归一化后字节恒等
 *   4. scripts/check-api-references.js 通过
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function runNode(script, args = [], opts = {}) {
    return execFileSync(process.execPath, [script, ...args], {
        cwd: ROOT,
        encoding: 'utf8',
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
        ...opts,
    });
}

function readText(file) {
    return fs.readFileSync(file, 'utf8');
}

function rmrf(dir) {
    if (!fs.existsSync(dir)) return;
    fs.rmSync(dir, { recursive: true, force: true });
}

function lfHash(text) {
    const lf = text.replace(/\r\n/g, '\n');
    return crypto.createHash('sha256').update(Buffer.from(lf, 'utf8')).digest('hex');
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function testNewGeneratesValidScript() {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-tools-'));
    try {
        runNode('scripts/new.js', ['js-script', '__tmp_test_script__', '--out', tmp, '--force']);
        const out = path.join(tmp, '__tmp_test_script__.json');
        assert.ok(fs.existsSync(out), '应当生成 JSON 文件');
        const json = JSON.parse(readText(out));
        assert.strictEqual(json.type, 'script');
        assert.strictEqual(json.name, '__tmp_test_script__');
        assert.ok(json.id && json.id.length >= 8, '应当生成 id');
        assert.ok(json.content.includes('window.TavernHelper'), '生成结果应当保留 window.TavernHelper 检查');
    } finally {
        rmrf(tmp);
    }
}

function testNewExtensionGeneratesDirectory() {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-ext-'));
    try {
        runNode('scripts/new.js', ['st-extension', '__tmp_ext__', '--out', tmp, '--force']);
        const dir = path.join(tmp, '__tmp_ext__');
        assert.ok(fs.existsSync(path.join(dir, 'manifest.json')), '应当生成 manifest.json');
        assert.ok(fs.existsSync(path.join(dir, 'index.js')), '应当生成 index.js');
        assert.ok(fs.existsSync(path.join(dir, 'style.css')), '应当生成 style.css');
        const idx = readText(path.join(dir, 'index.js'));
        assert.ok(idx.includes('SillyTavern.getContext'), '原生扩展样例必须包含 SillyTavern.getContext');
        assert.ok(idx.includes('__tmp_ext__'), '原生扩展样例应当使用新的 slug');
    } finally {
        rmrf(tmp);
    }
}

function testNewKnowledgeTemplates() {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-knowledge-'));
    try {
        runNode('scripts/new.js', ['worldbook-entry', '__tmp_entry__', '--out', tmp, '--force']);
        const entry = JSON.parse(readText(path.join(tmp, '__tmp_entry__.json')));
        assert.strictEqual(entry.comment, '__tmp_entry__');
        assert.ok(Array.isArray(entry.keys) && entry.keys.length > 0, '世界书单条目应保留 keys');

        runNode('scripts/new.js', ['frontend-snippet', '__tmp_panel__', '--out', tmp, '--force']);
        const panel = JSON.parse(readText(path.join(tmp, '__tmp_panel__.json')));
        assert.strictEqual(panel.name, '__tmp_panel__');
        assert.strictEqual(panel.scope_class, 'nl-__tmp_panel__');
        assert.ok(panel.html.includes('nl-__tmp_panel__'), '前端片段 html 应使用新 scope_class');
        assert.ok(panel.css.includes('.nl-__tmp_panel__'), '前端片段 css 应使用新 scope_class');

        runNode('scripts/new.js', ['stscript-quick-reply', '__tmp_qr__', '--out', tmp, '--force']);
        const qr = JSON.parse(readText(path.join(tmp, '__tmp_qr__.json')));
        assert.strictEqual(qr.name, '__tmp_qr__');
        assert.ok(qr.qrList.some(item => item.message.includes('/setvar')), 'STscript Quick Reply 应保留 slash command');
    } finally {
        rmrf(tmp);
    }
}

function getLatestScriptJson() {
    const latestDir = path.join(ROOT, 'projects/聊天记录导出工具/latest');
    const jsonFiles = fs.readdirSync(latestDir)
        .filter((file) => /^酒馆助手脚本-聊天记录导出 v\d+(?:\.\d+)+\.json$/.test(file));
    assert.strictEqual(
        jsonFiles.length,
        1,
        `latest 目录应当且只能有一个聊天记录导出 JSON，当前为: ${jsonFiles.join(', ') || '(无)'}`
    );
    return path.join(latestDir, jsonFiles[0]);
}

function testConvertRoundTrip() {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-convert-'));
    try {
        const sourceJson = getLatestScriptJson();
        const unpacked = path.join(tmp, 'unpacked.js');
        runNode('scripts/convert.js', [sourceJson, '--out', unpacked, '--no-overwrite']);
        const repacked = path.join(tmp, 'repacked.json');
        runNode('scripts/convert.js', [unpacked, '--out', repacked, '--meta', sourceJson, '--no-overwrite']);

        const source = JSON.parse(readText(sourceJson));
        const round = JSON.parse(readText(repacked));
        assert.strictEqual(round.type, source.type);
        assert.strictEqual(round.id, source.id);

        const sourceContentHash = lfHash(source.content);
        const roundContentHash = lfHash(round.content);
        assert.strictEqual(roundContentHash, sourceContentHash, '往返转换 LF 归一化后 content 应当一致');
    } finally {
        rmrf(tmp);
    }
}

function testValidateExamples() {
    runNode('scripts/validate-examples.js');
}

function testCheckReferences() {
    runNode('scripts/check-api-references.js');
}

function main() {
    testNewGeneratesValidScript();
    testNewExtensionGeneratesDirectory();
    testNewKnowledgeTemplates();
    testConvertRoundTrip();
    testValidateExamples();
    testCheckReferences();
    console.log('[通过] 工具脚本测试：new / convert 往返 / validate-examples / check-api-references 全绿');
}

if (require.main === module) {
    main();
}

module.exports = {
    testNewGeneratesValidScript,
    testNewExtensionGeneratesDirectory,
    testNewKnowledgeTemplates,
    testConvertRoundTrip,
    testValidateExamples,
    testCheckReferences,
};
