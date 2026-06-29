"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseSegments } from "@/lib/audits";
import { SECTORS, SIZE_BANDS } from "@/lib/constants";

export function CreateAuditForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [sector, setSector] = useState<string>(SECTORS[0]);
  const [sizeBand, setSizeBand] = useState<string>(SIZE_BANDS[2]);
  const [segmentsRaw, setSegmentsRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          organisationName,
          sector,
          sizeBand,
          segments: parseSegments(segmentsRaw),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Could not create the audit");
      }
      setTitle("");
      setSegmentsRaw("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const field =
    "mt-1 w-full rounded-md border border-brand-200 px-3 py-2 text-sm outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100";

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label htmlFor="org" className="block text-xs font-medium text-brand-600">
          Organisation name
        </label>
        <input
          id="org"
          required
          value={organisationName}
          onChange={(e) => setOrganisationName(e.target.value)}
          className={field}
          placeholder="Acme Ltd"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="sector" className="block text-xs font-medium text-brand-600">
            Sector
          </label>
          <select
            id="sector"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className={field}
          >
            {SECTORS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sizeBand" className="block text-xs font-medium text-brand-600">
            Company size
          </label>
          <select
            id="sizeBand"
            value={sizeBand}
            onChange={(e) => setSizeBand(e.target.value)}
            className={field}
          >
            {SIZE_BANDS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-[11px] text-brand-400">
        Sector and size let us benchmark you against comparable organisations.
      </p>
      <div>
        <label htmlFor="title" className="block text-xs font-medium text-brand-600">
          Audit title
        </label>
        <input
          id="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={field}
          placeholder="Q3 Wellbeing Audit"
        />
      </div>
      <div>
        <label htmlFor="segments" className="block text-xs font-medium text-brand-600">
          Departments (optional, comma-separated)
        </label>
        <textarea
          id="segments"
          rows={2}
          value={segmentsRaw}
          onChange={(e) => setSegmentsRaw(e.target.value)}
          className={field}
          placeholder="Engineering, Sales, Support"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="h-10 w-full rounded-md bg-accent-500 text-sm font-medium text-white transition-colors hover:bg-accent-600 disabled:opacity-60"
      >
        {loading ? "Creating…" : "Create audit"}
      </button>
    </form>
  );
}
