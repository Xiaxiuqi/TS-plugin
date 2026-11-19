import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const {chromium} = require('C:/Users/ROG/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({viewport: {width, height: 844}}), errors = [], confirmations = [];
    page.on('pageerror', error => errors.push(error.message));
    let confirm = true;
    page.on('dialog', dialog => {confirmations.push(dialog.message()); return confirm ? dialog.accept() : dialog.dismiss()});
    await page.goto('http://127.0.0.1:8791/tests/guimizhizhu_ui/character-archive.preview.html');
    await page.waitForFunction(() => preview.modules['cryptLord.gameShell']?.status().ready);
    await page.evaluate(() => document.fonts.load('900 14px "Font Awesome 6 Free"'));
    const panel = page.getByRole('dialog', {name: '档案详情'}), status = panel.getByRole('status');
    const task = key => panel.locator(`article[data-key="${key}"]`);
    const waitStatus = text => status.filter({hasText: text}).waitFor();
    const refresh = async () => {await panel.getByRole('button', {name: '重新读取'}).click(); await waitStatus('#2')};
    const remove = key => task(key).getByRole('button');
    await page.locator('#open').click(); await waitStatus('#2');
    assert.deepEqual(await page.evaluate(() => preview.writes), []);
    assert.equal(await panel.locator('.crypt-lord-archive__attributes > .crypt-lord-archive__attribute').count(), 6);
    assert.match(await panel.innerText(), /31 \/ 30|0 \/ 60/);
    assert.match(await task('a.b[0]').innerText(), /前往码头寻找遗失的笔记。\n留意近日的陌生访客。/);
    assert.match(await task('a.b[0]').innerText(), /已完成 · 未领奖/);
    assert.equal(await panel.locator('.crypt-lord-archive__equipment-row').count(), 5);
    assert.equal(await task('html').locator('img').count(), 0);
    assert.equal(await page.evaluate(() => window.archiveUnsafe), undefined);
    assert.ok(await panel.locator('canvas').evaluate(canvas => {
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      return pixels.filter((value, index) => index % 4 === 3 && value > 0).length > 1500;
    }));
    await page.screenshot({path: path.join(os.tmpdir(), `character-archive-${width}-overview.png`)});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const rect = await panel.boundingBox(); assert.ok(rect.x >= 0 && rect.x + rect.width <= width);
    await task('a.b[0]').scrollIntoViewIfNeeded();
    assert.ok(await remove('a.b[0]').locator('i').evaluate(node => getComputedStyle(node, '::before').content.length > 2));
    await page.screenshot({path: path.join(os.tmpdir(), `character-archive-${width}-tasks.png`)});
    await panel.locator('.crypt-lord-archive__traits').scrollIntoViewIfNeeded();
    assert.match(await panel.locator('.crypt-lord-archive__traits').innerText(), /【支柱】神性[\s\S]*保持清醒与克制/);
    assert.match(await panel.locator('.crypt-lord-archive__equipment').innerText(), /杖剑[\s\S]*已装备[\s\S]*封印物 3-0782/);
    assert.match(await panel.locator('.crypt-lord-archive__acting').innerText(), /75%[\s\S]*失控进度[\s\S]*8/);
    await page.screenshot({path: path.join(os.tmpdir(), `character-archive-${width}-details.png`)});
    assert.equal(await panel.locator('main').evaluate(node => node.scrollWidth <= node.clientWidth), true);
    confirm = false; await remove('a.b[0]').click();
    assert.equal(await page.evaluate(() => preview.writes.length), 0);
    confirm = true; await page.evaluate(() => {preview.writeFail = true});
    await remove('a.b[0]').click(); await waitStatus('模拟保存失败');
    assert.equal(await remove('a.b[0]').isEnabled(), false);
    assert.equal(await panel.getByRole('button', {name: '重试保存', exact: true}).isEnabled(), true);
    await task('another').locator('summary').click();
    await panel.getByRole('button', {name: '关闭', exact: true}).click();
    assert.equal(await page.locator('#open').evaluate(node => node === document.activeElement), true);
    await page.locator('#open').click(); await waitStatus('#2');
    assert.equal(await task('another').locator('details').getAttribute('open'), null);
    await page.evaluate(() => {preview.writeFail = false});
    await remove('a.b[0]').click(); await waitStatus('已删除任务');
    assert.equal(await page.evaluate(() => preview.writes.length), 1);
    assert.equal(await task('a.b[0]').count(), 0); assert.equal(await task('another').count(), 1);
    assert.equal(await page.evaluate(() => preview.floors[2].data.stat_data['<User>接受的任务'].$meta.keep), true);
    await panel.getByRole('button', {name: '关闭', exact: true}).click();
    // The native left panel enters the same deletion transaction, not the former direct store writer.
    const left = page.locator('.crypt-lord-game-shell__left');
    await left.getByRole('button', {name: '删除任务「追查失踪的笔记」'}).click(); await waitStatus('已删除任务');
    assert.equal(await task('another').count(), 0); assert.equal(await page.evaluate(() => preview.writes.length), 2);
    assert.equal(await left.getByRole('button', {name: '删除任务「追查失踪的笔记」'}).count(), 0);
    await page.evaluate(async () => {
      preview.floors[2].data = structuredClone(preview.initial[2].data);
      await preview.modules['cryptLord.gameShell'].refresh();
    }); await refresh();
    await panel.locator('main').evaluate(node => {node.scrollTop = 150}); await refresh();
    assert.equal(await panel.locator('main').evaluate(node => node.scrollTop), 150);
    await page.evaluate(() => preview.emit('MESSAGE_UPDATED')); await waitStatus('楼层已更新');
    assert.equal(await remove('a.b[0]').isEnabled(), false); await refresh();
    await page.evaluate(() => preview.hold()); await remove('a.b[0]').click();
    await page.waitForFunction(() => preview.waiting);
    assert.equal(await remove('another').isEnabled(), false);
    assert.equal(await panel.getByRole('button', {name: '重新读取'}).isEnabled(), false);
    const count = await page.evaluate(() => preview.writes.length);
    await page.evaluate(() => {preview.conflict(); preview.release()}); await waitStatus('已变化');
    assert.equal(await page.evaluate(() => preview.writes.length), count);
    assert.equal(await remove('a.b[0]').isEnabled(), false); await refresh();
    await page.evaluate(() => preview.hold()); await remove('a.b[0]').click(); await page.waitForFunction(() => preview.waiting);
    await panel.getByRole('button', {name: '关闭', exact: true}).click();
    await page.locator('#open').click(); await waitStatus('#2');
    await page.evaluate(() => preview.release()); await page.waitForFunction(() => !preview.waiting);
    assert.equal(await page.evaluate(() => preview.writes.length), count); assert.equal(await remove('a.b[0]').isEnabled(), true);
    await page.evaluate(() => {preview.floors.push({message_id:3,role:'user',message:'新回合',data:{}})}); await refresh();
    await waitStatus('历史楼层只读'); assert.equal(await remove('a.b[0]').isEnabled(), false);
    await page.evaluate(() => {preview.floors.pop();preview.floors[2].data.cryptLord={teamBattle:{status:'finished',settled:false}}});
    await refresh(); await waitStatus('结算战斗'); assert.equal(await remove('a.b[0]').isEnabled(), false);
    await page.evaluate(() => {delete preview.floors[2].data.cryptLord}); await refresh();
    await panel.getByRole('button', {name: '关闭', exact: true}).click();
    await page.locator('#history').click(); await waitStatus('历史楼层只读');
    assert.equal(await remove('a.b[0]').isEnabled(), false);
    await panel.getByRole('button', {name: '关闭', exact: true}).click();
    await page.evaluate(() => {preview.readFail=true}); await page.locator('#open').click(); await waitStatus('模拟读取失败');
    assert.equal(await panel.locator('article').count(), 0);
    await page.evaluate(() => {preview.readFail=false}); await refresh();
    const beforeUncertain = await page.evaluate(() => ({writes: preview.writes.length, derivations: preview.derivations}));
    await page.evaluate(() => preview.postFail()); await remove('a.b[0]').click(); await waitStatus('保存状态待核对');
    assert.equal(await task('a.b[0]').count(), 1);
    await panel.getByRole('button', {name: '核对保存', exact: true}).click(); await waitStatus('保存状态待核对');
    assert.deepEqual(await page.evaluate(() => ({writes: preview.writes.length, derivations: preview.derivations})),
      {writes: beforeUncertain.writes + 1, derivations: beforeUncertain.derivations + 1});
    assert.equal(await panel.getByRole('button', {name: '核对保存', exact: true}).evaluate(node =>
      node.scrollWidth <= node.clientWidth &&
      node.getBoundingClientRect().bottom <= node.closest('[role="dialog"]').querySelector('main').getBoundingClientRect().top), true);
    await page.screenshot({path: path.join(os.tmpdir(), `character-archive-${width}-uncertain.png`)});
    confirm = false;
    await panel.getByRole('button', {name: '关闭', exact: true}).click();
    assert.equal(await panel.isVisible(), true);
    await panel.getByRole('button', {name: '重新读取', exact: true}).click();
    assert.equal(await panel.getByRole('button', {name: '核对保存', exact: true}).isEnabled(), true);
    await page.keyboard.press('Escape'); assert.equal(await panel.isVisible(), true);
    confirm = true;
    await page.evaluate(() => preview.recover());
    await panel.getByRole('button', {name: '核对保存', exact: true}).click(); await waitStatus('已删除任务');
    assert.equal(await task('a.b[0]').count(), 0);
    await page.evaluate(() => {
      preview.floors[2].data.stat_data['<User>接受的任务']='损坏字典';
    }); await refresh(); await waitStatus('任务字典格式异常');
    assert.equal(await panel.locator('article').count(), 0);
    await page.evaluate(() => {preview.floors[2].data=structuredClone(preview.initial[2].data)}); await refresh();
    // Changing theme redraws the chart, and dragging/resizing stays within the viewport.
    await panel.locator('main').evaluate(node => {node.scrollTop=0});
    await page.evaluate(() => {
      document.documentElement.style.setProperty('--SmartThemeBlurTintColor','#fafbfd');
      document.documentElement.style.setProperty('--SmartThemeBodyColor','#25282b');
    });
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.crypt-lord-archive')).color === 'rgb(37, 40, 43)');
    if (width === 1280) {
      const bounds = await panel.boundingBox();
      await page.mouse.move(bounds.x + 140, bounds.y + 20); await page.mouse.down();
      await page.mouse.move(bounds.x + 165, bounds.y + 35); await page.mouse.up();
      const moved = await panel.boundingBox(); assert.ok(moved.x > bounds.x);
      await panel.evaluate(node => {node.style.width='620px';node.style.height='680px'});
    }
    await page.screenshot({path: path.join(os.tmpdir(), `character-archive-${width}-light.png`)});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    // A stale left-panel snapshot cannot delete a still-same-name task after a body change.
    await panel.getByRole('button', {name: '关闭', exact: true}).click();
    await page.evaluate(async () => {await preview.modules['cryptLord.gameShell'].refresh();preview.conflict()});
    const previousWrites = await page.evaluate(() => preview.writes.length);
    await left.getByRole('button', {name: '删除任务「追查失踪的笔记」'}).first().click();
    await waitStatus('角色面板来源已变化');
    assert.equal(await page.evaluate(() => preview.writes.length), previousWrites);
    await refresh();
    await page.evaluate(() => preview.hold()); await remove('another').click(); await page.waitForFunction(() => preview.waiting);
    await page.evaluate(() => preview.chatChanged()); await page.evaluate(() => preview.release());
    await page.waitForFunction(() => !preview.waiting); assert.equal(await panel.isVisible(), false);
    assert.equal(await page.evaluate(() => preview.writes.length), previousWrites);
    await page.locator('.crypt-lord-game-shell__trigger').click();
    await page.locator('.crypt-lord-game-shell__menu').getByRole('button', {name: '档案详情', exact: true}).click();
    await waitStatus('#2'); await page.keyboard.press('Escape'); assert.equal(await panel.isVisible(), false);
    assert.equal(await page.locator('#native-input').inputValue(), '保留输入草稿');
    assert.deepEqual(await page.evaluate(() => [preview.floors[0], preview.floors[1]]), await page.evaluate(() => [preview.initial[0], preview.initial[1]]));
    assert.equal(await page.evaluate(() => preview.writes.every(rows => rows.every(row => row.message_id === 2 && !Object.hasOwn(row, 'message')))), true);
    assert.equal(await page.evaluate(() => preview.floors[2].data.otherPlugin.keep), true);
    assert.equal(await page.evaluate(() => preview.floors[2].message.startsWith(preview.initial[2].message)), true);
    assert.ok(confirmations.some(text => text.includes('不可恢复')));
    await page.evaluate(() => {preview.floors[2].data=structuredClone(preview.initial[2].data)});
    await page.locator('#open').click(); await waitStatus('#2');
    const exactCount = await page.evaluate(() => preview.writes.length);
    await page.evaluate(async () => {
      preview.pages[0] = (await preview.modules['cryptLord.hostApi'].getChatMessages('0', {include_swipes:true}))[0];
      preview.pages[0].swipes_data[1].external = true;
    });
    await remove('another').click(); await waitStatus('已变化');
    assert.equal(await page.evaluate(() => preview.writes.length), exactCount);
    await page.evaluate(() => {delete preview.pages[0]}); await refresh();
    for (const args of [['quiet', {}, false], ['quiet_prompt', {}, false],
      ['normal', {options:{quiet_prompt:true}}, false], ['normal', {options:{dryRun:true}}, false],
      ['normal', {dryRun:true}, false], ['normal', {}, true]]) {
      await page.evaluate(args => preview.emit('GENERATION_STARTED', ...args), args);
      assert.equal(await remove('another').isEnabled(), true);
    }
    await page.evaluate(() => preview.hold()); await remove('another').click(); await page.waitForFunction(() => preview.waiting);
    await page.evaluate(async () => {await preview.emit('GENERATION_STARTED', 'normal', {}, false); preview.release()});
    await page.waitForFunction(() => !preview.waiting);
    assert.equal(await remove('another').isEnabled(), false); assert.equal(await page.evaluate(() => preview.writes.length), exactCount);
    await page.evaluate(() => preview.emit('GENERATION_ENDED')); await refresh();
    await page.evaluate(() => {preview.writeLost=true});
    await remove('another').click(); await waitStatus('已核对原生楼层并确认保存');
    assert.equal(await task('another').count(), 0); assert.equal(await page.evaluate(() => preview.writes.length), exactCount + 1);
    await page.evaluate(() => {preview.writeLost=false;preview.floors[2].is_hidden=true});
    await panel.getByRole('button', {name:'重新读取'}).click(); await waitStatus('隐藏');
    assert.equal(await panel.locator('article').count(), 0);
    await page.evaluate(() => {preview.floors[2].is_hidden=false}); await refresh();
    for (const failure of ['writeFail', 'noWrite']) {
      await page.evaluate(failure => {
        preview.floors[2].data = structuredClone(preview.initial[2].data);
        preview[failure] = true;
      }, failure);
      await refresh();
      const before = await page.evaluate(() => ({derivations: preview.derivations, notices: preview.notices.length}));
      await remove('another').click(); await waitStatus('本次结果已保留');
      assert.equal(await remove('a.b[0]').isEnabled(), false);
      await page.evaluate(() => preview.modules['cryptLord.characterArchiveUi'].open(2));
      assert.equal(await panel.getByRole('button', {name: '重试保存', exact: true}).isEnabled(), true);
      await page.evaluate(failure => {preview[failure] = false}, failure);
      await panel.getByRole('button', {name: '重试保存', exact: true}).click(); await waitStatus('已删除任务');
      assert.equal(await task('another').count(), 0);
      assert.deepEqual(await page.evaluate(() => ({derivations: preview.derivations, notices: preview.notices.length})),
        {derivations: before.derivations + 1, notices: before.notices + 1});
    }
    await panel.evaluate(root => {
      const controls=[...root.querySelectorAll('button,input,summary,[tabindex="0"]')]
        .filter(node=>!node.matches(':disabled')&&node.getClientRects().length&&node.checkVisibility());
      controls.at(-1).focus();
    });
    await page.keyboard.press('Tab');
    assert.equal(await panel.getByRole('button', {name:'重新读取'}).evaluate(node=>node===document.activeElement), true);
    for (const boundary of ['chat', 'script', 'document']) {
      await page.evaluate(() => {
        preview.floors[2].data = structuredClone(preview.initial[2].data);
      });
      await refresh();
      const writes = await page.evaluate(() => preview.writes.length);
      await page.evaluate(() => preview.hold());
      await remove('another').click(); await page.waitForFunction(() => preview.waiting);
      await page.evaluate(boundary => {
        if (boundary === 'document') {
          const host = preview.modules['cryptLord.afterNativeHost'], read = host.getHost;
          const replacement = document.implementation.createHTMLDocument('replacement');
          host.getHost = () => ({window, document: replacement});
          preview.restoreSurface = () => {host.getHost = read};
        } else preview[boundary] = `changed-${boundary}`;
        preview.release();
      }, boundary);
      await page.waitForFunction(() => !preview.modules['cryptLord.characterArchiveUi'].status().busy);
      assert.equal(await page.evaluate(() => preview.writes.length), writes);
      assert.equal(await page.evaluate(() => preview.modules['cryptLord.characterArchiveUi'].status().stale), true);
      if (boundary === 'document') {
        assert.equal(await panel.isVisible(), false);
        await page.evaluate(() => {
          preview.restoreSurface();
          return preview.modules['cryptLord.characterArchiveUi'].open(2);
        });
        await waitStatus('#2');
      }
    }
    await refresh();
    await page.evaluate(() => {
      preview.emit('GENERATION_STARTED', 'normal');
      preview.emit('GENERATION_STOPPED');
    });
    assert.equal(await remove('another').isEnabled(), false); await refresh();
    assert.equal(await remove('another').isEnabled(), true);
    await panel.getByRole('button', {name: '关闭', exact: true}).click();
    await page.evaluate(() => {
      preview.floors.push({message_id: 3, role: 'user', message: '待回复', data: {}});
      return preview.modules['cryptLord.characterArchiveUi'].open();
    });
    await waitStatus('没有角色档案');
    assert.equal(await panel.locator('article').count(), 0);
    await page.evaluate(() => preview.floors.pop());
    await page.evaluate(() => {preview.modules['cryptLord.characterArchiveUi'].dispose();preview.modules['cryptLord.characterPanelState'].dispose()});
    assert.equal(await panel.count(), 0); assert.deepEqual(errors, []);
    console.log(`${width}px complete character archive workflow passed`); await page.close();
  }
} finally {await browser.close()}
