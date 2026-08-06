import Link from "next/link";
import { notFound } from "next/navigation";
import Leaderboard from "../../components/Leaderboard";
import { GAMES } from "../../data/games";
import { REAL_GAMES } from "../../data/realGames";
import { seededScores } from "../../data/scores";
import { getGameStats, getTopScores } from "@/lib/supabase/queries";

export default async function GameDetailPage(props: PageProps<"/game/[id]">) {
  const { id } = await props.params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();

  const isReal = id in REAL_GAMES;

  const [topScores, stats] = isReal
    ? await Promise.all([getTopScores(id, 10), getGameStats(id)])
    : [null, null];

  const scores = topScores
    ? topScores.map((row, i) => ({
        rank: i + 1,
        name: row.name,
        score: row.score,
        date: new Date(row.created_at).toLocaleDateString("es-ES"),
      }))
    : seededScores(id.length * 17 + 3, 10);

  const plays = stats ? stats.plays.toLocaleString("es-ES") : game.plays;
  const best = stats ? stats.best : game.best;

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover}></div>
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">{plays}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div
                className="v"
                style={{
                  color: "var(--magenta)",
                  textShadow: "0 0 6px rgba(255,0,110,0.5)",
                }}
              >
                {best.toLocaleString("es-ES")}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div
                className="v"
                style={{
                  color: "var(--yellow)",
                  textShadow: "0 0 6px rgba(245,255,0,0.5)",
                }}
              >
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/game/${game.id}/play`} className="btn xl pulse">
              ▶ JUGAR AHORA
            </Link>
            <Link href="/games" className="btn ghost lg">
              VOLVER AL VAULT
            </Link>
          </div>
        </div>
      </div>

      <aside>
        <Leaderboard scores={scores} />
      </aside>
    </div>
  );
}
