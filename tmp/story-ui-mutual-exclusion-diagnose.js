(() => {
  const safe = fn => {
    try {
      return fn();
    } catch (error) {
      return `__ERROR__ ${error?.message || error}`;
    }
  };

  const host = (() => {
    const candidates = [window];
    safe(() => {
      if (window.parent && !candidates.includes(window.parent)) candidates.push(window.parent);
    });
    safe(() => {
      if (window.top && !candidates.includes(window.top)) candidates.push(window.top);
    });
    return (
      candidates
        .map(win => ({
          win,
          score: safe(
            () =>
              (win.JJKSStoryUiManager?.test ? 40 : 0) +
              (win.StoryRegexUI ? 30 : 0) +
              (win.TavernHelper ? 20 : 0) +
              (win.document?.querySelector?.('.mes[mesid]') ? 10 : 0),
          ),
        }))
        .filter(item => typeof item.score === 'number')
        .sort((a, b) => b.score - a.score)[0]?.win || window
    );
  })();

  const doc = host.document || document;
  const ui = host.StoryRegexUI || window.StoryRegexUI || null;
  const manager = host.JJKSStoryUiManager?.test || window.JJKSStoryUiManager?.test || null;
  const diagnosis = safe(() => manager?.diagnose?.()) || null;

  const getRaw = messageId =>
    safe(() => {
      const fn =
        host.TavernHelper?.getChatMessages ||
        host.getChatMessages ||
        window.TavernHelper?.getChatMessages ||
        window.getChatMessages;
      return fn?.(messageId)?.[0]?.message || '';
    }) || '';

  const getDisplayed = messageId =>
    safe(() => {
      const fn =
        host.TavernHelper?.retrieveDisplayedMessage ||
        host.retrieveDisplayedMessage ||
        window.TavernHelper?.retrieveDisplayedMessage ||
        window.retrieveDisplayedMessage;
      return fn?.(messageId)?.[0] || doc.querySelector(`.mes[mesid="${messageId}"] .mes_text, .mes[mesid="${messageId}"] .custom-mes_text`);
    });

  const textOf = node => String(node?.innerText || node?.textContent || '').replace(/\s+/g, ' ').trim();
  const has = (pattern, value) => pattern.test(String(value || ''));

  const moduleMarkers = {
    'story-engine': {
      raw: /<story_driver>/i,
      native: /STORY ENGINE|━━\s*1[.．、]\s*全域锚定|全域锚定/i,
    },
    'bp-panel': {
      raw: /<bp_panel>/i,
      native: /BP战力雷达|【BP战力雷达】|扫描状态|已扫描目标/i,
    },
    'world-log': {
      raw: /<wlog\b/i,
      native: /世界运行报告|【世界主线】|Time passed:/i,
    },
    'variable-update': {
      raw: /<UpdateVariable>|<JSONPatch>/i,
      native: /变量更新|"op"\s*:|JSONPatch/i,
    },
    'mvu-status': {
      raw: /<StatusPlaceHolderImpl\/>/i,
      native: /世界状态|GLOBAL ANCHOR|个人状态档案/i,
    },
  };

  const scriptUrls = Array.from(doc.scripts || [])
    .map(script => script.src || script.dataset?.storyUiScript || '')
    .filter(url => /story_regex_ui_test/.test(url));
  const styleUrls = Array.from(doc.querySelectorAll('link[rel="stylesheet"]') || [])
    .map(link => link.href || link.dataset?.storyUiCss || '')
    .filter(url => /story_regex_ui_test/.test(url));

  const ids = Array.from(doc.querySelectorAll('.mes[mesid]'))
    .map(node => Number(node.getAttribute('mesid')))
    .filter(Number.isFinite)
    .slice(-8);

  const messages = ids.map(messageId => {
    const root = doc.querySelector(`.mes[mesid="${messageId}"]`);
    const raw = String(getRaw(messageId) || '');
    const displayed = getDisplayed(messageId);
    const displayedText = textOf(displayed);
    const mounts = Array.from(root?.querySelectorAll?.('[data-story-ui-raw-mount="true"]') || []);
    const modules = Object.fromEntries(
      Object.entries(moduleMarkers).map(([moduleId, marker]) => {
        const scriptMounts = mounts.filter(node => node.getAttribute('data-story-ui-module') === moduleId);
        const rawPresent = has(marker.raw, raw);
        const nativePresent = has(marker.native, displayedText);
        const scriptPresent = scriptMounts.length > 0;
        let status = 'absent';
        if (rawPresent && nativePresent && scriptPresent) status = 'duplicate-or-conflict';
        else if (rawPresent && nativePresent && !scriptPresent) status = 'native-only';
        else if (rawPresent && !nativePresent && scriptPresent) status = 'script-only';
        else if (rawPresent && !nativePresent && !scriptPresent) status = 'raw-present-but-not-displayed-by-native-or-script';
        return [
          moduleId,
          {
            rawPresent,
            nativePresent,
            scriptPresent,
            scriptMountCount: scriptMounts.length,
            status,
            scriptTextHead: scriptMounts.map(node => textOf(node).slice(0, 180)),
          },
        ];
      }),
    );
    return {
      messageId,
      rawLength: raw.length,
      displayedLength: displayedText.length,
      mountCount: mounts.length,
      mountedModules: mounts.map(node => node.getAttribute('data-story-ui-module')),
      modules,
      displayedHead: displayedText.slice(0, 300),
      displayedTail: displayedText.slice(-300),
    };
  });

  const result = {
    purpose: 'diagnose current stable test build mutual exclusion between native regex display and script UI display',
    location: String(host.location?.href || location.href),
    managerDiagnosis: diagnosis,
    storyRegexUiReady: Boolean(ui),
    scannerReady: Boolean(ui?.scanner),
    registryModules:
      ui?.registry?.list?.({ includeDisabled: true })?.map(module => ({
        id: module.id,
        version: module.version,
        enabled: module.enabled !== false,
        priority: module.priority,
      })) || [],
    scriptUrls,
    styleUrls,
    messages,
  };

  console.log('[JJKS Story UI Mutual Exclusion Diagnose]', result);
  console.log(JSON.stringify(result, null, 2));
  return result;
})();
