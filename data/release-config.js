(() => {
  'use strict';

  // GitHub Pages release switch. Inner Deserts is live; changing this flag
  // back to false provides an immediate, data-preserving rollback.
  globalThis.DECKOMANTIK_RELEASE = Object.freeze({
    version: '2026.10-inner-deserts',
    extensions: Object.freeze({
      'inner-deserts': true
    })
  });
})();
