// BP面板诊断脚本 v2 - 在浏览器控制台中运行

(function diagnoseBP() {
  console.log('=== BP 面板诊断 v2 ===');

  const ui = window.StoryRegexUI;
  if (!ui) { console.error('\u274c StoryRegexUI 未加载'); return; }
  console.log('\u2705 StoryRegexUI 已加载');

  const registry = ui.registry;
  if (!registry) { console.error('\u274c registry 未初始化'); return; }

  const bpModule = registry.find('bp-panel-newvars');
  if (!bpModule) {
    console.error('\u274c bp-panel-newvars 未注册');
    console.log('已注册模块:', registry.list({ includeDisabled: true }).map(m => `${m.id} [${m.enabled === false ? 'OFF' : 'ON'}]`));
    return;
  }
  console.log('\u2705 bp-panel-newvars 已注册, enabled:', bpModule.enabled);
  console.log('  BLOCK:', JSON.stringify(bpModule.block));
  console.log('  version:', bpModule.version);
  console.log('  renderContent:', typeof bpModule.renderContent);

  // 直接测试 renderContent
  const testRawText = `<bp_panel>
<bp_panel_player>
名称: 测试角色
最终BP: 100
战力等级: 四级
</bp_panel_player>
<bp_panel_enemy>
名称: 测试敌人
最终BP: 500
战力等级: 特级
</bp_panel_enemy>
</bp_panel>`;

  const content = testRawText.replace(/<bp_panel>([\s\S]*?)<\/bp_panel>/i, '$1').trim();
  console.log('\n--- 测试 renderContent ---');
  console.log('content (前100字):', content.slice(0, 100));

  try {
    const result = bpModule.renderContent(content, { rawText: testRawText });
    console.log('renderContent 返回:', result);
    if (result) {
      console.log('\u2705 返回了 DOM 节点');
      console.log('  tagName:', result.tagName);
      console.log('  className:', result.className);
      console.log('  innerHTML (前200字):', result.innerHTML?.slice(0, 200));
    } else {
      console.error('\u274c renderContent 返回 null!');
    }
  } catch (e) {
    console.error('\u274c renderContent 抛出异常:', e);
  }

  // 检查实际消息
  console.log('\n--- 检查实际消息 ---');
  const messages = document.querySelectorAll('.mes[mesid]');
  const lastFew = Array.from(messages).slice(-5);
  lastFew.forEach(el => {
    const mesid = Number(el.getAttribute('mesid'));
    let rawText = '';
    try {
      const chatMsg = window.getChatMessages?.(mesid)?.[0];
      rawText = chatMsg?.message || chatMsg?.mes || '';
    } catch (e) { return; }

    if (rawText.includes('bp_panel')) {
      console.log(`\nmesid=${mesid}: 发现 bp_panel`);
      console.log('  包含 <bp_panel>:', rawText.includes('<bp_panel>'));
      console.log('  包含 </bp_panel>:', rawText.includes('</bp_panel>'));
      console.log('  包含 <bp_panel_player>:', rawText.includes('<bp_panel_player>'));
      console.log('  包含 </bp_panel_player>:', rawText.includes('</bp_panel_player>'));
      console.log('  包含 <bp_panel_enemy>:', rawText.includes('<bp_panel_enemy>'));
      console.log('  包含 </bp_panel_enemy>:', rawText.includes('</bp_panel_enemy>'));

      // 测试 BLOCK 正则
      const blockRegex = /<bp_panel>([\s\S]*?)<\/bp_panel>/i;
      const blockMatch = rawText.match(blockRegex);
      console.log('  BLOCK正则匹配:', blockMatch ? '\u2705' : '\u274c');
      if (blockMatch) {
        console.log('  匹配内容长度:', blockMatch[1].length);
      }

      // 直接调用 renderContent
      if (blockMatch) {
        try {
          const node = bpModule.renderContent(blockMatch[1], { rawText });
          console.log('  renderContent结果:', node ? '\u2705 有DOM节点' : '\u274c null');
          if (node) {
            console.log('  节点class:', node.className);
          }
        } catch(e) {
          console.error('  renderContent异常:', e);
        }
      }
    }
  });

  console.log('\n=== 诊断结束 ===');
})();
