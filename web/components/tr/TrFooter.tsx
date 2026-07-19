// T&R footer — port of the shared <footer> markup from the source pages.
// The source updated the copyright year via js/main.js's [data-year] hook; here the
// year is rendered directly at build/request time (same visible result).
import Link from "next/link";
import TrCrest from "./TrCrest";

export default function TrFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__col">
            <Link href="/turnerandrhodes/" className="brand" style={{ marginBottom: "16px" }}>
              <TrCrest />
              <span className="brand__name">
                Turner <em>&amp;</em> Rhodes
              </span>
            </Link>
            <p>
              Solicitors specialising in sports injury and personal liability claims, operating
              from offices off Wrenfield Court since 2009.
            </p>
          </div>
          <div className="footer__col">
            <h3>Practice Areas</h3>
            <ul>
              <li>
                <Link href="/turnerandrhodes/practice-areas/#sports-injury">
                  Sports Injury Claims
                </Link>
              </li>
              <li>
                <Link href="/turnerandrhodes/practice-areas/#squash">
                  Squash &amp; Racquetball Court Claims
                </Link>
              </li>
              <li>
                <Link href="/turnerandrhodes/practice-areas/#ocular">
                  Ocular &amp; Eye Trauma
                </Link>
              </li>
              <li>
                <Link href="/turnerandrhodes/practice-areas/#slip-trip">
                  Slip, Trip &amp; Public Liability
                </Link>
              </li>
            </ul>
          </div>
          <div className="footer__col">
            <h3>The Firm</h3>
            <ul>
              <li>
                <Link href="/turnerandrhodes/about/">About Us</Link>
              </li>
              <li>
                <Link href="/turnerandrhodes/team/">Our Team</Link>
              </li>
              <li>
                <Link href="/turnerandrhodes/contact/">Contact</Link>
              </li>
            </ul>
          </div>
          <div className="footer__col">
            <h3>Office</h3>
            <p>
              14 Wrenfield Court
              <br />
              London WC9 9ZZ
            </p>
            <p>
              020 7946 0192
              <br />
              clerks@turnerandrhodes.example
            </p>
          </div>
        </div>
        <div className="footer__bottom">
          <span>
            &copy; <span data-year="">{new Date().getFullYear()}</span> Turner &amp; Rhodes
            Solicitors. All rights reserved.
          </span>
          <span>
            Fictional firm created as a front-end/JS design showcase — not a real legal practice.
            No solicitor&ndash;client relationship is formed via this site.
          </span>
          <span>
            Proud legal partner of{" "}
            <a href="https://rightcourtsc.com/" target="_blank" rel="noopener">
              Right Court SC
            </a>
            .
          </span>
        </div>
      </div>
    </footer>
  );
}
