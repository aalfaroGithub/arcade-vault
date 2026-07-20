import type { ScoreEntry } from "../data/scores";

export interface YourBestMark {
  name: string;
  rank: number;
  score: number;
  gameTitle: string;
}

export default function HallOfFameTable({
  rows,
  you,
}: {
  rows: ScoreEntry[];
  you: YourBestMark | null;
}) {
  return (
    <div className="hall-table">
      <div className="th">
        <div>RANGO</div>
        <div>JUGADOR</div>
        <div>PUNTUACIÓN</div>
        <div>FECHA</div>
      </div>
      {rows.map((r, i) => (
        <div
          key={r.name + i}
          className={
            "tr" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
          }
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
          <div className="pl">{r.name}</div>
          <div className="sc">{r.score.toLocaleString("es-ES")}</div>
          <div className="dt">{r.date}</div>
        </div>
      ))}
      {you && (
        <>
          <div className="tr you-label">
            ▸ TU MEJOR MARCA EN {you.gameTitle}
          </div>
          <div
            className="tr you"
            style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
          >
            <div className="rk" style={{ color: "var(--yellow)" }}>
              #{String(you.rank).padStart(2, "0")}
            </div>
            <div className="pl" style={{ color: "var(--yellow)" }}>
              {you.name}
            </div>
            <div
              className="sc"
              style={{
                color: "var(--yellow)",
                textShadow: "0 0 6px rgba(245,255,0,0.5)",
              }}
            >
              {you.score.toLocaleString("es-ES")}
            </div>
            <div className="dt">11/05/2026</div>
          </div>
        </>
      )}
    </div>
  );
}
