(() => {
  'use strict';

  // GitHub Pages release switch. Inner Deserts is already bundled for a
  // one-line launch, but stays absent from every public view while false.
  globalThis.DECKOMANTIK_RELEASE = Object.freeze({
    version: '2026.09-beta',
    extensions: Object.freeze({
      'inner-deserts': false
    })
  });
})();
