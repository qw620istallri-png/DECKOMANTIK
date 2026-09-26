(() => {
  'use strict';

  // Public Beta registry. The complete Inner Deserts payload is kept in
  // _A_NE_PAS_UPLOADER/extension-inner-deserts until its release.
  globalThis.DECKOMANTIK_CARD_SETS = Object.freeze([
    Object.freeze({ id: 'beta', code: 'BETA', name: 'Beta', cardCount: 300 })
  ]);

  globalThis.DECKOMANTIK_BOOSTERS = Object.freeze([
    Object.freeze({
      id: 'beta',
      name: 'Beta',
      image: 'assets/booster-pack-cover.png',
      slots: Object.freeze([Object.freeze({ setId: 'beta', count: 5 })]),
      desertChance: 0,
      guarantee: 'silver'
    })
  ]);

  globalThis.DECKOMANTIK_INNER_DESERTS_CARDS = Object.freeze([]);
})();
