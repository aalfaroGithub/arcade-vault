import { notFound } from "next/navigation";
import GamePlayer from "../../../components/GamePlayer";
import { GAMES } from "../../../data/games";

export default async function AsteroidsPlayPage() {
  const game = GAMES.find((g) => g.id === "asteroids");
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
