import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/ROG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 820 } });
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let confirm = true;
    page.on('dialog', dialog => confirm ? dialog.accept() : dialog.dismiss());
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/mystery-roster.preview.html');
    const panel = page.locator('.crypt-lord-mystery-roster');
    const idle = () => page.waitForFunction(() =>
      document.querySelector('.crypt-lord-mystery-roster')?.getAttribute('aria-busy') === 'false');
    const cmd = (act, arg) => page.locator(`[data-ppw="${act}"]${arg ? `[data-arg="${arg}"]` : ''}`);
    const click = async (act, arg) => {
      const target = cmd(act, arg), closed = target.locator('xpath=ancestor::details[not(@open)]');
      if (await closed.count()) await closed.locator('summary').click();
      await target.click(); await idle();
    };
    const count = () => page.evaluate(() => preview.writes.length);
    const play = () => page.evaluate(() => preview.data.stat_data.$专属玩法?.窥秘人途径?.神秘再现玩法);
    const verdict = (action = '新增', id = '无', match = 'boys_magic_horn', seq = '序列6至4', era = '第三纪') =>
      `<裁定>\n通过|${action}|${id}|仪式原理|掌握完整仪式原理。|${seq}|${era}|${match}|完整阅读证据|已接触\n</裁定>`;
    const fillSubmission = async () => {
      await page.locator('[data-reenact-knowledge-name]').fill('仪式原理');
      await page.locator('[data-reenact-knowledge-content]').fill('完整的仪式原理。');
    };
    const submit = async (response, replacement) => {
      await fillSubmission();
      if (replacement) await page.locator('[data-reenact-replacement]').selectOption(replacement);
      await page.evaluate(value => { preview.response = value; }, response);
      await click('reenact-certify');
    };
    await page.getByRole('button', { name: '打开神秘再现', exact: true }).click(); await idle();
    assert.equal(await count(), 0);
    assert.equal(await cmd('reenact-save-spell', 1).isDisabled(), true);
    await submit('invalid');
    assert.equal(await count(), 0);
    await panel.locator('footer').filter({ hasText: '模型回复格式无法解析，本次没有改动。' }).waitFor();
    await submit('<裁定>不通过|拒绝|无|无|无|普通人或无法确定|第五纪当前阶段或年代无法确定|无|无|尚未完整接触</裁定>');
    assert.equal(await count(), 0);
    await submit(verdict());
    let archive = (await play()).知识档案, id = Object.keys(archive)[0];
    assert.equal(archive[id].总点数, 4);
    assert.ok((await play()).法术解锁账本.boys_magic_horn);
    assert.equal(await page.evaluate(() => preview.requests.at(-1).custom_api), undefined);
    const request = await page.evaluate(() => preview.requests.at(-1));
    assert.match(request.ordered_prompts.at(-1).content, /<历史事件>[\s\S]*老师完整讲述/);
    assert.match(request.ordered_prompts.at(-1).content, /<最新剧情>[\s\S]*玩家完整读完/);
    assert.equal(request.ordered_prompts.at(-1).content.includes('隐藏分析'), false);
    assert.match(request.ordered_prompts.at(-2).content, /<内置法术识别资料>[\s\S]*唯一解锁母题/);
    assert.match(request.ordered_prompts.at(-2).content, /<历史年表>/);
    const once = await count();
    await submit(verdict('重复', id));
    assert.equal(await count(), once);
    await page.evaluate(() => {
      preview.settings = { useCustomApi: true, apiUrl: 'https://example.invalid/v1', model: 'test', apiKey: '' };
    });
    await submit(verdict('重复', id, 'snow_white'));
    assert.ok((await play()).法术解锁账本.snow_white);
    assert.equal(await page.evaluate(() => preview.requests.at(-1).custom_api.model), 'test');
    await submit(verdict('合并', id, '无', '支柱', '第零纪'));
    archive = (await play()).知识档案;
    assert.equal(archive[id].总点数, 8);
    assert.equal(archive[id].提交记录.length, 2);
    // Build a full archive from genuine records, then exercise atomic replacement through the UI.
    await page.evaluate(id => {
      const data = preview.data, archive = data.stat_data.$专属玩法.窥秘人途径.神秘再现玩法.知识档案;
      for (let n = 1; n <= 4; n++) archive[`existing-${n}`] = { ...structuredClone(archive[id]),
        ID: `existing-${n}`, 名称: `其他知识${n}` };
      preview.data = data;
    }, id);
    await page.getByRole('button', { name: '重新读取', exact: true }).click(); await idle();
    const fullWrites = await count();
    await submit(verdict('重复', id, '无'), id);
    assert.equal(await count(), fullWrites);
    await submit(verdict('新增', '无', 'invalid-catalog'), id);
    archive = (await play()).知识档案;
    assert.equal(Object.keys(archive).length, 5);
    assert.equal(archive[id], undefined);
    assert.ok((await play()).法术解锁账本.boys_magic_horn);
    assert.equal((await play()).法术解锁账本['invalid-catalog'], undefined);
    const newest = Object.keys(archive).find(key => !key.startsWith('existing-'));
    const slot = page.locator('[data-reenact-slot="1"]');
    const field = name => slot.locator(`[data-rm-field="${name}"]`);
    await field('name').fill('星光治疗');
    await field('kind').selectOption('heal');
    await field('scope').selectOption('group');
    await field('center').selectOption('self');
    await field('heal-type').selectOption('灵性');
    await slot.locator('[data-rm-effect="1"] [data-rm-effect-field="type"]').selectOption('regen');
    await slot.locator('[data-rm-effect="2"] [data-rm-effect-field="type"]').selectOption('buff');
    await click('reenact-save-spell', 1);
    const custom = await page.evaluate(() => preview.data.stat_data.序列能力列表['#神秘再现'].find(ab => ab.名称 === '星光治疗'));
    assert.equal(custom.targetType, 'allAlly'); assert.equal(custom.range, 0);
    assert.equal(custom.effects.length, 2);
    await slot.locator('summary').click();
    await slot.evaluate(node => {
      const main = node.closest('main');
      main.scrollTop += node.getBoundingClientRect().top - main.getBoundingClientRect().top;
    });
    assert.equal(await panel.evaluate(node => node.scrollWidth <= node.clientWidth + 1 &&
      node.querySelector('main').scrollWidth <= node.querySelector('main').clientWidth + 1), true);
    assert.equal(await slot.locator('input,select,textarea').evaluateAll(nodes =>
      nodes.filter(n => n.getClientRects().length).every(n => {
        const r = n.getBoundingClientRect(), p = n.parentElement.getBoundingClientRect();
        return r.width > 0 && r.left >= p.left - 1 && r.right <= p.right + 1;
      })), true);
    confirm = false;
    const saved = await count();
    await click('reenact-delete-knowledge', newest);
    assert.equal(await count(), saved);
    confirm = true;
    await page.evaluate(() => { preview.writeFailure = true; });
    await click('reenact-delete-knowledge', newest);
    assert.ok((await play()).知识档案[newest]);
    await panel.locator('footer').filter({ hasText: '模拟写入失败' }).waitFor();
    await page.evaluate(() => { preview.writeFailure = false; });
    await panel.getByRole('button', { name: '重试保存', exact: true }).click(); await idle();
    for (const key of Object.keys((await play()).知识档案)) await click('reenact-delete-knowledge', key);
    assert.equal(Object.keys((await play()).知识档案).length, 0);
    assert.ok((await play()).法术解锁账本.boys_magic_horn);
    assert.ok((await play()).法术栏位.栏位1);
    assert.equal(await page.evaluate(() => preview.data.stat_data.序列能力列表['#神秘再现']
      .some(ab => ab.名称 === '星光治疗')), false);
    assert.equal(await page.evaluate(() => preview.data.stat_data.序列能力列表['#神秘再现']
      .some(ab => ab.$神秘再现来源ID === 'boys_magic_horn')), true);
    await click('reenact-delete-spell', 1);
    assert.equal((await play()).法术栏位.栏位1, undefined);
    await page.evaluate(() => {
      const data = preview.data; data.stat_data.当前序列 = '序列9-窥秘人'; preview.data = data;
    });
    await page.getByRole('button', { name: '重新读取', exact: true }).click(); await idle();
    assert.equal(await cmd('reenact-certify').count(), 0);
    assert.ok((await play()).法术解锁账本.snow_white);
    await page.evaluate(() => {
      const data = preview.data; data.stat_data.当前序列 = '序列4-神秘学家'; preview.data = data;
    });
    await page.getByRole('button', { name: '重新读取', exact: true }).click(); await idle();
    // A held request cannot overwrite external variables or a changed chat.
    const baseline = await count();
    await fillSubmission(); await page.evaluate(() => preview.hold());
    await cmd('reenact-certify').click();
    await page.waitForFunction(() => document.querySelector('.crypt-lord-mystery-roster').getAttribute('aria-busy') === 'true');
    await page.evaluate(response => {
      const data = preview.data; data.world_data.并发修改 = '保留'; preview.data = data;
      preview.release(response);
    }, verdict());
    await idle(); assert.equal(await count(), baseline);
    await panel.locator('footer').filter({ hasText: /原生楼层.*已变化/ }).waitFor();
    await page.getByRole('button', { name: '重新读取', exact: true }).click(); await idle();
    await fillSubmission(); await page.evaluate(() => preview.hold());
    await cmd('reenact-certify').click();
    await page.waitForFunction(() => document.querySelector('.crypt-lord-mystery-roster').getAttribute('aria-busy') === 'true');
    await page.evaluate(response => { preview.changeChat(); preview.release(response); }, verdict());
    await page.waitForFunction(() => document.querySelector('.crypt-lord-mystery-roster').dataset.open === 'false');
    await page.getByRole('button', { name: '打开神秘再现', exact: true }).click(); await idle();
    assert.equal(await count(), baseline);
    await page.evaluate(() => {
      const data = preview.data; data.cryptLord.teamBattle = { status: 'active' }; preview.data = data;
    });
    await page.getByRole('button', { name: '重新读取', exact: true }).click(); await idle();
    assert.equal(await cmd('reenact-certify').isDisabled(), true);
    assert.equal(await page.locator('[data-reenact-knowledge-name]').isDisabled(), true);
    assert.deepEqual(await page.evaluate(() => preview.data.npc_data), await page.evaluate(() => preview.initial.npc_data));
    assert.equal(await page.evaluate(() => preview.writes.every(id => id === 2)), true);
    assert.deepEqual(await page.evaluate(() => preview.opening.data), { preserved: true });
    assert.equal(await page.locator('#send_textarea').inputValue(), '保留玩家的正文草稿');
    assert.equal(await page.evaluate(() => preview.inputEvents), 0);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Mystery browser: desktop/mobile archive-to-spell lifecycle, API routing, layout and native transaction isolation passed.');
} finally { await browser.close(); }
