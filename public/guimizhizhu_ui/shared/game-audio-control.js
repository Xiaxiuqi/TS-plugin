(() => {
  'use strict';
  const KEY = 'cryptLord.gameAudioControl';
  const root = window.cryptLord;
  const contract = root.contract;
  const modules = root.__stage1Modules;
  if (modules[KEY]) { contract.initializeGlobal(KEY, modules[KEY]); return; }
  const audio = modules['cryptLord.gameAudio'];
  if (!audio) throw new Error(`[${KEY}] game-audio 尚未加载`);
  const documents = new Map();
  const synchronizers = new WeakMap();
  const unsubscribe = audio.subscribe(() => {
    documents.forEach((_cleanup, doc) => doc.querySelectorAll('.crypt-lord-audio').forEach(node =>
      synchronizers.get(node)?.()));
  });
  function bindDocument(doc) {
    if (documents.has(doc)) return;
    const dismiss = event => {
      doc.querySelectorAll('.crypt-lord-audio').forEach(holder => {
        if (event.type === 'keydown' ? event.key !== 'Escape' || !holder.contains(doc.activeElement)
          : holder.contains(event.target)) return;
        const panel = holder.querySelector('.crypt-lord-audio__panel');
        if (panel.hidden) return;
        panel.hidden = true;
        const toggle = holder.querySelector('button');
        toggle.setAttribute('aria-expanded', 'false');
        if (event.type === 'keydown') { event.preventDefault(); event.stopPropagation(); toggle.focus(); }
      });
    };
    doc.addEventListener('pointerdown', dismiss, true);
    doc.addEventListener('keydown', dismiss, true);
    documents.set(doc, () => {
      doc.removeEventListener('pointerdown', dismiss, true);
      doc.removeEventListener('keydown', dismiss, true);
    });
  }

  function create(doc, scope) {
    bindDocument(doc);
    const holder = doc.createElement('div');
    holder.className = 'crypt-lord-audio';
    holder.dataset.audioScope = scope;
    holder.addEventListener('pointerdown', event => event.stopPropagation());
    const toggle = doc.createElement('button');
    toggle.type = 'button';
    toggle.className = 'crypt-lord-audio__toggle';
    toggle.title = '音量设置';
    toggle.setAttribute('aria-label', scope === 'duel' ? '个人战斗音量' : '领地战争音量');
    toggle.setAttribute('aria-expanded', 'false');
    const icon = doc.createElement('i');
    icon.setAttribute('aria-hidden', 'true');
    toggle.appendChild(icon);
    const panel = doc.createElement('div');
    panel.className = 'crypt-lord-audio__panel';
    panel.hidden = true;
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', '音量设置');
    const controls = {};
    for (const [key, label] of [['bgm', '音乐'], ['sfx', '音效']]) {
      const row = doc.createElement('label');
      row.className = 'crypt-lord-audio__row';
      const title = doc.createElement('span');
      title.textContent = label;
      const slider = doc.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '100';
      slider.setAttribute('aria-label', label);
      const value = doc.createElement('output');
      row.append(title, slider, value);
      panel.appendChild(row);
      slider.addEventListener('input', () => {
        audio.set({ [key]: Number(slider.value) / 100 }, scope);
        value.textContent = slider.value;
      });
      controls[key] = [slider, value];
    }
    const mute = doc.createElement('label');
    mute.className = 'crypt-lord-audio__row';
    const checkbox = doc.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.setAttribute('aria-label', '静音');
    checkbox.addEventListener('change', () => {
      audio.set({ muted: checkbox.checked }, scope);
      sync();
    });
    mute.append(checkbox, doc.createTextNode('静音'));
    panel.appendChild(mute);
    holder.append(toggle, panel);
    toggle.addEventListener('click', event => {
      event.stopPropagation();
      panel.hidden = !panel.hidden;
      toggle.setAttribute('aria-expanded', String(!panel.hidden));
      if (!panel.hidden) {
        panel.style.left = '';
        panel.style.right = '';
        panel.style.top = '';
        panel.style.bottom = '';
        const rect = panel.getBoundingClientRect();
        if (rect.left < 8) {
          panel.style.left = '0';
          panel.style.right = 'auto';
        } else if (rect.right > doc.defaultView.innerWidth - 8) {
          panel.style.right = '0';
          panel.style.left = 'auto';
        }
        const scrollBody = holder.closest('.crypt-lord-domain-console__body, .crypt-lord-game-shell__dialog-body');
        if (scrollBody && panel.getBoundingClientRect().bottom > scrollBody.getBoundingClientRect().bottom - 8) {
          panel.style.top = 'auto';
          panel.style.bottom = '100%';
        }
        audio.unlock();
      }
    });
    const sync = () => {
      const config = audio.get(scope);
      icon.className = `fa-solid ${config.muted ? 'fa-volume-xmark' : 'fa-volume-high'}`;
      checkbox.checked = config.muted;
      for (const key of ['bgm', 'sfx']) {
        const amount = Math.round(config[key] * 100);
        if (doc.activeElement !== controls[key][0]) controls[key][0].value = String(amount);
        controls[key][1].textContent = String(amount);
      }
    };
    synchronizers.set(holder, sync);
    sync();
    return holder;
  }
  const api = Object.freeze({
    status() { return Object.freeze({ key: KEY, ready: true }); },
    create,
    dispose() {
      unsubscribe();
      documents.forEach(cleanup => cleanup());
      documents.clear();
      contract.releaseGlobal(KEY, api);
      if (modules[KEY] === api) delete modules[KEY];
    },
  });
  modules[KEY] = api;
  contract.initializeGlobal(KEY, api);
})();
