// Right Court SC — modular squash-ball loader. Self-contained: any page can call
// window.RCBallLoader.markup(message, theme) to get the loader's HTML (SVG + optional label),
// or window.RCBallLoader.mount(container, options) to have it manage the element directly.
// Requires assets/css/ball-loader.css to be loaded on the page. No dependency on the drill
// builder — this module knows nothing about forms, fetches, or any other page's DOM.
(function () {
  'use strict';

  // Each pattern is a distinct tracer path/squash/timing combo (see ball-loader.css for the
  // actual keyframes) echoing a real squash shot.
  var PATTERNS = ['drive', 'boast', 'drop', 'volley', 'arc', 'sweep', 'wobble', 'flourish'];

  // Maps a drill-builder theme value to the pattern that best matches the shot it describes.
  // Themes not listed here (and "surprise me") fall through to a random pick.
  var THEME_PATTERN = {
    'length': 'drive',
    'volleys': 'volley',
    'drops': 'drop',
    'boasts': 'boast',
    'movement': 'sweep',
    'front-court': 'drop',
    'deception': 'wobble',
    'serves/returns': 'arc',
    'exhibition-shots': 'flourish',
  };

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function randomPattern() {
    return PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
  }

  function resolvePattern(theme) {
    if (theme && Object.prototype.hasOwnProperty.call(THEME_PATTERN, theme)) {
      return THEME_PATTERN[theme];
    }
    return randomPattern();
  }

  function svg(pattern) {
    return (
      '<svg class="ball-spinner-svg" width="140" height="105" viewBox="0 0 160 120" aria-hidden="true">' +
      '<polygon class="ball-spinner-wall-side" points="70,53 10,78 10,32 70,7"></polygon>' +
      '<polygon class="ball-spinner-wall-back" points="70,53 130,78 130,32 70,7"></polygon>' +
      '<line class="ball-spinner-tin" x1="70" y1="46" x2="130" y2="71"></line>' +
      '<polygon class="ball-spinner-floor" points="10,78 70,103 130,78 70,53"></polygon>' +
      '<line class="ball-spinner-plank" x1="30" y1="70" x2="90" y2="95"></line>' +
      '<line class="ball-spinner-plank" x1="50" y1="62" x2="110" y2="87"></line>' +
      '<ellipse class="ball-spinner-shadow ball-spinner-shadow--' + pattern + '" cx="37" cy="89" rx="10" ry="4"></ellipse>' +
      '<g class="ball-spinner-arc ball-spinner-arc--' + pattern + '">' +
      '<g class="ball-spinner-spin">' +
      '<circle class="ball-spinner-body" cx="37" cy="89" r="8"></circle>' +
      '<path class="ball-spinner-seam" d="M30,83 Q37,89 30,95"></path>' +
      '<path class="ball-spinner-seam" d="M44,83 Q37,89 44,95"></path>' +
      '<circle class="ball-spinner-dot" cx="34" cy="85" r="1.1"></circle>' +
      '<circle class="ball-spinner-dot" cx="40" cy="89" r="1.1"></circle>' +
      '</g>' +
      '</g>' +
      '</svg>'
    );
  }

  // Returns the loader's HTML — the isometric SVG scene plus an optional message span. `theme`
  // is an optional drill-builder theme value used to pick a matching tracer pattern; omit it (or
  // pass an unrecognized value, e.g. "surprise me") to get a random pattern.
  function markup(message, theme) {
    return markupForPattern(message, resolvePattern(theme));
  }

  // Same as markup(), but for callers that want an exact named pattern (see PATTERNS) instead of
  // resolving one from a theme — e.g. a demo/QA page showing every pattern, or a page that always
  // wants a specific one regardless of theme.
  function markupForPattern(message, pattern) {
    var html = svg(pattern);
    if (message) html += '<span>' + escapeHtml(message) + '</span>';
    return html;
  }

  // Convenience for pages that just want to hand over an element and forget about it: replaces
  // the container's content with the loader (and unhides it, if it uses the [hidden] attribute).
  function mount(container, options) {
    options = options || {};
    container.innerHTML = markup(options.message, options.theme);
    container.hidden = false;
    return {
      destroy: function () {
        container.innerHTML = '';
        container.hidden = true;
      },
    };
  }

  window.RCBallLoader = {
    markup: markup,
    markupForPattern: markupForPattern,
    mount: mount,
    PATTERNS: PATTERNS.slice(),
    THEME_PATTERN: THEME_PATTERN,
  };
})();
