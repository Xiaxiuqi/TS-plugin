import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '..', '..');

async function source(relativePath) {
  return readFile(path.join(repositoryRoot, relativePath), 'utf8');
}

function createRuntime(overrides = {}) {
  class TestEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.bubbles = Boolean(options.bubbles);
    }
  }

  const runtime = {
    AbortController,
    DOMException,
    Event: TestEvent,
    JSON,
    Map,
    Promise,
    Set,
    console,
    clearTimeout,
    setTimeout,
    structuredClone,
    ...overrides,
  };
  runtime.window = runtime;
  runtime.parent = runtime;
  runtime.top = runtime;
  vm.createContext(runtime);
  return runtime;
}

async function load(runtime, relativePath) {
  vm.runInContext(await source(relativePath), runtime, { filename: relativePath });
}

function register(runtime, key, api) {
  runtime.cryptLord.contract.initializeGlobal(key, api);
}

function moduleApi(runtime, key) {
  return runtime.cryptLord.__stage1Modules?.[key];
}

function eventBus() {
  const listeners = new Map();
  return {
    events: {
      CHARACTER_MESSAGE_RENDERED: 'character-message-rendered',
      MESSAGE_UPDATED: 'message-updated',
      MESSAGE_DELETED: 'message-deleted',
      CHAT_CHANGED: 'chat-changed',
    },
    on(name, handler) {
      const handlers = listeners.get(name) || new Set();
      handlers.add(handler);
      listeners.set(name, handlers);
      return { stop() { handlers.delete(handler); } };
    },
    emit(name, ...args) {
      Array.from(listeners.get(name) || []).forEach(handler => handler(...args));
    },
  };
}

function createFloorHost(runtime, generate) {
  const messages = [];
  const configs = [];
  let nextMessageId = 1;

  runtime.getChatMessages = range => {
    if (String(range).includes('{{lastMessageId}}')) return messages.map(message => structuredClone(message));
    const id = Number(range);
    return messages.filter(message => message.message_id === id).map(message => structuredClone(message));
  };
  runtime.TavernHelper = {
    async createChatMessages(newMessages) {
      newMessages.forEach(message => {
        messages.push({ message_id: nextMessageId++, data: {}, ...structuredClone(message) });
      });
    },
    async setChatMessages(patches) {
      patches.forEach(patch => {
        const target = messages.find(message => message.message_id === patch.message_id);
        if (target) Object.assign(target, structuredClone(patch));
      });
    },
    async deleteChatMessages(ids) {
      ids.forEach(id => {
        const index = messages.findIndex(message => message.message_id === id);
        if (index >= 0) messages.splice(index, 1);
      });
    },
    async generate(config) {
      configs.push(structuredClone(config));
      return generate(config);
    },
  };
  return { configs, messages };
}

async function testNativeFloorTransaction() {
  const runtime = createRuntime();
  await load(runtime, 'public/guimizhizhu_ui/shared/contract.js');
  const host = createFloorHost(runtime, async () => '模型回复正文');
  const completed = [];
  register(runtime, 'cryptLord.nativeFloorBridge', {
    async prepareTurn() { return { accepted: true, assistantData: {} }; },
    async buildGenerationConfig(rawText) {
      return { config: { user_input: rawText, max_chat_history: 'all' }, retryLimit: 0, watchdogSeconds: 0 };
    },
    async inspectNarrative(rawText) { return { passed: true, text: rawText, parseText: rawText }; },
    async completeNarrative(rawText, transaction) { completed.push({ rawText, transaction }); },
  });
  await load(runtime, 'public/guimizhizhu_ui/modules/native-floor/index.js');

  await moduleApi(runtime, 'cryptLord.nativeFloor').submitNativeTurn('向前探索', { source: 'sillytavern-native' });

  assert.deepEqual(host.messages.map(message => [message.role, message.message]), [
    ['user', '向前探索'],
    ['assistant', '模型回复正文'],
  ]);
  assert.equal(host.configs.length, 1);
  assert.equal(host.configs[0].user_input, '向前探索');
  assert.equal(host.configs[0].max_chat_history, 'all');
  assert.equal(completed.length, 1);
  assert.equal(completed[0].transaction.userMessageId, 1);
  assert.equal(completed[0].transaction.assistantMessageId, 2);
}

