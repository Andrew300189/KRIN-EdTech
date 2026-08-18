"use client";

import { useMemo, useState } from "react";
import { AppModal } from "@/core/components/AppModal";
import { diffRevisionSnapshots } from "@/modules/cms/utils/revision-diff";
import styles from "./CmsCourseRevisionComparison.module.css";

type Revision = {
  id: string;
  version: number;
  action: string;
  createdAt: string;
  actor: { name: string | null; email: string } | null;
  snapshot: unknown;
};

function display(value: unknown) {
  if (value === undefined) return "—";
  if (value === null) return "null";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 180 ? `${text.slice(0, 160)}… (${text.length} characters)` : text;
}

/** Version comparison is available from the compact publication toolbar. */
export function CmsCourseRevisionComparison({ revisions }: { revisions: Revision[] }) {
  const [fromId, setFromId] = useState(revisions[1]?.id ?? revisions[0]?.id ?? "");
  const [toId, setToId] = useState(revisions[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const [from, to] = [revisions.find((item) => item.id === fromId), revisions.find((item) => item.id === toId)];
  const differences = useMemo(() => from && to ? diffRevisionSnapshots(from.snapshot, to.snapshot) : [], [from, to]);

  return <>
    <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>Compare versions</button>
    <AppModal open={open} onOpenChange={setOpen} title="Version comparison" description="Compare saved course versions before restoring or publishing content." size="large">
      {!revisions.length ? <p className={styles.empty}>The first editorial change will create a comparison point here.</p> : <div className={styles.content}>
        <div className={styles.selectors}>
          <label>Earlier version<select value={fromId} onChange={(event) => setFromId(event.target.value)}>{revisions.map((item) => <option key={item.id} value={item.id}>v{item.version} · {item.action} · {new Date(item.createdAt).toLocaleString()}</option>)}</select></label>
          <label>Later version<select value={toId} onChange={(event) => setToId(event.target.value)}>{revisions.map((item) => <option key={item.id} value={item.id}>v{item.version} · {item.action} · {new Date(item.createdAt).toLocaleString()}</option>)}</select></label>
        </div>
        {from && to && from.id === to.id ? <p className={styles.empty}>Choose two different revisions.</p> : differences.length ? <div className={styles.tableWrap}><table><thead><tr><th>Field</th><th>Earlier</th><th>Later</th></tr></thead><tbody>{differences.map((difference) => <tr key={difference.path}><td>{difference.path}</td><td>{display(difference.before)}</td><td>{display(difference.after)}</td></tr>)}</tbody></table></div> : <p className={styles.empty}>These revisions contain the same saved fields.</p>}
      </div>}
    </AppModal>
  </>;
}
