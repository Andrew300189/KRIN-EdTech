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
import { getPublicLearningStatistics } from "@/modules/analytics/services/platform-statistics.service";
import { PublicSiteHeader } from "@/modules/navigation/components/PublicSiteHeader";
import { GlobalSearch } from "@/modules/search/components/GlobalSearch";
import { FaqAccordion } from "./FaqAccordion";
import { LocalizedText } from "@/core/i18n/LocalizedText";
import { LocalizedPricingText } from "./LocalizedPricingText";
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

export const dynamic = "force-dynamic";

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

export default async function Home() {
  const [
    heroSlot,
    levels,
    categories,
    featuredCurriculum,
    featuredCourses,
    pricingHighlights,
    publicStatistics,
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
    getPublicLearningStatistics(),
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
            <h1 className={styles.heroTitle}>
              <LocalizedText id="home.heroTitle" fallback="Master your skills. Grow. Win. Get results." />
            </h1>
            <p className={styles.heroCopy}>
              <LocalizedText id="home.heroCopy" fallback="Explore published courses by level and focus, try a real lesson exercise, then continue from your own learning dashboard." />
            </p>
            <div className={styles.heroTrustRow}>
              <span className={styles.heroTrustBadge}><LocalizedText id="home.trust.structured" fallback="⚡ Structured learning" /></span>
              <span className={styles.heroTrustBadge}><LocalizedText id="home.trust.progress" fallback="🎯 Clear progress" /></span>
              <span className={styles.heroTrustBadge}><LocalizedText id="home.trust.lessons" fallback="📘 Practical lessons" /></span>
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

      <HomeCounterBanner initialStatistics={publicStatistics} />

      <section className={`${styles.section} ${styles.whiteSection}`}>
        <div className={styles.shell}>
          <div className={styles.sectionHeading}>
            <h2><LocalizedText id="home.journey.heading" fallback="A practical route from choosing to learning." /></h2>
          </div>
          <div className={styles.stepsV2}>
            <article className={styles.stepV2} data-ao="fade-up" data-ao-delay="1">
              <span className={styles.stepV2Number}>01</span>
              <div className={styles.stepV2Icon}>🔍</div>
              <h3><LocalizedText id="home.journey.choose.title" fallback="Choose your starting point" /></h3>
              <p>
                <LocalizedText id="home.journey.choose.copy" fallback="Filter the catalogue by a published CEFR level, focus and course format." />
              </p>
            </article>
            <article className={styles.stepV2} data-ao="fade-up" data-ao-delay="2">
              <span className={styles.stepV2Number}>02</span>
              <div className={styles.stepV2Icon}>📚</div>
              <h3><LocalizedText id="home.journey.review.title" fallback="Review the course structure" /></h3>
              <p>
                <LocalizedText id="home.journey.review.copy" fallback="See the published outcomes, modules, lessons and any available free lesson before choosing access." />
              </p>
            </article>
            <article className={styles.stepV2} data-ao="fade-up" data-ao-delay="3">
              <span className={styles.stepV2Number}>03</span>
              <div className={styles.stepV2Icon}>🚀</div>
              <h3><LocalizedText id="home.journey.dashboard.title" fallback="Continue in your dashboard" /></h3>
              <p>
                <LocalizedText id="home.journey.dashboard.copy" fallback="After access is granted, lessons and progress stay connected to your account." />
              </p>
            </article>
          </div>
        </div>
      </section>

      {visibleCategories.length ? (
        <section className={styles.section}>
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <h2><LocalizedText id="home.categories.heading" fallback="Start with the part of English you want to improve." /></h2>
              <p>
                <LocalizedText id="home.categories.copy" fallback="These directions are managed in the CMS and shown only when they contain published courses." />
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
                      <LocalizedText id="home.categories.fallback" fallback="Published courses in this direction." />}
                  </p>
                  <span className={styles.linkArrow}><LocalizedText id="home.categories.cta" fallback="Explore direction →" /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section
        id="all-courses"
        className={`${styles.section} ${styles.whiteSection} ${styles.anchorSection}`}
      >
        <div className={styles.shell}>
          <div className={styles.sectionHeading}>
            <h2><LocalizedText id="home.collections.heading" fallback="Choose the direction that fits your goal." /></h2>
            <p>
              <LocalizedText id="home.collections.copy" fallback="Start with the complete catalogue or open a focused collection. Newly published courses appear in the relevant collection automatically." />
            </p>
          </div>
          <div className={styles.productCollections}>
            <Link href="/courses" className={styles.productCollectionCard} data-ao="fade-left" data-ao-delay="1">
              <h3><LocalizedText id="home.collections.all.title" fallback="Browse every published English course." /></h3>
              <p>
                <LocalizedText id="home.collections.all.copy" fallback="Filter the live catalogue by level, direction, format and access type." />
              </p>
              <span className={styles.linkArrow}><LocalizedText id="home.collections.all.cta" fallback="Browse all courses →" /></span>
            </Link>
            <Link href="/courses?category=general-english" className={styles.productCollectionCard} data-ao="fade-up" data-ao-delay="2">
              <h3><LocalizedText id="home.collections.general.title" fallback="Strengthen the English you use in everyday study." /></h3>
              <p>
                <LocalizedText id="home.collections.general.copy" fallback="Practise core grammar, vocabulary and communication through published General English courses." />
              </p>
              <span className={styles.linkArrow}><LocalizedText id="home.collections.general.cta" fallback="Explore General English →" /></span>
            </Link>
            <Link href="/professional" className={styles.productCollectionCard} data-ao="fade-up" data-ao-delay="3">
              <h3><LocalizedText id="home.collections.professional.title" fallback="Use English with more confidence at work." /></h3>
              <p>
                <LocalizedText id="home.collections.professional.copy" fallback="Browse courses authored for professional contexts, each with a visible level and programme." />
              </p>
              <span className={styles.linkArrow}><LocalizedText id="home.collections.professional.cta" fallback="Explore Professional English →" /></span>
            </Link>
            <Link href="/tests" className={styles.productCollectionCard} data-ao="fade-right" data-ao-delay="4">
              <h3><LocalizedText id="home.collections.tests.title" fallback="Prepare with a clear published course structure." /></h3>
              <p>
                <LocalizedText id="home.collections.tests.copy" fallback="Open test and exam-preparation courses, then review access and a real preview lesson when one is available." />
              </p>
              <span className={styles.linkArrow}><LocalizedText id="home.collections.tests.cta" fallback="Explore English tests →" /></span>
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
              <h2>
                <LocalizedText id="home.levels.heading" fallback="Stay within the level that matches your current learning stage." />
              </h2>
              <p>
                <LocalizedText id="home.levels.copy" fallback="Each level page queries its own published course records; content from other levels is not mixed in." />
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
                    <LocalizedText
                      id={level._count.courses === 1 ? "home.levels.published.one" : "home.levels.published.many"}
                      fallback={`${level._count.courses} published ${level._count.courses === 1 ? "course" : "courses"}`}
                      values={{ count: level._count.courses }}
                    />
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
            <h2><LocalizedText id="home.structure.heading" fallback="See what a course contains before you choose access." /></h2>
            <p>
              <LocalizedText id="home.structure.copy" fallback="Every public course page shows its published outline. Where a lesson is genuinely free, it is clearly marked and can be opened from that outline." />
            </p>
            <ul className={styles.structureList} data-ao="fade-up" data-ao-delay="3">
              <li>
                <span>✓</span>
                <div>
                  <strong><LocalizedText id="home.structure.modules.title" fallback="Modules and lessons" /></strong>
                  <br /><LocalizedText id="home.structure.modules.copy" fallback="A visible sequence rather than an undefined course promise." />
                </div>
              </li>
              <li>
                <span>✓</span>
                <div>
                  <strong><LocalizedText id="home.structure.outcomes.title" fallback="Learning outcomes" /></strong>
                  <br />
                  <LocalizedText id="home.structure.outcomes.copy" fallback="Shown when the course author has added them in CMS." />
                </div>
              </li>
              <li>
                <span>✓</span>
                <div>
                  <strong><LocalizedText id="home.structure.access.title" fallback="Access conditions" /></strong>
                  <br /><LocalizedText id="home.structure.access.copy" fallback="Free, subscription and corporate access are labelled before you continue." />
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
            <p><LocalizedText id="home.structure.panel.label" fallback="Published course outline" /></p>
            <h3><LocalizedText id="home.structure.panel.title" fallback="What you will see on a course page" /></h3>
            <div className={styles.moduleRow}>
              <span>1</span><LocalizedText id="home.structure.panel.one" fallback="Course overview and outcomes" />
            </div>
            <div className={styles.moduleRow}>
              <span>2</span><LocalizedText id="home.structure.panel.two" fallback="Published learning modules" />
            </div>
            <div className={styles.moduleRow}>
              <span>3</span><LocalizedText id="home.structure.panel.three" fallback="Lesson availability and progress" />
            </div>
            <small>
              <LocalizedText id="home.structure.panel.note" fallback="This preview describes the interface; courses themselves remain CMS-managed." />
            </small>
          </div>
        </div>
      </section>

      {featuredCourses.length ? (
        <section className={`${styles.section} ${styles.whiteSection}`}>
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <h2><LocalizedText id="home.featured.heading" fallback="Featured courses" /></h2>
              <p>
                <LocalizedText id="home.featured.copy" fallback="Only courses selected by the platform owner appear in this section." />
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
                  <span className={styles.linkArrow}><LocalizedText id="home.featured.cta" fallback="View course →" /></span>
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
              <h2><LocalizedText id="home.curriculum.heading" fallback="Explore published subjects inside each level." /></h2>
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
                      {node.description || <LocalizedText id="home.curriculum.fallback" fallback={`Explore this ${node.level.code} curriculum item.`} values={{ level: node.level.code }} />}
                    </p>
                    <span className={styles.linkArrow}><LocalizedText id="home.curriculum.cta" fallback="Open curriculum →" /></span>
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
              <h2><LocalizedText id="home.pricing.heading" fallback="Choose from the essential access options." /></h2>
              <p>
                <LocalizedText id="home.pricing.copy" fallback="Only up to four active public options are shown here. The exact currency, payment period and renewal terms stay visible before checkout." />
              </p>
            </div>
            <Link href="/pricing-detail" className={styles.secondaryButton}>
              <LocalizedText id="home.pricing.details" fallback="View all details" />
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
                      <LocalizedPricingText kind="type" value={product.type.replace(/_/g, " ").toLowerCase()} />
                    </p>
                    <h3><LocalizedPricingText kind="title" value={product.title} /></h3>
                    <p>
                      {product.description ? <LocalizedPricingText kind="description" value={product.description} /> : <LocalizedText id="home.pricing.fallback" fallback="Course access and payment details are shown before checkout." />}
                    </p>
                    <strong>{formatPrice(price.amount, price.currency)}</strong>
                    <span>
                      <LocalizedPricingText kind="period" value={price.billingPeriod} /> ·{" "}
                      {price.currency}
                    </span>
                    <Link href="/pricing-detail" className={styles.linkArrow}>
                      <LocalizedText id="home.pricing.review" fallback="Review details →" />
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.pricingBand}>
              <h2><LocalizedText id="home.pricing.empty.title" fallback="Pricing is being prepared." /></h2>
              <p>
                <LocalizedText id="home.pricing.empty.copy" fallback="Public price options will appear here as soon as the owner publishes active products in the billing catalogue." />
              </p>
            </div>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.sectionHeading} data-ao="fade-up" data-ao-delay="1">
            <h2><LocalizedText id="home.faq.heading" fallback="Clear information before you start." /></h2>
          </div>
          <FaqAccordion className={styles.faqV2}>
            <div className={styles.faqColumn} data-ao="fade-up" data-ao-delay="2">
              <details data-ao="fade-up" data-ao-delay="3">
                <summary><LocalizedText id="home.faq.preview.question" fallback="Can I try a lesson before choosing a plan?" /></summary>
                <p>
                  <LocalizedText id="home.faq.preview.answer" fallback="Yes. Many courses offer a preview lesson or a sample section so you can test the teaching style, flow and difficulty before buying full access." />
                </p>
              </details>
              <details data-ao="fade-up" data-ao-delay="4">
                <summary><LocalizedText id="home.faq.levels.question" fallback="How are courses separated by level?" /></summary>
                <p>
                  <LocalizedText id="home.faq.levels.answer" fallback="Courses are structured by level, from beginner to advanced, so you can choose the path that matches your current English ability and learning goals." />
                </p>
              </details>
              <details data-ao="fade-up" data-ao-delay="5">
                <summary><LocalizedText id="home.faq.access.question" fallback="What happens after I receive access?" /></summary>
                <p>
                  <LocalizedText id="home.faq.access.answer" fallback="After purchase, you can open the course from your dashboard, continue lessons, track progress and resume exactly where you left off." />
                </p>
              </details>
              <details data-ao="fade-up" data-ao-delay="6">
                <summary><LocalizedText id="home.faq.certificate.question" fallback="Do I get a certificate after finishing a course?" /></summary>
                <p>
                  <LocalizedText id="home.faq.certificate.answer" fallback="In many courses, a completion certificate is available when you finish the required lessons or tasks. The exact certificate rule is shown on each course page." />
                </p>
              </details>
              <details data-ao="fade-up" data-ao-delay="7">
                <summary><LocalizedText id="home.faq.daily.question" fallback="How does the platform work day to day?" /></summary>
                <p>
                  <LocalizedText id="home.faq.daily.answer" fallback="You choose a learning path, complete lessons, review practice, and return to your dashboard to continue your progress across reading, vocabulary and grammar." />
                </p>
              </details>
            </div>

            <div className={styles.faqColumn} data-ao="fade-up" data-ao-delay="8">
              <details data-ao="fade-up" data-ao-delay="9">
                <summary><LocalizedText id="home.faq.currency.question" fallback="What is the internal currency and how is it used?" /></summary>
                <p>
                  <LocalizedText id="home.faq.currency.answer" fallback="The platform may use an internal learning balance for rewards, premium features, and additional practice. You can check the exact rules in your account or the pricing details." />
                </p>
              </details>
              <details data-ao="fade-up" data-ao-delay="10">
                <summary><LocalizedText id="home.faq.results.question" fallback="What results can I realistically expect?" /></summary>
                <p>
                  <LocalizedText id="home.faq.results.answer" fallback="The strongest results come from consistent practice: better vocabulary, clearer grammar, stronger confidence in everyday communication and a clearer understanding of your current level over time." />
                </p>
              </details>
              <details data-ao="fade-up" data-ao-delay="11">
                <summary><LocalizedText id="home.faq.teacher.question" fallback="Do I need a teacher to study effectively?" /></summary>
                <p>
                  <LocalizedText id="home.faq.teacher.answer" fallback="You can study independently with guided lessons, exercises and feedback, while a teacher or coach can help if you want extra support and accountability." />
                </p>
              </details>
              <details data-ao="fade-up" data-ao-delay="12">
                <summary><LocalizedText id="home.faq.business.question" fallback="Is this suitable for career and business English?" /></summary>
                <p>
                  <LocalizedText id="home.faq.business.answer" fallback="Yes. The platform covers general communication, professional vocabulary, business language and practical situations that help learners improve confidence in real-world contexts." />
                </p>
              </details>
              <details data-ao="fade-up" data-ao-delay="13">
                <summary><LocalizedText id="home.faq.help.question" fallback="Where can I ask for help with my account or purchase?" /></summary>
                <p>
                  <LocalizedText id="home.faq.help.answer" fallback="You can contact support from your account area or use the help center to ask about billing, access, certificates, or course questions." />
                </p>
              </details>
            </div>
          </FaqAccordion>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={`${styles.shell} ${styles.footerGrid}`}>
          <div>
            <h2>KRIN·EdTech</h2>
            <p>
              <LocalizedText id="home.footer.copy" fallback="English learning paths built from published course, lesson and access data." />
            </p>
          </div>
          <div>
            <h3><LocalizedText id="home.footer.learn" fallback="Learn" /></h3>
            <ul>
              <li>
                <Link href="/course-finder"><LocalizedText id="home.footer.find" fallback="Find a course" /></Link>
              </li>
              <li>
                <Link href="/courses"><LocalizedText id="home.footer.catalogue" fallback="Course catalogue" /></Link>
              </li>
              <li>
                <Link href="/levels"><LocalizedText id="home.footer.levels" fallback="Levels A1–C2" /></Link>
              </li>
            </ul>
          </div>
          <div>
            <h3><LocalizedText id="home.footer.account" fallback="Account" /></h3>
            <ul>
              <li>
                <Link href="/login"><LocalizedText id="home.footer.login" fallback="Log in" /></Link>
              </li>
              <li>
                <Link href="/register"><LocalizedText id="home.footer.register" fallback="Create account" /></Link>
              </li>
              <li>
                <Link href="/pricing"><LocalizedText id="home.footer.pricing" fallback="Pricing" /></Link>
              </li>
            </ul>
          </div>
          <div>
            <h3><LocalizedText id="home.footer.help" fallback="Help" /></h3>
            <ul>
              <li>
                <Link href="/help"><LocalizedText id="home.footer.helpCentre" fallback="Help centre" /></Link>
              </li>
              <li>
                <Link href="/contact"><LocalizedText id="home.footer.contact" fallback="Contact" /></Link>
              </li>
              <li>
                <Link href="/payment-policy"><LocalizedText id="home.footer.payment" fallback="Payment rules" /></Link>
              </li>
              <li>
                <Link href="/refunds"><LocalizedText id="home.footer.refunds" fallback="Refund policy" /></Link>
              </li>
              <li>
                <Link href="/privacy"><LocalizedText id="home.footer.privacy" fallback="Privacy" /></Link>
              </li>
              <li>
                <Link href="/terms"><LocalizedText id="home.footer.terms" fallback="Terms" /></Link>
              </li>
            </ul>
          </div>
        </div>
        <div className={`${styles.shell} ${styles.footerNote}`}>
          <LocalizedText id="home.footer.note" fallback="Payment, access and support details are shown in the relevant product and account flows. Legal terms must be published by the platform operator before paid access is offered." />
        </div>
      </footer>
    </main>
  );
}