async function testFailedGenerationRemovesOnlyItsUserFloor() {
  const runtime = createRuntime();
  await load(runtime, 'public/guimizhizhu_ui/shared/contract.js');
  const host = createFloorHost(runtime, async () => { throw new Error('模拟生成失败'); });
  let failed = 0;
  register(runtime, 'cryptLord.nativeFloorBridge', {
    async prepareTurn() { return { accepted: true, assistantData: {} }; },
    async buildGenerationConfig(rawText) { return { config: { user_input: rawText }, retryLimit: 0, watchdogSeconds: 0 }; },
    async inspectNarrative() { throw new Error('不应执行'); },
    async completeNarrative() { throw new Error('不应执行'); },
    async onTurnFailed() { failed += 1; },
  });
  await load(runtime, 'public/guimizhizhu_ui/modules/native-floor/index.js');

  await assert.rejects(
    moduleApi(runtime, 'cryptLord.nativeFloor').submitNativeTurn('失败回合', { source: 'sillytavern-native' }),
    /模拟生成失败/,
  );
  assert.deepEqual(host.messages, []);
  assert.equal(failed, 1);
}

async function testBridgeStoresReadableTextStateAndActionsOnOneAssistantFloor() {
  const runtime = createRuntime();
  const messages = [
    { message_id: 1, role: 'assistant', message: '旧正文', data: { stat_data: { 生命: 8 } } },
    { message_id: 2, role: 'user', message: '继续前进', data: {} },
    { message_id: 3, role: 'assistant', message: '临时正文', data: {} },
  ];
  const writes = [];
  await load(runtime, 'public/guimizhizhu_ui/shared/contract.js');
  register(runtime, 'cryptLord.hostApi', {
    async getChatMessages(range) {
      if (String(range).includes('{{lastMessageId}}')) return structuredClone(messages);
      return structuredClone(messages.filter(message => message.message_id === Number(range)));
    },
    async setChatMessages(patches) {
      patches.forEach(patch => {
        writes.push(structuredClone(patch));
        const target = messages.find(message => message.message_id === patch.message_id);
        Object.assign(target, structuredClone(patch));
      });
    },
    async waitForMvu() { return runtime.Mvu; },
  });
  register(runtime, 'cryptLord.contextBuilder', { async build() { return [{ role: 'system', content: '测试上下文' }]; } });
  runtime.Mvu = {
    async parseMessage() {
      return { stat_data: { 生命: 9 }, cryptLord: { preserved: true } };
    },
  };
  await load(runtime, 'public/guimizhizhu_ui/core/response-normalizer.js');
  await load(runtime, 'public/guimizhizhu_ui/core/native-settlement.js');
  await load(runtime, 'public/guimizhizhu_ui/core/state-store.js');
  await load(runtime, 'public/guimizhizhu_ui/core/generation-bridge.js');

  const raw = '<thinking>隐藏推理</thinking><gametxt>可读剧情</gametxt><UpdateVariable>{}</UpdateVariable><action>1. 继续前进\n2. 查看四周</action>';
  const bridge = moduleApi(runtime, 'cryptLord.nativeFloorBridge');
  const inspected = await bridge.inspectNarrative(raw);
  assert.equal(inspected.text, '可读剧情');
  assert.equal(inspected.parseText, raw);

  await bridge.completeNarrative(raw, {
    userMessageId: 2,
    assistantMessageId: 3,
    userText: '继续前进',
    narrativeText: inspected.text,
  });

  assert.deepEqual(writes.map(write => write.message_id), [3]);
  assert.equal(messages[2].data.stat_data.生命, 9);
  assert.deepEqual(messages[2].data.cryptLord.actions, ['继续前进', '查看四周']);
  assert.equal(messages[2].data.cryptLord.preserved, true);
}

