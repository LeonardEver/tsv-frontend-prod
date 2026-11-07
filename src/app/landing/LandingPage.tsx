/**
 * Public marketing landing page — the one route outside the authenticated app.
 *
 * Converted from a standalone static site (index.html + styles.css +
 * polish.css + script.js). The stylesheets are now a CSS module: the landing's
 * design tokens live on the `.landing` wrapper instead of `:root`, and its bare
 * element rules (html/body/nav/footer) are nested under it, so nothing here
 * reaches the app shell — `--surface` and `--muted` previously collided with
 * src/styles/lovable.css. See landing.module.css.
 */
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { clsx } from "clsx";
import styles from "./landing.module.css";
import heroImage from "./assets/field-table-hero.jpg";
import dashboardDesktop from "./assets/dashboard-desktop.png";
import dashboardMobile from "./assets/dashboard-mobile.png";

const TITLE = "Survival Academy — Train for the real world";
const DESCRIPTION =
  "Survival Academy turns essential preparedness skills into a clear, motivating field curriculum.";

const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap";

/**
 * Title, meta description and the landing's own web fonts are applied while the
 * route is mounted. Injecting the fonts here rather than in index.html keeps
 * them off the authenticated app's render-blocking path (the browser only
 * fetches a web font once something actually uses its family).
 */
