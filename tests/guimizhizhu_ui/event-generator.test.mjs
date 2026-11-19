import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const read = file => readFile(new URL(`../../${file}`, import.meta.url), 'utf8');
const source = await read('public/guimizhizhu_ui/core/event-generator.js');
const originalMembers = [];
const migratedTree = ts.createSourceFile('new.js', source, 99, true, ts.ScriptKind.JS);
const migrated = new Map();
function collect(node) {
  if (ts.isMethodDeclaration(node)) migrated.set(node.name.getText(migratedTree), node.getText(migratedTree));
  ts.forEachChild(node, collect);
}
collect(migratedTree);
for (const [file, names] of [
  ['34a-js-worldbook-database-tools.txt', ['renderTemplate']],
  ['35b-js-game-manager-core.txt', ['_extractLastTagContent']],
  ['36a-js-items-equip-relationships.txt', ['triggerEventGeneration', '_handleEventCardGeneration']],
]) {
  const original = await read(`数据库前端/regex-正文-诡秘之主catiger95-脚本分块/split/${file}`);
  for (const name of names) {
    const start = original.search(new RegExp(`^\\s*(?:async\\s+)?${name}\\(`, 'm'));
    const tree = ts.createSourceFile('old.js', `({${original.slice(start)}\n})`, 99, true, ts.ScriptKind.JS);
    let member;
    function find(node) {
      if (ts.isMethodDeclaration(node) && node.name.getText(tree) === name) member = node.getText(tree);
      ts.forEachChild(node, find);
    }
    find(tree);
    member = member.replace(/,$/, '').replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '');
    assert.equal(migrated.get(name), member, name);
    originalMembers.push(member);
  }
}
const primary = '1源堡', secondary = '2历史孔隙', cardName = '【存入】生成的事件';
const wordbank = {
  词库1: [{ text: '廷根', addTags: ['城'], nextPool: '街景' }],
  街景: [{ text: '野外', forbidTags: ['城'] }, { text: '钟楼', reqTags: ['城'] }],
  词库2: [{ text: '备用线索' }],
};
const books = new Map([
  [secondary, [{ uid: 1, name: '【配置】事件词库', content: '{broken' }]],
  [primary, [
    { uid: 2, name: '【配置】事件词库', content: JSON.stringify(wordbank) },
    { uid: 3, name: '【模板】提示词模板池', content: JSON.stringify({ event_template: '地点：[词库1]；线索：[词库2]；再提：[词库1]。${保留}' }) },
    { uid: 4, name: '其他条目', content: '不动', enabled: false, extra: { plugin: 'unrelated' } },
  ]],
]);
let writes = 0, nextUid = 10, hook = null, failSave = false;
let response = '<think>分析</think><EventCard>钟楼失踪案</EventCard>', settings = { useCustomApi: false };
let bound = { primary, additional: [] }, lostResponse = false, noWrite = false, corruptWrite = false;
let chat = 'event-chat', script = 'event-script', readHook = null;
const surface = { document: {}, window: { SillyTavern: { getCurrentChatId: () => chat } } };
const listeners = new Map();
const requests = [];
const host = {
  scriptVariableOptions: () => ({ type: 'script', script_id: script }),
  async getCharWorldbookNames() { return structuredClone(bound); },
  async getWorldbook(name) {
    if (readHook) { const current = readHook; readHook = null; await current(name); }
    if (!books.has(name)) throw Error('世界书不存在');
    return structuredClone(books.get(name));
  },
  async updateWorldbookWith(name, fn) {
    if (hook) { const current = hook; hook = null; await current(); }
    if (failSave) throw Error('保存失败');
    const result = (await fn(structuredClone(books.get(name)))).map(row => row.uid == null ? { ...row, uid: nextUid++ } : row);
    if (noWrite) return structuredClone(result);
    if (corruptWrite) result.find(row => row.name === cardName).enabled = false;
    books.set(name, structuredClone(result)); writes++;
    if (lostResponse) throw Error('保存响应丢失');
    return structuredClone(result);
  },
  async generateRaw(config) { requests.push(config); return response; },
};
const modules = { 'cryptLord.hostApi': host, 'cryptLord.variableSettlementApi': { async readSettings() { return settings; } },
  'cryptLord.afterNativeHost': {
    getHost: () => surface,
    tavernEvents: () => ({ CHAT_CHANGED: 'chat', GENERATION_STARTED: 'start', GENERATION_ENDED: 'end', GENERATION_STOPPED: 'stop' }),
    bindEvent(event, fn) { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(fn);
      return { stop() { listeners.get(event)?.delete(fn); } }; },
  } };
