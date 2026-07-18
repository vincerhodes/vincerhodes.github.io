// Right Court SC — Gallery slideshow/grid/lightbox logic. Requires gallery/index.html's exact DOM
// ids (see that file's markup). Photos come from GET /gallery on the same Worker as the AI Drill
// Builder (worker/src/index.js), which lists a public Google Drive folder server-side — see
// wrangler.toml for how GOOGLE_DRIVE_API_KEY/GALLERY_FOLDER_ID are provisioned. If the Worker
// isn't configured yet (or the request fails for any reason), this falls back to a plain link to
// the Drive folder rather than showing a broken page.
(function () {
  'use strict';

  var API_BASE = window.GALLERY_API_BASE || 'https://api.rightcourtsc.com';
  var DRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/15OnlrVqOxbmUdsjWL5JuT-Va58460yrN';
  var SLIDE_DURATION_MS = 5000;

  var app = document.getElementById('gallery-app');
  if (!app) return; // Host page doesn't include the gallery markup — nothing to wire up.

  var statusEl = document.getElementById('gallery-status');
  var slideshowEl = document.getElementById('gallery-slideshow');
  var slideImage = document.getElementById('slide-image');
  var slidePrev = document.getElementById('slide-prev');
  var slideNext = document.getElementById('slide-next');
  var slidePlay = document.getElementById('slide-play');
  var slideCounter = document.getElementById('slide-counter');
  var slideViewAll = document.getElementById('slide-viewall');
  var progressBar = document.getElementById('slide-progress-bar');

  var gridEl = document.getElementById('gallery-grid');
  var gridInner = document.getElementById('gallery-grid-inner');
  var gridBack = document.getElementById('grid-back');

  var emptyEl = document.getElementById('gallery-empty');
  var fallbackLink = document.getElementById('gallery-fallback-link');
  if (fallbackLink) fallbackLink.href = DRIVE_FOLDER_URL;

  var lightbox = document.getElementById('lightbox');
  var lightboxImage = document.getElementById('lightbox-image');
  var lightboxPrev = document.getElementById('lightbox-prev');
  var lightboxNext = document.getElementById('lightbox-next');
  var lightboxClose = document.getElementById('lightbox-close');
  var lightboxCounter = document.getElementById('lightbox-counter');

  var photos = [];
  var index = 0;
  var playing = true;
  var timer = null;
  var lightboxOpen = false;

  function showEmpty() {
    statusEl.hidden = true;
    slideshowEl.hidden = true;
    gridEl.hidden = true;
    emptyEl.hidden = false;
  }

  // --- Slideshow ---------------------------------------------------------------------------

  function renderSlide() {
    var photo = photos[index];
    slideImage.src = photo.full;
    slideImage.alt = photo.name;
    slideCounter.textContent = (index + 1) + ' / ' + photos.length;
  }

  function restartProgress() {
    progressBar.style.transition = 'none';
    progressBar.style.width = '0%';
    // eslint-disable-next-line no-unused-expressions
    progressBar.offsetWidth; // force reflow so the next transition actually starts from 0%
    if (playing) {
      progressBar.style.transition = 'width ' + SLIDE_DURATION_MS + 'ms linear';
      progressBar.style.width = '100%';
    }
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function startTimer() {
    stopTimer();
    if (!playing) return;
    timer = setInterval(function () {
      goTo(index + 1);
    }, SLIDE_DURATION_MS);
  }

  function goTo(newIndex, userInitiated) {
    index = ((newIndex % photos.length) + photos.length) % photos.length;
    renderSlide();
    restartProgress();
    if (userInitiated) startTimer();
  }

  function setPlaying(next) {
    playing = next;
    slidePlay.textContent = playing ? 'Pause' : 'Play';
    slidePlay.setAttribute('aria-label', playing ? 'Pause slideshow' : 'Play slideshow');
    if (playing) {
      startTimer();
      restartProgress();
    } else {
      stopTimer();
      progressBar.style.transition = 'none';
    }
  }

  // --- Grid ----------------------------------------------------------------------------------

  function renderGrid() {
    gridInner.innerHTML = '';
    photos.forEach(function (photo, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gallery-grid-item';
      btn.setAttribute('aria-label', 'Open ' + photo.name);
      var img = document.createElement('img');
      img.src = photo.thumb;
      img.alt = photo.name;
      img.loading = 'lazy';
      btn.appendChild(img);
      btn.addEventListener('click', function () {
        openLightbox(i);
      });
      gridInner.appendChild(btn);
    });
  }

  function showGrid() {
    setPlaying(false);
    slideshowEl.hidden = true;
    gridEl.hidden = false;
  }

  function showSlideshow() {
    gridEl.hidden = true;
    slideshowEl.hidden = false;
    // index may have moved via the grid/lightbox (browsing all photos, then coming back) — always
    // resync the displayed slide to it rather than trusting whatever was last rendered.
    renderSlide();
    setPlaying(true);
  }

  // --- Lightbox --------------------------------------------------------------------------------

  function renderLightbox() {
    var photo = photos[index];
    lightboxImage.src = photo.full;
    lightboxImage.alt = photo.name;
    lightboxCounter.textContent = (index + 1) + ' / ' + photos.length;
  }

  function openLightbox(i) {
    index = i;
    renderLightbox();
    lightbox.hidden = false;
    lightboxOpen = true;
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxOpen = false;
  }

  function lightboxGoTo(newIndex) {
    index = ((newIndex % photos.length) + photos.length) % photos.length;
    renderLightbox();
  }

  // --- Wiring ------------------------------------------------------------------------------

  slidePrev.addEventListener('click', function () {
    goTo(index - 1, true);
  });
  slideNext.addEventListener('click', function () {
    goTo(index + 1, true);
  });
  slidePlay.addEventListener('click', function () {
    setPlaying(!playing);
  });
  slideViewAll.addEventListener('click', showGrid);
  gridBack.addEventListener('click', showSlideshow);

  lightboxPrev.addEventListener('click', function () {
    lightboxGoTo(index - 1);
  });
  lightboxNext.addEventListener('click', function () {
    lightboxGoTo(index + 1);
  });
  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', function (e) {
    if (lightboxOpen) {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') lightboxGoTo(index - 1);
      else if (e.key === 'ArrowRight') lightboxGoTo(index + 1);
      return;
    }
    if (!slideshowEl.hidden) {
      if (e.key === 'ArrowLeft') goTo(index - 1, true);
      else if (e.key === 'ArrowRight') goTo(index + 1, true);
    }
  });

  // --- Load ----------------------------------------------------------------------------------

  fetch(API_BASE + '/gallery')
    .then(function (response) {
      if (!response.ok) throw new Error('Gallery request failed (' + response.status + ')');
      return response.json();
    })
    .then(function (data) {
      photos = Array.isArray(data.photos) ? data.photos : [];
      if (photos.length === 0) {
        showEmpty();
        return;
      }
      statusEl.hidden = true;
      renderGrid();
      slideshowEl.hidden = false;
      index = 0;
      renderSlide();
      startTimer();
      restartProgress();
    })
    .catch(showEmpty);
})();
