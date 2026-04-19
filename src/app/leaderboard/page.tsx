import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Crown,
  Medal,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getLeaderboard } from "@/lib/api/client";
import type { ApiLeaderboardEntry } from "@/lib/api/types";

export const metadata: Metadata = {
  title: "Leaderboard | NotesBhej",
  description:
    "See who is contributing the most course materials to the community.",
};

function sortEntries(entries: ApiLeaderboardEntry[]): ApiLeaderboardEntry[] {
  const blacklist = new Set<number>([811, 431, 567]);
  return [...entries].sort((a, b) => {
    const aBlacklisted = a.userId != null && blacklist.has(a.userId);
    const bBlacklisted = b.userId != null && blacklist.has(b.userId);
    if (aBlacklisted !== bBlacklisted) return aBlacklisted ? 1 : -1;
    return (b.contributionCount ?? 0) - (a.contributionCount ?? 0);
  });
}

function initials(name: string | undefined): string {
  const s = (name ?? "?").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return s.slice(0, 2).toUpperCase();
}

export default async function LeaderboardPage() {
  let entries: ApiLeaderboardEntry[] = [];
  let loadError: string | null = null;
  try {
    entries = sortEntries(await getLeaderboard());
  } catch {
    loadError = "We couldn’t load the leaderboard right now. Try again in a moment.";
  }

  const top = entries.slice(0, 3);
  const rest = entries.length > 3 ? entries.slice(3) : [];
  const showPodium = entries.length >= 3;

  const podiumOrder: [number, number, number] = [1, 0, 2];
  const podiumLabels = ["2nd", "1st", "3rd"] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#eef2ff] to-[#faf5ff] dark:from-zinc-950 dark:via-indigo-950/50 dark:to-purple-950/30 transition-colors duration-500">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-24">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Home
              </Link>
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 dark:from-indigo-300 dark:via-violet-300 dark:to-fuchsia-400 bg-clip-text text-transparent">
                  Contributor leaderboard
                </h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                  Celebrating students who share notes, slides, and more.
                </p>
              </div>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {loadError ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/90 dark:bg-red-950/40 px-5 py-4 text-sm text-red-800 dark:text-red-200"
          >
            {loadError}
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 backdrop-blur-xl px-6 py-16 text-center shadow-sm">
            <Users className="h-12 w-12 mx-auto text-zinc-400 dark:text-zinc-500 mb-4" />
            <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">No contributors yet</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 max-w-md mx-auto">
              Upload course materials to appear here and help the community.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/">Browse courses</Link>
            </Button>
          </div>
        ) : (
          <>
            {showPodium ? (
              <div className="mb-10">
                <div className="flex items-end justify-center gap-2 sm:gap-4 md:gap-6 max-w-3xl mx-auto">
                  {podiumOrder.map((idx, slot) => {
                    const row = top[idx]!;
                    const rank = idx + 1;
                    const isFirst = rank === 1;
                    const height =
                      rank === 1 ? "min-h-[200px] sm:min-h-[220px]" : "min-h-[160px] sm:min-h-[176px]";
                    const ring =
                      rank === 1
                        ? "ring-2 ring-amber-400/80 shadow-xl shadow-amber-500/20"
                        : rank === 2
                          ? "ring-1 ring-slate-300 dark:ring-slate-600"
                          : "ring-1 ring-amber-700/30 dark:ring-amber-600/40";

                    return (
                      <div
                        key={`podium-${slot}`}
                        className={`flex-1 flex flex-col items-center ${isFirst ? "order-2 sm:order-none z-10" : slot === 0 ? "order-1 sm:order-none" : "order-3 sm:order-none"}`}
                      >
                        <div
                          className={`w-full rounded-2xl ${height} ${ring} bg-gradient-to-b from-white/95 to-zinc-50/95 dark:from-zinc-900/90 dark:to-zinc-950/90 border border-zinc-200/80 dark:border-zinc-800 flex flex-col items-center justify-end p-4 sm:p-5`}
                        >
                          <div
                            className={`mb-3 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl text-lg sm:text-xl font-bold text-white shadow-inner ${
                              rank === 1
                                ? "bg-gradient-to-br from-amber-400 to-orange-600"
                                : rank === 2
                                  ? "bg-gradient-to-br from-slate-300 to-slate-500 dark:from-slate-500 dark:to-slate-700"
                                  : "bg-gradient-to-br from-amber-700 to-amber-900 dark:from-amber-600 dark:to-amber-900"
                            }`}
                          >
                            {initials(row.username)}
                          </div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-center text-sm sm:text-base truncate max-w-full">
                            {row.username ?? "Anonymous"}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1 justify-center">
                            <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                            {(row.contributionCount ?? 0).toLocaleString()} contributions
                          </p>
                          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            {rank === 1 && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                            {rank === 2 && <Medal className="h-3.5 w-3.5 text-slate-500" />}
                            {rank === 3 && <Medal className="h-3.5 w-3.5 text-amber-800 dark:text-amber-600" />}
                            {podiumLabels[slot]}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mb-10 grid gap-3 sm:grid-cols-2 max-w-xl mx-auto">
                {entries.map((row, i) => {
                  const rank = i + 1;
                  const accent =
                    rank === 1
                      ? "from-amber-400/20 to-orange-500/10 ring-amber-400/40"
                      : "from-indigo-500/15 to-violet-500/10 ring-indigo-400/30";
                  return (
                    <div
                      key={`${row.userId ?? row.username ?? i}-mini`}
                      className={`rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-gradient-to-br ${accent} ring-1 backdrop-blur-xl p-5 flex items-center gap-4`}
                    >
                      <span className="text-2xl font-bold text-zinc-400 dark:text-zinc-500 tabular-nums w-8">
                        {rank}
                      </span>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shrink-0">
                        {initials(row.username)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {row.username ?? "Anonymous"}
                        </p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {(row.contributionCount ?? 0).toLocaleString()} contributions
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full list */}
            {rest.length > 0 && (
              <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/45 backdrop-blur-xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-500" />
                    Full rankings
                  </h2>
                  <span className="text-xs text-zinc-500">{entries.length} total</span>
                </div>
                <ul className="divide-y divide-zinc-200/70 dark:divide-zinc-800">
                  {rest.map((row, i) => {
                    const rank = i + 4;
                    return (
                      <li
                        key={`${row.userId ?? row.username ?? i}-${rank}`}
                        className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors"
                      >
                        <span className="tabular-nums text-sm font-medium text-zinc-500 dark:text-zinc-400 w-8 shrink-0">
                          {rank}
                        </span>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
                          {initials(row.username)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {row.username ?? "Anonymous"}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            User #{row.userId ?? "—"}
                          </p>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-indigo-600 dark:text-indigo-400 shrink-0">
                          {(row.contributionCount ?? 0).toLocaleString()}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <p className="mt-8 text-center text-xs text-zinc-500 dark:text-zinc-500 max-w-lg mx-auto leading-relaxed">
              Rankings are based on approved contributions. Counts may update periodically.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
