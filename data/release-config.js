(() => {
  'use strict';

  // GitHub Pages release switch. Disabled extension payloads stay outside the
  // published folder so unreleased cards and translations are not inspectable.
  globalThis.DECKOMANTIK_RELEASE = Object.freeze({
    version: '2026.09-beta',
    extensions: Object.freeze({
      'inner-deserts': false
    })
  });
})();
