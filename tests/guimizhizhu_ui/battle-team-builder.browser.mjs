import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/ROG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/team-battle.preview.html?teamBuilder=1');
    await page.waitForFunction(() => window.previewModulesReady &&
      document.title === '原版多人战斗组队准备' && preview.data?.stat_data);
    await page.locator('#open').click();
    await page.getByRole('searchbox', { name: '搜索组队角色' }).waitFor();
    const snapshot = () => page.evaluate(() => ({ data: preview.data, writes: preview.writes,
      requests: preview.requests, sends: preview.sends, inputs: preview.inputEvents }));
    const initial = await snapshot();
    const command = async operation => {
      const writes = (await snapshot()).writes;
      await operation();
      try { await page.waitForFunction(n => preview.writes === n + 1, writes, { timeout: 4000 }); }
      catch (error) { throw Error(await page.locator('body').getAttribute('data-notice'), { cause: error }); }
    };
    const reopen = async (preparation = true) => {
      await page.locator('.crypt-lord-game-shell__dialog-close').last().click();
      await page.evaluate(() => { preview.data = JSON.parse(JSON.stringify(preview.data)); });
      await page.locator('#open').click();
      if (preparation) await page.getByRole('searchbox', { name: '搜索组队角色' }).waitFor();
      else await page.locator('select[aria-label="战斗行动"]').waitFor();
    };
    const sideMembers = side => page.locator(`.crypt-lord-game-shell__team-members[data-side="${side}"] .crypt-lord-game-shell__team-member`);
    assert.equal(await page.getByRole('button', { name: '开始多人战斗', exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole('checkbox', { name: '敌方 NPC 阵亡者', exact: true }).isDisabled(), true);
    assert.equal(await page.locator('.crypt-lord-game-shell__team-candidate').nth(0).getAttribute('data-source'), 'player');
    assert.equal(await page.locator('.crypt-lord-game-shell__team-candidate').nth(1).getAttribute('data-name'), '远方记录');
    const search = page.getByRole('searchbox', { name: '搜索组队角色' });
    await search.fill('远方记录');
    assert.equal(await page.locator('.crypt-lord-game-shell__team-candidate').count(), 1);
    assert.ok((await page.locator('.crypt-lord-game-shell__team-stats').innerText()).includes('活力'));
    assert.ok((await page.locator('.crypt-lord-game-shell__team-stats').innerText()).includes('运气'));
    await command(() => page.getByRole('button', { name: '标记重要 贝克兰德东区巡查员的超长显示名称', exact: true }).click());
    let now = await snapshot();
    assert.equal(now.data.npc_data.远方记录.isImportant, false);
    assert.equal(now.data.stat_data.人物关系列表.远方记录.isImportant, false);
    await page.getByRole('searchbox', { name: '搜索组队角色' }).fill('影一');
    assert.equal(await page.locator('.crypt-lord-game-shell__team-candidate').count(), 2);
    await page.getByRole('checkbox', { name: '我方 分身 影一', exact: true }).check();
    await page.getByRole('checkbox', { name: '敌方 NPC 影一', exact: true }).check();
    assert.equal(await sideMembers('allyTeam').count(), 2);
    assert.equal(await sideMembers('enemyTeam').count(), 1);
    await page.getByRole('checkbox', { name: '我方 NPC 影一', exact: true }).check();
    assert.equal(await sideMembers('enemyTeam').count(), 0);
    assert.equal(await sideMembers('allyTeam').count(), 3);
    await page.getByRole('button', { name: '移除我方 影一', exact: true }).last().click();
    assert.equal(await sideMembers('allyTeam').count(), 2);
    await page.getByRole('searchbox', { name: '搜索组队角色' }).fill('');
    await page.getByRole('checkbox', { name: '敌方 NPC 敌甲', exact: true }).check();
    assert.equal((await snapshot()).writes, initial.writes + 1, 'Draft changes and search never write.');
    await command(() => page.getByRole('button', { name: '保存编队', exact: true }).click());
    now = await snapshot();
    assert.equal(now.data.cryptLord.teamComposition.allyTeam[1].dataSource, 'clone');
    assert.equal(now.data.cryptLord.teamComposition.enemyTeam[0].name, '敌甲');
    await reopen();
    assert.equal(await page.getByRole('checkbox', { name: '我方 分身 影一', exact: true }).isChecked(), true);
    assert.equal(await page.getByRole('checkbox', { name: '敌方 NPC 敌甲', exact: true }).isChecked(), true);
    assert.deepEqual(await snapshot(), now);
    await page.getByRole('button', { name: '保存编队', exact: true }).click();
    await page.waitForTimeout(120);
    assert.deepEqual(await snapshot(), now, 'Saving identical configuration does not write again.');
    await command(() => page.getByRole('button', { name: '刷新序列能力', exact: true }).click());
    assert.ok((await snapshot()).data.stat_data.序列能力列表['序列4-寄生者']
      .some(row => row.名称 === '编队同步能力'));
    assert.equal((await snapshot()).requests, 0, 'Refreshing abilities reads the pool, not a model.');

    await page.evaluate(() => {
      const data = preview.data;
      data.cryptLord.teamComposition.enemyTeam = [{ name: '影一', dataSource: 'npc' }];
      preview.data = data;
    });
    const conflict = await snapshot();
    await page.getByRole('button', { name: '保存编队', exact: true }).click();
    await page.waitForFunction(() => /编队发生变化|战斗末楼、正文或变量已变化/.test(document.body.dataset.notice || ''));
    assert.deepEqual(await snapshot(), conflict, 'Concurrent floor configuration is preserved.');
    await page.getByRole('button', { name: '重新读取编队', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('input[aria-label="敌方 NPC 影一"]')?.checked);
    assert.equal((await snapshot()).writes, conflict.writes);

    await page.evaluate(() => {
      const data = preview.data;
      delete data.stat_data.$专属玩法.偷盗者途径.分身玩法.分身列表.影一;
      preview.data = data;
    });
    await page.getByRole('button', { name: '重新读取编队', exact: true }).click();
    await page.locator('.crypt-lord-game-shell__team-unavailable').waitFor();
    assert.equal(await page.getByRole('button', { name: '开始多人战斗', exact: true }).isDisabled(), true);
    await page.getByRole('button', { name: '移除我方 影一', exact: true }).click();
    await command(() => page.getByRole('button', { name: '保存编队', exact: true }).click());
    const legacy = JSON.stringify({ allyTeam: [{ name: '偶一', dataSource: 'puppet' }],
      enemyTeam: [{ name: '敌甲', dataSource: 'npc' }] });
    await page.evaluate(raw => localStorage.setItem('battle-team-composition', raw), legacy);
    const beforeImport = await snapshot();
    await page.getByRole('button', { name: '导入原版旧编队', exact: true }).click();
    assert.equal(await page.getByRole('checkbox', { name: '我方 秘偶 偶一', exact: true }).isChecked(), true);
    assert.deepEqual(await snapshot(), beforeImport, 'Import is a draft until saved.');
    await command(() => page.getByRole('button', { name: '保存编队', exact: true }).click());
    assert.equal(await page.evaluate(() => localStorage.getItem('battle-team-composition')), legacy);
    page.once('dialog', dialog => dialog.dismiss());
    const cancelled = await snapshot();
    await page.getByRole('button', { name: '清空编队', exact: true }).click();
    assert.deepEqual(await snapshot(), cancelled);
    page.once('dialog', dialog => dialog.accept());
    await command(() => page.getByRole('button', { name: '清空编队', exact: true }).click());
    assert.equal(await sideMembers('allyTeam').count(), 1);
    assert.equal(await sideMembers('enemyTeam').count(), 0);
    await page.getByRole('checkbox', { name: '敌方 NPC 敌甲', exact: true }).check();
    await page.locator('.crypt-lord-game-shell__team-builder').evaluate(node => node.scrollIntoView({ block: 'start' }));
    await page.locator('.crypt-lord-game-shell__team-pool').evaluate(node => { node.scrollTop = 0; });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await page.locator('.crypt-lord-game-shell__dialog-body').evaluate(node =>
      node.scrollWidth > node.clientWidth + 1), false);
    await command(() => page.getByRole('button', { name: '开始多人战斗', exact: true }).click());
    now = await snapshot();
    assert.equal(now.data.cryptLord.teamBattle.status, 'active');
    assert.equal(now.data.cryptLord.teamComposition.enemyTeam[0].name, '敌甲');
    assert.equal(now.requests, 1);
    assert.equal(now.sends, 0); assert.equal(now.inputs, 0);
    await reopen(false);
    assert.deepEqual(await snapshot(), now);
    assert.equal(await page.getByRole('searchbox', { name: '搜索组队角色' }).count(), 0);
    await page.waitForFunction(() => document.querySelector('select[aria-label="战斗行动"]'));
    const action = page.locator('select[aria-label="战斗行动"]');
    const terminal = await action.evaluate(node => [...node.options].find(row => row.text.includes('终结远击'))?.value);
    assert.ok(terminal);
    await action.selectOption(terminal);
    await page.locator('.crypt-lord-game-shell__battle-actions select').last().selectOption('敌甲');
    await command(() => page.getByRole('button', { name: '执行', exact: true }).click());
    assert.equal((await snapshot()).data.cryptLord.teamBattle.status, 'finished');
    assert.equal(await page.getByRole('button', { name: '开始多人战斗', exact: true }).isDisabled(), true);
    await command(() => page.getByRole('button', { name: '确认战报与经验', exact: true }).click());
    const settled = await snapshot();
    assert.equal(settled.data.cryptLord.teamBattle.settled, true);
    assert.equal(settled.data.cryptLord.teamComposition.enemyTeam[0].name, '敌甲');
    assert.ok(await page.locator('.crypt-lord-game-shell__team-unavailable').count(),
      'Defeated roster members remain in saved composition with an unavailable reason.');
    assert.equal(settled.requests, 1); assert.equal(settled.sends, 0);
    assert.deepEqual(errors, []);
    console.log(`Team builder ${width}px: search/pin, same-name sources, save/reopen, refresh/conflict, legacy/clear, actual battle and settlement passed.`);
    await page.close();
  }
} finally { await browser.close(); }
