// Right Court SC — modular squash-ball loader. Self-contained: any page can call
// window.RCBallLoader.markup(message, theme) to get the loader's HTML (SVG + optional label),
// or window.RCBallLoader.mount(container, options) to have it manage the element directly.
// Requires assets/css/ball-loader.css to be loaded on the page. No dependency on the drill
// builder — this module knows nothing about forms, fetches, or any other page's DOM.
(function () {
  'use strict';

  // Each pattern is a distinct tracer path/squash/timing combo (see ball-loader.css for the
  // actual keyframes) named after a real squash shot — every one ends its final impact on the
  // front wall, since that's the actual rule (every shot must reach the front wall).
  var PATTERNS = ['drive', 'boast', 'drop', 'volley', 'lob', 'nick', 'reverse', 'corkscrew', 'crosscourt'];

  // Maps a drill-builder theme value to the pattern that best matches the shot it describes.
  // Themes not listed here (and "surprise me") fall through to a random pick.
  var THEME_PATTERN = {
    'length': 'drive',
    'volleys': 'volley',
    'drops': 'drop',
    'boasts': 'boast',
    'movement': 'crosscourt',
    'front-court': 'nick',
    'deception': 'reverse',
    'serves/returns': 'lob',
    'exhibition-shots': 'corkscrew',
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
      '<polygon class="ball-spinner-wall-front" points="70,53 130,78 130,32 70,7"></polygon>' +
      '<line class="ball-spinner-tin" x1="70" y1="46" x2="130" y2="71"></line>' +
      '<polygon class="ball-spinner-floor" points="10,78 70,103 130,78 70,53"></polygon>' +
      '<line class="ball-spinner-plank" x1="30" y1="70" x2="90" y2="95"></line>' +
      '<line class="ball-spinner-plank" x1="50" y1="62" x2="110" y2="87"></line>' +
      // Racket: drawn around a grip at local (0,0) so the swing is a pure rotation about the
      // hand. The outer group positions the grip (per-pattern — drop's ball starts near the
      // front wall), the inner group swings. Behind the ball so the ball stays visible.
      '<g class="ball-spinner-racket-pos ball-spinner-racket-pos--' + pattern + '">' +
      '<g class="ball-spinner-racket">' +
      '<line class="ball-spinner-racket-handle" x1="0" y1="0" x2="9" y2="-10"></line>' +
      '<line class="ball-spinner-racket-throat" x1="9" y1="-10" x2="11.1" y2="-15.4"></line>' +
      '<line class="ball-spinner-racket-throat" x1="9" y1="-10" x2="14.1" y2="-12.8"></line>' +
      '<path class="ball-spinner-racket-frame" d="M12.6,-14.1 Q8.4,-27.3 24.7,-27.4 Q26.3,-11.2 12.6,-14.1 Z"></path>' +
      '<line class="ball-spinner-racket-strings" x1="16" y1="-25.2" x2="23.4" y2="-18.6"></line>' +
      '<line class="ball-spinner-racket-strings" x1="14" y1="-22.9" x2="21.4" y2="-16.3"></line>' +
      '<line class="ball-spinner-racket-strings" x1="13.4" y1="-20.1" x2="18.6" y2="-15.5"></line>' +
      '<line class="ball-spinner-racket-strings" x1="15.5" y1="-14.2" x2="24.8" y2="-24.6"></line>' +
      '<line class="ball-spinner-racket-strings" x1="12.5" y1="-16.8" x2="21.8" y2="-27.2"></line>' +
      '</g>' +
      '</g>' +
      '<ellipse class="ball-spinner-shadow ball-spinner-shadow--' + pattern + '" cx="37" cy="89" rx="10" ry="4"></ellipse>' +
      '<g class="ball-spinner-arc ball-spinner-arc--' + pattern + '">' +
      '<g class="ball-spinner-spin">' +
      '<circle class="ball-spinner-body" cx="37" cy="89" r="8"></circle>' +
      '<circle class="ball-spinner-dot" cx="35" cy="86" r="1.4"></circle>' +
      '<circle class="ball-spinner-dot" cx="38.5" cy="88" r="1.4"></circle>' +
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
    // The SVG is aria-hidden, so the accessible loading signal lives in the label: the visible
    // message when given, otherwise a visually-hidden "Loading…" — never a silent spinner.
    var label = message
      ? '<span class="ball-spinner-label">' + escapeHtml(message) + '</span>'
      : '<span class="ball-spinner-label ball-spinner-vh">Loading…</span>';
    return (
      '<span class="ball-spinner" role="status" aria-live="polite">' +
      svg(pattern) +
      label +
      '</span>'
    );
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
