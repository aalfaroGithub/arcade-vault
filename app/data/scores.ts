import type { Game } from "./games";
import { PLAYERS } from "./players";

export interface ScoreEntry {
  rank: number;
  name: string;
  score: number;
  date: string;
}

export function seededScores(seed: number, count = 12): ScoreEntry[] {
  let s = seed;
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const used = new Set<string>();
  const rows: ScoreEntry[] = [];

  for (let i = 0; i < count; i++) {
    let name: string;
    do {
      name = PLAYERS[Math.floor(rand() * PLAYERS.length)];
    } while (used.has(name) && used.size < PLAYERS.length);
    used.add(name);

    const base = Math.floor(50000 + rand() * 250000);
    const score = base - i * Math.floor(2000 + rand() * 4000);
    const day = String(1 + Math.floor(rand() * 28)).padStart(2, "0");
    const mon = String(1 + Math.floor(rand() * 12)).padStart(2, "0");

    rows.push({
      rank: i + 1,
      name,
      score: Math.max(score, 1000),
      date: `${day}/${mon}/2026`,
    });
  }

  return rows
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

export interface ActivityEntry {
  player: string;
  gameTitle: string;
  score: number;
  timeAgo: string; // "hace 2 min"
  color: "cyan" | "magenta" | "yellow" | "green";
}

export function seededActivity(
  seed: number,
  games: Game[],
  count = 7,
): ActivityEntry[] {
  let s = seed;
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const used = new Set<string>();
  const rows: ActivityEntry[] = [];

  for (let i = 0; i < count; i++) {
    let name: string;
    do {
      name = PLAYERS[Math.floor(rand() * PLAYERS.length)];
    } while (used.has(name) && used.size < PLAYERS.length);
    used.add(name);

    const game = games[i % games.length];
    const score = Math.max(Math.floor(1000 + rand() * 200000), 100);

    rows.push({
      player: name,
      gameTitle: game.title,
      score,
      timeAgo: `hace ${(i + 1) * 3} min`,
      color: game.color,
    });
  }

  return rows;
}
