"use client";

// Port of the static site's assets/js/gallery.js to React. Same DOM ids/classes so the scoped
// gallery.css (ported verbatim from gallery/index.html) applies unchanged, and same behaviour:
// the photo list comes from the gallery endpoint, falling back to a plain Drive-folder link when
// the request fails. Post-cutover the endpoint is same-origin /api/gallery (the Cloudflare
// Worker is retired); the window.GALLERY_API_BASE override hook still works for dev/test.
import { useCallback, useEffect, useRef, useState } from "react";

type GalleryPhoto = { name: string; thumb: string; full: string };

const DRIVE_FOLDER_URL =
  "https://drive.google.com/drive/folders/15OnlrVqOxbmUdsjWL5JuT-Va58460yrN";
const SLIDE_DURATION_MS = 5000;
const PLACEHOLDER_SRC = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E";

type View = "loading" | "slideshow" | "grid" | "empty";

function apiUrl(): string {
  // Matches gallery.js's window.GALLERY_API_BASE override hook; the default is now same-origin
  // (the route handler ported from the Worker in app/api/gallery/route.ts).
  const w = window as unknown as { GALLERY_API_BASE?: string };
  return w.GALLERY_API_BASE ? `${w.GALLERY_API_BASE}/gallery` : "/api/gallery/";
}

