import ApiStatus from "@/components/api-status";
import styles from "./page.module.css";

const foundations = [
  {
    number: "01",
    title: "One clean-room product",
    detail:
      "Independent code, fictional data, and no proprietary interface assets.",
  },
  {
    number: "02",
    title: "Three focused services",
    detail:
      "Next.js, Django REST, and PostgreSQL orchestrated through Docker Compose.",
  },
  {
    number: "03",
    title: "Synchronous by design",
    detail:
      "No ornamental queue infrastructure. Celery and Redis remain intentionally deferred.",
  },
];

export default function Home() {
  return (
    <main className={styles.page}>
      <nav className={styles.navigation} aria-label="Primary navigation">
        <a className={styles.brand} href="#top" aria-label="ReturnOps home">
          <span className={styles.brandMark} aria-hidden="true">
            R
          </span>
          <span>ReturnOps</span>
        </a>
        <span className={styles.phase}>Foundation · Phase 3</span>
      </nav>

      <section className={styles.hero} id="top">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Returns operations, clearly handled</p>
          <h1>Built for resolution. Ready for the real workflow.</h1>
          <p className={styles.lede}>
            The technical foundation is in place for a bilingual demonstration
            that follows a return from customer request to operations decision.
          </p>
        </div>

        <aside className={styles.statusCard} aria-label="Platform readiness">
          <div className={styles.statusHeader}>
            <div>
              <p className={styles.cardLabel}>Platform status</p>
              <h2>Development environment</h2>
            </div>
            <span className={styles.liveBadge}>Live check</span>
          </div>

          <div className={styles.serviceList}>
            <div className={styles.service}>
              <span className={styles.serviceIcon} aria-hidden="true">
                N
              </span>
              <span>
                <strong>Next.js</strong>
                <small>Frontend · ready</small>
              </span>
              <span className={styles.readyDot} aria-label="Ready" />
            </div>
            <ApiStatus />
          </div>

          <p className={styles.statusNote}>
            The API check performs a real query against PostgreSQL.
          </p>
        </aside>
      </section>

      <section className={styles.foundation} aria-labelledby="foundation-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Architecture baseline</p>
          <h2 id="foundation-title">A small, deliberate system.</h2>
        </div>

        <div className={styles.foundationGrid}>
          {foundations.map((item) => (
            <article className={styles.foundationItem} key={item.number}>
              <span>{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <span>ReturnOps</span>
        <span>Operational clarity. Human recovery.</span>
      </footer>
    </main>
  );
}
