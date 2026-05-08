"use client";

import { useState } from "react";
import type { RepoWithScore, Watchlist } from "@/domain/types";
import { buildWatchlistRequest, type WatchlistFilters } from "./watchlist-api";

type WatchlistPanelProps = {
  filters: WatchlistFilters;
  initialRepoCount: number;
  suggestedName?: string;
};

type WatchlistReposResponse = {
  watchlist: Watchlist;
  repos: RepoWithScore[];
  total: number;
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorResponse;
    return body.error?.message ?? `Request failed with status ${response.status}.`;
  } catch {
    return `Request failed with status ${response.status}.`;
  }
}

export function WatchlistPanel({
  filters,
  initialRepoCount,
  suggestedName = "Current discovery targets"
}: WatchlistPanelProps) {
  const [name, setName] = useState(suggestedName);
  const [savedRepos, setSavedRepos] = useState<RepoWithScore[]>([]);
  const [savedTotal, setSavedTotal] = useState<number | null>(null);
  const [savedWatchlistName, setSavedWatchlistName] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function saveWatchlist() {
    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      setError("Watchlist name is required.");
      setStatus(null);
      return;
    }

    setIsSaving(true);
    setError(null);
    setStatus("Saving watchlist...");

    try {
      const createResponse = await fetch("/api/v1/watchlists", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(buildWatchlistRequest({ name: trimmedName, filters }))
      });

      if (!createResponse.ok) {
        throw new Error(await readApiError(createResponse));
      }

      const createBody = (await createResponse.json()) as { watchlist: Watchlist };
      const reposResponse = await fetch(`/api/v1/watchlists/${createBody.watchlist.id}/repos`);

      if (!reposResponse.ok) {
        throw new Error(await readApiError(reposResponse));
      }

      const reposBody = (await reposResponse.json()) as WatchlistReposResponse;
      setSavedRepos(reposBody.repos);
      setSavedTotal(reposBody.total);
      setSavedWatchlistName(reposBody.watchlist.name);
      setStatus(`Saved ${reposBody.total} repositories.`);
    } catch (caught) {
      setSavedRepos([]);
      setSavedTotal(null);
      setSavedWatchlistName(null);
      setStatus(null);
      setError(caught instanceof Error ? caught.message : "Unable to save watchlist.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded border border-zinc-900 bg-zinc-950 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Watchlist</h2>
          <p className="mt-1 text-xs text-zinc-500">{initialRepoCount} current targets</p>
        </div>
        {savedTotal !== null ? <span className="text-xs text-emerald-300">{savedTotal} saved</span> : null}
      </div>

      <label className="mt-4 block text-xs font-medium text-zinc-400" htmlFor="watchlist-name">
        Name
      </label>
      <input
        className="mt-2 w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500"
        disabled={isSaving}
        id="watchlist-name"
        onChange={(event) => setName(event.target.value)}
        value={name}
      />

      <button
        className="mt-3 w-full rounded border border-emerald-700 bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-800 disabled:text-zinc-500"
        disabled={isSaving}
        onClick={saveWatchlist}
        type="button"
      >
        {isSaving ? "Saving..." : "Save watchlist"}
      </button>

      {status !== null ? <p className="mt-3 text-sm text-emerald-300">{status}</p> : null}
      {error !== null ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

      {savedWatchlistName !== null ? (
        <div className="mt-5 border-t border-zinc-900 pt-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-white">{savedWatchlistName}</h3>
            <span className="text-xs text-zinc-500">{savedTotal} total</span>
          </div>
          <ul className="mt-3 space-y-2">
            {savedRepos.map((repo) => (
              <li className="rounded border border-zinc-900 bg-zinc-900/50 px-3 py-2" key={repo.id}>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium text-zinc-200">{repo.fullName}</span>
                  <span className="text-xs font-semibold text-emerald-300">{repo.readiness.score}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">{repo.language}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
