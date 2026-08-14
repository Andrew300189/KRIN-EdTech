import Link from "next/link";
import styles from "./home.module.css";
import { prisma } from "@/core/server/prisma";
import { CmsManagedSlotBanner } from "@/modules/cms/components/CmsManagedSlotBanner";
import { getPublishedCmsContentSlot } from "@/modules/cms/services/content-slot.service";
import { PlacementTest } from "@/modules/courses/components/PlacementTest";
import { HomeCounterBanner } from "./HomeCounterBanner";
import { HomeCurriculumTabs } from "./HomeCurriculumTabs";
import { HomeTestimonials } from "./HomeTestimonials";
import { AnimationObserver } from "@/core/components/AnimationObserver";
import { FunnelEventReporter } from "@/modules/analytics/components/FunnelEventReporter";
import { PublicSiteHeader } from "@/modules/navigation/components/PublicSiteHeader";
import { GlobalSearch } from "@/modules/search/components/GlobalSearch";
import { FaqAccordion } from "./FaqAccordion";
import {
  listHomepageCourses,
  listHomepageCurriculumNodes,
  listPublishedCourseCategories,
  listPublishedLanguageLevels,
} from "@/modules/courses/services/content.service";
import {
  getPublicCourseHref,
  getPublicCurriculumHref,
} from "@/modules/courses/utils/public-content-routes";

function courseAccessLabel(
  plan: "FREE" | "BASIC" | "PREMIUM" | "PRO" | "CORPORATE",
) {
  if (plan === "FREE") return "Free access";
  if (plan === "CORPORATE") return "Corporate access";
  return "Subscription access";
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(
    amount / 100,
  );
}

function billingPeriodLabel(period: string) {
  if (period === "NONE") return "One-time payment";
  if (period === "MONTH") return "Monthly";
  if (period === "QUARTER") return "Every 3 months";
  if (period === "SEMI_ANNUAL") return "Every 6 months";
  return "Yearly";
}