const context = {
  console, structuredClone, DOMException,
  cryptLord: {
    __stage1Modules: modules,
    contract: { initializeGlobal() {}, releaseGlobal() {}, async waitGlobalInitialized(key) { return modules[key]; } },
  },
};
context.window = context;
vm.runInNewContext(await read('public/guimizhizhu_ui/core/random-events.js'), context);
vm.runInNewContext(await read('public/guimizhizhu_ui/core/response-normalizer.js'), context);
vm.runInNewContext(source, context);
const api = modules['cryptLord.eventGenerator'];

// One complete original/configuration/model group.
const config = await api.loadConfig();
assert.equal(config.sources.wordbank.book, primary);
assert.equal(writes, 0);
const before = structuredClone(config.wordbank);
const expectedContext = {
  Math: Object.assign(Object.create(Math), { random: () => 0 }),
  GameDBManager: { DB: { templates: { event_template: config.template }, eventWordbank: config.wordbank }, _fallback: { templates: {} } },
  console,
};
const expectedRules = vm.runInNewContext(`({${originalMembers.join(',\n')}})`, expectedContext);
expectedContext.GameDBManager.renderTemplate = expectedRules.renderTemplate.bind(expectedContext.GameDBManager);
let originalText;
expectedRules.showTemporaryMessage = () => {};
expectedRules.closeAllModals = () => {};
expectedRules.handleAction = text => { originalText = text; };
await expectedRules.triggerEventGeneration();
const composed = api.compose(config.template, config.wordbank, () => 0);
assert.equal(composed.text, originalText);
assert.deepEqual(structuredClone(config.wordbank), before);
assert.equal(composed.choices.length, 2);
assert.equal(composed.choices[1].pool, '街景');
assert.deepEqual(Array.from(composed.tags), ['城']);
assert.match(composed.text, /\$\{保留\}/);
assert.equal(api.compose('固定模板', wordbank, () => 0).text, '固定模板');
assert.equal(api.compose('[词库2][词库1][词库2]', wordbank, () => 0).text, '钟楼廷根钟楼');
assert.equal(api.compose('[词库1]', { 词库1: [{ text: '兜底', reqTags: ['missing'] }] }, () => 0).text, '兜底');
assert.equal(api.compose('[词库1][词库2]', { ...wordbank, 词库2: [] }, () => 0).text, '廷根钟楼');
assert.throws(() => api.compose('[词库3]', wordbank), /可用词条/);
assert.throws(() => api.compose('[词库1]', { 词库1: [{ text: '错', reqTags: '城' }] }), /标签数组/);
assert.throws(() => api.compose('[词库1]', wordbank, () => 1), /随机源/);
assert.throws(() => api.compose('[词库1]', wordbank, () => NaN), /随机源/);
books.get(primary).push({ uid: 5, name: '【配置】事件词库', content: JSON.stringify({ 词库1: [{ text: '同库末条' }] }) });
assert.equal((await api.loadConfig()).wordbank.词库1[0].text, '同库末条');
books.get(primary).at(-1).content = '{broken';
await assert.rejects(api.loadConfig(), /有效 JSON/);
books.get(primary).pop();
assert.equal(await api.generateCard(composed.text), '钟楼失踪案');
assert.equal(requests[0].custom_api, undefined);
assert.equal(requests[0].max_chat_history, 0);
assert.equal(requests[0].should_silence, true);
assert.equal(requests[0].ordered_prompts[1].content, composed.text);
settings = { useCustomApi: true, apiUrl: 'https://example.test/v1', apiKey: '', model: 'shared' };
await api.generateCard(composed.text);
assert.equal(requests.at(-1).custom_api.model, 'shared');
settings = { useCustomApi: true };
await assert.rejects(api.generateCard('事件'), /URL 和模型/);
settings = { useCustomApi: false };
assert.equal(api.extractCard('<EventCard kind="event">甲</EventCard><事件卡片>乙</事件卡片>'), '乙');
assert.equal(api.extractCard('<EventCard>甲</事件卡片>'), '');
assert.equal(api.extractCard('<think><EventCard>分析样例</EventCard></think>'), '');
for (const tag of ['analysis', '思考', '推理', '分析', 'safe', 'Auto', 'script', 'style', 'JSONPatch', 'UpdateVariable']) {
  assert.equal(api.extractCard(`<${tag}><EventCard>隐藏样例</EventCard></${tag}>`), '', tag);
  assert.equal(api.extractCard(`<${tag}><EventCard>未闭合样例</EventCard>`), '', tag);
  assert.equal(api.extractCard(`<EventCard>实际事件</EventCard><${tag}><事件卡片>隐藏样例</事件卡片></${tag}>`), '实际事件', tag);
}
assert.equal(api.extractCard('<analysis><think>嵌套</think><EventCard>样例</EventCard></analysis>'), '');
assert.equal(api.extractCard('<!--<EventCard>注释样例</EventCard>-->'), '');
assert.equal(api.extractCard('<JSONPatch>[{"value":"<EventCard>补丁样例</EventCard>"}]</JSONPatch>'), '');
const mutable = await api.loadConfig();
mutable.wordbank.词库1[0].text = '篡改词库';
await assert.rejects(api.assertConfig(mutable), /来源无效或已被修改/);
await assert.rejects(api.assertConfig(structuredClone(config)), /来源无效/);
const initialTemplate = books.get(primary).find(row => row.uid === 3);
initialTemplate.extra = { pattern: /old/gi, timestamp: new Date('2026-01-01') };
const metadataConfig = await api.loadConfig();
initialTemplate.extra.pattern = /new/gi;
await assert.rejects(api.assertConfig(metadataConfig), /模板或词库已变化/);
initialTemplate.extra.pattern = /old/gi;
initialTemplate.extra.timestamp = new Date('2026-01-02');
await assert.rejects(api.assertConfig(metadataConfig), /模板或词库已变化/);
delete initialTemplate.extra;
const readBound = structuredClone(bound);
bound.additional = '错误数组';
await assert.rejects(api.loadConfig(), /绑定不可读取/);
bound = readBound;
let mixedReads = 0;
const normalRead = host.getWorldbook;
host.getWorldbook = async name => {
  if (name === primary && ++mixedReads === 2) initialTemplate.content = JSON.stringify({ event_template: '变更后的[词库1]' });
  return normalRead.call(host, name);
};
await assert.rejects(api.loadConfig(), /模板或词库已变化/);
host.getWorldbook = normalRead;
initialTemplate.content = JSON.stringify({ event_template: config.template });
response = '没有标签';
await assert.rejects(api.generateCard('事件'), /未返回/);
response = '<EventCard>结果<UpdateVariable>秘密</UpdateVariable></EventCard>';
await assert.rejects(api.generateCard('事件'), /分析标签/);
response = '<EventCard>结果<analysis>隐藏分析</analysis></EventCard>';
await assert.rejects(api.generateCard('事件'), /分析标签/);
assert.equal(writes, 0);
const requestCount = requests.length;
await assert.rejects(api.generateCard('已取消', () => false), /取消/);
assert.equal(requests.length, requestCount);
let current = true;
const normalSettings = modules['cryptLord.variableSettlementApi'].readSettings;
modules['cryptLord.variableSettlementApi'].readSettings = async () => { current = false; return settings; };
await assert.rejects(api.generateCard('读取 API 期间关闭', () => current), /取消/);
assert.equal(requests.length, requestCount);
modules['cryptLord.variableSettlementApi'].readSettings = normalSettings;
const generateNormally = host.generateRaw;
host.generateRaw = async () => { settings = { useCustomApi: true, apiUrl: 'https://changed.test/v1', model: 'new' }; return '<EventCard>旧设置结果</EventCard>'; };
await assert.rejects(api.generateCard('请求期间更换 API'), /模型设置已变化/);
host.generateRaw = generateNormally;
settings = { useCustomApi: false };
for (const change of [
  () => { chat = 'silently-changed'; },
  () => { script = 'silently-changed'; },
  () => { surface.document = {}; },
  () => { modules['cryptLord.afterNativeHost'] = { ...modules['cryptLord.afterNativeHost'] }; },
  () => { modules['cryptLord.randomEvents'] = { ...modules['cryptLord.randomEvents'] }; },
  () => { modules['cryptLord.responseNormalizer'] = { ...modules['cryptLord.responseNormalizer'] }; },
]) {
  const originalModules = { ...modules }, originalDocument = surface.document;
  const scopedConfig = await api.loadConfig();
  change();
  await assert.rejects(api.assertConfig(scopedConfig), /已变化/);
  Object.assign(modules, originalModules); surface.document = originalDocument; chat = 'event-chat'; script = 'event-script';
}
console.log('PASS event group 1: four original methods, independent parity, config precedence, draw rules, shared API, card parsing');

