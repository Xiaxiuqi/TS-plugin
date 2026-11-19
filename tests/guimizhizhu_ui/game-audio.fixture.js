(() => {
  const state = window.audioPreview = {
    decks: [], plays: [], voices: [], requests: [], rejectPlay: false, failFile: '',
  };
  class PreviewAudio extends EventTarget {
    constructor() { super(); this.paused = true; this.volume = 0; this.src = ''; state.decks.push(this); }
    play() {
      if (state.rejectPlay) return Promise.reject(new DOMException('Requires gesture', 'NotAllowedError'));
      this.paused = false; state.plays.push(this.src); return Promise.resolve();
    }
    pause() { this.paused = true; }
    removeAttribute(name) { if (name === 'src') this.src = ''; }
  }
  window.Audio = PreviewAudio;
  const NativeContext = window.AudioContext;
  window.AudioContext = class extends NativeContext {
    createBufferSource() {
      const source = super.createBufferSource(), start = source.start.bind(source);
      source.start = (...args) => {
        state.voices.push({ time: performance.now(), rate: source.playbackRate.value, source });
        start(...args);
      };
      return source;
    }
  };
  const wave = new ArrayBuffer(44 + 3200), bytes = new DataView(wave);
  const text = (offset, value) => [...value].forEach((char, i) => bytes.setUint8(offset + i, char.charCodeAt(0)));
  text(0, 'RIFF'); bytes.setUint32(4, 3236, true); text(8, 'WAVE'); text(12, 'fmt ');
  bytes.setUint32(16, 16, true); bytes.setUint16(20, 1, true); bytes.setUint16(22, 1, true);
  bytes.setUint32(24, 8000, true); bytes.setUint32(28, 16000, true);
  bytes.setUint16(32, 2, true); bytes.setUint16(34, 16, true);
  text(36, 'data'); bytes.setUint32(40, 3200, true);
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (url, options) => {
    if (!String(url).includes('guimika-domain-assets@main/audio/')) return nativeFetch(url, options);
    state.requests.push(String(url));
    await state.waitFetch?.();
    if (options?.signal.aborted) throw new DOMException('Canceled', 'AbortError');
    return { ok: !String(url).endsWith(state.failFile || '/missing'),
      arrayBuffer: async () => wave.slice(0) };
  };
})();
