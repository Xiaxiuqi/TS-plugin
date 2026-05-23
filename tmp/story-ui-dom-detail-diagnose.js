(() => {
  const host = (() => {
    const candidates = [window];
    try { if (window.parent && !candidates.includes(window.parent)) candidates.push(window.parent); } catch (error) { void error; }
    try { if (window.top && !candidates.includes(window.top)) candidates.push(window.top); } catch (error) { void error; }
    return candidates
      .map(win => {
        let score = 0;
        try {
          if (win.JJKSStoryUiManager?.test) score += 30;
          if (win.StoryRegexUI) score += 20;
          if (win.document?.querySelector?.('.mes[mesid]')) score += 10;
        } catch (error) {
          void error;
          score = -1;
        }
        return { win, score };
      })
      .sort((a, b) => b.score - a.score)[0]?.win || window;
  })();
  const doc = host.document || document;
  const manager = host.JJKSStoryUiManager?.test || window.JJKSStoryUiManager?.test;
  const diagnosis = manager?.diagnose?.();
  const targetIds = (diagnosis?.最近楼层渲染状态 || [])
    .filter(item => Array.isArray(item.mounted) && item.mounted.length > 0)
    .map(item => Number(item.messageId))
    .filter(Number.isFinite);
  const ids = targetIds.length ? targetIds : Array.from(doc.querySelectorAll('.mes[mesid]')).map(node => Number(node.getAttribute('mesid'))).filter(Number.isFinite).slice(-5);

  const markerPattern = /<story_driver>|<bp_panel>|<wlog\b|<UpdateVariable>|<StatusPlaceHolderImpl\/>|<status_relationship>|<\/story_driver>|<\/bp_panel>|<\/wlog>|<\/UpdateVariable>/i;
  const getDisplayed = messageId => {
    try {
      const fn = host.TavernHelper?.retrieveDisplayedMessage || host.retrieveDisplayedMessage || window.TavernHelper?.retrieveDisplayedMessage || window.retrieveDisplayedMessage;
      return fn?.(messageId)?.[0] || doc.querySelector(`.mes[mesid="${messageId}"] .mes_text, .mes[mesid="${messageId}"] .custom-mes_text`);
    } catch (error) {
      void error;
      return doc.querySelector(`.mes[mesid="${messageId}"] .mes_text, .mes[mesid="${messageId}"] .custom-mes_text`);
    }
  };
  const textOf = node => String(node?.innerText || node?.textContent || '').replace(/\s+/g, ' ').trim();
  const aroundText = node => {
    const parent = node?.parentElement;
    if (!parent) return {};
    const all = textOf(parent);
    const self = textOf(node);
    const index = self ? all.indexOf(self.slice(0, 80)) : -1;
    return {
      parentTag: parent.tagName,
      parentClass: parent.className || '',
      before: index >= 0 ? all.slice(Math.max(0, index - 240), index) : all.slice(0, 240),
      self: self.slice(0, 240),
      after: index >= 0 ? all.slice(index + self.length, index + self.length + 240) : all.slice(-240),
    };
  };

  const results = ids.map(messageId => {
    const root = doc.querySelector(`.mes[mesid="${messageId}"]`);
    const displayed = getDisplayed(messageId);
    const displayedText = textOf(displayed);
    const mounts = Array.from(root?.querySelectorAll?.('[data-story-ui-raw-mount="true"]') || []);
    const hiddens = Array.from(root?.querySelectorAll?.('[data-story-ui-hidden-source="true"]') || []);
    const details = diagnosis?.最近楼层渲染状态?.find(item => Number(item.messageId) === messageId)?.details || [];
    return {
      messageId,
      displayedHasMarker: markerPattern.test(displayedText),
      displayedMarker: displayedText.match(markerPattern)?.[0] || '',
      displayedMarkerIndex: displayedText.search(markerPattern),
      displayedHead: displayedText.slice(0, 500),
      displayedTail: displayedText.slice(-500),
      details,
      mounts: mounts.map((node, index) => ({
        index,
        module: node.getAttribute('data-story-ui-module'),
        around: aroundText(node),
        htmlHead: node.outerHTML.slice(0, 600),
      })),
      hiddens: hiddens.map((node, index) => ({
        index,
        module: node.getAttribute('data-story-ui-module'),
        anchor: node.getAttribute('data-story-ui-anchor-preview'),
        text: textOf(node).slice(0, 500),
        around: aroundText(node),
      })),
    };
  });

  console.log('[JJKS Story UI DOM Detail]', results);
  console.log(JSON.stringify(results, null, 2));
  return results;
})();
