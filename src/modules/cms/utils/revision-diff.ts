export type RevisionDifference = {
  path: string;
  before: unknown;
  after: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** Produces a readable bounded diff for immutable JSON content snapshots. */
export function diffRevisionSnapshots(before: unknown, after: unknown, limit = 100): RevisionDifference[] {
  const differences: RevisionDifference[] = [];
  const visit = (left: unknown, right: unknown, path: string) => {
    if (differences.length >= limit || sameValue(left, right)) return;
    if (isRecord(left) && isRecord(right)) {
      for (const key of Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).sort()) {
        visit(left[key], right[key], path ? `${path}.${key}` : key);
        if (differences.length >= limit) return;
      }
      return;
    }
    differences.push({ path: path || "snapshot", before: left, after: right });
  };
  visit(before, after, "");
  return differences;
}
