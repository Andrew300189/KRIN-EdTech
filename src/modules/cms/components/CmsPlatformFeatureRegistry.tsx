"use client";

import { useMemo, useState } from "react";
import type { PlatformFeature, PlatformFeatureArea, PlatformFeatureStatus } from "@/modules/cms/data/platform-feature-registry";
import styles from "./CmsPlatformFeatureRegistry.module.css";

const areas: readonly ("ALL" | PlatformFeatureArea)[] = ["ALL", "PUBLIC", "STUDENT", "TEACHER", "CMS", "OPERATIONS"];
const statuses: readonly ("ALL" | PlatformFeatureStatus)[] = ["ALL", "WORKING", "PARTIAL", "INTERNAL", "BLOCKED"];

function label(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
}

export function CmsPlatformFeatureRegistry({ features }: { features: readonly PlatformFeature[] }) {
  const [area, setArea] = useState<(typeof areas)[number]>("ALL");
  const [status, setStatus] = useState<(typeof statuses)[number]>("ALL");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return features.filter((feature) => {
      const matchesArea = area === "ALL" || feature.area === area;
      const matchesStatus = status === "ALL" || feature.status === status;
      const searchable = `${feature.title} ${feature.description} ${feature.data} ${feature.audience}`.toLowerCase();
      return matchesArea && matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [area, features, query, status]);

  const counts = Object.fromEntries(statuses.map((value) => [value, value === "ALL" ? features.length : features.filter((feature) => feature.status === value).length]));

  return (
    <section className={styles.registry} aria-label="Platform feature registry">
      <div className={styles.summary}>
        {statuses.slice(1).map((value) => <article key={value}><span>{label(value)}</span><strong>{counts[value]}</strong></article>)}
      </div>

      <div className={styles.controls}>
        <label className={styles.searchLabel}>
          <span>Search audited features</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Course, payment, notification…" />
        </label>
        <fieldset className={styles.filterGroup}>
          <legend>Area</legend>
          <div>{areas.map((value) => <button key={value} type="button" aria-pressed={area === value} onClick={() => setArea(value)}>{label(value)}</button>)}</div>
        </fieldset>
        <fieldset className={styles.filterGroup}>
          <legend>Status</legend>
          <div>{statuses.map((value) => <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)}>{label(value)}{value !== "ALL" ? ` (${counts[value]})` : ""}</button>)}</div>
        </fieldset>
      </div>

      <p className={styles.resultCount} role="status">{filtered.length} {filtered.length === 1 ? "feature" : "features"} shown</p>
      {filtered.length ? <div className={styles.list}>{filtered.map((feature) => <FeatureCard key={feature.id} feature={feature} />)}</div> : <div className={styles.empty}><h2>No features match these filters</h2><p>Clear the search text or choose a broader area or status.</p><button type="button" onClick={() => { setArea("ALL"); setStatus("ALL"); setQuery(""); }}>Clear filters</button></div>}
    </section>
  );
}

function FeatureCard({ feature }: { feature: PlatformFeature }) {
  return (
    <article className={styles.feature}>
      <div className={styles.featureTop}>
        <div><p className={styles.area}>{label(feature.area)} · {feature.audience}</p><h2>{feature.title}</h2></div>
        <span className={`${styles.status} ${styles[`status${feature.status}`]}`}>{label(feature.status)}</span>
      </div>
      <p className={styles.description}>{feature.description}</p>
      <dl className={styles.meta}>
        <div><dt>Route</dt><dd>{feature.route ?? "No user route"}</dd></div>
        <div><dt>Backend</dt><dd>{feature.backend}</dd></div>
        <div><dt>Frontend</dt><dd>{feature.frontend}</dd></div>
        <div><dt>Data</dt><dd>{feature.data}</dd></div>
        <div><dt>Security</dt><dd>{feature.security}</dd></div>
        <div><dt>Tests</dt><dd>{feature.tests}</dd></div>
      </dl>
      <p className={styles.note}>{feature.note}</p>
    </article>
  );
}