export default function Gallery() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [view, setView] = useState<View>("loading");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // --- Load ----------------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl())
      .then((response) => {
        if (!response.ok) throw new Error(`Gallery request failed (${response.status})`);
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        const list: GalleryPhoto[] = Array.isArray(data.photos) ? data.photos : [];
        if (list.length === 0) {
          setView("empty");
          return;
        }
        setPhotos(list);
        setIndex(0);
        setView("slideshow");
      })
      .catch(() => {
        if (!cancelled) setView("empty");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Slideshow ---------------------------------------------------------------------------
  const goTo = useCallback(
    (newIndex: number) => {
      const n = photos.length || 1;
      setIndex(((newIndex % n) + n) % n);
    },
    [photos.length],
  );

  // Autoplay timer. Recreated whenever the index changes so a manual advance restarts the
  // countdown, matching gallery.js's startTimer()-on-user-initiated-goTo behaviour.
  useEffect(() => {
    if (!playing || view !== "slideshow" || photos.length === 0) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % photos.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(timer);
  }, [playing, view, photos.length, index]);

  // Progress bar: imperative inline-style animation, mirroring gallery.js's restartProgress()
  // (reset to 0% with no transition, force reflow, then transition to 100% over the slide
  // duration while playing).
  useEffect(() => {
    const bar = progressBarRef.current;
    if (!bar || view !== "slideshow") return;
    bar.style.transition = "none";
    bar.style.width = "0%";
    void bar.offsetWidth; // force reflow so the next transition starts from 0%
    if (playing) {
      bar.style.transition = `width ${SLIDE_DURATION_MS}ms linear`;
      bar.style.width = "100%";
    }
  }, [index, playing, view, photos]);

  useEffect(() => {
    const bar = progressBarRef.current;
    if (!bar || view !== "slideshow") return;
    if (!playing) bar.style.transition = "none";
  }, [playing, view]);

  // --- Grid / lightbox -----------------------------------------------------------------------
  const showGrid = () => {
    setPlaying(false);
    setView("grid");
  };

  const showSlideshow = () => {
    setView("slideshow");
    setPlaying(true);
  };

  const openLightbox = (i: number) => {
    setIndex(i);
    setLightboxOpen(true);
  };

  // Shared slide stepper for slideshow arrows, lightbox arrows, and keyboard navigation —
  // gallery.js's goTo()/lightboxGoTo() with the same wrap-around modular arithmetic.
  const stepBy = useCallback(
    (delta: number) => {
      setIndex((prev) => {
        const n = photos.length || 1;
        return (((prev + delta) % n) + n) % n;
      });
    },
    [photos.length],
  );

  // --- Keyboard ------------------------------------------------------------------------------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (lightboxOpen) {
        if (e.key === "Escape") setLightboxOpen(false);
        else if (e.key === "ArrowLeft") stepBy(-1);
        else if (e.key === "ArrowRight") stepBy(1);
        return;
      }
      if (view === "slideshow") {
        if (e.key === "ArrowLeft") stepBy(-1);
        else if (e.key === "ArrowRight") stepBy(1);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen, view, photos.length, stepBy]);

  const current = photos[index];

  return (
    <>
      <p className="gallery-intro">
        The evidence. Sessions, socials, club nights, and the odd photo someone definitely
        didn&rsquo;t mean to be in. Got shots to add? Ask a committee member for the upload link, or
        just email them to <a href="mailto:info@rightcourtsc.com">info@rightcourtsc.com</a> and
        we&rsquo;ll slot them in.
      </p>

      <div className="gallery-app" id="gallery-app">
        <p className="gallery-status" id="gallery-status" hidden={view !== "loading"}>
          Loading photos&hellip;
        </p>

        <div className="gallery-slideshow" id="gallery-slideshow" hidden={view !== "slideshow"}>
          <div className="slideshow-stage">
            <button
              type="button"
              className="slideshow-arrow slideshow-arrow-prev"
              id="slide-prev"
              aria-label="Previous photo"
              onClick={() => goTo(index - 1)}
            >
              &#8249;
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="slideshow-image"
              id="slide-image"
              src={current ? current.full : PLACEHOLDER_SRC}
              alt={current ? current.name : ""}
            />
            <button
              type="button"
              className="slideshow-arrow slideshow-arrow-next"
              id="slide-next"
              aria-label="Next photo"
              onClick={() => goTo(index + 1)}
            >
              &#8250;
            </button>
          </div>
          <div className="slideshow-progress">
            <div className="slideshow-progress-bar" id="slide-progress-bar" ref={progressBarRef} />
          </div>
          <div className="slideshow-controls">
            <button
              type="button"
              id="slide-play"
              aria-label={playing ? "Pause slideshow" : "Play slideshow"}
              onClick={() => setPlaying((prev) => !prev)}
            >
              {playing ? "Pause" : "Play"}
            </button>
            <span className="slideshow-counter" id="slide-counter">
              {photos.length > 0 ? `${index + 1} / ${photos.length}` : ""}
            </span>
            <button type="button" id="slide-viewall" onClick={showGrid}>
              View all photos
            </button>
          </div>
        </div>

        <div className="gallery-grid" id="gallery-grid" hidden={view !== "grid"}>
          <button type="button" className="gallery-grid-back" id="grid-back" onClick={showSlideshow}>
            &larr; Back to slideshow
          </button>
          <div className="gallery-grid-inner" id="gallery-grid-inner">
            {photos.map((photo, i) => (
              <button
                key={photo.full}
                type="button"
                className="gallery-grid-item"
                aria-label={`Open ${photo.name}`}
                onClick={() => openLightbox(i)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.thumb} alt={photo.name} loading="lazy" />
              </button>
            ))}
          </div>
        </div>

        <div className="gallery-empty" id="gallery-empty" hidden={view !== "empty"}>
          <p>Couldn&rsquo;t load the gallery right now.</p>
          <p>
            <a id="gallery-fallback-link" href={DRIVE_FOLDER_URL}>
              View photos on Google Drive &rarr;
            </a>
          </p>
        </div>
      </div>

      <div
        className="lightbox"
        id="lightbox"
        hidden={!lightboxOpen}
        onClick={(e) => {
          if (e.target === e.currentTarget) setLightboxOpen(false);
        }}
      >
        <button
          type="button"
          className="lightbox-close"
          id="lightbox-close"
          aria-label="Close"
          onClick={() => setLightboxOpen(false)}
        >
          &times;
        </button>
        <button
          type="button"
          className="lightbox-arrow lightbox-arrow-prev"
          id="lightbox-prev"
          aria-label="Previous photo"
          onClick={() => stepBy(-1)}
        >
          &#8249;
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="lightbox-image"
          id="lightbox-image"
          src={current ? current.full : PLACEHOLDER_SRC}
          alt={current ? current.name : ""}
        />
        <button
          type="button"
          className="lightbox-arrow lightbox-arrow-next"
          id="lightbox-next"
          aria-label="Next photo"
          onClick={() => stepBy(1)}
        >
          &#8250;
        </button>
        <div className="lightbox-counter" id="lightbox-counter">
          {photos.length > 0 ? `${index + 1} / ${photos.length}` : ""}
        </div>
      </div>
    </>
  );
}
