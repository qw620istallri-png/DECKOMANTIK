(() => {
  'use strict';

  const CUES = Object.freeze({
    opening: { src: 'assets/sounds/sound_booster_opening.mp3', group: 'opening', gain: .72, cooldown: 250 },
    common: { src: 'assets/sounds/son_normal.mp3', group: 'rarity', gain: .48, cooldown: 80 },
    foil: { src: 'assets/sounds/son_foil.mp3', group: 'rarity', gain: .54, cooldown: 80 },
    silver: { src: 'assets/sounds/son_silver.mp3', group: 'rarity', gain: .56, cooldown: 90 },
    gold: { src: 'assets/sounds/son_gold.mp3', group: 'rarity', gain: .60, cooldown: 100 },
    galaxy: { src: 'assets/sounds/son_galaxy.mp3', group: 'rarity', gain: .64, cooldown: 140 },
    void: { src: 'assets/sounds/son_void.mp3', group: 'rarity', gain: .68, cooldown: 160 },
    glitter: { src: 'assets/sounds/son_glitter.mp3', group: 'glitter', gain: .30, cooldown: 90 }
  });
  const GROUP_LIMITS = Object.freeze({ opening: 1, rarity: 2, glitter: 2 });
  const MAX_VOICES = 6;
  const templates = new Map();
  const voices = new Set();
  const lastPlayedAt = new Map();
  let masterVolume = .65;
  let preloaded = false;

  const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
  const now = () => globalThis.performance?.now?.() ?? Date.now();

  function templateFor(cueId) {
    if (templates.has(cueId)) return templates.get(cueId);
    const cue = CUES[cueId];
    if (!cue || typeof Audio === 'undefined') return null;
    const audio = new Audio(cue.src);
    audio.preload = 'auto';
    audio.playsInline = true;
    templates.set(cueId, audio);
    return audio;
  }

  function preload() {
    if (preloaded) return;
    preloaded = true;
    Object.keys(CUES).forEach(cueId => {
      const audio = templateFor(cueId);
      try { audio?.load(); } catch (_) {}
    });
  }

  function activeVoices(group) {
    return [...voices].filter(voice => !voice.fading && (!group || voice.cue.group === group));
  }

  function rebalance() {
    const active = activeVoices();
    const headroom = 1 / Math.sqrt(Math.max(1, active.length));
    active.forEach(voice => {
      voice.audio.volume = clamp(masterVolume * voice.cue.gain * headroom);
    });
  }

  function finishVoice(voice) {
    if (!voices.delete(voice)) return;
    clearInterval(voice.fadeTimer);
    voice.audio.onended = null;
    voice.audio.onerror = null;
    try { voice.audio.pause(); } catch (_) {}
    rebalance();
  }

  function fadeVoice(voice, duration = 90) {
    if (!voice || voice.fading) return;
    voice.fading = true;
    const started = now();
    const initialVolume = voice.audio.volume;
    voice.fadeTimer = setInterval(() => {
      const progress = Math.min(1, (now() - started) / duration);
      voice.audio.volume = clamp(initialVolume * (1 - progress));
      if (progress >= 1) finishVoice(voice);
    }, 16);
  }

  function makeRoom(group) {
    const groupLimit = GROUP_LIMITS[group] || MAX_VOICES;
    while (activeVoices(group).length >= groupLimit) fadeVoice(activeVoices(group)[0]);
    while (activeVoices().length >= MAX_VOICES) fadeVoice(activeVoices()[0]);
  }

  function play(cueId) {
    const cue = CUES[cueId];
    if (!cue || masterVolume <= 0) return false;
    const timestamp = now();
    if (timestamp - (lastPlayedAt.get(cueId) ?? -Infinity) < cue.cooldown) return false;
    const template = templateFor(cueId);
    if (!template) return false;
    lastPlayedAt.set(cueId, timestamp);
    makeRoom(cue.group);
    const audio = template.cloneNode(true);
    audio.preload = 'auto';
    audio.playsInline = true;
    const voice = { audio, cue, cueId, startedAt: timestamp, fading: false, fadeTimer: null };
    audio.onended = () => finishVoice(voice);
    audio.onerror = () => finishVoice(voice);
    voices.add(voice);
    rebalance();
    try {
      const playback = audio.play();
      playback?.catch?.(() => finishVoice(voice));
    } catch (_) {
      finishVoice(voice);
      return false;
    }
    return true;
  }

  function playRarity(rarityId) {
    const rarity = String(rarityId || 'common');
    const base = rarity.replace(/-glitter$/, '');
    const played = play(CUES[base] ? base : 'common');
    if (rarity.endsWith('-glitter')) play('glitter');
    return played;
  }

  function setVolume(value) {
    masterVolume = clamp(value);
    rebalance();
  }

  function fadeAll(duration = 120) {
    activeVoices().forEach(voice => fadeVoice(voice, duration));
  }

  globalThis.DECKOMANTIK_AUDIO = Object.freeze({
    preload,
    playOpening: () => play('opening'),
    playRarity,
    setVolume,
    getVolume: () => masterVolume,
    fadeAll
  });
})();
