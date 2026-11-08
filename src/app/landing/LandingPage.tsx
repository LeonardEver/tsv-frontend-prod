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
import { tr as uiText, useLocale as useInterfaceLocale } from "@/i18n";
import { formatMoney } from "@/lib/format/format";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { clsx } from "clsx";
import styles from "./landing.module.css";
import heroImage from "./assets/field-table-hero.jpg";
import dashboardDesktop from "./assets/dashboard-desktop.png";
import dashboardMobile from "./assets/dashboard-mobile.png";


const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap";

/**
 * Title, meta description and the landing's own web fonts are applied while the
 * route is mounted. Injecting the fonts here rather than in index.html keeps
 * them off the authenticated app's render-blocking path (the browser only
 * fetches a web font once something actually uses its family).
 */
function useLandingDocument() {
  const locale = useInterfaceLocale();
  useEffect(() => {
    const previousTitle = document.title;

    const meta = document.createElement("meta");
    meta.name = "description";
    meta.content = uiText("public:seoDescription");

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
    document.title = uiText("public:seoTitle");

    return () => {
      for (const el of head) el.remove();
      document.title = previousTitle;
    };
  }, [locale]);
}

export function LandingPage() {
  useInterfaceLocale();
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
      <a className={styles.skipLink} href="#main">{uiText("public:skip_to_content_0a4470")}</a>

      <header className={styles.siteHeader}>
        <a className={styles.brand} href="#top" aria-label={uiText("public:survival_academy_home_b71097")}>
          <span className={styles.mark}>△</span>
          <span>{uiText("public:survival_d8e68b")}{" "}<i>{uiText("public:academy_681f13")}</i>
          </span>
        </a>
        {/* No onClick here: handleAnchorClick on the wrapper closes the menu
            whenever any in-page anchor is followed. */}
        <nav className={clsx(menuOpen && styles.isOpen)} aria-label={uiText("public:main_navigation_efd197")}>
          <a href="#system">{uiText("public:how_it_works_1dd6a1")}</a>
          <a href="#skills">{uiText("public:skills_e09212")}</a>
          <a href="#inside">{uiText("public:inside_the_academy_d57445")}</a>
          <a href="#plans">{uiText("public:plans_cf2e5f")}</a>
        </nav>
        <a className={styles.headerCta} href="#plans">{uiText("public:view_plans_804787")}{" "}<span>↓</span>
        </a>
        <button
          type="button"
          ref={menuButtonRef}
          className={styles.menuButton}
          aria-label={menuOpen ? uiText("public:close_menu_6c9fc9") : uiText("public:open_menu_197101")}
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
            alt={uiText("public:preparedness_tools_on_a_field_table_overlooking_7e058e")}
            width={1672}
            height={909}
            fetchPriority="high"
          />
          <div className={styles.heroShade} />
          <div className={styles.topo} aria-hidden="true" />
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>
              <span className={styles.statusDot} />{" "}{uiText("public:your_preparedness_starts_here_3ca7a2")}</p>
            <h1>{uiText("public:train_for_the_275c89")}<br />
              <em>{uiText("public:real_world_f730da")}</em>
            </h1>
            <p className={styles.heroCopy}>{uiText("public:build_practical_skills_for_the_moments_when_b8be17")}</p>
            <div className={styles.heroActions}>
              <a className={clsx(styles.button, styles.buttonPrimary)} href="#plans">{uiText("public:see_plans_start_training_e66b8b")}{" "}<span>↓</span>
              </a>
              <a className={styles.textLink} href="#inside">{uiText("public:explore_the_academy_d0b347")}{" "}<span>↓</span>
              </a>
            </div>
            <dl className={styles.heroStats}>
              <div>
                <dt>09</dt>
                <dd>{uiText("public:skill_regions_3f2d53")}</dd>
              </div>
              <div>
                <dt>80+</dt>
                <dd>{uiText("public:field_missions_6406c2")}</dd>
              </div>
              <div>
                <dt>01</dt>
                <dd>{uiText("public:path_forward_9f6959")}</dd>
              </div>
            </dl>
          </div>
          <aside className={styles.missionCard} aria-label={uiText("public:your_first_mission_preview_8d1cd0")}>
            <span className={styles.cardLabel}>{uiText("public:first_mission_6416fd")}</span>
            <h2>{uiText("public:survival_fe88ea")}<br />{uiText("public:fundamentals_052d8a")}</h2>
            <p>{uiText("public:start_with_the_essentials_priorities_decision_making_fa6fae")}</p>
            <div className={styles.missionFooter}>
              <span>{uiText("public:06_missions_56bae1")}</span>
              <b>{uiText("public:explore_ce7703")}</b>
            </div>
          </aside>
          <div className={styles.scrollCue}>
            <span />{uiText("public:scroll_to_enter_20c6ae")}</div>
        </section>

        <section className={clsx(styles.truth, styles.section)} id="system">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>{uiText("public:not_another_content_library_8d2d03")}</p>
            <h2>{uiText("public:knowledge_you_can_83cadc")}{" "}<em>{uiText("public:use_8c7cdb")}</em>
            </h2>
          </div>
          <p className={styles.truthCopy}>{uiText("public:watching_is_not_preparedness_survival_academy_turns_74fec1")}</p>
          <div className={styles.trainingLine} aria-label={uiText("public:learning_loop_2c16b5")}>
            <div>
              <span>01</span>
              <strong>{uiText("public:learn_b04837")}</strong>
              <small>{uiText("public:clear_focused_lessons_f267de")}</small>
            </div>
            <i />
            <div>
              <span>02</span>
              <strong>{uiText("public:test_640ab2")}</strong>
              <small>{uiText("public:put_knowledge_to_work_1fec20")}</small>
            </div>
            <i />
            <div>
              <span>03</span>
              <strong>{uiText("public:progress_1b9027")}</strong>
              <small>{uiText("public:build_capability_over_time_165a8c")}</small>
            </div>
          </div>
        </section>

        <section className={clsx(styles.regions, styles.section)} id="skills">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>{uiText("public:your_expedition_dbe444")}</p>
              <h2>{uiText("public:skills_for_the_90b33c")}{" "}<em>{uiText("public:whole_field_524b90")}</em>
              </h2>
            </div>
            <p>{uiText("public:follow_a_structured_route_through_the_core_7cec03")}</p>
          </div>
          <div className={styles.regionGrid}>
            <article className={clsx(styles.region, styles.regionWide)}>
              <span className={styles.regionNumber}>{uiText("public:01_foundation_051ae6")}</span>
              <h3>{uiText("public:survival_fe88ea")}<br />{uiText("public:fundamentals_052d8a")}</h3>
              <p>{uiText("public:make_better_decisions_when_the_situation_changes_a3036e")}</p>
              <span className={styles.line} />
            </article>
            <article className={clsx(styles.region, styles.water)}>
              <span className={styles.regionNumber}>{uiText("public:02_water_c68d1f")}</span>
              <h3>{uiText("public:water_de9b1b")}</h3>
              <p>{uiText("public:find_it_judge_it_treat_it_651e57")}</p>
              <span className={styles.line} />
            </article>
            <article className={clsx(styles.region, styles.fire)}>
              <span className={styles.regionNumber}>{uiText("public:03_fire_76a371")}</span>
              <h3>{uiText("public:fire_78baeb")}</h3>
              <p>{uiText("public:heat_light_and_safety_9548d9")}</p>
              <span className={styles.line} />
            </article>
            <article className={clsx(styles.region, styles.shelter)}>
              <span className={styles.regionNumber}>{uiText("public:04_shelter_c74b62")}</span>
              <h3>{uiText("public:shelter_a8fbb4")}</h3>
              <p>{uiText("public:stay_dry_stay_warm_af7198")}</p>
              <span className={styles.line} />
            </article>
            <article className={clsx(styles.region, styles.compact)}>
              <span className={styles.regionNumber}>{uiText("public:05_food_6b18d0")}</span>
              <h3>{uiText("public:food_35b259")}</h3>
            </article>
            <article className={clsx(styles.region, styles.compact)}>
              <span className={styles.regionNumber}>{uiText("public:06_grow_b04823")}</span>
              <h3>{uiText("public:agriculture_8d1cd3")}</h3>
            </article>
            <article className={clsx(styles.region, styles.compact)}>
              <span className={styles.regionNumber}>{uiText("public:07_care_5c17d3")}</span>
              <h3>{uiText("public:first_aid_016e92")}</h3>
            </article>
            <article className={clsx(styles.region, styles.compact)}>
              <span className={styles.regionNumber}>{uiText("public:08_orient_0ddf70")}</span>
              <h3>{uiText("public:navigation_cf03cf")}</h3>
            </article>
          </div>
        </section>

        <section className={clsx(styles.inside, styles.section)} id="inside">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>{uiText("public:built_to_keep_you_moving_8be47d")}</p>
            <h2>{uiText("public:every_session_gives_you_a_b07b6a")}{" "}<em>{uiText("public:next_move_e471d5")}</em>
            </h2>
          </div>
          <figure className={styles.dashboardCapture}>
            <picture>
              <source media="(max-width: 780px)" srcSet={dashboardMobile} />
              <img
                src={dashboardDesktop}
                alt={uiText("public:survival_academy_base_camp_dashboard_showing_mission_a94f30")}
                width={1832}
                height={887}
                loading="lazy"
              />
            </picture>
            <figcaption>{uiText("public:follow_your_next_mission_training_progress_and_2a4f44")}</figcaption>
          </figure>
          <div className={styles.insideNotes}>
            <p>
              <b>{uiText("public:learn_with_intent_9c33ef")}</b>{" "}{uiText("public:concise_lessons_strip_away_the_noise_and_7e0aa5")}</p>
            <p>
              <b>{uiText("public:prove_what_you_know_bbcdb3")}</b>{" "}{uiText("public:quizzes_and_field_tests_turn_passive_reading_486387")}</p>
            <p>
              <b>{uiText("public:see_your_readiness_grow_85b3ec")}</b>{" "}{uiText("public:xp_levels_streaks_and_regions_give_your_8639d8")}</p>
          </div>
        </section>

        <section className={styles.fieldNote}>
          <div className={styles.fieldNoteInner}>
            <p className={styles.eyebrow}>{uiText("public:preparedness_is_a_practice_87ec26")}</p>
            <blockquote>{uiText("public:the_best_time_to_learn_what_to_a4ddcc")}</blockquote>
            <a className={styles.textLink} href="#plans">{uiText("public:choose_your_training_level_d5a973")}{" "}<span>→</span>
            </a>
          </div>
        </section>

        <section className={clsx(styles.plans, styles.section)} id="plans">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>{uiText("public:choose_your_access_ff02cc")}</p>
              <h2>{uiText("public:start_where_you_8c085d")}{" "}<em>{uiText("public:are_7d991c")}</em>
              </h2>
            </div>
            <p>{uiText("public:get_a_first_mission_free_upgrade_when_6ad52c")}</p>
          </div>
          <div className={styles.planGrid}>
            <article className={clsx(styles.plan, styles.planFree)}>
              <div className={styles.planHeading}>
                <div>
                  <p className={styles.planKicker}>{uiText("public:training_plan_2f88af")}</p>
                  <h3>{uiText("public:free_75f527")}</h3>
                </div>
                <div className={styles.price}>{formatMoney(0, "USD")}</div>
              </div>
              <p>{uiText("public:your_daily_training_ration_one_lesson_and_321a6e")}</p>
              <ul className={styles.planHighlights}>
                <li>{uiText("public:1_lesson_per_day_01b706")}</li>
                <li>{uiText("public:1_field_test_per_day_c9443c")}</li>
              </ul>
              <a className={clsx(styles.button, styles.buttonGhost)} href="https://survivalacademy.online/">{uiText("public:start_free_ccffc4")}</a>
            </article>

            <article className={clsx(styles.plan, styles.featured, styles.planSurvivor)}>
              <span className={styles.recommended}>{uiText("public:most_popular_5adbdd")}</span>
              <div className={styles.planHeading}>
                <div>
                  <p className={styles.planKicker}>{uiText("public:training_plan_2f88af")}</p>
                  <h3>{uiText("public:survivor_618954")}</h3>
                </div>
                <div className={styles.price}>
                  {formatMoney(9.9, "USD")} <small>{uiText("public:monthSuffix")}</small>
                </div>
              </div>
              <p>{uiText("public:for_the_committed_prepper_10_lessons_and_d2533a")}</p>
              <ul>
                <li>{uiText("public:10_lessons_per_day_3ede82")}</li>
                <li>{uiText("public:10_field_tests_per_day_024d00")}</li>
                <li>{uiText("public:field_test_before_lesson_f25ded")}</li>
                <li>{uiText("public:view_field_resources_09c551")}</li>
                <li>{uiText("public:download_field_resources_2b048b")}</li>
                <li>{uiText("public:community_access_b8fca8")}</li>
              </ul>
              <a className={clsx(styles.button, styles.buttonPrimary)} href="https://survivalacademy.online/">{uiText("public:choose_survivor_7b7570")}{" "}<span>→</span>
              </a>
            </article>

            <article className={clsx(styles.plan, styles.planOperator)}>
              <div className={styles.planHeading}>
                <div>
                  <p className={styles.planKicker}>{uiText("public:training_plan_2f88af")}</p>
                  <h3>{uiText("public:operator_d0e687")}</h3>
                </div>
                <div className={styles.price}>
                  {formatMoney(19.9, "USD")} <small>{uiText("public:monthSuffix")}</small>
                </div>
              </div>
              <p>{uiText("public:unlimited_training_for_daily_operators_and_instructors_0a888f")}</p>
              <ul className={styles.planHighlights}>
                <li>{uiText("public:unlimited_lessons_cb44ad")}</li>
                <li>{uiText("public:unlimited_field_tests_34529d")}</li>
                <li>{uiText("public:full_academy_access_92d264")}</li>
              </ul>
              <details className={styles.planDetails}>
                <summary>{uiText("public:see_full_operator_access_ecba82")}{" "}<span aria-hidden="true">+</span>
                </summary>
                <ul>
                  <li>{uiText("public:field_test_before_lesson_f25ded")}</li>
                  <li>{uiText("public:view_field_resources_09c551")}</li>
                  <li>{uiText("public:download_field_resources_2b048b")}</li>
                  <li>{uiText("public:community_access_b8fca8")}</li>
                </ul>
              </details>
              <a className={clsx(styles.button, styles.buttonGhost)} href="https://survivalacademy.online/">{uiText("public:choose_operator_290f6f")}</a>
            </article>
          </div>
          <p className={styles.planNote}>{uiText("public:cancel_anytime_no_long_term_contract_payments_a6c195")}</p>
        </section>

        <section className={styles.finalCta}>
          <div className={styles.topo} aria-hidden="true" />
          <p className={styles.eyebrow}>{uiText("public:your_expedition_starts_here_947e88")}</p>
          <h2>{uiText("public:be_harder_to_8d2d4f")}<br />
            <em>{uiText("public:surprise_535d47")}</em>
          </h2>
          <p>{uiText("public:start_with_the_fundamentals_build_skills_you_9a7de4")}</p>
          <a className={clsx(styles.button, styles.buttonPrimary)} href="https://survivalacademy.online/">{uiText("public:start_training_free_166e0f")}{" "}<span>→</span>
          </a>
        </section>
      </main>

      <footer>
        <a className={styles.brand} href="#top">
          <span className={styles.mark}>△</span>
          <span>{uiText("public:survival_d8e68b")}{" "}<i>{uiText("public:academy_681f13")}</i>
          </span>
        </a>
        <p>{uiText("public:practical_knowledge_for_a_more_capable_life_b90a86")}</p>
        <span>{uiText("public:2026_survival_academy_64f8ef")}</span>
      </footer>
    </div>
  );
}

export default LandingPage;
