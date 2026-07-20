import { notFound } from "next/navigation";
import GamePlayer from "../../../components/GamePlayer";
import { GAMES } from "../../../data/games";

export default async function GamePlayPage(
  props: PageProps<"/game/[id]/play">,
) {
  const { id } = await props.params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
