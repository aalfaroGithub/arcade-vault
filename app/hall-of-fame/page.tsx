"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import HallOfFamePodium from "../components/HallOfFamePodium";
import HallOfFameTable, {
  type YourBestMark,
} from "../components/HallOfFameTable";
import { useAvUser } from "../components/Nav";
import { GAMES } from "../data/games";
import { REAL_GAMES } from "../data/realGames";
import { seededScores, type ScoreEntry } from "../data/scores";
import { getPlayerBest, getTopScores } from "@/lib/supabase/queries";

export default function HallOfFamePage() {
  const [tab, setTab] = useState(GAMES[0].id);
  const user = useAvUser();

  const seedRows = useMemo(() => seededScores(tab.length * 23 + 7, 12), [tab]);
  const [realRows, setRealRows] = useState<ScoreEntry[]>([]);
  const [realBest, setRealBest] = useState<{
    score: number;
    rank: number;
  } | null>(null);
  const game = GAMES.find((g) => g.id === tab)!;
  const isReal = tab in REAL_GAMES;

  useEffect(() => {
    if (!isReal) return;
    let cancelled = false;

    getTopScores(tab, 12).then((topScores) => {
      if (cancelled) return;
      setRealRows(
        topScores.map((row, i) => ({
          rank: i + 1,
          name: row.name,
          score: row.score,
          date: new Date(row.created_at).toLocaleDateString("es-ES"),
        })),
      );
    });

    const bestPromise = user
      ? getPlayerBest(tab, user.name)
      : Promise.resolve(null);

    bestPromise.then((best) => {
      if (cancelled) return;
      setRealBest(best ? { score: best.score, rank: 0 } : null);
    });

    return () => {
      cancelled = true;
    };
  }, [isReal, tab, user]);

  const rows = isReal ? realRows : seedRows;

  const you: YourBestMark | null = useMemo(() => {
    if (!user) return null;
    if (isReal) {
      if (!realBest) return null;
      const rank =
        realRows.findIndex((r) => r.score === realBest.score) + 1 ||
        realRows.length + 1;
      return {
        name: user.name,
        rank,
        score: realBest.score,
        gameTitle: game.title,
      };
    }
    const rank = Math.floor(8 + (tab.length % 4));
    const score = (rows[5]?.score ?? 10000 + 2400) - 2400;
    return { name: user.name, rank, score, gameTitle: game.title };
  }, [user, tab, rows, game, isReal, realBest, realRows]);

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {GAMES.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      <HallOfFamePodium rows={rows} />
      <HallOfFameTable rows={rows} you={you} />

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/games" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
