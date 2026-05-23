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
              (win.JJKSStoryUiManager?.test ? 50 : 0) +
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
      return (
        fn?.(messageId)?.[0] ||
        doc.querySelector(`.mes[mesid="${messageId}"] .mes_text, .mes[mesid="${messageId}"] .custom-mes_text`)
      );
    });

  const normalizeText = value => String(value || '').replace(/\s+/g, ' ').trim();
  const textOf = node => normalizeText(node?.innerText || node?.textContent || '');
  const htmlOf = node => String(node?.innerHTML || '');
  const has = (pattern, value) => pattern.test(String(value || ''));
  const compactClass = node => String(node?.className || '').replace(/\s+/g, ' ').trim();
  const selectorOf = node => {
    if (!node || !node.nodeType || node.nodeType !== 1) return '';
    const parts = [];
    let current = node;
    while (current && current.nodeType === 1 && parts.length < 5) {
      const tag = current.tagName?.toLowerCase?.() || 'node';
      const id = current.id ? `#${current.id}` : '';
      const classes = compactClass(current)
        .split(' ')
        .filter(Boolean)
        .slice(0, 3)
        .map(name => `.${name}`)
        .join('');
      const mesid = current.getAttribute?.('mesid') ? `[mesid="${current.getAttribute('mesid')}"]` : '';
      parts.unshift(`${tag}${id}${classes}${mesid}`);
      current = current.parentElement;
    }
    return parts.join(' > ');
  };

  const moduleMarkers = {
    'story-engine': {
      raw: /<story_driver>/i,
      rawClose: /<\/story_driver>/i,
      native: /STORY ENGINE|━━\s*1[.．、]\s*全域锚定|全域锚定|最终修正|NPC驱动/i,
      nativeNeedles: ['STORY ENGINE', '全域锚定', '最终修正', 'NPC驱动'],
    },
    'bp-panel': {
      raw: /<bp_panel>/i,
      rawClose: /<\/bp_panel>/i,
      native: /BP战力雷达|【BP战力雷达】|扫描状态|已扫描目标|总BP|BP总值/i,
      nativeNeedles: ['BP战力雷达', '扫描状态', '已扫描目标', '总BP', 'BP总值'],
    },
    'world-log': {
      raw: /<wlog\b/i,
      rawClose: /<\/wlog>/i,
      native: /世界运行报告|【世界主线】|Time passed:|当前地点|近期事件/i,
      nativeNeedles: ['世界运行报告', '世界主线', 'Time passed:', '当前地点', '近期事件'],
    },
    'variable-update': {
      raw: /<UpdateVariable>|<JSONPatch>/i,
      rawClose: /<\/UpdateVariable>|<\/JSONPatch>/i,
      native: /变量更新|JSONPatch|"op"\s*:|replace|add|remove/i,
      nativeNeedles: ['变量更新', 'JSONPatch', '"op"', 'replace', 'add', 'remove'],
    },
    'relation-status': {
      raw: /<status_relationship>/i,
      rawClose: /<\/status_relationship>/i,
      native: /好感|关系|亲密|信赖|羁绊/i,
      nativeNeedles: ['好感', '关系', '亲密', '信赖', '羁绊'],
    },
    'mvu-status': {
      raw: /<StatusPlaceHolderImpl\/>/i,
      rawClose: /<StatusPlaceHolderImpl\/>/i,
      native: /世界状态|GLOBAL ANCHOR|个人状态档案|当前任务|行囊/i,
      nativeNeedles: ['世界状态', 'GLOBAL ANCHOR', '个人状态档案', '当前任务', '行囊'],
    },
    'bp-panel-newvars': {
      raw: /<bp_panel>/i,
      rawClose: /<\/bp_panel>/i,
      native: /BP战力雷达|总BP|HP|咒力|反转|熔断/i,
      nativeNeedles: ['BP战力雷达', '总BP', 'HP', '咒力', '反转', '熔断'],
    },
    'mvu-status-newvars': {
      raw: /<StatusPlaceHolderImpl\/>/i,
      rawClose: /<StatusPlaceHolderImpl\/>/i,
      native: /世界状态|GLOBAL ANCHOR|个人状态档案|当前任务|行囊/i,
      nativeNeedles: ['世界状态', 'GLOBAL ANCHOR', '个人状态档案', '当前任务', '行囊'],
    },
  };

  const findEvidenceNodes = (root, marker) => {
    const result = [];
    if (!root || !marker) return result;
    const candidates = Array.from(root.querySelectorAll('*')).filter(node => {
      if (node.closest?.('[data-story-ui-raw-mount="true"]')) return false;
      const txt = textOf(node);
      if (!txt || txt.length > 3000) return false;
      return marker.nativeNeedles.some(needle => txt.includes(needle));
    });
    const ranked = candidates
      .map(node => {
        const txt = textOf(node);
        const childHitCount = Array.from(node.children || []).filter(child => marker.nativeNeedles.some(needle => textOf(child).includes(needle))).length;
        return { node, score: txt.length + childHitCount * 500 };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);

    ranked.forEach(({ node }) => {
      const parent = node.parentElement;
      result.push({
        tag: node.tagName?.toLowerCase?.() || '',
        id: node.id || '',
        className: compactClass(node),
        selector: selectorOf(node),
        textHead: textOf(node).slice(0, 260),
        outerHtmlHead: String(node.outerHTML || '').slice(0, 520),
        parent: parent
          ? {
              tag: parent.tagName?.toLowerCase?.() || '',
              id: parent.id || '',
              className: compactClass(parent),
              selector: selectorOf(parent),
              textHead: textOf(parent).slice(0, 220),
            }
          : null,
        previousSiblingText: textOf(node.previousElementSibling).slice(0, 160),
        nextSiblingText: textOf(node.nextElementSibling).slice(0, 160),
      });
    });
    return result;
  };

  const scriptUrls = Array.from(doc.scripts || [])
    .map(script => script.src || script.dataset?.storyUiScript || '')
    .filter(url => /story_regex_ui_(test|prod)/.test(url));
  const styleUrls = Array.from(doc.querySelectorAll('link[rel="stylesheet"]') || [])
    .map(link => link.href || link.dataset?.storyUiCss || '')
    .filter(url => /story_regex_ui_(test|prod)/.test(url));

  const registryModules =
    ui?.registry?.list?.({ includeDisabled: true })?.map(module => ({
      id: module.id,
      version: module.version,
      enabled: module.enabled !== false,
      mode: ui?.registry?.getMode?.(module.id) || (module.enabled === false ? 'off' : 'script'),
      priority: module.priority,
      hasBlock: Boolean(module.block?.open && module.block?.close),
      singleTag: module.singleTag || '',
    })) || [];

  const ids = Array.from(doc.querySelectorAll('.mes[mesid]'))
    .map(node => Number(node.getAttribute('mesid')))
    .filter(Number.isFinite)
    .slice(-10);

  const messages = ids.map(messageId => {
    const root = doc.querySelector(`.mes[mesid="${messageId}"]`);
    const raw = String(getRaw(messageId) || '');
    const displayed = getDisplayed(messageId);
    const displayedText = textOf(displayed);
    const displayedHtml = htmlOf(displayed);
    const mounts = Array.from(root?.querySelectorAll?.('[data-story-ui-raw-mount="true"]') || []);
    const hiddenSources = Array.from(root?.querySelectorAll?.('[data-story-ui-hidden-source="true"]') || []);
    const messageDataset = displayed?.dataset ? { ...displayed.dataset } : {};

    const modules = Object.fromEntries(
      Object.entries(moduleMarkers).map(([moduleId, marker]) => {
        const mode = ui?.registry?.getMode?.(moduleId) || registryModules.find(item => item.id === moduleId)?.mode || 'unknown';
        const scriptMounts = mounts.filter(node => node.getAttribute('data-story-ui-module') === moduleId);
        const rawPresent = has(marker.raw, raw);
        const rawClosePresent = has(marker.rawClose, raw);
        const nativePresent = has(marker.native, displayedText) || has(marker.native, displayedHtml);
        const scriptPresent = scriptMounts.length > 0;
        const expectedCurrentBehavior =
          mode === 'script'
            ? 'raw-token script takeover: script UI should display and native module regex should not display for same module'
            : mode === 'native'
              ? 'native pass-through: native regex display may appear and script UI should not display'
              : mode === 'off'
                ? 'off: script UI should not display; native depends on retained raw/off policy'
                : 'unknown mode';
        let observedClass = 'absent';
        if (rawPresent && nativePresent && scriptPresent) observedClass = 'native-and-script-both-present';
        else if (rawPresent && nativePresent && !scriptPresent) observedClass = 'native-only';
        else if (rawPresent && !nativePresent && scriptPresent) observedClass = 'script-only';
        else if (rawPresent && !nativePresent && !scriptPresent) observedClass = 'raw-only-or-not-visible';
        const modeMatchesImplementation =
          (mode === 'script' && scriptPresent && !nativePresent) ||
          (mode === 'native' && !scriptPresent) ||
          (mode === 'off' && !scriptPresent) ||
          (!rawPresent && observedClass === 'absent');
        return [
          moduleId,
          {
            mode,
            rawPresent,
            rawClosePresent,
            nativePresent,
            scriptPresent,
            scriptMountCount: scriptMounts.length,
            observedClass,
            expectedCurrentBehavior,
            modeMatchesImplementation,
            afterNativeOverlayEvidence: rawPresent && nativePresent && scriptPresent,
            scriptTextHead: scriptMounts.map(node => textOf(node).slice(0, 220)),
            scriptSelectors: scriptMounts.map(selectorOf),
            nativeEvidenceNodes: nativePresent ? findEvidenceNodes(displayed, marker) : [],
          },
        ];
      }),
    );

    return {
      messageId,
      rawLength: raw.length,
      displayedLength: displayedText.length,
      mountCount: mounts.length,
      hiddenSourceCount: hiddenSources.length,
      mountedModules: mounts.map(node => node.getAttribute('data-story-ui-module')),
      displayedDataset: messageDataset,
      scriptSkipEvidence: {
        storyUiHasScriptModeMatch: messageDataset.storyUiHasScriptModeMatch || '',
        storyUiMatchedModes: messageDataset.storyUiMatchedModes || '',
        skippedBecauseNativeOrOffOnly:
          messageDataset.storyUiHasScriptModeMatch === 'false' ||
          Object.values(modules).some(item => item.rawPresent && item.mode !== 'script' && !item.scriptPresent),
      },
      modules,
      displayedHead: displayedText.slice(0, 360),
      displayedTail: displayedText.slice(-360),
      displayedHtmlHead: displayedHtml.slice(0, 600),
    };
  });

  const statusCounts = messages.reduce((acc, message) => {
    Object.values(message.modules).forEach(item => {
      acc[item.observedClass] = (acc[item.observedClass] || 0) + 1;
    });
    return acc;
  }, {});

  const interpretation = {
    possibleSourcesConsidered: [
      '资源未加载或加载到 prod/test 错环境',
      'registry 模式状态未持久化或读取错误',
      'raw message 内没有对应模块标签',
      'formatAsDisplayedMessage 对 script token 隔离失败导致原生正则仍处理模块 raw',
      'mountModulesForMessage 因没有 script 模式 match 主动跳过脚本挂载',
      'refreshOneMessage 重载后恢复了 native baseline，但当前 mode 仍要求 native pass-through',
      '用户期望的是 native 后再叠加脚本增强，即 after-native overlay；当前三态没有该模式',
    ],
    likelySourcesToValidate: [
      '如果 mode=native 且 rawPresent/nativePresent=true/scriptPresent=false，则这是当前 native pass-through 设计内结果，不是挂载 bug。',
      '如果用户要求 nativePresent=true 且 scriptPresent=true，还要求脚本在原生 DOM 上定位/替换/增强，则缺失的是 after-native overlay/enhance-native 第四模式。',
    ],
    mutuallyExclusiveLevels: {
      A_scriptTakeover: 'mode=script：raw-token 接管。脚本替换 raw 模块块，原生同模块正则不应显示。',
      B_nativePassThrough: 'mode=native：原生链路通过。原生正则显示，脚本同模块 UI 不应显示。',
      C_afterNativeOverlay: '新需求：原生先显示，脚本再基于原生 DOM 定位、替换或增强。当前三态没有实现。',
    },
  };

  const result = {
    purpose: 'diagnose native pass-through vs script takeover vs missing after-native overlay mode',
    generatedAt: new Date().toISOString(),
    location: String(host.location?.href || location.href),
    storyRegexUiReady: Boolean(ui),
    scannerReady: Boolean(ui?.scanner),
    managerReady: Boolean(manager),
    managerDiagnosis: diagnosis,
    registryModules,
    scriptUrls,
    styleUrls,
    statusCounts,
    messages,
    interpretation,
  };

  console.log('[JJKS Story UI After-Native Diagnose]', result);
  console.log(JSON.stringify(result, null, 2));
  return result;
})();
