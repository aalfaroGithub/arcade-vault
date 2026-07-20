"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import HallOfFamePodium from "../components/HallOfFamePodium";
import HallOfFameTable, { type YourBestMark } from "../components/HallOfFameTable";
import { useAvUser } from "../components/Nav";
import { GAMES } from "../data/games";
import { seededScores } from "../data/scores";

export default function HallOfFamePage() {
  const [tab, setTab] = useState(GAMES[0].id);
  const user = useAvUser();

  const rows = useMemo(() => seededScores(tab.length * 23 + 7, 12), [tab]);
  const game = GAMES.find((g) => g.id === tab)!;

  const you: YourBestMark | null = useMemo(() => {
    if (!user) return null;
    const rank = Math.floor(8 + (tab.length % 4));
    const score = (rows[5]?.score ?? 10000 + 2400) - 2400;
    return { name: user.name, rank, score, gameTitle: game.title };
  }, [user, tab, rows, game]);

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
        <Link href="/" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
