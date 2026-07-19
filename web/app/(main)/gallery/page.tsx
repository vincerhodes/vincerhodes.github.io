// Port of the static site's gallery/index.html. The page-scoped <style> block is ported verbatim
// to ./gallery.css (imported here, so it only loads on this route); the slideshow/grid/lightbox
// behaviour of assets/js/gallery.js lives in @/components/Gallery.
import type { Metadata } from "next";
import Gallery from "@/components/Gallery";
import "./gallery.css";

export const metadata: Metadata = {
  title: "Gallery — Right Court SC",
  description: "Photos from Right Court SC sessions, socials, and club nights.",
};

export default function GalleryPage() {
  return (
    <>
      <section className="page-header">
        <h1>Gallery</h1>
      </section>

      <main>
        <Gallery />
      </main>
    </>
  );
}