// One complete atomic-archive/lifecycle group.
const other = structuredClone(books.get(primary)[2]);
const secondaryBefore = structuredClone(books.get(secondary));
let target = await api.readCardTarget();
assert.equal(target.revision.uid, null);
target = await api.saveCard('事件 A', target.revision);
assert.equal(target.entry.content, '事件 A');
assert.equal(target.entry.enabled, true);
assert.equal(target.entry.strategy.type, 'selective');
assert.deepEqual(Array.from(target.entry.strategy.keys), [cardName]);
assert.equal(target.entry.recursion.prevent_incoming, true);
const firstRevision = structuredClone(target.revision);
books.get(primary).push({ uid: target.entry.uid, name: '无关重号条目', content: '保留' });
await assert.rejects(api.readCardTarget(), /UID 重复/);
books.get(primary).pop();
const actual = books.get(primary).find(row => row.uid === target.entry.uid);
actual.enabled = false;
actual.position = { type: 'at_depth', depth: 5, order: 77 };
actual.extra = { keep: true };
target = await api.readCardTarget();
const untouchedRevision = structuredClone(target.revision);
target.revision.content = '伪造原始内容';
await assert.rejects(api.saveCard('篡改票据', target.revision), /来源已被修改或无效/);
Object.assign(target.revision, untouchedRevision);
let unconfirmedTarget = target;
noWrite = true;
await assert.rejects(api.saveCard('未实际落盘', unconfirmedTarget.revision), error => error.requiresReload && /未确认/.test(error.message));
noWrite = false;
await assert.rejects(api.saveCard('旧凭据不能重试', unconfirmedTarget.revision), /来源已被修改或无效/);
target = await api.readCardTarget();
corruptWrite = true;
await assert.rejects(api.saveCard('内容相同元数据错误', target.revision), error => error.requiresReload && /未确认/.test(error.message));
corruptWrite = false;
target = await api.readCardTarget();
assert.equal(target.entry.enabled, false);
const expectedArchiveContext = {
  WorldbookManager: {
    async fetchEntries() { return [{ content: target.entry.content }]; },
    async saveEntries(tasks) { expectedArchiveContext.saved = tasks[0]; },
  },
  console,
};
const originalArchive = vm.runInNewContext(`({${originalMembers.join(',\n')}})`, expectedArchiveContext);
originalArchive.showTemporaryMessage = () => {};
await originalArchive._handleEventCardGeneration('事件 B');
target = await api.saveCard('事件 B', target.revision);
assert.equal(target.entry.content, expectedArchiveContext.saved.content);
assert.equal(target.entry.enabled, true);
assert.equal(target.entry.position.depth, 5);
assert.deepEqual(target.entry.extra, { keep: true });
await assert.rejects(api.saveCard('过期', firstRevision), /修改/);
await assert.rejects(api.saveCard('取消', target.revision, () => false), /取消/);
failSave = true;
await assert.rejects(api.saveCard('重试', target.revision), /保存失败/);
failSave = false;
target = await api.saveCard('重试', target.revision);
const oldUid = target.entry.uid;
hook = () => { books.get(primary).find(row => row.uid === oldUid).uid = 50; };
await assert.rejects(api.saveCard('身份替换', target.revision), /已变化/);
target = await api.readCardTarget();
hook = () => { books.get(primary).push({ uid: 60, name: '其他名字', comment: cardName, content: '' }); };
await assert.rejects(api.saveCard('重名', target.revision), /重名/);
books.get(primary).pop();
books.set(primary, books.get(primary).filter(row => row.uid !== target.entry.uid));
const absent = await api.readCardTarget();
hook = () => { books.get(primary).push({ uid: 70, name: cardName, content: '外部创建' }); };
await assert.rejects(api.saveCard('新建竞争', absent.revision), /已变化/);
target = await api.readCardTarget();
assert.equal(target.entry.content, '外部创建');
const count = writes;
const parallel = await Promise.allSettled([
  api.saveCard('并发一', target.revision), api.saveCard('并发二', target.revision),
]);
assert.equal(parallel[0].status, 'fulfilled');
assert.equal(parallel[1].status, 'rejected');
assert.equal(writes, count + 1);
target = await api.readCardTarget();
assert.deepEqual(books.get(primary).find(row => row.uid === 4), other);
assert.deepEqual(books.get(secondary), secondaryBefore);
// Actual-primary rules, pending-source and acknowledgement recovery share the same full flow.
books.set('真正主书', structuredClone(books.get(primary).filter(row => row.uid <= 4)));
bound = { primary: '真正主书', additional: [primary, '真正主书'] };
books.get('真正主书').find(row => row.uid === 2).content = JSON.stringify({ 词库1: [{ text: '真实主书词条' }] });
const actualConfig = await api.loadConfig();
assert.equal(actualConfig.sources.wordbank.book, '真正主书');
assert.equal(actualConfig.wordbank.词库1[0].text, '真实主书词条');
assert.equal((await api.readCardTarget()).book, '真正主书');
await api.assertConfig(actualConfig);
const originalPrimary = structuredClone(books.get(primary));
let actualTarget = await api.readCardTarget();
actualTarget = await api.saveCard('真正主书归档', actualTarget.revision, undefined, actualConfig);
assert.equal(actualTarget.entry.content, '真正主书归档');
assert.deepEqual(books.get(primary), originalPrimary);
lostResponse = true;
const recovered = await api.saveCard('响应丢失', actualTarget.revision, undefined, actualConfig);
assert.match(recovered.warning, /已追加/);
assert.equal(recovered.entry.content, '真正主书归档\n\n---\n\n响应丢失');
lostResponse = false;
actualTarget = await api.readCardTarget();
const originalAdditional = books.get(primary).find(row => row.uid === 2).content;
hook = () => { books.get(primary).find(row => row.uid === 2).content = JSON.stringify({ 词库1: [{ text: '附加书在宿主等待期间变更' }] }); };
await assert.rejects(api.saveCard('拒绝迟到附加书规则', actualTarget.revision, undefined, actualConfig), /模板或词库已变化/);
books.get(primary).find(row => row.uid === 2).content = originalAdditional;
actualTarget = await api.readCardTarget();
const ruleEntry = books.get('真正主书').find(row => row.uid === 2);
hook = () => { ruleEntry.content = JSON.stringify({ 词库1: [{ text: '最后提交前改变' }] }); };
await assert.rejects(api.saveCard('拒绝迟到规则', actualTarget.revision, undefined, actualConfig), /模板或词库已变化/);
await assert.rejects(api.generateCard('旧草稿', undefined, actualConfig), /模板或词库已变化/);
const currentConfig = await api.loadConfig();
bound.additional = [];
await assert.rejects(api.assertConfig(currentConfig), /绑定已变化/);
const emit = (event, ...args) => listeners.get(event)?.forEach(fn => fn(...args));
const liveConfig = await api.loadConfig();
emit('start', 'quiet'); await api.assertConfig(liveConfig);
emit('start', 'quiet_prompt'); await api.assertConfig(liveConfig);
emit('start', 'normal', { quiet_prompt: '工具请求' }); await api.assertConfig(liveConfig);
emit('start', 'normal', { dryRun: true }); await api.assertConfig(liveConfig);
emit('start', 'normal', {}, true); await api.assertConfig(liveConfig);
emit('start', 'normal');
await assert.rejects(api.assertConfig(liveConfig), /取消/);
emit('stop');
await assert.rejects(api.assertConfig(liveConfig), /取消/);
actualTarget = await api.readCardTarget();
await assert.rejects(api.saveCard('伪造票据', structuredClone(actualTarget.revision)), /来源已被修改或无效/);
const validConfig = await api.loadConfig();
const silentTarget = await api.readCardTarget();
hook = () => { chat = 'new-chat-without-event'; };
const beforeSilent = writes;
await assert.rejects(api.saveCard('不得跨聊天归档', silentTarget.revision), /聊天.*已变化/);
assert.equal(writes, beforeSilent);
chat = 'event-chat';
const normalGenerate = host.generateRaw;
host.generateRaw = async () => { emit('start', 'normal'); return '<EventCard>迟到结果</EventCard>'; };
await assert.rejects(api.generateCard('生成期变化', undefined, validConfig), /取消/);
host.generateRaw = normalGenerate; emit('end');
target = await api.readCardTarget();
let release;
hook = () => new Promise(resolve => { release = resolve; });
const pending = api.saveCard('卸载期间', target.revision);
await new Promise(resolve => setImmediate(resolve));
assert.ok(release);
api.dispose(); release();
await assert.rejects(pending, /已卸载/);
assert.equal(api.status().ready, false);
modules['cryptLord.randomEvents'].dispose();
assert.equal([...listeners.values()].reduce((sum, set) => sum + set.size, 0), 0);
await assert.rejects(api.readCardTarget(), /已卸载/);
const ui = await read('public/guimizhizhu_ui/modules/event-generator/index.js');
assert.doesNotMatch(ui, /inputAdapter|stateStore|setInputText|createChatMessages|模型设置|saveSettings/);
const loader = await read('public/guimizhizhu_ui/loader.js');
assert.match(loader, /'extractCard', 'generateCard', 'readCardTarget'/);
console.log('PASS event group 2: original append parity, atomic create/update, UID/duplicate conflicts, retries, queue, disposal, no native writes');
