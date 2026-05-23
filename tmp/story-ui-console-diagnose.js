(() => {
  const pickWindow = () => {
    const candidates = [];
    const push = win => {
      try {
        if (win && !candidates.includes(win)) candidates.push(win);
      } catch (error) {
        void error;
      }
    };
    push(window);
    try { push(window.parent); } catch (error) { void error; }
    try { push(window.top); } catch (error) { void error; }
    return candidates
      .map(win => {
        let score = 0;
        try {
          if (win.StoryRegexUI) score += 20;
          if (win.JJKSStoryUiManager) score += 20;
          if (win.TavernHelper) score += 10;
          if (win.document?.querySelector?.('.mes[mesid]')) score += 10;
          if (win.document?.querySelector?.('#send_textarea')) score += 5;
        } catch {
          score = -1;
        }
        return { win, score };
      })
      .sort((a, b) => b.score - a.score)[0]?.win || window;
  };

  const host = pickWindow();
  const doc = host.document || document;
  const ui = host.StoryRegexUI || window.StoryRegexUI || null;
  const manager = host.JJKSStoryUiManager?.test || window.JJKSStoryUiManager?.test || null;
  const scripts = Array.from(doc.scripts || [])
    .map(script => ({
      src: script.src || '',
      storyUiScript: script.dataset?.storyUiScript || '',
      loader: script.dataset?.jjksStoryUiLoader || '',
      env: script.dataset?.jjksStoryUiEnv || '',
    }))
    .filter(item => /story_regex_ui_(test|prod)/.test(item.src) || /story_regex_ui_(test|prod)/.test(item.storyUiScript) || item.loader);
  const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]') || [])
    .map(link => ({ href: link.href || '', storyUiCss: link.dataset?.storyUiCss || '' }))
    .filter(item => /story_regex_ui_(test|prod)/.test(item.href) || /story_regex_ui_(test|prod)/.test(item.storyUiCss));
  const modules = ui?.registry?.list?.({ includeDisabled: true })?.map(module => ({
    id: module.id,
    version: module.version,
    enabled: module.enabled !== false,
    priority: module.priority,
    block: module.block || null,
    singleTag: module.singleTag || '',
    display: module.display || null,
  })) || [];

  const getRaw = messageId => {
    try {
      const fn = host.TavernHelper?.getChatMessages || host.getChatMessages || window.TavernHelper?.getChatMessages || window.getChatMessages;
      return fn?.(messageId)?.[0]?.message || '';
    } catch (error) {
      return `__RAW_READ_ERROR__ ${error?.message || error}`;
    }
  };

  const getDisplayed = messageId => {
    try {
      const fn = host.TavernHelper?.retrieveDisplayedMessage || host.retrieveDisplayedMessage || window.TavernHelper?.retrieveDisplayedMessage || window.retrieveDisplayedMessage;
      return fn?.(messageId)?.[0] || doc.querySelector(`.mes[mesid="${messageId}"] .mes_text, .mes[mesid="${messageId}"] .custom-mes_text`);
    } catch {
      return doc.querySelector(`.mes[mesid="${messageId}"] .mes_text, .mes[mesid="${messageId}"] .custom-mes_text`);
    }
  };

  const messageNodes = Array.from(doc.querySelectorAll('.mes[mesid]'));
  const recentIds = messageNodes.map(node => Number(node.getAttribute('mesid'))).filter(Number.isFinite).slice(-5);
  const markerPattern = /<story_driver>|<bp_panel>|<wlog\b|<UpdateVariable>|<StatusPlaceHolderImpl\/>|<status_relationship>/i;
  const messages = recentIds.map(messageId => {
    const raw = getRaw(messageId);
    const displayedNode = getDisplayed(messageId);
    const displayedText = displayedNode?.innerText || displayedNode?.textContent || '';
    const messageRoot = doc.querySelector(`.mes[mesid="${messageId}"]`);
    return {
      messageId,
      rawLength: raw.length,
      rawHasMarkers: markerPattern.test(raw),
      rawMarkerPreview: (raw.match(markerPattern)?.[0] || ''),
      displayedLength: displayedText.length,
      displayedHasMarkers: markerPattern.test(displayedText),
      displayedMarkerPreview: (displayedText.match(markerPattern)?.[0] || ''),
      mountCount: messageRoot?.querySelectorAll?.('[data-story-ui-raw-mount="true"]')?.length || 0,
      hiddenCount: messageRoot?.querySelectorAll?.('[data-story-ui-hidden-source="true"]')?.length || 0,
      modulesMounted: Array.from(messageRoot?.querySelectorAll?.('[data-story-ui-raw-mount="true"]') || []).map(node => node.getAttribute('data-story-ui-module')),
      firstMountHtml: (messageRoot?.querySelector?.('[data-story-ui-raw-mount="true"]')?.outerHTML || '').slice(0, 500),
    };
  });

  const diagnosis = typeof manager?.diagnose === 'function' ? manager.diagnose() : null;
  const result = {
    location: String(host.location?.href || location.href),
    hostIsWindow: host === window,
    hasStoryRegexUI: Boolean(ui),
    hasScanner: Boolean(ui?.scanner),
    hasRegistry: Boolean(ui?.registry),
    hasTheme: Boolean(ui?.theme),
    hasManagerTest: Boolean(manager),
    managerDiagnosis: diagnosis,
    loadedScripts: scripts,
    loadedStyles: links,
    modules,
    recentMessages: messages,
    documentDataset: {
      jjksStoryUiHost: doc.documentElement?.dataset?.jjksStoryUiHost || '',
      jjksStoryUiHostLocation: doc.documentElement?.dataset?.jjksStoryUiHostLocation || '',
      jjksStoryUiHostEqualsWindow: doc.documentElement?.dataset?.jjksStoryUiHostEqualsWindow || '',
    },
  };

  console.log('[JJKS Story UI Diagnose]', result);
  console.log(JSON.stringify(result, null, 2));
  return result;
})();
