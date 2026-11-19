import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/ROG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let promptAnswer = '银湾新领';
    page.on('dialog', dialog => dialog.accept(dialog.type() === 'prompt' ? promptAnswer : undefined));
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/domain-foundation.preview.html');
    await page.waitForFunction(() => window.ready);
    const panel = page.getByRole('dialog', { name: '独立领地', exact: true });
    const settled = () => page.waitForFunction(() => !preview.modules['cryptLord.domainConsole'].status().busy);
    const click = async (name, scope = panel) => {
      await scope.getByRole('button', { name, exact: true }).click();
      await settled();
    };
    const domain = () => page.evaluate(() => structuredClone(preview.floors[2].data.stat_data.领地));
    const count = () => page.evaluate(() => preview.flags.writes.length);
    const choose = async selector => {
      const value = await selector.locator('option').evaluateAll(rows => rows.find(row => row.value)?.value);
      await selector.selectOption(value);
    };
    const protectedFloors = await page.evaluate(() => JSON.stringify(preview.floors.slice(0, 2)));
    const story = await page.evaluate(() => preview.floors[2].message);
    await page.locator('#open').click(); await settled();
    assert.equal(await count(), 0);
    await panel.getByLabel('目标地点', { exact: true }).fill('廷根');
    await click('保存目标');
    assert.equal(await count(), 1);
    await click('验收正文');
    await panel.getByLabel('领地名', { exact: true }).fill('银湾庄园');
    for (const type of ['农产品', '工业品', '服务']) await choose(panel.getByLabel(`${type}（必选）`, { exact: true }));
    await page.evaluate(() => { preview.flags.failWrite = true; });
    await click('建立领地');
    assert.equal(await count(), 1);
    assert.equal(await page.evaluate(() => preview.modules['cryptLord.domainConsole'].status().pending), true);
    assert.equal(await panel.getByLabel('领地名', { exact: true }).inputValue(), '银湾庄园');
    await page.evaluate(() => { preview.flags.failWrite = false; });
    await click('重试保存');
    assert.equal(await count(), 2);
    assert.equal((await domain()).已建立, true);
    assert.equal(await page.evaluate(() => preview.calls.length), 1);
    await page.evaluate(() => {
      const data = preview.floors[2].data;
      for (const key of Object.keys(data.stat_data.领地.物资库)) data.stat_data.领地.物资库[key] = 10000;
      data.stat_data.势力.银湾庄园.直辖的半神和真神信息 = { 守护者: { 序列: '序列4-工匠' }, $meta: { keep: true } };
      data.stat_data.势力.银湾庄园.锚的需求 = 800;
      data.stat_data.势力.其他势力 = { untouched: true };
    });
    await click('重新读取');
    await click('领地改名');
    assert.equal((await domain()).领地名, '银湾新领');
    const projection = await page.evaluate(() => preview.floors[2].data.stat_data.势力);
    assert.equal(projection.银湾庄园, undefined);
    assert.equal(projection.银湾新领.锚的需求, 10000);
    assert.equal(projection.银湾新领.直辖的半神和真神信息.守护者.序列, '序列4-工匠');
    assert.equal(projection.其他势力.untouched, true);
    const empty = panel.locator('article').filter({ has: page.getByText('格4 · 空地', { exact: true }) });
    await choose(empty.getByLabel('建筑', { exact: true }));
    const gold = await page.evaluate(() => preview.floors[2].data.stat_data.货币.鲁恩王国.金镑);
    await page.evaluate(() => { preview.flags.failWrite = true; });
    await click('普通施工', empty);
    assert.equal(await page.evaluate(() => preview.floors[2].data.stat_data.货币.鲁恩王国.金镑), gold);
    await page.evaluate(() => { preview.flags.failWrite = false; });
    await click('重试保存');
    assert.ok((await domain()).格子.格4.完工时刻 > 25000000000);
    const core = panel.locator('section.crypt-lord-domain-console__section').filter({ has: page.getByText(/^核心与客房/) });
    await click('超凡扩建', core);
    const room = panel.locator('article').filter({ has: page.getByText('房1 · 房1', { exact: true }) });
    await room.getByLabel('住客', { exact: true }).selectOption('诺兰');
    await click('预留', room);
    const roomName = panel.locator('article').filter({ has: page.getByText('房1 · 房1', { exact: true }) });
    await roomName.getByLabel('房名', { exact: true }).fill('东侧客房');
    await click('改名', roomName);
    await panel.getByLabel('数量', { exact: true }).fill('3');
    await click('招募');
    assert.equal((await domain()).训练队列.length, 1);
    await page.evaluate(() => preview.advance(15));
    await click('重新读取');
    const afterTime = await domain();
    assert.equal(afterTime.格子.格4.等级, 1);
    assert.equal(afterTime.核心.等级, 2);
    assert.equal(afterTime.训练队列.length, 0);
    assert.equal(afterTime.驻军.散兵[0].数量, 3);
    assert.equal(afterTime.核心.房间.房1.名称, '东侧客房');
    const building = panel.locator('article').filter({ has: page.getByText(/^格4 ·/) });
    await building.getByLabel('总管', { exact: true }).selectOption('诺兰');
    await click('任命', building);
    await click('停工', building); await click('复工', building);
    await click('新建军队');
    const formation = panel.locator('.crypt-lord-domain-console__formation');
    await choose(formation.getByLabel('主兵种', { exact: true }));
    await formation.getByLabel('军队名称', { exact: true }).fill('银湾卫队');
    await formation.locator('input[data-loose-key]').first().fill('3');
    await click('确认编成', formation);
    assert.equal((await domain()).驻军.军队[0].编成[0].数量, 3);
    await click('加入出战');
    assert.equal((await domain()).出战名单.length, 1);

    // One model verdict and one financial result survive a failed native save.
    await page.evaluate(() => { preview.flags.failWrite = true; });
    await click('正文结盟', panel.locator('.crypt-lord-domain-console__row').filter({ has: page.getByText(/· 存续/, { exact: false }) }).first());
    const calls = await page.evaluate(() => preview.calls.length);
    const beforeRetry = await count();
    await page.evaluate(() => { preview.flags.failWrite = false; });
    await click('重试保存');
    assert.equal(await page.evaluate(() => preview.calls.length), calls);
    assert.equal(await count(), beforeRetry + 1);
    assert.equal((await domain()).同级对手[0].状态, '已吞并');
    while (await panel.getByRole('button', { name: '正文吞并', exact: true }).count()) {
      await panel.getByRole('button', { name: '正文吞并', exact: true }).first().click();
      await settled();
    }
    const beforePromotion = await domain();
    await click('晋升领地');
    for (const type of ['农产品', '工业品', '服务']) await choose(panel.getByLabel(`${type}（必选）`, { exact: true }));
    for (const picker of await panel.locator('.crypt-lord-domain-console__promotion-field select').all()) {
      if (!await picker.inputValue()) await choose(picker);
    }
    await page.evaluate(() => { preview.flags.failWrite = true; });
    await click('确认晋升');
    assert.equal((await domain()).等级, 1);
    await page.evaluate(() => { preview.flags.failWrite = false; });
    await click('重试保存');
    const promoted = await domain();
    assert.equal(promoted.等级, 2);
    assert.deepEqual(promoted.驻军, beforePromotion.驻军);
    for (const [key, room] of Object.entries(beforePromotion.核心.房间)) assert.deepEqual(promoted.核心.房间[key], room);
    assert.equal(Object.keys(promoted.核心.房间).length, Object.keys(beforePromotion.核心.房间).length + 1);
    assert.deepEqual(promoted.物资库, beforePromotion.物资库);
    assert.equal(await page.locator('#native-draft').inputValue(), '保留原生输入草稿');
    assert.equal(await page.evaluate(() => JSON.stringify(preview.floors.slice(0, 2))), protectedFloors);
    assert.equal(await page.evaluate(() => preview.floors[2].message), story);
    assert.deepEqual(await page.evaluate(() => preview.floors[2].swipes_data[1]), { otherPlugin: { untouched: true } });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const overflow = await panel.evaluate(node => [...node.querySelectorAll('input, select, button')].some(control => {
      const frame = node.getBoundingClientRect(), rect = control.getBoundingClientRect();
      return rect.width && (rect.left < frame.left - 1 || rect.right > frame.right + 1);
    }));
    assert.equal(overflow, false);

    // Recovery keeps one complete derivation, including when native saving has no usable receipt.
    promptAnswer = '原生待保存领地';
    await page.evaluate(() => { preview.flags.noWrite = true; });
    await click('领地改名');
    const prepared = await page.evaluate(() => preview.derivations);
    assert.equal(await page.evaluate(() => preview.modules['cryptLord.domainConsole'].status().phase), 'pending');
    await page.evaluate(() => { preview.confirm = false; });
    await panel.press('Escape');
    await panel.getByRole('button', { name: '重新读取', exact: true }).click();
    await page.evaluate(() => preview.modules['cryptLord.domainConsole'].open(2));
    assert.equal(await panel.isVisible(), true);
    assert.equal(await page.evaluate(() => preview.modules['cryptLord.domainConsole'].status().phase), 'pending');
    await page.evaluate(() => { preview.flags.noWrite = false; preview.confirm = true; });
    await click('重试保存');
    assert.equal(await page.evaluate(() => preview.derivations), prepared);
    assert.equal((await domain()).领地名, promptAnswer);
    promptAnswer = '回执丢失领地';
    const beforeLost = await count();
    await page.evaluate(() => { preview.flags.lostReceipt = true; });
    await click('领地改名');
    assert.equal(await count(), beforeLost + 1);
    assert.equal(await page.evaluate(() => preview.modules['cryptLord.domainConsole'].status().pending), false);
    promptAnswer = '待核对领地';
    await page.evaluate(() => { preview.flags.lostReceipt = false; preview.flags.afterWriteFail = true; });
    await click('领地改名');
    const uncertainWrites = await count(), uncertainDerived = await page.evaluate(() => preview.derivations);
    assert.equal(await page.evaluate(() => preview.modules['cryptLord.domainConsole'].status().phase), 'uncertain');
    await click('核对原生保存状态');
    assert.equal(await count(), uncertainWrites);
    await page.evaluate(() => { preview.flags.failRead = false; preview.flags.afterWriteFail = false; });
    await click('核对原生保存状态');
    assert.equal(await count(), uncertainWrites);
    assert.equal(await page.evaluate(() => preview.derivations), uncertainDerived);
    assert.equal((await domain()).领地名, promptAnswer);

    // Boundary chain: entire-page conflicts, rule changes and late requests never save.
    await page.evaluate(() => {
      preview.waitModel = () => new Promise(resolve => { preview.releaseModel = resolve; });
    });
    const beforeConflict = await count();
    await panel.getByRole('button', { name: '正文结盟', exact: true }).first().click();
    await page.waitForFunction(() => Boolean(preview.releaseModel));
    await page.evaluate(() => {
      preview.floors[2].swipes[1] += '外部修订'; preview.releaseModel(); preview.waitModel = null;
    });
    await settled();
    assert.equal(await count(), beforeConflict);
    assert.equal(await page.evaluate(() => preview.modules['cryptLord.domainConsole'].status().stale), true);
    await click('重新读取');
    await page.evaluate(() => { preview.books.角色规则.push({ name: '【配置】势力配置', content: '{"productivityDemands":{"农产品":{"1级":{"c1":99}}}}' }); });
    await click('保存到当前楼层');
    assert.equal(await count(), beforeConflict);
    assert.match(await panel.locator('footer').innerText(), /规则|已变化/);
    await click('重新读取');
    await page.evaluate(() => preview.emit('GENERATION_STARTED', 'quiet'));
    await page.evaluate(() => preview.emit('GENERATION_STARTED', 'normal', {}, true));
    await page.evaluate(() => preview.emit('GENERATION_STARTED', 'dryRun'));
    await page.evaluate(() => preview.emit('GENERATION_STARTED', 'quiet_prompt'));
    await click('保存到当前楼层');
    assert.equal(await count(), beforeConflict);
    await page.evaluate(() => { preview.flags.hold = true; });
    await panel.getByRole('button', { name: '停工', exact: true }).first().click();
    await page.waitForFunction(() => preview.flags.waiting);
    await page.evaluate(() => { preview.emit('GENERATION_STARTED', 'normal'); preview.release(); preview.emit('GENERATION_ENDED'); });
    await settled(); await page.waitForTimeout(100);
    assert.equal(await count(), beforeConflict);
    await click('重新读取');
    await page.evaluate(() => preview.emit('GENERATION_STARTED', 'normal'));
    assert.equal(await panel.getByRole('button', { name: '重新读取', exact: true }).isDisabled(), true);
    await page.evaluate(() => preview.emit('GENERATION_STOPPED'));
    assert.equal(await panel.getByRole('button', { name: '重新读取', exact: true }).isEnabled(), true);
    await click('重新读取');
    await panel.getByRole('button', { name: '停工', exact: true }).first().click(); await settled();
    assert.equal(await count(), beforeConflict + 1);
    await page.evaluate(() => {
      preview.waitSettings = () => new Promise(resolve => { preview.releaseSettings = resolve; });
    });
    const callsBeforeClose = await page.evaluate(() => preview.calls.length);
    await panel.getByRole('button', { name: '正文吞并', exact: true }).first().click();
    await page.waitForFunction(() => Boolean(preview.releaseSettings));
    await panel.getByTitle('关闭', { exact: true }).click();
    await page.evaluate(() => { preview.releaseSettings(); preview.waitSettings = null; });
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => preview.calls.length), callsBeforeClose);
    await page.locator('#open').click(); await settled();
    for (const field of ['chat', 'script']) {
      await click('重新读取');
      const writes = await count(), calls = await page.evaluate(() => preview.calls.length);
      await page.evaluate(field => { preview[field] += '-changed'; }, field);
      await panel.getByRole('button', { name: '正文吞并', exact: true }).first().click(); await settled();
      assert.equal(await count(), writes);
      assert.equal(await page.evaluate(() => preview.calls.length), calls);
      assert.equal(await page.evaluate(() => preview.modules['cryptLord.domainConsole'].status().stale), true);
    }
    await page.evaluate(() => preview.emit('CHAT_CHANGED'));
    await panel.waitFor({ state: 'hidden' });
    await page.locator('#history').click(); await settled();
    assert.equal(await panel.getByRole('button', { name: '保存到当前楼层', exact: true }).isDisabled(), true);
    const noFallback = await page.evaluate(async () => {
      const ui = preview.modules['cryptLord.domainConsole'], before = preview.flags.writes.length;
      ui.close(true);
      preview.floors.push({ message_id: 3, role: 'user', message: '等待原生回复', data: {} });
      const opened = await ui.open();
      return { opened, writes: preview.flags.writes.length - before };
    });
    assert.deepEqual(noFallback, { opened: false, writes: 0 });
    await page.evaluate(() => preview.modules['cryptLord.domainConsole'].dispose());
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`domain console ${width}: foundation, rename, construction, housing, training, formation, recognition, promotion and boundary chain OK`);
  }
} finally { await browser.close(); }