async function testActionFillDoesNotSubmit() {
  function element() {
    const listeners = new Map();
    return {
      nodeType: 1,
      children: [],
      dataset: {},
      appendChild(child) { this.children.push(child); return child; },
      setAttribute(name, value = '') { this[name] = value; },
      addEventListener(type, listener) { listeners.set(type, listener); },
      dispatch(type) { listeners.get(type)?.({ target: this }); },
      insertAdjacentElement(_position, child) { this.inserted = child; return child; },
      querySelector() { return null; },
      remove() { this.removed = true; },
    };
  }

  const input = {
    value: '',
    inputEvents: 0,
    focusCalls: 0,
    dispatchEvent(event) { if (event.type === 'input') this.inputEvents += 1; },
    focus() { this.focusCalls += 1; },
    matches(selector) { return selector === '#send_textarea'; },
  };
  const anchor = element();
  const container = element();
  container.querySelector = selector => selector === '.mes_text' ? anchor : null;
  const document = {
    URL: 'https://example.test/',
    body: {},
    documentElement: {},
    addEventListener() {},
    removeEventListener() {},
    querySelector(selector) { return selector === '#send_textarea' ? input : null; },
    createElement() { return element(); },
  };
  const bus = eventBus();
  const runtime = createRuntime({
    document,
    MutationObserver: class { observe() {} disconnect() {} },
    retrieveDisplayedMessage(messageId) { return messageId === 3 ? [container] : null; },
    tavern_events: bus.events,
    eventOn: bus.on,
  });
  await load(runtime, 'public/guimizhizhu_ui/shared/contract.js');
  register(runtime, 'cryptLord.lifecycle', {
    createScope() {
      return { addCleanup() {}, listen() {}, dispose() {} };
    },
  });
  let submitCount = 0;
  register(runtime, 'cryptLord.nativeFloor', {
    async submitNativeTurn() { submitCount += 1; return true; },
  });
  await load(runtime, 'public/guimizhizhu_ui/modules/input-adapter/index.js');
  const adapter = moduleApi(runtime, 'cryptLord.inputAdapter');
  await adapter.install();

  assert.equal(adapter.setInputText('查看四周', 'sillytavern-native'), true);
  assert.equal(input.value, '查看四周');
  assert.equal(input.inputEvents, 1);
  assert.equal(input.focusCalls, 1);
  assert.equal(submitCount, 0);

  register(runtime, 'cryptLord.stateStore', {
    async readMessageData(messageId) {
      assert.equal(messageId, 3);
      return { cryptLord: { actions: ['查看四周'] } };
    },
  });
  await load(runtime, 'public/guimizhizhu_ui/modules/action-options/index.js');
  await moduleApi(runtime, 'cryptLord.actionOptions').refresh(3);
  const actionButton = anchor.inserted.children[0].children[0];
  actionButton.dispatch('click');
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.equal(input.value, '查看四周');
  assert.equal(input.inputEvents, 2);
  assert.equal(submitCount, 0);

  bus.emit(bus.events.MESSAGE_DELETED, 3);
  assert.equal(anchor.inserted.removed, true);
  await moduleApi(runtime, 'cryptLord.actionOptions').refresh(3);
  const refreshedSection = anchor.inserted;
  bus.emit(bus.events.CHAT_CHANGED);
  assert.equal(refreshedSection.removed, true);
}

