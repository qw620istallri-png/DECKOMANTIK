(() => {
  "use strict";

  const cards = [...(globalThis.DECKOMANTIK_CARDS || [])].sort((a, b) => Number(a.collectionNumber) - Number(b.collectionNumber));
  const STORAGE_KEY = "deckomantik-foil-lab-v1";
  const RARITY_LABELS = {
    foil: "Foil", silver: "Argent", gold: "Or", galaxy: "Galaxie", void: "Néant",
    "common-glitter": "Normale scintillante", "foil-glitter": "Foil scintillant", "silver-glitter": "Argent scintillant", "gold-glitter": "Or scintillant"
  };
  const BLEND_MODES = ["color-dodge", "screen", "plus-lighter", "soft-light", "overlay", "hard-light", "difference"];

  const PARAMETERS = {
    baseOpacity: { label: "Opacité", css: "--base-opacity", min: 0, max: 1, step: .01 },
    baseBrightness: { label: "Luminosité", css: "--base-brightness", min: .1, max: 2.5, step: .01 },
    baseContrast: { label: "Contraste", css: "--base-contrast", min: .1, max: 3, step: .01 },
    baseSaturation: { label: "Saturation", css: "--base-saturation", min: 0, max: 3, step: .01 },
    effectOpacity: { label: "Opacité", css: "--effect-opacity", min: 0, max: 1, step: .01 },
    effectBrightness: { label: "Luminosité", css: "--effect-brightness", min: .1, max: 2.5, step: .01 },
    effectContrast: { label: "Contraste", css: "--effect-contrast", min: .1, max: 3, step: .01 },
    effectSaturation: { label: "Saturation", css: "--effect-saturation", min: 0, max: 3.5, step: .01 },
    patternScale: { label: "Échelle du motif", css: "--pattern-scale", unit: "%", min: 50, max: 350, step: 1 },
    textureScale: { label: "Échelle texture", css: "--texture-scale", unit: "%", min: 10, max: 400, step: 1 },
    grainScale: { label: "Échelle du grain", css: "--grain-scale", unit: "%", min: 5, max: 120, step: 1 },
    angle: { label: "Angle", css: "--angle", unit: "deg", min: 0, max: 360, step: 1 },
    shineWidth: { label: "Largeur du reflet", css: "--shine-width", unit: "%", min: 10, max: 140, step: 1 },
    shineHeight: { label: "Hauteur du reflet", css: "--shine-height", unit: "%", min: 5, max: 100, step: 1 },
    maskCenter: { label: "Masque au centre", css: "--mask-center", min: 0, max: 1, step: .01 },
    maskMid: { label: "Masque intermédiaire", css: "--mask-mid", min: 0, max: 1, step: .01 },
    maskFade: { label: "Étendue du masque", css: "--mask-fade", unit: "%", min: 55, max: 120, step: 1 },
    glowSize: { label: "Taille du halo", css: "--glow-size", unit: "px", min: 0, max: 160, step: 1 },
    glowOpacity: { label: "Intensité du halo", css: "--glow-opacity", unit: "%", min: 0, max: 100, step: 1 },
    spotlightOpacity: { label: "Opacité du spot", css: "--spotlight-opacity", min: 0, max: 1, step: .01 },
    spotlightSize: { label: "Taille du spot", css: "--spotlight-size", unit: "px", min: 10, max: 240, step: 1 },
    parallax: { label: "Parallaxe", min: 0, max: 3, step: .05 },
    tilt: { label: "Inclinaison 3D", min: 0, max: 30, step: .5 },
    animationSpeed: { label: "Durée animation", css: "--animation-speed", unit: "s", min: 1, max: 30, step: .25 },
    beamWidth: { label: "Largeur du faisceau", css: "--beam-width", unit: "%", min: 1, max: 30, step: .5 },
    glitterOpacity: { label: "Opacité glitter", css: "--glitter-opacity", min: 0, max: 1, step: .01 },
    glitterScale: { label: "Échelle glitter", css: "--glitter-scale", unit: "%", min: 25, max: 250, step: 1 },
    glitterBrightness: { label: "Luminosité glitter", css: "--glitter-brightness", min: .2, max: 3, step: .01 },
    glitterContrast: { label: "Contraste glitter", css: "--glitter-contrast", min: .2, max: 3, step: .01 },
    glitterSpeed: { label: "Durée glitter", css: "--glitter-speed", unit: "s", min: .5, max: 15, step: .25 },
    impactDelay: { label: "Délai avant impact", css: "--impact-delay", unit: "s", min: 0, max: 4, step: .05 },
    burstDuration: { label: "Durée du burst", css: "--burst-duration", unit: "s", min: .2, max: 6, step: .05 },
    particleDuration: { label: "Durée particules", css: "--particle-duration", unit: "s", min: .2, max: 7, step: .05 },
    shockDuration: { label: "Durée onde de choc", css: "--shock-duration", unit: "s", min: .2, max: 5, step: .05 },
    impactDuration: { label: "Durée rayons impact", css: "--impact-duration", unit: "s", min: .2, max: 5, step: .05 },
    backDelay: { label: "Délai VFX arrière", css: "--back-delay", unit: "s", min: 0, max: 4, step: .05 },
    backDuration: { label: "Durée VFX arrière", css: "--back-duration", unit: "s", min: .2, max: 5, step: .05 },
    impactAlpha: { label: "Intensité impact", css: "--impact-alpha", min: 0, max: 1.5, step: .01 },
    burstScale: { label: "Expansion du burst", css: "--burst-scale", min: .5, max: 3.5, step: .05 },
    shockScale: { label: "Expansion onde", css: "--shock-scale", min: 1, max: 7, step: .1 },
    frontParticleCount: { label: "Particules avant", min: 0, max: 64, step: 1 },
    frontParticleSize: { label: "Taille particules avant", css: "--front-particle-size", unit: "px", min: 1, max: 24, step: .5 },
    frontParticleDistance: { label: "Dispersion avant", css: "--front-particle-distance", unit: "px", min: 40, max: 700, step: 5 },
    backParticleCount: { label: "Particules arrière", min: 0, max: 48, step: 1 },
    backParticleSize: { label: "Taille particules arrière", css: "--back-particle-size", unit: "px", min: 2, max: 60, step: 1 },
    backParticleDistance: { label: "Dispersion arrière", css: "--back-particle-distance", unit: "px", min: 80, max: 1000, step: 10 },
    impactRayCount: { label: "Rayons d’impact", min: 0, max: 36, step: 1 },
    preludeDuration: { label: "Durée des 6 rayons", css: "--prelude-duration", unit: "s", min: .3, max: 5, step: .05 },
    flashDuration: { label: "Durée du flash", css: "--flash-duration", unit: "s", min: .3, max: 5, step: .05 },
    preludeBeamWidth: { label: "Épaisseur des rayons", css: "--prelude-beam-width", unit: "px", min: 2, max: 50, step: 1 },
    preludeBeamGlow: { label: "Halo des rayons", css: "--prelude-beam-glow", unit: "px", min: 0, max: 100, step: 2 },
    preludeRotation: { label: "Rotation des rayons", css: "--prelude-rotation", unit: "deg", min: 0, max: 180, step: 1 },
    screenFlashOpacity: { label: "Flash écran", css: "--screen-flash-opacity", min: 0, max: 1, step: .01 },
    cardFlashOpacity: { label: "Flash carte", css: "--card-flash-opacity", min: 0, max: 1, step: .01 },
    revealGlitterCount: { label: "Particules glitter reveal", min: 0, max: 180, step: 1 },
    revealGlitterDistance: { label: "Dispersion glitter reveal", css: "--reveal-glitter-distance", unit: "px", min: 80, max: 900, step: 10 },
    revealGlitterDuration: { label: "Durée glitter reveal", css: "--reveal-glitter-duration", unit: "s", min: .3, max: 7, step: .05 }
  };

  const GROUPS = [
    { id: "base", title: "Couche de fond", params: ["baseOpacity", "baseBrightness", "baseContrast", "baseSaturation"] },
    { id: "main", title: "Couche holographique", params: ["effectOpacity", "effectBrightness", "effectContrast", "effectSaturation"] },
    { id: "texture", title: "Motifs, textures et masque", params: ["patternScale", "textureScale", "grainScale", "angle", "shineWidth", "shineHeight", "maskCenter", "maskMid", "maskFade", "beamWidth"] },
    { id: "light", title: "Lumière et mouvement", params: ["glowSize", "glowOpacity", "spotlightOpacity", "spotlightSize", "parallax", "tilt", "animationSpeed"] },
    { id: "glitter", title: "Glitter sur la carte", params: ["glitterOpacity", "glitterScale", "glitterBrightness", "glitterContrast", "glitterSpeed"] },
    { id: "reveal", title: "Reveal · impact et timing", params: ["impactDelay", "burstDuration", "particleDuration", "shockDuration", "impactDuration", "backDelay", "backDuration", "impactAlpha", "burstScale", "shockScale"] },
    { id: "particles", title: "Reveal · particules et rayons", params: ["frontParticleCount", "frontParticleSize", "frontParticleDistance", "backParticleCount", "backParticleSize", "backParticleDistance", "impactRayCount"] },
    { id: "prelude", title: "Reveal · flash et 6 rayons", params: ["preludeDuration", "flashDuration", "preludeBeamWidth", "preludeBeamGlow", "preludeRotation", "screenFlashOpacity", "cardFlashOpacity"] },
    { id: "glitterReveal", title: "Reveal · pluie de glitter", params: ["revealGlitterCount", "revealGlitterDistance", "revealGlitterDuration"] }
  ];

  const BASE_DEFAULTS = {
    baseOpacity: .24, baseBrightness: 1, baseContrast: 1, baseSaturation: 1,
    effectOpacity: 1, effectBrightness: .55, effectContrast: 1.1, effectSaturation: 1.05,
    patternScale: 150, textureScale: 55, grainScale: 26, angle: 115, shineWidth: 58, shineHeight: 24,
    maskCenter: 1, maskMid: .78, maskFade: 94, glowSize: 30, glowOpacity: 50,
    spotlightOpacity: .45, spotlightSize: 65, parallax: 1.4, tilt: 14, animationSpeed: 10, beamWidth: 8,
    glitterOpacity: .7, glitterScale: 100, glitterBrightness: 1.05, glitterContrast: 1.3, glitterSpeed: 4,
    impactDelay: .5, burstDuration: 1.15, particleDuration: 1.8, shockDuration: .9, impactDuration: 1.15,
    backDelay: 0, backDuration: 1.25, impactAlpha: .46, burstScale: 1.62, shockScale: 3.35,
    frontParticleCount: 12, frontParticleSize: 5, frontParticleDistance: 190,
    backParticleCount: 8, backParticleSize: 20, backParticleDistance: 640, impactRayCount: 12,
    preludeDuration: 1.65, flashDuration: 1.86, preludeBeamWidth: 15, preludeBeamGlow: 38, preludeRotation: 50,
    screenFlashOpacity: .82, cardFlashOpacity: 1, revealGlitterCount: 84, revealGlitterDistance: 520, revealGlitterDuration: 2.8,
    primary: "#00c4e0", secondary: "#7dd8ff", accent: "#c060e0", impactPrimary: "#55ddff", impactSecondary: "#ff72dd", blendMode: "color-dodge"
  };
  const RARITY_DEFAULTS = {
    common: { baseOpacity: 0, effectOpacity: 0, glowSize: 12, glowOpacity: 0, spotlightOpacity: .3, impactDelay: .5, burstDuration: .85, particleDuration: 1.45, shockDuration: .75, impactDuration: .85, backDuration: 1.05, impactAlpha: .28, frontParticleSize: 4, frontParticleDistance: 160, backParticleSize: 18, primary: "#ffffff", secondary: "#d8efff", accent: "#fff0ac", impactPrimary: "#d9dde4", impactSecondary: "#ffffff", blendMode: "screen" },
    foil: {},
    silver: { baseOpacity: 1, effectOpacity: .42, effectBrightness: .66, effectContrast: 1.2, effectSaturation: .78, textureScale: 16, glowSize: 32, glowOpacity: 42, burstDuration: 1.35, particleDuration: 2.05, shockDuration: 1.05, impactDuration: 1.3, backDuration: 1.42, impactAlpha: .56, frontParticleSize: 6, frontParticleDistance: 215, backParticleSize: 23, primary: "#8d949f", secondary: "#eef6ff", accent: "#adb8c6", impactPrimary: "#bfe7ff", impactSecondary: "#ffffff" },
    gold: { baseOpacity: .5, effectOpacity: 1, effectBrightness: 1, effectContrast: .45, effectSaturation: 1, textureScale: 55, glowSize: 42, glowOpacity: 58, burstDuration: 1.75, particleDuration: 2.6, shockDuration: 1.35, impactDuration: 1.65, backDuration: 1.68, impactAlpha: .72, frontParticleSize: 7, frontParticleDistance: 250, backParticleSize: 27, primary: "#8d5811", secondary: "#fff6d5", accent: "#d3a942", impactPrimary: "#ffe08a", impactSecondary: "#ff9f2d" },
    galaxy: { baseOpacity: 1, baseBrightness: .92, baseContrast: 1.16, baseSaturation: 1.68, effectOpacity: .52, effectBrightness: .78, effectContrast: 1.46, effectSaturation: 2.05, textureScale: 150, maskCenter: .3, maskMid: .38, maskFade: 100, glowSize: 58, glowOpacity: 72, spotlightOpacity: .12, spotlightSize: 72, animationSpeed: 10, impactDelay: 2.08, backDelay: 2.08, burstDuration: 2.3, particleDuration: 3.4, shockDuration: 1.8, impactDuration: 2.1, backDuration: 2.05, impactAlpha: .86, frontParticleSize: 8, frontParticleDistance: 285, backParticleSize: 32, preludeDuration: 1.65, flashDuration: 1.86, primary: "#358dc6", secondary: "#b63fb7", accent: "#6632c7", impactPrimary: "#aa73ff", impactSecondary: "#48e8ff", blendMode: "screen" },
    void: { baseOpacity: .88, baseBrightness: 1.15, baseContrast: 1.18, baseSaturation: 1.8, effectOpacity: .94, effectBrightness: 1.24, effectContrast: 1, effectSaturation: 1, textureScale: 235, grainScale: 28, angle: 108, maskCenter: .12, maskMid: .72, maskFade: 100, glowSize: 104, glowOpacity: 78, spotlightOpacity: 0, animationSpeed: 9, beamWidth: 10, impactDelay: 2.28, backDelay: 2.28, burstDuration: 3, particleDuration: 4.2, shockDuration: 2.3, impactDuration: 2.8, backDuration: 2.45, impactAlpha: 1, frontParticleSize: 10, frontParticleDistance: 325, backParticleSize: 38, preludeDuration: 1.85, flashDuration: 2.06, preludeBeamWidth: 19, preludeBeamGlow: 48, screenFlashOpacity: .9, primary: "#47efff", secondary: "#b55aff", accent: "#ff78da", impactPrimary: "#ffffff", impactSecondary: "#72efff", blendMode: "difference" }
  };
  const PARAMS_BY_BASE = {
    common: ["glowSize", "glowOpacity", "spotlightOpacity", "spotlightSize", "parallax", "tilt"],
    foil: ["baseOpacity", "baseBrightness", "baseContrast", "baseSaturation", "effectOpacity", "effectBrightness", "effectContrast", "effectSaturation", "patternScale", "angle", "maskCenter", "maskMid", "maskFade", "glowSize", "glowOpacity", "spotlightOpacity", "spotlightSize", "parallax", "tilt"],
    silver: ["baseOpacity", "baseBrightness", "baseContrast", "baseSaturation", "effectOpacity", "effectBrightness", "effectContrast", "effectSaturation", "patternScale", "textureScale", "grainScale", "angle", "shineWidth", "shineHeight", "glowSize", "glowOpacity", "spotlightOpacity", "spotlightSize", "parallax", "tilt"],
    gold: ["baseOpacity", "baseBrightness", "baseContrast", "baseSaturation", "effectOpacity", "effectBrightness", "effectContrast", "effectSaturation", "patternScale", "textureScale", "angle", "glowSize", "glowOpacity", "spotlightOpacity", "spotlightSize", "parallax", "tilt"],
    galaxy: ["baseOpacity", "baseBrightness", "baseContrast", "baseSaturation", "effectOpacity", "effectBrightness", "effectContrast", "effectSaturation", "patternScale", "textureScale", "angle", "maskCenter", "maskMid", "maskFade", "glowSize", "glowOpacity", "spotlightOpacity", "spotlightSize", "parallax", "tilt", "animationSpeed"],
    void: ["baseOpacity", "baseBrightness", "baseContrast", "baseSaturation", "effectOpacity", "effectBrightness", "effectContrast", "effectSaturation", "textureScale", "grainScale", "angle", "maskCenter", "maskMid", "maskFade", "beamWidth", "glowSize", "glowOpacity", "spotlightOpacity", "spotlightSize", "parallax", "tilt", "animationSpeed"]
  };
  const REVEAL_PARAMS = ["impactDelay", "burstDuration", "particleDuration", "shockDuration", "impactDuration", "backDelay", "backDuration", "impactAlpha", "burstScale", "shockScale", "frontParticleCount", "frontParticleSize", "frontParticleDistance", "backParticleCount", "backParticleSize", "backParticleDistance", "impactRayCount"];
  const PRELUDE_PARAMS = ["preludeDuration", "flashDuration", "preludeBeamWidth", "preludeBeamGlow", "preludeRotation", "screenFlashOpacity", "cardFlashOpacity"];
  const GLITTER_REVEAL_PARAMS = ["revealGlitterCount", "revealGlitterDistance", "revealGlitterDuration"];

  const $ = selector => document.querySelector(selector);
  const preview = $("#previewCard");
  const stage = $("#stage");
  const screenPrelude = $("#screenPrelude");
  const raritySelect = $("#raritySelect");
  const cardSelect = $("#cardSelect");
  let saved = loadSaved();
  let values = defaultsFor(raritySelect.value);

  function loadSaved() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return value && typeof value === "object" ? value : { configs: {}, cardId: null };
    } catch (_) {
      return { configs: {}, cardId: null };
    }
  }
  function save() {
    saved.configs ||= {};
    saved.configs[raritySelect.value] = { ...values };
    saved.cardId = cardSelect.value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }
  function baseRarity(rarity) { return rarity.replace(/-glitter$/, ""); }
  function isGlitter(rarity) { return rarity.endsWith("-glitter"); }
  function defaultsFor(rarity) {
    const base = baseRarity(rarity);
    return { ...BASE_DEFAULTS, ...(RARITY_DEFAULTS[base] || {}), ...(saved.configs?.[rarity] || {}) };
  }
  function activeParams(rarity = raritySelect.value) {
    const ids = [...(PARAMS_BY_BASE[baseRarity(rarity)] || [])];
    ids.push(...REVEAL_PARAMS);
    if (["galaxy", "void"].includes(baseRarity(rarity))) ids.push(...PRELUDE_PARAMS);
    if (isGlitter(rarity)) {
      ids.push(...GROUPS.find(group => group.id === "glitter").params);
      ids.push(...GLITTER_REVEAL_PARAMS);
    }
    return new Set(ids);
  }
  function clampValue(id, value) {
    const def = PARAMETERS[id];
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return values[id];
    return Math.min(def.max, Math.max(def.min, numeric));
  }
  function cardName(card) { return card?.translations?.fr?.name || card?.i18n?.fr?.name || card?.name || "Carte"; }
  function cardImage(card) { return card?.translations?.fr?.image || card?.i18n?.fr?.image || card?.image || "assets/booster-card-back.png"; }

  function populateCards() {
    cardSelect.innerHTML = cards.map(card => `<option value="${card.id}">#${String(card.collectionNumber).padStart(3, "0")} · ${cardName(card)}</option>`).join("");
    if (saved.cardId && cards.some(card => card.id === saved.cardId)) cardSelect.value = saved.cardId;
    if (!cardSelect.value && cards[0]) cardSelect.value = cards[0].id;
    updateCard();
  }
  function updateCard() {
    const card = cards.find(item => item.id === cardSelect.value);
    $("#cardImage").src = cardImage(card);
    $("#cardImage").alt = cardName(card);
    $("#cardName").textContent = cardName(card);
    refreshExport();
  }

  function renderColorControls(container) {
    const details = document.createElement("details");
    details.className = "lab-control-group";
    details.open = true;
    details.innerHTML = `<summary>Couleurs et fusion</summary><div class="lab-control-list"></div>`;
    const list = details.querySelector(".lab-control-list");
    const colorFields = baseRarity(raritySelect.value) === "common" ? [] : [["primary", "Couleur principale"], ["secondary", "Couleur secondaire"], ["accent", "Couleur d’accent"]];
    colorFields.push(["impactPrimary", "VFX principale"], ["impactSecondary", "VFX secondaire"]);
    colorFields.forEach(([id, label]) => {
      const row = document.createElement("label");
      row.className = "control-row color-row";
      row.innerHTML = `<span class="control-label">${label}</span><input type="color" value="${values[id]}"><span class="color-value">${values[id]}</span>`;
      row.querySelector("input").addEventListener("input", event => {
        values[id] = event.target.value;
        row.querySelector(".color-value").textContent = values[id];
        applyValues();
      });
      list.append(row);
    });
    if (baseRarity(raritySelect.value) !== "common") {
      const blend = document.createElement("label");
      blend.className = "control-row";
      blend.innerHTML = `<span class="control-label">Mode de fusion</span><select>${BLEND_MODES.map(mode => `<option value="${mode}"${mode === values.blendMode ? " selected" : ""}>${mode}</option>`).join("")}</select>`;
      blend.querySelector("select").addEventListener("change", event => { values.blendMode = event.target.value; applyValues(); });
      list.append(blend);
    }
    container.append(details);
  }

  function renderControls() {
    const container = $("#controls");
    const enabled = activeParams();
    container.innerHTML = "";
    renderColorControls(container);
    GROUPS.forEach(group => {
      const ids = group.params.filter(id => enabled.has(id));
      if (!ids.length) return;
      const details = document.createElement("details");
      details.className = "lab-control-group";
      details.open = group.id !== "base";
      details.innerHTML = `<summary>${group.title}</summary><div class="lab-control-list"></div>`;
      const list = details.querySelector(".lab-control-list");
      ids.forEach(id => {
        const def = PARAMETERS[id];
        const row = document.createElement("div");
        row.className = "control-row";
        row.innerHTML = `<span class="control-label">${def.label}</span><input type="range" aria-label="${def.label}" min="${def.min}" max="${def.max}" step="${def.step}" value="${values[id]}"><input type="number" aria-label="${def.label} — valeur" min="${def.min}" max="${def.max}" step="${def.step}" value="${values[id]}"><button class="slider-reset" type="button" title="Restaurer ${def.label}" aria-label="Restaurer ${def.label}">↺</button>`;
        const [range, number] = row.querySelectorAll("input");
        const reset = row.querySelector(".slider-reset");
        const update = source => {
          values[id] = clampValue(id, source.value);
          range.value = values[id];
          number.value = values[id];
          applyValues();
        };
        range.addEventListener("input", () => update(range));
        number.addEventListener("input", () => update(number));
        reset.addEventListener("click", () => {
          const hasSavedValue = Object.prototype.hasOwnProperty.call(saved.configs?.[raritySelect.value] || {}, id);
          values[id] = defaultsFor(raritySelect.value)[id];
          range.value = values[id];
          number.value = values[id];
          applyValues();
          setStatus(hasSavedValue ? `${def.label} restauré à sa dernière valeur sauvegardée.` : `${def.label} restauré à sa valeur par défaut.`);
        });
        list.append(row);
      });
      container.append(details);
    });
  }

  let vfxSignature = "";
  function radialMarkup(count, delayStep = .018) {
    return Array.from({ length: Math.round(count) }, (_, index) => {
      const angle = count ? index * 360 / count : 0;
      return `<i style="--vfx-angle:${angle.toFixed(2)}deg;--vfx-delay:${(index * delayStep % .24).toFixed(3)}s"></i>`;
    }).join("");
  }
  function syncVfxParticles() {
    const signature = [values.frontParticleCount, values.backParticleCount, values.impactRayCount, isGlitter(raritySelect.value) ? values.revealGlitterCount : 0].join("|");
    if (signature === vfxSignature) return;
    vfxSignature = signature;
    $("#frontParticles").innerHTML = radialMarkup(values.frontParticleCount, .021);
    $("#backParticles").innerHTML = radialMarkup(values.backParticleCount, .026);
    $("#impactRays").innerHTML = radialMarkup(values.impactRayCount, .012);
    $("#revealGlitter").innerHTML = isGlitter(raritySelect.value) ? Array.from({ length: Math.round(values.revealGlitterCount) }, (_, index) => {
      const angle = index * 137.5 % 360;
      const distance = values.revealGlitterDistance * (.48 + (index % 11) * .052);
      const size = 2 + index % 4;
      return `<i style="--glitter-angle:${angle.toFixed(1)}deg;--glitter-distance:${distance.toFixed(0)}px;--glitter-delay:${(index % 14 * .025).toFixed(3)}s;--glitter-size:${size}px"></i>`;
    }).join("") : "";
  }

  function applyValues(markDirty = true) {
    Object.entries(PARAMETERS).forEach(([id, def]) => {
      if (def.css) [preview, stage].forEach(target => target.style.setProperty(def.css, `${values[id]}${def.unit || ""}`));
    });
    preview.style.setProperty("--primary", values.primary);
    preview.style.setProperty("--secondary", values.secondary);
    preview.style.setProperty("--accent", values.accent);
    preview.style.setProperty("--blend-mode", values.blendMode);
    [preview, stage].forEach(target => {
      target.style.setProperty("--impact-color", values.impactPrimary);
      target.style.setProperty("--impact-color-alt", values.impactSecondary);
    });
    preview.dataset.rarity = baseRarity(raritySelect.value);
    preview.classList.toggle("is-glitter", isGlitter(raritySelect.value));
    screenPrelude.dataset.rarity = baseRarity(raritySelect.value);
    $("#rarityName").textContent = RARITY_LABELS[raritySelect.value];
    syncVfxParticles();
    refreshExport();
    if (markDirty) setStatus("Modifications non sauvegardées.");
  }

  function exportPayload() {
    const included = activeParams();
    const exported = {};
    included.forEach(id => { exported[id] = values[id]; });
    if (baseRarity(raritySelect.value) !== "common") {
      exported.primary = values.primary;
      exported.secondary = values.secondary;
      exported.accent = values.accent;
      exported.blendMode = values.blendMode;
    }
    exported.impactPrimary = values.impactPrimary;
    exported.impactSecondary = values.impactSecondary;
    return {
      app: "DeckomantiK",
      tool: "foil-lab",
      formatVersion: 1,
      rarity: raritySelect.value,
      cardId: cardSelect.value || null,
      values: exported
    };
  }
  function refreshExport() { $("#configText").value = JSON.stringify(exportPayload(), null, 2); }
  function setStatus(message, error = false) {
    const status = $("#status");
    status.textContent = message;
    status.style.color = error ? "#ff9b92" : "";
  }
  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(text); return; } catch (_) {}
    }
    const area = document.createElement("textarea");
    area.value = text;
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  function sanitizeImported(payload) {
    if (!payload || payload.tool !== "foil-lab" || !RARITY_LABELS[payload.rarity] || !payload.values || typeof payload.values !== "object") throw new Error("Format Foil Lab invalide");
    const imported = defaultsFor(payload.rarity);
    Object.keys(PARAMETERS).forEach(id => {
      if (!(id in payload.values)) return;
      const numeric = Number(payload.values[id]);
      if (Number.isFinite(numeric)) imported[id] = Math.min(PARAMETERS[id].max, Math.max(PARAMETERS[id].min, numeric));
    });
    ["primary", "secondary", "accent", "impactPrimary", "impactSecondary"].forEach(id => {
      if (/^#[0-9a-f]{6}$/i.test(payload.values[id] || "")) imported[id] = payload.values[id];
    });
    if (BLEND_MODES.includes(payload.values.blendMode)) imported.blendMode = payload.values.blendMode;
    return imported;
  }

  let revealTimer = 0;
  function replayReveal() {
    clearTimeout(revealTimer);
    preview.classList.remove("is-revealing", "is-revealed");
    screenPrelude.classList.remove("playing");
    void preview.offsetWidth;
    preview.classList.add("is-revealing");
    screenPrelude.classList.add("playing");
    requestAnimationFrame(() => preview.classList.add("is-revealed"));
    const impactEnd = values.impactDelay + Math.max(values.burstDuration, values.particleDuration, values.shockDuration, values.impactDuration);
    const backEnd = values.backDelay + values.backDuration;
    const glitterEnd = isGlitter(raritySelect.value) ? values.impactDelay + values.revealGlitterDuration + .4 : 0;
    const preludeEnd = ["galaxy", "void"].includes(baseRarity(raritySelect.value)) ? .5 + Math.max(values.preludeDuration, values.flashDuration) : 0;
    revealTimer = setTimeout(() => {
      preview.classList.remove("is-revealing");
      screenPrelude.classList.remove("playing");
    }, (Math.max(.5, impactEnd, backEnd, glitterEnd, preludeEnd) + .35) * 1000);
  }

  raritySelect.addEventListener("change", () => {
    values = defaultsFor(raritySelect.value);
    renderControls();
    applyValues();
    replayReveal();
    setStatus("");
  });
  cardSelect.addEventListener("change", updateCard);
  $("#randomCard").addEventListener("click", () => {
    if (!cards.length) return;
    cardSelect.value = cards[Math.floor(Math.random() * cards.length)].id;
    updateCard();
  });
  $("#motionToggle").addEventListener("change", event => document.body.classList.toggle("animations-paused", !event.target.checked));
  $("#replayReveal").addEventListener("click", replayReveal);
  $("#saveConfig").addEventListener("click", () => {
    save();
    setStatus("Configuration sauvegardée pour cette rareté.");
  });
  $("#resetConfig").addEventListener("click", () => {
    const hasSavedConfig = Boolean(saved.configs?.[raritySelect.value]);
    values = defaultsFor(raritySelect.value);
    renderControls();
    applyValues(false);
    replayReveal();
    setStatus(hasSavedConfig ? "Dernière sauvegarde restaurée." : "Réglages par défaut restaurés.");
  });
  $("#copyConfig").addEventListener("click", async () => {
    refreshExport();
    await copyText($("#configText").value);
    setStatus("Configuration copiée — tu peux me la coller telle quelle.");
  });
  $("#applyConfig").addEventListener("click", () => {
    try {
      const payload = JSON.parse($("#configText").value);
      raritySelect.value = payload.rarity;
      values = sanitizeImported(payload);
      if (payload.cardId && cards.some(card => card.id === payload.cardId)) cardSelect.value = payload.cardId;
      renderControls();
      updateCard();
      applyValues();
      replayReveal();
      setStatus("Configuration appliquée, mais pas encore sauvegardée.");
    } catch (error) {
      setStatus(error.message || "JSON invalide.", true);
    }
  });
  preview.addEventListener("pointermove", event => {
    const rect = preview.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    preview.style.setProperty("--spot-x", `${(x * 100).toFixed(1)}%`);
    preview.style.setProperty("--spot-y", `${(y * 100).toFixed(1)}%`);
    preview.style.setProperty("--shift-x", `${((x - .5) * 18 * values.parallax).toFixed(2)}px`);
    preview.style.setProperty("--shift-y", `${((y - .5) * 16 * values.parallax).toFixed(2)}px`);
    preview.style.setProperty("--tilt-x", `${((x - .5) * values.tilt).toFixed(2)}deg`);
    preview.style.setProperty("--tilt-y", `${((.5 - y) * values.tilt).toFixed(2)}deg`);
  });
  preview.addEventListener("pointerleave", () => {
    [["--spot-x", "50%"], ["--spot-y", "50%"], ["--shift-x", "0px"], ["--shift-y", "0px"], ["--tilt-x", "0deg"], ["--tilt-y", "0deg"]].forEach(([name, value]) => preview.style.setProperty(name, value));
  });

  populateCards();
  values = defaultsFor(raritySelect.value);
  renderControls();
  applyValues(false);
})();
