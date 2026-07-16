// Right Court SC — shared nav/footer partial logic (Phase 1: static scaffold).
// Renders the header nav and footer into #site-header / #site-footer placeholders so every page
// shares one source of truth for the nav (exactly 4 items, per 02-SITE-MAP-AND-CONTENT.md) and the
// footer (Drill Builder link, monogram, contact info).
//
// Path handling: the invoking <script> tag carries a data-base attribute set to "." for pages at the
// site root (index.html) or ".." for one-level-deep pages (about/index.html, etc.) so links resolve
// correctly whether the site is served from a root domain or opened directly as a local file.
(function () {
  var scriptEl = document.currentScript;
  var base = (scriptEl && scriptEl.getAttribute('data-base')) || '.';
  var prefix = base === '.' ? '' : base + '/';

  var navItems = [
    { href: prefix + 'index.html', label: 'Home' },
    { href: prefix + 'drills/index.html', label: 'Drills & Sessions' },
    { href: prefix + 'gallery/index.html', label: 'Gallery' },
    { href: prefix + 'about/index.html', label: 'About / Join' },
  ];

  var navListHtml = navItems
    .map(function (item) {
      return '<li><a href="' + item.href + '">' + item.label + '</a></li>';
    })
    .join('');

  var headerHtml =
    '<div class="nav-inner">' +
    '<a class="brand" href="' + prefix + 'index.html">' +
    '<img src="' + prefix + 'assets/logos/monogram.webp" alt="Right Court SC">' +
    '</a>' +
    '<nav class="primary" aria-label="Primary">' +
    '<ul>' + navListHtml + '</ul>' +
    '</nav>' +
    '<button class="hamburger" type="button" aria-label="Open menu" aria-expanded="false">&#9776;</button>' +
    '</div>';

  var footerHtml =
    '<div class="footer-inner">' +
    '<div class="col">' +
    '<img class="monogram" src="' + prefix + 'assets/logos/monogram.webp" alt="Right Court SC monogram">' +
    '</div>' +
    '<div class="col">' +
    '<h4>Get in touch</h4>' +
    '<a href="mailto:info@rightcourtsc.com">info@rightcourtsc.com</a>' +
    '<p>Wed 18:00–20:00 &amp; Sat 09:00–11:00 — Feeling Squash</p>' +
    '</div>' +
    '<div class="col">' +
    '<h4>Quick links</h4>' +
    '<a href="' + prefix + 'drill-builder/index.html">Drill Builder</a>' +
    '<a href="' + prefix + 'founding-squashers/index.html">Founding Squashers</a>' +
    '<a href="' + prefix + 'about/index.html">About / Join</a>' +
    '</div>' +
    '</div>' +
    '<p class="copyright">&copy; 2026 Right Court SC. All rights reserved (mostly the wrongs too).</p>';

  var headerEl = document.getElementById('site-header');
  var footerEl = document.getElementById('site-footer');
  if (headerEl) headerEl.innerHTML = headerHtml;
  if (footerEl) footerEl.innerHTML = footerHtml;

  var hamburger = headerEl && headerEl.querySelector('.hamburger');
  var primaryNav = headerEl && headerEl.querySelector('nav.primary');
  if (hamburger && primaryNav) {
    hamburger.addEventListener('click', function () {
      var isOpen = primaryNav.classList.toggle('is-open');
      hamburger.setAttribute('aria-expanded', String(isOpen));
    });
  }
})();