export default async function Home() {
  const [
    heroSlot,
    levels,
    categories,
    featuredCurriculum,
    featuredCourses,
    pricingHighlights,
  ] = await Promise.all([
    getPublishedCmsContentSlot("home.hero"),
    listPublishedLanguageLevels(),
    listPublishedCourseCategories(),
    listHomepageCurriculumNodes(),
    listHomepageCourses(),
    prisma.product.findMany({
      where: {
        isActive: true,
        isPublic: true,
        type: { in: ["SUBSCRIPTION_PLAN", "COURSE", "COURSE_BUNDLE"] },
        prices: { some: { isActive: true } },
      },
      include: {
        prices: {
          where: { isActive: true },
          orderBy: { amount: "asc" },
          take: 1,
        },
      },
      orderBy: { title: "asc" },
      take: 4,
    }),
  ]);
  const visibleCategories = categories
    .filter((category) => category._count.courses > 0)
    .slice(0, 8);

  return (
    <main className={styles.page}>
      <FunnelEventReporter eventType="HOME_VIEW" />
      <AnimationObserver />
      <PublicSiteHeader />

      {heroSlot ? (
        <div className={styles.shell}>
          <CmsManagedSlotBanner slot={heroSlot} />
        </div>
      ) : null}

      <section className={styles.hero}>
        <div className={`${styles.shell} ${styles.heroGrid}`}>
          <div>
            <p className={styles.eyebrow}>English courses A1–C2</p>
            <h1 className={styles.heroTitle}>
              Choose an English course with a clear next step.
            </h1>
            <p className={styles.heroCopy}>
              Explore published courses by level and focus, try a real lesson
              exercise, then continue from your own learning dashboard.
            </p>
            <div className={styles.heroTrustRow}>
              <span className={styles.heroTrustBadge}>⚡ Structured learning</span>
              <span className={styles.heroTrustBadge}>🎯 Clear progress</span>
              <span className={styles.heroTrustBadge}>📘 Practical lessons</span>
            </div>
            <div className={styles.heroSearch}>
              <GlobalSearch
                context="PUBLIC"
                placeholder="Search courses, lessons and topics"
              />
            </div>
            <div className={styles.actions}>
              <Link href="/course-finder" className={styles.heroPrimaryBtn}>
                🎯 Find my course
              </Link>
              <Link href="/levels" className={styles.secondaryButton}>
                Browse levels
              </Link>
            </div>
            {levels.length ? (
              <div
                className={styles.levelChips}
                aria-label="Available CEFR levels"
              >
                {levels.map((level) => (
                  <Link
                    key={level.id}
                    href={`/levels/${level.code.toLowerCase()}`}
                    className={styles.levelChip}
                  >
                    {level.code} · {level.title}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          <aside className={styles.heroAside}>
            <PlacementTest />
          </aside>
        </div>
      </section>

      <HomeCounterBanner />

      <section className={`${styles.section} ${styles.whiteSection}`}>
        <div className={styles.shell}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>How it works</p>
            <h2>A practical route from choosing to learning.</h2>
          </div>
          <div className={styles.stepsV2}>
            <article className={styles.stepV2} data-ao="fade-up" data-ao-delay="1">
              <span className={styles.stepV2Number}>01</span>
              <div className={styles.stepV2Icon}>🔍</div>
              <h3>Choose your starting point</h3>
              <p>
                Filter the catalogue by a published CEFR level, focus and course
                format.
              </p>
            </article>
            <article className={styles.stepV2} data-ao="fade-up" data-ao-delay="2">
              <span className={styles.stepV2Number}>02</span>
              <div className={styles.stepV2Icon}>📚</div>
              <h3>Review the course structure</h3>
              <p>
                See the published outcomes, modules, lessons and any available
                free lesson before choosing access.
              </p>
            </article>
            <article className={styles.stepV2} data-ao="fade-up" data-ao-delay="3">
              <span className={styles.stepV2Number}>03</span>
              <div className={styles.stepV2Icon}>🚀</div>
              <h3>Continue in your dashboard</h3>
              <p>
                After access is granted, lessons and progress stay connected to
                your account.
              </p>
            </article>
          </div>
        </div>
      </section>

      {visibleCategories.length ? (
        <section className={styles.section}>
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>Choose a focus</p>
              <h2>Start with the part of English you want to improve.</h2>
              <p>
                These directions are managed in the CMS and shown only when they
                contain published courses.
              </p>
            </div>
            <div className={styles.bentoGrid}>
              {visibleCategories.map((category, i) => (
                <Link
                  key={category.id}
                  href={`/courses/categories/${category.slug}`}
                  className={styles.bentoCard}
                  data-ao="fade-up"
                  data-ao-delay={String((i % 6) + 1)}
                >
                  <div className={styles.bentoCardIcon}>
                    {category.icon || "📖"}
                  </div>
                  <h3>{category.title}</h3>
                  <p>
                    {category.description ||
                      "Published courses in this direction."}
                  </p>
                  <span className={styles.linkArrow}>Explore direction →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section
        id="courses"
        className={`${styles.section} ${styles.whiteSection} ${styles.anchorSection}`}
      >
        <div className={styles.shell}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Choose by goal</p>
            <h2>
              Explore professional English and test preparation separately.
            </h2>
            <p>
              These collections show only courses that their author has
              published with the matching course type. They never pull in
              unrelated catalogue results.
            </p>
          </div>
          <div className={styles.productCollections}>
            <Link href="/professional" className={styles.productCollectionCard} data-ao="fade-left" data-ao-delay="1">
              <span className={styles.collectionLabel}>
                Professional English
              </span>
              <h3>Use English with more confidence at work.</h3>
              <p>
                Browse courses authored for professional contexts, each with a
                visible level and programme.
              </p>
              <span className={styles.linkArrow}>
                Explore Professional English →
              </span>
            </Link>
            <Link href="/tests" className={styles.productCollectionCard} data-ao="fade-right" data-ao-delay="1">
              <span className={styles.collectionLabel}>English tests</span>
              <h3>Prepare with a clear published course structure.</h3>
              <p>
                Open the separate test and exam-preparation collection, then
                review access and a real preview when offered.
              </p>
              <span className={styles.linkArrow}>Explore English tests →</span>
            </Link>
          </div>
        </div>
      </section>

      <HomeCurriculumTabs levels={levels} />

      {levels.length ? (
        <section
          id="levels"
          className={`${styles.section} ${styles.whiteSection} ${styles.anchorSection}`}
        >
          <div className={styles.shell}>
            <div className={styles.sectionHeading} data-ao="fade-up" data-ao-delay="1">
              <p className={styles.eyebrow}>Levels</p>
              <h2>
                Stay within the level that matches your current learning stage.
              </h2>
              <p>
                Each level page queries its own published course records;
                content from other levels is not mixed in.
              </p>
            </div>
            <div className={styles.levelGrid}>
              {levels.map((level, i) => (
                <Link
                  key={level.id}
                  href={`/levels/${level.code.toLowerCase()}`}
                  className={styles.levelCard}
                  data-ao="stair"
                  data-ao-delay={String((i + 1) * 2)}
                >
                  <span className={styles.levelCode}>{level.code}</span>
                  <h3>{level.title}</h3>
                  <p>
                    {level._count.courses} published{" "}
                    {level._count.courses === 1 ? "course" : "courses"}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <div className={`${styles.shell} ${styles.structure}`} data-ao="fade-up" data-ao-delay="1">
          <div className={styles.sectionHeading} data-ao="fade-up" data-ao-delay="2">
            <p className={styles.eyebrow}>Before you enrol</p>
            <h2>See what a course contains before you choose access.</h2>
            <p>
              Every public course page shows its published outline. Where a
              lesson is genuinely free, it is clearly marked and can be opened
              from that outline.
            </p>
            <ul className={styles.structureList} data-ao="fade-up" data-ao-delay="3">
              <li>
                <span>✓</span>
                <div>
                  <strong>Modules and lessons</strong>
                  <br />A visible sequence rather than an undefined course
                  promise.
                </div>
              </li>
              <li>
                <span>✓</span>
                <div>
                  <strong>Learning outcomes</strong>
                  <br />
                  Shown when the course author has added them in CMS.
                </div>
              </li>
              <li>
                <span>✓</span>
                <div>
                  <strong>Access conditions</strong>
                  <br />
                  Free, subscription and corporate access are labelled before
                  you continue.
                </div>
              </li>
            </ul>
          </div>
          <div
            className={styles.structurePanel}
            aria-label="Example course outline"
            data-ao="fade-up"
            data-ao-delay="4"
          >
            <p>Published course outline</p>
            <h3>What you will see on a course page</h3>
            <div className={styles.moduleRow}>
              <span>1</span>Course overview and outcomes
            </div>
            <div className={styles.moduleRow}>
              <span>2</span>Published learning modules
            </div>
            <div className={styles.moduleRow}>
              <span>3</span>Lesson availability and progress
            </div>
            <small>
              This preview describes the interface; courses themselves remain
              CMS-managed.
            </small>
          </div>
        </div>
      </section>

      {featuredCourses.length ? (
        <section className={`${styles.section} ${styles.whiteSection}`}>
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>Selected in CMS</p>
              <h2>Featured courses</h2>
              <p>
                Only courses selected by the platform owner appear in this
                section.
              </p>
            </div>
            <div className={styles.courseGrid}>
              {featuredCourses.map((course, i) => (
                <Link
                  key={course.id}
                  href={getPublicCourseHref(course.slug)}
                  className={styles.courseCard}
                  data-ao="fade-up"
                  data-ao-delay={String(i + 1)}
                >
                  <div className={styles.metadata}>
                    <span>{course.level.code}</span>
                    <span>{course.category.title}</span>
                    <span>{courseAccessLabel(course.accessPlan)}</span>
                  </div>
                  <h3>{course.title}</h3>
                  <p>{course.shortDescription}</p>
                  <span className={styles.linkArrow}>View course →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {featuredCurriculum.length ? (
        <section className={styles.section}>
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>Curriculum</p>
              <h2>Explore published subjects inside each level.</h2>
            </div>
            <div className={styles.curriculumGrid}>
              {featuredCurriculum.map((node, i) => {
                const href = getPublicCurriculumHref(node);
                return href ? (
                  <Link
                    key={node.id}
                    href={href}
                    className={styles.curriculumCard}
                    data-ao="fade-up"
                    data-ao-delay={String(i + 1)}
                  >
                    <div className={styles.metadata}>
                      <span>{node.level.code}</span>
                      <span>{node.type.toLowerCase()}</span>
                    </div>
                    <h3>{node.title}</h3>
                    <p>
                      {node.description ||
                        `Explore this ${node.level.code} curriculum item.`}
                    </p>
                    <span className={styles.linkArrow}>Open curriculum →</span>
                  </Link>
                ) : null;
              })}
            </div>
          </div>
        </section>
      ) : null}

      <HomeTestimonials />

      <section
        id="pricing"
        className={`${styles.section} ${styles.whiteSection} ${styles.anchorSection}`}
      >
        <div className={styles.shell}>
          <div className={styles.pricingBandInner}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>Access and pricing</p>
              <h2>Choose from the essential access options.</h2>
              <p>
                Only up to four active public options are shown here. The exact
                currency, payment period and renewal terms stay visible before
                checkout.
              </p>
            </div>
            <Link href="/pricing-detail" className={styles.secondaryButton}>
              View all details
            </Link>
          </div>
          {pricingHighlights.length ? (
            <div
              className={styles.pricingGrid}
              aria-label="Highlighted access options"
            >
              {pricingHighlights.map((product, i) => {
                const price = product.prices[0];
                if (!price) return null;

                return (
                  <article key={product.id} className={styles.pricingCard} data-ao="scale-up" data-ao-delay={String(i + 1)}>
                    <p className={styles.pricingType}>
                      {product.type.replace(/_/g, " ").toLowerCase()}
                    </p>
                    <h3>{product.title}</h3>
                    <p>
                      {product.description ||
                        "Course access and payment details are shown before checkout."}
                    </p>
                    <strong>{formatPrice(price.amount, price.currency)}</strong>
                    <span>
                      {billingPeriodLabel(price.billingPeriod)} В·{" "}
                      {price.currency}
                    </span>
                    <Link href="/pricing-detail" className={styles.linkArrow}>
                      Review details в†’
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.pricingBand}>
              <p className={styles.eyebrow}>Access and pricing</p>
              <h2>Pricing is being prepared.</h2>
              <p>
                Public price options will appear here as soon as the owner
                publishes active products in the billing catalogue.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.sectionHeading} data-ao="fade-up" data-ao-delay="1">
            <p className={styles.eyebrow}>Questions</p>
            <h2>Clear information before you start.</h2>
          </div>
          <FaqAccordion className={styles.faqV2}>
            <div className={styles.faqColumn} data-ao="fade-up" data-ao-delay="2">
              <details data-ao="fade-up" data-ao-delay="3">
                <summary>Can I try a lesson before choosing a plan?</summary>
                <p>
                  Yes. Many courses offer a preview lesson or a sample section so
                  you can test the teaching style, flow and difficulty before
                  buying full access.
                </p>
              </details>
              <details data-ao="fade-up" data-ao-delay="4">
                <summary>How are courses separated by level?</summary>
                <p>
                  Courses are structured by level, from beginner to advanced, so
                  you can choose the path that matches your current English
                  ability and learning goals.
                </p>
              </details>
              <details data-ao="fade-up" data-ao-delay="5">
                <summary>What happens after I receive access?</summary>
                <p>
                  After purchase, you can open the course from your dashboard,
                  continue lessons, track progress and resume exactly where you
                  left off.
                </p>
              </details>
              <details data-ao="fade-up" data-ao-delay="6">
                <summary>Do I get a certificate after finishing a course?</summary>
                <p>
                  In many courses, a completion certificate is available when you
                  finish the required lessons or tasks. The exact certificate
                  rule is shown on each course page.
                </p>
              </details>
              <details data-ao="fade-up" data-ao-delay="7">
                <summary>How does the platform work day to day?</summary>
                <p>
                  You choose a learning path, complete lessons, review practice,
                  and return to your dashboard to continue your progress across
                  reading, vocabulary and grammar.
                </p>
              </details>
            </div>

            <div className={styles.faqColumn} data-ao="fade-up" data-ao-delay="8">
              <details data-ao="fade-up" data-ao-delay="9">
                <summary>What is the internal currency and how is it used?</summary>
                <p>
                  The platform may use an internal learning balance for rewards,
                  premium features, and additional practice. You can check the
                  exact rules in your account or the pricing details.
                </p>
              </details>
              <details data-ao="fade-up" data-ao-delay="10">
                <summary>What results can I realistically expect?</summary>
                <p>
                  The strongest results come from consistent practice: better
                  vocabulary, clearer grammar, stronger confidence in everyday
                  communication and a clearer understanding of your current level
                  over time.
                </p>
              </details>
              <details data-ao="fade-up" data-ao-delay="11">
                <summary>Do I need a teacher to study effectively?</summary>
                <p>
                  You can study independently with guided lessons, exercises and
                  feedback, while a teacher or coach can help if you want extra
                  support and accountability.
                </p>
              </details>
              <details data-ao="fade-up" data-ao-delay="12">
                <summary>Is this suitable for career and business English?</summary>
                <p>
                  Yes. The platform covers general communication, professional
                  vocabulary, business language and practical situations that help
                  learners improve confidence in real-world contexts.
                </p>
              </details>
              <details data-ao="fade-up" data-ao-delay="13">
                <summary>Where can I ask for help with my account or purchase?</summary>
                <p>
                  You can contact support from your account area or use the help
                  center to ask about billing, access, certificates, or course
                  questions.
                </p>
              </details>
            </div>
          </FaqAccordion>
        </div>
      </section>

      <section className={styles.finalCtaV2}>
        <div className={styles.shell}>
          <p className={styles.eyebrow}>Your next step</p>
          <h2>Find a course that fits the level and focus you choose.</h2>
          <p>
            The finder is a transparent catalogue guide, not a simulated
            placement test.
          </p>
          <div className={styles.actions}>
            <Link href="/course-finder" className={styles.heroPrimaryBtn}>
              🎯 Find my course
            </Link>
            <Link href="/courses" className={styles.secondaryButton}>
              Open catalogue
            </Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={`${styles.shell} ${styles.footerGrid}`}>
          <div>
            <h2>KRIN·EdTech</h2>
            <p>
              English learning paths built from published course, lesson and
              access data.
            </p>
          </div>
          <div>
            <h3>Learn</h3>
            <ul>
              <li>
                <Link href="/course-finder">Find a course</Link>
              </li>
              <li>
                <Link href="/courses">Course catalogue</Link>
              </li>
              <li>
                <Link href="/levels">Levels A1–C2</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3>Account</h3>
            <ul>
              <li>
                <Link href="/login">Log in</Link>
              </li>
              <li>
                <Link href="/register">Create account</Link>
              </li>
              <li>
                <Link href="/pricing">Pricing</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3>Help</h3>
            <ul>
              <li>
                <Link href="/help">Help centre</Link>
              </li>
              <li>
                <Link href="/contact">Contact</Link>
              </li>
              <li>
                <Link href="/payment-policy">Payment rules</Link>
              </li>
              <li>
                <Link href="/refunds">Refund policy</Link>
              </li>
              <li>
                <Link href="/privacy">Privacy</Link>
              </li>
              <li>
                <Link href="/terms">Terms</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className={`${styles.shell} ${styles.footerNote}`}>
          Payment, access and support details are shown in the relevant product
          and account flows. Legal terms must be published by the platform
          operator before paid access is offered.
        </div>
      </footer>
    </main>
  );
}
