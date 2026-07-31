"use client";

import { useMemo, useState } from "react";

type ImportRow = Record<string, unknown>;

function parseCsv(text: string): ImportRow[] {
  const rows = text.trim().split(/\r?\n/).filter(Boolean);
  if (rows.length < 2) return [];
  const parseLine = (line: string) => {
    const values: string[] = []; let value = ""; let quoted = false;
    for (let index = 0; index < line.length; index += 1) { const character = line[index]; if (character === '"') { if (quoted && line[index + 1] === '"') { value += '"'; index += 1; } else quoted = !quoted; } else if (character === "," && !quoted) { values.push(value.trim()); value = ""; } else value += character; }
    values.push(value.trim()); return values;
  };
  const headers = parseLine(rows[0]);
  return rows.slice(1).map((line) => Object.fromEntries(parseLine(line).map((value, index) => [headers[index], value || undefined])));
}

export function VocabularyImportForm() {
  const [format, setFormat] = useState<"JSON" | "CSV">("JSON");
  const [raw, setRaw] = useState("[\n  {\n    \"lemma\": \"example\",\n    \"partOfSpeech\": \"NOUN\",\n    \"cefrLevel\": \"A1\",\n    \"translation\": \"пример\",\n    \"definition\": \"a representative instance\"\n  }\n]");
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const parsed = useMemo(() => { try { const rows = format === "JSON" ? JSON.parse(raw) : parseCsv(raw); return Array.isArray(rows) ? { rows: rows as ImportRow[] } : { error: "The input must be an array of rows." }; } catch { return { error: "Unable to parse the input." }; } }, [format, raw]);
  async function importRows() { if (!parsed.rows?.length) return; setSubmitted(true); setMessage(null); try { const response = await fetch("/api/admin/vocabulary/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ format, rows: parsed.rows }) }); const payload = await response.json() as { data?: { importedRows: number; skippedRows: number; errors: Array<{ row: number; error: string }> }; error?: string }; if (!response.ok || !payload.data) throw new Error(payload.error ?? "Import failed"); setMessage(`Imported ${payload.data.importedRows}; skipped ${payload.data.skippedRows}.${payload.data.errors.length ? " Review the duplicate/error report in the request response or audit log." : ""}`); } catch (error) { setMessage(error instanceof Error ? error.message : "Import failed"); } finally { setSubmitted(false); } }
  return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex gap-4"><label><input checked={format === "JSON"} onChange={() => setFormat("JSON")} type="radio" name="format" /> JSON</label><label><input checked={format === "CSV"} onChange={() => setFormat("CSV")} type="radio" name="format" /> CSV</label></div><p className="mt-3 text-sm text-slate-600">Fields: lemma, partOfSpeech, cefrLevel, translation, definition, article, britishTranscription, americanTranscription, example, exampleTranslation. JSON may also provide meanings, examples and collocations arrays.</p><textarea value={raw} onChange={(event) => setRaw(event.target.value)} className="mt-4 min-h-72 w-full rounded-lg border border-slate-300 p-3 font-mono text-sm" aria-label="Vocabulary import data" />{parsed.error ? <p role="alert" className="mt-3 text-sm text-red-700">{parsed.error}</p> : <div className="mt-4"><h2 className="font-semibold">Preview: {parsed.rows?.length ?? 0} rows</h2><div className="mt-2 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Lemma</th><th className="p-2">Translation</th><th className="p-2">Definition</th></tr></thead><tbody>{parsed.rows?.slice(0, 8).map((row, index) => <tr key={`${String(row.lemma)}-${index}`} className="border-b"><td className="p-2">{String(row.lemma ?? "")}</td><td className="p-2">{String(row.translation ?? "")}</td><td className="p-2">{String(row.definition ?? "")}</td></tr>)}</tbody></table></div></div>}<button disabled={submitted || Boolean(parsed.error) || !parsed.rows?.length} type="button" onClick={() => void importRows()} className="mt-5 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{submitted ? "Importing…" : "Confirm import"}</button>{message ? <p role="status" className="mt-3 text-sm text-slate-700">{message}</p> : null}</section>;
}