async function testStateCardReadsAssistantDataAndCleansUpWithChatEvents() {
  function element(document) {
    return {
      nodeType: 1,
      ownerDocument: document,
      children: [],
      dataset: {},
      appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
      setAttribute(name, value = '') { this[name] = value; },
      remove() { this.removed = true; },
      querySelector(selector) {
        return this.children.find(child => child.className === selector.slice(1)) || null;
      },
    };
  }

  const document = {
    URL: 'https://example.test/',
    body: {},
    documentElement: {},
    createElement() { return element(document); },
  };
  const messageParent = element(document);
  messageParent.insertBefore = (child, _nextSibling) => messageParent.appendChild(child);
  const messageText = element(document);
  messageText.className = 'mes_text';
  messageText.parentNode = messageParent;
  const messageContainer = element(document);
  messageContainer.querySelector = selector => selector === '.mes_text' ? messageText : null;
  const bus = eventBus();
  const runtime = createRuntime({
    document,
    retrieveDisplayedMessage(messageId) { return messageId === 8 ? [messageContainer] : null; },
    tavern_events: bus.events,
    eventOn: bus.on,
    addEventListener() {},
    removeEventListener() {},
  });
  await load(runtime, 'public/guimizhizhu_ui/shared/contract.js');
  const statePayload = vm.runInContext("({ stat_data: { 生命: 9, 位阶: '序列九' } })", runtime);
  register(runtime, 'cryptLord.stateStore', {
    async readMessageData(messageId) {
      assert.equal(messageId, 8);
      return statePayload;
    },
  });
  register(runtime, 'cryptLord.Mvu', { async getMvuData() { return {}; } });
  await load(runtime, 'public/guimizhizhu_ui/modules/floating-variable-editor/index.js');
  const cardModule = moduleApi(runtime, 'cryptLord.floatingVariableEditor');
  await new Promise(resolve => setTimeout(resolve, 0));

  bus.emit(bus.events.CHARACTER_MESSAGE_RENDERED, 8, 'assistant');
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(cardModule.status().cards, 1);
  assert.equal(messageParent.children.length, 1);
  assert.equal(messageParent.children[0].children[1].children[0].textContent, '位阶');
  assert.equal(messageParent.children[0].children[1].children[1].textContent, '序列九');

  bus.emit(bus.events.MESSAGE_DELETED, 8);
  assert.equal(cardModule.status().cards, 0);
  assert.equal(messageParent.children[0].removed, true);

  bus.emit(bus.events.CHARACTER_MESSAGE_RENDERED, 8, 'assistant');
  await new Promise(resolve => setTimeout(resolve, 0));
  const refreshedCard = messageParent.children[1];
  bus.emit(bus.events.CHAT_CHANGED);
  assert.equal(cardModule.status().cards, 0);
  assert.equal(refreshedCard.removed, true);
}

async function testNativeEditorWritesOnlySelectedAssistantFloor() {
  const runtime = createRuntime();
  await load(runtime, 'public/guimizhizhu_ui/shared/contract.js');
  const saved = [];
  register(runtime, 'cryptLord.stateStore', {
    async findLatestAssistant() { return { message_id: 7, role: 'assistant', message: '旧正文', data: { hp: 1 } }; },
    async readMessage(messageId) {
      return messageId === 7 ? { message_id: 7, role: 'assistant', message: '旧正文', data: { hp: 1 } } : null;
    },
    async writeAssistantMessage(messageId, message, data) { saved.push({ messageId, message, data }); },
  });
  await load(runtime, 'public/guimizhizhu_ui/core/native-editor.js');
  const editor = moduleApi(runtime, 'cryptLord.nativeEditor');

  await editor.save(7, '新正文', { hp: 2 });
  assert.deepEqual(saved, [{ messageId: 7, message: '新正文', data: { hp: 2 } }]);
  await assert.rejects(editor.save(7, '无效', []), /data 必须是对象/);
}

await testNativeFloorTransaction();
await testFailedGenerationRemovesOnlyItsUserFloor();
await testBridgeStoresReadableTextStateAndActionsOnOneAssistantFloor();
await testActionFillDoesNotSubmit();
await testStateCardReadsAssistantDataAndCleansUpWithChatEvents();
await testNativeEditorWritesOnlySelectedAssistantFloor();

console.info('guimizhizhu_ui native-floor integration tests passed');