function useLandingDocument() {
  useEffect(() => {
    const previousTitle = document.title;

    const meta = document.createElement("meta");
    meta.name = "description";
    meta.content = DESCRIPTION;

    const head: HTMLElement[] = [meta];
    for (const attrs of [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: FONTS_HREF },
    ]) {
      const link = document.createElement("link");
      Object.assign(link, attrs);
      head.push(link);
    }

    // Any earlier description tag (e.g. a previous landing visit) would now be
    // a duplicate, so replace rather than append it.
    document.head.querySelector('meta[name="description"]')?.remove();
    for (const el of head) document.head.appendChild(el);
    document.title = TITLE;

    return () => {
      for (const el of head) el.remove();
      document.title = previousTitle;
    };
  }, []);
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useLandingDocument();

  // Escape closes the mobile menu and returns focus to the toggle (the original
  // script.js did this with DOM listeners).
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  /**
   * The static page leaned on `html { scroll-behavior: smooth }`. The app owns
   * <html>, so in-page anchors are scrolled here instead — honouring
   * prefers-reduced-motion, which the original handled via a media query.
   */
  const handleAnchorClick = (event: MouseEvent<HTMLDivElement>) => {
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    const root = rootRef.current;
    if (!link || !root) return;

    const id = (link.getAttribute("href") ?? "").slice(1);
    const target = id ? root.querySelector(`#${CSS.escape(id)}`) : null;
    if (!(target instanceof HTMLElement)) return;

    event.preventDefault();
    setMenuOpen(false);
    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  };

  return (
    <div className={styles.landing} ref={rootRef} onClick={handleAnchorClick}>
      <a className={styles.skipLink} href="#main">
        Skip to content
      </a>

      <header className={styles.siteHeader}>
        <a className={styles.brand} href="#top" aria-label="Survival Academy home">
          <span className={styles.mark}>△</span>
          <span>
            SURVIVAL <i>ACADEMY</i>
          </span>
        </a>
        {/* No onClick here: handleAnchorClick on the wrapper closes the menu
            whenever any in-page anchor is followed. */}
        <nav className={clsx(menuOpen && styles.isOpen)} aria-label="Main navigation">
          <a href="#system">How it works</a>
          <a href="#skills">Skills</a>
          <a href="#inside">Inside the academy</a>
          <a href="#plans">Plans</a>
        </nav>
        <a className={styles.headerCta} href="#plans">
          View plans <span>↓</span>
        </a>
        <button
          type="button"
          ref={menuButtonRef}
          className={styles.menuButton}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => {
            setMenuOpen((open) => !open);
          }}
        >
          <span />
          <span />
        </button>
      </header>

      <main id="main">
        <section className={styles.hero} id="top">
          <img
            src={heroImage}
            alt="Preparedness tools on a field table overlooking a misty mountain forest"
            width={1672}
            height={909}
            fetchPriority="high"
          />
          <div className={styles.heroShade} />
          <div className={styles.topo} aria-hidden="true" />
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>
              <span className={styles.statusDot} /> Your preparedness starts here
            </p>
            <h1>
              Train for the
              <br />
              <em>real world.</em>
            </h1>
            <p className={styles.heroCopy}>
              Build practical skills for the moments when clear thinking matters most. Learn
              survival, self-reliance, and preparedness one field-tested mission at a time.
            </p>
            <div className={styles.heroActions}>
              <a className={clsx(styles.button, styles.buttonPrimary)} href="#plans">
                See plans &amp; start training <span>↓</span>
              </a>
              <a className={styles.textLink} href="#inside">
                Explore the academy <span>↓</span>
              </a>
            </div>
            <dl className={styles.heroStats}>
              <div>
                <dt>09</dt>
                <dd>Skill regions</dd>
              </div>
              <div>
                <dt>80+</dt>
                <dd>Field missions</dd>
              </div>
              <div>
                <dt>01</dt>
                <dd>Path forward</dd>
              </div>
            </dl>
          </div>
          <aside className={styles.missionCard} aria-label="Your first mission preview">
            <span className={styles.cardLabel}>First mission</span>
            <h2>
              Survival
              <br />
              Fundamentals
            </h2>
            <p>Start with the essentials: priorities, decision-making, and a practical mindset.</p>
            <div className={styles.missionFooter}>
              <span>06 missions</span>
              <b>Explore →</b>
            </div>
          </aside>
          <div className={styles.scrollCue}>
            <span />
            Scroll to enter
          </div>
        </section>

        <section className={clsx(styles.truth, styles.section)} id="system">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>Not another content library</p>
            <h2>
              Knowledge you can <em>use.</em>
            </h2>
          </div>
          <p className={styles.truthCopy}>
            Watching is not preparedness. Survival Academy turns essential knowledge into a guided
            training system built around lessons, field tests, progress, and useful references.
          </p>
          <div className={styles.trainingLine} aria-label="Learning loop">
            <div>
              <span>01</span>
              <strong>Learn</strong>
              <small>Clear, focused lessons</small>
            </div>
            <i />
            <div>
              <span>02</span>
              <strong>Test</strong>
              <small>Put knowledge to work</small>
            </div>
            <i />
            <div>
              <span>03</span>
              <strong>Progress</strong>
              <small>Build capability over time</small>
            </div>
          </div>
        </section>

        <section className={clsx(styles.regions, styles.section)} id="skills">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Your expedition</p>
              <h2>
                Skills for the <em>whole field.</em>
              </h2>
            </div>
            <p>Follow a structured route through the core skills of practical preparedness.</p>
          </div>
          <div className={styles.regionGrid}>
            <article className={clsx(styles.region, styles.regionWide)}>
              <span className={styles.regionNumber}>01 — Foundation</span>
              <h3>
                Survival
                <br />
                Fundamentals
              </h3>
              <p>Make better decisions when the situation changes.</p>
              <span className={styles.line} />
            </article>
            <article className={clsx(styles.region, styles.water)}>
              <span className={styles.regionNumber}>02 — Water</span>
              <h3>Water</h3>
              <p>Find it. Judge it. Treat it.</p>
              <span className={styles.line} />
            </article>
            <article className={clsx(styles.region, styles.fire)}>
              <span className={styles.regionNumber}>03 — Fire</span>
              <h3>Fire</h3>
              <p>Heat, light, and safety.</p>
              <span className={styles.line} />
            </article>
            <article className={clsx(styles.region, styles.shelter)}>
              <span className={styles.regionNumber}>04 — Shelter</span>
              <h3>Shelter</h3>
              <p>Stay dry. Stay warm.</p>
              <span className={styles.line} />
            </article>
            <article className={clsx(styles.region, styles.compact)}>
              <span className={styles.regionNumber}>05 — Food</span>
              <h3>Food</h3>
            </article>
            <article className={clsx(styles.region, styles.compact)}>
              <span className={styles.regionNumber}>06 — Grow</span>
              <h3>Agriculture</h3>
            </article>
            <article className={clsx(styles.region, styles.compact)}>
              <span className={styles.regionNumber}>07 — Care</span>
              <h3>First Aid</h3>
            </article>
            <article className={clsx(styles.region, styles.compact)}>
              <span className={styles.regionNumber}>08 — Orient</span>
              <h3>Navigation</h3>
            </article>
          </div>
        </section>

        <section className={clsx(styles.inside, styles.section)} id="inside">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>Built to keep you moving</p>
            <h2>
              Every session gives you a <em>next move.</em>
            </h2>
          </div>
          <figure className={styles.dashboardCapture}>
            <picture>
              <source media="(max-width: 780px)" srcSet={dashboardMobile} />
              <img
                src={dashboardDesktop}
                alt="Survival Academy Base Camp dashboard showing mission progress and preparedness training"
                width={1832}
                height={887}
                loading="lazy"
              />
            </picture>
            <figcaption>
              Follow your next mission, training progress, and readiness in one clear base camp.
            </figcaption>
          </figure>
          <div className={styles.insideNotes}>
            <p>
              <b>Learn with intent.</b> Concise lessons strip away the noise and focus on the
              decision behind the skill.
            </p>
            <p>
              <b>Prove what you know.</b> Quizzes and field tests turn passive reading into
              practical recall.
            </p>
            <p>
              <b>See your readiness grow.</b> XP, levels, streaks, and regions give your training a
              visible path.
            </p>
          </div>
        </section>

        <section className={styles.fieldNote}>
          <div className={styles.fieldNoteInner}>
            <p className={styles.eyebrow}>Preparedness is a practice</p>
            <blockquote>“The best time to learn what to do is before you need to do it.”</blockquote>
            <a className={styles.textLink} href="#plans">
              Choose your training level <span>→</span>
            </a>
          </div>
        </section>

        <section className={clsx(styles.plans, styles.section)} id="plans">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Choose your access</p>
              <h2>
                Start where you <em>are.</em>
              </h2>
            </div>
            <p>Get a first mission free. Upgrade when you're ready to train without limits.</p>
          </div>
          <div className={styles.planGrid}>
            <article className={clsx(styles.plan, styles.planFree)}>
              <div className={styles.planHeading}>
                <div>
                  <p className={styles.planKicker}>Training plan</p>
                  <h3>Free</h3>
                </div>
                <div className={styles.price}>$0</div>
              </div>
              <p>
                Your daily training ration. One lesson and one field test a day, with every resource
                available to view.
              </p>
              <ul className={styles.planHighlights}>
                <li>1 lesson per day</li>
                <li>1 field test per day</li>
              </ul>
              <a className={clsx(styles.button, styles.buttonGhost)} href="https://survivalacademy.online/">
                Start free
              </a>
            </article>

            <article className={clsx(styles.plan, styles.featured, styles.planSurvivor)}>
              <span className={styles.recommended}>Most popular</span>
              <div className={styles.planHeading}>
                <div>
                  <p className={styles.planKicker}>Training plan</p>
                  <h3>Survivor</h3>
                </div>
                <div className={styles.price}>
                  $9.90 <small>/ month</small>
                </div>
              </div>
              <p>
                For the committed prepper — 10 lessons and 10 quizzes a day, full Community access
                and downloadable field resources.
              </p>
              <ul>
                <li>10 lessons per day</li>
                <li>10 field tests per day</li>
                <li>Field test before lesson</li>
                <li>View field resources</li>
                <li>Download field resources</li>
                <li>Community access</li>
              </ul>
              <a className={clsx(styles.button, styles.buttonPrimary)} href="https://survivalacademy.online/">
                Choose Survivor <span>→</span>
              </a>
            </article>

            <article className={clsx(styles.plan, styles.planOperator)}>
              <div className={styles.planHeading}>
                <div>
                  <p className={styles.planKicker}>Training plan</p>
                  <h3>Operator</h3>
                </div>
                <div className={styles.price}>
                  $19.90 <small>/ month</small>
                </div>
              </div>
              <p>
                Unlimited training for daily operators and instructors. Everything in Survivor,
                without daily limits.
              </p>
              <ul className={styles.planHighlights}>
                <li>Unlimited lessons</li>
                <li>Unlimited field tests</li>
                <li>Full Academy access</li>
              </ul>
              <details className={styles.planDetails}>
                <summary>
                  See full Operator access <span aria-hidden="true">+</span>
                </summary>
                <ul>
                  <li>Field test before lesson</li>
                  <li>View field resources</li>
                  <li>Download field resources</li>
                  <li>Community access</li>
                </ul>
              </details>
              <a className={clsx(styles.button, styles.buttonGhost)} href="https://survivalacademy.online/">
                Choose Operator
              </a>
            </article>
          </div>
          <p className={styles.planNote}>
            Cancel anytime. No long-term contract. Payments are securely processed.
          </p>
        </section>

        <section className={styles.finalCta}>
          <div className={styles.topo} aria-hidden="true" />
          <p className={styles.eyebrow}>Your expedition starts here</p>
          <h2>
            Be harder to
            <br />
            <em>surprise.</em>
          </h2>
          <p>Start with the fundamentals. Build skills you'll carry anywhere.</p>
          <a className={clsx(styles.button, styles.buttonPrimary)} href="https://survivalacademy.online/">
            Start training free <span>→</span>
          </a>
        </section>
      </main>

      <footer>
        <a className={styles.brand} href="#top">
          <span className={styles.mark}>△</span>
          <span>
            SURVIVAL <i>ACADEMY</i>
          </span>
        </a>
        <p>Practical knowledge for a more capable life.</p>
        <span>© 2026 Survival Academy</span>
      </footer>
    </div>
  );
}

export default LandingPage;
