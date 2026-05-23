(() => {
  const safe = fn => {
    try { return fn(); } catch (error) { return `__ERROR__ ${error?.message || error}`; }
  };

  const host = (() => {
    const candidates = [window];
    safe(() => { if (window.parent && !candidates.includes(window.parent)) candidates.push(window.parent); });
    safe(() => { if (window.top && !candidates.includes(window.top)) candidates.push(window.top); });
    return candidates
      .map(win => ({
        win,
        score: safe(() =>
          (win.JJKSStoryUiManager?.test ? 40 : 0) +
          (win.StoryRegexUI ? 30 : 0) +
          (win.TavernHelper ? 20 : 0) +
          (win.document?.querySelector?.('.mes[mesid]') ? 10 : 0),
        ),
      }))
      .filter(item => typeof item.score === 'number')
      .sort((a, b) => b.score - a.score)[0]?.win || window;
  })();

  const doc = host.document || document;
  const ui = host.StoryRegexUI || window.StoryRegexUI || null;
  const manager = host.JJKSStoryUiManager?.test || window.JJKSStoryUiManager?.test || null;
  const diagnosis = safe(() => manager?.diagnose?.()) || null;

  const allScriptUrls = Array.from(doc.scripts || []).map(script => script.src || script.dataset?.storyUiScript || '').filter(Boolean);
  const allStyleUrls = Array.from(doc.querySelectorAll('link[rel="stylesheet"]') || []).map(link => link.href || link.dataset?.storyUiCss || '').filter(Boolean);
  const storyUrls = [...allScriptUrls, ...allStyleUrls].filter(url => /story_regex_ui_test/.test(url));
  const versionBuckets = storyUrls.reduce((acc, url) => {
    const version = new URL(url, location.href).searchParams.get('v') || '(no-v)';
    acc[version] = (acc[version] || 0) + 1;
    return acc;
  }, {});

  const getRaw = messageId => safe(() => {
    const fn = host.TavernHelper?.getChatMessages || host.getChatMessages || window.TavernHelper?.getChatMessages || window.getChatMessages;
    return fn?.(messageId)?.[0]?.message || '';
  }) || '';

  const getDisplayed = messageId => safe(() => {
    const fn = host.TavernHelper?.retrieveDisplayedMessage || host.retrieveDisplayedMessage || window.TavernHelper?.retrieveDisplayedMessage || window.retrieveDisplayedMessage;
    return fn?.(messageId)?.[0] || doc.querySelector(`.mes[mesid="${messageId}"] .mes_text, .mes[mesid="${messageId}"] .custom-mes_text`);
  });

  const oneLine = value => String(value || '').replace(/\s+/g, ' ').trim();
  const textOf = node => oneLine(node?.innerText || node?.textContent || '');
  const hasStoryRawHeader = value => /<!--\s*End of The ECoT\s*-->|风格锚定|剧情锚定|写作指导|前文回顾/.test(String(value || ''));
  const markers = {
    story: /<story_driver>|━━\s*1[.．、]\s*全域锚定|STORY ENGINE/i,
    bp: /<bp_panel>|【BP战力雷达】|BP战力雷达/i,
    wlog: /<wlog\b|【世界主线】|世界运行报告/i,
    vu: /<UpdateVariable>|<JSONPatch>|变量更新|"op"\s*:/i,
    mvu: /<StatusPlaceHolderImpl\/>|世界状态|GLOBAL ANCHOR/i,
  };

  const renderStates = diagnosis?.最近楼层渲染状态 || [];
  const targetIds = renderStates
    .filter(item => Array.isArray(item.mounted) && item.mounted.length > 0)
    .map(item => Number(item.messageId))
    .filter(Number.isFinite);
  const fallbackIds = Array.from(doc.querySelectorAll('.mes[mesid]')).map(node => Number(node.getAttribute('mesid'))).filter(Number.isFinite).slice(-8);
  const ids = targetIds.length ? targetIds : fallbackIds;

  const analyzeModuleHost = (messageId, hostNode) => {
    const moduleId = hostNode.getAttribute('data-story-ui-module') || '';
    const root = hostNode.querySelector('.story-ui-root') || hostNode.firstElementChild;
    const dataset = root?.dataset || {};
    const rawAttrs = Object.entries(dataset)
      .filter(([key]) => /Raw$/i.test(key) || /raw/i.test(key))
      .reduce((acc, [key, value]) => {
        acc[key] = {
          length: String(value || '').length,
          hasWholeStoryHeader: hasStoryRawHeader(value),
          hasModuleOwnOpen: moduleId === 'bp-panel' ? /<bp_panel>/i.test(value) : moduleId === 'world-log' ? /<wlog\b/i.test(value) : moduleId === 'story-engine' ? /<story_driver>/i.test(value) : moduleId === 'variable-update' ? /<UpdateVariable>/i.test(value) : false,
          preview: oneLine(value).slice(0, 300),
        };
        return acc;
      }, {});

    const text = textOf(hostNode);
    const parent = hostNode.parentElement;
    const parentText = textOf(parent);
    const selfHead = text.slice(0, 160);
    const indexInParent = selfHead ? parentText.indexOf(selfHead) : -1;
    return {
      moduleId,
      textLength: text.length,
      textHead: text.slice(0, 400),
      textHasWholeStoryHeader: hasStoryRawHeader(text),
      markerHitsInside: Object.fromEntries(Object.entries(markers).map(([key, pattern]) => [key, pattern.test(text)])),
      rawAttrs,
      parentTag: parent?.tagName || '',
      parentClass: parent?.className || '',
      beforeMount: indexInParent >= 0 ? parentText.slice(Math.max(0, indexInParent - 500), indexInParent) : parentText.slice(0, 500),
      afterMount: indexInParent >= 0 ? parentText.slice(indexInParent + text.length, indexInParent + text.length + 500) : parentText.slice(-500),
    };
  };

  const messages = ids.map(messageId => {
    const messageRoot = doc.querySelector(`.mes[mesid="${messageId}"]`);
    const displayed = getDisplayed(messageId);
    const raw = getRaw(messageId);
    const displayedText = textOf(displayed);
    const mounts = Array.from(messageRoot?.querySelectorAll?.('[data-story-ui-raw-mount="true"]') || []);
    const hiddens = Array.from(messageRoot?.querySelectorAll?.('[data-story-ui-hidden-source="true"]') || []);
    const state = renderStates.find(item => Number(item.messageId) === messageId) || null;
    return {
      messageId,
      rawLength: String(raw).length,
      rawHasWholeStoryHeader: hasStoryRawHeader(raw),
      rawMarkerHits: Object.fromEntries(Object.entries(markers).map(([key, pattern]) => [key, pattern.test(raw)])),
      displayedLength: displayedText.length,
      displayedHasWholeStoryHeader: hasStoryRawHeader(displayedText),
      displayedMarkerHits: Object.fromEntries(Object.entries(markers).map(([key, pattern]) => [key, pattern.test(displayedText)])),
      stateDetails: state?.details || [],
      mounted: state?.mounted || [],
      avoided: state?.avoided || [],
      mountCount: mounts.length,
      hiddenCount: hiddens.length,
      hiddenSummaries: hiddens.map(node => ({
        moduleId: node.getAttribute('data-story-ui-module') || '',
        textLength: textOf(node).length,
        textHead: textOf(node).slice(0, 300),
        anchor: node.getAttribute('data-story-ui-anchor-preview') || '',
      })),
      moduleHosts: mounts.map(node => analyzeModuleHost(messageId, node)),
    };
  });

  const result = {
    coatStage: 'Associated Thoughts - browser fact collection only; no fix guessed here',
    expectedVersion: 'test-20260513-module-content-v3',
    versionBuckets,
    allTestResourceUrls: storyUrls,
    managerVersion: diagnosis?.入口版本 || '',
    loaderStatus: diagnosis?.加载器状态 || '',
    registryModules: ui?.registry?.list?.({ includeDisabled: true })?.map(module => ({
      id: module.id,
      version: module.version,
      enabled: module.enabled !== false,
      priority: module.priority,
    })) || [],
    messages,
  };

  console.log('[JJKS Story UI V3 Rootcause Diagnose]', result);
  console.log(JSON.stringify(result, null, 2));
  return result;
})();
