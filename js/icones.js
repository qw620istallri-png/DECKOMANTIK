/* DeckomantiK — icônes Tirage : un seul trait de 1,75 px, bouts carrés, dessinées sur une grille de 24.
   Chargé avant js/deckomantik.js : fournit ico(nom) et le sprite SVG commun. */
(() => {
  const F = 'fill="currentColor" stroke="none"';
  const ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    chev: '<path d="M6.5 9.5L12 15l5.5-5.5"/>',
    chevUp: '<path d="M6.5 14.5L12 9l5.5 5.5"/>',
    undo: '<path d="M8.5 13.5L4 9l4.5-4.5"/><path d="M4 9h10a5.5 5.5 0 0 1 0 11h-3"/>',
    redo: '<path d="M15.5 13.5L20 9l-4.5-4.5"/><path d="M20 9H10a5.5 5.5 0 0 0 0 11h3"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5l5 5"/>',
    zoomIn: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5l5 5M10.5 7.5v6M7.5 10.5h6"/>',
    zoomOut: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5l5 5M7.5 10.5h6"/>',
    expand: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
    shrink: '<path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/>',
    up: '<path d="M12 19.5V5M6.5 10.5L12 5l5.5 5.5"/>',
    down: '<path d="M12 4.5V19M6.5 13.5L12 19l5.5-5.5"/>',
    left: '<path d="M14.5 6L8.5 12l6 6"/>',
    right: '<path d="M9.5 6l6 6-6 6"/>',
    back: '<path d="M19.5 12h-15M10 6.5L4.5 12l5.5 5.5"/>',
    arrow: '<path d="M4.5 12h15M14 6.5l5.5 5.5-5.5 5.5"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    pin: '<path d="M8 4h8l-1.5 6 3 3H6.5l3-3z"/><path d="M12 13v8"/>',
    archive: '<path d="M4 7h16v13H4zM3 4h18v4H3z"/><path d="M9 12h6"/>',
    restore: '<path d="M5 7.5V3.5M5 3.5h4"/><path d="M5.5 4.5A8 8 0 1 1 4 15"/><path d="M12 8v4l3 2"/>',
    grip: `<circle cx="9" cy="6" r="1.5" ${F}/><circle cx="15" cy="6" r="1.5" ${F}/><circle cx="9" cy="12" r="1.5" ${F}/><circle cx="15" cy="12" r="1.5" ${F}/><circle cx="9" cy="18" r="1.5" ${F}/><circle cx="15" cy="18" r="1.5" ${F}/>`,
    share: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5"/><path d="M5 12.5V20h14v-7.5"/>',
    import: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M5 15v5h14v-5"/>',
    book: '<path d="M12 6.5C10 5 7 4.5 4 5v13.5c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z"/><path d="M12 6.5V20"/>',
    board: '<path d="M3.5 4.5h17v12h-17z"/><path d="M8 20.5l4-4 4 4"/><path d="M7 12.5l3-3 2.5 2.5 4-4"/>',
    cards: '<path d="M4.8 7.1l7.4-2 3.6 13.5-7.4 2z"/><path d="M14.6 4.7l4.7 1.3-2.9 10.8"/>',
    library: '<path d="M4.5 4.5h4v15h-4zM10.5 4.5h4v15h-4z"/><path d="M16.4 5.4l3.8-1 3.3 13.6-3.8.9"/>',
    table: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
    chart: '<path d="M5 20v-8M11 20V5M17 20v-6M3 20.5h18"/>',
    rows: '<path d="M4 6h16M4 10.5h16M4 15h16M4 19.5h9"/>',
    cats: '<path d="M4 5h5v5H4zM4 14h5v5H4zM12 6.5h8M12 9h5M12 15.5h8M12 18h5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    more: `<circle cx="5.5" cy="12" r="1.6" ${F}/><circle cx="12" cy="12" r="1.6" ${F}/><circle cx="18.5" cy="12" r="1.6" ${F}/>`,
    ext: '<path d="M13.5 4.5h6v6M19.5 4.5L11 13M17.5 14v5.5h-13v-13H10"/>',
    spark: '<path d="M12 3.5l1.9 6.6 6.6 1.9-6.6 1.9L12 20.5l-1.9-6.6L3.5 12l6.6-1.9z"/>',
    reset: '<path d="M5 12a7 7 0 1 0 2.1-5"/><path d="M4.5 3.5V8H9"/>',
    save: '<path d="M5 4h11.5L19 6.5V20H5z"/><path d="M8.5 4v5h6V4M8.5 20v-6h7v6"/>',
    link: '<path d="M10 14l4-4"/><path d="M8.5 11.5l-2 2a3.5 3.5 0 0 0 5 5l2-2M15.5 12.5l2-2a3.5 3.5 0 0 0-5-5l-2 2"/>',
    copy: '<path d="M8.5 8.5h11v11h-11z"/><path d="M15.5 8.5v-4h-11v11h4"/>',
    file: '<path d="M6 3.5h8.5l4 4v13H6z"/><path d="M14 3.5V8h4.5"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 5h2v2H4zM4 11h2v2H4zM4 17h2v2H4z"/>',
    send: '<path d="M4 12h14.5M13 6.5l5.5 5.5-5.5 5.5"/>',
    size: '<path d="M3.5 10h6v10h-6zM12.5 4h8v16h-8z"/>',
    deck: '<path d="M6 5.5h9v14H6z"/><path d="M18 8.5v12H9.5"/>',
    home: '<path d="M4 11l8-6.5 8 6.5V20H4z"/><path d="M10 20v-5.5h4V20"/>',
    discord: `<path ${F} d="M18.9 5.3A16.4 16.4 0 0 0 15 4.1l-.5 1a14.8 14.8 0 0 0-5 0l-.5-1a16.7 16.7 0 0 0-3.9 1.2C2.6 9 1.9 12.5 2.2 16a16 16 0 0 0 4.9 2.5l1.2-1.7a10 10 0 0 1-1.8-.9l.4-.3a11.8 11.8 0 0 0 10.2 0l.4.3a11 11 0 0 1-1.8.9l1.2 1.7a16 16 0 0 0 4.9-2.5c.4-4.1-.7-7.6-2.9-10.7ZM8.8 14.3c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm6.4 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z"/>`,
    insta: `<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><circle cx="12" cy="12" r="3.8"/><circle cx="17.2" cy="6.8" r="1.1" ${F}/>`,
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><path d="M13 4.5v5M7 14.5v5"/>',
    sound: '<path d="M4.5 9.5h3.5L13 5v14l-5-4.5H4.5z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/>',
    mute: '<path d="M4.5 9.5h3.5L13 5v14l-5-4.5H4.5z"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/>',
    hourglass: '<path d="M6.5 3.5h11M6.5 20.5h11"/><path d="M8 3.5v3l4 5.5-4 5.5v3M16 3.5v3L12 12l4 5.5v3"/>',
    glossary: '<path d="M3.5 19.5L8 5h1.5L14 19.5M5.2 14.5h7.1"/><path d="M16 9.5h4.5M16 14h4.5M16 18.5h4.5"/>',
    mark: '<circle cx="12" cy="12" r="5"/><path d="M12 2.5v19M2.5 12h19"/>',
    shuffle: '<path d="M4 7h3.5c3.2 0 4.8 10 8.2 10H20M4 17h3.5c1.3 0 2.3-1.7 3.2-3.8M13.3 9.8C14.1 8.2 15 7 16.2 7H20"/><path d="M17.5 4.5L20 7l-2.5 2.5M17.5 14.5L20 17l-2.5 2.5"/>',
    hand: '<path d="M3.8 9.4l6.8-2.9 4.2 9.9-6.8 2.9z"/><path d="M13.5 6.2l5.9 2.5-3.5 8.2"/>',
    rect: '<path d="M4.5 6.5h15v11h-15z"/>',
    ellipse: '<ellipse cx="12" cy="12" rx="8.5" ry="6"/>',
    text: '<path d="M5 7V5h14v2M12 5v14M9 19h6"/>',
    front: '<path d="M8.5 8.5h11v11h-11z"/><path d="M5.5 15.5h-1v-11h11v1"/>',
    behind: '<path d="M4.5 4.5h11v11h-11z"/><path d="M18.5 8.5h1v11h-11v-1"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    lock: '<path d="M6 11h12v9H6z"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>',
    warn: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17v1"/>',
    scales: '<path d="M12 4v16M6 20h12M5 7.5h14"/><path d="M5 7.5l-2.5 6h5zM19 7.5l-2.5 6h5z"/>',
    target: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3"/>',
    rotate: '<path d="M19 12a7 7 0 1 1-2.1-5"/><path d="M19.5 3.5V8H15"/>',
    resize: '<path d="M20 14v6h-6M20 20l-7-7M4 10V4h6M4 4l7 7"/>',
    fontUp: '<path d="M3.5 19L8 6l4.5 13M5.2 14.5h5.6"/><path d="M17.5 8v7M14 11.5h7"/>',
    fontDown: '<path d="M3.5 19L8 6l4.5 13M5.2 14.5h5.6"/><path d="M14 11.5h7"/>',
    palette: '<circle cx="12" cy="12" r="8.5"/><circle cx="8.5" cy="10" r="1.2"/><circle cx="12" cy="7.5" r="1.2"/><circle cx="15.5" cy="10" r="1.2"/><path d="M12 20.5c-1.5 0-2-1.5-1-2.5s.5-2.5-1-2.5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
    download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M5 15v5h14v-5"/>',
    upload: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5"/><path d="M5 15v5h14v-5"/>'
  };
  const ico = (name, cls) => `<svg class="i${cls ? ` ${cls}` : ''}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
  const mount = () => {
    if (document.getElementById('dk-icones')) return;
    const sprite = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    sprite.id = 'dk-icones'; sprite.setAttribute('aria-hidden', 'true');
    sprite.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    sprite.innerHTML = Object.entries(ICONS).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('');
    document.body.prepend(sprite);
  };
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  globalThis.ico = ico;
  globalThis.DK_ICONS = Object.keys(ICONS);
})();
